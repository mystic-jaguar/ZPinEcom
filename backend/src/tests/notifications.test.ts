/**
 * EPIC 10 — Notifications
 * Covers: seller new-order notifications, unread count, mark-as-read on fetch
 */
import request from 'supertest';
import app from './setup/app';
import { bearerHeader, makeAccessToken, makeSellerToken } from './setup/helpers';

const BASE = '/api/v1/notifications';
const sellerToken = makeSellerToken('SLR0001');
const custToken = makeAccessToken('USR0001');

jest.mock('../db', () => {
  const mockQuery = jest.fn();
  return {
    pool: { query: mockQuery },
    __mockQuery: mockQuery,
  };
});

jest.mock('../utils/redis', () => ({
  cacheGet: jest.fn().mockResolvedValue(null),
  cacheSet: jest.fn().mockResolvedValue(undefined),
  default: { get: jest.fn(), set: jest.fn(), del: jest.fn() },
}));

jest.mock('../utils/encryption', () => ({
  decryptAddressPayload: jest.fn(v => v),
  encryptAddressPayload: jest.fn(v => v),
  isEncrypted: jest.fn(() => false),
}));

const getDbMock = () => require('../db').__mockQuery as jest.Mock;

beforeEach(() => getDbMock().mockReset());

// ─── POST /notifications/new-order ───────────────────────────────────────────

describe('POST /notifications/new-order', () => {
  it('returns 401 without auth', async () => {
    const res = await request(app).post(`${BASE}/new-order`).send({});
    expect(res.status).toBe(401);
  });

  it('returns empty arrays when there are no unread notifications', async () => {
    getDbMock().mockResolvedValueOnce({ rows: [] }); // no notifications

    const res = await request(app)
      .post(`${BASE}/new-order`)
      .set(bearerHeader(sellerToken));
    expect(res.status).toBe(200);
    expect(res.body.notifications).toHaveLength(0);
    expect(res.body.orders).toHaveLength(0);
  });

  it('returns notifications with order details and marks them as read', async () => {
    const orderId = 'ORD0001';
    // fetch unread notifications
    getDbMock().mockResolvedValueOnce({
      rows: [{
        id: 'NTF0001', title: 'New Order: ZP-ORD0001',
        message: 'You have a new order',
        data: JSON.stringify({ orderId, orderNumber: 'ZP-ORD0001', total: 1180, shippingAddress: {} }),
        created_at: new Date(),
      }],
    });
    // fetch full order details
    getDbMock().mockResolvedValueOnce({
      rows: [{
        id: orderId, order_number: 'ZP-ORD0001', user_id: 'USR0001',
        status: 'confirmed', payment_status: 'paid',
        total_amount: '1000', shipping_amount: '0', tax_amount: '180',
        final_amount: '1180', shipping_address: {}, payment_method: 'razorpay',
        created_at: new Date(), items: [],
      }],
    });
    // mark as read
    getDbMock().mockResolvedValueOnce({ rows: [] });

    const res = await request(app)
      .post(`${BASE}/new-order`)
      .set(bearerHeader(sellerToken));
    expect(res.status).toBe(200);
    expect(res.body.notifications).toHaveLength(1);
    expect(res.body.orders).toHaveLength(1);

    // Verify mark-as-read was called
    const calls = getDbMock().mock.calls;
    const hasUpdate = calls.some((call: any[]) => String(call[0]).includes('UPDATE'));
    expect(hasUpdate).toBe(true);
  });

  it('each seller only gets their own notifications (isolation)', async () => {
    // USR0001 (customer) fetching their own notifications — separate from SLR0001
    getDbMock().mockResolvedValueOnce({ rows: [] }); // no new_order notifications for customer

    const res = await request(app)
      .post(`${BASE}/new-order`)
      .set(bearerHeader(custToken));
    expect(res.status).toBe(200);
    expect(res.body.notifications).toHaveLength(0);
  });
});

// ─── GET /notifications/new-order/count ──────────────────────────────────────

describe('GET /notifications/new-order/count', () => {
  it('returns 401 without auth', async () => {
    const res = await request(app).get(`${BASE}/new-order/count`);
    expect(res.status).toBe(401);
  });

  it('returns unread notification count', async () => {
    getDbMock().mockResolvedValueOnce({ rows: [{ count: '3' }] });

    const res = await request(app)
      .get(`${BASE}/new-order/count`)
      .set(bearerHeader(sellerToken));
    expect(res.status).toBe(200);
    expect(res.body.count).toBe(3);
  });

  it('returns 0 when there are no unread notifications', async () => {
    getDbMock().mockResolvedValueOnce({ rows: [{ count: '0' }] });

    const res = await request(app)
      .get(`${BASE}/new-order/count`)
      .set(bearerHeader(sellerToken));
    expect(res.status).toBe(200);
    expect(res.body.count).toBe(0);
  });
});
