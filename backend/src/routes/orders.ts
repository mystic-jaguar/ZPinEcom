import { Response, Router } from 'express';
import { pool } from '../db';
import { authenticate, AuthRequest } from '../middleware/auth';
import { orderCreateLimiter } from '../middleware/rateLimits';
import { isPuneAddress, OUT_OF_AREA_MESSAGE } from '../utils/delivery';
import { decryptAddressPayload, encryptAddressPayload } from '../utils/encryption';
import { consumeDealStock, liveDealPrices, releaseDealStock } from '../utils/flashDeals';
import { generateId } from '../utils/id';
import { recordOrderStatus } from '../utils/orderHistory';
import { markupItems, withMarkup } from '../utils/pricing';
import { raiseRefundClaim, readRefundSettlement, voidRefundClaim } from '../utils/refundClaim';
import { notifyReturnTransition } from '../utils/returnNotify';
import {
  parseReturnLines,
  refundForLines,
  resolveReturnLines,
  tallyReturnedQuantities,
} from '../utils/returnLines';
import {
  dropoffOtpFrom,
  generateDropoffOtp,
  hasDroppedOff,
  otpMatches,
  sanitizeReturnHistory,
} from '../utils/returnDropoff';
import { cacheDel, cacheDelPattern } from '../utils/redis';
import { sendPush } from '../utils/push';
import { sendOrderEmail } from '../utils/orderEmail';
import { ORDER_ITEMS_JSON } from '../utils/orderItemsSql';
import { afterSettle, findPaidRazorpayPayment, settleGroupPayment } from '../utils/settlePayment';
import { safeIdentifier } from '../utils/sql';
import { logger } from '../utils/logger';

const router = Router();
const ORDERS = safeIdentifier('orders');
const ORDER_ITEMS = safeIdentifier('order_items');
const CART = safeIdentifier('cart_items');
const ADDRESSES = safeIdentifier('addresses');
const RETURN_REQUESTS = safeIdentifier('return_requests');


// The return workflow, in order. Must stay identical to the CHECK constraint on
// return_requests.status (migrations/2026-08-12-return-status-vocabulary.cjs) —
// they drifted apart once and every status advance failed on prod as a result.
export const RETURN_STATUSES = ['approved', 'rejected', 'picked_up', 'refunded'];

// One canonical wording for the refund promise, served to every customer
// surface (ecom app + customer website) so the app and the web never quote
// different terms for the same money.
export const RETURN_REFUND_DISCLAIMER =
  'This amount will be refunded once the seller receives the product.';

// Which status may follow which. 'rejected' and 'refunded' are terminal.
// picked_up -> rejected exists so a return the delivery partner marked
// `item_condition = 'damaged'` has somewhere to go: it must NOT be refunded, and
// without this it would be stuck at picked_up forever.
const RETURN_TRANSITIONS: Record<string, string[]> = {
  requested: ['approved', 'rejected'],
  approved: ['picked_up'],
  picked_up: ['refunded', 'rejected'],
};

// Did the delivery partner inspect the returned goods, and were they acceptable?
// Written at pickup; gates the refund (see the 'refunded' check below). Column
// proposed in SCHEMA_CHANGES.md (2026-08-12) and NOT yet applied on prod — every
// read here is defensive so this code is correct both before and after the DDL.
export const ITEM_CONDITIONS = ['ok', 'damaged'];
const ORDER_CANCELLATIONS = safeIdentifier('order_cancellations');
const COUPON_REDEMPTIONS = safeIdentifier('coupon_redemptions');


function buildTrackingHistory(order: any, returnRequest?: any) {
  const steps: Array<{ status: string; title: string; timestamp: string | null; note?: string }> = [
    { status: 'pending', title: 'Order placed', timestamp: order.created_at },
  ];

  // Same vocabulary the customer website understands (frontend/utils/orderStatus.ts).
  // 'shipped' and 'in_transit' are the same stage under two names — an order carries
  // one of them, never both, so keeping both in the flow is safe.
  const flow = ['confirmed', 'processing', 'shipped', 'in_transit', 'out_for_delivery', 'delivered'];
  for (const status of flow) {
    if (order.status === status || flow.indexOf(order.status) > flow.indexOf(status)) {
      steps.push({
        status,
        title: `Order ${status}`,
        timestamp: order.updated_at,
      });
    }
  }

  // Phase 9 — a delivery attempt that did not complete. Shown as its own event
  // so the customer can see an attempt happened rather than a stalled timeline.
  if (order.delivery_status === 'failed') {
    steps.push({
      status: 'delivery_failed',
      title: 'Delivery attempt failed',
      timestamp: order.updated_at,
      note: 'The courier will try again or return the order to the seller.',
    });
  }

  // The attempt failed and the courier has given up on it: the parcel is
  // travelling back. `orders.status` deliberately stays 'delivery_failed' until
  // the seller confirms receipt (the delivery backend owns only delivery_status
  // — see its /orders/:id/resolve), so without this branch the timeline lost the
  // failure event entirely at this point and fell back to plain "Order shipped".
  if (order.delivery_status === 'returned') {
    steps.push({
      status: 'delivery_failed',
      title: 'Delivery attempt failed',
      timestamp: order.updated_at,
    });
    steps.push({
      status: 'returning_to_seller',
      title: 'Returning to the seller',
      timestamp: order.updated_at,
      note: 'Any refund due will be reviewed by our team once the seller confirms receipt.',
    });
  }

  if (order.status === 'cancelled') {
    steps.push({
      status: 'cancelled',
      title: 'Order cancelled',
      timestamp: order.updated_at,
    });
  }

  if (returnRequest) {
    const history = Array.isArray(returnRequest.status_history) ? returnRequest.status_history : [];
    steps.push({
      status: 'return_requested',
      title: 'Return requested',
      timestamp: returnRequest.created_at,
      note: returnRequest.reason,
    });

    const eventFor = (status: string) => history.find((event: any) => event.status === status);

    const rejectedEvent = eventFor('rejected');
    if (rejectedEvent || returnRequest.status === 'rejected') {
      steps.push({
        status: 'rejected',
        title: 'Return rejected',
        timestamp: rejectedEvent?.at || returnRequest.updated_at,
        note: rejectedEvent?.note || undefined,
      });
      return steps;
    }

    const approvedEvent = eventFor('approved');
    if (approvedEvent || ['approved', 'picked_up', 'refunded'].includes(returnRequest.status)) {
      steps.push({
        status: 'approved',
        title: 'Return approved',
        timestamp: approvedEvent?.at || returnRequest.updated_at,
        note: approvedEvent?.note || 'A delivery partner will collect the item.',
      });
    }

    const pickedUpEvent = eventFor('picked_up');
    if (pickedUpEvent || returnRequest.picked_up_at) {
      steps.push({
        status: 'picked_up',
        title: 'Return picked up',
        timestamp: pickedUpEvent?.at || returnRequest.picked_up_at,
        note: RETURN_REFUND_DISCLAIMER,
      });
    }

    const refundedEvent = eventFor('refunded');
    if (refundedEvent || returnRequest.refunded_at) {
      steps.push({
        status: 'refunded',
        title: 'Refunded',
        timestamp: refundedEvent?.at || returnRequest.refunded_at,
        note: refundedEvent?.note || undefined,
      });
    }
  }

  return steps;
}

/**
 * Phase 9A timeout rule: a trial the customer never answered defaults to KEEP
 * EVERYTHING, so the amounts stay exactly as ordered and only the status moves
 * on. That makes the timeout a single idempotent UPDATE we can run lazily on any
 * read (here and in the delivery backend) instead of running a scheduler.
 */
async function finalizeExpiredTrials(): Promise<void> {
  try {
    await pool.query(
      `UPDATE ${ORDERS} SET status = 'awaiting_collection', trial_expires_at = NULL, updated_at = NOW()
        WHERE status = 'trial_pending' AND trial_expires_at IS NOT NULL AND trial_expires_at < NOW()`
    );
  } catch (err: any) {
    logger.warn('finalizeexpiredtrials', { error: err?.message });
  }
}

function normalizeOrder(row: any) {
  return {
    id: row.id,
    orderNumber: row.order_number,
    // group_id ties a checkout's per-seller sub-orders together. Legacy rows are
    // NULL — the frontend treats a NULL group as a group of one (its own id).
    groupId: row.group_id ?? null,
    userId: row.user_id,
    status: row.status,
    paymentStatus: row.payment_status,
    totalAmount: Number(row.total_amount),
    shippingAmount: Number(row.shipping_amount || 0),
    taxAmount: Number(row.tax_amount || 0),
    finalAmount: Number(row.final_amount),
    shippingAddress: decryptAddressPayload(row.shipping_address),
    paymentMethod: row.payment_method,
    paymentId: row.payment_id,
    estimatedDelivery: row.estimated_delivery,
    trackingNumber: row.tracking_number,
    notes: row.notes,
    // Shared delivery columns (Phase 9). 'flash' is the stored value behind the
    // user-facing "Instant Delivery"; prepaidAmount is what was already settled
    // online, so the courier collects finalAmount − prepaidAmount in cash.
    deliveryType: row.delivery_type ?? 'standard',
    deliveryFee: Number(row.delivery_fee || 0),
    prepaidAmount: Number(row.prepaid_amount || 0),
    // Phase 9A "try first": the 15-minute keep/return window opens at the
    // partner's pickup, so trialExpiresAt is null until then. The app runs the
    // countdown (and its 1-min-before / 1-min-after warnings) off this timestamp.
    // Set only when a seller rejected the order: the reason they typed, taken
    // from the order_status_history note the vendor backend writes. The app
    // shows it verbatim as a disclaimer on the cancelled order.
    cancellationReason: row.cancellation_reason ?? null,
    isTrial: !!row.is_trial,
    trialExpiresAt: row.trial_expires_at ?? null,
    trialSecondsLeft: row.trial_seconds_left != null ? Math.round(Number(row.trial_seconds_left)) : null,
    // Same gate as the /track endpoint: only present once a delivery partner
    // has actually accepted (delivery_boy_id set), never a placeholder.
    courier: row.delivery_boy_id ? { name: row.courier_name || null, phone: row.courier_phone || null } : null,
    // order_items.price is the raw VENDOR price (that's what the seller is paid
    // and what the seller dashboard reports). The customer is shown — and was
    // charged — that price plus the 20% ZPIN platform fee, which is why these
    // marked-up line items sum to the stored total_amount.
    items: markupItems(row.items),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    date: row.created_at,
  };
}

