import React, { useState } from 'react';
import { Sparkles, Lock, Mail, User as UserIcon, ArrowRight, Shield, CheckCircle2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext.tsx';
import { useToast } from '../context/ToastContext.tsx';
import { apiRequest } from '../lib/api.ts';

interface AuthPageProps {
  mode: 'login' | 'register';
  onSuccess: () => void;
  onSwitchMode: (mode: 'login' | 'register') => void;
}

export const AuthPage: React.FC<AuthPageProps> = ({ mode, onSuccess, onSwitchMode }) => {
  const { login, register } = useAuth();
  const { success, error, info } = useToast();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [forgotPasswordOpen, setForgotPasswordOpen] = useState(false);
  const [forgotEmail, setForgotEmail] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    if (mode === 'login') {
      const ok = await login(email, password);
      setLoading(false);
      if (ok) onSuccess();
    } else {
      if (password.length < 8) {
        error('Password must be at least 8 characters.');
        setLoading(false);
        return;
      }
      const ok = await register(name, email, password);
      setLoading(false);
      if (ok) onSuccess();
    }
  };

  const handleQuickLogin = async (demoEmail: string, demoPass: string) => {
    setEmail(demoEmail);
    setPassword(demoPass);
    setLoading(true);
    const ok = await login(demoEmail, demoPass);
    setLoading(false);
    if (ok) onSuccess();
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!forgotEmail) return;
    try {
      await apiRequest('/api/auth/forgot-password', {
        method: 'POST',
        body: JSON.stringify({ email: forgotEmail }),
      });
      success('Password reset email dispatched (or demo token created).');
      setForgotPasswordOpen(false);
    } catch (err: any) {
      error(err.message || 'Failed to dispatch reset request.');
    }
  };

  return (
    <div className="min-h-[calc(100vh-8rem)] flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md space-y-6">
        {/* Brand header */}
        <div className="text-center space-y-2">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-indigo-600/20 border border-indigo-500/30 text-indigo-400 mb-2">
            <Sparkles className="w-6 h-6" />
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
            {mode === 'login' ? 'Sign in to NextGen Learn' : 'Create your account'}
          </h1>
          <p className="text-xs sm:text-sm text-slate-400">
            {mode === 'login'
              ? 'Access your purchased video courses and track your progress.'
              : 'Join thousands of developers mastering high-demand engineering skills.'}
          </p>
        </div>

        {/* Card */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl backdrop-blur-xl space-y-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            {mode === 'register' && (
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Full Name
                </label>
                <div className="relative">
                  <UserIcon className="w-4 h-4 text-slate-500 absolute left-3.5 top-3 pointer-events-none" />
                  <input
                    id="input-name"
                    type="text"
                    required
                    placeholder="Alex Morgan"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Email Address
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-500 absolute left-3.5 top-3 pointer-events-none" />
                <input
                  id="input-email"
                  type="email"
                  required
                  placeholder="name@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-semibold text-slate-300">Password</label>
                {mode === 'login' && (
                  <button
                    type="button"
                    onClick={() => setForgotPasswordOpen(true)}
                    className="text-xs text-indigo-400 hover:text-indigo-300 transition-colors"
                  >
                    Forgot password?
                  </button>
                )}
              </div>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-500 absolute left-3.5 top-3 pointer-events-none" />
                <input
                  id="input-password"
                  type="password"
                  required
                  placeholder="At least 8 characters"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                />
              </div>
            </div>

            <button
              id="btn-auth-submit"
              type="submit"
              disabled={loading}
              className="w-full py-3 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-sm transition-all shadow-lg shadow-indigo-600/25 flex items-center justify-center gap-2 active:scale-98 disabled:opacity-50"
            >
              <span>{mode === 'login' ? 'Sign In' : 'Create Account'}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>

          {/* Quick Demo Access Bar */}
          <div className="pt-4 border-t border-slate-800/80 space-y-2.5">
            <p className="text-[11px] text-slate-400 font-semibold uppercase tracking-wider text-center">
              Quick Demo Accounts
            </p>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => handleQuickLogin('student@nextgen.com', 'student123')}
                disabled={loading}
                className="py-2 px-3 rounded-lg bg-slate-800/80 hover:bg-slate-800 border border-slate-700 text-xs text-slate-300 font-medium transition-colors text-center"
              >
                Demo Student
              </button>
              <button
                type="button"
                onClick={() => handleQuickLogin('admin@nextgen.com', 'admin123')}
                disabled={loading}
                className="py-2 px-3 rounded-lg bg-indigo-950/50 hover:bg-indigo-950 border border-indigo-700/50 text-xs text-indigo-300 font-semibold transition-colors flex items-center justify-center gap-1"
              >
                <Shield className="w-3.5 h-3.5" />
                <span>Demo Admin</span>
              </button>
            </div>
          </div>

          {/* Switch Mode */}
          <div className="text-center text-xs text-slate-400">
            {mode === 'login' ? (
              <p>
                Don't have an account?{' '}
                <button
                  type="button"
                  onClick={() => onSwitchMode('register')}
                  className="font-semibold text-indigo-400 hover:text-indigo-300 underline"
                >
                  Create one now
                </button>
              </p>
            ) : (
              <p>
                Already have an account?{' '}
                <button
                  type="button"
                  onClick={() => onSwitchMode('login')}
                  className="font-semibold text-indigo-400 hover:text-indigo-300 underline"
                >
                  Sign in
                </button>
              </p>
            )}
          </div>
        </div>

        {/* Forgot Password Modal */}
        {forgotPasswordOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
            <div className="w-full max-w-sm bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4">
              <h3 className="font-bold text-white text-base">Reset Password</h3>
              <p className="text-xs text-slate-400">
                Enter your email address and we will generate a password reset confirmation.
              </p>
              <form onSubmit={handleForgotPassword} className="space-y-3">
                <input
                  type="email"
                  required
                  placeholder="Enter your email..."
                  value={forgotEmail}
                  onChange={(e) => setForgotEmail(e.target.value)}
                  className="w-full px-3 py-2 text-sm bg-slate-950 border border-slate-800 rounded-xl text-white focus:outline-none focus:border-indigo-500"
                />
                <div className="flex gap-2 justify-end pt-2">
                  <button
                    type="button"
                    onClick={() => setForgotPasswordOpen(false)}
                    className="px-3 py-1.5 text-xs text-slate-400 hover:text-white"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-1.5 text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg"
                  >
                    Send Instructions
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
