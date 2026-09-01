/**
 * Reusable email-OTP flow over the shared `email_otp_verifications` table.
 *
 * TypeScript port of website-customer/backend/utils/emailOtp.js — same table,
 * same semantics, same otp_type strings, so a deletion started in the app
 * behaves identically to one started on the website.
 *
 * IMPORTANT: `email_otp_verifications` is SHARED with the website, delivery and
 * seller backends. Columns are never renamed or dropped, only added, and every
 * query filters on otp_type so one flow's rows can never satisfy another's
 * verification. Picking a new otp_type string is the whole isolation mechanism —
 * it is not a schema change.
 */
import crypto from 'crypto';
import { pool } from '../db';

const generateOTP = (): string => crypto.randomInt(100000, 999999).toString();

export const normalizeEmail = (email: unknown): string => String(email || '').trim().toLowerCase();
export const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Show enough of an address to confirm which inbox to open, no more. */
export const maskEmail = (email: unknown): string => {
  const [user = '', domain = ''] = normalizeEmail(email).split('@');
  return `${user.slice(0, 2)}${'•'.repeat(Math.max(3, user.length - 2))}@${domain}`;
};

let tableReady = false;
const ensureTable = async (): Promise<void> => {
  if (tableReady) return;
  // No-ops against the live table; only matters on a fresh database, so it
  // mirrors the real schema exactly or local dev silently diverges from prod.
  await pool.query(`
    CREATE TABLE IF NOT EXISTS email_otp_verifications (
      id          SERIAL PRIMARY KEY,
      email       TEXT NOT NULL,
      otp         TEXT NOT NULL,
      otp_type    TEXT NOT NULL,
      is_verified BOOLEAN DEFAULT FALSE,
      expires_at  TIMESTAMPTZ NOT NULL,
      created_at  TIMESTAMPTZ DEFAULT NOW()
    )
  `);
  await pool.query(`ALTER TABLE email_otp_verifications ADD COLUMN IF NOT EXISTS attempts INT NOT NULL DEFAULT 0`);
  await pool.query(`CREATE INDEX IF NOT EXISTS idx_email_otp_lookup
       ON email_otp_verifications (email, otp_type, created_at DESC)`);
  tableReady = true;
};

export interface EmailOtpOptions {
  ttlMs?: number;
  maxAttempts?: number;
  maxPerWindow?: number;
  windowMinutes?: number;
  resendCooldownMs?: number;
}

export type VerifyResult = { ok: true } | { ok: false; error: string };

export function createEmailOtp(otpType: string, opts: EmailOtpOptions = {}) {
  const {
    ttlMs = 10 * 60 * 1000,
    maxAttempts = 3,
    maxPerWindow = 3,
    windowMinutes = 10,
    resendCooldownMs = 30 * 1000,
  } = opts;

  return {
    ttlMs,

    /** True when this address has already burned its quota for the window. */
    async isRateLimited(email: string): Promise<boolean> {
      await ensureTable();
      const { rows } = await pool.query(
        `SELECT COUNT(*)::int AS n FROM email_otp_verifications
         WHERE email = $1 AND otp_type = $2
           AND created_at > NOW() - ($3 || ' minutes')::interval`,
        [normalizeEmail(email), otpType, String(windowMinutes)]
      );
      return rows[0].n >= maxPerWindow;
    },

    /** Seconds left on the resend cooldown, or 0 when a send is allowed now. */
    async cooldownRemaining(email: string): Promise<number> {
      await ensureTable();
      const { rows } = await pool.query(
        `SELECT created_at FROM email_otp_verifications
         WHERE email = $1 AND otp_type = $2 ORDER BY created_at DESC LIMIT 1`,
        [normalizeEmail(email), otpType]
      );
      if (!rows.length) return 0;
      const elapsed = Date.now() - new Date(rows[0].created_at).getTime();
      return elapsed >= resendCooldownMs ? 0 : Math.ceil((resendCooldownMs - elapsed) / 1000);
    },

    /**
     * Record a fresh code and hand it back for delivery. The caller sends the
     * mail: a code is only ever persisted for a flow that can actually deliver
     * it, and the code is NEVER returned over HTTP.
     */
    async issue(email: string): Promise<string> {
      await ensureTable();
      const otp = generateOTP();
      await pool.query(
        `INSERT INTO email_otp_verifications (email, otp, otp_type, expires_at)
         VALUES ($1, $2, $3, $4)`,
        [normalizeEmail(email), otp, otpType, new Date(Date.now() + ttlMs)]
      );
      return otp;
    },

    /** Never throws on a wrong code — callers pass `error` straight to the client. */
    async verify(email: string, otp: string): Promise<VerifyResult> {
      await ensureTable();
      const addr = normalizeEmail(email);
      const { rows } = await pool.query(
        `SELECT id, otp, attempts, expires_at FROM email_otp_verifications
         WHERE email = $1 AND otp_type = $2 AND is_verified = FALSE
         ORDER BY created_at DESC LIMIT 1`,
        [addr, otpType]
      );

      if (!rows.length) return { ok: false, error: 'Code not found or already used. Request a new one.' };

      const record = rows[0];
      if (new Date() > new Date(record.expires_at)) {
        return { ok: false, error: 'This code has expired. Request a new one.' };
      }
      if (record.attempts >= maxAttempts) {
        return { ok: false, error: 'Too many incorrect attempts. Request a new code.' };
      }
      if (record.otp !== String(otp).trim()) {
        const { rows: bumped } = await pool.query(
          'UPDATE email_otp_verifications SET attempts = attempts + 1 WHERE id = $1 RETURNING attempts',
          [record.id]
        );
        const left = Math.max(0, maxAttempts - bumped[0].attempts);
        return { ok: false, error: `Incorrect code. ${left} attempt${left !== 1 ? 's' : ''} remaining.` };
      }

      await pool.query('UPDATE email_otp_verifications SET is_verified = TRUE WHERE id = $1', [record.id]);
      return { ok: true };
    },

    /** Invalidate every outstanding code for this address in this flow. */
    async invalidateAll(email: string): Promise<void> {
      await ensureTable();
      await pool.query(
        `UPDATE email_otp_verifications SET is_verified = TRUE
         WHERE email = $1 AND otp_type = $2 AND is_verified = FALSE`,
        [normalizeEmail(email), otpType]
      );
    },
  };
}
