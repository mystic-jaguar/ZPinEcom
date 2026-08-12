/**
 * Shared test helpers — token generation, mock DB row factories, etc.
 */
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'test-secret-key';
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'test-refresh-secret';

/** Generate a valid access token for test requests */
export function makeAccessToken(userId = 'USR0001', userRole = 'customer'): string {
  return jwt.sign({ userId, userRole }, JWT_SECRET, { expiresIn: '15m' });
}

/** Generate an access token for an admin user */
export function makeAdminToken(userId = 'ADM0001'): string {
  return makeAccessToken(userId, 'admin');
}

/** Generate an access token for a seller */
export function makeSellerToken(userId = 'SLR0001'): string {
  return makeAccessToken(userId, 'seller');
}

/** Generate an access token for a delivery partner */
export function makeDeliveryToken(userId = 'DLV0001'): string {
  return makeAccessToken(userId, 'delivery_partner');
}

/** Generate a valid refresh token */
export function makeRefreshToken(userId = 'USR0001'): string {
  return jwt.sign({ userId }, JWT_REFRESH_SECRET, { expiresIn: '30d' });
}

/** Auth header shorthand */
export function bearerHeader(token: string) {
  return { Authorization: `Bearer ${token}` };
}
