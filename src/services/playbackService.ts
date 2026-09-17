import { CurriculumData, PlaybackData } from '../types/index.ts';
import { apiRequest } from '../lib/api.ts';

export const playbackService = {
  async getCurriculum(courseId: string): Promise<CurriculumData> {
    return apiRequest<CurriculumData>(`/api/watch/${courseId}/curriculum`);
  },

  async getLessonPlayback(courseId: string, lessonId: string): Promise<PlaybackData> {
    return apiRequest<PlaybackData>(`/api/watch/${courseId}/lesson/${lessonId}`);
  },

  async updateWatchProgress(
    courseId: string,
    lessonId: string,
    payload: {
      position_seconds: number;
      is_completed?: boolean;
    }
  ): Promise<{ success: boolean }> {
    return apiRequest<{ success: boolean }>(`/api/watch/${courseId}/lesson/${lessonId}/progress`, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },
};
