import { Image } from 'expo-image';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Bike, Check, Download, MapPin, RotateCcw, Zap } from 'lucide-react-native';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Linking, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import ActionModal from '../../components/common/ActionModal';
import { AppHeader, ZButton, ZText } from '../../components/ui';
import { colors, fonts, palette, radius } from '../../constants/theme';
import { useOrder } from '../../context/OrderContext';
import { orderService } from '../../services/order';
import { OrderObject } from '../../types/types';

export default function OrderDetailsScreen() {
    const router = useRouter();
    const { orderId } = useLocalSearchParams();
    const { getOrderById } = useOrder();
    const [showInvoiceModal, setShowInvoiceModal] = useState(false);
    const [fetchedOrder, setFetchedOrder] = useState<OrderObject | null>(null);
    const [isFetching, setIsFetching] = useState(true);

    useEffect(() => {
        const fetchOrder = async () => {
            try {
                setIsFetching(true);
                const response = await orderService.getOrderById(orderId as string);
                const o = (response as any)?.data?.order || (response as any)?.data;
                if (o) {
                    setFetchedOrder({
                        id: o.id, userId: o.userId, sellerId: o.sellerId || '', orderNumber: o.orderNumber,
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
            } catch { /* fall back to cache */ } finally { setIsFetching(false); }
        };
        if (orderId) fetchOrder();
    }, [orderId]);

    const order = fetchedOrder ?? getOrderById(orderId as string);
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

    const canCancel = order && ['pending', 'confirmed'].includes(order.status);
    const canReturn = order && order.status === 'delivered';
    const money = (n: number) => `₹${Number(n).toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;

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
            <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
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
                        <Text style={styles.addrLine}>{[addr.address, addr.city, addr.state, addr.pincode].filter(Boolean).join(', ') || 'Address not available'}</Text>
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
    payValue: { fontFamily: fonts.displayBold, fontSize: 20, color: colors.textStrong },

    actions: { flexDirection: 'row', gap: 10 },
    outlineBtn: { flex: 1, height: 50, borderRadius: radius.md, borderWidth: 2, borderColor: colors.borderInk, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 },
    outlineText: { fontFamily: fonts.bodyBold, fontSize: 13, color: colors.textStrong },
    yellowBtn: { flex: 1, height: 50, borderRadius: radius.md, backgroundColor: palette.yellow500, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 },
    yellowText: { fontFamily: fonts.bodyBlack, fontSize: 13, color: colors.textOnYellow },
});
