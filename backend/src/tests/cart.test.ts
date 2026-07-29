/**
 * EPIC 3 — Cart & Wishlist
 * Covers: add/update/remove cart items, clear cart, wishlist toggle, move to cart
 */
import request from 'supertest';
import app from './setup/app';
import { bearerHeader, makeAccessToken } from './setup/helpers';

const CART_BASE = '/api/v1/cart';
const WISH_BASE = '/api/v1/wishlist';
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
  cacheDelPattern: jest.fn().mockResolvedValue(undefined),
  default: { get: jest.fn(), set: jest.fn(), del: jest.fn() },
}));

const getDbMock = () => require('../db').__mockQuery as jest.Mock;
const uuid = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11';

beforeEach(() => getDbMock().mockReset());

// ─── Cart ─────────────────────────────────────────────────────────────────────

describe('GET /cart', () => {
  it('returns 401 without auth', async () => {
    const res = await request(app).get(CART_BASE);
    expect(res.status).toBe(401);
  });

  it('returns 200 with cart items and totals', async () => {
    getDbMock().mockResolvedValueOnce({
      rows: [{
        id: 'CRT0001', product_id: uuid, quantity: 2,
        price_at_add: '499', product_name: 'Shirt',
        current_price: '499', in_stock: true, stock_qty: 10,
        images: ['http://example.com/img.jpg'], created_at: new Date(),
      }],
    });

    const res = await request(app).get(CART_BASE).set(bearerHeader(token));
    expect(res.status).toBe(200);
    expect(res.body.data.cart).toHaveLength(1);
    expect(res.body.data.totalAmount).toBe(1198); // 499 -> markup 598.8 -> charm-rounded 599, x2
  });

  it('flags price changes when current price differs from price_at_add', async () => {
    getDbMock().mockResolvedValueOnce({
      rows: [{
        id: 'CRT0001', product_id: uuid, quantity: 1,
        price_at_add: '499', product_name: 'Shirt',
        current_price: '599', // price changed
        in_stock: true, stock_qty: 5,
        images: [], created_at: new Date(),
      }],
    });

    const res = await request(app).get(CART_BASE).set(bearerHeader(token));
    expect(res.status).toBe(200);
    expect(res.body.data.hasPriceChanges).toBe(true);
  });

  it('flags unavailable items when product is out of stock', async () => {
    getDbMock().mockResolvedValueOnce({
      rows: [{
        id: 'CRT0001', product_id: uuid, quantity: 1,
        price_at_add: '499', product_name: 'Shirt',
        current_price: '499', in_stock: false, stock_qty: 0,
        images: [], created_at: new Date(),
      }],
    });

    const res = await request(app).get(CART_BASE).set(bearerHeader(token));
    expect(res.status).toBe(200);
    expect(res.body.data.hasUnavailableItems).toBe(true);
  });
});

describe('GET /cart/count', () => {
  it('returns cart item count', async () => {
    getDbMock().mockResolvedValueOnce({ rows: [{ count: '3' }] });
    const res = await request(app).get(`${CART_BASE}/count`).set(bearerHeader(token));
    expect(res.status).toBe(200);
    expect(res.body.data.count).toBe(3);
  });
});

describe('POST /cart', () => {
  it('returns 400 when productId is missing', async () => {
    const res = await request(app)
      .post(CART_BASE)
      .set(bearerHeader(token))
      .send({ quantity: 1 });
    expect(res.status).toBe(400);
  });

  it('returns 400 for invalid quantity (0)', async () => {
    const res = await request(app)
      .post(CART_BASE)
      .set(bearerHeader(token))
      .send({ productId: uuid, quantity: 0 });
    expect(res.status).toBe(400);
  });

  it('returns 400 for quantity exceeding 100', async () => {
    const res = await request(app)
      .post(CART_BASE)
      .set(bearerHeader(token))
      .send({ productId: uuid, quantity: 101 });
    expect(res.status).toBe(400);
  });

  it('returns 404 when product does not exist', async () => {
    getDbMock().mockResolvedValueOnce({ rows: [] }); // product not found
    const res = await request(app)
      .post(CART_BASE)
      .set(bearerHeader(token))
      .send({ productId: uuid, quantity: 1 });
    expect(res.status).toBe(404);
  });

  it('returns 400 when product is out of stock', async () => {
    getDbMock().mockResolvedValueOnce({ rows: [{ price: '499', in_stock: false }] });
    const res = await request(app)
      .post(CART_BASE)
      .set(bearerHeader(token))
      .send({ productId: uuid, quantity: 1 });
    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/out of stock/i);
  });

  it('auto-increments quantity when item already in cart', async () => {
    getDbMock().mockResolvedValueOnce({ rows: [{ price: '499', in_stock: true }] }); // product
    getDbMock().mockResolvedValueOnce({ rows: [{ id: 'CRT0001' }] }); // existing cart item
    getDbMock().mockResolvedValueOnce({ rows: [] }); // UPDATE

    const res = await request(app)
      .post(CART_BASE)
      .set(bearerHeader(token))
      .send({ productId: uuid, quantity: 1 });
    expect(res.status).toBe(201);
    // UPDATE should have been called (not INSERT)
    const calls = getDbMock().mock.calls;
    const hasUpdate = calls.some(call => String(call[0]).includes('UPDATE'));
    expect(hasUpdate).toBe(true);
  });

  it('creates new cart item and captures price_at_add', async () => {
    getDbMock().mockResolvedValueOnce({ rows: [{ price: '499', in_stock: true }] }); // product
    getDbMock().mockResolvedValueOnce({ rows: [] }); // no existing item
    getDbMock().mockResolvedValueOnce({ rows: [] }); // INSERT

    const res = await request(app)
      .post(CART_BASE)
      .set(bearerHeader(token))
      .send({ productId: uuid, quantity: 2 });
    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
  });
});

