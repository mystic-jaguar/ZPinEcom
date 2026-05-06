import crypto from 'crypto';
import { Response, Router } from 'express';
import Razorpay from 'razorpay';
import { pool } from '../db';
import { authenticate, AuthRequest } from '../middleware/auth';
import { generateId } from '../utils/id';
import { safeIdentifier } from '../utils/sql';

const router = Router();
const ORDERS = safeIdentifier('orders');

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID!,
  key_secret: process.env.RAZORPAY_KEY_SECRET!,
});

// POST /api/v1/razorpay/create-order
// Creates a Razorpay order for the given app order ID
router.post('/create-order', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  const { orderId } = req.body;

  if (!orderId) {
    res.status(400).json({ success: false, message: 'orderId is required' });
    return;
  }

  try {
    // Fetch the order and verify ownership
    const result = await pool.query(
      `SELECT id, final_amount, payment_status FROM ${ORDERS} WHERE id = $1 AND user_id = $2`,
      [orderId, req.userId]
    );

    if (result.rows.length === 0) {
      res.status(404).json({ success: false, message: 'Order not found' });
      return;
    }

    const order = result.rows[0];

    if (order.payment_status === 'paid') {
      res.status(400).json({ success: false, message: 'Order is already paid' });
      return;
    }

    // Razorpay amount is in paise (1 INR = 100 paise)
    const amountInPaise = Math.round(Number(order.final_amount) * 100);

    const rzpOrder = await razorpay.orders.create({
      amount: amountInPaise,
      currency: 'INR',
      receipt: orderId,
      notes: {
        app_order_id: orderId,
        user_id: req.userId!,
      },
    });

    res.json({
      success: true,
      data: {
        razorpayOrderId: rzpOrder.id,
        amount: amountInPaise,
        currency: 'INR',
        keyId: process.env.RAZORPAY_KEY_ID,
        appOrderId: orderId,
      },
    });
  } catch (err: any) {
    console.error('razorpay.create-order error:', err);
    res.status(500).json({ success: false, message: 'Failed to create Razorpay order' });
  }
});

// POST /api/v1/razorpay/verify
// Verifies Razorpay payment signature and marks order as paid
router.post('/verify', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  const { razorpayOrderId, razorpayPaymentId, razorpaySignature, appOrderId } = req.body;

  if (!razorpayOrderId || !razorpayPaymentId || !razorpaySignature || !appOrderId) {
    res.status(400).json({ success: false, message: 'razorpayOrderId, razorpayPaymentId, razorpaySignature, and appOrderId are required' });
    return;
  }

  // Verify HMAC signature
  const expectedSignature = crypto
    .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET!)
    .update(`${razorpayOrderId}|${razorpayPaymentId}`)
    .digest('hex');

  if (expectedSignature !== razorpaySignature) {
    res.status(400).json({ success: false, message: 'Invalid payment signature' });
    return;
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Verify order ownership and current status
    const orderResult = await client.query(
      `SELECT id, final_amount, payment_status, order_number FROM ${ORDERS} WHERE id = $1 AND user_id = $2`,
      [appOrderId, req.userId]
    );

    if (orderResult.rows.length === 0) {
      await client.query('ROLLBACK');
      res.status(404).json({ success: false, message: 'Order not found' });
      return;
    }

    const order = orderResult.rows[0];

    if (order.payment_status === 'paid') {
      await client.query('ROLLBACK');
      res.json({ success: true, message: 'Payment already recorded', data: { orderId: appOrderId } });
      return;
    }

    // Mark order as paid and store Razorpay payment ID
    await client.query(
      `UPDATE ${ORDERS}
       SET payment_status = 'paid', payment_id = $1, payment_method = 'razorpay', updated_at = NOW()
       WHERE id = $2`,
      [razorpayPaymentId, appOrderId]
    );

    // Record wallet transaction if needed (not applicable for razorpay, but log for audit)
    const txnId = generateId();
    await client.query(
      `INSERT INTO notifications (id, user_id, title, message, type, data, is_read, created_at)
       VALUES ($1, $2, $3, $4, 'payment_success', $5, false, NOW())`,
      [
        txnId,
        req.userId,
        `Payment Successful: ${order.order_number}`,
        `Your payment of ₹${Number(order.final_amount).toFixed(2)} for order ${order.order_number} was successful.`,
        JSON.stringify({ orderId: appOrderId, paymentId: razorpayPaymentId, amount: Number(order.final_amount) }),
      ]
    );

    await client.query('COMMIT');

    res.json({
      success: true,
      message: 'Payment verified successfully',
      data: { orderId: appOrderId, paymentId: razorpayPaymentId },
    });
  } catch (err: any) {
    await client.query('ROLLBACK');
    console.error('razorpay.verify error:', err);
    res.status(500).json({ success: false, message: 'Failed to verify payment' });
  } finally {
    client.release();
  }
});

export default router;
