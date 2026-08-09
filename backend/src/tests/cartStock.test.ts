import { availableStock, outOfStockMessage } from '../routes/cart';

// The rule the cart stepper and both cart write paths agree on: a sized product
// is capped by its chosen size's stock, an unsized one by products.quantity.
describe('availableStock', () => {
  it('uses the chosen size stock for a sized product', () => {
    const row = { quantity: 99, size_quantities: { S: 5, M: 0 } };
    expect(availableStock(row, 'S')).toBe(5);
    expect(availableStock(row, 'M')).toBe(0);
  });

  it('treats an unknown size as sold out rather than falling back to the total', () => {
    expect(availableStock({ quantity: 99, size_quantities: { S: 5 } }, 'XXL')).toBe(0);
  });

  it('uses products.quantity when the product has no sizes', () => {
    expect(availableStock({ quantity: 3, size_quantities: {} }, null)).toBe(3);
    expect(availableStock({ quantity: 3 }, null)).toBe(3);
  });

  it('is 0, never NaN or negative, when stock is missing', () => {
    expect(availableStock({}, null)).toBe(0);
  });
});

describe('outOfStockMessage', () => {
  it('names the real number so the shopper knows the cap', () => {
    expect(outOfStockMessage(5)).toBe('Only 5 left in stock.');
  });

  it('says out of stock rather than "only 0 left"', () => {
    expect(outOfStockMessage(0)).toBe('This item is out of stock.');
  });
});
