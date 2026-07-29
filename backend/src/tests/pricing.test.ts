import { markupItems, withMarkup, withoutMarkup } from '../utils/pricing';

describe('ZPIN platform markup', () => {
  it('adds 20% then rounds UP to the next price ending in 9', () => {
    // 599 -> 718.80 -> 719 (the worked example: always the next 9 above, never below)
    expect(withMarkup(599)).toBe(719);
    // 100 -> 120 -> next ending-9 above 120 is 129 (not 119, which is below)
    expect(withMarkup(100)).toBe(129);
    // 499 -> 598.8 -> 599 (already just below a 9)
    expect(withMarkup('499')).toBe(599);
  });

  it('never rounds down — the charge is always >= the 20% markup', () => {
    expect(withMarkup(33.33)).toBe(49); // 39.996 -> 49
    expect(withMarkup(10.005)).toBe(19); // 12.006 -> 19
  });

  it('is safe on null/garbage prices', () => {
    expect(withMarkup(null)).toBe(0);
    expect(withMarkup(undefined)).toBe(0);
    expect(withMarkup('abc')).toBe(0);
  });

  it('withoutMarkup approximates the vendor price back from a display price', () => {
    // Charm pricing means this is no longer an exact round-trip — the ceil-to-9
    // step can add up to 10 rupees before the /1.2 — just check it's in range.
    expect(Math.abs(withoutMarkup(withMarkup(1250)) - 1250)).toBeLessThan(10);
  });

  it('marks up line items without mutating the source rows', () => {
    const rows = [{ price: 100, quantity: 2 }, { price: 50, quantity: 1 }];
    expect(markupItems(rows).map((i) => i.price)).toEqual([129, 69]);
    expect(rows[0].price).toBe(100); // order_items stays the raw vendor price
    expect(markupItems(null)).toEqual([]);
  });

  it('tax is charged on the marked-up (charm-priced) subtotal', () => {
    // Mirrors routes/orders.ts: subtotal is built from marked-up prices, then
    // taxed — so an 18% GST on a ₹100 vendor item is 18% of ₹129, not ₹120.
    const subtotal = withMarkup(100) * 2;
    expect(subtotal).toBe(258);
    expect(Math.round(subtotal * 0.18)).toBe(46);
  });
});
