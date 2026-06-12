/**
 * EPIC 6 — ZPIN Wallet & Payments
 * Covers: wallet balance/history, credit/debit restrictions, Razorpay create/verify
 */
import request from 'supertest';
import app from './setup/app';
import { bearerHeader, makeAccessToken, makeAdminToken } from './setup/helpers';

const WALLET_BASE = '/api/v1/wallet';
const RZP_BASE = '/api/v1/razorpay';

const custToken = makeAccessToken('USR0001');
const adminToken = makeAdminToken('ADM0001');

jest.mock('../db', () => {
  const mockQuery = jest.fn();
  const mockClient = { query: mockQuery, release: jest.fn() };
  return {
    pool: {
      query: mockQuery,
      connect: jest.fn().mockResolvedValue(mockClient),
    },
    __mockQuery: mockQuery,
    __mockClient: mockClient,
  };
});

jest.mock('../utils/redis', () => ({
  cacheGet: jest.fn().mockResolvedValue(null),
  cacheSet: jest.fn().mockResolvedValue(undefined),
  default: { get: jest.fn(), set: jest.fn(), del: jest.fn() },
}));

jest.mock('../utils/encryption', () => ({
  encryptMoney: jest.fn(v => String(v)),
  decryptMoney: jest.fn(v => Number(v)),
  encryptAddressPayload: jest.fn(v => v),
  decryptAddressPayload: jest.fn(v => v),
  isEncrypted: jest.fn(() => false),
}));

const getDbMock = () => require('../db').__mockQuery as jest.Mock;

beforeEach(() => getDbMock().mockReset());

// ─── GET /wallet ───────────────────────────────────────────────────────────────

describe('GET /wallet', () => {
  it('returns 401 without auth', async () => {
    const res = await request(app).get(WALLET_BASE);
    expect(res.status).toBe(401);
  });

  it('auto-creates wallet for new user and returns Rs 0 balance', async () => {
    getDbMock()
      .mockResolvedValueOnce({ rows: [] }) // no existing wallet
      .mockResolvedValueOnce({ rows: [{ id: 'WAL0001', user_id: 'USR0001', balance: '0' }] }) // INSERT
      .mockResolvedValueOnce({ rows: [] }); // transactions

    const res = await request(app).get(WALLET_BASE).set(bearerHeader(custToken));
    expect(res.status).toBe(200);
    expect(res.body.data.balance).toBe(0);
  });

  it('returns balance and last 20 transactions', async () => {
    getDbMock()
      .mockResolvedValueOnce({ rows: [{ id: 'WAL0001', user_id: 'USR0001', balance: '500' }] })
      .mockResolvedValueOnce({
        rows: [{
          id: 'TXN0001', type: 'credit', amount: '500',
          description: 'Refund', reference_id: 'ORD0001',
          created_at: new Date(),
        }],
      });

    const res = await request(app).get(WALLET_BASE).set(bearerHeader(custToken));
    expect(res.status).toBe(200);
    expect(res.body.data.balance).toBe(500);
    expect(res.body.data.transactions).toHaveLength(1);
    expect(res.body.data.transactions[0].type).toBe('credit');
  });
});

// ─── POST /wallet/credit ──────────────────────────────────────────────────────

describe('POST /wallet/credit', () => {
  it('returns 403 for customer role (customers cannot self-credit)', async () => {
    const res = await request(app)
      .post(`${WALLET_BASE}/credit`)
      .set(bearerHeader(custToken))
      .send({ amount: 500 });
    expect(res.status).toBe(403);
  });

  it('returns 400 when amount is missing or zero', async () => {
    const res = await request(app)
      .post(`${WALLET_BASE}/credit`)
      .set(bearerHeader(adminToken))
      .send({ amount: 0 });
    expect(res.status).toBe(400);
  });

  it('credits wallet atomically for admin', async () => {
    const db = require('../db');
    const client = db.__mockClient;
    db.pool.connect.mockResolvedValueOnce(client);

    client.query
      .mockResolvedValueOnce({ rows: [] }) // BEGIN
      .mockResolvedValueOnce({ rows: [] }) // no existing wallet
      .mockResolvedValueOnce({ rows: [{ id: 'WAL0001', balance: '0' }] }) // INSERT wallet
      .mockResolvedValueOnce({ rows: [] }) // UPDATE balance
      .mockResolvedValueOnce({ rows: [] }) // INSERT transaction
      .mockResolvedValueOnce({ rows: [] }) // COMMIT
    ;

    const res = await request(app)
      .post(`${WALLET_BASE}/credit`)
      .set(bearerHeader(adminToken))
      .send({ amount: 200, description: 'Test credit' });
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });
});

