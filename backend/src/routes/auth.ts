import appleSignin from 'apple-signin-auth';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { Request, Response, Router } from 'express';
import rateLimit, { ipKeyGenerator } from 'express-rate-limit';
import { OAuth2Client } from 'google-auth-library';
import jwt from 'jsonwebtoken';
import { pool } from '../db';
import { authenticate, AuthRequest, revokeTokensFor } from '../middleware/auth';
import { canonicalizeEmail, emailCandidates } from '../utils/canonicalizeEmail';
import { generateId } from '../utils/id';
import { logger } from '../utils/logger';
import { sendOTPEmail } from '../utils/mailer';
import { registerPushToken, removePushToken } from '../utils/push';
import { safeIdentifier } from '../utils/sql';

const router = Router();

const USERS = safeIdentifier('users');
const REFRESH_TOKENS = safeIdentifier('refresh_tokens');
const AUTH_TOKENS = safeIdentifier('auth_tokens');
const PENDING_SIGNUPS = safeIdentifier('pending_signups');

/**
 * Soft-deleted accounts must never get a session.
 *
 * `users.deleted_at` is set by the customer website's deletion flow
 * (website-customer/backend/controllers/accountDeletionController.js) and by the
 * vendor app's (ZPinVendorApp .../accountDeletionController.js). It is a column on
 * the SHARED users row, so an account closed on either of those surfaces must stop
 * working here too — it is deliberately NOT the same thing as `is_active`, which
 * means "suspended by an admin".
 *
 * Applied to every path that mints tokens: password login, refresh, Google, Apple.
 * The account stays recoverable for 30 days, so this is a refusal, not a 404.
 */
/**
 * The ONE gate every token-minting path runs (password login, refresh, Google,
 * Apple). Returns true when a 403 has been sent and the caller must stop.
 * Handles both a soft-deleted row and an admin-suspended one (`is_active`),
 * so no path can ever check one and forget the other again. Tolerates an
 * undefined row (Google/Apple first sign-in) — nothing to block yet.
 */
const rejectBlockedAccount = (req: Request, res: Response, row: any, method: string): boolean => {
  if (!row) return false;
  if (row.deleted_at) {
    logger.authFailure(req.ip || '', method, 'account_deleted', row.id);
    res.status(403).json({
      success: false,
      message: 'This account has been deleted. Contact support if you want it restored.',
      code: 'ACCOUNT_DELETED',
    });
    return true;
  }
  if (row.is_active === false) {
    logger.authFailure(req.ip || '', method, 'account_deactivated', row.id);
    res.status(403).json({
      success: false,
      message: 'Your account has been suspended. Please contact support at support@zpinshop.com.',
      code: 'ACCOUNT_SUSPENDED',
    });
    return true;
  }
  return false;
};

// ─── Rate Limiters ────────────────────────────────────────────────────────────

const isProd = process.env.NODE_ENV === 'production';

// 10 login attempts per 15 minutes per IP (dev: relaxed)
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: isProd ? 10 : 1000,
  message: { success: false, code: 'RATE_LIMITED', message: 'Too many login attempts. Please wait 15 minutes and try again. If you signed up with Google, use "Continue with Google" instead of a password.' },
  standardHeaders: true,
  legacyHeaders: false,
});

// 5 OTP requests per 15 minutes per IP (dev: relaxed)
const otpLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: isProd ? 5 : 1000,
  message: { success: false, code: 'RATE_LIMITED', message: 'Too many verification codes requested. Please wait 15 minutes before requesting another — check your spam folder for the last one.' },
  standardHeaders: true,
  legacyHeaders: false,
});

// 3 OTP verify attempts per 15 minutes per EMAIL — prevents brute-force of 6-digit
// OTPs. Was per IP: that let an attacker rotate IPs against one inbox's code, and on
// carrier NAT one customer's typos locked out everyone else verifying on that IP.
// Neither verify route tracks attempts on the stored code, so this is the only guard.
const otpVerifyLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: isProd ? 3 : 1000,
  keyGenerator: (req) => {
    const email = String(req.body?.email || '').trim().toLowerCase();
    return email ? `email:${email}` : ipKeyGenerator(req.ip || '');
  },
  message: { success: false, code: 'RATE_LIMITED', message: 'Too many incorrect codes entered. Please wait 15 minutes, then request a fresh code.' },
  standardHeaders: true,
  legacyHeaders: false,
});

// Same cap as otpVerifyLimiter but its OWN counter: resetPassword re-checks the
// OTP, so it needs brute-force protection — but sharing one counter meant two
// typos on the verify screen left no attempt for the reset itself.
const resetPasswordLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: isProd ? 3 : 1000,
  message: { success: false, code: 'RATE_LIMITED', message: 'Too many password reset attempts. Please wait 15 minutes, then request a fresh code.' },
  standardHeaders: true,
  legacyHeaders: false,
});

// Token refresh: per IP. Was 10/15min — with 15-minute access tokens, eleven
// customers behind one carrier-NAT IP was enough to 429 the rest, and the app
// treated that as a logout. A refresh token is a signed 30-day JWT matched against
// the DB, so this is flood protection, not guess protection; it can be generous.
const refreshLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: isProd ? 300 : 1000,
  message: { success: false, message: 'Too many token refresh attempts. Please try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
});
// 10 signups per hour per IP. Was 3, which real users hit on shared mobile-carrier
// NAT while retrying a signup that kept failing for another reason.
const signupLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: isProd ? 10 : 1000,
  message: { success: false, code: 'RATE_LIMITED', message: 'Too many signup attempts from this network. Please wait an hour and try again — or log in if you already have an account.' },
  standardHeaders: true,
  legacyHeaders: false,
});

