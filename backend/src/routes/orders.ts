import { Response, Router } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { pool } from '../db';
import { authenticate, AuthRequest } from '../middleware/auth';

const router = Router();

function normalizeOrder(row: any) {
  return {
    id: row.id,
    orderNumber: row.order_number,
    userId: row.user_id,
    sellerId: row.seller_id,
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
  };
}

// GET /api/v1/orders (user's own orders — also accessible via /users/orders)
router.get('/', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  const page = Number(req.query.page) || 1;
  const limit = Number(req.query.limit) || 20;
  const offset = (page - 1) * limit;

  try {
    const countResult = await pool.query('SELECT COUNT(*) FROM orders WHERE user_id = $1', [req.userId]);
    const total = Number(countResult.rows[0].count);

    const result = await pool.query(
      `SELECT o.*,
        COALESCE(json_agg(json_build_object(
          'productId', oi.product_id,
          'productName', oi.product_name,
          'quantity', oi.quantity,
          'price', oi.price,
          'image', oi.image
        )) FILTER (WHERE oi.id IS NOT NULL), '[]') as items
       FROM orders o
       LEFT JOIN order_items oi ON oi.order_id = o.id
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
       FROM orders o
       LEFT JOIN order_items oi ON oi.order_id = o.id
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
router.post('/', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  const { shippingAddressId, paymentMethod, notes, couponCode } = req.body;

  if (!shippingAddressId || !paymentMethod) {
    res.status(400).json({ success: false, message: 'shippingAddressId and paymentMethod are required' });
    return;
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Get cart items
    const cartResult = await client.query(
      `SELECT ci.*, p.price, p.product_name, p.user_id as seller_id,
        (SELECT image_url FROM product_images WHERE product_id = p.id LIMIT 1) as image
       FROM cart_items ci
       JOIN products p ON p.id = ci.product_id
       WHERE ci.user_id = $1`,
      [req.userId]
    );

    if (cartResult.rows.length === 0) {
      await client.query('ROLLBACK');
      res.status(400).json({ success: false, message: 'Cart is empty' });
      return;
    }

    // Get shipping address
    const addrResult = await client.query('SELECT * FROM shipping_addresses WHERE id = $1 AND user_id = $2', [shippingAddressId, req.userId]);
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

    const totalAmount = cartResult.rows.reduce((sum: number, item: any) => sum + Number(item.price) * item.quantity, 0);
    const shippingAmount = totalAmount > 500 ? 0 : 49;
    const taxAmount = Math.round(totalAmount * 0.18);
    const finalAmount = totalAmount + shippingAmount + taxAmount;
    const sellerId = cartResult.rows[0].seller_id;
    const orderNumber = `ZP-${Date.now()}`;
    const orderId = uuidv4();

    await client.query(
      `INSERT INTO orders (id, order_number, user_id, seller_id, status, payment_status, total_amount, shipping_amount, tax_amount, final_amount, shipping_address, payment_method, notes, estimated_delivery, created_at, updated_at)
       VALUES ($1,$2,$3,$4,'pending','pending',$5,$6,$7,$8,$9,$10,$11,NOW() + INTERVAL '5 days',NOW(),NOW())`,
      [orderId, orderNumber, req.userId, sellerId, totalAmount, shippingAmount, taxAmount, finalAmount, JSON.stringify(shippingAddress), paymentMethod, notes || '']
    );

    // Insert order items
    for (const item of cartResult.rows) {
      await client.query(
        `INSERT INTO order_items (id, order_id, product_id, product_name, quantity, price, image, created_at)
         VALUES ($1,$2,$3,$4,$5,$6,$7,NOW())`,
        [uuidv4(), orderId, item.product_id, item.product_name, item.quantity, item.price, item.image || '']
      );
    }

    // Clear cart
    await client.query('DELETE FROM cart_items WHERE user_id = $1', [req.userId]);

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

// PATCH /api/v1/orders/:id/cancel
router.patch('/:id/cancel', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  const { reason } = req.body;

  try {
    const result = await pool.query(
      `UPDATE orders SET status = 'cancelled', payment_status = 'refunded', updated_at = NOW()
       WHERE id = $1 AND user_id = $2 AND status IN ('pending','confirmed')
       RETURNING final_amount`,
      [req.params.id, req.userId]
    );

    if (result.rows.length === 0) {
      res.status(400).json({ success: false, message: 'Order cannot be cancelled' });
      return;
    }

    res.json({
      success: true,
      data: { message: 'Order cancelled', refundAmount: Number(result.rows[0].final_amount), refundStatus: 'initiated' },
    });
  } catch (err) {
    console.error('cancelOrder error:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

export default router;
