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
export async function isTokenRevoked(userId: string, iat?: number): Promise<boolean> {
  if (!iat) return false;
  try {
    const { rows } = await pool.query(
      'SELECT revoked_at FROM customer_token_revocations WHERE user_id = $1',
      [userId]
    );
    if (!rows[0]) return false;
    return iat * 1000 < new Date(rows[0].revoked_at).getTime();
  } catch (err: any) {
    logger.error('auth.revocation_check_failed', { message: err?.message });
    return false;
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
    if (await isTokenRevoked(decoded.userId, decoded.iat)) {
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
