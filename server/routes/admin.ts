import { Router } from 'express';
import { db } from '../db.ts';
import { requireAdmin, AuthenticatedRequest } from '../auth.ts';
import { cloudflareStreamService } from '../cloudflare.ts';

const router = Router();

// All routes here strictly enforce administrator role
router.use(requireAdmin);

// GET /api/admin/stats
router.get('/stats', async (req: AuthenticatedRequest, res) => {
  try {
    const stats = await db.stats.getOverview();
    return res.json(stats);
  } catch (err: any) {
    console.error('Admin stats error:', err);
    return res.status(500).json({ error: 'Failed to retrieve administrative analytics.' });
  }
});

// GET /api/admin/courses
router.get('/courses', async (req: AuthenticatedRequest, res) => {
  try {
    const courses = await db.courses.list();
    return res.json(courses);
  } catch (err) {
    return res.status(500).json({ error: 'Failed to retrieve courses.' });
  }
});

// POST /api/admin/courses
router.post('/courses', async (req: AuthenticatedRequest, res) => {
  try {
    const {
      title,
      slug,
      subtitle,
      description,
      instructor_name,
      instructor_title,
      instructor_avatar,
      instructor_bio,
      thumbnail_url,
      price_inr,
      original_price_inr,
      level,
      category_id,
      is_published,
      duration_hours,
      what_you_will_learn,
      requirements,
      faqs,
    } = req.body;

    if (!title || !description || price_inr === undefined) {
      return res.status(400).json({ error: 'Title, description, and price are required.' });
    }

    const courseSlug =
      slug ||
      title
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)/g, '');

    const course = await db.courses.create({
      title,
      slug: courseSlug,
      subtitle: subtitle || '',
      description,
      instructor_name: instructor_name || req.user?.name || 'Lead Instructor',
      instructor_title: instructor_title || 'Staff Engineer',
      instructor_avatar:
        instructor_avatar ||
        'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200&auto=format&fit=crop&q=80',
      instructor_bio: instructor_bio || 'Experienced software professional and course creator.',
      thumbnail_url:
        thumbnail_url ||
        'https://images.unsplash.com/photo-1517694712202-14dd9538aa97?w=1200&auto=format&fit=crop&q=80',
      price_inr: Number(price_inr) || 0,
      original_price_inr: original_price_inr ? Number(original_price_inr) : undefined,
      level: level || 'All Levels',
      category_id: category_id || 'cat_web',
      is_published: Boolean(is_published),
      duration_hours: Number(duration_hours) || 0,
      rating: 5.0,
      review_count: 0,
      what_you_will_learn: Array.isArray(what_you_will_learn) ? what_you_will_learn : [],
      requirements: Array.isArray(requirements) ? requirements : [],
      faqs: Array.isArray(faqs) ? faqs : [],
    });

    return res.status(201).json(course);
  } catch (err: any) {
    console.error('Create course error:', err);
    return res.status(500).json({ error: 'Failed to create course.' });
  }
});

// GET /api/admin/courses/:id
router.get('/courses/:id', async (req: AuthenticatedRequest, res) => {
  try {
    const course = await db.courses.findById(req.params.id, true);
    if (!course) {
      return res.status(404).json({ error: 'Course not found.' });
    }
    return res.json(course);
  } catch (err) {
    return res.status(500).json({ error: 'Failed to fetch course details.' });
  }
});

// PUT /api/admin/courses/:id
router.put('/courses/:id', async (req: AuthenticatedRequest, res) => {
  try {
    const updated = await db.courses.update(req.params.id, req.body);
    if (!updated) {
      return res.status(404).json({ error: 'Course not found.' });
    }
    return res.json(updated);
  } catch (err) {
    return res.status(500).json({ error: 'Failed to update course.' });
  }
});

// DELETE /api/admin/courses/:id
router.delete('/courses/:id', async (req: AuthenticatedRequest, res) => {
  try {
    const success = await db.courses.delete(req.params.id);
    if (!success) {
      return res.status(404).json({ error: 'Course not found.' });
    }
    return res.json({ success: true, message: 'Course deleted successfully.' });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to delete course.' });
  }
});

// CHAPTERS CRUD
router.post('/chapters', async (req: AuthenticatedRequest, res) => {
  try {
    const { course_id, title, sort_order } = req.body;
    if (!course_id || !title) {
      return res.status(400).json({ error: 'course_id and title are required.' });
    }
    const chapter = await db.chapters.create({
      course_id,
      title,
      sort_order: Number(sort_order) || 1,
    });
    return res.status(201).json(chapter);
  } catch (err) {
    return res.status(500).json({ error: 'Failed to create chapter.' });
  }
});

