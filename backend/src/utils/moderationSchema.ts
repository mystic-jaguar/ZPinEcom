import { pool } from '../db';

/**
 * UGC moderation schema (App Store guideline 1.2).
 *
 * Adds the moderation flag + report/block tables used to filter objectionable
 * product reviews and let users report abuse / block authors. Runs once,
 * idempotently, so it also upgrades databases created before this feature.
 */
let ready = false;

export async function ensureModerationSchema(): Promise<void> {
  if (ready) return;

  // Hidden reviews are excluded from public listings.
  await pool.query(
    `ALTER TABLE product_reviews ADD COLUMN IF NOT EXISTS is_hidden BOOLEAN NOT NULL DEFAULT false`
  );

  // One report per (review, reporter); reports accumulate toward auto-hide.
  await pool.query(`
    CREATE TABLE IF NOT EXISTS review_reports (
      id               VARCHAR(7) PRIMARY KEY,
      review_id        VARCHAR(7) NOT NULL REFERENCES product_reviews(id) ON DELETE CASCADE,
      reporter_user_id VARCHAR(7) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      reason           TEXT,
      created_at       TIMESTAMP  NOT NULL DEFAULT NOW(),
      UNIQUE(review_id, reporter_user_id)
    )
  `);
  await pool.query(`CREATE INDEX IF NOT EXISTS idx_review_reports_review_id ON review_reports(review_id)`);

  // A user blocking another — the blocker no longer sees the blocked user's reviews.
  await pool.query(`
    CREATE TABLE IF NOT EXISTS user_blocks (
      id              VARCHAR(7) PRIMARY KEY,
      blocker_user_id VARCHAR(7) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      blocked_user_id VARCHAR(7) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      created_at      TIMESTAMP  NOT NULL DEFAULT NOW(),
      UNIQUE(blocker_user_id, blocked_user_id)
    )
  `);
  await pool.query(`CREATE INDEX IF NOT EXISTS idx_user_blocks_blocker ON user_blocks(blocker_user_id)`);

  ready = true;
}

// Number of distinct reports that auto-hides a review pending manual moderation.
export const AUTO_HIDE_THRESHOLD = 3;
