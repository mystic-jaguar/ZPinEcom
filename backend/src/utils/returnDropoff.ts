import crypto from 'crypto';

/**
 * The return's SECOND leg: the delivery partner hands the collected goods back
 * to the seller, and the seller confirms it with an OTP — the same
 * proof-of-handover model orders already use (orders.pickup_otp at the seller,
 * orders.delivery_otp at the customer).
 *
 * WHY THIS IS NOT A NEW `return_requests.status` VALUE:
 * that column carries a CHECK constraint owned by the website's migrations and
 * the schema is frozen (CLAUDE.md §1) — a sixth status would be a prod DDL this
 * repo cannot apply, and a mismatch there takes every return transition down
 * (it already did once, see the note above RETURN_STATUSES). `status_history`
 * is unconstrained jsonb, so the drop-off is recorded as an entry there and the
 * status column stays `picked_up` until support settles the return. The OTP
 * rides on the 'picked_up' entry for exactly the same reason: no new column.
 *
 * THE OTP IS A SELLER SECRET. It is minted at pickup, read only by the vendor
 * app (which reads status_history straight from the shared database) and
 * verified only here. It must never reach the customer or the delivery partner
 * — every history payload served to either goes through sanitizeReturnHistory.
 *
 * Runnable check: npx jest src/tests/returnDropoff.test.ts
 */

export interface ReturnHistoryEntry {
  status?: string;
  at?: string;
  by?: string;
  role?: string;
  note?: string;
  itemCondition?: string;
  dropoffOtp?: string;
  [k: string]: unknown;
}

/** 6 digits, crypto-random — same shape as the order OTPs partners already type. */
export const generateDropoffOtp = (): string => String(crypto.randomInt(100000, 1000000));

const entries = (history: unknown): ReturnHistoryEntry[] =>
  Array.isArray(history) ? (history as ReturnHistoryEntry[]).filter((e) => e && typeof e === 'object') : [];

/**
 * The OTP of the LATEST collection. A return that was collected twice (rare:
 * rejected back to approved by support, then re-collected) must be confirmed
 * with the newest code, not a stale one.
 */
export const dropoffOtpFrom = (history: unknown): string | null => {
  const found = entries(history).filter((e) => e.status === 'picked_up' && e.dropoffOtp);
  return found.length ? String(found[found.length - 1].dropoffOtp) : null;
};

/** Already handed to the seller — the partner's task is done, don't re-confirm. */
export const hasDroppedOff = (history: unknown): boolean =>
  entries(history).some((e) => e.status === 'dropped_off');

/** Strip the seller's secret before any history goes over the wire. */
export const sanitizeReturnHistory = (history: unknown): ReturnHistoryEntry[] =>
  entries(history).map(({ dropoffOtp, ...rest }) => rest);

/** Constant-time compare so a wrong code leaks nothing about the right one. */
export const otpMatches = (expected: string | null, given: unknown): boolean => {
  const a = String(expected || '');
  const b = String(given || '').trim();
  if (!a || a.length !== b.length) return false;
  return crypto.timingSafeEqual(Buffer.from(a), Buffer.from(b));
};
