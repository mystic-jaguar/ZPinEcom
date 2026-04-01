import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { Request, Response, Router } from 'express';
import rateLimit from 'express-rate-limit';
import jwt from 'jsonwebtoken';
import { pool } from '../db';
import { generateId } from '../utils/id';

const router = Router();

const USERS = 'users';
const REFRESH_TOKENS = 'refresh_tokens';
const AUTH_TOKENS = 'auth_tokens';

// ─── Rate Limiters ────────────────────────────────────────────────────────────

// 10 login attempts per 15 minutes per IP
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: { success: false, message: 'Too many login attempts. Please try again in 15 minutes.' },
  standardHeaders: true,
  legacyHeaders: false,
});

// 5 OTP requests per 15 minutes per IP
const otpLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  message: { success: false, message: 'Too many OTP requests. Please try again in 15 minutes.' },
  standardHeaders: true,
  legacyHeaders: false,
});

// 3 signup attempts per hour per IP
const signupLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 3,
  message: { success: false, message: 'Too many signup attempts. Please try again later.' },
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

// Password strength: min 8 chars, at least one letter and one number
function isStrongPassword(password: string): boolean {
  return password.length >= 8 && /[a-zA-Z]/.test(password) && /[0-9]/.test(password);
}

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

// ─── POST /api/v1/auth/signup ─────────────────────────────────────────────────

