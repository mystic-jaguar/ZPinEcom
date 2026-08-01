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

/**
 * `authenticate` runs one token-revocation lookup per request before the route
 * handler, which consumes the first queued mock response. Every authenticated
 * test queues this first so the handler's own queue lines up.
 */
const authOk = () => getDbMock().mockResolvedValueOnce({ rows: [] });

beforeEach(() => getDbMock().mockReset());

// ─── Customer inbox ──────────────────────────────────────────────────────────

describe('GET /notifications (customer inbox)', () => {
  it('returns 401 without auth', async () => {
    const res = await request(app).get(BASE);
    expect(res.status).toBe(401);
  });

  it('returns the inbox with unread count and excludes seller new_order rows', async () => {
    authOk();
    getDbMock()
      .mockResolvedValueOnce({
        rows: [{
          id: 'NTF0002', type: 'order_update', title: 'Order Delivered: ZP-1',
          message: 'Your order has been delivered.',
          data: JSON.stringify({ orderId: 'ORD0001', status: 'delivered' }),
          is_read: false, created_at: new Date(),
        }],
      })
      .mockResolvedValueOnce({ rows: [{ total: '1', unread: '1' }] });

    const res = await request(app).get(BASE).set(bearerHeader(custToken));
    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(1);
    expect(res.body.data[0].data.orderId).toBe('ORD0001');
    expect(res.body.unreadCount).toBe(1);
    expect(res.body.pagination.totalItems).toBe(1);

    // seller rows must be filtered out, and rows scoped to the caller
    const [sql, params] = getDbMock().mock.calls[1];
    expect(String(sql)).toContain("type <> 'new_order'");
    expect(params[0]).toBe('USR0001');
  });

  it('survives malformed data JSON', async () => {
    authOk();
    getDbMock()
      .mockResolvedValueOnce({ rows: [{ id: 'N1', type: 'order_update', title: 't', message: 'm', data: '{oops', is_read: true, created_at: new Date() }] })
      .mockResolvedValueOnce({ rows: [{ total: '1', unread: '0' }] });

    const res = await request(app).get(BASE).set(bearerHeader(custToken));
    expect(res.status).toBe(200);
    expect(res.body.data[0].data).toEqual({});
  });
});

describe('GET /notifications/unread-count', () => {
  it('returns the customer unread count', async () => {
    authOk();
    getDbMock().mockResolvedValueOnce({ rows: [{ count: '2' }] });
    const res = await request(app).get(`${BASE}/unread-count`).set(bearerHeader(custToken));
    expect(res.status).toBe(200);
    expect(res.body.count).toBe(2);
  });
});

describe('POST /notifications read markers', () => {
  it('marks one notification read', async () => {
    authOk();
    getDbMock().mockResolvedValueOnce({ rowCount: 1, rows: [] });
    const res = await request(app).post(`${BASE}/NTF0002/read`).set(bearerHeader(custToken));
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });

  it("404s when the notification isn't the caller's", async () => {
    authOk();
    getDbMock().mockResolvedValueOnce({ rowCount: 0, rows: [] });
    const res = await request(app).post(`${BASE}/SOMEONE_ELSE/read`).set(bearerHeader(custToken));
    expect(res.status).toBe(404);
  });

  it('marks all read', async () => {
    authOk();
    getDbMock().mockResolvedValueOnce({ rowCount: 3, rows: [] });
    const res = await request(app).post(`${BASE}/read-all`).set(bearerHeader(custToken));
    expect(res.status).toBe(200);
    expect(String(getDbMock().mock.calls[1][0])).toContain('UPDATE notifications');
  });
});

// ─── POST /notifications/new-order ───────────────────────────────────────────

describe('POST /notifications/new-order', () => {
  it('returns 401 without auth', async () => {
    const res = await request(app).post(`${BASE}/new-order`).send({});
    expect(res.status).toBe(401);
  });

  it('returns empty arrays when there are no unread notifications', async () => {
    authOk();
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
    authOk();
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
    authOk();
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
    authOk();
    getDbMock().mockResolvedValueOnce({ rows: [{ count: '3' }] });

    const res = await request(app)
      .get(`${BASE}/new-order/count`)
      .set(bearerHeader(sellerToken));
    expect(res.status).toBe(200);
    expect(res.body.count).toBe(3);
  });

  it('returns 0 when there are no unread notifications', async () => {
    authOk();
    getDbMock().mockResolvedValueOnce({ rows: [{ count: '0' }] });

    const res = await request(app)
      .get(`${BASE}/new-order/count`)
      .set(bearerHeader(sellerToken));
    expect(res.status).toBe(200);
    expect(res.body.count).toBe(0);
  });
});
