import { Response, Router } from 'express';
import { pool } from '../db';
import { authenticate, AuthRequest } from '../middleware/auth';
import { orderCreateLimiter } from '../middleware/rateLimits';
import { decryptAddressPayload, encryptAddressPayload } from '../utils/encryption';
import { consumeDealStock, liveDealPrices } from '../utils/flashDeals';
import { generateId } from '../utils/id';
import { recordOrderStatus } from '../utils/orderHistory';
import { markupItems, withMarkup } from '../utils/pricing';
import { cacheDel, cacheDelPattern } from '../utils/redis';
import { safeIdentifier } from '../utils/sql';
import { logger } from '../utils/logger';

const router = Router();
const ORDERS = safeIdentifier('orders');
const ORDER_ITEMS = safeIdentifier('order_items');
const CART = safeIdentifier('cart_items');
const ADDRESSES = safeIdentifier('addresses');
const RETURN_REQUESTS = safeIdentifier('return_requests');
const ORDER_CANCELLATIONS = safeIdentifier('order_cancellations');
const COUPON_REDEMPTIONS = safeIdentifier('coupon_redemptions');

let supportTablesReady = false;

export async function ensureOrderSupportTables() {
  if (supportTablesReady) return;

  try {
    await pool.query(
      `CREATE TABLE IF NOT EXISTS ${RETURN_REQUESTS} (
        id VARCHAR(7) PRIMARY KEY,
        order_id VARCHAR(7) NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
        user_id VARCHAR(7) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        order_item_ids JSONB NOT NULL DEFAULT '[]'::jsonb,
        reason TEXT NOT NULL,
        description TEXT,
        status VARCHAR(50) NOT NULL DEFAULT 'requested',
        created_at TIMESTAMP NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMP NOT NULL DEFAULT NOW()
      )`
    );
    await pool.query(
      `CREATE INDEX IF NOT EXISTS idx_return_requests_order_id ON ${RETURN_REQUESTS}(order_id)`
    );
    await pool.query(
      `CREATE INDEX IF NOT EXISTS idx_return_requests_user_id ON ${RETURN_REQUESTS}(user_id)`
    );

    // Wrap each ALTER TABLE in its own try/catch — column may already exist
    const alterColumns = [
      `ALTER TABLE ${RETURN_REQUESTS} ADD COLUMN IF NOT EXISTS picked_up_at TIMESTAMP`,
      `ALTER TABLE ${RETURN_REQUESTS} ADD COLUMN IF NOT EXISTS refunded_at TIMESTAMP`,
      `ALTER TABLE ${RETURN_REQUESTS} ADD COLUMN IF NOT EXISTS status_history JSONB DEFAULT '[]'::jsonb`,
      // Multi-seller split: one checkout = one group_id shared by every seller's
      // sub-order row (NULL for legacy pre-split orders = a group of one).
      `ALTER TABLE ${ORDERS} ADD COLUMN IF NOT EXISTS group_id VARCHAR(7)`,
      // Phase 9A — Instant Delivery "try first". is_trial marks the order at
      // checkout; trial_expires_at is stamped by the delivery backend at /pickup
      // and is the deadline for the customer's keep/return selection.
      // order_items.is_returned records that per-item choice.
      `ALTER TABLE ${ORDERS} ADD COLUMN IF NOT EXISTS is_trial BOOLEAN NOT NULL DEFAULT false`,
      `ALTER TABLE ${ORDERS} ADD COLUMN IF NOT EXISTS trial_expires_at TIMESTAMP`,
      `ALTER TABLE ${ORDER_ITEMS} ADD COLUMN IF NOT EXISTS is_returned BOOLEAN NOT NULL DEFAULT false`,
      // Phase 11 — the size a line was bought in. Shared with the website, which
      // writes the same column (it calls it `selected_size` in its cart payload).
      `ALTER TABLE ${CART} ADD COLUMN IF NOT EXISTS variant VARCHAR(50)`,
      `ALTER TABLE ${ORDER_ITEMS} ADD COLUMN IF NOT EXISTS variant VARCHAR(255)`,
    ];
    for (const sql of alterColumns) {
      try {
        await pool.query(sql);
      } catch (alterErr: any) {
        // Ignore "column already exists" errors (code 42701)
        if (alterErr?.code !== '42701') {
          logger.warn('ensureordersupporttables_alter_warning', { error: alterErr?.message });
        }
      }
    }
    await pool.query(
      `CREATE INDEX IF NOT EXISTS idx_orders_group_id ON ${ORDERS}(group_id)`
    );

    await pool.query(
      // order_id/user_id are 36 wide: website orders carry uuid ids and users.id
      // is VARCHAR(36). The prod table was widened from 7 in parity Phase 12.
      `CREATE TABLE IF NOT EXISTS ${ORDER_CANCELLATIONS} (
        id VARCHAR(7) PRIMARY KEY,
        order_id VARCHAR(36) NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
        user_id VARCHAR(36) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        reason TEXT NOT NULL,
        refund_method VARCHAR(50) NOT NULL DEFAULT 'original',
        created_at TIMESTAMP NOT NULL DEFAULT NOW()
      )`
    );
    await pool.query(
      `CREATE INDEX IF NOT EXISTS idx_order_cancellations_order_id ON ${ORDER_CANCELLATIONS}(order_id)`
    );

    // Records each coupon redemption so a coupon can be enforced as single-use
    // per user. user_id/order_id are TEXT (not FK) so this survives the legacy
    // prod schema divergence where those id columns may differ in type.
    // ponytail: single redemption per (user, code). Add a per_user_limit column
    // on coupons if a coupon ever needs to be reusable by the same user.
    await pool.query(
      `CREATE TABLE IF NOT EXISTS ${COUPON_REDEMPTIONS} (
        id          VARCHAR(7)  PRIMARY KEY,
        user_id     TEXT        NOT NULL,
        coupon_code TEXT        NOT NULL,
        order_id    TEXT,
        created_at  TIMESTAMP   NOT NULL DEFAULT NOW(),
        UNIQUE (user_id, coupon_code)
      )`
    );

    supportTablesReady = true;
  } catch (err: any) {
    logger.error('ensureordersupporttables_failed', { error: err?.message });
    throw err;
  }
}

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

    const pickedUpEvent = history.find((event: any) => event.status === 'picked_up');
    if (pickedUpEvent || returnRequest.picked_up_at) {
      steps.push({
        status: 'picked_up',
        title: 'Return picked up',
        timestamp: pickedUpEvent?.at || returnRequest.picked_up_at,
      });
    }

    const refundedEvent = history.find((event: any) => event.status === 'refunded');
    if (refundedEvent || returnRequest.refunded_at) {
      steps.push({
        status: 'refunded',
        title: 'Refunded',
        timestamp: refundedEvent?.at || returnRequest.refunded_at,
      });
    } else {
      steps.push({
        status: returnRequest.status,
        title: `Return ${String(returnRequest.status).replace(/_/g, ' ')}`,
        timestamp: returnRequest.updated_at,
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
    isTrial: !!row.is_trial,
    trialExpiresAt: row.trial_expires_at ?? null,
    trialSecondsLeft: row.trial_seconds_left != null ? Math.round(Number(row.trial_seconds_left)) : null,
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
  const limit = Number(req.query.limit) || 20;
  const offset = (page - 1) * limit;

  try {
    await finalizeExpiredTrials();
    const countResult = await pool.query(
      `SELECT COUNT(*) FROM ${ORDERS} WHERE user_id = $1 AND NOT (status = 'pending' AND payment_status = 'pending')`,
      [req.userId]
    );
    const total = Number(countResult.rows[0].count);

    const result = await pool.query(
      `SELECT o.*,
        COALESCE(json_agg(json_build_object(
              'orderItemId', oi.id,
          'productName', oi.product_name,
          'quantity', oi.quantity,
          'price', oi.price,
          'image', oi.image,
          'variant', oi.variant,
          'isReturned', oi.is_returned
        )) FILTER (WHERE oi.id IS NOT NULL), '[]') as items
       FROM ${ORDERS} o
       LEFT JOIN ${ORDER_ITEMS} oi ON oi.order_id = o.id
       WHERE o.user_id = $1 AND NOT (o.status = 'pending' AND o.payment_status = 'pending')
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
        COALESCE(json_agg(json_build_object(
              'orderItemId', oi.id,
          'productName', oi.product_name,
          'quantity', oi.quantity,
          'price', oi.price,
          'image', oi.image,
          'productId', oi.product_id,
          'isReturned', oi.is_returned
        )) FILTER (WHERE oi.id IS NOT NULL), '[]') as items
       FROM ${ORDERS} o
       LEFT JOIN ${ORDER_ITEMS} oi ON oi.order_id = o.id
       WHERE o.id = $1 AND o.user_id = $2
       GROUP BY o.id`,
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
    await ensureOrderSupportTables();

    // delivery_status / delivery_boy_id are written by the delivery backend on the
    // shared orders table (accepted → picked_up → delivered). The cheap LEFT JOIN
    // surfaces the assigned courier's real name/phone for the track screen.
    const orderResult = await pool.query(
      `SELECT o.id, o.order_number, o.status, o.tracking_number, o.estimated_delivery,
              o.created_at, o.updated_at, o.delivery_status, o.delivery_boy_id,
              o.delivery_otp, dp.name AS courier_name, dp.mobile AS courier_phone
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
        estimatedDelivery: order.estimated_delivery,
        trackingHistory,
      },
    });
  } catch (err: any) {
    logger.error('trackorder_error', { error: err?.message, code: err?.code, stack: err?.stack });
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// POST /api/v1/orders
router.post('/', authenticate, orderCreateLimiter, async (req: AuthRequest, res: Response): Promise<void> => {
  const { shippingAddressId, paymentMethod, notes, cartItems: bodyCartItems, couponDiscount: clientCouponDiscount } = req.body;

  if (!shippingAddressId || !paymentMethod) {
    res.status(400).json({ success: false, message: 'shippingAddressId and paymentMethod are required' });
    return;
  }

  // Ensure the coupon_redemptions table exists before the checkout transaction
  // may write to it (idempotent; a no-op after the first call / startup).
  await ensureOrderSupportTables();

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
          quantity: i.quantity || 1,
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
      client.release();
      res.status(400).json({ success: false, message: 'Cart is empty' });
      return;
    }

    // users.is_live — a seller who has gone offline cannot be bought from. The
    // catalogue predicate (is_approved) decides what is listed; is_live decides
    // what can be ordered right now, and this is the one place it is enforced.
    const offline = cartResult.rows.find((r: any) => r.seller_is_live === false);
    if (offline) {
      await client.query('ROLLBACK');
      client.release();
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
      client.release();
      res.status(404).json({ success: false, message: 'Shipping address not found' });
      return;
    }

    const addr = decryptAddressPayload(addrResult.rows[0]);
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
           SET quantity = quantity - $1,
               in_stock = CASE WHEN quantity - $1 <= 0 THEN false ELSE in_stock END,
               updated_at = NOW()
           WHERE id = $2 AND quantity >= $1
           RETURNING id`,
          [item.quantity, item.product_id]
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

    // Notify each seller about their own sub-order (its own id/number/total).
    for (const sub of subOrders) {
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

// POST /api/v1/orders/:id/return
router.post('/:id/return', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  const { orderItemIds, reason, description } = req.body;

  if (!reason) {
    res.status(400).json({ success: false, message: 'reason is required' });
    return;
  }

  try {
    await ensureOrderSupportTables();

    // Verify the order belongs to this user and is delivered
    const orderResult = await pool.query(
      `SELECT id, status, final_amount FROM ${ORDERS} WHERE id = $1 AND user_id = $2`,
      [req.params.id, req.userId]
    );

    if (orderResult.rows.length === 0) {
      res.status(404).json({ success: false, message: 'Order not found' });
      return;
    }

    const order = orderResult.rows[0];
    if (!['delivered', 'return_requested'].includes(order.status)) {
      res.status(400).json({ success: false, message: 'Only delivered orders can be returned' });
      return;
    }

    const existingReturn = await pool.query(
      `SELECT id, status, created_at, updated_at
       FROM ${RETURN_REQUESTS}
       WHERE order_id = $1 AND user_id = $2 AND status IN ('requested', 'picked_up')
       ORDER BY created_at DESC
       LIMIT 1`,
      [req.params.id, req.userId]
    );

    if (existingReturn.rows.length > 0) {
      const activeReturn = existingReturn.rows[0];
      res.json({
        success: true,
        data: {
          returnId: activeReturn.id,
          status: activeReturn.status,
          message: 'Return request is already active for this order',
          refundAmount: Number(order.final_amount),
          refundStatus: 'initiated',
        },
      });
      return;
    }

    // Insert into return_requests table
    const returnId = generateId();
    await pool.query(
      `INSERT INTO ${RETURN_REQUESTS} (id, order_id, user_id, order_item_ids, reason, description, status, picked_up_at, refunded_at, status_history, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, 'requested', NULL, NULL, $7, NOW(), NOW())`,
      [
        returnId,
        req.params.id,
        req.userId,
        JSON.stringify(orderItemIds || []),
        reason,
        description || '',
        JSON.stringify([
          { status: 'requested', at: new Date().toISOString() }
        ]),
      ]
    );

    // Update order status to 'return_requested'
    await pool.query(
      `UPDATE ${ORDERS} SET status = 'return_requested', updated_at = NOW() WHERE id = $1`,
      [req.params.id]
    );
    await recordOrderStatus(null, req.params.id, 'return_requested', `Return requested: ${reason}`);

    res.json({
      success: true,
      data: {
        returnId,
        status: 'requested',
        message: 'Return request initiated successfully',
        refundAmount: Number(order.final_amount),
        refundStatus: 'initiated',
      },
    });
  } catch (err) {
    logger.error('returnorder_error', { error: (err as any)?.message ?? String(err) });
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// PATCH /api/v1/orders/:id/return-status
router.patch('/:id/return-status', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  const nextStatus = String(req.body?.status || '').trim();

  if (!['picked_up', 'refunded'].includes(nextStatus)) {
    res.status(400).json({ success: false, message: 'status must be picked_up or refunded' });
    return;
  }

  if (req.userRole === 'customer') {
    res.status(403).json({ success: false, message: 'Forbidden' });
    return;
  }

  const client = await pool.connect();
  try {
    await ensureOrderSupportTables();
    await client.query('BEGIN');

    // Verify the order exists and enforce seller ownership:
    // sellers may only update return status for orders containing their products.
    // Admins and delivery partners may update any order's return status.
    let orderCheckQuery: string;
    let orderCheckParams: any[];

    if (req.userRole === 'seller') {
      // Seller must own at least one product in this order
      orderCheckQuery = `
        SELECT DISTINCT o.id
        FROM ${ORDERS} o
        JOIN ${ORDER_ITEMS} oi ON oi.order_id = o.id
        JOIN products p ON p.id = oi.product_id
        WHERE o.id = $1 AND p.user_id = $2`;
      orderCheckParams = [req.params.id, req.userId];
    } else {
      orderCheckQuery = `SELECT id FROM ${ORDERS} WHERE id = $1`;
      orderCheckParams = [req.params.id];
    }

    const orderCheck = await client.query(orderCheckQuery, orderCheckParams);
    if (orderCheck.rows.length === 0) {
      await client.query('ROLLBACK');
      res.status(404).json({ success: false, message: 'Order not found' });
      return;
    }

    // Lock the latest return-request row so concurrent status updates serialize
    // instead of racing on a read-modify-write of status_history.
    const returnResult = await client.query(
      `SELECT id, order_id, status, status_history, picked_up_at, refunded_at
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
    const allowedNextStatuses: Record<string, string[]> = {
      requested: ['picked_up'],
      picked_up: ['refunded'],
    };

    if (!allowedNextStatuses[currentReturn.status]?.includes(nextStatus)) {
      await client.query('ROLLBACK');
      res.status(400).json({ success: false, message: 'Invalid return status transition' });
      return;
    }

    const now = new Date().toISOString();
    // Append the new entry atomically in SQL (status_history || $3) instead of
    // rewriting the whole array we read — under the row lock nothing is lost.
    const entry = JSON.stringify([{ status: nextStatus, at: now, by: req.userId, role: req.userRole }]);

    const updateFields: string[] = ['status = $2', 'status_history = status_history || $3::jsonb', 'updated_at = NOW()'];
    const values: any[] = [currentReturn.id, nextStatus, entry];

    if (nextStatus === 'picked_up') {
      updateFields.unshift('picked_up_at = NOW()');
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

    if (nextStatus === 'refunded') {
      await client.query(
        `UPDATE ${ORDERS}
         SET status = 'returned', payment_status = 'refunded', updated_at = NOW()
         WHERE id = $1`,
        [req.params.id]
      );
      await recordOrderStatus(client, req.params.id, 'returned', 'Return refunded');
    }

    await client.query('COMMIT');

    res.json({
      success: true,
      data: {
        orderId: req.params.id,
        returnId: currentReturn.id,
        status: nextStatus,
        pickedUpAt: nextStatus === 'picked_up' ? now : currentReturn.picked_up_at,
        refundedAt: nextStatus === 'refunded' ? now : currentReturn.refunded_at,
        statusHistory: updated.rows[0].status_history,
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

// GET /api/v1/orders/:id/return-status
router.get('/:id/return-status', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    await ensureOrderSupportTables();

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
        orderItemIds: Array.isArray(rr.order_item_ids) ? rr.order_item_ids : [],
        requestedAt: rr.created_at,
        updatedAt: rr.updated_at,
        pickedUpAt: rr.picked_up_at,
        refundedAt: rr.refunded_at,
        statusHistory: Array.isArray(rr.status_history) ? rr.status_history : [],
      },
    });
  } catch (err) {
    logger.error('getreturnstatus_error', { error: (err as any)?.message ?? String(err) });
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// PATCH /api/v1/orders/:id/cancel
router.patch('/:id/cancel', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  const { reason } = req.body;

  if (!reason || typeof reason !== 'string') {
    res.status(400).json({ success: false, message: 'reason is required' });
    return;
  }

  const client = await pool.connect();
  try {
    await ensureOrderSupportTables();
    await client.query('BEGIN');

    // Lock the order row and verify ownership + cancellable status
    const result = await client.query(
      `SELECT id, final_amount, payment_status, payment_method, prepaid_amount
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
    const newPaymentStatus = wasPaid ? 'refunded' : order.payment_status;

    await client.query(
      `UPDATE ${ORDERS}
       SET status = 'cancelled', payment_status = $1, updated_at = NOW()
       WHERE id = $2`,
      [newPaymentStatus, req.params.id]
    );
    await recordOrderStatus(client, req.params.id, 'cancelled', `Cancelled by customer: ${reason}`);

    // Restore inventory for each cancelled order item
    const cancelledItems = await client.query(
      `SELECT product_id, quantity FROM ${ORDER_ITEMS} WHERE order_id = $1`,
      [req.params.id]
    );
    for (const item of cancelledItems.rows) {
      await client.query(
        `UPDATE products
         SET quantity = quantity + $1,
             in_stock = true,
             updated_at = NOW()
         WHERE id = $2`,
        [item.quantity, item.product_id]
      );
    }

    // Paid orders are always refunded to the original payment method. (The ZPIN
    // wallet was removed — no in-app stored-value refund destination.)
    await client.query(
      `INSERT INTO ${ORDER_CANCELLATIONS} (id, order_id, user_id, reason, refund_method, created_at)
       VALUES ($1, $2, $3, $4, 'original', NOW())`,
      [generateId(), req.params.id, req.userId, reason]
    );

    await client.query('COMMIT');

    res.json({
      success: true,
      data: {
        message: 'Order cancelled',
        refundAmount: wasPaid ? refundAmount : 0,
        refundStatus: wasPaid ? 'initiated' : 'not_applicable',
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
      `SELECT id, product_id, product_name, quantity, price FROM ${ORDER_ITEMS} WHERE order_id = $1`,
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
      await client.query(
        `UPDATE products SET quantity = quantity + $1, in_stock = true, updated_at = NOW() WHERE id = $2`,
        [item.quantity, item.product_id]
      );
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

    // Refund outside the transaction — a gateway failure must not undo the
    // customer's selection. It is retried by support, not silently swallowed.
    if (refundAmount > 0) {
      await issueTrialRefund(order.id, order.payment_id, refundAmount);
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

// Refund the over-payment on a trial order back to the card/UPI that paid the
// delivery fee. Logged either way — a failed gateway call leaves an auditable
// 'refund_failed' row rather than a silent loss.
async function issueTrialRefund(orderId: string, paymentId: string | null, amount: number): Promise<void> {
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
    await recordOrderStatus(null, orderId, 'awaiting_collection', `Refund of ₹${amount.toFixed(2)} issued to the original payment method`);
  } catch (err: any) {
    logger.error('issuetrialrefund_failed', { orderId, error: err?.message });
    await recordOrderStatus(null, orderId, 'awaiting_collection', `Refund of ₹${amount.toFixed(2)} FAILED (${err?.message}) — needs manual action`)
      .catch(() => { /* history is best-effort */ });
  }
}

// PATCH /api/v1/orders/:id/confirm — Vendor accepts the order
router.patch('/:id/confirm', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  // Only admins and delivery partners can confirm orders
  if (req.userRole === 'customer') {
    res.status(403).json({ success: false, message: 'Forbidden' });
    return;
  }

  try {
    // Sellers may only confirm orders that contain their own products.
    // Admins and delivery partners may confirm any order.
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