router.post('/signup', signupLimiter, async (req: Request, res: Response): Promise<void> => {
  const { name, email, password, mobile, userName } = req.body;

  if (!name || !email || !password) {
    res.status(400).json({ success: false, message: 'Name, email and password are required' });
    return;
  }

  if (!isStrongPassword(password)) {
    res.status(400).json({
      success: false,
      message: 'Password must be at least 8 characters and contain at least one letter and one number',
    });
    return;
  }

  // Basic email format check
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    res.status(400).json({ success: false, message: 'Invalid email format' });
    return;
  }

  try {
    const existing = await pool.query(
      `SELECT id FROM ${USERS} WHERE email = $1`, [email.toLowerCase()]
    );
    if (existing.rows.length > 0) {
      res.status(409).json({ success: false, message: 'Email already registered' });
      return;
    }

    const passwordHash = await bcrypt.hash(password, 12);
    const generatedUserName = userName || `${email.split('@')[0]}_${Date.now()}`;

    const result = await pool.query(
      `INSERT INTO ${USERS} (id, user_name, name, email, mobile, password_hash, user_role, is_verified, is_active, created_at, updated_at)
       VALUES ($1,$2,$3,$4,$5,$6,'customer',false,true,NOW(),NOW()) RETURNING *`,
      [generateId(), generatedUserName, name, email.toLowerCase(), mobile || null, passwordHash]
    );

    const user = normalizeUser(result.rows[0]);
    const { accessToken, refreshToken } = generateTokens(user.id, user.userRole);

    await pool.query(
      `INSERT INTO ${REFRESH_TOKENS} (id, user_id, token, expires_at, created_at)
       VALUES ($1,$2,$3,NOW() + INTERVAL '30 days',NOW())`,
      [generateId(), user.id, refreshToken]
    );

    res.status(201).json({ success: true, message: 'Account created successfully', accessToken, refreshToken, user });
  } catch (err: any) {
    console.error('Signup error:', err.code);
    if (err.code === '23505') {
      const detail: string = err.detail || '';
      if (detail.includes('mobile')) {
        res.status(409).json({ success: false, message: 'Mobile number already registered' });
      } else {
        res.status(409).json({ success: false, message: 'Username already taken' });
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
      `SELECT * FROM ${USERS} WHERE email = $1 OR user_name = $1`,
      [email.toLowerCase()]
    );

    // Constant-time response to prevent user enumeration
    if (result.rows.length === 0) {
      await bcrypt.hash('dummy_prevent_timing_attack', 12); // prevent timing attack
      res.status(401).json({ success: false, message: 'Invalid email or password' });
      return;
    }

    const row = result.rows[0];

    if (!row.is_active) {
      res.status(403).json({ success: false, message: 'Account is deactivated' });
      return;
    }

    if (!row.password_hash) {
      res.status(401).json({ success: false, message: 'This account uses social login. Please sign in with Google.' });
      return;
    }

    const passwordMatch = await bcrypt.compare(password, row.password_hash);
    if (!passwordMatch) {
      res.status(401).json({ success: false, message: 'Invalid email or password' });
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
  } catch (err) {
    console.error('Login error');
    res.status(500).json({ success: false, message: 'Server error during login' });
  }
});

// ─── POST /api/v1/auth/refresh-token ─────────────────────────────────────────

router.post('/refresh-token', async (req: Request, res: Response): Promise<void> => {
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
  if (refreshToken) {
    try {
      const decoded = jwt.decode(refreshToken) as { userId?: string } | null;
      if (decoded?.userId) {
        await pool.query(`DELETE FROM ${REFRESH_TOKENS} WHERE user_id = $1`, [decoded.userId]);
      }
    } catch { /* ignore */ }
  }
  res.json({ success: true, message: 'Logged out' });
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
      `SELECT id FROM ${USERS} WHERE email = $1`, [email.toLowerCase()]
    );

    // Always return the same response to prevent email enumeration
    if (userResult.rows.length === 0) {
      res.json({ success: true, message: 'If that email exists, an OTP has been sent' });
      return;
    }

    const otp = generateOTP(); // cryptographically secure
    const userId = userResult.rows[0].id;

    await pool.query(
      `DELETE FROM ${AUTH_TOKENS} WHERE user_id = $1 AND token_type = 'password_reset'`,
      [userId]
    );
    await pool.query(
      `INSERT INTO ${AUTH_TOKENS} (id, user_id, token, token_type, is_used, expires_at, created_at)
       VALUES ($1,$2,$3,'password_reset',false,NOW() + INTERVAL '15 minutes',NOW())`,
      [generateId(), userId, otp]
    );

    // TODO: Send OTP via email service (e.g. SendGrid, AWS SES)
    // For development only — remove in production:
    if (process.env.NODE_ENV !== 'production') {
      console.log(`[DEV ONLY] Password reset OTP: ${otp}`);
    }

    // Never return OTP in response
    res.json({ success: true, message: 'If that email exists, an OTP has been sent' });
  } catch (err) {
    console.error('sendOTP error');
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// ─── POST /api/v1/auth/forgetPassword/verifyOTP ──────────────────────────────

router.post('/forgetPassword/verifyOTP', otpLimiter, async (req: Request, res: Response): Promise<void> => {
  const { email, otp } = req.body;
  if (!email || !otp) {
    res.status(400).json({ success: false, message: 'Email and OTP are required' });
    return;
  }

  try {
    const result = await pool.query(
      `SELECT at.* FROM ${AUTH_TOKENS} at
       JOIN ${USERS} u ON u.id = at.user_id
       WHERE u.email = $1
         AND at.token = $2
         AND at.token_type = 'password_reset'
         AND at.expires_at > NOW()
         AND at.is_used = false`,
      [email.toLowerCase(), otp]
    );

    if (result.rows.length === 0) {
      res.status(400).json({ success: false, message: 'Invalid or expired OTP' });
      return;
    }

    // Return a signed short-lived reset token instead of the raw OTP
    const resetToken = jwt.sign(
      { tokenId: result.rows[0].id, purpose: 'password_reset' },
      process.env.JWT_SECRET!,
      { expiresIn: '10m' }
    );

    res.json({ success: true, message: 'OTP verified', resetToken });
  } catch (err) {
    console.error('verifyOTP error');
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// ─── POST /api/v1/auth/forgetPassword/resetPassword ──────────────────────────

router.post('/forgetPassword/resetPassword', async (req: Request, res: Response): Promise<void> => {
  const { resetToken, newPassword } = req.body;
  if (!resetToken || !newPassword) {
    res.status(400).json({ success: false, message: 'Reset token and new password are required' });
    return;
  }

  if (!isStrongPassword(newPassword)) {
    res.status(400).json({
      success: false,
      message: 'Password must be at least 8 characters and contain at least one letter and one number',
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

    res.json({ success: true, message: 'Password reset successfully. Please log in again.' });
  } catch (err) {
    console.error('resetPassword error');
    res.status(400).json({ success: false, message: 'Invalid or expired reset token' });
  }
});

// ─── POST /api/v1/auth/verification/sendOTP ──────────────────────────────────

router.post('/verification/sendOTP', otpLimiter, async (req: Request, res: Response): Promise<void> => {
  const { mobile, email } = req.body;
  const otp = generateOTP(); // cryptographically secure

  try {
    await pool.query(
      `DELETE FROM ${AUTH_TOKENS}
       WHERE token_type = 'signup_verification' AND (mobile = $1 OR email = $2)`,
      [mobile || '', email || '']
    );
    await pool.query(
      `INSERT INTO ${AUTH_TOKENS} (id, mobile, email, token, token_type, is_used, expires_at, created_at)
       VALUES ($1,$2,$3,$4,'signup_verification',false,NOW() + INTERVAL '10 minutes',NOW())`,
      [generateId(), mobile || '', email || '', otp]
    );

    // TODO: Send OTP via SMS/email service
    if (process.env.NODE_ENV !== 'production') {
      console.log(`[DEV ONLY] Verification OTP: ${otp}`);
    }

    // Never return OTP in response
    res.json({ success: true, message: 'OTP sent' });
  } catch (err) {
    console.error('sendOTP error');
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// ─── POST /api/v1/auth/verification/verifyOTP ────────────────────────────────

router.post('/verification/verifyOTP', otpLimiter, async (req: Request, res: Response): Promise<void> => {
  const { mobile, email, otp } = req.body;

  try {
    const result = await pool.query(
      `SELECT * FROM ${AUTH_TOKENS}
       WHERE token_type = 'signup_verification'
         AND (mobile = $1 OR email = $2)
         AND token = $3
         AND expires_at > NOW()
         AND is_used = false`,
      [mobile || '', email || '', otp]
    );

    if (result.rows.length === 0) {
      res.status(400).json({ success: false, message: 'Invalid or expired OTP' });
      return;
    }

    await pool.query(
      `UPDATE ${AUTH_TOKENS} SET is_used = true WHERE id = $1`,
      [result.rows[0].id]
    );

    if (email) {
      await pool.query(
        `UPDATE ${USERS} SET is_verified = true, updated_at = NOW() WHERE email = $1`,
        [email.toLowerCase()]
      );
    }

    res.json({ success: true, message: 'OTP verified successfully' });
  } catch (err) {
    console.error('verifyOTP error');
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

export default router;
