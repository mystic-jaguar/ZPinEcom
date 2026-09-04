import crypto from 'crypto';
import { Response, Router } from 'express';
import { pool } from '../db';
import { authenticate, AuthRequest } from '../middleware/auth';
import { amountToCharge } from '../utils/collect';
import { afterSettle, getRazorpay, settleGroupPayment } from '../utils/settlePayment';
import { safeIdentifier } from '../utils/sql';
import { logger } from '../utils/logger';

const router = Router();
const ORDERS = safeIdentifier('orders');


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
      `SELECT id, group_id, final_amount, payment_status, payment_method, delivery_type, delivery_fee, is_trial
         FROM ${ORDERS} WHERE id = $1 AND user_id = $2`,
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
    // An instant+COD order only prepays its delivery fee, so the group charge is
    // summed per row through amountToCharge rather than straight from final_amount.
    let groupRows: any[] = [order];
    if (order.group_id) {
      groupRows = (await pool.query(
        `SELECT id, final_amount, payment_status, payment_method, delivery_type, delivery_fee, is_trial
           FROM ${ORDERS} WHERE group_id = $1 AND user_id = $2`,
        [order.group_id, req.userId]
      )).rows;
    }
    const chargeAmount = groupRows.reduce((s, r) => s + amountToCharge(r), 0);
    const anyPaid = groupRows.some((r) => r.payment_status === 'paid' || r.payment_status === 'partial');

    if (anyPaid) {
      res.status(400).json({ success: false, message: 'Order is already paid' });
      return;
    }
    if (chargeAmount <= 0) {
      res.status(400).json({ success: false, message: 'Nothing to pay for this order' });
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
    logger.error('razorpay.createorder_error', { error: (err as any)?.message ?? String(err) });
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

    // Verify order ownership and current status. FOR UPDATE: a concurrent cancel
    // (or a second verify) must queue behind this transaction and then see the
    // row this one wrote, not race it.
    const orderResult = await client.query(
      `SELECT id, group_id, final_amount, payment_status, status, order_number, payment_method, delivery_type, delivery_fee, is_trial
         FROM ${ORDERS} WHERE id = $1 AND user_id = $2 FOR UPDATE`,
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
          `SELECT id, final_amount, payment_status, status, payment_method, delivery_type, delivery_fee, is_trial
             FROM ${ORDERS} WHERE group_id = $1 AND user_id = $2 ORDER BY id FOR UPDATE`,
          [order.group_id, req.userId]
        )).rows
      : [order];

    if (groupRows.every((r: any) => r.payment_status === 'paid' || r.payment_status === 'partial')) {
      await client.query('ROLLBACK');
      res.json({ success: true, message: 'Payment already recorded', data: { orderId: appOrderId } });
      return;
    }

    // Only a still-pending checkout can be paid into 'confirmed'. A cancelled
    // (or otherwise advanced) order must never be resurrected by a late verify —
    // the money is real, so log it loudly for a manual refund.
    const notPayable = groupRows.filter((r: any) => r.status !== 'pending');
    if (notPayable.length > 0) {
      await client.query('ROLLBACK');
      logger.warn('razorpay.verify_order_not_pending', {
        appOrderId, razorpayPaymentId, statuses: notPayable.map((r: any) => `${r.id}:${r.status}`),
      });
      res.status(409).json({ success: false, message: 'This order can no longer be paid. If you were charged, the amount will be refunded.' });
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

    // Bind the Razorpay order to THIS app order. The signature only proves the
    // Razorpay order/payment pair is genuine — not that it was minted for this
    // checkout. Without this, a paid ₹1 order's ids verify any unpaid order.
    const expectedPaise = Math.round(groupRows.reduce((s: number, r: any) => s + amountToCharge(r), 0) * 100);
    const rzpOrder: any = await getRazorpay().orders.fetch(razorpayOrderId);
    const rzpReceipt = String(rzpOrder?.receipt ?? rzpOrder?.notes?.app_order_id ?? '');
    const boundToGroup = rzpReceipt === String(appOrderId) || groupRows.some((r: any) => String(r.id) === rzpReceipt);
    if (!boundToGroup || Number(rzpOrder?.amount) !== expectedPaise || rzpOrder?.status !== 'paid') {
      await client.query('ROLLBACK');
      logger.warn('razorpay.verify_mismatch', { appOrderId, razorpayOrderId, rzpReceipt, rzpAmount: rzpOrder?.amount, expectedPaise, rzpStatus: rzpOrder?.status });
      res.status(400).json({ success: false, message: 'Payment does not match this order' });
      return;
    }

    const { groupTotal, paidOrderIds } = await settleGroupPayment(
      client, req.userId!, order, groupRows, razorpayPaymentId
    );

    await client.query('COMMIT');

    await afterSettle(client, req.userId!, order, paidOrderIds, groupTotal, razorpayPaymentId);

    res.json({
      success: true,
      message: 'Payment verified successfully',
      data: { orderId: appOrderId, paymentId: razorpayPaymentId },
    });
  } catch (err: any) {
    await client.query('ROLLBACK');
    logger.error('razorpay.verify_error', { error: (err as any)?.message ?? String(err) });
    res.status(500).json({ success: false, message: 'Failed to verify payment' });
  } finally {
    client.release();
  }
});

export default router;
