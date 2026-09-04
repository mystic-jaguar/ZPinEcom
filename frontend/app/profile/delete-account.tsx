/**
 * Delete account — parity with the customer website's flow.
 *
 * Two steps on one screen: an optional reason, then a 6-digit code mailed to the
 * registered address. Nothing is destroyed on confirm — the account is closed
 * and stays recoverable for 30 days, which is the whole reason this replaced the
 * old one-tap modal in Help Centre.
 *
 * The server is the authority on whether the account can be closed at all: it
 * returns `blockers` (open orders) which are listed here in full rather than one
 * at a time, so a customer isn't sent round the loop twice.
 */
import { useRouter } from 'expo-router';
import { AlertTriangle, Trash2 } from 'lucide-react-native';
import React, { useEffect, useRef, useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import ActionModal from '../../components/common/ActionModal';
import { AppHeader, ZButton, ZText } from '../../components/ui';
import { createStyles, colors, fonts, palette, radius } from '../../constants/theme';
import { useCart } from '../../context/CartContext';
import { useUser } from '../../context/UserContext';
import { useWishlist } from '../../context/WishlistContext';
import { authService, DeletionBlocker } from '../../services/auth';
import type { TextInput as RNTextInput } from 'react-native';
import { Text, TextInput } from '../../components/ui/ScaledText';

const RESEND_SECONDS = 30;

export default function DeleteAccountScreen() {
    const router = useRouter();
    const { resetUser } = useUser();
    const { clearCart } = useCart();
    const { clearWishlist } = useWishlist();

    const [step, setStep] = useState<'reason' | 'code'>('reason');
    const [reason, setReason] = useState('');
    const [maskedEmail, setMaskedEmail] = useState('');
    const [recoveryDays, setRecoveryDays] = useState(30);
    const [otp, setOtp] = useState(['', '', '', '', '', '']);
    const [focusIndex, setFocusIndex] = useState(0);
    const [busy, setBusy] = useState(false);
    const [blockers, setBlockers] = useState<DeletionBlocker[]>([]);
    const [resendTimer, setResendTimer] = useState(RESEND_SECONDS);
    const [errorMessage, setErrorMessage] = useState('');
    const [deletedOn, setDeletedOn] = useState<string | null>(null);

    const inputRefs = useRef<Array<RNTextInput | null>>([]);

    // Only counts down on the code step, so the timer doesn't run out before the
    // first code is even requested.
    useEffect(() => {
        if (step !== 'code' || resendTimer <= 0) return;
        const t = setInterval(() => setResendTimer((prev) => Math.max(0, prev - 1)), 1000);
        return () => clearInterval(t);
    }, [step, resendTimer]);

    const showError = (err: any) => {
        setBlockers(Array.isArray(err?.blockers) ? err.blockers : []);
        setErrorMessage(err?.message || 'Something went wrong. Please try again later.');
    };

    const requestCode = async (resend = false) => {
        if (busy) return;
        setBusy(true);
        setBlockers([]);
        try {
            if (resend) {
                await authService.resendAccountDeletionOtp();
            } else {
                const { maskedEmail: masked, recoveryDays: days } = await authService.startAccountDeletion();
                setMaskedEmail(masked);
                setRecoveryDays(days);
            }
            setOtp(['', '', '', '', '', '']);
            setResendTimer(RESEND_SECONDS);
            setStep('code');
        } catch (err: any) {
            showError(err);
        } finally {
            setBusy(false);
        }
    };

    const handleConfirm = async (codeOverride?: string) => {
        const code = codeOverride || otp.join('');
        if (code.length !== 6) {
            setErrorMessage('Enter the complete 6-digit code.');
            return;
        }
        if (busy) return;
        setBusy(true);
        try {
            const { purgeAfter } = await authService.confirmAccountDeletion(code, reason.trim() || undefined);
            // Local teardown already happened inside confirmAccountDeletion; clear
            // the in-memory contexts so no stale cart/wishlist survives the logout.
            resetUser();
            clearCart();
            clearWishlist();
            setDeletedOn(
                purgeAfter
                    ? new Date(purgeAfter).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })
                    : null
            );
        } catch (err: any) {
            showError(err);
        } finally {
            setBusy(false);
        }
    };

    const handleOtpChange = (value: string, index: number) => {
        const next = [...otp];
        next[index] = value;
        setOtp(next);
        if (value && index < 5) inputRefs.current[index + 1]?.focus();
        if (index === 5 && value) {
            const code = [...next.slice(0, 5), value].join('');
            if (code.length === 6) handleConfirm(code);
        }
    };

    const handleKeyPress = (e: any, index: number) => {
        if (e.nativeEvent.key === 'Backspace' && !otp[index] && index > 0) {
            inputRefs.current[index - 1]?.focus();
        }
    };

    return (
        <SafeAreaView style={styles.container} edges={['top']}>
            <AppHeader title="Delete account" onBack={() => { if (!busy) router.back(); }} />
            <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
                <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
                    <View style={styles.warnCard}>
                        <AlertTriangle size={18} color={palette.red500} />
                        <Text style={styles.warnText}>
                            Deleting closes your account and signs you out everywhere. You have {recoveryDays} days to
                            change your mind — contact support before then and we restore it exactly as it was. After
                            that, your profile, addresses, cart, wishlist, reviews and wallet are permanently erased.
                            Order and invoice records are kept in anonymised form as the law requires.
                        </Text>
                    </View>

                    {blockers.length > 0 && (
                        <View style={styles.blockerCard}>
                            <ZText variant="eyebrow" style={{ marginBottom: 8 }}>Not yet</ZText>
                            {blockers.map((b) => (
                                <Text key={b.code} style={styles.blockerText}>• {b.message}</Text>
                            ))}
                        </View>
                    )}

                    {step === 'reason' ? (
                        <>
                            <ZText variant="eyebrow" style={styles.label}>Why are you leaving? (optional)</ZText>
                            <TextInput
                                style={styles.reasonInput}
                                placeholder="Tell us what went wrong"
                                placeholderTextColor={colors.textFaint}
                                value={reason}
                                onChangeText={setReason}
                                multiline
                                maxLength={1000}
                                editable={!busy}
                            />
                            <ZButton
                                label={busy ? 'Sending code…' : 'Email me a confirmation code'}
                                variant="red"
                                icon={Trash2}
                                loading={busy}
                                onPress={() => requestCode(false)}
                            />
                        </>
                    ) : (
                        <>
                            <ZText variant="eyebrow" style={styles.label}>Enter the code</ZText>
                            <Text style={styles.sentTo}>
                                We sent a 6-digit code to <Text style={styles.email}>{maskedEmail}</Text>. It expires in
                                10 minutes.
                            </Text>
                            <View style={styles.otpRow}>
                                {otp.map((digit, index) => (
                                    <TextInput
                                        key={index}
                                        ref={(ref) => { inputRefs.current[index] = ref; }}
                                        style={[
                                            styles.otpBox,
                                            digit ? styles.otpBoxFilled : null,
                                            focusIndex === index ? styles.otpBoxFocused : null,
                                        ]}
                                        value={digit}
                                        onChangeText={(v) => handleOtpChange(v.replace(/[^0-9]/g, ''), index)}
                                        onKeyPress={(e) => handleKeyPress(e, index)}
                                        onFocus={() => setFocusIndex(index)}
                                        keyboardType="number-pad"
                                        maxLength={1}
                                        selectTextOnFocus
                                        autoFocus={index === 0}
                                        editable={!busy}
                                    />
                                ))}
                            </View>
                            <ZButton
                                label={busy ? 'Deleting…' : 'Delete my account'}
                                variant="red"
                                loading={busy}
                                onPress={() => handleConfirm()}
                            />
                            <View style={styles.resend}>
                                <Text style={styles.resendText}>Didn&apos;t get it? </Text>
                                {resendTimer === 0 ? (
                                    <Text style={styles.resendLink} onPress={() => requestCode(true)}>Resend now</Text>
                                ) : (
                                    <Text style={styles.resendMuted}>Resend in 0:{String(resendTimer).padStart(2, '0')}</Text>
                                )}
                            </View>
                        </>
                    )}
                    <View style={{ height: 40 }} />
                </ScrollView>
            </KeyboardAvoidingView>

            <ActionModal
                visible={!!errorMessage}
                title="Could not delete account"
                message={errorMessage}
                icon="alert-circle"
                primaryButtonText="OK"
                onPrimaryPress={() => setErrorMessage('')}
                onClose={() => setErrorMessage('')}
            />
            <ActionModal
                visible={deletedOn !== null}
                title="Account deleted"
                message={
                    deletedOn
                        ? `You have been signed out. Contact support before ${deletedOn} if you want your account back — after that it cannot be recovered.`
                        : 'You have been signed out. Contact support within 30 days if you want your account back.'
                }
                icon="check-circle"
                primaryButtonText="OK"
                onPrimaryPress={() => router.replace('/auth/login')}
                onClose={() => router.replace('/auth/login')}
            />
        </SafeAreaView>
    );
}

