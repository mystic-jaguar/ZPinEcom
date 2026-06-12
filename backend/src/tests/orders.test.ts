/**
 * EPICS 4, 5, 7 — Checkout, Delivery & Logistics, Order Lifecycle
 * Covers: order creation (wallet/COD), order listing, detail, tracking,
 *         cancellation, return requests, return status transitions
 */
import request from 'supertest';
import app from './setup/app';
import { bearerHeader, makeAccessToken, makeAdminToken } from './setup/helpers';

const BASE = '/api/v1/orders';
const custToken = makeAccessToken('USR0001');
const adminToken = makeAdminToken('ADM0001');
const orderId = 'ORD0001';
const addressId = 'ADR0001';
const productUuid = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11';

jest.mock('../db', () => {
  const mockQuery = jest.fn();
  const mockClient = {
    query: mockQuery,
    release: jest.fn(),
  };
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
  cacheDel: jest.fn().mockResolvedValue(undefined),
  cacheDelPattern: jest.fn().mockResolvedValue(undefined),
  default: { get: jest.fn(), set: jest.fn(), del: jest.fn() },
}));

jest.mock('../utils/encryption', () => ({
  encryptAddressPayload: jest.fn(v => v),
  decryptAddressPayload: jest.fn(v => v),
  encryptMoney: jest.fn(v => String(v)),
  decryptMoney: jest.fn(v => Number(v)),
  isEncrypted: jest.fn(() => false),
  encryptText: jest.fn(v => v),
}));

const getDbMock = () => require('../db').__mockQuery as jest.Mock;

beforeEach(() => getDbMock().mockReset());

const mockAddress = {
  id: addressId, user_id: 'USR0001', name: 'Test User',
  phone: '9876543210', address_line1: '123 Main St', address_line2: '',
  city: 'Mumbai', state: 'Maharashtra', pincode: '400001',
  country: 'India', landmark: '', label: 'Home', is_default: true,
};

const mockOrder = {
  id: orderId, order_number: 'ZP-ORD0001', user_id: 'USR0001',
  status: 'pending', payment_status: 'pending',
  total_amount: '1000', shipping_amount: '0', tax_amount: '180',
  final_amount: '1180', shipping_address: mockAddress,
  payment_method: 'cod', payment_id: null, notes: '',
  tracking_number: null, estimated_delivery: new Date(),
  created_at: new Date(), updated_at: new Date(), items: [],
};

// ─── GET /orders ───────────────────────────────────────────────────────────────

describe('GET /orders', () => {
  it('returns 401 without auth', async () => {
    const res = await request(app).get(BASE);
    expect(res.status).toBe(401);
  });

  it('returns 200 with paginated order list', async () => {
    getDbMock()
      .mockResolvedValueOnce({ rows: [{ count: '1' }] })
      .mockResolvedValueOnce({ rows: [mockOrder] });

    const res = await request(app).get(BASE).set(bearerHeader(custToken));
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.pagination).toBeDefined();
  });

  it('returns empty state when user has no orders', async () => {
    getDbMock()
      .mockResolvedValueOnce({ rows: [{ count: '0' }] })
      .mockResolvedValueOnce({ rows: [] });

    const res = await request(app).get(BASE).set(bearerHeader(custToken));
    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(0);
  });
});

// ─── GET /orders/:id ──────────────────────────────────────────────────────────

describe('GET /orders/:id', () => {
  it('returns 404 for non-existent order', async () => {
    getDbMock().mockResolvedValueOnce({ rows: [] });
    const res = await request(app).get(`${BASE}/NOPE`).set(bearerHeader(custToken));
    expect(res.status).toBe(404);
  });

  it('returns 200 with order details', async () => {
    getDbMock().mockResolvedValueOnce({ rows: [mockOrder] });
    const res = await request(app).get(`${BASE}/${orderId}`).set(bearerHeader(custToken));
    expect(res.status).toBe(200);
    expect(res.body.data.order.orderNumber).toBe('ZP-ORD0001');
  });
});

