import React from 'react';
import { Image, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

export type OrderStatus = 'Processing' | 'Delivered' | 'Cancelled' | 'Shipped';

export interface Order {
    id: string;
    orderNumber: string;
    date: string;
    total: string;
    status: OrderStatus;
    items: {
        name: string;
        image: any; // Using any for require() images, or string for remote
    }[];
}

interface OrderCardProps {
    order: Order;
    onPress: () => void;
    onTrack?: () => void;
    onBuyAgain?: () => void;
}

export default function OrderCard({ order, onPress, onTrack, onBuyAgain }: OrderCardProps) {
    const getStatusColor = (status: OrderStatus) => {
        switch (status) {
            case 'Processing':
                return { bg: '#FFFCF2', text: '#FBBF24', border: '#FFFBE6' };
            case 'Delivered':
                return { bg: '#F0FDF4', text: '#22C55E', border: '#DCFCE7' };
            case 'Cancelled':
                return { bg: '#F3F4F6', text: '#6B7280', border: '#E5E7EB' };
            case 'Shipped':
                return { bg: '#EFF6FF', text: '#3B82F6', border: '#DBEAFE' };
            default:
                return { bg: '#F3F4F6', text: '#6B7280', border: '#E5E7EB' };
        }
    };

    const statusColors = getStatusColor(order.status);
    const firstItem = order.items[0];

    return (
        <View style={styles.card}>
            <View style={styles.header}>
                <View style={styles.imageContainer}>
                    <Image source={firstItem.image} style={styles.image} resizeMode="cover" />
                </View>
                <View style={styles.infoContainer}>
                    <View style={styles.topRow}>
                        <Text style={styles.orderNumber}>Order #{order.orderNumber}</Text>
                        <View style={[styles.statusBadge, { backgroundColor: statusColors.bg }]}>
                            <Text style={[styles.statusText, { color: statusColors.text }]}>
                                {order.status.toUpperCase()}
                            </Text>
                        </View>
                    </View>
                    <Text style={styles.date}>Placed on {order.date}</Text>
                    <Text style={styles.total}>{order.total}</Text>
                </View>
            </View>

            <View style={styles.actions}>
                <TouchableOpacity style={styles.outlineButton} onPress={onPress}>
                    <Text style={styles.outlineButtonText}>View Details</Text>
                </TouchableOpacity>

                {order.status === 'Processing' || order.status === 'Shipped' ? (
                    <TouchableOpacity style={styles.primaryButton} onPress={onTrack}>
                        <Text style={styles.primaryButtonText}>Track Order</Text>
                    </TouchableOpacity>
                ) : (
                    <TouchableOpacity style={styles.outlineButton} onPress={onBuyAgain}>
                        <Text style={styles.outlineButtonText}>Buy Again</Text>
                    </TouchableOpacity>
                )}
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    card: {
        backgroundColor: '#fff',
        borderRadius: 16,
        padding: 16,
        marginBottom: 16,
        // Shadow for iOS
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 8,
        // Elevation for Android
        elevation: 2,
    },
    header: {
        flexDirection: 'row',
        marginBottom: 16,
    },
    imageContainer: {
        width: 70,
        height: 70,
        borderRadius: 8,
        backgroundColor: '#F3F4F6',
        overflow: 'hidden',
        marginRight: 12,
    },
    image: {
        width: '100%',
        height: '100%',
    },
    infoContainer: {
        flex: 1,
        justifyContent: 'center',
    },
    topRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: 4,
    },
    orderNumber: {
        fontSize: 14,
        fontWeight: '700',
        color: '#1a1a1a',
    },
    statusBadge: {
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 4,
    },
    statusText: {
        fontSize: 10,
        fontWeight: '700',
    },
    date: {
        fontSize: 12,
        color: '#6B7280',
        marginBottom: 4,
    },
    total: {
        fontSize: 14,
        fontWeight: '700',
        color: '#1a1a1a',
    },
    actions: {
        flexDirection: 'row',
        gap: 12,
    },
    outlineButton: {
        flex: 1,
        height: 40,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: '#E5E7EB',
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#fff',
    },
    outlineButtonText: {
        fontSize: 14,
        fontWeight: '600',
        color: '#374151',
    },
    primaryButton: {
        flex: 1,
        height: 40,
        borderRadius: 8,
        backgroundColor: '#FBBF24',
        justifyContent: 'center',
        alignItems: 'center',
    },
    primaryButtonText: {
        fontSize: 14,
        fontWeight: '600',
        color: '#1a1a1a',
    },
});