// ─── POST /wallet/debit ───────────────────────────────────────────────────────

describe('POST /wallet/debit', () => {
  it('returns 403 for customer role', async () => {
    const res = await request(app)
      .post(`${WALLET_BASE}/debit`)
      .set(bearerHeader(custToken))
      .send({ amount: 100 });
    expect(res.status).toBe(403);
  });

  it('returns 400 for insufficient balance', async () => {
    const db = require('../db');
    const client = db.__mockClient;
    db.pool.connect.mockResolvedValueOnce(client);

    client.query
      .mockResolvedValueOnce({ rows: [] }) // BEGIN
      .mockResolvedValueOnce({ rows: [{ id: 'WAL0001', balance: '50' }] }) // wallet with Rs 50
      .mockResolvedValueOnce({ rows: [] }) // ROLLBACK
    ;

    const res = await request(app)
      .post(`${WALLET_BASE}/debit`)
      .set(bearerHeader(adminToken))
      .send({ amount: 100 }); // more than balance
    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/insufficient/i);
  });
});

// ─── Razorpay ─────────────────────────────────────────────────────────────────

describe('POST /razorpay/create-order', () => {
  it('returns 401 without auth', async () => {
    const res = await request(app).post(`${RZP_BASE}/create-order`).send({});
    expect(res.status).toBe(401);
  });

  it('returns 400 when orderId is missing', async () => {
    const res = await request(app)
      .post(`${RZP_BASE}/create-order`)
      .set(bearerHeader(custToken))
      .send({});
    expect(res.status).toBe(400);
  });

  it('returns 404 when order not found or not owned by user', async () => {
    getDbMock().mockResolvedValueOnce({ rows: [] });
    const res = await request(app)
      .post(`${RZP_BASE}/create-order`)
      .set(bearerHeader(custToken))
      .send({ orderId: 'NOPE' });
    expect(res.status).toBe(404);
  });

  it('returns 400 when order is already paid', async () => {
    getDbMock().mockResolvedValueOnce({
      rows: [{ id: 'ORD0001', final_amount: '1180', payment_status: 'paid' }],
    });
    const res = await request(app)
      .post(`${RZP_BASE}/create-order`)
      .set(bearerHeader(custToken))
      .send({ orderId: 'ORD0001' });
    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/already paid/i);
  });
});

describe('POST /razorpay/verify', () => {
  it('returns 401 without auth', async () => {
    const res = await request(app).post(`${RZP_BASE}/verify`).send({});
    expect(res.status).toBe(401);
  });

  it('returns 400 when required fields are missing', async () => {
    const res = await request(app)
      .post(`${RZP_BASE}/verify`)
      .set(bearerHeader(custToken))
      .send({ razorpayOrderId: 'rzp_order_123' });
    expect(res.status).toBe(400);
  });

  it('returns 400 for invalid HMAC signature', async () => {
    const res = await request(app)
      .post(`${RZP_BASE}/verify`)
      .set(bearerHeader(custToken))
      .send({
        razorpayOrderId: 'rzp_order_123',
        razorpayPaymentId: 'pay_123',
        razorpaySignature: 'tampered_signature',
        appOrderId: 'ORD0001',
      });
    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/signature/i);
  });

  it('returns 400 for replay attack (payment ID already used)', async () => {
    // Compute the real HMAC to pass signature check
    const crypto = require('crypto');
    const secret = process.env.RAZORPAY_KEY_SECRET || '';
    const sig = crypto
      .createHmac('sha256', secret)
      .update('rzp_order_123|pay_456')
      .digest('hex');

    const db = require('../db');
    const client = db.__mockClient;
    db.pool.connect.mockResolvedValueOnce(client);

    client.query
      .mockResolvedValueOnce({ rows: [] }) // BEGIN
      .mockResolvedValueOnce({ rows: [{ id: 'ORD0001', final_amount: '1180', payment_status: 'pending', order_number: 'ZP-ORD0001' }] })
      .mockResolvedValueOnce({ rows: [{ id: 'ORD0099' }] }) // replay check — payment ID already exists
      .mockResolvedValueOnce({ rows: [] }) // ROLLBACK
    ;

    const res = await request(app)
      .post(`${RZP_BASE}/verify`)
      .set(bearerHeader(custToken))
      .send({
        razorpayOrderId: 'rzp_order_123',
        razorpayPaymentId: 'pay_456',
        razorpaySignature: sig,
        appOrderId: 'ORD0001',
      });
    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/already used/i);
  });
});
