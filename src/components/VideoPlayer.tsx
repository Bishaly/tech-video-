import React, { useState, useEffect } from 'react';
import {
  Lock,
  Sparkles,
  ShieldCheck,
  CheckCircle,
  RefreshCw,
  Clock,
  ExternalLink,
  ChevronRight,
} from 'lucide-react';
import { PlaybackData } from '../types/index.ts';
import { apiRequest } from '../lib/api.ts';
import { useAuth } from '../context/AuthContext.tsx';

interface VideoPlayerProps {
  courseId: string;
  lessonId: string;
  playbackData: PlaybackData;
  onLessonCompleted?: (lessonId: string) => void;
  onNextLesson?: () => void;
  onOpenPurchaseModal?: () => void;
}

export const VideoPlayer: React.FC<VideoPlayerProps> = ({
  courseId,
  lessonId,
  playbackData,
  onLessonCompleted,
  onNextLesson,
  onOpenPurchaseModal,
}) => {
  const { isAdmin } = useAuth();
  const [isCompleted, setIsCompleted] = useState(playbackData.progress?.is_completed || false);
  const [isSavingProgress, setIsSavingProgress] = useState(false);

  // Sync initial completion state when lesson changes
  useEffect(() => {
    setIsCompleted(playbackData.progress?.is_completed || false);
  }, [lessonId, playbackData.progress?.is_completed]);

  const handleMarkCompleted = async () => {
    try {
      setIsSavingProgress(true);
      const duration = playbackData.lesson.duration_seconds || 600;
      await apiRequest('/api/watch/progress', {
        method: 'POST',
        body: JSON.stringify({
          courseId,
          lessonId,
          position: duration,
          duration,
          isCompleted: true,
        }),
      });
      setIsCompleted(true);
      if (onLessonCompleted) {
        onLessonCompleted(lessonId);
      }
    } catch (err) {
      console.error('Failed to mark lesson complete:', err);
    } finally {
      setIsSavingProgress(false);
    }
  };

  // 1. LOCKED / UNPURCHASED GATE
  if (playbackData.isLocked) {
    return (
      <div className="relative w-full aspect-video bg-slate-950 rounded-2xl border border-slate-800 flex flex-col items-center justify-center p-8 text-center overflow-hidden shadow-2xl">
        <div className="absolute inset-0 bg-radial-gradient from-indigo-950/30 via-slate-950/80 to-slate-950 pointer-events-none" />
        <div className="relative z-10 max-w-md space-y-4">
          <div className="w-16 h-16 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-400 flex items-center justify-center mx-auto shadow-inner">
            <Lock className="w-8 h-8" />
          </div>
          <div>
            <h3 className="text-xl font-bold text-white tracking-tight">
              Purchase this course to start watching.
            </h3>
            <p className="text-sm text-slate-400 mt-2 leading-relaxed">
              This premium lesson is part of our verified curriculum. To unlock protected high-definition streaming and materials, please complete purchase via Razorpay.
            </p>
          </div>

          <div className="pt-2 flex flex-col sm:flex-row gap-3 justify-center">
            {onOpenPurchaseModal && (
              <button
                id="btn-unlock-course-gate"
                onClick={onOpenPurchaseModal}
                className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold shadow-lg shadow-indigo-600/30 transition-all active:scale-95 cursor-pointer"
              >
                <span>Unlock Course Now</span>
                <Sparkles className="w-4 h-4" />
              </button>
            )}
          </div>

          <div className="flex items-center justify-center gap-2 text-xs text-slate-400 pt-2">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <span>Encrypted Token Verification & Instant Access</span>
          </div>
        </div>
      </div>
    );
  }

  // 2. LESSON HAS NO VIDEO ID CONFIGURED (Video Being Prepared)
  if (playbackData.isConfigured === false || !playbackData.playback?.embedUrl) {
    return (
      <div className="relative w-full aspect-video bg-slate-950 rounded-2xl border border-slate-800/80 flex flex-col items-center justify-center p-8 text-center overflow-hidden shadow-2xl">
        <div className="absolute inset-0 bg-radial-gradient from-slate-900/40 via-slate-950/90 to-slate-950 pointer-events-none" />
        <div className="relative z-10 max-w-lg space-y-4">
          <div className="w-16 h-16 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 flex items-center justify-center mx-auto shadow-inner">
            <Clock className="w-8 h-8" />
          </div>

          <div className="space-y-2">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-900 border border-slate-800 text-xs font-semibold text-slate-300">
              <span>{playbackData.lesson.title}</span>
            </div>
            <h3 className="text-xl font-bold text-white tracking-tight">
              Video is being prepared. Please check back later.
            </h3>
            <p className="text-sm text-slate-400 leading-relaxed max-w-md mx-auto">
              The video content for this lesson is currently being finalized. Once uploaded to Cloudflare Stream by the instructor, it will automatically appear here.
            </p>
          </div>

          {isAdmin && (
            <div className="p-3.5 bg-amber-500/10 border border-amber-500/30 rounded-xl text-left space-y-1 mt-4">
              <div className="flex items-center gap-2 text-xs font-bold text-amber-300">
                <ShieldCheck className="w-4 h-4" />
                <span>Admin Notice</span>
              </div>
              <p className="text-xs text-amber-200/80">
                No Cloudflare Stream Video ID has been entered for this lesson yet. Visit the Admin Panel, select this course curriculum, and paste the Stream Video UID.
              </p>
            </div>
          )}

          <div className="flex items-center justify-center gap-3 pt-2">
            <button
              onClick={handleMarkCompleted}
              disabled={isCompleted}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold transition-all ${
                isCompleted
                  ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                  : 'bg-slate-800 hover:bg-slate-700 text-slate-200'
              }`}
            >
              <CheckCircle className="w-4 h-4" />
              <span>{isCompleted ? 'Lesson Marked Completed' : 'Mark Lesson Read/Complete'}</span>
            </button>

            {onNextLesson && (
              <button
                onClick={onNextLesson}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white transition-all shadow-md shadow-indigo-600/20"
              >
                <span>Next Lesson</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  // 3. AUTHORIZED CLOUDFLARE STREAM PLAYER VIEW
  // Renders Cloudflare Stream player iframe with full native player controls, scrubbing, volume, quality selector, and fullscreen
  const streamEmbedUrl = `${playbackData.playback.embedUrl}?autoplay=false&controls=true&preload=metadata`;

  return (
    <div className="relative w-full rounded-2xl border border-slate-800 bg-slate-950 overflow-hidden shadow-2xl flex flex-col group">
      {/* Top Status Banner */}
      <div className="px-4 py-2.5 bg-slate-900/90 border-b border-slate-800 flex items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-2 overflow-hidden">
          {playbackData.lesson.is_free_preview ? (
            <span className="px-2 py-0.5 rounded-md text-[11px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 shrink-0">
              Free Preview
            </span>
          ) : (
            <span className="px-2 py-0.5 rounded-md text-[11px] font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 shrink-0 flex items-center gap-1">
              <ShieldCheck className="w-3 h-3 text-indigo-400" />
              Verified Access
            </span>
          )}
          <span className="font-semibold text-white truncate">
            {playbackData.lesson.title}
          </span>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {isSavingProgress && (
            <div className="flex items-center gap-1 text-slate-400 text-[11px]">
              <RefreshCw className="w-3 h-3 animate-spin text-indigo-400" />
              <span className="hidden sm:inline">Saving...</span>
            </div>
          )}

          <button
            id="btn-mark-lesson-complete"
            onClick={handleMarkCompleted}
            disabled={isCompleted}
            className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-semibold transition-all ${
              isCompleted
                ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30'
                : 'bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 cursor-pointer'
            }`}
          >
            <CheckCircle className="w-3.5 h-3.5 text-emerald-400" />
            <span>{isCompleted ? 'Completed' : 'Mark Complete'}</span>
          </button>

          {onNextLesson && (
            <button
              onClick={onNextLesson}
              className="flex items-center gap-1 px-3 py-1 rounded-lg text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white transition-colors cursor-pointer"
            >
              <span>Next</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Cloudflare Stream Video Player Iframe */}
      {/* Full interactive controls enabled with pointer-events-auto */}
      <div className="relative w-full aspect-video bg-black flex items-center justify-center">
        <iframe
          src={streamEmbedUrl}
          className="w-full h-full border-0 pointer-events-auto"
          allow="accelerometer; gyroscope; autoplay; encrypted-media; picture-in-picture; fullscreen"
          allowFullScreen
          title={playbackData.lesson.title}
        />
      </div>

      {/* Bottom info footer */}
      <div className="px-4 py-2 bg-slate-950 text-[11px] text-slate-400 border-t border-slate-900 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-400" />
          <span>Cloudflare Stream High-Definition Playback</span>
        </div>
        <span className="font-mono text-slate-500">
          Token valid until {new Date(playbackData.playback.expiresAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </span>
      </div>
    </div>
  );
};
