/**
 * ONE order-status vocabulary, shared with the customer website
 * (zpin-customer-main/src/Pages/OrderTracking/OrderTracking.jsx).
 *
 * The website has always shown five tracking stages and understood the finer
 * `in_transit` / `out_for_delivery` values; the app only had three. Both
 * surfaces now read the same table so a customer sees the same stage whichever
 * one they open. Keep STEPS / STEP_INDEX in sync with the website's copy.
 */

export const TRACK_STEPS = [
    { key: 'order_placed', title: 'Order placed', note: 'We have your order', short: 'PLACED' },
    { key: 'processing', title: 'Processing', note: 'Accepted by the vendor', short: 'CONFIRMED' },
    { key: 'in_transit', title: 'In transit', note: 'Picked up by the courier', short: 'IN TRANSIT' },
    { key: 'out_for_delivery', title: 'Out for delivery', note: 'On the way to you', short: 'ON THE WAY' },
    { key: 'delivered', title: 'Delivered', note: 'Have your size ready', short: 'DELIVERED' },
] as const;

/** Every backend order status → one of the five stage indexes above. */
const STEP_INDEX: Record<string, number> = {
    order_placed: 0, pending: 0, placed: 0, trial_pending: 0,
    confirmed: 1, processing: 1, accepted: 1,
    shipped: 2, in_transit: 2, picked_up: 2, dispatched: 2,
    out_for_delivery: 3, out_delivery: 3, awaiting_collection: 3,
    delivered: 4, completed: 4,
};

/** delivery_status (written by the delivery app) → the same five stages. */
const DELIVERY_STEP_INDEX: Record<string, number> = {
    assigned: 1, accepted: 1,
    picked_up: 2, in_transit: 2,
    out_for_delivery: 3,
    delivered: 4,
};

/** Statuses that mean the order stopped progressing normally. */
export const TERMINATED = new Set(['cancelled', 'canceled', 'returned', 'refunded', 'return_requested']);

/**
 * Current stage, 0-4. delivery_status is finer-grained than order.status, so
 * take whichever is further along.
 */
export function stepIndex(status?: string, deliveryStatus?: string | null): number {
    const a = STEP_INDEX[(status || '').toLowerCase()] ?? 0;
    const b = deliveryStatus ? (DELIVERY_STEP_INDEX[deliveryStatus.toLowerCase()] ?? 0) : 0;
    return Math.max(a, b);
}

/** "out_for_delivery" → "Out For Delivery" */
export function statusLabel(status?: string): string {
    return (status || 'pending').replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

/** True while the order is still moving (used by the list filters). */
export function isInProgress(status: string): boolean {
    const s = (status || '').toLowerCase();
    return !TERMINATED.has(s) && s !== 'delivered';
}
