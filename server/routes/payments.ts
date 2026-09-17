import { Router } from 'express';
import { db } from '../db.ts';
import { authenticateRequired, AuthenticatedRequest } from '../auth.ts';
import { razorpayService } from '../razorpay.ts';

const router = Router();

// POST /api/payments/create-order
// Initiates Razorpay payment order on the backend
router.post('/create-order', authenticateRequired, async (req: AuthenticatedRequest, res) => {
  try {
    const { courseId } = req.body;
    const user = req.fullUser!;

    if (!courseId) {
      return res.status(400).json({ error: 'courseId is required.' });
    }

    const course = await db.courses.findById(courseId, false);
    if (!course) {
      return res.status(404).json({ error: 'Course not found or inactive.' });
    }

    // Check if user already owns this course
    const existingPurchase = await db.purchases.findByUserAndCourse(user.id, course.id);
    if (existingPurchase) {
      return res.status(400).json({
        error: 'You have already purchased this course. Access is active.',
        isAlreadyPurchased: true,
      });
    }

    const receipt = `rcpt_${Date.now()}_${user.id.slice(-6)}`;
    const order = await razorpayService.createOrder({
      amountInInr: course.price_inr,
      courseId: course.id,
      userId: user.id,
      receipt,
    });

    // Record initial pending purchase entry
    await db.purchases.create({
      user_id: user.id,
      course_id: course.id,
      razorpay_order_id: order.orderId,
      amount_inr: course.price_inr,
      currency: 'INR',
      payment_status: 'pending',
      verification_status: 'unverified',
    });

    return res.json({
      orderId: order.orderId,
      amount: order.amount, // in paise
      currency: order.currency,
      keyId: order.keyId,
      course: {
        id: course.id,
        title: course.title,
        price_inr: course.price_inr,
        thumbnail_url: course.thumbnail_url,
      },
      user: {
        name: user.name,
        email: user.email,
      },
      isTestMode: order.isTestMode,
    });
  } catch (err: any) {
    console.error('Create order error:', err);
    return res.status(500).json({ error: err.message || 'Failed to initialize payment order.' });
  }
});

// POST /api/payments/verify
// Cryptographically verifies Razorpay payment signature on the backend
router.post('/verify', authenticateRequired, async (req: AuthenticatedRequest, res) => {
  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;
    const user = req.fullUser!;

    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      return res.status(400).json({
        error: 'Missing required Razorpay verification parameters.',
        verified: false,
      });
    }

    // Find existing pending purchase
    const purchase = await db.purchases.findByOrder(razorpay_order_id);
    if (!purchase) {
      return res.status(404).json({
        error: 'No order record found for this transaction ID.',
        verified: false,
      });
    }

    // Check if user owns this order
    if (purchase.user_id !== user.id && user.role !== 'admin') {
      return res.status(403).json({
        error: 'Unauthorized transaction match.',
        verified: false,
      });
    }

    // Check if already verified to prevent duplicate processing
    if (purchase.payment_status === 'success' && purchase.verification_status === 'verified') {
      return res.json({
        success: true,
        message: 'Payment was already verified and course access is active.',
        courseId: purchase.course_id,
        purchaseId: purchase.id,
      });
    }

    // Server-side cryptographic signature verification
    const verification = razorpayService.verifySignature({
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
    });

    if (!verification.isValid) {
      // Record failed payment attempt
      await db.purchases.updatePaymentStatus(purchase.id, 'failed', 'failed', razorpay_payment_id);
      await db.payments.create({
        purchase_id: purchase.id,
        user_id: user.id,
        course_id: purchase.course_id,
        razorpay_order_id,
        razorpay_payment_id,
        razorpay_signature,
        amount_inr: purchase.amount_inr,
        currency: purchase.currency,
        status: 'failed',
        error_description: verification.reason || 'Cryptographic signature mismatch',
      });

      return res.status(400).json({
        error: `Payment verification failed: ${verification.reason || 'Invalid signature'}. Access NOT granted.`,
        verified: false,
      });
    }

    // Signature verified! Grant course access now
    const updatedPurchase = await db.purchases.updatePaymentStatus(
      purchase.id,
      'success',
      'verified',
      razorpay_payment_id
    );

    // Record audit payment entry
    await db.payments.create({
      purchase_id: purchase.id,
      user_id: user.id,
      course_id: purchase.course_id,
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
      amount_inr: purchase.amount_inr,
      currency: purchase.currency,
      status: 'captured',
    });

    const course = await db.courses.findById(purchase.course_id, false);

    return res.json({
      success: true,
      message: 'Payment successfully verified! Course access granted.',
      courseId: purchase.course_id,
      courseSlug: course?.slug,
      purchaseId: updatedPurchase?.id,
    });
  } catch (err: any) {
    console.error('Payment verification error:', err);
    return res.status(500).json({
      error: 'Server error during payment verification. Please contact support.',
      verified: false,
    });
  }
});

// POST /api/payments/webhook
// Webhook listener for Razorpay asynchronous events
router.post('/webhook', async (req, res) => {
  try {
    const signature = req.headers['x-razorpay-signature'] as string;
    const rawBody = JSON.stringify(req.body);

    if (process.env.RAZORPAY_WEBHOOK_SECRET && signature) {
      const isValid = razorpayService.verifyWebhookSignature(rawBody, signature);
      if (!isValid) {
        return res.status(400).json({ error: 'Invalid webhook signature' });
      }
    }

    const event = req.body.event;
    const paymentEntity = req.body.payload?.payment?.entity;

    if (event === 'payment.captured' && paymentEntity) {
      const orderId = paymentEntity.order_id;
      const paymentId = paymentEntity.id;
      const purchase = await db.purchases.findByOrder(orderId);

      if (purchase && purchase.payment_status !== 'success') {
        await db.purchases.updatePaymentStatus(purchase.id, 'success', 'verified', paymentId);
      }
    } else if (event === 'payment.failed' && paymentEntity) {
      const orderId = paymentEntity.order_id;
      const purchase = await db.purchases.findByOrder(orderId);
      if (purchase && purchase.payment_status === 'pending') {
        await db.purchases.updatePaymentStatus(
          purchase.id,
          'failed',
          'failed',
          paymentEntity.id
        );
      }
    }

    return res.json({ status: 'ok' });
  } catch (err: any) {
    console.error('Webhook error:', err);
    return res.status(500).json({ error: 'Webhook processing failed' });
  }
});

export default router;
