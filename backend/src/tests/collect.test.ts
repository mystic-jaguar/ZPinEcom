import { amountToCharge, amountToCollect } from '../utils/collect';

// 'flash' is the stored delivery_type behind the customer-facing "Instant Delivery".
const instantCod = { final_amount: 1200, delivery_fee: 50, delivery_type: 'flash', payment_method: 'cod' };
const standardCod = { final_amount: 1200, delivery_fee: 0, delivery_type: 'standard', payment_method: 'cod' };
const online = { final_amount: 1200, delivery_fee: 50, delivery_type: 'flash', payment_method: 'razorpay' };

describe('online charge split', () => {
  it('charges only the delivery fee for Instant Delivery on COD', () => {
    expect(amountToCharge(instantCod)).toBe(50);
  });

  // Only Instant Delivery is the partial case. A standard COD order never opens a
  // razorpay flow at all, but if one is opened for it (customer switches to Pay
  // Online) the whole total is due — nothing is left for the door.
  it('charges the whole total for a standard COD order', () => {
    expect(amountToCharge(standardCod)).toBe(1200);
  });

  it('charges the whole total for any prepaid order', () => {
    expect(amountToCharge(online)).toBe(1200);
  });

  it('never charges more than the order total', () => {
    expect(amountToCharge({ ...instantCod, final_amount: 30 })).toBe(30);
  });

  // Phase 9A: a "try first" order prepays only the delivery fee even when the
  // customer picked Pay Online — the goods aren't chosen yet.
  it('charges only the delivery fee for an Instant Delivery trial', () => {
    expect(amountToCharge({ ...online, is_trial: true })).toBe(50);
  });
});

describe('amount collected at the door', () => {
  it('collects the residual on an Instant Delivery order whose fee was prepaid', () => {
    expect(amountToCollect({ ...instantCod, prepaid_amount: 50, payment_status: 'partial' })).toBe(1150);
  });

  it('collects the whole total on a standard COD order', () => {
    expect(amountToCollect({ ...standardCod, payment_status: 'pending' })).toBe(1200);
  });

  it('collects nothing on a fully paid order', () => {
    expect(amountToCollect({ ...online, payment_status: 'paid' })).toBe(0);
  });

  it('collects nothing on an unpaid ONLINE order — it is flagged, not turned into cash', () => {
    expect(amountToCollect({ ...online, payment_status: 'pending' })).toBe(0);
  });
});
