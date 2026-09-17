import React from 'react';
import { Star, Clock, BookOpen, Sparkles, CheckCircle2 } from 'lucide-react';
import { Course } from '../types/index.ts';

interface CourseCardProps {
  course: Course;
  onSelect: (course: Course) => void;
  onBuyNow?: (course: Course) => void;
}

export const CourseCard: React.FC<CourseCardProps> = ({
  course,
  onSelect,
  onBuyNow,
}) => {
  const discountPercent =
    course.original_price_inr && course.original_price_inr > course.price_inr
      ? Math.round(
          ((course.original_price_inr - course.price_inr) / course.original_price_inr) * 100
        )
      : 0;

  return (
    <div
      id={`course-card-${course.id}`}
      onClick={() => onSelect(course)}
      className="group relative flex flex-col bg-slate-900/70 border border-slate-800 hover:border-indigo-500/50 rounded-2xl overflow-hidden shadow-lg hover:shadow-indigo-500/10 transition-all duration-300 cursor-pointer"
    >
      {/* Thumbnail Container */}
      <div className="relative aspect-video w-full overflow-hidden bg-slate-950">
        <img
          src={course.thumbnail_url}
          alt={course.title}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          loading="lazy"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-transparent to-transparent opacity-80" />

        {/* Badges Overlay */}
        <div className="absolute top-3 left-3 flex flex-wrap gap-2">
          {course.category && (
            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-900/90 text-slate-200 border border-slate-700/60 backdrop-blur-md">
              {course.category.name}
            </span>
          )}
          <span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-950/80 text-indigo-300 border border-indigo-500/20 backdrop-blur-md">
            {course.level}
          </span>
        </div>

        {discountPercent > 0 && (
          <div className="absolute top-3 right-3">
            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-rose-500/90 text-white shadow-md">
              {discountPercent}% OFF
            </span>
          </div>
        )}

        {course.is_enrolled && (
          <div className="absolute bottom-3 left-3">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-500/90 text-white shadow-md">
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Purchased</span>
            </span>
          </div>
        )}
      </div>

      {/* Course Info */}
      <div className="p-5 flex flex-col flex-1 justify-between gap-4">
        <div className="space-y-2">
          <h3 className="font-bold text-base md:text-lg text-white group-hover:text-indigo-400 transition-colors line-clamp-2 leading-snug">
            {course.title}
          </h3>
          <p className="text-xs md:text-sm text-slate-400 line-clamp-2 leading-relaxed">
            {course.subtitle || course.description}
          </p>
        </div>

        {/* Metadata stats */}
        <div className="flex items-center justify-between text-xs text-slate-400 pt-2 border-t border-slate-800/80">
          <div className="flex items-center gap-1 text-amber-400 font-semibold">
            <Star className="w-4 h-4 fill-amber-400" />
            <span>{course.rating.toFixed(1)}</span>
            <span className="text-slate-500 font-normal">({course.review_count})</span>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1">
              <Clock className="w-3.5 h-3.5 text-slate-400" />
              <span>{course.duration_hours}h</span>
            </div>
            <div className="flex items-center gap-1">
              <BookOpen className="w-3.5 h-3.5 text-slate-400" />
              <span>{course.lessons_count || 12} lessons</span>
            </div>
          </div>
        </div>

        {/* Price & Action */}
        <div className="flex items-center justify-between pt-1">
          <div>
            <div className="flex items-baseline gap-2">
              <span className="text-lg md:text-xl font-extrabold text-white font-mono">
                ₹{course.price_inr.toLocaleString('en-IN')}
              </span>
              {course.original_price_inr && course.original_price_inr > course.price_inr && (
                <span className="text-xs text-slate-500 line-through font-mono">
                  ₹{course.original_price_inr.toLocaleString('en-IN')}
                </span>
              )}
            </div>
            <span className="text-[10px] text-slate-500 block">One-time payment</span>
          </div>

          {course.is_enrolled ? (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onSelect(course);
              }}
              className="px-4 py-2 rounded-xl text-xs font-semibold bg-emerald-600 hover:bg-emerald-500 text-white transition-all shadow-md shadow-emerald-600/20"
            >
              Watch Now
            </button>
          ) : (
            <button
              onClick={(e) => {
                e.stopPropagation();
                if (onBuyNow) {
                  onBuyNow(course);
                } else {
                  onSelect(course);
                }
              }}
              className="px-4 py-2 rounded-xl text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white transition-all shadow-md shadow-indigo-600/25 flex items-center gap-1.5"
            >
              <span>Enroll</span>
              <Sparkles className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