// ─── Helpers ──────────────────────────────────────────────────────────────────

function generateTokens(userId: string, userRole: string) {
  const accessToken = jwt.sign(
    { userId, userRole },
    process.env.JWT_SECRET!,
    { expiresIn: '15m' }   // Short-lived access token
  );
  const refreshToken = jwt.sign(
    { userId },
    process.env.JWT_REFRESH_SECRET!,
    { expiresIn: '30d' }
  );
  return { accessToken, refreshToken };
}

// Cryptographically secure 6-digit OTP
function generateOTP(): string {
  return (crypto.randomInt(100000, 999999)).toString();
}

/**
 * Password strength: min 8 chars, at least one uppercase, one lowercase,
 * one digit, and one special character.
 * Kept in sync with the frontend validatePassword utility.
 */
function isStrongPassword(password: string): boolean {
  return (
    password.length >= 8 &&
    /[A-Z]/.test(password) &&
    /[a-z]/.test(password) &&
    /[0-9]/.test(password) &&
    /[!@#$%^&*]/.test(password)
  );
}

function normalizeUser(row: any) {
  // dob comes back from Postgres as a full ISO timestamp — strip the time part
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

// ─── POST /api/v1/auth/signup ─────────────────────────────────────────────────

router.post('/signup', signupLimiter, async (req: Request, res: Response): Promise<void> => {
  const { name, email: rawEmail, password, mobile, userName } = req.body;
  // Stored canonical, same as the website's signup, so UNIQUE(email) catches Gmail aliases.
  const email = rawEmail ? canonicalizeEmail(rawEmail) : rawEmail;

  if (!name || !email || !password) {
    res.status(400).json({ success: false, message: 'Name, email and password are required' });
    return;
  }

  if (!isStrongPassword(password)) {
    res.status(400).json({
      success: false,
      message: 'Password must be at least 8 characters and contain uppercase, lowercase, a number, and a special character (!@#$%^&*)',
    });
    return;
  }

  // Same name/mobile rules as the customer website (authController.js validateName +
  // profile mobile) — an app account that breaks them can never re-save its web profile.
  const trimmedName = String(name).trim();
  if (trimmedName.length < 2 || trimmedName.length > 100 || !/^[\p{L}\p{M}][\p{L}\p{M}\s.'’-]*$/u.test(trimmedName)) {
    res.status(400).json({ success: false, message: 'Name must be 2–100 letters (spaces, hyphens and apostrophes allowed, no numbers)' });
    return;
  }
  if (mobile && !/^[6-9]\d{9}$/.test(String(mobile))) {
    res.status(400).json({ success: false, message: 'Enter a valid 10-digit Indian mobile number' });
    return;
  }

  // Basic email format check
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    res.status(400).json({ success: false, message: 'Invalid email format' });
    return;
  }

  try {
    const existing = await pool.query(
      `SELECT id, is_verified, google_id, apple_id, password_hash, user_role FROM ${USERS} WHERE email = ANY($1::text[])`, [emailCandidates(rawEmail)]
    );
    if (existing.rows.length > 0) {
      if (existing.rows[0].is_verified) {
        const row = existing.rows[0];
        const provider = !row.password_hash && row.google_id ? 'Google' : !row.password_hash && row.apple_id ? 'Apple' : null;
        res.status(409).json({
          success: false,
          code: provider ? 'SOCIAL_LOGIN_ACCOUNT' : 'EMAIL_TAKEN',
          message: provider
            ? `This email already has a ZPIN account created with ${provider} Sign-In. Go to log in and tap "Continue with ${provider}" — no password needed.`
            : 'Email already registered. Please log in instead, or use "Forgot password" if you don\'t remember it.',
        });
        return;
      }
      // Legacy unverified CUSTOMER account (created before the verify-first flow).
      // Remove it so the email is freed and the user can complete a clean pending
      // signup. The users table is shared: an unverified seller / delivery /
      // admin row belongs to another surface's signup and is not ours to erase.
      if (existing.rows[0].user_role !== 'customer') {
        res.status(409).json({ success: false, code: 'EMAIL_TAKEN', message: 'Email already registered. Please log in instead.' });
        return;
      }
      await pool.query(`DELETE FROM ${USERS} WHERE id = $1 AND user_role = 'customer' AND is_verified = false`, [existing.rows[0].id]);
    }

    // Reject a mobile already owned by a fully registered (verified) account.
    if (mobile) {
      const mobileOwner = await pool.query(
        `SELECT id FROM ${USERS} WHERE mobile = $1 AND is_verified = true`, [mobile]
      );
      if (mobileOwner.rows.length > 0) {
        res.status(409).json({ success: false, message: 'Mobile number already registered' });
        return;
      }
    }

    const passwordHash = await bcrypt.hash(password, 12);
    const generatedUserName = userName || `${email.split('@')[0]}_${Date.now()}`;
    const otp = generateOTP();
    const otpHash = await bcrypt.hash(otp, 10);

    // Hold the signup as pending — the users row is created only once the OTP is
    // verified, so unverified emails/phones never occupy the users table. A repeat
    // signup for the same email refreshes the pending record and OTP.
    await pool.query(
      `INSERT INTO ${PENDING_SIGNUPS}
         (id, email, name, mobile, user_name, password_hash, otp_hash, expires_at, created_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7, NOW() + INTERVAL '10 minutes', NOW())
       ON CONFLICT (email) DO UPDATE SET
         name = EXCLUDED.name,
         mobile = EXCLUDED.mobile,
         user_name = EXCLUDED.user_name,
         password_hash = EXCLUDED.password_hash,
         otp_hash = EXCLUDED.otp_hash,
         expires_at = EXCLUDED.expires_at,
         created_at = NOW()`,
      [generateId(), email.toLowerCase(), name, mobile || null, generatedUserName, passwordHash, otpHash]
    );

    let otpEmailSent = true;
    try {
      await sendOTPEmail(email.toLowerCase(), otp, 'verification');
    } catch (mailErr: any) {
      // Pending signup is stored; the email just failed to send. Tell the client the
      // truth so it can prompt a resend instead of waiting for an OTP that never arrived.
      otpEmailSent = false;
      logger.warn('auth.signup_otp_email_failed', {
        email: email.toLowerCase(),
        error: mailErr?.message,
      });
    }

    // No tokens yet — the account is not created until the OTP is verified.
    res.status(201).json({
      success: true,
      otpEmailSent,
      requiresVerification: true,
      email: email.toLowerCase(),
      message: otpEmailSent
        ? 'Verification code sent. Enter the OTP to finish creating your account.'
        : "We couldn't send the verification code right now. Please tap Resend to try again.",
    });
    logger.authSuccess('pending', req.ip || '', 'signup_pending');
  } catch (err: any) {
    logger.error('signup_error', { error: err.code });
    if (err.code === '23505') {
      const detail: string = err.detail || '';
      if (detail.includes('mobile')) {
        res.status(409).json({ success: false, message: 'Mobile number already registered' });
      } else if (detail.includes('user_name')) {
        res.status(409).json({ success: false, message: 'Username already taken' });
      } else {
        res.status(409).json({ success: false, message: 'Email already registered' });
      }
      return;
    }
    res.status(500).json({ success: false, message: 'Server error during signup' });
  }
});

// ─── POST /api/v1/auth/login ──────────────────────────────────────────────────

router.post('/login', loginLimiter, async (req: Request, res: Response): Promise<void> => {
  const { email, password } = req.body;

  if (!email || !password) {
    res.status(400).json({ success: false, message: 'Email and password are required' });
    return;
  }

  try {
    const result = await pool.query(
      `SELECT * FROM ${USERS} WHERE email = ANY($1::text[]) OR user_name = $2`,
      [emailCandidates(email), String(email).trim().toLowerCase()]
    );

    // Constant-time response to prevent user enumeration
    if (result.rows.length === 0) {
      await bcrypt.hash('dummy_prevent_timing_attack', 12); // prevent timing attack
      logger.authFailure(req.ip || '', 'login', 'user_not_found', email.toLowerCase());
      res.status(401).json({ success: false, message: 'Invalid email or password' });
      return;
    }

    const row = result.rows[0];

    if (rejectBlockedAccount(req, res, row, 'login')) return;

    if (!row.password_hash) {
      logger.authFailure(req.ip || '', 'login', 'social_login_account', row.id);
      const provider = row.google_id ? 'Google' : row.apple_id ? 'Apple' : null;
      res.status(401).json({
        success: false,
        code: 'SOCIAL_LOGIN_ACCOUNT',
        message: provider
          ? `This email is registered with ${provider} Sign-In. Tap "Continue with ${provider}" below — this account has no password.`
          : 'This account uses social sign-in. Use the social sign-in button below instead of a password.',
      });
      return;
    }

    const passwordMatch = await bcrypt.compare(password, row.password_hash);
    if (!passwordMatch) {
      logger.authFailure(req.ip || '', 'login', 'wrong_password', row.id);
      res.status(401).json({ success: false, message: 'Invalid email or password' });
      return;
    }

    if (!row.is_verified) {
      logger.authFailure(req.ip || '', 'login', 'email_not_verified', row.id);
      res.status(403).json({
        success: false,
        message: 'Email not verified. Please check your inbox for the verification OTP.',
        code: 'EMAIL_NOT_VERIFIED',
      });
      return;
    }

    const user = normalizeUser(row);
    const { accessToken, refreshToken } = generateTokens(user.id, user.userRole);

    await pool.query(`DELETE FROM ${REFRESH_TOKENS} WHERE user_id = $1`, [user.id]);
    await pool.query(
      `INSERT INTO ${REFRESH_TOKENS} (id, user_id, token, expires_at, created_at)
       VALUES ($1,$2,$3,NOW() + INTERVAL '30 days',NOW())`,
      [generateId(), user.id, refreshToken]
    );

    res.json({ success: true, message: 'Login successful', accessToken, refreshToken, user });
    logger.authSuccess(user.id, req.ip || '', 'login');
  } catch (err) {
    logger.error('login_error');
    res.status(500).json({ success: false, message: 'Server error during login' });
  }
});

// ─── POST /api/v1/auth/refresh-token ─────────────────────────────────────────

router.post('/refresh-token', refreshLimiter, async (req: Request, res: Response): Promise<void> => {
  const { refreshToken } = req.body;
  if (!refreshToken) {
    res.status(400).json({ success: false, message: 'Refresh token required' });
    return;
  }

  try {
    const decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET!) as { userId: string };

    const stored = await pool.query(
      `SELECT * FROM ${REFRESH_TOKENS} WHERE user_id = $1 AND token = $2 AND expires_at > NOW()`,
      [decoded.userId, refreshToken]
    );
    if (stored.rows.length === 0) {
      res.status(401).json({ success: false, message: 'Invalid or expired refresh token' });
      return;
    }

    const userResult = await pool.query(`SELECT * FROM ${USERS} WHERE id = $1`, [decoded.userId]);
    if (userResult.rows.length === 0) {
      res.status(401).json({ success: false, message: 'User not found' });
      return;
    }

    if (rejectBlockedAccount(req, res, userResult.rows[0], 'refresh_token')) return;

    const user = normalizeUser(userResult.rows[0]);
    const tokens = generateTokens(user.id, user.userRole);

    // Rotate refresh token
    await pool.query(`DELETE FROM ${REFRESH_TOKENS} WHERE user_id = $1`, [user.id]);
    await pool.query(
      `INSERT INTO ${REFRESH_TOKENS} (id, user_id, token, expires_at, created_at)
       VALUES ($1,$2,$3,NOW() + INTERVAL '30 days',NOW())`,
      [generateId(), user.id, tokens.refreshToken]
    );

    res.json({ success: true, accessToken: tokens.accessToken, refreshToken: tokens.refreshToken });
  } catch {
    res.status(401).json({ success: false, message: 'Invalid refresh token' });
  }
});

// ─── POST /api/v1/auth/logout ─────────────────────────────────────────────────

router.post('/logout', async (req: Request, res: Response): Promise<void> => {
  const { refreshToken } = req.body;
  let userId: string | undefined;

  if (refreshToken) {
    try {
      // Verify the token signature before trusting the userId claim.
      // Using jwt.decode() here would allow an attacker to forge a token
      // with any userId and wipe that user's refresh tokens (session hijack).
      const decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET!) as { userId?: string };
      if (decoded?.userId) {
        userId = decoded.userId;
        await pool.query(`DELETE FROM ${REFRESH_TOKENS} WHERE user_id = $1`, [decoded.userId]);
      }
    } catch { /* ignore — invalid token, nothing to revoke */ }
  }

  // A client may log out with only the access token (no refresh token in the body);
  // fall back to it so the revocation cut-off still gets written.
  if (!userId) {
    const header = req.headers['authorization'];
    const accessToken = header?.startsWith('Bearer ')
      ? header.slice(7)
      : (req.headers['x-auth-token'] as string) || (req as any).cookies?.token;
    if (accessToken) {
      try {
        const decoded = jwt.verify(accessToken, process.env.JWT_SECRET!) as { userId?: string };
        userId = decoded?.userId;
      } catch { /* ignore — invalid token, nothing to revoke */ }
    }
  }

  // Logout ends the APP session only (owner decision 2026-10-02): its refresh
  // tokens are gone above, so it can't renew. customer_token_revocations is NOT
  // written here — that row is shared with the customer website, and writing it
  // signed the shopper out of the website too.
  // ponytail: the current access token stays valid until it expires (≤15 min);
  // per-surface revocation would need a column on the shared table (schema change).
  if (userId) logger.info('auth.logout', { userId });
  res.json({ success: true, message: 'Logged out' });
});

