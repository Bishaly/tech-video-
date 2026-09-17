import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { User } from '../types/index.ts';
import { apiRequest, setStoredToken, removeStoredToken, getStoredToken } from '../lib/api.ts';
import { useToast } from './ToastContext.tsx';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  isAuthenticated: boolean;
  isAdmin: boolean;
  enrolledCourseIds: string[];
  isEnrolled: (courseId: string) => boolean;
  login: (email: string, password: string) => Promise<boolean>;
  register: (name: string, email: string, password: string) => Promise<boolean>;
  logout: () => void;
  refreshUser: () => Promise<void>;
  markCoursePurchased: (courseId: string) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [enrolledCourseIds, setEnrolledCourseIds] = useState<string[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const { success, error } = useToast();

  const refreshUser = useCallback(async () => {
    const token = getStoredToken();
    if (!token) {
      setUser(null);
      setEnrolledCourseIds([]);
      setLoading(false);
      return;
    }

    try {
      const data = await apiRequest<{ user: User; enrolledCourseIds: string[] }>('/api/auth/me');
      setUser(data.user);
      setEnrolledCourseIds(data.enrolledCourseIds || []);
    } catch (err) {
      removeStoredToken();
      setUser(null);
      setEnrolledCourseIds([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshUser();
  }, [refreshUser]);

  const login = async (email: string, password: string): Promise<boolean> => {
    try {
      const data = await apiRequest<{
        token: string;
        user: User;
        enrolledCourseIds: string[];
      }>('/api/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password }),
      });

      setStoredToken(data.token);
      setUser(data.user);
      setEnrolledCourseIds(data.enrolledCourseIds || []);
      success(`Welcome back, ${data.user.name}!`);
      return true;
    } catch (err: any) {
      error(err.message || 'Login failed. Please verify your credentials.');
      return false;
    }
  };

  const register = async (name: string, email: string, password: string): Promise<boolean> => {
    try {
      const data = await apiRequest<{ token: string; user: User }>('/api/auth/register', {
        method: 'POST',
        body: JSON.stringify({ name, email, password }),
      });

      setStoredToken(data.token);
      setUser(data.user);
      setEnrolledCourseIds([]);
      success('Account created successfully! Welcome to NextGen Learn.');
      return true;
    } catch (err: any) {
      error(err.message || 'Registration failed.');
      return false;
    }
  };

  const logout = () => {
    removeStoredToken();
    setUser(null);
    setEnrolledCourseIds([]);
    success('You have been signed out.');
  };

  const markCoursePurchased = (courseId: string) => {
    setEnrolledCourseIds((prev) => (prev.includes(courseId) ? prev : [...prev, courseId]));
  };

  const isEnrolled = (courseId: string): boolean => {
    if (user?.role === 'admin') return true;
    return enrolledCourseIds.includes(courseId);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        isAuthenticated: Boolean(user),
        isAdmin: user?.role === 'admin',
        enrolledCourseIds,
        isEnrolled,
        login,
        register,
        logout,
        refreshUser,
        markCoursePurchased,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
