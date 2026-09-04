import ActionModal from '@/components/common/ActionModal';
import { Colors } from '@/constants/Colors';
import { useCart } from '@/context/CartContext';
import { useCheckout } from '@/context/CheckoutContext';
import { useOrder } from '@/context/OrderContext';
import { useUser } from '@/context/UserContext';
import { useFocusEffect } from '@react-navigation/native';
import { useRouter } from 'expo-router';
import { Banknote, Check, Landmark, Lock, LucideIcon, Smartphone } from 'lucide-react-native';
import React, { useCallback, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, View } from 'react-native';
import RazorpayCheckout from 'react-native-razorpay';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useExitGuard } from '../../hooks/useExitGuard';
import { AppHeader, CheckoutSteps, ZText } from '../../components/ui';
import { createStyles, colors, fonts, palette, radius, shadow } from '../../constants/theme';
import { orderService } from '../../services/order';
import { paymentService } from '../../services/payment';
import { Text } from '../../components/ui/ScaledText';

export default function CheckoutPaymentScreen() {
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const { selectedPaymentMethod, setSelectedPaymentMethod, deliveryType, selectedAddressId, setLastStep, resetCheckout } = useCheckout();
    const { totalPrice, cartItems, clearCart, couponDiscount, appliedCoupon } = useCart();
    const { addOrder, refreshOrders } = useOrder();
    const { user } = useUser();
    const [showSuccessModal, setShowSuccessModal] = useState(false);
    const [orderError, setOrderError] = useState<string | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [confirmedFinalAmount, setConfirmedFinalAmount] = useState<number | null>(null);

    React.useEffect(() => { setLastStep(3); }, []);

    // Backing out while the order/payment round-trip is in flight is the one
    // place in the app where leaving can cost the customer money, so this
    // guard is armed for the whole submit, not just for unsaved input.
    const { ConfirmModal: ExitConfirmModal } = useExitGuard({
        enabled: isSubmitting || !!selectedPaymentMethod,
        title: isSubmitting ? 'Payment in progress' : 'Leave payment?',
        message: isSubmitting
            ? 'Your payment is still being processed. Leaving now may leave the order unpaid.'
            : 'Your order has not been placed yet.',
        discardLabel: 'Leave anyway',
    });

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
    // Try-at-Door only kicks in when settling at the door (COD or nothing picked
    // yet); explicitly choosing UPI/Cards/Net Banking means paying the full
    // amount now, so it isn't a trial.
    const isTrialSelection = isInstant && (!selectedPaymentMethod || selectedPaymentMethod === 'cod');
    const deliveryFee = isInstant ? 50.0 : 0;
    const taxAmount = Math.round(totalPrice * 0.18);
    const shippingAmount = totalPrice > 999 ? 0 : 49; // free-delivery threshold — must match server (orders.ts) + cart bar
    const estimatedTotal = totalPrice + shippingAmount + taxAmount + deliveryFee - couponDiscount;
    const finalTotal = confirmedFinalAmount ?? estimatedTotal;

    const handleConfirm = async () => {
        if (cartItems.length === 0 || !selectedAddressId || isSubmitting) return;
        if (!selectedPaymentMethod) {
            setOrderError('Please select a payment method to continue.');
            return;
        }
        setIsSubmitting(true);

        const isRazorpayMethod = ['net_banking', 'google_pay', 'phone_pe', 'upi', 'card'].includes(selectedPaymentMethod || '');
        const backendMethod: 'cod' | 'razorpay' =
            selectedPaymentMethod === 'cod' ? 'cod'
            : isRazorpayMethod ? 'razorpay'
            : 'cod';

        // Instant delivery is Try-at-Door ONLY when settling at the door (COD): the
        // customer prepays just the delivery fee now and pays for kept items at the
        // door after the trial. Explicitly choosing UPI/Cards/Net Banking means they
        // want to pay the full amount now, so it is NOT a trial order.
        const isTrial = isInstant && backendMethod === 'cod';
        const needsFeePrepay = isInstant && deliveryFee > 0 && isTrial;

        let createdOrderId: string | null = null;
        try {
            const cartPayload = cartItems.map(item => ({
                productId: item.productId,
                quantity: item.quantity,
                variant: item.selectedSize,
            }));
            const orderResponse = await orderService.createOrder({
                shippingAddressId: selectedAddressId,
                paymentMethod: backendMethod,
                cartItems: cartPayload,
                notes: isInstant ? 'instant_delivery' : 'standard_delivery',
                deliveryFee: isInstant ? 50 : 0,
                tryFirst: isTrial,
                couponCode: appliedCoupon?.code,
            });
            if (!orderResponse.success || !orderResponse.data) throw new Error('Failed to create order');

            const appOrder = orderResponse.data.order;
            createdOrderId = appOrder.id;
            if (appOrder.finalAmount) setConfirmedFinalAmount(Number(appOrder.finalAmount));

            // Instant Delivery on COD still prepays the delivery fee online (same
            // rule as the website): the server charges only the fee and leaves the
            // order 'partial', so the courier collects the balance at the door.
            if (backendMethod === 'razorpay' || needsFeePrepay) {
                const rzpOrderResponse = await paymentService.createRazorpayOrder(appOrder.id);
                if (!rzpOrderResponse.success || !rzpOrderResponse.data) throw new Error('Failed to initiate payment');
                const { razorpayOrderId, amount, currency, keyId } = rzpOrderResponse.data;
                const isNetBanking = selectedPaymentMethod === 'net_banking';
                const options = {
                    description: `Payment for order ${appOrder.orderNumber || appOrder.id}`,
                    image: 'https://i.imgur.com/3g7nmJC.png',
                    currency, key: keyId, amount: String(amount), name: 'ZPIN', order_id: razorpayOrderId,
                    prefill: {
                        email: user?.email || '', contact: user?.mobile || '', name: user?.name || '',
                        // Opens Razorpay straight on the bank list. Every key in `method`
                        // below defaults to true, so it can only DISABLE methods -- without
                        // `prefill.method` the checkout still lands on the one-tap screen.
                        ...(isNetBanking ? { method: 'netbanking' as const } : {}),
                    },
                    // Belt and braces: the customer already picked Net Banking on our screen,
                    // so nothing else is offered inside the sheet.
                    ...(isNetBanking
                        ? { method: { netbanking: true, card: false, upi: false, wallet: false, emi: false, paylater: false } }
                        : {}),
                    theme: { color: Colors.light.tint },
                };
                if (!RazorpayCheckout) throw new Error('Payment gateway is not available. Please try again after some time.');
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
            // Razorpay rejects with a plain object, not an Error: { code, description }.
            // code 2 === PAYMENT_CANCELED (0 is NETWORK_ERROR, don't match it).
            const rzpText = `${error?.description ?? ''} ${error?.message ?? ''}`.toLowerCase();
            const isCancelled =
                error?.code === 2 || error?.code === 'PAYMENT_CANCELLED' ||
                rzpText.includes('cancel') || rzpText.includes('dismiss');
            if (createdOrderId) {
                // Never paid for, so it is discarded outright rather than cancelled:
                // a cancelled row still surfaces in the seller's app as a real order.
                // The server falls back to refusing anything that IS paid.
                //
                // Awaited, not fire-and-forget: the user is one tap from leaving this
                // screen, and an unawaited request can be torn down mid-flight, which
                // leaves the order sitting pending forever.
                await orderService.abandonOrder(createdOrderId).catch(() => { });
            }
            setOrderError(isCancelled ? 'Payment was cancelled. Please try again.' : (error.message || 'Payment failed. Please try again.'));
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleModalPrimary = () => {
        setShowSuccessModal(false);
        clearCart();
        resetCheckout();
        router.dismissAll();
        router.replace('/(tabs)');
        setTimeout(() => router.push('/categories'), 200);
    };

    const handleModalClose = () => {
        setShowSuccessModal(false);
        clearCart();
        resetCheckout();
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

                {isInstant && isTrialSelection && (
                    <View style={[styles.tryCard, styles.tryCardOn]}>
                        <View style={[styles.checkbox, styles.checkboxOn]}>
                            <Check size={13} color={palette.yellow500} />
                        </View>
                        <View style={{ flex: 1 }}>
                            <Text style={styles.optLabel}>Try items for 15 minutes before paying</Text>
                            <Text style={styles.optSub}>
                                Included with Try-at-Door. Pay only the {money(deliveryFee)} delivery charge now
                                (non-refundable). When the courier picks up your order you get 15 minutes to choose
                                which items to keep — you pay for those at your door and hand the rest back.
                            </Text>
                        </View>
                    </View>
                )}
                {isInstant && !isTrialSelection && (
                    <View style={[styles.tryCard, styles.tryCardOn]}>
                        <View style={{ flex: 1 }}>
                            <Text style={styles.optLabel}>Paying the full amount now</Text>
                            <Text style={styles.optSub}>
                                UPI/Cards/Net Banking pays the entire order total now — choose Cash on Delivery
                                instead to pay only the {money(deliveryFee)} delivery charge now and try items for
                                15 minutes before paying the rest at your door.
                            </Text>
                        </View>
                    </View>
                )}

                <View style={styles.eyebrowRow}>
                    <ZText variant="eyebrow" color={colors.textMuted}>Other options</ZText>
                </View>
                <Option id="net_banking" icon={Landmark} label="Net Banking" sub="All major banks" />
                <Option id="cod" icon={Banknote} label="Cash on Delivery" sub="Pay the courier at your door" />
                {selectedPaymentMethod === 'cod' && (
                    <View style={styles.codNote}>
                        <Text style={styles.codNoteText}>
                            If paying by cash, please keep exact change — the delivery partner cannot provide change. You can also scan the partner&apos;s UPI QR at the door.
                        </Text>
                        {isInstant && deliveryFee > 0 && (
                            <Text style={styles.codNoteText}>
                                Instant Delivery: {money(deliveryFee)} delivery charge is paid now; the rest is collected at your door.
                            </Text>
                        )}
                    </View>
                )}

                <View style={styles.secure}>
                    <Lock size={14} color={colors.textFaint} />
                    <Text style={styles.secureText}>256-BIT SECURE · RAZORPAY</Text>
                </View>
            </ScrollView>

            <View style={[styles.footer, { paddingBottom: 14 + insets.bottom }]}>
                <View>
                    <ZText variant="eyebrow" color={colors.textMuted} style={{ marginBottom: 2 }}>
                        {isTrialSelection ? 'Pay now' : 'Total to pay'}
                    </ZText>
                    {/* Try-at-Door only charges the delivery fee up front, so the bold
                        figure is what is actually about to be debited, not the order total. */}
                    <Text style={styles.footerTotal}>{money(isTrialSelection ? deliveryFee : finalTotal)}</Text>
                    {isTrialSelection && (
                        <Text style={styles.optSub}>{money(finalTotal)} order total · rest at your door</Text>
                    )}
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
            {ExitConfirmModal}
        </SafeAreaView>
    );
}

const styles = createStyles({
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

    tryCard: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, backgroundColor: colors.surfaceCard, borderRadius: 18, paddingVertical: 15, paddingHorizontal: 16, marginBottom: 12, borderWidth: 1, borderColor: palette.neutral200 },
    tryCardOn: { borderWidth: 2, borderColor: colors.borderInk },
    checkbox: { width: 22, height: 22, borderRadius: 6, borderWidth: 2, borderColor: colors.borderSubtle, alignItems: 'center', justifyContent: 'center', marginTop: 1 },
    checkboxOn: { backgroundColor: colors.surfaceInverse, borderWidth: 0 },

    codNote: { backgroundColor: colors.surfaceSunken, borderRadius: radius.md, padding: 12, marginTop: -2, marginBottom: 12, gap: 6 },
    codNoteText: { fontFamily: fonts.bodyRegular, fontSize: 12, lineHeight: 17, color: colors.textBody },

    secure: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7, marginTop: 10 },
    secureText: { fontFamily: fonts.monoBold, fontSize: 10, letterSpacing: 0.6, color: colors.textFaint },

    footer: { flexDirection: 'row', alignItems: 'center', gap: 14, backgroundColor: colors.surfaceCard, borderTopWidth: 1, borderTopColor: colors.surfaceSunken, paddingHorizontal: 20, paddingTop: 14, ...shadow.sheet },
    footerTotal: { fontFamily: fonts.displayBold, fontSize: 22, color: colors.textStrong },
    payBtn: { flex: 1, height: 54, borderRadius: radius.md, backgroundColor: palette.yellow500, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, ...shadow.brand },
    payText: { fontFamily: fonts.bodyBlack, fontSize: 15, color: colors.textOnYellow },
});
