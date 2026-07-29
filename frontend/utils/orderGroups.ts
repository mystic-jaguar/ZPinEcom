import { OrderObject } from '../types/types';

/**
 * A checkout's per-seller sub-orders, tied together for the customer.
 * Legacy pre-split orders (groupId null) become a group of one.
 */
export interface OrderGroup {
    key: string;              // groupId, or the lone order's id when ungrouped
    groupNumber: string;      // ZP-<groupId>, or the order's own orderNumber for a legacy group of one
    orders: OrderObject[];    // sub-orders (parcels), one per seller
    total: number;            // sum of sub-order finalAmount
    createdAt: string;        // earliest sub-order createdAt
}

export function groupKeyOf(o: OrderObject): string {
    return o.groupId || o.id;
}

/**
 * Bucket a flat sub-order list into customer-facing groups, preserving the
 * incoming order (backend returns newest-first).
 */
export function groupOrders(orders: OrderObject[]): OrderGroup[] {
    const map = new Map<string, OrderObject[]>();
    for (const o of orders) {
        const k = groupKeyOf(o);
        const arr = map.get(k);
        if (arr) arr.push(o); else map.set(k, [o]);
    }
    const groups: OrderGroup[] = [];
    for (const [key, subs] of map) {
        groups.push({
            key,
            groupNumber: subs[0].groupId ? `ZP-${subs[0].groupId}` : subs[0].orderNumber,
            orders: subs,
            total: subs.reduce((s, o) => s + Number(o.finalAmount || 0), 0),
            createdAt: subs.reduce((min, o) => (o.createdAt < min ? o.createdAt : min), subs[0].createdAt),
        });
    }
    return groups;
}

/** Aggregate status for a group's summary pill. */
export function groupStatus(g: OrderGroup): OrderObject['status'] {
    const s = g.orders.map(o => o.status);
    if (s.every(x => x === 'delivered')) return 'delivered';
    if (s.every(x => x === 'cancelled')) return 'cancelled';
    if (s.some(x => x === 'out_for_delivery')) return 'out_for_delivery';
    if (s.some(x => x === 'shipped' || x === 'in_transit')) return 'in_transit';
    return 'processing'; // in progress
}
