import { Feather } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React from 'react';
import { ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import HelpBanner from '../../components/common/HelpBanner';
import RefundStatusCard from '../../components/profile/RefundStatusCard';
import ReturnEligibleCard from '../../components/profile/ReturnEligibleCard';

import { useOrder } from '../../context/OrderContext';

export default function ReturnsRefundsScreen() {
    const router = useRouter();
    const { orders } = useOrder();

    // Flatten all items from orders to show in returns list
    // In a real app, you might filter by 'Delivered' status and within return window
    const returnableItems = orders.flatMap(order =>
        order.items.map(item => ({
            ...item,
            orderId: order.orderNumber,
            date: order.date,
            status: order.status
        }))
    );

    return (
        <SafeAreaView style={styles.container} edges={['top']}>
            {/* Custom Header with specific yellow background */}
            <View style={styles.headerContainer}>
                <View style={styles.appBar}>
                    <TouchableOpacity onPress={() => router.back()}>
                        <Feather name="chevron-left" size={28} color="#1a1a1a" />
                    </TouchableOpacity>
                    <Text style={styles.headerTitle}>Returns & Refunds</Text>
                    <TouchableOpacity>
                        <Feather name="help-circle" size={24} color="#1a1a1a" />
                    </TouchableOpacity>
                </View>
                <View style={styles.searchContainer}>
                    <View style={styles.searchBar}>
                        <TextInput
                            placeholder="Find by Order ID or Item name..."
                            placeholderTextColor="#9CA3AF"
                            style={styles.searchInput}
                        />
                        <Feather name="search" size={20} color="#9CA3AF" style={styles.searchIcon} />
                    </View>
                </View>
            </View>

            <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
                {/* Eligible Section */}
                <View style={styles.sectionHeader}>
                    <Text style={styles.sectionTitle}>Eligible for Return</Text>
                    <Text style={styles.itemCount}>{returnableItems.length} ITEMS</Text>
                </View>

                {returnableItems.map((item, index) => (
                    <ReturnEligibleCard
                        key={`${item.orderId}-${item.id}-${index}`}
                        image={item.image}
                        status={item.status === 'Delivered' ? `DELIVERED ON ${item.date}` : item.status.toUpperCase()}
                        statusColor={item.status === 'Delivered' ? '#166534' : '#F59E0B'}
                        name={item.name}
                        variant={item.variant || "Standard Variant"}
                        onInitiate={() => router.push({
                            pathname: '/profile/initiate-return',
                            params: {
                                productId: item.id,
                                orderId: item.orderId
                            }
                        })}
                    />
                ))}

                <RefundStatusCard
                    orderId="ZP-98231"
                    amount="₹2,499.00"
                    statusLabel="IN PROGRESS"
                    steps={[
                        { label: 'Requested', state: 'completed', icon: 'check' },
                        { label: 'Picked up', state: 'active', icon: 'truck' },
                        { label: 'Refunded', state: 'pending', icon: 'dollar-sign' },
                    ]}
                    infoText="The item was picked up on 24th Oct. Your refund will be processed within 3-5 business days."
                />

                {/* Help Section */}
                <View style={styles.mt20}>
                    <HelpBanner />
                </View>

                {/* Bottom Spacer */}
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
    headerContainer: {
        backgroundColor: '#fff',
        paddingBottom: 20,
    },
    appBar: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 20,
        paddingVertical: 10,
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: '700',
        color: '#1a1a1a',
    },
    searchContainer: {
        paddingHorizontal: 20,
        marginTop: 10,
    },
    searchBar: {
        backgroundColor: '#F8F9FA',
        borderRadius: 25,
        height: 45,
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 15,
        borderWidth: 1,
        borderColor: '#E5E7EB',
    },
    searchInput: {
        flex: 1,
        fontSize: 14,
        color: '#1a1a1a',
    },
    searchIcon: {
        marginLeft: 8,
    },
    scrollContent: {
        padding: 20,
    },
    sectionHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 15,
        marginTop: 5,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: '700',
        color: '#1a1a1a',
    },
    itemCount: {
        fontSize: 12,
        fontWeight: '700',
        color: '#6B7280',
        letterSpacing: 0.5,
    },
    viewHistory: {
        fontSize: 14,
        fontWeight: '600',
        color: '#F59E0B',
    },
    mt20: {
        marginTop: 20,
    },
});
