import crypto from 'crypto';
import { Pool } from 'pg';

const ENCRYPTION_PREFIX = 'enc:v1:';
const IV_LENGTH = 12;
const AUTH_TAG_LENGTH = 16;
const ADDRESS_KEYS = [
  'name',
  'phone',
  'address_line1',
  'address_line2',
  'address',
  'city',
  'state',
  'pincode',
  'country',
  'landmark',
] as const;

let sensitiveDataPrepared = false;

type Queryable = { query: (text: string, params?: any[]) => Promise<any> };

async function tableExists(db: Queryable, tableName: string): Promise<boolean> {
  const result = await db.query(
    `SELECT EXISTS (
       SELECT 1 FROM information_schema.tables
       WHERE table_schema = 'public' AND table_name = $1
     ) AS exists`,
    [tableName]
  );

  return Boolean(result.rows[0]?.exists);
}

let _cachedKey: Buffer | null = null;

function deriveKey(secret: string): Buffer {
  // Support both raw passphrase and base64-encoded 32-byte keys.
  const maybeBase64 = Buffer.from(secret, 'base64');
  if (maybeBase64.length === 32 && maybeBase64.toString('base64') === secret) {
    return maybeBase64;
  }
  // Use PBKDF2 for passphrase-based keys — SHA-256 hashing is not a KDF
  // and is vulnerable to brute-force. PBKDF2 adds cost via iterations.
  // Salt is fixed (derived from a constant) so the same passphrase always
  // produces the same key — this is intentional for deterministic encryption.
  return crypto.pbkdf2Sync(secret, 'zpin-enc-salt-v1', 100_000, 32, 'sha256');
}

function getKey(): Buffer {
  const secret = process.env.DATA_ENCRYPTION_KEY;
  if (!secret) {
    throw new Error('DATA_ENCRYPTION_KEY is required');
  }
  // Cache the derived key — PBKDF2 is intentionally slow and must not run per-call
  if (!_cachedKey) {
    _cachedKey = deriveKey(secret);
  }
  return _cachedKey;
}

export function isEncrypted(value: unknown): boolean {
  return typeof value === 'string' && value.startsWith(ENCRYPTION_PREFIX);
}

export function encryptText(value: unknown): string {
  const normalized = String(value ?? '');
  if (isEncrypted(normalized)) {
    return normalized;
  }

  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv('aes-256-gcm', getKey(), iv);
  const encrypted = Buffer.concat([cipher.update(normalized, 'utf8'), cipher.final()]);
  const authTag = cipher.getAuthTag();

  return `${ENCRYPTION_PREFIX}${Buffer.concat([iv, authTag, encrypted]).toString('base64')}`;
}

export function decryptText(value: unknown): string {
  if (value === null || value === undefined) {
    return '';
  }

  const normalized = String(value);
  if (!isEncrypted(normalized)) {
    return normalized;
  }

  const payload = Buffer.from(normalized.slice(ENCRYPTION_PREFIX.length), 'base64');
  const iv = payload.subarray(0, IV_LENGTH);
  const authTag = payload.subarray(IV_LENGTH, IV_LENGTH + AUTH_TAG_LENGTH);
  const encrypted = payload.subarray(IV_LENGTH + AUTH_TAG_LENGTH);

  const decipher = crypto.createDecipheriv('aes-256-gcm', getKey(), iv);
  decipher.setAuthTag(authTag);

  const decrypted = Buffer.concat([decipher.update(encrypted), decipher.final()]);
  return decrypted.toString('utf8');
}

export function encryptAddressPayload<T>(payload: T): T {
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
    return payload;
  }

  const output: Record<string, any> = { ...(payload as Record<string, any>) };
  for (const key of ADDRESS_KEYS) {
    if (output[key] !== undefined && output[key] !== null) {
      output[key] = encryptText(output[key]);
    }
  }

  return output as T;
}

