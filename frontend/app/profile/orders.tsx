import { Image } from 'expo-image';
import { useFocusEffect } from '@react-navigation/native';
import { useRouter } from 'expo-router';
import { Bike, Headphones, HelpCircle, Repeat, RotateCcw, XCircle } from 'lucide-react-native';
import React, { useCallback, useMemo, useState } from 'react';
import { FlatList, Pressable, RefreshControl, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import ActionModal from '../../components/common/ActionModal';
import { AppHeader, ZText } from '../../components/ui';
import { colors, fonts, palette, radius } from '../../constants/theme';
import { useOrder } from '../../context/OrderContext';
import { orderService } from '../../services/order';
import { groupOrders, groupStatus, OrderGroup } from '../../utils/orderGroups';
import { isInProgress, isReturnInProgress, statusLabel, TERMINATED } from '../../utils/orderStatus';

const FILTERS = ['All', 'In Progress', 'Completed', 'Cancelled'];

function statusMeta(status: string) {
    if (status === 'delivered') return { label: 'DELIVERED', bg: palette.green50, fg: palette.green500, dot: null };
    if (status === 'cancelled') return { label: 'CANCELLED', bg: '#F7E3E2', fg: palette.red500, dot: null };
    // shipped/in_transit collapse into 'Out for delivery' — the tracker no
    // longer has an In transit stage (utils/orderStatus.ts).
    if (['out_for_delivery', 'shipped', 'in_transit'].includes(status)) return { label: 'OUT FOR DELIVERY', bg: palette.yellow100, fg: palette.yellow800, dot: palette.yellow600 };
    if (TERMINATED.has(status)) return { label: statusLabel(status).toUpperCase(), bg: '#F7E3E2', fg: palette.red500, dot: null };
    return { label: 'IN PROGRESS', bg: palette.yellow100, fg: palette.yellow800, dot: palette.yellow600 };
}

export default function AllOrdersScreen() {
    const router = useRouter();
    const { orders, refreshOrders } = useOrder();
    const [activeFilter, setActiveFilter] = useState('All');
    const [refreshing, setRefreshing] = useState(false);
    // Order id awaiting a "yes, call off my return" confirmation.
    const [cancelReturnId, setCancelReturnId] = useState<string | null>(null);
    const [returnError, setReturnError] = useState<string | null>(null);

    useFocusEffect(useCallback(() => { refreshOrders(); }, []));

    const onRefresh = async () => {
        setRefreshing(true);
        await refreshOrders();
        setRefreshing(false);
    };

    const confirmCancelReturn = async () => {
        const id = cancelReturnId;
        setCancelReturnId(null);
        if (!id) return;
        try {
            await orderService.cancelReturn(id);
        } catch (e: any) {
            setReturnError(e?.message || 'Could not cancel the return. Please try again.');
        }
        await refreshOrders();
    };

    const groups = useMemo(() => groupOrders(orders), [orders]);

    const filteredGroups = useMemo(() => groups.filter((g) => {
        if (activeFilter === 'All') return true;
        const s = g.orders.map(o => o.status);
        if (activeFilter === 'In Progress') return s.some(isInProgress);
        if (activeFilter === 'Completed') return s.every(x => x === 'delivered');
        if (activeFilter === 'Cancelled') return s.every(x => x === 'cancelled');
        return true;
    }), [activeFilter, groups]);

    const renderItem = ({ item: group }: { item: OrderGroup }) => {
        const single = group.orders.length === 1 ? group.orders[0] : null;
        const status = single ? single.status : groupStatus(group);
        const meta = statusMeta(status);
        const items = group.orders.flatMap(o => o.items || []);
        const thumbs = items.slice(0, 2);
        const extra = items.length - thumbs.length;
        const inProgress = isInProgress(status);
        const delivered = status === 'delivered';
        const cancelled = status === 'cancelled';
        // A return the customer can still call off: raised, but not yet collected
        // by a delivery partner. 'picked_up' onwards is out of their hands.
        const cancellableReturn = single && ['requested', 'approved'].includes(String((single as any).returnStatus || ''))
            ? single : null;
        // A return already in flight has its own timeline on the track screen
        // (RETURN_STEPS), so the card offers to follow it rather than offering a
        // second return on an order that is already going back.
        const returning = !!single && isReturnInProgress((single as any).returnStatus);
        const dateLabel = new Date(group.createdAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });

        return (
            <Pressable style={styles.card} onPress={() => router.push({ pathname: '/profile/order-details', params: { groupId: group.key } })}>
                <View style={styles.cardHead}>
                    <View>
                        <Text style={styles.orderNo}>{group.groupNumber}</Text>
                        <Text style={styles.placed}>
                            {(delivered ? `Delivered ${dateLabel}` : cancelled ? `Cancelled ${dateLabel}` : `Placed ${dateLabel}`)}
                            {!single ? ` · ${group.orders.length} shipments` : ''}
                        </Text>
                    </View>
                    <View style={[styles.statusPill, { backgroundColor: meta.bg }]}>
                        {meta.dot && <View style={[styles.dot, { backgroundColor: meta.dot }]} />}
                        <Text style={[styles.statusText, { color: meta.fg }]}>{meta.label}</Text>
                    </View>
                </View>

                <View style={styles.thumbRow}>
                    {thumbs.map((it: any, i: number) => (
                        <Image key={i} source={it.image ? (typeof it.image === 'string' ? { uri: it.image } : it.image) : require('../../assets/images/icon_backup.png')} style={styles.thumb} contentFit="cover" />
                    ))}
                    {extra > 0 && <View style={styles.thumbMore}><Text style={styles.thumbMoreText}>+{extra}</Text></View>}
                    <View style={{ flex: 1, alignItems: 'flex-end' }}>
                        <ZText variant="eyebrow" style={{ marginBottom: 2 }}>Total</ZText>
                        <Text style={styles.total}>₹{Number(group.total).toLocaleString('en-IN')}</Text>
                    </View>
                </View>

                {/* A seller rejection carries a reason; say so on the card so the
                    customer doesn't have to open the order to find out why. Checked
                    independent of the group's aggregate status: in a multi-seller
                    group, one seller can reject while the others still ship. */}
                {group.orders.some((o: any) => o.cancellationReason) && (
                    <Text style={styles.sellerCancelNote}>The seller could not fulfil this order.</Text>
                )}

                {/* Multi-shipment groups are opened from the card for per-parcel status/tracking.
                    Single-shipment groups keep the original inline actions. */}
                {!single ? (
                    <View style={styles.actions}>
                        <Pressable style={styles.primaryBtn} onPress={() => router.push({ pathname: '/profile/order-details', params: { groupId: group.key } })}>
                            <Bike size={16} color={colors.textOnYellow} />
                            <Text style={styles.primaryText}>View {group.orders.length} shipments</Text>
                        </Pressable>
                    </View>
                ) : cancelled ? null : (
                    <View style={styles.actions}>
                        {inProgress ? (
                            <>
                                <Pressable style={styles.primaryBtn} onPress={() => router.push({ pathname: '/profile/track-order', params: { orderId: single.id } })}>
                                    <Bike size={16} color={colors.textOnYellow} />
                                    <Text style={styles.primaryText}>Track order</Text>
                                </Pressable>
                                <Pressable style={styles.iconBtn} onPress={() => router.push('/profile/help-center')}>
                                    <Headphones size={18} color={colors.textStrong} />
                                </Pressable>
                            </>
                        ) : (
                            <>
                                {returning ? (
                                    <Pressable style={styles.primaryBtn} onPress={() => router.push({ pathname: '/profile/track-order', params: { orderId: single!.id } })}>
                                        <Bike size={16} color={colors.textOnYellow} />
                                        <Text style={styles.primaryText}>Track order</Text>
                                    </Pressable>
                                ) : (
                                    <Pressable style={styles.outlineBtn} onPress={() => router.push('/profile/returns')}>
                                        <RotateCcw size={16} color={colors.textStrong} />
                                        <Text style={styles.outlineText}>Return</Text>
                                    </Pressable>
                                )}
                                {cancellableReturn ? (
                                    <Pressable style={styles.inkBtn} onPress={() => setCancelReturnId(cancellableReturn.id)}>
                                        <XCircle size={16} color="#fff" />
                                        <Text style={styles.inkText}>Cancel return</Text>
                                    </Pressable>
                                ) : (
                                    <Pressable style={styles.inkBtn} onPress={() => items[0] && router.push(`/product/${items[0].productId}`)}>
                                        <Repeat size={16} color="#fff" />
                                        <Text style={styles.inkText}>Buy again</Text>
                                    </Pressable>
                                )}
                            </>
                        )}
                    </View>
                )}
            </Pressable>
        );
    };

    return (
        <SafeAreaView style={styles.container} edges={['top']}>
            <AppHeader
                title="My Orders"
                onBack={() => router.back()}
                right={<Pressable style={styles.helpBtn} onPress={() => router.push('/profile/help-center')}><HelpCircle size={20} color={colors.textStrong} /></Pressable>}
            />

            <View style={styles.filters}>
                {FILTERS.map((f) => (
                    <Pressable key={f} style={[styles.filter, activeFilter === f && styles.filterOn]} onPress={() => setActiveFilter(f)}>
                        <Text style={[styles.filterText, activeFilter === f && styles.filterTextOn]}>{f}</Text>
                    </Pressable>
                ))}
            </View>

            <FlatList
                data={filteredGroups}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[palette.yellow500]} tintColor={palette.yellow500} />}
                renderItem={renderItem}
                keyExtractor={(item) => item.key}
                contentContainerStyle={styles.list}
                showsVerticalScrollIndicator={false}
                ListEmptyComponent={<View style={styles.empty}><ZText variant="muted">No orders found</ZText></View>}
            />

            <ActionModal
                visible={!!cancelReturnId}
                title="Cancel this return?"
                message="Your return request will be withdrawn and no pickup will be scheduled. You can raise a new return later if you change your mind."
                icon="alert-triangle"
                primaryButtonText="Yes, cancel return"
                onPrimaryPress={confirmCancelReturn}
                secondaryButtonText="Keep return"
                onSecondaryPress={() => setCancelReturnId(null)}
                onClose={() => setCancelReturnId(null)}
            />
            <ActionModal
                visible={!!returnError}
                title="Could not cancel"
                message={returnError || ''}
                icon="alert-circle"
                primaryButtonText="OK"
                onPrimaryPress={() => setReturnError(null)}
                onClose={() => setReturnError(null)}
            />
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: palette.paperWarm },
    helpBtn: { width: 40, height: 40, borderRadius: 20, borderWidth: 2, borderColor: colors.borderInk, alignItems: 'center', justifyContent: 'center' },
    filters: { flexDirection: 'row', flexWrap: 'wrap', gap: 9, paddingHorizontal: 20, paddingBottom: 14 },
    filter: { paddingHorizontal: 15, paddingVertical: 8, borderRadius: 100, borderWidth: 2, borderColor: colors.borderSubtle, backgroundColor: colors.surfaceCard },
    filterOn: { backgroundColor: colors.surfaceInverse, borderColor: colors.surfaceInverse },
    filterText: { fontFamily: fonts.bodyBold, fontSize: 12, color: colors.textBody },
    filterTextOn: { color: colors.textInvert },

    list: { paddingHorizontal: 20, paddingBottom: 30 },
    card: { backgroundColor: colors.surfaceCard, borderWidth: 1, borderColor: palette.neutral200, borderRadius: radius.lg, padding: 15, marginBottom: 14 },
    cardHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
    orderNo: { fontFamily: fonts.monoBold, fontSize: 10, letterSpacing: 0.4, color: colors.textFaint },
    placed: { fontFamily: fonts.bodySemiBold, fontSize: 12, color: colors.textMuted, marginTop: 1 },
    sellerCancelNote: { fontFamily: fonts.bodySemiBold, fontSize: 12, color: palette.red500, marginTop: 10 },
    statusPill: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 100 },
    dot: { width: 6, height: 6, borderRadius: 3 },
    statusText: { fontFamily: fonts.monoBold, fontSize: 9, letterSpacing: 0.4 },
    thumbRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 9, marginBottom: 14 },
    thumb: { width: 52, height: 60, borderRadius: 10, backgroundColor: colors.surfaceSunken },
    thumbMore: { width: 52, height: 60, borderRadius: 10, backgroundColor: colors.surfaceSunken, alignItems: 'center', justifyContent: 'center' },
    thumbMoreText: { fontFamily: fonts.displaySemiBold, fontSize: 13, color: colors.textMuted },
    total: { fontFamily: fonts.displayBold, fontSize: 18, color: colors.textStrong },
    actions: { flexDirection: 'row', gap: 10 },
    primaryBtn: { flex: 1, height: 44, borderRadius: 12, backgroundColor: palette.yellow500, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 },
    primaryText: { fontFamily: fonts.bodyBlack, fontSize: 13, color: colors.textOnYellow },
    iconBtn: { width: 44, height: 44, borderRadius: 12, borderWidth: 2, borderColor: colors.borderInk, alignItems: 'center', justifyContent: 'center' },
    outlineBtn: { flex: 1, height: 44, borderRadius: 12, borderWidth: 2, borderColor: colors.borderInk, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 },
    outlineText: { fontFamily: fonts.bodyBold, fontSize: 13, color: colors.textStrong },
    inkBtn: { flex: 1, height: 44, borderRadius: 12, backgroundColor: colors.surfaceInverse, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 },
    inkText: { fontFamily: fonts.bodyBold, fontSize: 13, color: '#fff' },
    empty: { alignItems: 'center', marginTop: 60 },
});
