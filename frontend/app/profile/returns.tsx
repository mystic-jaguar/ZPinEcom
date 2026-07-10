import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { Check, Headphones, RotateCcw } from 'lucide-react-native';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AppHeader, ZText } from '../../components/ui';
import { colors, fonts, palette, radius } from '../../constants/theme';
import { useOrder } from '../../context/OrderContext';
import { orderService } from '../../services/order';

type ReturnStatusRecord = { returnStatus: string; reason: string; description?: string; requestedAt: string; updatedAt: string };

const RETURN_WINDOW_DAYS = 7;
const ACTIVE_RETURN_STATUSES = new Set(['requested', 'picked_up']);

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
    const { orders } = useOrder();
    const [isLoading, setIsLoading] = useState(true);
    const [returnStatusByOrder, setReturnStatusByOrder] = useState<Record<string, ReturnStatusRecord>>({});

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

    const returnableItems = orders.flatMap(order => {
        const rd = returnStatusByOrder[order.id];
        const hasActive = Boolean(rd && ACTIVE_RETURN_STATUSES.has(rd.returnStatus));
        if (!isWithinReturnWindow(order) || hasActive || order.status === 'returned' || order.paymentStatus === 'refunded') return [];
        return (order.items || []).map(item => ({ ...item, orderId: order.id, orderNumber: order.orderNumber, updatedAt: order.updatedAt, createdAt: order.createdAt }));
    });

    const activeReturns = orders
        .filter(o => { const rd = returnStatusByOrder[o.id]; return Boolean(rd && ACTIVE_RETURN_STATUSES.has(rd.returnStatus)); })
        .map(o => {
            const rd = returnStatusByOrder[o.id];
            const pickedUp = rd?.returnStatus === 'picked_up';
            return { order: o, statusLabel: (rd?.returnStatus || 'requested').replace(/_/g, ' ').toUpperCase(), step: pickedUp ? 1 : 0, firstItem: o.items[0] };
        });

    const RefundProgress = ({ step }: { step: number }) => {
        // 0 requested, 1 picked up, 2 refunded
        const labels = ['REQUESTED', 'PICKED UP', 'REFUNDED'];
        return (
            <>
                <View style={styles.progress}>
                    {[0, 1, 2].map((i) => (
                        <React.Fragment key={i}>
                            <View style={[styles.pDot, i <= step ? styles.pDotOn : styles.pDotOff]}>{i <= step && <Check size={12} color={colors.textOnYellow} />}</View>
                            {i < 2 && <View style={[styles.pLine, { backgroundColor: i < step ? palette.yellow500 : colors.borderSubtle }]} />}
                        </React.Fragment>
                    ))}
                </View>
                <View style={styles.pLabels}>
                    {labels.map((l, i) => <Text key={l} style={[styles.pLabel, { textAlign: i === 0 ? 'left' : i === 1 ? 'center' : 'right', color: i <= step ? colors.textStrong : colors.textFaint }]}>{l}</Text>)}
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
            <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
                {activeReturns.length > 0 && (
                    <>
                        <ZText variant="eyebrow" style={styles.sectionLabel}>Active refund</ZText>
                        {activeReturns.map(({ order, statusLabel, step, firstItem }) => (
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
                ) : returnableItems.length === 0 ? (
                    <View style={styles.empty}><RotateCcw size={44} color={colors.borderStrong} /><ZText variant="muted" style={{ marginTop: 12 }}>No returnable items</ZText></View>
                ) : (
                    returnableItems.map((item, i) => (
                        <View key={`${item.orderId}-${item.productId}-${i}`} style={styles.card}>
                            <View style={[styles.itemRow, { marginBottom: 14 }]}>
                                <Image source={item.image ? { uri: item.image as string } : require('../../assets/images/icon_backup.png')} style={styles.itemImg} contentFit="cover" />
                                <View style={{ flex: 1 }}>
                                    <Text style={styles.itemName} numberOfLines={1}>{item.productName}</Text>
                                    <Text style={styles.itemSub}>{daysLeft(item)} days left</Text>
                                </View>
                                <Text style={styles.price}>₹{Number(item.price).toLocaleString('en-IN')}</Text>
                            </View>
                            <Pressable
                                style={styles.returnBtn}
                                onPress={() => router.push({ pathname: '/profile/cancel-order', params: { orderId: item.orderId, productId: item.productId, mode: 'return', name: item.productName, variant: item.variant, image: item.image } })}
                            >
                                <RotateCcw size={16} color={colors.textStrong} />
                                <Text style={styles.returnText}>Request return</Text>
                            </Pressable>
                        </View>
                    ))
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
    statusChip: { backgroundColor: palette.yellow100, paddingHorizontal: 8, paddingVertical: 4, borderRadius: radius.xs, alignSelf: 'flex-start' },
    statusChipText: { fontFamily: fonts.monoBold, fontSize: 9, letterSpacing: 0.4, color: palette.yellow800 },

    progress: { flexDirection: 'row', alignItems: 'center', marginTop: 15 },
    pDot: { width: 22, height: 22, borderRadius: 11, alignItems: 'center', justifyContent: 'center' },
    pDotOn: { backgroundColor: palette.yellow500 },
    pDotOff: { backgroundColor: '#F3F2EE', borderWidth: 2, borderColor: colors.borderSubtle },
    pLine: { flex: 1, height: 2 },
    pLabels: { flexDirection: 'row', marginTop: 8 },
    pLabel: { flex: 1, fontFamily: fonts.monoBold, fontSize: 9 },

    returnBtn: { height: 44, borderRadius: 12, borderWidth: 2, borderColor: colors.borderInk, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7 },
    returnText: { fontFamily: fonts.bodyBold, fontSize: 13, color: colors.textStrong },

    empty: { alignItems: 'center', paddingVertical: 40 },

    support: { flexDirection: 'row', alignItems: 'center', gap: 14, backgroundColor: colors.surfaceBrandTint, borderWidth: 1, borderColor: palette.yellow200, borderRadius: radius.lg, padding: 16, marginTop: 8 },
    supportIcon: { width: 48, height: 48, borderRadius: 24, backgroundColor: palette.yellow500, alignItems: 'center', justifyContent: 'center' },
    supportTitle: { fontFamily: fonts.displaySemiBold, fontSize: 16, color: colors.textStrong },
    supportSub: { fontFamily: fonts.bodyRegular, fontSize: 13, color: colors.textMuted, marginTop: 1 },
});
