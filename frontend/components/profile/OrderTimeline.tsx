import { Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import React, { useEffect, useRef } from 'react';
import { Animated, StyleSheet, Text, View } from 'react-native';

const STEPS = [
    {
        key: 'confirmed',
        title: 'Order Confirmed',
        subtext: 'Your order has been placed successfully.',
        icon: null,
    },
    {
        key: 'shipped',
        title: 'Shipped',
        subtext: 'Item has been dispatched from warehouse.',
        icon: null,
    },
    {
        key: 'out_for_delivery',
        title: 'Out for Delivery',
        subtext: 'Your package is on the way.',
        icon: <MaterialCommunityIcons name="truck-delivery" size={14} color="#fff" />,
    },
    {
        key: 'delivered',
        title: 'Delivered',
        subtext: 'Package delivered successfully.',
        icon: null,
    },
];

// Map order status → active step index (0-based)
function statusToStep(status?: string): number {
    switch (status) {
        case 'confirmed':   return 0;
        case 'shipped':     return 1;
        case 'out_for_delivery':
        case 'processing':  return 2;
        case 'delivered':   return 3;
        default:            return 0; // pending → show first step active
    }
}

interface OrderTimelineProps {
    status?: string;
    dates?: string[];
}

interface StepProps {
    title: string;
    subtext?: string;
    date?: string;
    icon?: React.ReactNode | null;
    isCompleted: boolean;
    isActive: boolean;
    isLast: boolean;
    lineProgress: Animated.Value; // 0→1 fill of the connector below this step
}

function TimelineStep({ title, subtext, date, icon, isCompleted, isActive, isLast, lineProgress }: StepProps) {
    const lineHeight = lineProgress.interpolate({
        inputRange: [0, 1],
        outputRange: ['0%', '100%'],
    });

    return (
        <View style={styles.stepContainer}>
            {/* Left column: circle + animated line */}
            <View style={styles.leftColumn}>
                <View style={[
                    styles.iconCircle,
                    (isCompleted || isActive) ? styles.completedCircle : styles.pendingCircle,
                ]}>
                    {isCompleted ? (
                        <Feather name="check" size={14} color="#fff" />
                    ) : isActive ? (
                        icon || <View style={styles.activePulse} />
                    ) : (
                        <View style={styles.pendingDot} />
                    )}
                </View>

                {!isLast && (
                    <View style={styles.lineTrack}>
                        {/* Grey background line */}
                        <View style={styles.lineBackground} />
                        {/* Animated green fill */}
                        <Animated.View style={[styles.lineFill, { height: lineHeight }]} />
                    </View>
                )}
            </View>

            {/* Right column: text */}
            <View style={styles.rightColumn}>
                <Text style={[styles.stepTitle, isActive && styles.activeTitle]}>
                    {title}
                </Text>
                {date ? <Text style={styles.stepDate}>{date}</Text> : null}
                {subtext ? <Text style={styles.stepSubtext}>{subtext}</Text> : null}
            </View>
        </View>
    );
}

export default function OrderTimeline({ status, dates }: OrderTimelineProps) {
    const activeStep = statusToStep(status);

    // One Animated.Value per connector line (3 lines for 4 steps)
    const lineAnims = useRef(STEPS.slice(0, -1).map(() => new Animated.Value(0))).current;

    useEffect(() => {
        // Animate lines sequentially — each fills after a 300ms delay
        const animations = lineAnims.slice(0, activeStep).map((anim, i) =>
            Animated.sequence([
                Animated.delay(i * 350),
                Animated.timing(anim, {
                    toValue: 1,
                    duration: 500,
                    useNativeDriver: false, // height % doesn't support native driver
                }),
            ])
        );
        Animated.parallel(animations).start();
    }, [activeStep]);

    return (
        <View style={styles.container}>
            <Text style={styles.headerTitle}>ORDER STATUS</Text>
            <View style={styles.content}>
                {STEPS.map((step, i) => (
                    <TimelineStep
                        key={step.key}
                        title={step.title}
                        subtext={step.subtext}
                        date={dates?.[i]}
                        icon={step.icon}
                        isCompleted={i < activeStep}
                        isActive={i === activeStep}
                        isLast={i === STEPS.length - 1}
                        lineProgress={lineAnims[i] ?? new Animated.Value(0)}
                    />
                ))}
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
    content: {},
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
        width: 28,
        height: 28,
        borderRadius: 14,
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 2,
    },
    completedCircle: {
        backgroundColor: '#22C55E',
    },
    pendingCircle: {
        backgroundColor: '#F3F4F6',
        borderWidth: 2,
        borderColor: '#E5E7EB',
    },
    activePulse: {
        width: 10,
        height: 10,
        borderRadius: 5,
        backgroundColor: '#fff',
    },
    pendingDot: {
        width: 8,
        height: 8,
        borderRadius: 4,
        backgroundColor: '#D1D5DB',
    },
    lineTrack: {
        flex: 1,
        width: 2,
        marginVertical: 4,
        position: 'relative',
        overflow: 'hidden',
    },
    lineBackground: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: '#E5E7EB',
    },
    lineFill: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        backgroundColor: '#22C55E',
    },
    stepTitle: {
        fontSize: 15,
        fontWeight: '700',
        color: '#1a1a1a',
        marginBottom: 4,
    },
    activeTitle: {
        color: '#22C55E',
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
    },
});
