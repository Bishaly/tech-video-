import React, { useState, useEffect, useCallback } from 'react';
import {
  Shield,
  LayoutDashboard,
  BookOpen,
  CreditCard,
  Users,
  Plus,
  Trash2,
  Edit,
  CheckCircle2,
  AlertCircle,
  Clock,
  Eye,
  EyeOff,
  Video,
  FileVideo,
  Loader2,
  RefreshCw,
  Sparkles,
  ArrowRight,
  ExternalLink,
} from 'lucide-react';
import { Course, Chapter, Lesson, AdminStats, AdminOrder, AdminUser } from '../types/index.ts';
import { apiRequest } from '../lib/api.ts';
import { useToast } from '../context/ToastContext.tsx';
import { useAuth } from '../context/AuthContext.tsx';

type AdminTab = 'dashboard' | 'courses' | 'orders' | 'users' | 'edit-course';

interface AdminPageProps {
  onNavigateHome: () => void;
  onPreviewCourse: (course: Course) => void;
}

export const AdminPage: React.FC<AdminPageProps> = ({ onNavigateHome, onPreviewCourse }) => {
  const { user, isAdmin, login, logout } = useAuth();
  const { success, error, info } = useToast();

  const [activeTab, setActiveTab] = useState<AdminTab>('dashboard');
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [courses, setCourses] = useState<Course[]>([]);
  const [orders, setOrders] = useState<AdminOrder[]>([]);
  const [usersList, setUsersList] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);

  // Admin login form state
  const [adminEmail, setAdminEmail] = useState('');
  const [adminPassword, setAdminPassword] = useState('');
  const [adminSubmitting, setAdminSubmitting] = useState(false);

  // Selected course for curriculum/lesson editing
  const [selectedCourse, setSelectedCourse] = useState<Course | null>(null);
  const [showCourseModal, setShowCourseModal] = useState(false);
  const [editingCourseData, setEditingCourseData] = useState<Partial<Course>>({});

  // Chapter & Lesson modal states
  const [showChapterModal, setShowChapterModal] = useState(false);
  const [newChapterTitle, setNewChapterTitle] = useState('');
  const [editingChapterId, setEditingChapterId] = useState<string | null>(null);
  const [editingChapterTitle, setEditingChapterTitle] = useState('');
  const [showLessonModal, setShowLessonModal] = useState(false);
  const [selectedChapterId, setSelectedChapterId] = useState('');
  const [lessonFormData, setLessonFormData] = useState<Partial<Lesson>>({
    title: '',
    description: '',
    duration_seconds: 600,
    is_free_preview: false,
    is_published: true,
    cloudflare_video_id: '',
  });
  const [lessonDurationMinutes, setLessonDurationMinutes] = useState(10);
  const [lessonDurationSeconds, setLessonDurationSeconds] = useState(0);

  // Load Administrative Data
  const loadData = useCallback(async () => {
    if (!isAdmin) {
      setLoading(false);
      return;
    }
    try {
      setLoading(true);
      const [statsData, coursesData, ordersData, usersData] = await Promise.all([
        apiRequest<AdminStats>('/api/admin/stats'),
        apiRequest<Course[]>('/api/admin/courses'),
        apiRequest<AdminOrder[]>('/api/admin/orders'),
        apiRequest<AdminUser[]>('/api/admin/users'),
      ]);
      setStats(statsData);
      setCourses(coursesData);
      setOrders(ordersData);
      setUsersList(usersData);
    } catch (err: any) {
      error(err.message || 'Failed to load administrative console.');
    } finally {
      setLoading(false);
    }
  }, [isAdmin, error]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleAdminLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!adminEmail || !adminPassword) {
      error('Please provide both email and password.');
      return;
    }
    try {
      setAdminSubmitting(true);
      const ok = await login(adminEmail, adminPassword);
      if (ok) {
        success('Administrator session initialized.');
      }
    } catch (err: any) {
      error(err.message || 'Authentication failed.');
    } finally {
      setAdminSubmitting(false);
    }
  };

  const handleQuickFillAdmin = () => {
    setAdminEmail('admin@nextgenlearn.com');
    setAdminPassword('AdminSecure2026!');
  };

  const handleDeleteChapter = async (chapterId: string) => {
    if (!window.confirm('Are you sure you want to delete this chapter and all its lessons?')) return;
    try {
      await apiRequest(`/api/admin/chapters/${chapterId}`, { method: 'DELETE' });
      setSelectedCourse((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          chapters: prev.chapters?.filter((ch) => ch.id !== chapterId),
        };
      });
      success('Chapter removed successfully.');
    } catch (err: any) {
      error(err.message || 'Failed to delete chapter.');
    }
  };

  const handleSaveChapterTitle = async (chapterId: string) => {
    if (!editingChapterTitle.trim()) return;
    try {
      const updated = await apiRequest<Chapter>(`/api/admin/chapters/${chapterId}`, {
        method: 'PUT',
        body: JSON.stringify({ title: editingChapterTitle.trim() }),
      });
      setSelectedCourse((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          chapters: prev.chapters?.map((ch) => (ch.id === chapterId ? { ...ch, title: updated.title } : ch)),
        };
      });
      setEditingChapterId(null);
      setEditingChapterTitle('');
      success('Chapter title updated.');
    } catch (err: any) {
      error(err.message || 'Failed to update chapter.');
    }
  };

  // Load specific course with all chapters & lessons
  const loadCourseDetails = async (courseId: string) => {
    try {
      setLoading(true);
      const data = await apiRequest<Course>(`/api/admin/courses/${courseId}`);
      setSelectedCourse(data);
      setActiveTab('edit-course');
    } catch (err: any) {
      error(err.message || 'Failed to fetch course details.');
    } finally {
      setLoading(false);
    }
  };

  // Toggle publish status
  const handleTogglePublish = async (course: Course) => {
    try {
      const updated = await apiRequest<Course>(`/api/admin/courses/${course.id}`, {
        method: 'PUT',
        body: JSON.stringify({ is_published: !course.is_published }),
      });
      setCourses((prev) => prev.map((c) => (c.id === course.id ? updated : c)));
      if (selectedCourse && selectedCourse.id === course.id) {
        setSelectedCourse(updated);
      }
      success(
        `Course "${course.title}" is now ${updated.is_published ? 'Published' : 'Draft/Unpublished'}.`
      );
    } catch (err: any) {
      error(err.message || 'Failed to toggle course visibility.');
    }
  };

  // Course Delete
  const handleDeleteCourse = async (courseId: string) => {
    if (!window.confirm('Are you sure you want to delete this course and all its lessons?')) return;
    try {
      await apiRequest(`/api/admin/courses/${courseId}`, { method: 'DELETE' });
      setCourses((prev) => prev.filter((c) => c.id !== courseId));
      if (selectedCourse?.id === courseId) {
        setSelectedCourse(null);
        setActiveTab('courses');
      }
      success('Course successfully deleted.');
    } catch (err: any) {
      error(err.message || 'Failed to delete course.');
    }
  };

  // Save/Create Course
  const handleSaveCourse = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingCourseData.id) {
        // Update
        const updated = await apiRequest<Course>(
          `/api/admin/courses/${editingCourseData.id}`,
          {
            method: 'PUT',
            body: JSON.stringify(editingCourseData),
          }
        );
        setCourses((prev) => prev.map((c) => (c.id === updated.id ? updated : c)));
        if (selectedCourse?.id === updated.id) setSelectedCourse(updated);
        success('Course metadata updated.');
      } else {
        // Create new
        const created = await apiRequest<Course>('/api/admin/courses', {
          method: 'POST',
          body: JSON.stringify(editingCourseData),
        });
        setCourses((prev) => [created, ...prev]);
        success('New course created successfully! Now add chapters and lessons.');
        loadCourseDetails(created.id);
      }
      setShowCourseModal(false);
    } catch (err: any) {
      error(err.message || 'Failed to save course.');
    }
  };

  // Create Chapter
  const handleCreateChapter = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCourse || !newChapterTitle) return;
    try {
      const chapter = await apiRequest<Chapter>('/api/admin/chapters', {
        method: 'POST',
        body: JSON.stringify({
          course_id: selectedCourse.id,
          title: newChapterTitle,
          sort_order: (selectedCourse.chapters?.length || 0) + 1,
        }),
      });
      setSelectedCourse((prev) =>
        prev
          ? {
              ...prev,
              chapters: [...(prev.chapters || []), { ...chapter, lessons: [] }],
            }
          : null
      );
      setNewChapterTitle('');
      setShowChapterModal(false);
      success('Chapter created.');
    } catch (err: any) {
      error(err.message || 'Failed to create chapter.');
    }
  };

  // Save Lesson
  const handleSaveLesson = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCourse || !selectedChapterId) return;

    try {
      const payload = {
        ...lessonFormData,
        cloudflare_video_id: (lessonFormData.cloudflare_video_id || '').trim(),
        duration_seconds: (lessonDurationMinutes * 60) + lessonDurationSeconds,
      };

      if (lessonFormData.id) {
        // Edit Lesson
        const updated = await apiRequest<Lesson>(`/api/admin/lessons/${lessonFormData.id}`, {
          method: 'PUT',
          body: JSON.stringify(payload),
        });
        setSelectedCourse((prev) => {
          if (!prev) return prev;
          return {
            ...prev,
            chapters: prev.chapters?.map((ch) => ({
              ...ch,
              lessons: ch.lessons?.map((l) => (l.id === updated.id ? updated : l)),
            })),
          };
        });
        success('Lesson updated successfully.');
      } else {
        // Create Lesson
        const created = await apiRequest<Lesson>('/api/admin/lessons', {
          method: 'POST',
          body: JSON.stringify({
            ...payload,
            chapter_id: selectedChapterId,
            course_id: selectedCourse.id,
          }),
        });
        setSelectedCourse((prev) => {
          if (!prev) return prev;
          return {
            ...prev,
            chapters: prev.chapters?.map((ch) =>
              ch.id === selectedChapterId
                ? { ...ch, lessons: [...(ch.lessons || []), created] }
                : ch
            ),
          };
        });
        success('Lesson created and added to chapter.');
      }
      setShowLessonModal(false);
    } catch (err: any) {
      error(err.message || 'Failed to save lesson.');
    }
  };

  // Delete Lesson
  const handleDeleteLesson = async (lessonId: string) => {
    if (!window.confirm('Delete this lesson?')) return;
    try {
      await apiRequest(`/api/admin/lessons/${lessonId}`, { method: 'DELETE' });
      setSelectedCourse((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          chapters: prev.chapters?.map((ch) => ({
            ...ch,
            lessons: ch.lessons?.filter((l) => l.id !== lessonId),
          })),
        };
      });
      success('Lesson deleted.');
    } catch (err: any) {
      error(err.message || 'Failed to delete lesson.');
    }
  };

  if (!isAdmin) {
    return (
      <div className="min-h-[calc(100vh-4rem)] bg-slate-950 flex items-center justify-center p-4">
        <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl p-8 space-y-6 shadow-2xl shadow-indigo-950/20">
          <div className="text-center space-y-2">
            <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 border border-indigo-500/30 flex items-center justify-center mx-auto text-indigo-400">
              <Shield className="w-6 h-6" />
            </div>
            <h1 className="text-2xl font-black text-white">Admin Operations Portal</h1>
            <p className="text-xs text-slate-400 max-w-sm mx-auto">
              Restricted management console. Requires verified administrative credentials.
            </p>
          </div>

          {user && (
            <div className="p-3.5 bg-amber-500/10 border border-amber-500/20 rounded-2xl space-y-2">
              <div className="flex items-center gap-2 text-xs font-semibold text-amber-300">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>Insufficient Privileges</span>
              </div>
              <p className="text-xs text-slate-300">
                You are currently signed in as <span className="font-semibold text-white">{user.name}</span> ({user.email}) with role <code className="text-amber-300 font-mono">{user.role}</code>.
              </p>
              <button
                type="button"
                onClick={logout}
                className="text-xs font-semibold text-amber-400 hover:text-amber-300 underline"
              >
                Sign out to switch to an administrator account &rarr;
              </button>
            </div>
          )}

          <form onSubmit={handleAdminLoginSubmit} className="space-y-4 text-xs">
            <div>
              <label className="block text-slate-300 font-semibold mb-1">Admin Email</label>
              <input
                type="email"
                required
                value={adminEmail}
                onChange={(e) => setAdminEmail(e.target.value)}
                placeholder="admin@nextgenlearn.com"
                className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white text-sm focus:outline-none focus:border-indigo-500"
              />
            </div>

            <div>
              <label className="block text-slate-300 font-semibold mb-1">Admin Password</label>
              <input
                type="password"
                required
                value={adminPassword}
                onChange={(e) => setAdminPassword(e.target.value)}
                placeholder="••••••••••••"
                className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white text-sm focus:outline-none focus:border-indigo-500"
              />
            </div>

            <button
              type="submit"
              disabled={adminSubmitting}
              className="w-full py-3 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-sm transition-all shadow-lg shadow-indigo-600/25 flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {adminSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Authenticating...</span>
                </>
              ) : (
                <>
                  <Shield className="w-4 h-4" />
                  <span>Access Admin Console</span>
                </>
              )}
            </button>

            {/* Quick Demo Credentials Autofill */}
            <div className="pt-3 border-t border-slate-800/80">
              <button
                type="button"
                onClick={handleQuickFillAdmin}
                className="w-full py-2 px-3 rounded-xl bg-slate-800/60 hover:bg-slate-800 text-slate-300 hover:text-white text-xs font-medium transition-colors flex items-center justify-center gap-2"
              >
                <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                <span>Fill Default Admin Credentials</span>
              </button>
            </div>
          </form>

          <div className="text-center pt-2">
            <button
              onClick={onNavigateHome}
              className="text-xs text-slate-500 hover:text-slate-300 transition-colors"
            >
              &larr; Return to Storefront
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-[calc(100vh-4rem)] flex flex-col lg:flex-row bg-slate-950 text-slate-100">
      {/* Admin Sidebar Navigation */}
      <aside className="w-full lg:w-64 border-r border-slate-800 bg-slate-950/80 p-4 space-y-6 shrink-0">
        <div className="flex items-center gap-2.5 px-3 py-2 bg-indigo-500/10 border border-indigo-500/20 rounded-xl">
          <Shield className="w-5 h-5 text-indigo-400" />
          <div>
            <h2 className="text-xs font-bold text-white uppercase tracking-wider">Admin Console</h2>
            <p className="text-[10px] text-slate-400">NextGen Operations</p>
          </div>
        </div>

        <nav className="space-y-1">
          <button
            onClick={() => setActiveTab('dashboard')}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold transition-all ${
              activeTab === 'dashboard'
                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/25'
                : 'text-slate-300 hover:bg-slate-900 hover:text-white'
            }`}
          >
            <LayoutDashboard className="w-4 h-4" />
            <span>Dashboard Overview</span>
          </button>

          <button
            onClick={() => setActiveTab('courses')}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold transition-all ${
              activeTab === 'courses' || activeTab === 'edit-course'
                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/25'
                : 'text-slate-300 hover:bg-slate-900 hover:text-white'
            }`}
          >
            <BookOpen className="w-4 h-4" />
            <span>Course Management</span>
          </button>

          <button
            onClick={() => setActiveTab('orders')}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold transition-all ${
              activeTab === 'orders'
                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/25'
                : 'text-slate-300 hover:bg-slate-900 hover:text-white'
            }`}
          >
            <CreditCard className="w-4 h-4" />
            <span>Razorpay Orders</span>
          </button>

          <button
            onClick={() => setActiveTab('users')}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold transition-all ${
              activeTab === 'users'
                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/25'
                : 'text-slate-300 hover:bg-slate-900 hover:text-white'
            }`}
          >
            <Users className="w-4 h-4" />
            <span>Students Directory</span>
          </button>
        </nav>

        <div className="pt-6 border-t border-slate-800 space-y-2">
          <button
            onClick={onNavigateHome}
            className="w-full py-2 px-3 rounded-lg bg-slate-900 hover:bg-slate-800 text-xs text-slate-300 font-medium text-left flex items-center justify-between"
          >
            <span>Exit to Storefront</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </aside>

      {/* Main Admin Content */}
      <main className="flex-1 p-6 lg:p-8 overflow-y-auto space-y-8">
        {/* 1. DASHBOARD OVERVIEW */}
        {activeTab === 'dashboard' && (
          <div className="space-y-8">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl sm:text-3xl font-black text-white">Revenue & Operations</h1>
                <p className="text-xs text-slate-400 mt-1">
                  Live metrics synchronized across PostgreSQL, Razorpay, and Cloudflare Stream.
                </p>
              </div>
              <button
                onClick={loadData}
                className="p-2 rounded-xl bg-slate-900 border border-slate-800 hover:bg-slate-800 text-slate-300 text-xs flex items-center gap-1.5"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Refresh</span>
              </button>
            </div>

            {/* Metrics cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
              <div className="bg-slate-900/60 border border-slate-800 p-5 rounded-2xl space-y-1">
                <span className="text-xs text-slate-400 font-medium">Total Revenue</span>
                <p className="text-2xl font-black text-white font-mono">
                  ₹{(stats?.totalRevenue || 0).toLocaleString('en-IN')}
                </p>
                <span className="text-[10px] text-emerald-400 font-semibold">100% Verified Payments</span>
              </div>

              <div className="bg-slate-900/60 border border-slate-800 p-5 rounded-2xl space-y-1">
                <span className="text-xs text-slate-400 font-medium">Paid Orders</span>
                <p className="text-2xl font-black text-white font-mono">{stats?.totalOrders || 0}</p>
                <span className="text-[10px] text-indigo-400 font-semibold">Razorpay Captured</span>
              </div>

              <div className="bg-slate-900/60 border border-slate-800 p-5 rounded-2xl space-y-1">
                <span className="text-xs text-slate-400 font-medium">Registered Users</span>
                <p className="text-2xl font-black text-white font-mono">{stats?.totalUsers || 0}</p>
                <span className="text-[10px] text-slate-500 font-medium">Active Students</span>
              </div>

              <div className="bg-slate-900/60 border border-slate-800 p-5 rounded-2xl space-y-1">
                <span className="text-xs text-slate-400 font-medium">Active Courses</span>
                <p className="text-2xl font-black text-white font-mono">{stats?.totalCourses || 0}</p>
                <span className="text-[10px] text-slate-500 font-medium">Published in Catalog</span>
              </div>

              <div className="bg-slate-900/60 border border-slate-800 p-5 rounded-2xl space-y-1">
                <span className="text-xs text-slate-400 font-medium">Total Stream Lessons</span>
                <p className="text-2xl font-black text-white font-mono">{stats?.totalLessons || 0}</p>
                <span className="text-[10px] text-sky-400 font-semibold">Cloudflare Encoded</span>
              </div>
            </div>

            {/* Recent Orders & Users */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Recent Orders Table */}
              <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-6 space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold text-white">Recent Razorpay Purchases</h3>
                  <button
                    onClick={() => setActiveTab('orders')}
                    className="text-xs text-indigo-400 hover:text-indigo-300"
                  >
                    View All &rarr;
                  </button>
                </div>

                <div className="divide-y divide-slate-800/80">
                  {stats?.recentPurchases && stats.recentPurchases.length > 0 ? (
                    stats.recentPurchases.map((p) => (
                      <div key={p.id} className="py-3 flex items-center justify-between text-xs">
                        <div>
                          <p className="font-semibold text-white">{p.course_title}</p>
                          <p className="text-slate-400">{p.user_name} ({p.user_email})</p>
                        </div>
                        <div className="text-right">
                          <p className="font-bold text-white font-mono">
                            ₹{p.amount_inr.toLocaleString('en-IN')}
                          </p>
                          <span className="text-[10px] font-semibold text-emerald-400">
                            {p.verification_status}
                          </span>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="py-6 text-center text-xs text-slate-500">No purchases recorded yet.</div>
                  )}
                </div>
              </div>

              {/* Recent Students Table */}
              <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-6 space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold text-white">Recently Joined Students</h3>
                  <button
                    onClick={() => setActiveTab('users')}
                    className="text-xs text-indigo-400 hover:text-indigo-300"
                  >
                    View All &rarr;
                  </button>
                </div>

                <div className="divide-y divide-slate-800/80">
                  {stats?.recentUsers && stats.recentUsers.length > 0 ? (
                    stats.recentUsers.map((u) => (
                      <div key={u.id} className="py-3 flex items-center justify-between text-xs">
                        <div>
                          <p className="font-semibold text-white">{u.name}</p>
                          <p className="text-slate-400">{u.email}</p>
                        </div>
                        <div className="text-right">
                          <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-slate-800 text-slate-300">
                            {u.courses_count} enrolled
                          </span>
                          <p className="text-[10px] text-slate-500 mt-0.5">
                            {new Date(u.created_at).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="py-6 text-center text-xs text-slate-500">No students recorded.</div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* 2. COURSES LIST VIEW */}
        {activeTab === 'courses' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-black text-white">Course Management</h1>
                <p className="text-xs text-slate-400 mt-1">
                  Create masterclasses, adjust pricing, manage lessons, and upload Cloudflare videos.
                </p>
              </div>

              <button
                id="btn-admin-create-course"
                onClick={() => {
                  setEditingCourseData({
                    title: '',
                    slug: '',
                    subtitle: '',
                    description: '',
                    instructor_name: user?.name || 'Instructor',
                    instructor_title: 'Software Architect',
                    price_inr: 999,
                    original_price_inr: 2999,
                    level: 'All Levels',
                    is_published: true,
                    duration_hours: 10,
                    thumbnail_url:
                      'https://images.unsplash.com/photo-1517694712202-14dd9538aa97?w=1200&auto=format&fit=crop&q=80',
                    what_you_will_learn: [
                      'Production-ready system architecture',
                      'Full stack deployment & monitoring',
                    ],
                    requirements: ['Basic programming knowledge'],
                  });
                  setShowCourseModal(true);
                }}
                className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-lg shadow-indigo-600/25 transition-all"
              >
                <Plus className="w-4 h-4" />
                <span>Create New Course</span>
              </button>
            </div>

            {/* Courses Table */}
            <div className="border border-slate-800 rounded-2xl overflow-hidden bg-slate-900/60">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-950/80 border-b border-slate-800 text-slate-400 uppercase font-semibold">
                  <tr>
                    <th className="p-4">Course</th>
                    <th className="p-4">Price</th>
                    <th className="p-4">Lessons</th>
                    <th className="p-4">Status</th>
                    <th className="p-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {courses.map((c) => (
                    <tr key={c.id} className="hover:bg-slate-800/30 transition-colors">
                      <td className="p-4 flex items-center gap-3">
                        <img
                          src={c.thumbnail_url}
                          alt={c.title}
                          className="w-14 h-10 rounded-lg object-cover bg-slate-950 shrink-0"
                        />
                        <div>
                          <p className="font-bold text-white text-sm line-clamp-1">{c.title}</p>
                          <p className="text-slate-400 text-[11px]">{c.instructor_name} • {c.level}</p>
                        </div>
                      </td>
                      <td className="p-4 font-mono font-bold text-white">
                        ₹{c.price_inr.toLocaleString('en-IN')}
                      </td>
                      <td className="p-4 text-slate-300">
                        {c.chapters?.reduce((sum, ch) => sum + (ch.lessons?.length || 0), 0) || 12} lessons
                      </td>
                      <td className="p-4">
                        <button
                          onClick={() => handleTogglePublish(c)}
                          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-semibold border ${
                            c.is_published
                              ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                              : 'bg-amber-500/10 text-amber-400 border-amber-500/30'
                          }`}
                        >
                          {c.is_published ? <Eye className="w-3 h-3" /> : <EyeOff className="w-3 h-3" />}
                          <span>{c.is_published ? 'Published' : 'Draft'}</span>
                        </button>
                      </td>
                      <td className="p-4 text-right space-x-2">
                        <button
                          onClick={() => loadCourseDetails(c.id)}
                          className="px-3 py-1.5 rounded-lg bg-indigo-600/20 text-indigo-300 hover:bg-indigo-600/30 border border-indigo-500/30 font-semibold"
                        >
                          Manage Lessons
                        </button>
                        <button
                          onClick={() => {
                            setEditingCourseData(c);
                            setShowCourseModal(true);
                          }}
                          className="p-1.5 text-slate-400 hover:text-white"
                          title="Edit Metadata"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteCourse(c.id)}
                          className="p-1.5 text-rose-400 hover:text-rose-300"
                          title="Delete Course"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* 3. COURSE CURRICULUM & VIDEO UPLOAD EDITOR */}
        {activeTab === 'edit-course' && selectedCourse && (
          <div className="space-y-6">
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <div>
                <button
                  onClick={() => setActiveTab('courses')}
                  className="text-xs text-indigo-400 hover:text-indigo-300 mb-1 inline-block"
                >
                  &larr; Back to Courses
                </button>
                <h1 className="text-2xl font-black text-white">{selectedCourse.title}</h1>
                <p className="text-xs text-slate-400">
                  Manage sections, add lessons, and upload video content to Cloudflare Stream.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => onPreviewCourse(selectedCourse)}
                  className="px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-300 hover:text-white text-xs font-semibold flex items-center gap-1.5"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  <span>Preview Course</span>
                </button>
                <button
                  onClick={() => setShowChapterModal(true)}
                  className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold flex items-center gap-1.5 shadow-lg shadow-indigo-600/25"
                >
                  <Plus className="w-4 h-4" />
                  <span>Add Chapter</span>
                </button>
              </div>
            </div>

            {/* Chapters and Lessons */}
            <div className="space-y-4">
              {selectedCourse.chapters && selectedCourse.chapters.length > 0 ? (
                selectedCourse.chapters.map((chapter) => (
                  <div
                    key={chapter.id}
                    className="border border-slate-800 rounded-2xl bg-slate-900/60 overflow-hidden"
                  >
                    <div className="p-4 bg-slate-950/80 border-b border-slate-800 flex flex-wrap items-center justify-between gap-3">
                      <div className="flex items-center gap-2 flex-1 min-w-[200px]">
                        <BookOpen className="w-4 h-4 text-indigo-400 shrink-0" />
                        {editingChapterId === chapter.id ? (
                          <div className="flex items-center gap-2 flex-1 max-w-sm">
                            <input
                              type="text"
                              value={editingChapterTitle}
                              onChange={(e) => setEditingChapterTitle(e.target.value)}
                              className="px-2.5 py-1 bg-slate-900 border border-slate-700 rounded-lg text-white text-xs flex-1 focus:outline-none focus:border-indigo-500"
                              placeholder="Chapter title"
                              autoFocus
                            />
                            <button
                              onClick={() => handleSaveChapterTitle(chapter.id)}
                              className="px-2.5 py-1 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-semibold"
                            >
                              Save
                            </button>
                            <button
                              onClick={() => setEditingChapterId(null)}
                              className="px-2 py-1 text-slate-400 hover:text-white text-xs"
                            >
                              Cancel
                            </button>
                          </div>
                        ) : (
                          <div className="flex items-center gap-2">
                            <h3 className="font-bold text-sm text-white">{chapter.title}</h3>
                            <button
                              onClick={() => {
                                setEditingChapterId(chapter.id);
                                setEditingChapterTitle(chapter.title);
                              }}
                              className="p-1 text-slate-400 hover:text-white rounded"
                              title="Edit Chapter Title"
                            >
                              <Edit className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => handleDeleteChapter(chapter.id)}
                              className="p-1 text-rose-400 hover:text-rose-300 rounded"
                              title="Delete Chapter"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        )}
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => {
                            setSelectedChapterId(chapter.id);
                            setLessonFormData({
                              title: '',
                              description: '',
                              duration_seconds: 600,
                              is_free_preview: false,
                              is_published: true,
                              cloudflare_video_id: '',
                            });
                            setLessonDurationMinutes(10);
                            setLessonDurationSeconds(0);
                            setShowLessonModal(true);
                          }}
                          className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium flex items-center gap-1 cursor-pointer"
                        >
                          <Plus className="w-3.5 h-3.5" />
                          <span>Add Lesson</span>
                        </button>
                      </div>
                    </div>

                    <div className="divide-y divide-slate-800/60">
                      {chapter.lessons && chapter.lessons.length > 0 ? (
                        chapter.lessons.map((lesson) => (
                          <div
                            key={lesson.id}
                            className="p-4 flex items-center justify-between text-xs hover:bg-slate-800/20"
                          >
                            <div className="flex items-center gap-3">
                              <FileVideo className="w-4 h-4 text-slate-400 shrink-0" />
                              <div>
                                <p className="font-semibold text-white">{lesson.title}</p>
                                <div className="flex items-center gap-2 text-slate-500 mt-0.5">
                                  <span>
                                    {Math.floor(lesson.duration_seconds / 60)}m {lesson.duration_seconds % 60}s
                                  </span>
                                  <span>•</span>
                                  {lesson.cloudflare_video_id ? (
                                    <span className="font-mono text-emerald-400 font-medium">
                                      Stream UID: {lesson.cloudflare_video_id.substring(0, 12)}...
                                    </span>
                                  ) : (
                                    <span className="text-amber-400 font-medium">
                                      No Video ID Linked
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>

                            <div className="flex items-center gap-3">
                              {lesson.is_free_preview && (
                                <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                                  Free Preview
                                </span>
                              )}
                              {lesson.is_published === false && (
                                <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-slate-800 text-slate-400 border border-slate-700">
                                  Draft
                                </span>
                              )}
                              <button
                                onClick={() => {
                                  setSelectedChapterId(chapter.id);
                                  setLessonFormData({
                                    ...lesson,
                                    is_published: lesson.is_published !== false,
                                  });
                                  const totalSecs = lesson.duration_seconds || 0;
                                  setLessonDurationMinutes(Math.floor(totalSecs / 60));
                                  setLessonDurationSeconds(totalSecs % 60);
                                  setShowLessonModal(true);
                                }}
                                className="p-1 text-slate-400 hover:text-white cursor-pointer"
                                title="Edit Lesson"
                              >
                                <Edit className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => handleDeleteLesson(lesson.id)}
                                className="p-1 text-rose-400 hover:text-rose-300 cursor-pointer"
                                title="Delete Lesson"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </div>
                        ))
                      ) : (
                        <div className="p-4 text-center text-xs text-slate-500">
                          No lessons added to this chapter yet. Click "Add Lesson" above.
                        </div>
                      )}
                    </div>
                  </div>
                ))
              ) : (
                <div className="p-8 text-center bg-slate-900/30 border border-slate-800 rounded-2xl space-y-2">
                  <p className="text-xs text-slate-400">This course has no curriculum sections yet.</p>
                  <button
                    onClick={() => setShowChapterModal(true)}
                    className="px-4 py-2 rounded-xl bg-indigo-600 text-white text-xs font-semibold"
                  >
                    Create First Chapter
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* 4. ORDERS VIEW */}
        {activeTab === 'orders' && (
          <div className="space-y-6">
            <div>
              <h1 className="text-2xl font-black text-white">Razorpay Orders & Audits</h1>
              <p className="text-xs text-slate-400 mt-1">
                Full cryptographic verification history and order logs.
              </p>
            </div>

            <div className="border border-slate-800 rounded-2xl overflow-hidden bg-slate-900/60">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-950/80 border-b border-slate-800 text-slate-400 uppercase font-semibold">
                  <tr>
                    <th className="p-4">Order ID / Payment ID</th>
                    <th className="p-4">Student</th>
                    <th className="p-4">Course</th>
                    <th className="p-4">Amount</th>
                    <th className="p-4">Verification</th>
                    <th className="p-4">Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {orders.map((ord) => (
                    <tr key={ord.id} className="hover:bg-slate-800/30">
                      <td className="p-4">
                        <p className="font-mono font-bold text-indigo-400">{ord.razorpay_order_id}</p>
                        <p className="font-mono text-[10px] text-slate-500">
                          {ord.razorpay_payment_id || 'Pending Gateway Capture'}
                        </p>
                      </td>
                      <td className="p-4">
                        <p className="font-medium text-white">{ord.user?.name || ord.user_id}</p>
                        <p className="text-slate-400 text-[11px]">{ord.user?.email}</p>
                      </td>
                      <td className="p-4 font-medium text-slate-200">{ord.course?.title || ord.course_id}</td>
                      <td className="p-4 font-mono font-bold text-white">
                        ₹{ord.amount_inr.toLocaleString('en-IN')}
                      </td>
                      <td className="p-4">
                        <span
                          className={`px-2.5 py-1 rounded-full text-[10px] font-semibold border ${
                            ord.verification_status === 'verified'
                              ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                              : ord.payment_status === 'failed'
                              ? 'bg-rose-500/10 text-rose-400 border-rose-500/30'
                              : 'bg-amber-500/10 text-amber-400 border-amber-500/30'
                          }`}
                        >
                          {ord.verification_status.toUpperCase()}
                        </span>
                      </td>
                      <td className="p-4 text-slate-400">
                        {new Date(ord.purchase_date).toLocaleDateString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* 5. USERS DIRECTORY VIEW */}
        {activeTab === 'users' && (
          <div className="space-y-6">
            <div>
              <h1 className="text-2xl font-black text-white">Students & Accounts</h1>
              <p className="text-xs text-slate-400 mt-1">
                Directory of registered users, enrollment counts, and total platform spend.
              </p>
            </div>

            <div className="border border-slate-800 rounded-2xl overflow-hidden bg-slate-900/60">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-950/80 border-b border-slate-800 text-slate-400 uppercase font-semibold">
                  <tr>
                    <th className="p-4">User</th>
                    <th className="p-4">Role</th>
                    <th className="p-4">Purchased Courses</th>
                    <th className="p-4">Total Spent</th>
                    <th className="p-4">Joined Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {usersList.map((u) => (
                    <tr key={u.id} className="hover:bg-slate-800/30">
                      <td className="p-4 flex items-center gap-3">
                        <img
                          src={u.avatar_url || `https://api.dicebear.com/7.x/initials/svg?seed=${u.name}`}
                          alt={u.name}
                          className="w-8 h-8 rounded-lg object-cover"
                        />
                        <div>
                          <p className="font-bold text-white">{u.name}</p>
                          <p className="text-slate-400 text-[11px]">{u.email}</p>
                        </div>
                      </td>
                      <td className="p-4">
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-slate-800 text-indigo-300">
                          {u.role}
                        </span>
                      </td>
                      <td className="p-4 text-slate-300">{u.courses_count} courses</td>
                      <td className="p-4 font-mono font-bold text-white">
                        ₹{u.total_spent_inr.toLocaleString('en-IN')}
                      </td>
                      <td className="p-4 text-slate-400">
                        {new Date(u.created_at).toLocaleDateString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </main>

      {/* MODAL: Course Metadata */}
      {showCourseModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm overflow-y-auto">
          <div className="w-full max-w-2xl bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 space-y-6 my-8">
            <h3 className="text-xl font-bold text-white">
              {editingCourseData.id ? 'Edit Course' : 'Create New Course'}
            </h3>

            <form onSubmit={handleSaveCourse} className="space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="sm:col-span-2">
                  <label className="block font-semibold text-slate-300 mb-1">Course Title</label>
                  <input
                    type="text"
                    required
                    value={editingCourseData.title || ''}
                    onChange={(e) => setEditingCourseData({ ...editingCourseData, title: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white text-sm"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block font-semibold text-slate-300 mb-1">Subtitle / Summary</label>
                  <input
                    type="text"
                    value={editingCourseData.subtitle || ''}
                    onChange={(e) => setEditingCourseData({ ...editingCourseData, subtitle: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white text-sm"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block font-semibold text-slate-300 mb-1">Full Description</label>
                  <textarea
                    rows={4}
                    required
                    value={editingCourseData.description || ''}
                    onChange={(e) => setEditingCourseData({ ...editingCourseData, description: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white text-sm"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-300 mb-1">Price (INR)</label>
                  <input
                    type="number"
                    required
                    value={editingCourseData.price_inr ?? 999}
                    onChange={(e) => setEditingCourseData({ ...editingCourseData, price_inr: Number(e.target.value) })}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white text-sm font-mono"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-300 mb-1">Original Price (INR)</label>
                  <input
                    type="number"
                    value={editingCourseData.original_price_inr ?? 2999}
                    onChange={(e) => setEditingCourseData({ ...editingCourseData, original_price_inr: Number(e.target.value) })}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white text-sm font-mono"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-300 mb-1">Instructor Name</label>
                  <input
                    type="text"
                    value={editingCourseData.instructor_name || ''}
                    onChange={(e) => setEditingCourseData({ ...editingCourseData, instructor_name: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white text-sm"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-300 mb-1">Difficulty Level</label>
                  <select
                    value={editingCourseData.level || 'All Levels'}
                    onChange={(e) => setEditingCourseData({ ...editingCourseData, level: e.target.value as any })}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white text-sm"
                  >
                    <option value="Beginner">Beginner</option>
                    <option value="Intermediate">Intermediate</option>
                    <option value="Advanced">Advanced</option>
                    <option value="All Levels">All Levels</option>
                  </select>
                </div>

                <div className="sm:col-span-2">
                  <label className="block font-semibold text-slate-300 mb-1">Thumbnail Image URL</label>
                  <input
                    type="url"
                    value={editingCourseData.thumbnail_url || ''}
                    onChange={(e) => setEditingCourseData({ ...editingCourseData, thumbnail_url: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white text-sm font-mono"
                  />
                </div>
              </div>

              <div className="flex items-center gap-2 pt-2">
                <input
                  type="checkbox"
                  id="course-is-published"
                  checked={Boolean(editingCourseData.is_published)}
                  onChange={(e) => setEditingCourseData({ ...editingCourseData, is_published: e.target.checked })}
                  className="rounded border-slate-700 bg-slate-950 text-indigo-600"
                />
                <label htmlFor="course-is-published" className="text-slate-300">
                  Publish immediately (visible to store visitors)
                </label>
              </div>

              <div className="flex gap-3 justify-end pt-4 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowCourseModal(false)}
                  className="px-4 py-2 rounded-xl text-slate-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold"
                >
                  Save Course
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: Add Chapter */}
      {showChapterModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4">
            <h3 className="font-bold text-white text-base">Add New Chapter Section</h3>
            <form onSubmit={handleCreateChapter} className="space-y-3">
              <input
                type="text"
                required
                placeholder="e.g. Chapter 2: High Throughput Event Streams"
                value={newChapterTitle}
                onChange={(e) => setNewChapterTitle(e.target.value)}
                className="w-full px-3 py-2 text-sm bg-slate-950 border border-slate-800 rounded-xl text-white"
              />
              <div className="flex gap-2 justify-end pt-2">
                <button
                  type="button"
                  onClick={() => setShowChapterModal(false)}
                  className="px-3 py-1.5 text-xs text-slate-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg"
                >
                  Create Chapter
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: Add/Edit Lesson & Cloudflare Video Upload */}
      {showLessonModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm overflow-y-auto">
          <div className="w-full max-w-lg bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 space-y-5 my-8">
            <h3 className="font-bold text-white text-lg">
              {lessonFormData.id ? 'Edit Lesson' : 'Add Lesson & Upload Video'}
            </h3>

            <form onSubmit={handleSaveLesson} className="space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-slate-300 mb-1">Lesson Title</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Setting up Distributed Caching"
                  value={lessonFormData.title || ''}
                  onChange={(e) => setLessonFormData({ ...lessonFormData, title: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white text-sm"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-300 mb-1">Lesson Description</label>
                <textarea
                  rows={3}
                  placeholder="What this lesson covers..."
                  value={lessonFormData.description || ''}
                  onChange={(e) => setLessonFormData({ ...lessonFormData, description: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white"
                />
              </div>

              {/* Cloudflare Stream Video ID Input */}
              <div className="space-y-2 p-4 bg-slate-950/80 border border-slate-800 rounded-2xl">
                <div className="flex items-center justify-between">
                  <label className="font-semibold text-indigo-400 flex items-center gap-1.5 text-xs">
                    <Video className="w-4 h-4" />
                    <span>Cloudflare Stream Video ID / UID</span>
                  </label>
                  {lessonFormData.cloudflare_video_id?.trim() ? (
                    <span className="text-[10px] text-emerald-400 flex items-center gap-1 font-medium">
                      <CheckCircle2 className="w-3 h-3" />
                      <span>UID Configured</span>
                    </span>
                  ) : (
                    <span className="text-[10px] text-amber-400 font-medium">
                      Unlinked / Pending
                    </span>
                  )}
                </div>

                <input
                  type="text"
                  placeholder="e.g. ea95132c15732412d22c1476fa83f27a"
                  value={lessonFormData.cloudflare_video_id || ''}
                  onChange={(e) => setLessonFormData({ ...lessonFormData, cloudflare_video_id: e.target.value.trim() })}
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-lg text-white font-mono text-xs focus:outline-none focus:border-indigo-500"
                />

                <p className="text-[11px] text-slate-400 leading-relaxed">
                  Upload your video directly to Cloudflare Stream, then paste the Stream Video ID/UID here.
                </p>
              </div>

              {/* Lesson Duration (Minutes & Seconds) */}
              <div>
                <label className="block font-semibold text-slate-300 mb-1">Lesson Duration</label>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <div className="relative flex items-center">
                      <input
                        type="number"
                        min="0"
                        placeholder="Minutes"
                        value={lessonDurationMinutes}
                        onChange={(e) => {
                          const mins = Math.max(0, parseInt(e.target.value) || 0);
                          setLessonDurationMinutes(mins);
                          setLessonFormData((prev) => ({
                            ...prev,
                            duration_seconds: mins * 60 + lessonDurationSeconds,
                          }));
                        }}
                        className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white text-sm"
                      />
                      <span className="absolute right-3 text-slate-500 text-xs">mins</span>
                    </div>
                  </div>
                  <div>
                    <div className="relative flex items-center">
                      <input
                        type="number"
                        min="0"
                        max="59"
                        placeholder="Seconds"
                        value={lessonDurationSeconds}
                        onChange={(e) => {
                          const secs = Math.max(0, Math.min(59, parseInt(e.target.value) || 0));
                          setLessonDurationSeconds(secs);
                          setLessonFormData((prev) => ({
                            ...prev,
                            duration_seconds: lessonDurationMinutes * 60 + secs,
                          }));
                        }}
                        className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white text-sm"
                      />
                      <span className="absolute right-3 text-slate-500 text-xs">secs</span>
                    </div>
                  </div>
                </div>
                <p className="text-[10px] text-slate-500 mt-1 font-mono">
                  Total duration: {lessonDurationMinutes * 60 + lessonDurationSeconds} seconds
                </p>
              </div>

              {/* Toggles: Free Preview and Published */}
              <div className="space-y-2 pt-1">
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="lesson-free-preview"
                    checked={Boolean(lessonFormData.is_free_preview)}
                    onChange={(e) => setLessonFormData({ ...lessonFormData, is_free_preview: e.target.checked })}
                    className="rounded border-slate-700 bg-slate-950 text-indigo-600 focus:ring-0"
                  />
                  <label htmlFor="lesson-free-preview" className="text-slate-300 font-medium cursor-pointer">
                    Free Preview (unlocked for all visitors before purchase)
                  </label>
                </div>

                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="lesson-is-published"
                    checked={lessonFormData.is_published !== false}
                    onChange={(e) => setLessonFormData({ ...lessonFormData, is_published: e.target.checked })}
                    className="rounded border-slate-700 bg-slate-950 text-indigo-600 focus:ring-0"
                  />
                  <label htmlFor="lesson-is-published" className="text-slate-300 font-medium cursor-pointer">
                    Published (visible in course curriculum navigation)
                  </label>
                </div>
              </div>

              <div className="flex gap-2 justify-end pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowLessonModal(false)}
                  className="px-4 py-2 text-slate-400 hover:text-white cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold rounded-xl cursor-pointer transition-colors"
                >
                  Save Lesson
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
