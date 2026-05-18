import { Feather } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import RefundStatusCard from '../../components/profile/RefundStatusCard';
import ReturnEligibleCard from '../../components/profile/ReturnEligibleCard';

import { useOrder } from '../../context/OrderContext';
import { orderService } from '../../services/order';

type ReturnStatusRecord = {
    returnStatus: string;
    reason: string;
    description?: string;
    requestedAt: string;
    updatedAt: string;
};

const RETURN_WINDOW_DAYS = 7;
const ACTIVE_RETURN_STATUSES = new Set(['requested', 'picked_up']);

function isWithinReturnWindow(order: { status: string; updatedAt?: string; createdAt?: string }) {
    if (order.status !== 'delivered') return false;

    const referenceValue = order.updatedAt || order.createdAt;
    if (!referenceValue) return false;

    const referenceDate = new Date(referenceValue);
    if (Number.isNaN(referenceDate.getTime())) return false;

    const elapsedMs = Date.now() - referenceDate.getTime();
    const returnWindowMs = RETURN_WINDOW_DAYS * 24 * 60 * 60 * 1000;

    return elapsedMs >= 0 && elapsedMs <= returnWindowMs;
}

function formatStatusLabel(status: string) {
    return status.replace(/_/g, ' ').toUpperCase();
}

