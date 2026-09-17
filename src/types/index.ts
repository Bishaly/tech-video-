export interface User {
  id: string;
  email: string;
  name: string;
  role: 'student' | 'admin';
  avatar_url?: string;
}

export interface Category {
  id: string;
  name: string;
  slug: string;
  description: string;
  icon: string;
}

export interface Lesson {
  id: string;
  chapter_id: string;
  course_id: string;
  title: string;
  description?: string;
  duration_seconds: number;
  is_free_preview: boolean;
  sort_order: number;
  cloudflare_video_id?: string;
  is_locked?: boolean;
  is_completed?: boolean;
  is_published?: boolean;
  status?: string;
  last_watched_position?: number;
}

export interface Chapter {
  id: string;
  course_id: string;
  title: string;
  sort_order: number;
  lessons?: Lesson[];
}

export interface Course {
  id: string;
  slug: string;
  title: string;
  subtitle?: string;
  description: string;
  instructor_name: string;
  instructor_title: string;
  instructor_avatar?: string;
  instructor_bio?: string;
  thumbnail_url: string;
  price_inr: number;
  original_price_inr?: number;
  level: 'Beginner' | 'Intermediate' | 'Advanced' | 'All Levels';
  category_id: string;
  category?: Category;
  is_published: boolean;
  duration_hours: number;
  rating: number;
  review_count: number;
  what_you_will_learn: string[];
  requirements: string[];
  faqs: Array<{ question: string; answer: string }>;
  created_at: string;
  chapters?: Chapter[];
  lessons_count?: number;
  is_enrolled?: boolean;
}

export interface EnrolledCourseItem {
  purchase_id: string;
  purchased_at: string;
  course: {
    id: string;
    slug: string;
    title: string;
    thumbnail_url: string;
    instructor_name: string;
    duration_hours: number;
    total_lessons: number;
  };
  progress: {
    completed_lessons: number;
    total_lessons: number;
    percentage: number;
    last_lesson_id: string;
  };
}

export interface CurriculumData {
  course: {
    id: string;
    slug: string;
    title: string;
    description?: string;
    thumbnail_url: string;
    instructor_name: string;
    price_inr?: number;
    original_price_inr?: number;
    is_enrolled: boolean;
  };
  chapters: Array<{
    id: string;
    title: string;
    sort_order: number;
    lessons: Lesson[];
  }>;
  stats: {
    total_lessons: number;
    completed_lessons: number;
    progress_percent: number;
  };
}

export interface PlaybackData {
  lesson: {
    id: string;
    title: string;
    description?: string;
    duration_seconds: number;
    is_free_preview: boolean;
    is_locked: boolean;
    is_published?: boolean;
  };
  playback?: {
    token: string;
    embedUrl: string;
    playbackHls: string;
    expiresAt: string;
  };
  progress?: {
    last_watched_position_seconds: number;
    is_completed: boolean;
  };
  isConfigured?: boolean;
  message?: string;
  error?: string;
  isLocked?: boolean;
  requiresAuth?: boolean;
}

export interface AdminStats {
  totalUsers: number;
  totalCourses: number;
  totalLessons: number;
  totalOrders: number;
  totalRevenue: number;
  recentPurchases: Array<{
    id: string;
    user_name: string;
    user_email: string;
    course_title: string;
    amount_inr: number;
    payment_status: string;
    verification_status: string;
    purchase_date: string;
  }>;
  recentUsers: Array<{
    id: string;
    name: string;
    email: string;
    role: string;
    created_at: string;
    courses_count: number;
  }>;
}

export interface AdminOrder {
  id: string;
  user_id: string;
  course_id: string;
  razorpay_order_id: string;
  razorpay_payment_id?: string;
  amount_inr: number;
  currency: string;
  payment_status: string;
  verification_status: string;
  purchase_date: string;
  user?: {
    id: string;
    name: string;
    email: string;
  };
  course?: {
    id: string;
    title: string;
  };
}

export interface AdminUser {
  id: string;
  name: string;
  email: string;
  role: string;
  avatar_url?: string;
  created_at: string;
  courses_count: number;
  total_spent_inr: number;
}
