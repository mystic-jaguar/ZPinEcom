// Return lines — WHICH order items are coming back, and HOW MANY units of each.
//
// The schema is frozen, so there is no `return_requests.return_items` column and
// no `order_items.returned_quantity`. Everything below is encoded inside the one
// column that already exists: `return_requests.order_item_ids` (jsonb array).
//
// THE WIRE FORMAT — an element of that array is either:
//   "abc123"                          -> the WHOLE line (every unit). Legacy rows
//                                        and whole-line returns look like this.
//   { "id": "abc123", "quantity": 2 } -> exactly 2 units of that line.
// An EMPTY array (or a non-array) still means "the whole order", the convention
// every surface already used before partial quantities existed.
//
// This format is read by four backends (ecom, delivery, vendor app, vendor
// website) and the admin website. All of them must tolerate BOTH element shapes
// — old rows are plain strings and will never be rewritten.

export type ReturnLine = {
  id: string;
  /** null = "the whole line", resolved against the order item's own quantity. */
  quantity: number | null;
};

export type OrderItemLike = {
  id: string;
  quantity: number | string;
  price?: number | string;
  [k: string]: any;
};

export type ResolvedReturnLine = {
  id: string;
  /** Concrete unit count, always >= 1 and <= the order item's quantity. */
  quantity: number;
  item: OrderItemLike;
};

/**
 * jsonb `order_item_ids` -> return lines. Never throws: an unparseable element
 * is dropped rather than failing the whole return, because this runs on read
 * paths (seller list, delivery pool, admin queue) where one bad row must not
 * blank the screen.
 */
export function parseReturnLines(raw: unknown): ReturnLine[] {
  if (!Array.isArray(raw)) return [];
  const out: ReturnLine[] = [];
  for (const el of raw) {
    if (typeof el === 'string' || typeof el === 'number') {
      const id = String(el).trim();
      if (id) out.push({ id, quantity: null });
      continue;
    }
    if (el && typeof el === 'object') {
      const id = String((el as any).id ?? (el as any).orderItemId ?? '').trim();
      if (!id) continue;
      const q = Number((el as any).quantity);
      out.push({ id, quantity: Number.isFinite(q) && q > 0 ? Math.floor(q) : null });
    }
  }
  return out;
}

/**
 * Return lines + the order's items -> concrete lines with real quantities.
 *
 * An empty/absent selection means the WHOLE order, so every item comes back in
 * full. Ids that aren't on the order are dropped, and a quantity is clamped to
 * what the line actually holds — a client must never be able to inflate a
 * refund by asking for 99 units of a line that has 2.
 */
export function resolveReturnLines(raw: unknown, orderItems: OrderItemLike[]): ResolvedReturnLine[] {
  const byId = new Map(orderItems.map((i) => [String(i.id), i]));
  const lines = parseReturnLines(raw);

  if (lines.length === 0) {
    return orderItems.map((item) => ({
      id: String(item.id),
      quantity: Math.max(1, Number(item.quantity) || 1),
      item,
    }));
  }

  const out: ResolvedReturnLine[] = [];
  for (const line of lines) {
    const item = byId.get(line.id);
    if (!item) continue;
    const available = Math.max(1, Number(item.quantity) || 1);
    const wanted = line.quantity === null ? available : line.quantity;
    out.push({ id: line.id, quantity: Math.min(available, Math.max(1, wanted)), item });
  }
  return out;
}

/** Sum of returned units per order item id, across many return rows. */
export function tallyReturnedQuantities(
  rows: Array<{ order_item_ids: unknown }>,
  orderItems: OrderItemLike[]
): Map<string, number> {
  const tally = new Map<string, number>();
  for (const row of rows) {
    for (const line of resolveReturnLines(row.order_item_ids, orderItems)) {
      tally.set(line.id, (tally.get(line.id) || 0) + line.quantity);
    }
  }
  return tally;
}

/**
 * What the customer is owed for a set of resolved lines.
 *
 * `priceOf` converts the stored VENDOR price into the customer-facing price
 * (withMarkup on the ecom side; identity on seller-facing surfaces). GST is
 * recomputed at the same 18% createOrder used. The delivery fee is never
 * refunded — same policy as the Instant Delivery trial keep/return flow.
 */
export function refundForLines(
  lines: ResolvedReturnLine[],
  priceOf: (vendorPrice: any) => number,
  taxRate = 0.18
): { subtotal: number; tax: number; total: number } {
  const subtotal = lines.reduce((sum, l) => sum + priceOf(l.item.price) * l.quantity, 0);
  const tax = Math.round(subtotal * taxRate);
  return { subtotal, tax, total: subtotal + tax };
}
