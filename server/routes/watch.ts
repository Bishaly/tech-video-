import { Router } from 'express';
import { db } from '../db.ts';
import {
  authenticateRequired,
  authenticateOptional,
  AuthenticatedRequest,
} from '../auth.ts';
import { cloudflareStreamService } from '../cloudflare.ts';

const router = Router();

// GET /api/watch/my-courses
// Returns all courses purchased by the authenticated user
router.get('/my-courses', authenticateRequired, async (req: AuthenticatedRequest, res) => {
  try {
    const userId = req.user!.userId;
    const purchases = await db.purchases.listByUser(userId);

    const enrolledCourses = await Promise.all(
      purchases.map(async (p) => {
        const course = await db.courses.findById(p.course_id, true);
        if (!course) return null;

        const progressRecords = await db.watchProgress.listByCourse(userId, course.id);
        const totalLessons = course.chapters?.reduce((sum, ch) => sum + (ch.lessons?.length || 0), 0) || 0;
        const completedLessons = progressRecords.filter((pr) => pr.is_completed).length;
        const progressPercent = totalLessons > 0 ? Math.round((completedLessons / totalLessons) * 100) : 0;

        // Find last watched lesson or first lesson
        let lastWatchedLessonId = '';
        if (progressRecords.length > 0) {
          const sorted = [...progressRecords].sort(
            (a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
          );
          lastWatchedLessonId = sorted[0].lesson_id;
        } else if (course.chapters?.[0]?.lessons?.[0]) {
          lastWatchedLessonId = course.chapters[0].lessons[0].id;
        }

        return {
          purchase_id: p.id,
          purchased_at: p.purchase_date,
          course: {
            id: course.id,
            slug: course.slug,
            title: course.title,
            thumbnail_url: course.thumbnail_url,
            instructor_name: course.instructor_name,
            duration_hours: course.duration_hours,
            total_lessons: totalLessons,
          },
          progress: {
            completed_lessons: completedLessons,
            total_lessons: totalLessons,
            percentage: progressPercent,
            last_lesson_id: lastWatchedLessonId,
          },
        };
      })
    );

    return res.json(enrolledCourses.filter(Boolean));
  } catch (err: any) {
    console.error('My courses error:', err);
    return res.status(500).json({ error: 'Failed to retrieve enrolled courses.' });
  }
});

// GET /api/watch/:courseId/curriculum
// Returns the full course navigation tree with completion status and lock indicators
router.get('/:courseId/curriculum', authenticateOptional, async (req: AuthenticatedRequest, res) => {
  try {
    const { courseId } = req.params;
    let course = await db.courses.findBySlug(courseId);
    if (!course) {
      course = await db.courses.findById(courseId);
    }

    if (!course) {
      return res.status(404).json({ error: 'Course not found.' });
    }

    let isEnrolled = false;
    let completedLessonSet = new Set<string>();
    let progressMap: Record<string, { lastPosition: number; completed: boolean }> = {};

    if (req.user) {
      if (req.user.role === 'admin') {
        isEnrolled = true;
      } else {
        const purchase = await db.purchases.findByUserAndCourse(req.user.userId, course.id);
        isEnrolled = Boolean(purchase);
      }

      const progressRecords = await db.watchProgress.listByCourse(req.user.userId, course.id);
      progressRecords.forEach((pr) => {
        if (pr.is_completed) completedLessonSet.add(pr.lesson_id);
        progressMap[pr.lesson_id] = {
          lastPosition: pr.last_watched_position_seconds,
          completed: pr.is_completed,
        };
      });
    }

    const totalLessons = course.chapters?.reduce((sum, ch) => sum + (ch.lessons?.length || 0), 0) || 0;
    const completedCount = completedLessonSet.size;
    const progressPercent = totalLessons > 0 ? Math.round((completedCount / totalLessons) * 100) : 0;

    return res.json({
      course: {
        id: course.id,
        slug: course.slug,
        title: course.title,
        description: course.description,
        thumbnail_url: course.thumbnail_url,
        instructor_name: course.instructor_name,
        price_inr: course.price_inr,
        original_price_inr: course.original_price_inr,
        is_enrolled: isEnrolled,
      },
      chapters: course.chapters?.map((ch) => ({
        id: ch.id,
        title: ch.title,
        sort_order: ch.sort_order,
        lessons: ch.lessons?.map((l) => ({
          id: l.id,
          title: l.title,
          duration_seconds: l.duration_seconds,
          is_free_preview: l.is_free_preview,
          is_locked: !isEnrolled && !l.is_free_preview,
          is_completed: completedLessonSet.has(l.id),
          last_watched_position: progressMap[l.id]?.lastPosition || 0,
        })),
      })),
      stats: {
        total_lessons: totalLessons,
        completed_lessons: completedCount,
        progress_percent: progressPercent,
      },
    });
  } catch (err: any) {
    console.error('Curriculum error:', err);
    return res.status(500).json({ error: 'Failed to fetch course curriculum.' });
  }
});

// GET /api/watch/:courseId/lesson/:lessonId
// Strict access verification endpoint for protected Cloudflare Stream playback
router.get('/:courseId/lesson/:lessonId', authenticateOptional, async (req: AuthenticatedRequest, res) => {
  try {
    const { courseId, lessonId } = req.params;

    let course = await db.courses.findBySlug(courseId);
    if (!course) {
      course = await db.courses.findById(courseId);
    }

    if (!course) {
      return res.status(404).json({ error: 'Course not found.' });
    }

    const lesson = await db.lessons.findById(lessonId);
    if (!lesson || lesson.course_id !== course.id) {
      return res.status(404).json({ error: 'Lesson not found in this course.' });
    }

    const hasVideoId = Boolean(lesson.cloudflare_video_id && lesson.cloudflare_video_id.trim());

    // Check if free preview
    if (lesson.is_free_preview) {
      let lastPosition = 0;
      let isCompleted = false;
      if (req.user) {
        const prog = await db.watchProgress.get(req.user.userId, lesson.id);
        if (prog) {
          lastPosition = prog.last_watched_position_seconds;
          isCompleted = prog.is_completed;
        }
      }

      if (!hasVideoId) {
        return res.json({
          lesson: {
            id: lesson.id,
            title: lesson.title,
            description: lesson.description,
            duration_seconds: lesson.duration_seconds,
            is_free_preview: true,
            is_locked: false,
            is_published: lesson.is_published,
          },
          isConfigured: false,
          message: 'Video is being prepared. Please check back later.',
          playback: null,
          progress: {
            last_watched_position_seconds: lastPosition,
            is_completed: isCompleted,
          },
        });
      }

      const playback = cloudflareStreamService.generateSignedPlaybackToken(
        lesson.cloudflare_video_id!.trim(),
        req.user?.userId || 'guest_preview',
        180
      );

      return res.json({
        lesson: {
          id: lesson.id,
          title: lesson.title,
          description: lesson.description,
          duration_seconds: lesson.duration_seconds,
          is_free_preview: true,
          is_locked: false,
          is_published: lesson.is_published,
        },
        isConfigured: true,
        playback,
        progress: {
          last_watched_position_seconds: lastPosition,
          is_completed: isCompleted,
        },
      });
    }

    // Paid lesson: REQUIRES AUTHENTICATION
    if (!req.user) {
      return res.status(401).json({
        error: 'Please sign in to access this course lesson.',
        requiresAuth: true,
        isLocked: true,
      });
    }

    // STRICT VERIFICATION: Verify customer purchased the course OR is admin
    const isAdmin = req.user.role === 'admin';
    let purchase = null;

    if (!isAdmin) {
      purchase = await db.purchases.findByUserAndCourse(req.user.userId, course.id);
      if (!purchase || purchase.payment_status !== 'success') {
        return res.status(403).json({
          error: 'Purchase this course to start watching.',
          isLocked: true,
          courseId: course.id,
          courseTitle: course.title,
          coursePrice: course.price_inr,
        });
      }
    }

    const prog = await db.watchProgress.get(req.user.userId, lesson.id);

    // Verified! If lesson does not have a Cloudflare Stream Video ID, do NOT show demo video
    if (!hasVideoId) {
      return res.json({
        lesson: {
          id: lesson.id,
          title: lesson.title,
          description: lesson.description,
          duration_seconds: lesson.duration_seconds,
          is_free_preview: false,
          is_locked: false,
          is_published: lesson.is_published,
        },
        isConfigured: false,
        message: 'Video is being prepared. Please check back later.',
        playback: null,
        progress: {
          last_watched_position_seconds: prog?.last_watched_position_seconds || 0,
          is_completed: prog?.is_completed || false,
        },
      });
    }

    // Verified & configured! Generate protected Cloudflare Stream playback token
    const playback = cloudflareStreamService.generateSignedPlaybackToken(
      lesson.cloudflare_video_id!.trim(),
      req.user.userId,
      180
    );

    return res.json({
      lesson: {
        id: lesson.id,
        title: lesson.title,
        description: lesson.description,
        duration_seconds: lesson.duration_seconds,
        is_free_preview: false,
        is_locked: false,
        is_published: lesson.is_published,
      },
      isConfigured: true,
      playback,
      progress: {
        last_watched_position_seconds: prog?.last_watched_position_seconds || 0,
        is_completed: prog?.is_completed || false,
      },
    });
  } catch (err: any) {
    console.error('Watch lesson error:', err);
    return res.status(500).json({ error: 'Server error preparing video stream.' });
  }
});

// POST /api/watch/progress
// Tracks current lesson watch progress and completion
router.post('/progress', authenticateRequired, async (req: AuthenticatedRequest, res) => {
  try {
    const { courseId, lessonId, position, duration, isCompleted } = req.body;
    const userId = req.user!.userId;

    if (!courseId || !lessonId) {
      return res.status(400).json({ error: 'courseId and lessonId are required.' });
    }

    const record = await db.watchProgress.upsert(
      userId,
      courseId,
      lessonId,
      Math.floor(position || 0),
      Math.floor(duration || 0),
      Boolean(isCompleted)
    );

    return res.json({ success: true, record });
  } catch (err: any) {
    console.error('Watch progress error:', err);
    return res.status(500).json({ error: 'Failed to record watch progress.' });
  }
});

export default router;
