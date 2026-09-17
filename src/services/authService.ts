import { User } from '../types/index.ts';
import { apiRequest, setStoredToken, removeStoredToken, getStoredToken } from '../lib/api.ts';

export interface AuthResponse {
  token: string;
  user: User;
  enrolledCourseIds?: string[];
}

export interface CurrentUserResponse {
  user: User;
  enrolledCourseIds: string[];
}

export const authService = {
  getStoredToken(): string | null {
    return getStoredToken();
  },

  setStoredToken(token: string): void {
    setStoredToken(token);
  },

  removeStoredToken(): void {
    removeStoredToken();
  },

  async getCurrentUser(): Promise<CurrentUserResponse> {
    return apiRequest<CurrentUserResponse>('/api/auth/me');
  },

  async login(email: string, password: string): Promise<AuthResponse> {
    const data = await apiRequest<AuthResponse>('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
    setStoredToken(data.token);
    return data;
  },

  async register(name: string, email: string, password: string): Promise<AuthResponse> {
    const data = await apiRequest<AuthResponse>('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify({ name, email, password }),
    });
    setStoredToken(data.token);
    return data;
  },

  logout(): void {
    removeStoredToken();
  },
};
