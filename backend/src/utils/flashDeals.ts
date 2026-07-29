import { pool } from '../db';

/**
 * Flash deals (Phase 10).
 *
 * Deals are created / edited / expired in ONE place — the admin panel's
 * FlashDeals screen (`/api/admin/flash-deals`). Every other surface (this app,
 * the customer website) only reads `flash_deals`.
 *
 * Prices in `flash_deals.deal_price` are RAW VENDOR prices, exactly like
 * `products.price` — the 20% ZPIN markup is applied on read (utils/pricing).
 */
let ready = false;

export async function ensureFlashDealsSchema(): Promise<void> {
  if (ready) return;
  await pool.query(`
    CREATE TABLE IF NOT EXISTS flash_deals (
      id              VARCHAR(36) PRIMARY KEY,
      product_id      UUID        NOT NULL REFERENCES products(id) ON DELETE CASCADE,
      deal_price      NUMERIC(10,2) NOT NULL,
      total_stock     INTEGER     NOT NULL DEFAULT 50,
      stock_remaining INTEGER     NOT NULL DEFAULT 50,
      label           VARCHAR(100) NOT NULL DEFAULT 'Flash Deal',
      starts_at       TIMESTAMP   NOT NULL DEFAULT NOW(),
      ends_at         TIMESTAMP   NOT NULL,
      is_active       BOOLEAN     NOT NULL DEFAULT true,
      created_at      TIMESTAMP   NOT NULL DEFAULT NOW()
    )
  `);
  await pool.query(`CREATE INDEX IF NOT EXISTS idx_flash_deals_active ON flash_deals(is_active, ends_at)`);
  await pool.query(`CREATE INDEX IF NOT EXISTS idx_flash_deals_product ON flash_deals(product_id)`);
  ready = true;
}

/** A deal is live only while active, started, unexpired and still in stock. */
export const LIVE_DEAL_PREDICATE = `
  fd.is_active = true AND fd.starts_at <= NOW() AND fd.ends_at > NOW() AND fd.stock_remaining > 0
`;

/**
 * Raw vendor deal price per product id, for the products that have a live deal.
 * Used wherever a price is resolved so the customer is CHARGED the price the
 * deal advertises — a displayed discount we don't honour is a lie.
 * If several deals somehow overlap on one product, the cheapest wins.
 */
export async function liveDealPrices(
  q: { query: (sql: string, params: any[]) => Promise<any> },
  productIds: string[]
): Promise<Map<string, number>> {
  const map = new Map<string, number>();
  const ids = [...new Set(productIds.filter(Boolean).map(String))];
  if (ids.length === 0) return map;
  // Deliberately NOT wrapped in try/catch: callers run inside a transaction,
  // where a swallowed query error would poison every later statement. The table
  // is guaranteed by ensureFlashDealsSchema() at boot.
  const { rows } = await q.query(
      `SELECT fd.product_id, MIN(fd.deal_price) AS deal_price
         FROM flash_deals fd
        WHERE fd.product_id = ANY($1::uuid[]) AND ${LIVE_DEAL_PREDICATE}
        GROUP BY fd.product_id`,
    [ids]
  );
  for (const r of rows) map.set(String(r.product_id), Number(r.deal_price));
  return map;
}

/** Burn deal stock for a purchased line. Never goes negative. */
export async function consumeDealStock(
  q: { query: (sql: string, params: any[]) => Promise<any> },
  productId: string,
  quantity: number
): Promise<void> {
  await q.query(
    `UPDATE flash_deals fd
        SET stock_remaining = GREATEST(fd.stock_remaining - $2, 0)
      WHERE fd.product_id = $1::uuid AND ${LIVE_DEAL_PREDICATE}`,
    [productId, Math.max(1, Number(quantity) || 1)]
  );
}
