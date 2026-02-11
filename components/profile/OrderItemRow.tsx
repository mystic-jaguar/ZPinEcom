import React from 'react';
import { Image, StyleSheet, Text, View } from 'react-native';

interface OrderItemRowProps {
    image: any;
    name: string;
    variant: string;
    quantity: number;
    price: number;
}

export default function OrderItemRow({
    image,
    name,
    variant,
    quantity,
    price
}: OrderItemRowProps) {
    return (
        <View style={styles.container}>
            <View style={styles.imageContainer}>
                <Image
                    source={typeof image === 'string' ? { uri: image } : image}
                    style={styles.image}
                    resizeMode="contain"
                />
            </View>
            <View style={styles.details}>
                <Text style={styles.name} numberOfLines={1}>{name}</Text>
                <Text style={styles.variant}>{variant}</Text>
                <Text style={styles.quantity}>Qty: {quantity}</Text>
            </View>
            <View style={styles.priceContainer}>
                <Text style={styles.price}>₹{price.toLocaleString('en-IN')}.00</Text>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flexDirection: 'row',
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: '#F3F4F6',
    },
    imageContainer: {
        width: 60,
        height: 60,
        backgroundColor: '#F9FAFB',
        borderRadius: 8,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12,
        overflow: 'hidden',
    },
    image: {
        width: '80%',
        height: '80%',
    },
    details: {
        flex: 1,
        justifyContent: 'center',
        marginRight: 8,
    },
    name: {
        fontSize: 14,
        fontWeight: '600',
        color: '#1a1a1a',
        marginBottom: 2,
    },
    variant: {
        fontSize: 12,
        color: '#6B7280',
        marginBottom: 2,
    },
    quantity: {
        fontSize: 12,
        color: '#6B7280',
    },
    priceContainer: {
        justifyContent: 'center',
        alignItems: 'flex-end',
    },
    price: {
        fontSize: 14,
        fontWeight: '700',
        color: '#1a1a1a',
    },
});
