import { pool } from '../db';
import { generateId } from './id';
import { sendPush } from './push';
import { logger } from './logger';
import { resolveReturnLines, refundForLines } from './returnLines';
import { withMarkup } from './pricing';

/**
 * Every notification the return workflow emits, for every audience.
 *
 * WHY THIS LIVES IN THE ECOM BACKEND AND NOWHERE ELSE (Phase 4 decision):
 * ZPIN has no shared notification bus, so the emitter has to sit wherever all
 * five return events actually exist — and that is exactly one place. The ecom
 * backend owns `POST /orders/:id/return` ('requested') and
 * `PATCH /orders/:id/return-status` (approved | rejected | picked_up |
 * refunded); the admin website (Phase 2) and the delivery backend (Phase 3) are
 * pure proxies to that PATCH and never write a return themselves. So one call
 * site per event, no fan-out, and no chance of two surfaces double-notifying.
 *
 * It also already owns the plumbing: the `notifications` table is ecom's, and
 * `push_tokens` is keyed on the token with a `user_id`, so a push aimed at a
 * seller's user id reaches the vendor app exactly the way the "New Order" push
 * in sellerOrderNotify.ts already does. No new table, no new column, no schema
 * change (CLAUDE.md §1).
 *
 * Polling was rejected outright for the customer leg: the requirement is that a
 * customer learns of an approval or rejection WITHOUT opening the app, which a
 * poll cannot do by definition. The vendor app's existing bell is likewise a
 * poll over the seller order list and knows nothing about returns.
 *
 * NOT notified: delivery partners. Phase 3 made return pickups a broadcast pool
 * with no assignee, so there is no single partner to address — see
 * CROSS_SURFACE_CHANGES.md.
 *
 * Best-effort by contract, like every other notification in this backend: a
 * failure here must never fail or roll back the transition that triggered it.
 * Call AFTER COMMIT — a rolled-back transaction must not buzz a phone.
 */

// 'dropped_off' is not a `return_requests.status` value — it is a status_history
// entry (see utils/returnDropoff.ts). It is an event here all the same: the
// seller has physically got the goods back and both sides want to know.
type ReturnEvent = 'requested' | 'approved' | 'rejected' | 'picked_up' | 'dropped_off' | 'refunded';

// One row per audience per event. `null` copy = that audience is not told.
// The customer is not pushed about their own 'requested' tap; they still get the
// inbox row so the history is complete.
// `amt` is the refund the OPEN return is worth ("₹1,234"), or '' when there is
// no open return to price. Only the customer copy that promises money uses it —
// "This amount will be refunded" used to name no amount at all.
const COPY: Record<ReturnEvent, {
  customer: { title: string; body: (n: string, amt: string) => string } | null;
  seller: { title: string; body: (n: string) => string } | null;
}> = {
  requested: {
    customer: { title: 'Return requested', body: (n) => `We've received your return request for order ${n}.` },
    seller: { title: 'Return requested', body: (n) => `A customer has requested a return on order ${n}. ZPIN will review it.` },
  },
  approved: {
    customer: { title: 'Return approved', body: (n) => `Your return for order ${n} was approved. A delivery partner will collect the item.` },
    seller: { title: 'Return approved', body: (n) => `A return on order ${n} was approved — the goods are coming back to you.` },
  },
  rejected: {
    customer: { title: 'Return rejected', body: (n) => `Your return request for order ${n} was not approved.` },
    seller: { title: 'Return rejected', body: (n) => `The return on order ${n} was rejected. Nothing is coming back.` },
  },
  picked_up: {
    customer: { title: 'Return collected', body: (n, amt) => `Your return for order ${n} has been collected. ${amt ? `${amt} ` : 'This amount '}will be refunded once the seller receives the product.` },
    seller: { title: 'Return on its way back', body: (n) => `The return for order ${n} has been collected from the customer and is on its way to you.` },
  },
  dropped_off: {
    customer: { title: 'Return delivered to seller', body: (n, amt) => `Your return for order ${n} has reached the seller. Your refund${amt ? ` of ${amt}` : ''} will be settled shortly.` },
    seller: { title: 'Return received', body: (n) => `You confirmed the return for order ${n}. ZPIN will settle the refund.` },
  },
  refunded: {
    customer: { title: 'Refund settled', body: (n, amt) => `The refund${amt ? ` of ${amt}` : ''} for your return on order ${n} has been settled.` },
    seller: { title: 'Return refunded', body: (n) => `The return on order ${n} has been refunded and the stock put back.` },
  },
};

