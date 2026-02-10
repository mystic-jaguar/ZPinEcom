import { CheckoutProgress } from '@/components/checkout/CheckoutProgress';
import ActionModal from '@/components/common/ActionModal';
import { Colors } from '@/constants/Colors';
import { useAddress } from '@/context/AddressContext';
import { useCart } from '@/context/CartContext';
import { useCheckout } from '@/context/CheckoutContext';
import { useOrder } from '@/context/OrderContext';
import { usePayment } from '@/context/PaymentContext';
import { OrderObject } from '@/types/types';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { useRouter } from 'expo-router';
import React, { useCallback, useState } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

export default function CheckoutPaymentScreen() {
    const router = useRouter();
    const { selectedPaymentMethod, setSelectedPaymentMethod, deliveryType, selectedAddressId } = useCheckout();
    const { totalPrice, cartItems, clearCart } = useCart();
    const { addresses } = useAddress();
    const { addOrder } = useOrder();
    const { cards, upis } = usePayment();
    const [showSuccessModal, setShowSuccessModal] = useState(false);

    const [redirectCategory, setRedirectCategory] = useState<string | null>(null);

    // Guard: If cart is empty, redirect to cart immediately. 
    // This prevents accessing payment with empty cart and handles "Back" navigation loops.
    useFocusEffect(
        useCallback(() => {
            if (cartItems.length === 0 && !showSuccessModal) {
                router.replace('/(tabs)/cart');
            }
        }, [cartItems, showSuccessModal])
    );

    //Calculate total including taxes/fees (matching summary logic)
    const shippingFee = 0;
    const isInstant = deliveryType === 'Instant';
    const deliveryFee = isInstant ? 50.00 : 0; // Updated to ₹50
    const gst = totalPrice * 0.18; // 18% GST
    const finalTotal = totalPrice + shippingFee + deliveryFee + gst;

    const handlePaymentSelect = (method: string) => {
        setSelectedPaymentMethod(method);
    };

    const handleConfirm = () => {
        if (cartItems.length === 0) return;

        // Create Order Immediately
        const address = addresses.find(a => a.id === selectedAddressId);

        if (address) {
            // Determine payment method display name
            let paymentMethodName = 'Other';

            // Check if it's a saved UPI
            const savedUPI = upis.find(u => u.id === selectedPaymentMethod);
            if (savedUPI) {
                paymentMethodName = savedUPI.label;
            } else {
                // Check if it's a saved card
                const savedCard = cards.find(c => c.id === selectedPaymentMethod);
                if (savedCard) {
                    paymentMethodName = `${savedCard.cardType} (${savedCard.cardNumber.slice(-4)})`;
                } else {
                    // Fallback to old logic for hardcoded methods
                    paymentMethodName = selectedPaymentMethod === 'google_pay' ? 'Google Pay' :
                        selectedPaymentMethod === 'phone_pe' ? 'PhonePe' :
                            selectedPaymentMethod === 'card_4242' ? 'Credit Card' :
                                selectedPaymentMethod === 'net_banking' ? 'Net Banking' : 'Other';
                }
            }

            const newOrder: OrderObject = {
                id: Math.random().toString(36).substr(2, 9),
                userId: 'user-current',
                sellerId: 'seller-123',
                orderNumber: `ZP-${Math.floor(10000 + Math.random() * 90000)}`,
                status: 'processing',
                paymentStatus: 'paid',
                totalAmount: totalPrice,
                shippingAmount: shippingFee,
                taxAmount: gst,
                finalAmount: finalTotal,
                shippingAddress: address,
                paymentMethod: 'razorpay',
                paymentId: `pay_${Date.now()}`,
                items: cartItems.map(item => ({
                    productId: item.productId,
                    productName: item.product.productName,
                    image: item.product.images?.[0] || '',
                    price: item.product.price,
                    quantity: item.quantity
                })),
                estimatedDelivery: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(),
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
                subtotal: totalPrice,
                savings: 0,
                isInstant: isInstant
            };
            addOrder(newOrder);

            // Capture category for redirect
            if (cartItems.length > 0 && cartItems[0].product) {
                setRedirectCategory(cartItems[0].product.categoryPath || null);
            }
        }

        setShowSuccessModal(true);
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
        <View style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                    <Ionicons name="chevron-back" size={24} color="#000" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Payment Method</Text>
            </View>

            <CheckoutProgress currentStep={3} />

            <ScrollView style={styles.scrollContainer} contentContainerStyle={styles.contentContainer}>

                <Text style={styles.sectionTitle}>UPI PAYMENTS</Text>
                <View style={styles.sectionContainer}>
                    {upis.map((upi, index) => (
                        <React.Fragment key={upi.id}>
                            {index > 0 && <View style={styles.divider} />}
                            {renderOption(
                                upi.id,
                                upi.label,
                                upi.upiApp === 'Google Pay' ? 'logo-google' : 'phone-portrait-outline',
                                upi.subLabel
                            )}
                        </React.Fragment>
                    ))}

                    {upis.length > 0 && <View style={styles.divider} />}
                    <TouchableOpacity style={styles.addOption} onPress={() => router.push('/profile/add-payment-method')}>
                        <Ionicons name="add-circle" size={24} color={Colors.light.tint} />
                        <Text style={styles.addOptionText}>Add New UPI ID</Text>
                    </TouchableOpacity>
                </View>

                <Text style={styles.sectionTitle}>CREDIT / DEBIT CARDS</Text>
                <View style={styles.sectionContainer}>
                    {cards.map((card, index) => (
                        <React.Fragment key={card.id}>
                            {index > 0 && <View style={styles.divider} />}
                            {renderOption(
                                card.id,
                                `•••• •••• •••• ${card.cardNumber.slice(-4)}`,
                                undefined,
                                `Exp: ${card.expiryDate}`,
                                true
                            )}
                        </React.Fragment>
                    ))}

                    {cards.length > 0 && <View style={styles.divider} />}
                    <TouchableOpacity style={styles.addOption} onPress={() => router.push('/profile/add-payment-method')}>
                        <Ionicons name="card" size={24} color={Colors.light.tint} />
                        <Text style={styles.addOptionText}>Add New Card</Text>
                    </TouchableOpacity>
                </View>

                <Text style={styles.sectionTitle}>OTHER OPTIONS</Text>
                <View style={styles.sectionContainer}>
                    {renderOption('net_banking', 'Net Banking', 'business-outline')}
                </View>

            </ScrollView>

            <View style={styles.footer}>
                <View style={styles.totalRow}>
                    <Text style={styles.totalLabel}>TOTAL TO PAY</Text>
                    <Text style={styles.itemsText}>{cartItems.length} Items</Text>
                </View>
                <Text style={styles.totalAmount}>₹{finalTotal.toFixed(2)}</Text>

                <TouchableOpacity
                    style={styles.confirmButton}
                    onPress={handleConfirm}
                >
                    <Text style={styles.confirmButtonText}>Proceed to Pay</Text>
                    <Ionicons name="chevron-forward" size={20} color="#000" />
                </TouchableOpacity>
            </View>

            <ActionModal
                visible={showSuccessModal}
                title="Payment Successful"
                message="Your payment has been processed successfully."
                primaryButtonText="Continue"
                onPrimaryPress={handleModalPrimary}
                secondaryButtonText="Close"
                onSecondaryPress={handleModalClose}
                onClose={handleModalClose}
                icon="check-circle"
            />
        </View>
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
        paddingTop: 50,
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
    confirmButtonText: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#000',
        marginRight: 5,
    },
});
