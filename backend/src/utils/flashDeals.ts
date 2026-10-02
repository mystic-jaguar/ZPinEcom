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

/**
 * Master on/off switch for the *display* of flash deals (admin → Flash Deals →
 * "Show flash deals"), stored in `platform_settings`. Display only: a deal that
 * is already live is still priced and sold at its deal price, so nobody loses a
 * price mid-checkout because the section was hidden.
 *
 * Fails OPEN — a missing `platform_settings` table (migration not run on this
 * environment) reads as enabled, so behaviour is unchanged until it is.
 * Cached for a minute; this is read on every storefront home load.
 */
let flagCache: { value: boolean; at: number } | null = null;

export async function flashDealsEnabled(): Promise<boolean> {
  if (flagCache && Date.now() - flagCache.at < 60_000) return flagCache.value;
  let value = true;
  try {
    const { rows } = await pool.query(
      `SELECT value FROM platform_settings WHERE key = 'flash_deals_enabled'`
    );
    if (rows[0]) value = String(rows[0].value).toLowerCase() !== 'false';
  } catch { /* table absent → enabled */ }
  flagCache = { value, at: Date.now() };
  return value;
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
  // is part of the frozen shared schema (see SCHEMA_CHANGES.md).
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

/**
 * Burn deal stock for a deal-priced line. Returns false when the deal no longer
 * holds `quantity` units, and the caller must refuse the checkout: the old
 * GREATEST(..., 0) clamp sold 5 units at the deal price out of 1 remaining.
 */
export async function consumeDealStock(
  q: { query: (sql: string, params: any[]) => Promise<any> },
  productId: string,
  quantity: number
): Promise<boolean> {
  const { rows } = await q.query(
    `UPDATE flash_deals
        SET stock_remaining = stock_remaining - $2
      WHERE id = (
        SELECT fd.id FROM flash_deals fd
         WHERE fd.product_id = $1::uuid AND ${LIVE_DEAL_PREDICATE} AND fd.stock_remaining >= $2
         ORDER BY fd.deal_price ASC
         LIMIT 1
      )
      RETURNING id`,
    [productId, Math.max(1, Number(quantity) || 1)]
  );
  return rows.length > 0;
}

/**
 * Give deal stock back when a deal-priced line is cancelled or its checkout is
 * discarded unpaid. Only to the still-running deal that SOLD it (same product,
 * same price as the line was charged) — a full-price line, or a deal that has
 * since ended, gets nothing. Deliberately ignores `stock_remaining > 0`: the
 * old LIVE_DEAL_PREDICATE here meant a SOLD-OUT deal could never get a
 * cancelled unit back, i.e. exactly the deal that needs it most. Capped at
 * total_stock. Byte-identical SQL: website-customer utils/flashDeals.js.
 */
export async function releaseDealStock(
  q: { query: (sql: string, params: any[]) => Promise<any> },
  productId: string | null,
  quantity: number,
  paidPrice: number | string
): Promise<void> {
  if (!productId) return;
  await q.query(
    `UPDATE flash_deals
        SET stock_remaining = LEAST(stock_remaining + $2, total_stock)
      WHERE id = (
        SELECT fd.id FROM flash_deals fd
         WHERE fd.product_id = $1::uuid AND fd.deal_price = $3::numeric
           AND fd.is_active = true AND fd.starts_at <= NOW() AND fd.ends_at > NOW()
         ORDER BY fd.ends_at DESC
         LIMIT 1
      )`,
    [productId, Math.max(1, Number(quantity) || 1), paidPrice]
  );
}

/**
 * The live deal on ONE product, for the product detail page.
 *
 * Without this the app showed a flash-deal product at its full `products.price`
 * the moment the customer tapped the deal card, then charged the deal price at
 * checkout (orders.ts already resolves it via liveDealPrices) — the discount
 * advertised on the Flash Deals screen simply vanished on the way to the buy
 * button. Returns raw vendor prices; the caller applies the markup.
 */
export async function liveDealForProduct(
  productId: string
): Promise<{ dealPrice: number; endsAt: string; label: string; stockRemaining: number } | null> {
  try {
    const { rows } = await pool.query(
      `SELECT fd.deal_price, fd.ends_at, fd.label, fd.stock_remaining
         FROM flash_deals fd
        WHERE fd.product_id = $1::uuid AND ${LIVE_DEAL_PREDICATE}
        ORDER BY fd.deal_price ASC
        LIMIT 1`,
      [productId]
    );
    const r = rows[0];
    if (!r) return null;
    return {
      dealPrice: Number(r.deal_price),
      endsAt: r.ends_at,
      label: r.label || 'Flash Deal',
      stockRemaining: r.stock_remaining,
    };
  } catch {
    // A deal we can't read is a deal we don't show. Never fail the product page
    // over it — the price shown then is the regular one, which is also what a
    // product with no deal is charged.
    return null;
  }
}
