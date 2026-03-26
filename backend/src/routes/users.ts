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

// ── IMPORTANT: specific paths must come BEFORE /:id ──────────────────────────

// GET /api/v1/users/orders
router.get('/orders', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  const page = Number(req.query.page) || 1;
  const limit = Number(req.query.limit) || 20;
  const offset = (page - 1) * limit;

  try {
    const countResult = await pool.query(
      'SELECT COUNT(*) FROM orders WHERE user_id = $1', [req.userId]
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
      'SELECT * FROM shipping_addresses WHERE user_id = $1 ORDER BY is_default DESC, created_at DESC',
      [req.userId]
    );
    res.json({ success: true, data: result.rows });
  } catch (err) {
    console.error('getAddresses error:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// GET /api/v1/users/:id
router.get('/:id', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const result = await pool.query(`SELECT * FROM ${TABLE} WHERE id = $1`, [req.params.id]);
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

// PUT /api/v1/users/profileDetails
router.put('/profileDetails', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  const { name, userName, dob, gender } = req.body;
  try {
    const updates: string[] = [];
    const values: any[] = [];
    let idx = 1;

    if (name) { updates.push(`name = $${idx++}`); values.push(name); }
    if (userName) { updates.push(`user_name = $${idx++}`); values.push(userName); }
    updates.push(`updated_at = NOW()`);
    values.push(req.userId);

    if (updates.length === 1) {
      res.status(400).json({ success: false, message: 'No fields to update' });
      return;
    }

    await pool.query(
      `UPDATE ${TABLE} SET ${updates.join(', ')} WHERE id = $${idx}`,
      values
    );

    if (dob || gender) {
      const existing = await pool.query('SELECT id FROM customer_profiles WHERE user_id = $1', [req.userId]);
      if (existing.rows.length > 0) {
        const cpUpdates: string[] = [];
        const cpValues: any[] = [];
        let ci = 1;
        if (dob) { cpUpdates.push(`date_of_birth = $${ci++}`); cpValues.push(dob); }
        if (gender) { cpUpdates.push(`gender = $${ci++}`); cpValues.push(gender); }
        cpValues.push(req.userId);
        await pool.query(`UPDATE customer_profiles SET ${cpUpdates.join(', ')} WHERE user_id = $${ci}`, cpValues);
      }
    }

    res.json({ success: true, message: 'Profile updated successfully' });
  } catch (err) {
    console.error('updateProfile error:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// POST /api/v1/users/shipping-address
router.post('/shipping-address', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  const { name, phone, addressLine1, addressLine2, city, state, pincode, country, landmark, label, isDefault } = req.body;

  try {
    if (isDefault) {
      await pool.query('UPDATE shipping_addresses SET is_default = false WHERE user_id = $1', [req.userId]);
    }

    const result = await pool.query(
      `INSERT INTO shipping_addresses
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