describe('PUT /cart/:productId', () => {
  it('returns 400 for invalid quantity', async () => {
    const res = await request(app)
      .put(`${CART_BASE}/${uuid}`)
      .set(bearerHeader(token))
      .send({ quantity: 0 });
    expect(res.status).toBe(400);
  });

  it('returns 404 when cart item not found', async () => {
    getDbMock().mockResolvedValueOnce({ rows: [] });
    const res = await request(app)
      .put(`${CART_BASE}/${uuid}`)
      .set(bearerHeader(token))
      .send({ quantity: 3 });
    expect(res.status).toBe(404);
  });

  it('updates quantity successfully', async () => {
    getDbMock().mockResolvedValueOnce({ rows: [{ id: 'CRT0001' }] });
    const res = await request(app)
      .put(`${CART_BASE}/${uuid}`)
      .set(bearerHeader(token))
      .send({ quantity: 5 });
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });
});

describe('DELETE /cart/:productId', () => {
  it('removes a specific item from cart', async () => {
    getDbMock().mockResolvedValueOnce({ rows: [] });
    const res = await request(app)
      .delete(`${CART_BASE}/${uuid}`)
      .set(bearerHeader(token));
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });
});

describe('DELETE /cart (clear all)', () => {
  it('clears entire cart', async () => {
    getDbMock().mockResolvedValueOnce({ rows: [] });
    const res = await request(app)
      .delete(CART_BASE)
      .set(bearerHeader(token));
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });
});

// ─── Wishlist ─────────────────────────────────────────────────────────────────

describe('GET /wishlist', () => {
  it('returns 401 without auth', async () => {
    const res = await request(app).get(WISH_BASE);
    expect(res.status).toBe(401);
  });

  it('returns 200 with wishlist items', async () => {
    getDbMock().mockResolvedValueOnce({ rows: [{ count: '1' }] });
    getDbMock().mockResolvedValueOnce({
      rows: [{
        product_id: uuid, product_name: 'Shirt', price: '499',
        in_stock: true, images: [], created_at: new Date(),
      }],
    });

    const res = await request(app).get(WISH_BASE).set(bearerHeader(token));
    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(1);
  });
});

describe('POST /wishlist', () => {
  it('returns 400 when productId is missing', async () => {
    const res = await request(app)
      .post(WISH_BASE)
      .set(bearerHeader(token))
      .send({});
    expect(res.status).toBe(400);
  });

  it('returns 409 when product is already in wishlist', async () => {
    getDbMock().mockResolvedValueOnce({ rows: [{ id: 'WSH0001' }] }); // already exists
    const res = await request(app)
      .post(WISH_BASE)
      .set(bearerHeader(token))
      .send({ productId: uuid });
    expect(res.status).toBe(409);
  });

  it('adds product to wishlist', async () => {
    getDbMock().mockResolvedValueOnce({ rows: [] }); // not in wishlist
    getDbMock().mockResolvedValueOnce({ rows: [] }); // INSERT

    const res = await request(app)
      .post(WISH_BASE)
      .set(bearerHeader(token))
      .send({ productId: uuid });
    expect(res.status).toBe(201);
  });
});

describe('DELETE /wishlist/:productId', () => {
  it('removes product from wishlist', async () => {
    getDbMock().mockResolvedValueOnce({ rows: [] });
    const res = await request(app)
      .delete(`${WISH_BASE}/${uuid}`)
      .set(bearerHeader(token));
    expect(res.status).toBe(200);
  });
});

describe('DELETE /wishlist/clear', () => {
  it('clears entire wishlist', async () => {
    getDbMock().mockResolvedValueOnce({ rows: [] });
    const res = await request(app)
      .delete(`${WISH_BASE}/clear`)
      .set(bearerHeader(token));
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });
});
