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
            <View style={styles.contentRow}>
                <View style={styles.imageContainer}>
                    <Image source={image} style={styles.image} resizeMode="contain" />
                </View>
                <View style={styles.details}>
                    <Text style={[styles.status, { color: statusColor }]}>{status}</Text>
                    <Text style={styles.name} numberOfLines={1}>{name}</Text>
                    <Text style={styles.variant}>{variant}</Text>

                    <TouchableOpacity style={styles.button} onPress={onInitiate}>
                        <Text style={styles.buttonText}>Initiate Return</Text>
                    </TouchableOpacity>
                </View>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    card: {
        backgroundColor: '#fff',
        borderRadius: 24,
        padding: 16,
        marginBottom: 16,
        // Shadow
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.05,
        shadowRadius: 12,
        elevation: 3,
    },
    contentRow: {
        flexDirection: 'row',
    },
    imageContainer: {
        width: 100,
        height: 100,
        backgroundColor: '#F9FAFB',
        borderRadius: 16,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 16, // Space between image and details
    },
    image: {
        width: '80%',
        height: '80%',
    },
    details: {
        flex: 1,
        justifyContent: 'space-between',
        // We use space-between so elements spread out vertically if there's height,
        // but here we just stack them.
    },
    status: {
        fontSize: 10,
        fontWeight: '800',
        marginBottom: 4,
        letterSpacing: 0.5,
        textTransform: 'uppercase'
    },
    name: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#111827',
        marginBottom: 2,
    },
    variant: {
        fontSize: 13,
        color: '#6B7280',
        marginBottom: 12,
    },
    button: {
        backgroundColor: '#FFD700', // Gold/Yellow
        borderRadius: 20, // Rounded pill shape
        paddingVertical: 10,
        alignItems: 'center',
        width: '100%'
    },
    buttonText: {
        fontSize: 13,
        fontWeight: '700',
        color: '#1a1a1a',
    },
});