router.put('/chapters/:id', async (req: AuthenticatedRequest, res) => {
  try {
    const updated = await db.chapters.update(req.params.id, req.body);
    if (!updated) {
      return res.status(404).json({ error: 'Chapter not found.' });
    }
    return res.json(updated);
  } catch (err) {
    return res.status(500).json({ error: 'Failed to update chapter.' });
  }
});

router.delete('/chapters/:id', async (req: AuthenticatedRequest, res) => {
  try {
    const success = await db.chapters.delete(req.params.id);
    return res.json({ success });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to delete chapter.' });
  }
});

// LESSONS CRUD
router.post('/lessons', async (req: AuthenticatedRequest, res) => {
  try {
    const {
      chapter_id,
      course_id,
      title,
      description,
      duration_seconds,
      is_free_preview,
      sort_order,
      cloudflare_video_id,
      is_published,
    } = req.body;

    if (!chapter_id || !course_id || !title) {
      return res.status(400).json({ error: 'chapter_id, course_id, and title are required.' });
    }

    const cleanVideoId = typeof cloudflare_video_id === 'string' ? cloudflare_video_id.trim() : '';

    const lesson = await db.lessons.create({
      chapter_id,
      course_id,
      title: title.trim(),
      description: description ? description.trim() : '',
      duration_seconds: Math.max(0, Number(duration_seconds) || 0),
      is_free_preview: Boolean(is_free_preview),
      sort_order: Number(sort_order) || 1,
      cloudflare_video_id: cleanVideoId,
      status: cleanVideoId ? 'ready' : 'draft',
      is_published: is_published !== undefined ? Boolean(is_published) : true,
    });

    return res.status(201).json(lesson);
  } catch (err: any) {
    console.error('Create lesson error:', err);
    return res.status(500).json({ error: 'Failed to create lesson.' });
  }
});

router.put('/lessons/:id', async (req: AuthenticatedRequest, res) => {
  try {
    const updateData = { ...req.body };
    if (typeof updateData.cloudflare_video_id === 'string') {
      updateData.cloudflare_video_id = updateData.cloudflare_video_id.trim();
      updateData.status = updateData.cloudflare_video_id ? 'ready' : 'draft';
    }
    if (updateData.duration_seconds !== undefined) {
      updateData.duration_seconds = Math.max(0, Number(updateData.duration_seconds) || 0);
    }
    if (updateData.is_published !== undefined) {
      updateData.is_published = Boolean(updateData.is_published);
    }
    if (updateData.is_free_preview !== undefined) {
      updateData.is_free_preview = Boolean(updateData.is_free_preview);
    }

    const updated = await db.lessons.update(req.params.id, updateData);
    if (!updated) {
      return res.status(404).json({ error: 'Lesson not found.' });
    }
    return res.json(updated);
  } catch (err: any) {
    console.error('Update lesson error:', err);
    return res.status(500).json({ error: 'Failed to update lesson.' });
  }
});

router.delete('/lessons/:id', async (req: AuthenticatedRequest, res) => {
  try {
    const success = await db.lessons.delete(req.params.id);
    return res.json({ success });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to delete lesson.' });
  }
});

// GET /api/admin/videos/verify/:videoId
// Allows admin to check Cloudflare Stream metadata for a manually entered Video ID
router.get('/videos/verify/:videoId', async (req: AuthenticatedRequest, res) => {
  try {
    const { videoId } = req.params;
    const metadata = await cloudflareStreamService.getVideoMetadata(videoId);
    if (!metadata) {
      return res.status(404).json({ error: 'Video not found or invalid Video ID.' });
    }
    return res.json({
      success: true,
      videoId,
      metadata,
    });
  } catch (err: any) {
    return res.status(500).json({ error: 'Failed to verify Cloudflare video ID.' });
  }
});

// GET /api/admin/orders
router.get('/orders', async (req: AuthenticatedRequest, res) => {
  try {
    const orders = await db.purchases.listAll();
    return res.json(orders);
  } catch (err) {
    return res.status(500).json({ error: 'Failed to retrieve order history.' });
  }
});

// GET /api/admin/users
router.get('/users', async (req: AuthenticatedRequest, res) => {
  try {
    const users = await db.users.listAll();
    const purchases = await db.purchases.listAll();

    const usersWithStats = users.map((u) => {
      const userPurchases = purchases.filter((p) => p.user_id === u.id && p.payment_status === 'success');
      const totalSpent = userPurchases.reduce((sum, p) => sum + p.amount_inr, 0);
      return {
        id: u.id,
        name: u.name,
        email: u.email,
        role: u.role,
        avatar_url: u.avatar_url,
        created_at: u.created_at,
        courses_count: userPurchases.length,
        total_spent_inr: totalSpent,
      };
    });

    return res.json(usersWithStats);
  } catch (err) {
    return res.status(500).json({ error: 'Failed to retrieve users.' });
  }
});

export default router;
