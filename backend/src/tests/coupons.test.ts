/**
 * EPICS 4 & 9 — Coupons (Checkout & Admin Operations)
 * Covers: list coupons, validate coupon, expired/used/below-minimum scenarios
 */
import request from 'supertest';
import app from './setup/app';
import { bearerHeader, makeAccessToken } from './setup/helpers';

const BASE = '/api/v1/coupons';
const token = makeAccessToken('USR0001');

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
  cacheDel: jest.fn().mockResolvedValue(undefined),
  default: { get: jest.fn(), set: jest.fn(), del: jest.fn() },
}));

const getDbMock = () => require('../db').__mockQuery as jest.Mock;

beforeEach(() => getDbMock().mockReset());

// ─── GET /coupons ─────────────────────────────────────────────────────────────

describe('GET /coupons', () => {
  it('returns 200 with active coupon list (public endpoint)', async () => {
    getDbMock().mockResolvedValueOnce({
      rows: [
        {
          id: 'CPN0001', code: 'SAVE50', description: 'Get Rs 50 off',
          discount_type: 'fixed', discount_value: '50',
          min_order_amount: '200', max_discount_amount: null,
          valid_until: new Date(Date.now() + 86400000), // tomorrow
          usage_limit: 100, usage_count: 10,
          is_active: true, not_expired: true, under_limit: true,
        },
        {
          id: 'CPN0002', code: 'OLDCODE', description: 'Expired coupon',
          discount_type: 'fixed', discount_value: '100',
          min_order_amount: '500', max_discount_amount: null,
          valid_until: new Date(Date.now() - 86400000), // yesterday
          usage_limit: 50, usage_count: 50,
          is_active: true, not_expired: false, under_limit: false,
        },
      ],
    });

    const res = await request(app).get(BASE);
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toHaveLength(2);

    const active = res.body.data.find((c: any) => c.code === 'SAVE50');
    const expired = res.body.data.find((c: any) => c.code === 'OLDCODE');
    expect(active.status).toBe('active');
    expect(expired.status).toBe('expired');
  });

  it('returns coupon with used status when usage limit is reached', async () => {
    getDbMock().mockResolvedValueOnce({
      rows: [{
        id: 'CPN0003', code: 'MAXED', description: 'Maxed out',
        discount_type: 'percentage', discount_value: '10',
        min_order_amount: '100', max_discount_amount: null,
        valid_until: new Date(Date.now() + 86400000),
        usage_limit: 10, usage_count: 10,
        is_active: true, not_expired: true, under_limit: false,
      }],
    });

    const res = await request(app).get(BASE);
    expect(res.status).toBe(200);
    expect(res.body.data[0].status).toBe('used');
  });
});

// ─── POST /coupons/validate ───────────────────────────────────────────────────

describe('POST /coupons/validate', () => {
  it('returns 401 without auth', async () => {
    const res = await request(app).post(`${BASE}/validate`).send({ code: 'SAVE50', orderTotal: 500 });
    expect(res.status).toBe(401);
  });

  it('returns 400 when code or orderTotal is missing', async () => {
    const res = await request(app)
      .post(`${BASE}/validate`)
      .set(bearerHeader(token))
      .send({ code: 'SAVE50' });
    expect(res.status).toBe(400);
  });

  it('returns 404 for invalid or expired coupon code', async () => {
    getDbMock().mockResolvedValueOnce({ rows: [] }); // no matching coupon
    const res = await request(app)
      .post(`${BASE}/validate`)
      .set(bearerHeader(token))
      .send({ code: 'BADCODE', orderTotal: 500 });
    expect(res.status).toBe(404);
    expect(res.body.message).toMatch(/invalid|expired/i);
  });

  it('returns 400 when order total is below minimum order amount', async () => {
    getDbMock().mockResolvedValueOnce({
      rows: [{
        id: 'CPN0001', code: 'SAVE50', description: 'Get Rs 50 off',
        discount_type: 'fixed', discount_value: '50',
        min_order_amount: '500', max_discount_amount: null,
        valid_until: new Date(Date.now() + 86400000),
        usage_limit: null, usage_count: 0,
      }],
    });

    const res = await request(app)
      .post(`${BASE}/validate`)
      .set(bearerHeader(token))
      .send({ code: 'SAVE50', orderTotal: 200 }); // below min of 500
    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/minimum/i);
  });

  it('returns 200 with correct fixed discount amount', async () => {
    getDbMock().mockResolvedValueOnce({
      rows: [{
        id: 'CPN0001', code: 'SAVE50', description: 'Rs 50 off',
        discount_type: 'fixed', discount_value: '50',
        min_order_amount: '200', max_discount_amount: null,
        valid_until: new Date(Date.now() + 86400000),
        usage_limit: null, usage_count: 0,
      }],
    });

    const res = await request(app)
      .post(`${BASE}/validate`)
      .set(bearerHeader(token))
      .send({ code: 'SAVE50', orderTotal: 500 });
    expect(res.status).toBe(200);
    expect(res.body.data.discount).toBe(50);
  });

  it('applies percentage discount correctly', async () => {
    getDbMock().mockResolvedValueOnce({
      rows: [{
        id: 'CPN0002', code: 'PCT10', description: '10% off',
        discount_type: 'percentage', discount_value: '10',
        min_order_amount: '100', max_discount_amount: null,
        valid_until: new Date(Date.now() + 86400000),
        usage_limit: null, usage_count: 0,
      }],
    });

    const res = await request(app)
      .post(`${BASE}/validate`)
      .set(bearerHeader(token))
      .send({ code: 'PCT10', orderTotal: 1000 });
    expect(res.status).toBe(200);
    expect(res.body.data.discount).toBe(100); // 10% of 1000
  });

  it('caps percentage discount at max_discount_amount', async () => {
    getDbMock().mockResolvedValueOnce({
      rows: [{
        id: 'CPN0003', code: 'PCTCAP', description: '20% off, max Rs 100',
        discount_type: 'percentage', discount_value: '20',
        min_order_amount: '200', max_discount_amount: '100',
        valid_until: new Date(Date.now() + 86400000),
        usage_limit: null, usage_count: 0,
      }],
    });

    const res = await request(app)
      .post(`${BASE}/validate`)
      .set(bearerHeader(token))
      .send({ code: 'PCTCAP', orderTotal: 2000 }); // 20% of 2000 = 400, capped at 100
    expect(res.status).toBe(200);
    expect(res.body.data.discount).toBe(100);
  });
});
