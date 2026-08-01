import { Response, Router } from 'express';
import { pool } from '../db';
import { authenticate, AuthRequest } from '../middleware/auth';
import { decryptAddressPayload } from '../utils/encryption';
import { logger } from '../utils/logger';

const router = Router();

/**
 * Customer inbox — the rows already written across ZPIN (order placed, payment
 * success, out for delivery, delivered, delivery failed) with nothing reading
 * them on the customer side until now.
 *
 * `new_order` rows are excluded: a user can be both customer and seller
 * (is_seller is additive), and those rows are addressed to them as a seller —
 * the vendor app owns that inbox.
 */
const CUSTOMER_INBOX_FILTER = `user_id = $1 AND type <> 'new_order'`;

function parseData(raw: any) {
  try {
    return typeof raw === 'string' ? JSON.parse(raw) : (raw ?? {});
  } catch {
    return {};
  }
}

/**
 * GET /api/v1/notifications — paged customer inbox.
 */
router.get('/', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  const page = Number(req.query.page) || 1;
  const limit = Math.min(Number(req.query.limit) || 20, 50);
  const offset = (page - 1) * limit;

  try {
    const [rows, totals] = await Promise.all([
      pool.query(
        `SELECT id, type, title, message, data, is_read, created_at
           FROM notifications
          WHERE ${CUSTOMER_INBOX_FILTER}
          ORDER BY created_at DESC
          LIMIT $2 OFFSET $3`,
        [req.userId, limit, offset]
      ),
      pool.query(
        `SELECT COUNT(*) AS total,
                COUNT(*) FILTER (WHERE is_read = false) AS unread
           FROM notifications
          WHERE ${CUSTOMER_INBOX_FILTER}`,
        [req.userId]
      ),
    ]);

    const total = Number(totals.rows[0].total);
    res.json({
      success: true,
      data: rows.rows.map((n: any) => ({
        id: n.id,
        type: n.type,
        title: n.title,
        message: n.message,
        data: parseData(n.data),
        isRead: n.is_read,
        createdAt: n.created_at,
      })),
      unreadCount: Number(totals.rows[0].unread),
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
    logger.error('notifications_list_error', { error: (err as any)?.message ?? String(err) });
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

/**
 * GET /api/v1/notifications/unread-count — badge count for the header bell.
 */
router.get('/unread-count', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const result = await pool.query(
      `SELECT COUNT(*) FROM notifications WHERE ${CUSTOMER_INBOX_FILTER} AND is_read = false`,
      [req.userId]
    );
    res.json({ success: true, count: Number(result.rows[0].count) });
  } catch (err) {
    logger.error('notifications_unread_count_error', { error: (err as any)?.message ?? String(err) });
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

/**
 * POST /api/v1/notifications/read-all — mark the whole inbox read.
 * Declared before /:id/read so "read-all" can't be read as an id.
 */
router.post('/read-all', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    await pool.query(
      `UPDATE notifications SET is_read = true WHERE ${CUSTOMER_INBOX_FILTER} AND is_read = false`,
      [req.userId]
    );
    res.json({ success: true });
  } catch (err) {
    logger.error('notifications_read_all_error', { error: (err as any)?.message ?? String(err) });
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

/**
 * POST /api/v1/notifications/:id/read — mark one read (own rows only).
 */
router.post('/:id/read', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const result = await pool.query(
      `UPDATE notifications SET is_read = true WHERE id = $2 AND ${CUSTOMER_INBOX_FILTER}`,
      [req.userId, req.params.id]
    );
    if (result.rowCount === 0) {
      res.status(404).json({ success: false, message: 'Notification not found' });
      return;
    }
    res.json({ success: true });
  } catch (err) {
    logger.error('notifications_read_error', { error: (err as any)?.message ?? String(err) });
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

/**
 * POST /api/v1/notifications/new-order
 *
 * Called by the seller website to fetch new order notifications.
 * Requires authentication — sellers can only read their own notifications.
 */
router.post('/new-order', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  // Sellers can only fetch their own notifications — ignore any sellerId in body
  const sellerId = req.userId!;

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
      .map((n: any) => {
        try { return JSON.parse(n.data)?.orderId; } catch { return null; }
      })
      .filter(Boolean);

    // Fetch full order details for each order.
    // The orderIds come from this seller's own notifications, which provides the primary
    // trust boundary. We add a secondary check: only return items belonging to this seller,
    // preventing data leakage if a notification is ever created with a wrong orderId.
    const ordersResult = await pool.query(
      `SELECT o.*,
        json_agg(json_build_object(
          'id', oi.id,
          'productId', oi.product_id,
          'productName', oi.product_name,
          'quantity', oi.quantity,
          'price', oi.price,
          'image', oi.image
        )) FILTER (WHERE oi.id IS NOT NULL AND p.user_id = $2) as items
       FROM orders o
       LEFT JOIN order_items oi ON oi.order_id = o.id
       LEFT JOIN products p ON p.id = oi.product_id
       WHERE o.id = ANY($1)
         AND EXISTS (
           SELECT 1 FROM order_items oi2
           JOIN products p2 ON p2.id = oi2.product_id
           WHERE oi2.order_id = o.id AND p2.user_id = $2
         )
       GROUP BY o.id
       ORDER BY o.created_at DESC`,
      [orderIds, sellerId]
    );

    // Mark notifications as read
    await pool.query(
      `UPDATE notifications SET is_read = true
       WHERE user_id = $1 AND type = 'new_order' AND is_read = false`,
      [sellerId]
    );

    res.json({
      success: true,
      notifications: notifResult.rows.map((n: any) => ({
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
      orders: ordersResult.rows.map((row: any) => ({
        ...row,
        shipping_address: decryptAddressPayload(row.shipping_address || {}),
      })),
    });
  } catch (err) {
    logger.error('notificationsneworder_error', { error: (err as any)?.message ?? String(err) });
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

/**
 * GET /api/v1/notifications/new-order/count
 *
 * Returns the count of unread new_order notifications for the authenticated seller.
 */
router.get('/new-order/count', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  const sellerId = req.userId!;

  try {
    const result = await pool.query(
      `SELECT COUNT(*) FROM notifications
       WHERE user_id = $1 AND type = 'new_order' AND is_read = false`,
      [sellerId]
    );
    res.json({ success: true, count: Number(result.rows[0].count) });
  } catch (err) {
    logger.error('notifications_count_error', { error: (err as any)?.message ?? String(err) });
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

export default router;
