import { Response, Router } from 'express';
import { pool } from '../db';
import { authenticate, AuthRequest } from '../middleware/auth';
import { orderCreateLimiter } from '../middleware/rateLimits';
import { decryptAddressPayload, decryptMoney, encryptAddressPayload, encryptMoney } from '../utils/encryption';
import { generateId } from '../utils/id';
import { cacheDel, cacheDelPattern } from '../utils/redis';
import { safeIdentifier } from '../utils/sql';

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
    ];
    for (const sql of alterColumns) {
      try {
        await pool.query(sql);
      } catch (alterErr: any) {
        // Ignore "column already exists" errors (code 42701)
        if (alterErr?.code !== '42701') {
          console.warn('[ensureOrderSupportTables] ALTER warning:', alterErr?.message);
        }
      }
    }

    await pool.query(
      `CREATE TABLE IF NOT EXISTS ${ORDER_CANCELLATIONS} (
        id VARCHAR(7) PRIMARY KEY,
        order_id VARCHAR(7) NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
        user_id VARCHAR(7) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
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
    console.error('[ensureOrderSupportTables] Failed:', err?.message);
    throw err;
  }
}

function buildTrackingHistory(order: any, returnRequest?: any) {
  const steps: Array<{ status: string; title: string; timestamp: string | null; note?: string }> = [
    { status: 'pending', title: 'Order placed', timestamp: order.created_at },
  ];

  const flow = ['confirmed', 'processing', 'shipped', 'delivered'];
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

// Helper: get or create wallet for a user
async function getOrCreateWallet(userId: string) {
  const existing = await pool.query('SELECT * FROM wallets WHERE user_id = $1', [userId]);
  if (existing.rows.length > 0) return existing.rows[0];

  const walletId = generateId();
  const created = await pool.query(
    `INSERT INTO wallets (id, user_id, balance) VALUES ($1,$2,$3) RETURNING *`,
    [walletId, userId, encryptMoney(0)]
  );
  return created.rows[0];
}

function normalizeOrder(row: any) {
  return {
    id: row.id,
    orderNumber: row.order_number,
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
    items: row.items || [],
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
          'variant', oi.variant
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
    console.error('getOrders error:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// GET /api/v1/orders/:id
router.get('/:id', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const result = await pool.query(
      `SELECT o.*,
        COALESCE(json_agg(json_build_object(
              'orderItemId', oi.id,
          'productName', oi.product_name,
          'quantity', oi.quantity,
          'price', oi.price,
          'image', oi.image
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
    console.error('getOrder error:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// GET /api/v1/orders/:id/track
router.get('/:id/track', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    await ensureOrderSupportTables();

    const orderResult = await pool.query(
      `SELECT id, order_number, status, tracking_number, estimated_delivery, created_at, updated_at
       FROM ${ORDERS}
       WHERE id = $1 AND user_id = $2`,
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
        estimatedDelivery: order.estimated_delivery,
        trackingHistory,
      },
    });
  } catch (err: any) {
    console.error('trackOrder error:', err?.message, err?.code, err?.stack);
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
        (SELECT image_url FROM product_images WHERE product_id = p.id LIMIT 1) as image
       FROM ${CART} ci
       JOIN products p ON p.id = ci.product_id
       WHERE ci.user_id = $1`,
      [req.userId]
    );

    // Reconcile the server cart to exactly the cart the user reviewed at checkout.
    // We used to sync only when the DB cart was empty, so a stale/partial server
    // cart could silently override the reviewed items and produce an order total
    // (and Razorpay charge) that differed from what the summary screen showed.
    // We trust the client only for WHICH items/quantities are in the cart — prices
    // are always looked up server-side below, never taken from the client.
    if (Array.isArray(bodyCartItems) && bodyCartItems.length > 0) {
      const wantedIds = bodyCartItems.map((i: any) => i.productId).filter(Boolean);

      // Drop server-cart rows the user no longer has in their reviewed cart.
      if (wantedIds.length > 0) {
        const placeholders = wantedIds.map((_: string, i: number) => `$${i + 2}::uuid`).join(', ');
        await client.query(
          `DELETE FROM ${CART} WHERE user_id = $1 AND product_id NOT IN (${placeholders})`,
          [req.userId, ...wantedIds]
        );
      }

      for (const item of bodyCartItems) {
        if (!item.productId) continue;
        const product = await client.query(
          'SELECT price, in_stock, product_name, user_id FROM products WHERE id = $1::uuid',
          [item.productId]
        );
        if (product.rows.length === 0 || !product.rows[0].in_stock) continue;

        const existing = await client.query(
          `SELECT id FROM ${CART} WHERE user_id = $1 AND product_id = $2::uuid`,
          [req.userId, item.productId]
        );
        if (existing.rows.length > 0) {
          await client.query(
            `UPDATE ${CART} SET quantity = $1, updated_at = NOW() WHERE id = $2`,
            [item.quantity || 1, existing.rows[0].id]
          );
        } else {
          await client.query(
            `INSERT INTO ${CART} (id, user_id, product_id, quantity, price_at_add, created_at, updated_at)
             VALUES ($1,$2,$3::uuid,$4,$5,NOW(),NOW())`,
            [generateId(), req.userId, item.productId, item.quantity || 1, product.rows[0].price]
          );
        }
      }

      // Re-fetch cart after reconcile
      cartResult = await client.query(
        `SELECT ci.*, p.price, p.product_name, p.user_id as seller_id,
          (SELECT image_url FROM product_images WHERE product_id = p.id LIMIT 1) as image
         FROM ${CART} ci
         JOIN products p ON p.id = ci.product_id
         WHERE ci.user_id = $1`,
        [req.userId]
      );
    }

    if (cartResult.rows.length === 0) {
      await client.query('ROLLBACK');
      client.release();
      res.status(400).json({ success: false, message: 'Cart is empty' });
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
    const shippingAddress = {
      name: addr.name, phone: addr.phone,
      address: addr.address_line1, city: addr.city,
      state: addr.state, pincode: addr.pincode, country: addr.country,
    };
    const encryptedShippingAddress = encryptAddressPayload(shippingAddress);

    const totalAmount = cartResult.rows.reduce(
      (sum: number, item: any) => sum + Number(item.price) * item.quantity, 0
    );
    const shippingAmount = totalAmount > 500 ? 0 : 49;
    const taxAmount = Math.round(totalAmount * 0.18);
    // Instant "Try-at-Door" trial fee. Amount is fixed server-side (₹50) — we only
    // trust the client's delivery-type selection (notes flag), never a client amount.
    // Must match the frontend fee in checkout/summary.tsx + payment.tsx.
    const deliveryFee = notes === 'instant_delivery' ? 50 : 0;

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
        console.warn('Coupon validation error:', couponErr);
      }
    }
    couponDiscount = Math.max(0, couponDiscount);
    const finalAmount = Math.max(0, totalAmount + shippingAmount + taxAmount + deliveryFee - couponDiscount);
    const orderId = generateId();
    const orderNumber = `ZP-${orderId}`;

    // Determine the seller to stamp on the order. Each cart row's seller_id is the
    // product owner (products.user_id, joined above). Pick the seller with the most
    // value in the cart; fall back to any owner so a zero-value cart still resolves.
    const sellerTotals: Record<string, number> = {};
    cartResult.rows.forEach((item: any) => {
      if (item.seller_id) {
        sellerTotals[item.seller_id] = (sellerTotals[item.seller_id] || 0) + Number(item.price) * item.quantity;
      }
    });
    const primarySellerId =
      Object.keys(sellerTotals).sort((a, b) => sellerTotals[b] - sellerTotals[a])[0] ||
      cartResult.rows.find((i: any) => i.seller_id)?.seller_id ||
      null;

    // seller_id must never be null: getSellerOrders filters WHERE seller_id = $1, so
    // a null-seller order is invisible to its seller and unattributable for payouts.
    // If no cart product has an owner, the catalog row is broken — fail closed rather
    // than create an orphaned order (finally releases the client).
    if (!primarySellerId) {
      const orphan = cartResult.rows.find((i: any) => !i.seller_id);
      console.error('createOrder: product has no owner (products.user_id is NULL)', {
        userId: req.userId,
        productId: orphan?.product_id,
        productName: orphan?.product_name,
      });
      await client.query('ROLLBACK');
      res.status(409).json({
        success: false,
        message: `"${orphan?.product_name ?? 'An item'}" is temporarily unavailable for checkout. Please remove it and try again.`,
      });
      return;
    }

    // COD orders have no online payment step to flip them to 'confirmed' later
    // (Razorpay confirms on payment verify, wallet confirms inline below), so they
    // must be created already confirmed — otherwise they never surface to delivery
    // partners, whose queue is status IN ('confirmed','processing','shipped').
    // payment_status stays 'pending': cash is collected on delivery, not now.
    const orderStatus = paymentMethod === 'cod' ? 'confirmed' : 'pending';

    await client.query(
      `INSERT INTO ${ORDERS}
        (id, order_number, user_id, seller_id, status, payment_status, total_amount, shipping_amount,
         tax_amount, final_amount, shipping_address, payment_method, notes, estimated_delivery, created_at, updated_at)
       VALUES ($1,$2,$3,$12,$11,'pending',$4,$5,$6,$7,$8,$9,$10,
         (NOW() AT TIME ZONE 'Asia/Kolkata') + INTERVAL '5 days',
         (NOW() AT TIME ZONE 'Asia/Kolkata'),
         (NOW() AT TIME ZONE 'Asia/Kolkata'))`,
      [orderId, orderNumber, req.userId, totalAmount, shippingAmount, taxAmount, finalAmount,
       JSON.stringify(encryptedShippingAddress), paymentMethod, notes || '', orderStatus, primarySellerId]
    );

    for (const item of cartResult.rows) {
      await client.query(
        `INSERT INTO ${ORDER_ITEMS} (id, order_id, product_id, product_name, quantity, price, image, created_at)
         VALUES ($1,$2,$3,$4,$5,$6,$7,(NOW() AT TIME ZONE 'Asia/Kolkata'))`,
        [generateId(), orderId, item.product_id, item.product_name, item.quantity, item.price, item.image || '']
      );
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
        // Roll back the whole order; the finally block releases the client.
        await client.query('ROLLBACK');
        res.status(409).json({ success: false, message: `Insufficient stock for ${item.product_name}` });
        return;
      }
    }

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
    // ── Wallet payment: debit atomically within the same transaction ──────────
    if (paymentMethod === 'wallet') {
      const walletResult = await client.query(
        'SELECT * FROM wallets WHERE user_id = $1',
        [req.userId]
      );
      if (walletResult.rows.length === 0) {
        await client.query('ROLLBACK');
        client.release();
        res.status(400).json({ success: false, message: 'Wallet not found' });
        return;
      }
      const wallet = walletResult.rows[0];
      const currentBalance = decryptMoney(wallet.balance);
      if (currentBalance < finalAmount) {
        await client.query('ROLLBACK');
        client.release();
        res.status(400).json({ success: false, message: 'Insufficient wallet balance' });
        return;
      }
      const newBalance = currentBalance - finalAmount;
      await client.query(
        `UPDATE wallets SET balance = $1, updated_at = NOW() WHERE id = $2`,
        [encryptMoney(newBalance), wallet.id]
      );
      await client.query(
        `INSERT INTO wallet_transactions (id, wallet_id, user_id, type, amount, description, reference_id)
         VALUES ($1,$2,$3,'debit',$4,$5,$6)`,
        [generateId(), wallet.id, req.userId, finalAmount, `Payment for order ${orderNumber}`, orderId]
      );
      // Mark order as paid and confirmed
      await client.query(
        `UPDATE ${ORDERS} SET payment_status = 'paid', status = 'confirmed', updated_at = NOW() WHERE id = $1`,
        [orderId]
      );
    }

    // Notify customer — order confirmation (type: new_order, consistent with seller)
    const customerItems = cartResult.rows.map((i: any) => ({
      productId: i.product_id,
      productName: i.product_name,
      quantity: i.quantity,
      price: Number(i.price),
      image: i.image || null,
    }));

    await client.query(
      `INSERT INTO notifications (id, user_id, title, message, type, data, is_read, created_at)
       VALUES ($1, $2, $3, $4, 'new_order', $5, false, (NOW() AT TIME ZONE 'Asia/Kolkata'))`,
      [
        generateId(),
        req.userId,
        `Order Confirmed: ${orderNumber}`,
        `Your order ${orderNumber} for ${customerItems.length} item(s) has been placed. Total: ₹${finalAmount.toFixed(2)}`,
        JSON.stringify({
          orderId,
          orderNumber,
          itemCount: customerItems.length,
          total: finalAmount,
          items: customerItems,
          shippingAddress: encryptedShippingAddress,
          paymentMethod,
        }),
      ]
    );

    // Notify each unique seller about the new order
    const uniqueSellers = [...new Set(cartResult.rows.map((i: any) => i.seller_id).filter(Boolean))];
    for (const sellerId of uniqueSellers) {
      const sellerItems = cartResult.rows.filter((i: any) => i.seller_id === sellerId);
      const sellerTotal = sellerItems.reduce((s: number, i: any) => s + Number(i.price) * i.quantity, 0);
      const itemNames = sellerItems.map((i: any) => i.product_name).join(', ');

      await client.query(
        `INSERT INTO notifications (id, user_id, title, message, type, data, is_read, created_at)
         VALUES ($1, $2, $3, $4, 'new_order', $5, false, (NOW() AT TIME ZONE 'Asia/Kolkata'))`,
        [
          generateId(),
          sellerId,
          `New Order: ${orderNumber}`,
          `You have a new order for ${sellerItems.length} item(s): ${itemNames}. Total: ₹${sellerTotal.toFixed(2)}`,
          JSON.stringify({
            orderId,
            orderNumber,
            itemCount: sellerItems.length,
            total: sellerTotal,
            items: sellerItems.map((i: any) => ({
              productId: i.product_id,
              productName: i.product_name,
              quantity: i.quantity,
              price: Number(i.price),
              image: i.image || null,
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
      data: { order: { id: orderId, orderNumber, finalAmount, status: orderStatus } },
    });
  } catch (err) {
    try {
      await client.query('ROLLBACK');
    } catch (rollbackErr) {
      console.error('ROLLBACK error:', rollbackErr);
    }
    console.error('createOrder error:', err);
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
    console.error('returnOrder error:', err);
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
    console.error('updateReturnStatus error:', err);
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
    console.error('getReturnStatus error:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// PATCH /api/v1/orders/:id/cancel
router.patch('/:id/cancel', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  const { refundMethod, reason } = req.body; // refundMethod: 'original' | 'wallet'

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
      `SELECT id, final_amount, payment_status, payment_method
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
    const refundAmount = Number(order.final_amount);

    // Only mark as refunded if the order was actually paid
    const wasPaid = order.payment_status === 'paid';
    const newPaymentStatus = wasPaid ? 'refunded' : order.payment_status;

    await client.query(
      `UPDATE ${ORDERS}
       SET status = 'cancelled', payment_status = $1, updated_at = NOW()
       WHERE id = $2`,
      [newPaymentStatus, req.params.id]
    );

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

    // Credit wallet only if the order was paid and user chose wallet refund
    if (wasPaid && refundMethod === 'wallet' && refundAmount > 0) {
      const walletResult = await client.query(
        'SELECT * FROM wallets WHERE user_id = $1 FOR UPDATE',
        [req.userId]
      );

      let wallet = walletResult.rows[0];
      if (!wallet) {
        const walletId = generateId();
        const created = await client.query(
          `INSERT INTO wallets (id, user_id, balance) VALUES ($1,$2,$3) RETURNING *`,
          [walletId, req.userId, encryptMoney(0)]
        );
        wallet = created.rows[0];
      }

      const updatedBalance = decryptMoney(wallet.balance) + refundAmount;
      await client.query(
        `UPDATE wallets SET balance = $1, updated_at = NOW() WHERE id = $2`,
        [encryptMoney(updatedBalance), wallet.id]
      );
      await client.query(
        `INSERT INTO wallet_transactions (id, wallet_id, user_id, type, amount, description, reference_id)
         VALUES ($1,$2,$3,'credit',$4,$5,$6)`,
        [generateId(), wallet.id, req.userId, refundAmount, `Refund for cancelled order`, req.params.id]
      );
    }

    await client.query(
      `INSERT INTO ${ORDER_CANCELLATIONS} (id, order_id, user_id, reason, refund_method, created_at)
       VALUES ($1, $2, $3, $4, $5, NOW())`,
      [generateId(), req.params.id, req.userId, reason, refundMethod || 'original']
    );

    await client.query('COMMIT');

    res.json({
      success: true,
      data: {
        message: 'Order cancelled',
        refundAmount: wasPaid ? refundAmount : 0,
        refundStatus: wasPaid
          ? (refundMethod === 'wallet' ? 'credited_to_wallet' : 'initiated')
          : 'not_applicable',
        refundMethod: refundMethod || 'original',
      },
    });
  } catch (err) {
    try { await client.query('ROLLBACK'); } catch { /* ignore */ }
    console.error('cancelOrder error:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  } finally {
    client.release();
  }
});

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
    console.error('confirmOrder error:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

export default router;

