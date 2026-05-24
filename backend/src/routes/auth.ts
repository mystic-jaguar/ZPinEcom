import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { Request, Response, Router } from 'express';
import rateLimit from 'express-rate-limit';
import { OAuth2Client } from 'google-auth-library';
import jwt from 'jsonwebtoken';
import { pool } from '../db';
import { generateId } from '../utils/id';
import { logger } from '../utils/logger';
import { safeIdentifier } from '../utils/sql';

const router = Router();

const USERS = safeIdentifier('users');
const REFRESH_TOKENS = safeIdentifier('refresh_tokens');
const AUTH_TOKENS = safeIdentifier('auth_tokens');

// ─── Rate Limiters ────────────────────────────────────────────────────────────

const isProd = process.env.NODE_ENV === 'production';

// 10 login attempts per 15 minutes per IP (dev: relaxed)
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: isProd ? 10 : 1000,
  message: { success: false, message: 'Too many login attempts. Please try again in 15 minutes.' },
  standardHeaders: true,
  legacyHeaders: false,
});

// 5 OTP requests per 15 minutes per IP (dev: relaxed)
const otpLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: isProd ? 5 : 1000,
  message: { success: false, message: 'Too many OTP requests. Please try again in 15 minutes.' },
  standardHeaders: true,
  legacyHeaders: false,
});

// 3 OTP verify attempts per 15 minutes per IP — prevents brute-force of 6-digit OTPs
const otpVerifyLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: isProd ? 3 : 1000,
  message: { success: false, message: 'Too many OTP verification attempts. Please request a new OTP.' },
  standardHeaders: true,
  legacyHeaders: false,
});

// 10 token refresh attempts per 15 minutes per IP (dev: relaxed)
const refreshLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: isProd ? 10 : 1000,
  message: { success: false, message: 'Too many token refresh attempts. Please try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
});
const signupLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: isProd ? 3 : 1000,
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
    logger.authSuccess(user.id, req.ip || '', 'signup');
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
      logger.authFailure(req.ip || '', 'login', 'user_not_found', email.toLowerCase());
      res.status(401).json({ success: false, message: 'Invalid email or password' });
      return;
    }

    const row = result.rows[0];

    if (!row.is_active) {
      logger.authFailure(req.ip || '', 'login', 'account_deactivated', row.id);
      res.status(403).json({ success: false, message: 'Account is deactivated' });
      return;
    }

    if (!row.password_hash) {
      logger.authFailure(req.ip || '', 'login', 'social_login_account', row.id);
      res.status(401).json({ success: false, message: 'This account uses social login. Please sign in with Google.' });
      return;
    }

    const passwordMatch = await bcrypt.compare(password, row.password_hash);
    if (!passwordMatch) {
      logger.authFailure(req.ip || '', 'login', 'wrong_password', row.id);
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
    logger.authSuccess(user.id, req.ip || '', 'login');
  } catch (err) {
    console.error('Login error');
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
      // Verify the token signature before trusting the userId claim.
      // Using jwt.decode() here would allow an attacker to forge a token
      // with any userId and wipe that user's refresh tokens (session hijack).
      const decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET!) as { userId?: string };
      if (decoded?.userId) {
        await pool.query(`DELETE FROM ${REFRESH_TOKENS} WHERE user_id = $1`, [decoded.userId]);
      }
    } catch { /* ignore — invalid token, nothing to revoke */ }
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

router.post('/forgetPassword/verifyOTP', otpVerifyLimiter, async (req: Request, res: Response): Promise<void> => {
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

router.post('/forgetPassword/resetPassword', otpVerifyLimiter, async (req: Request, res: Response): Promise<void> => {
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
    logger.security('auth.password_reset', { userId, ip: req.ip || '' });
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

router.post('/verification/verifyOTP', otpVerifyLimiter, async (req: Request, res: Response): Promise<void> => {
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

    const { email, name, sub: googleId, picture } = payload;
    const normalizedEmail = email.toLowerCase();

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
      `SELECT * FROM ${USERS} WHERE email = $1`,
      [normalizedEmail]
    );

    let user = userResult.rows[0];

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

export default router;

