import { NextFunction, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { pool } from '../db';
import { logger } from '../utils/logger';

export interface AuthRequest extends Request {
  userId?: string;
  userRole?: string;
}

/**
 * Token revocation on logout — ported from ZPinVendorApp/backend/src/middleware/auth.js
 * and the customer website (zpin-customer-main), which share the same table.
 *
 * JWTs can't be un-issued, so logout records a per-user cut-off instead: every token
 * minted at or before `revoked_at` stops being accepted. One row per user, one indexed
 * PK lookup per request. If the table is missing the check fails OPEN, so a forgotten
 * migration can't lock every shopper out.
 */
export async function revokeTokensFor(userId: string): Promise<void> {
  await pool.query(
    `INSERT INTO customer_token_revocations (user_id, revoked_at)
     VALUES ($1, date_trunc('second', NOW()))
     ON CONFLICT (user_id) DO UPDATE SET revoked_at = date_trunc('second', NOW())`,
    [userId]
  );
}

// `iat` is whole seconds, so revoked_at is truncated to the second on write: a token
// minted in the same second as the logout is kept (iat == revoked_at), rather than a
// sub-second timestamp rejecting a token the user just legitimately logged in with.
//
// The same lookup also reads `users.is_active`, so an admin suspension applies to live
// sessions on the next request — not only at login/refresh (rejectBlockedAccount in
// routes/auth.ts). Folded into the existing per-request PK query instead of a second
// query + TTL cache (the delivery app's pattern), so it costs no extra DB round trip
// and has no staleness window. Fails OPEN on DB error, same as before.
async function sessionState(userId: string, iat?: number): Promise<{ revoked: boolean; suspended: boolean }> {
  try {
    const { rows } = await pool.query(
      `SELECT u.is_active, r.revoked_at
         FROM users u
         LEFT JOIN customer_token_revocations r ON r.user_id = u.id
        WHERE u.id = $1`,
      [userId]
    );
    const row = rows[0];
    if (!row) return { revoked: false, suspended: false };
    return {
      revoked: !!iat && !!row.revoked_at && iat * 1000 < new Date(row.revoked_at).getTime(),
      suspended: row.is_active === false,
    };
  } catch (err: any) {
    logger.error('auth.session_state_check_failed', { message: err?.message });
    return { revoked: false, suspended: false };
  }
}

export async function authenticate(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  const authHeader = req.headers['authorization'];
  const headerToken = req.headers['x-auth-token'] as string;
  const cookieToken = req.cookies?.token;

  let token: string | undefined;

  if (authHeader?.startsWith('Bearer ')) {
    token = authHeader.slice(7);
  } else if (headerToken) {
    token = headerToken;
  } else if (cookieToken) {
    token = cookieToken;
  }

  if (!token) {
    res.status(401).json({ success: false, message: 'No token provided' });
    return;
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as { userId: string; userRole: string; iat?: number };
    const state = await sessionState(decoded.userId, decoded.iat);
    if (state.suspended) {
      logger.authFailure(req.ip || '', 'token_verify', 'account_deactivated', decoded.userId);
      res.status(403).json({
        success: false,
        message: 'Your account has been suspended. Please contact support at support@zpinshop.com.',
        code: 'ACCOUNT_SUSPENDED',
      });
      return;
    }
    if (state.revoked) {
      logger.authFailure(req.ip || '', 'token_verify', 'token_revoked');
      res.status(401).json({ success: false, message: 'Session expired. Please log in again.' });
      return;
    }
    req.userId = decoded.userId;
    req.userRole = decoded.userRole;
    next();
  } catch (err: any) {
    const reason = err?.name === 'TokenExpiredError' ? 'token_expired' : 'token_invalid';
    logger.authFailure(req.ip || '', 'token_verify', reason);
    res.status(401).json({ success: false, message: 'Invalid or expired token' });
  }
}
