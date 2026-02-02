import React from 'react';
import { Image, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

interface ReturnEligibleCardProps {
    image: any;
    status: string;
    statusColor?: string;
    name: string;
    variant: string;
    onInitiate: () => void;
}

export default function ReturnEligibleCard({
    image,
    status,
    statusColor = '#EAB308', // Default yellow-500
    name,
    variant,
    onInitiate
}: ReturnEligibleCardProps) {
    return (
        <View style={styles.card}>
            <View style={styles.content}>
                <View style={styles.imageContainer}>
                    <Image source={image} style={styles.image} resizeMode="contain" />
                </View>
                <View style={styles.details}>
                    <Text style={[styles.status, { color: statusColor }]}>{status}</Text>
                    <Text style={styles.name}>{name}</Text>
                    <Text style={styles.variant}>{variant}</Text>
                </View>
            </View>
            <TouchableOpacity style={styles.button} onPress={onInitiate}>
                <Text style={styles.buttonText}>Initiate Return</Text>
            </TouchableOpacity>
        </View>
    );
}

const styles = StyleSheet.create({
    card: {
        backgroundColor: '#fff',
        borderRadius: 16,
        padding: 12,
        marginBottom: 16,
        // Shadow
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 8,
        elevation: 2,
    },
    content: {
        flexDirection: 'row',
        marginBottom: 12,
    },
    imageContainer: {
        width: 80,
        height: 80,
        backgroundColor: '#F3F4F6',
        borderRadius: 8,
        justifyContent: 'center',
        alignItems: 'center',
        overflow: 'hidden',
    },
    image: {
        width: '80%',
        height: '80%',
    },
    details: {
        flex: 1,
        marginLeft: 12,
        justifyContent: 'center',
    },
    status: {
        fontSize: 10,
        fontWeight: '700',
        marginBottom: 4,
        letterSpacing: 0.5,
    },
    name: {
        fontSize: 14,
        fontWeight: '700',
        color: '#1a1a1a',
        marginBottom: 2,
    },
    variant: {
        fontSize: 12,
        color: '#6B7280',
    },
    button: {
        backgroundColor: '#FDE047', // Yellow-300 matches design
        borderRadius: 8,
        paddingVertical: 10,
        alignItems: 'center',
    },
    buttonText: {
        fontSize: 14,
        fontWeight: '600',
        color: '#1a1a1a',
    },
});
