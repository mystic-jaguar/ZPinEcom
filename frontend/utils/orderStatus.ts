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
    // Phase 9: a failed attempt does not move the order backwards — it is still
    // out with the courier, who either retries or returns it.
    delivery_failed: 3,
    delivered: 4, completed: 4,
};

/** delivery_status (written by the delivery app) → the same five stages. */
const DELIVERY_STEP_INDEX: Record<string, number> = {
    assigned: 1, accepted: 1,
    picked_up: 2, in_transit: 2,
    out_for_delivery: 3, failed: 3,
    delivered: 4,
};

/** A delivery was attempted and could not be completed (Phase 9). */
export function isFailedAttempt(status?: string, deliveryStatus?: string | null): boolean {
    return deliveryStatus === 'failed' || (status || '').toLowerCase() === 'delivery_failed';
}

/** Customer-facing wording per failure reason. */
export const FAILURE_TEXT: Record<string, string> = {
    unreachable: 'The courier could not reach you.',
    refused: 'The order was refused at the door.',
    other: 'The delivery could not be completed.',
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

/**
 * Return timeline. Once a return exists the fulfilment stages are over, so the
 * track screen swaps TRACK_STEPS for these. Keys are the event `status` values
 * GET /orders/:id/track puts in trackingHistory (backend buildTrackingHistory).
 */
export const RETURN_STEPS = [
    { key: 'return_requested', title: 'Requested', note: 'We have your return request', short: 'REQUESTED' },
    { key: 'approved', title: 'Approved', note: 'A delivery partner will collect the item', short: 'APPROVED' },
    { key: 'picked_up', title: 'Picked up — pending inspection', note: 'The seller still has to receive and check the item', short: 'PICKED UP' },
    { key: 'refunded', title: 'Refunded', note: 'The refund is on its way to you', short: 'REFUNDED' },
] as const;

/**
 * Badge/chip wording per return_requests.status. Never say "Returned" before the
 * status is actually 'refunded' — a collected item is only in transit back to
 * the seller, and the refund has not been settled yet.
 */
export const RETURN_STATUS_LABEL: Record<string, string> = {
    requested: 'REQUESTED',
    approved: 'APPROVED',
    rejected: 'REJECTED',
    picked_up: 'PICKED UP · PENDING INSPECTION',
    refunded: 'REFUNDED',
};

export function returnStatusLabel(status?: string): string {
    const s = (status || '').toLowerCase();
    return RETURN_STATUS_LABEL[s] || statusLabel(s).toUpperCase();
}

export type ReturnStage = { active: number; rejected: boolean };

/**
 * Current return stage from the tracking history, or null when the order has no
 * return. Only events after 'return_requested' are considered — the fulfilment
 * events before it use a different vocabulary.
 */
export function returnStage(trackingHistory?: any[]): ReturnStage | null {
    const history = Array.isArray(trackingHistory) ? trackingHistory : [];
    const start = history.findIndex((e) => e?.status === 'return_requested');
    if (start < 0) return null;
    const seen = new Set(history.slice(start).map((e) => e?.status));
    if (seen.has('rejected')) return { active: 1, rejected: true };
    let active = 0;
    RETURN_STEPS.forEach((step, i) => { if (seen.has(step.key)) active = i; });
    return { active, rejected: false };
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
