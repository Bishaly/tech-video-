import React, { useState, useEffect, useCallback } from 'react';
import { ToastProvider, useToast } from './context/ToastContext.tsx';
import { AuthProvider, useAuth } from './context/AuthContext.tsx';
import { Navbar } from './components/Navbar.tsx';
import { HomePage } from './pages/HomePage.tsx';
import { CoursesPage } from './pages/CoursesPage.tsx';
import { CourseDetailsPage } from './pages/CourseDetailsPage.tsx';
import { WatchPage } from './pages/WatchPage.tsx';
import { MyCoursesPage } from './pages/MyCoursesPage.tsx';
import { AuthPage } from './pages/AuthPages.tsx';
import { AdminPage } from './pages/AdminPage.tsx';
import { RazorpayModal } from './components/RazorpayModal.tsx';
import { Course, Category } from './types/index.ts';
import { apiRequest } from './lib/api.ts';
import { ShieldCheck, Sparkles, Zap, Lock } from 'lucide-react';

function AppContent() {
  const { user, isAuthenticated, isAdmin, isEnrolled } = useAuth();
  const { error, info } = useToast();

  const [path, setPath] = useState<string>('/');
  const [activeCourse, setActiveCourse] = useState<Course | null>(null);
  const [activeLessonId, setActiveLessonId] = useState<string | undefined>(undefined);
  const [courses, setCourses] = useState<Course[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);

  // Razorpay Checkout Modal
  const [checkoutCourse, setCheckoutCourse] = useState<Course | null>(null);
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);

  // Search filter query passed from Navbar
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');

  // Fetch courses catalog
  const loadCourses = useCallback(async () => {
    try {
      setLoading(true);
      const [coursesData, categoriesData] = await Promise.all([
        apiRequest<Course[]>('/api/courses'),
        apiRequest<Category[]>('/api/courses/categories'),
      ]);
      setCourses(coursesData);
      setCategories(categoriesData);
    } catch (err: any) {
      console.error('Failed to load courses catalog:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadCourses();
  }, [loadCourses]);

  // Sync hash routing
  useEffect(() => {
    const handleHashChange = () => {
      const hash = window.location.hash.replace('#', '') || '/';
      setPath(hash);

      if (hash.startsWith('/course/')) {
        const slug = hash.replace('/course/', '');
        const found = courses.find((c) => c.slug === slug || c.id === slug);
        if (found) {
          fetchCourseDetails(found.id || slug);
        }
      }
    };

    window.addEventListener('hashchange', handleHashChange);
    handleHashChange();

    return () => window.removeEventListener('hashchange', handleHashChange);
  }, [courses]);

  const navigate = (newPath: string) => {
    window.location.hash = newPath;
    setPath(newPath);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const fetchCourseDetails = async (slugOrId: string) => {
    try {
      const fullCourse = await apiRequest<Course>(`/api/courses/${slugOrId}`);
      setActiveCourse(fullCourse);
    } catch (err: any) {
      console.error('Failed to fetch detailed course:', err);
    }
  };

  const handleSelectCourse = async (course: Course) => {
    setActiveCourse(course);
    navigate(`/course/${course.slug}`);
    await fetchCourseDetails(course.slug);
  };

  const handleBuyCourse = (course: Course) => {
    if (!isAuthenticated) {
      info('Please sign in or register to purchase this course.');
      navigate('/login');
      return;
    }
    setCheckoutCourse(course);
    setIsCheckoutOpen(true);
  };

  const handlePurchaseSuccess = (courseId: string, slug?: string) => {
    // Reload catalog to update enrollment flags
    loadCourses();
    // Navigate straight to watch page
    navigate(`/watch/${courseId}`);
  };

  const handleStartWatching = (courseId: string, lessonId?: string) => {
    setActiveLessonId(lessonId);
    navigate(`/watch/${courseId}`);
  };

  const handleNavbarSearch = (query: string) => {
    setSearchQuery(query);
    navigate('/courses');
  };

  const handleCategorySelect = (slug: string) => {
    setCategoryFilter(slug);
    navigate('/courses');
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-950 text-slate-100 selection:bg-indigo-500 selection:text-white">
      {/* Global Navbar */}
      <Navbar
        currentPath={path}
        onNavigate={navigate}
        onSearch={handleNavbarSearch}
      />

      {/* Main View Router */}
      <div className="flex-1">
        {path === '/' && (
          <HomePage
            courses={courses}
            categories={categories}
            onSelectCourse={handleSelectCourse}
            onBuyCourse={handleBuyCourse}
            onNavigate={navigate}
            onSelectCategory={handleCategorySelect}
          />
        )}

        {path === '/courses' && (
          <CoursesPage
            courses={courses}
            categories={categories}
            initialCategory={categoryFilter}
            initialSearch={searchQuery}
            onSelectCourse={handleSelectCourse}
            onBuyCourse={handleBuyCourse}
          />
        )}

        {path.startsWith('/course/') && activeCourse && (
          <CourseDetailsPage
            course={activeCourse}
            onBuyNow={handleBuyCourse}
            onStartWatching={(courseId, lessonId) => handleStartWatching(courseId, lessonId)}
            onBack={() => navigate('/courses')}
          />
        )}

        {path.startsWith('/watch/') && (
          <WatchPage
            courseId={path.replace('/watch/', '')}
            initialLessonId={activeLessonId}
            onBack={() => navigate('/courses')}
            onOpenPurchaseModal={handleBuyCourse}
          />
        )}

        {path === '/my-courses' && (
          <MyCoursesPage
            onContinueLearning={(courseId, lessonId) => handleStartWatching(courseId, lessonId)}
            onExploreCourses={() => navigate('/courses')}
          />
        )}

        {path === '/login' && (
          <AuthPage
            mode="login"
            onSuccess={() => navigate('/')}
            onSwitchMode={(m) => navigate(`/${m}`)}
          />
        )}

        {path === '/register' && (
          <AuthPage
            mode="register"
            onSuccess={() => navigate('/')}
            onSwitchMode={(m) => navigate(`/${m}`)}
          />
        )}

        {path === '/admin' && (
          <AdminPage
            onNavigateHome={() => navigate('/')}
            onPreviewCourse={(course) => handleSelectCourse(course)}
          />
        )}
      </div>

      {/* Razorpay Checkout Modal */}
      {checkoutCourse && (
        <RazorpayModal
          course={checkoutCourse}
          isOpen={isCheckoutOpen}
          onClose={() => {
            setIsCheckoutOpen(false);
            setCheckoutCourse(null);
          }}
          onSuccess={handlePurchaseSuccess}
        />
      )}

      {/* Site Footer (Hidden on Watch Classroom page for distraction-free view) */}
      {!path.startsWith('/watch/') && !path.startsWith('/admin') && (
        <footer className="border-t border-slate-900 bg-slate-950 py-12 px-4 sm:px-6 lg:px-8 text-xs text-slate-400">
          <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-lg bg-indigo-600 flex items-center justify-center text-white font-black text-sm">
                N
              </div>
              <span className="font-bold text-white text-sm">
                NextGen<span className="text-indigo-400">Learn</span>
              </span>
              <span className="text-slate-600 ml-2">© 2026 NextGen Learn Inc. All rights reserved.</span>
            </div>

            <div className="flex flex-wrap items-center gap-6">
              <div className="flex items-center gap-1.5 text-emerald-400">
                <ShieldCheck className="w-4 h-4" />
                <span>Razorpay HMAC Verified</span>
              </div>
              <div className="flex items-center gap-1.5 text-sky-400">
                <Zap className="w-4 h-4" />
                <span>Cloudflare Stream Secured</span>
              </div>
              <button
                onClick={() => navigate('/admin')}
                className="hover:text-white transition-colors underline"
              >
                Staff Admin
              </button>
            </div>
          </div>
        </footer>
      )}
    </div>
  );
}

export default function App() {
  return (
    <ToastProvider>
      <AuthProvider>
        <AppContent />
      </AuthProvider>
    </ToastProvider>
  );
}
