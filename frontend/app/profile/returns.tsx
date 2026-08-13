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
    // orderId -> orderItemIds the customer ticked. Keyed on the ORDER ITEM, not
    // the product: the list payload carries no productId, so keying on it made
    // every checkbox share the same undefined key (tick one, tick all) and sent
    // an empty selection — which the backend reads as "the whole order".
    const [selectedByOrder, setSelectedByOrder] = useState<Record<string, string[]>>({});

    const toggleItem = (orderId: string, orderItemId: string) => setSelectedByOrder(prev => {
        const cur = prev[orderId] || [];
        return { ...prev, [orderId]: cur.includes(orderItemId) ? cur.filter(p => p !== orderItemId) : [...cur, orderItemId] };
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

    // One card per ORDER, not per product — a multi-item order is returned in a
    // single request with all the selected orderItemIds.
    const returnableOrders = orders.filter(order => {
        const rd = returnStatusByOrder[order.id];
        const hasActive = Boolean(rd && ACTIVE_RETURN_STATUSES.has(rd.returnStatus));
        if (!isWithinReturnWindow(order) || hasActive || order.status === 'returned' || order.paymentStatus === 'refunded') return false;
        return (order.items || []).some(i => !i.isReturned);
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
                        {activeReturns.map(({ order, statusLabel, step, firstItem, disclaimer }) => (
                            <View key={order.id} style={styles.card}>
                                <View style={styles.itemRow}>
                                    <Image source={firstItem?.image ? { uri: firstItem.image as string } : require('../../assets/images/icon_backup.png')} style={styles.itemImg} contentFit="cover" />
                                    <View style={{ flex: 1 }}>
                                        <Text style={styles.itemName} numberOfLines={1}>{firstItem?.productName || order.orderNumber}</Text>
                                        <Text style={styles.itemSub}>Refund ₹{Number(order.finalAmount).toLocaleString('en-IN')}</Text>
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
                        // Lines already sent back on an earlier partial return are gone.
                        const items = (order.items || []).filter(i => !i.isReturned);
                        const multi = items.length > 1;
                        const selected = selectedByOrder[order.id] || [];
                        const canSubmit = !multi || selected.length > 0;
                        const orderItemIds = (multi ? selected : [items[0]?.orderItemId]).filter(Boolean) as string[];
                        return (
                            <View key={order.id} style={styles.card}>
                                {multi && (
                                    <View style={styles.orderHead}>
                                        <Text style={styles.orderNo}>{order.orderNumber}</Text>
                                        <Text style={styles.itemSub}>{daysLeft(order)} days left</Text>
                                    </View>
                                )}
                                {items.map((item, i) => {
                                    const itemId = String(item.orderItemId || '');
                                    const on = selected.includes(itemId);
                                    const row = (
                                        <View style={[styles.itemRow, { marginBottom: 14 }]}>
                                            {multi && <View style={[styles.checkbox, on && styles.checkboxOn]}>{on && <Check size={13} color={colors.textOnYellow} />}</View>}
                                            <Image source={item.image ? { uri: item.image as string } : require('../../assets/images/icon_backup.png')} style={styles.itemImg} contentFit="cover" />
                                            <View style={{ flex: 1 }}>
                                                <Text style={styles.itemName} numberOfLines={1}>{item.productName}</Text>
                                                <Text style={styles.itemSub}>{multi ? (item.variant || '') : `${daysLeft(order)} days left`}</Text>
                                            </View>
                                            <Text style={styles.price}>₹{Number(item.price).toLocaleString('en-IN')}</Text>
                                        </View>
                                    );
                                    return multi
                                        ? <Pressable key={`${itemId}-${i}`} onPress={() => toggleItem(order.id, itemId)}>{row}</Pressable>
                                        : <React.Fragment key={`${itemId}-${i}`}>{row}</React.Fragment>;
                                })}
                                <Pressable
                                    style={[styles.returnBtn, !canSubmit && styles.returnBtnOff]}
                                    disabled={!canSubmit}
                                    onPress={() => router.push({ pathname: '/profile/cancel-order', params: { orderId: order.id, orderItemIds: orderItemIds.join(','), mode: 'return' } })}
                                >
                                    <RotateCcw size={16} color={canSubmit ? colors.textStrong : colors.textFaint} />
                                    <Text style={[styles.returnText, !canSubmit && { color: colors.textFaint }]}>
                                        {multi ? (selected.length > 0 ? `Return ${selected.length} item${selected.length > 1 ? 's' : ''}` : 'Select items to return') : 'Request return'}
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

    returnBtn: { height: 44, borderRadius: 12, borderWidth: 2, borderColor: colors.borderInk, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7 },
    returnBtnOff: { borderColor: colors.borderSubtle },
    returnText: { fontFamily: fonts.bodyBold, fontSize: 13, color: colors.textStrong },

    empty: { alignItems: 'center', paddingVertical: 40 },

    support: { flexDirection: 'row', alignItems: 'center', gap: 14, backgroundColor: colors.surfaceBrandTint, borderWidth: 1, borderColor: palette.yellow200, borderRadius: radius.lg, padding: 16, marginTop: 8 },
    supportIcon: { width: 48, height: 48, borderRadius: 24, backgroundColor: palette.yellow500, alignItems: 'center', justifyContent: 'center' },
    supportTitle: { fontFamily: fonts.displaySemiBold, fontSize: 16, color: colors.textStrong },
    supportSub: { fontFamily: fonts.bodyRegular, fontSize: 13, color: colors.textMuted, marginTop: 1 },
});
