export interface User {
  id: string;
  email: string;
  password_hash: string;
  name: string;
  role: 'student' | 'admin';
  avatar_url?: string;
  created_at: string;
  updated_at: string;
}

export interface Category {
  id: string;
  name: string;
  slug: string;
  description: string;
  icon: string;
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
  updated_at: string;
  chapters?: Chapter[];
  lessons_count?: number;
  is_enrolled?: boolean;
}

export interface Chapter {
  id: string;
  course_id: string;
  title: string;
  sort_order: number;
  created_at: string;
  lessons?: Lesson[];
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
  cloudflare_playback_hls?: string;
  status: 'ready' | 'processing' | 'draft';
  is_published: boolean;
  created_at: string;
  is_completed?: boolean;
  progress_seconds?: number;
}

export interface Purchase {
  id: string;
  user_id: string;
  course_id: string;
  razorpay_order_id: string;
  razorpay_payment_id?: string;
  amount_inr: number;
  currency: string;
  payment_status: 'pending' | 'success' | 'failed' | 'refunded';
  verification_status: 'verified' | 'unverified' | 'failed';
  purchase_date: string;
  created_at: string;
  course?: Course;
  user?: {
    id: string;
    email: string;
    name: string;
  };
}

export interface Payment {
  id: string;
  purchase_id?: string;
  user_id: string;
  course_id: string;
  razorpay_order_id: string;
  razorpay_payment_id: string;
  razorpay_signature?: string;
  amount_inr: number;
  currency: string;
  status: 'captured' | 'failed' | 'authorized';
  error_code?: string;
  error_description?: string;
  raw_payload?: any;
  created_at: string;
}

export interface WatchProgress {
  id: string;
  user_id: string;
  course_id: string;
  lesson_id: string;
  last_watched_position_seconds: number;
  duration_seconds: number;
  is_completed: boolean;
  updated_at: string;
}

export interface JWTPayload {
  userId: string;
  email: string;
  role: 'student' | 'admin';
  name: string;
}
