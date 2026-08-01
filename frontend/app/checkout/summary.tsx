import ActionModal from '@/components/common/ActionModal';
import { useAddress } from '@/context/AddressContext';
import { useCart } from '@/context/CartContext';
import { useCheckout } from '@/context/CheckoutContext';
import { useRouter } from 'expo-router';
import { ArrowRight, Check, MapPin, Receipt, Ticket, Zap } from 'lucide-react-native';
import React, { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useExitGuard } from '../../hooks/useExitGuard';
import { AppHeader, CheckoutSteps, ZButton, ZText } from '../../components/ui';
import { colors, fonts, palette, radius, shadow } from '../../constants/theme';

export default function CheckoutSummaryScreen() {
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const { addresses } = useAddress();
    const { cartItems, totalPrice, totalSavings, appliedCoupon, couponDiscount, applyCoupon, removeCoupon } = useCart();
    const { selectedAddressId, deliveryType, setDeliveryType, setLastStep } = useCheckout();

    React.useEffect(() => { setLastStep(2); }, []);

    const selectedAddress = addresses.find(a => a.id === selectedAddressId);
    const [couponCode, setCouponCode] = useState('');
    // An applied coupon is the one thing on this screen a user would hate to
    // silently re-enter, so only guard once there is something to lose.
    useExitGuard({
        enabled: !!appliedCoupon,
        title: 'Go back?',
        message: 'Your applied coupon stays on the cart, but you will need to return here to place the order.',
        discardLabel: 'Go back',
    });
    const [modalVisible, setModalVisible] = useState(false);
    const [modalConfig, setModalConfig] = useState({ title: '', message: '', icon: 'check-circle' as any });

    // Fee logic — must match backend (orders.ts) and payment.tsx
    const instantTrialFee = 50.0;
    const shippingFee = totalPrice > 999 ? 0 : 49; // free-delivery threshold — must match server (orders.ts) + cart bar
    const gst = Math.round(totalPrice * 0.18);
    const isInstant = deliveryType === 'Instant';
    const deliveryFee = isInstant ? instantTrialFee : 0;
    const finalTotal = totalPrice + shippingFee + deliveryFee + gst - couponDiscount;

    const money = (n: number) => `₹${n.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

    const handleApplyCoupon = async () => {
        if (!couponCode.trim()) return;
        const result = await applyCoupon(couponCode);
        setModalConfig({
            title: result.success ? 'Coupon Applied!' : 'Invalid Coupon',
            message: result.message,
            icon: result.success ? 'check-circle' : 'alert-circle',
        });
        setModalVisible(true);
        setCouponCode('');
    };

    const handleConfirmOrder = () => {
        if (!selectedAddressId) {
            setModalConfig({ title: 'No Address', message: 'Please select a delivery address first.', icon: 'alert-circle' });
            setModalVisible(true);
            return;
        }
        router.push('/checkout/payment');
    };

    return (
        <SafeAreaView style={styles.container} edges={['top']}>
            <AppHeader title="Checkout" onBack={() => router.back()} />
            <CheckoutSteps step={2} />

            <ScrollView style={{ flex: 1 }} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
                {/* Address mini */}
                <Pressable style={styles.addrCard} onPress={() => router.push('/checkout/address')}>
                    <View style={styles.addrIcon}><MapPin size={20} color={palette.yellow500} /></View>
                    <View style={{ flex: 1, minWidth: 0 }}>
                        <Text style={styles.addrName}>{selectedAddress ? `${selectedAddress.name} · ${selectedAddress.label || 'Home'}` : 'No address selected'}</Text>
                        {selectedAddress ? <Text style={styles.addrLine} numberOfLines={1}>{selectedAddress.address}, {selectedAddress.city}</Text> : null}
                    </View>
                    <Text style={styles.change}>CHANGE</Text>
                </Pressable>

                {/* Delivery method */}
                <View style={styles.eyebrowRow}>
                    <Zap size={13} color={palette.yellow500} fill={palette.yellow500} />
                    <ZText variant="eyebrow" color={colors.textMuted}>Delivery method</ZText>
                </View>

                <Pressable style={styles.deliveryDark} onPress={() => setDeliveryType('Instant')}>
                    <Zap size={90} color="rgba(255,196,0,0.12)" fill="rgba(255,196,0,0.12)" style={styles.deliveryGlow} />
                    <View style={styles.deliveryDarkHead}>
                        <Text style={styles.deliveryDarkTitle}>Try-at-Door · Instant</Text>
                        <View style={[styles.radioSmall, isInstant && styles.radioSmallOn]}>
                            {isInstant && <Check size={13} color={colors.textOnYellow} />}
                        </View>
                    </View>
                    <Text style={styles.deliveryEta}>EST. DELIVERY WITHIN 12 HRS</Text>
                    <Text style={styles.deliveryDesc}>Try items for <Text style={{ fontFamily: fonts.bodyBold, color: '#fff' }}>15 min</Text> at the door. Keep what fits, hand back the rest. Trial fee is non-refundable.</Text>
                </Pressable>

                <Pressable style={styles.deliveryStd} onPress={() => setDeliveryType('Standard')}>
                    <View>
                        <Text style={styles.stdTitle}>Standard delivery</Text>
                        <Text style={styles.stdSub}>Est. delivery within 12 hrs</Text>
                    </View>
                    <View style={[styles.radioSmall, styles.radioLight, !isInstant && styles.radioSmallOnInk]}>
                        {!isInstant && <Check size={13} color={palette.yellow500} />}
                    </View>
                </Pressable>

                {/* Coupon */}
                <View style={[styles.eyebrowRow, { marginTop: 20 }]}>
                    <Ticket size={14} color={palette.yellow500} />
                    <ZText variant="eyebrow" color={colors.textMuted}>{appliedCoupon ? 'Coupon applied' : 'Have a coupon?'}</ZText>
                </View>

                {appliedCoupon ? (
                    <View style={styles.couponTicket}>
                        <View>
                            <Text style={styles.couponCode}>{appliedCoupon.code}</Text>
                            <Text style={styles.couponDesc} numberOfLines={1}>{appliedCoupon.description} · −{money(couponDiscount)}</Text>
                        </View>
                        <Text style={styles.couponRemove} onPress={removeCoupon}>REMOVE</Text>
                    </View>
                ) : (
                    <View style={styles.couponInputRow}>
                        <TextInput
                            style={styles.couponInput}
                            placeholder="Enter coupon code"
                            placeholderTextColor={colors.textFaint}
                            value={couponCode}
                            onChangeText={setCouponCode}
                            autoCapitalize="characters"
                        />
                        <Pressable style={[styles.applyBtn, !couponCode && { opacity: 0.5 }]} onPress={handleApplyCoupon} disabled={!couponCode}>
                            <Text style={styles.applyText}>APPLY</Text>
                        </Pressable>
                    </View>
                )}

                {/* Bill */}
                <View style={[styles.eyebrowRow, { marginTop: 20 }]}>
                    <Receipt size={14} color={palette.yellow500} />
                    <ZText variant="eyebrow" color={colors.textMuted}>Bill details</ZText>
                </View>
                <View style={styles.billCard}>
                    <BillRow label={`Subtotal (${cartItems.length} items)`} value={money(totalPrice)} />
                    <BillRow label="Delivery" value={shippingFee === 0 ? 'FREE' : money(shippingFee)} mono={shippingFee === 0} />
                    {isInstant && <BillRow label="Instant trial fee" value={money(instantTrialFee)} />}
                    <BillRow label="Tax (GST 18%)" value={money(gst)} />
                    {appliedCoupon && <BillRow label={`Coupon ${appliedCoupon.code}`} value={`−${money(couponDiscount)}`} red />}
                    <View style={styles.billTotal}>
                        <Text style={styles.payLabel}>To pay</Text>
                        <Text style={styles.payValue}>{money(finalTotal)}</Text>
                    </View>
                </View>
            </ScrollView>

            <View style={[styles.footer, { paddingBottom: 14 + insets.bottom }]}>
                <View>
                    <ZText variant="eyebrow" color={colors.textMuted} style={{ marginBottom: 2 }}>You save {money(totalSavings + couponDiscount)}</ZText>
                    <Text style={styles.footerTotal}>{money(finalTotal)}</Text>
                </View>
                <ZButton label="Payment" icon={ArrowRight} onPress={handleConfirmOrder} style={{ flex: 1 }} />
            </View>

            <ActionModal visible={modalVisible} title={modalConfig.title} message={modalConfig.message} icon={modalConfig.icon} primaryButtonText="OK" onPrimaryPress={() => setModalVisible(false)} onClose={() => setModalVisible(false)} />
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
    content: { padding: 20, paddingTop: 4, paddingBottom: 24 },
    eyebrowRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 12 },

    addrCard: { flexDirection: 'row', alignItems: 'center', gap: 13, backgroundColor: colors.surfaceCard, borderWidth: 1, borderColor: palette.neutral200, borderRadius: 18, padding: 14, marginBottom: 18 },
    addrIcon: { width: 42, height: 42, borderRadius: 12, backgroundColor: colors.surfaceInverse, alignItems: 'center', justifyContent: 'center' },
    addrName: { fontFamily: fonts.displaySemiBold, fontSize: 14, color: colors.textStrong },
    addrLine: { fontFamily: fonts.bodyRegular, fontSize: 12, color: colors.textFaint, marginTop: 1 },
    change: { fontFamily: fonts.monoBold, fontSize: 11, letterSpacing: 0.4, color: colors.textStrong },

    deliveryDark: { backgroundColor: colors.surfaceInverse, borderRadius: radius.lg, padding: 16, marginBottom: 12, overflow: 'hidden' },
    deliveryGlow: { position: 'absolute', right: -14, top: -16 },
    deliveryDarkHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
    deliveryDarkTitle: { fontFamily: fonts.displaySemiBold, fontSize: 16, color: '#fff' },
    deliveryEta: { fontFamily: fonts.monoBold, fontSize: 10, letterSpacing: 0.6, color: palette.yellow300, marginBottom: 10 },
    deliveryDesc: { fontFamily: fonts.bodyRegular, fontSize: 12, lineHeight: 17, color: palette.neutral300 },
    radioSmall: { width: 22, height: 22, borderRadius: 11, borderWidth: 2, borderColor: 'rgba(255,255,255,0.4)', alignItems: 'center', justifyContent: 'center' },
    radioSmallOn: { backgroundColor: palette.yellow500, borderWidth: 0 },
    radioLight: { borderColor: colors.borderSubtle },
    radioSmallOnInk: { backgroundColor: colors.surfaceInverse, borderWidth: 0 },

    deliveryStd: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: colors.surfaceCard, borderWidth: 1, borderColor: palette.neutral200, borderRadius: radius.md, padding: 14 },
    stdTitle: { fontFamily: fonts.displaySemiBold, fontSize: 14, color: colors.textStrong },
    stdSub: { fontFamily: fonts.bodyRegular, fontSize: 11, color: colors.textFaint, marginTop: 1 },

    couponTicket: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: palette.yellow500, borderRadius: radius.md, paddingVertical: 15, paddingHorizontal: 18 },
    couponCode: { fontFamily: fonts.displayBold, fontSize: 18, color: colors.textOnYellow },
    couponDesc: { fontFamily: fonts.bodySemiBold, fontSize: 11, color: palette.yellow800, marginTop: 1 },
    couponRemove: { fontFamily: fonts.monoBold, fontSize: 12, letterSpacing: 0.4, color: palette.red500 },
    couponInputRow: { flexDirection: 'row', gap: 10 },
    couponInput: { flex: 1, backgroundColor: colors.surfaceCard, borderWidth: 1.5, borderColor: colors.borderSubtle, borderRadius: radius.md, paddingHorizontal: 16, height: 50, fontFamily: fonts.bodyBold, fontSize: 15, color: colors.textStrong },
    applyBtn: { backgroundColor: colors.surfaceInverse, borderRadius: radius.md, paddingHorizontal: 22, height: 50, alignItems: 'center', justifyContent: 'center' },
    applyText: { fontFamily: fonts.bodyBold, fontSize: 13, color: colors.textInvert },

    billCard: { backgroundColor: colors.surfaceCard, borderWidth: 1, borderColor: palette.neutral200, borderRadius: 18, padding: 16 },
    billRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 11 },
    billLabel: { fontFamily: fonts.bodyRegular, fontSize: 14, color: colors.textBody },
    billValue: { fontFamily: fonts.displaySemiBold, fontSize: 14, color: colors.textStrong },
    billMono: { fontFamily: fonts.monoBold, fontSize: 12, letterSpacing: 0.4, color: colors.textStrong },
    billTotal: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', borderTopWidth: 1, borderTopColor: colors.borderSubtle, borderStyle: 'dashed', paddingTop: 12, marginTop: 1 },
    payLabel: { fontFamily: fonts.displaySemiBold, fontSize: 15, color: colors.textStrong },
    payValue: { fontFamily: fonts.displayBold, fontSize: 20, color: colors.textStrong },

    footer: { flexDirection: 'row', alignItems: 'center', gap: 14, backgroundColor: colors.surfaceCard, borderTopWidth: 1, borderTopColor: colors.surfaceSunken, paddingHorizontal: 20, paddingTop: 14, ...shadow.sheet },
    footerTotal: { fontFamily: fonts.displayBold, fontSize: 22, color: colors.textStrong },
});
