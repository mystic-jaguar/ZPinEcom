const ordersAll = jest.fn();
const fetchPayments = jest.fn();
jest.mock('razorpay', () => jest.fn().mockImplementation(() => ({
  orders: { all: ordersAll, fetchPayments },
})));

import { findPaidRazorpayPayment } from '../utils/settlePayment';

beforeAll(() => {
  process.env.RAZORPAY_KEY_ID = 'k';
  process.env.RAZORPAY_KEY_SECRET = 's';
});
beforeEach(() => { ordersAll.mockReset(); fetchPayments.mockReset(); });

describe('findPaidRazorpayPayment', () => {
  it('finds the captured payment behind a paid Razorpay order', async () => {
    ordersAll.mockResolvedValue({ items: [{ id: 'or_1', status: 'paid', amount_paid: 49900 }] });
    fetchPayments.mockResolvedValue({ items: [{ id: 'pay_1', status: 'captured' }] });
    await expect(findPaidRazorpayPayment(['ord-a'])).resolves.toEqual({
      paymentId: 'pay_1', amountPaise: 49900,
    });
  });

  it('reports nothing for a genuinely abandoned checkout', async () => {
    ordersAll.mockResolvedValue({ items: [{ id: 'or_1', status: 'created', amount_paid: 0 }] });
    await expect(findPaidRazorpayPayment(['ord-a'])).resolves.toBeNull();
    expect(fetchPayments).not.toHaveBeenCalled();
  });

  it('tries every sub-order of a multi-seller group', async () => {
    ordersAll.mockResolvedValueOnce({ items: [] })
             .mockResolvedValueOnce({ items: [{ id: 'or_2', status: 'paid', amount_paid: 100 }] });
    fetchPayments.mockResolvedValue({ items: [{ id: 'pay_2', status: 'authorized' }] });
    await expect(findPaidRazorpayPayment(['a', 'b'])).resolves.toEqual({
      paymentId: 'pay_2', amountPaise: 100,
    });
  });
});