// ─── Device push tokens ──────────────────────────────────────────────────────
// Registered after login, removed before logout (so the next person to use the
// phone doesn't get this customer's order updates). Both no-op while the
// `push_tokens` table is still unapplied — see SCHEMA_CHANGES.md.

router.post('/push/register', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  const registered = await registerPushToken(req.userId!, req.body?.token, req.body?.platform);
  res.json({ success: true, registered });
});

router.post('/push/unregister', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  await removePushToken(req.body?.token, req.userId!);
  res.json({ success: true });
});

// ─── POST /api/v1/auth/forgetPassword/sendOTP ────────────────────────────────

router.post('/forgetPassword/sendOTP', otpLimiter, async (req: Request, res: Response): Promise<void> => {
  const { email } = req.body;
  if (!email) {
    res.status(400).json({ success: false, message: 'Email is required' });
    return;
  }

  try {
    const userResult = await pool.query(
      `SELECT id, google_id, apple_id, password_hash FROM ${USERS} WHERE email = ANY($1::text[])`, [emailCandidates(email)]
    );

    // Always return the same response to prevent email enumeration
    if (userResult.rows.length === 0) {
      res.json({ success: true, message: 'If that email exists, an OTP has been sent' });
      return;
    }

    // Social-only account: there is no password to reset. Say so instead of mailing
    // an OTP for a password the account never had. Same disclosure the login route
    // already makes for these accounts, so no new enumeration surface.
    if (!userResult.rows[0].password_hash) {
      const provider = userResult.rows[0].google_id ? 'Google' : userResult.rows[0].apple_id ? 'Apple' : null;
      res.status(409).json({
        success: false,
        code: 'SOCIAL_LOGIN_ACCOUNT',
        message: provider
          ? `This email is registered with ${provider} Sign-In, so it has no password to reset. Go back and tap "Continue with ${provider}" to sign in.`
          : 'This account uses social sign-in, so it has no password to reset. Go back and sign in with the provider you signed up with.',
      });
      return;
    }

    const otp = generateOTP(); // cryptographically secure
    const userId = userResult.rows[0].id;

    // Hash the OTP before storing — prevents plaintext exposure if DB is compromised
    const otpHash = await bcrypt.hash(otp, 10);

    await pool.query(
      `DELETE FROM ${AUTH_TOKENS} WHERE user_id = $1 AND token_type = 'password_reset'`,
      [userId]
    );
    await pool.query(
      `INSERT INTO ${AUTH_TOKENS} (id, user_id, token, token_type, is_used, expires_at, created_at)
       VALUES ($1,$2,$3,'password_reset',false,NOW() + INTERVAL '15 minutes',NOW())`,
      [generateId(), userId, otpHash]
    );

    await sendOTPEmail(String(email).trim().toLowerCase(), otp, 'password_reset');

    // Never return OTP in response
    res.json({ success: true, message: 'If that email exists, an OTP has been sent' });
  } catch (err) {
    logger.error('sendotp_error');
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// ─── POST /api/v1/auth/forgetPassword/verifyOTP ──────────────────────────────

router.post('/forgetPassword/verifyOTP', otpVerifyLimiter, async (req: Request, res: Response): Promise<void> => {
  const { email, otp } = req.body;
  if (!email || !otp) {
    res.status(400).json({ success: false, message: 'Email and OTP are required' });
    return;
  }

  try {
    // Fetch all unexpired, unused tokens for this email — then bcrypt.compare
    // each one. This is necessary because the OTP is stored hashed.
    const result = await pool.query(
      `SELECT at.* FROM ${AUTH_TOKENS} at
       JOIN ${USERS} u ON u.id = at.user_id
       WHERE u.email = ANY($1::text[])
         AND at.token_type = 'password_reset'
         AND at.expires_at > NOW()
         AND at.is_used = false`,
      [emailCandidates(email)]
    );

    if (result.rows.length === 0) {
      res.status(400).json({ success: false, message: 'Invalid or expired OTP' });
      return;
    }

    // Compare the submitted OTP against each stored hash
    let matchedRow: any = null;
    for (const row of result.rows) {
      const isMatch = await bcrypt.compare(otp, row.token);
      if (isMatch) { matchedRow = row; break; }
    }

    if (!matchedRow) {
      res.status(400).json({ success: false, message: 'Invalid or expired OTP' });
      return;
    }

    // Return a signed short-lived reset token instead of the raw OTP
    const resetToken = jwt.sign(
      { tokenId: matchedRow.id, purpose: 'password_reset' },
      process.env.JWT_SECRET!,
      { expiresIn: '10m' }
    );

    res.json({ success: true, message: 'OTP verified', resetToken });
  } catch (err) {
    logger.error('verifyotp_error');
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// ─── POST /api/v1/auth/forgetPassword/resetPassword ──────────────────────────

router.post('/forgetPassword/resetPassword', resetPasswordLimiter, async (req: Request, res: Response): Promise<void> => {
  const { resetToken, newPassword } = req.body;
  if (!resetToken || !newPassword) {
    res.status(400).json({ success: false, message: 'Reset token and new password are required' });
    return;
  }

  if (!isStrongPassword(newPassword)) {
    res.status(400).json({
      success: false,
      message: 'Password must be at least 8 characters and contain uppercase, lowercase, a number, and a special character (!@#$%^&*)',
    });
    return;
  }

  try {
    // Verify the signed reset token
    const decoded = jwt.verify(resetToken, process.env.JWT_SECRET!) as { tokenId: string; purpose: string };
    if (decoded.purpose !== 'password_reset') {
      res.status(400).json({ success: false, message: 'Invalid reset token' });
      return;
    }

    const result = await pool.query(
      `SELECT * FROM ${AUTH_TOKENS} WHERE id = $1 AND token_type = 'password_reset' AND is_used = false AND expires_at > NOW()`,
      [decoded.tokenId]
    );
    if (result.rows.length === 0) {
      res.status(400).json({ success: false, message: 'Invalid or expired reset token' });
      return;
    }

    const userId = result.rows[0].user_id;
    const passwordHash = await bcrypt.hash(newPassword, 12);

    await pool.query(
      `UPDATE ${USERS} SET password_hash = $1, updated_at = NOW() WHERE id = $2`,
      [passwordHash, userId]
    );
    // Mark token used AND invalidate all refresh tokens (force re-login)
    await pool.query(
      `UPDATE ${AUTH_TOKENS} SET is_used = true WHERE id = $1`,
      [decoded.tokenId]
    );
    await pool.query(`DELETE FROM ${REFRESH_TOKENS} WHERE user_id = $1`, [userId]);
    // Also kills live access tokens here and on the website (shared revocation row).
    await revokeTokensFor(userId);

    res.json({ success: true, message: 'Password reset successfully. Please log in again.' });
    logger.security('auth.password_reset', { userId, ip: req.ip || '' });
  } catch (err) {
    logger.error('resetpassword_error');
    res.status(400).json({ success: false, message: 'Invalid or expired reset token' });
  }
});

// ─── POST /api/v1/auth/verification/sendOTP ──────────────────────────────────

router.post('/verification/sendOTP', otpLimiter, async (req: Request, res: Response): Promise<void> => {
  const { email } = req.body;
  if (!email) {
    res.status(400).json({ success: false, message: 'Email is required' });
    return;
  }

  const normalizedEmail = canonicalizeEmail(email);
  const otp = generateOTP(); // cryptographically secure
  const otpHash = await bcrypt.hash(otp, 10); // hash before storing

  let hasPending = false;
  try {
    // Refresh the OTP on the pending signup for this email, if one exists.
    const updated = await pool.query(
      `UPDATE ${PENDING_SIGNUPS}
         SET otp_hash = $1, expires_at = NOW() + INTERVAL '10 minutes'
       WHERE email = $2
       RETURNING id`,
      [otpHash, normalizedEmail]
    );
    hasPending = updated.rows.length > 0;
  } catch (err) {
    logger.error('sendotp_db_error');
    res.status(500).json({ success: false, message: 'Server error' });
    return;
  }

  // No pending signup for this email — respond success without revealing that,
  // to avoid leaking which emails are mid-signup.
  if (!hasPending) {
    res.json({ success: true, message: 'OTP sent' });
    return;
  }

  // Send the email in its own block so a mail failure is reported distinctly
  // from a DB failure — this is what surfaces SMTP misconfiguration to the client.
  try {
    await sendOTPEmail(normalizedEmail, otp, 'verification');
    // Never return OTP in response
    res.json({ success: true, message: 'OTP sent' });
  } catch (mailErr: any) {
    logger.warn('auth.verification_otp_email_failed', { email: normalizedEmail, error: mailErr?.message });
    res.status(502).json({
      success: false,
      message: "We couldn't send the verification email right now. Please try again in a moment.",
    });
  }
});

// ─── POST /api/v1/auth/verification/verifyOTP ────────────────────────────────

router.post('/verification/verifyOTP', otpVerifyLimiter, async (req: Request, res: Response): Promise<void> => {
  const { email, otp } = req.body;
  if (!email || !otp) {
    res.status(400).json({ success: false, message: 'Email and OTP are required' });
    return;
  }

  try {
    // Find the pending signup for this email (OTP is stored hashed).
    const pendingResult = await pool.query(
      `SELECT * FROM ${PENDING_SIGNUPS} WHERE email = $1 AND expires_at > NOW()`,
      [canonicalizeEmail(email)]
    );

    if (pendingResult.rows.length === 0) {
      res.status(400).json({ success: false, message: 'Invalid or expired OTP' });
      return;
    }

    const pending = pendingResult.rows[0];
    const isMatch = await bcrypt.compare(otp, pending.otp_hash);
    if (!isMatch) {
      res.status(400).json({ success: false, message: 'Invalid or expired OTP' });
      return;
    }

    // OTP is valid — create the verified user now, from the pending data.
    let user;
    try {
      const insert = await pool.query(
        `INSERT INTO ${USERS} (id, user_name, name, email, mobile, password_hash, user_role, is_verified, is_active, created_at, updated_at)
         VALUES ($1,$2,$3,$4,$5,$6,'customer',true,true,NOW(),NOW()) RETURNING *`,
        [generateId(), pending.user_name, pending.name, pending.email, pending.mobile, pending.password_hash]
      );
      user = normalizeUser(insert.rows[0]);
    } catch (insErr: any) {
      // Another account claimed the email/mobile/username between signup and verify.
      if (insErr.code === '23505') {
        await pool.query(`DELETE FROM ${PENDING_SIGNUPS} WHERE id = $1`, [pending.id]);
        const detail: string = insErr.detail || '';
        if (detail.includes('mobile')) {
          res.status(409).json({ success: false, message: 'Mobile number already registered' });
        } else if (detail.includes('email')) {
          res.status(409).json({ success: false, message: 'Email already registered' });
        } else {
          res.status(409).json({ success: false, message: 'Username already taken' });
        }
        return;
      }
      throw insErr;
    }

    // Consume the pending signup and issue tokens — the user is signed in immediately.
    await pool.query(`DELETE FROM ${PENDING_SIGNUPS} WHERE id = $1`, [pending.id]);

    const { accessToken, refreshToken } = generateTokens(user.id, user.userRole);
    await pool.query(
      `INSERT INTO ${REFRESH_TOKENS} (id, user_id, token, expires_at, created_at)
       VALUES ($1,$2,$3,NOW() + INTERVAL '30 days',NOW())`,
      [generateId(), user.id, refreshToken]
    );

    res.json({
      success: true,
      message: 'Email verified. You are now signed in.',
      accessToken,
      refreshToken,
      user,
    });
    logger.authSuccess(user.id, req.ip || '', 'signup_verified');
  } catch (err) {
    logger.error('verifyotp_error');
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// ─── POST /api/v1/auth/google ─────────────────────────────────────────────────

const parseClientIds = (value?: string) =>
  (value || '')
    .split(',')
    .map((id) => id.trim())
    .filter(Boolean);

const googleWebClientIds = parseClientIds(process.env.GOOGLE_WEB_CLIENT_ID);
const googleAndroidClientIds = parseClientIds(process.env.GOOGLE_ANDROID_CLIENT_ID);
const googleAudience = Array.from(new Set([...googleWebClientIds, ...googleAndroidClientIds]));
const googleClient = new OAuth2Client();

router.post('/google', loginLimiter, async (req: Request, res: Response): Promise<void> => {
  const { idToken, accessToken } = req.body;

  if (!idToken) {
    res.status(400).json({ success: false, message: 'Google ID token is required' });
    return;
  }

  try {
    // Verify the Google ID token
    if (googleAudience.length === 0) {
      logger.error('auth.google_config_missing', { message: 'Missing Google OAuth client IDs' });
      res.status(500).json({ success: false, message: 'Google authentication is not configured' });
      return;
    }

    const ticket = await googleClient.verifyIdToken({
      idToken,
      audience: googleAudience,
    });

    const payload = ticket.getPayload();
    if (!payload || !payload.email) {
      res.status(401).json({ success: false, message: 'Invalid Google token' });
      return;
    }
    // The row is looked up BY EMAIL below and the Google id is linked to it. A
    // Google account whose address Google has not verified could otherwise claim
    // any existing ZPIN account that uses that address.
    if (payload.email_verified !== true) {
      res.status(401).json({ success: false, message: 'Your Google account email is not verified' });
      return;
    }

    const { email, name, sub: googleId, picture } = payload;
    const normalizedEmail = canonicalizeEmail(email);

    let dob: string | null = null;
    let gender: string | null = null;

    if (accessToken) {
      try {
        const peopleResponse = await googleClient.request({
          url: 'https://people.googleapis.com/v1/people/me?personFields=birthdays,genders',
          method: 'GET',
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        });
        const data = peopleResponse.data as any;

        if (data.birthdays && data.birthdays.length > 0) {
          const birthday = data.birthdays.find((b: any) => b.date && b.date.year && b.date.month && b.date.day);
          if (birthday) {
            const { year, month, day } = birthday.date;
            dob = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
          }
        }

        if (data.genders && data.genders.length > 0) {
          const genderObj = data.genders.find((g: any) => g.value);
          if (genderObj) {
            const val = genderObj.value.toLowerCase();
            if (val === 'male') {
              gender = 'Male';
            } else if (val === 'female') {
              gender = 'Female';
            } else {
              gender = 'Do not wish to specify';
            }
          }
        }
      } catch (err: any) {
        logger.error('auth.google_people_api_error', { message: err.message });
      }
    }

    // Check if user already exists
    let userResult = await pool.query(
      `SELECT * FROM ${USERS} WHERE email = ANY($1::text[])`,
      [emailCandidates(email)]
    );

    let user = userResult.rows[0];

    // Before the link/update branch below: a deleted account must not be
    // silently revived (and re-verified) by signing in with Google.
    if (rejectBlockedAccount(req, res, user, 'google_login')) return;

    if (!user) {
      // Create new user from Google account
      const userId = generateId();
      const userName = normalizedEmail.split('@')[0] + '_' + userId.slice(0, 4);
      const insertResult = await pool.query(
        `INSERT INTO ${USERS} (id, name, email, user_name, user_role, is_verified, google_id, dob, gender, profile_image, created_at, updated_at)
         VALUES ($1, $2, $3, $4, 'customer', true, $5, $6, $7, $8, NOW(), NOW())
         RETURNING *`,
        [userId, name || normalizedEmail, normalizedEmail, userName, googleId, dob, gender, picture || null]
      );
      user = insertResult.rows[0];
      logger.info('auth.google_signup', { userId, email: normalizedEmail, ip: req.ip || '' });
    } else {
      // Update google_id and other details if not set
      const updateFields: string[] = [];
      const updateParams: any[] = [];

      if (!user.google_id) {
        updateParams.push(googleId);
        updateFields.push(`google_id = $${updateParams.length}`);
      }
      if (!user.dob && dob) {
        updateParams.push(dob);
        updateFields.push(`dob = $${updateParams.length}`);
      }
      if (!user.gender && gender) {
        updateParams.push(gender);
        updateFields.push(`gender = $${updateParams.length}`);
      }
      if (!user.profile_image && picture) {
        updateParams.push(picture);
        updateFields.push(`profile_image = $${updateParams.length}`);
      }

      if (updateFields.length > 0) {
        updateParams.push(user.id);
        await pool.query(
          `UPDATE ${USERS} SET ${updateFields.join(', ')}, is_verified = true, updated_at = NOW() WHERE id = $${updateParams.length}`,
          updateParams
        );
        // Refresh user row
        const refreshed = await pool.query(`SELECT * FROM ${USERS} WHERE id = $1`, [user.id]);
        user = refreshed.rows[0];
      }
      logger.info('auth.google_login', { userId: user.id, email: normalizedEmail, ip: req.ip || '' });
    }

    const { accessToken: apiAccessToken, refreshToken } = generateTokens(user.id, user.user_role);

    // Rotate: delete any existing refresh tokens for this user before issuing a new one
    await pool.query(`DELETE FROM ${REFRESH_TOKENS} WHERE user_id = $1`, [user.id]);
    await pool.query(
      `INSERT INTO ${REFRESH_TOKENS} (id, user_id, token, expires_at, created_at)
       VALUES ($1, $2, $3, NOW() + INTERVAL '30 days', NOW())`,
      [generateId(), user.id, refreshToken]
    );

    res.json({
      success: true,
      message: 'Google authentication successful',
      accessToken: apiAccessToken,
      refreshToken,
      user: normalizeUser(user),
    });
  } catch (err: any) {
    logger.error('auth.google_error', { message: err.message, ip: req.ip || '' });
    res.status(401).json({ success: false, message: 'Google authentication failed' });
  }
});

// ─── POST /api/v1/auth/apple ──────────────────────────────────────────────────

// Audience = the iOS bundle identifier(s) the identity token was issued for.
const appleAudience = (() => {
  const ids = parseClientIds(process.env.APPLE_CLIENT_IDS);
  return ids.length > 0 ? ids : ['com.zpin.ecom'];
})();

function composeAppleName(fullName: any): string | null {
  if (!fullName) return null;
  const parts = [fullName.givenName, fullName.familyName].filter(Boolean);
  return parts.length > 0 ? parts.join(' ') : null;
}

router.post('/apple', loginLimiter, async (req: Request, res: Response): Promise<void> => {
  const { identityToken, rawNonce, fullName } = req.body;

  if (!identityToken) {
    res.status(400).json({ success: false, message: 'Apple identity token is required' });
    return;
  }

  try {

    // Verify signature against Apple's public keys + audience + expiry.
    const claims = await appleSignin.verifyIdToken(identityToken, {
      audience: appleAudience,
      ignoreExpiration: false,
    });

    // Bind the token to this sign-in attempt: token.nonce must equal the SHA256
    // of the raw nonce the client kept secret. Prevents replay of a stolen token.
    if (rawNonce) {
      const expectedNonce = crypto.createHash('sha256').update(String(rawNonce)).digest('hex');
      if (claims.nonce !== expectedNonce) {
        res.status(401).json({ success: false, message: 'Invalid Apple token (nonce mismatch)' });
        return;
      }
    }

    const appleId = claims.sub;
    const email = claims.email ? canonicalizeEmail(String(claims.email)) : null;

    if (!appleId) {
      res.status(401).json({ success: false, message: 'Invalid Apple token' });
      return;
    }

    // Match by apple_id first, then fall back to a matching email (so an
    // existing email/password or Google account gets linked, not duplicated).
    let userResult = await pool.query(`SELECT * FROM ${USERS} WHERE apple_id = $1`, [appleId]);
    let user = userResult.rows[0];

    if (!user && email) {
      userResult = await pool.query(`SELECT * FROM ${USERS} WHERE email = ANY($1::text[])`, [emailCandidates(String(claims.email))]);
      user = userResult.rows[0];
    }

    // Same as Google: signing in with Apple must not revive a deleted account.
    if (rejectBlockedAccount(req, res, user, 'apple_login')) return;

    if (!user) {
      // First-ever sign-in: Apple only returns the email (and name) once, here.
      if (!email) {
        res.status(401).json({ success: false, message: 'Apple did not provide an email. Please try again.' });
        return;
      }
      const userId = generateId();
      const name = composeAppleName(fullName) || email.split('@')[0];
      const userName = email.split('@')[0] + '_' + userId.slice(0, 4);
      const insertResult = await pool.query(
        `INSERT INTO ${USERS} (id, name, email, user_name, user_role, is_verified, apple_id, created_at, updated_at)
         VALUES ($1, $2, $3, $4, 'customer', true, $5, NOW(), NOW())
         RETURNING *`,
        [userId, name, email, userName, appleId]
      );
      user = insertResult.rows[0];
      logger.info('auth.apple_signup', { userId, email, ip: req.ip || '' });
    } else if (!user.apple_id) {
      // Existing account (matched by email) — link the Apple identity to it.
      await pool.query(
        `UPDATE ${USERS} SET apple_id = $1, is_verified = true, updated_at = NOW() WHERE id = $2`,
        [appleId, user.id]
      );
      const refreshed = await pool.query(`SELECT * FROM ${USERS} WHERE id = $1`, [user.id]);
      user = refreshed.rows[0];
      logger.info('auth.apple_link', { userId: user.id, email, ip: req.ip || '' });
    } else {
      logger.info('auth.apple_login', { userId: user.id, email, ip: req.ip || '' });
    }

    const { accessToken: apiAccessToken, refreshToken } = generateTokens(user.id, user.user_role);

    // Rotate: drop existing refresh tokens before issuing a new one.
    await pool.query(`DELETE FROM ${REFRESH_TOKENS} WHERE user_id = $1`, [user.id]);
    await pool.query(
      `INSERT INTO ${REFRESH_TOKENS} (id, user_id, token, expires_at, created_at)
       VALUES ($1, $2, $3, NOW() + INTERVAL '30 days', NOW())`,
      [generateId(), user.id, refreshToken]
    );

    res.json({
      success: true,
      message: 'Apple authentication successful',
      accessToken: apiAccessToken,
      refreshToken,
      user: normalizeUser(user),
    });
  } catch (err: any) {
    logger.error('auth.apple_error', { message: err.message, ip: req.ip || '' });
    res.status(401).json({ success: false, message: 'Apple authentication failed' });
  }
});

export default router;

