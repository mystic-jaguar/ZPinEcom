import { Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

export default function InstantTrialCard() {
    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <View style={styles.titleRow}>
                    <Feather name="check" size={16} color="#FBBF24" style={styles.checkIcon} />
                    <View style={styles.iconBg}>
                        {/* Placeholder for Tshirt icon */}
                        <View style={styles.tshirtIcon} />
                    </View>
                    <View>
                        <Text style={styles.title}>Instant Trial Active</Text>
                        <Text style={styles.subtitle}>TRY BEFORE YOU BUY</Text>
                    </View>
                </View>
                <View style={styles.timerBadge}>
                    <MaterialCommunityIcons name="timer-outline" size={14} color="#1a1a1a" />
                    <Text style={styles.timerText}>15:00</Text>
                </View>
            </View>

            <Text style={styles.description}>
                Our delivery partner will stay for <Text style={styles.boldText}>15 minutes</Text> so you can try on your items and return them instantly if they don't fit.
            </Text>
        </View>
    );
}

const styles = StyleSheet.create({
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
    },
    checkIcon: {
        marginRight: 8,
    },
    iconBg: {
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: '#FEF3C7', // Light yellow
        marginRight: 12,
        alignItems: 'center',
        justifyContent: 'center',
    },
    tshirtIcon: {
        width: 16,
        height: 16,
        backgroundColor: '#FCD34D',
        borderRadius: 4,
    },
    title: {
        fontSize: 16,
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
        backgroundColor: '#FBBF24',
        paddingHorizontal: 10,
        paddingVertical: 6,
        borderRadius: 20,
    },
    timerText: {
        fontSize: 13,
        fontWeight: '700',
        color: '#1a1a1a',
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
    }
});
