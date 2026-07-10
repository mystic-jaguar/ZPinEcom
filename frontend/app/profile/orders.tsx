import { Image } from 'expo-image';
import { useFocusEffect } from '@react-navigation/native';
import { useRouter } from 'expo-router';
import { Bike, Headphones, HelpCircle, Repeat, RotateCcw } from 'lucide-react-native';
import React, { useCallback, useMemo, useState } from 'react';
import { FlatList, Pressable, RefreshControl, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AppHeader, ZText } from '../../components/ui';
import { colors, fonts, palette, radius } from '../../constants/theme';
import { useOrder } from '../../context/OrderContext';

const FILTERS = ['All', 'In Progress', 'Completed', 'Cancelled'];

function statusMeta(status: string) {
    if (status === 'delivered') return { label: 'DELIVERED', bg: palette.green50, fg: palette.green500, dot: null };
    if (status === 'cancelled') return { label: 'CANCELLED', bg: '#F7E3E2', fg: palette.red500, dot: null };
    if (status === 'shipped') return { label: 'OUT FOR DELIVERY', bg: palette.yellow100, fg: palette.yellow800, dot: palette.yellow600 };
    return { label: 'IN PROGRESS', bg: palette.yellow100, fg: palette.yellow800, dot: palette.yellow600 };
}

export default function AllOrdersScreen() {
    const router = useRouter();
    const { orders, refreshOrders } = useOrder();
    const [activeFilter, setActiveFilter] = useState('All');
    const [refreshing, setRefreshing] = useState(false);

    useFocusEffect(useCallback(() => { refreshOrders(); }, []));

    const onRefresh = async () => {
        setRefreshing(true);
        await refreshOrders();
        setRefreshing(false);
    };

    const filteredOrders = useMemo(() => orders.filter((order) => {
        if (activeFilter === 'All') return true;
        if (activeFilter === 'In Progress') return ['pending', 'processing', 'shipped', 'confirmed'].includes(order.status);
        if (activeFilter === 'Completed') return order.status === 'delivered';
        if (activeFilter === 'Cancelled') return order.status === 'cancelled';
        return true;
    }), [activeFilter, orders]);

    const renderItem = ({ item }: { item: any }) => {
        const meta = statusMeta(item.status);
        const items = item.items || [];
        const thumbs = items.slice(0, 2);
        const extra = items.length - thumbs.length;
        const inProgress = ['pending', 'processing', 'shipped', 'confirmed'].includes(item.status);
        const delivered = item.status === 'delivered';
        const cancelled = item.status === 'cancelled';
        const dateLabel = new Date(item.createdAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });

        return (
            <Pressable style={styles.card} onPress={() => router.push({ pathname: '/profile/order-details', params: { orderId: item.id } })}>
                <View style={styles.cardHead}>
                    <View>
                        <Text style={styles.orderNo}>{item.orderNumber}</Text>
                        <Text style={styles.placed}>{delivered ? `Delivered ${dateLabel}` : cancelled ? `Cancelled ${dateLabel}` : `Placed ${dateLabel}`}</Text>
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
                        <Text style={styles.total}>₹{Number(item.finalAmount).toLocaleString('en-IN')}</Text>
                    </View>
                </View>

                {cancelled ? null : (
                    <View style={styles.actions}>
                        {inProgress ? (
                            <>
                                <Pressable style={styles.primaryBtn} onPress={() => router.push({ pathname: '/profile/track-order', params: { orderId: item.id } })}>
                                    <Bike size={16} color={colors.textOnYellow} />
                                    <Text style={styles.primaryText}>Track order</Text>
                                </Pressable>
                                <Pressable style={styles.iconBtn} onPress={() => router.push('/profile/help-center')}>
                                    <Headphones size={18} color={colors.textStrong} />
                                </Pressable>
                            </>
                        ) : (
                            <>
                                <Pressable style={styles.outlineBtn} onPress={() => router.push('/profile/returns')}>
                                    <RotateCcw size={16} color={colors.textStrong} />
                                    <Text style={styles.outlineText}>Return</Text>
                                </Pressable>
                                <Pressable style={styles.inkBtn} onPress={() => items[0] && router.push(`/product/${items[0].productId}`)}>
                                    <Repeat size={16} color="#fff" />
                                    <Text style={styles.inkText}>Buy again</Text>
                                </Pressable>
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
                data={filteredOrders}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[palette.yellow500]} tintColor={palette.yellow500} />}
                renderItem={renderItem}
                keyExtractor={(item) => item.id}
                contentContainerStyle={styles.list}
                showsVerticalScrollIndicator={false}
                ListEmptyComponent={<View style={styles.empty}><ZText variant="muted">No orders found</ZText></View>}
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
