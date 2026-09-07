import type { Pool, PoolClient } from 'pg';
import { decryptText } from './encryption';
import { logger } from './logger';

/**
 * The customer half of manual settlements (SETTLEMENTS_PLAN.md).
 *
 * ZPIN refunds no longer go through the payment gateway: a return raises a
 * CLAIM on the shared `settlements` ledger, support pays it by hand from the
 * admin website and records amount/mode/reference/date, and the admin backend
 * then calls back into PATCH /orders/:id/return-status to flip the return to
 * 'refunded'. Everything here is that ledger's ecom-side edge — raising the
 * claim, voiding it when the return dies, and reading the settled detail back
 * for the customer's own screen.
 *
 * WRAPPED IN A SAVEPOINT ON PURPOSE. `settlements` is proposed but not yet
 * applied on prod (SCHEMA_CHANGES.md 2026-09-07), and a failing statement
 * aborts the WHOLE surrounding transaction in Postgres — without the savepoint
 * a missing table would make every return request 500 rather than merely go
 * unclaimed. The claim is still raised INSIDE the caller's transaction: a
 * return with no claim is a refund nobody will ever see or pay, and it only
 * surfaces days later as "where is my money".
 */

const claimAmount = (amount: number) => Number(amount || 0).toFixed(2);

/** Raise the refund claim support settles. Safe to call twice (UNIQUE claim_type+source_id). */
export async function raiseRefundClaim(
  client: PoolClient,
  returnId: string,
  userId: string,
  amount: number
): Promise<void> {
  try {
    await client.query('SAVEPOINT refund_claim');
    await client.query(
      `INSERT INTO settlements (claim_type, source_id, recipient_type, recipient_id, claimed_amount)
       VALUES ('refund', $1::text, 'customer', $2, $3)
       ON CONFLICT (claim_type, source_id) DO NOTHING`,
      [returnId, userId, claimAmount(amount)]
    );
    await client.query('RELEASE SAVEPOINT refund_claim');
  } catch (err) {
    await client.query('ROLLBACK TO SAVEPOINT refund_claim').catch(() => {});
    logger.error('refund_claim_failed', { returnId, error: (err as any)?.message ?? String(err) });
  }
}

/**
 * The return died (rejected, or the customer cancelled it) — nothing is owed.
 * Without this the claim sits in the admin queue forever looking payable.
 */
export async function voidRefundClaim(client: PoolClient, returnId: string, reason: string): Promise<void> {
  try {
    await client.query('SAVEPOINT refund_claim_void');
    await client.query(
      `UPDATE settlements SET status = 'rejected', settlement_note = $2, updated_at = NOW()
       WHERE claim_type = 'refund' AND source_id = $1::text AND status = 'pending'`,
      [returnId, reason.slice(0, 500)]
    );
    await client.query('RELEASE SAVEPOINT refund_claim_void');
  } catch (err) {
    await client.query('ROLLBACK TO SAVEPOINT refund_claim_void').catch(() => {});
    logger.error('refund_claim_void_failed', { returnId, error: (err as any)?.message ?? String(err) });
  }
}

export type RefundSettlement = {
  status: string;
  amount: number | null;
  mode: string | null;
  reference: string | null;
  date: string | null;
  note: string | null;
};

/**
 * How the customer was actually paid, for their return screen. `transaction_ref`
 * and `settlement_note` are written `enc:v1:` by the admin backend with the one
 * canonical DATA_ENCRYPTION_KEY; decryptText passes legacy plaintext through and
 * returns null on a wrong key, so a bad key shows as blank rather than leaking
 * ciphertext into the UI. Returns null when the table is absent (see above).
 */
export async function readRefundSettlement(pool: Pool, returnId: string): Promise<RefundSettlement | null> {
  try {
    const { rows } = await pool.query(
      `SELECT status, settled_amount, settlement_mode, transaction_ref, settlement_date, settlement_note
       FROM settlements WHERE claim_type = 'refund' AND source_id = $1::text`,
      [returnId]
    );
    if (rows.length === 0) return null;
    const row = rows[0];
    return {
      status: row.status,
      amount: row.settled_amount == null ? null : Number(row.settled_amount),
      mode: row.settlement_mode || null,
      reference: row.transaction_ref ? decryptText(row.transaction_ref) : null,
      date: row.settlement_date || null,
      // A rejection reason is written here too, and the customer may read it.
      note: row.settlement_note ? decryptText(row.settlement_note) : null,
    };
  } catch (err) {
    logger.error('refund_settlement_read_failed', { returnId, error: (err as any)?.message ?? String(err) });
    return null;
  }
}
