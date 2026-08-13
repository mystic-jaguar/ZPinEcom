import {
  parseReturnLines,
  refundForLines,
  resolveReturnLines,
  tallyReturnedQuantities,
} from '../utils/returnLines';

// Vendor price -> customer price, the real one (20% markup, charm-rounded to
// the next 9) would drag pricing.ts in; these tests only care that the
// quantity multiplication is right, so identity keeps the arithmetic readable.
const identity = (p: any) => Number(p);

const items = [
  { id: 'a', quantity: 5, price: 100, product_id: 'p1' },
  { id: 'b', quantity: 2, price: 250, product_id: 'p2' },
  { id: 'c', quantity: 1, price: 40, product_id: 'p3' },
];

describe('parseReturnLines', () => {
  it('reads legacy bare-id rows as "the whole line"', () => {
    expect(parseReturnLines(['a', 'b'])).toEqual([
      { id: 'a', quantity: null },
      { id: 'b', quantity: null },
    ]);
  });

  it('reads {id, quantity} rows', () => {
    expect(parseReturnLines([{ id: 'a', quantity: 2 }])).toEqual([{ id: 'a', quantity: 2 }]);
  });

  it('mixes both shapes in one array', () => {
    expect(parseReturnLines(['a', { id: 'b', quantity: 1 }])).toEqual([
      { id: 'a', quantity: null },
      { id: 'b', quantity: 1 },
    ]);
  });

  it('drops junk instead of throwing — read paths must not blank the screen', () => {
    expect(parseReturnLines([null, {}, '', { quantity: 3 }, 'a'])).toEqual([
      { id: 'a', quantity: null },
    ]);
    expect(parseReturnLines(null)).toEqual([]);
    expect(parseReturnLines('nonsense')).toEqual([]);
  });
});

describe('resolveReturnLines', () => {
  it('treats an empty selection as the whole order', () => {
    const out = resolveReturnLines([], items);
    expect(out.map((l) => [l.id, l.quantity])).toEqual([
      ['a', 5],
      ['b', 2],
      ['c', 1],
    ]);
  });

  it('expands a bare id to the full line quantity', () => {
    expect(resolveReturnLines(['a'], items).map((l) => l.quantity)).toEqual([5]);
  });

  it('honours a partial quantity — 2 of 5', () => {
    expect(resolveReturnLines([{ id: 'a', quantity: 2 }], items).map((l) => l.quantity)).toEqual([2]);
  });

  it('clamps an inflated quantity to what the line actually holds', () => {
    expect(resolveReturnLines([{ id: 'a', quantity: 99 }], items).map((l) => l.quantity)).toEqual([5]);
  });

  it('drops ids that are not on the order', () => {
    expect(resolveReturnLines(['zzz', 'c'], items).map((l) => l.id)).toEqual(['c']);
  });
});

describe('tallyReturnedQuantities', () => {
  it('adds up units across several return rows', () => {
    const tally = tallyReturnedQuantities(
      [
        { order_item_ids: [{ id: 'a', quantity: 2 }] },
        { order_item_ids: [{ id: 'a', quantity: 1 }, 'c'] },
      ],
      items
    );
    expect(tally.get('a')).toBe(3);
    expect(tally.get('c')).toBe(1);
    expect(tally.get('b')).toBeUndefined();
  });

  it('counts a whole-order row as every unit', () => {
    const tally = tallyReturnedQuantities([{ order_item_ids: [] }], items);
    expect(tally.get('a')).toBe(5);
    expect(tally.get('b')).toBe(2);
  });
});

describe('refundForLines', () => {
  it('charges tax on the returned units only', () => {
    // 2 x 100 = 200 subtotal, 18% GST = 36.
    const r = refundForLines(resolveReturnLines([{ id: 'a', quantity: 2 }], items), identity);
    expect(r).toEqual({ subtotal: 200, tax: 36, total: 236 });
  });

  it('a whole-order return is the sum of every line, not the order total', () => {
    // 5x100 + 2x250 + 1x40 = 1040, GST 187.
    const r = refundForLines(resolveReturnLines([], items), identity);
    expect(r.subtotal).toBe(1040);
    expect(r.total).toBe(1040 + Math.round(1040 * 0.18));
  });

  it('returning 2 of 5 refunds less than returning the line', () => {
    const partial = refundForLines(resolveReturnLines([{ id: 'a', quantity: 2 }], items), identity);
    const whole = refundForLines(resolveReturnLines(['a'], items), identity);
    expect(partial.total).toBeLessThan(whole.total);
  });
});
