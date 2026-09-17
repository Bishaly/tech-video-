import { Chapter, Lesson } from '../types/index.ts';
import { apiRequest } from '../lib/api.ts';

export const lessonService = {
  // Admin Chapter Management
  async createChapter(chapterData: {
    course_id: string;
    title: string;
    sort_order?: number;
  }): Promise<Chapter> {
    return apiRequest<Chapter>('/api/admin/chapters', {
      method: 'POST',
      body: JSON.stringify(chapterData),
    });
  },

  async updateChapter(
    chapterId: string,
    chapterData: Partial<Chapter>
  ): Promise<Chapter> {
    return apiRequest<Chapter>(`/api/admin/chapters/${chapterId}`, {
      method: 'PUT',
      body: JSON.stringify(chapterData),
    });
  },

  async deleteChapter(chapterId: string): Promise<{ success: boolean }> {
    return apiRequest<{ success: boolean }>(`/api/admin/chapters/${chapterId}`, {
      method: 'DELETE',
    });
  },

  // Admin Lesson Management
  async createLesson(lessonData: {
    chapter_id: string;
    course_id: string;
    title: string;
    description?: string;
    duration_seconds?: number;
    is_free_preview?: boolean;
    cloudflare_video_id?: string;
    sort_order?: number;
  }): Promise<Lesson> {
    return apiRequest<Lesson>('/api/admin/lessons', {
      method: 'POST',
      body: JSON.stringify(lessonData),
    });
  },

  async updateLesson(
    lessonId: string,
    lessonData: Partial<Lesson>
  ): Promise<Lesson> {
    return apiRequest<Lesson>(`/api/admin/lessons/${lessonId}`, {
      method: 'PUT',
      body: JSON.stringify(lessonData),
    });
  },

  async deleteLesson(lessonId: string): Promise<{ success: boolean }> {
    return apiRequest<{ success: boolean }>(`/api/admin/lessons/${lessonId}`, {
      method: 'DELETE',
    });
  },

  // Cloudflare Stream Direct Video Upload URL Request
  async getDirectVideoUploadUrl(params: {
    courseId?: string;
    lessonId?: string;
  }): Promise<{
    uploadUrl: string;
    videoId: string;
    provider: string;
  }> {
    return apiRequest<{
      uploadUrl: string;
      videoId: string;
      provider: string;
    }>('/api/admin/videos/generate-upload-url', {
      method: 'POST',
      body: JSON.stringify(params),
    });
  },
};
