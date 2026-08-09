/**
 * EPIC 2 — Product Discovery
 * Covers: product listing, search, recommendations, fresh categories, product detail, reviews
 */
import request from 'supertest';
import app from './setup/app';
import { bearerHeader, makeAccessToken } from './setup/helpers';

const BASE = '/api/v1/products';

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

// No-op the moderation schema bootstrap so it doesn't consume mocked DB calls.
jest.mock('../utils/moderationSchema', () => ({
  ensureModerationSchema: jest.fn().mockResolvedValue(undefined),
  AUTO_HIDE_THRESHOLD: 3,
}));

const getDbMock = () => require('../db').__mockQuery as jest.Mock;
const token = makeAccessToken('USR0001');

const productRow = (overrides = {}) => ({
  id: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
  product_name: 'Test Shirt',
  price: '499',
  in_stock: true,
  quantity: 10,
  category_path: [],
  deepest_category_name: 'T-Shirts',
  images: [],
  average_rating: '4.5',
  size_quantities: { S: 5, M: 5 },
  extracted_attributes: { colors: ['Red'] },
  created_at: new Date(),
  user_id: 'USR0001',
  description: 'A nice shirt',
  ...overrides,
});

beforeEach(() => getDbMock().mockReset());

// ─── 2.1  GET /products — listing ─────────────────────────────────────────────

describe('GET /products', () => {
  it('returns 200 with products array and pagination', async () => {
    getDbMock()
      .mockResolvedValueOnce({ rows: [{ count: '2' }] })
      .mockResolvedValueOnce({ rows: [productRow(), productRow({ id: 'b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', product_name: 'Jeans' })] });

    const res = await request(app).get(BASE);
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    // Route returns 'products' key (not 'data')
    expect(Array.isArray(res.body.products)).toBe(true);
    expect(res.body.products).toHaveLength(2);
  });

  it('includes pagination metadata', async () => {
    getDbMock()
      .mockResolvedValueOnce({ rows: [{ count: '50' }] })
      .mockResolvedValueOnce({ rows: [] });

    const res = await request(app).get(`${BASE}?limit=10&page=2`);
    expect(res.status).toBe(200);
    expect(res.body.pagination.currentPage).toBe(2);
    expect(res.body.pagination.totalItems).toBe(50);
  });
});

// ─── 2.2  GET /products/search ────────────────────────────────────────────────

describe('GET /products/search', () => {
  it('returns empty arrays when query is blank', async () => {
    const res = await request(app).get(`${BASE}/search?q=`);
    expect(res.status).toBe(200);
    expect(res.body.products).toHaveLength(0);
  });

  it('returns matching products with related products', async () => {
    // main search query
    getDbMock().mockResolvedValueOnce({ rows: [productRow({ product_name: 'Keychain' })] });
    // related products query
    getDbMock().mockResolvedValueOnce({ rows: [] });

    const res = await request(app).get(`${BASE}/search?q=keychain`);
    expect(res.status).toBe(200);
    expect(res.body.products.length).toBeGreaterThan(0);
  });

  it('returns empty products array when no results found', async () => {
    // main search — no results
    getDbMock().mockResolvedValueOnce({ rows: [] });

    const res = await request(app).get(`${BASE}/search?q=xyznotexist`);
    expect(res.status).toBe(200);
    expect(res.body.products).toHaveLength(0);
  });
});

// ─── 2.3  GET /products/recommended ──────────────────────────────────────────

describe('GET /products/recommended', () => {
  it('returns 401 without auth token', async () => {
    const res = await request(app).get(`${BASE}/recommended`);
    expect(res.status).toBe(401);
  });

  it('returns 200 with personalized product recommendations', async () => {
    // purchase history (+3)
    getDbMock().mockResolvedValueOnce({ rows: [{ product_id: 'uuid-p', deepest_category_name: 'T-Shirts' }] });
    // wishlist (+2)
    getDbMock().mockResolvedValueOnce({ rows: [] });
    // category products
    getDbMock().mockResolvedValueOnce({ rows: [productRow()] });

    const res = await request(app)
      .get(`${BASE}/recommended`)
      .set(bearerHeader(token));
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    // Route returns 'products' key
    expect(Array.isArray(res.body.products)).toBe(true);
  });

  it('falls back to latest products for a new customer with no history', async () => {
    // no purchases
    getDbMock().mockResolvedValueOnce({ rows: [] });
    // no wishlist
    getDbMock().mockResolvedValueOnce({ rows: [] });
    // no categories scored, so fallback query fires
    getDbMock().mockResolvedValueOnce({ rows: [productRow()] });

    const res = await request(app)
      .get(`${BASE}/recommended`)
      .set(bearerHeader(token));
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.products)).toBe(true);
  });
});

// ─── 2.4  GET /products/fresh-categories ─────────────────────────────────────

