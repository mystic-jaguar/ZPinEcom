import { pool } from '../db';
import { decryptAddressPayload } from './encryption';
import { logger } from './logger';
import { sendOrderConfirmationEmail } from './mailer';
import { withMarkup } from './pricing';
import { safeIdentifier } from './sql';

const ORDERS = safeIdentifier('orders');
const ORDER_ITEMS = safeIdentifier('order_items');

/**
 * Fire-and-forget order confirmation mail for a whole checkout (every sub-order
 * of the group), read back from the DB so both call sites — COD checkout and
 * Razorpay verify — stay one line and can never disagree about the figures.
 * Never throws: an email failure must not fail an order that is already placed.
 */
export function sendOrderEmail(userId: string, orderNumber: string, orderIds: string[]): void {
  if (orderIds.length === 0) return;
  (async () => {
    const { rows } = await pool.query(
      `SELECT o.id, o.total_amount, o.shipping_amount, o.tax_amount, o.delivery_fee,
              o.final_amount, o.shipping_address, o.payment_method, o.delivery_type,
              u.email,
              COALESCE((SELECT json_agg(json_build_object(
                 'name', oi.product_name, 'quantity', oi.quantity,
                 'price', oi.price, 'image', oi.image))
                 FROM ${ORDER_ITEMS} oi WHERE oi.order_id = o.id), '[]') AS items
         FROM ${ORDERS} o
         JOIN users u ON u.id = o.user_id
        WHERE o.id = ANY($1::uuid[]) AND o.user_id = $2`,
      [orderIds, userId]
    );
    if (rows.length === 0 || !rows[0].email) return;

    const num = (v: any) => Number(v || 0);
    const sum = (f: (r: any) => number) => rows.reduce((s: number, r: any) => s + f(r), 0);
    const subtotal = sum((r) => num(r.total_amount));
    const deliveryFee = sum((r) => num(r.shipping_amount) + num(r.delivery_fee));
    const total = sum((r) => num(r.final_amount));
    // No discount column exists — a coupon is the only gap between the parts and
    // the charged total, so it falls out of the arithmetic.
    const discount = Math.max(0, subtotal + deliveryFee + sum((r) => num(r.tax_amount)) - total);

    const addr: any = decryptAddressPayload(rows[0].shipping_address);
    await sendOrderConfirmationEmail(rows[0].email, {
      orderNumber,
      deliveryType: rows[0].delivery_type,
      paymentMethod: rows[0].payment_method,
      subtotal,
      deliveryFee,
      discount,
      total,
      // order_items.price is the raw VENDOR price; the customer was charged it
      // plus the ZPIN markup — same rule as normalizeOrder().
      items: rows.flatMap((r: any) => (r.items || []).map((i: any) => ({
        name: i.name, quantity: i.quantity, price: withMarkup(Number(i.price)), image: i.image,
      }))),
      shippingAddress: addr ? {
        name: addr.name, line1: addr.address_line1, line2: addr.address_line2,
        city: addr.city, state: addr.state, pincode: addr.pincode,
      } : null,
    });
  })().catch((err: any) =>
    logger.error('order_email_failed', { orderNumber, error: err?.message ?? String(err) }));
}
