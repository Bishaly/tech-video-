import React, { useState } from 'react';
import {
  Search,
  BookOpen,
  User as UserIcon,
  LogOut,
  Shield,
  Menu,
  X,
  Sparkles,
  Layers,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext.tsx';

interface NavbarProps {
  currentPath: string;
  onNavigate: (path: string) => void;
  onSearch?: (query: string) => void;
}

export const Navbar: React.FC<NavbarProps> = ({ currentPath, onNavigate, onSearch }) => {
  const { user, isAuthenticated, isAdmin, logout } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [profileDropdownOpen, setProfileDropdownOpen] = useState(false);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (onSearch) {
      onSearch(searchQuery);
    }
    onNavigate('/courses');
  };

  const navLinkClass = (path: string) =>
    `text-sm font-medium transition-colors px-3 py-1.5 rounded-lg ${
      currentPath === path
        ? 'text-white bg-slate-800/80'
        : 'text-slate-300 hover:text-white hover:bg-slate-800/40'
    }`;

  return (
    <header className="sticky top-0 z-40 w-full border-b border-slate-800/80 bg-slate-950/80 backdrop-blur-xl">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
        {/* Brand Logo */}
        <div
          id="nav-logo"
          onClick={() => onNavigate('/')}
          className="flex items-center gap-2.5 cursor-pointer select-none group"
        >
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-indigo-600 to-indigo-400 flex items-center justify-center text-white shadow-lg shadow-indigo-500/20 group-hover:scale-105 transition-transform">
            <Sparkles className="w-5 h-5 text-white" />
          </div>
          <span className="font-extrabold text-lg md:text-xl tracking-tight text-white flex items-center gap-1">
            NextGen<span className="text-indigo-400">Learn</span>
          </span>
        </div>

        {/* Search Bar (Desktop) */}
        <form
          onSubmit={handleSearchSubmit}
          className="hidden md:flex flex-1 max-w-md items-center relative"
        >
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 pointer-events-none" />
          <input
            id="nav-search-input"
            type="text"
            placeholder="Search courses, instructors, topics..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 text-sm bg-slate-900 border border-slate-800 rounded-xl text-slate-100 placeholder-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all"
          />
        </form>

        {/* Desktop Navigation Links */}
        <nav className="hidden lg:flex items-center gap-1">
          <button onClick={() => onNavigate('/courses')} className={navLinkClass('/courses')}>
            Courses
          </button>
          <button onClick={() => onNavigate('/courses')} className={navLinkClass('/categories')}>
            Categories
          </button>
          {isAuthenticated && (
            <button onClick={() => onNavigate('/my-courses')} className={navLinkClass('/my-courses')}>
              My Courses
            </button>
          )}
          {isAdmin && (
            <button
              onClick={() => onNavigate('/admin')}
              className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 hover:bg-indigo-500/20 transition-all"
            >
              <Shield className="w-3.5 h-3.5" />
              <span>Admin Panel</span>
            </button>
          )}
        </nav>

        {/* User Profile / Auth Actions */}
        <div className="hidden sm:flex items-center gap-3">
          {isAuthenticated && user ? (
            <div className="relative">
              <button
                id="btn-user-profile-menu"
                onClick={() => setProfileDropdownOpen(!profileDropdownOpen)}
                className="flex items-center gap-2.5 p-1 rounded-xl hover:bg-slate-800/60 transition-colors"
              >
                <img
                  src={user.avatar_url || `https://api.dicebear.com/7.x/initials/svg?seed=${user.name}`}
                  alt={user.name}
                  className="w-8 h-8 rounded-lg object-cover border border-slate-700"
                />
                <span className="text-sm font-medium text-slate-200 hidden md:inline">
                  {user.name}
                </span>
              </button>

              {/* Dropdown */}
              {profileDropdownOpen && (
                <div
                  className="absolute right-0 mt-2 w-56 bg-slate-900 border border-slate-800 rounded-xl shadow-2xl py-2 z-50 text-slate-200 animate-in fade-in"
                  onMouseLeave={() => setProfileDropdownOpen(false)}
                >
                  <div className="px-4 py-2 border-b border-slate-800">
                    <p className="text-sm font-semibold text-white">{user.name}</p>
                    <p className="text-xs text-slate-400 truncate">{user.email}</p>
                    <span className="mt-1 inline-block px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-slate-800 text-indigo-300">
                      {user.role}
                    </span>
                  </div>

                  <button
                    onClick={() => {
                      setProfileDropdownOpen(false);
                      onNavigate('/my-courses');
                    }}
                    className="w-full flex items-center gap-2.5 px-4 py-2 text-sm hover:bg-slate-800 text-left transition-colors"
                  >
                    <BookOpen className="w-4 h-4 text-indigo-400" />
                    <span>My Courses</span>
                  </button>

                  {isAdmin && (
                    <button
                      onClick={() => {
                        setProfileDropdownOpen(false);
                        onNavigate('/admin');
                      }}
                      className="w-full flex items-center gap-2.5 px-4 py-2 text-sm hover:bg-slate-800 text-left text-indigo-400 transition-colors"
                    >
                      <Shield className="w-4 h-4" />
                      <span>Admin Dashboard</span>
                    </button>
                  )}

                  <div className="border-t border-slate-800 my-1" />

                  <button
                    onClick={() => {
                      setProfileDropdownOpen(false);
                      logout();
                      onNavigate('/');
                    }}
                    className="w-full flex items-center gap-2.5 px-4 py-2 text-sm text-rose-400 hover:bg-rose-950/30 text-left transition-colors"
                  >
                    <LogOut className="w-4 h-4" />
                    <span>Sign Out</span>
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <button
                id="nav-login-btn"
                onClick={() => onNavigate('/login')}
                className="px-4 py-2 rounded-xl text-sm font-medium text-slate-300 hover:text-white hover:bg-slate-800/60 transition-colors"
              >
                Log In
              </button>
              <button
                id="nav-register-btn"
                onClick={() => onNavigate('/register')}
                className="px-4 py-2 rounded-xl text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-500 transition-all shadow-md shadow-indigo-600/25 active:scale-95"
              >
                Start Learning
              </button>
            </div>
          )}
        </div>

        {/* Mobile Hamburger */}
        <div className="flex items-center gap-2 lg:hidden">
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="p-2 text-slate-300 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
          >
            {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>
      </div>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div className="lg:hidden border-t border-slate-800 bg-slate-950 px-4 pt-3 pb-6 space-y-3 animate-in slide-in-from-top-2">
          <form onSubmit={handleSearchSubmit} className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3 pointer-events-none" />
            <input
              type="text"
              placeholder="Search courses..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 text-sm bg-slate-900 border border-slate-800 rounded-xl text-slate-100 placeholder-slate-500 focus:outline-none focus:border-indigo-500"
            />
          </form>

          <div className="flex flex-col gap-1 pt-1">
            <button
              onClick={() => {
                setMobileMenuOpen(false);
                onNavigate('/courses');
              }}
              className="text-left px-3 py-2 rounded-lg text-sm text-slate-200 hover:bg-slate-800"
            >
              Browse Courses
            </button>
            {isAuthenticated && (
              <button
                onClick={() => {
                  setMobileMenuOpen(false);
                  onNavigate('/my-courses');
                }}
                className="text-left px-3 py-2 rounded-lg text-sm text-slate-200 hover:bg-slate-800"
              >
                My Courses
              </button>
            )}
            {isAdmin && (
              <button
                onClick={() => {
                  setMobileMenuOpen(false);
                  onNavigate('/admin');
                }}
                className="text-left px-3 py-2 rounded-lg text-sm font-semibold text-indigo-400 hover:bg-slate-800 flex items-center gap-2"
              >
                <Shield className="w-4 h-4" />
                <span>Admin Dashboard</span>
              </button>
            )}
          </div>

          <div className="pt-2 border-t border-slate-800">
            {isAuthenticated && user ? (
              <div className="space-y-2">
                <div className="flex items-center gap-3 px-2 py-1">
                  <img
                    src={user.avatar_url}
                    alt={user.name}
                    className="w-8 h-8 rounded-lg object-cover"
                  />
                  <div>
                    <p className="text-sm font-semibold text-white">{user.name}</p>
                    <p className="text-xs text-slate-400">{user.email}</p>
                  </div>
                </div>
                <button
                  onClick={() => {
                    setMobileMenuOpen(false);
                    logout();
                    onNavigate('/');
                  }}
                  className="w-full text-left px-3 py-2 rounded-lg text-sm text-rose-400 hover:bg-rose-950/30 flex items-center gap-2"
                >
                  <LogOut className="w-4 h-4" />
                  <span>Sign Out</span>
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-2 pt-1">
                <button
                  onClick={() => {
                    setMobileMenuOpen(false);
                    onNavigate('/login');
                  }}
                  className="py-2.5 px-4 text-center rounded-xl text-sm font-medium border border-slate-800 text-slate-200 hover:bg-slate-800"
                >
                  Log In
                </button>
                <button
                  onClick={() => {
                    setMobileMenuOpen(false);
                    onNavigate('/register');
                  }}
                  className="py-2.5 px-4 text-center rounded-xl text-sm font-semibold bg-indigo-600 text-white hover:bg-indigo-500"
                >
                  Register
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </header>
  );
};