// GET /api/v1/orders
router.get('/', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  const page = Number(req.query.page) || 1;
  const limit = Math.min(Math.max(1, Math.floor(Number(req.query.limit)) || 20), 100);
  const offset = (page - 1) * limit;

  try {
    await finalizeExpiredTrials();
    // Second trigger point: the customer whose app was killed mid-payment almost
    // always reopens to the orders tab. Sweeping here clears their own ghost order
    // (and its held stock) without waiting for another shopper to hit checkout.
    await sweepStaleCheckouts();
    // Hide only genuinely abandoned/unpaid online checkouts, not plain COD
    // orders — COD is *born* pending/pending and stays that way until the
    // seller confirms it, so filtering on payment_status alone hid every new
    // COD order from the customer's own list/count. Mirrors the /abandon
    // eligibility check below (payment_method + Instant-fee-prepay carve-out).
    const abandonedCheckout = `(status = 'pending' AND payment_status = 'pending' AND (
      LOWER(COALESCE(payment_method, '')) NOT IN ('cod', 'cash', 'cash_on_delivery')
      OR (delivery_type = 'flash' AND COALESCE(delivery_fee, 0) > 0)
    ))`;
    const countResult = await pool.query(
      `SELECT COUNT(*) FROM ${ORDERS} WHERE user_id = $1 AND NOT ${abandonedCheckout}`,
      [req.userId]
    );
    const total = Number(countResult.rows[0].count);

    const result = await pool.query(
      `SELECT o.*,
        COALESCE(json_agg(${ORDER_ITEMS_JSON}) FILTER (WHERE oi.id IS NOT NULL), '[]') as items
       FROM ${ORDERS} o
       LEFT JOIN ${ORDER_ITEMS} oi ON oi.order_id = o.id
       WHERE o.user_id = $1 AND NOT ${abandonedCheckout}
       GROUP BY o.id
       ORDER BY o.created_at DESC
       LIMIT $2 OFFSET $3`,
      [req.userId, limit, offset]
    );

    res.json({
      success: true,
      data: result.rows.map(normalizeOrder),
      pagination: {
        currentPage: page,
        totalPages: Math.ceil(total / limit),
        totalItems: total,
        itemsPerPage: limit,
        hasNextPage: page * limit < total,
        hasPrevPage: page > 1,
      },
    });
  } catch (err) {
    logger.error('getorders_error', { error: (err as any)?.message ?? String(err) });
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// GET /api/v1/orders/:id
router.get('/:id', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    await finalizeExpiredTrials();
    const result = await pool.query(
      `SELECT o.*,
        -- Server-clock countdown for the Phase 9A trial window. Sent as a
        -- duration, not a timestamp, so the app never has to reconcile the
        -- device clock or the column's timezone with ours.
        EXTRACT(EPOCH FROM (o.trial_expires_at - NOW())) AS trial_seconds_left,
        -- Seller's rejection reason. The vendor backend stores it as the note on
        -- the 'cancelled' history row, prefixed with who wrote it.
        (SELECT REPLACE(h.note, 'Rejected by seller: ', '')
           FROM order_status_history h
          WHERE h.order_id = o.id AND h.status = 'cancelled'
            AND h.note LIKE 'Rejected by seller:%'
          ORDER BY h.created_at DESC LIMIT 1) AS cancellation_reason,
        dp.name AS courier_name, dp.mobile AS courier_phone,
        COALESCE(json_agg(${ORDER_ITEMS_JSON}) FILTER (WHERE oi.id IS NOT NULL), '[]') as items
       FROM ${ORDERS} o
       LEFT JOIN ${ORDER_ITEMS} oi ON oi.order_id = o.id
       LEFT JOIN delivery_partner_profiles dp ON dp.id::text = o.delivery_boy_id::text
       WHERE o.id = $1 AND o.user_id = $2
       GROUP BY o.id, dp.name, dp.mobile`,
      [req.params.id, req.userId]
    );

    if (result.rows.length === 0) {
      res.status(404).json({ success: false, message: 'Order not found' });
      return;
    }

    res.json({ success: true, data: { order: normalizeOrder(result.rows[0]) } });
  } catch (err) {
    logger.error('getorder_error', { error: (err as any)?.message ?? String(err) });
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// GET /api/v1/orders/:id/track
router.get('/:id/track', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  try {

    // delivery_status / delivery_boy_id are written by the delivery backend on the
    // shared orders table (accepted → picked_up → delivered). The cheap LEFT JOIN
    // surfaces the assigned courier's real name/phone for the track screen.
    const orderResult = await pool.query(
      `SELECT o.id, o.order_number, o.status, o.tracking_number, o.estimated_delivery,
              o.created_at, o.updated_at, o.delivery_status, o.delivery_boy_id,
              o.delivery_otp, dp.name AS courier_name, dp.mobile AS courier_phone,
              -- Phase 9 (failed delivery). Read through to_jsonb so this query
              -- keeps working whether or not the delivery backend's DDL has
              -- landed yet — a missing key is simply NULL, not a 42703 error.
              to_jsonb(o) ->> 'delivery_failure_reason' AS delivery_failure_reason
       FROM ${ORDERS} o
       LEFT JOIN delivery_partner_profiles dp ON dp.id::text = o.delivery_boy_id::text
       WHERE o.id = $1 AND o.user_id = $2`,
      [req.params.id, req.userId]
    );

    if (orderResult.rows.length === 0) {
      res.status(404).json({ success: false, message: 'Order not found' });
      return;
    }

    const returnResult = await pool.query(
      `SELECT id, reason, status, picked_up_at, refunded_at, status_history, created_at, updated_at
       FROM ${RETURN_REQUESTS}
       WHERE order_id = $1 AND user_id = $2
       ORDER BY created_at DESC
       LIMIT 1`,
      [req.params.id, req.userId]
    );

    const order = orderResult.rows[0];
    const returnRequest = returnResult.rows[0];
    const trackingHistory = buildTrackingHistory(order, returnRequest);

    res.json({
      success: true,
      data: {
        orderId: order.id,
        orderNumber: order.order_number,
        trackingNumber: order.tracking_number || null,
        currentStatus: returnRequest ? 'return_in_progress' : order.status,
        deliveryStatus: order.delivery_status || null,
        courier: order.delivery_boy_id
          ? { name: order.courier_name || null, phone: order.courier_phone || null }
          : null,
        // Proof of delivery: the customer reads this out to the partner at the
        // door. Only meaningful while the order is out for delivery; the
        // delivery backend clears it the moment the OTP is accepted.
        deliveryOtp: order.delivery_status === 'picked_up' ? order.delivery_otp || null : null,
        // Phase 9 — an attempt was made and did not complete. The customer sees
        // the reason so a second attempt is not a surprise. Only the fixed
        // reason word is exposed; the partner's free-text note is internal.
        // 'returned' is included deliberately: the parcel going back to the
        // seller does not un-fail the delivery, and dropping the banner at that
        // moment was how the customer silently lost the only explanation they
        // had. `returning` tells the app to say "on its way back" rather than
        // "we will try again".
        deliveryFailure: order.delivery_status === 'failed' || order.delivery_status === 'returned'
          ? {
              reason: String(order.delivery_failure_reason || 'other').split(':')[0],
              at: order.updated_at,
              returning: order.delivery_status === 'returned',
            }
          : null,
        estimatedDelivery: order.estimated_delivery,
        trackingHistory,
      },
    });
  } catch (err: any) {
    logger.error('trackorder_error', { error: err?.message, code: err?.code, stack: err?.stack });
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Hard ceiling per cart line. Nobody buys 500 of one thing at a door-step
// shop; anything above this is a tampered client, not a customer.
const MAX_LINE_QUANTITY = 20;

// POST /api/v1/orders
router.post('/', authenticate, orderCreateLimiter, async (req: AuthRequest, res: Response): Promise<void> => {
  const { shippingAddressId, paymentMethod, notes, cartItems: bodyCartItems, couponDiscount: clientCouponDiscount } = req.body;

  if (!shippingAddressId || !paymentMethod) {
    res.status(400).json({ success: false, message: 'shippingAddressId and paymentMethod are required' });
    return;
  }

  // Ensure the coupon_redemptions table exists before the checkout transaction
  // may write to it (idempotent; a no-op after the first call / startup).

  // Give back stock held by checkouts that were abandoned without telling us,
  // BEFORE this checkout's own decrement runs — otherwise the last unit of a
  // contended item stays locked to a dead order and this buyer gets a spurious
  // "Insufficient stock". Runs on its own connection/transaction, outside the
  // checkout transaction below, so a sweep failure can't roll this order back.
  await sweepStaleCheckouts();

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    let cartResult = await client.query(
      `SELECT ci.*, p.price, p.product_name, p.user_id as seller_id,
        (u.is_live IS NOT FALSE) as seller_is_live,
        (SELECT image_url FROM product_images WHERE product_id = p.id LIMIT 1) as image
       FROM ${CART} ci
       JOIN products p ON p.id = ci.product_id
       LEFT JOIN users u ON u.id = p.user_id
       WHERE ci.user_id = $1 AND p.is_approved = true`,
      [req.userId]
    );

    // Reconcile the server cart to exactly the cart the user reviewed at checkout.
    // We used to sync only when the DB cart was empty, so a stale/partial server
    // cart could silently override the reviewed items and produce an order total
    // (and Razorpay charge) that differed from what the summary screen showed.
    // We trust the client only for WHICH items/quantities are in the cart — prices
    // are always looked up server-side below, never taken from the client.
    if (Array.isArray(bodyCartItems) && bodyCartItems.length > 0) {
      // A cart line is (product, size) — reconciling on product alone would
      // collapse "2 × size M + 1 × size L" into one line and lose a size.
      const wantedLines = bodyCartItems
        .filter((i: any) => i.productId)
        .map((i: any) => ({
          productId: i.productId,
          // The client says HOW MANY, never the price — but "how many" must still
          // be a sane positive integer, not 0, -3, 1e9 or "abc".
          quantity: Math.min(Math.max(1, Math.floor(Number(i.quantity)) || 1), MAX_LINE_QUANTITY),
          variant: typeof i.variant === 'string' && i.variant.trim() !== ''
            ? i.variant.trim().slice(0, 50)
            : (typeof i.selectedSize === 'string' && i.selectedSize.trim() !== ''
              ? i.selectedSize.trim().slice(0, 50) : null),
        }));

      // Drop server-cart rows the user no longer has in their reviewed cart.
      if (wantedLines.length > 0) {
        const tuples = wantedLines
          .map((_: any, i: number) => `($${i * 2 + 2}::uuid, $${i * 2 + 3})`)
          .join(', ');
        await client.query(
          `DELETE FROM ${CART} WHERE user_id = $1
            AND (product_id, COALESCE(variant, '')) NOT IN (${tuples})`,
          [req.userId, ...wantedLines.flatMap((l: any) => [l.productId, l.variant ?? ''])]
        );
      }

      for (const item of wantedLines) {
        const product = await client.query(
          'SELECT price, in_stock, product_name, user_id FROM products WHERE id = $1::uuid AND is_approved = true',
          [item.productId]
        );
        if (product.rows.length === 0 || !product.rows[0].in_stock) continue;

        const existing = await client.query(
          `SELECT id FROM ${CART}
            WHERE user_id = $1 AND product_id = $2::uuid AND variant IS NOT DISTINCT FROM $3`,
          [req.userId, item.productId, item.variant]
        );
        if (existing.rows.length > 0) {
          await client.query(
            `UPDATE ${CART} SET quantity = $1, updated_at = NOW() WHERE id = $2`,
            [item.quantity, existing.rows[0].id]
          );
        } else {
          await client.query(
            `INSERT INTO ${CART} (id, user_id, product_id, quantity, price_at_add, variant, created_at, updated_at)
             VALUES ($1,$2,$3::uuid,$4,$5,$6,NOW(),NOW())`,
            [generateId(), req.userId, item.productId, item.quantity, product.rows[0].price, item.variant]
          );
        }
      }

      // Re-fetch cart after reconcile
      cartResult = await client.query(
        `SELECT ci.*, p.price, p.product_name, p.user_id as seller_id,
          (u.is_live IS NOT FALSE) as seller_is_live,
          (SELECT image_url FROM product_images WHERE product_id = p.id LIMIT 1) as image
         FROM ${CART} ci
         JOIN products p ON p.id = ci.product_id
         LEFT JOIN users u ON u.id = p.user_id
         WHERE ci.user_id = $1 AND p.is_approved = true`,
        [req.userId]
      );
    }

    if (cartResult.rows.length === 0) {
      await client.query('ROLLBACK');
      res.status(400).json({ success: false, message: 'Cart is empty' });
      return;
    }

    // users.is_live — a seller who has gone offline cannot be bought from. The
    // catalogue predicate (is_approved) decides what is listed; is_live decides
    // what can be ordered right now, and this is the one place it is enforced.
    const offline = cartResult.rows.find((r: any) => r.seller_is_live === false);
    if (offline) {
      await client.query('ROLLBACK');
      res.status(409).json({
        success: false,
        message: `${offline.product_name} is unavailable right now — the seller is offline. Please remove it and try again.`,
      });
      return;
    }

    const addrResult = await client.query(
      `SELECT * FROM ${ADDRESSES} WHERE id = $1 AND user_id = $2`,
      [shippingAddressId, req.userId]
    );
    if (addrResult.rows.length === 0) {
      await client.query('ROLLBACK');
      res.status(404).json({ success: false, message: 'Shipping address not found' });
      return;
    }

    const addr = decryptAddressPayload(addrResult.rows[0]);

    // Delivery is Pune-only. This is the authoritative gate — it also catches
    // addresses saved before the restriction existed, which the save-time check
    // can't. The customer's own location is irrelevant; only this address matters.
    if (!isPuneAddress(addr.city, addr.pincode)) {
      await client.query('ROLLBACK');
      res.status(400).json({ success: false, message: OUT_OF_AREA_MESSAGE });
      return;
    }

    // The one shipping-address contract, shared with the website, seller app and
    // delivery app. Same keys as `addresses`, every value encrypted.
    const shippingAddress = {
      name: addr.name, phone: addr.phone,
      address_line1: addr.address_line1, address_line2: addr.address_line2,
      city: addr.city, state: addr.state, pincode: addr.pincode,
      country: addr.country, landmark: addr.landmark,
    };
    const encryptedShippingAddress = encryptAddressPayload(shippingAddress);

    // Flash deals (admin-managed, Phase 10): a live deal REPLACES the vendor
    // price for that product, so the customer is charged the price the deal
    // advertises and the seller is credited the deal price they agreed to.
    const dealPrices = await liveDealPrices(client, cartResult.rows.map((r: any) => r.product_id));
    if (dealPrices.size > 0) {
      for (const row of cartResult.rows) {
        const deal = dealPrices.get(String(row.product_id));
        if (deal != null) row.price = deal;
      }
    }

    // Every money figure below is the CUSTOMER-charged amount, so it is computed
    // on the marked-up price (vendor price + 20% ZPIN platform fee). Tax and the
    // free-delivery threshold therefore apply to the marked-up subtotal. The raw
    // `item.price` is still what we write to order_items — that is the seller's
    // money, and the seller must never see the markup.
    const chargedLine = (i: any) => withMarkup(i.price) * i.quantity;
    const totalAmount = cartResult.rows.reduce(
      (sum: number, item: any) => sum + chargedLine(item), 0
    );
    // Free delivery above ₹999 — MUST match the client free-delivery bar
    // (frontend cart.tsx FREE_DELIVERY_MIN). Enforced server-side so a tampered
    // client can't skip the ₹49 fee below the threshold.
    const FREE_DELIVERY_MIN = 999;
    const shippingAmount = totalAmount > FREE_DELIVERY_MIN ? 0 : 49;
    const taxAmount = Math.round(totalAmount * 0.18);
    // Instant "Try-at-Door" trial fee. Amount is fixed server-side (₹50) — we only
    // trust the client's delivery-type selection (notes flag), never a client amount.
    // Must match the frontend fee in checkout/summary.tsx + payment.tsx.
    // The fee is charged on COD too (same as the website): it is folded into
    // final_amount here, and razorpay.ts prepays exactly it for instant+COD.
    const isInstant = notes === 'instant_delivery';
    // orders.delivery_type is the shared column all four backends read. Its stored
    // vocabulary is unchanged ('standard' | 'flash') — "Instant Delivery" is the
    // user-facing name of 'flash', renamed in Phase 9.
    const deliveryType = isInstant ? 'flash' : 'standard';
    const deliveryFee = isInstant ? 50 : 0;
    // Phase 9A — "Try items for 15 minutes before paying". Only offered on Instant
    // Delivery. The customer prepays just the (non-refundable) delivery fee online;
    // the goods are settled at the door AFTER the keep/return selection, so a trial
    // order is always a door-collection order regardless of the method picked.
    const isTrial = isInstant && req.body.tryFirst === true;
    const effectivePaymentMethod = isTrial ? 'cod' : paymentMethod;

    // SECURITY: Never trust client-supplied coupon discount.
    // Validate the coupon code server-side if provided.
    let couponDiscount = 0;
    const couponCode = typeof req.body.couponCode === 'string' ? req.body.couponCode.trim().toUpperCase() : null;
    if (couponCode) {
      try {
        // Column names must match the canonical coupons schema used by the
        // /api/v1/coupons endpoints (is_active, valid_until, min_order_amount,
        // max_discount_amount, usage_limit) — NOT status/expires_at/min_order_value.
        const couponResult = await client.query(
          `SELECT * FROM coupons
           WHERE UPPER(code) = $1
             AND is_active = true
             AND (valid_until IS NULL OR valid_until > NOW())
             AND (usage_limit IS NULL OR usage_count < usage_limit)`,
          [couponCode]
        );
        if (couponResult.rows.length > 0) {
          const coupon = couponResult.rows[0];
          const minOrder = Number(coupon.min_order_amount || 0);
          if (totalAmount >= minOrder) {
            if (coupon.discount_type === 'percentage') {
              const pct = Math.min(Math.max(Number(coupon.discount_value), 0), 100);
              couponDiscount = (totalAmount * pct) / 100;
              if (coupon.max_discount_amount) couponDiscount = Math.min(couponDiscount, Number(coupon.max_discount_amount));
            } else {
              couponDiscount = Math.min(Number(coupon.discount_value), totalAmount);
            }
          }
        }
      } catch (couponErr) {
        // Non-fatal — proceed without discount if coupon lookup fails
        logger.warn('coupon_validation_error', { error: (couponErr as any)?.message ?? String(couponErr) });
      }
    }
    couponDiscount = Math.max(0, couponDiscount);
    const finalAmount = Math.max(0, totalAmount + shippingAmount + taxAmount + deliveryFee - couponDiscount);
    // ── Multi-seller split ──────────────────────────────────────────────────
    // A cart may contain products from several sellers. Each seller's parcel is
    // its own fulfillment (own seller_id + delivery lifecycle), so we create one
    // order row per seller, all sharing a single group_id (the customer-facing
    // order). seller_id must never be null: getSellerOrders filters WHERE
    // seller_id = $1, so a null-seller row is invisible to its seller and
    // unattributable for payouts — fail closed if any product has no owner.
    const orphan = cartResult.rows.find((i: any) => !i.seller_id);
    if (orphan) {
      logger.error('createorder.product_has_no_owner', {
        userId: req.userId,
        productId: orphan.product_id,
        productName: orphan.product_name,
      });
      await client.query('ROLLBACK');
      res.status(409).json({
        success: false,
        message: `"${orphan.product_name ?? 'An item'}" is temporarily unavailable for checkout. Please remove it and try again.`,
      });
      return;
    }

    // Group cart rows by seller (insertion order preserved for stable splits).
    const itemsBySeller = new Map<string, any[]>();
    for (const row of cartResult.rows) {
      const sid = String(row.seller_id);
      (itemsBySeller.get(sid) ?? itemsBySeller.set(sid, []).get(sid)!).push(row);
    }
    const sellerIds = [...itemsBySeller.keys()];
    // A "try first" checkout produces ONE trial: the courier carries one parcel
    // and waits at one door. A multi-seller cart would split into several
    // independent trials with separate couriers — refuse rather than pretend.
    if (isTrial && sellerIds.length > 1) {
      await client.query('ROLLBACK');
      res.status(409).json({
        success: false,
        message: 'Try-before-you-pay is only available when every item in your cart is from the same seller. Please order them separately or uncheck the option.',
      });
      return;
    }
    const subtotalOf = (rows: any[]) => rows.reduce((s, i) => s + chargedLine(i), 0);
    const sellerSubtotals = sellerIds.map((id) => subtotalOf(itemsBySeller.get(id)!));

    // Split a group-level charge proportionally by each seller's subtotal. The
    // last seller absorbs the rounding remainder so the per-seller shares sum
    // EXACTLY to the group total (no cents lost/created across the split).
    const round2 = (n: number) => Math.round(n * 100) / 100;
    const allocate = (total: number): number[] => {
      const out: number[] = [];
      let acc = 0;
      for (let i = 0; i < sellerSubtotals.length; i++) {
        if (i === sellerSubtotals.length - 1) {
          out.push(round2(total - acc));
        } else {
          const share = totalAmount > 0 ? round2((total * sellerSubtotals[i]) / totalAmount) : (i === 0 ? total : 0);
          out.push(share);
          acc += share;
        }
      }
      return out;
    };
    // shipping / tax / delivery fee / coupon discount are all computed on the
    // whole cart (group) above, then split here (free-delivery threshold already
    // judged on totalAmount = the whole group).
    const shipSplit = allocate(shippingAmount);
    const taxSplit = allocate(taxAmount);
    const feeSplit = allocate(deliveryFee);
    const discSplit = allocate(couponDiscount);

    // All orders start 'pending' so the seller explicitly accepts them in the
    // vendor app (pending → confirmed → processing). The delivery queue is gated
    // on IN ('processing','shipped') — i.e. only after the vendor marks the order
    // ready — so COD no longer needs to be born 'confirmed' to reach delivery.
    // Prepaid still flips to 'confirmed' on Razorpay payment verify.
    const orderStatus = 'pending';
    // Single-seller cart = ONE plain order, no split: the group is that order
    // itself (group_id = its own id), so the customer sees one number and one
    // shipment. Only a genuinely multi-seller cart gets a separate group id.
    const subIds = sellerIds.map(() => generateId());
    const groupId = sellerIds.length > 1 ? generateId() : subIds[0];
    const groupOrderNumber = `ZP-${groupId}`;

    const subOrders: Array<{
      id: string; orderNumber: string; sellerId: string; items: any[]; subtotal: number; finalAmount: number;
    }> = [];

    for (let s = 0; s < sellerIds.length; s++) {
      const sellerId = sellerIds[s];
      const sellerItems = itemsBySeller.get(sellerId)!;
      const sSubtotal = sellerSubtotals[s];
      const sShip = shipSplit[s];
      const sTax = taxSplit[s];
      const sFee = feeSplit[s];
      const sDisc = discSplit[s];
      const sFinal = Math.max(0, round2(sSubtotal + sShip + sTax + sFee - sDisc));
      const subId = subIds[s];
      const subNumber = `ZP-${subId}`;

      await client.query(
        `INSERT INTO ${ORDERS}
          (id, order_number, user_id, seller_id, group_id, status, payment_status, total_amount, shipping_amount,
           tax_amount, final_amount, shipping_address, payment_method, notes,
           delivery_type, delivery_fee, prepaid_amount, is_trial, estimated_delivery, created_at, updated_at)
         VALUES ($1,$2,$3,$4,$5,$6,'pending',$7,$8,$9,$10,$11,$12,$13,$14,$15,0,$16,
           (NOW() AT TIME ZONE 'Asia/Kolkata') + INTERVAL '5 days',
           (NOW() AT TIME ZONE 'Asia/Kolkata'),
           (NOW() AT TIME ZONE 'Asia/Kolkata'))`,
        [subId, subNumber, req.userId, sellerId, groupId, orderStatus, sSubtotal, sShip, sTax, sFinal,
         JSON.stringify(encryptedShippingAddress), effectivePaymentMethod, notes || '',
         deliveryType, sFee, isTrial]
      );

      for (const item of sellerItems) {
        await client.query(
          `INSERT INTO ${ORDER_ITEMS} (id, order_id, product_id, product_name, quantity, price, image, variant, created_at)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,(NOW() AT TIME ZONE 'Asia/Kolkata'))`,
          [generateId(), subId, item.product_id, item.product_name, item.quantity, item.price,
           item.image || '', item.variant || null]
        );
        if (dealPrices.size > 0 && dealPrices.has(String(item.product_id))) {
          await consumeDealStock(client, item.product_id, item.quantity);
        }
        // Decrement inventory atomically. The `quantity >= $1` guard makes the
        // check-and-decrement a single locked operation, so concurrent orders for
        // the same low-stock item can't oversell. No row updated → not enough stock.
        const dec = await client.query(
          `UPDATE products
           SET size_quantities = CASE
                 WHEN $3::text IS NOT NULL AND size_quantities ? $3 THEN
                   jsonb_set(size_quantities, ARRAY[$3::text],
                     to_jsonb(GREATEST(COALESCE((size_quantities->>$3)::int, 0) - $1, 0)))
                 ELSE size_quantities
               END,
               quantity = quantity - $1,
               in_stock = CASE WHEN quantity - $1 <= 0 THEN false ELSE in_stock END,
               updated_at = NOW()
           WHERE id = $2 AND quantity >= $1
             -- Per-size stock is checked too: a sold-out size must not sell
             -- while other sizes still hold the product total up.
             AND (COALESCE(size_quantities ? $3::text, false) = false
                  OR COALESCE((size_quantities->>$3)::int, 0) >= $1)
           RETURNING id`,
          [item.quantity, item.product_id, item.variant || null]
        );
        if (dec.rows.length === 0) {
          // Roll back the whole checkout; the finally block releases the client.
          await client.query('ROLLBACK');
          res.status(409).json({ success: false, message: `Insufficient stock for ${item.product_name}` });
          return;
        }
      }

      // Open the shared timeline every other surface reads.
      await recordOrderStatus(client, subId, orderStatus, 'Order placed');

      subOrders.push({ id: subId, orderNumber: subNumber, sellerId, items: sellerItems, subtotal: sSubtotal, finalAmount: sFinal });
    }

    // Primary sub-order = the seller with the largest subtotal. Used as the id the
    // razorpay create-order/verify + coupon redemption reference for the group.
    const primary = subOrders.reduce((a, b) => (b.subtotal > a.subtotal ? b : a), subOrders[0]);
    const orderId = primary.id;

    // Enforce coupon limits atomically. Two protections, both inside the order
    // transaction so any failure rolls back the whole order (fail closed — no
    // discounted order slips through):
    //  1. Global usage_limit — the conditional UPDATE ... WHERE usage_count <
    //     usage_limit makes check-and-increment a single locked operation, so
    //     concurrent checkouts can't push a coupon past its cap (closes the
    //     previous read-then-write race).
    //  2. Per-user single use — the UNIQUE(user_id, coupon_code) row rejects a
    //     second redemption of the same code by the same user.
    if (couponCode && couponDiscount > 0) {
      const inc = await client.query(
        `UPDATE coupons SET usage_count = usage_count + 1, updated_at = NOW()
         WHERE UPPER(code) = $1
           AND is_active = true
           AND (valid_until IS NULL OR valid_until > NOW())
           AND (usage_limit IS NULL OR usage_count < usage_limit)
         RETURNING id`,
        [couponCode]
      );
      if (inc.rows.length === 0) {
        await client.query('ROLLBACK');
        res.status(409).json({ success: false, message: 'This coupon is no longer available' });
        return;
      }

      try {
        await client.query(
          `INSERT INTO ${COUPON_REDEMPTIONS} (id, user_id, coupon_code, order_id, created_at)
           VALUES ($1, $2, $3, $4, NOW())`,
          [generateId(), req.userId, couponCode, orderId]
        );
      } catch (redeemErr: any) {
        if (redeemErr?.code === '23505') {
          await client.query('ROLLBACK');
          res.status(409).json({ success: false, message: 'You have already used this coupon' });
          return;
        }
        throw redeemErr;
      }
    }

    await client.query(`DELETE FROM ${CART} WHERE user_id = $1`, [req.userId]);

    // Notify customer — ONE "Order Placed" notification summarizing the whole
    // group (all items across every seller's sub-order), keyed on the group.
    const customerItems = cartResult.rows.map((i: any) => ({
      productId: i.product_id,
      productName: i.product_name,
      quantity: i.quantity,
      price: withMarkup(i.price),
      image: i.image || null,
    }));

    await client.query(
      `INSERT INTO notifications (id, user_id, title, message, type, data, is_read, created_at)
       VALUES ($1, $2, $3, $4, 'new_order', $5, false, (NOW() AT TIME ZONE 'Asia/Kolkata'))`,
      [
        generateId(),
        req.userId,
        `Order Confirmed: ${groupOrderNumber}`,
        `Your order ${groupOrderNumber} for ${customerItems.length} item(s) across ${subOrders.length} seller(s) has been placed. Total: ₹${finalAmount.toFixed(2)}`,
        JSON.stringify({
          orderId,
          orderNumber: groupOrderNumber,
          groupId,
          itemCount: customerItems.length,
          shipmentCount: subOrders.length,
          total: finalAmount,
          items: customerItems,
          shippingAddress: encryptedShippingAddress,
          paymentMethod,
        }),
      ]
    );

    // A prepaid order isn't a real order until the payment goes through: the
    // customer is still on the Razorpay sheet and may close it, in which case the
    // order is deleted (DELETE /:id/abandon). Telling the seller now means every
    // abandoned checkout buzzes their phone with an order that never existed —
    // exactly what the seller list's `unpaidPrepaid` filter already refuses to
    // show. So the seller is notified from payment verification instead
    // (utils/sellerOrderNotify). COD is genuinely unpaid-but-real: notify now.
    // Instant Delivery prepays its fee online even on COD, so that checkout also
    // goes through the payment sheet and also has something to cancel.
    const isCod = ['cod', 'cash', 'cash_on_delivery'].includes(
      String(effectivePaymentMethod || '').toLowerCase()
    );
    const notifySellersNow = isCod && !(isInstant && deliveryFee > 0);

    // Notify each seller about their own sub-order (its own id/number/total).
    for (const sub of notifySellersNow ? subOrders : []) {
      const itemNames = sub.items.map((i: any) => i.product_name).join(', ');
      // The seller is told THEIR money: the raw line-item total. `sub.finalAmount`
      // is what the customer was charged (tax, shipping and the ZPIN markup on
      // top) and must never reach a seller surface.
      const sellerTotal = round2(sub.items.reduce((s: number, i: any) => s + Number(i.price) * i.quantity, 0));
      await client.query(
        `INSERT INTO notifications (id, user_id, title, message, type, data, is_read, created_at)
         VALUES ($1, $2, $3, $4, 'new_order', $5, false, (NOW() AT TIME ZONE 'Asia/Kolkata'))`,
        [
          generateId(),
          sub.sellerId,
          `New Order: ${sub.orderNumber}`,
          `You have a new order for ${sub.items.length} item(s): ${itemNames}. Total: ₹${sellerTotal.toFixed(2)}`,
          JSON.stringify({
            orderId: sub.id,
            orderNumber: sub.orderNumber,
            groupId,
            itemCount: sub.items.length,
            total: sellerTotal,
            items: sub.items.map((i: any) => ({
              productId: i.product_id,
              productName: i.product_name,
              quantity: i.quantity,
              price: Number(i.price),
              image: i.image || null,
              // The seller has to know which size to pack.
              variant: i.variant || null,
            })),
            shippingAddress: encryptedShippingAddress,
            paymentMethod,
          }),
        ]
      );
    }

    await client.query('COMMIT');

    // Device push mirrors the notification rows written above — after COMMIT, so
    // a rolled-back order never buzzes anyone's phone. Not awaited (best-effort).
    sendPush(req.userId, `Order confirmed: ${groupOrderNumber}`,
      `Your order for ${customerItems.length} item(s) is placed. Total ₹${finalAmount.toFixed(2)}.`,
      { orderId, orderNumber: groupOrderNumber, groupId, type: 'order_update' });
    for (const sub of notifySellersNow ? subOrders : []) {
      sendPush(sub.sellerId, `New order: ${sub.orderNumber}`,
        `You have a new order for ${sub.items.length} item(s).`,
        { orderId: sub.id, orderNumber: sub.orderNumber, type: 'new_order' });
    }

    // Order confirmation email, same as the customer website. Prepaid orders are
    // mailed by razorpay/verify instead — an unpaid checkout gets deleted, and the
    // customer must not have been told it was confirmed in the meantime.
    if (notifySellersNow) sendOrderEmail(req.userId!, groupOrderNumber, subOrders.map((o) => o.id));

    // Invalidate user's order list and cart caches
    await Promise.all([
      cacheDelPattern(`user:${req.userId}:orders:*`),
      cacheDel(`user:${req.userId}:cart`),
    ]);

    res.status(201).json({
      success: true,
      message: 'Order placed successfully',
      data: {
        // `order` is the group as the customer sees it (ZP-<group>, group total).
        // id = primary sub-order — razorpay create-order/verify resolve the group
        // from it and charge/confirm every sub-order together.
        order: { id: orderId, orderNumber: groupOrderNumber, finalAmount, status: orderStatus, groupId },
        orders: subOrders.map((o) => ({
          id: o.id, orderNumber: o.orderNumber, sellerId: o.sellerId, finalAmount: o.finalAmount, groupId,
        })),
      },
    });
  } catch (err) {
    try {
      await client.query('ROLLBACK');
    } catch (rollbackErr) {
      logger.error('rollback_error', { error: (rollbackErr as any)?.message ?? String(rollbackErr) });
    }
    logger.error('createorder_error', { error: (err as any)?.message ?? String(err) });
    res.status(500).json({ success: false, message: 'Server error' });
  } finally {
    client.release();
  }
});

// Put units back in the SAME place checkout took them from: the product total
// AND, where the line carried a size, that size's own count. Every path that
// returns stock to the shelf (cancel, refund, return-to-seller, reclaim, trial
// door return) goes through here; restoring only `quantity` left
// size_quantities drained a little further with every returned parcel.
async function restockLine(client: any, productId: string | null, quantity: number, variant: string | null | undefined): Promise<void> {
  if (!productId) return;
  const qty = Math.max(1, Number(quantity) || 1);
  await client.query(
    `UPDATE products
     SET size_quantities = CASE
           WHEN $3::text IS NOT NULL AND size_quantities ? $3 THEN
             jsonb_set(size_quantities, ARRAY[$3::text],
               to_jsonb(COALESCE((size_quantities->>$3)::int, 0) + $1))
           ELSE size_quantities
         END,
         quantity = quantity + $1,
         in_stock = true,
         updated_at = NOW()
     WHERE id = $2`,
    [qty, productId, variant || null]
  );
}

// Standard delivery allows returns within this many days of placement. Must
// match STANDARD_RETURN_DAYS on the customer website — the two surfaces must not
// disagree about whether an order is still returnable.
const STANDARD_RETURN_DAYS = 7;

// POST /api/v1/orders/:id/return
router.post('/:id/return', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  const { orderItemIds, reason, description } = req.body;

  if (!reason) {
    res.status(400).json({ success: false, message: 'reason is required' });
    return;
  }

  // One transaction with the order row locked: two taps (or app + website at
  // once) used to each pass the "already open?" check and insert two returns.
  // Now the second waits on the lock and then finds the first one's return.
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Verify the order belongs to this user and is delivered
    const orderResult = await client.query(
      `SELECT id, status, final_amount, delivery_type, created_at
         FROM ${ORDERS} WHERE id = $1 AND user_id = $2 FOR UPDATE`,
      [req.params.id, req.userId]
    );

    if (orderResult.rows.length === 0) {
      await client.query('ROLLBACK');
      res.status(404).json({ success: false, message: 'Order not found' });
      return;
    }

    const order = orderResult.rows[0];

    // Instant Delivery is returned AT THE DOOR to the delivery agent (the trial
    // keep/return flow, POST /orders/:id/trial-selection). Letting a flash order
    // also reach this endpoint gave the customer a second bite: hand items back
    // at the door, then raise a pickup return on the same order. The customer
    // website has always refused this; the app must too.
    if (String(order.delivery_type || 'standard').toLowerCase() === 'flash') {
      await client.query('ROLLBACK');
      res.status(400).json({
        success: false,
        message: 'Instant Delivery orders are returned at the door to the delivery agent.',
      });
      return;
    }

    if (!['delivered', 'return_requested'].includes(order.status)) {
      await client.query('ROLLBACK');
      res.status(400).json({ success: false, message: 'Only delivered orders can be returned' });
      return;
    }

    // The 7-day return window, counted from order placement — the same rule and
    // the same wording the customer website enforces (STANDARD_RETURN_DAYS in
    // website-customer/backend/controllers/orderController.js). Without it the
    // app auto-approved returns on orders of any age and dispatched a partner
    // to collect them.
    const placedAt = new Date(order.created_at).getTime();
    if (Date.now() > placedAt + STANDARD_RETURN_DAYS * 24 * 60 * 60 * 1000) {
      await client.query('ROLLBACK');
      res.status(400).json({ success: false, message: 'The 7-day return window has closed.' });
      return;
    }

    const orderItems = (
      await client.query(
        `SELECT id, price, quantity FROM ${ORDER_ITEMS} WHERE order_id = $1`,
        [req.params.id]
      )
    ).rows;

    // A return that is ALREADY OPEN wins over every guard below. This lookup used
    // to sit after them, so a customer whose return already existed — a double
    // tap, a retry after a dropped response, or a return raised on the website a
    // moment earlier — got "Every item on this order has already been returned"
    // under a red "Return Failed" heading. Their return was fine; only the order
    // of the checks was wrong. Answer with the open return instead.
    const existingReturn = await client.query(
      `SELECT id, status, order_item_ids, created_at, updated_at
       FROM ${RETURN_REQUESTS}
       WHERE order_id = $1 AND user_id = $2 AND status IN ('requested', 'approved', 'picked_up')
       ORDER BY created_at DESC
       LIMIT 1`,
      [req.params.id, req.userId]
    );

    if (existingReturn.rows.length > 0) {
      const activeReturn = existingReturn.rows[0];
      await client.query('ROLLBACK');
      res.json({
        success: true,
        data: {
          returnId: activeReturn.id,
          status: activeReturn.status,
          message: 'A return is already in progress for this order.',
          // The amount owed on the return that already exists, not on this
          // request's selection — quoting final_amount here showed the customer
          // the whole order value for a single-item return.
          refundAmount: refundForLines(
            resolveReturnLines(activeReturn.order_item_ids, orderItems),
            withMarkup
          ).total,
          refundStatus: 'initiated',
          refundDisclaimer: RETURN_REFUND_DISCLAIMER,
        },
      });
      return;
    }

    // Units already spoken for by an earlier return on this order. A rejected
    // return gives its units back; every other state (requested/approved/
    // picked_up/refunded) is still holding them, so 2-of-5 followed by another
    // 4-of-5 must be refused rather than silently over-refunding.
    const priorReturns = await client.query(
      `SELECT order_item_ids FROM ${RETURN_REQUESTS}
       WHERE order_id = $1 AND status <> 'rejected'`,
      [req.params.id]
    );
    const alreadyReturned = tallyReturnedQuantities(priorReturns.rows, orderItems);

    // What is still returnable, per line. The customer-facing screens filter on
    // this too, but the check has to live here — the client is not the gate.
    const remainingItems = orderItems
      .map((i) => ({
        ...i,
        quantity: Math.max(0, Number(i.quantity) - (alreadyReturned.get(String(i.id)) || 0)),
      }))
      .filter((i) => i.quantity > 0);

    // Only reachable when every prior return is SETTLED (refunded) — an open one
    // was answered above — so this really is a finished order.
    if (remainingItems.length === 0) {
      await client.query('ROLLBACK');
      res.status(400).json({
        success: false,
        message: 'Every item on this order has already been returned and refunded.',
      });
      return;
    }

    // No selection = "everything still returnable". Anything selected is checked
    // against what's left, so a client cannot inflate a refund by asking for more
    // units than it bought (resolveReturnLines also clamps).
    const requested = Array.isArray(orderItemIds) ? orderItemIds : [];
    if (requested.length > 0) {
      const remainingById = new Map(remainingItems.map((i) => [String(i.id), i.quantity]));
      for (const line of parseReturnLines(requested)) {
        const left = remainingById.get(line.id);
        if (left === undefined) {
          await client.query('ROLLBACK');
          res.status(400).json({
            success: false,
            message: 'One of the selected items is not on this order, or has already been returned',
          });
          return;
        }
        if (line.quantity !== null && line.quantity > left) {
          await client.query('ROLLBACK');
          res.status(400).json({
            success: false,
            message: `You can return at most ${left} of that item`,
          });
          return;
        }
      }
    }

    const resolvedLines = resolveReturnLines(requested, remainingItems);
    if (resolvedLines.length === 0) {
      await client.query('ROLLBACK');
      res.status(400).json({ success: false, message: 'Select at least one item to return' });
      return;
    }

    // Refund only the units actually coming back. GST is refunded (recomputed at
    // the same 18% rate createOrder used); delivery_fee (the instant-delivery
    // charge) is never refunded, same policy as the trial keep/return flow.
    const refundAmount = refundForLines(resolvedLines, withMarkup).total;

    // Persist the concrete lines, never the raw client payload — one canonical
    // shape ({id, quantity}) for every downstream reader.
    const storedLines = resolvedLines.map((l) => ({ id: l.id, quantity: l.quantity }));

    // Insert into return_requests table
    const returnId = generateId();
    await client.query(
      `INSERT INTO ${RETURN_REQUESTS} (id, order_id, user_id, order_item_ids, reason, description, status, picked_up_at, refunded_at, status_history, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, 'approved', NULL, NULL, $7, NOW(), NOW())`,
      [
        returnId,
        req.params.id,
        req.userId,
        JSON.stringify(storedLines),
        reason,
        description || '',
        // Auto-approved on creation (2026-08-27): admin no longer rules on
        // returns, so the request lands straight in the delivery pickup pool.
        JSON.stringify([
          { status: 'requested', at: new Date().toISOString() },
          { status: 'approved', at: new Date().toISOString(), note: 'Auto-approved' },
        ]),
      ]
    );

    // Raise the refund claim support settles by hand. Same transaction as the
    // return itself: a return with no claim is a refund no admin will ever see.
    await raiseRefundClaim(client, returnId, req.userId!, refundAmount);

    // Update order status to 'return_requested'
    await client.query(
      `UPDATE ${ORDERS} SET status = 'return_requested', updated_at = NOW() WHERE id = $1`,
      [req.params.id]
    );
    await recordOrderStatus(client, req.params.id, 'return_requested', `Return requested: ${reason}`);
    await recordOrderStatus(client, req.params.id, 'return_requested', 'Return approved — pickup will be scheduled');

    // The seller learns a return is coming; the customer gets the inbox row.
    // Not awaited: a notification must never delay or fail the request.
    await client.query('COMMIT');
    void notifyReturnTransition(req.params.id, 'requested', reason);

    res.json({
      success: true,
      data: {
        returnId,
        status: 'approved',
        message: 'Return request initiated successfully',
        refundAmount,
        refundStatus: 'initiated',
        refundDisclaimer: RETURN_REFUND_DISCLAIMER,
      },
    });
  } catch (err) {
    try { await client.query('ROLLBACK'); } catch { /* connection already gone */ }
    logger.error('returnorder_error', { error: (err as any)?.message ?? String(err) });
    res.status(500).json({ success: false, message: 'Server error' });
  } finally {
    client.release();
  }
});

// PATCH /api/v1/orders/:id/return-status
router.patch('/:id/return-status', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  const nextStatus = String(req.body?.status || '').trim();
  // Free-text context for the customer: why a return was refused, which courier
  // collected it, which payout reference settled it. Stored on the history entry.
  const note = String(req.body?.note || '').trim().slice(0, 500);
  // Sent with a 'picked_up' transition by whoever physically handled the goods.
  // Ignored on every other transition.
  const itemCondition = String(req.body?.item_condition || '').trim().toLowerCase();

  if (itemCondition && !ITEM_CONDITIONS.includes(itemCondition)) {
    res.status(400).json({
      success: false,
      message: `item_condition must be one of: ${ITEM_CONDITIONS.join(', ')}`,
    });
    return;
  }

  if (!RETURN_STATUSES.includes(nextStatus)) {
    res.status(400).json({
      success: false,
      message: `status must be one of: ${RETURN_STATUSES.join(', ')}`,
    });
    return;
  }

  // Rejecting a return and settling a refund are money/trust decisions, so they
  // are admin-only. A delivery partner may only record the physical collection.
  // Sellers are read-only on returns by product decision (2026-08-12) — they see
  // the request but do not rule on it.
  const allowedRolesFor: Record<string, string[]> = {
    approved: ['admin'],
    rejected: ['admin'],
    picked_up: ['admin', 'delivery_partner'],
    refunded: ['admin'],
  };

  if (!allowedRolesFor[nextStatus].includes(String(req.userRole))) {
    res.status(403).json({ success: false, message: 'Forbidden' });
    return;
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Only admins and delivery partners reach this far (see allowedRolesFor
    // above), and both may act on any order, so there is no ownership filter.
    const orderCheck = await client.query(
      `SELECT id FROM ${ORDERS} WHERE id = $1`,
      [req.params.id]
    );
    if (orderCheck.rows.length === 0) {
      await client.query('ROLLBACK');
      res.status(404).json({ success: false, message: 'Order not found' });
      return;
    }

    // Lock the latest return-request row so concurrent status updates serialize
    // instead of racing on a read-modify-write of status_history.
    // SELECT * rather than a column list on purpose: item_condition is not on
    // prod yet (SCHEMA_CHANGES.md 2026-08-12), and `*` is the one form that
    // works before AND after the DDL. Its presence in the returned row is also
    // how the code below detects whether the column exists — no extra
    // information_schema round-trip per request.
    const returnResult = await client.query(
      `SELECT *
       FROM ${RETURN_REQUESTS}
       WHERE order_id = $1
       ORDER BY created_at DESC
       LIMIT 1
       FOR UPDATE`,
      [req.params.id]
    );

    if (returnResult.rows.length === 0) {
      await client.query('ROLLBACK');
      res.status(404).json({ success: false, message: 'Return request not found' });
      return;
    }

    const currentReturn = returnResult.rows[0];

    if (!RETURN_TRANSITIONS[currentReturn.status]?.includes(nextStatus)) {
      await client.query('ROLLBACK');
      res.status(400).json({ success: false, message: 'Invalid return status transition' });
      return;
    }

    // Undefined = the column is not on this database yet; null/'' = present but
    // never written. Only the first case may skip the gate.
    const hasItemCondition = currentReturn.item_condition !== undefined;
    const currentCondition = String(currentReturn.item_condition || 'pending');

    // The refund gate. A refund is only allowed once someone physically
    // inspected the goods and said they were acceptable. 'damaged' returns must
    // be rejected instead (picked_up -> rejected, see RETURN_TRANSITIONS);
    // 'pending' means nobody has looked yet. Enforced here rather than in the
    // admin UI so no client — admin website, curl, a future surface — can settle
    // a refund the delivery partner never cleared.
    if (nextStatus === 'refunded' && hasItemCondition && currentCondition !== 'ok') {
      await client.query('ROLLBACK');
      res.status(400).json({
        success: false,
        message: currentCondition === 'damaged'
          ? 'This return was collected damaged and cannot be refunded — reject it instead.'
          : 'The delivery partner has not confirmed the item condition yet.',
        data: { itemCondition: currentCondition },
      });
      return;
    }

    const now = new Date().toISOString();
    // Append the new entry atomically in SQL (status_history || $3) instead of
    // rewriting the whole array we read — under the row lock nothing is lost.
    const entry = JSON.stringify([
      {
        status: nextStatus,
        at: now,
        by: req.userId,
        role: req.userRole,
        ...(note ? { note } : {}),
        // Recorded on the history entry even when the column is missing, so the
        // partner's answer is never lost to a pending migration.
        ...(nextStatus === 'picked_up' && itemCondition ? { itemCondition } : {}),
        // The seller's confirmation code for the second leg (partner -> seller).
        // Minted here because 'picked_up' is the moment the goods start moving
        // towards the seller. Never served to the customer or the partner —
        // see sanitizeReturnHistory in utils/returnDropoff.ts.
        ...(nextStatus === 'picked_up' ? { dropoffOtp: generateDropoffOtp() } : {}),
      },
    ]);

    const updateFields: string[] = ['status = $2', 'status_history = status_history || $3::jsonb', 'updated_at = NOW()'];
    const values: any[] = [currentReturn.id, nextStatus, entry];

    if (nextStatus === 'picked_up') {
      updateFields.unshift('picked_up_at = NOW()');
      if (itemCondition && hasItemCondition) {
        values.push(itemCondition);
        updateFields.push(`item_condition = $${values.length}`);
      }
    }

    if (nextStatus === 'refunded') {
      updateFields.unshift('refunded_at = NOW()');
    }

    const updated = await client.query(
      `UPDATE ${RETURN_REQUESTS}
       SET ${updateFields.join(', ')}
       WHERE id = $1
       RETURNING status_history`,
      values
    );

    if (nextStatus === 'approved') {
      // Returns are auto-approved at creation (2026-08-27), so this path only
      // runs for a legacy row still sitting at 'requested' — it still has to
      // raise the claim, or that refund is invisible to support forever.
      const orderItems = (
        await client.query(
          `SELECT id, price, quantity FROM ${ORDER_ITEMS} WHERE order_id = $1`,
          [req.params.id]
        )
      ).rows;
      const approvedRefund = refundForLines(
        resolveReturnLines(currentReturn.order_item_ids, orderItems),
        withMarkup
      ).total;
      await raiseRefundClaim(client, currentReturn.id, currentReturn.user_id, approvedRefund);

      await recordOrderStatus(
        client,
        req.params.id,
        'return_requested',
        note ? `Return approved: ${note}` : 'Return approved — pickup will be scheduled'
      );
    }

    if (nextStatus === 'rejected') {
      // Nothing is owed any more — close the claim so it stops looking payable
      // in the admin Settlements queue.
      await voidRefundClaim(client, currentReturn.id, note ? `Return rejected: ${note}` : 'Return rejected');

      // A refused return leaves the order exactly as it was: delivered and paid.
      // Without this the customer is stranded on 'return_requested' forever.
      await client.query(
        `UPDATE ${ORDERS} SET status = 'delivered', updated_at = NOW() WHERE id = $1`,
        [req.params.id]
      );
      await recordOrderStatus(
        client,
        req.params.id,
        'delivered',
        note ? `Return rejected: ${note}` : 'Return rejected'
      );
    }

    if (nextStatus === 'picked_up') {
      await recordOrderStatus(
        client,
        req.params.id,
        'return_requested',
        note ? `Return picked up: ${note}` : 'Return picked up from customer'
      );
    }

    if (nextStatus === 'refunded') {
      const orderItems = (
        await client.query(
          `SELECT id, product_id, price, quantity, variant FROM ${ORDER_ITEMS} WHERE order_id = $1`,
          [req.params.id]
        )
      ).rows;

      // Exactly the units coming back on THIS return. An empty selection still
      // means the whole order (legacy rows), which resolveReturnLines expands.
      const settledLines = resolveReturnLines(currentReturn.order_item_ids, orderItems);

      // Every unit returned across all settled returns on this order — a line is
      // only 'is_returned' once its LAST unit is back, so a 2-of-5 return leaves
      // the other 3 returnable.
      const refundedRows = await client.query(
        `SELECT order_item_ids FROM ${RETURN_REQUESTS}
         WHERE order_id = $1 AND (status = 'refunded' OR id = $2)`,
        [req.params.id, currentReturn.id]
      );
      const returnedByItem = tallyReturnedQuantities(refundedRows.rows, orderItems);

      const fullyReturnedIds = orderItems
        .filter((i: any) => (returnedByItem.get(String(i.id)) || 0) >= Number(i.quantity))
        .map((i: any) => String(i.id));

      if (fullyReturnedIds.length > 0) {
        await client.query(
          `UPDATE ${ORDER_ITEMS} SET is_returned = true WHERE order_id = $1 AND id = ANY($2)`,
          [req.params.id, fullyReturnedIds]
        );
      }

      // The order is only 'returned'/'refunded' once every unit has come back. A
      // partial return leaves it delivered so the customer can still return the
      // rest and the order does not read as fully refunded.
      const fullyReturned = fullyReturnedIds.length === orderItems.length;
      await client.query(
        fullyReturned
          ? `UPDATE ${ORDERS} SET status = 'returned', payment_status = 'refunded', updated_at = NOW() WHERE id = $1`
          : `UPDATE ${ORDERS} SET status = 'delivered', updated_at = NOW() WHERE id = $1`,
        [req.params.id]
      );

      // Put the goods back on the shelf. Cancellation has always restocked;
      // returns never did, so every completed return silently shrank the
      // seller's sellable inventory. Restocking happens here rather than at
      // pickup because 'refunded' is the point at which the seller has actually
      // received the item back — the same promise the customer is shown.
      // Restock the RETURNED unit count, not the whole line: 2 of 5 puts 2 back.
      for (const line of settledLines) {
        await restockLine(client, (line.item as any).product_id, line.quantity, (line.item as any).variant);
      }

      await recordOrderStatus(
        client,
        req.params.id,
        fullyReturned ? 'returned' : 'delivered',
        note ? `Refund settled: ${note}` : 'Refund settled'
      );
    }

    await client.query('COMMIT');

    // AFTER COMMIT, deliberately: a rolled-back transition must not buzz a phone.
    // Every surface that advances a return proxies to this handler, so this one
    // call covers admin approvals/rejections/settlements and delivery pickups.
    void notifyReturnTransition(req.params.id, nextStatus as any, note || undefined);

    res.json({
      success: true,
      data: {
        orderId: req.params.id,
        returnId: currentReturn.id,
        status: nextStatus,
        // What the admin UI reads to decide whether to offer "Process Refund".
        itemCondition: nextStatus === 'picked_up' && itemCondition
          ? itemCondition
          : currentCondition,
        pickedUpAt: nextStatus === 'picked_up' ? now : currentReturn.picked_up_at,
        refundedAt: nextStatus === 'refunded' ? now : currentReturn.refunded_at,
        // Sanitised: the caller here is the admin website or the delivery
        // backend, and the drop-off OTP belongs to the seller alone.
        statusHistory: sanitizeReturnHistory(updated.rows[0].status_history),
      },
    });
  } catch (err) {
    try { await client.query('ROLLBACK'); } catch { /* ignore */ }
    logger.error('updatereturnstatus_error', { error: (err as any)?.message ?? String(err) });
    res.status(500).json({ success: false, message: 'Server error' });
  } finally {
    client.release();
  }
});

// PATCH /api/v1/orders/:id/return-dropoff
//
// The second leg of a return: the partner hands the collected goods back to the
// seller, who reads out the OTP minted at pickup. Separate from the status
// endpoint above because it does NOT move `return_requests.status` — it appends
// a `dropped_off` entry to status_history (see utils/returnDropoff.ts for why a
// sixth status is not an option here).
router.patch('/:id/return-dropoff', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  const otp = String(req.body?.otp ?? '').trim();
  const note = String(req.body?.note || '').trim().slice(0, 500);

  // Same gate as the pickup: the partner physically doing the handover, or an
  // admin correcting the record. Sellers stay read-only on returns.
  if (!['admin', 'delivery_partner'].includes(String(req.userRole))) {
    res.status(403).json({ success: false, message: 'Forbidden' });
    return;
  }
  if (!/^\d{6}$/.test(otp)) {
    res.status(400).json({ success: false, message: 'Enter the 6-digit code from the seller' });
    return;
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const returnResult = await client.query(
      `SELECT id, status, status_history
       FROM ${RETURN_REQUESTS}
       WHERE order_id = $1
       ORDER BY created_at DESC
       LIMIT 1
       FOR UPDATE`,
      [req.params.id]
    );
    if (returnResult.rows.length === 0) {
      await client.query('ROLLBACK');
      res.status(404).json({ success: false, message: 'Return request not found' });
      return;
    }

    const currentReturn = returnResult.rows[0];

    // Only a collected return can be handed over. 'refunded'/'rejected' are
    // already settled and 'approved' is still with the customer.
    if (currentReturn.status !== 'picked_up') {
      await client.query('ROLLBACK');
      res.status(400).json({ success: false, message: 'This return has not been collected yet' });
      return;
    }
    if (hasDroppedOff(currentReturn.status_history)) {
      await client.query('ROLLBACK');
      res.status(400).json({ success: false, message: 'This return was already handed to the seller' });
      return;
    }

    const expected = dropoffOtpFrom(currentReturn.status_history);
    if (!expected) {
      // Collected before this feature shipped: there is no code for the seller
      // to read out, and inventing one now would let anyone close the task.
      await client.query('ROLLBACK');
      res.status(409).json({
        success: false,
        message: 'No handover code exists for this return — contact ZPIN support to close it.',
      });
      return;
    }
    if (!otpMatches(expected, otp)) {
      await client.query('ROLLBACK');
      res.status(400).json({ success: false, message: 'Wrong code. Ask the seller to read it from their app again.' });
      return;
    }

    const now = new Date().toISOString();
    const updated = await client.query(
      `UPDATE ${RETURN_REQUESTS}
       SET status_history = status_history || $2::jsonb, updated_at = NOW()
       WHERE id = $1
       RETURNING status_history`,
      [
        currentReturn.id,
        JSON.stringify([
          { status: 'dropped_off', at: now, by: req.userId, role: req.userRole, ...(note ? { note } : {}) },
        ]),
      ]
    );

    await recordOrderStatus(
      client,
      req.params.id,
      'return_requested',
      note ? `Return handed to seller: ${note}` : 'Return handed back to the seller'
    );

    await client.query('COMMIT');

    void notifyReturnTransition(req.params.id, 'dropped_off', note || undefined);

    res.json({
      success: true,
      data: {
        orderId: req.params.id,
        returnId: currentReturn.id,
        status: currentReturn.status,
        droppedOffAt: now,
        statusHistory: sanitizeReturnHistory(updated.rows[0].status_history),
      },
    });
  } catch (err) {
    try { await client.query('ROLLBACK'); } catch { /* ignore */ }
    logger.error('returndropoff_error', { error: (err as any)?.message ?? String(err) });
    res.status(500).json({ success: false, message: 'Server error' });
  } finally {
    client.release();
  }
});

// PATCH /api/v1/orders/:id/delivery-return
//
// A failed delivery has run out of attempts (or was an instant order, which gets
// none) and the partner is bringing the goods back to the seller. This is NOT
// the customer-initiated return flow: no `return_requests` row exists, nothing
// was ever handed over, and the customer asked for nothing.
//
// It lives HERE rather than in the delivery backend for one reason: restocking is
// the single authoritative write that decides what a seller can sell. There are
// already five drifting copies of the return-line parser in this codebase; a
// sixth copy of the restock rules — on the one path that moves inventory without
// a human ever confirming it — is how sellers quietly lose stock. The delivery
// backend calls this with a service token (see Z-PinApp/backend/lib/ecomService.js).
//
// The refund is deliberately NOT issued here. `payment_status` is left untouched
// so a prepaid failed delivery lands in the admin queue as an explicit decision —
// the customer may have refused delivery in bad faith, and the delivery fee is
// not refundable on an instant order.
//
// What this DOES do is raise the flag: a prepaid order that turns around gets an
// explicit `refund_due` row in the shared history naming the amount at stake.
// Before this, a returned prepaid order was indistinguishable from a returned COD
// one and money sat unclaimed with nothing marking it. The row is a marker, NOT a
// payment: no gateway call, and `payment_status` is deliberately untouched (it has
// no CHECK constraint, so writing an invented value there would be accepted
// silently while every other surface tests for 'paid'/'refunded').
router.patch('/:id/delivery-return', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  const note = String(req.body?.note || '').trim().slice(0, 500);

  // WHO may turn a failed delivery around:
  //   delivery_partner — the partner returning the parcel (legacy direct path)
  //   admin            — correcting the record
  //   seller           — confirming the parcel physically arrived back
  //
  // The seller case is the normal path now. Restock used to fire the moment the
  // partner pressed "Return to seller", which credited stock the seller did not
  // yet have in their hands and left the partner blocked whenever this backend was
  // unreachable. The parcel now travels first and the seller confirms receipt, so
  // the stock count follows the goods instead of leading them.
  //
  // A seller may only confirm THEIR OWN order — checked below against seller_id,
  // once the row is loaded. Without that check this would be a self-serve restock
  // of anybody's order.
  const actorRole = String(req.userRole);
  if (!['admin', 'delivery_partner', 'seller'].includes(actorRole)) {
    res.status(403).json({ success: false, message: 'Forbidden' });
    return;
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // FOR UPDATE: two partners racing the same order, or a retry landing at the
    // same moment, must not both restock. The status guard below then rejects
    // whichever one arrives second.
    const orderResult = await client.query(
      `SELECT id, order_number, status, user_id, seller_id, delivery_type,
              payment_status, payment_method, final_amount, total_amount
       FROM ${ORDERS}
       WHERE id = $1
       FOR UPDATE`,
      [req.params.id]
    );
    if (orderResult.rows.length === 0) {
      await client.query('ROLLBACK');
      res.status(404).json({ success: false, message: 'Order not found' });
      return;
    }
    const order = orderResult.rows[0];

    // A seller confirms receipt of their own goods and nobody else's.
    if (actorRole === 'seller' && String(order.seller_id || '') !== String(req.userId || '')) {
      await client.query('ROLLBACK');
      res.status(403).json({ success: false, message: 'This is not your order' });
      return;
    }

    // Only a failed delivery turns around this way. Guarding on the status also
    // makes the call idempotent-safe: a retried HTTP request finds 'returned'
    // and cannot restock the same goods twice.
    if (order.status !== 'delivery_failed') {
      await client.query('ROLLBACK');
      res.status(409).json({
        success: false,
        message: order.status === 'returned'
          ? 'This order has already been returned to the seller'
          : 'Only a failed delivery can be returned to the seller',
      });
      return;
    }

    const itemsResult = await client.query(
      `SELECT id, product_id, quantity, variant FROM ${ORDER_ITEMS} WHERE order_id = $1`,
      [req.params.id]
    );

    // Nothing was ever delivered, so the WHOLE order comes back — unlike a
    // customer return, there are no kept lines and no partial quantities.
    for (const item of itemsResult.rows) {
      await restockLine(client, item.product_id, item.quantity, item.variant);
    }

    await client.query(
      `UPDATE ${ORDERS} SET status = 'returned', updated_at = NOW() WHERE id = $1`,
      [req.params.id]
    );

    await recordOrderStatus(
      client,
      req.params.id,
      'returned',
      note ? `Returned to seller after a failed delivery: ${note}` : 'Returned to seller after a failed delivery'
    );

    // Prepaid: the customer's money is with us and the goods are going back to
    // the seller. Flag it for the admin decision — deliberately not paid out here
    // (see the header comment): a refusal at the door can be bad faith, and on an
    // instant order the delivery fee is not refundable, so the amount owed is a
    // judgement call rather than arithmetic.
    const isPrepaid = String(order.payment_status || '').toLowerCase() === 'paid'
      && String(order.payment_method || '').toLowerCase() !== 'cod';
    if (isPrepaid) {
      const paid = Number(order.final_amount ?? order.total_amount ?? 0);
      await recordOrderStatus(
        client,
        req.params.id,
        'refund_due',
        `Prepaid order returned to the seller after a failed delivery. ₹${paid.toFixed(2)} was collected and is awaiting a refund decision. No money has been moved.`
      );
    }

    const isFlash = String(order.delivery_type || '').toLowerCase() === 'flash';
    const customerMessage = isFlash
      ? `Order ${order.order_number} has been returned to the seller. Instant delivery orders are not re-attempted, and the delivery charge is not refundable. Any remaining refund will be reviewed by our team.`
      : `Order ${order.order_number} could not be delivered after a second attempt and has been returned to the seller. Any refund due will be reviewed by our team.`;

    if (order.user_id) {
      await client.query(
        `INSERT INTO notifications (id, user_id, type, title, message, data, created_at)
         VALUES ($1,$2,'order_update',$3,$4,$5, NOW())`,
        [
          generateId(),
          order.user_id,
          `Order returned: ${order.order_number}`,
          customerMessage,
          JSON.stringify({ orderId: order.id, orderNumber: order.order_number, status: 'returned' }),
        ]
      );
    }
    // The seller's stock has just moved without them touching anything — they
    // need to know why the count changed and that the parcel is on its way back.
    if (order.seller_id) {
      await client.query(
        `INSERT INTO notifications (id, user_id, type, title, message, data, created_at)
         VALUES ($1,$2,'order_update',$3,$4,$5, NOW())`,
        [
          generateId(),
          order.seller_id,
          `Order returned to you: ${order.order_number}`,
          `Order ${order.order_number} could not be delivered and is coming back to you. The items have been added back to your stock automatically.`,
          JSON.stringify({ orderId: order.id, orderNumber: order.order_number, status: 'returned' }),
        ]
      );
    }

    await client.query('COMMIT');

    // After commit: a rolled-back turnaround must not buzz anyone's phone.
    sendPush(order.user_id, `Order returned: ${order.order_number}`, customerMessage,
      { orderId: order.id, orderNumber: order.order_number, status: 'returned' });
    sendPush(order.seller_id, `Order returned to you: ${order.order_number}`,
      `Order ${order.order_number} is coming back to you. Stock has been restored.`,
      { orderId: order.id, orderNumber: order.order_number, status: 'returned' });

    await cacheDel(`order:${req.params.id}`);

    res.json({
      success: true,
      data: {
        orderId: order.id,
        orderNumber: order.order_number,
        status: 'returned',
        restockedItems: itemsResult.rows.length,
        refundPending: true,
      },
    });
  } catch (err) {
    try { await client.query('ROLLBACK'); } catch { /* ignore */ }
    logger.error('deliveryreturn_error', { error: (err as any)?.message ?? String(err) });
    res.status(500).json({ success: false, message: 'Server error' });
  } finally {
    client.release();
  }
});

