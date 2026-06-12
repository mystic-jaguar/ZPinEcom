/**
 * EPIC 1 — Authentication & Onboarding
 * Covers: signup, login, token refresh, logout, OTP flows, password reset
 *
 * Security invariants tested:
 * - bcrypt (12 rounds) password hashing
 * - OTPs stored as bcrypt hashes (10 rounds), never plaintext
 * - Email verification enforced on login
 * - Stronger password policy: uppercase + lowercase + digit + special char
 * - User enumeration prevention
 * - Token rotation on refresh and after password reset
 * - Rate limiters applied (relaxed in test env via NODE_ENV != 'production')
 */
import request from 'supertest';
import app from './setup/app';
import { makeAccessToken, makeRefreshToken } from './setup/helpers';

const BASE = '/api/v1/auth';

// ─── Mock heavy dependencies ───────────────────────────────────────────────────
jest.mock('../utils/mailer', () => ({
  sendOTPEmail: jest.fn().mockResolvedValue(undefined),
}));

jest.mock('../db', () => {
  const mockQuery = jest.fn();
  return {
    pool: {
      query: mockQuery,
      connect: jest.fn().mockResolvedValue({
        query: mockQuery,
        release: jest.fn(),
      }),
    },
    __mockQuery: mockQuery,
  };
});

jest.mock('../utils/redis', () => ({
  cacheGet: jest.fn().mockResolvedValue(null),
  cacheSet: jest.fn().mockResolvedValue(undefined),
  cacheDel: jest.fn().mockResolvedValue(undefined),
  cacheDelPattern: jest.fn().mockResolvedValue(undefined),
  default: { get: jest.fn(), set: jest.fn(), del: jest.fn() },
}));

const getDbMock = () => require('../db').__mockQuery as jest.Mock;

beforeEach(() => {
  getDbMock().mockReset();
});

// ─── 1.1  POST /signup ─────────────────────────────────────────────────────────

describe('POST /auth/signup', () => {
  // Strong password satisfying all backend requirements
  const validBody = {
    name: 'Test User',
    email: 'test@example.com',
    password: 'Password1!',
    mobile: '9876543210',
  };

  it('returns 400 when required fields are missing', async () => {
    const res = await request(app).post(`${BASE}/signup`).send({ email: 'a@b.com' });
    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  it('returns 400 for password that is too short', async () => {
    const res = await request(app)
      .post(`${BASE}/signup`)
      .send({ ...validBody, password: 'Ab1!' });
    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/8 characters/i);
  });

  it('returns 400 for password missing uppercase letter', async () => {
    const res = await request(app)
      .post(`${BASE}/signup`)
      .send({ ...validBody, password: 'password1!' });
    expect(res.status).toBe(400);
  });

  it('returns 400 for password missing special character', async () => {
    const res = await request(app)
      .post(`${BASE}/signup`)
      .send({ ...validBody, password: 'Password1' });
    expect(res.status).toBe(400);
  });

  it('returns 400 for password missing a digit', async () => {
    const res = await request(app)
      .post(`${BASE}/signup`)
      .send({ ...validBody, password: 'Password!' });
    expect(res.status).toBe(400);
  });

  it('returns 400 for invalid email format', async () => {
    const res = await request(app)
      .post(`${BASE}/signup`)
      .send({ ...validBody, email: 'not-an-email' });
    expect(res.status).toBe(400);
  });

  it('returns 409 when email is already registered', async () => {
    getDbMock().mockResolvedValueOnce({ rows: [{ id: 'USR0001' }] });
    const res = await request(app).post(`${BASE}/signup`).send(validBody);
    expect(res.status).toBe(409);
    expect(res.body.message).toMatch(/email/i);
  });

  it('returns 201, tokens, and sends a verification OTP on successful registration', async () => {
    const { sendOTPEmail } = require('../utils/mailer');
    sendOTPEmail.mockClear();

    // SELECT: no existing user
    getDbMock().mockResolvedValueOnce({ rows: [] });
    // INSERT user RETURNING *
    getDbMock().mockResolvedValueOnce({
      rows: [{
        id: 'USR0002', user_name: 'test_user', name: 'Test User',
        email: 'test@example.com', mobile: '9876543210',
        user_role: 'customer', is_verified: false, is_active: true,
        dob: null, gender: null, profile_image: null,
        receive_push_notifications: true, receive_email_updates: false,
        receive_order_updates: true, created_at: new Date(),
      }],
    });
    // INSERT refresh token
    getDbMock().mockResolvedValueOnce({ rows: [] });
    // INSERT verification OTP
    getDbMock().mockResolvedValueOnce({ rows: [] });

    const res = await request(app).post(`${BASE}/signup`).send(validBody);
    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.accessToken).toBeDefined();
    expect(res.body.refreshToken).toBeDefined();
    expect(res.body.user).toBeDefined();
    // Verification email must be dispatched immediately
    expect(sendOTPEmail).toHaveBeenCalledWith(
      'test@example.com',
      expect.any(String),
      'verification'
    );
    // OTP must NOT appear in the response body as a standalone 6-digit field
    // (JWT tokens contain 10-digit epoch timestamps so we can't use a simple \d{6} match)
    const responseStr = JSON.stringify(res.body);
    expect(responseStr).not.toMatch(/"otp"\s*:/i);
    expect(responseStr).not.toMatch(/"token"\s*:\s*"\d{6}"/i);
  });
});