describe('GET /products/fresh-categories', () => {
  it('returns 200 with top recently-updated categories', async () => {
    getDbMock().mockResolvedValueOnce({
      rows: [
        { deepest_category_name: 'T-Shirts', latest_at: new Date(), image_url: null, category_path: [] },
        { deepest_category_name: 'Denim', latest_at: new Date(), image_url: null, category_path: [] },
      ],
    });

    const res = await request(app).get(`${BASE}/fresh-categories`);
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data)).toBe(true);
  });
});

// ─── 2.5  GET /products/:id — product detail ──────────────────────────────────

describe('GET /products/:id', () => {
  const uuid = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11';

  it('returns 404 for non-existent product UUID', async () => {
    // Detail responses are cache-revalidated against products.updated_at, so the
    // route asks for that stamp before the main query. No row → no stamp.
    getDbMock().mockResolvedValueOnce({ rows: [] });
    getDbMock().mockResolvedValueOnce({ rows: [] });
    const res = await request(app).get(`${BASE}/00000000-0000-0000-0000-000000000000`);
    expect(res.status).toBe(404);
  });

  it('returns 404 for invalid product ID format (route treats as 404)', async () => {
    // Route uses isValidProductId and returns 404 for unrecognised formats
    const res = await request(app).get(`${BASE}/not-a-valid-id`);
    expect(res.status).toBe(404);
  });

  it('returns 200 with product details including size and color variants', async () => {
    // 1) the updated_at freshness stamp, 2) the product itself
    getDbMock().mockResolvedValueOnce({ rows: [{ updated_at: new Date() }] });
    getDbMock().mockResolvedValueOnce({ rows: [productRow()] });

    const res = await request(app).get(`${BASE}/${uuid}`);
    expect(res.status).toBe(200);
    expect(res.body.data.productName).toBe('Test Shirt');
    expect(res.body.data.sizes).toContain('S');
    expect(res.body.data.colors).toContain('Red');
  });
});

// ─── 2.6  Reviews ─────────────────────────────────────────────────────────────