export function decryptAddressPayload<T>(payload: T): T {
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
    return payload;
  }

  const output: Record<string, any> = { ...(payload as Record<string, any>) };
  for (const key of ADDRESS_KEYS) {
    if (output[key] !== undefined && output[key] !== null) {
      output[key] = decryptText(output[key]);
    }
  }

  return output as T;
}

function hasPlainAddressField(payload: unknown): boolean {
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
    return false;
  }

  const row = payload as Record<string, unknown>;
  for (const key of ADDRESS_KEYS) {
    const value = row[key];
    if (value !== undefined && value !== null && !isEncrypted(String(value))) {
      return true;
    }
  }

  return false;
}

function toMoneyString(amount: number): string {
  return (Math.round(amount * 100) / 100).toFixed(2);
}

export function encryptMoney(amount: number): string {
  return encryptText(toMoneyString(amount));
}

export function decryptMoney(value: unknown): number {
  const decrypted = decryptText(value);
  const parsed = Number(decrypted);
  return Number.isFinite(parsed) ? parsed : 0;
}

export function addMoney(balance: unknown, amount: unknown): number {
  return decryptMoney(balance) + Number(amount || 0);
}

export function subtractMoney(balance: unknown, amount: unknown): number {
  return decryptMoney(balance) - Number(amount || 0);
}

export async function prepareSensitiveDataEncryption(pool: Pool): Promise<void> {
  if (sensitiveDataPrepared) {
    return;
  }

  const client = await pool.connect();
  await client.query('BEGIN');
  try {
    if (await tableExists(client, 'addresses')) {
      await client.query(`
        ALTER TABLE addresses
        ALTER COLUMN name TYPE TEXT,
        ALTER COLUMN phone TYPE TEXT,
        ALTER COLUMN city TYPE TEXT,
        ALTER COLUMN state TYPE TEXT,
        ALTER COLUMN pincode TYPE TEXT,
        ALTER COLUMN country TYPE TEXT
      `);

      const addressRows = await client.query(
        `SELECT id, name, phone, address_line1, address_line2, city, state, pincode, country, landmark
         FROM addresses`
      );

      for (const row of addressRows.rows) {
        if (!hasPlainAddressField(row)) {
          continue;
        }

        const encrypted = encryptAddressPayload(row);
        await client.query(
          `UPDATE addresses
           SET name = $1, phone = $2, address_line1 = $3, address_line2 = $4,
               city = $5, state = $6, pincode = $7, country = $8, landmark = $9, updated_at = NOW()
           WHERE id = $10`,
          [
            encrypted.name,
            encrypted.phone,
            encrypted.address_line1,
            encrypted.address_line2,
            encrypted.city,
            encrypted.state,
            encrypted.pincode,
            encrypted.country,
            encrypted.landmark,
            row.id,
          ]
        );
      }
    }

    if (await tableExists(client, 'wallets')) {
      await client.query(`
        ALTER TABLE wallets
        ALTER COLUMN balance TYPE TEXT USING balance::text
      `);

      const walletRows = await client.query('SELECT id, balance FROM wallets');
      for (const row of walletRows.rows) {
        if (!isEncrypted(row.balance)) {
          await client.query(
            'UPDATE wallets SET balance = $1, updated_at = NOW() WHERE id = $2',
            [encryptMoney(Number(row.balance || 0)), row.id]
          );
        }
      }
    }

    if (await tableExists(client, 'orders')) {
      const orderRows = await client.query('SELECT id, shipping_address FROM orders');
      for (const row of orderRows.rows) {
        if (!hasPlainAddressField(row.shipping_address || {})) {
          continue;
        }

        const encryptedShippingAddress = encryptAddressPayload(row.shipping_address || {});
        await client.query(
          'UPDATE orders SET shipping_address = $1, updated_at = NOW() WHERE id = $2',
          [JSON.stringify(encryptedShippingAddress), row.id]
        );
      }
    }

    await client.query('COMMIT');
    sensitiveDataPrepared = true;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}
