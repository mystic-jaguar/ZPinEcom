import crypto from 'crypto';
import { Response, Router } from 'express';
import Razorpay from 'razorpay';
import { pool } from '../db';
import { authenticate, AuthRequest } from '../middleware/auth';
import { amountToCharge } from '../utils/collect';
import { generateId } from '../utils/id';
import { recordOrderStatus } from '../utils/orderHistory';
import { sendPush } from '../utils/push';
import { notifySellersOfPaidOrders, pushSellersOfPaidOrders } from '../utils/sellerOrderNotify';
import { safeIdentifier } from '../utils/sql';
import { logger } from '../utils/logger';

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

    // Verify order ownership and current status
    const orderResult = await client.query(
      `SELECT id, group_id, final_amount, payment_status, order_number, payment_method, delivery_type, delivery_fee, is_trial
         FROM ${ORDERS} WHERE id = $1 AND user_id = $2`,
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
          `SELECT id, final_amount, payment_status, payment_method, delivery_type, delivery_fee, is_trial
             FROM ${ORDERS} WHERE group_id = $1 AND user_id = $2`,
          [order.group_id, req.userId]
        )).rows
      : [order];

    if (groupRows.every((r: any) => r.payment_status === 'paid' || r.payment_status === 'partial')) {
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

    // Mark every sub-order in the group settled, each judged on its own amount so
    // the rows stay individually honest. An instant+COD order only prepaid its
    // delivery fee, so it becomes 'partial' (not 'paid') and keeps its COD
    // payment_method — the delivery app must still collect the balance at the door.
    let groupTotal = 0;
    for (const row of groupRows) {
      const charged = amountToCharge(row);
      groupTotal += charged;
      const isFull = charged >= Number(row.final_amount);
      await client.query(
        `UPDATE ${ORDERS}
            SET payment_status = $1,
                status         = CASE WHEN $1 = 'paid' THEN 'confirmed' ELSE status END,
                payment_id     = $2,
                payment_method = CASE WHEN $1 = 'paid' THEN 'razorpay' ELSE payment_method END,
                prepaid_amount = $3,
                updated_at     = NOW()
          WHERE id = $4`,
        [isFull ? 'paid' : 'partial', razorpayPaymentId, charged, row.id]
      );
      await recordOrderStatus(
        client,
        row.id,
        isFull ? 'confirmed' : 'pending',
        `Payment of ₹${charged.toFixed(2)} verified (${razorpayPaymentId})`
      );
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

    // The sellers were deliberately NOT told at checkout — a prepaid order that
    // is never paid for gets deleted, and the seller must not have been buzzed
    // about it in the meantime. Now that the money is in, tell them.
    const paidOrderIds = groupRows.map((r: any) => r.id);
    await notifySellersOfPaidOrders(client, paidOrderIds);

    await client.query('COMMIT');

    await pushSellersOfPaidOrders(client, paidOrderIds);

    sendPush(req.userId, `Payment successful: ${order.order_number}`,
      `Your payment of ₹${groupTotal.toFixed(2)} for order ${order.order_number} was successful.`,
      { orderId: appOrderId, paymentId: razorpayPaymentId, type: 'payment_success' });

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
