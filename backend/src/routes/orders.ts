import { Response, Router } from 'express';
import { pool } from '../db';
import { authenticate, AuthRequest } from '../middleware/auth';
import { orderCreateLimiter } from '../middleware/rateLimits';
import { generateId } from '../utils/id';

const router = Router();
const ORDERS = 'orders';
const ORDER_ITEMS = 'order_items';
const CART = 'cart_items';
const ADDRESSES = 'addresses';

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
    shippingAddress: row.shipping_address,
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
      `SELECT COUNT(*) FROM ${ORDERS} WHERE user_id = $1`, [req.userId]
    );
    const total = Number(countResult.rows[0].count);

    const result = await pool.query(
      `SELECT o.*,
        COALESCE(json_agg(json_build_object(
          'productId', oi.product_id,
          'productName', oi.product_name,
          'quantity', oi.quantity,
          'price', oi.price,
          'image', oi.image,
          'variant', oi.variant
        )) FILTER (WHERE oi.id IS NOT NULL), '[]') as items
       FROM ${ORDERS} o
       LEFT JOIN ${ORDER_ITEMS} oi ON oi.order_id = o.id
       WHERE o.user_id = $1
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
          'productId', oi.product_id,
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

// POST /api/v1/orders
router.post('/', authenticate, orderCreateLimiter, async (req: AuthRequest, res: Response): Promise<void> => {
  const { shippingAddressId, paymentMethod, notes } = req.body;

  if (!shippingAddressId || !paymentMethod) {
    res.status(400).json({ success: false, message: 'shippingAddressId and paymentMethod are required' });
    return;
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const cartResult = await client.query(
      `SELECT ci.*, p.price, p.product_name, p.user_id as seller_id,
        (SELECT image_url FROM product_images WHERE product_id = p.id LIMIT 1) as image
       FROM ${CART} ci
       JOIN products p ON p.id = ci.product_id
       WHERE ci.user_id = $1`,
      [req.userId]
    );

    if (cartResult.rows.length === 0) {
      await client.query('ROLLBACK');
      res.status(400).json({ success: false, message: 'Cart is empty' });
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

    const addr = addrResult.rows[0];
    const shippingAddress = {
      name: addr.name, phone: addr.phone,
      address: addr.address_line1, city: addr.city,
      state: addr.state, pincode: addr.pincode, country: addr.country,
    };

    const totalAmount = cartResult.rows.reduce(
      (sum: number, item: any) => sum + Number(item.price) * item.quantity, 0
    );
    const shippingAmount = totalAmount > 500 ? 0 : 49;
    const taxAmount = Math.round(totalAmount * 0.18);
    const finalAmount = totalAmount + shippingAmount + taxAmount;
    const orderId = generateId();
    const orderNumber = `ZP-${orderId}`;

    // Determine primary seller (seller with most items by value)
    const sellerTotals: Record<string, number> = {};
    cartResult.rows.forEach((item: any) => {
      if (item.seller_id) {
        sellerTotals[item.seller_id] = (sellerTotals[item.seller_id] || 0) + Number(item.price) * item.quantity;
      }
    });
    const primarySellerId = Object.keys(sellerTotals).sort((a, b) => sellerTotals[b] - sellerTotals[a])[0] || null;

    await client.query(
      `INSERT INTO ${ORDERS}
        (id, order_number, user_id, seller_id, status, payment_status, total_amount, shipping_amount,
         tax_amount, final_amount, shipping_address, payment_method, notes, estimated_delivery, created_at, updated_at)
       VALUES ($1,$2,$3,$4,'pending','pending',$5,$6,$7,$8,$9,$10,$11,
         (NOW() AT TIME ZONE 'Asia/Kolkata') + INTERVAL '5 days',
         (NOW() AT TIME ZONE 'Asia/Kolkata'),
         (NOW() AT TIME ZONE 'Asia/Kolkata'))`,
      [orderId, orderNumber, req.userId, primarySellerId, totalAmount, shippingAmount, taxAmount, finalAmount,
       JSON.stringify(shippingAddress), paymentMethod, notes || '']
    );

    for (const item of cartResult.rows) {
      await client.query(
        `INSERT INTO ${ORDER_ITEMS} (id, order_id, product_id, product_name, quantity, price, image, created_at)
         VALUES ($1,$2,$3,$4,$5,$6,$7,(NOW() AT TIME ZONE 'Asia/Kolkata'))`,
        [generateId(), orderId, item.product_id, item.product_name, item.quantity, item.price, item.image || '']
      );
    }

    await client.query(`DELETE FROM ${CART} WHERE user_id = $1`, [req.userId]);

    // Notify each unique seller about the new order
    const uniqueSellers = [...new Set(cartResult.rows.map((i: any) => i.seller_id).filter(Boolean))];
    for (const sellerId of uniqueSellers) {
      const sellerItems = cartResult.rows.filter((i: any) => i.seller_id === sellerId);
      const sellerTotal = sellerItems.reduce((s: number, i: any) => s + Number(i.price) * i.quantity, 0);
      const itemNames = sellerItems.map((i: any) => i.product_name).join(', ');

      await client.query(
        `INSERT INTO notifications (id, user_id, title, message, type, data, is_read, created_at)
         VALUES (uuid_generate_v4(), $1, $2, $3, 'new_order', $4, false, NOW())`,
        [
          sellerId,
          `New Order: ${orderNumber}`,
          `You have a new order for ${sellerItems.length} item(s): ${itemNames}. Total: ₹${sellerTotal.toFixed(2)}`,
          JSON.stringify({ orderId, orderNumber, itemCount: sellerItems.length, total: sellerTotal }),
        ]
      );
    }

    await client.query('COMMIT');

    res.status(201).json({
      success: true,
      message: 'Order placed successfully',
      data: { order: { id: orderId, orderNumber, finalAmount, status: 'pending' } },
    });
  } catch (err) {
    await client.query('ROLLBACK');
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
    if (order.status !== 'delivered') {
      res.status(400).json({ success: false, message: 'Only delivered orders can be returned' });
      return;
    }

    // Insert into return_requests table
    const returnId = generateId();
    await pool.query(
      `INSERT INTO return_requests (id, order_id, user_id, order_item_ids, reason, description, status, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, 'requested', NOW(), NOW())`,
      [returnId, req.params.id, req.userId, JSON.stringify(orderItemIds || []), reason, description || '']
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

// PATCH /api/v1/orders/:id/cancel
router.patch('/:id/cancel', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  const { refundMethod } = req.body; // 'original' | 'wallet'

  try {
    const result = await pool.query(
      `UPDATE ${ORDERS}
       SET status = 'cancelled', payment_status = 'refunded', updated_at = NOW()
       WHERE id = $1 AND user_id = $2 AND status IN ('pending','confirmed')
       RETURNING final_amount`,
      [req.params.id, req.userId]
    );

    if (result.rows.length === 0) {
      res.status(400).json({ success: false, message: 'Order cannot be cancelled' });
      return;
    }

    const refundAmount = Number(result.rows[0].final_amount);

    // Credit wallet if user chose wallet refund
    if (refundMethod === 'wallet' && refundAmount > 0) {
      const wallet = await getOrCreateWallet(req.userId!);
      await pool.query(
        `UPDATE wallets SET balance = balance + $1, updated_at = NOW() WHERE id = $2`,
        [refundAmount, wallet.id]
      );
      await pool.query(
        `INSERT INTO wallet_transactions (wallet_id, user_id, type, amount, description, reference_id)
         VALUES ($1,$2,'credit',$3,$4,$5)`,
        [wallet.id, req.userId, refundAmount, `Refund for cancelled order`, req.params.id]
      );
    }

    res.json({
      success: true,
      data: {
        message: 'Order cancelled',
        refundAmount,
        refundStatus: refundMethod === 'wallet' ? 'credited_to_wallet' : 'initiated',
        refundMethod: refundMethod || 'original',
      },
    });
  } catch (err) {
    console.error('cancelOrder error:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

export default router;

