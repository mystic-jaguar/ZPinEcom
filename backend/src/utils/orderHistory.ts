import { pool } from '../db';

/** Anything with a .query — the pool itself or a checked-out transaction client. */
type Queryable = { query: (sql: string, params?: any[]) => Promise<any> };

/**
 * Append a row to the SHARED `order_status_history` table — the order timeline
 * the customer website, the seller app and the delivery app all read.
 *
 * The ecom app used to keep its status changes to itself (it only wrote
 * `orders.status` and its private `return_requests.status_history` jsonb), which
 * is why 74 of 105 production orders had no history at all and the website's
 * tracking page showed an empty timeline for every app order.
 *
 * `id` and `created_at` both have DB defaults, so only the three real values are
 * passed. Deliberately not wrapped in try/catch: when called inside a checkout
 * transaction, a swallowed error would leave the transaction aborted anyway.
 */
export async function recordOrderStatus(
  db: Queryable | null,
  orderId: string,
  status: string,
  note?: string | null
): Promise<void> {
  await (db ?? pool).query(
    `INSERT INTO order_status_history (order_id, status, note) VALUES ($1, $2, $3)`,
    [orderId, status, note ?? null]
  );
}
