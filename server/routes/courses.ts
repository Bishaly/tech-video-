import { Router } from 'express';
import { db } from '../db.ts';
import { authenticateOptional, AuthenticatedRequest } from '../auth.ts';

const router = Router();

// GET /api/courses/categories
router.get('/categories', async (req, res) => {
  try {
    const categories = await db.categories.list();
    return res.json(categories);
  } catch (err) {
    return res.status(500).json({ error: 'Failed to retrieve categories.' });
  }
});

// GET /api/courses
router.get('/', authenticateOptional, async (req: AuthenticatedRequest, res) => {
  try {
    const { category, search, level, sort } = req.query;

    const courses = await db.courses.list({
      categorySlug: category as string,
      search: search as string,
      level: level as string,
      sort: sort as any,
      isPublishedOnly: true,
    });

    // Check if user is logged in to mark enrolled status
    let enrolledSet = new Set<string>();
    if (req.user) {
      const userPurchases = await db.purchases.listByUser(req.user.userId);
      enrolledSet = new Set(userPurchases.map((p) => p.course_id));
    }

    const coursesWithEnrolled = courses.map((c) => ({
      ...c,
      is_enrolled: enrolledSet.has(c.id),
    }));

    return res.json(coursesWithEnrolled);
  } catch (err: any) {
    console.error('Fetch courses error:', err);
    return res.status(500).json({ error: 'Failed to retrieve courses catalog.' });
  }
});

// GET /api/courses/:slugOrId
router.get('/:slugOrId', authenticateOptional, async (req: AuthenticatedRequest, res) => {
  try {
    const { slugOrId } = req.params;

    let course = await db.courses.findBySlug(slugOrId);
    if (!course) {
      course = await db.courses.findById(slugOrId);
    }

    if (!course) {
      return res.status(404).json({ error: 'Course not found.' });
    }

    let isEnrolled = false;
    if (req.user) {
      if (req.user.role === 'admin') {
        isEnrolled = true;
      } else {
        const purchase = await db.purchases.findByUserAndCourse(req.user.userId, course.id);
        isEnrolled = Boolean(purchase);
      }
    }

    // Scrub protected Cloudflare URLs from lessons if user is NOT enrolled
    // Only reveal that a lesson is a free preview or locked
    const sanitizedChapters = course.chapters?.map((ch) => ({
      ...ch,
      lessons: ch.lessons?.map((l) => ({
        id: l.id,
        chapter_id: l.chapter_id,
        course_id: l.course_id,
        title: l.title,
        description: l.description,
        duration_seconds: l.duration_seconds,
        is_free_preview: l.is_free_preview,
        sort_order: l.sort_order,
        is_locked: !isEnrolled && !l.is_free_preview,
        // Notice: do NOT leak Cloudflare tokens or HLS urls here!
      })),
    }));

    return res.json({
      ...course,
      chapters: sanitizedChapters,
      is_enrolled: isEnrolled,
    });
  } catch (err: any) {
    console.error('Fetch course details error:', err);
    return res.status(500).json({ error: 'Failed to retrieve course details.' });
  }
});

export default router;
