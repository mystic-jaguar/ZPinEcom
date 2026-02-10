import { CheckoutProgress } from '@/components/checkout/CheckoutProgress';
import { Colors } from '@/constants/Colors';
import { useAddress } from '@/context/AddressContext';
import { useCart } from '@/context/CartContext';
import { useCheckout } from '@/context/CheckoutContext';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React from 'react';
import { FlatList, Image, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

export default function CheckoutSummaryScreen() {
    const router = useRouter();
    const { addresses } = useAddress();
    const { cartItems, totalPrice, totalSavings, clearCart } = useCart();
    const { selectedAddressId, selectedPaymentMethod, deliveryType, setDeliveryType } = useCheckout();

    const selectedAddress = addresses.find(a => a.id === selectedAddressId);

    // Delivery fees logic
    const shippingFee = 0; // FREE
    const instantTrialFee = 50.00; // Updated to ₹50
    const gst = totalPrice * 0.18; // 18% GST on product total

    const isInstant = deliveryType === 'Instant';
    const deliveryFee = isInstant ? instantTrialFee : 0;

    const finalTotal = totalPrice + shippingFee + deliveryFee + gst;
    // Use totalSavings from CartContext instead of mock



    const handleConfirmOrder = () => {
        router.push('/checkout/payment');
    };

    const getImageSource = (item: any) => {
        const img = item.images?.[0] || item.image;
        if (!img) return { uri: 'https://via.placeholder.com/80' };
        if (typeof img === 'string') return { uri: img };
        return img; // It's a number (require)
    };

    const renderOrderItem = ({ item }: { item: any }) => (
        <View style={styles.orderItem}>
            <Image source={getImageSource(item)} style={styles.itemImage} />
        </View>
    );

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                    <Ionicons name="chevron-back" size={24} color="#000" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Checkout</Text>
            </View>

            <CheckoutProgress currentStep={2} />

            <ScrollView style={styles.scrollContainer} contentContainerStyle={styles.contentContainer}>

                {/* Shipping Address Section */}
                <View style={styles.sectionHeader}>
                    <View style={styles.iconTitleRow}>
                        <Ionicons name="location-sharp" size={18} color={Colors.light.tint} />
                        <Text style={styles.sectionTitleText}>Shipping Address</Text>
                    </View>
                    <TouchableOpacity onPress={() => router.push('/checkout/address')}>
                        <Text style={styles.editLink}>Edit</Text>
                    </TouchableOpacity>
                </View>

                {selectedAddress ? (
                    <View style={styles.addressCard}>
                        <Text style={styles.addrName}>{selectedAddress.name}</Text>
                        <Text style={styles.addrText}>
                            {selectedAddress.address}, {selectedAddress.city},
                        </Text>
                        <Text style={styles.addrText}>
                            {selectedAddress.state} {selectedAddress.pincode}, {selectedAddress.country}
                        </Text>
                        <Text style={styles.addrPhone}>
                            +91 {selectedAddress.phone}
                        </Text>
                    </View>
                ) : (
                    <View style={styles.addressCard}>
                        <Text style={styles.addrText}>No address selected</Text>
                    </View>
                )}

                {/* Delivery Method Section */}
                <View style={[styles.sectionHeader, { marginTop: 25 }]}>
                    <View style={styles.iconTitleRow}>
                        <Ionicons name="bus" size={18} color={Colors.light.tint} />
                        <Text style={styles.sectionTitleText}>Delivery Method</Text>
                    </View>
                </View>

                <TouchableOpacity
                    style={[styles.deliveryCard, isInstant && styles.activeDeliveryCard]}
                    onPress={() => setDeliveryType(isInstant ? 'Standard' : 'Instant')}
                >
                    <View style={styles.deliveryHeader}>
                        <Text style={styles.deliveryTitle}>Instant Trial Delivery</Text>
                        <View style={styles.checkCircle}>
                            {isInstant && <Ionicons name="checkmark" size={12} color="#fff" />}
                        </View>
                    </View>
                    <Text style={styles.deliverySubtitle}>DELIVERY WITHIN 2-12 HOURS</Text>

                    <View style={styles.infoBox}>
                        <Ionicons name="information-circle" size={16} color="#FBC02D" style={{ marginTop: 2 }} />
                        <Text style={styles.infoText}>
                            Try items for <Text style={{ fontWeight: 'bold' }}>15 mins</Text>. Keep what you like, return the rest to the delivery executive immediately. Trial fee is non-refundable.
                        </Text>
                    </View>
                </TouchableOpacity>

                {/* Order Items Section */}
                <Text style={[styles.sectionTitleText, { marginTop: 25, marginBottom: 15, marginLeft: 5 }]}>Order Items</Text>
                <FlatList
                    data={cartItems}
                    renderItem={renderOrderItem}
                    keyExtractor={item => item.cartItemId}
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={{ paddingLeft: 5 }}
                />

            </ScrollView>

            <View style={styles.footer}>
                <View style={styles.totalRow}>
                    <Text style={styles.totalLabel}>TOTAL PAYABLE</Text>
                    <Text style={styles.savingsText}>YOU SAVED ₹{totalSavings.toFixed(2)}</Text>
                </View>
                <Text style={styles.totalAmount}>₹{finalTotal.toFixed(2)}</Text>

                <TouchableOpacity
                    style={styles.confirmButton}
                    onPress={handleConfirmOrder}
                >
                    <Text style={styles.confirmButtonText}>Proceed to Payment</Text>
                    <Ionicons name="chevron-forward" size={20} color="#000" />
                </TouchableOpacity>

                {/* Breakdown */}
                <View style={styles.breakdownContainer}>
                    <View style={styles.breakdownRow}>
                        <Text style={styles.breakdownLabel}>Subtotal ({cartItems.length} items)</Text>
                        <Text style={styles.breakdownValue}>₹{totalPrice.toFixed(2)}</Text>
                    </View>
                    <View style={styles.breakdownRow}>
                        <Text style={styles.breakdownLabel}>Shipping Fee</Text>
                        <Text style={[styles.breakdownValue, { color: '#4CAF50' }]}>FREE</Text>
                    </View>
                    {isInstant && (
                        <View style={styles.breakdownRow}>
                            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                                <Text style={[styles.breakdownLabel, { color: '#FFA000' }]}>Instant Trial Fee</Text>
                                <Ionicons name="help-circle" size={14} color="#FFA000" style={{ marginLeft: 5 }} />
                            </View>
                            <Text style={[styles.breakdownValue, { color: '#FFA000' }]}>₹{instantTrialFee.toFixed(2)}</Text>
                        </View>
                    )}
                    <View style={styles.breakdownRow}>
                        <Text style={styles.breakdownLabel}>Tax (GST 18%)</Text>
                        <Text style={styles.breakdownValue}>₹{gst.toFixed(2)}</Text>
                    </View>
                    <View style={[styles.breakdownRow, { marginTop: 10 }]}>
                        <Text style={styles.totalLabelSmall}>Total Amount</Text>
                        <Text style={styles.totalValueSmall}>₹{finalTotal.toFixed(2)}</Text>
                    </View>

                </View>
            </View>
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
    sectionHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 10,
    },
    iconTitleRow: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    sectionTitleText: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#000',
        marginLeft: 8,
    },
    editLink: {
        fontSize: 14,
        fontWeight: 'bold',
        color: Colors.light.tint,
        backgroundColor: '#FFF8E1',
        paddingHorizontal: 12,
        paddingVertical: 4,
        borderRadius: 12,
        overflow: 'hidden', // for borderRadius on text
    },
    addressCard: {
        backgroundColor: '#fff',
        borderRadius: 12,
        padding: 16,
        marginBottom: 10,
        // Shadow removed as per design looking cleaner, but can add
    },
    addrName: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#000',
        marginBottom: 5,
    },
    addrText: {
        fontSize: 14,
        color: '#757575',
        lineHeight: 20,
    },
    addrPhone: {
        fontSize: 14,
        color: '#757575',
        marginTop: 5,
    },
    deliveryCard: {
        backgroundColor: '#fff',
        borderRadius: 12,
        padding: 16,
        borderWidth: 2,
        borderColor: '#E0E0E0',
    },
    activeDeliveryCard: {
        borderColor: Colors.light.tint,
    },
    deliveryHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    deliveryTitle: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#000',
    },
    checkCircle: {
        width: 20,
        height: 20,
        borderRadius: 10,
        backgroundColor: Colors.light.tint,
        justifyContent: 'center',
        alignItems: 'center',
    },
    deliverySubtitle: {
        fontSize: 12,
        fontWeight: 'bold',
        color: '#90A4AE',
        marginTop: 2,
        marginBottom: 15,
    },
    infoBox: {
        backgroundColor: '#FFFDE7', // Light yellow
        borderRadius: 8,
        padding: 12,
        flexDirection: 'row',
        borderWidth: 1,
        borderColor: '#FFF59D',
    },
    infoText: {
        fontSize: 12,
        color: '#5D4037', // Brownish text for contrast on yellow
        marginLeft: 8,
        flex: 1,
        lineHeight: 16,
    },
    orderItem: {
        width: 80,
        height: 80,
        borderRadius: 12,
        backgroundColor: '#fff',
        marginRight: 10,
        padding: 5,
        justifyContent: 'center',
        alignItems: 'center',
    },
    itemImage: {
        width: 60,
        height: 70,
        resizeMode: 'contain',
    },
    footer: {
        backgroundColor: '#fff',
        padding: 16,
        borderTopWidth: 1,
        borderTopColor: '#EEEEEE',
        paddingBottom: 30,
    },
    totalRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 2,
        alignItems: 'center',
    },
    totalLabel: {
        fontSize: 10,
        fontWeight: 'bold',
        color: '#90A4AE',
        letterSpacing: 1,
    },
    savingsText: {
        fontSize: 10,
        fontWeight: 'bold',
        color: '#4CAF50',
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
        marginBottom: 20,
    },
    confirmButtonText: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#000',
        marginRight: 5,
    },
    breakdownContainer: {
        borderTopWidth: 1,
        borderTopColor: '#f5f5f5',
        paddingTop: 15,
    },
    breakdownRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 8,
    },
    breakdownLabel: {
        fontSize: 14,
        color: '#757575',
    },
    breakdownValue: {
        fontSize: 14,
        color: '#000',
        fontWeight: '500',
    },
    totalLabelSmall: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#000',
    },
    totalValueSmall: {
        fontSize: 18,
        fontWeight: '900',
        color: '#000',
    },
});
