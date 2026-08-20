import { normalizeProduct } from '../routes/products';

// The MRP is a money path: it drives the struck-through price and the "% OFF"
// badge the customer sees, so it must carry the SAME 20% markup as `price`.
describe('normalizeProduct MRP', () => {
  const base = { id: 'p1', price: 599 };

  it('marks up the vendor MRP and derives the discount from the marked-up pair', () => {
    const p = normalizeProduct({ ...base, mrp: 999 }) as any;
    expect(p.price).toBe(719);          // 599 * 1.2 -> 719
    expect(p.originalPrice).toBe(1199); // 999 * 1.2 -> 1199, same markup
    expect(p.discount).toBe(40);        // (1199-719)/1199
  });

  it('hides the struck-through price when there is no usable MRP', () => {
    for (const mrp of [null, undefined, 0, 599, 400]) {
      const p = normalizeProduct({ ...base, mrp }) as any;
      expect(p.originalPrice).toBeUndefined();
      expect(p.discount).toBeUndefined();
    }
  });
});