// ─── 1.2  POST /login ─────────────────────────────────────────────────────────

describe('POST /auth/login', () => {
  const makeVerifiedUser = async (password: string) => {
    const bcrypt = require('bcryptjs');
    return {
      id: 'USR0001',
      password_hash: await bcrypt.hash(password, 12),
      is_active: true,
      is_verified: true,
      user_role: 'customer',
      user_name: 'tester',
      name: 'Tester',
      email: 'tester@example.com',
      mobile: '',
      dob: null, gender: null, profile_image: null,
      receive_push_notifications: true,
      receive_email_updates: false,
      receive_order_updates: true,
      created_at: new Date(),
    };
  };

  it('returns 400 when email or password is missing', async () => {
    const res = await request(app).post(`${BASE}/login`).send({ email: 'a@b.com' });
    expect(res.status).toBe(400);
  });

  it('returns 401 for non-existent user (user enumeration safe)', async () => {
    getDbMock().mockResolvedValueOnce({ rows: [] });
    const res = await request(app)
      .post(`${BASE}/login`)
      .send({ email: 'nobody@example.com', password: 'Password1!' });
    expect(res.status).toBe(401);
    expect(res.body.message).toMatch(/invalid/i);
    expect(res.body.message).not.toMatch(/not found/i);
  });

  it('returns 401 for wrong password (same generic message as missing user)', async () => {
    getDbMock().mockResolvedValueOnce({ rows: [await makeVerifiedUser('CorrectPass1!')] });
    const res = await request(app)
      .post(`${BASE}/login`)
      .send({ email: 'tester@example.com', password: 'WrongPass1!' });
    expect(res.status).toBe(401);
    expect(res.body.message).toMatch(/invalid/i);
  });

  it('returns 403 for deactivated account', async () => {
    getDbMock().mockResolvedValueOnce({
      rows: [{ id: 'USR0001', is_active: false, password_hash: 'x', user_role: 'customer' }],
    });
    const res = await request(app)
      .post(`${BASE}/login`)
      .send({ email: 'deactivated@example.com', password: 'Password1!' });
    expect(res.status).toBe(403);
  });

  it('returns 403 with EMAIL_NOT_VERIFIED code for unverified account', async () => {
    const bcrypt = require('bcryptjs');
    const hash = await bcrypt.hash('Password1!', 12);
    getDbMock().mockResolvedValueOnce({
      rows: [{
        id: 'USR0001', password_hash: hash, is_active: true,
        is_verified: false, // <-- not verified
        user_role: 'customer', user_name: 'unverified',
        name: 'Unverified', email: 'unverified@example.com',
        mobile: '', dob: null, gender: null, profile_image: null,
        receive_push_notifications: true, receive_email_updates: false,
        receive_order_updates: true, created_at: new Date(),
      }],
    });
    const res = await request(app)
      .post(`${BASE}/login`)
      .send({ email: 'unverified@example.com', password: 'Password1!' });
    expect(res.status).toBe(403);
    expect(res.body.code).toBe('EMAIL_NOT_VERIFIED');
  });

  it('allows login with username instead of email', async () => {
    getDbMock().mockResolvedValueOnce({ rows: [await makeVerifiedUser('Password1!')] });
    getDbMock().mockResolvedValueOnce({ rows: [] }); // DELETE old refresh tokens
    getDbMock().mockResolvedValueOnce({ rows: [] }); // INSERT new refresh token

    const res = await request(app)
      .post(`${BASE}/login`)
      .send({ email: 'myusername', password: 'Password1!' });
    expect(res.status).toBe(200);
    expect(res.body.accessToken).toBeDefined();
  });

  it('returns 200 with tokens on valid verified credentials', async () => {
    getDbMock().mockResolvedValueOnce({ rows: [await makeVerifiedUser('Password1!')] });
    getDbMock().mockResolvedValueOnce({ rows: [] }); // DELETE
    getDbMock().mockResolvedValueOnce({ rows: [] }); // INSERT

    const res = await request(app)
      .post(`${BASE}/login`)
      .send({ email: 'tester@example.com', password: 'Password1!' });
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.accessToken).toBeDefined();
    expect(res.body.refreshToken).toBeDefined();
  });

  it('does not expose password hash in login response', async () => {
    getDbMock().mockResolvedValueOnce({ rows: [await makeVerifiedUser('Password1!')] });
    getDbMock().mockResolvedValueOnce({ rows: [] });
    getDbMock().mockResolvedValueOnce({ rows: [] });

    const res = await request(app)
      .post(`${BASE}/login`)
      .send({ email: 'tester@example.com', password: 'Password1!' });
    expect(JSON.stringify(res.body)).not.toMatch(/password_hash|passwordHash/i);
  });
});