describe('Product Reviews', () => {
  const uuid = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11';

  describe('GET /products/:id/reviews', () => {
    it('returns 200 with paginated reviews', async () => {
      // Query order: 1) resolveProductUUID  2) SELECT reviews  3) COUNT
      getDbMock()
        .mockResolvedValueOnce({ rows: [{ id: uuid }] })  // resolveProductUUID
        .mockResolvedValueOnce({                           // SELECT reviews
          rows: [{
            id: 'REV0001', user_id: 'USR0001', product_id: uuid,
            rating: 5, comment: 'Great!', images: '[]',
            user_name: 'Tester', user_profile_image: null,
            created_at: new Date(), updated_at: new Date(),
            is_verified_purchase: true,
          }],
        })
        .mockResolvedValueOnce({ rows: [{ count: '1' }] }); // COUNT

      const res = await request(app).get(`${BASE}/${uuid}/reviews`);
      expect(res.status).toBe(200);
      expect(res.body.data).toHaveLength(1);
      expect(res.body.data[0].isVerifiedPurchase).toBe(true);
    });

    it('returns empty data array when product has no reviews', async () => {
      getDbMock()
        .mockResolvedValueOnce({ rows: [{ id: uuid }] })   // resolveProductUUID
        .mockResolvedValueOnce({ rows: [] })                // SELECT reviews (empty)
        .mockResolvedValueOnce({ rows: [{ count: '0' }] }); // COUNT

      const res = await request(app).get(`${BASE}/${uuid}/reviews`);
      expect(res.status).toBe(200);
      expect(res.body.data).toHaveLength(0);
    });

    it('returns 404 for a non-existent product UUID', async () => {
      getDbMock().mockResolvedValueOnce({ rows: [] }); // resolveProductUUID returns null

      const res = await request(app).get(`${BASE}/00000000-0000-0000-0000-000000000000/reviews`);
      expect(res.status).toBe(404);
    });
  });

  describe('POST /products/:id/reviews', () => {
    it('returns 401 without auth', async () => {
      const res = await request(app)
        .post(`${BASE}/${uuid}/reviews`)
        .send({ rating: 5, comment: 'Nice!' });
      expect(res.status).toBe(401);
    });

    it('returns 400 when rating is missing', async () => {
      const res = await request(app)
        .post(`${BASE}/${uuid}/reviews`)
        .set(bearerHeader(token))
        .send({ comment: 'No rating here' });
      expect(res.status).toBe(400);
    });

    it('returns 400 when comment is missing', async () => {
      const res = await request(app)
        .post(`${BASE}/${uuid}/reviews`)
        .set(bearerHeader(token))
        .send({ rating: 4 }); // no comment
      expect(res.status).toBe(400);
    });

    it('returns 400 for rating outside 1–5 range', async () => {
      const res = await request(app)
        .post(`${BASE}/${uuid}/reviews`)
        .set(bearerHeader(token))
        .send({ rating: 6, comment: 'Great!' });
      expect(res.status).toBe(400);
    });

    it('returns 201 on successful review submission', async () => {
      getDbMock()
        .mockResolvedValueOnce({ rows: [{ id: uuid }] }) // product UUID check
        .mockResolvedValueOnce({ rows: [] })              // no existing review
        .mockResolvedValueOnce({ rows: [] })              // INSERT review
        .mockResolvedValueOnce({ rows: [] });             // cache invalidation (no-op)

      const res = await request(app)
        .post(`${BASE}/${uuid}/reviews`)
        .set(bearerHeader(token))
        .send({ rating: 5, comment: 'Love this product!' });
      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
    });

    it('returns 409 when user has already reviewed this product', async () => {
      getDbMock()
        .mockResolvedValueOnce({ rows: [{ id: uuid }] }) // product UUID check
        .mockResolvedValueOnce({ rows: [{ id: 'REV0001' }] }); // existing review found

      const res = await request(app)
        .post(`${BASE}/${uuid}/reviews`)
        .set(bearerHeader(token))
        .send({ rating: 4, comment: 'Changed my mind' });
      expect(res.status).toBe(409);
      expect(res.body.message).toMatch(/already reviewed/i);
    });
  });

  describe('PUT /products/:id/reviews/:reviewId', () => {
    it('returns 401 without auth', async () => {
      const res = await request(app)
        .put(`${BASE}/${uuid}/reviews/REV0001`)
        .send({ rating: 3, comment: 'Updated' });
      expect(res.status).toBe(401);
    });

    it('returns 400 when no review fields are provided', async () => {
      const res = await request(app)
        .put(`${BASE}/${uuid}/reviews/REV0001`)
        .set(bearerHeader(token))
        .send({});
      expect(res.status).toBe(400);
    });

    it('returns 403 or 404 when review is not owned by the requesting user', async () => {
      // Review not found for this user
      getDbMock().mockResolvedValueOnce({ rows: [] });

      const res = await request(app)
        .put(`${BASE}/${uuid}/reviews/REV0001`)
        .set(bearerHeader(token))
        .send({ rating: 3, comment: 'Updated' });
      expect([403, 404]).toContain(res.status);
    });
  });

  describe('DELETE /products/:id/reviews/:reviewId', () => {
    it('returns 401 without auth', async () => {
      const res = await request(app)
        .delete(`${BASE}/${uuid}/reviews/REV0001`);
      expect(res.status).toBe(401);
    });

    it('returns 403 or 404 when review is not owned by the requesting user', async () => {
      getDbMock().mockResolvedValueOnce({ rows: [] });

      const res = await request(app)
        .delete(`${BASE}/${uuid}/reviews/REV0001`)
        .set(bearerHeader(token));
      expect([403, 404]).toContain(res.status);
    });
  });

  describe('POST /products/:id/reviews/:reviewId/report', () => {
    const reportUrl = `${BASE}/${uuid}/reviews/REV0009/report`;

    it('returns 401 without auth', async () => {
      const res = await request(app).post(reportUrl).send({ reason: 'spam' });
      expect(res.status).toBe(401);
    });

    it('returns 404 when the review does not exist', async () => {
      getDbMock().mockResolvedValueOnce({ rows: [] }); // SELECT review → none
      const res = await request(app).post(reportUrl).set(bearerHeader(token)).send({ reason: 'spam' });
      expect(res.status).toBe(404);
    });

    it('returns 400 when reporting your own review', async () => {
      getDbMock().mockResolvedValueOnce({ rows: [{ id: 'REV0009', product_id: uuid, user_id: 'USR0001' }] });
      const res = await request(app).post(reportUrl).set(bearerHeader(token)).send({ reason: 'spam' });
      expect(res.status).toBe(400);
    });

    it('records a report and does not hide below the threshold', async () => {
      getDbMock()
        .mockResolvedValueOnce({ rows: [{ id: 'REV0009', product_id: uuid, user_id: 'USR0002' }] }) // SELECT review
        .mockResolvedValueOnce({ rows: [] })                 // INSERT report (ON CONFLICT)
        .mockResolvedValueOnce({ rows: [{ count: 1 }] });    // COUNT distinct reports

      const res = await request(app).post(reportUrl).set(bearerHeader(token)).send({ reason: 'abuse' });
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.hidden).toBe(false);
    });

    it('auto-hides the review once the report threshold is reached', async () => {
      getDbMock()
        .mockResolvedValueOnce({ rows: [{ id: 'REV0009', product_id: uuid, user_id: 'USR0002' }] }) // SELECT review
        .mockResolvedValueOnce({ rows: [] })                 // INSERT report
        .mockResolvedValueOnce({ rows: [{ count: 3 }] })     // COUNT == threshold
        .mockResolvedValueOnce({ rows: [] });                // UPDATE is_hidden

      const res = await request(app).post(reportUrl).set(bearerHeader(token)).send({ reason: 'abuse' });
      expect(res.status).toBe(200);
      expect(res.body.hidden).toBe(true);
    });
  });
});