// GET /api/v1/orders/:id/return-status
router.get('/:id/return-status', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  try {

    const orderResult = await pool.query(
      `SELECT id, order_number, status, updated_at
       FROM ${ORDERS}
       WHERE id = $1 AND user_id = $2`,
      [req.params.id, req.userId]
    );

    if (orderResult.rows.length === 0) {
      res.status(404).json({ success: false, message: 'Order not found' });
      return;
    }

    const returnResult = await pool.query(
      `SELECT id, order_item_ids, reason, description, status, picked_up_at, refunded_at, status_history, created_at, updated_at
       FROM ${RETURN_REQUESTS}
       WHERE order_id = $1 AND user_id = $2
       ORDER BY created_at DESC
       LIMIT 1`,
      [req.params.id, req.userId]
    );

    if (returnResult.rows.length === 0) {
      res.status(404).json({ success: false, message: 'No return request found for this order' });
      return;
    }

    const rr = returnResult.rows[0];
    const order = orderResult.rows[0];

    const orderItems = (
      await pool.query(
        `SELECT id, product_name, price, quantity FROM ${ORDER_ITEMS} WHERE order_id = $1`,
        [req.params.id]
      )
    ).rows;
    const lines = resolveReturnLines(rr.order_item_ids, orderItems);
    const refund = refundForLines(lines, withMarkup);

    res.json({
      success: true,
      data: {
        returnId: rr.id,
        orderId: order.id,
        orderNumber: order.order_number,
        orderStatus: order.status,
        returnStatus: rr.status,
        reason: rr.reason,
        description: rr.description,
        // Which units are coming back, resolved — the raw column may hold bare
        // id strings (whole line) or {id, quantity} objects.
        returnItems: lines.map((l) => ({
          orderItemId: l.id,
          productName: (l.item as any).product_name,
          quantity: l.quantity,
          orderedQuantity: Number((l.item as any).quantity),
          price: withMarkup((l.item as any).price),
        })),
        refundAmount: refund.total,
        // Kept for older app builds that read the flat id list.
        orderItemIds: lines.map((l) => l.id),
        requestedAt: rr.created_at,
        updatedAt: rr.updated_at,
        pickedUpAt: rr.picked_up_at,
        refundedAt: rr.refunded_at,
        // Sanitised: this is the CUSTOMER's view of their own return, and the
        // drop-off OTP on the 'picked_up' entry is the seller's secret.
        statusHistory: sanitizeReturnHistory(rr.status_history),
        // Only promise a refund while one is still coming. A rejected return
        // owes the customer nothing, and a refunded one is already settled.
        refundDisclaimer: ['requested', 'approved', 'picked_up'].includes(rr.status)
          ? RETURN_REFUND_DISCLAIMER
          : null,
        // How the money actually reached them. Refunds are settled by hand from
        // the admin website (SETTLEMENTS_PLAN.md) — until now 'Refunded' was a
        // bare timestamp with no amount, mode or reference anywhere the
        // customer could see. null while the claim is still pending, or when
        // the settlements table is not on this database yet.
        settlement: await readRefundSettlement(pool, rr.id),
      },
    });
  } catch (err) {
    logger.error('getreturnstatus_error', { error: (err as any)?.message ?? String(err) });
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// PATCH /api/v1/orders/:id/cancel
// PATCH /api/v1/orders/:id/cancel-return
//
// The customer changes their mind about a return, before a delivery partner has
// collected the parcel. Recorded as 'rejected' rather than a sixth status: that
// is the one terminal value every reader already understands — it releases the
// units back to the returnable pool, takes the request out of the delivery
// pickup pool (which keys on 'approved'), and puts the order back to delivered.
router.patch('/:id/cancel-return', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const returnResult = await client.query(
      `SELECT id, status FROM ${RETURN_REQUESTS}
       WHERE order_id = $1 AND user_id = $2
       ORDER BY created_at DESC LIMIT 1
       FOR UPDATE`,
      [req.params.id, req.userId]
    );

    if (returnResult.rows.length === 0) {
      await client.query('ROLLBACK');
      res.status(404).json({ success: false, message: 'Return request not found' });
      return;
    }

    const current = returnResult.rows[0];
    // Once the goods have left the customer's hands the return is no longer
    // theirs to call off.
    if (!['requested', 'approved'].includes(current.status)) {
      await client.query('ROLLBACK');
      res.status(400).json({
        success: false,
        message: current.status === 'picked_up'
          ? 'This return has already been picked up and can no longer be cancelled.'
          : 'This return can no longer be cancelled.',
      });
      return;
    }

    await client.query(
      `UPDATE ${RETURN_REQUESTS}
       SET status = 'rejected',
           status_history = status_history || $2::jsonb,
           updated_at = NOW()
       WHERE id = $1`,
      [
        current.id,
        JSON.stringify([{
          status: 'rejected',
          at: new Date().toISOString(),
          by: req.userId,
          role: 'customer',
          note: 'Cancelled by the customer',
        }]),
      ]
    );

    // The customer called it off, so there is nothing to pay — take the claim
    // out of the admin Settlements queue.
    await voidRefundClaim(client, current.id, 'Cancelled by the customer');

    await client.query(
      `UPDATE ${ORDERS} SET status = 'delivered', updated_at = NOW() WHERE id = $1`,
      [req.params.id]
    );
    await recordOrderStatus(client, req.params.id, 'delivered', 'Return cancelled by the customer');

    await client.query('COMMIT');

    void notifyReturnTransition(req.params.id, 'rejected', 'Cancelled by the customer');

    res.json({ success: true, data: { orderId: req.params.id, returnId: current.id, status: 'rejected' } });
  } catch (err) {
    try { await client.query('ROLLBACK'); } catch { /* ignore */ }
    logger.error('cancelreturn_error', { error: (err as any)?.message ?? String(err) });
    res.status(500).json({ success: false, message: 'Server error' });
  } finally {
    client.release();
  }
});

