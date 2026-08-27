import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { Check, Headphones, RotateCcw } from 'lucide-react-native';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AppHeader, ZText } from '../../components/ui';
import { colors, fonts, palette, radius } from '../../constants/theme';
import { useOrder } from '../../context/OrderContext';
import { orderService } from '../../services/order';
import { returnStatusLabel } from '../../utils/orderStatus';

type ReturnStatusRecord = {
    returnStatus: string; reason: string; description?: string; requestedAt: string; updatedAt: string;
    refundDisclaimer?: string | null;
    // What the OPEN return is actually worth — the units coming back plus GST,
    // not the order total. A 1-of-5 return must never quote the whole order.
    refundAmount?: number | null;
    statusHistory?: Array<{ status: string; at: string; note?: string }>;
};

const RETURN_WINDOW_DAYS = 7;
// A return in flight: still owed a decision, a pickup or the money.
const ACTIVE_RETURN_STATUSES = new Set(['requested', 'approved', 'picked_up']);
// Steps of the refund progress bar, in order. Mirrors the backend's
// RETURN_TRANSITIONS chain (ZPinEcom/backend/src/routes/orders.ts).
const REFUND_STEPS = ['requested', 'approved', 'picked_up', 'refunded'];
// Fallback only — the server sends the authoritative wording as refundDisclaimer.
const REFUND_DISCLAIMER = 'This amount will be refunded once the seller receives the product.';

// Every checkbox is keyed on the order ITEM id. If that id is ever missing from
// the payload, falling back to a constant ('') silently gives every row the SAME
// key — ticking one ticks all, and the selection the customer thought they made
// never reaches the server. Fall back to something unique per row instead, and
// refuse to submit it (see canSubmit below).
const MISSING_ID = 'no-id-';
const keyOf = (item: { orderItemId?: string }, i: number) => String(item.orderItemId || `${MISSING_ID}${i}`);

function isWithinReturnWindow(order: { status: string; updatedAt?: string; createdAt?: string }) {
    if (order.status !== 'delivered') return false;
    const ref = order.updatedAt || order.createdAt;
    if (!ref) return false;
    const d = new Date(ref);
    if (Number.isNaN(d.getTime())) return false;
    const elapsed = Date.now() - d.getTime();
    return elapsed >= 0 && elapsed <= RETURN_WINDOW_DAYS * 864e5;
}

function daysLeft(order: { updatedAt?: string; createdAt?: string }) {
    const ref = order.updatedAt || order.createdAt;
    if (!ref) return 0;
    const elapsed = Date.now() - new Date(ref).getTime();
    return Math.max(0, RETURN_WINDOW_DAYS - Math.floor(elapsed / 864e5));
}