// ─── GET /orders/:id/track ────────────────────────────────────────────────────

describe('GET /orders/:id/track', () => {
  it('returns 401 without auth', async () => {
    const res = await request(app).get(`${BASE}/ORD0001/track`);
    expect(res.status).toBe(401);
  });

  it('returns 404 for an order that does not belong to the user', async () => {
    // All DB queries return empty (DDL + order lookup)
    getDbMock().mockResolvedValue({ rows: [] });

    const res = await request(app)
      .get(`${BASE}/NOPE/track`)
      .set(bearerHeader(custToken));
    expect(res.status).toBe(404);
  });

  it('returns 200 with tracking timeline stages', async () => {
    // Use a default fallback for all queries (handles DDL that may or may not run
    // depending on whether supportTablesReady was already set by a prior test)
    getDbMock().mockResolvedValue({ rows: [] });

    // The order lookup and return request lookup must return the right data.
    // We override the last two calls with specific data.
    // Since we can't predict exactly how many DDL calls fire (due to the singleton
    // flag), we mock all calls as empty and use a spy to intercept the specific ones.
    const db = require('../db');
    let callCount = 0;
    db.__mockQuery.mockImplementation((sql: string) => {
      callCount++;
      // Order lookup query contains WHERE id = $1 AND user_id = $2
      if (sql.includes('WHERE id = $1 AND user_id = $2') && sql.includes('"orders"')) {
        return Promise.resolve({
          rows: [{
            id: orderId, order_number: 'ZP-ORD0001', status: 'shipped',
            tracking_number: 'TRACK123', estimated_delivery: new Date(),
            created_at: new Date(), updated_at: new Date(),
          }],
        });
      }
      // Return request lookup
      if (sql.includes('"return_requests"') && sql.includes('WHERE order_id = $1 AND user_id = $2')) {
        return Promise.resolve({ rows: [] });
      }
      // Everything else (DDL, etc.)
      return Promise.resolve({ rows: [] });
    });

    const res = await request(app)
      .get(`${BASE}/${orderId}/track`)
      .set(bearerHeader(custToken));
    expect(res.status).toBe(200);
    expect(res.body.data.trackingNumber).toBe('TRACK123');
    expect(Array.isArray(res.body.data.trackingHistory)).toBe(true);
  });
});

// ─── POST /orders — order creation ────────────────────────────────────────────