router.patch('/:id/cancel', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  const { reason } = req.body;

  if (!reason || typeof reason !== 'string') {
    res.status(400).json({ success: false, message: 'reason is required' });
    return;
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Lock the order row and verify ownership + cancellable status
    const result = await client.query(
      `SELECT id, final_amount, payment_status, payment_method, prepaid_amount, payment_id
       FROM ${ORDERS}
       WHERE id = $1 AND user_id = $2 AND status IN ('pending','confirmed')
       FOR UPDATE`,
      [req.params.id, req.userId]
    );

    if (result.rows.length === 0) {
      await client.query('ROLLBACK');
      res.status(400).json({ success: false, message: 'Order cannot be cancelled' });
      return;
    }

    const order = result.rows[0];
    // Refund only what actually reached us. An instant+COD order is 'partial':
    // just the prepaid delivery fee was charged, never the whole final_amount.
    const wasPaid = order.payment_status === 'paid' || order.payment_status === 'partial';
    const refundAmount = order.payment_status === 'partial'
      ? Number(order.prepaid_amount || 0)
      : Number(order.final_amount);

    // payment_status is deliberately NOT touched here. It flips to 'refunded'
    // only after the gateway accepts the refund (below, after COMMIT) — writing
    // 'refunded' up front with no gateway call is how ₹ silently went missing.
    await client.query(
      `UPDATE ${ORDERS}
       SET status = 'cancelled', updated_at = NOW()
       WHERE id = $1`,
      [req.params.id]
    );
    await recordOrderStatus(client, req.params.id, 'cancelled', `Cancelled by customer: ${reason}`);

    // Restore inventory for each cancelled order item
    const cancelledItems = await client.query(
      `SELECT product_id, quantity, variant FROM ${ORDER_ITEMS} WHERE order_id = $1`,
      [req.params.id]
    );
    for (const item of cancelledItems.rows) {
      await restockLine(client, item.product_id, item.quantity, item.variant);
    }

    // Paid orders are always refunded to the original payment method. (The ZPIN
    // wallet was removed — no in-app stored-value refund destination.)
    await client.query(
      `INSERT INTO ${ORDER_CANCELLATIONS} (id, order_id, user_id, reason, refund_method, created_at)
       VALUES ($1, $2, $3, $4, 'original', NOW())`,
      [generateId(), req.params.id, req.userId, reason]
    );

    await client.query('COMMIT');

    // Refund outside the transaction — a gateway failure must not undo the
    // cancellation (stock is already back). A failed call leaves the row 'paid'
    // + cancelled with a "needs manual action" history line for support.
    let refundStatus: 'initiated' | 'failed' | 'not_applicable' = 'not_applicable';
    if (wasPaid && refundAmount > 0) {
      const ok = await issueGatewayRefund(order.id, order.payment_id, refundAmount, 'cancelled');
      if (ok) {
        await pool.query(`UPDATE ${ORDERS} SET payment_status = 'refunded', updated_at = NOW() WHERE id = $1`, [order.id]);
      }
      refundStatus = ok ? 'initiated' : 'failed';
    }

    res.json({
      success: true,
      data: {
        message: 'Order cancelled',
        refundAmount: wasPaid ? refundAmount : 0,
        refundStatus,
        refundMethod: 'original',
      },
    });
  } catch (err) {
    try { await client.query('ROLLBACK'); } catch { /* ignore */ }
    logger.error('cancelorder_error', { error: (err as any)?.message ?? String(err) });
    res.status(500).json({ success: false, message: 'Server error' });
  } finally {
    client.release();
  }
});

