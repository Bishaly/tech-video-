// ======================================================================
// D1 Row to Domain Entity Mappers
// Handles SQLite scalar conversions (0/1 booleans, JSON text fields)
// ======================================================================

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

function safeJsonParse<T>(val: any, fallback: T): T {
  if (typeof val !== 'string') return val ?? fallback;
  try {
    return JSON.parse(val);
  } catch {
    return fallback;
  }
}

export function mapUserRow(row: any): User {
  return {
    id: row.id,
    email: row.email,
    password_hash: row.password_hash,
    name: row.name,
    role: row.role,
    avatar_url: row.avatar_url || undefined,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

export function mapCategoryRow(row: any): Category {
  return {
    id: row.id,
    name: row.name,
    slug: row.slug,
    description: row.description || '',
    icon: row.icon || '',
  };
}

export function mapCourseRow(row: any): Course {
  return {
    id: row.id,
    slug: row.slug,
    title: row.title,
    subtitle: row.subtitle || undefined,
    description: row.description,
    instructor_name: row.instructor_name,
    instructor_title: row.instructor_title,
    instructor_avatar: row.instructor_avatar || undefined,
    instructor_bio: row.instructor_bio || undefined,
    thumbnail_url: row.thumbnail_url,
    price_inr: Number(row.price_inr),
    original_price_inr: row.original_price_inr ? Number(row.original_price_inr) : undefined,
    level: row.level,
    category_id: row.category_id,
    is_published: Boolean(row.is_published),
    duration_hours: Number(row.duration_hours),
    rating: Number(row.rating),
    review_count: Number(row.review_count),
    what_you_will_learn: safeJsonParse<string[]>(row.what_you_will_learn, []),
    requirements: safeJsonParse<string[]>(row.requirements, []),
    faqs: safeJsonParse<Array<{ question: string; answer: string }>>(row.faqs, []),
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

export function mapChapterRow(row: any): Chapter {
  return {
    id: row.id,
    course_id: row.course_id,
    title: row.title,
    sort_order: Number(row.sort_order),
    created_at: row.created_at,
  };
}

export function mapLessonRow(row: any): Lesson {
  return {
    id: row.id,
    chapter_id: row.chapter_id,
    course_id: row.course_id,
    title: row.title,
    description: row.description || undefined,
    duration_seconds: Number(row.duration_seconds),
    is_free_preview: Boolean(row.is_free_preview),
    sort_order: Number(row.sort_order),
    cloudflare_video_id: row.cloudflare_video_id || undefined,
    cloudflare_playback_hls: row.cloudflare_playback_hls || undefined,
    status: row.status,
    is_published: Boolean(row.is_published),
    created_at: row.created_at,
  };
}

export function mapPurchaseRow(row: any): Purchase {
  return {
    id: row.id,
    user_id: row.user_id,
    course_id: row.course_id,
    razorpay_order_id: row.razorpay_order_id,
    razorpay_payment_id: row.razorpay_payment_id || undefined,
    amount_inr: Number(row.amount_inr),
    currency: row.currency || 'INR',
    payment_status: row.payment_status,
    verification_status: row.verification_status,
    purchase_date: row.purchase_date,
    created_at: row.created_at,
  };
}

export function mapPaymentRow(row: any): Payment {
  return {
    id: row.id,
    purchase_id: row.purchase_id || undefined,
    user_id: row.user_id,
    course_id: row.course_id,
    razorpay_order_id: row.razorpay_order_id,
    razorpay_payment_id: row.razorpay_payment_id,
    razorpay_signature: row.razorpay_signature || undefined,
    amount_inr: Number(row.amount_inr),
    currency: row.currency || 'INR',
    status: row.status,
    error_code: row.error_code || undefined,
    error_description: row.error_description || undefined,
    raw_payload: safeJsonParse(row.raw_payload, undefined),
    created_at: row.created_at,
  };
}

export function mapWatchProgressRow(row: any): WatchProgress {
  return {
    id: row.id,
    user_id: row.user_id,
    course_id: row.course_id,
    lesson_id: row.lesson_id,
    last_watched_position_seconds: Number(row.last_watched_position_seconds),
    duration_seconds: Number(row.duration_seconds),
    is_completed: Boolean(row.is_completed),
    updated_at: row.updated_at,
  };
}
