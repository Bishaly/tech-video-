import React from 'react';
import {
  Sparkles,
  ArrowRight,
  ShieldCheck,
  Zap,
  PlayCircle,
  Award,
  CheckCircle2,
  TrendingUp,
} from 'lucide-react';
import { Course, Category } from '../types/index.ts';
import { CourseCard } from '../components/CourseCard.tsx';

interface HomePageProps {
  courses: Course[];
  categories: Category[];
  onSelectCourse: (course: Course) => void;
  onBuyCourse: (course: Course) => void;
  onNavigate: (path: string) => void;
  onSelectCategory: (categorySlug: string) => void;
}

export const HomePage: React.FC<HomePageProps> = ({
  courses,
  categories,
  onSelectCourse,
  onBuyCourse,
  onNavigate,
  onSelectCategory,
}) => {
  const featuredCourses = courses.slice(0, 6);

  return (
    <div className="space-y-16 pb-20">
      {/* Hero Section */}
      <section className="relative overflow-hidden pt-12 pb-16 lg:pt-20 lg:pb-24 border-b border-slate-800/60 bg-gradient-to-b from-slate-900/50 via-slate-950 to-slate-950">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-indigo-900/20 via-transparent to-transparent pointer-events-none" />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="max-w-3xl space-y-6">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 text-xs font-semibold">
              <Sparkles className="w-4 h-4 text-indigo-400" />
              <span>Industry-Grade Video Masterclasses</span>
            </div>

            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black text-white tracking-tight leading-[1.1]">
              Master modern software with{' '}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 via-sky-300 to-indigo-200">
                production-ready
              </span>{' '}
              video courses.
            </h1>

            <p className="text-lg text-slate-300 leading-relaxed">
              No superficial overviews. Learn real-world architectural patterns, distributed systems, and AI infrastructure from engineering leaders. Pay once, own forever.
            </p>

            {/* CTA Buttons */}
            <div className="flex flex-wrap items-center gap-4 pt-2">
              <button
                id="hero-explore-courses-btn"
                onClick={() => onNavigate('/courses')}
                className="flex items-center gap-2 px-7 py-3.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-base shadow-xl shadow-indigo-600/30 transition-all hover:translate-y-[-1px] active:translate-y-[0px]"
              >
                <span>Explore All Courses</span>
                <ArrowRight className="w-5 h-5" />
              </button>
              <button
                onClick={() => {
                  if (featuredCourses[0]) onSelectCourse(featuredCourses[0]);
                }}
                className="flex items-center gap-2 px-6 py-3.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-200 border border-slate-700/80 font-medium text-base transition-all"
              >
                <PlayCircle className="w-5 h-5 text-indigo-400" />
                <span>Watch Free Lesson</span>
              </button>
            </div>

            {/* Trust Badges */}
            <div className="pt-6 grid grid-cols-3 gap-4 border-t border-slate-800/80 max-w-xl text-xs text-slate-400">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>Verified Razorpay Gateways</span>
              </div>
              <div className="flex items-center gap-2">
                <Zap className="w-4 h-4 text-indigo-400 shrink-0" />
                <span>Cloudflare Stream 4K</span>
              </div>
              <div className="flex items-center gap-2">
                <Award className="w-4 h-4 text-amber-400 shrink-0" />
                <span>Lifetime Ownership</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Categories Bar */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-xl font-bold text-white">Browse By Topic</h2>
            <p className="text-xs text-slate-400">Curated disciplines designed for senior roles</p>
          </div>
          <button
            onClick={() => onNavigate('/courses')}
            className="text-xs font-semibold text-indigo-400 hover:text-indigo-300 flex items-center gap-1"
          >
            <span>View All</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {categories.map((cat) => (
            <div
              key={cat.id}
              onClick={() => onSelectCategory(cat.slug)}
              className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 hover:border-indigo-500/40 hover:bg-slate-800/50 transition-all cursor-pointer group"
            >
              <div className="text-sm font-semibold text-white group-hover:text-indigo-400 transition-colors">
                {cat.name}
              </div>
              <p className="text-xs text-slate-400 mt-1 line-clamp-1">{cat.description}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Featured Courses Grid */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <div className="flex items-center gap-2 text-indigo-400 text-xs font-bold uppercase tracking-wider">
              <TrendingUp className="w-4 h-4" />
              <span>Trending Masterclasses</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-black text-white mt-1">Featured Video Courses</h2>
          </div>
          <button
            onClick={() => onNavigate('/courses')}
            className="hidden sm:flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-semibold text-slate-300 hover:text-white bg-slate-900 hover:bg-slate-800 border border-slate-800 transition-all"
          >
            <span>Browse Full Catalog</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {featuredCourses.map((course) => (
            <CourseCard
              key={course.id}
              course={course}
              onSelect={onSelectCourse}
              onBuyNow={onBuyCourse}
            />
          ))}
        </div>
      </section>

      {/* Value Pillars Section */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="rounded-3xl bg-slate-900/40 border border-slate-800 p-8 sm:p-12">
          <div className="text-center max-w-2xl mx-auto mb-10 space-y-3">
            <h2 className="text-2xl sm:text-3xl font-extrabold text-white">
              Why engineers choose NextGen Learn
            </h2>
            <p className="text-sm text-slate-400 leading-relaxed">
              We built an enterprise-grade learning platform centered on video performance, rigorous curriculum, and transparent direct pricing.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="space-y-3">
              <div className="w-10 h-10 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 flex items-center justify-center font-bold">
                01
              </div>
              <h3 className="text-base font-bold text-white">Cloudflare Stream Global CDN</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Adaptive bitrate streaming with zero buffer delays across 300+ worldwide Edge points. Crystal-clear video on any bandwidth.
              </p>
            </div>

            <div className="space-y-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold">
                02
              </div>
              <h3 className="text-base font-bold text-white">Instant Razorpay Authorization</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Pay securely using UPI, debit/credit cards, or NetBanking. Our server verifies HMAC signatures before granting instant access.
              </p>
            </div>

            <div className="space-y-3">
              <div className="w-10 h-10 rounded-xl bg-sky-500/10 border border-sky-500/20 text-sky-400 flex items-center justify-center font-bold">
                03
              </div>
              <h3 className="text-base font-bold text-white">No Monthly Subscriptions</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                You only pay for what you actually want to learn. No recurrent subscription traps, no hidden renewals, lifetime access included.
              </p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};
