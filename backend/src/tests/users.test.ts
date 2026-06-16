/**
 * Users — Profile & Addresses
 * Covers: get profile, update profile, list/add shipping addresses
 */
import request from 'supertest';
import app from './setup/app';
import { bearerHeader, makeAccessToken } from './setup/helpers';

const BASE = '/api/v1/users';
const token = makeAccessToken('USR0001');

jest.mock('../db', () => {
  const mockQuery = jest.fn();
  const mockClientQuery = jest.fn();
  const mockClient = { query: mockClientQuery, release: jest.fn() };
  return {
    pool: {
      query: mockQuery,
      connect: jest.fn().mockResolvedValue(mockClient),
    },
    __mockQuery: mockQuery,
    __mockClientQuery: mockClientQuery,
  };
});

jest.mock('../utils/redis', () => ({
  cacheGet: jest.fn().mockResolvedValue(null),
  cacheSet: jest.fn().mockResolvedValue(undefined),
  default: { get: jest.fn(), set: jest.fn(), del: jest.fn() },
}));

jest.mock('../utils/encryption', () => ({
  encryptAddressPayload: jest.fn(v => v),
  decryptAddressPayload: jest.fn(v => v),
  encryptMoney: jest.fn(v => String(v)),
  decryptMoney: jest.fn(v => Number(v)),
  isEncrypted: jest.fn(() => false),
}));

const getDbMock = () => require('../db').__mockQuery as jest.Mock;
const getClientMock = () => require('../db').__mockClientQuery as jest.Mock;

const mockUserRow = {
  id: 'USR0001', user_name: 'tester', name: 'Test User',
  email: 'test@example.com', mobile: '9876543210',
  user_role: 'customer', is_verified: true, is_active: true,
  dob: null, gender: null, profile_image: null,
  receive_push_notifications: true, receive_email_updates: false,
  receive_order_updates: true, created_at: new Date(),
};

beforeEach(() => {
  getDbMock().mockReset();
  getClientMock().mockReset();
});

// ─── GET /users/:id ───────────────────────────────────────────────────────────

describe('GET /users/:id', () => {
  it('returns 401 without auth', async () => {
    const res = await request(app).get(`${BASE}/USR0001`);
    expect(res.status).toBe(401);
  });

  it('returns 403 when trying to fetch another user\'s profile', async () => {
    const res = await request(app)
      .get(`${BASE}/USR9999`)
      .set(bearerHeader(token)); // token is for USR0001
    expect(res.status).toBe(403);
  });

  it('returns 404 when user is not found', async () => {
    getDbMock().mockResolvedValueOnce({ rows: [] });
    const res = await request(app)
      .get(`${BASE}/USR0001`)
      .set(bearerHeader(token));
    expect(res.status).toBe(404);
  });

  it('returns 200 with user profile', async () => {
    getDbMock().mockResolvedValueOnce({ rows: [mockUserRow] });
    const res = await request(app)
      .get(`${BASE}/USR0001`)
      .set(bearerHeader(token));
    expect(res.status).toBe(200);
    expect(res.body.data.email).toBe('test@example.com');
  });
});

// ─── PUT /users/profileDetails ────────────────────────────────────────────────

describe('PUT /users/profileDetails', () => {
  it('returns 401 without auth', async () => {
    const res = await request(app).put(`${BASE}/profileDetails`).send({ name: 'New Name' });
    expect(res.status).toBe(401);
  });

  it('returns 400 when no updatable fields are provided', async () => {
    const res = await request(app)
      .put(`${BASE}/profileDetails`)
      .set(bearerHeader(token))
      .send({});
    expect(res.status).toBe(400);
  });

  it('updates profile fields and returns updated user', async () => {
    getDbMock().mockResolvedValueOnce({ rows: [] }); // UPDATE
    getDbMock().mockResolvedValueOnce({ rows: [{ ...mockUserRow, name: 'Updated Name' }] }); // re-fetch

    const res = await request(app)
      .put(`${BASE}/profileDetails`)
      .set(bearerHeader(token))
      .send({ name: 'Updated Name' });
    expect(res.status).toBe(200);
    expect(res.body.data.name).toBe('Updated Name');
  });

  it('persists notification preference changes', async () => {
    getDbMock().mockResolvedValueOnce({ rows: [] }); // UPDATE
    getDbMock().mockResolvedValueOnce({
      rows: [{
        ...mockUserRow,
        receive_push_notifications: false,
        receive_email_updates: true,
      }],
    });

    const res = await request(app)
      .put(`${BASE}/profileDetails`)
      .set(bearerHeader(token))
      .send({ receivePushNotifications: false, receiveEmailUpdates: true });
    expect(res.status).toBe(200);
    expect(res.body.data.receivePushNotifications).toBe(false);
    expect(res.body.data.receiveEmailUpdates).toBe(true);
  });
});

// ─── GET /users/shipping-addresses ───────────────────────────────────────────

describe('GET /users/shipping-addresses', () => {
  it('returns 401 without auth', async () => {
    const res = await request(app).get(`${BASE}/shipping-addresses`);
    expect(res.status).toBe(401);
  });

  it('returns list of addresses ordered by default first', async () => {
    getDbMock().mockResolvedValueOnce({
      rows: [
        { id: 'ADR0001', user_id: 'USR0001', name: 'Test', phone: '9876543210', address_line1: '123 St', city: 'Mumbai', state: 'MH', pincode: '400001', country: 'India', label: 'Home', is_default: true },
        { id: 'ADR0002', user_id: 'USR0001', name: 'Test', phone: '9876543210', address_line1: '456 Ave', city: 'Delhi', state: 'DL', pincode: '110001', country: 'India', label: 'Work', is_default: false },
      ],
    });

    const res = await request(app)
      .get(`${BASE}/shipping-addresses`)
      .set(bearerHeader(token));
    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(2);
  });
});

