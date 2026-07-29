import { Image } from 'expo-image';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Bike, Check, Download, MapPin, Package, RotateCcw, Zap } from 'lucide-react-native';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Linking, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import ActionModal from '../../components/common/ActionModal';
import { AppHeader, ZButton, ZText } from '../../components/ui';
import { colors, fonts, palette, radius } from '../../constants/theme';
import { useOrder } from '../../context/OrderContext';
import { orderService } from '../../services/order';
import { OrderObject } from '../../types/types';
import { groupOrders } from '../../utils/orderGroups';

const money = (n: number) => `₹${Number(n).toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;

function parcelStatusMeta(status: string) {
    if (status === 'delivered') return { label: 'Delivered', color: palette.green500 };
    if (status === 'cancelled') return { label: 'Cancelled', color: palette.red500 };
    if (status === 'shipped') return { label: 'Out for delivery', color: palette.yellow600 };
    if (status === 'returned' || status === 'return_requested') return { label: 'Return', color: palette.yellow600 };
    return { label: status.charAt(0).toUpperCase() + status.slice(1), color: palette.yellow600 };
}

export default function OrderDetailsScreen() {
    const router = useRouter();
    const params = useLocalSearchParams();
    const groupKey = (Array.isArray(params.groupId) ? params.groupId[0] : params.groupId) as string | undefined;
    const legacyOrderId = (Array.isArray(params.orderId) ? params.orderId[0] : params.orderId) as string | undefined;
    const key = groupKey || legacyOrderId || '';
    const { getOrderById, orders, refreshOrders } = useOrder();

    const group = useMemo(() => groupOrders(orders).find(g => g.key === key), [orders, key]);
    const isMultiGroup = !!group && group.orders.length > 1;
    // For a single-parcel group the key may be a group_id (not an order id) — resolve the real order id to fetch.
    const singleId = group && !isMultiGroup ? group.orders[0].id : key;

    const [showInvoiceModal, setShowInvoiceModal] = useState(false);
    const [fetchedOrder, setFetchedOrder] = useState<OrderObject | null>(null);
    const [isFetching, setIsFetching] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    const fetchOrder = useCallback(async (silent = false) => {
        try {
            if (!silent) setIsFetching(true);
            const response = await orderService.getOrderById(singleId);
            const o = (response as any)?.data?.order || (response as any)?.data;
            if (o) {
                setFetchedOrder({
                    id: o.id, userId: o.userId, sellerId: o.sellerId || '', orderNumber: o.orderNumber,
                    groupId: o.groupId ?? null,
                    status: o.status, paymentStatus: o.paymentStatus,
                    totalAmount: Number(o.totalAmount || 0), shippingAmount: Number(o.shippingAmount || 0),
                    taxAmount: Number(o.taxAmount || 0), finalAmount: Number(o.finalAmount || 0),
                    shippingAddress: o.shippingAddress || {}, paymentMethod: o.paymentMethod || 'cod', paymentId: o.paymentId,
                    items: Array.isArray(o.items) ? o.items.map((item: any) => ({
                        orderItemId: item.orderItemId || item.id, productId: item.productId, productName: item.productName,
                        quantity: item.quantity, price: Number(item.price || 0), image: item.image || '', variant: item.variant,
                    })) : [],
                    estimatedDelivery: o.estimatedDelivery || '', trackingNumber: o.trackingNumber, notes: o.notes,
                    createdAt: o.createdAt, updatedAt: o.updatedAt,
                } as OrderObject);
            }
        } catch { /* fall back to cache */ } finally { if (!silent) setIsFetching(false); }
    }, [singleId]);

    useEffect(() => {
        if (isMultiGroup) { setIsFetching(false); return; }
        if (singleId) fetchOrder();
    }, [singleId, isMultiGroup, fetchOrder]);

    const onRefresh = async () => {
        setRefreshing(true);
        if (isMultiGroup) await refreshOrders(); else await fetchOrder(true);
        setRefreshing(false);
    };

    // ----- Multi-shipment group: one parcel per seller, each with its own status -----
    if (isMultiGroup && group) {
        const addr = (group.orders[0].shippingAddress || {}) as any;
        const subtotal = group.orders.reduce((s, o) => s + Number(o.totalAmount || 0), 0);
        const shipping = group.orders.reduce((s, o) => s + Number(o.shippingAmount || 0), 0);
        const tax = group.orders.reduce((s, o) => s + Number(o.taxAmount || 0), 0);
        const discount = Math.max(0, Number((subtotal + shipping + tax - group.total).toFixed(2)));
        const paymentMethod = group.orders[0].paymentMethod;

        return (
            <SafeAreaView style={styles.container} edges={['top']}>
                <AppHeader title="Order details" onBack={() => router.back()} />
                <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[palette.yellow500]} tintColor={palette.yellow500} />}>
                    <ZText variant="eyebrow" style={{ marginBottom: 12 }}>Order {group.groupNumber}</ZText>

                    <View style={styles.banner}>
                        <Zap size={90} color="rgba(255,196,0,0.12)" fill="rgba(255,196,0,0.12)" style={styles.bannerGlow} />
                        <View style={[styles.bannerIcon, { backgroundColor: palette.yellow600 }]}><Package size={22} color="#fff" /></View>
                        <View>
                            <Text style={styles.bannerTitle}>{group.orders.length} shipments</Text>
                            <Text style={styles.bannerSub}>From {group.orders.length} sellers · tracked separately</Text>
                        </View>
                    </View>

                    {group.orders.map((parcel, idx) => {
                        const meta = parcelStatusMeta(parcel.status);
                        const canCancel = ['pending', 'confirmed'].includes(parcel.status);
                        const canReturn = parcel.status === 'delivered';
                        const canTrack = !['cancelled', 'returned'].includes(parcel.status);
                        return (
                            <View key={parcel.id} style={styles.card}>
                                <View style={styles.parcelHead}>
                                    <ZText variant="eyebrow">Shipment {idx + 1} of {group.orders.length}</ZText>
                                    <View style={styles.parcelPill}>
                                        <View style={[styles.parcelDot, { backgroundColor: meta.color }]} />
                                        <Text style={[styles.parcelPillText, { color: meta.color }]}>{meta.label}</Text>
                                    </View>
                                </View>
                                {parcel.items.map((it, i) => (
                                    <View key={i} style={[styles.itemRow, styles.itemRowBorder]}>
                                        <Image source={it.image ? { uri: it.image as string } : require('../../assets/images/icon_backup.png')} style={styles.itemImg} contentFit="cover" />
                                        <View style={{ flex: 1 }}>
                                            <Text style={styles.itemName} numberOfLines={1}>{it.productName}</Text>
                                            <Text style={styles.itemVariant}>{it.variant ? `${it.variant} · ` : ''}Qty {it.quantity}</Text>
                                        </View>
                                        <Text style={styles.itemPrice}>{money(it.price)}</Text>
                                    </View>
                                ))}
                                <View style={styles.parcelActions}>
                                    {canTrack && (
                                        <Pressable style={styles.parcelTrack} onPress={() => router.push({ pathname: '/profile/track-order', params: { orderId: parcel.id } })}>
                                            <Bike size={15} color={colors.textOnYellow} />
                                            <Text style={styles.parcelTrackText}>Track</Text>
                                        </Pressable>
                                    )}
                                    {canCancel && (
                                        <Pressable style={styles.parcelOutline} onPress={() => router.push({ pathname: '/profile/cancel-order', params: { orderId: parcel.id } })}>
                                            <Text style={styles.parcelOutlineText}>Cancel</Text>
                                        </Pressable>
                                    )}
                                    {canReturn && (
                                        <Pressable style={styles.parcelOutline} onPress={() => router.push('/profile/returns')}>
                                            <RotateCcw size={15} color={colors.textStrong} />
                                            <Text style={styles.parcelOutlineText}>Return</Text>
                                        </Pressable>
                                    )}
                                </View>
                            </View>
                        );
                    })}

                    <View style={styles.addrCard}>
                        <View style={styles.addrIcon}><MapPin size={20} color={colors.textStrong} /></View>
                        <View style={{ flex: 1 }}>
                            <Text style={styles.addrName}>{addr.name || '—'}</Text>
                            <Text style={styles.addrLine}>{[addr.address_line1 || addr.address, addr.address_line2, addr.landmark, addr.city, addr.state, addr.pincode].filter(Boolean).join(', ') || 'Address not available'}</Text>
                        </View>
                    </View>

                    <View style={styles.card}>
                        <ZText variant="eyebrow" style={{ marginBottom: 14 }}>Bill details</ZText>
                        <BillRow label="Subtotal" value={money(subtotal)} />
                        <BillRow label="Delivery" value={shipping === 0 ? 'FREE' : money(shipping)} mono={shipping === 0} />
                        {tax > 0 && <BillRow label="Tax (GST)" value={money(tax)} />}
                        {discount > 0 && <BillRow label="Coupon" value={`−${money(discount)}`} red />}
                        <View style={styles.billTotal}>
                            <Text style={styles.payLabel}>Paid · {paymentMethod === 'cod' ? 'COD' : paymentMethod === 'razorpay' ? 'UPI' : paymentMethod}</Text>
                            <Text style={styles.payValue}>{money(group.total)}</Text>
                        </View>
                    </View>

                    <View style={styles.actions}>
                        <Pressable style={styles.yellowBtn} onPress={() => setShowInvoiceModal(true)}>
                            <Download size={17} color={colors.textOnYellow} />
                            <Text style={styles.yellowText}>Invoice</Text>
                        </Pressable>
                    </View>
                    <View style={{ height: 30 }} />
                </ScrollView>
                <ActionModal visible={showInvoiceModal} title="Invoice Download" message="Invoice will be downloaded to your device." icon="file-text" primaryButtonText="OK" onPrimaryPress={() => setShowInvoiceModal(false)} onClose={() => setShowInvoiceModal(false)} />
            </SafeAreaView>
        );
    }

    // ----- Single-shipment order (legacy or single-seller): unchanged layout -----
    const order = fetchedOrder ?? getOrderById(singleId);
    const isInstantDelivery = order?.notes === 'instant_delivery';

    let couponCode: string | undefined;
    let noteCouponDiscount = 0;
    if (order?.notes && typeof order.notes === 'string') {
        try { const p = JSON.parse(order.notes); couponCode = p?.couponCode; noteCouponDiscount = Number(p?.couponDiscount || 0); } catch { }
    }

    const itemsTotal = Number(order?.totalAmount || 0);
    const gstAmount = Number(order?.taxAmount || 0);
    const shippingFee = Number(order?.shippingAmount || 0);
    const instantTrialFee = isInstantDelivery ? 50 : 0;
    const preDiscountTotal = itemsTotal + shippingFee + gstAmount + instantTrialFee;
    const inferredCouponDiscount = Math.max(0, Number((preDiscountTotal - Number(order?.finalAmount || 0)).toFixed(2)));
    const couponDiscount = Math.max(noteCouponDiscount, inferredCouponDiscount);

    // Instant+COD prepays only the delivery fee online (payment_status 'partial'),
    // so what the courier actually collects is final_amount − prepaid_amount.
    const prepaidAmount = Number(order?.prepaidAmount || 0);
    const dueAtDoor = Math.max(0, Number(order?.finalAmount || 0) - prepaidAmount);

    const canCancel = order && ['pending', 'confirmed'].includes(order.status);
    const canReturn = order && order.status === 'delivered';

    if (isFetching && !order) {
        return (
            <SafeAreaView style={styles.container} edges={['top']}>
                <AppHeader title="Order details" onBack={() => router.back()} />
                <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}><ActivityIndicator size="large" color={palette.yellow500} /></View>
            </SafeAreaView>
        );
    }
    if (!order) {
        return (
            <SafeAreaView style={styles.container} edges={['top']}>
                <AppHeader title="Order not found" onBack={() => router.back()} />
                <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}><ZText variant="muted">Order details not available.</ZText></View>
            </SafeAreaView>
        );
    }

    const delivered = order.status === 'delivered';
    const cancelled = order.status === 'cancelled';
    const statusLabel = delivered ? 'Delivered' : cancelled ? 'Cancelled' : order.status.charAt(0).toUpperCase() + order.status.slice(1);
    const statusColor = delivered ? palette.green500 : cancelled ? palette.red500 : palette.yellow600;
    const addr = order.shippingAddress || ({} as any);

    return (
        <SafeAreaView style={styles.container} edges={['top']}>
            <AppHeader title="Order details" onBack={() => router.back()} />
            <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[palette.yellow500]} tintColor={palette.yellow500} />}>
                <ZText variant="eyebrow" style={{ marginBottom: 12 }}>Order {order.orderNumber}</ZText>

                {/* Status banner */}
                <View style={styles.banner}>
                    <Zap size={90} color="rgba(255,196,0,0.12)" fill="rgba(255,196,0,0.12)" style={styles.bannerGlow} />
                    <View style={[styles.bannerIcon, { backgroundColor: statusColor }]}>
                        {delivered ? <Check size={24} color="#fff" /> : <Bike size={22} color="#fff" />}
                    </View>
                    <View>
                        <Text style={styles.bannerTitle}>{statusLabel}</Text>
                        <Text style={styles.bannerSub}>{isInstantDelivery ? 'Try-at-Door · Instant' : 'Standard delivery'}{order.estimatedDelivery ? ` · by ${order.estimatedDelivery}` : ''}</Text>
                    </View>
                </View>

                {/* Items */}
                <View style={styles.card}>
                    <ZText variant="eyebrow" style={{ marginBottom: 14 }}>{order.items.length} item{order.items.length !== 1 ? 's' : ''}</ZText>
                    {order.items.map((it, i) => (
                        <View key={i} style={[styles.itemRow, i > 0 && styles.itemRowBorder]}>
                            <Image source={it.image ? { uri: it.image as string } : require('../../assets/images/icon_backup.png')} style={styles.itemImg} contentFit="cover" />
                            <View style={{ flex: 1 }}>
                                <Text style={styles.itemName} numberOfLines={1}>{it.productName}</Text>
                                <Text style={styles.itemVariant}>{it.variant ? `${it.variant} · ` : ''}Qty {it.quantity}</Text>
                            </View>
                            <Text style={styles.itemPrice}>{money(it.price)}</Text>
                        </View>
                    ))}
                </View>

                {/* Address */}
                <View style={styles.addrCard}>
                    <View style={styles.addrIcon}><MapPin size={20} color={colors.textStrong} /></View>
                    <View style={{ flex: 1 }}>
                        <Text style={styles.addrName}>{addr.name || '—'}</Text>
                        <Text style={styles.addrLine}>{[addr.address_line1 || addr.address, addr.address_line2, addr.landmark, addr.city, addr.state, addr.pincode].filter(Boolean).join(', ') || 'Address not available'}</Text>
                    </View>
                </View>

                {/* Bill */}
                <View style={styles.card}>
                    <ZText variant="eyebrow" style={{ marginBottom: 14 }}>Bill details</ZText>
                    <BillRow label="Subtotal" value={money(itemsTotal || order.finalAmount)} />
                    {instantTrialFee > 0 && <BillRow label="Instant trial fee" value={money(instantTrialFee)} />}
                    <BillRow label="Delivery" value={shippingFee === 0 ? 'FREE' : money(shippingFee)} mono={shippingFee === 0} />
                    {gstAmount > 0 && <BillRow label="Tax (GST)" value={money(gstAmount)} />}
                    {couponDiscount > 0 && <BillRow label={couponCode ? `Coupon ${couponCode}` : 'Coupon'} value={`−${money(couponDiscount)}`} red />}
                    <View style={styles.billTotal}>
                        <Text style={styles.payLabel}>Paid · {order.paymentMethod === 'cod' ? 'COD' : order.paymentMethod === 'razorpay' ? 'UPI' : order.paymentMethod}</Text>
                        <Text style={styles.payValue}>{money(order.finalAmount)}</Text>
                    </View>
                </View>

                {/* Cash-on-delivery: what is still due at the door, and the change warning. */}
                {order.paymentMethod === 'cod' && !cancelled && order.status !== 'returned' && (
                    <View style={styles.card}>
                        <ZText variant="eyebrow" style={{ marginBottom: 14 }}>Due at your door</ZText>
                        {prepaidAmount > 0 && <BillRow label="Already paid online" value={`−${money(prepaidAmount)}`} red />}
                        <View style={styles.billTotal}>
                            <Text style={styles.payLabel}>To pay on delivery</Text>
                            <Text style={styles.payValue}>{money(dueAtDoor)}</Text>
                        </View>
                        <Text style={styles.codNoteText}>
                            If paying by cash, please keep exact change — the delivery partner cannot provide change. You can also scan the partner&apos;s UPI QR at the door.
                        </Text>
                    </View>
                )}

                <View style={styles.actions}>
                    {canReturn && (
                        <Pressable style={styles.outlineBtn} onPress={() => router.push('/profile/returns')}>
                            <RotateCcw size={17} color={colors.textStrong} />
                            <Text style={styles.outlineText}>Return items</Text>
                        </Pressable>
                    )}
                    <Pressable style={styles.yellowBtn} onPress={() => setShowInvoiceModal(true)}>
                        <Download size={17} color={colors.textOnYellow} />
                        <Text style={styles.yellowText}>Invoice</Text>
                    </Pressable>
                </View>

                {!cancelled && order.status !== 'returned' && (
                    <ZButton label="Track order" style={{ marginTop: 12 }} onPress={() => router.push({ pathname: '/profile/track-order', params: { orderId: order.id } })} />
                )}
                {canCancel && (
                    <ZButton label="Cancel order" variant="outline" style={{ marginTop: 12 }} onPress={() => router.push({ pathname: '/profile/cancel-order', params: { orderId: order.id } })} />
                )}
                {['processing', 'shipped'].includes(order.status) && (
                    <ZButton label="Contact delivery partner" variant="light" style={{ marginTop: 12 }} onPress={() => Linking.openURL('tel:+919876543210')} />
                )}
                <View style={{ height: 30 }} />
            </ScrollView>

            <ActionModal visible={showInvoiceModal} title="Invoice Download" message="Invoice will be downloaded to your device." icon="file-text" primaryButtonText="OK" onPrimaryPress={() => setShowInvoiceModal(false)} onClose={() => setShowInvoiceModal(false)} />
        </SafeAreaView>
    );
}

function BillRow({ label, value, mono, red }: { label: string; value: string; mono?: boolean; red?: boolean }) {
    return (
        <View style={styles.billRow}>
            <Text style={[styles.billLabel, red && { color: palette.red500 }]}>{label}</Text>
            <Text style={[mono ? styles.billMono : styles.billValue, red && { color: palette.red500 }]}>{value}</Text>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: palette.paperWarm },
    content: { padding: 20, paddingTop: 4 },
    banner: { backgroundColor: colors.surfaceInverse, borderRadius: radius.lg, padding: 16, flexDirection: 'row', alignItems: 'center', gap: 13, marginBottom: 16, overflow: 'hidden' },
    bannerGlow: { position: 'absolute', right: -14, top: -16 },
    bannerIcon: { width: 44, height: 44, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
    bannerTitle: { fontFamily: fonts.displaySemiBold, fontSize: 16, color: '#fff' },
    bannerSub: { fontFamily: fonts.bodyRegular, fontSize: 12, color: palette.neutral300, marginTop: 1 },

    card: { backgroundColor: colors.surfaceCard, borderWidth: 1, borderColor: palette.neutral200, borderRadius: radius.lg, padding: 16, marginBottom: 16 },
    itemRow: { flexDirection: 'row', alignItems: 'center', gap: 13, paddingTop: 14, marginTop: -14 },
    itemRowBorder: { borderTopWidth: 1, borderTopColor: palette.neutral100, paddingTop: 14, marginTop: 0 },
    itemImg: { width: 56, height: 66, borderRadius: 11, backgroundColor: colors.surfaceSunken },
    itemName: { fontFamily: fonts.bodySemiBold, fontSize: 14, color: colors.textStrong },
    itemVariant: { fontFamily: fonts.bodyRegular, fontSize: 12, color: colors.textFaint, marginTop: 2 },
    itemPrice: { fontFamily: fonts.displaySemiBold, fontSize: 16, color: colors.textStrong },

    parcelHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 },
    parcelPill: { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: colors.surfaceSunken, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 100 },
    parcelDot: { width: 6, height: 6, borderRadius: 3 },
    parcelPillText: { fontFamily: fonts.monoBold, fontSize: 9, letterSpacing: 0.4 },
    parcelActions: { flexDirection: 'row', gap: 10, marginTop: 14 },
    parcelTrack: { flex: 1, height: 42, borderRadius: 12, backgroundColor: palette.yellow500, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 },
    parcelTrackText: { fontFamily: fonts.bodyBlack, fontSize: 13, color: colors.textOnYellow },
    parcelOutline: { flex: 1, height: 42, borderRadius: 12, borderWidth: 2, borderColor: colors.borderInk, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 },
    parcelOutlineText: { fontFamily: fonts.bodyBold, fontSize: 13, color: colors.textStrong },

    addrCard: { flexDirection: 'row', gap: 13, backgroundColor: colors.surfaceCard, borderWidth: 1, borderColor: palette.neutral200, borderRadius: 18, padding: 14, marginBottom: 16 },
    addrIcon: { width: 42, height: 42, borderRadius: 12, backgroundColor: colors.surfaceSunken, alignItems: 'center', justifyContent: 'center' },
    addrName: { fontFamily: fonts.displaySemiBold, fontSize: 14, color: colors.textStrong, marginBottom: 3 },
    addrLine: { fontFamily: fonts.bodyRegular, fontSize: 12, lineHeight: 18, color: colors.textFaint },

    billRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10 },
    billLabel: { fontFamily: fonts.bodyRegular, fontSize: 14, color: colors.textBody },
    billValue: { fontFamily: fonts.displaySemiBold, fontSize: 14, color: colors.textStrong },
    billMono: { fontFamily: fonts.monoBold, fontSize: 12, color: palette.green500 },
    billTotal: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', borderTopWidth: 1, borderTopColor: colors.borderSubtle, borderStyle: 'dashed', paddingTop: 12, marginTop: 2 },
    payLabel: { fontFamily: fonts.displaySemiBold, fontSize: 15, color: colors.textStrong },
    codNoteText: { fontFamily: fonts.bodyRegular, fontSize: 12, lineHeight: 17, color: colors.textBody, marginTop: 12 },
    payValue: { fontFamily: fonts.displayBold, fontSize: 20, color: colors.textStrong },

    actions: { flexDirection: 'row', gap: 10 },
    outlineBtn: { flex: 1, height: 50, borderRadius: radius.md, borderWidth: 2, borderColor: colors.borderInk, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 },
    outlineText: { fontFamily: fonts.bodyBold, fontSize: 13, color: colors.textStrong },
    yellowBtn: { flex: 1, height: 50, borderRadius: radius.md, backgroundColor: palette.yellow500, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 },
    yellowText: { fontFamily: fonts.bodyBlack, fontSize: 13, color: colors.textOnYellow },
});