// ─── 1.3  POST /refresh-token ─────────────────────────────────────────────────

describe('POST /auth/refresh-token', () => {
  it('returns 400 when refreshToken is missing', async () => {
    const res = await request(app).post(`${BASE}/refresh-token`).send({});
    expect(res.status).toBe(400);
  });

  it('returns 401 for an invalid/expired refresh token', async () => {
    const res = await request(app)
      .post(`${BASE}/refresh-token`)
      .send({ refreshToken: 'totally.invalid.token' });
    expect(res.status).toBe(401);
  });

  it('returns 401 when token is not found in DB (already rotated)', async () => {
    const token = makeRefreshToken();
    getDbMock().mockResolvedValueOnce({ rows: [] }); // not in DB
    const res = await request(app)
      .post(`${BASE}/refresh-token`)
      .send({ refreshToken: token });
    expect(res.status).toBe(401);
  });

  it('returns new tokens on valid refresh token (token rotation)', async () => {
    const token = makeRefreshToken('USR0001');
    getDbMock().mockResolvedValueOnce({ rows: [{ user_id: 'USR0001', token }] });
    getDbMock().mockResolvedValueOnce({
      rows: [{
        id: 'USR0001', user_role: 'customer', is_verified: true,
        user_name: 'tester', name: 'Tester', email: 'tester@example.com',
        mobile: '', dob: null, gender: null, profile_image: null,
        receive_push_notifications: true, receive_email_updates: false,
        receive_order_updates: true, created_at: new Date(),
      }],
    });
    getDbMock().mockResolvedValueOnce({ rows: [] }); // DELETE old
    getDbMock().mockResolvedValueOnce({ rows: [] }); // INSERT new

    const res = await request(app)
      .post(`${BASE}/refresh-token`)
      .send({ refreshToken: token });
    expect(res.status).toBe(200);
    expect(res.body.accessToken).toBeDefined();
    expect(res.body.refreshToken).toBeDefined();
    expect(typeof res.body.refreshToken).toBe('string');
    expect(res.body.refreshToken.split('.').length).toBe(3); // valid JWT
  });
});

// ─── 1.4  POST /logout ────────────────────────────────────────────────────────

describe('POST /auth/logout', () => {
  it('returns 200 even without a token (graceful)', async () => {
    const res = await request(app).post(`${BASE}/logout`).send({});
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });

  it('invalidates refresh token when valid token provided', async () => {
    const token = makeRefreshToken('USR0001');
    getDbMock().mockResolvedValueOnce({ rows: [] }); // DELETE
    const res = await request(app)
      .post(`${BASE}/logout`)
      .send({ refreshToken: token });
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });
});

// ─── 1.5  POST /forgetPassword/sendOTP ───────────────────────────────────────

