import { apiRequest } from '../lib/api.ts';

export interface CreateOrderResponse {
  orderId: string;
  amount: number;
  currency: string;
  keyId: string;
  isTestMode: boolean;
  notes?: Record<string, string>;
}

export interface VerifyPaymentPayload {
  razorpay_order_id: string;
  razorpay_payment_id: string;
  razorpay_signature: string;
}

export interface VerifyPaymentResponse {
  success: boolean;
  courseId: string;
  courseSlug?: string;
  purchaseId?: string;
}

export const paymentService = {
  async createRazorpayOrder(courseId: string): Promise<CreateOrderResponse> {
    return apiRequest<CreateOrderResponse>('/api/payments/create-order', {
      method: 'POST',
      body: JSON.stringify({ courseId }),
    });
  },

  async verifyPayment(payload: VerifyPaymentPayload): Promise<VerifyPaymentResponse> {
    return apiRequest<VerifyPaymentResponse>('/api/payments/verify', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },
};