// How long an unpaid checkout may hold its stock before the sweep reclaims it.
// This is NOT a UI timeout — it is the outer bound on a real payment. A UPI
// app-switch is ~30-90s, a UPI collect request runs up to 5 min, and card 3DS /
// netbanking OTP pages routinely take 2-5 min. Razorpay's own order validity is
// 15 min. Reclaiming sooner than the gateway gives up would delete the order out
// from under a customer who then pays successfully — /razorpay/verify looks the
// order up by id and would answer 404 AFTER the money left their account. 30 min
// is deliberately past every one of those limits: stock is cheap, a charge with
// no order is not.
const STALE_CHECKOUT_MINUTES = 30;

// Undo everything a checkout consumed, for orders already SELECT ... FOR UPDATE'd
// by the caller inside an open transaction. Shared by the customer-initiated
// abandon route and the stale-checkout sweep so the two can never drift — a
// reclaim path that forgets one of these leaks stock, coupons or seller noise.
async function reclaimOrders(client: any, rows: any[]): Promise<string[]> {
  const ids = rows.map((o: any) => o.id);

  // Put back everything checkout took: product stock and flash-deal stock.
  const items = await client.query(
    `SELECT product_id, quantity, variant FROM ${ORDER_ITEMS} WHERE order_id = ANY($1)`,
    [ids]
  );
  for (const item of items.rows) {
    await restockLine(client, item.product_id, item.quantity, item.variant);
    await releaseDealStock(client, item.product_id, item.quantity);
  }

  // Release the coupon too — it was never actually used.
  const redeemed = await client.query(
    `DELETE FROM ${COUPON_REDEMPTIONS} WHERE order_id = ANY($1) RETURNING coupon_code`,
    [ids]
  );
  for (const r of redeemed.rows) {
    await client.query(
      `UPDATE coupons SET usage_count = GREATEST(usage_count - 1, 0), updated_at = NOW()
        WHERE UPPER(code) = UPPER($1)`,
      [r.coupon_code]
    );
  }

  // The "New Order" rows written to the customer and to each seller at checkout.
  // The seller's row carries its own sub-order id, the customer's carries the
  // group id (which is a separate id only for a genuinely multi-seller cart).
  const notifKeys = [...new Set([...ids, ...rows.map((o: any) => o.group_id).filter(Boolean)])];
  await client.query(
    `DELETE FROM notifications
      WHERE type = 'new_order'
        AND (data->>'orderId' = ANY($1) OR data->>'groupId' = ANY($1))`,
    [notifKeys]
  );
  await client.query(`DELETE FROM order_status_history WHERE order_id = ANY($1)`, [ids]);
  await client.query(`DELETE FROM ${ORDER_ITEMS} WHERE order_id = ANY($1)`, [ids]);
  await client.query(`DELETE FROM ${ORDERS} WHERE id = ANY($1)`, [ids]);

  return ids;
}

