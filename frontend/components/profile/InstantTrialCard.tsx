import { Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import React, { useEffect, useRef, useState } from 'react';
import { View } from 'react-native';
import { Text } from '../ui/ScaledText';
import { createStyles } from '../../constants/theme';

interface InstantTrialCardProps {
    isDelivered?: boolean;
    deliveredAt?: string; // ISO timestamp of when order was delivered
}

const TRIAL_SECONDS = 15 * 60; // 15 minutes

function formatTime(seconds: number): string {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

export default function InstantTrialCard({ isDelivered = false, deliveredAt }: InstantTrialCardProps) {
    // Calculate remaining seconds based on deliveredAt timestamp
    const getInitialSeconds = (): number => {
        if (!isDelivered) return TRIAL_SECONDS;
        if (!deliveredAt) return TRIAL_SECONDS;
        const elapsed = Math.floor((Date.now() - new Date(deliveredAt).getTime()) / 1000);
        return Math.max(0, TRIAL_SECONDS - elapsed);
    };

    const [secondsLeft, setSecondsLeft] = useState(getInitialSeconds);
    const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

    useEffect(() => {
        if (!isDelivered || secondsLeft <= 0) {
            // Clear any existing interval when conditions are not met
            if (intervalRef.current) {
                clearInterval(intervalRef.current);
                intervalRef.current = null;
            }
            return;
        }

        intervalRef.current = setInterval(() => {
            setSecondsLeft(prev => {
                if (prev <= 1) {
                    if (intervalRef.current) {
                        clearInterval(intervalRef.current);
                        intervalRef.current = null;
                    }
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);

        return () => {
            if (intervalRef.current) {
                clearInterval(intervalRef.current);
                intervalRef.current = null;
            }
        };
    }, [isDelivered, secondsLeft]);

    const isExpired = isDelivered && secondsLeft === 0;
    const isRunning = isDelivered && secondsLeft > 0;

    // Colour shifts red when under 3 minutes
    const timerColor = secondsLeft < 180 ? '#EF4444' : '#FBBF24';

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <View style={styles.titleRow}>
                    <Feather name="check" size={16} color="#FBBF24" style={styles.checkIcon} />
                    <View style={styles.iconBg}>
                        <MaterialCommunityIcons name="tshirt-crew" size={18} color="#F59E0B" />
                    </View>
                    <View>
                        <Text style={styles.title}>
                            {isExpired ? 'Trial Expired' : 'Instant Trial Active'}
                        </Text>
                        <Text style={styles.subtitle}>TRY BEFORE YOU BUY</Text>
                    </View>
                </View>

                <View style={[styles.timerBadge, { backgroundColor: isRunning ? timerColor : '#F3F4F6' }]}>
                    <MaterialCommunityIcons
                        name="timer-outline"
                        size={14}
                        color={isRunning ? '#1a1a1a' : '#9CA3AF'}
                    />
                    <Text style={[styles.timerText, { color: isRunning ? '#1a1a1a' : '#9CA3AF' }]}>
                        {isDelivered ? formatTime(secondsLeft) : '15:00'}
                    </Text>
                </View>
            </View>

            <Text style={styles.description}>
                {isExpired
                    ? 'Your 15-minute trial window has ended. Please return any unwanted items.'
                    : isRunning
                        ? <>Our delivery partner is waiting. Try on your items and return them instantly if they don&apos;t fit. <Text style={styles.boldText}>{formatTime(secondsLeft)} remaining.</Text></>
                        : <>Our delivery partner will stay for <Text style={styles.boldText}>15 minutes</Text> so you can try on your items and return them instantly if they don&apos;t fit.</>
                }
            </Text>
        </View>
    );
}

const styles = createStyles({
    container: {
        backgroundColor: '#fff',
        borderRadius: 20,
        padding: 20,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.05,
        shadowRadius: 10,
        elevation: 3,
        marginBottom: 24,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: 16,
    },
    titleRow: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
    },
    checkIcon: {
        marginRight: 8,
    },
    iconBg: {
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: '#FEF3C7',
        marginRight: 12,
        alignItems: 'center',
        justifyContent: 'center',
    },
    title: {
        fontSize: 15,
        fontWeight: '700',
        color: '#1a1a1a',
        marginBottom: 2,
    },
    subtitle: {
        fontSize: 11,
        color: '#6B7280',
        letterSpacing: 0.5,
    },
    timerBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 10,
        paddingVertical: 6,
        borderRadius: 20,
        minWidth: 72,
        justifyContent: 'center',
    },
    timerText: {
        fontSize: 13,
        fontWeight: '700',
        marginLeft: 4,
    },
    description: {
        fontSize: 13,
        lineHeight: 20,
        color: '#6B7280',
    },
    boldText: {
        fontWeight: '700',
        color: '#1a1a1a',
    },
});
