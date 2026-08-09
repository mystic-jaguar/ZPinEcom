import type { PoolClient } from 'pg';
import { generateId } from './id';
import { sendPush } from './push';
import { logger } from './logger';

/**
 * "New Order" notifications for the sellers of a checkout.
 *
 * These used to be written at order-creation time, before the customer had paid.
 * A customer who opened the Razorpay sheet and then closed it therefore buzzed
 * the seller's phone with an order that was deleted seconds later — the seller's
 * order list already filters unpaid prepaid orders out, but the notification had
 * already gone. So a prepaid order now notifies its sellers only once payment is
 * verified, and this is where that happens (COD still notifies at creation: a COD
 * order is legitimately unpaid and real).
 *
 * Reads back from the DB rather than taking a payload, because the caller
 * (payment verification) only knows order ids.
 */
export async function notifySellersOfPaidOrders(client: PoolClient, orderIds: string[]): Promise<void> {
  if (orderIds.length === 0) return;

  const { rows } = await client.query(
    `SELECT o.id, o.order_number, o.group_id, o.payment_method, o.shipping_address,
            p.user_id AS seller_id,
            oi.product_id, oi.product_name, oi.quantity, oi.price, oi.variant,
            (SELECT pi.image_url FROM product_images pi
              WHERE pi.product_id = p.id ORDER BY pi.display_order, pi.created_at LIMIT 1) AS image
       FROM orders o
       JOIN order_items oi ON oi.order_id = o.id
       JOIN products p ON p.id = oi.product_id
      WHERE o.id = ANY($1)`,
    [orderIds]
  );

  // One notification per (sub-order, seller). A sub-order is single-seller by
  // construction, but grouping on both keeps this correct for legacy rows where
  // one order carried several sellers' items.
  const groups = new Map<string, any[]>();
  for (const r of rows) {
    const key = `${r.id}|${r.seller_id}`;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(r);
  }

  for (const items of groups.values()) {
    const head = items[0];
    // The seller is told THEIR money: the raw line-item total, never the amount
    // the customer was charged (tax, shipping and the ZPIN markup on top).
    const sellerTotal = Math.round(
      items.reduce((s: number, i: any) => s + Number(i.price) * i.quantity, 0) * 100
    ) / 100;

    await client.query(
      `INSERT INTO notifications (id, user_id, title, message, type, data, is_read, created_at)
       VALUES ($1, $2, $3, $4, 'new_order', $5, false, (NOW() AT TIME ZONE 'Asia/Kolkata'))`,
      [
        generateId(),
        head.seller_id,
        `New Order: ${head.order_number}`,
        `You have a new order for ${items.length} item(s): ${items.map((i: any) => i.product_name).join(', ')}. Total: ₹${sellerTotal.toFixed(2)}`,
        JSON.stringify({
          orderId: head.id,
          orderNumber: head.order_number,
          groupId: head.group_id,
          itemCount: items.length,
          total: sellerTotal,
          items: items.map((i: any) => ({
            productId: i.product_id,
            productName: i.product_name,
            quantity: i.quantity,
            price: Number(i.price),
            image: i.image || null,
            variant: i.variant || null,
          })),
          shippingAddress: head.shipping_address,
          paymentMethod: head.payment_method,
        }),
      ]
    );
  }

  logger.info('order.sellers_notified', { orders: orderIds.length, sellers: groups.size });
}

/**
 * Device pushes for the same sellers. Call AFTER COMMIT (a rolled-back
 * transaction must never buzz a phone). Best-effort; never throws.
 */
export async function pushSellersOfPaidOrders(client: PoolClient, orderIds: string[]): Promise<void> {
  if (orderIds.length === 0) return;
  try {
    const { rows } = await client.query(
      `SELECT o.id, o.order_number, p.user_id AS seller_id, COUNT(oi.id)::int AS item_count
         FROM orders o
         JOIN order_items oi ON oi.order_id = o.id
         JOIN products p ON p.id = oi.product_id
        WHERE o.id = ANY($1)
        GROUP BY o.id, o.order_number, p.user_id`,
      [orderIds]
    );
    for (const r of rows) {
      sendPush(r.seller_id, `New order: ${r.order_number}`,
        `You have a new order for ${r.item_count} item(s).`,
        { orderId: r.id, orderNumber: r.order_number, type: 'new_order' });
    }
  } catch (err) {
    logger.warn('order.seller_push_failed', { error: (err as any)?.message ?? String(err) });
  }
}
