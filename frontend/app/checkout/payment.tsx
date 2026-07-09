import ActionModal from '@/components/common/ActionModal';
import { Colors } from '@/constants/Colors';
import { WALLET_ENABLED } from '@/constants/features';
import { useCart } from '@/context/CartContext';
import { useCheckout } from '@/context/CheckoutContext';
import { useOrder } from '@/context/OrderContext';
import { useUser } from '@/context/UserContext';
import { useFocusEffect } from '@react-navigation/native';
import { useRouter } from 'expo-router';
import { Banknote, Check, Landmark, Lock, LucideIcon, Smartphone, Wallet } from 'lucide-react-native';
import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import RazorpayCheckout from 'react-native-razorpay';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { AppHeader, CheckoutSteps, ZText } from '../../components/ui';
import { colors, fonts, palette, radius, shadow } from '../../constants/theme';
import { orderService } from '../../services/order';
import { paymentService } from '../../services/payment';
import { walletService } from '../../services/wallet';

export default function CheckoutPaymentScreen() {
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const { selectedPaymentMethod, setSelectedPaymentMethod, deliveryType, selectedAddressId } = useCheckout();
    const { totalPrice, cartItems, clearCart, couponDiscount, appliedCoupon } = useCart();
    const { addOrder, refreshOrders } = useOrder();
    const { user } = useUser();
    const [showSuccessModal, setShowSuccessModal] = useState(false);
    const [orderError, setOrderError] = useState<string | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [walletBalance, setWalletBalance] = useState<number | null>(null);
    const [confirmedFinalAmount, setConfirmedFinalAmount] = useState<number | null>(null);

    useEffect(() => {
        if (!WALLET_ENABLED) return;
        walletService.getWallet().then(data => setWalletBalance(data.balance)).catch(() => setWalletBalance(0));
    }, []);

    const hasRedirectedRef = React.useRef(false);
    useFocusEffect(
        useCallback(() => {
            if (cartItems.length === 0 && !showSuccessModal && !hasRedirectedRef.current) {
                hasRedirectedRef.current = true;
                router.replace('/(tabs)/cart');
            }
        }, [cartItems.length, showSuccessModal])
    );

    const isInstant = deliveryType === 'Instant';
    const deliveryFee = isInstant ? 50.0 : 0;
    const taxAmount = Math.round(totalPrice * 0.18);
    const shippingAmount = totalPrice > 500 ? 0 : 49;
    const estimatedTotal = totalPrice + shippingAmount + taxAmount + deliveryFee - couponDiscount;
    const finalTotal = confirmedFinalAmount ?? estimatedTotal;

    const handleConfirm = async () => {
        if (cartItems.length === 0 || !selectedAddressId || isSubmitting) return;
        if (!selectedPaymentMethod) {
            setOrderError('Please select a payment method to continue.');
            return;
        }
        if (selectedPaymentMethod === 'wallet') {
            if (walletBalance === null || walletBalance < finalTotal) {
                setOrderError(`Insufficient wallet balance. Available: ₹${(walletBalance ?? 0).toFixed(2)}, Required: ₹${finalTotal.toFixed(2)}`);
                return;
            }
        }
        setIsSubmitting(true);

        const isRazorpayMethod = ['net_banking', 'google_pay', 'phone_pe', 'upi', 'card'].includes(selectedPaymentMethod || '');
        const backendMethod: 'cod' | 'razorpay' | 'wallet' =
            selectedPaymentMethod === 'cod' ? 'cod'
            : selectedPaymentMethod === 'wallet' ? 'wallet'
            : isRazorpayMethod ? 'razorpay'
            : 'cod';

        let createdOrderId: string | null = null;
        try {
            const cartPayload = cartItems.map(item => ({ productId: item.productId, quantity: item.quantity }));
            const orderResponse = await orderService.createOrder({
                shippingAddressId: selectedAddressId,
                paymentMethod: backendMethod,
                cartItems: cartPayload,
                notes: isInstant ? 'instant_delivery' : 'standard_delivery',
                deliveryFee: isInstant ? 50 : 0,
                couponCode: appliedCoupon?.code,
            });
            if (!orderResponse.success || !orderResponse.data) throw new Error('Failed to create order');

            const appOrder = orderResponse.data.order;
            createdOrderId = appOrder.id;
            if (appOrder.finalAmount) setConfirmedFinalAmount(Number(appOrder.finalAmount));

            if (backendMethod === 'razorpay') {
                const rzpOrderResponse = await paymentService.createRazorpayOrder(appOrder.id);
                if (!rzpOrderResponse.success || !rzpOrderResponse.data) throw new Error('Failed to initiate payment');
                const { razorpayOrderId, amount, currency, keyId } = rzpOrderResponse.data;
                const options = {
                    description: `Payment for order ${appOrder.orderNumber || appOrder.id}`,
                    image: 'https://i.imgur.com/3g7nmJC.png',
                    currency, key: keyId, amount: String(amount), name: 'ZPIN', order_id: razorpayOrderId,
                    prefill: { email: user?.email || '', contact: user?.mobile || '', name: user?.name || '' },
                    theme: { color: Colors.light.tint },
                };
                if (!RazorpayCheckout) throw new Error('Payment gateway is not available. Please ensure you are using a native build (not Expo Go).');
                const rzpData = await RazorpayCheckout.open(options);
                await paymentService.verifyRazorpayPayment({
                    razorpayOrderId,
                    razorpayPaymentId: rzpData.razorpay_payment_id,
                    razorpaySignature: rzpData.razorpay_signature,
                    appOrderId: appOrder.id,
                });
                await refreshOrders();
            } else {
                addOrder(appOrder as any);
            }
            setShowSuccessModal(true);
        } catch (error: any) {
            const isCancelled =
                error?.code === 0 || error?.code === 'PAYMENT_CANCELLED' ||
                error?.description === 'Payment cancelled by user' ||
                error?.message?.toLowerCase().includes('cancel') ||
                error?.message?.toLowerCase().includes('dismiss');
            if (createdOrderId) {
                orderService.cancelOrder(createdOrderId, {
                    reason: isCancelled ? 'Payment cancelled by user' : 'Payment failed',
                    refundMethod: 'original',
                }).catch(() => { });
            }
            setOrderError(isCancelled ? 'Payment was cancelled. Please try again.' : (error.message || 'Payment failed. Please try again.'));
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleModalPrimary = () => {
        setShowSuccessModal(false);
        clearCart();
        router.dismissAll();
        router.replace('/(tabs)');
        setTimeout(() => router.push('/categories'), 200);
    };

    const handleModalClose = () => {
        setShowSuccessModal(false);
        clearCart();
        router.dismissAll();
        router.replace('/(tabs)');
    };

    const money = (n: number) => `₹${n.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

    const Option = ({ id, icon: Icon, label, sub, recommended }: { id: string; icon: LucideIcon; label: string; sub: string; recommended?: boolean }) => {
        const selected = selectedPaymentMethod === id;
        return (
            <Pressable style={[styles.option, selected ? styles.optionOn : styles.optionOff]} onPress={() => setSelectedPaymentMethod(id)}>
                <View style={[styles.optIcon, recommended && styles.optIconBrand]}>
                    <Icon size={22} color={recommended ? colors.textOnYellow : colors.textStrong} />
                </View>
                <View style={{ flex: 1 }}>
                    <Text style={styles.optLabel}>{label}</Text>
                    <Text style={styles.optSub}>{sub}</Text>
                </View>
                <View style={[styles.radio, selected && styles.radioOn]}>
                    {selected && <Check size={13} color={palette.yellow500} />}
                </View>
            </Pressable>
        );
    };

    return (
        <SafeAreaView style={styles.container} edges={['top']}>
            <AppHeader title="Checkout" onBack={() => router.back()} />
            <CheckoutSteps step={3} />

            <ScrollView style={{ flex: 1 }} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
                <View style={styles.eyebrowRow}>
                    <ZText variant="eyebrow" color={colors.textMuted}>Recommended</ZText>
                </View>
                <Option id="upi" icon={Smartphone} label="UPI / Cards" sub="Pay securely via Razorpay" recommended />
                <View style={styles.brandChips}>
                    {['UPI', 'VISA', 'MASTERCARD', 'RUPAY'].map((b) => (
                        <View key={b} style={styles.brandChip}><Text style={styles.brandChipText}>{b}</Text></View>
                    ))}
                </View>

                <View style={styles.eyebrowRow}>
                    <ZText variant="eyebrow" color={colors.textMuted}>Other options</ZText>
                </View>
                <Option id="net_banking" icon={Landmark} label="Net Banking" sub="All major banks" />
                <Option id="cod" icon={Banknote} label="Cash on Delivery" sub="Pay the courier at your door" />

                {WALLET_ENABLED && (
                    <Option
                        id="wallet"
                        icon={Wallet}
                        label="ZPIN Wallet"
                        sub={walletBalance === null ? 'Loading…' : `Balance: ₹${walletBalance.toFixed(2)}${walletBalance < finalTotal ? ' (Insufficient)' : ''}`}
                    />
                )}

                <View style={styles.secure}>
                    <Lock size={14} color={colors.textFaint} />
                    <Text style={styles.secureText}>256-BIT SECURE · RAZORPAY</Text>
                </View>
            </ScrollView>

            <View style={[styles.footer, { paddingBottom: 14 + insets.bottom }]}>
                <View>
                    <ZText variant="eyebrow" color={colors.textMuted} style={{ marginBottom: 2 }}>Total to pay</ZText>
                    <Text style={styles.footerTotal}>{money(finalTotal)}</Text>
                </View>
                <Pressable style={[styles.payBtn, isSubmitting && { opacity: 0.6 }]} onPress={handleConfirm} disabled={isSubmitting}>
                    {isSubmitting ? <ActivityIndicator color={colors.textOnYellow} /> : (
                        <>
                            <Lock size={17} color={colors.textOnYellow} />
                            <Text style={styles.payText}>Pay now</Text>
                        </>
                    )}
                </Pressable>
            </View>

            <ActionModal
                visible={showSuccessModal}
                title="Order Placed!"
                message="Your order has been placed successfully."
                primaryButtonText="Continue"
                onPrimaryPress={handleModalPrimary}
                secondaryButtonText="Close"
                onSecondaryPress={handleModalClose}
                onClose={handleModalClose}
                icon="check-circle"
            />
            <ActionModal
                visible={!!orderError}
                title="Order Failed"
                message={orderError || 'Something went wrong.'}
                primaryButtonText="Try Again"
                onPrimaryPress={() => setOrderError(null)}
                onClose={() => setOrderError(null)}
                icon="x-circle"
            />
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: palette.paperWarm },
    content: { padding: 20, paddingTop: 4, paddingBottom: 24 },
    eyebrowRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 12, marginTop: 8 },

    option: { flexDirection: 'row', alignItems: 'center', gap: 14, backgroundColor: colors.surfaceCard, borderRadius: 18, paddingVertical: 15, paddingHorizontal: 16, marginBottom: 12 },
    optionOn: { borderWidth: 2, borderColor: colors.borderInk },
    optionOff: { borderWidth: 1, borderColor: palette.neutral200 },
    optIcon: { width: 44, height: 44, borderRadius: 12, backgroundColor: colors.surfaceSunken, alignItems: 'center', justifyContent: 'center' },
    optIconBrand: { backgroundColor: palette.yellow500 },
    optLabel: { fontFamily: fonts.displaySemiBold, fontSize: 15, color: colors.textStrong },
    optSub: { fontFamily: fonts.bodyRegular, fontSize: 12, color: colors.textFaint, marginTop: 1 },
    radio: { width: 22, height: 22, borderRadius: 11, borderWidth: 2, borderColor: colors.borderSubtle, alignItems: 'center', justifyContent: 'center' },
    radioOn: { backgroundColor: colors.surfaceInverse, borderWidth: 0 },

    brandChips: { flexDirection: 'row', gap: 8, marginLeft: 58, marginTop: -2, marginBottom: 22 },
    brandChip: { borderWidth: 1, borderColor: colors.borderSubtle, borderRadius: radius.xs, paddingHorizontal: 8, paddingVertical: 4 },
    brandChipText: { fontFamily: fonts.monoBold, fontSize: 10, color: colors.textBody },

    secure: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7, marginTop: 10 },
    secureText: { fontFamily: fonts.monoBold, fontSize: 10, letterSpacing: 0.6, color: colors.textFaint },

    footer: { flexDirection: 'row', alignItems: 'center', gap: 14, backgroundColor: colors.surfaceCard, borderTopWidth: 1, borderTopColor: colors.surfaceSunken, paddingHorizontal: 20, paddingTop: 14, ...shadow.sheet },
    footerTotal: { fontFamily: fonts.displayBold, fontSize: 22, color: colors.textStrong },
    payBtn: { flex: 1, height: 54, borderRadius: radius.md, backgroundColor: palette.yellow500, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, ...shadow.brand },
    payText: { fontFamily: fonts.bodyBlack, fontSize: 15, color: colors.textOnYellow },
});
