/**
 * Split of an order between what is settled ONLINE and what the delivery partner
 * collects AT THE DOOR (Phase 9). Mirrors the customer website's
 * razorpayController.amountToCharge so both surfaces charge identically.
 *
 * Stored vocabulary is unchanged: delivery_type 'flash' is the option shown to
 * customers as "Instant Delivery".
 */

export interface ChargeableOrder {
  final_amount: number | string;
  delivery_fee?: number | string | null;
  delivery_type?: string | null;
  payment_method?: string | null;
  prepaid_amount?: number | string | null;
  payment_status?: string | null;
  is_trial?: boolean | null;
}

const money = (v: unknown) => Math.max(0, Number(v) || 0);

/** How long the customer gets to keep/return items after the partner's /pickup. */
export const TRIAL_WINDOW_MINUTES = 15;

/**
 * What must be paid online now, in rupees.
 *  - Instant Delivery try-first ('trial', Phase 9A) → only the delivery fee is
 *    prepaid, whatever payment method was picked: the goods aren't chosen yet.
 *  - Instant Delivery ('flash') + COD → only the delivery fee is prepaid; the
 *    goods are paid in cash at the door.
 *  - everything else → the whole final_amount.
 */
export function amountToCharge(order: ChargeableOrder): number {
  const total = money(order.final_amount);
  const fee = money(order.delivery_fee);
  const isInstant = String(order.delivery_type || 'standard').toLowerCase() === 'flash';
  const isCod = String(order.payment_method || 'cod').toLowerCase() === 'cod';
  const feeOnly = (isInstant && isCod) || (isInstant && !!order.is_trial);
  return feeOnly ? Math.min(fee, total) : total;
}

/**
 * What the delivery partner collects at the door, in rupees. A fully paid order
 * collects nothing; an unpaid ONLINE order collects nothing either (it is flagged
 * in the delivery app rather than silently turned into a cash collection).
 */
export function amountToCollect(order: ChargeableOrder): number {
  if (order.payment_status === 'paid') return 0;
  if (String(order.payment_method || 'cod').toLowerCase() !== 'cod') return 0;
  return Math.max(0, Number((money(order.final_amount) - money(order.prepaid_amount)).toFixed(2)));
}