export default function ReturnsRefundsScreen() {
    const router = useRouter();
    const { orders } = useOrder();
    const [searchQuery, setSearchQuery] = useState('');
    const [showHistory, setShowHistory] = useState(false);
    const [isLoadingReturnStatuses, setIsLoadingReturnStatuses] = useState(true);
    const [returnStatusByOrder, setReturnStatusByOrder] = useState<Record<string, ReturnStatusRecord>>({});

    useEffect(() => {
        let cancelled = false;

        const loadReturnStatuses = async () => {
            setIsLoadingReturnStatuses(true);
            const candidateOrders = orders.filter(order =>
                ['delivered', 'return_requested', 'returned'].includes(order.status)
            );

            if (candidateOrders.length === 0) {
                setReturnStatusByOrder({});
                setIsLoadingReturnStatuses(false);
                return;
            }

            const entries = await Promise.all(candidateOrders.map(async order => {
                try {
                    const response = await orderService.getReturnStatus(order.id);
                    return [order.id, (response as any).data] as const;
                } catch {
                    return [order.id, null] as const;
                }
            }));

            if (!cancelled) {
                const nextStatuses = entries.reduce<Record<string, any>>((acc, [orderId, data]) => {
                    if (data) acc[orderId] = data;
                    return acc;
                }, {});
                setReturnStatusByOrder(nextStatuses);
                setIsLoadingReturnStatuses(false);
            }
        };

        loadReturnStatuses();

        return () => {
            cancelled = true;
        };
    }, [orders]);

    const returnableItems = orders.flatMap(order => {
        const returnData = returnStatusByOrder[order.id];
        const hasActiveReturn = Boolean(returnData && ACTIVE_RETURN_STATUSES.has(returnData.returnStatus));

        if (!isWithinReturnWindow(order) || hasActiveReturn || order.status === 'returned' || order.paymentStatus === 'refunded') {
            return [];
        }

        return (order.items || []).map(item => ({
            ...item,
            orderId: order.id,
            orderNumber: order.orderNumber,
            date: order.createdAt,
            status: order.status,
        }));
    });

    // Filter items based on search query
    const filteredItems = returnableItems.filter(item => {
        if (!searchQuery.trim()) return true;
        const query = searchQuery.toLowerCase();
        return (
            item.productName.toLowerCase().includes(query) ||
            item.orderNumber.toLowerCase().includes(query)
        );
    });

    const activeReturns = orders
        .filter(order => {
            const returnData = returnStatusByOrder[order.id];
            return Boolean(returnData && ACTIVE_RETURN_STATUSES.has(returnData.returnStatus));
        })
        .map(order => {
            const returnData = returnStatusByOrder[order.id];
            const currentStatus = returnData?.returnStatus || 'requested';
            const isPickedUp = currentStatus === 'picked_up';

            return {
                orderId: order.orderNumber,
                amount: `₹${(order.finalAmount || 0).toFixed(2)}`,
                statusLabel: formatStatusLabel(currentStatus),
                steps: [
                    { label: 'Requested', state: 'completed' as const, icon: 'check' as const },
                    { label: 'Picked Up', state: isPickedUp ? 'completed' as const : 'active' as const, icon: 'truck' as const },
                    { label: 'Refunded', state: 'pending' as const, icon: 'dollar-sign' as const },
                ],
                infoText: returnData?.reason
                    ? `Return reason: ${returnData.reason}. Current status: ${formatStatusLabel(currentStatus)}.`
                    : `Current status: ${formatStatusLabel(currentStatus)}.`
            };
        });

    const completedRefunds = orders
        .filter(order => {
            return order.status === 'returned';
        })
        .map(order => {
            const returnData = returnStatusByOrder[order.id];

            return {
                orderId: order.orderNumber,
                amount: `₹${(order.finalAmount || 0).toFixed(2)}`,
                statusLabel: 'REFUNDED',
                completedDate: order.updatedAt ? new Date(order.updatedAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '',
                steps: [
                    { label: 'Requested', state: 'completed' as const, icon: 'check' as const },
                    { label: 'Picked Up', state: 'completed' as const, icon: 'truck' as const },
                    { label: 'Refunded', state: 'completed' as const, icon: 'dollar-sign' as const },
                ],
                infoText: returnData?.reason
                    ? `Return reason: ${returnData.reason}. Refund of ₹${(order.finalAmount || 0).toFixed(2)} has been completed.`
                    : `Refund of ₹${(order.finalAmount || 0).toFixed(2)} has been completed.`
            };
        });

    const hasActiveReturns = activeReturns.length > 0;
    const hasRefundHistory = completedRefunds.length > 0;
    const isHistoryVisible = hasActiveReturns ? showHistory : true;

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

                {isLoadingReturnStatuses ? (
                    <View style={styles.emptyState}>
                        <Feather name="refresh-cw" size={48} color="#9CA3AF" />
                        <Text style={styles.emptyText}>Checking return eligibility...</Text>
                    </View>
                ) : filteredItems.length === 0 ? (
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
                            status="RETURN ELIGIBLE"
                            statusColor="#0F766E"
                            name={item.productName}
                            variant={item.variant || 'Standard Variant'}
                            onInitiate={() => {
                                router.push({
                                    pathname: '/profile/cancel-order',
                                    params: {
                                        orderId: item.orderId,
                                        productId: item.productId,
                                        mode: 'return',
                                        name: item.productName,
                                        variant: item.variant,
                                        image: item.image
                                    }
                                });
                            }}
                        />
                    ))
                )}

                {/* Return Tracking Section */}
                {(hasActiveReturns || hasRefundHistory) && (
                    <>
                        <View style={styles.sectionHeader}>
                            <Text style={styles.sectionTitle}>{hasActiveReturns ? 'Return Tracking' : 'Refund History'}</Text>
                            {hasRefundHistory && hasActiveReturns && (
                                <TouchableOpacity onPress={() => setShowHistory(!showHistory)}>
                                    <Text style={styles.viewHistoryText}>
                                        {showHistory ? 'Hide History' : 'View History'}
                                    </Text>
                                </TouchableOpacity>
                            )}
                        </View>

                        {hasActiveReturns && activeReturns.map((returnItem) => (
                            <RefundStatusCard
                                key={returnItem.orderId}
                                orderId={returnItem.orderId}
                                amount={returnItem.amount}
                                statusLabel={returnItem.statusLabel}
                                steps={returnItem.steps}
                                infoText={returnItem.infoText}
                            />
                        ))}

                        {!hasActiveReturns && hasRefundHistory && (
                            <TouchableOpacity onPress={() => setShowHistory(!showHistory)}>
                                <Text style={styles.viewHistoryText}>
                                    {isHistoryVisible ? 'Hide History' : 'View History'}
                                </Text>
                            </TouchableOpacity>
                        )}
                    </>
                )}

                {/* Completed Refunds History */}
                {isHistoryVisible && hasRefundHistory && (
                    <View style={styles.historySection}>
                        <Text style={styles.historySectionTitle}>Refund History</Text>
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
                        <Feather name="headphones" size={24} color="#1a1a1a" />
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
