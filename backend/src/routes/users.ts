import { Response, Router } from 'express';
import { pool } from '../db';
import { authenticate, AuthRequest } from '../middleware/auth';
import { addressLimiter } from '../middleware/rateLimits';
import { isPuneAddress, OUT_OF_AREA_MESSAGE } from '../utils/delivery';
import { revokeTokensFor } from '../middleware/auth';
import { createEmailOtp, EMAIL_RE, maskEmail, normalizeEmail } from '../utils/emailOtp';
import { sendDeletionConfirmedEmail, sendOTPEmail } from '../utils/mailer';
import { decryptAddressPayload, encryptAddressPayload } from '../utils/encryption';
import { generateId } from '../utils/id';
import { ensureModerationSchema } from '../utils/moderationSchema';
import { ORDER_ITEMS_JSON } from '../utils/orderItemsSql';
import { markupItems } from '../utils/pricing';
import { PUSH_APP } from '../utils/push';
import { safeIdentifier } from '../utils/sql';
import { logger } from '../utils/logger';

const router = Router();

const USERS = safeIdentifier('users');
const ORDERS = safeIdentifier('orders');
const ORDER_ITEMS = safeIdentifier('order_items');
const ADDRESSES = safeIdentifier('addresses');
const REFRESH_TOKENS = safeIdentifier('refresh_tokens');

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
    // Same fields routes/orders.ts sends. This endpoint is the one the app's
    // order list actually calls (services/order.ts -> GET users/orders), so
    // anything missing here is missing everywhere the customer looks: group_id
    // left the app unable to merge a multi-seller checkout, and the delivery /
    // trial columns drove the Instant-Delivery screens off default values.
    groupId: row.group_id ?? null,
    userId: row.user_id,
    status: row.status,
    deliveryType: row.delivery_type ?? 'standard',
    deliveryFee: Number(row.delivery_fee || 0),
    prepaidAmount: Number(row.prepaid_amount || 0),
    isTrial: !!row.is_trial,
    trialExpiresAt: row.trial_expires_at ?? null,
    // Present only when a seller rejected the order (see routes/orders.ts) —
    // the order list uses it to show the "could not fulfil" note on the card.
    cancellationReason: row.cancellation_reason ?? null,
    // Open return on this order, if any ('requested' | 'approved' | 'picked_up').
    // The card offers "Cancel return" only before a partner has collected it.
    returnStatus: row.return_status ?? null,
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
    // Exclude only genuinely abandoned/unpaid online checkouts — plain COD orders
    // are born pending/pending and stay that way until the seller confirms them,
    // so filtering on payment_status alone hid every new COD order here too.
    // Mirrors the /abandon eligibility check in routes/orders.ts.
    const abandonedCheckout = `(status = 'pending' AND payment_status = 'pending' AND (
      LOWER(COALESCE(payment_method, '')) NOT IN ('cod', 'cash', 'cash_on_delivery')
      OR (delivery_type = 'flash' AND COALESCE(delivery_fee, 0) > 0)
    ))`;
    const countResult = await pool.query(
      `SELECT COUNT(*) FROM ${ORDERS} WHERE user_id = $1 AND NOT ${abandonedCheckout}`,
      [req.userId]
    );
    const total = Number(countResult.rows[0].count);

    const result = await pool.query(
      `SELECT o.*,
        (SELECT REPLACE(h.note, 'Rejected by seller: ', '')
           FROM order_status_history h
          WHERE h.order_id = o.id AND h.status = 'cancelled'
            AND h.note LIKE 'Rejected by seller:%'
          ORDER BY h.created_at DESC LIMIT 1) AS cancellation_reason,
        (SELECT r.status FROM return_requests r
          WHERE r.order_id = o.id AND r.status IN ('requested', 'approved', 'picked_up')
          ORDER BY r.created_at DESC LIMIT 1) AS return_status,
        COALESCE(json_agg(${ORDER_ITEMS_JSON}) FILTER (WHERE oi.id IS NOT NULL), '[]') as items
       FROM ${ORDERS} o
       LEFT JOIN ${ORDER_ITEMS} oi ON oi.order_id = o.id
       WHERE o.user_id = $1 AND NOT ${abandonedCheckout}
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
    logger.error('getuserorders_error', { error: (err as any)?.message ?? String(err) });
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
    logger.error('getaddresses_error', { error: (err as any)?.message ?? String(err) });
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
    logger.error('updateprofile_error', { error: (err as any)?.message ?? String(err) });
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// ── Account deletion ──────────────────────────────────────────────────────────
// Mirrors the customer website's flow (website-customer/backend/controllers/
// accountDeletionController.js): email-OTP confirmation, then a SOFT delete with
// a 30-day recovery window. Nothing is destroyed here.
//
// The permanent erasure is the website backend's purge sweep
// (website-customer/backend/utils/accountPurge.js), which sweeps `users` for the
// whole platform on `purge_after` — it is not per-surface, so this backend must
// not run a second one. What this endpoint must do is write the SAME columns the
// sweep looks at, or an account closed in the app would never be purged.
//
// Why the old behaviour was wrong: the previous DELETE /me anonymised the row
// immediately (no OTP, no recovery) and never set `deleted_at`, so
// (a) a mis-tap was unrecoverable, (b) the still-valid access token kept working
// until it expired — routes/auth.ts's isDeletedAccount() gates login/refresh on
// `deleted_at`, which nothing here ever set — and (c) the same person closed on
// the website and in the app left two different shapes of dead row.

const RECOVERY_DAYS = 30;

// Namespaced identically to the website so the two surfaces share one flow.
const deletionOtp = createEmailOtp('account_deletion', { ttlMs: 10 * 60 * 1000, maxAttempts: 3 });

// Orders in these states are finished — anything else is still owed to someone.
const SETTLED_STATUSES = ['delivered', 'cancelled', 'returned'];

/** The signed-in account, or null when the row is gone. */
async function loadDeletableUser(userId: string) {
  const { rows } = await pool.query(
    `SELECT id, name, email, deleted_at FROM ${USERS} WHERE id = $1`,
    [userId]
  );
  return rows[0] || null;
}

/**
 * Reasons this account cannot be closed yet, as a list so the UI can show all of
 * them at once instead of drip-feeding one blocker per attempt.
 */
async function findBlockers(userId: string): Promise<{ code: string; message: string }[]> {
  const { rows } = await pool.query(
    `SELECT COUNT(*)::int AS n FROM ${ORDERS}
      WHERE user_id = $1 AND LOWER(status) <> ALL($2::text[])`,
    [userId, SETTLED_STATUSES]
  );
  const n = rows[0].n;
  if (!n) return [];
  return [{
    code: 'OPEN_ORDERS',
    message: `You have ${n} order${n === 1 ? '' : 's'} in progress. Wait until they are delivered or cancelled.`,
  }];
}

/**
 * Soft-delete + audit row + sign-out everywhere. Idempotent: the UPDATE is
 * guarded on `deleted_at IS NULL`, so a retried request can't shorten the
 * recovery window or write a second audit row. Returns null when the account was
 * already scheduled.
 */
async function softDeleteAccount(user: any, reason: unknown, ip: string): Promise<Date | null> {
  const purgeAfter = new Date(Date.now() + RECOVERY_DAYS * 24 * 60 * 60 * 1000);
  const trimmedReason = reason ? String(reason).slice(0, 1000) : null;
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const { rows } = await client.query(
      `UPDATE ${USERS}
          SET deleted_at = NOW(), purge_after = $2, deletion_reason = $3, updated_at = NOW()
        WHERE id = $1 AND deleted_at IS NULL
        RETURNING id`,
      [user.id, purgeAfter, trimmedReason]
    );
    if (!rows.length) {
      await client.query('ROLLBACK');
      return null;
    }
    await client.query(
      `INSERT INTO account_deletion_requests (user_id, role, email, status, reason, requested_ip, purge_after)
       VALUES ($1, 'customer', $2, 'pending_recovery', $3, $4, $5)`,
      [user.id, user.email, trimmedReason, ip.slice(0, 64), purgeAfter]
    );
    await client.query('COMMIT');
  } catch (err) {
    await client.query('ROLLBACK').catch(() => {});
    throw err;
  } finally {
    client.release();
  }

  // Outside the transaction: a revoke failure must not roll back a deletion the
  // user has already confirmed. Both are needed — the revocation cut-off kills
  // the live access token, the row delete kills the refresh token behind it.
  await revokeTokensFor(user.id).catch((e: any) =>
    logger.error('deleteaccount_revoke_failed', { error: e?.message }));
  await pool
    .query(`DELETE FROM ${REFRESH_TOKENS} WHERE user_id = $1`, [user.id])
    .catch((e: any) => logger.error('deleteaccount_refresh_purge_failed', { error: e?.message }));

  // The phone must stop buzzing for an account that no longer exists — logout
  // unregisters the token, deletion never did. Swallowed: `push_tokens` is still
  // pending in SCHEMA_CHANGES.md on some environments, and a missing table must
  // not fail a deletion the user has already confirmed.
  await pool
    .query('DELETE FROM push_tokens WHERE user_id = $1 AND app = $2', [user.id, PUSH_APP])
    .catch(() => {});

  return purgeAfter;
}

// ── POST /api/v1/users/me/delete/start ────────────────────────────────────────
// Checks the blockers, then emails a 6-digit confirmation code. The code is never
// returned over HTTP, and is only persisted once the mail actually went out.

const startDeletionHandler = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const user = await loadDeletableUser(req.userId!);
    if (!user) {
      res.status(404).json({ success: false, message: 'User not found' });
      return;
    }
    if (user.deleted_at) {
      res.status(409).json({ success: false, code: 'ALREADY_DELETED', message: 'This account is already scheduled for deletion.' });
      return;
    }
    if (!EMAIL_RE.test(normalizeEmail(user.email))) {
      res.status(400).json({ success: false, message: 'This account has no valid email address. Contact support to close it.' });
      return;
    }

    const blockers = await findBlockers(user.id);
    if (blockers.length) {
      res.status(409).json({ success: false, message: 'This account cannot be deleted yet.', blockers });
      return;
    }

    if (await deletionOtp.isRateLimited(user.email)) {
      res.status(429).json({ success: false, message: 'Too many codes requested. Try again in 10 minutes.' });
      return;
    }

    const code = await deletionOtp.issue(user.email);
    try {
      await sendOTPEmail(normalizeEmail(user.email), code, 'account_deletion');
    } catch (mailErr: any) {
      logger.error('deleteaccount_otp_email_failed', { error: mailErr?.message });
      await deletionOtp.invalidateAll(user.email).catch(() => {});
      res.status(503).json({ success: false, message: 'Email service unavailable. Please try again later.' });
      return;
    }

    res.json({
      success: true,
      message: 'Confirmation code sent.',
      maskedEmail: maskEmail(user.email),
      expiresIn: deletionOtp.ttlMs / 1000,
      recoveryDays: RECOVERY_DAYS,
    });
  } catch (err) {
    logger.error('deleteaccount_start_error', { error: (err as any)?.message ?? String(err) });
    res.status(500).json({ success: false, message: 'Could not start account deletion.' });
  }
};

router.post('/me/delete/start', authenticate, startDeletionHandler);

// ── POST /api/v1/users/me/delete/resend ───────────────────────────────────────
// A 30s cooldown on top of /start's checks — never a cheaper path than /start.

router.post('/me/delete/resend', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  let wait: number;
  try {
    const user = await loadDeletableUser(req.userId!);
    if (!user) {
      res.status(404).json({ success: false, message: 'User not found' });
      return;
    }
    wait = await deletionOtp.cooldownRemaining(user.email);
  } catch (err) {
    logger.error('deleteaccount_resend_error', { error: (err as any)?.message ?? String(err) });
    res.status(500).json({ success: false, message: 'Could not resend the code.' });
    return;
  }
  if (wait > 0) {
    res.status(429).json({ success: false, message: 'Please wait before requesting another code.', retryAfter: wait });
    return;
  }
  await startDeletionHandler(req, res);
});

// ── POST /api/v1/users/me/delete/confirm ──────────────────────────────────────
// Verifies the code, re-checks the blockers (an order can arrive between the two
// calls), then soft-deletes.

router.post('/me/delete/confirm', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { code, reason } = req.body || {};
    if (!code) {
      res.status(400).json({ success: false, message: 'The emailed code is required.' });
      return;
    }

    const user = await loadDeletableUser(req.userId!);
    if (!user) {
      res.status(404).json({ success: false, message: 'User not found' });
      return;
    }
    if (user.deleted_at) {
      res.status(409).json({ success: false, code: 'ALREADY_DELETED', message: 'This account is already scheduled for deletion.' });
      return;
    }

    const check = await deletionOtp.verify(user.email, String(code));
    if (check.ok === false) {
      res.status(400).json({ success: false, message: check.error });
      return;
    }

    const blockers = await findBlockers(user.id);
    if (blockers.length) {
      res.status(409).json({ success: false, message: 'This account cannot be deleted yet.', blockers });
      return;
    }

    const purgeAfter = await softDeleteAccount(user, reason, String(req.ip || ''));
    if (!purgeAfter) {
      res.status(409).json({ success: false, code: 'ALREADY_DELETED', message: 'This account is already scheduled for deletion.' });
      return;
    }

    await deletionOtp.invalidateAll(user.email).catch(() => {});
    await sendDeletionConfirmedEmail(normalizeEmail(user.email), purgeAfter).catch((e: any) =>
      logger.error('deleteaccount_confirm_email_failed', { error: e?.message }));

    res.json({
      success: true,
      message: 'Your account has been deleted.',
      purgeAfter,
      recoveryDays: RECOVERY_DAYS,
    });
  } catch (err) {
    logger.error('deleteaccount_confirm_error', { error: (err as any)?.message ?? String(err) });
    res.status(500).json({ success: false, message: 'Could not complete account deletion.' });
  }
});

// ── DELETE /api/v1/users/me ───────────────────────────────────────────────────
// Legacy, kept only for already-installed builds that call it with no OTP step.
// It now performs the SAME soft delete as /me/delete/confirm rather than the old
// immediate anonymisation, so an old client can no longer destroy an account
// outright — the 30-day window applies to it too.

router.delete('/me', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const user = await loadDeletableUser(req.userId!);
    if (!user) {
      res.status(404).json({ success: false, message: 'User not found' });
      return;
    }
    if (user.deleted_at) {
      // Already scheduled — an old client has no recovery UI, so report success.
      res.json({ success: true, message: 'Account deleted' });
      return;
    }

    const purgeAfter = await softDeleteAccount(user, req.body?.reason, String(req.ip || ''));
    if (purgeAfter) {
      await sendDeletionConfirmedEmail(normalizeEmail(user.email), purgeAfter).catch((e: any) =>
        logger.error('deleteaccount_confirm_email_failed', { error: e?.message }));
    }
    res.json({ success: true, message: 'Account deleted' });
  } catch (err) {
    logger.error('deleteaccount_error', { error: (err as any)?.message ?? String(err) });
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
    logger.error('getuser_error', { error: (err as any)?.message ?? String(err) });
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

  // Delivery is Pune-only. The customer can be anywhere; the address can't.
  if (!isPuneAddress(city, pincode)) {
    res.status(400).json({ success: false, message: OUT_OF_AREA_MESSAGE });
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
    logger.error('addaddress_error', { error: (err as any)?.message ?? String(err) });
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
      // Re-check the merged result, not just the fields sent — a partial update
      // that moves city or pincode out of Pune must fail too.
      if (!isPuneAddress(city ?? current.city, pincode ?? current.pincode)) {
        res.status(400).json({ success: false, message: OUT_OF_AREA_MESSAGE });
        return;
      }
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
    logger.error('updateaddress_error', { error: (err as any)?.message ?? String(err) });
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
    logger.error('deleteaddress_error', { error: (err as any)?.message ?? String(err) });
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
    logger.error('blockuser_error', { error: (err as any)?.message ?? String(err) });
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
    logger.error('unblockuser_error', { error: (err as any)?.message ?? String(err) });
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

export default router;
