import bcrypt from 'bcryptjs';
import { Request, Response, Router } from 'express';
import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';
import { pool } from '../db';

const router = Router();

// All customer auth uses the customer_users table.
// The shared `users` table is used by delivery partners / sellers (other apps).

const TABLE = 'customer_users';
const TOKEN_TABLE = 'customer_refresh_tokens';
const PWD_RESET_TABLE = 'customer_password_reset_tokens';

// ─── Helpers ─────────────────────────────────────────────────────────────────

function generateTokens(userId: string, userRole: string) {
  const accessToken = jwt.sign(
    { userId, userRole },
    process.env.JWT_SECRET!,
    { expiresIn: '7d' }
  );
  const refreshToken = jwt.sign(
    { userId },
    process.env.JWT_REFRESH_SECRET!,
    { expiresIn: '30d' }
  );
  return { accessToken, refreshToken };
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

router.post('/signup', async (req: Request, res: Response): Promise<void> => {
  const { name, email, password, mobile, userName } = req.body;

  if (!name || !email || !password) {
    res.status(400).json({ success: false, message: 'Name, email and password are required' });
    return;
  }

  try {
    const existing = await pool.query(
      `SELECT id FROM ${TABLE} WHERE email = $1`, [email.toLowerCase()]
    );
    if (existing.rows.length > 0) {
      res.status(409).json({ success: false, message: 'Email already registered' });
      return;
    }

    const passwordHash = await bcrypt.hash(password, 12);
    const generatedUserName = userName || `${email.split('@')[0]}_${Date.now()}`;

    const result = await pool.query(
      `INSERT INTO ${TABLE} (user_name, name, email, mobile, password_hash, user_role, is_verified, is_active, created_at, updated_at)
       VALUES ($1,$2,$3,$4,$5,'customer',false,true,NOW(),NOW()) RETURNING *`,
      [generatedUserName, name, email.toLowerCase(), mobile || null, passwordHash]
    );

    const user = normalizeUser(result.rows[0]);
    const { accessToken, refreshToken } = generateTokens(user.id, user.userRole);

    await pool.query(
      `INSERT INTO ${TOKEN_TABLE} (id, user_id, token, expires_at, created_at)
       VALUES ($1,$2,$3,NOW() + INTERVAL '30 days',NOW())`,
      [uuidv4(), user.id, refreshToken]
    );

    res.status(201).json({ success: true, message: 'Account created successfully', accessToken, refreshToken, user });
  } catch (err: any) {
    console.error('Signup error:', err);
    if (err.code === '23505') {
      // unique violation — could be mobile or username
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

router.post('/login', async (req: Request, res: Response): Promise<void> => {
  const { email, password } = req.body;

  if (!email || !password) {
    res.status(400).json({ success: false, message: 'Email and password are required' });
    return;
  }

  try {
    const result = await pool.query(
      `SELECT * FROM ${TABLE} WHERE email = $1 OR user_name = $1`,
      [email.toLowerCase()]
    );

    if (result.rows.length === 0) {
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

    await pool.query(`DELETE FROM ${TOKEN_TABLE} WHERE user_id = $1`, [user.id]);
    await pool.query(
      `INSERT INTO ${TOKEN_TABLE} (id, user_id, token, expires_at, created_at)
       VALUES ($1,$2,$3,NOW() + INTERVAL '30 days',NOW())`,
      [uuidv4(), user.id, refreshToken]
    );

    res.json({ success: true, message: 'Login successful', accessToken, refreshToken, user });
  } catch (err) {
    console.error('Login error:', err);
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
      `SELECT * FROM ${TOKEN_TABLE} WHERE user_id = $1 AND token = $2 AND expires_at > NOW()`,
      [decoded.userId, refreshToken]
    );
    if (stored.rows.length === 0) {
      res.status(401).json({ success: false, message: 'Invalid or expired refresh token' });
      return;
    }

    const userResult = await pool.query(`SELECT * FROM ${TABLE} WHERE id = $1`, [decoded.userId]);
    if (userResult.rows.length === 0) {
      res.status(401).json({ success: false, message: 'User not found' });
      return;
    }

    const user = normalizeUser(userResult.rows[0]);
    const tokens = generateTokens(user.id, user.userRole);

    await pool.query(`DELETE FROM ${TOKEN_TABLE} WHERE user_id = $1`, [user.id]);
    await pool.query(
      `INSERT INTO ${TOKEN_TABLE} (id, user_id, token, expires_at, created_at)
       VALUES ($1,$2,$3,NOW() + INTERVAL '30 days',NOW())`,
      [uuidv4(), user.id, tokens.refreshToken]
    );

    res.json({ success: true, accessToken: tokens.accessToken, refreshToken: tokens.refreshToken });
  } catch {
    res.status(401).json({ success: false, message: 'Invalid refresh token' });
  }
});

// ─── POST /api/v1/auth/forgetPassword/sendOTP ────────────────────────────────

router.post('/forgetPassword/sendOTP', async (req: Request, res: Response): Promise<void> => {
  const { email } = req.body;
  if (!email) {
    res.status(400).json({ success: false, message: 'Email is required' });
    return;
  }

  try {
    const userResult = await pool.query(`SELECT id FROM ${TABLE} WHERE email = $1`, [email.toLowerCase()]);
    if (userResult.rows.length === 0) {
      res.json({ success: true, message: 'If that email exists, an OTP has been sent' });
      return;
    }

    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const userId = userResult.rows[0].id;

    await pool.query(`DELETE FROM ${PWD_RESET_TABLE} WHERE user_id = $1`, [userId]);
    await pool.query(
      `INSERT INTO ${PWD_RESET_TABLE} (id, user_id, reset_token, expires_at, is_used, created_at)
       VALUES ($1,$2,$3,NOW() + INTERVAL '15 minutes',false,NOW())`,
      [uuidv4(), userId, otp]
    );

    console.log(`[OTP] Password reset OTP for ${email}: ${otp}`);
    res.json({ success: true, message: 'OTP sent successfully', otp });
  } catch (err) {
    console.error('sendOTP error:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// ─── POST /api/v1/auth/forgetPassword/verifyOTP ──────────────────────────────

router.post('/forgetPassword/verifyOTP', async (req: Request, res: Response): Promise<void> => {
  const { email, otp } = req.body;
  if (!email || !otp) {
    res.status(400).json({ success: false, message: 'Email and OTP are required' });
    return;
  }

  try {
    const result = await pool.query(
      `SELECT prt.* FROM ${PWD_RESET_TABLE} prt
       JOIN ${TABLE} u ON u.id = prt.user_id
       WHERE u.email = $1 AND prt.reset_token = $2 AND prt.expires_at > NOW() AND prt.is_used = false`,
      [email.toLowerCase(), otp]
    );

    if (result.rows.length === 0) {
      res.status(400).json({ success: false, message: 'Invalid or expired OTP' });
      return;
    }

    res.json({ success: true, message: 'OTP verified', resetToken: otp });
  } catch (err) {
    console.error('verifyOTP error:', err);
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

  try {
    const result = await pool.query(
      `SELECT * FROM ${PWD_RESET_TABLE} WHERE reset_token = $1 AND expires_at > NOW() AND is_used = false`,
      [resetToken]
    );
    if (result.rows.length === 0) {
      res.status(400).json({ success: false, message: 'Invalid or expired reset token' });
      return;
    }

    const userId = result.rows[0].user_id;
    const passwordHash = await bcrypt.hash(newPassword, 12);

    await pool.query(`UPDATE ${TABLE} SET password_hash = $1, updated_at = NOW() WHERE id = $2`, [passwordHash, userId]);
    await pool.query(`UPDATE ${PWD_RESET_TABLE} SET is_used = true WHERE reset_token = $1`, [resetToken]);

    res.json({ success: true, message: 'Password reset successfully' });
  } catch (err) {
    console.error('resetPassword error:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// ─── POST /api/v1/auth/verification/sendOTP ──────────────────────────────────

router.post('/verification/sendOTP', async (req: Request, res: Response): Promise<void> => {
  const { mobile, email } = req.body;
  const otp = Math.floor(100000 + Math.random() * 900000).toString();

  try {
    await pool.query('DELETE FROM otp_verifications WHERE mobile = $1 OR email = $2', [mobile || '', email || '']);
    await pool.query(
      `INSERT INTO otp_verifications (id, mobile, email, otp, otp_type, is_verified, expires_at, created_at)
       VALUES ($1,$2,$3,$4,'signup',false,NOW() + INTERVAL '10 minutes',NOW())`,
      [uuidv4(), mobile || '', email || '', otp]
    );

    console.log(`[OTP] Verification OTP: ${otp}`);
    res.json({ success: true, message: 'OTP sent', otp });
  } catch (err) {
    console.error('sendOTP error:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// ─── POST /api/v1/auth/verification/verifyOTP ────────────────────────────────

router.post('/verification/verifyOTP', async (req: Request, res: Response): Promise<void> => {
  const { mobile, email, otp } = req.body;

  try {
    const result = await pool.query(
      `SELECT * FROM otp_verifications
       WHERE (mobile = $1 OR email = $2) AND otp = $3 AND expires_at > NOW() AND is_verified = false`,
      [mobile || '', email || '', otp]
    );

    if (result.rows.length === 0) {
      res.status(400).json({ success: false, message: 'Invalid or expired OTP' });
      return;
    }

    await pool.query('UPDATE otp_verifications SET is_verified = true WHERE id = $1', [result.rows[0].id]);

    if (email) {
      await pool.query(`UPDATE ${TABLE} SET is_verified = true, updated_at = NOW() WHERE email = $1`, [email.toLowerCase()]);
    }

    res.json({ success: true, message: 'OTP verified successfully' });
  } catch (err) {
    console.error('verifyOTP error:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

export default router;