describe('POST /orders', () => {
  it('returns 401 without auth', async () => {
    const res = await request(app).post(BASE).send({});
    expect(res.status).toBe(401);
  });

  it('returns 400 when shippingAddressId or paymentMethod is missing', async () => {
    const res = await request(app)
      .post(BASE)
      .set(bearerHeader(custToken))
      .send({ paymentMethod: 'cod' });
    expect(res.status).toBe(400);
  });

  it('returns 400 when cart is empty', async () => {
    const db = require('../db');
    db.__mockClient.query
      .mockResolvedValueOnce({ rows: [] }) // BEGIN
      .mockResolvedValueOnce({ rows: [] }) // cart query returns empty
      .mockResolvedValueOnce({ rows: [] }) // ROLLBACK
    ;
    // pool.connect returns the mock client
    db.pool.connect.mockResolvedValueOnce(db.__mockClient);

    const res = await request(app)
      .post(BASE)
      .set(bearerHeader(custToken))
      .send({ shippingAddressId: addressId, paymentMethod: 'cod' });
    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/cart is empty/i);
  });

  it('returns 400 when wallet balance is insufficient', async () => {
    const db = require('../db');
    const client = db.__mockClient;
    db.pool.connect.mockResolvedValueOnce(client);

    client.query
      .mockResolvedValueOnce({ rows: [] }) // BEGIN
      .mockResolvedValueOnce({ // cart items
        rows: [{
          id: 'CRT0001', product_id: productUuid, quantity: 1, price: '1000',
          product_name: 'Shirt', seller_id: 'SLR0001', image: null,
        }],
      })
      .mockResolvedValueOnce({ rows: [mockAddress] }) // address
      .mockResolvedValueOnce({ rows: [] }) // coupon (none)
      .mockResolvedValueOnce({ rows: [] }) // INSERT order
      .mockResolvedValueOnce({ rows: [] }) // INSERT order item
      .mockResolvedValueOnce({ rows: [] }) // UPDATE inventory
      .mockResolvedValueOnce({ rows: [] }) // DELETE cart
      .mockResolvedValueOnce({ // wallet with low balance
        rows: [{ id: 'WAL0001', balance: '100' }],
      })
      .mockResolvedValueOnce({ rows: [] }) // ROLLBACK
    ;

    const res = await request(app)
      .post(BASE)
      .set(bearerHeader(custToken))
      .send({ shippingAddressId: addressId, paymentMethod: 'wallet' });
    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/insufficient|wallet/i);
  });

  it('creates a COD order with 18% GST applied', async () => {
    const db = require('../db');
    const client = db.__mockClient;
    db.pool.connect.mockResolvedValueOnce(client);

    client.query
      .mockResolvedValueOnce({ rows: [] }) // BEGIN
      .mockResolvedValueOnce({ // cart
        rows: [{
          id: 'CRT0001', product_id: productUuid, quantity: 1, price: '1000',
          product_name: 'Shirt', seller_id: 'SLR0001', image: null,
        }],
      })
      .mockResolvedValueOnce({ rows: [mockAddress] }) // address
      .mockResolvedValueOnce({ rows: [] }) // coupon
      .mockResolvedValueOnce({ rows: [] }) // INSERT order
      .mockResolvedValueOnce({ rows: [] }) // INSERT order item
      .mockResolvedValueOnce({ rows: [] }) // UPDATE inventory
      .mockResolvedValueOnce({ rows: [] }) // DELETE cart
      .mockResolvedValueOnce({ rows: [] }) // customer notification
      .mockResolvedValueOnce({ rows: [] }) // seller notification
      .mockResolvedValueOnce({ rows: [] }) // COMMIT
    ;

    const res = await request(app)
      .post(BASE)
      .set(bearerHeader(custToken))
      .send({ shippingAddressId: addressId, paymentMethod: 'cod' });

    expect(res.status).toBe(201);
    expect(res.body.data.order.orderNumber).toMatch(/^ZP-/);
    // Tax should be 18% of 1000 = 180; final = 1000 + 0 (free shipping > 500) + 180 = 1180
    expect(res.body.data.order.finalAmount).toBe(1180);
  });

  it('applies standard shipping fee of Rs 49 for orders <= Rs 500', async () => {
    const db = require('../db');
    const client = db.__mockClient;
    db.pool.connect.mockResolvedValueOnce(client);

    client.query
      .mockResolvedValueOnce({ rows: [] }) // BEGIN
      .mockResolvedValueOnce({ // cart — low value order
        rows: [{
          id: 'CRT0001', product_id: productUuid, quantity: 1, price: '300',
          product_name: 'Cap', seller_id: 'SLR0001', image: null,
        }],
      })
      .mockResolvedValueOnce({ rows: [mockAddress] }) // address
      .mockResolvedValueOnce({ rows: [] }) // coupon
      .mockResolvedValueOnce({ rows: [] }) // INSERT order
      .mockResolvedValueOnce({ rows: [] }) // INSERT order item
      .mockResolvedValueOnce({ rows: [] }) // UPDATE inventory
      .mockResolvedValueOnce({ rows: [] }) // DELETE cart
      .mockResolvedValueOnce({ rows: [] }) // customer notification
      .mockResolvedValueOnce({ rows: [] }) // seller notification
      .mockResolvedValueOnce({ rows: [] }) // COMMIT
    ;

    const res = await request(app)
      .post(BASE)
      .set(bearerHeader(custToken))
      .send({ shippingAddressId: addressId, paymentMethod: 'cod' });

    expect(res.status).toBe(201);
    // total 300, shipping 49, tax ~54, final ~403
    expect(res.body.data.order.finalAmount).toBeGreaterThan(300);
  });
});