export default function ReturnsRefundsScreen() {
    const router = useRouter();
    const { orders, refreshOrders } = useOrder();
    const [isLoading, setIsLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [returnStatusByOrder, setReturnStatusByOrder] = useState<Record<string, ReturnStatusRecord>>({});
    // orderId -> { orderItemId: units the customer wants to send back }. Absent
    // or 0 = not selected. Keyed on the ORDER ITEM, not the product: keying on
    // productId made every checkbox share the same undefined key (tick one, tick
    // all) and sent an empty selection — which the backend reads as "everything".
    // NOTHING is ever pre-selected: the customer picks the items AND the units.
    const [selectedByOrder, setSelectedByOrder] = useState<Record<string, Record<string, number>>>({});

    const toggleItem = (orderId: string, orderItemId: string) => setSelectedByOrder(prev => {
        const cur = { ...(prev[orderId] || {}) };
        if (cur[orderItemId]) delete cur[orderItemId];
        else cur[orderItemId] = 1;
        return { ...prev, [orderId]: cur };
    });

    // Nudge one line's unit count within [1, max]. Selecting is implicit: a
    // customer who taps "+" on an unticked row means to return it.
    const stepQty = (orderId: string, orderItemId: string, delta: number, max: number) =>
        setSelectedByOrder(prev => {
            const cur = { ...(prev[orderId] || {}) };
            const next = Math.min(max, Math.max(1, (cur[orderItemId] || 0) + delta));
            cur[orderItemId] = next;
            return { ...prev, [orderId]: cur };
        });

    const onRefresh = async () => {
        setRefreshing(true);
        await refreshOrders();
        setRefreshing(false);
    };

    useEffect(() => {
        let cancelled = false;
        const load = async () => {
            setIsLoading(true);
            const candidates = orders.filter(o => ['delivered', 'return_requested', 'returned'].includes(o.status));
            if (candidates.length === 0) { setReturnStatusByOrder({}); setIsLoading(false); return; }
            const entries = await Promise.all(candidates.map(async o => {
                try { const r = await orderService.getReturnStatus(o.id); return [o.id, (r as any).data] as const; }
                catch { return [o.id, null] as const; }
            }));
            if (!cancelled) {
                setReturnStatusByOrder(entries.reduce<Record<string, any>>((acc, [id, data]) => { if (data) acc[id] = data; return acc; }, {}));
                setIsLoading(false);
            }
        };
        load();
        return () => { cancelled = true; };
    }, [orders]);

    // Units of a line the customer can still send back: what they bought, minus
    // whatever an earlier return already claimed. 0 = the line is done.
    const returnableQty = (item: { quantity: number; returnedQuantity?: number; isReturned?: boolean }) =>
        item.isReturned ? 0 : Math.max(0, Number(item.quantity) - Number(item.returnedQuantity || 0));

    // One card per ORDER, not per product — a multi-item order is returned in a
    // single request carrying every selected line and its unit count.
    const returnableOrders = orders.filter(order => {
        const rd = returnStatusByOrder[order.id];
        const hasActive = Boolean(rd && ACTIVE_RETURN_STATUSES.has(rd.returnStatus));
        if (!isWithinReturnWindow(order) || hasActive || order.status === 'returned' || order.paymentStatus === 'refunded') return false;
        return (order.items || []).some(i => returnableQty(i) > 0);
    });

    const activeReturns = orders
        .filter(o => { const rd = returnStatusByOrder[o.id]; return Boolean(rd && ACTIVE_RETURN_STATUSES.has(rd.returnStatus)); })
        .map(o => {
            const rd = returnStatusByOrder[o.id];
            const status = rd?.returnStatus || 'requested';
            const step = Math.max(0, REFUND_STEPS.indexOf(status));
            return {
                order: o,
                statusLabel: returnStatusLabel(status),
                step,
                firstItem: o.items[0],
                disclaimer: rd?.refundDisclaimer ?? REFUND_DISCLAIMER,
                refundAmount: Number(rd?.refundAmount) || 0,
            };
        });

    const RefundProgress = ({ step }: { step: number }) => {
        // 0 requested, 1 approved, 2 picked up, 3 refunded — REFUND_STEPS order.
        const labels = ['REQUESTED', 'APPROVED', 'PICKED UP', 'REFUNDED'];
        const last = labels.length - 1;
        return (
            <>
                <View style={styles.progress}>
                    {labels.map((l, i) => (
                        <React.Fragment key={l}>
                            <View style={[styles.pDot, i <= step ? styles.pDotOn : styles.pDotOff]}>{i <= step && <Check size={12} color={colors.textOnYellow} />}</View>
                            {i < last && <View style={[styles.pLine, { backgroundColor: i < step ? palette.yellow500 : colors.borderSubtle }]} />}
                        </React.Fragment>
                    ))}
                </View>
                <View style={styles.pLabels}>
                    {labels.map((l, i) => <Text key={l} style={[styles.pLabel, { textAlign: i === 0 ? 'left' : i === last ? 'right' : 'center', color: i <= step ? colors.textStrong : colors.textFaint }]}>{l}</Text>)}
                </View>
            </>
        );
    };

    return (
        <SafeAreaView style={styles.container} edges={['top']}>
            <AppHeader
                title="Returns & Refunds"
                onBack={() => router.back()}
                right={<Pressable style={styles.helpBtn} onPress={() => router.push('/profile/help-center')}><Headphones size={18} color={colors.textStrong} /></Pressable>}
            />
            <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[palette.yellow500]} tintColor={palette.yellow500} />}>
                {activeReturns.length > 0 && (
                    <>
                        <ZText variant="eyebrow" style={styles.sectionLabel}>Active refund</ZText>
                        {activeReturns.map(({ order, statusLabel, step, firstItem, disclaimer, refundAmount }) => (
                            <View key={order.id} style={styles.card}>
                                <View style={styles.itemRow}>
                                    <Image source={firstItem?.image ? { uri: firstItem.image as string } : require('../../assets/images/icon_backup.png')} style={styles.itemImg} contentFit="cover" />
                                    <View style={{ flex: 1 }}>
                                        <Text style={styles.itemName} numberOfLines={1}>{firstItem?.productName || order.orderNumber}</Text>
                                        {/* The return's own value, not order.finalAmount. */}
                                        <Text style={styles.itemSub}>Refund ₹{(refundAmount || Number(order.finalAmount)).toLocaleString('en-IN')}</Text>
                                    </View>
                                    <View style={styles.statusChip}><Text style={styles.statusChipText}>{statusLabel}</Text></View>
                                </View>
                                <RefundProgress step={step} />
                                {!!disclaimer && <Text style={styles.disclaimer}>{disclaimer}</Text>}
                            </View>
                        ))}
                    </>
                )}

                <View style={styles.sectionHead}>
                    <ZText variant="eyebrow">Eligible to return</ZText>
                    <Text style={styles.window}>7-DAY WINDOW</Text>
                </View>

                {isLoading ? (
                    <View style={styles.empty}><ActivityIndicator color={palette.yellow500} /><ZText variant="muted" style={{ marginTop: 12 }}>Checking eligibility…</ZText></View>
                ) : returnableOrders.length === 0 ? (
                    <View style={styles.empty}><RotateCcw size={44} color={colors.borderStrong} /><ZText variant="muted" style={{ marginTop: 12 }}>No returnable items</ZText></View>
                ) : (
                    returnableOrders.map(order => {
                        // Units already sent back on an earlier return are gone.
                        const items = (order.items || []).filter(i => returnableQty(i) > 0);
                        const selected = selectedByOrder[order.id] || {};
                        // A single line with a single unit has nothing to choose, so it
                        // skips the checkboxes. Anything else — several lines, or one
                        // line bought more than once — must be picked explicitly.
                        const soleUnit = items.length === 1 && returnableQty(items[0]) === 1;
                        const chosen = soleUnit
                            ? [{ id: keyOf(items[0], 0), quantity: 1 }]
                            : Object.entries(selected)
                                .filter(([, q]) => q > 0)
                                .map(([id, quantity]) => ({ id, quantity }));
                        const unitCount = chosen.reduce((n, c) => n + c.quantity, 0);
                        // A row whose orderItemId never arrived carries a placeholder
                        // key. Never submit one: an id the backend cannot match is
                        // how a one-item return turns back into a whole-order refund.
                        const canSubmit = chosen.length > 0 && chosen.every(c => !c.id.startsWith(MISSING_ID));
                        return (
                            <View key={order.id} style={styles.card}>
                                {!soleUnit && (
                                    <View style={styles.orderHead}>
                                        <Text style={styles.orderNo}>{order.orderNumber}</Text>
                                        <Text style={styles.itemSub}>{daysLeft(order)} days left</Text>
                                    </View>
                                )}
                                {items.map((item, i) => {
                                    const itemId = keyOf(item, i);
                                    const max = returnableQty(item);
                                    const qty = selected[itemId] || 0;
                                    const on = soleUnit || qty > 0;
                                    // Only the units still returnable count toward the
                                    // running total the customer sees.
                                    const partOfLine = item.returnedQuantity
                                        ? `${max} of ${item.quantity} left`
                                        : (item.variant || '');
                                    const row = (
                                        <View style={[styles.itemRow, { marginBottom: 14 }]}>
                                            {!soleUnit && <View style={[styles.checkbox, on && styles.checkboxOn]}>{on && <Check size={13} color={colors.textOnYellow} />}</View>}
                                            <Image source={item.image ? { uri: item.image as string } : require('../../assets/images/icon_backup.png')} style={styles.itemImg} contentFit="cover" />
                                            <View style={{ flex: 1 }}>
                                                <Text style={styles.itemName} numberOfLines={1}>{item.productName}</Text>
                                                <Text style={styles.itemSub}>{soleUnit ? `${daysLeft(order)} days left` : partOfLine}</Text>
                                                {/* Bought more than one? Choose how many come back. */}
                                                {max > 1 && (
                                                    <View style={styles.stepper}>
                                                        <Pressable
                                                            hitSlop={8}
                                                            style={[styles.stepBtn, (qty <= 1) && styles.stepBtnOff]}
                                                            disabled={qty <= 1}
                                                            onPress={() => stepQty(order.id, itemId, -1, max)}
                                                        >
                                                            <Text style={styles.stepGlyph}>−</Text>
                                                        </Pressable>
                                                        <Text style={styles.stepQty}>{qty || 0}</Text>
                                                        <Pressable
                                                            hitSlop={8}
                                                            style={[styles.stepBtn, (qty >= max) && styles.stepBtnOff]}
                                                            disabled={qty >= max}
                                                            onPress={() => stepQty(order.id, itemId, 1, max)}
                                                        >
                                                            <Text style={styles.stepGlyph}>+</Text>
                                                        </Pressable>
                                                        <Text style={styles.stepMax}>of {max}</Text>
                                                    </View>
                                                )}
                                            </View>
                                            <Text style={styles.price}>
                                                ₹{(Number(item.price) * Math.max(1, qty || 1)).toLocaleString('en-IN')}
                                            </Text>
                                        </View>
                                    );
                                    // The whole row toggles the line. The stepper's own
                                    // Pressables sit deeper, so RN's responder system gives
                                    // them the touch and the row does not also untick.
                                    return soleUnit
                                        ? <React.Fragment key={`${itemId}-${i}`}>{row}</React.Fragment>
                                        : <Pressable key={`${itemId}-${i}`} onPress={() => toggleItem(order.id, itemId)}>{row}</Pressable>;
                                })}
                                <Pressable
                                    style={[styles.returnBtn, !canSubmit && styles.returnBtnOff]}
                                    disabled={!canSubmit}
                                    onPress={() => router.push({
                                        pathname: '/profile/cancel-order',
                                        params: {
                                            orderId: order.id,
                                            // "<orderItemId>:<units>" pairs — the router only
                                            // carries strings, and the units must survive.
                                            returnLines: chosen.map(c => `${c.id}:${c.quantity}`).join(','),
                                            mode: 'return',
                                        },
                                    })}
                                >
                                    <RotateCcw size={16} color={canSubmit ? colors.textStrong : colors.textFaint} />
                                    <Text style={[styles.returnText, !canSubmit && { color: colors.textFaint }]}>
                                        {canSubmit
                                            ? (soleUnit ? 'Request return' : `Return ${unitCount} item${unitCount > 1 ? 's' : ''}`)
                                            : chosen.length > 0
                                                ? 'Pull to refresh and try again'
                                                : 'Select items to return'}
                                    </Text>
                                </Pressable>
                            </View>
                        );
                    })
                )}

                <Pressable style={styles.support} onPress={() => router.push('/profile/help-center')}>
                    <View style={styles.supportIcon}><Headphones size={22} color={colors.textOnYellow} /></View>
                    <View style={{ flex: 1 }}>
                        <Text style={styles.supportTitle}>Need more help?</Text>
                        <Text style={styles.supportSub}>Chat with our support team</Text>
                    </View>
                </Pressable>
                <View style={{ height: 30 }} />
            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: palette.paperWarm },
    helpBtn: { width: 40, height: 40, borderRadius: 20, borderWidth: 2, borderColor: colors.borderInk, alignItems: 'center', justifyContent: 'center' },
    content: { padding: 20, paddingTop: 4 },
    sectionLabel: { marginBottom: 12 },
    sectionHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 8, marginBottom: 12 },
    window: { fontFamily: fonts.monoBold, fontSize: 10, letterSpacing: 0.4, color: colors.textMuted },

    card: { backgroundColor: colors.surfaceCard, borderWidth: 1, borderColor: palette.neutral200, borderRadius: radius.lg, padding: 16, marginBottom: 14 },
    itemRow: { flexDirection: 'row', alignItems: 'center', gap: 13 },
    itemImg: { width: 52, height: 60, borderRadius: 11, backgroundColor: colors.surfaceSunken },
    itemName: { fontFamily: fonts.bodySemiBold, fontSize: 14, color: colors.textStrong },
    itemSub: { fontFamily: fonts.bodyRegular, fontSize: 12, color: colors.textFaint, marginTop: 2 },
    price: { fontFamily: fonts.displaySemiBold, fontSize: 16, color: colors.textStrong },
    // maxWidth + wrapping: "PICKED UP · PENDING INSPECTION" is deliberately long
    // (it must not read as "returned"), so it wraps instead of crushing the name.
    statusChip: { backgroundColor: palette.yellow100, paddingHorizontal: 8, paddingVertical: 4, borderRadius: radius.xs, alignSelf: 'flex-start', maxWidth: 96 },
    statusChipText: { fontFamily: fonts.monoBold, fontSize: 9, letterSpacing: 0.4, color: palette.yellow800 },

    progress: { flexDirection: 'row', alignItems: 'center', marginTop: 15 },
    pDot: { width: 22, height: 22, borderRadius: 11, alignItems: 'center', justifyContent: 'center' },
    pDotOn: { backgroundColor: palette.yellow500 },
    pDotOff: { backgroundColor: '#F3F2EE', borderWidth: 2, borderColor: colors.borderSubtle },
    pLine: { flex: 1, height: 2 },
    pLabels: { flexDirection: 'row', marginTop: 8 },
    pLabel: { flex: 1, fontFamily: fonts.monoBold, fontSize: 9 },
    disclaimer: { marginTop: 12, fontFamily: fonts.bodyRegular, fontSize: 12, lineHeight: 17, color: colors.textFaint },

    orderHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
    orderNo: { fontFamily: fonts.monoBold, fontSize: 10, color: colors.textFaint },
    checkbox: { width: 22, height: 22, borderRadius: 6, borderWidth: 2, borderColor: colors.borderSubtle, alignItems: 'center', justifyContent: 'center' },
    checkboxOn: { backgroundColor: palette.yellow500, borderWidth: 0 },

    // Per-line unit picker, shown only when the customer bought more than one.
    stepper: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 7 },
    stepBtn: { width: 26, height: 26, borderRadius: 8, borderWidth: 2, borderColor: colors.borderSubtle, alignItems: 'center', justifyContent: 'center' },
    stepBtnOff: { opacity: 0.35 },
    stepGlyph: { fontFamily: fonts.bodyBold, fontSize: 15, lineHeight: 18, color: colors.textStrong },
    stepQty: { fontFamily: fonts.monoBold, fontSize: 13, color: colors.textStrong, minWidth: 14, textAlign: 'center' },
    stepMax: { fontFamily: fonts.bodyRegular, fontSize: 11, color: colors.textFaint },

    returnBtn: { height: 44, borderRadius: 12, borderWidth: 2, borderColor: colors.borderInk, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7 },
    returnBtnOff: { borderColor: colors.borderSubtle },
    returnText: { fontFamily: fonts.bodyBold, fontSize: 13, color: colors.textStrong },

    empty: { alignItems: 'center', paddingVertical: 40 },

    support: { flexDirection: 'row', alignItems: 'center', gap: 14, backgroundColor: colors.surfaceBrandTint, borderWidth: 1, borderColor: palette.yellow200, borderRadius: radius.lg, padding: 16, marginTop: 8 },
    supportIcon: { width: 48, height: 48, borderRadius: 24, backgroundColor: palette.yellow500, alignItems: 'center', justifyContent: 'center' },
    supportTitle: { fontFamily: fonts.displaySemiBold, fontSize: 16, color: colors.textStrong },
    supportSub: { fontFamily: fonts.bodyRegular, fontSize: 13, color: colors.textMuted, marginTop: 1 },
});
