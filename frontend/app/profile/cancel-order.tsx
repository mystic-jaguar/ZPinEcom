import { Feather } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import ActionModal from '../../components/common/ActionModal';
import { useOrder } from '../../context/OrderContext';
import { orderService } from '../../services/order';

const CANCELLATION_REASONS = [
    "Changed my mind",
    "Found a better price elsewhere",
    "Ordered by mistake",
    "Shipping time is too long",
    "Item not needed anymore",
    "Other"
];

const RETURN_REASONS = [
    "Defective product",
    "Product not working",
    "Different from description",
    "Wrong item received",
    "Size issue",
    "Quality not as expected"
];

export default function CancelOrderScreen() {
    const router = useRouter();
    const params = useLocalSearchParams();
    const orderId = Array.isArray(params.orderId) ? params.orderId[0] : params.orderId;
    const mode = Array.isArray(params.mode) ? params.mode[0] : (params.mode ?? 'cancel');
    const productId = Array.isArray(params.productId) ? params.productId[0] : params.productId;
    const { getOrderById, cancelOrder } = useOrder();

    // For returns, we might need to handle specific items if passed
    // const { returnOrder } = useOrder(); // Assuming this exists or will be added

    const isReturn = mode === 'return';
    const screenTitle = isReturn ? 'Return Item' : 'Cancel Order';

    const [selectedReason, setSelectedReason] = useState<string>('');
    const [refundMethod, setRefundMethod] = useState<'original' | 'wallet'>('original');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [showSuccessModal, setShowSuccessModal] = useState(false);
    const [showErrorModal, setShowErrorModal] = useState(false);
    const [successMessage, setSuccessMessage] = useState('');
    const [errorMessage, setErrorMessage] = useState('');

    const order = getOrderById(orderId as string);

    if (!order) {
        return (
            <SafeAreaView style={styles.container}>
                <View style={styles.header}>
                    <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
                        <Feather name="chevron-left" size={28} color="#1a1a1a" />
                    </TouchableOpacity>
                    <Text style={styles.headerTitle}>Cancel Order</Text>
                </View>
                <View style={styles.centerContent}>
                    <Text style={styles.errorText}>Order not found.</Text>
                    <TouchableOpacity style={styles.primaryButton} onPress={() => router.back()}>
                        <Text style={styles.primaryButtonText}>Go Back</Text>
                    </TouchableOpacity>
                </View>
            </SafeAreaView>
        );
    }

    const handleConfirmAction = async () => {
        if (!selectedReason) {
            setErrorMessage(`Please select a reason for ${isReturn ? 'return' : 'cancellation'}.`);
            setShowErrorModal(true);
            return;
        }

        setIsSubmitting(true);
        try {
            let response;
            if (isReturn) {
                // Implementation for Return
                // Currently just mocked/same as cancel for now as per instructions to unify
                // Ideally: await returnOrder(orderId, { orderItemIds: [productId], reason: selectedReason });

                // Using cancelOrder for now but ideally this should be a separate API call if backend supports it
                // OR we just simulate success for now if returnOrder is not fully ready in context

                // Temporary: Using cancelOrder logic but maybe should use returnOrder from service directly if context doesn't have it
                // For now, let's assume we use the same flow or call the service directly if not in context

                // If returnOrder is available in Context, use it. usage: returnOrder(id, data)
                // Since I haven't added returnOrder to Context yet, checking implementation plan...
                // Plan said: "Use returnOrder API instead of cancelOrder"

                // But returnOrder is NOT in Context yet. I need to add it or import service directly.
                // Let's import service directly for now to avoid context modifications unless necessary.

                response = await orderService.returnOrder(order.id, {
                    orderItemIds: productId ? [productId] : [], // Use productId as orderItemId for now
                    reason: selectedReason,
                    description: 'Return request via app'
                }) as any;

            } else {
                response = await cancelOrder(order.id, {
                    reason: selectedReason,
                    refundMethod
                });
            }

            let msg = response?.message || `${isReturn ? 'Return initiated' : 'Order cancelled'} successfully.`;
            if (response?.refundAmount && response.refundAmount > 0) {
                msg += `\n\nRefund of ₹${response.refundAmount.toFixed(2)} initiated (${response.refundStatus}).`;
            }
            setSuccessMessage(msg);
            setIsSubmitting(false);

            // Small delay before showing success modal
            setTimeout(() => {
                setShowSuccessModal(true);
            }, 300);

        } catch (error: any) {
            setIsSubmitting(false);
            setErrorMessage(error.message || `Failed to ${isReturn ? 'initiate return' : 'cancel order'}. Please try again.`);
            setShowErrorModal(true);
        }
    };

    return (
        <SafeAreaView style={styles.container} edges={['top']}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
                    <Feather name="chevron-left" size={28} color="#1a1a1a" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>{screenTitle}</Text>
                <View style={{ width: 28 }} />
            </View>

            <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
                {/* Order Summary */}
                <View style={styles.summaryCard}>
                    <Text style={styles.summaryTitle}>Order Summary</Text>
                    <Text style={styles.orderNumber}>Order #{order.orderNumber}</Text>
                    <Text style={styles.itemCount}>{order.items.length} Item{order.items.length !== 1 ? 's' : ''}</Text>
                    <View style={styles.divider} />
                    <View style={styles.totalRow}>
                        <Text style={styles.totalLabel}>Refund Amount</Text>
                        <Text style={styles.totalValue}>₹{order.finalAmount.toFixed(2)}</Text>
                    </View>
                </View>

                {/* Reason Selection */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Reason for {isReturn ? 'Return' : 'Cancellation'}</Text>
                    <View style={styles.reasonsContainer}>
                        {(isReturn ? RETURN_REASONS : CANCELLATION_REASONS).map((reason) => (
                            <TouchableOpacity
                                key={reason}
                                style={[
                                    styles.reasonOption,
                                    selectedReason === reason && styles.selectedReasonOption
                                ]}
                                onPress={() => setSelectedReason(reason)}
                            >
                                <View style={[
                                    styles.radioOuter,
                                    selectedReason === reason && styles.selectedRadioOuter
                                ]}>
                                    {selectedReason === reason && <View style={styles.radioInner} />}
                                </View>
                                <Text style={styles.reasonText}>{reason}</Text>
                            </TouchableOpacity>
                        ))}
                    </View>
                </View>

                {/* Refund Method Selection (if paid) */}
                {order.paymentStatus === 'paid' && (
                    <View style={styles.section}>
                        <Text style={styles.sectionTitle}>Refund Method</Text>
                        <View style={styles.refundMethodContainer}>
                            <TouchableOpacity
                                style={[
                                    styles.refundOption,
                                    refundMethod === 'original' && styles.selectedRefundOption
                                ]}
                                onPress={() => setRefundMethod('original')}
                            >
                                <View style={styles.refundHeader}>
                                    <View style={[
                                        styles.radioOuter,
                                        refundMethod === 'original' && styles.selectedRadioOuter
                                    ]}>
                                        {refundMethod === 'original' && <View style={styles.radioInner} />}
                                    </View>
                                    <Text style={styles.refundTitle}>Original Payment Method</Text>
                                </View>
                                <Text style={styles.refundDesc}>Refund will be credited to your original payment source within 5-7 business days.</Text>
                            </TouchableOpacity>

                            <TouchableOpacity
                                style={[
                                    styles.refundOption,
                                    refundMethod === 'wallet' && styles.selectedRefundOption
                                ]}
                                onPress={() => setRefundMethod('wallet')}
                            >
                                <View style={styles.refundHeader}>
                                    <View style={[
                                        styles.radioOuter,
                                        refundMethod === 'wallet' && styles.selectedRadioOuter
                                    ]}>
                                        {refundMethod === 'wallet' && <View style={styles.radioInner} />}
                                    </View>
                                    <Text style={styles.refundTitle}>ZPin Wallet</Text>
                                </View>
                                <Text style={styles.refundDesc}>Instant refund to your ZPin Wallet. Can be used for future purchases.</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                )}

                {/* Confirm Button */}
                <TouchableOpacity
                    style={[styles.confirmButton, isSubmitting && styles.disabledButton]}
                    onPress={handleConfirmAction}
                    disabled={isSubmitting}
                >
                    {isSubmitting ? (
                        <ActivityIndicator color="#fff" />
                    ) : (
                        <Text style={styles.confirmButtonText}>
                            {isReturn ? "Confirmed Return" : "Confirm Cancellation"}
                        </Text>
                    )}
                </TouchableOpacity>

            </ScrollView>

            <ActionModal
                visible={showSuccessModal}
                title={isReturn ? "Return Initiated" : "Cancellation Successful"}
                message={successMessage}
                icon="check-circle"
                primaryButtonText="Go to Orders"
                onPrimaryPress={() => {
                    setShowSuccessModal(false);
                    router.replace('/profile/orders');
                }}
                onClose={() => {
                    setShowSuccessModal(false);
                    router.replace('/profile/orders');
                }}
            />

            <ActionModal
                visible={showErrorModal}
                title={isReturn ? "Return Failed" : "Cancellation Failed"}
                message={errorMessage}
                icon="alert-circle"
                primaryButtonText="OK"
                onPrimaryPress={() => setShowErrorModal(false)}
                onClose={() => setShowErrorModal(false)}
            />
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#F8F9FA',
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 20,
        paddingVertical: 15,
        backgroundColor: '#fff',
        borderBottomWidth: 1,
        borderBottomColor: '#F3F4F6',
    },
    backBtn: {
        padding: 5,
        marginLeft: -5,
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: '700',
        color: '#1a1a1a',
    },
    scrollContent: {
        padding: 20,
    },
    centerContent: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
    },
    errorText: {
        fontSize: 16,
        color: '#EF4444',
        marginBottom: 20,
    },
    primaryButton: {
        backgroundColor: '#FBBF24',
        paddingVertical: 12,
        paddingHorizontal: 24,
        borderRadius: 8,
    },
    primaryButtonText: {
        fontSize: 16,
        fontWeight: '700',
        color: '#1a1a1a',
    },
    summaryCard: {
        backgroundColor: '#fff',
        borderRadius: 12,
        padding: 16,
        marginBottom: 20,
        borderWidth: 1,
        borderColor: '#E5E7EB',
    },
    summaryTitle: {
        fontSize: 16,
        fontWeight: '700',
        color: '#1a1a1a',
        marginBottom: 8,
    },
    orderNumber: {
        fontSize: 14,
        color: '#6B7280',
        marginBottom: 4,
    },
    itemCount: {
        fontSize: 14,
        color: '#6B7280',
    },
    divider: {
        height: 1,
        backgroundColor: '#E5E7EB',
        marginVertical: 12,
    },
    totalRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    totalLabel: {
        fontSize: 14,
        fontWeight: '600',
        color: '#374151',
    },
    totalValue: {
        fontSize: 16,
        fontWeight: '700',
        color: '#1a1a1a',
    },
    section: {
        marginBottom: 24,
    },
    sectionTitle: {
        fontSize: 16,
        fontWeight: '700',
        color: '#374151',
        marginBottom: 12,
    },
    reasonsContainer: {
        backgroundColor: '#fff',
        borderRadius: 12,
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: '#E5E7EB',
    },
    reasonOption: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 16,
        borderBottomWidth: 1,
        borderBottomColor: '#F3F4F6',
    },
    selectedReasonOption: {
        backgroundColor: '#FFFBE6',
    },
    radioOuter: {
        width: 20,
        height: 20,
        borderRadius: 10,
        borderWidth: 2,
        borderColor: '#D1D5DB',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12,
    },
    selectedRadioOuter: {
        borderColor: '#FBBF24',
    },
    radioInner: {
        width: 10,
        height: 10,
        borderRadius: 5,
        backgroundColor: '#FBBF24',
    },
    reasonText: {
        fontSize: 14,
        color: '#374151',
    },
    refundMethodContainer: {
        gap: 12,
    },
    refundOption: {
        backgroundColor: '#fff',
        borderRadius: 12,
        padding: 16,
        borderWidth: 1,
        borderColor: '#E5E7EB',
    },
    selectedRefundOption: {
        borderColor: '#FBBF24',
        backgroundColor: '#FFFBE6',
    },
    refundHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 8,
    },
    refundTitle: {
        fontSize: 14,
        fontWeight: '700',
        color: '#1a1a1a',
    },
    refundDesc: {
        fontSize: 12,
        color: '#6B7280',
        paddingLeft: 32,
        lineHeight: 18,
    },
    confirmButton: {
        backgroundColor: '#EF4444',
        paddingVertical: 16,
        borderRadius: 12,
        alignItems: 'center',
        marginBottom: 40,
        shadowColor: '#EF4444',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 8,
        elevation: 4,
    },
    disabledButton: {
        backgroundColor: '#FCA5A5',
        shadowOpacity: 0,
        elevation: 0,
    },
    confirmButtonText: {
        fontSize: 16,
        fontWeight: '700',
        color: '#fff',
    },
});
