import { Image } from 'expo-image';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Check, Info } from 'lucide-react-native';
import React, { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import ActionModal from '../../components/common/ActionModal';
import { AppHeader, ZButton, ZText } from '../../components/ui';
import { colors, fonts, palette, radius } from '../../constants/theme';
import { useOrder } from '../../context/OrderContext';
import { orderService } from '../../services/order';

const CANCELLATION_REASONS = ['Ordered by mistake', 'Found a better price', 'Delivery taking too long', 'Changed my mind', 'Item not needed anymore', 'Other'];
const RETURN_REASONS = ['Defective product', 'Product not working', 'Different from description', 'Wrong item received', 'Size issue', 'Quality not as expected', 'Other'];
// The one reason that carries the customer's own words. Picking it reveals a
// text box, and the typed text is what the seller and the admin queue read —
// a bare "Other" tells nobody why the item came back.
const OTHER_REASON = 'Other';
const OTHER_MAX = 300;

export default function CancelOrderScreen() {
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const params = useLocalSearchParams();
    const orderId = Array.isArray(params.orderId) ? params.orderId[0] : params.orderId;
    const mode = Array.isArray(params.mode) ? params.mode[0] : (params.mode ?? 'cancel');
    // Partial return: returns.tsx passes "<orderItemId>:<units>" pairs. Order ITEM
    // ids, not product ids — the id the orders payload actually carries, and the
    // one the backend keys the refund on. (It used to pass productIds and look
    // them up here; the list endpoint returned none, so every lookup missed and
    // the selection arrived empty — which the backend reads as "the whole order".)
    const returnLinesParam = Array.isArray(params.returnLines) ? params.returnLines[0] : params.returnLines;
    const requestedLines = String(returnLinesParam || '')
        .split(',')
        .filter(Boolean)
        .map(pair => {
            const [id, units] = pair.split(':');
            return { id, quantity: Math.max(1, Number(units) || 1) };
        })
        .filter(l => l.id);
    const { getOrderById, cancelOrder } = useOrder();

    const isReturn = mode === 'return';
    const [selectedReason, setSelectedReason] = useState('');
    const [otherReason, setOtherReason] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [showSuccessModal, setShowSuccessModal] = useState(false);
    const [showErrorModal, setShowErrorModal] = useState(false);
    const [successMessage, setSuccessMessage] = useState('');
    const [errorMessage, setErrorMessage] = useState('');

    const order = getOrderById(orderId as string);
    // Only lines that really belong to this order, capped at what is still
    // returnable — a stale param must not widen the return, and must never
    // collapse to the empty list the backend reads as "everything".
    const returnLines = isReturn
        ? requestedLines.flatMap(line => {
            const item = order?.items.find(i => String(i.orderItemId) === line.id);
            if (!item) return [];
            const left = Math.max(0, Number(item.quantity) - Number(item.returnedQuantity || 0));
            if (left <= 0) return [];
            return [{ orderItemId: line.id, quantity: Math.min(left, line.quantity) }];
        })
        : [];
    const returnUnits = returnLines.reduce((n, l) => n + l.quantity, 0);

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

    // On a return the header must describe what is COMING BACK, not the order —
    // showing the order total next to a one-item return is what made customers
    // think the whole order was being refunded.
    const returningItems = returnLines.map(l => ({
        ...l,
        item: order.items.find(i => String(i.orderItemId) === l.orderItemId),
    }));
    const firstItem = isReturn ? (returningItems[0]?.item ?? order.items[0]) : order.items[0];
    const extra = (isReturn ? returningItems.length : order.items.length) - 1;
    // Estimate only — the server recomputes it and returns the authoritative
    // figure. Same formula: line subtotal + 18% GST, no delivery fee.
    const returnSubtotal = returningItems.reduce((sum, l) => sum + Number(l.item?.price || 0) * l.quantity, 0);
    const estimatedRefund = returnSubtotal + Math.round(returnSubtotal * 0.18);

    const handleConfirmAction = async () => {
        if (!selectedReason) {
            setErrorMessage(`Please select a reason for ${isReturn ? 'return' : 'cancellation'}.`);
            setShowErrorModal(true);
            return;
        }
        // "Other" without the words is the same as no reason at all.
        const customReason = otherReason.trim();
        if (selectedReason === OTHER_REASON && !customReason) {
            setErrorMessage(`Please tell us why you are ${isReturn ? 'returning' : 'cancelling'}.`);
            setShowErrorModal(true);
            return;
        }
        // Never submit a return with nothing selected — the backend would treat it
        // as the whole order and refund everything.
        if (isReturn && returnLines.length === 0) {
            setErrorMessage('Please select the item you want to return.');
            setShowErrorModal(true);
            return;
        }
        setIsSubmitting(true);
        try {
            let response: any;
            if (isReturn) {
                response = await orderService.returnOrder(order.id, {
                    // {orderItemId, quantity} objects — the backend also still
                    // accepts bare id strings from older builds.
                    orderItemIds: returnLines,
                    reason: selectedReason === OTHER_REASON ? `Other: ${customReason}` : selectedReason,
                    // The seller/admin queue shows `description`; keep the typed
                    // words there too so neither surface has to parse `reason`.
                    description: selectedReason === OTHER_REASON ? customReason : 'Return request via app',
                });
            } else {
                response = await cancelOrder(order.id, { reason: selectedReason === OTHER_REASON ? `Other: ${customReason}` : selectedReason, refundMethod: 'original' });
            }
            let msg = response?.message || `${isReturn ? 'Return initiated' : 'Order cancelled'} successfully.`;
            if (response?.refundAmount && response.refundAmount > 0) {
                // On a return the money has NOT moved yet — it is owed, not credited.
                // The server sends the exact wording as refundDisclaimer.
                msg += isReturn
                    ? `\n\nRefund of ₹${response.refundAmount.toFixed(2)}. ${response.refundDisclaimer || 'This amount will be refunded once the seller receives the product.'}`
                    : `\n\nRefund of ₹${response.refundAmount.toFixed(2)} credited to your original payment method.`;
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
                        {isReturn && (
                            <Text style={styles.orderSub}>
                                Returning {returnUnits} item{returnUnits > 1 ? 's' : ''} · refund est.
                            </Text>
                        )}
                    </View>
                    <Text style={styles.orderTotal}>{money(isReturn ? estimatedRefund : order.finalAmount)}</Text>
                </View>

                {/* Line-by-line, so "2 of 5" is visible before confirming. */}
                {isReturn && returningItems.length > 0 && (
                    <View style={styles.returnLines}>
                        {returningItems.map(l => (
                            <View key={l.orderItemId} style={styles.returnLineRow}>
                                <Text style={styles.returnLineName} numberOfLines={1}>{l.item?.productName}</Text>
                                <Text style={styles.returnLineQty}>
                                    {l.quantity} × {money(Number(l.item?.price || 0))}
                                </Text>
                            </View>
                        ))}
                    </View>
                )}

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

                {selectedReason === OTHER_REASON && (
                    <TextInput
                        style={styles.otherInput}
                        value={otherReason}
                        onChangeText={setOtherReason}
                        placeholder={`Tell us why you are ${isReturn ? 'returning' : 'cancelling'} this item`}
                        placeholderTextColor={colors.textFaint}
                        multiline
                        maxLength={OTHER_MAX}
                        textAlignVertical="top"
                    />
                )}

                <View style={styles.infoBox}>
                    <Info size={17} color={palette.yellow700} />
                    {/* A return is not a cancellation: the money only moves after the
                        item travels back and the seller has it. Promising "3–4 business
                        days" here would be a commitment ZPIN cannot keep. */}
                    {isReturn ? (
                        <Text style={styles.infoText}>
                            Refund of <Text style={{ fontFamily: fonts.bodyBold }}>{money(order.finalAmount)}</Text>. This amount will be refunded once the seller receives the product.
                        </Text>
                    ) : (
                        <Text style={styles.infoText}>Refund of <Text style={{ fontFamily: fonts.bodyBold }}>{money(order.finalAmount)}</Text> will hit your {order.paymentMethod === 'cod' ? 'account' : 'original payment method'} within 3–4 business days.</Text>
                    )}
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
    orderSub: { fontFamily: fonts.bodyRegular, fontSize: 11, color: colors.textFaint, marginTop: 2 },
    orderTotal: { fontFamily: fonts.displayBold, fontSize: 16, color: colors.textStrong },
    returnLines: { borderWidth: 1, borderColor: palette.neutral200, borderRadius: 14, paddingVertical: 4, paddingHorizontal: 14, marginTop: -8, marginBottom: 20 },
    returnLineRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 12, paddingVertical: 8 },
    returnLineName: { flex: 1, fontFamily: fonts.bodyRegular, fontSize: 13, color: colors.textMuted },
    returnLineQty: { fontFamily: fonts.monoBold, fontSize: 12, color: colors.textStrong },
    reasons: { gap: 11 },
    reason: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderRadius: radius.md, paddingVertical: 15, paddingHorizontal: 16 },
    reasonOn: { backgroundColor: colors.surfaceInverse },
    reasonOff: { backgroundColor: colors.surfaceCard, borderWidth: 1.5, borderColor: colors.borderSubtle },
    reasonText: { fontFamily: fonts.bodySemiBold, fontSize: 14, color: colors.textBody },
    otherInput: { marginTop: 12, minHeight: 92, borderWidth: 1.5, borderColor: colors.borderSubtle, borderRadius: radius.md, backgroundColor: colors.surfaceCard, padding: 14, fontFamily: fonts.bodyRegular, fontSize: 14, color: colors.textBody },
    radio: { width: 22, height: 22, borderRadius: 11, borderWidth: 2, borderColor: colors.borderSubtle, alignItems: 'center', justifyContent: 'center' },
    radioOn: { backgroundColor: palette.yellow500, borderWidth: 0 },
    infoBox: { flexDirection: 'row', gap: 10, alignItems: 'flex-start', backgroundColor: palette.yellow100, borderRadius: radius.md, padding: 14, marginTop: 18 },
    infoText: { flex: 1, fontFamily: fonts.bodyRegular, fontSize: 12, lineHeight: 18, color: palette.yellow800 },
    bottomBar: { position: 'absolute', left: 0, right: 0, bottom: 0, flexDirection: 'row', gap: 12, backgroundColor: colors.surfaceCard, borderTopWidth: 1, borderTopColor: colors.surfaceSunken, paddingHorizontal: 20, paddingTop: 16 },
});
