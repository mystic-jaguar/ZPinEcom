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
  // Robust SQL-keyed mock for the createOrder transaction. Given the cart rows,
  // it answers each query by its SQL shape (not a brittle fixed call order), so
  // the multi-seller split — which issues a variable number of INSERTs — is
  // exercised faithfully. Returns a non-empty row for the inventory UPDATE so the
  // atomic stock decrement succeeds.
  function mockCheckout(cartRows: any[]) {
    const db = require('../db');
    const client = db.__mockClient;
    db.pool.connect.mockResolvedValueOnce(client);
    const calls: Array<{ sql: string; params: any[] }> = [];
    client.query.mockImplementation((sql: string, params: any[] = []) => {
      calls.push({ sql, params });
      if (/FROM\s+"cart_items"\s+ci/i.test(sql)) return Promise.resolve({ rows: cartRows });
      if (/FROM\s+"addresses"/i.test(sql)) return Promise.resolve({ rows: [mockAddress] });
      if (/UPDATE\s+products/i.test(sql)) return Promise.resolve({ rows: [{ id: params[1] }] }); // stock dec ok
      return Promise.resolve({ rows: [] }); // BEGIN/COMMIT/DDL/INSERTs/DELETE/notifications
    });
    return calls;
  }
  const orderInserts = (calls: Array<{ sql: string; params: any[] }>) =>
    calls.filter(c => /INSERT INTO\s+"orders"/i.test(c.sql));
  const stockDecrements = (calls: Array<{ sql: string; params: any[] }>) =>
    calls.filter(c => /UPDATE\s+products/i.test(c.sql));

  afterEach(() => {
    const db = require('../db');
    db.__mockClient.query.mockReset();
  });

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
    mockCheckout([]);
    const res = await request(app)
      .post(BASE)
      .set(bearerHeader(custToken))
      .send({ shippingAddressId: addressId, paymentMethod: 'cod' });
    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/cart is empty/i);
  });

  it('creates a single-seller COD order with 18% GST as a group of one', async () => {
    const calls = mockCheckout([
      { id: 'CRT0001', product_id: productUuid, quantity: 1, price: '1000', product_name: 'Shirt', seller_id: 'SLR0001', image: null },
    ]);

    const res = await request(app)
      .post(BASE)
      .set(bearerHeader(custToken))
      .send({ shippingAddressId: addressId, paymentMethod: 'cod' });

    expect(res.status).toBe(201);
    // Customer-facing group number + total: 1000 -> charm-priced 1209 + 0 shipping
    // (≥599) + 218 tax (18% of 1209)
    expect(res.body.data.order.orderNumber).toMatch(/^ZP-/);
    expect(res.body.data.order.finalAmount).toBe(1427);
    expect(res.body.data.order.groupId).toBeTruthy();
    // One seller → exactly one order row, one stock decrement, and NO separate
    // group: group_id is the order's own id so the customer sees one number.
    expect(res.body.data.orders).toHaveLength(1);
    expect(res.body.data.order.groupId).toBe(res.body.data.order.id);
    expect(res.body.data.orders[0].id).toBe(res.body.data.order.id);
    expect(orderInserts(calls)).toHaveLength(1);
    expect(stockDecrements(calls)).toHaveLength(1);
  });

  it('applies standard shipping fee of Rs 49 for orders < Rs 599', async () => {
    mockCheckout([
      { id: 'CRT0001', product_id: productUuid, quantity: 1, price: '300', product_name: 'Cap', seller_id: 'SLR0001', image: null },
    ]);

    const res = await request(app)
      .post(BASE)
      .set(bearerHeader(custToken))
      .send({ shippingAddressId: addressId, paymentMethod: 'cod' });

    expect(res.status).toBe(201);
    // 300 -> charm-priced 369, still < 599 → shipping 49, tax 66 → final 484
    expect(res.body.data.order.finalAmount).toBe(484);
  });

  it('splits a 2-seller cart into 2 order rows sharing one group_id, amounts summing to the cart total', async () => {
    const uuidB = 'b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a22';
    const calls = mockCheckout([
      { id: 'CRT0001', product_id: productUuid, quantity: 1, price: '1000', product_name: 'Shirt', seller_id: 'SLR0001', image: null },
      { id: 'CRT0002', product_id: uuidB, quantity: 1, price: '500', product_name: 'Belt', seller_id: 'SLR0002', image: null },
    ]);

    const res = await request(app)
      .post(BASE)
      .set(bearerHeader(custToken))
      .send({ shippingAddressId: addressId, paymentMethod: 'cod' });

    expect(res.status).toBe(201);

    // 1000->1209, 500->609. Group total: 1818 + 0 shipping (≥599) + 327 tax = 2145
    expect(res.body.data.order.finalAmount).toBe(2145);
    expect(res.body.data.orders).toHaveLength(2);

    // Two order rows, both carrying the SAME group_id (INSERT param $5 = group_id)
    const inserts = orderInserts(calls);
    expect(inserts).toHaveLength(2);
    const groupIds = inserts.map(c => c.params[4]);
    expect(groupIds[0]).toBe(groupIds[1]);
    expect(res.body.data.order.groupId).toBe(groupIds[0]);
    expect(new Set(inserts.map(c => c.params[3])).size).toBe(2); // two distinct sellers ($4 = seller_id)

    // Per-seller finals ($10) sum EXACTLY to the group total (no cents lost/created)
    const finals = inserts.map(c => Number(c.params[9]));
    expect(finals.reduce((a, b) => a + b, 0)).toBe(2145);
    expect(res.body.data.orders.reduce((s: number, o: any) => s + o.finalAmount, 0)).toBe(2145);

    // Stock decremented exactly once per item
    expect(stockDecrements(calls)).toHaveLength(2);
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
      .send({ reason: 'Changed my mind', refundMethod: 'original' });
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
