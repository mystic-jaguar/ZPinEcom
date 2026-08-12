import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { Check, Headphones, HelpCircle, MessageCircle, Phone, Shirt, Timer, Zap } from 'lucide-react-native';
import React, { useEffect, useState } from 'react';
import { Linking, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import RouteTrack, { RoutePhase } from '../../components/profile/RouteTrack';
import { AppHeader, ZButton, ZText } from '../../components/ui';
import { colors, fonts, palette, radius } from '../../constants/theme';
import { DELIVERY_ETA } from '../../constants/delivery';
import { useOrder } from '../../context/OrderContext';
import { orderService } from '../../services/order';
import { FAILURE_TEXT, RETURN_STEPS, returnStage, stepIndex, TRACK_STEPS } from '../../utils/orderStatus';

const ELECTRIC_DELAY_MS = 5 * 60 * 1000; // 5 min after delivery before the surge kicks in

const POLL_MS = 15 * 1000; // refresh the track screen every 15s while it's focused

// The five stages and their status mapping live in utils/orderStatus — the same
// vocabulary the customer website's OrderTracking page uses.

export default function TrackOrderScreen() {
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const { orderId } = useLocalSearchParams();
    const { getOrderById, refreshOrders } = useOrder();
    const [refreshing, setRefreshing] = useState(false);
    const [trackingData, setTrackingData] = useState<any>(null);

    const loadTracking = async (id: string) => {
        try {
            const response = await orderService.trackOrder(id);
            setTrackingData((response as any)?.data ?? null);
        } catch { setTrackingData(null); }
    };

    const onRefresh = async () => {
        setRefreshing(true);
        await refreshOrders();
        if (orderId) await loadTracking(orderId as string);
        setRefreshing(false);
    };

    // Poll while the screen is focused so the customer sees "Out for delivery" /
    // "Delivered" live without a manual reopen; stop on blur/unmount.
    useFocusEffect(
        React.useCallback(() => {
            if (!orderId) return;
            const id = orderId as string;
            loadTracking(id);
            const t = setInterval(() => loadTracking(id), POLL_MS);
            return () => clearInterval(t);
        }, [orderId])
    );

    const order = getOrderById(orderId as string);
    const isInstant = order?.notes === 'instant_delivery';
    const liveStatus = trackingData?.currentStatus || order?.status || 'confirmed';
    const deliveryStatus: string | null = trackingData?.deliveryStatus ?? null;
    const courier = trackingData?.courier ?? null;
    // Backend only sends this while the order is out for delivery.
    const deliveryOtp: string | null = trackingData?.deliveryOtp ?? null;
    // Phase 9 — an attempt was made and did not complete. Non-null only while the
    // order sits in that state; it clears on retry, return or delivery.
    const deliveryFailure: { reason?: string } | null = trackingData?.deliveryFailure ?? null;
    const liveEta = trackingData?.estimatedDelivery || order?.estimatedDelivery;
    const canCancel = order && ['pending', 'confirmed'].includes(liveStatus);
    // A return replaces the fulfilment timeline entirely — by the time one exists
    // the order was already delivered, so the five delivery stages say nothing.
    const ret = returnStage(trackingData?.trackingHistory);
    // A rejected return is terminal — don't dangle "Picked up"/"Refunded" as if
    // they're still coming.
    const steps: readonly { key: string; title: string; note: string }[] =
        ret ? (ret.rejected ? RETURN_STEPS.slice(0, 2) : RETURN_STEPS) : TRACK_STEPS;
    const active = ret ? ret.active : stepIndex(liveStatus, deliveryStatus);
    // RouteTrack only draws three phases; collapse the five stages onto them.
    const phase: RoutePhase = ret || active >= 4 ? 'delivered' : active >= 2 ? 'shipped' : 'confirmed';

    // Instant-trial celebration: once delivered, wait a beat, then run the electric surge.
    const [electric, setElectric] = useState(false);
    useEffect(() => {
        setElectric(false);
        if (!isInstant || liveStatus !== 'delivered') return;
        const deliveredAt = order?.updatedAt ? new Date(order.updatedAt).getTime() : Date.now();
        const elapsed = Date.now() - deliveredAt;
        if (elapsed >= ELECTRIC_DELAY_MS) { setElectric(true); return; }
        const t = setTimeout(() => setElectric(true), ELECTRIC_DELAY_MS - elapsed);
        return () => clearTimeout(t);
    }, [isInstant, liveStatus, order?.updatedAt]);

    // Instant shows the live clock ETA once the server has one; everything else shows
    // the promised window — we never surface a raw multi-day delivery date.
    const etaLabel = ret
        ? (ret.rejected ? 'Rejected' : RETURN_STEPS[ret.active].title)
        : liveEta && isInstant
        ? new Date(liveEta).toLocaleString('en-IN', { hour: 'numeric', minute: '2-digit', hour12: true })
        : DELIVERY_ETA;

    return (
        <SafeAreaView style={styles.container} edges={['top']}>
            <AppHeader
                title="Track order"
                onBack={() => router.back()}
                right={<Pressable style={styles.helpBtn} onPress={() => router.push('/profile/help-center')}><HelpCircle size={20} color={colors.textStrong} /></Pressable>}
            />
            <ScrollView
                contentContainerStyle={{ paddingBottom: 120 }}
                showsVerticalScrollIndicator={false}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[palette.yellow500]} tintColor={palette.yellow500} />}
            >
                {/* Live ETA hero */}
                <View style={styles.hero}>
                    <Zap size={140} color="rgba(255,196,0,0.12)" fill="rgba(255,196,0,0.12)" style={styles.heroGlow} />
                    <View style={styles.heroTop}>
                        <View>
                            <View style={styles.arrivingRow}>
                                <View style={styles.pulse} />
                                <Text style={styles.arriving}>
                                    {ret ? `RETURN · ${ret.rejected ? 'REJECTED' : RETURN_STEPS[ret.active].short}` : `ARRIVING · ${TRACK_STEPS[active].short}`}
                                </Text>
                            </View>
                            <View style={styles.etaRow}>
                                <Text style={styles.etaValue}>{etaLabel}</Text>
                            </View>
                            <Text style={styles.orderNo}>ORDER #{order?.orderNumber ?? '—'}</Text>
                        </View>
                        <View style={styles.fastBadge}>
                            <Zap size={13} color={colors.textOnYellow} fill={colors.textOnYellow} />
                            <Text style={styles.fastText}>{isInstant ? 'FAST' : 'STD'}</Text>
                        </View>
                    </View>
                    <RouteTrack phase={phase} electric={electric} />
                </View>

                <View style={{ paddingHorizontal: 20 }}>
                    {isInstant && !ret && (
                        <View style={styles.trialCard}>
                            <View style={styles.trialHead}>
                                <View style={styles.trialLeft}>
                                    <View style={styles.trialIcon}><Shirt size={20} color={palette.yellow700} /></View>
                                    <View>
                                        <Text style={styles.trialTitle}>Instant trial ready</Text>
                                        <ZText variant="eyebrow">Try before you buy</ZText>
                                    </View>
                                </View>
                                <View style={styles.timerPill}>
                                    <Timer size={14} color={colors.textOnYellow} />
                                    <Text style={styles.timerText}>15:00</Text>
                                </View>
                            </View>
                            <Text style={styles.trialDesc}>Your courier waits <Text style={{ fontFamily: fonts.bodyBold, color: colors.textStrong }}>15 minutes</Text>. Try everything on, keep what fits, hand back the rest.</Text>
                        </View>
                    )}

                    {/* Failed delivery attempt — say so plainly rather than letting
                        the timeline look stuck at "Out for delivery". */}
                    {deliveryFailure && (
                        <View style={styles.failCard}>
                            <ZText variant="eyebrow">Delivery attempt failed</ZText>
                            <Text style={styles.failText}>
                                {FAILURE_TEXT[deliveryFailure.reason || 'other'] || FAILURE_TEXT.other}
                            </Text>
                            <Text style={styles.failNote}>
                                Your courier will try again or return the order to the seller. Keep your phone reachable.
                            </Text>
                        </View>
                    )}

                    {/* Delivery OTP — read it out to the partner at the door */}
                    {deliveryOtp && (
                        <View style={styles.otpCard}>
                            <ZText variant="eyebrow">Delivery OTP</ZText>
                            <Text style={styles.otpValue}>{deliveryOtp}</Text>
                            <Text style={styles.otpNote}>Share this code with your delivery partner only after you receive the order.</Text>
                        </View>
                    )}

                    {/* Timeline */}
                    <View style={styles.card}>
                        <ZText variant="eyebrow" style={{ marginBottom: 18 }}>{ret ? 'Return status' : 'Order status'}</ZText>
                        {steps.map((step, i) => {
                            const done = i < active;
                            const current = i === active;
                            const last = i === steps.length - 1;
                            // A rejected return stops at stage 1 and that stage is
                            // the rejection, not an approval.
                            const rejectedHere = !!ret?.rejected && i === 1;
                            const title = rejectedHere ? 'Rejected' : step.title;
                            const note = rejectedHere ? 'Your return request was not accepted' : step.note;
                            return (
                                <View key={step.key} style={styles.tlRow}>
                                    <View style={styles.tlLeft}>
                                        <View style={[styles.tlDot, (done || current) ? styles.tlDotOn : styles.tlDotOff]}>
                                            {done ? <Check size={14} color={colors.textOnYellow} /> : <View style={[styles.tlInner, current ? { backgroundColor: colors.textStrong } : { backgroundColor: colors.borderStrong }]} />}
                                        </View>
                                        {!last && <View style={[styles.tlLine, done ? { backgroundColor: palette.yellow500 } : { backgroundColor: colors.borderSubtle }]} />}
                                    </View>
                                    <View style={{ flex: 1, paddingBottom: last ? 0 : 18 }}>
                                        <Text style={[styles.tlTitle, !done && !current && { color: colors.textFaint }]}>{title}</Text>
                                        <Text style={styles.tlNote}>{note}</Text>
                                    </View>
                                </View>
                            );
                        })}
                    </View>

                    {/* Courier — shown once a delivery partner is assigned (real name/phone) */}
                    {courier && (
                        <View style={styles.courier}>
                            <View style={styles.courierAvatar}><Text style={styles.courierInitial}>{(courier.name?.trim()?.[0] || 'C').toUpperCase()}</Text></View>
                            <View style={{ flex: 1 }}>
                                <Text style={styles.courierName}>{courier.name || 'Your courier'}</Text>
                                <ZText variant="eyebrow">{deliveryStatus === 'picked_up' ? 'On the way' : deliveryStatus === 'delivered' ? 'Delivered' : 'Assigned'}</ZText>
                            </View>
                            <Pressable style={styles.courierOutline} onPress={() => router.push('/profile/help-center')}><MessageCircle size={20} color={colors.textStrong} /></Pressable>
                            {courier.phone ? (
                                <Pressable style={styles.courierYellow} onPress={() => Linking.openURL(`tel:${courier.phone}`)}><Phone size={20} color={colors.textOnYellow} /></Pressable>
                            ) : null}
                        </View>
                    )}
                </View>
            </ScrollView>

            <View style={[styles.bottomBar, { paddingBottom: 16 + insets.bottom }]}>
                <ZButton label="View order" variant="outline" style={{ flex: 1 }} onPress={() => router.back()} />
                {canCancel ? (
                    <ZButton label="Cancel order" variant="red" style={{ flex: 1.2 }} onPress={() => router.push({ pathname: '/profile/cancel-order', params: { orderId: orderId as string } })} />
                ) : (
                    <ZButton label="Support" iconLeft={Headphones} style={{ flex: 1.2 }} onPress={() => router.push('/profile/help-center')} />
                )}
            </View>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: palette.paperWarm },
    helpBtn: { width: 40, height: 40, borderRadius: 20, borderWidth: 2, borderColor: colors.borderInk, alignItems: 'center', justifyContent: 'center' },

    hero: { marginHorizontal: 20, marginBottom: 18, backgroundColor: colors.surfaceInverse, borderRadius: 26, padding: 20, overflow: 'hidden' },
    heroGlow: { position: 'absolute', right: -26, top: -30 },
    heroTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 },
    arrivingRow: { flexDirection: 'row', alignItems: 'center', gap: 7, marginBottom: 8 },
    pulse: { width: 7, height: 7, borderRadius: 4, backgroundColor: palette.yellow500 },
    arriving: { fontFamily: fonts.monoBold, fontSize: 10, letterSpacing: 1, color: palette.yellow300 },
    etaRow: { flexDirection: 'row', alignItems: 'baseline', gap: 8 },
    etaValue: { fontFamily: fonts.displayBold, fontSize: 34, letterSpacing: -1, color: '#fff' },
    orderNo: { fontFamily: fonts.monoBold, fontSize: 10, letterSpacing: 0.6, color: '#8A877E', marginTop: 8 },
    fastBadge: { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: palette.yellow500, paddingHorizontal: 13, paddingVertical: 8, borderRadius: 100 },
    fastText: { fontFamily: fonts.displayBold, fontSize: 13, fontStyle: 'italic', color: colors.textOnYellow },
    trialCard: { backgroundColor: colors.surfaceCard, borderWidth: 1, borderColor: palette.neutral200, borderRadius: radius.lg, padding: 16, marginBottom: 16 },
    trialHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
    trialLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
    trialIcon: { width: 42, height: 42, borderRadius: 13, backgroundColor: palette.yellow100, alignItems: 'center', justifyContent: 'center' },
    trialTitle: { fontFamily: fonts.displaySemiBold, fontSize: 15, color: colors.textStrong },
    timerPill: { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: palette.yellow500, paddingHorizontal: 11, paddingVertical: 7, borderRadius: 100 },
    timerText: { fontFamily: fonts.displaySemiBold, fontSize: 13, color: colors.textOnYellow },
    trialDesc: { fontFamily: fonts.bodyRegular, fontSize: 13, lineHeight: 19, color: colors.textMuted },

    card: { backgroundColor: colors.surfaceCard, borderWidth: 1, borderColor: palette.neutral200, borderRadius: radius.lg, padding: 18, marginBottom: 16 },
    otpCard: { backgroundColor: colors.surfaceCard, borderWidth: 1, borderColor: palette.yellow500, borderRadius: radius.lg, padding: 18, marginBottom: 16, alignItems: 'center' },
    otpValue: { fontFamily: fonts.displaySemiBold, fontSize: 34, letterSpacing: 8, color: colors.textStrong, marginTop: 6 },
    otpNote: { fontFamily: fonts.bodyRegular, fontSize: 12, color: colors.textFaint, marginTop: 6, textAlign: 'center' },

    failCard: { backgroundColor: '#FDECEC', borderRadius: radius.lg, padding: 18, marginBottom: 16 },
    failText: { fontFamily: fonts.bodyBold, fontSize: 15, color: colors.textStrong, marginTop: 6 },
    failNote: { fontFamily: fonts.bodyRegular, fontSize: 12, color: colors.textFaint, marginTop: 6 },

    tlRow: { flexDirection: 'row' },
    tlLeft: { width: 26, marginRight: 15, alignItems: 'center' },
    tlDot: { width: 26, height: 26, borderRadius: 13, alignItems: 'center', justifyContent: 'center' },
    tlDotOn: { backgroundColor: palette.yellow500 },
    tlDotOff: { backgroundColor: '#F3F2EE', borderWidth: 2, borderColor: colors.borderSubtle },
    tlInner: { width: 9, height: 9, borderRadius: 5 },
    tlLine: { flex: 1, width: 2, marginVertical: 4, minHeight: 26 },
    tlTitle: { fontFamily: fonts.displaySemiBold, fontSize: 15, color: colors.textStrong },
    tlNote: { fontFamily: fonts.bodyRegular, fontSize: 12, color: colors.textFaint, marginTop: 1 },

    courier: { flexDirection: 'row', alignItems: 'center', gap: 13, backgroundColor: colors.surfaceCard, borderWidth: 1, borderColor: palette.neutral200, borderRadius: radius.lg, padding: 14, marginBottom: 8 },
    courierAvatar: { width: 52, height: 52, borderRadius: 26, backgroundColor: colors.surfaceSunken, alignItems: 'center', justifyContent: 'center' },
    courierInitial: { fontFamily: fonts.displayBold, fontSize: 20, color: colors.textMuted },
    courierName: { fontFamily: fonts.displaySemiBold, fontSize: 16, color: colors.textStrong, marginBottom: 2 },
    courierOutline: { width: 46, height: 46, borderRadius: 15, borderWidth: 2, borderColor: colors.borderInk, alignItems: 'center', justifyContent: 'center' },
    courierYellow: { width: 46, height: 46, borderRadius: 15, backgroundColor: palette.yellow500, alignItems: 'center', justifyContent: 'center' },

    bottomBar: { position: 'absolute', left: 0, right: 0, bottom: 0, flexDirection: 'row', gap: 12, backgroundColor: colors.surfaceCard, borderTopWidth: 1, borderTopColor: colors.surfaceSunken, paddingHorizontal: 20, paddingTop: 16 },
});
