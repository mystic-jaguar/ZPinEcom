import { Response, Router } from 'express';
import { pool } from '../db';
import { authenticate, AuthRequest } from '../middleware/auth';
import { addressLimiter } from '../middleware/rateLimits';
import { decryptAddressPayload, encryptAddressPayload } from '../utils/encryption';
import { generateId } from '../utils/id';
import { ensureModerationSchema } from '../utils/moderationSchema';
import { markupItems } from '../utils/pricing';
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
    // Customer-facing line items carry the 20% ZPIN markup (see utils/pricing).
    items: markupItems(row.items),
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

// ── DELETE /api/v1/users/me ───────────────────────────────────────────────────
// In-app account deletion (App Store guideline 5.1.1(v)).
// Anonymizes the user row in place and removes all personal data + UGC, while
// RETAINING order/invoice records (now tied to an anonymized user) as required
// for tax/accounting compliance. Runs in a single transaction.

router.delete('/me', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  const userId = req.userId!;
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Lock the row and confirm the account still exists.
    const existing = await client.query(
      `SELECT id FROM ${USERS} WHERE id = $1 FOR UPDATE`,
      [userId]
    );
    if (existing.rows.length === 0) {
      await client.query('ROLLBACK');
      res.status(404).json({ success: false, message: 'User not found' });
      return;
    }

    // Remove personal data + user-generated content. Orders, order_items,
    // return_requests and order_cancellations are intentionally retained as
    // financial records, kept valid by the anonymized user row below.
    //
    // The prod DB is a legacy schema that diverges from migrate.sql — some of
    // these tables may not exist there, and some legacy tables type user_id as
    // uuid rather than VARCHAR(7). A DELETE against a missing table, a missing
    // user_id column, or a uuid column (which tries to parse our short id as a
    // uuid → 22P02) aborts the whole transaction (→ 500). So we only delete
    // from tables that actually have a user_id column, and compare against
    // user_id::text so a uuid-typed column simply yields no match instead of
    // throwing. Order matters for FK children: wallet_transactions before wallets.
    const cleanupTables = [
      'refresh_tokens',
      'auth_tokens',
      'addresses',
      'cart_items',
      'wishlists',
      'product_reviews',
      'notifications',
      'wallet_transactions',
      'wallets',
    ];
    const cleanupColsResult = await client.query(
      `SELECT table_name FROM information_schema.columns
        WHERE table_schema = 'public' AND column_name = 'user_id'
          AND table_name = ANY($1)`,
      [cleanupTables]
    );
    const deletableTables = new Set<string>(cleanupColsResult.rows.map((r: any) => r.table_name));
    for (const table of cleanupTables) {
      if (!deletableTables.has(table)) continue;
      await client.query(`DELETE FROM ${safeIdentifier(table)} WHERE user_id::text = $1`, [userId]);
    }

    // Anonymize the user row in place: scrub every personal identifier, give the
    // UNIQUE columns id-derived placeholders to avoid collisions, and set
    // is_active=false so the account can never be logged into again.
    //
    // Build the SET clause from columns that actually exist — the legacy prod
    // users table may be missing some of the newer profile/notification columns,
    // and referencing a non-existent column would abort the transaction.
    const colsResult = await client.query(
      `SELECT column_name FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = 'users'`
    );
    const userColumns = new Set<string>(colsResult.rows.map((r: any) => r.column_name));

    const anonValues: Record<string, any> = {
      name: 'Deleted User',
      user_name: `deleted_${userId}`,
      email: `deleted_${userId}@deleted.zpin.invalid`,
      mobile: null,
      password_hash: null,
      dob: null,
      gender: null,
      profile_image: null,
      is_active: false,
      is_verified: false,
      receive_push_notifications: false,
      receive_email_updates: false,
      receive_order_updates: false,
      updated_at: new Date(),
    };

    const setClauses: string[] = [];
    const setParams: any[] = [userId];
    for (const [col, val] of Object.entries(anonValues)) {
      if (!userColumns.has(col)) continue;
      setParams.push(val);
      setClauses.push(`${safeIdentifier(col)} = $${setParams.length}`);
    }

    await client.query(
      `UPDATE ${USERS} SET ${setClauses.join(', ')} WHERE id = $1`,
      setParams
    );

    await client.query('COMMIT');
    res.json({ success: true, message: 'Account deleted' });
  } catch (err) {
    await client.query('ROLLBACK').catch(() => {});
    console.error('deleteAccount error:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  } finally {
    client.release();
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

// ── PUT /api/v1/users/shipping-address/:addressId ────────────────────────────

router.put('/shipping-address/:addressId', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  const { name, phone, addressLine1, addressLine2, city, state, pincode, country, landmark, label, isDefault } = req.body;

  try {
    // Ownership check — verify address belongs to this user before any mutation
    const existing = await pool.query(
      `SELECT * FROM ${ADDRESSES} WHERE id = $1 AND user_id = $2`,
      [req.params.addressId, req.userId]
    );
    if (existing.rows.length === 0) {
      res.status(404).json({ success: false, message: 'Address not found' });
      return;
    }

    const current = decryptAddressPayload(existing.rows[0]);
    const setClauses: string[] = [];
    const values: any[] = [];

    const push = (col: string, val: any) => {
      values.push(val);
      setClauses.push(`${col} = $${values.length}`);
    };

    // Re-encrypt all address fields if any field is being updated
    const hasAddressField = name || phone || addressLine1 || addressLine2 !== undefined
      || city || state || pincode || country || landmark !== undefined;

    if (hasAddressField) {
      const merged = encryptAddressPayload({
        name:          name          ?? current.name,
        phone:         phone         ?? current.phone,
        address_line1: addressLine1  ?? current.address_line1,
        address_line2: addressLine2  !== undefined ? addressLine2 : current.address_line2,
        city:          city          ?? current.city,
        state:         state         ?? current.state,
        pincode:       pincode       ?? current.pincode,
        country:       country       ?? current.country ?? 'India',
        landmark:      landmark      !== undefined ? landmark : current.landmark,
      });
      for (const [col, val] of Object.entries(merged)) {
        push(col, val);
      }
    }

    if (label !== undefined) push('label', label);

    if (setClauses.length === 0 && isDefault === undefined) {
      res.status(400).json({ success: false, message: 'No fields to update' });
      return;
    }

    if (isDefault) {
      await pool.query(`UPDATE ${ADDRESSES} SET is_default = false WHERE user_id = $1`, [req.userId]);
      push('is_default', true);
    }

    setClauses.push('updated_at = NOW()');
    values.push(req.params.addressId);
    values.push(req.userId);

    const result = await pool.query(
      `UPDATE ${ADDRESSES} SET ${setClauses.join(', ')}
       WHERE id = $${values.length - 1} AND user_id = $${values.length}
       RETURNING *`,
      values
    );

    res.json({ success: true, data: normalizeAddress(result.rows[0]) });
  } catch (err) {
    console.error('updateAddress error:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// ── DELETE /api/v1/users/shipping-address/:addressId ─────────────────────────

router.delete('/shipping-address/:addressId', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    // Ownership enforced in WHERE clause — cannot delete another user's address
    const result = await pool.query(
      `DELETE FROM ${ADDRESSES} WHERE id = $1 AND user_id = $2 RETURNING id`,
      [req.params.addressId, req.userId]
    );
    if (result.rows.length === 0) {
      res.status(404).json({ success: false, message: 'Address not found' });
      return;
    }
    res.json({ success: true, message: 'Address deleted' });
  } catch (err) {
    console.error('deleteAddress error:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// ── POST /api/v1/users/block ─────────────────────────────────────────────────
// Block another user (App Store 1.2). The blocker stops seeing the blocked
// user's product reviews. Idempotent.

router.post('/block', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  const blockedUserId = typeof req.body?.userId === 'string' ? req.body.userId.trim() : '';

  if (!blockedUserId) {
    res.status(400).json({ success: false, message: 'userId is required' });
    return;
  }
  if (blockedUserId === req.userId) {
    res.status(400).json({ success: false, message: 'You cannot block yourself' });
    return;
  }

  try {
    await ensureModerationSchema();

    const target = await pool.query(`SELECT id FROM ${USERS} WHERE id = $1`, [blockedUserId]);
    if (target.rows.length === 0) {
      res.status(404).json({ success: false, message: 'User not found' });
      return;
    }

    await pool.query(
      `INSERT INTO user_blocks (id, blocker_user_id, blocked_user_id, created_at)
       VALUES ($1, $2, $3, NOW())
       ON CONFLICT (blocker_user_id, blocked_user_id) DO NOTHING`,
      [generateId(), req.userId, blockedUserId]
    );

    res.json({ success: true, message: 'User blocked' });
  } catch (err) {
    console.error('blockUser error:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// ── DELETE /api/v1/users/block/:userId ───────────────────────────────────────
// Unblock a previously blocked user.

router.delete('/block/:userId', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    await ensureModerationSchema();
    await pool.query(
      'DELETE FROM user_blocks WHERE blocker_user_id = $1 AND blocked_user_id = $2',
      [req.userId, req.params.userId]
    );
    res.json({ success: true, message: 'User unblocked' });
  } catch (err) {
    console.error('unblockUser error:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

export default router;