const styles = createStyles({
    container: { flex: 1, backgroundColor: palette.paperWarm },
    content: { paddingHorizontal: 22, paddingTop: 8 },
    warnCard: {
        flexDirection: 'row', gap: 10, backgroundColor: colors.surfaceCard, borderWidth: 1,
        borderColor: palette.red500, borderRadius: radius.lg, padding: 14, marginBottom: 18,
    },
    warnText: { flex: 1, fontFamily: fonts.bodyRegular, fontSize: 13, lineHeight: 19, color: colors.textBody },
    blockerCard: {
        backgroundColor: colors.surfaceSunken, borderRadius: radius.lg, padding: 14, marginBottom: 18,
    },
    blockerText: { fontFamily: fonts.bodyRegular, fontSize: 13, lineHeight: 19, color: colors.textBody },
    label: { marginBottom: 10 },
    reasonInput: {
        minHeight: 96, borderRadius: radius.lg, backgroundColor: colors.surfaceCard, borderWidth: 1,
        borderColor: colors.borderSubtle, padding: 14, textAlignVertical: 'top',
        fontFamily: fonts.bodyRegular, fontSize: 14, color: colors.textStrong, marginBottom: 22,
    },
    sentTo: { fontFamily: fonts.bodyRegular, fontSize: 13, lineHeight: 19, color: colors.textMuted, marginBottom: 18 },
    email: { fontFamily: fonts.bodyBold, color: colors.textStrong },
    otpRow: { flexDirection: 'row', gap: 9, marginBottom: 26 },
    otpBox: {
        flex: 1, height: 60, borderRadius: 14, backgroundColor: colors.surfaceCard,
        borderWidth: 1.5, borderColor: colors.borderSubtle, textAlign: 'center',
        fontFamily: fonts.displayBold, fontSize: 24, color: colors.textStrong,
    },
    otpBoxFilled: { borderWidth: 2, borderColor: colors.borderInk },
    otpBoxFocused: { borderWidth: 2, borderColor: palette.yellow500 },
    resend: { flexDirection: 'row', justifyContent: 'center', marginTop: 22 },
    resendText: { fontFamily: fonts.bodyRegular, fontSize: 14, color: colors.textMuted },
    resendLink: { fontFamily: fonts.bodyBold, fontSize: 14, color: colors.textStrong },
    resendMuted: { fontFamily: fonts.bodyBold, fontSize: 14, color: colors.textFaint },
});
