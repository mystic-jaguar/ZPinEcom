import { Request, Response, Router } from 'express';
import { pool } from '../db';
import { decryptAddressPayload } from '../utils/encryption';
import { isValidShortId } from '../utils/id';

const router = Router();

/**
 * POST /api/v1/notifications/new-order
 *
 * Called by the seller website to fetch new order notifications for a seller.
 * Body: { sellerId: string }
 *
 * Returns all unread new_order notifications for that seller,
 * along with the full order details from the orders + order_items tables.
 */
router.post('/new-order', async (req: Request, res: Response): Promise<void> => {
  const { sellerId } = req.body;

  if (!sellerId || typeof sellerId !== 'string' || !isValidShortId(sellerId)) {
    res.status(400).json({ success: false, message: 'sellerId is required' });
    return;
  }

  try {
    // Fetch unread new_order notifications for this seller
    const notifResult = await pool.query(
      `SELECT id, title, message, data, created_at
       FROM notifications
       WHERE user_id = $1
         AND type = 'new_order'
         AND is_read = false
       ORDER BY created_at DESC`,
      [sellerId]
    );

    if (notifResult.rows.length === 0) {
      res.json({ success: true, notifications: [], orders: [] });
      return;
    }

    // Extract order IDs from notification data
    const orderIds = notifResult.rows
      .map(n => {
        try { return JSON.parse(n.data)?.orderId; } catch { return null; }
      })
      .filter(Boolean);

    // Fetch full order details for each order.
    // We intentionally do NOT filter by o.seller_id here because the orders table
    // only stores the primary seller, but a seller can have notifications for orders
    // where they are not the primary seller (multi-seller cart). The orderIds already
    // come from that seller's own notifications so the trust boundary is maintained.
    const ordersResult = await pool.query(
      `SELECT o.*,
        json_agg(json_build_object(
          'id', oi.id,
          'productId', oi.product_id,
          'productName', oi.product_name,
          'quantity', oi.quantity,
          'price', oi.price,
          'image', oi.image
        )) FILTER (WHERE oi.id IS NOT NULL) as items
       FROM orders o
       LEFT JOIN order_items oi ON oi.order_id = o.id
       WHERE o.id = ANY($1)
       GROUP BY o.id
       ORDER BY o.created_at DESC`,
      [orderIds]
    );

    // Mark notifications as read
    await pool.query(
      `UPDATE notifications SET is_read = true
       WHERE user_id = $1 AND type = 'new_order' AND is_read = false`,
      [sellerId]
    );

    res.json({
      success: true,
      notifications: notifResult.rows.map(n => ({
        id: n.id,
        title: n.title,
        message: n.message,
        data: (() => {
          try {
            const parsed = JSON.parse(n.data);
            if (parsed?.shippingAddress) {
              parsed.shippingAddress = decryptAddressPayload(parsed.shippingAddress);
            }
            return parsed;
          } catch {
            return {};
          }
        })(),
        createdAt: n.created_at,
      })),
      orders: ordersResult.rows.map((row) => ({
        ...row,
        shipping_address: decryptAddressPayload(row.shipping_address || {}),
      })),
    });
  } catch (err) {
    console.error('notifications/new-order error:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

/**
 * GET /api/v1/notifications/new-order/count
 *
 * Returns the count of unread new_order notifications for a seller.
 * Query: ?sellerId=xxx
 */
router.get('/new-order/count', async (req: Request, res: Response): Promise<void> => {
  const sellerId = req.query.sellerId as string;

  if (!sellerId || !isValidShortId(sellerId)) {
    res.status(400).json({ success: false, message: 'sellerId is required' });
    return;
  }

  try {
    const result = await pool.query(
      `SELECT COUNT(*) FROM notifications
       WHERE user_id = $1 AND type = 'new_order' AND is_read = false`,
      [sellerId]
    );
    res.json({ success: true, count: Number(result.rows[0].count) });
  } catch (err) {
    console.error('notifications count error:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

export default router;
