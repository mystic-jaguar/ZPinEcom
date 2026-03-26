import { MaterialCommunityIcons } from '@expo/vector-icons';
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

export default function StandardDeliveryCard() {
    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <View style={styles.iconBg}>
                    <MaterialCommunityIcons name="package-variant-closed" size={20} color="#CA8A04" />
                </View>
                <View>
                    <Text style={styles.title}>Standard Delivery</Text>
                    <Text style={styles.subtitle}>STANDARD GROUND SHIPPING</Text>
                </View>
            </View>

            <Text style={styles.description}>
                This is standard delivery. Your package is handled with care through our logistics network to ensure safe arrival at your doorstep.
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
        alignItems: 'center',
        marginBottom: 16,
    },
    iconBg: {
        width: 48,
        height: 48,
        borderRadius: 12,
        backgroundColor: '#FEF9C3', // Light yellow/cream
        marginRight: 16,
        alignItems: 'center',
        justifyContent: 'center',
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
        fontWeight: '600',
        textTransform: 'uppercase',
    },
    description: {
        fontSize: 13,
        lineHeight: 20,
        color: '#6B7280',
    }
});
