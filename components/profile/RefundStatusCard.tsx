import { Feather } from '@expo/vector-icons';
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

export type RefundStepState = 'pending' | 'active' | 'completed';

interface RefundStatusCardProps {
    orderId: string;
    amount: string;
    statusLabel: string; // e.g., "IN PROGRESS"
    steps: {
        label: string;
        state: RefundStepState;
        icon: keyof typeof Feather.glyphMap;
    }[];
    infoText?: string;
}

export default function RefundStatusCard({
    orderId,
    amount,
    statusLabel,
    steps,
    infoText
}: RefundStatusCardProps) {
    return (
        <View style={styles.card}>
            <View style={styles.header}>
                <View>
                    <Text style={styles.orderId}>Order #{orderId}</Text>
                    <Text style={styles.amount}>Refund amount: {amount}</Text>
                </View>
                <View style={styles.badge}>
                    <Text style={styles.badgeText}>{statusLabel}</Text>
                </View>
            </View>

            <View style={styles.stepperWrapper}>
                {/* Horizontal Line Background - absolute to sit behind circles */}
                <View style={styles.lineBackground} />

                <View style={styles.stepperContainer}>
                    {steps.map((step, index) => {
                        const isCompleted = step.state === 'completed';
                        const isActive = step.state === 'active';
                        // Determine fill color for circle
                        const circleColor = isCompleted || isActive ? '#FFD700' : '#E5E7EB';
                        const iconColor = isCompleted || isActive ? '#1a1a1a' : '#9CA3AF';

                        return (
                            <View key={index} style={styles.stepItem}>
                                <View style={[styles.iconCircle, { backgroundColor: circleColor }]}>
                                    <Feather name={step.icon} size={14} color={iconColor} />
                                </View>
                                <Text style={[
                                    styles.stepLabel,
                                    (isCompleted || isActive) ? styles.activeLabel : styles.inactiveLabel
                                ]}>
                                    {step.label}
                                </Text>
                            </View>
                        );
                    })}
                </View>
                {/* Current implementation aligns line by absolute positioning or flex, we'll use a simple absolute line approach behind circles */}
            </View>

            {infoText && (
                <View style={styles.infoBox}>
                    <View style={styles.infoIconContainer}>
                        <Feather name="info" size={16} color="#3B82F6" />
                    </View>
                    <Text style={styles.infoText}>{infoText}</Text>
                </View>
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    card: {
        backgroundColor: '#fff',
        borderRadius: 24,
        padding: 20,
        marginBottom: 20,
        // Shadow around card
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.05,
        shadowRadius: 10,
        elevation: 2,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: 24,
    },
    orderId: {
        fontSize: 16,
        fontWeight: '800',
        color: '#111827',
        marginBottom: 4,
    },
    amount: {
        fontSize: 14,
        color: '#6B7280',
    },
    badge: {
        backgroundColor: '#DCFCE7', // Green-100
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 12,
    },
    badgeText: {
        fontSize: 10,
        fontWeight: '700',
        color: '#166534', // Green-800
        textTransform: 'uppercase'
    },
    stepperWrapper: {
        position: 'relative',
        marginBottom: 24,
        paddingHorizontal: 10 // To allow labels to overflow a bit without clip if needed
    },
    lineBackground: {
        position: 'absolute',
        top: 14, // Roughly half of circle height (30/2 = 15) minus half line height (2/1=1) -> 14
        left: 25, // Start after first circle's center
        right: 25, // End before last circle's center
        height: 2,
        backgroundColor: '#E5E7EB', // Gray line background
        zIndex: 0,
    },
    stepperContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        zIndex: 1,
    },
    stepItem: {
        alignItems: 'center',
        width: 70, // Fixed width to center text
    },
    iconCircle: {
        width: 30,
        height: 30,
        borderRadius: 15,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 8,
    },
    stepLabel: {
        fontSize: 12,
        fontWeight: '600',
        textAlign: 'center',
    },
    activeLabel: {
        color: '#111827',
    },
    inactiveLabel: {
        color: '#9CA3AF',
    },
    infoBox: {
        flexDirection: 'row',
        backgroundColor: '#F3F4F6', // Light gray bg
        padding: 16,
        borderRadius: 16,
        alignItems: 'flex-start',
    },
    infoIconContainer: {
        width: 24,
        height: 24,
        borderRadius: 12,
        backgroundColor: '#EFF6FF',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 10,
    },
    infoText: {
        flex: 1,
        fontSize: 13,
        color: '#4B5563',
        lineHeight: 18,
    },
});
