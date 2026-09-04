import { pool } from '../db';

/**
 * UGC moderation schema (App Store guideline 1.2).
 *
 * Adds the moderation flag + report/block tables used to filter objectionable
 * product reviews and let users report abuse / block authors. Runs once,
 * idempotently, so it also upgrades databases created before this feature.
 *
 * Column types must match production exactly (product_reviews.id is uuid,
 * users.id is varchar(36)) - the local id column stays VARCHAR(7) because these
 * two tables are keyed by generateId().
 */

// Number of distinct reports that auto-hides a review pending manual moderation.
export const AUTO_HIDE_THRESHOLD = 3;
