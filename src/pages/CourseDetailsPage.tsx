import React, { useState } from 'react';
import {
  Star,
  Clock,
  BookOpen,
  CheckCircle2,
  Lock,
  PlayCircle,
  ShieldCheck,
  ChevronDown,
  Sparkles,
  Award,
  ArrowLeft,
} from 'lucide-react';
import { Course, Chapter, Lesson } from '../types/index.ts';

interface CourseDetailsPageProps {
  course: Course;
  onBuyNow: (course: Course) => void;
  onStartWatching: (courseId: string, lessonId?: string) => void;
  onBack: () => void;
}

export const CourseDetailsPage: React.FC<CourseDetailsPageProps> = ({
  course,
  onBuyNow,
  onStartWatching,
  onBack,
}) => {
  const [openFaqIndex, setOpenFaqIndex] = useState<number | null>(null);
  const [openChapterIds, setOpenChapterIds] = useState<Set<string>>(
    new Set(course.chapters?.map((c) => c.id) || [])
  );

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

  const discountPercent =
    course.original_price_inr && course.original_price_inr > course.price_inr
      ? Math.round(
          ((course.original_price_inr - course.price_inr) / course.original_price_inr) * 100
        )
      : 0;

  const totalLessons =
    course.chapters?.reduce((acc, ch) => acc + (ch.lessons?.length || 0), 0) || 12;

  // Find the first free preview lesson if any
  let firstPreviewLesson: Lesson | undefined;
  for (const ch of course.chapters || []) {
    const preview = ch.lessons?.find((l) => l.is_free_preview);
    if (preview) {
      firstPreviewLesson = preview;
      break;
    }
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-10">
      {/* Back button */}
      <button
        onClick={onBack}
        className="inline-flex items-center gap-2 text-xs font-semibold text-slate-400 hover:text-white transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        <span>Back to Courses</span>
      </button>

      {/* Hero Header & Pricing Card */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-start">
        {/* Left: Main Course Information */}
        <div className="lg:col-span-8 space-y-6">
          <div className="flex flex-wrap items-center gap-2">
            {course.category && (
              <span className="px-3 py-1 rounded-full text-xs font-semibold bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                {course.category.name}
              </span>
            )}
            <span className="px-3 py-1 rounded-full text-xs font-medium bg-slate-900 text-slate-300 border border-slate-800">
              {course.level}
            </span>
          </div>

          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black text-white tracking-tight leading-tight">
            {course.title}
          </h1>

          <p className="text-base sm:text-lg text-slate-300 leading-relaxed">
            {course.subtitle || course.description}
          </p>

          {/* Social Proof & Stats */}
          <div className="flex flex-wrap items-center gap-6 text-sm text-slate-300 pt-2">
            <div className="flex items-center gap-1.5 text-amber-400 font-bold">
              <Star className="w-5 h-5 fill-amber-400" />
              <span>{course.rating.toFixed(1)}</span>
              <span className="text-slate-400 font-normal">
                ({course.review_count.toLocaleString()} ratings)
              </span>
            </div>
            <div className="flex items-center gap-2 text-slate-400">
              <Clock className="w-4 h-4 text-indigo-400" />
              <span>{course.duration_hours} hours total video</span>
            </div>
            <div className="flex items-center gap-2 text-slate-400">
              <BookOpen className="w-4 h-4 text-indigo-400" />
              <span>{totalLessons} lessons</span>
            </div>
          </div>

          {/* Instructor Bio Snippet */}
          <div className="flex items-center gap-4 p-4 rounded-2xl bg-slate-900/60 border border-slate-800">
            <img
              src={
                course.instructor_avatar ||
                `https://api.dicebear.com/7.x/initials/svg?seed=${course.instructor_name}`
              }
              alt={course.instructor_name}
              className="w-14 h-14 rounded-xl object-cover border border-slate-700 shrink-0"
            />
            <div>
              <p className="text-xs text-indigo-400 font-semibold uppercase tracking-wider">
                Course Creator
              </p>
              <h3 className="font-bold text-white text-base">{course.instructor_name}</h3>
              <p className="text-xs text-slate-400">{course.instructor_title}</p>
            </div>
          </div>
        </div>

        {/* Right: Pricing Card / Checkout Widget */}
        <div className="lg:col-span-4 lg:sticky lg:top-24 space-y-4">
          <div className="bg-slate-900/90 border border-slate-800 rounded-3xl overflow-hidden shadow-2xl backdrop-blur-xl">
            {/* Thumbnail with free preview teaser */}
            <div className="relative aspect-video w-full bg-black group overflow-hidden">
              <img
                src={course.thumbnail_url}
                alt={course.title}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
              />
              <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                {firstPreviewLesson ? (
                  <button
                    onClick={() => onStartWatching(course.id, firstPreviewLesson?.id)}
                    className="flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-950/90 hover:bg-slate-950 text-white text-xs font-semibold shadow-xl border border-slate-700/80 hover:scale-105 transition-all"
                  >
                    <PlayCircle className="w-5 h-5 text-indigo-400" />
                    <span>Watch Free Preview</span>
                  </button>
                ) : (
                  <div className="w-12 h-12 rounded-full bg-slate-900/80 flex items-center justify-center text-white">
                    <PlayCircle className="w-6 h-6 text-indigo-400" />
                  </div>
                )}
              </div>
            </div>

            {/* Price Details & Action */}
            <div className="p-6 space-y-5">
              <div className="flex items-baseline gap-3">
                <span className="text-3xl font-extrabold text-white font-mono">
                  ₹{course.price_inr.toLocaleString('en-IN')}
                </span>
                {course.original_price_inr && course.original_price_inr > course.price_inr && (
                  <>
                    <span className="text-base text-slate-500 line-through font-mono">
                      ₹{course.original_price_inr.toLocaleString('en-IN')}
                    </span>
                    <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-300 border border-rose-500/30">
                      {discountPercent}% OFF
                    </span>
                  </>
                )}
              </div>

              {course.is_enrolled ? (
                <button
                  id="btn-course-continue-learning"
                  onClick={() => onStartWatching(course.id)}
                  className="w-full py-4 px-6 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-base transition-all shadow-xl shadow-emerald-600/20 flex items-center justify-center gap-2 active:scale-98"
                >
                  <PlayCircle className="w-5 h-5" />
                  <span>Continue Learning</span>
                </button>
              ) : (
                <div className="space-y-3">
                  <button
                    id="btn-course-details-buy"
                    onClick={() => onBuyNow(course)}
                    className="w-full py-4 px-6 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-base transition-all shadow-xl shadow-indigo-600/30 flex items-center justify-center gap-2 active:scale-98"
                  >
                    <span>Buy Now with Razorpay</span>
                    <Sparkles className="w-4 h-4" />
                  </button>

                  {firstPreviewLesson && (
                    <button
                      onClick={() => onStartWatching(course.id, firstPreviewLesson?.id)}
                      className="w-full py-2.5 px-4 rounded-xl bg-slate-800/80 hover:bg-slate-800 text-slate-200 text-xs font-semibold transition-colors flex items-center justify-center gap-2"
                    >
                      <PlayCircle className="w-4 h-4 text-indigo-400" />
                      <span>Preview Lesson (Free)</span>
                    </button>
                  )}
                </div>
              )}

              {/* Inclusions */}
              <div className="pt-4 border-t border-slate-800/80 space-y-2.5 text-xs text-slate-300">
                <p className="font-semibold text-slate-400 uppercase tracking-wider text-[11px]">
                  Course Includes:
                </p>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>{course.duration_hours} hours Cloudflare Stream HD video</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>Access on mobile, tablet, and desktop</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>Full lifetime ownership & updates</span>
                </div>
                <div className="flex items-center gap-2">
                  <Award className="w-4 h-4 text-amber-400 shrink-0" />
                  <span>Certificate of Completion</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* What you'll learn */}
      {course.what_you_will_learn && course.what_you_will_learn.length > 0 && (
        <section className="bg-slate-900/40 border border-slate-800 rounded-3xl p-6 sm:p-8 space-y-4">
          <h2 className="text-xl sm:text-2xl font-bold text-white">What you'll learn</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2">
            {course.what_you_will_learn.map((item, idx) => (
              <div key={idx} className="flex items-start gap-3">
                <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
                <span className="text-sm text-slate-300 leading-snug">{item}</span>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Curriculum / Course Content */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl sm:text-2xl font-bold text-white">Course Curriculum</h2>
            <p className="text-xs text-slate-400">
              {course.chapters?.length || 0} sections • {totalLessons} lessons • {course.duration_hours}h total length
            </p>
          </div>
        </div>

        <div className="border border-slate-800 rounded-2xl overflow-hidden bg-slate-900/30 divide-y divide-slate-800">
          {course.chapters && course.chapters.length > 0 ? (
            course.chapters.map((chapter) => {
              const isOpen = openChapterIds.has(chapter.id);
              const chapterDuration =
                chapter.lessons?.reduce((acc, l) => acc + l.duration_seconds, 0) || 0;
              const chapterMins = Math.round(chapterDuration / 60);

              return (
                <div key={chapter.id} className="transition-colors">
                  {/* Chapter Header */}
                  <button
                    onClick={() => toggleChapter(chapter.id)}
                    className="w-full flex items-center justify-between p-4 sm:p-5 text-left bg-slate-900/60 hover:bg-slate-900 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <ChevronDown
                        className={`w-4 h-4 text-slate-400 transition-transform ${
                          isOpen ? 'rotate-180' : ''
                        }`}
                      />
                      <span className="font-semibold text-sm sm:text-base text-white">
                        {chapter.title}
                      </span>
                    </div>
                    <span className="text-xs text-slate-400">
                      {chapter.lessons?.length || 0} lessons ({chapterMins}m)
                    </span>
                  </button>

                  {/* Lessons List */}
                  {isOpen && (
                    <div className="divide-y divide-slate-800/60 bg-slate-950/40">
                      {chapter.lessons?.map((lesson) => (
                        <div
                          key={lesson.id}
                          onClick={() => {
                            if (course.is_enrolled || lesson.is_free_preview) {
                              onStartWatching(course.id, lesson.id);
                            } else {
                              onBuyNow(course);
                            }
                          }}
                          className={`flex items-center justify-between p-4 text-sm transition-colors cursor-pointer ${
                            lesson.is_free_preview
                              ? 'hover:bg-slate-800/40'
                              : course.is_enrolled
                              ? 'hover:bg-slate-800/40'
                              : 'hover:bg-slate-900/50 opacity-80'
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            {course.is_enrolled || lesson.is_free_preview ? (
                              <PlayCircle className="w-4 h-4 text-indigo-400 shrink-0" />
                            ) : (
                              <Lock className="w-4 h-4 text-slate-500 shrink-0" />
                            )}
                            <span className="text-slate-200 text-xs sm:text-sm font-medium">
                              {lesson.title}
                            </span>
                          </div>

                          <div className="flex items-center gap-3">
                            {lesson.is_free_preview && (
                              <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                                Free Preview
                              </span>
                            )}
                            <span className="text-xs font-mono text-slate-500">
                              {Math.floor(lesson.duration_seconds / 60)}:
                              {lesson.duration_seconds % 60 < 10 ? '0' : ''}
                              {lesson.duration_seconds % 60}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })
          ) : (
            <div className="p-8 text-center text-xs text-slate-500">Curriculum loading...</div>
          )}
        </div>
      </section>

      {/* Requirements & FAQs */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {course.requirements && course.requirements.length > 0 && (
          <div className="bg-slate-900/40 border border-slate-800 rounded-3xl p-6 space-y-3">
            <h3 className="text-lg font-bold text-white">Prerequisites</h3>
            <ul className="space-y-2 text-xs sm:text-sm text-slate-300 list-disc list-inside">
              {course.requirements.map((req, i) => (
                <li key={i}>{req}</li>
              ))}
            </ul>
          </div>
        )}

        {course.faqs && course.faqs.length > 0 && (
          <div className="bg-slate-900/40 border border-slate-800 rounded-3xl p-6 space-y-3">
            <h3 className="text-lg font-bold text-white">Frequently Asked Questions</h3>
            <div className="space-y-2 divide-y divide-slate-800">
              {course.faqs.map((faq, idx) => (
                <div key={idx} className="pt-2">
                  <button
                    onClick={() => setOpenFaqIndex(openFaqIndex === idx ? null : idx)}
                    className="w-full text-left font-semibold text-xs sm:text-sm text-slate-200 py-1 flex justify-between items-center"
                  >
                    <span>{faq.question}</span>
                    <ChevronDown
                      className={`w-4 h-4 text-slate-400 transition-transform ${
                        openFaqIndex === idx ? 'rotate-180' : ''
                      }`}
                    />
                  </button>
                  {openFaqIndex === idx && (
                    <p className="text-xs text-slate-400 pt-1 leading-relaxed">{faq.answer}</p>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
