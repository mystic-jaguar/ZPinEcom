import { Feather } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import RefundStatusCard from '../../components/profile/RefundStatusCard';
import ReturnEligibleCard from '../../components/profile/ReturnEligibleCard';

import { useOrder } from '../../context/OrderContext';

export default function ReturnsRefundsScreen() {
    const router = useRouter();
    const { orders } = useOrder();
    const [searchQuery, setSearchQuery] = useState('');
    const [showHistory, setShowHistory] = useState(false);

    // Flatten all items from orders to show in returns list
    // In a real app, you might filter by 'Delivered' status and within return window
    const returnableItems = orders.flatMap(order =>
        order.items.map(item => ({
            ...item,
            orderId: order.orderNumber,
            date: order.createdAt,
            status: order.status
        }))
    );

    // Filter items based on search query
    const filteredItems = returnableItems.filter(item => {
        if (!searchQuery.trim()) return true;
        const query = searchQuery.toLowerCase();
        return (
            item.productName.toLowerCase().includes(query) ||
            item.orderId.toLowerCase().includes(query)
        );
    });

    // Mock completed refunds for history
    const completedRefunds = [
        {
            orderId: 'ZP-95432',
            amount: '₹1,299.00',
            statusLabel: 'COMPLETED',
            completedDate: '15th Nov 2024',
            steps: [
                { label: 'Requested', state: 'completed' as const, icon: 'check' as const },
                { label: 'Picked up', state: 'completed' as const, icon: 'truck' as const },
                { label: 'Refunded', state: 'completed' as const, icon: 'dollar-sign' as const },
            ],
            infoText: 'Refund completed on 15th Nov. Amount credited to your account.'
        },
        {
            orderId: 'ZP-94201',
            amount: '₹899.00',
            statusLabel: 'COMPLETED',
            completedDate: '8th Nov 2024',
            steps: [
                { label: 'Requested', state: 'completed' as const, icon: 'check' as const },
                { label: 'Picked up', state: 'completed' as const, icon: 'truck' as const },
                { label: 'Refunded', state: 'completed' as const, icon: 'dollar-sign' as const },
            ],
            infoText: 'Refund completed on 8th Nov. Amount credited to your account.'
        },
    ];

    return (
        <View style={styles.container}>
            {/* Custom Yellow Header */}
            <SafeAreaView style={styles.headerSafeArea} edges={['top']}>
                <View style={styles.headerContent}>
                    {/* AppBar */}
                    <View style={styles.appBar}>
                        <TouchableOpacity onPress={() => router.back()} style={styles.iconButton}>
                            <Feather name="chevron-left" size={28} color="#1a1a1a" />
                        </TouchableOpacity>
                        <Text style={styles.headerTitle}>Returns & Refunds</Text>
                        <TouchableOpacity onPress={() => router.push('/profile/help-center')} style={styles.iconButton}>
                            <Feather name="help-circle" size={24} color="#1a1a1a" />
                        </TouchableOpacity>
                    </View>

                    {/* Search Bar */}
                    <View style={styles.searchContainer}>
                        <View style={styles.searchBar}>
                            {/* Centered text input styling */}
                            <TextInput
                                placeholder="Find by Order ID or Item name..."
                                placeholderTextColor="#9CA3AF"
                                style={styles.searchInput}
                                textAlign="center"
                                value={searchQuery}
                                onChangeText={setSearchQuery}
                            />
                        </View>
                    </View>
                </View>
            </SafeAreaView>

            <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
                {/* Eligible Section */}
                <View style={styles.sectionHeader}>
                    <Text style={styles.sectionTitle}>Eligible for Return</Text>
                    <Text style={styles.itemCount}>{filteredItems.length} ITEMS</Text>
                </View>

                {filteredItems.length === 0 ? (
                    <View style={styles.emptyState}>
                        <Feather name="inbox" size={48} color="#9CA3AF" />
                        <Text style={styles.emptyText}>
                            {searchQuery ? 'No items match your search' : 'No returnable items'}
                        </Text>
                    </View>
                ) : (
                    filteredItems.map((item, index) => (
                        <ReturnEligibleCard
                            key={`${item.orderId}-${item.productId}-${index}`}
                            image={item.image}
                            status={item.status === 'delivered' ? `DELIVERED ${item.date}` : item.status.toUpperCase()}
                            statusColor={item.status === 'delivered' ? '#D97706' : '#F59E0B'}
                            name={item.productName}
                            variant={item.variant || "Standard Variant"}
                            onInitiate={() => router.push({
                                pathname: '/profile/initiate-return',
                                params: {
                                    productId: item.productId,
                                    orderId: item.orderId,
                                    productName: item.productName,
                                    productImage: item.image
                                }
                            })}
                        />
                    ))
                )}

                {/* Refund Status Section */}
                <View style={styles.sectionHeader}>
                    <Text style={styles.sectionTitle}>Refund Status</Text>
                    <TouchableOpacity onPress={() => setShowHistory(!showHistory)}>
                        <Text style={styles.viewHistoryText}>
                            {showHistory ? 'Hide History' : 'View History'}
                        </Text>
                    </TouchableOpacity>
                </View>

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

                {/* Completed Refunds History */}
                {showHistory && (
                    <View style={styles.historySection}>
                        <Text style={styles.historySectionTitle}>Completed Refunds</Text>
                        {completedRefunds.map((refund, index) => (
                            <RefundStatusCard
                                key={refund.orderId}
                                orderId={refund.orderId}
                                amount={refund.amount}
                                statusLabel={refund.statusLabel}
                                steps={refund.steps}
                                infoText={refund.infoText}
                            />
                        ))}
                    </View>
                )}

                {/* Support Card */}
                <TouchableOpacity
                    style={styles.supportCard}
                    onPress={() => router.push('/profile/help-center')}
                >
                    <View style={styles.supportIconContainer}>
                        {/* Simple face icon representation */}
                        <View style={styles.supportFace}>
                            <View style={styles.eyeRow}>
                                <View style={styles.eye} />
                                <View style={styles.eye} />
                            </View>
                            <View style={styles.mouth} />
                        </View>
                    </View>
                    <View style={styles.supportTextContainer}>
                        <Text style={styles.supportTitle}>Need more help?</Text>
                        <Text style={styles.supportSubtitle}>Chat with our support team</Text>
                    </View>
                    <Feather name="chevron-right" size={24} color="#9CA3AF" />
                </TouchableOpacity>

                {/* Bottom Spacer */}
                <View style={{ height: 40 }} />
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#F8F9FA',
    },
    headerSafeArea: {
        backgroundColor: '#FFD700', // Gold/Yellow main background
        borderBottomLeftRadius: 24,
        borderBottomRightRadius: 24,
        paddingBottom: 24, // Added padding for search bar space
        zIndex: 10
    },
    headerContent: {
        paddingHorizontal: 16,
    },
    appBar: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 12,
        marginBottom: 16,
    },
    headerTitle: {
        fontSize: 20,
        fontWeight: '800',
        color: '#1a1a1a',
    },
    iconButton: {
        padding: 4
    },
    searchContainer: {
        // paddingHorizontal is handled by headerContent
    },
    searchBar: {
        backgroundColor: '#FFFFFF',
        borderRadius: 30, // Fully rounded
        height: 50,
        justifyContent: 'center',
        paddingHorizontal: 20,
    },
    searchInput: {
        fontSize: 14,
        color: '#1a1a1a',
        fontWeight: '500'
    },
    scrollContent: {
        padding: 20,
        paddingTop: 24
    },
    sectionHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 16,
        marginTop: 8,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: '800',
        color: '#111827',
    },
    itemCount: {
        fontSize: 12,
        fontWeight: '700',
        color: '#6B7280',
        letterSpacing: 0.5,
        textTransform: 'uppercase'
    },
    viewHistoryText: {
        fontSize: 14,
        fontWeight: '600',
        color: '#F59E0B',
    },
    supportCard: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#FFFBEB', // Light yellow bg for whole card
        borderRadius: 24,
        padding: 16,
        borderWidth: 1,
        borderColor: '#FEF08A', // Yellow-200
    },
    supportIconContainer: {
        width: 48,
        height: 48,
        borderRadius: 24,
        backgroundColor: '#FFD700',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 16
    },
    // Custom face icon styles for "support"
    supportFace: {
        width: 24,
        height: 24,
        justifyContent: 'center',
        alignItems: 'center'
    },
    eyeRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        width: 14,
        marginBottom: 2
    },
    eye: {
        width: 3,
        height: 3,
        borderRadius: 1.5,
        backgroundColor: '#000'
    },
    mouth: {
        width: 10,
        height: 10,
        borderRadius: 5,
        borderTopWidth: 2,
        borderTopColor: '#000',
        marginTop: -4 // overlap to look like smile
    },
    supportTextContainer: {
        flex: 1
    },
    supportTitle: {
        fontSize: 16,
        fontWeight: '800',
        color: '#111827',
        marginBottom: 2
    },
    supportSubtitle: {
        fontSize: 13,
        color: '#6B7280'
    },
    emptyState: {
        alignItems: 'center',
        paddingVertical: 40,
        paddingHorizontal: 20,
    },
    emptyText: {
        marginTop: 16,
        fontSize: 15,
        color: '#6B7280',
        textAlign: 'center',
    },
    historySection: {
        marginTop: 20,
    },
    historySectionTitle: {
        fontSize: 16,
        fontWeight: '700',
        color: '#6B7280',
        marginBottom: 16,
        textTransform: 'uppercase',
        letterSpacing: 0.5,
    },
});
