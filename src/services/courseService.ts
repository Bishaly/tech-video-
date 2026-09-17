import { Course, Category, EnrolledCourseItem } from '../types/index.ts';
import { apiRequest } from '../lib/api.ts';

export interface CourseFilterOptions {
  categoryId?: string;
  search?: string;
  level?: string;
  sort?: 'popular' | 'price-asc' | 'price-desc' | 'newest';
}

export const courseService = {
  async getCategories(): Promise<Category[]> {
    return apiRequest<Category[]>('/api/courses/categories');
  },

  async getCourses(filters?: CourseFilterOptions): Promise<Course[]> {
    const params = new URLSearchParams();
    if (filters?.categoryId && filters.categoryId !== 'all') {
      params.set('category', filters.categoryId);
    }
    if (filters?.search) {
      params.set('search', filters.search);
    }
    if (filters?.level && filters.level !== 'all') {
      params.set('level', filters.level);
    }
    if (filters?.sort) {
      params.set('sort', filters.sort);
    }
    const query = params.toString() ? `?${params.toString()}` : '';
    return apiRequest<Course[]>(`/api/courses${query}`);
  },

  async getCourseBySlug(slug: string): Promise<Course> {
    return apiRequest<Course>(`/api/courses/${slug}`);
  },

  async getMyEnrolledCourses(): Promise<EnrolledCourseItem[]> {
    return apiRequest<EnrolledCourseItem[]>('/api/courses/my/enrolled');
  },

  // Admin Course Operations
  async getAdminCourses(): Promise<Course[]> {
    return apiRequest<Course[]>('/api/admin/courses');
  },

  async getAdminCourseById(id: string): Promise<Course> {
    return apiRequest<Course>(`/api/admin/courses/${id}`);
  },

  async createCourse(courseData: Partial<Course>): Promise<Course> {
    return apiRequest<Course>('/api/admin/courses', {
      method: 'POST',
      body: JSON.stringify(courseData),
    });
  },

  async updateCourse(id: string, courseData: Partial<Course>): Promise<Course> {
    return apiRequest<Course>(`/api/admin/courses/${id}`, {
      method: 'PUT',
      body: JSON.stringify(courseData),
    });
  },

  async deleteCourse(id: string): Promise<{ success: boolean }> {
    return apiRequest<{ success: boolean }>(`/api/admin/courses/${id}`, {
      method: 'DELETE',
    });
  },
};