// ─── POST /users/shipping-address ─────────────────────────────────────────────

describe('POST /users/shipping-address', () => {
  const validAddress = {
    name: 'John Doe', phone: '9876543210', addressLine1: '123 Main St',
    city: 'Mumbai', state: 'Maharashtra', pincode: '400001', label: 'Home',
  };

  it('returns 401 without auth', async () => {
    const res = await request(app).post(`${BASE}/shipping-address`).send(validAddress);
    expect(res.status).toBe(401);
  });

  it('returns 400 when required fields are missing', async () => {
    const res = await request(app)
      .post(`${BASE}/shipping-address`)
      .set(bearerHeader(token))
      .send({ name: 'John', phone: '9876543210' }); // missing address, city etc.
    expect(res.status).toBe(400);
  });

  it('returns 400 for invalid phone number', async () => {
    const res = await request(app)
      .post(`${BASE}/shipping-address`)
      .set(bearerHeader(token))
      .send({ ...validAddress, phone: '123' }); // too short
    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/phone/i);
  });

  it('returns 400 for pincode that is not 6 digits', async () => {
    const res = await request(app)
      .post(`${BASE}/shipping-address`)
      .set(bearerHeader(token))
      .send({ ...validAddress, pincode: '4000' }); // only 4 digits
    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/pincode/i);
  });

  it('saves address encrypted and returns 201', async () => {
    // isDefault is not set → no UPDATE defaults query, only INSERT
    getDbMock().mockResolvedValueOnce({
      rows: [{
        id: 'ADR0001', user_id: 'USR0001',
        name: 'John Doe', phone: '9876543210',
        address_line1: '123 Main St', address_line2: '',
        city: 'Mumbai', state: 'Maharashtra',
        pincode: '400001', country: 'India',
        landmark: '', label: 'Home', is_default: false,
        created_at: new Date(), updated_at: new Date(),
      }],
    });

    const res = await request(app)
      .post(`${BASE}/shipping-address`)
      .set(bearerHeader(token))
      .send(validAddress);
    expect(res.status).toBe(201);
    expect(res.body.data).toBeDefined();
    expect(res.body.data.city).toBe('Mumbai');
  });

  it('clears other default addresses when isDefault is true', async () => {
    getDbMock().mockResolvedValueOnce({ rows: [] }); // UPDATE defaults
    getDbMock().mockResolvedValueOnce({              // INSERT
      rows: [{
        id: 'ADR0002', user_id: 'USR0001',
        name: 'John Doe', phone: '9876543210',
        address_line1: '456 Work Ave', address_line2: '',
        city: 'Delhi', state: 'Delhi',
        pincode: '110001', country: 'India',
        landmark: '', label: 'Work', is_default: true,
        created_at: new Date(), updated_at: new Date(),
      }],
    });

    const res = await request(app)
      .post(`${BASE}/shipping-address`)
      .set(bearerHeader(token))
      .send({ ...validAddress, addressLine1: '456 Work Ave', city: 'Delhi', state: 'Delhi', pincode: '110001', label: 'Work', isDefault: true });
    expect(res.status).toBe(201);
    expect(res.body.data.is_default).toBe(true);
    // UPDATE defaults must have been called
    const calls = getDbMock().mock.calls;
    const hasUpdate = calls.some((c: any[]) => String(c[0]).includes('UPDATE'));
    expect(hasUpdate).toBe(true);
  });
});

// ─── DELETE /users/me (account deletion) ─────────────────────────────────────

describe('DELETE /users/me', () => {
  const sqlsRun = () => getClientMock().mock.calls.map((c: any[]) => String(c[0]));

  it('returns 401 without auth', async () => {
    const res = await request(app).delete(`${BASE}/me`);
    expect(res.status).toBe(401);
  });

  it('returns 404 and rolls back when the account no longer exists', async () => {
    // SELECT ... FOR UPDATE returns no rows
    getClientMock().mockResolvedValue({ rows: [] });

    const res = await request(app).delete(`${BASE}/me`).set(bearerHeader(token));
    expect(res.status).toBe(404);
    expect(sqlsRun().some(s => /ROLLBACK/i.test(s))).toBe(true);
    expect(sqlsRun().some(s => /COMMIT/i.test(s))).toBe(false);
  });

  it('anonymizes the user, deletes PII/UGC, retains orders, and commits', async () => {
    getClientMock().mockImplementation((sql: string) => {
      if (/^\s*SELECT/i.test(sql)) return Promise.resolve({ rows: [{ id: 'USR0001' }] });
      return Promise.resolve({ rows: [] });
    });

    const res = await request(app).delete(`${BASE}/me`).set(bearerHeader(token));
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);

    const sqls = sqlsRun();
    // transaction committed
    expect(sqls.some(s => /COMMIT/i.test(s))).toBe(true);
    // personal data + UGC removed
    expect(sqls.some(s => /DELETE FROM "?addresses"?/i.test(s))).toBe(true);
    expect(sqls.some(s => /DELETE FROM refresh_tokens/i.test(s))).toBe(true);
    expect(sqls.some(s => /DELETE FROM product_reviews/i.test(s))).toBe(true);
    expect(sqls.some(s => /DELETE FROM wallets/i.test(s))).toBe(true);
    // user row anonymized + deactivated
    expect(sqls.some(s => /UPDATE "?users"? SET/i.test(s) && /is_active = false/i.test(s))).toBe(true);
    // financial records are RETAINED, not deleted
    expect(sqls.some(s => /DELETE FROM "?orders"?/i.test(s))).toBe(false);
    expect(sqls.some(s => /DELETE FROM order_items/i.test(s))).toBe(false);
  });
});