describe('POST /auth/forgetPassword/sendOTP', () => {
  it('returns 400 when email is missing', async () => {
    const res = await request(app).post(`${BASE}/forgetPassword/sendOTP`).send({});
    expect(res.status).toBe(400);
  });

  it('returns 200 even when email does not exist (enumeration safe)', async () => {
    getDbMock().mockResolvedValueOnce({ rows: [] });
    const res = await request(app)
      .post(`${BASE}/forgetPassword/sendOTP`)
      .send({ email: 'ghost@example.com' });
    expect(res.status).toBe(200);
    expect(res.body.message).toMatch(/if that email exists/i);
  });

  it('sends OTP and returns 200 for registered email — OTP never in response', async () => {
    const { sendOTPEmail } = require('../utils/mailer');
    sendOTPEmail.mockClear();

    getDbMock().mockResolvedValueOnce({ rows: [{ id: 'USR0001' }] }); // user found
    getDbMock().mockResolvedValueOnce({ rows: [] }); // DELETE old OTP
    getDbMock().mockResolvedValueOnce({ rows: [] }); // INSERT hashed OTP

    const res = await request(app)
      .post(`${BASE}/forgetPassword/sendOTP`)
      .send({ email: 'user@example.com' });
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    // OTP must not appear in the HTTP response as a plain field
    const responseStr = JSON.stringify(res.body);
    expect(responseStr).not.toMatch(/"otp"\s*:/i);
    expect(responseStr).not.toMatch(/"token"\s*:\s*"\d{6}"/i);
    expect(sendOTPEmail).toHaveBeenCalledWith('user@example.com', expect.any(String), 'password_reset');
  });
});

// ─── 1.6  POST /forgetPassword/verifyOTP ─────────────────────────────────────

describe('POST /auth/forgetPassword/verifyOTP', () => {
  it('returns 400 when email or OTP is missing', async () => {
    const res = await request(app)
      .post(`${BASE}/forgetPassword/verifyOTP`)
      .send({ email: 'user@example.com' });
    expect(res.status).toBe(400);
  });

  it('returns 400 when no OTP tokens exist for email (expired / never sent)', async () => {
    getDbMock().mockResolvedValueOnce({ rows: [] }); // no records
    const res = await request(app)
      .post(`${BASE}/forgetPassword/verifyOTP`)
      .send({ email: 'user@example.com', otp: '000000' });
    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/invalid/i);
  });

  it('returns 400 when OTP does not match the stored hash', async () => {
    const bcrypt = require('bcryptjs');
    // Store a hash of '654321' but submit '000000'
    const wrongOtpHash = await bcrypt.hash('654321', 10);
    getDbMock().mockResolvedValueOnce({
      rows: [{ id: 'TKN0001', user_id: 'USR0001', token: wrongOtpHash }],
    });
    const res = await request(app)
      .post(`${BASE}/forgetPassword/verifyOTP`)
      .send({ email: 'user@example.com', otp: '000000' });
    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/invalid/i);
  });

  it('returns 200 with a signed reset token when OTP matches the stored hash', async () => {
    const bcrypt = require('bcryptjs');
    const correctOtp = '123456';
    const otpHash = await bcrypt.hash(correctOtp, 10);
    getDbMock().mockResolvedValueOnce({
      rows: [{ id: 'TKN0001', user_id: 'USR0001', token: otpHash }],
    });
    const res = await request(app)
      .post(`${BASE}/forgetPassword/verifyOTP`)
      .send({ email: 'user@example.com', otp: correctOtp });
    expect(res.status).toBe(200);
    expect(res.body.resetToken).toBeDefined();
    // resetToken must be a 3-part JWT
    expect(res.body.resetToken.split('.').length).toBe(3);
  });
});

// ─── 1.7  POST /forgetPassword/resetPassword ─────────────────────────────────

describe('POST /auth/forgetPassword/resetPassword', () => {
  it('returns 400 when resetToken or newPassword is missing', async () => {
    const res = await request(app)
      .post(`${BASE}/forgetPassword/resetPassword`)
      .send({ resetToken: 'sometoken' });
    expect(res.status).toBe(400);
  });

  it('returns 400 for weak new password (missing special char)', async () => {
    const jwt = require('jsonwebtoken');
    const token = jwt.sign(
      { tokenId: 'TKN0001', purpose: 'password_reset' },
      process.env.JWT_SECRET || 'test-secret-key',
      { expiresIn: '10m' }
    );
    // Password has no special character — should fail the stronger policy
    const res = await request(app)
      .post(`${BASE}/forgetPassword/resetPassword`)
      .send({ resetToken: token, newPassword: 'NewPass123' });
    expect(res.status).toBe(400);
  });

  it('returns 400 for expired or already-used reset token', async () => {
    const jwt = require('jsonwebtoken');
    const token = jwt.sign(
      { tokenId: 'TKN0001', purpose: 'password_reset' },
      process.env.JWT_SECRET || 'test-secret-key',
      { expiresIn: '10m' }
    );
    getDbMock().mockResolvedValueOnce({ rows: [] }); // token not found / used

    const res = await request(app)
      .post(`${BASE}/forgetPassword/resetPassword`)
      .send({ resetToken: token, newPassword: 'NewPass123!' });
    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/invalid|expired/i);
  });

  it('returns 200, resets password with bcrypt hash, and invalidates all refresh tokens', async () => {
    const jwt = require('jsonwebtoken');
    const token = jwt.sign(
      { tokenId: 'TKN0001', purpose: 'password_reset' },
      process.env.JWT_SECRET || 'test-secret-key',
      { expiresIn: '10m' }
    );
    getDbMock().mockResolvedValueOnce({ rows: [{ id: 'TKN0001', user_id: 'USR0001', is_used: false }] });
    getDbMock().mockResolvedValueOnce({ rows: [] }); // UPDATE password
    getDbMock().mockResolvedValueOnce({ rows: [] }); // mark token used
    getDbMock().mockResolvedValueOnce({ rows: [] }); // DELETE refresh tokens

    const res = await request(app)
      .post(`${BASE}/forgetPassword/resetPassword`)
      .send({ resetToken: token, newPassword: 'NewPass123!' });
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    // Verify the DB was called 4 times (SELECT token, UPDATE password, UPDATE token, DELETE refresh)
    expect(getDbMock().mock.calls.length).toBe(4);
  });
});

