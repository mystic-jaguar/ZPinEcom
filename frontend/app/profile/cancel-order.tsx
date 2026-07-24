import { Image } from 'expo-image';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Check, Info } from 'lucide-react-native';
import React, { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import ActionModal from '../../components/common/ActionModal';
import { AppHeader, ZButton, ZText } from '../../components/ui';
import { colors, fonts, palette, radius } from '../../constants/theme';
import { useOrder } from '../../context/OrderContext';
import { orderService } from '../../services/order';

const CANCELLATION_REASONS = ['Ordered by mistake', 'Found a better price', 'Delivery taking too long', 'Changed my mind', 'Item not needed anymore', 'Other'];
const RETURN_REASONS = ['Defective product', 'Product not working', 'Different from description', 'Wrong item received', 'Size issue', 'Quality not as expected'];

export default function CancelOrderScreen() {
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const params = useLocalSearchParams();
    const orderId = Array.isArray(params.orderId) ? params.orderId[0] : params.orderId;
    const mode = Array.isArray(params.mode) ? params.mode[0] : (params.mode ?? 'cancel');
    const productId = Array.isArray(params.productId) ? params.productId[0] : params.productId;
    const { getOrderById, cancelOrder } = useOrder();

    const isReturn = mode === 'return';
    const [selectedReason, setSelectedReason] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [showSuccessModal, setShowSuccessModal] = useState(false);
    const [showErrorModal, setShowErrorModal] = useState(false);
    const [successMessage, setSuccessMessage] = useState('');
    const [errorMessage, setErrorMessage] = useState('');

    const order = getOrderById(orderId as string);
    const selectedOrderItemId = isReturn && productId ? order?.items.find(item => item.productId === productId)?.orderItemId : undefined;

    if (!order) {
        return (
            <SafeAreaView style={styles.container} edges={['top']}>
                <AppHeader title={isReturn ? 'Return item' : 'Cancel order'} onBack={() => router.back()} />
                <View style={styles.center}>
                    <ZText variant="muted" style={{ marginBottom: 16 }}>Order not found.</ZText>
                    <ZButton label="Go back" fullWidth={false} onPress={() => router.back()} />
                </View>
            </SafeAreaView>
        );
    }

    const money = (n: number) => `₹${Number(n).toLocaleString('en-IN')}`;
    const reasons = isReturn ? RETURN_REASONS : CANCELLATION_REASONS;
    const firstItem = order.items[0];
    const extra = order.items.length - 1;

    const handleConfirmAction = async () => {
        if (!selectedReason) {
            setErrorMessage(`Please select a reason for ${isReturn ? 'return' : 'cancellation'}.`);
            setShowErrorModal(true);
            return;
        }
        setIsSubmitting(true);
        try {
            let response: any;
            if (isReturn) {
                response = await orderService.returnOrder(order.id, {
                    orderItemIds: selectedOrderItemId ? [selectedOrderItemId] : [],
                    reason: selectedReason,
                    description: 'Return request via app',
                });
            } else {
                response = await cancelOrder(order.id, { reason: selectedReason, refundMethod: 'original' });
            }
            let msg = response?.message || `${isReturn ? 'Return initiated' : 'Order cancelled'} successfully.`;
            if (response?.refundAmount && response.refundAmount > 0) {
                msg += `\n\nRefund of ₹${response.refundAmount.toFixed(2)} credited to your original payment method.`;
            }
            setSuccessMessage(msg);
            setIsSubmitting(false);
            setTimeout(() => setShowSuccessModal(true), 300);
        } catch (error: any) {
            setIsSubmitting(false);
            setErrorMessage(error.message || `Failed to ${isReturn ? 'initiate return' : 'cancel order'}. Please try again.`);
            setShowErrorModal(true);
        }
    };

    return (
        <SafeAreaView style={styles.container} edges={['top']}>
            <AppHeader title={isReturn ? 'Return item' : 'Cancel order'} onBack={() => router.back()} />
            <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
                {/* Order mini */}
                <View style={styles.orderCard}>
                    <Image source={firstItem?.image ? { uri: firstItem.image as string } : require('../../assets/images/icon_backup.png')} style={styles.orderImg} contentFit="cover" />
                    <View style={{ flex: 1 }}>
                        <Text style={styles.orderNo}>{order.orderNumber}</Text>
                        <Text style={styles.orderName} numberOfLines={1}>{firstItem?.productName || 'Order'}{extra > 0 ? ` +${extra}` : ''}</Text>
                    </View>
                    <Text style={styles.orderTotal}>{money(order.finalAmount)}</Text>
                </View>

                <ZText variant="eyebrow" style={{ marginBottom: 12 }}>Why are you {isReturn ? 'returning' : 'cancelling'}?</ZText>
                <View style={styles.reasons}>
                    {reasons.map((reason) => {
                        const on = selectedReason === reason;
                        return (
                            <Pressable key={reason} style={[styles.reason, on ? styles.reasonOn : styles.reasonOff]} onPress={() => setSelectedReason(reason)}>
                                <Text style={[styles.reasonText, on && { fontFamily: fonts.bodyBold, color: '#fff' }]}>{reason}</Text>
                                <View style={[styles.radio, on && styles.radioOn]}>{on && <Check size={13} color={colors.textOnYellow} />}</View>
                            </Pressable>
                        );
                    })}
                </View>

                <View style={styles.infoBox}>
                    <Info size={17} color={palette.yellow700} />
                    <Text style={styles.infoText}>Refund of <Text style={{ fontFamily: fonts.bodyBold }}>{money(order.finalAmount)}</Text> will hit your {order.paymentMethod === 'cod' ? 'account' : 'original payment method'} within 3–4 business days.</Text>
                </View>
            </ScrollView>

            <View style={[styles.bottomBar, { paddingBottom: 16 + insets.bottom }]}>
                <ZButton label="Keep order" variant="outline" style={{ flex: 1 }} onPress={() => router.back()} />
                <ZButton label={isReturn ? 'Confirm return' : 'Cancel order'} variant="red" loading={isSubmitting} style={{ flex: 1 }} onPress={handleConfirmAction} />
            </View>

            <ActionModal
                visible={showSuccessModal}
                title={isReturn ? 'Return Initiated' : 'Cancellation Successful'}
                message={successMessage}
                icon="check-circle"
                primaryButtonText="Go to Orders"
                onPrimaryPress={() => { setShowSuccessModal(false); router.replace('/profile/orders'); }}
                onClose={() => { setShowSuccessModal(false); router.replace('/profile/orders'); }}
            />
            <ActionModal
                visible={showErrorModal}
                title={isReturn ? 'Return Failed' : 'Cancellation Failed'}
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
    container: { flex: 1, backgroundColor: palette.paperWarm },
    center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    content: { padding: 20, paddingTop: 4, paddingBottom: 24 },
    orderCard: { flexDirection: 'row', alignItems: 'center', gap: 13, backgroundColor: colors.surfaceCard, borderWidth: 1, borderColor: palette.neutral200, borderRadius: 18, padding: 14, marginBottom: 20 },
    orderImg: { width: 48, height: 56, borderRadius: 10, backgroundColor: colors.surfaceSunken },
    orderNo: { fontFamily: fonts.monoBold, fontSize: 10, color: colors.textFaint },
    orderName: { fontFamily: fonts.bodySemiBold, fontSize: 14, color: colors.textStrong, marginTop: 2 },
    orderTotal: { fontFamily: fonts.displayBold, fontSize: 16, color: colors.textStrong },
    reasons: { gap: 11 },
    reason: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderRadius: radius.md, paddingVertical: 15, paddingHorizontal: 16 },
    reasonOn: { backgroundColor: colors.surfaceInverse },
    reasonOff: { backgroundColor: colors.surfaceCard, borderWidth: 1.5, borderColor: colors.borderSubtle },
    reasonText: { fontFamily: fonts.bodySemiBold, fontSize: 14, color: colors.textBody },
    radio: { width: 22, height: 22, borderRadius: 11, borderWidth: 2, borderColor: colors.borderSubtle, alignItems: 'center', justifyContent: 'center' },
    radioOn: { backgroundColor: palette.yellow500, borderWidth: 0 },
    infoBox: { flexDirection: 'row', gap: 10, alignItems: 'flex-start', backgroundColor: palette.yellow100, borderRadius: radius.md, padding: 14, marginTop: 18 },
    infoText: { flex: 1, fontFamily: fonts.bodyRegular, fontSize: 12, lineHeight: 18, color: palette.yellow800 },
    bottomBar: { position: 'absolute', left: 0, right: 0, bottom: 0, flexDirection: 'row', gap: 12, backgroundColor: colors.surfaceCard, borderTopWidth: 1, borderTopColor: colors.surfaceSunken, paddingHorizontal: 20, paddingTop: 16 },
});
