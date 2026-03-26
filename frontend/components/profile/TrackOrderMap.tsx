import { Feather, FontAwesome5, Ionicons } from '@expo/vector-icons';
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

interface TrackOrderMapProps {
    isInstant?: boolean;
    orderId?: string; // Make dynamic
}

export default function TrackOrderMap({ isInstant = true, orderId = "ZPIN-88219" }: TrackOrderMapProps) {
    return (
        <View style={styles.container}>
            {/* Map Placeholder Background */}
            <View style={styles.mapBackground}>
                {/* Curvy Path Background (Simulated) */}
                <View style={styles.pathLine} />

                {/* Scooter/Truck Icon Bubble */}
                <View style={styles.driverMarkerContainer}>
                    <View style={styles.driverMarkerBubble}>
                        <View style={styles.scooterIconCircle}>
                            {isInstant ? (
                                <FontAwesome5 name="motorcycle" size={20} color="#1a1a1a" />
                            ) : (
                                <FontAwesome5 name="truck" size={18} color="#1a1a1a" />
                            )}
                        </View>
                    </View>
                    <View style={styles.statusPill}>
                        <Text style={styles.statusPillText}>{isInstant ? "RAHUL IS NEAR" : "IN TRANSIT"}</Text>
                    </View>
                    {/* Shadow/Pointer */}
                    <View style={styles.pointerTriangle} />
                </View>

                {/* Home Icon */}
                <View style={styles.homeMarker}>
                    <Ionicons name="home" size={18} color="#FBBF24" />
                </View>
            </View>

            {/* Header Overlay - Moved down to avoid overlap with Back Button */}
            <View style={styles.headerOverlay}>
                <View>
                    <Text style={styles.orderIdText}>ORDER ID: #{orderId}</Text>
                    <Text style={styles.timeText}>{isInstant ? "Today, 4:15 PM" : "Friday, 26 Jan"}</Text>
                    <Text style={styles.subTimeText}>Estimated Delivery</Text>
                </View>
                <View style={styles.fastBadge}>
                    {isInstant ? (
                        <>
                            <Feather name="zap" size={16} color="#1a1a1a" style={{ marginRight: 4 }} />
                            <Text style={styles.fastBadgeText}>FAST</Text>
                        </>
                    ) : (
                        <>
                            <FontAwesome5 name="truck" size={12} color="#1a1a1a" style={{ marginRight: 6 }} />
                            <Text style={styles.fastBadgeText}>STD</Text>
                        </>
                    )}
                </View>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        height: 400, // Increase height slightly to accommodate lower content
        backgroundColor: '#FFD700',
        overflow: 'hidden',
        borderBottomLeftRadius: 30,
        borderBottomRightRadius: 30,
        zIndex: 1,
    },
    headerOverlay: {
        position: 'absolute',
        top: 110, // Moved down significantly to clear header/back button area
        left: 20,
        right: 20,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        zIndex: 10,
    },
    orderIdText: {
        fontSize: 12,
        fontWeight: '600',
        color: '#4B5563',
        marginBottom: 4,
        letterSpacing: 0.5,
    },
    timeText: {
        fontSize: 22, // Slightly smaller
        fontWeight: '800',
        color: '#1a1a1a',
        marginBottom: 2,
    },
    subTimeText: {
        fontSize: 14,
        color: '#4B5563',
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
    fastBadgeText: {
        fontSize: 14,
        fontWeight: '800',
        color: '#1a1a1a',
        fontStyle: 'italic',
    },
    mapBackground: {
        flex: 1,
        marginTop: 180, // Push map content down further
        backgroundColor: '#CFEAD8',
        borderTopLeftRadius: 100,
        borderTopRightRadius: 100,
        transform: [{ scaleX: 1.5 }],
        alignItems: 'center',
        justifyContent: 'center',
    },
    pathLine: {
        position: 'absolute',
        width: 2,
        height: 200,
        borderStyle: 'dashed',
        borderWidth: 2,
        borderColor: '#fff',
        opacity: 0.5,
        transform: [{ rotate: '45deg' }] // Add some rotation like in second image
    },
    driverMarkerContainer: {
        alignItems: 'center',
        marginBottom: 40, // Move up slightly
        transform: [{ scaleX: 0.67 }]
    },
    driverMarkerBubble: {
        width: 60, // Smaller
        height: 60,
        backgroundColor: '#fff',
        borderRadius: 30,
        alignItems: 'center',
        justifyContent: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
        elevation: 4,
        marginBottom: -8,
        zIndex: 2,
    },
    scooterIconCircle: {
        width: 40, // Smaller
        height: 40,
        backgroundColor: '#FBBF24',
        borderRadius: 20,
        alignItems: 'center',
        justifyContent: 'center',
    },
    statusPill: {
        backgroundColor: '#000',
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 8,
        zIndex: 3,
    },
    statusPillText: {
        color: '#fff',
        fontSize: 10,
        fontWeight: '700',
    },
    pointerTriangle: {
        width: 0,
        height: 0,
        backgroundColor: 'transparent',
        borderStyle: 'solid',
        borderLeftWidth: 8,
        borderRightWidth: 8,
        borderBottomWidth: 16,
        borderLeftColor: 'transparent',
        borderRightColor: 'transparent',
        borderBottomColor: '#fff',
        transform: [{ rotate: '180deg' }],
        marginTop: -4,
        opacity: 0.8
    },
    homeMarker: {
        position: 'absolute',
        right: 80,
        bottom: 100,
        width: 40,
        height: 40,
        backgroundColor: '#fff',
        borderRadius: 20,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 2,
        borderColor: '#FBBF24',
        transform: [{ scaleX: 0.67 }]
    }
});
