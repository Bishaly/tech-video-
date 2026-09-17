// ======================================================================
// NextGen Learn — Cloudflare D1 Repository Layer
// Clean SQL abstraction executing against Cloudflare D1 / SQLite
// ======================================================================

import { getD1Database } from './client.ts';
import {
  mapUserRow,
  mapCategoryRow,
  mapCourseRow,
  mapChapterRow,
  mapLessonRow,
  mapPurchaseRow,
  mapPaymentRow,
  mapWatchProgressRow,
} from './mappers.ts';
import {
  User,
  Category,
  Course,
  Chapter,
  Lesson,
  Purchase,
  Payment,
  WatchProgress,
} from '../types.ts';

export const d1Repository = {
  // -------------------------------------------------------------
  // Users Repository
  // -------------------------------------------------------------
  users: {
    async findById(id: string): Promise<User | null> {
      const db = getD1Database();
      const row = await db.prepare('SELECT * FROM users WHERE id = ?').bind(id).first();
      return row ? mapUserRow(row) : null;
    },

    async findByEmail(email: string): Promise<User | null> {
      const db = getD1Database();
      const row = await db
        .prepare('SELECT * FROM users WHERE LOWER(email) = LOWER(?)')
        .bind(email.trim())
        .first();
      return row ? mapUserRow(row) : null;
    },

    async create(user: Omit<User, 'id' | 'created_at' | 'updated_at'>): Promise<User> {
      const db = getD1Database();
      const id = `user_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
      await db
        .prepare(
          `INSERT INTO users (id, email, password_hash, name, role, avatar_url, created_at, updated_at)
           VALUES (?, ?, ?, ?, ?, ?, DATETIME('now'), DATETIME('now'))`
        )
        .bind(
          id,
          user.email.toLowerCase().trim(),
          user.password_hash,
          user.name.trim(),
          user.role || 'student',
          user.avatar_url || null
        )
        .run();

      const created = await this.findById(id);
      if (!created) throw new Error('Failed to create user record');
      return created;
    },

    async update(id: string, updates: Partial<User>): Promise<User | null> {
      const db = getD1Database();
      const fields: string[] = [];
      const values: any[] = [];

      if (updates.name !== undefined) {
        fields.push('name = ?');
        values.push(updates.name);
      }
      if (updates.email !== undefined) {
        fields.push('email = ?');
        values.push(updates.email.toLowerCase().trim());
      }
      if (updates.password_hash !== undefined) {
        fields.push('password_hash = ?');
        values.push(updates.password_hash);
      }
      if (updates.role !== undefined) {
        fields.push('role = ?');
        values.push(updates.role);
      }
      if (updates.avatar_url !== undefined) {
        fields.push('avatar_url = ?');
        values.push(updates.avatar_url);
      }

      if (fields.length === 0) return this.findById(id);

      fields.push("updated_at = DATETIME('now')");
      values.push(id);

      await db
        .prepare(`UPDATE users SET ${fields.join(', ')} WHERE id = ?`)
        .bind(...values)
        .run();

      return this.findById(id);
    },

    async listAll(): Promise<User[]> {
      const db = getD1Database();
      const res = await db.prepare('SELECT * FROM users ORDER BY created_at DESC').all();
      return res.results.map(mapUserRow);
    },

    async count(): Promise<number> {
      const db = getD1Database();
      const row = await db.prepare('SELECT COUNT(*) as c FROM users').first<{ c: number }>();
      return row ? Number(row.c) : 0;
    },
  },

  // -------------------------------------------------------------
  // Categories Repository
  // -------------------------------------------------------------
  categories: {
    async list(): Promise<Category[]> {
      const db = getD1Database();
      const res = await db.prepare('SELECT * FROM categories ORDER BY name ASC').all();
      return res.results.map(mapCategoryRow);
    },

    async findById(id: string): Promise<Category | null> {
      const db = getD1Database();
      const row = await db.prepare('SELECT * FROM categories WHERE id = ?').bind(id).first();
      return row ? mapCategoryRow(row) : null;
    },

    async create(cat: Category): Promise<Category> {
      const db = getD1Database();
      await db
        .prepare(
          `INSERT INTO categories (id, name, slug, description, icon)
           VALUES (?, ?, ?, ?, ?)`
        )
        .bind(cat.id, cat.name, cat.slug, cat.description || null, cat.icon || null)
        .run();
      return cat;
    },
  },

  // -------------------------------------------------------------
  // Courses Repository
  // -------------------------------------------------------------
  courses: {
    async list(filters?: {
      categorySlug?: string;
      search?: string;
      level?: string;
      isPublishedOnly?: boolean;
      sort?: 'popular' | 'newest' | 'price-low' | 'price-high' | 'rating';
    }): Promise<Course[]> {
      const db = getD1Database();
      const whereClauses: string[] = ['1=1'];
      const params: any[] = [];

      if (filters?.isPublishedOnly) {
        whereClauses.push('c.is_published = 1');
      }

      if (filters?.categorySlug) {
        whereClauses.push('cat.slug = ?');
        params.push(filters.categorySlug);
      }

      if (filters?.level && filters.level !== 'All Levels') {
        whereClauses.push('c.level = ?');
        params.push(filters.level);
      }

      if (filters?.search) {
        const query = `%${filters.search.toLowerCase()}%`;
        whereClauses.push(
          '(LOWER(c.title) LIKE ? OR LOWER(c.description) LIKE ? OR LOWER(c.instructor_name) LIKE ?)'
        );
        params.push(query, query, query);
      }

      let orderBy = 'c.review_count DESC';
      if (filters?.sort === 'newest') {
        orderBy = 'c.created_at DESC';
      } else if (filters?.sort === 'price-low') {
        orderBy = 'c.price_inr ASC';
      } else if (filters?.sort === 'price-high') {
        orderBy = 'c.price_inr DESC';
      } else if (filters?.sort === 'rating') {
        orderBy = 'c.rating DESC';
      }

      const sql = `
        SELECT c.*,
               cat.name as cat_name, cat.slug as cat_slug, cat.description as cat_desc, cat.icon as cat_icon,
               (SELECT COUNT(*) FROM lessons l WHERE l.course_id = c.id) as lessons_count
        FROM courses c
        LEFT JOIN categories cat ON c.category_id = cat.id
        WHERE ${whereClauses.join(' AND ')}
        ORDER BY ${orderBy}
      `;

      const res = await db.prepare(sql).bind(...params).all();
      return res.results.map((row: any) => {
        const course = mapCourseRow(row);
        if (row.category_id) {
          course.category = {
            id: row.category_id,
            name: row.cat_name || '',
            slug: row.cat_slug || '',
            description: row.cat_desc || '',
            icon: row.cat_icon || '',
          };
        }
        course.lessons_count = Number(row.lessons_count || 0);
        return course;
      });
    },

    async findById(id: string, includeCurriculum = true): Promise<Course | null> {
      const db = getD1Database();
      const sql = `
        SELECT c.*,
               cat.name as cat_name, cat.slug as cat_slug, cat.description as cat_desc, cat.icon as cat_icon,
               (SELECT COUNT(*) FROM lessons l WHERE l.course_id = c.id) as lessons_count
        FROM courses c
        LEFT JOIN categories cat ON c.category_id = cat.id
        WHERE c.id = ?
      `;

      const row = await db.prepare(sql).bind(id).first();
      if (!row) return null;

      const course = mapCourseRow(row);
      if (course.category_id) {
        course.category = {
          id: course.category_id,
          name: (row as any).cat_name || '',
          slug: (row as any).cat_slug || '',
          description: (row as any).cat_desc || '',
          icon: (row as any).cat_icon || '',
        };
      }
      course.lessons_count = Number((row as any).lessons_count || 0);

      if (includeCurriculum) {
        const chaptersRes = await db
          .prepare('SELECT * FROM chapters WHERE course_id = ? ORDER BY sort_order ASC')
          .bind(id)
          .all();
        const lessonsRes = await db
          .prepare('SELECT * FROM lessons WHERE course_id = ? ORDER BY sort_order ASC')
          .bind(id)
          .all();

        const allLessons = lessonsRes.results.map(mapLessonRow);
        course.chapters = chaptersRes.results.map((chRow: any) => {
          const chap = mapChapterRow(chRow);
          chap.lessons = allLessons.filter((l) => l.chapter_id === chap.id);
          return chap;
        });
      }

      return course;
    },

    async findBySlug(slug: string, includeCurriculum = true): Promise<Course | null> {
      const db = getD1Database();
      const row = await db.prepare('SELECT id FROM courses WHERE slug = ?').bind(slug).first<{ id: string }>();
      if (!row) return null;
      return this.findById(row.id, includeCurriculum);
    },

    async create(course: Omit<Course, 'id' | 'created_at' | 'updated_at'>): Promise<Course> {
      const db = getD1Database();
      const id = `course_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

      await db
        .prepare(
          `INSERT INTO courses (
            id, slug, title, subtitle, description, instructor_name, instructor_title,
            instructor_avatar, instructor_bio, thumbnail_url, price_inr, original_price_inr,
            level, category_id, is_published, duration_hours, rating, review_count,
            what_you_will_learn, requirements, faqs, created_at, updated_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, DATETIME('now'), DATETIME('now'))`
        )
        .bind(
          id,
          course.slug,
          course.title,
          course.subtitle || null,
          course.description,
          course.instructor_name,
          course.instructor_title,
          course.instructor_avatar || null,
          course.instructor_bio || null,
          course.thumbnail_url,
          course.price_inr,
          course.original_price_inr || null,
          course.level,
          course.category_id,
          course.is_published ? 1 : 0,
          course.duration_hours || 0,
          course.rating || 5.0,
          course.review_count || 0,
          JSON.stringify(course.what_you_will_learn || []),
          JSON.stringify(course.requirements || []),
          JSON.stringify(course.faqs || [])
        )
        .run();

      const created = await this.findById(id, false);
      if (!created) throw new Error('Failed to create course in D1');
      return created;
    },

    async update(id: string, updates: Partial<Course>): Promise<Course | null> {
      const db = getD1Database();
      const fields: string[] = [];
      const values: any[] = [];

      const scalarMap: Record<string, any> = {
        title: updates.title,
        subtitle: updates.subtitle,
        slug: updates.slug,
        description: updates.description,
        instructor_name: updates.instructor_name,
        instructor_title: updates.instructor_title,
        instructor_avatar: updates.instructor_avatar,
        instructor_bio: updates.instructor_bio,
        thumbnail_url: updates.thumbnail_url,
        price_inr: updates.price_inr,
        original_price_inr: updates.original_price_inr,
        level: updates.level,
        category_id: updates.category_id,
        is_published: updates.is_published !== undefined ? (updates.is_published ? 1 : 0) : undefined,
        duration_hours: updates.duration_hours,
        rating: updates.rating,
        review_count: updates.review_count,
      };

      for (const [col, val] of Object.entries(scalarMap)) {
        if (val !== undefined) {
          fields.push(`${col} = ?`);
          values.push(val);
        }
      }

      if (updates.what_you_will_learn !== undefined) {
        fields.push('what_you_will_learn = ?');
        values.push(JSON.stringify(updates.what_you_will_learn));
      }
      if (updates.requirements !== undefined) {
        fields.push('requirements = ?');
        values.push(JSON.stringify(updates.requirements));
      }
      if (updates.faqs !== undefined) {
        fields.push('faqs = ?');
        values.push(JSON.stringify(updates.faqs));
      }

      if (fields.length > 0) {
        fields.push("updated_at = DATETIME('now')");
        values.push(id);
        await db
          .prepare(`UPDATE courses SET ${fields.join(', ')} WHERE id = ?`)
          .bind(...values)
          .run();
      }

      return this.findById(id);
    },

    async delete(id: string): Promise<boolean> {
      const db = getD1Database();
      const res = await db.prepare('DELETE FROM courses WHERE id = ?').bind(id).run();
      return (res.meta.changes ?? 0) > 0;
    },

    async count(): Promise<number> {
      const db = getD1Database();
      const row = await db.prepare('SELECT COUNT(*) as c FROM courses').first<{ c: number }>();
      return row ? Number(row.c) : 0;
    },
  },

  // -------------------------------------------------------------
  // Chapters Repository
  // -------------------------------------------------------------
  chapters: {
    async listByCourse(courseId: string): Promise<Chapter[]> {
      const db = getD1Database();
      const res = await db
        .prepare('SELECT * FROM chapters WHERE course_id = ? ORDER BY sort_order ASC')
        .bind(courseId)
        .all();
      return res.results.map(mapChapterRow);
    },

    async create(chapter: Omit<Chapter, 'id' | 'created_at'>): Promise<Chapter> {
      const db = getD1Database();
      const id = `chap_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
      await db
        .prepare(
          `INSERT INTO chapters (id, course_id, title, sort_order, created_at)
           VALUES (?, ?, ?, ?, DATETIME('now'))`
        )
        .bind(id, chapter.course_id, chapter.title, chapter.sort_order || 0)
        .run();

      const row = await db.prepare('SELECT * FROM chapters WHERE id = ?').bind(id).first();
      return mapChapterRow(row);
    },

    async update(id: string, updates: Partial<Chapter>): Promise<Chapter | null> {
      const db = getD1Database();
      const fields: string[] = [];
      const values: any[] = [];

      if (updates.title !== undefined) {
        fields.push('title = ?');
        values.push(updates.title);
      }
      if (updates.sort_order !== undefined) {
        fields.push('sort_order = ?');
        values.push(updates.sort_order);
      }

      if (fields.length === 0) {
        const row = await db.prepare('SELECT * FROM chapters WHERE id = ?').bind(id).first();
        return row ? mapChapterRow(row) : null;
      }

      values.push(id);
      await db
        .prepare(`UPDATE chapters SET ${fields.join(', ')} WHERE id = ?`)
        .bind(...values)
        .run();

      const updated = await db.prepare('SELECT * FROM chapters WHERE id = ?').bind(id).first();
      return updated ? mapChapterRow(updated) : null;
    },

    async delete(id: string): Promise<boolean> {
      const db = getD1Database();
      const res = await db.prepare('DELETE FROM chapters WHERE id = ?').bind(id).run();
      return (res.meta.changes ?? 0) > 0;
    },
  },

  // -------------------------------------------------------------
  // Lessons Repository
  // -------------------------------------------------------------
  lessons: {
    async findById(id: string): Promise<Lesson | null> {
      const db = getD1Database();
      const row = await db.prepare('SELECT * FROM lessons WHERE id = ?').bind(id).first();
      return row ? mapLessonRow(row) : null;
    },

    async listByCourse(courseId: string): Promise<Lesson[]> {
      const db = getD1Database();
      const res = await db
        .prepare('SELECT * FROM lessons WHERE course_id = ? ORDER BY sort_order ASC')
        .bind(courseId)
        .all();
      return res.results.map(mapLessonRow);
    },

    async create(lesson: Omit<Lesson, 'id' | 'created_at'>): Promise<Lesson> {
      const db = getD1Database();
      const id = `les_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;

      await db
        .prepare(
          `INSERT INTO lessons (
            id, chapter_id, course_id, title, description, duration_seconds,
            is_free_preview, sort_order, cloudflare_video_id, cloudflare_playback_hls,
            status, is_published, created_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, DATETIME('now'))`
        )
        .bind(
          id,
          lesson.chapter_id,
          lesson.course_id,
          lesson.title,
          lesson.description || null,
          lesson.duration_seconds || 0,
          lesson.is_free_preview ? 1 : 0,
          lesson.sort_order || 0,
          lesson.cloudflare_video_id || null,
          lesson.cloudflare_playback_hls || null,
          lesson.status || 'ready',
          lesson.is_published !== false ? 1 : 0
        )
        .run();

      const created = await this.findById(id);
      if (!created) throw new Error('Failed to create lesson in D1');
      return created;
    },

    async update(id: string, updates: Partial<Lesson>): Promise<Lesson | null> {
      const db = getD1Database();
      const fields: string[] = [];
      const values: any[] = [];

      const mapping: Record<string, any> = {
        title: updates.title,
        description: updates.description,
        duration_seconds: updates.duration_seconds,
        is_free_preview: updates.is_free_preview !== undefined ? (updates.is_free_preview ? 1 : 0) : undefined,
        sort_order: updates.sort_order,
        cloudflare_video_id: updates.cloudflare_video_id,
        cloudflare_playback_hls: updates.cloudflare_playback_hls,
        status: updates.status,
        is_published: updates.is_published !== undefined ? (updates.is_published ? 1 : 0) : undefined,
      };

      for (const [col, val] of Object.entries(mapping)) {
        if (val !== undefined) {
          fields.push(`${col} = ?`);
          values.push(val);
        }
      }

      if (fields.length > 0) {
        values.push(id);
        await db
          .prepare(`UPDATE lessons SET ${fields.join(', ')} WHERE id = ?`)
          .bind(...values)
          .run();
      }

      return this.findById(id);
    },

    async delete(id: string): Promise<boolean> {
      const db = getD1Database();
      const res = await db.prepare('DELETE FROM lessons WHERE id = ?').bind(id).run();
      return (res.meta.changes ?? 0) > 0;
    },

    async count(): Promise<number> {
      const db = getD1Database();
      const row = await db.prepare('SELECT COUNT(*) as c FROM lessons').first<{ c: number }>();
      return row ? Number(row.c) : 0;
    },
  },

  // -------------------------------------------------------------
  // Purchases Repository
  // -------------------------------------------------------------
  purchases: {
    async create(purchase: Omit<Purchase, 'id' | 'created_at' | 'purchase_date'>): Promise<Purchase> {
      const db = getD1Database();
      const id = `purch_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

      await db
        .prepare(
          `INSERT INTO purchases (
            id, user_id, course_id, razorpay_order_id, razorpay_payment_id,
            amount_inr, currency, payment_status, verification_status, purchase_date, created_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, DATETIME('now'), DATETIME('now'))`
        )
        .bind(
          id,
          purchase.user_id,
          purchase.course_id,
          purchase.razorpay_order_id,
          purchase.razorpay_payment_id || null,
          purchase.amount_inr,
          purchase.currency || 'INR',
          purchase.payment_status || 'pending',
          purchase.verification_status || 'unverified'
        )
        .run();

      const row = await db.prepare('SELECT * FROM purchases WHERE id = ?').bind(id).first();
      return mapPurchaseRow(row);
    },

    async findByOrder(orderId: string): Promise<Purchase | null> {
      const db = getD1Database();
      const row = await db
        .prepare('SELECT * FROM purchases WHERE razorpay_order_id = ?')
        .bind(orderId)
        .first();
      return row ? mapPurchaseRow(row) : null;
    },

    async findByUserAndCourse(userId: string, courseId: string): Promise<Purchase | null> {
      const db = getD1Database();
      const row = await db
        .prepare(
          `SELECT * FROM purchases
           WHERE user_id = ? AND course_id = ? AND payment_status = 'success'`
        )
        .bind(userId, courseId)
        .first();
      return row ? mapPurchaseRow(row) : null;
    },

    async listByUser(userId: string): Promise<Purchase[]> {
      const db = getD1Database();
      const res = await db
        .prepare(
          `SELECT p.*,
                  c.title as course_title, c.slug as course_slug, c.thumbnail_url as course_thumb,
                  c.instructor_name as course_instructor, c.duration_hours as course_duration,
                  c.description as course_desc,
                  (SELECT COUNT(*) FROM lessons l WHERE l.course_id = p.course_id) as lessons_count
           FROM purchases p
           LEFT JOIN courses c ON p.course_id = c.id
           WHERE p.user_id = ? AND p.payment_status = 'success'
           ORDER BY p.created_at DESC`
        )
        .bind(userId)
        .all();

      return res.results.map((row: any) => {
        const purch = mapPurchaseRow(row);
        purch.course = {
          id: row.course_id,
          title: row.course_title || 'Course',
          slug: row.course_slug || '',
          thumbnail_url: row.course_thumb || '',
          instructor_name: row.course_instructor || '',
          instructor_title: '',
          description: row.course_desc || '',
          price_inr: row.amount_inr,
          level: 'All Levels',
          category_id: '',
          is_published: true,
          duration_hours: Number(row.course_duration || 0),
          rating: 5.0,
          review_count: 0,
          what_you_will_learn: [],
          requirements: [],
          faqs: [],
          created_at: row.created_at,
          updated_at: row.created_at,
          lessons_count: Number(row.lessons_count || 0),
        };
        return purch;
      });
    },

    async listAll(): Promise<Purchase[]> {
      const db = getD1Database();
      const res = await db
        .prepare(
          `SELECT p.*,
                  u.name as user_name, u.email as user_email,
                  c.title as course_title, c.slug as course_slug
           FROM purchases p
           LEFT JOIN users u ON p.user_id = u.id
           LEFT JOIN courses c ON p.course_id = c.id
           ORDER BY p.created_at DESC`
        )
        .all();

      return res.results.map((row: any) => {
        const purch = mapPurchaseRow(row);
        if (row.user_name) {
          purch.user = {
            id: purch.user_id,
            name: row.user_name,
            email: row.user_email || '',
          };
        }
        if (row.course_title) {
          purch.course = {
            id: purch.course_id,
            title: row.course_title,
            slug: row.course_slug || '',
            thumbnail_url: '',
            instructor_name: '',
            instructor_title: '',
            description: '',
            price_inr: purch.amount_inr,
            level: 'All Levels',
            category_id: '',
            is_published: true,
            duration_hours: 0,
            rating: 5.0,
            review_count: 0,
            what_you_will_learn: [],
            requirements: [],
            faqs: [],
            created_at: purch.created_at,
            updated_at: purch.created_at,
          };
        }
        return purch;
      });
    },

    async updatePaymentStatus(
      id: string,
      status: 'success' | 'failed' | 'refunded',
      verificationStatus: 'verified' | 'unverified' | 'failed',
      paymentId?: string
    ): Promise<Purchase | null> {
      const db = getD1Database();
      await db
        .prepare(
          `UPDATE purchases
           SET payment_status = ?,
               verification_status = ?,
               razorpay_payment_id = COALESCE(?, razorpay_payment_id)
           WHERE id = ?`
        )
        .bind(status, verificationStatus, paymentId || null, id)
        .run();

      const row = await db.prepare('SELECT * FROM purchases WHERE id = ?').bind(id).first();
      return row ? mapPurchaseRow(row) : null;
    },

    async count(): Promise<number> {
      const db = getD1Database();
      const row = await db
        .prepare("SELECT COUNT(*) as c FROM purchases WHERE payment_status = 'success'")
        .first<{ c: number }>();
      return row ? Number(row.c) : 0;
    },

    async totalRevenue(): Promise<number> {
      const db = getD1Database();
      const row = await db
        .prepare("SELECT SUM(amount_inr) as rev FROM purchases WHERE payment_status = 'success'")
        .first<{ rev: number }>();
      return row && row.rev ? Number(row.rev) : 0;
    },
  },

  // -------------------------------------------------------------
  // Payments Audit Log Repository
  // -------------------------------------------------------------
  payments: {
    async create(payment: Omit<Payment, 'id' | 'created_at'>): Promise<Payment> {
      const db = getD1Database();
      const id = `pay_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

      await db
        .prepare(
          `INSERT INTO payments (
            id, purchase_id, user_id, course_id, razorpay_order_id, razorpay_payment_id,
            razorpay_signature, amount_inr, currency, status, error_code, error_description,
            raw_payload, created_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, DATETIME('now'))`
        )
        .bind(
          id,
          payment.purchase_id || null,
          payment.user_id,
          payment.course_id,
          payment.razorpay_order_id,
          payment.razorpay_payment_id,
          payment.razorpay_signature || null,
          payment.amount_inr,
          payment.currency || 'INR',
          payment.status,
          payment.error_code || null,
          payment.error_description || null,
          payment.raw_payload ? JSON.stringify(payment.raw_payload) : null
        )
        .run();

      const row = await db.prepare('SELECT * FROM payments WHERE id = ?').bind(id).first();
      return mapPaymentRow(row);
    },

    async listAll(): Promise<Payment[]> {
      const db = getD1Database();
      const res = await db.prepare('SELECT * FROM payments ORDER BY created_at DESC').all();
      return res.results.map(mapPaymentRow);
    },
  },

  // -------------------------------------------------------------
  // Watch Progress Repository
  // -------------------------------------------------------------
  watchProgress: {
    async get(userId: string, lessonId: string): Promise<WatchProgress | null> {
      const db = getD1Database();
      const row = await db
        .prepare('SELECT * FROM watch_progress WHERE user_id = ? AND lesson_id = ?')
        .bind(userId, lessonId)
        .first();
      return row ? mapWatchProgressRow(row) : null;
    },

    async listByCourse(userId: string, courseId: string): Promise<WatchProgress[]> {
      const db = getD1Database();
      const res = await db
        .prepare('SELECT * FROM watch_progress WHERE user_id = ? AND course_id = ?')
        .bind(userId, courseId)
        .all();
      return res.results.map(mapWatchProgressRow);
    },

    async upsert(
      userId: string,
      courseId: string,
      lessonId: string,
      position: number,
      duration: number,
      isCompleted: boolean
    ): Promise<WatchProgress> {
      const db = getD1Database();
      const id = `prog_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;

      await db
        .prepare(
          `INSERT INTO watch_progress (
            id, user_id, course_id, lesson_id, last_watched_position_seconds, duration_seconds,
            is_completed, updated_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, DATETIME('now'))
          ON CONFLICT (user_id, lesson_id) DO UPDATE SET
            last_watched_position_seconds = excluded.last_watched_position_seconds,
            duration_seconds = MAX(watch_progress.duration_seconds, excluded.duration_seconds),
            is_completed = CASE WHEN excluded.is_completed = 1 THEN 1 ELSE watch_progress.is_completed END,
            updated_at = DATETIME('now')`
        )
        .bind(
          id,
          userId,
          courseId,
          lessonId,
          Math.floor(position),
          Math.floor(duration),
          isCompleted ? 1 : 0
        )
        .run();

      const row = await db
        .prepare('SELECT * FROM watch_progress WHERE user_id = ? AND lesson_id = ?')
        .bind(userId, lessonId)
        .first();
      return mapWatchProgressRow(row);
    },
  },

  // -------------------------------------------------------------
  // Operations Dashboard Stats Helper
  // -------------------------------------------------------------
  stats: {
    async getOverview() {
      const db = getD1Database();

      const [userCountRow, courseCountRow, lessonCountRow, orderSummaryRow] = await Promise.all([
        db.prepare("SELECT COUNT(*) as c FROM users WHERE role = 'student'").first<{ c: number }>(),
        db.prepare('SELECT COUNT(*) as c FROM courses').first<{ c: number }>(),
        db.prepare('SELECT COUNT(*) as c FROM lessons').first<{ c: number }>(),
        db
          .prepare(
            `SELECT COUNT(*) as total_orders, COALESCE(SUM(amount_inr), 0) as total_revenue
             FROM purchases WHERE payment_status = 'success'`
          )
          .first<{ total_orders: number; total_revenue: number }>(),
      ]);

      const totalUsers = userCountRow ? Number(userCountRow.c) : 0;
      const totalCourses = courseCountRow ? Number(courseCountRow.c) : 0;
      const totalLessons = lessonCountRow ? Number(lessonCountRow.c) : 0;
      const totalOrders = orderSummaryRow ? Number(orderSummaryRow.total_orders) : 0;
      const totalRevenue = orderSummaryRow ? Number(orderSummaryRow.total_revenue) : 0;

      // Recent purchases with user and course join
      const recentPurchasesRes = await db
        .prepare(
          `SELECT p.*,
                  u.name as user_name, u.email as user_email,
                  c.title as course_title
           FROM purchases p
           LEFT JOIN users u ON p.user_id = u.id
           LEFT JOIN courses c ON p.course_id = c.id
           WHERE p.payment_status = 'success'
           ORDER BY p.created_at DESC
           LIMIT 8`
        )
        .all();

      const recentPurchases = recentPurchasesRes.results.map((row: any) => ({
        ...mapPurchaseRow(row),
        user_name: row.user_name || 'Customer',
        user_email: row.user_email || 'N/A',
        course_title: row.course_title || 'Course',
      }));

      // Recent users with enrolled courses count
      const recentUsersRes = await db
        .prepare(
          `SELECT u.*,
                  (SELECT COUNT(*) FROM purchases p WHERE p.user_id = u.id AND p.payment_status = 'success') as courses_count
           FROM users u
           ORDER BY u.created_at DESC
           LIMIT 8`
        )
        .all();

      const recentUsers = recentUsersRes.results.map((row: any) => ({
        id: row.id,
        name: row.name,
        email: row.email,
        role: row.role,
        created_at: row.created_at,
        courses_count: Number(row.courses_count || 0),
      }));

      return {
        totalUsers,
        totalCourses,
        totalLessons,
        totalOrders,
        totalRevenue,
        recentPurchases,
        recentUsers,
      };
    },
  },
};