/** Group the sweep's candidate rows by checkout (group_id, or the row's own id). */
function groupCandidates(rows: any[]): any[][] {
  const byGroup = new Map<string, any[]>();
  for (const r of rows) {
    const key = String(r.group_id ?? r.id);
    byGroup.set(key, [...(byGroup.get(key) ?? []), r]);
  }
  return [...byGroup.values()];
}

/**
 * Reconcile one stale checkout against Razorpay. Returns true if money was found
 * (and the checkout settled, so the sweep must leave it alone), false if it was
 * genuinely never paid for.
 *
 * Fails CLOSED on any error: if Razorpay can't be reached we cannot prove the
 * checkout is unpaid, and keeping stock reserved for another 30 minutes is far
 * cheaper than deleting an order somebody paid for.
 */
async function rescuePaidCheckout(client: any, group: any[], settled: (() => Promise<void>)[]): Promise<boolean> {
  const ids = group.map((r: any) => r.id);
  try {
    const paid = await findPaidRazorpayPayment(ids);
    if (!paid) return false;

    // Same replay guard as verify — a payment id already bound to another order
    // means something is wrong; leave the rows alone for a human rather than
    // settling them twice.
    const dup = await client.query(
      `SELECT id FROM ${ORDERS} WHERE payment_id = $1 AND NOT (id = ANY($2))`,
      [paid.paymentId, ids]
    );
    if (dup.rows.length > 0) {
      logger.warn('sweepstalecheckouts_payment_id_reused', { ids, paymentId: paid.paymentId });
      return true;
    }

    const rows = (await client.query(
      `SELECT id, group_id, user_id, order_number, final_amount, payment_status, status,
              payment_method, delivery_type, delivery_fee, is_trial
         FROM ${ORDERS} WHERE id = ANY($1) ORDER BY id`,
      [ids]
    )).rows;
    if (rows.length === 0) return true;

    const { groupTotal, paidOrderIds } = await settleGroupPayment(
      client, rows[0].user_id, rows[0], rows, paid.paymentId
    );
    logger.warn('sweepstalecheckouts_rescued_paid_order', {
      ids, paymentId: paid.paymentId, amountPaise: paid.amountPaise,
    });
    // Side effects must not fire until the caller COMMITs, so hand them back.
    settled.push(() => afterSettle(client, rows[0].user_id, rows[0], paidOrderIds, groupTotal, paid.paymentId));
    return true;
  } catch (err: any) {
    logger.warn('sweepstalecheckouts_reconcile_failed', { ids, error: err?.message });
    return true; // fail closed — never delete what we could not prove unpaid
  }
}

