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
                <Text style={styles.orderId}>Order #{orderId}</Text>
                <View style={styles.badge}>
                    <Text style={styles.badgeText}>{statusLabel}</Text>
                </View>
            </View>
            <Text style={styles.amount}>Refund amount: {amount}</Text>

            <View style={styles.stepperContainer}>
                {steps.map((step, index) => {
                    const isActive = step.state === 'active';
                    const isCompleted = step.state === 'completed';
                    const isLast = index === steps.length - 1;

                    return (
                        <View key={index} style={[styles.stepWrapper, !isLast && { flex: 1 }]}>
                            <View style={styles.iconContainer}>
                                <View style={[
                                    styles.iconCircle,
                                    (isActive || isCompleted) ? styles.activeCircle : styles.inactiveCircle
                                ]}>
                                    <Feather
                                        name={step.icon}
                                        size={14}
                                        color={(isActive || isCompleted) ? '#1a1a1a' : '#9CA3AF'}
                                    />
                                </View>
                                <Text style={[
                                    styles.stepLabel,
                                    (isActive || isCompleted) ? styles.activeLabel : styles.inactiveLabel
                                ]}>{step.label}</Text>
                            </View>

                            {/* Line connector */}
                            {!isLast && (
                                <View style={[
                                    styles.connector,
                                    (steps[index + 1].state !== 'pending') ? styles.activeConnector : styles.inactiveConnector
                                ]} />
                            )}
                        </View>
                    );
                })}
            </View>

            {infoText && (
                <View style={styles.infoBox}>
                    <Feather name="info" size={16} color="#3B82F6" style={styles.infoIcon} />
                    <Text style={styles.infoText}>{infoText}</Text>
                </View>
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    card: {
        backgroundColor: '#fff',
        borderRadius: 16,
        padding: 20,
        marginBottom: 20,
        // Shadow
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 8,
        elevation: 2,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 4,
    },
    orderId: {
        fontSize: 16,
        fontWeight: '700',
        color: '#1a1a1a',
    },
    badge: {
        backgroundColor: '#DCFCE7', // Green-100
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 12,
    },
    badgeText: {
        fontSize: 10,
        fontWeight: '700',
        color: '#166534', // Green-800
    },
    amount: {
        fontSize: 14,
        color: '#6B7280',
        marginBottom: 24,
    },
    stepperContainer: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        marginBottom: 24,
        // Ensure steps take up space properly
        justifyContent: 'space-between',
    },
    stepWrapper: {
        flexDirection: 'row',
        alignItems: 'center', // Align line with circle center vertical
    },
    iconContainer: {
        alignItems: 'center',
        zIndex: 1, // Above line
        width: 60, // Fixed width for label centering
    },
    iconCircle: {
        width: 32,
        height: 32,
        borderRadius: 16,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 8,
    },
    activeCircle: {
        backgroundColor: '#FBBF24', // Yellow
    },
    inactiveCircle: {
        backgroundColor: '#F3F4F6',
    },
    stepLabel: {
        fontSize: 12,
        fontWeight: '600',
        textAlign: 'center',
    },
    activeLabel: {
        color: '#1a1a1a',
    },
    inactiveLabel: {
        color: '#D1D5DB', // Light gray
    },
    connector: {
        height: 2,
        flex: 1,
        marginTop: -25, // Pull up to align with circle center (approx)
        marginHorizontal: -15, // Overlap to connect
    },
    activeConnector: {
        backgroundColor: '#FBBF24',
    },
    inactiveConnector: {
        backgroundColor: '#F3F4F6',
    },
    infoBox: {
        flexDirection: 'row',
        backgroundColor: '#EFF6FF', // Blue-50
        padding: 12,
        borderRadius: 8,
        alignItems: 'flex-start',
    },
    infoIcon: {
        marginTop: 2,
        marginRight: 8,
    },
    infoText: {
        flex: 1,
        fontSize: 12,
        color: '#4B5563',
        lineHeight: 18,
    },
});
