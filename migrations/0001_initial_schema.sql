-- ======================================================================
-- Cloudflare D1 Database Schema — Migration 0001
-- Database: nextgen_learn_d1 (SQLite at the Edge)
-- ======================================================================

PRAGMA foreign_keys = ON;

-- 1. Users (Students and Administrators)
CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    name TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'student' CHECK (role IN ('student', 'admin')),
    avatar_url TEXT,
    created_at TEXT NOT NULL DEFAULT (DATETIME('now')),
    updated_at TEXT NOT NULL DEFAULT (DATETIME('now'))
);

CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);

-- 2. Categories
CREATE TABLE IF NOT EXISTS categories (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    slug TEXT UNIQUE NOT NULL,
    description TEXT,
    icon TEXT
);

CREATE INDEX IF NOT EXISTS idx_categories_slug ON categories(slug);

-- 3. Courses
CREATE TABLE IF NOT EXISTS courses (
    id TEXT PRIMARY KEY,
    slug TEXT UNIQUE NOT NULL,
    title TEXT NOT NULL,
    subtitle TEXT,
    description TEXT NOT NULL,
    instructor_name TEXT NOT NULL,
    instructor_title TEXT NOT NULL,
    instructor_avatar TEXT,
    instructor_bio TEXT,
    thumbnail_url TEXT NOT NULL,
    price_inr INTEGER NOT NULL DEFAULT 0,
    original_price_inr INTEGER,
    level TEXT NOT NULL DEFAULT 'All Levels' CHECK (level IN ('Beginner', 'Intermediate', 'Advanced', 'All Levels')),
    category_id TEXT REFERENCES categories(id) ON DELETE SET NULL,
    is_published INTEGER NOT NULL DEFAULT 0,
    duration_hours REAL NOT NULL DEFAULT 0.0,
    rating REAL NOT NULL DEFAULT 5.0,
    review_count INTEGER NOT NULL DEFAULT 0,
    what_you_will_learn TEXT NOT NULL DEFAULT '[]',
    requirements TEXT NOT NULL DEFAULT '[]',
    faqs TEXT NOT NULL DEFAULT '[]',
    created_at TEXT NOT NULL DEFAULT (DATETIME('now')),
    updated_at TEXT NOT NULL DEFAULT (DATETIME('now'))
);

CREATE INDEX IF NOT EXISTS idx_courses_slug ON courses(slug);
CREATE INDEX IF NOT EXISTS idx_courses_category ON courses(category_id);
CREATE INDEX IF NOT EXISTS idx_courses_published ON courses(is_published);

-- 4. Chapters (Course Modules)
CREATE TABLE IF NOT EXISTS chapters (
    id TEXT PRIMARY KEY,
    course_id TEXT NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    sort_order INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL DEFAULT (DATETIME('now'))
);

CREATE INDEX IF NOT EXISTS idx_chapters_course ON chapters(course_id);
CREATE INDEX IF NOT EXISTS idx_chapters_order ON chapters(course_id, sort_order);

-- 5. Lessons (Video Lessons hosted on Cloudflare Stream)
CREATE TABLE IF NOT EXISTS lessons (
    id TEXT PRIMARY KEY,
    chapter_id TEXT NOT NULL REFERENCES chapters(id) ON DELETE CASCADE,
    course_id TEXT NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT,
    duration_seconds INTEGER NOT NULL DEFAULT 0,
    is_free_preview INTEGER NOT NULL DEFAULT 0,
    sort_order INTEGER NOT NULL DEFAULT 0,
    cloudflare_video_id TEXT,
    cloudflare_playback_hls TEXT,
    status TEXT NOT NULL DEFAULT 'ready' CHECK (status IN ('ready', 'processing', 'draft')),
    is_published INTEGER NOT NULL DEFAULT 1,
    created_at TEXT NOT NULL DEFAULT (DATETIME('now'))
);

CREATE INDEX IF NOT EXISTS idx_lessons_chapter ON lessons(chapter_id);
CREATE INDEX IF NOT EXISTS idx_lessons_course ON lessons(course_id);
CREATE INDEX IF NOT EXISTS idx_lessons_order ON lessons(chapter_id, sort_order);

-- 6. Purchases (Course access records)
CREATE TABLE IF NOT EXISTS purchases (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    course_id TEXT NOT NULL REFERENCES courses(id) ON DELETE RESTRICT,
    razorpay_order_id TEXT NOT NULL,
    razorpay_payment_id TEXT,
    amount_inr INTEGER NOT NULL,
    currency TEXT NOT NULL DEFAULT 'INR',
    payment_status TEXT NOT NULL DEFAULT 'pending' CHECK (payment_status IN ('pending', 'success', 'failed', 'refunded')),
    verification_status TEXT NOT NULL DEFAULT 'unverified' CHECK (verification_status IN ('verified', 'unverified', 'failed')),
    purchase_date TEXT NOT NULL DEFAULT (DATETIME('now')),
    created_at TEXT NOT NULL DEFAULT (DATETIME('now')),
    CONSTRAINT unique_user_course_purchase UNIQUE (user_id, course_id)
);

CREATE INDEX IF NOT EXISTS idx_purchases_user ON purchases(user_id);
CREATE INDEX IF NOT EXISTS idx_purchases_course ON purchases(course_id);
CREATE INDEX IF NOT EXISTS idx_purchases_order ON purchases(razorpay_order_id);
CREATE INDEX IF NOT EXISTS idx_purchases_payment ON purchases(razorpay_payment_id);

-- 7. Payments (Transaction and webhook audit log)
CREATE TABLE IF NOT EXISTS payments (
    id TEXT PRIMARY KEY,
    purchase_id TEXT REFERENCES purchases(id) ON DELETE SET NULL,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    course_id TEXT NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
    razorpay_order_id TEXT NOT NULL,
    razorpay_payment_id TEXT NOT NULL,
    razorpay_signature TEXT,
    amount_inr INTEGER NOT NULL,
    currency TEXT NOT NULL DEFAULT 'INR',
    status TEXT NOT NULL CHECK (status IN ('captured', 'failed', 'authorized')),
    error_code TEXT,
    error_description TEXT,
    raw_payload TEXT,
    created_at TEXT NOT NULL DEFAULT (DATETIME('now'))
);

CREATE INDEX IF NOT EXISTS idx_payments_order ON payments(razorpay_order_id);
CREATE INDEX IF NOT EXISTS idx_payments_payment ON payments(razorpay_payment_id);

-- 8. Watch Progress
CREATE TABLE IF NOT EXISTS watch_progress (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    course_id TEXT NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
    lesson_id TEXT NOT NULL REFERENCES lessons(id) ON DELETE CASCADE,
    last_watched_position_seconds INTEGER NOT NULL DEFAULT 0,
    duration_seconds INTEGER NOT NULL DEFAULT 0,
    is_completed INTEGER NOT NULL DEFAULT 0,
    updated_at TEXT NOT NULL DEFAULT (DATETIME('now')),
    CONSTRAINT unique_user_lesson_progress UNIQUE (user_id, lesson_id)
);

CREATE INDEX IF NOT EXISTS idx_watch_user_course ON watch_progress(user_id, course_id);
CREATE INDEX IF NOT EXISTS idx_watch_lesson ON watch_progress(lesson_id);
