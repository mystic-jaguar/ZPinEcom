import { Feather } from '@expo/vector-icons';
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

interface DeliveryStatusCardProps {
    status: string;
    subtext: string;
    icon?: keyof typeof Feather.glyphMap;
}

export default function DeliveryStatusCard({
    status,
    subtext,
    icon = 'truck'
}: DeliveryStatusCardProps) {
    return (
        <View style={styles.card}>
            <View style={styles.iconContainer}>
                <Feather name={icon} size={24} color="#F59E0B" />
            </View>
            <View style={styles.content}>
                <Text style={styles.status}>{status}</Text>
                <Text style={styles.subtext}>{subtext}</Text>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    card: {
        backgroundColor: '#FFFBEB', // Amber-50 (Light Yellow)
        borderRadius: 12,
        padding: 16,
        flexDirection: 'row',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#FEF3C7',
        marginBottom: 20,
    },
    iconContainer: {
        marginRight: 16,
    },
    content: {
        flex: 1,
    },
    status: {
        fontSize: 14,
        fontWeight: '700',
        color: '#1a1a1a',
        marginBottom: 2,
    },
    subtext: {
        fontSize: 12,
        color: '#4B5563',
    },
});
