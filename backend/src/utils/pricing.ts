// ZPIN platform markup.
//
// Every price in the DB (products.price, order_items.price) is the VENDOR's
// price — the amount the seller is owed. Customers are charged a fixed 20%
// platform fee on top. The markup is NEVER stored: it is applied on read, on
// every customer-facing surface, and on the money totals we actually charge
// (orders.total_amount / tax_amount / final_amount).
//
// Seller-facing surfaces (vendor app + vendor website) read order_items.price
// and must keep seeing the raw vendor price — so never mark up on that side.
export const MARKUP_MULTIPLIER = 1.2;

// Charm pricing: every customer-facing price is rounded UP to the next whole
// rupee ending in 9 (e.g. 718.80 → 719, 720 → 729). Always up, never down —
// ZPIN must never collect less than the 20% fee it's owed.
function roundToNext9(n: number): number {
  const ceiled = Math.ceil(n);
  const rem = ceiled % 10;
  return rem === 9 ? ceiled : ceiled + (9 - rem);
}

/** vendor price → customer-facing display/charge price (whole rupees, ending in 9). */
export function withMarkup(vendorPrice: number | string | null | undefined): number {
  const n = Number(vendorPrice);
  if (!Number.isFinite(n) || n <= 0) return 0;
  return roundToNext9(n * MARKUP_MULTIPLIER);
}

/** customer-facing price → vendor price (for filtering raw DB prices by a display range). */
export function withoutMarkup(displayPrice: number): number {
  return displayPrice / MARKUP_MULTIPLIER;
}

/** Marks up the `price` field of each item in a customer-facing item list. */
export function markupItems<T extends { price: any }>(items: T[] | null | undefined): T[] {
  if (!Array.isArray(items)) return [];
  return items.map((i) => ({ ...i, price: withMarkup(i.price) }));
}
