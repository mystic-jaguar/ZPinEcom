import { Response, Router } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { pool } from '../db';
import { authenticate, AuthRequest } from '../middleware/auth';

const router = Router();
const TABLE = 'customer_users';

function normalizeUser(row: any) {
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    mobile: row.mobile || '',
    userName: row.user_name,
    userRole: row.user_role,
    isVerified: row.is_verified,
    timeStamp: row.created_at,
  };
}

// ── specific paths BEFORE /:id ────────────────────────────────────────────────

// GET /api/v1/users/orders
router.get('/orders', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  const page = Number(req.query.page) || 1;
  const limit = Number(req.query.limit) || 20;
  const offset = (page - 1) * limit;

  try {
    const countResult = await pool.query(
      'SELECT COUNT(*) FROM customer_orders WHERE user_id = $1', [req.userId]
    );
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
       FROM customer_orders o
       LEFT JOIN customer_order_items oi ON oi.order_id = o.id
       WHERE o.user_id = $1
       GROUP BY o.id
       ORDER BY o.created_at DESC
       LIMIT $2 OFFSET $3`,
      [req.userId, limit, offset]
    );

    res.json({
      success: true,
      data: result.rows,
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
    console.error('getUserOrders error:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// GET /api/v1/users/shipping-addresses
router.get('/shipping-addresses', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const result = await pool.query(
      'SELECT * FROM customer_shipping_addresses WHERE user_id = $1 ORDER BY is_default DESC, created_at DESC',
      [req.userId]
    );
    res.json({ success: true, data: result.rows });
  } catch (err) {
    console.error('getAddresses error:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// PUT /api/v1/users/profileDetails
router.put('/profileDetails', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  const { name, userName, dob, gender, receivePushNotifications, receiveEmailUpdates, receiveOrderUpdates } = req.body;

  if (!name && !userName && !dob && !gender && receivePushNotifications === undefined && receiveEmailUpdates === undefined && receiveOrderUpdates === undefined) {
    res.status(400).json({ success: false, message: 'No fields to update' });
    return;
  }

  try {
    // Update name/userName in customer_users
    if (name || userName) {
      const setClauses: string[] = [];
      const values: any[] = [];

      if (name) { values.push(name); setClauses.push('name = $' + values.length); }
      if (userName) { values.push(userName); setClauses.push('user_name = $' + values.length); }
      values.push(req.userId);

      await pool.query(
        'UPDATE ' + TABLE + ' SET ' + setClauses.join(', ') + ', updated_at = NOW() WHERE id = $' + values.length,
        values
      );
    }

    // Upsert dob/gender/preferences into customer_profile_details
    const hasProfileFields = dob || gender || receivePushNotifications !== undefined || receiveEmailUpdates !== undefined || receiveOrderUpdates !== undefined;
    if (hasProfileFields) {
      // Use INSERT ... ON CONFLICT DO UPDATE (upsert)
      await pool.query(
        `INSERT INTO customer_profile_details (id, user_id, dob, gender, receive_push_notifications, receive_email_updates, receive_order_updates, created_at, updated_at)
         VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, $6, NOW(), NOW())
         ON CONFLICT (user_id) DO UPDATE SET
           dob = COALESCE($2, customer_profile_details.dob),
           gender = COALESCE($3, customer_profile_details.gender),
           receive_push_notifications = COALESCE($4, customer_profile_details.receive_push_notifications),
           receive_email_updates = COALESCE($5, customer_profile_details.receive_email_updates),
           receive_order_updates = COALESCE($6, customer_profile_details.receive_order_updates),
           updated_at = NOW()`,
        [
          req.userId,
          dob || null,
          gender || null,
          receivePushNotifications !== undefined ? receivePushNotifications : null,
          receiveEmailUpdates !== undefined ? receiveEmailUpdates : null,
          receiveOrderUpdates !== undefined ? receiveOrderUpdates : null,
        ]
      );
    }

    res.json({ success: true, message: 'Profile updated successfully' });
  } catch (err) {
    console.error('updateProfile error:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// GET /api/v1/users/:id
router.get('/:id', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const result = await pool.query('SELECT * FROM ' + TABLE + ' WHERE id = $1', [req.params.id]);
    if (result.rows.length === 0) {
      res.status(404).json({ success: false, message: 'User not found' });
      return;
    }
    res.json({ success: true, data: normalizeUser(result.rows[0]) });
  } catch (err) {
    console.error('getUser error:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// POST /api/v1/users/shipping-address
router.post('/shipping-address', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  const { name, phone, addressLine1, addressLine2, city, state, pincode, country, landmark, label, isDefault } = req.body;

  try {
    if (isDefault) {
      await pool.query(
        'UPDATE customer_shipping_addresses SET is_default = false WHERE user_id = $1',
        [req.userId]
      );
    }

    const result = await pool.query(
      `INSERT INTO customer_shipping_addresses
        (id, user_id, name, phone, address_line1, address_line2, city, state, pincode, country, landmark, label, is_default, created_at, updated_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,NOW(),NOW()) RETURNING *`,
      [uuidv4(), req.userId, name, phone, addressLine1, addressLine2 || '', city, state, pincode, country || 'India', landmark || '', label || 'Home', isDefault || false]
    );

    res.status(201).json({ success: true, data: result.rows[0] });
  } catch (err) {
    console.error('addAddress error:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

export default router;
