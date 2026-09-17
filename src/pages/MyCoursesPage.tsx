import React, { useState, useEffect } from 'react';
import { BookOpen, PlayCircle, Clock, CheckCircle2, ArrowRight } from 'lucide-react';
import { EnrolledCourseItem } from '../types/index.ts';
import { apiRequest } from '../lib/api.ts';
import { useToast } from '../context/ToastContext.tsx';

interface MyCoursesPageProps {
  onContinueLearning: (courseId: string, lastLessonId?: string) => void;
  onExploreCourses: () => void;
}

export const MyCoursesPage: React.FC<MyCoursesPageProps> = ({
  onContinueLearning,
  onExploreCourses,
}) => {
  const [enrolledCourses, setEnrolledCourses] = useState<EnrolledCourseItem[]>([]);
  const [loading, setLoading] = useState(true);
  const { error } = useToast();

  useEffect(() => {
    const fetchMyCourses = async () => {
      try {
        setLoading(true);
        const data = await apiRequest<EnrolledCourseItem[]>('/api/watch/my-courses');
        setEnrolledCourses(data);
      } catch (err: any) {
        error(err.message || 'Failed to load your enrolled courses.');
      } finally {
        setLoading(false);
      }
    };
    fetchMyCourses();
  }, [error]);

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-20 text-center space-y-3">
        <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto" />
        <p className="text-xs text-slate-400">Loading your learning library...</p>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl sm:text-4xl font-black text-white tracking-tight">My Courses</h1>
        <p className="text-sm text-slate-400 mt-1">
          Access your purchased courses, track completion, and continue learning.
        </p>
      </div>

      {enrolledCourses.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {enrolledCourses.map((item) => {
            const { course, progress } = item;
            return (
              <div
                key={item.purchase_id}
                className="flex flex-col bg-slate-900/80 border border-slate-800 rounded-2xl overflow-hidden shadow-lg hover:border-indigo-500/40 transition-all group"
              >
                {/* Thumbnail */}
                <div className="relative aspect-video w-full overflow-hidden bg-black">
                  <img
                    src={course.thumbnail_url}
                    alt={course.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-transparent to-transparent" />
                  <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between text-xs text-slate-300">
                    <span className="font-medium">{course.instructor_name}</span>
                    <span className="flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5 text-indigo-400" />
                      {course.duration_hours}h
                    </span>
                  </div>
                </div>

                {/* Info & Progress */}
                <div className="p-5 flex-1 flex flex-col justify-between space-y-5">
                  <div className="space-y-3">
                    <h3 className="font-bold text-base text-white line-clamp-2 leading-snug group-hover:text-indigo-400 transition-colors">
                      {course.title}
                    </h3>

                    {/* Progress Bar */}
                    <div className="space-y-1.5">
                      <div className="flex justify-between text-xs">
                        <span className="text-slate-400">
                          {progress.completed_lessons} of {progress.total_lessons} lessons completed
                        </span>
                        <span className="font-mono font-bold text-indigo-400">
                          {progress.percentage}%
                        </span>
                      </div>
                      <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-indigo-500 to-emerald-400 rounded-full transition-all duration-500"
                          style={{ width: `${progress.percentage}%` }}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Continue Learning Button */}
                  <button
                    id={`btn-continue-${course.id}`}
                    onClick={() => onContinueLearning(course.id, progress.last_lesson_id)}
                    className="w-full py-3 px-4 rounded-xl font-semibold text-xs text-white bg-indigo-600 hover:bg-indigo-500 transition-all flex items-center justify-center gap-2 shadow-lg shadow-indigo-600/20 active:scale-98"
                  >
                    <PlayCircle className="w-4 h-4" />
                    <span>Continue Learning</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="text-center py-20 bg-slate-900/30 border border-slate-800 rounded-3xl space-y-4 max-w-xl mx-auto p-8">
          <div className="w-14 h-14 rounded-2xl bg-indigo-500/10 text-indigo-400 flex items-center justify-center mx-auto">
            <BookOpen className="w-7 h-7" />
          </div>
          <h3 className="text-xl font-bold text-white">Your library is currently empty</h3>
          <p className="text-xs text-slate-400 leading-relaxed">
            You haven't enrolled in any video courses yet. Browse our catalog to find industry-leading engineering courses.
          </p>
          <button
            onClick={onExploreCourses}
            className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs transition-all shadow-lg shadow-indigo-600/25"
          >
            <span>Browse Courses</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      )}
    </div>
  );
};
