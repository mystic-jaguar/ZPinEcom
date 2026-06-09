import { Response, Router } from 'express';
import { pool } from '../db';
import { authenticate, AuthRequest } from '../middleware/auth';
import { addressLimiter } from '../middleware/rateLimits';
import { decryptAddressPayload, encryptAddressPayload } from '../utils/encryption';
import { generateId } from '../utils/id';
import { safeIdentifier } from '../utils/sql';

const router = Router();

const USERS = safeIdentifier('users');
const ORDERS = safeIdentifier('orders');
const ORDER_ITEMS = safeIdentifier('order_items');
const ADDRESSES = safeIdentifier('addresses');

function normalizeUser(row: any) {
  const rawDob = row.dob;
  const dob = rawDob
    ? (typeof rawDob === 'string' ? rawDob.split('T')[0] : new Date(rawDob).toISOString().split('T')[0])
    : null;

  return {
    id: row.id,
    name: row.name,
    email: row.email,
    mobile: row.mobile || '',
    userName: row.user_name,
    userRole: row.user_role,
    isVerified: row.is_verified,
    dob,
    gender: row.gender || null,
    profileImage: row.profile_image || null,
    receivePushNotifications: row.receive_push_notifications ?? true,
    receiveEmailUpdates: row.receive_email_updates ?? false,
    receiveOrderUpdates: row.receive_order_updates ?? true,
    timeStamp: row.created_at,
  };
}

function normalizeOrder(row: any) {
  return {
    id: row.id,
    orderNumber: row.order_number,
    userId: row.user_id,
    status: row.status,
    paymentStatus: row.payment_status,
    totalAmount: Number(row.total_amount || 0),
    shippingAmount: Number(row.shipping_amount || 0),
    taxAmount: Number(row.tax_amount || 0),
    finalAmount: Number(row.final_amount || 0),
    shippingAddress: decryptAddressPayload(row.shipping_address || {}),
    paymentMethod: row.payment_method || 'cod',
    paymentId: row.payment_id,
    estimatedDelivery: row.estimated_delivery,
    trackingNumber: row.tracking_number,
    notes: row.notes,
    items: Array.isArray(row.items) ? row.items : [],
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    date: row.created_at,
  };
}

function normalizeAddress(row: any) {
  return decryptAddressPayload(row);
}

// ── GET /api/v1/users/orders ──────────────────────────────────────────────────

