import { Feather, MaterialIcons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import DeliveryStatusCard from '../../components/profile/DeliveryStatusCard';
import OrderItemRow from '../../components/profile/OrderItemRow';
import PriceBreakdown from '../../components/profile/PriceBreakdown';
import { useOrder } from '../../context/OrderContext';

export default function OrderDetailsScreen() {
    const router = useRouter();
    const params = useLocalSearchParams();
    const { orderId } = params;
    const { getOrderById } = useOrder();

    const order = getOrderById(orderId as string);

    if (!order) {
        return (
            <SafeAreaView style={styles.container}>
                <View style={styles.header}>
                    <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
                        <Feather name="chevron-left" size={28} color="#1a1a1a" />
                    </TouchableOpacity>
                    <Text style={styles.headerTitle}>Order Not Found</Text>
                </View>
                <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
                    <Text>Order details not available.</Text>
                </View>
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView style={styles.container} edges={['top']}>
            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
                    <Feather name="chevron-left" size={28} color="#1a1a1a" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Order #{order.orderNumber}</Text>
                <View style={{ width: 28 }} />
            </View>

            <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
                {/* Delivery Status */}
                <DeliveryStatusCard
                    status={order.status === 'Unpacked' ? 'Processing' : order.status}
                    subtext={`By ${order.estimatedDelivery}`}
                />

                {/* Delivery Address */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>DELIVERY ADDRESS</Text>
                    <View style={styles.addressCard}>
                        <View style={styles.locationIcon}>
                            <Feather name="map-pin" size={16} color="#6B7280" />
                        </View>
                        <View style={styles.addressContent}>
                            <Text style={styles.addressName}>{order.address.name}</Text>
                            <Text style={styles.addressDetails}>{order.address.addressLine}, {order.address.city}, {order.address.state} - {order.address.pincode}</Text>
                            <Text style={styles.addressPhone}>+91 {order.address.phoneNumber}</Text>
                        </View>
                    </View>
                </View>

                {/* Payment Method */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>PAYMENT METHOD</Text>
                    <View style={styles.paymentCard}>
                        <View style={styles.paymentRow}>
                            <MaterialIcons name="account-balance-wallet" size={24} color="#6B7280" />
                            <Text style={styles.paymentMethodText}>{order.paymentMethod}</Text>
                        </View>
                        <View style={styles.paidBadge}>
                            <Text style={styles.paidText}>PAID</Text>
                        </View>
                    </View>
                </View>

                {/* Items */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>ITEMS</Text>
                    <View style={styles.itemsCard}>
                        {order.items.map((item, index) => (
                            <OrderItemRow
                                key={index}
                                image={item.image}
                                name={item.name}
                                variant={item.variant || ''}
                                quantity={item.quantity}
                                price={item.price}
                            />
                        ))}
                    </View>
                </View>

                {/* Price Details */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>PRICE DETAILS</Text>
                    <View style={styles.priceCard}>
                        <PriceBreakdown
                            itemsTotal={order.subtotal}
                            instantTrialFee={order.isInstant ? order.deliveryFee : 0}
                            deliveryCharges={order.isInstant ? 0 : order.deliveryFee}
                            grandTotal={order.total}
                        />
                    </View>
                </View>

                {/* Action Buttons */}
                <View style={styles.actionButtonsRow}>
                    <TouchableOpacity style={styles.outlineButton}>
                        <Feather name="file-text" size={18} color="#1a1a1a" style={styles.btnIcon} />
                        <Text style={styles.outlineButtonText}>Invoice</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.outlineButton}>
                        <Feather name="help-circle" size={18} color="#1a1a1a" style={styles.btnIcon} />
                        <Text style={styles.outlineButtonText}>Need Help?</Text>
                    </TouchableOpacity>
                </View>

                {/* Track Button */}
                <TouchableOpacity style={styles.primaryButton}>
                    <Text style={styles.primaryButtonText}>Track Order</Text>
                </TouchableOpacity>

                <View style={{ height: 40 }} />
            </ScrollView>
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
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 20,
        paddingVertical: 15,
        backgroundColor: '#fff',
        borderBottomWidth: 1,
        borderBottomColor: '#F3F4F6',
    },
    backBtn: {
        padding: 5,
        marginLeft: -5,
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: '700',
        color: '#1a1a1a',
    },
    scrollContent: {
        padding: 20,
    },
    section: {
        marginBottom: 24,
    },
    sectionTitle: {
        fontSize: 12,
        fontWeight: '700',
        color: '#9CA3AF',
        marginBottom: 8,
        letterSpacing: 0.5,
    },
    addressCard: {
        backgroundColor: '#fff',
        borderRadius: 12,
        padding: 16,
        flexDirection: 'row',
    },
    locationIcon: {
        marginTop: 2,
        marginRight: 12,
    },
    addressContent: {
        flex: 1,
    },
    addressName: {
        fontSize: 14,
        fontWeight: '700',
        color: '#1a1a1a',
        marginBottom: 4,
    },
    addressDetails: {
        fontSize: 13,
        color: '#6B7280',
        lineHeight: 20,
        marginBottom: 4,
    },
    addressPhone: {
        fontSize: 13,
        fontWeight: '500',
        color: '#4B5563',
    },
    paymentCard: {
        backgroundColor: '#fff',
        borderRadius: 12,
        padding: 16,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    paymentRow: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    paymentMethodText: {
        fontSize: 14,
        fontWeight: '500',
        color: '#1a1a1a',
        marginLeft: 12,
    },
    paidBadge: {
        backgroundColor: '#DCFCE7',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 4,
    },
    paidText: {
        fontSize: 10,
        fontWeight: '700',
        color: '#166534',
    },
    itemsCard: {
        backgroundColor: '#fff',
        borderRadius: 12,
        padding: 16,
    },
    priceCard: {
        backgroundColor: '#fff',
        borderRadius: 12,
        padding: 16,
    },
    actionButtonsRow: {
        flexDirection: 'row',
        gap: 12,
        marginBottom: 20,
    },
    outlineButton: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        height: 48,
        backgroundColor: '#fff',
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#E5E7EB',
    },
    btnIcon: {
        marginRight: 8,
    },
    outlineButtonText: {
        fontSize: 14,
        fontWeight: '600',
        color: '#1a1a1a',
    },
    primaryButton: {
        height: 50,
        backgroundColor: '#FBBF24',
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 20,
        shadowColor: '#FBBF24',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 8,
        elevation: 4,
    },
    primaryButtonText: {
        fontSize: 16,
        fontWeight: '700',
        color: '#1a1a1a',
    },
});
