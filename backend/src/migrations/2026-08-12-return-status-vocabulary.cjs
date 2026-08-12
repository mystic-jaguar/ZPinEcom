/**
 * 2026-08-12 — widen return_requests.status to the real return workflow.
 *
 * The prod CHECK constraint only allowed requested/approved/rejected/completed,
 * but every code path (ecom PATCH /orders/:id/return-status, the customer
 * website, the tracking timeline) writes 'picked_up' and 'refunded'. So the
 * status-advance endpoint could never have succeeded on prod — it would have
 * failed with a constraint violation. Nobody noticed because the bootstrap
 * CREATE TABLE in routes/orders.ts omits the constraint, so dev DBs accept
 * anything.
 *
 * New vocabulary (see DATABASE_SCHEMA_AND_ENCRYPTION.md):
 *   requested -> approved | rejected      (admin decision)
 *   approved  -> picked_up                (delivery partner collects)
 *   picked_up -> refunded                 (payout settled by a human)
 *
 * 'completed' is dropped: nothing ever wrote it and prod had 0 return_requests
 * rows when this ran, so there is nothing to migrate.
 *
 * Idempotent — safe to re-run.
 *
 * Run:  docker cp this file into the container, then
 *       docker exec -w /app zpin-ecom node <file>
 */
const { Pool } = require('pg');

const ALLOWED = ['requested', 'approved', 'rejected', 'picked_up', 'refunded'];

async function main() {
  const pool = new Pool({
    host: process.env.DB_HOST,
    port: Number(process.env.DB_PORT) || 5432,
    database: process.env.DB_NAME,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    ssl: process.env.DB_SSL === 'false' ? false : { rejectUnauthorized: false },
  });

  try {
    // Refuse to run if any existing row holds a status the new constraint would
    // reject — better to stop loudly than to have ADD CONSTRAINT fail halfway.
    const stray = await pool.query(
      `SELECT DISTINCT status FROM return_requests WHERE NOT (status = ANY($1))`,
      [ALLOWED]
    );
    if (stray.rows.length > 0) {
      throw new Error(
        `Existing rows use statuses outside the new vocabulary: ${stray.rows
          .map((r) => r.status)
          .join(', ')}. Migrate that data first.`
      );
    }

    await pool.query('BEGIN');
    await pool.query('ALTER TABLE return_requests DROP CONSTRAINT IF EXISTS return_requests_status_check');
    await pool.query(
      `ALTER TABLE return_requests
       ADD CONSTRAINT return_requests_status_check
       CHECK (status IN ('requested', 'approved', 'rejected', 'picked_up', 'refunded'))`
    );
    await pool.query('COMMIT');

    const check = await pool.query(
      `SELECT pg_get_constraintdef(oid) AS def
       FROM pg_constraint WHERE conname = 'return_requests_status_check'`
    );
    console.log('OK', check.rows[0] && check.rows[0].def);
  } catch (err) {
    await pool.query('ROLLBACK').catch(() => {});
    console.error('FAILED', err.message);
    process.exitCode = 1;
  } finally {
    await pool.end();
  }
}

main();