const PUSH_CUSTOMER: Record<ReturnEvent, boolean> = {
  requested: false, // they just tapped it
  approved: true,
  rejected: true,
  picked_up: true,
  dropped_off: true,
  refunded: true,
};

/**
 * What the live return on this order is worth, formatted — the units actually
 * coming back plus 18% GST, never the order total. Empty string when there is no
 * return to price, so the copy falls back to its amount-less wording rather than
 * promising "₹0".
 */
async function refundText(orderId: string): Promise<string> {
  try {
    const { rows } = await pool.query(
      `SELECT order_item_ids FROM return_requests
        WHERE order_id = $1 AND status <> 'rejected'
        ORDER BY created_at DESC LIMIT 1`,
      [orderId]
    );
    if (rows.length === 0) return '';
    const items = (
      await pool.query(`SELECT id, price, quantity FROM order_items WHERE order_id = $1`, [orderId])
    ).rows;
    const total = refundForLines(resolveReturnLines(rows[0].order_item_ids, items), withMarkup).total;
    return total > 0 ? `₹${total.toLocaleString('en-IN')}` : '';
  } catch {
    return '';
  }
}

export async function notifyReturnTransition(
  orderId: string,
  event: ReturnEvent,
  note?: string
): Promise<void> {
  try {
    const copy = COPY[event];
    if (!copy) return;

    const { rows } = await pool.query(
      `SELECT o.order_number, o.user_id AS customer_id,
              ARRAY(
                SELECT DISTINCT p.user_id
                  FROM order_items oi JOIN products p ON p.id = oi.product_id
                 WHERE oi.order_id = o.id
              ) AS seller_ids
         FROM orders o
        WHERE o.id = $1`,
      [orderId]
    );
    if (rows.length === 0) return;

    const { order_number: orderNumber, customer_id: customerId } = rows[0];
    const sellerIds: string[] = (rows[0].seller_ids || []).filter(Boolean);

    const data = JSON.stringify({
      orderId,
      orderNumber,
      returnStatus: event,
      ...(note ? { note } : {}),
    });

    const targets: Array<{ userId: string; title: string; body: string; push: boolean }> = [];
    if (copy.customer && customerId) {
      targets.push({
        userId: customerId,
        title: copy.customer.title,
        // The reason a return was refused is the whole point of the message.
        body: copy.customer.body(orderNumber, await refundText(orderId)) + (event === 'rejected' && note ? ` Reason: ${note}` : ''),
        push: PUSH_CUSTOMER[event],
      });
    }
    if (copy.seller) {
      for (const sellerId of sellerIds) {
        // A seller who bought from himself must not get both sides of the story.
        if (sellerId === customerId) continue;
        targets.push({
          userId: sellerId,
          title: copy.seller.title,
          body: copy.seller.body(orderNumber),
          push: true,
        });
      }
    }

    for (const t of targets) {
      await pool.query(
        `INSERT INTO notifications (id, user_id, title, message, type, data, is_read, created_at)
         VALUES ($1, $2, $3, $4, 'return_update', $5, false, (NOW() AT TIME ZONE 'Asia/Kolkata'))`,
        [generateId(), t.userId, t.title, t.body, data]
      );
      if (t.push) {
        // Not awaited anywhere else in this backend either — fire and forget.
        sendPush(t.userId, t.title, t.body, { orderId, orderNumber, returnStatus: event, type: 'return_update' });
      }
    }

    logger.info('return.notified', { orderId, event, recipients: targets.length });
  } catch (err: any) {
    logger.warn('return.notify_failed', { orderId, event, error: err?.message ?? String(err) });
  }
}
