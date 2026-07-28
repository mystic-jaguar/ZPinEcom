import crypto from 'crypto';
import { Response, Router } from 'express';
import Razorpay from 'razorpay';
import { pool } from '../db';
import { authenticate, AuthRequest } from '../middleware/auth';
import { generateId } from '../utils/id';
import { recordOrderStatus } from '../utils/orderHistory';
import { safeIdentifier } from '../utils/sql';

const router = Router();
const ORDERS = safeIdentifier('orders');

function getRazorpay() {
  if (!process.env.RAZORPAY_KEY_ID || !process.env.RAZORPAY_KEY_SECRET) {
    throw new Error('Razorpay credentials not configured');
  }
  return new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID,
    key_secret: process.env.RAZORPAY_KEY_SECRET,
  });
}

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
      `SELECT id, group_id, final_amount, payment_status FROM ${ORDERS} WHERE id = $1 AND user_id = $2`,
      [orderId, req.userId]
    );

    if (result.rows.length === 0) {
      res.status(404).json({ success: false, message: 'Order not found' });
      return;
    }

    const order = result.rows[0];

    // Multi-seller: a checkout is split into one order row per seller sharing a
    // group_id. Charge the whole group once (sum of the sub-order finals). Legacy
    // orders have a NULL group_id → group of one (just this row).
    let chargeAmount = Number(order.final_amount);
    let anyPaid = order.payment_status === 'paid';
    if (order.group_id) {
      const group = await pool.query(
        `SELECT COALESCE(SUM(final_amount), 0) AS total,
                BOOL_OR(payment_status = 'paid') AS any_paid
         FROM ${ORDERS} WHERE group_id = $1 AND user_id = $2`,
        [order.group_id, req.userId]
      );
      chargeAmount = Number(group.rows[0].total);
      anyPaid = group.rows[0].any_paid === true;
    }

    if (anyPaid) {
      res.status(400).json({ success: false, message: 'Order is already paid' });
      return;
    }

    // Razorpay amount is in paise (1 INR = 100 paise)
    const amountInPaise = Math.round(chargeAmount * 100);

    const rzpOrder = await getRazorpay().orders.create({
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
      `SELECT id, group_id, final_amount, payment_status, order_number FROM ${ORDERS} WHERE id = $1 AND user_id = $2`,
      [appOrderId, req.userId]
    );

    if (orderResult.rows.length === 0) {
      await client.query('ROLLBACK');
      res.status(404).json({ success: false, message: 'Order not found' });
      return;
    }

    const order = orderResult.rows[0];

    // Multi-seller: resolve every sub-order of the checkout (group of one for
    // legacy NULL-group orders) so a single payment confirms the whole group.
    const groupRows = order.group_id
      ? (await client.query(
          `SELECT id, final_amount, payment_status FROM ${ORDERS} WHERE group_id = $1 AND user_id = $2`,
          [order.group_id, req.userId]
        )).rows
      : [order];

    if (groupRows.every((r: any) => r.payment_status === 'paid')) {
      await client.query('ROLLBACK');
      res.json({ success: true, message: 'Payment already recorded', data: { orderId: appOrderId } });
      return;
    }

    // Replay attack prevention — ensure this razorpayPaymentId hasn't been used before
    const replayCheck = await client.query(
      `SELECT id FROM ${ORDERS} WHERE payment_id = $1`,
      [razorpayPaymentId]
    );
    if (replayCheck.rows.length > 0) {
      await client.query('ROLLBACK');
      res.status(400).json({ success: false, message: 'Payment already used' });
      return;
    }

    // Mark every sub-order in the group paid + confirmed, store the payment id on
    // each. group_id IS NOT DISTINCT FROM handles the legacy NULL-group single row.
    await client.query(
      `UPDATE ${ORDERS}
       SET payment_status = 'paid', status = 'confirmed', payment_id = $1, payment_method = 'razorpay', updated_at = NOW()
       WHERE user_id = $2 AND (group_id IS NOT DISTINCT FROM $3 AND ($3 IS NOT NULL OR id = $4))`,
      [razorpayPaymentId, req.userId, order.group_id, appOrderId]
    );

    const groupTotal = groupRows.reduce((s: number, r: any) => s + Number(r.final_amount), 0);

    // Shared timeline: every sub-order of the group was just confirmed.
    for (const row of groupRows) {
      await recordOrderStatus(client, row.id, 'confirmed', `Payment verified (${razorpayPaymentId})`);
    }

    // Notify the customer that payment succeeded (audit trail via notifications).
    const txnId = generateId();
    await client.query(
      `INSERT INTO notifications (id, user_id, title, message, type, data, is_read, created_at)
       VALUES ($1, $2, $3, $4, 'payment_success', $5, false, NOW())`,
      [
        txnId,
        req.userId,
        `Payment Successful: ${order.order_number}`,
        `Your payment of ₹${groupTotal.toFixed(2)} for order ${order.order_number} was successful.`,
        JSON.stringify({ orderId: appOrderId, groupId: order.group_id ?? null, paymentId: razorpayPaymentId, amount: groupTotal }),
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