/**
 * Reclaim checkouts that took stock and then went silent. The frontend calls
 * DELETE /:id/abandon when the customer closes the Razorpay sheet, but that call
 * dies with the app — force-quit, killed process, dropped network — and the stock
 * those orders decremented stays reserved for an order nobody will ever pay for.
 *
 * Lazy sweep rather than a scheduler, matching finalizeExpiredTrials above: the
 * only party harmed by stock sitting reserved is someone trying to buy that item,
 * and they necessarily run one of the call sites. Nobody buying = nobody harmed.
 */
async function sweepStaleCheckouts(): Promise<void> {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    // Same fail-closed predicate as /abandon — pending+unpaid and online-paid, so
    // anything paid, partial, confirmed or plain COD is untouchable — plus an age
    // bound. created_at is written as (NOW() AT TIME ZONE 'Asia/Kolkata'), so the
    // cutoff MUST be built from that same expression; comparing it against a bare
    // NOW() would read every order as 5h30m in the future and silently sweep
    // nothing. SKIP LOCKED so a concurrent checkout or verify is never blocked.
    const stale = await client.query(
      `SELECT id, group_id FROM ${ORDERS}
        WHERE status = 'pending'
          AND payment_status = 'pending'
          AND created_at < (NOW() AT TIME ZONE 'Asia/Kolkata') - ($1 || ' minutes')::interval
          AND (
            LOWER(COALESCE(payment_method, '')) NOT IN ('cod', 'cash', 'cash_on_delivery')
            OR (delivery_type = 'flash' AND COALESCE(delivery_fee, 0) > 0)
          )
        FOR UPDATE SKIP LOCKED`,
      [String(STALE_CHECKOUT_MINUTES)]
    );

    if (stale.rows.length === 0) {
      await client.query('ROLLBACK');
      return;
    }

    // A checkout that was actually paid for looks EXACTLY like an abandoned one
    // when /razorpay/verify never got to run (app killed, network dropped on the
    // way back). Deleting it would leave a real charge with no order. Razorpay is
    // the only party that knows the difference, so every candidate group is
    // reconciled against it before anything is deleted — and a group it says was
    // paid is settled here, exactly as verify would have.
    const survived = new Set<string>();
    const settled: (() => Promise<void>)[] = [];
    for (const group of groupCandidates(stale.rows)) {
      const rescued = await rescuePaidCheckout(client, group, settled);
      if (rescued) group.forEach((r: any) => survived.add(r.id));
    }
    const toReclaim = stale.rows.filter((r: any) => !survived.has(r.id));

    const ids = toReclaim.length > 0 ? await reclaimOrders(client, toReclaim) : [];
    await client.query('COMMIT');
    logger.info('sweepstalecheckouts_reclaimed', { count: ids.length, rescued: survived.size });
    for (const notify of settled) {
      await notify().catch((e: any) => logger.warn('sweepstalecheckouts_notify_failed', { error: e?.message }));
    }
  } catch (err: any) {
    try { await client.query('ROLLBACK'); } catch { /* ignore */ }
    // Best-effort, exactly like finalizeExpiredTrials: a failed sweep must never
    // fail the request that triggered it.
    logger.warn('sweepstalecheckouts_failed', { error: err?.message });
  } finally {
    client.release();
  }
}

