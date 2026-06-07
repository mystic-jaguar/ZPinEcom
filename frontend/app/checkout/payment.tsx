import { CheckoutProgress } from '@/components/checkout/CheckoutProgress';
import ActionModal from '@/components/common/ActionModal';
import { Colors } from '@/constants/Colors';
import { useAddress } from '@/context/AddressContext';
import { useCart } from '@/context/CartContext';
import { useCheckout } from '@/context/CheckoutContext';
import { useOrder } from '@/context/OrderContext';
import { useUser } from '@/context/UserContext';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { useRouter } from 'expo-router';
import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import RazorpayCheckout from 'react-native-razorpay';
import { SafeAreaView } from 'react-native-safe-area-context';
import { orderService } from '../../services/order';
import { paymentService } from '../../services/payment';
import { walletService } from '../../services/wallet';

export default function CheckoutPaymentScreen() {
    const router = useRouter();
    const { selectedPaymentMethod, setSelectedPaymentMethod, deliveryType, selectedAddressId } = useCheckout();
    const { totalPrice, cartItems, clearCart, couponDiscount, totalSavings, appliedCoupon } = useCart();
    const { addresses } = useAddress();
    const { addOrder } = useOrder();
    const { user } = useUser();
    const [showSuccessModal, setShowSuccessModal] = useState(false);
    const [orderError, setOrderError] = useState<string | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [walletBalance, setWalletBalance] = useState<number | null>(null);

    const [redirectCategory, setRedirectCategory] = useState<string | null>(null);
    // Store the confirmed final amount returned by the backend after order creation
    const [confirmedFinalAmount, setConfirmedFinalAmount] = useState<number | null>(null);

    useEffect(() => {
        walletService.getWallet().then(data => setWalletBalance(data.balance)).catch(() => setWalletBalance(0));
    }, []);

    // Guard: If cart is empty AND no success modal, redirect to cart.
    // Use a ref to avoid redirecting on the very first render before cart loads.
    const hasRedirectedRef = React.useRef(false);
    useFocusEffect(
        useCallback(() => {
            if (cartItems.length === 0 && !showSuccessModal && !hasRedirectedRef.current) {
                hasRedirectedRef.current = true;
                router.replace('/(tabs)/cart');
            }
        }, [cartItems.length, showSuccessModal])
    );

    // Calculate estimated total for display (matches backend formula)
    const isInstant = deliveryType === 'Instant';
    const deliveryFee = isInstant ? 50.00 : 0;
    const taxAmount = Math.round(totalPrice * 0.18); // backend uses Math.round
    const shippingAmount = totalPrice > 500 ? 0 : 49; // backend logic
    const estimatedTotal = totalPrice + shippingAmount + taxAmount + deliveryFee - couponDiscount;

    // Use backend-confirmed amount after order creation, fall back to estimate for display
    const finalTotal = confirmedFinalAmount ?? estimatedTotal;

    const handlePaymentSelect = (method: string) => {
        setSelectedPaymentMethod(method);
    };

    const handleConfirm = async () => {
        if (cartItems.length === 0 || !selectedAddressId || isSubmitting) return;

        if (!selectedPaymentMethod) {
            setOrderError('Please select a payment method to continue.');
            return;
        }

        // Wallet balance check before submitting
        if (selectedPaymentMethod === 'wallet') {
            if (walletBalance === null || walletBalance < finalTotal) {
                setOrderError(`Insufficient wallet balance. Available: ₹${(walletBalance ?? 0).toFixed(2)}, Required: ₹${finalTotal.toFixed(2)}`);
                return;
            }
        }

        setIsSubmitting(true);

        // Determine backend payment method
        const isRazorpayMethod = ['net_banking', 'google_pay', 'phone_pe', 'upi', 'card'].includes(selectedPaymentMethod || '');

        const backendMethod: 'cod' | 'razorpay' | 'wallet' =
            selectedPaymentMethod === 'cod' ? 'cod'
            : selectedPaymentMethod === 'wallet' ? 'wallet'
            : isRazorpayMethod ? 'razorpay'
            : 'cod';

        try {
            const cartPayload = cartItems.map(item => ({
                productId: item.productId,
                quantity: item.quantity,
            }));

            // Step 1: Create the app order
            const orderResponse = await orderService.createOrder({
                shippingAddressId: selectedAddressId,
                paymentMethod: backendMethod,
                cartItems: cartPayload,
                notes: isInstant ? 'instant_delivery' : 'standard_delivery',
                deliveryFee: isInstant ? 50 : 0,
                // Send coupon code — backend validates and calculates discount server-side
                couponCode: appliedCoupon?.code,
            });

            if (!orderResponse.success || !orderResponse.data) {
                throw new Error('Failed to create order');
            }

            const appOrder = orderResponse.data.order;
            addOrder(appOrder as any);

            // Use the backend-calculated final amount for display and payment
            if (appOrder.finalAmount) {
                setConfirmedFinalAmount(Number(appOrder.finalAmount));
            }

            // Step 2: For Razorpay methods, open the payment gateway
            if (backendMethod === 'razorpay') {
                // Create Razorpay order on backend
                const rzpOrderResponse = await paymentService.createRazorpayOrder(appOrder.id);

                if (!rzpOrderResponse.success || !rzpOrderResponse.data) {
                    throw new Error('Failed to initiate payment');
                }

                const { razorpayOrderId, amount, currency, keyId } = rzpOrderResponse.data;

                const options = {
                    description: `Payment for order ${appOrder.orderNumber || appOrder.id}`,
                    image: 'https://i.imgur.com/3g7nmJC.png',
                    currency,
                    key: keyId,
                    amount: String(amount),
                    name: 'ZPIN',
                    order_id: razorpayOrderId,
                    prefill: {
                        email: user?.email || '',
                        contact: user?.mobile || '',
                        name: user?.name || '',
                    },
                    theme: { color: Colors.light.tint },
                };

                // Step 3: Open Razorpay checkout
                if (!RazorpayCheckout) {
                    throw new Error('Payment gateway is not available. Please ensure you are using a native build (not Expo Go).');
                }

                const rzpData = await RazorpayCheckout.open(options);

                // Step 4: Verify payment with backend
                await paymentService.verifyRazorpayPayment({
                    razorpayOrderId,
                    razorpayPaymentId: rzpData.razorpay_payment_id,
                    razorpaySignature: rzpData.razorpay_signature,
                    appOrderId: appOrder.id,
                });
            }

            setShowSuccessModal(true);
        } catch (error: any) {
            // Razorpay checkout dismissed or cancelled by user
            const isCancelled =
                error?.code === 0 ||
                error?.code === 'PAYMENT_CANCELLED' ||
                error?.description === 'Payment cancelled by user' ||
                error?.message?.toLowerCase().includes('cancel') ||
                error?.message?.toLowerCase().includes('dismiss');

            if (isCancelled) {
                setOrderError('Payment was cancelled. Your order has been saved — you can retry payment from your orders.');
            } else {
                setOrderError(error.message || 'Failed to place order. Please try again.');
            }
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleModalPrimary = () => {
        // Close modal and clear cart
        setShowSuccessModal(false);
        clearCart();

        // Reset navigation to Home (Tabs)
        router.dismissAll();
        router.replace('/(tabs)');

        // Navigate to categories page
        setTimeout(() => {
            router.push('/categories');
        }, 200);
    };

    const handleModalClose = () => {
        // Close -> Redirect to Home
        setShowSuccessModal(false);
        clearCart();
        router.dismissAll();
        router.replace('/(tabs)');
    }

    const renderOption = (id: string, label: string, iconName?: any, subLabel?: string, isCard: boolean = false) => {
        const isSelected = selectedPaymentMethod === id;
        return (
            <TouchableOpacity
                activeOpacity={0.9}
                style={[styles.optionCard, isSelected && styles.selectedOptionCard]}
                onPress={() => handlePaymentSelect(id)}
            >
                <View style={styles.optionLeft}>
                    <View style={styles.iconContainer}>
                        {/* Placeholder icons since we don't have the exact SVGs */}
                        {isCard ? (
                            <Ionicons name="card-outline" size={24} color="#1A237E" />
                        ) : iconName ? (
                            <Ionicons name={iconName} size={24} color={id === 'google_pay' ? '#4285F4' : '#5F259F'} />
                        ) : (
                            <Ionicons name="wallet-outline" size={24} color="#000" />
                        )}
                    </View>
                    <View>
                        <Text style={styles.optionLabel}>{label}</Text>
                        {subLabel && <Text style={styles.optionSubLabel}>{subLabel}</Text>}
                    </View>
                </View>

                <View style={styles.radioContainer}>
                    <View style={[
                        styles.radioButton,
                        isSelected && styles.radioButtonSelected
                    ]}>
                        {isSelected && <View style={styles.radioButtonInner} />}
                    </View>
                </View>
            </TouchableOpacity>
        );
    };

    return (
        <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                    <Ionicons name="chevron-back" size={24} color="#000" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Payment Method</Text>
            </View>

            <CheckoutProgress currentStep={3} />

            <ScrollView style={styles.scrollContainer} contentContainerStyle={styles.contentContainer}>

                <Text style={styles.sectionTitle}>UPI / CARD PAYMENTS</Text>
                <View style={styles.sectionContainer}>
                    {renderOption('upi', 'UPI / Cards', 'wallet-outline', 'Pay via Razorpay')}
                </View>

                <Text style={styles.sectionTitle}>OTHER OPTIONS</Text>
                <View style={styles.sectionContainer}>
                    {renderOption('net_banking', 'Net Banking', 'business-outline')}
                    <View style={styles.divider} />
                    {renderOption('cod', 'COD (Cash on Delivery)', 'cash-outline')}
                </View>

                <Text style={styles.sectionTitle}>ZPIN WALLET</Text>
                <View style={styles.sectionContainer}>
                    <TouchableOpacity
                        activeOpacity={0.9}
                        style={[styles.optionCard, selectedPaymentMethod === 'wallet' && styles.selectedOptionCard]}
                        onPress={() => handlePaymentSelect('wallet')}
                    >
                        <View style={styles.optionLeft}>
                            <View style={styles.iconContainer}>
                                <Ionicons name="wallet" size={24} color={Colors.light.tint} />
                            </View>
                            <View>
                                <Text style={styles.optionLabel}>ZPIN Wallet</Text>
                                <Text style={[
                                    styles.optionSubLabel,
                                    walletBalance !== null && walletBalance < finalTotal ? { color: '#E53935' } : { color: '#43A047' }
                                ]}>
                                    {walletBalance === null
                                        ? 'Loading...'
                                        : `Balance: ₹${walletBalance.toFixed(2)}${walletBalance < finalTotal ? ' (Insufficient)' : ''}`}
                                </Text>
                            </View>
                        </View>
                        <View style={styles.radioContainer}>
                            <View style={[styles.radioButton, selectedPaymentMethod === 'wallet' && styles.radioButtonSelected]}>
                                {selectedPaymentMethod === 'wallet' && <View style={styles.radioButtonInner} />}
                            </View>
                        </View>
                    </TouchableOpacity>
                </View>

            </ScrollView>

            <View style={styles.footer}>
                <View style={styles.totalRow}>
                    <Text style={styles.totalLabel}>TOTAL TO PAY</Text>
                    <Text style={styles.itemsText}>{cartItems.length} Items</Text>
                </View>
                <Text style={styles.totalAmount}>₹{finalTotal.toFixed(2)}</Text>

                <TouchableOpacity
                    style={[styles.confirmButton, isSubmitting && styles.confirmButtonDisabled]}
                    onPress={handleConfirm}
                    disabled={isSubmitting}
                >
                    {isSubmitting ? (
                        <ActivityIndicator color="#000" size="small" />
                    ) : (
                        <>
                            <Text style={styles.confirmButtonText}>Proceed to Pay</Text>
                            <Ionicons name="chevron-forward" size={20} color="#000" />
                        </>
                    )}
                </TouchableOpacity>
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
    container: {
        flex: 1,
        backgroundColor: '#F8F9FA',
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingTop: 15,
        paddingBottom: 15,
        backgroundColor: '#fff',
    },
    backButton: {
        padding: 5,
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        marginLeft: 10,
        flex: 1,
        textAlign: 'center',
        marginRight: 40,
    },
    scrollContainer: {
        flex: 1,
    },
    contentContainer: {
        padding: 16,
        paddingBottom: 40,
    },
    sectionTitle: {
        fontSize: 12,
        fontWeight: '700',
        color: '#90A4AE',
        marginBottom: 10,
        marginTop: 10,
        letterSpacing: 0.5,
    },
    sectionContainer: {
        backgroundColor: '#fff',
        borderRadius: 16,
        overflow: 'hidden',
        marginBottom: 10,
    },
    optionCard: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: 16,
        backgroundColor: '#fff',
    },
    selectedOptionCard: {
        backgroundColor: '#fff', // Keep white, maybe subtle highlight?
    },
    optionLeft: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    iconContainer: {
        width: 40,
        height: 40,
        borderRadius: 8,
        backgroundColor: '#F5F5F5',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 15,
    },
    optionLabel: {
        fontSize: 16,
        fontWeight: '600',
        color: '#000',
    },
    optionSubLabel: {
        fontSize: 12,
        color: '#757575',
        marginTop: 2,
    },
    radioContainer: {
        justifyContent: 'center',
    },
    radioButton: {
        height: 22,
        width: 22,
        borderRadius: 11,
        borderWidth: 1,
        borderColor: '#E0E0E0',
        alignItems: 'center',
        justifyContent: 'center',
    },
    radioButtonSelected: {
        borderColor: Colors.light.tint,
    },
    radioButtonInner: {
        height: 12,
        width: 12,
        borderRadius: 6,
        backgroundColor: Colors.light.tint, // Unlike address screen, this one is yellow/amber inside too
    },
    divider: {
        height: 1,
        backgroundColor: '#F5F5F5',
        marginHorizontal: 16,
    },
    addOption: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 16,
    },
    addOptionText: {
        fontSize: 14,
        fontWeight: '600',
        color: Colors.light.tint,
        marginLeft: 15,
    },
    footer: {
        backgroundColor: '#fff',
        padding: 16,
        borderTopWidth: 1,
        borderTopColor: '#EEEEEE',
    },
    totalRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 5,
    },
    totalLabel: {
        fontSize: 10,
        fontWeight: 'bold',
        color: '#90A4AE',
        letterSpacing: 1,
    },
    itemsText: {
        fontSize: 12,
        color: '#757575',
    },
    totalAmount: {
        fontSize: 24,
        fontWeight: '900',
        color: '#000',
        marginBottom: 15,
    },
    confirmButton: {
        backgroundColor: Colors.light.tint,
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        paddingVertical: 15,
        borderRadius: 12,
        shadowColor: Colors.light.tint,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 5,
    },
    confirmButtonDisabled: {
        opacity: 0.6,
        shadowOpacity: 0,
        elevation: 0,
    },
    confirmButtonText: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#000',
        marginRight: 5,
    },
});
