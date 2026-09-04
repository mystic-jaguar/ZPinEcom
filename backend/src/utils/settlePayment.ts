import Razorpay from 'razorpay';
import { amountToCharge } from './collect';
import { generateId } from './id';
import { logger } from './logger';
import { sendOrderEmail } from './orderEmail';
import { recordOrderStatus } from './orderHistory';
import { sendPush } from './push';
import { notifySellersOfPaidOrders, pushSellersOfPaidOrders } from './sellerOrderNotify';
import { safeIdentifier } from './sql';

const ORDERS = safeIdentifier('orders');

export function getRazorpay(): Razorpay {
  if (!process.env.RAZORPAY_KEY_ID || !process.env.RAZORPAY_KEY_SECRET) {
    throw new Error('Razorpay credentials not configured');
  }
  return new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID,
    key_secret: process.env.RAZORPAY_KEY_SECRET,
  });
}

/**
 * Ask Razorpay whether money actually arrived for this checkout.
 *
 * The app calls /razorpay/verify right after the payment sheet closes, but that
 * call dies with the app — force-quit, killed process, network drop on the way
 * back. The order then looks identical to an abandoned one (pending + unpaid)
 * and the 30-minute stale sweep would delete it, leaving a real charge with no
 * order behind it. Razorpay is the only party that knows the difference, so ask
 * it before deleting anything.
 *
 * create-order writes the app order id into `receipt`, so the checkout is
 * findable by receipt without storing the Razorpay order id anywhere (the
 * schema is frozen). A multi-seller checkout is one Razorpay order minted
 * against one sub-order id, so every id in the group is tried.
 */
export async function findPaidRazorpayPayment(
  appOrderIds: string[]
): Promise<{ paymentId: string; amountPaise: number } | null> {
  const rzp = getRazorpay();
  for (const id of appOrderIds) {
    const list: any = await rzp.orders.all({ receipt: String(id), count: 10 } as any);
    for (const o of list?.items ?? []) {
      if (o.status !== 'paid' || Number(o.amount_paid) <= 0) continue;
      const payments: any = await rzp.orders.fetchPayments(o.id);
      const captured = (payments?.items ?? []).find(
        (p: any) => p.status === 'captured' || p.status === 'authorized'
      );
      if (captured) return { paymentId: captured.id, amountPaise: Number(o.amount_paid) };
    }
  }
  return null;
}

/**
 * Mark a checkout's sub-orders settled, inside the caller's open transaction.
 * Shared by /razorpay/verify and by the stale-sweep rescue so the two can never
 * drift — one of them forgetting to notify a seller or write history is a bug
 * nobody notices until a customer complains.
 *
 * Each row is judged on its own amount so the rows stay individually honest. An
 * instant+COD order only prepaid its delivery fee, so it becomes 'partial' (not
 * 'paid') and keeps its COD payment_method — the delivery app must still collect
 * the balance at the door.
 */
export async function settleGroupPayment(
  client: any,
  userId: string,
  order: any,
  groupRows: any[],
  paymentId: string
): Promise<{ groupTotal: number; paidOrderIds: string[] }> {
  let groupTotal = 0;
  for (const row of groupRows) {
    const charged = amountToCharge(row);
    groupTotal += charged;
    const isFull = charged >= Number(row.final_amount);
    await client.query(
      `UPDATE ${ORDERS}
          SET payment_status = $1::varchar,
              status         = CASE WHEN $1::varchar = 'paid' THEN 'confirmed' ELSE status END,
              payment_id     = $2,
              payment_method = CASE WHEN $1::varchar = 'paid' THEN 'razorpay' ELSE payment_method END,
              prepaid_amount = $3,
              updated_at     = NOW()
        WHERE id = $4`,
      [isFull ? 'paid' : 'partial', paymentId, charged, row.id]
    );
    await recordOrderStatus(
      client,
      row.id,
      isFull ? 'confirmed' : 'pending',
      `Payment of ₹${charged.toFixed(2)} verified (${paymentId})`
    );
  }

  // Notify the customer that payment succeeded (audit trail via notifications).
  await client.query(
    `INSERT INTO notifications (id, user_id, title, message, type, data, is_read, created_at)
     VALUES ($1, $2, $3, $4, 'payment_success', $5, false, NOW())`,
    [
      generateId(),
      userId,
      `Payment Successful: ${order.order_number}`,
      `Your payment of ₹${groupTotal.toFixed(2)} for order ${order.order_number} was successful.`,
      JSON.stringify({ orderId: order.id, groupId: order.group_id ?? null, paymentId, amount: groupTotal }),
    ]
  );

  // The sellers were deliberately NOT told at checkout — a prepaid order that is
  // never paid for gets deleted, and the seller must not have been buzzed about
  // it in the meantime. Now that the money is in, tell them.
  const paidOrderIds = groupRows.map((r: any) => r.id);
  await notifySellersOfPaidOrders(client, paidOrderIds);

  return { groupTotal, paidOrderIds };
}

/**
 * Post-COMMIT side effects for a settled checkout: pushes and the email. Must be
 * awaited before the caller releases `client` — it reads seller tokens through it.
 */
export async function afterSettle(
  client: any,
  userId: string,
  order: any,
  paidOrderIds: string[],
  groupTotal: number,
  paymentId: string
): Promise<void> {
  await pushSellersOfPaidOrders(client, paidOrderIds).catch((e: any) =>
    logger.warn('settle_push_sellers_failed', { error: e?.message })
  );
  sendPush(
    userId,
    `Payment successful: ${order.order_number}`,
    `Your payment of ₹${groupTotal.toFixed(2)} for order ${order.order_number} was successful.`,
    { orderId: order.id, paymentId, type: 'payment_success' }
  );
  sendOrderEmail(userId, order.group_id ? `ZP-${order.group_id}` : order.order_number, paidOrderIds);
}
