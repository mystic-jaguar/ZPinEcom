import React from 'react';
import { View } from 'react-native';
import { Text } from '../ui/ScaledText';
import { createStyles } from '../../constants/theme';

interface PriceBreakdownProps {
    itemsTotal: number;
    instantTrialFee?: number;
    deliveryCharges: number;
    gstAmount?: number;
    couponDiscount?: number;
    couponCode?: string;
    grandTotal: number;
}

export default function PriceBreakdown({
    itemsTotal,
    instantTrialFee = 0,
    deliveryCharges,
    gstAmount = 0,
    couponDiscount = 0,
    couponCode,
    grandTotal
}: PriceBreakdownProps) {
    const safeTotal = Number(itemsTotal) || 0;
    const safeFee = Number(instantTrialFee) || 0;
    const safeDelivery = Number(deliveryCharges) || 0;
    const safeGst = Number(gstAmount) || 0;
    const safeCouponDiscount = Number(couponDiscount) || 0;
    const safeGrand = Number(grandTotal) || 0;

    const formatINR = (value: number) => `₹${value.toFixed(2)}`;

    return (
        <View style={styles.container}>
            <View style={styles.row}>
                <Text style={styles.label}>Subtotal</Text>
                <Text style={styles.value}>{formatINR(safeTotal)}</Text>
            </View>

            {safeFee > 0 && (
                <View style={styles.row}>
                    <Text style={styles.label}>Instant Trial Fee</Text>
                    <Text style={[styles.value, styles.warningValue]}>+ {formatINR(safeFee)}</Text>
                </View>
            )}

            <View style={styles.row}>
                <Text style={styles.label}>Shipping Fee</Text>
                <Text style={[styles.value, styles.successValue]}>
                    {safeDelivery === 0 ? 'FREE' : formatINR(safeDelivery)}
                </Text>
            </View>

            <View style={styles.row}>
                <Text style={styles.label}>Tax (GST 18%)</Text>
                <Text style={styles.value}>{formatINR(safeGst)}</Text>
            </View>

            {safeCouponDiscount > 0 && (
                <View style={styles.row}>
                    <Text style={[styles.label, styles.successValue]}>
                        {couponCode ? `Coupon Discount (${couponCode})` : 'Coupon Discount'}
                    </Text>
                    <Text style={[styles.value, styles.successValue]}>- {formatINR(safeCouponDiscount)}</Text>
                </View>
            )}

            <View style={styles.divider} />

            <View style={styles.row}>
                <Text style={styles.grandTotalLabel}>Total Amount</Text>
                <Text style={styles.grandTotalValue}>{formatINR(safeGrand)}</Text>
            </View>
        </View>
    );
}

const styles = createStyles({
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
