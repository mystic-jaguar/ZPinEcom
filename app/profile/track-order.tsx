import { Feather, FontAwesome5 } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import DeliveryPartnerCard from '../../components/profile/DeliveryPartnerCard';
import InstantTrialCard from '../../components/profile/InstantTrialCard';
import OrderTimeline from '../../components/profile/OrderTimeline';
import StandardDeliveryCard from '../../components/profile/StandardDeliveryCard';
import { useOrder } from '../../context/OrderContext';

export default function TrackOrderScreen() {
    const router = useRouter();
    const params = useLocalSearchParams();
    const { orderId } = params;
    const { getOrderById } = useOrder();

    // Retrieve Order
    const order = getOrderById(orderId as string);
    const isInstant = order?.isInstant ?? false;
    const isStandard = !isInstant;

    return (
        <View style={styles.mainContainer}>
            {/* Custom Yellow Header */}
            <View style={styles.headerContainer}>
                {/* Navigation Row */}
                <View style={styles.navRow}>
                    <TouchableOpacity onPress={() => router.back()} style={styles.iconButton}>
                        <Feather name="chevron-left" size={28} color="#1a1a1a" />
                    </TouchableOpacity>

                    <Text style={styles.headerTitle}>Track Order</Text>

                    <TouchableOpacity style={styles.iconButton}>
                        <Feather name="help-circle" size={24} color="#1a1a1a" />
                    </TouchableOpacity>
                </View>

                {/* Order Info */}
                <View style={styles.orderInfoContainer}>
                    <View style={styles.orderTextColumn}>
                        <Text style={styles.orderIdLabel}>ORDER ID: #{order?.orderNumber ?? "ZPIN-88219"}</Text>
                        <Text style={styles.estimatedTime}>
                            {isInstant ? "Today, 4:15 PM" : "Friday, 26 Jan"}
                        </Text>
                        <Text style={styles.estimatedLabel}>Estimated Delivery</Text>
                    </View>

                    <View style={styles.badgeContainer}>
                        {isInstant ? (
                            <View style={styles.fastBadge}>
                                <Feather name="zap" size={16} color="#1a1a1a" style={{ marginRight: 4 }} />
                                <Text style={styles.badgeText}>FAST</Text>
                            </View>
                        ) : (
                            <View style={styles.stdBadge}>
                                <FontAwesome5 name="truck" size={12} color="#1a1a1a" style={{ marginRight: 6 }} />
                                <Text style={styles.badgeText}>STD</Text>
                            </View>
                        )}
                    </View>
                </View>
            </View>

            <View style={styles.contentContainer}>
                {/* Scrollable Content Sheet */}
                <ScrollView
                    style={styles.scrollView}
                    contentContainerStyle={styles.scrollContent}
                    showsVerticalScrollIndicator={false}
                >
                    <View style={styles.overlapContainer}>
                        {/* Conditional Info Card (Overlapping) */}
                        {isInstant ? (
                            <InstantTrialCard />
                        ) : (
                            <StandardDeliveryCard />
                        )}
                    </View>

                    <View style={styles.sheetContent}>
                        {/* Timeline Card */}
                        <View style={styles.sectionContainer}>
                            <OrderTimeline />
                        </View>

                        {/* Delivery Partner */}
                        <View style={styles.sectionContainer}>
                            <DeliveryPartnerCard />
                        </View>

                        {/* Bottom Spacer */}
                        <View style={{ height: 100 }} />
                    </View>
                </ScrollView>

                {/* Bottom Actions - Fixed */}
                <View style={styles.bottomActions}>
                    <TouchableOpacity
                        style={styles.viewOrderBtn}
                        onPress={() => router.back()}
                    >
                        <Text style={styles.viewOrderText}>View Order</Text>
                    </TouchableOpacity>

                    <TouchableOpacity style={styles.contactSupportBtn}>
                        <Text style={styles.contactSupportText}>Contact Support</Text>
                    </TouchableOpacity>
                </View>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    mainContainer: {
        flex: 1,
        backgroundColor: '#F8F9FA',
    },
    headerContainer: {
        backgroundColor: '#FFD700', // Yellow
        paddingTop: 60, // Status bar
        paddingBottom: 60, // Extra padding for overlap
        paddingHorizontal: 20,
        borderBottomLeftRadius: 30,
        borderBottomRightRadius: 30,
        zIndex: 1,
    },
    navRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 24,
    },
    iconButton: {
        width: 40,
        height: 40,
        alignItems: 'center',
        justifyContent: 'center',
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: '700',
        color: '#1a1a1a',
    },
    orderInfoContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
    },
    orderTextColumn: {
        flex: 1,
    },
    orderIdLabel: {
        fontSize: 12,
        fontWeight: '600',
        color: '#4B5563',
        marginBottom: 6,
        letterSpacing: 0.5,
        textTransform: 'uppercase',
    },
    estimatedTime: {
        fontSize: 26,
        fontWeight: '800',
        color: '#1a1a1a',
        marginBottom: 4,
    },
    estimatedLabel: {
        fontSize: 14,
        color: '#4B5563',
        fontWeight: '500',
    },
    badgeContainer: {
        marginLeft: 16,
    },
    fastBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#FFE585',
        paddingHorizontal: 16,
        paddingVertical: 10,
        borderRadius: 20,
        transform: [{ skewX: '-10deg' }]
    },
    stdBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#FFE585',
        paddingHorizontal: 16,
        paddingVertical: 10,
        borderRadius: 20,
        transform: [{ skewX: '-10deg' }]
    },
    badgeText: {
        fontSize: 14,
        fontWeight: '800',
        color: '#1a1a1a',
        fontStyle: 'italic',
    },
    contentContainer: {
        flex: 1,
        marginTop: -40, // Pull up to overlap header padding
        zIndex: 10, // Ensure content sits on top of header
    },
    scrollView: {
        flex: 1,
    },
    scrollContent: {
        paddingHorizontal: 20,
        paddingBottom: 20,
    },
    overlapContainer: {
        marginBottom: 24,
    },
    sheetContent: {
        //
    },
    sectionContainer: {
        marginBottom: 24,
    },
    bottomActions: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        backgroundColor: '#fff',
        flexDirection: 'row',
        padding: 20,
        paddingBottom: 40,
        borderTopWidth: 1,
        borderTopColor: '#F3F4F6',
        gap: 16,
    },
    viewOrderBtn: {
        flex: 1,
        height: 54,
        borderRadius: 16,
        borderWidth: 2,
        borderColor: '#FBBF24',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#fff',
    },
    viewOrderText: {
        fontSize: 16,
        fontWeight: '700',
        color: '#1a1a1a',
    },
    contactSupportBtn: {
        flex: 1.5,
        height: 54,
        borderRadius: 16,
        backgroundColor: '#FBBF24',
        alignItems: 'center',
        justifyContent: 'center',
        shadowColor: '#FBBF24',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 8,
        elevation: 4,
    },
    contactSupportText: {
        fontSize: 16,
        fontWeight: '700',
        color: '#1a1a1a',
    },
});