router.get('/orders', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  const page = Number(req.query.page) || 1;
  const limit = Number(req.query.limit) || 20;
  const offset = (page - 1) * limit;

  try {
    // Exclude orders that are pending with unpaid status — these are failed/abandoned payments
    const countResult = await pool.query(
      `SELECT COUNT(*) FROM ${ORDERS} WHERE user_id = $1 AND NOT (status = 'pending' AND payment_status = 'pending')`,
      [req.userId]
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
    console.error('getUserOrders error:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// ── GET /api/v1/users/shipping-addresses ─────────────────────────────────────

router.get('/shipping-addresses', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const result = await pool.query(
      `SELECT * FROM ${ADDRESSES} WHERE user_id = $1 ORDER BY is_default DESC, created_at DESC`,
      [req.userId]
    );
    res.json({ success: true, data: result.rows.map(normalizeAddress) });
  } catch (err) {
    console.error('getAddresses error:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// ── PUT /api/v1/users/profileDetails ─────────────────────────────────────────
// Single UPDATE on users — profile fields are now columns on the same table.

router.put('/profileDetails', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  const {
    name, userName, dob, gender, profileImage,
    receivePushNotifications, receiveEmailUpdates, receiveOrderUpdates,
  } = req.body;

  const hasFields = name || userName || dob || gender || profileImage !== undefined
    || receivePushNotifications !== undefined
    || receiveEmailUpdates !== undefined
    || receiveOrderUpdates !== undefined;

  if (!hasFields) {
    res.status(400).json({ success: false, message: 'No fields to update' });
    return;
  }

  try {
    const setClauses: string[] = [];
    const values: any[] = [];

    // NOTE: uses $N placeholders — values.length after push gives the correct index
    const push = (col: string, val: any) => {
      values.push(val);
      setClauses.push(`${safeIdentifier(col)} = $${values.length}`);
    };

    if (name)                                  push('name', name);
    if (userName)                              push('user_name', userName);
    if (dob)                                   push('dob', dob);
    if (gender)                                push('gender', gender);
    if (profileImage !== undefined)            push('profile_image', profileImage);
    if (receivePushNotifications !== undefined) push('receive_push_notifications', receivePushNotifications);
    if (receiveEmailUpdates !== undefined)     push('receive_email_updates', receiveEmailUpdates);
    if (receiveOrderUpdates !== undefined)     push('receive_order_updates', receiveOrderUpdates);

    setClauses.push(`updated_at = NOW()`);
    values.push(req.userId);

    await pool.query(
      `UPDATE ${USERS} SET ${setClauses.join(', ')} WHERE id = $${values.length}`,
      values
    );

    // Re-fetch updated user so the frontend can sync its local state
    const updated = await pool.query(
      `SELECT * FROM ${USERS} WHERE id = $1`, [req.userId]
    );

    res.json({ success: true, message: 'Profile updated successfully', data: normalizeUser(updated.rows[0]) });
  } catch (err) {
    console.error('updateProfile error:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// ── GET /api/v1/users/:id ─────────────────────────────────────────────────────
// Users can only read their own profile

router.get('/:id', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  // Enforce ownership — a user can only fetch their own profile
  if (req.params.id !== req.userId) {
    res.status(403).json({ success: false, message: 'Forbidden' });
    return;
  }
  try {
    const result = await pool.query(
      `SELECT * FROM ${USERS} WHERE id = $1`, [req.userId]
    );
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

// ── POST /api/v1/users/shipping-address ──────────────────────────────────────

router.post('/shipping-address', authenticate, addressLimiter, async (req: AuthRequest, res: Response): Promise<void> => {
  const { name, phone, addressLine1, addressLine2, city, state, pincode, country, landmark, label, isDefault } = req.body;

  if (!name || !phone || !addressLine1 || !city || !state || !pincode) {
    res.status(400).json({ success: false, message: 'name, phone, addressLine1, city, state, and pincode are required' });
    return;
  }

  // Basic phone validation — digits only, 7–15 chars
  if (!/^\+?[\d\s\-]{7,15}$/.test(String(phone))) {
    res.status(400).json({ success: false, message: 'Invalid phone number' });
    return;
  }

  // Pincode validation — 6 digits for India
  if (!/^\d{6}$/.test(String(pincode))) {
    res.status(400).json({ success: false, message: 'Invalid pincode — must be 6 digits' });
    return;
  }

  try {
    const encryptedAddress = encryptAddressPayload({
      name,
      phone,
      address_line1: addressLine1,
      address_line2: addressLine2 || '',
      city,
      state,
      pincode,
      country: country || 'India',
      landmark: landmark || '',
    });

    if (isDefault) {
      await pool.query(
        `UPDATE ${ADDRESSES} SET is_default = false WHERE user_id = $1`,
        [req.userId]
      );
    }

    const result = await pool.query(
      `INSERT INTO ${ADDRESSES}
        (id, user_id, name, phone, address_line1, address_line2, city, state, pincode, country, landmark, label, is_default, created_at, updated_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,NOW(),NOW()) RETURNING *`,
      [
        generateId(),
        req.userId,
        encryptedAddress.name,
        encryptedAddress.phone,
        encryptedAddress.address_line1,
        encryptedAddress.address_line2,
        encryptedAddress.city,
        encryptedAddress.state,
        encryptedAddress.pincode,
        encryptedAddress.country,
        encryptedAddress.landmark,
        label || 'Home',
        isDefault || false,
      ]
    );

    res.status(201).json({ success: true, data: normalizeAddress(result.rows[0]) });
  } catch (err) {
    console.error('addAddress error:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

export default router;
