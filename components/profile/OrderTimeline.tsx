import { Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

interface TimelineStepProps {
    title: string;
    date?: string;
    subtext?: string;
    isCompleted: boolean;
    isActive: boolean;
    isLast: boolean;
    icon?: any;
}

function TimelineStep({ title, date, subtext, isCompleted, isActive, isLast, icon }: TimelineStepProps) {
    return (
        <View style={styles.stepContainer}>
            <View style={styles.leftColumn}>
                <View style={[
                    styles.iconCircle,
                    (isCompleted || isActive) && styles.completedCircle,
                    !isCompleted && !isActive && styles.pendingCircle
                ]}>
                    {icon ? (
                        icon
                    ) : isCompleted ? (
                        <Feather name="check" size={14} color="#fff" />
                    ) : (
                        <View style={styles.activeDot} />
                    )}
                </View>
                {!isLast && (
                    <View style={[
                        styles.connectorLine,
                        (isCompleted || isActive) && styles.completedLine
                    ]} />
                )}
            </View>
            <View style={styles.rightColumn}>
                <Text style={[
                    styles.stepTitle,
                    isActive && styles.activeStepTitle
                ]}>{title}</Text>
                {date ? (
                    <Text style={styles.stepDate}>{date}</Text>
                ) : null}
                {subtext ? (
                    <Text style={styles.stepSubtext}>{subtext}</Text>
                ) : null}
            </View>
        </View>
    );
}

export default function OrderTimeline() {
    return (
        <View style={styles.container}>
            <Text style={styles.headerTitle}>ORDER STATUS</Text>

            <View style={styles.content}>
                <TimelineStep
                    title="Order Confirmed"
                    date="Jan 24, 10:30 AM"
                    subtext="Your order has been placed successfully."
                    isCompleted={true}
                    isActive={false}
                    isLast={false}
                />
                <TimelineStep
                    title="Shipped"
                    date="Jan 24, 02:45 PM"
                    subtext="Item has been dispatched from warehouse."
                    isCompleted={true}
                    isActive={false}
                    isLast={false}
                />
                <TimelineStep
                    title="Out for Delivery"
                    date="TODAY, 3:50 PM"
                    subtext="Rahul is on the way with your package."
                    isCompleted={false}
                    isActive={true}
                    isLast={false}
                    icon={<MaterialCommunityIcons name="truck-delivery" size={14} color="#fff" />}
                />
                <TimelineStep
                    title="Delivered"
                    subtext="Estimated by 4:15 PM"
                    isCompleted={false}
                    isActive={false}
                    isLast={true}
                />
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        backgroundColor: '#fff',
        borderRadius: 20,
        padding: 20,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 8,
        elevation: 2,
    },
    headerTitle: {
        fontSize: 12,
        fontWeight: '700',
        color: '#9CA3AF',
        marginBottom: 20,
        letterSpacing: 1,
        textTransform: 'uppercase',
    },
    content: {
        // 
    },
    stepContainer: {
        flexDirection: 'row',
        minHeight: 80,
    },
    leftColumn: {
        alignItems: 'center',
        marginRight: 16,
        width: 30,
    },
    rightColumn: {
        flex: 1,
        paddingBottom: 20,
    },
    iconCircle: {
        width: 24,
        height: 24,
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 2,
    },
    completedCircle: {
        backgroundColor: '#22C55E', // Green
    },
    pendingCircle: {
        backgroundColor: '#F3F4F6', // Lighter Gray
        borderWidth: 0,
    },
    activeDot: {
        width: 8,
        height: 8,
        borderRadius: 4,
        backgroundColor: '#E5E7EB',
    },
    connectorLine: {
        width: 2,
        flex: 1,
        backgroundColor: '#E5E7EB',
        marginVertical: 4,
    },
    completedLine: {
        backgroundColor: '#22C55E',
    },
    stepTitle: {
        fontSize: 15,
        fontWeight: '700',
        color: '#1a1a1a',
        marginBottom: 4,
    },
    activeStepTitle: {
        color: '#22C55E', // Green text for active
    },
    stepDate: {
        fontSize: 12,
        color: '#6B7280',
        marginBottom: 4,
    },
    stepSubtext: {
        fontSize: 13,
        color: '#6B7280',
        lineHeight: 18,
    }
});
