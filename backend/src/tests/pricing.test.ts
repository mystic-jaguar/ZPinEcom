import { markupItems, withMarkup, withoutMarkup } from '../utils/pricing';

describe('ZPIN platform markup', () => {
  it('adds 20% to the vendor price', () => {
    expect(withMarkup(100)).toBe(120);
    expect(withMarkup('499')).toBe(598.8);
  });

  it('rounds to 2 decimals (no fractional paise on the charge)', () => {
    expect(withMarkup(33.33)).toBe(40);
    expect(withMarkup(10.005)).toBe(12.01);
  });

  it('is safe on null/garbage prices', () => {
    expect(withMarkup(null)).toBe(0);
    expect(withMarkup(undefined)).toBe(0);
    expect(withMarkup('abc')).toBe(0);
  });

  it('withoutMarkup round-trips a display price back to the vendor price', () => {
    expect(withoutMarkup(withMarkup(1250))).toBeCloseTo(1250, 6);
  });

  it('marks up line items without mutating the source rows', () => {
    const rows = [{ price: 100, quantity: 2 }, { price: 50, quantity: 1 }];
    expect(markupItems(rows).map((i) => i.price)).toEqual([120, 60]);
    expect(rows[0].price).toBe(100); // order_items stays the raw vendor price
    expect(markupItems(null)).toEqual([]);
  });

  it('tax is charged on the marked-up subtotal', () => {
    // Mirrors routes/orders.ts: subtotal is built from marked-up prices, then
    // taxed — so an 18% GST on a ₹100 vendor item is 18% of ₹120.
    const subtotal = withMarkup(100) * 2;
    expect(subtotal).toBe(240);
    expect(Math.round(subtotal * 0.18)).toBe(43);
  });
});