// DELETE /api/v1/orders/:id/abandon — the customer closed/failed the Razorpay
// sheet, so the order was never paid for. Cancelling it (what we used to do) left
// a real row behind that every seller saw in the vendor app as a cancelled order.
// An order nobody ever paid for and no seller ever acted on has no accounting
// value, so it is deleted outright and everything it consumed is put back.
//
// Fail-closed by construction: the WHERE clause only ever matches the caller's own
// rows that are still status='pending' AND payment_status='pending' AND had an
// online step to cancel (not COD, or COD-but-Instant which prepays its fee) —
// i.e. provably untouched and unpaid. Anything paid, partially paid, confirmed or
// plain COD falls through to the normal /cancel path and is left alone.
router.delete('/:id/abandon', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // A checkout is one group. Delete every sub-order in it, not just the primary
    // id the payment sheet referenced — otherwise a multi-seller cart leaves the
    // other sellers' rows sitting unpaid in their app forever.
    const orders = await client.query(
      `SELECT id, group_id FROM ${ORDERS}
        WHERE user_id = $2
          AND group_id = (SELECT group_id FROM ${ORDERS} WHERE id = $1 AND user_id = $2)
          AND status = 'pending'
          AND payment_status = 'pending'
          AND (
            LOWER(COALESCE(payment_method, '')) NOT IN ('cod', 'cash', 'cash_on_delivery')
            -- Instant Delivery prepays its ₹50 fee online even on COD, so an
            -- instant COD order also went through the payment sheet. Still
            -- payment_status='pending' means that prepay never succeeded, so
            -- there is nothing real here either. (A successful prepay leaves
            -- 'partial' + prepaid_amount, which this can never match.)
            OR (delivery_type = 'flash' AND COALESCE(delivery_fee, 0) > 0)
          )
        FOR UPDATE`,
      [req.params.id, req.userId]
    );

    if (orders.rows.length === 0) {
      await client.query('ROLLBACK');
      res.status(400).json({ success: false, message: 'Order cannot be abandoned' });
      return;
    }

    const ids = await reclaimOrders(client, orders.rows);

    await client.query('COMMIT');
    await cacheDelPattern(`user:${req.userId}:orders:*`);

    res.json({ success: true, data: { message: 'Order discarded', deleted: ids.length } });
  } catch (err) {
    try { await client.query('ROLLBACK'); } catch { /* ignore */ }
    logger.error('abandonorder_error', { error: (err as any)?.message ?? String(err) });
    res.status(500).json({ success: false, message: 'Server error' });
  } finally {
    client.release();
  }
});

// POST /api/v1/orders/:id/trial-selection — Phase 9A
// The customer's keep/return answer for an Instant Delivery "try first" order,
// within the 15-minute window the partner's /pickup opened. Body:
//   { returnItemIds: string[] }   // order_items.id the customer is sending back
// Everything not listed is kept. Recomputes the order's money on the kept items
// and hands the order to the partner as 'awaiting_collection'.
router.post('/:id/trial-selection', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  const returnItemIds: string[] = Array.isArray(req.body?.returnItemIds)
    ? req.body.returnItemIds.map(String)
    : [];

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Lock the order so a concurrent second submit (or the lazy timeout sweep)
    // can't finalise it twice.
    const orderResult = await client.query(
      `SELECT id, order_number, user_id, status, is_trial, trial_expires_at, total_amount,
              shipping_amount, tax_amount, final_amount, delivery_fee, prepaid_amount,
              payment_id, payment_status
         FROM ${ORDERS} WHERE id = $1 AND user_id = $2 FOR UPDATE`,
      [req.params.id, req.userId]
    );
    if (orderResult.rows.length === 0) {
      await client.query('ROLLBACK');
      res.status(404).json({ success: false, message: 'Order not found' });
      return;
    }
    const order = orderResult.rows[0];
    if (!order.is_trial || order.status !== 'trial_pending') {
      await client.query('ROLLBACK');
      res.status(409).json({ success: false, message: 'This order is not awaiting a trial selection' });
      return;
    }
    if (order.trial_expires_at && new Date(order.trial_expires_at) < new Date()) {
      await client.query('ROLLBACK');
      res.status(409).json({ success: false, message: 'The 15-minute trial window has closed — all items were kept.' });
      return;
    }

    const itemsResult = await client.query(
      `SELECT id, product_id, product_name, quantity, price, variant FROM ${ORDER_ITEMS} WHERE order_id = $1`,
      [order.id]
    );
    const returnSet = new Set(returnItemIds);
    const unknown = returnItemIds.filter((id) => !itemsResult.rows.some((r: any) => r.id === id));
    if (unknown.length) {
      await client.query('ROLLBACK');
      res.status(400).json({ success: false, message: 'Unknown item in selection' });
      return;
    }

    await client.query(
      `UPDATE ${ORDER_ITEMS} SET is_returned = (id = ANY($2)) WHERE order_id = $1`,
      [order.id, returnItemIds]
    );

    // Returned goods go straight back on the shelf — the partner is carrying them.
    for (const item of itemsResult.rows.filter((r: any) => returnSet.has(r.id))) {
      await restockLine(client, item.product_id, item.quantity, item.variant);
    }

    // Money, on the customer-charged (marked-up) prices — same basis createOrder used.
    const round2 = (n: number) => Math.round(n * 100) / 100;
    const keptSubtotal = round2(
      itemsResult.rows
        .filter((r: any) => !returnSet.has(r.id))
        .reduce((s: number, r: any) => s + withMarkup(r.price) * r.quantity, 0)
    );
    const originalSubtotal = Number(order.total_amount) || 0;
    const shipping = Number(order.shipping_amount) || 0;
    const fee = Number(order.delivery_fee) || 0;
    const prepaid = Number(order.prepaid_amount) || 0;
    // Any coupon discount is implicit in the original final_amount; keep it in
    // proportion to what the customer actually kept.
    const originalDiscount = Math.max(
      0,
      round2(originalSubtotal + shipping + Number(order.tax_amount || 0) + fee - Number(order.final_amount || 0))
    );
    const keptRatio = originalSubtotal > 0 ? keptSubtotal / originalSubtotal : 0;
    const newDiscount = round2(originalDiscount * keptRatio);
    const newTax = Math.round(keptSubtotal * 0.18);
    // Delivery is charged even on a full return — the fee is non-refundable and
    // was what the customer prepaid.
    const newFinal = Math.max(0, round2(keptSubtotal + shipping + newTax + fee - newDiscount));
    // Positive → the partner collects it. Negative → we owe the customer money
    // back (they kept less than the fee they prepaid).
    const dueAtDoor = round2(newFinal - prepaid);
    const refundAmount = dueAtDoor < 0 ? round2(-dueAtDoor) : 0;

    await client.query(
      `UPDATE ${ORDERS}
          SET status = 'awaiting_collection', trial_expires_at = NULL,
              total_amount = $2, tax_amount = $3, final_amount = $4, updated_at = NOW()
        WHERE id = $1`,
      [order.id, keptSubtotal, newTax, newFinal]
    );

    await recordOrderStatus(
      client,
      order.id,
      'awaiting_collection',
      `Trial selection confirmed — ${itemsResult.rows.length - returnSet.size} item(s) kept, ${returnSet.size} returned. ` +
        (refundAmount > 0 ? `Refund due ₹${refundAmount.toFixed(2)}.` : `₹${Math.max(0, dueAtDoor).toFixed(2)} to collect.`)
    );

    await client.query(
      `INSERT INTO notifications (id, user_id, type, title, message, data, created_at)
       VALUES ($1,$2,'order_update',$3,$4,$5, NOW())`,
      [
        generateId(),
        order.user_id,
        `Selection confirmed: ${order.order_number}`,
        refundAmount > 0
          ? `We'll refund ₹${refundAmount.toFixed(2)} to your original payment method.`
          : `Please pay ₹${Math.max(0, dueAtDoor).toFixed(2)} to the delivery partner.`,
        JSON.stringify({ orderId: order.id, orderNumber: order.order_number, status: 'awaiting_collection', dueAtDoor, refundAmount }),
      ]
    );

    await client.query('COMMIT');

    sendPush(order.user_id, `Selection confirmed: ${order.order_number}`,
      refundAmount > 0
        ? `We'll refund ₹${refundAmount.toFixed(2)} to your original payment method.`
        : `Please pay ₹${Math.max(0, dueAtDoor).toFixed(2)} to the delivery partner.`,
      { orderId: order.id, orderNumber: order.order_number, status: 'awaiting_collection' });

    // Refund outside the transaction — a gateway failure must not undo the
    // customer's selection. It is retried by support, not silently swallowed.
    if (refundAmount > 0) {
      await issueGatewayRefund(order.id, order.payment_id, refundAmount, 'awaiting_collection');
    }

    res.json({
      success: true,
      data: {
        orderId: order.id,
        status: 'awaiting_collection',
        finalAmount: newFinal,
        prepaidAmount: prepaid,
        dueAtDoor: Math.max(0, dueAtDoor),
        refundAmount,
        keptItemIds: itemsResult.rows.filter((r: any) => !returnSet.has(r.id)).map((r: any) => r.id),
      },
    });
  } catch (err) {
    try { await client.query('ROLLBACK'); } catch { /* ignore */ }
    logger.error('trialselection_error', { error: (err as any)?.message ?? String(err) });
    res.status(500).json({ success: false, message: 'Server error' });
  } finally {
    client.release();
  }
});

// Refund `amount` back to the card/UPI that paid for the order — used by the
// customer cancel flow and the trial over-payment. Logged either way — a failed
// gateway call leaves an auditable "needs manual action" history row rather than
// a silent loss. `historyStatus` is the order status the history line sits under.
async function issueGatewayRefund(orderId: string, paymentId: string | null, amount: number, historyStatus: string): Promise<boolean> {
  try {
    if (!paymentId) throw new Error('order has no payment_id to refund against');
    if (!process.env.RAZORPAY_KEY_ID || !process.env.RAZORPAY_KEY_SECRET) {
      throw new Error('Razorpay credentials not configured');
    }
    const Razorpay = require('razorpay');
    const rzp = new Razorpay({
      key_id: process.env.RAZORPAY_KEY_ID,
      key_secret: process.env.RAZORPAY_KEY_SECRET,
    });
    await rzp.payments.refund(paymentId, { amount: Math.round(amount * 100), speed: 'normal' });
    await recordOrderStatus(null, orderId, historyStatus, `Refund of ₹${amount.toFixed(2)} issued to the original payment method`);
    return true;
  } catch (err: any) {
    logger.error('issuegatewayrefund_failed', { orderId, amount, error: err?.message });
    await recordOrderStatus(null, orderId, historyStatus, `Refund of ₹${amount.toFixed(2)} FAILED (${err?.message}) — needs manual action`)
      .catch(() => { /* history is best-effort */ });
    return false;
  }
}

// PATCH /api/v1/orders/:id/confirm — Vendor accepts the order
router.patch('/:id/confirm', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  // Allow-list, not a deny-list: only the seller (own orders) and admin confirm.
  // A delivery or any other service token has no business here.
  if (!['admin', 'seller'].includes(String(req.userRole))) {
    res.status(403).json({ success: false, message: 'Forbidden' });
    return;
  }

  try {
    // Sellers may only confirm orders that contain their own products.
    // Admins may confirm any order.
    if (req.userRole === 'seller') {
      const ownershipCheck = await pool.query(
        `SELECT DISTINCT o.id
         FROM ${ORDERS} o
         JOIN ${ORDER_ITEMS} oi ON oi.order_id = o.id
         JOIN products p ON p.id = oi.product_id
         WHERE o.id = $1 AND p.user_id = $2 AND o.status = 'pending'`,
        [req.params.id, req.userId]
      );
      if (ownershipCheck.rows.length === 0) {
        res.status(404).json({ success: false, message: 'Order not found or cannot be confirmed' });
        return;
      }
    }

    const result = await pool.query(
      `UPDATE ${ORDERS}
       SET status = 'confirmed', updated_at = NOW()
       WHERE id = $1 AND status = 'pending'
       RETURNING id, order_number, status, user_id`,
      [req.params.id]
    );

    if (result.rows.length === 0) {
      res.status(400).json({ success: false, message: 'Order not found or cannot be confirmed' });
      return;
    }

    const order = result.rows[0];

    await recordOrderStatus(null, order.id, 'confirmed', 'Order accepted by seller');

    // Notify the customer
    await pool.query(
      `INSERT INTO notifications (id, user_id, type, title, message, data, created_at)
       VALUES ($1,$2,'order_update',$3,$4,$5, NOW())`,
      [
        generateId(),
        order.user_id,
        `Order Confirmed: ${order.order_number}`,
        `Your order ${order.order_number} has been accepted and is being prepared.`,
        JSON.stringify({ orderId: order.id, orderNumber: order.order_number, status: 'confirmed' }),
      ]
    );

    sendPush(order.user_id, `Order confirmed: ${order.order_number}`,
      `Your order ${order.order_number} has been accepted and is being prepared.`,
      { orderId: order.id, orderNumber: order.order_number, status: 'confirmed' });

    res.json({
      success: true,
      data: { orderId: order.id, orderNumber: order.order_number, status: 'confirmed' },
      message: 'Order confirmed successfully',
    });
  } catch (err) {
    logger.error('confirmorder_error', { error: (err as any)?.message ?? String(err) });
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

export default router;

