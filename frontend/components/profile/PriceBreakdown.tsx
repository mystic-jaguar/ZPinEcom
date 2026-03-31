import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

interface PriceBreakdownProps {
    itemsTotal: number;
    instantTrialFee?: number;
    deliveryCharges: number;
    grandTotal: number;
}

export default function PriceBreakdown({
    itemsTotal,
    instantTrialFee = 0,
    deliveryCharges,
    grandTotal
}: PriceBreakdownProps) {
    const safeTotal = Number(itemsTotal) || 0;
    const safeFee = Number(instantTrialFee) || 0;
    const safeDelivery = Number(deliveryCharges) || 0;
    const safeGrand = Number(grandTotal) || 0;

    return (
        <View style={styles.container}>
            <View style={styles.row}>
                <Text style={styles.label}>Items Total</Text>
                <Text style={styles.value}>₹{safeTotal.toLocaleString('en-IN')}.00</Text>
            </View>

            {safeFee > 0 && (
                <View style={styles.row}>
                    <Text style={styles.label}>Instant Trial Fee</Text>
                    <Text style={[styles.value, styles.warningValue]}>+ ₹{safeFee.toLocaleString('en-IN')}.00</Text>
                </View>
            )}

            <View style={styles.row}>
                <Text style={styles.label}>Delivery Charges</Text>
                <Text style={[styles.value, styles.successValue]}>
                    {safeDelivery === 0 ? 'FREE' : `₹${safeDelivery.toLocaleString('en-IN')}`}
                </Text>
            </View>

            <View style={styles.divider} />

            <View style={styles.row}>
                <Text style={styles.grandTotalLabel}>Grand Total</Text>
                <Text style={styles.grandTotalValue}>₹{safeGrand.toLocaleString('en-IN')}.00</Text>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        marginTop: 10,
    },
    row: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 10,
    },
    label: {
        fontSize: 14,
        color: '#6B7280',
    },
    value: {
        fontSize: 14,
        fontWeight: '500',
        color: '#1a1a1a',
    },
    warningValue: {
        color: '#F59E0B',
    },
    successValue: {
        color: '#22C55E',
    },
    divider: {
        height: 1,
        backgroundColor: '#E5E7EB',
        marginVertical: 10,
    },
    grandTotalLabel: {
        fontSize: 16,
        fontWeight: '700',
        color: '#1a1a1a',
    },
    grandTotalValue: {
        fontSize: 16,
        fontWeight: '700',
        color: '#1a1a1a',
    },
});
