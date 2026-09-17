import React, { useState, useMemo } from 'react';
import { Search, Filter, SlidersHorizontal, BookOpen, X } from 'lucide-react';
import { Course, Category } from '../types/index.ts';
import { CourseCard } from '../components/CourseCard.tsx';

interface CoursesPageProps {
  courses: Course[];
  categories: Category[];
  initialCategory?: string;
  initialSearch?: string;
  onSelectCourse: (course: Course) => void;
  onBuyCourse: (course: Course) => void;
}

export const CoursesPage: React.FC<CoursesPageProps> = ({
  courses,
  categories,
  initialCategory,
  initialSearch,
  onSelectCourse,
  onBuyCourse,
}) => {
  const [search, setSearch] = useState(initialSearch || '');
  const [selectedCategory, setSelectedCategory] = useState(initialCategory || 'all');
  const [selectedLevel, setSelectedLevel] = useState('all');
  const [sortBy, setSortBy] = useState<'newest' | 'price_asc' | 'price_desc' | 'rating'>('newest');

  const filteredCourses = useMemo(() => {
    let result = [...courses];

    // Search query
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(
        (c) =>
          c.title.toLowerCase().includes(q) ||
          c.description.toLowerCase().includes(q) ||
          c.instructor_name.toLowerCase().includes(q)
      );
    }

    // Category filter
    if (selectedCategory !== 'all') {
      result = result.filter(
        (c) => c.category?.slug === selectedCategory || c.category_id === selectedCategory
      );
    }

    // Level filter
    if (selectedLevel !== 'all') {
      result = result.filter((c) => c.level.toLowerCase() === selectedLevel.toLowerCase());
    }

    // Sorting
    result.sort((a, b) => {
      if (sortBy === 'price_asc') return a.price_inr - b.price_inr;
      if (sortBy === 'price_desc') return b.price_inr - a.price_inr;
      if (sortBy === 'rating') return b.rating - a.rating;
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });

    return result;
  }, [courses, search, selectedCategory, selectedLevel, sortBy]);

  const clearFilters = () => {
    setSearch('');
    setSelectedCategory('all');
    setSelectedLevel('all');
    setSortBy('newest');
  };

  const hasActiveFilters =
    search.trim() !== '' || selectedCategory !== 'all' || selectedLevel !== 'all' || sortBy !== 'newest';

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Header */}
      <div className="space-y-2">
        <h1 className="text-3xl sm:text-4xl font-black text-white tracking-tight">
          Explore Video Courses
        </h1>
        <p className="text-sm text-slate-400">
          Discover comprehensive video curricula led by industry practitioners.
        </p>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-slate-900/60 border border-slate-800 p-4 rounded-2xl space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
          {/* Search */}
          <div className="md:col-span-5 relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3 pointer-events-none" />
            <input
              type="text"
              placeholder="Search by title, topic, or instructor..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2 text-sm bg-slate-950 border border-slate-800 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
            />
            {search && (
              <button
                onClick={() => setSearch('')}
                className="absolute right-3 top-2.5 text-slate-500 hover:text-slate-300"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Level Filter */}
          <div className="md:col-span-3">
            <select
              value={selectedLevel}
              onChange={(e) => setSelectedLevel(e.target.value)}
              className="w-full py-2 px-3 text-sm bg-slate-950 border border-slate-800 rounded-xl text-slate-200 focus:outline-none focus:border-indigo-500"
            >
              <option value="all">All Difficulty Levels</option>
              <option value="beginner">Beginner</option>
              <option value="intermediate">Intermediate</option>
              <option value="advanced">Advanced</option>
            </select>
          </div>

          {/* Sort By */}
          <div className="md:col-span-4">
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="w-full py-2 px-3 text-sm bg-slate-950 border border-slate-800 rounded-xl text-slate-200 focus:outline-none focus:border-indigo-500"
            >
              <option value="newest">Sort: Newest Releases</option>
              <option value="rating">Sort: Highest Rated</option>
              <option value="price_asc">Sort: Price (Low to High)</option>
              <option value="price_desc">Sort: Price (High to Low)</option>
            </select>
          </div>
        </div>

        {/* Category Pills */}
        <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-800/80">
          <span className="text-xs font-semibold text-slate-400 mr-1 flex items-center gap-1">
            <SlidersHorizontal className="w-3 h-3" />
            <span>Category:</span>
          </span>

          <button
            onClick={() => setSelectedCategory('all')}
            className={`px-3 py-1 rounded-lg text-xs font-medium transition-all ${
              selectedCategory === 'all'
                ? 'bg-indigo-600 text-white'
                : 'bg-slate-950 text-slate-400 hover:text-white border border-slate-800'
            }`}
          >
            All Categories
          </button>

          {categories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setSelectedCategory(cat.slug)}
              className={`px-3 py-1 rounded-lg text-xs font-medium transition-all ${
                selectedCategory === cat.slug
                  ? 'bg-indigo-600 text-white'
                  : 'bg-slate-950 text-slate-400 hover:text-white border border-slate-800'
              }`}
            >
              {cat.name}
            </button>
          ))}

          {hasActiveFilters && (
            <button
              onClick={clearFilters}
              className="ml-auto text-xs text-rose-400 hover:text-rose-300 flex items-center gap-1 px-2 py-1"
            >
              <X className="w-3 h-3" />
              <span>Reset Filters</span>
            </button>
          )}
        </div>
      </div>

      {/* Results Count & Grid */}
      <div className="space-y-4">
        <div className="flex items-center justify-between text-xs text-slate-400">
          <span>Showing {filteredCourses.length} course{filteredCourses.length !== 1 ? 's' : ''}</span>
        </div>

        {filteredCourses.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredCourses.map((course) => (
              <CourseCard
                key={course.id}
                course={course}
                onSelect={onSelectCourse}
                onBuyNow={onBuyCourse}
              />
            ))}
          </div>
        ) : (
          <div className="text-center py-16 bg-slate-900/30 border border-slate-800 rounded-2xl space-y-3">
            <BookOpen className="w-10 h-10 text-slate-500 mx-auto" />
            <h3 className="text-base font-bold text-white">No matching courses found</h3>
            <p className="text-xs text-slate-400 max-w-sm mx-auto">
              We couldn't find any courses matching your current filters. Try searching for a different keyword or reset filters.
            </p>
            <button
              onClick={clearFilters}
              className="px-4 py-2 rounded-xl text-xs font-semibold bg-indigo-600 text-white hover:bg-indigo-500"
            >
              Reset All Filters
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
