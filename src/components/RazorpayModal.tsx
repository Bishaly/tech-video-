import React, { useState } from 'react';
import { ShieldCheck, Lock, CreditCard, Sparkles, AlertCircle, CheckCircle2, Loader2, X } from 'lucide-react';
import { Course } from '../types/index.ts';
import { apiRequest } from '../lib/api.ts';
import { useAuth } from '../context/AuthContext.tsx';
import { useToast } from '../context/ToastContext.tsx';

declare global {
  interface Window {
    Razorpay: any;
  }
}

interface RazorpayModalProps {
  course: Course;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (courseId: string, slug?: string) => void;
}

export const RazorpayModal: React.FC<RazorpayModalProps> = ({
  course,
  isOpen,
  onClose,
  onSuccess,
}) => {
  const { user, isAuthenticated, markCoursePurchased } = useAuth();
  const { success, error } = useToast();
  const [loading, setLoading] = useState(false);
  const [testModeModal, setTestModeModal] = useState<{
    orderId: string;
    amount: number;
    currency: string;
  } | null>(null);

  if (!isOpen) return null;

  const handleStartPayment = async () => {
    if (!isAuthenticated) {
      error('Please sign in or create an account to purchase this course.');
      return;
    }

    setLoading(true);

    try {
      // Step 1: Create Razorpay Order on Backend
      const order = await apiRequest<{
        orderId: string;
        amount: number;
        currency: string;
        keyId: string;
        isTestMode: boolean;
      }>('/api/payments/create-order', {
        method: 'POST',
        body: JSON.stringify({ courseId: course.id }),
      });

      // Step 2: If real Razorpay script is loaded and not sandbox-forced
      if (typeof window !== 'undefined' && window.Razorpay && !order.isTestMode) {
        const options = {
          key: order.keyId,
          amount: order.amount,
          currency: order.currency,
          name: 'NextGen Learn',
          description: course.title,
          order_id: order.orderId,
          prefill: {
            name: user?.name,
            email: user?.email,
          },
          theme: {
            color: '#4f46e5',
          },
          handler: async (response: {
            razorpay_payment_id: string;
            razorpay_order_id: string;
            razorpay_signature: string;
          }) => {
            await verifyPayment({
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature,
            });
          },
          modal: {
            ondismiss: () => {
              setLoading(false);
            },
          },
        };

        const rzp = new window.Razorpay(options);
        rzp.on('payment.failed', (resp: any) => {
          error(resp.error?.description || 'Payment was cancelled or declined.');
          setLoading(false);
        });
        rzp.open();
        return;
      }

      // Step 3: Interactive Sandbox Checkout Interface (for development & AI Studio preview)
      setTestModeModal({
        orderId: order.orderId,
        amount: order.amount,
        currency: order.currency,
      });
    } catch (err: any) {
      error(err.message || 'Failed to initialize Razorpay checkout.');
      setLoading(false);
    }
  };

  const handleConfirmTestPayment = async (status: 'success' | 'failure') => {
    if (!testModeModal) return;

    if (status === 'failure') {
      error('Payment simulation declined.');
      setTestModeModal(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    const mockPaymentId = `pay_rzp_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const mockSignature = `sig_test_${mockPaymentId}`;

    await verifyPayment({
      razorpay_order_id: testModeModal.orderId,
      razorpay_payment_id: mockPaymentId,
      razorpay_signature: mockSignature,
    });
  };

  const verifyPayment = async (payload: {
    razorpay_order_id: string;
    razorpay_payment_id: string;
    razorpay_signature: string;
  }) => {
    try {
      const res = await apiRequest<{
        success: boolean;
        courseId: string;
        courseSlug?: string;
        purchaseId?: string;
      }>('/api/payments/verify', {
        method: 'POST',
        body: JSON.stringify(payload),
      });

      if (res.success) {
        markCoursePurchased(res.courseId);
        success('Payment verified! You now have permanent access to this course.');
        setTestModeModal(null);
        onClose();
        onSuccess(res.courseId, res.courseSlug || course.slug);
      } else {
        error('Server could not verify payment signature.');
      }
    } catch (err: any) {
      error(err.message || 'Verification failed on server.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in">
      <div className="relative w-full max-w-lg bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden text-slate-100">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-950/60">
          <div className="flex items-center gap-2 text-indigo-400 font-semibold text-sm">
            <ShieldCheck className="w-5 h-5 text-emerald-400" />
            <span>Secure 256-Bit Razorpay Checkout</span>
          </div>
          <button
            onClick={onClose}
            disabled={loading}
            className="text-slate-400 hover:text-slate-200 transition-colors p-1 rounded-lg hover:bg-slate-800"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {!testModeModal ? (
            <>
              <div className="flex gap-4 items-center">
                <img
                  src={course.thumbnail_url}
                  alt={course.title}
                  className="w-24 h-24 rounded-xl object-cover border border-slate-700/60 shrink-0"
                />
                <div>
                  <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                    Lifetime Course Access
                  </span>
                  <h3 className="font-bold text-lg text-white mt-1 line-clamp-2 leading-tight">
                    {course.title}
                  </h3>
                  <p className="text-xs text-slate-400 mt-1">Instructor: {course.instructor_name}</p>
                </div>
              </div>

              {/* Price Breakdown */}
              <div className="bg-slate-950/60 rounded-xl p-4 border border-slate-800/80 space-y-2 text-sm">
                <div className="flex justify-between text-slate-300">
                  <span>Course Price</span>
                  <span className="font-mono">₹{course.price_inr.toLocaleString('en-IN')}</span>
                </div>
                {course.original_price_inr && course.original_price_inr > course.price_inr && (
                  <div className="flex justify-between text-xs text-emerald-400">
                    <span>Special Launch Discount</span>
                    <span className="font-mono">
                      -₹{(course.original_price_inr - course.price_inr).toLocaleString('en-IN')}
                    </span>
                  </div>
                )}
                <div className="flex justify-between text-slate-400 text-xs">
                  <span>Taxes (GST Included)</span>
                  <span className="font-mono">₹0</span>
                </div>
                <div className="pt-2 border-t border-slate-800 flex justify-between font-bold text-base text-white">
                  <span>Total Amount</span>
                  <span className="text-indigo-400 font-mono">
                    ₹{course.price_inr.toLocaleString('en-IN')}
                  </span>
                </div>
              </div>

              {/* Security features */}
              <div className="grid grid-cols-2 gap-3 text-xs text-slate-400">
                <div className="flex items-center gap-2 bg-slate-800/40 p-2.5 rounded-lg border border-slate-800">
                  <Lock className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>Verified HMAC Server Cryptography</span>
                </div>
                <div className="flex items-center gap-2 bg-slate-800/40 p-2.5 rounded-lg border border-slate-800">
                  <CreditCard className="w-4 h-4 text-indigo-400 shrink-0" />
                  <span>UPI, Cards, NetBanking, EMI</span>
                </div>
              </div>

              {/* Action Button */}
              <button
                id="btn-confirm-purchase"
                onClick={handleStartPayment}
                disabled={loading}
                className="w-full flex items-center justify-center gap-2 py-3.5 px-6 rounded-xl font-semibold text-white bg-indigo-600 hover:bg-indigo-500 active:scale-[0.99] transition-all shadow-lg shadow-indigo-600/25 disabled:opacity-50"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    <span>Contacting Razorpay Gateway...</span>
                  </>
                ) : (
                  <>
                    <span>Proceed to Pay ₹{course.price_inr.toLocaleString('en-IN')}</span>
                    <Sparkles className="w-4 h-4" />
                  </>
                )}
              </button>
            </>
          ) : (
            // Sandbox Test Confirmation Dialog (Enforces Real Server Signature Check)
            <div className="space-y-4 text-center">
              <div className="w-12 h-12 rounded-full bg-indigo-500/10 border border-indigo-500/30 text-indigo-400 flex items-center justify-center mx-auto">
                <CreditCard className="w-6 h-6" />
              </div>
              <h4 className="text-lg font-bold text-white">Razorpay Sandbox Simulator</h4>
              <p className="text-xs text-slate-300">
                Order <span className="font-mono text-indigo-400">{testModeModal.orderId}</span> generated
                for <span className="font-bold">₹{(testModeModal.amount / 100).toLocaleString('en-IN')}</span>.
                The backend will verify the payment signature and unlock the course.
              </p>

              <div className="bg-amber-950/30 border border-amber-800/60 rounded-xl p-3 text-xs text-amber-200/90 text-left space-y-1">
                <div className="flex items-center gap-1.5 font-semibold text-amber-300">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>Development Verification Mode</span>
                </div>
                <p>
                  To use live production Razorpay credentials, configure <code className="text-amber-200">RAZORPAY_KEY_ID</code> and <code className="text-amber-200">RAZORPAY_KEY_SECRET</code> in your environment settings.
                </p>
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  onClick={() => handleConfirmTestPayment('failure')}
                  disabled={loading}
                  className="flex-1 py-2.5 px-4 rounded-xl border border-slate-700 hover:bg-slate-800 text-slate-300 text-sm font-medium transition-colors"
                >
                  Simulate Decline
                </button>
                <button
                  id="btn-simulate-success"
                  onClick={() => handleConfirmTestPayment('success')}
                  disabled={loading}
                  className="flex-1 py-2.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-semibold transition-colors flex items-center justify-center gap-1.5 shadow-lg shadow-emerald-600/25"
                >
                  {loading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <>
                      <CheckCircle2 className="w-4 h-4" />
                      <span>Complete & Verify</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
