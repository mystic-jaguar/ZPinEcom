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

// No-op the moderation schema bootstrap so it doesn't consume mocked DB calls.
jest.mock('../utils/mailer', () => ({
  sendOTPEmail: jest.fn().mockResolvedValue(undefined),
  sendDeletionConfirmedEmail: jest.fn().mockResolvedValue(undefined),
  sendOrderConfirmationEmail: jest.fn().mockResolvedValue(undefined),
}));

jest.mock('../utils/moderationSchema', () => ({
  ensureModerationSchema: jest.fn().mockResolvedValue(undefined),
  AUTO_HIDE_THRESHOLD: 3,
}));

const getDbMock = () => require('../db').__mockQuery as jest.Mock;
const getClientMock = () => require('../db').__mockClientQuery as jest.Mock;
const sendOTPEmailMock = require('../utils/mailer').sendOTPEmail as jest.Mock;

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
  sendOTPEmailMock.mockClear();
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

  it('returns 403 ACCOUNT_SUSPENDED for a live token once an admin suspends the account', async () => {
    getDbMock().mockResolvedValueOnce({ rows: [{ is_active: false, revoked_at: null }] });
    const res = await request(app).get(`${BASE}/USR0001`).set(bearerHeader(token));
    expect(res.status).toBe(403);
    expect(res.body.code).toBe('ACCOUNT_SUSPENDED');
    expect(getDbMock()).toHaveBeenCalledTimes(1); // the route never ran
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

// ─── Account deletion (OTP + 30-day recovery) ────────────────────────────────
// The website twin's shape: /start mails a code, /confirm soft-deletes.
// Nothing is anonymised here — that is the website backend's purge sweep, and a
// test asserting immediate erasure would be asserting the old bug.

describe('account deletion', () => {
  const sqlsRun = () => getClientMock().mock.calls.map((c: any[]) => String(c[0]));
  const poolSqls = () => getDbMock().mock.calls.map((c: any[]) => String(c[0]));
  const liveUser = { id: 'USR0001', name: 'Test User', email: 'test@example.com', deleted_at: null };

  // pool.query is used for the OTP table bootstrap, the user lookup, the blocker
  // count and the OTP rows — route by SQL rather than by call order.
  const routePool = (over: (sql: string) => any = () => null) => {
    getDbMock().mockImplementation((sql: string) => {
      const custom = over(sql);
      if (custom) return Promise.resolve(custom);
      if (/FROM "?users"?/i.test(sql)) return Promise.resolve({ rows: [liveUser] });
      if (/COUNT\(\*\)/i.test(sql)) return Promise.resolve({ rows: [{ n: 0 }] });
      if (/INSERT INTO email_otp_verifications/i.test(sql)) return Promise.resolve({ rows: [] });
      return Promise.resolve({ rows: [] });
    });
  };

  it('returns 401 without auth', async () => {
    const res = await request(app).post(`${BASE}/me/delete/start`);
    expect(res.status).toBe(401);
  });

  it('start mails a code and never returns it', async () => {
    routePool();
    const res = await request(app).post(`${BASE}/me/delete/start`).set(bearerHeader(token));
    expect(res.status).toBe(200);
    expect(res.body.recoveryDays).toBe(30);
    expect(res.body.maskedEmail).toContain('@example.com');
    expect(JSON.stringify(res.body)).not.toMatch(/\b\d{6}\b/);
    expect(sendOTPEmailMock).toHaveBeenCalledWith('test@example.com', expect.stringMatching(/^\d{6}$/), 'account_deletion');
  });

  it('start refuses while an order is still in progress', async () => {
    routePool(sql => (/COUNT\(\*\)/i.test(sql) ? { rows: [{ n: 2 }] } : null));
    const res = await request(app).post(`${BASE}/me/delete/start`).set(bearerHeader(token));
    expect(res.status).toBe(409);
    expect(res.body.blockers[0].code).toBe('OPEN_ORDERS');
    expect(sendOTPEmailMock).not.toHaveBeenCalled();
  });

  it('confirm rejects a wrong code without touching the users row', async () => {
    routePool(sql =>
      /SELECT id, otp, attempts/i.test(sql)
        ? { rows: [{ id: 1, otp: '111111', attempts: 0, expires_at: new Date(Date.now() + 60000) }] }
        : /UPDATE email_otp_verifications SET attempts/i.test(sql)
          ? { rows: [{ attempts: 1 }] }
          : null
    );
    const res = await request(app).post(`${BASE}/me/delete/confirm`).set(bearerHeader(token)).send({ code: '999999' });
    expect(res.status).toBe(400);
    expect(sqlsRun().some(s => /UPDATE "?users"?/i.test(s))).toBe(false);
  });

  it('confirm soft-deletes with a 30-day window, writes the audit row and signs out', async () => {
    routePool(sql =>
      /SELECT id, otp, attempts/i.test(sql)
        ? { rows: [{ id: 1, otp: '123456', attempts: 0, expires_at: new Date(Date.now() + 60000) }] }
        : null
    );
    getClientMock().mockImplementation((sql: string) =>
      Promise.resolve({ rows: /UPDATE "?users"?/i.test(sql) ? [{ id: 'USR0001' }] : [] })
    );

    const res = await request(app).post(`${BASE}/me/delete/confirm`).set(bearerHeader(token)).send({ code: '123456' });
    expect(res.status).toBe(200);
    expect(res.body.recoveryDays).toBe(30);
    expect(new Date(res.body.purgeAfter).getTime()).toBeGreaterThan(Date.now());

    const sqls = sqlsRun();
    expect(sqls.some(s => /COMMIT/i.test(s))).toBe(true);
    // soft delete, not anonymisation — the purge sweep owns the erasure
    expect(sqls.some(s => /UPDATE "?users"?/i.test(s) && /deleted_at = NOW\(\)/i.test(s) && /purge_after/i.test(s))).toBe(true);
    expect(sqls.some(s => /'Deleted User'/i.test(s))).toBe(false);
    expect(sqls.some(s => /INSERT INTO account_deletion_requests/i.test(s))).toBe(true);
    // the live session dies immediately — this was the old flow's bug
    expect(poolSqls().some(s => /customer_token_revocations/i.test(s))).toBe(true);
    expect(poolSqls().some(s => /DELETE FROM "?refresh_tokens"?/i.test(s))).toBe(true);
    // financial records are RETAINED
    expect(sqls.some(s => /DELETE FROM "?orders"?/i.test(s))).toBe(false);
    expect(sqls.some(s => /DELETE FROM order_items/i.test(s))).toBe(false);
  });

  it('legacy DELETE /me soft-deletes too (old installed builds)', async () => {
    routePool();
    getClientMock().mockImplementation((sql: string) =>
      Promise.resolve({ rows: /UPDATE "?users"?/i.test(sql) ? [{ id: 'USR0001' }] : [] })
    );
    const res = await request(app).delete(`${BASE}/me`).set(bearerHeader(token));
    expect(res.status).toBe(200);
    expect(sqlsRun().some(s => /deleted_at = NOW\(\)/i.test(s))).toBe(true);
  });

  it('refuses an account that is already scheduled for deletion', async () => {
    routePool(sql => (/FROM "?users"?/i.test(sql) ? { rows: [{ ...liveUser, deleted_at: new Date() }] } : null));
    const res = await request(app).post(`${BASE}/me/delete/start`).set(bearerHeader(token));
    expect(res.status).toBe(409);
    expect(res.body.code).toBe('ALREADY_DELETED');
  });
});

describe('POST /users/block', () => {
  it('returns 401 without auth', async () => {
    const res = await request(app).post(`${BASE}/block`).send({ userId: 'USR0002' });
    expect(res.status).toBe(401);
  });

  it('returns 400 when userId is missing', async () => {
    const res = await request(app).post(`${BASE}/block`).set(bearerHeader(token)).send({});
    expect(res.status).toBe(400);
  });

  it('returns 400 when blocking yourself', async () => {
    const res = await request(app).post(`${BASE}/block`).set(bearerHeader(token)).send({ userId: 'USR0001' });
    expect(res.status).toBe(400);
  });

  it('returns 404 when the target user does not exist', async () => {
    getDbMock().mockResolvedValueOnce({ rows: [] }); // SELECT target → none
    const res = await request(app).post(`${BASE}/block`).set(bearerHeader(token)).send({ userId: 'USR9999' });
    expect(res.status).toBe(404);
  });

  it('blocks an existing user', async () => {
    getDbMock()
      .mockResolvedValueOnce({ rows: [{ id: 'USR0002' }] }) // SELECT target exists
      .mockResolvedValueOnce({ rows: [] });                  // INSERT block (ON CONFLICT)
    const res = await request(app).post(`${BASE}/block`).set(bearerHeader(token)).send({ userId: 'USR0002' });
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    const sqls = getDbMock().mock.calls.map((c: any[]) => String(c[0]));
    expect(sqls.some(s => /INSERT INTO user_blocks/i.test(s))).toBe(true);
  });
});

describe('DELETE /users/block/:userId', () => {
  it('returns 401 without auth', async () => {
    const res = await request(app).delete(`${BASE}/block/USR0002`);
    expect(res.status).toBe(401);
  });

  it('unblocks a user', async () => {
    getDbMock().mockResolvedValueOnce({ rows: [] }); // DELETE block
    const res = await request(app).delete(`${BASE}/block/USR0002`).set(bearerHeader(token));
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });
});

// GET /users/orders is the endpoint the CUSTOMER APP's order list actually
// calls — not GET /orders. It shipped without `orderItemId`, which left the
// returns screen with no per-item key: every checkbox shared one key, so
// ticking one ticked all and the selection never reached the server. The SQL is
// now shared (utils/orderItemsSql.ts); this locks the payload contract.
describe('GET /users/orders', () => {
  it('returns 401 without auth', async () => {
    const res = await request(app).get(`${BASE}/orders`);
    expect(res.status).toBe(401);
  });

  it('sends every field the returns screen keys on', async () => {
    getDbMock()
      // authenticate() checks token revocation first and eats one mock.
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [{ count: '1' }] })
      .mockResolvedValueOnce({
        rows: [{
          id: 'ORD0001', order_number: 'ZP-1', group_id: 'GRP0001', user_id: 'USR0001',
          status: 'delivered', payment_status: 'paid',
          total_amount: 100, final_amount: 118, shipping_address: {},
          items: [
            { orderItemId: 'OI00001', productId: 'PRD0001', productName: 'A', quantity: 2, price: 100, isReturned: false, returnedQuantity: 1 },
            { orderItemId: 'OI00002', productId: 'PRD0002', productName: 'B', quantity: 1, price: 50, isReturned: false, returnedQuantity: 0 },
          ],
          created_at: new Date(), updated_at: new Date(),
        }],
      });

    const res = await request(app).get(`${BASE}/orders`).set(bearerHeader(token));
    expect(res.status).toBe(200);
    const items = res.body.data[0].items;
    // Distinct, non-empty ids are the whole point: one shared key = one refund
    // for the entire order.
    const ids = items.map((i: any) => i.orderItemId);
    expect(ids).toEqual(['OI00001', 'OI00002']);
    expect(new Set(ids).size).toBe(items.length);
    expect(items[0].returnedQuantity).toBe(1);
    expect(res.body.data[0].groupId).toBe('GRP0001');

    // ...and the SQL must really ask for them, not just pass a mocked row through.
    const sql = String(getDbMock().mock.calls[2][0]);
    expect(sql).toMatch(/'orderItemId', oi\.id/);
    expect(sql).toMatch(/'returnedQuantity'/);
  });
});