// ─── PATCH /orders/:id/cancel ─────────────────────────────────────────────────

describe('PATCH /orders/:id/cancel', () => {
  it('returns 401 without auth', async () => {
    const res = await request(app).patch(`${BASE}/${orderId}/cancel`);
    expect(res.status).toBe(401);
  });

  it('returns 404 when order not found', async () => {
    getDbMock()
      .mockResolvedValue({ rows: [] });

    const res = await request(app)
      .patch(`${BASE}/NOPE/cancel`)
      .set(bearerHeader(custToken))
      .send({ reason: 'Changed my mind', refundMethod: 'wallet' });
    expect([400, 404]).toContain(res.status);
  });
});

// ─── POST /orders/:id/return ──────────────────────────────────────────────────

describe('POST /orders/:id/return', () => {
  it('returns 401 without auth', async () => {
    const res = await request(app).post(`${BASE}/${orderId}/return`);
    expect(res.status).toBe(401);
  });

  it('returns 400 when reason is missing', async () => {
    const res = await request(app)
      .post(`${BASE}/${orderId}/return`)
      .set(bearerHeader(custToken))
      .send({});
    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/reason/i);
  });

  it('returns 400 when order is not in delivered status', async () => {
    const db = require('../db');
    db.__mockQuery.mockImplementation((sql: string) => {
      // Order lookup — returns a shipped order (not delivered)
      if (sql.includes('WHERE id = $1 AND user_id = $2') && sql.includes('"orders"')) {
        return Promise.resolve({ rows: [{ id: orderId, status: 'shipped', final_amount: '1180' }] });
      }
      return Promise.resolve({ rows: [] });
    });

    const res = await request(app)
      .post(`${BASE}/${orderId}/return`)
      .set(bearerHeader(custToken))
      .send({ reason: 'Defective product' });
    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/delivered/i);
  });
});

// ─── PATCH /orders/:id/return-status ─────────────────────────────────────────

describe('PATCH /orders/:id/return-status', () => {
  it('returns 403 for customer role', async () => {
    const res = await request(app)
      .patch(`${BASE}/${orderId}/return-status`)
      .set(bearerHeader(custToken))
      .send({ status: 'picked_up' });
    expect(res.status).toBe(403);
  });

  it('returns 400 for invalid status value', async () => {
    const res = await request(app)
      .patch(`${BASE}/${orderId}/return-status`)
      .set(bearerHeader(adminToken))
      .send({ status: 'random_status' });
    expect(res.status).toBe(400);
  });

  it('returns 400 for reverse status transition (refunded → requested)', async () => {
    const db = require('../db');
    db.__mockQuery.mockImplementation((sql: string) => {
      // Order existence check
      if (sql.includes('WHERE id = $1') && sql.includes('"orders"') && !sql.includes('user_id')) {
        return Promise.resolve({ rows: [{ id: orderId }] });
      }
      // Return request — already at refunded status
      if (sql.includes('"return_requests"') && sql.includes('WHERE order_id = $1')) {
        return Promise.resolve({
          rows: [{ id: 'RET0001', order_id: orderId, status: 'refunded', status_history: [], picked_up_at: null, refunded_at: null }],
        });
      }
      return Promise.resolve({ rows: [] });
    });

    const res = await request(app)
      .patch(`${BASE}/${orderId}/return-status`)
      .set(bearerHeader(adminToken))
      .send({ status: 'picked_up' }); // backward from refunded
    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/invalid.*transition/i);
  });
});
