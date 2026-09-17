import React, { useState, useEffect, useCallback } from 'react';
import {
  ArrowLeft,
  BookOpen,
  CheckCircle2,
  Lock,
  PlayCircle,
  ChevronRight,
  ChevronDown,
  Menu,
  X,
  Share2,
  Sparkles,
  ShieldCheck,
  Award,
} from 'lucide-react';
import { CurriculumData, PlaybackData, Course } from '../types/index.ts';
import { apiRequest } from '../lib/api.ts';
import { VideoPlayer } from '../components/VideoPlayer.tsx';
import { useAuth } from '../context/AuthContext.tsx';
import { useToast } from '../context/ToastContext.tsx';

interface WatchPageProps {
  courseId: string;
  initialLessonId?: string;
  onBack: () => void;
  onOpenPurchaseModal: (course: Course) => void;
}

export const WatchPage: React.FC<WatchPageProps> = ({
  courseId,
  initialLessonId,
  onBack,
  onOpenPurchaseModal,
}) => {
  const { user, isAuthenticated } = useAuth();
  const { error, success } = useToast();

  const [curriculum, setCurriculum] = useState<CurriculumData | null>(null);
  const [selectedLessonId, setSelectedLessonId] = useState<string>(initialLessonId || '');
  const [playbackData, setPlaybackData] = useState<PlaybackData | null>(null);
  const [loadingCurriculum, setLoadingCurriculum] = useState(true);
  const [loadingPlayback, setLoadingPlayback] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [openChapterIds, setOpenChapterIds] = useState<Set<string>>(new Set());

  // Load course curriculum and user progress
  const loadCurriculum = useCallback(async () => {
    try {
      setLoadingCurriculum(true);
      const data = await apiRequest<CurriculumData>(`/api/watch/${courseId}/curriculum`);
      setCurriculum(data);

      // Open all chapters by default
      if (data.chapters) {
        setOpenChapterIds(new Set(data.chapters.map((c) => c.id)));
      }

      // If no initial lesson selected, select first available lesson
      if (!selectedLessonId && data.chapters?.[0]?.lessons?.[0]) {
        setSelectedLessonId(data.chapters[0].lessons[0].id);
      }
    } catch (err: any) {
      error(err.message || 'Failed to load course curriculum.');
    } finally {
      setLoadingCurriculum(false);
    }
  }, [courseId, selectedLessonId, error]);

  useEffect(() => {
    loadCurriculum();
  }, [loadCurriculum]);

  // Load lesson playback token & state
  const loadPlayback = useCallback(async (lessonId: string) => {
    if (!lessonId) return;
    try {
      setLoadingPlayback(true);
      const data = await apiRequest<PlaybackData>(`/api/watch/${courseId}/lesson/${lessonId}`);
      setPlaybackData(data);
    } catch (err: any) {
      if (err.status === 403) {
        // Locked: requires purchase
        setPlaybackData({
          lesson: {
            id: lessonId,
            title: 'Protected Lesson',
            duration_seconds: 600,
            is_free_preview: false,
            is_locked: true,
          },
          isLocked: true,
          error: 'Purchase this course to start watching.',
        });
      } else if (err.status === 401) {
        setPlaybackData({
          lesson: {
            id: lessonId,
            title: 'Authentication Required',
            duration_seconds: 600,
            is_free_preview: false,
            is_locked: true,
          },
          isLocked: true,
          requiresAuth: true,
          error: 'Please sign in to access this lesson.',
        });
      } else {
        error(err.message || 'Failed to load lesson stream.');
      }
    } finally {
      setLoadingPlayback(false);
    }
  }, [courseId, error]);

  useEffect(() => {
    if (selectedLessonId) {
      loadPlayback(selectedLessonId);
    }
  }, [selectedLessonId, loadPlayback]);

  const toggleChapter = (chapterId: string) => {
    setOpenChapterIds((prev) => {
      const next = new Set(prev);
      if (next.has(chapterId)) {
        next.delete(chapterId);
      } else {
        next.add(chapterId);
      }
      return next;
    });
  };

  const handleLessonCompleted = (lessonId: string) => {
    if (!curriculum) return;
    setCurriculum((prev) => {
      if (!prev) return prev;
      let newCompleted = 0;
      const updatedChapters = prev.chapters.map((ch) => ({
        ...ch,
        lessons: ch.lessons.map((l) => {
          const isComp = l.id === lessonId ? true : l.is_completed;
          if (isComp) newCompleted++;
          return { ...l, is_completed: isComp };
        }),
      }));

      return {
        ...prev,
        chapters: updatedChapters,
        stats: {
          ...prev.stats,
          completed_lessons: newCompleted,
          progress_percent: Math.round((newCompleted / prev.stats.total_lessons) * 100),
        },
      };
    });
    success('Lesson progress recorded!');
  };

  // Find next lesson
  const allLessons = curriculum?.chapters.flatMap((c) => c.lessons) || [];
  const currentIndex = allLessons.findIndex((l) => l.id === selectedLessonId);
  const nextLesson = currentIndex >= 0 && currentIndex < allLessons.length - 1 ? allLessons[currentIndex + 1] : null;
  const prevLesson = currentIndex > 0 ? allLessons[currentIndex - 1] : null;

  if (loadingCurriculum && !curriculum) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-20 text-center space-y-3">
        <div className="w-10 h-10 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto" />
        <p className="text-sm text-slate-400">Loading course curriculum and stream authorization...</p>
      </div>
    );
  }

  return (
    <div className="min-h-[calc(100vh-4rem)] flex flex-col bg-slate-950 text-slate-100">
      {/* Top Classroom Bar */}
      <div className="h-14 border-b border-slate-800 bg-slate-950 px-4 sm:px-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors flex items-center gap-1.5 text-xs font-semibold"
          >
            <ArrowLeft className="w-4 h-4" />
            <span className="hidden sm:inline">Back</span>
          </button>
          <div className="h-4 w-px bg-slate-800" />
          <h1 className="text-sm sm:text-base font-bold text-white truncate max-w-xs sm:max-w-md">
            {curriculum?.course.title}
          </h1>
        </div>

        <div className="flex items-center gap-4">
          {/* Progress Indicator */}
          {curriculum?.course.is_enrolled && (
            <div className="hidden sm:flex items-center gap-2 text-xs">
              <div className="w-28 h-2 bg-slate-800 rounded-full overflow-hidden">
                <div
                  className="h-full bg-indigo-500 rounded-full transition-all duration-500"
                  style={{ width: `${curriculum.stats.progress_percent}%` }}
                />
              </div>
              <span className="font-mono text-slate-300">
                {curriculum.stats.progress_percent}%
              </span>
            </div>
          )}

          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="p-1.5 rounded-lg text-slate-300 hover:text-white hover:bg-slate-800 transition-colors flex items-center gap-1 text-xs font-medium"
          >
            <BookOpen className="w-4 h-4" />
            <span className="hidden sm:inline">
              {sidebarOpen ? 'Hide Curriculum' : 'Show Curriculum'}
            </span>
          </button>
        </div>
      </div>

      {/* Main Classroom Area */}
      <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">
        {/* Left: Video Area & Lesson Info */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 space-y-6">
          {loadingPlayback || !playbackData ? (
            <div className="w-full aspect-video bg-slate-900 rounded-2xl border border-slate-800 flex items-center justify-center">
              <div className="flex flex-col items-center gap-2">
                <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
                <span className="text-xs text-slate-400">Verifying video access token...</span>
              </div>
            </div>
          ) : (
            <VideoPlayer
              courseId={courseId}
              lessonId={selectedLessonId}
              playbackData={playbackData}
              onLessonCompleted={handleLessonCompleted}
              onNextLesson={nextLesson ? () => setSelectedLessonId(nextLesson.id) : undefined}
              onOpenPurchaseModal={
                curriculum
                  ? () =>
                      onOpenPurchaseModal({
                        id: curriculum.course.id,
                        slug: curriculum.course.slug,
                        title: curriculum.course.title,
                        thumbnail_url: curriculum.course.thumbnail_url,
                        instructor_name: curriculum.course.instructor_name,
                        price_inr: curriculum.course.price_inr || 999,
                        original_price_inr: curriculum.course.original_price_inr,
                        duration_hours: 10,
                        rating: 5,
                        review_count: 100,
                        what_you_will_learn: [],
                        requirements: [],
                        faqs: [],
                        created_at: new Date().toISOString(),
                        level: 'All Levels',
                        category_id: 'cat_web',
                        is_published: true,
                        description: curriculum.course.description || '',
                        instructor_title: '',
                      })
                  : undefined
              }
            />
          )}

          {/* Lesson Details */}
          {playbackData && (
            <div className="bg-slate-900/50 border border-slate-800/80 rounded-2xl p-6 space-y-4">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    {playbackData.lesson.is_free_preview ? (
                      <span className="px-2 py-0.5 rounded text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                        Free Preview
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 rounded text-xs font-semibold bg-indigo-500/10 text-indigo-400 border border-indigo-500/30 flex items-center gap-1">
                        <ShieldCheck className="w-3.5 h-3.5" />
                        Premium Lesson
                      </span>
                    )}
                  </div>
                  <h2 className="text-xl sm:text-2xl font-bold text-white">
                    {playbackData.lesson.title}
                  </h2>
                </div>

                {/* Lesson Navigation Controls */}
                <div className="flex items-center gap-2">
                  {prevLesson && (
                    <button
                      onClick={() => setSelectedLessonId(prevLesson.id)}
                      className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-medium text-slate-200 transition-colors"
                    >
                      &larr; Previous
                    </button>
                  )}
                  {nextLesson && (
                    <button
                      onClick={() => setSelectedLessonId(nextLesson.id)}
                      className="px-3.5 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-xs font-semibold text-white transition-colors"
                    >
                      Next &rarr;
                    </button>
                  )}
                </div>
              </div>

              {playbackData.lesson.description && (
                <p className="text-sm text-slate-300 leading-relaxed pt-2 border-t border-slate-800">
                  {playbackData.lesson.description}
                </p>
              )}
            </div>
          )}
        </div>

        {/* Right: Course Curriculum Drawer / Sidebar */}
        {sidebarOpen && (
          <aside className="w-full lg:w-96 border-t lg:border-t-0 lg:border-l border-slate-800 bg-slate-950 flex flex-col shrink-0">
            <div className="p-4 border-b border-slate-800 flex items-center justify-between">
              <div>
                <h3 className="font-bold text-sm text-white">Course Curriculum</h3>
                <p className="text-xs text-slate-400">
                  {curriculum?.stats.completed_lessons} of {curriculum?.stats.total_lessons} completed
                </p>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto divide-y divide-slate-800/80">
              {curriculum?.chapters.map((chapter, chIdx) => {
                const isOpen = openChapterIds.has(chapter.id);
                return (
                  <div key={chapter.id} className="bg-slate-950">
                    <button
                      onClick={() => toggleChapter(chapter.id)}
                      className="w-full flex items-center justify-between p-3.5 text-left bg-slate-900/40 hover:bg-slate-900/80 transition-colors"
                    >
                      <div className="flex items-center gap-2.5">
                        <ChevronDown
                          className={`w-3.5 h-3.5 text-slate-400 transition-transform ${
                            isOpen ? 'rotate-180' : ''
                          }`}
                        />
                        <span className="text-xs font-bold text-slate-200">
                          {chIdx + 1}. {chapter.title}
                        </span>
                      </div>
                      <span className="text-[11px] text-slate-500">
                        {chapter.lessons?.length || 0}
                      </span>
                    </button>

                    {isOpen && (
                      <div className="divide-y divide-slate-900/60 bg-slate-950">
                        {chapter.lessons?.map((lesson) => {
                          const isSelected = lesson.id === selectedLessonId;
                          return (
                            <div
                              key={lesson.id}
                              onClick={() => {
                                setSelectedLessonId(lesson.id);
                              }}
                              className={`flex items-start gap-3 p-3.5 text-xs transition-colors cursor-pointer ${
                                isSelected
                                  ? 'bg-indigo-950/40 border-l-2 border-indigo-500 text-white'
                                  : 'hover:bg-slate-900/40 text-slate-300'
                              }`}
                            >
                              <div className="mt-0.5 shrink-0">
                                {lesson.is_completed ? (
                                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                                ) : lesson.is_locked ? (
                                  <Lock className="w-4 h-4 text-slate-500" />
                                ) : isSelected ? (
                                  <PlayCircle className="w-4 h-4 text-indigo-400 animate-pulse" />
                                ) : (
                                  <PlayCircle className="w-4 h-4 text-slate-400" />
                                )}
                              </div>

                              <div className="flex-1 min-w-0">
                                <p
                                  className={`font-medium line-clamp-2 leading-snug ${
                                    isSelected ? 'text-indigo-200' : 'text-slate-200'
                                  }`}
                                >
                                  {lesson.title}
                                </p>
                                <div className="flex items-center gap-2 mt-1 text-[10px] text-slate-500">
                                  <span>
                                    {Math.floor(lesson.duration_seconds / 60)}:
                                    {lesson.duration_seconds % 60 < 10 ? '0' : ''}
                                    {lesson.duration_seconds % 60}
                                  </span>
                                  {lesson.is_free_preview && (
                                    <span className="text-emerald-400 font-semibold">Preview</span>
                                  )}
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </aside>
        )}
      </div>
    </div>
  );
};
