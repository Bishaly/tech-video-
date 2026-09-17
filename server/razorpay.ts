import crypto from 'crypto';

interface CreateOrderParams {
  amountInInr: number;
  courseId: string;
  userId: string;
  receipt: string;
}

export interface RazorpayOrderResult {
  orderId: string;
  amount: number; // in paise
  currency: string;
  keyId: string;
  isTestMode: boolean;
}

export interface VerifyPaymentParams {
  razorpay_order_id: string;
  razorpay_payment_id: string;
  razorpay_signature: string;
}

const RAZORPAY_KEY_ID = process.env.RAZORPAY_KEY_ID || '';
const RAZORPAY_KEY_SECRET = process.env.RAZORPAY_KEY_SECRET || '';
const RAZORPAY_WEBHOOK_SECRET = process.env.RAZORPAY_WEBHOOK_SECRET || '';

const isProduction = process.env.NODE_ENV === 'production';
// In production, test payments are STRICTLY FORBIDDEN unless explicitly overridden with ALLOW_TEST_PAYMENTS=true AND keys are missing
const ALLOW_TEST_PAYMENTS = !isProduction && (process.env.ALLOW_TEST_PAYMENTS === 'true' || !RAZORPAY_KEY_SECRET);

export const razorpayService = {
  isConfigured(): boolean {
    return Boolean(RAZORPAY_KEY_ID && RAZORPAY_KEY_SECRET && !RAZORPAY_KEY_ID.includes('YourKeyId'));
  },

  getPublicKey(): string {
    if (this.isConfigured()) {
      return RAZORPAY_KEY_ID;
    }
    return 'rzp_test_nextgen_sandbox';
  },

  async createOrder({
    amountInInr,
    courseId,
    userId,
    receipt,
  }: CreateOrderParams): Promise<RazorpayOrderResult> {
    const amountInPaise = Math.round(amountInInr * 100);

    // If real credentials configured, call official Razorpay API
    if (this.isConfigured()) {
      try {
        const credentials = Buffer.from(`${RAZORPAY_KEY_ID}:${RAZORPAY_KEY_SECRET}`).toString('base64');
        const response = await fetch('https://api.razorpay.com/v1/orders', {
          method: 'POST',
          headers: {
            Authorization: `Basic ${credentials}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            amount: amountInPaise,
            currency: 'INR',
            receipt: receipt.slice(0, 40),
            notes: {
              courseId,
              userId,
            },
          }),
        });

        if (!response.ok) {
          const errData = await response.json();
          throw new Error(errData?.error?.description || 'Razorpay order creation failed');
        }

        const data = await response.json();
        return {
          orderId: data.id,
          amount: data.amount,
          currency: data.currency || 'INR',
          keyId: RAZORPAY_KEY_ID,
          isTestMode: false,
        };
      } catch (error: any) {
        console.error('Razorpay API error:', error);
        throw new Error(`Failed to create Razorpay order: ${error.message}`);
      }
    }

    // Sandbox / Test Mode for development and local previews
    if (!ALLOW_TEST_PAYMENTS) {
      throw new Error(
        'Razorpay keys are not configured and test payments are disabled in production.'
      );
    }

    const testOrderId = `order_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    return {
      orderId: testOrderId,
      amount: amountInPaise,
      currency: 'INR',
      keyId: 'rzp_test_nextgen_sandbox',
      isTestMode: true,
    };
  },

  verifySignature({
    razorpay_order_id,
    razorpay_payment_id,
    razorpay_signature,
  }: VerifyPaymentParams): { isValid: boolean; reason?: string } {
    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      return { isValid: false, reason: 'Missing required Razorpay parameters' };
    }

    const payload = `${razorpay_order_id}|${razorpay_payment_id}`;

    if (this.isConfigured()) {
      try {
        const expectedSignature = crypto
          .createHmac('sha256', RAZORPAY_KEY_SECRET)
          .update(payload)
          .digest('hex');

        // Constant-time comparison to prevent timing attacks
        const expectedBuf = Buffer.from(expectedSignature, 'utf-8');
        const actualBuf = Buffer.from(razorpay_signature, 'utf-8');

        if (expectedBuf.length !== actualBuf.length) {
          return { isValid: false, reason: 'Signature length mismatch' };
        }

        const isValid = crypto.timingSafeEqual(expectedBuf, actualBuf);
        return {
          isValid,
          reason: isValid ? undefined : 'Cryptographic signature mismatch',
        };
      } catch (err: any) {
        return { isValid: false, reason: err.message };
      }
    }

    // In Sandbox Test Mode: verify either test HMAC with dev secret or test signature token
    if (ALLOW_TEST_PAYMENTS) {
      const devSecret = 'sandbox_secret_2026';
      const expectedDevSig = crypto
        .createHmac('sha256', devSecret)
        .update(payload)
        .digest('hex');

      // Also allow test client signature format: 'test_sig_' + order_id
      const isDevSigMatch =
        razorpay_signature === expectedDevSig ||
        razorpay_signature === `test_sig_${razorpay_payment_id}` ||
        razorpay_signature.startsWith('sig_test_');

      if (isDevSigMatch) {
        return { isValid: true };
      }
      return { isValid: false, reason: 'Invalid test signature' };
    }

    return { isValid: false, reason: 'Payment gateway unconfigured' };
  },

  verifyWebhookSignature(rawBody: string, signature: string): boolean {
    if (!RAZORPAY_WEBHOOK_SECRET) return false;
    try {
      const expected = crypto
        .createHmac('sha256', RAZORPAY_WEBHOOK_SECRET)
        .update(rawBody)
        .digest('hex');
      const expBuf = Buffer.from(expected, 'utf-8');
      const actBuf = Buffer.from(signature, 'utf-8');
      if (expBuf.length !== actBuf.length) return false;
      return crypto.timingSafeEqual(expBuf, actBuf);
    } catch {
      return false;
    }
  },
};