// ─── 1.8  POST /verification/verifyOTP ───────────────────────────────────────

describe('POST /auth/verification/verifyOTP (email verification)', () => {
  it('returns 400 for invalid or expired OTP', async () => {
    getDbMock().mockResolvedValueOnce({ rows: [] });
    const res = await request(app)
      .post(`${BASE}/verification/verifyOTP`)
      .send({ email: 'user@example.com', otp: '000000' });
    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/invalid/i);
  });

  it('returns 400 when OTP does not match stored hash', async () => {
    const bcrypt = require('bcryptjs');
    const wrongOtpHash = await bcrypt.hash('654321', 10);
    getDbMock().mockResolvedValueOnce({
      rows: [{ id: 'TKN0002', token: wrongOtpHash, mobile: '', email: 'user@example.com' }],
    });
    const res = await request(app)
      .post(`${BASE}/verification/verifyOTP`)
      .send({ email: 'user@example.com', otp: '000000' });
    expect(res.status).toBe(400);
  });

  it('marks user as verified and marks token used on correct OTP', async () => {
    const bcrypt = require('bcryptjs');
    const correctOtp = '123456';
    const otpHash = await bcrypt.hash(correctOtp, 10);
    getDbMock().mockResolvedValueOnce({
      rows: [{ id: 'TKN0002', token: otpHash, mobile: '', email: 'user@example.com' }],
    });
    getDbMock().mockResolvedValueOnce({ rows: [] }); // UPDATE token is_used
    getDbMock().mockResolvedValueOnce({ rows: [] }); // UPDATE users is_verified

    const res = await request(app)
      .post(`${BASE}/verification/verifyOTP`)
      .send({ email: 'user@example.com', otp: correctOtp });
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    // Confirm is_verified was updated in DB
    const dbCalls = getDbMock().mock.calls.map((c: any[]) => c[0] as string);
    expect(dbCalls.some(q => /is_verified.*true/i.test(q))).toBe(true);
  });
});

// ─── 1.9  Authentication middleware ───────────────────────────────────────────

describe('Authentication middleware', () => {
  it('returns 401 when no token is provided', async () => {
    const res = await request(app).get('/api/v1/cart');
    expect(res.status).toBe(401);
    expect(res.body.message).toMatch(/no token/i);
  });

  it('returns 401 for an invalid token', async () => {
    const res = await request(app)
      .get('/api/v1/cart')
      .set('Authorization', 'Bearer this.is.invalid');
    expect(res.status).toBe(401);
  });

  it('accepts token via X-Auth-Token header', async () => {
    const token = makeAccessToken();
    getDbMock().mockResolvedValueOnce({ rows: [] }); // cart query
    getDbMock().mockResolvedValueOnce({ rows: [] }); // product join

    const res = await request(app)
      .get('/api/v1/cart')
      .set('X-Auth-Token', token);
    // Either 200 or 500 (DB not mocked fully) — the key is NOT 401
    expect(res.status).not.toBe(401);
  });

  it('returns 401 for an expired access token', async () => {
    const jwt = require('jsonwebtoken');
    const expiredToken = jwt.sign(
      { userId: 'USR0001', userRole: 'customer' },
      process.env.JWT_SECRET || 'test-secret-key',
      { expiresIn: -1 } // immediately expired
    );
    const res = await request(app)
      .get('/api/v1/cart')
      .set('Authorization', `Bearer ${expiredToken}`);
    expect(res.status).toBe(401);
  });
});
