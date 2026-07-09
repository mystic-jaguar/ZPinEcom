import { useLocalSearchParams, useRouter } from 'expo-router';
import { MessageSquare } from 'lucide-react-native';
import React, { useEffect, useRef, useState } from 'react';
import { StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import ActionModal from '../../components/common/ActionModal';
import { AppHeader, ZButton, ZText } from '../../components/ui';
import { colors, fonts, palette } from '../../constants/theme';
import { useUser } from '../../context/UserContext';
import { authService } from '../../services/auth';

export default function VerifyOTPScreen() {
    const router = useRouter();
    const { setUser } = useUser();
    const params = useLocalSearchParams();
    const email = (params.email as string) || '';
    const otpEmailSent = (params.otpEmailSent as string) !== '0';

    const [otp, setOtp] = useState(['', '', '', '', '', '']);
    const [loading, setLoading] = useState(false);
    const [resendTimer, setResendTimer] = useState(30);
    const [canResend, setCanResend] = useState(false);
    const [focusIndex, setFocusIndex] = useState(0);
    const [showErrorModal, setShowErrorModal] = useState(false);
    const [showSuccessModal, setShowSuccessModal] = useState(false);
    const [modalMessage, setModalMessage] = useState('');

    const inputRefs = useRef<Array<TextInput | null>>([]);

    useEffect(() => {
        const timer = setInterval(() => {
            setResendTimer((prev) => {
                if (prev <= 1) { setCanResend(true); return 0; }
                return prev - 1;
            });
        }, 1000);
        return () => clearInterval(timer);
    }, []);

    useEffect(() => {
        if (!otpEmailSent) {
            setResendTimer(0);
            setCanResend(true);
            setModalMessage("We couldn't send your verification code. Tap Resend to try again.");
            setShowErrorModal(true);
        }
    }, [otpEmailSent]);

    const handleOtpChange = (value: string, index: number) => {
        const newOtp = [...otp];
        newOtp[index] = value;
        setOtp(newOtp);
        if (value && index < 5) inputRefs.current[index + 1]?.focus();
        if (index === 5 && value) {
            const otpCode = [...newOtp.slice(0, 5), value].join('');
            if (otpCode.length === 6) handleVerify(otpCode);
        }
    };

    const handleKeyPress = (e: any, index: number) => {
        if (e.nativeEvent.key === 'Backspace' && !otp[index] && index > 0) {
            inputRefs.current[index - 1]?.focus();
        }
    };

    const handleVerify = async (otpCode?: string) => {
        const code = otpCode || otp.join('');
        if (code.length !== 6) {
            setModalMessage('Please enter the complete OTP');
            setShowErrorModal(true);
            return;
        }
        setLoading(true);
        try {
            const data = await authService.verifyOTP(email, code);
            if (data.user) {
                setUser(data.user);
            } else {
                router.replace('/auth/login');
            }
        } catch (error: any) {
            setModalMessage(error.message || 'Invalid OTP. Please try again.');
            setShowErrorModal(true);
            setOtp(['', '', '', '', '', '']);
            inputRefs.current[0]?.focus();
        } finally {
            setLoading(false);
        }
    };

    const handleResendOTP = async () => {
        if (!canResend) return;
        try {
            await authService.sendOTP(email);
            setResendTimer(30);
            setCanResend(false);
            setModalMessage('A new OTP has been sent to your email');
            setShowSuccessModal(true);
        } catch (error: any) {
            setModalMessage(error.message || 'Failed to resend OTP. Please try again.');
            setShowErrorModal(true);
        }
    };

    return (
        <SafeAreaView style={styles.container} edges={['top']}>
            <AppHeader onBack={() => router.back()} />
            <View style={styles.content}>
                <View style={styles.iconTile}>
                    <MessageSquare size={30} color={palette.yellow500} />
                </View>
                <ZText variant="h2" style={styles.title}>Verify your number</ZText>
                <ZText variant="muted" style={styles.subtitle}>
                    Enter the 6-digit code we sent to{'\n'}
                    <Text style={styles.email}>{email}</Text>
                </ZText>

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
                            onChangeText={(value) => handleOtpChange(value.replace(/[^0-9]/g, ''), index)}
                            onKeyPress={(e) => handleKeyPress(e, index)}
                            onFocus={() => setFocusIndex(index)}
                            keyboardType="number-pad"
                            maxLength={1}
                            selectTextOnFocus
                            autoFocus={index === 0}
                            editable={!loading}
                        />
                    ))}
                </View>

                <ZButton label={loading ? 'Verifying…' : 'Verify & continue'} onPress={() => handleVerify()} loading={loading} />

                <View style={styles.resend}>
                    <Text style={styles.resendText}>Didn&apos;t get it? </Text>
                    {canResend ? (
                        <Text style={styles.resendLink} onPress={handleResendOTP}>Resend now</Text>
                    ) : (
                        <Text style={styles.resendMuted}>Resend in 0:{String(resendTimer).padStart(2, '0')}</Text>
                    )}
                </View>
            </View>

            <ActionModal visible={showErrorModal} title="Error" message={modalMessage} icon="x-circle" primaryButtonText="OK" onPrimaryPress={() => setShowErrorModal(false)} onClose={() => setShowErrorModal(false)} />
            <ActionModal visible={showSuccessModal} title="Success" message={modalMessage} icon="check-circle" primaryButtonText="OK" onPrimaryPress={() => setShowSuccessModal(false)} onClose={() => setShowSuccessModal(false)} />
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: palette.paperWarm },
    content: { flex: 1, paddingHorizontal: 26 },
    iconTile: {
        width: 64, height: 64, borderRadius: 20, backgroundColor: colors.surfaceInverse,
        alignItems: 'center', justifyContent: 'center', marginTop: 24,
    },
    title: { marginTop: 22 },
    subtitle: { marginTop: 10, marginBottom: 32, lineHeight: 23 },
    email: { fontFamily: fonts.bodyBold, color: colors.textStrong },
    otpRow: { flexDirection: 'row', gap: 9, marginBottom: 30 },
    otpBox: {
        flex: 1, height: 60, borderRadius: 14, backgroundColor: colors.surfaceCard,
        borderWidth: 1.5, borderColor: colors.borderSubtle, textAlign: 'center',
        fontFamily: fonts.displayBold, fontSize: 24, color: colors.textStrong,
    },
    otpBoxFilled: { borderWidth: 2, borderColor: colors.borderInk },
    otpBoxFocused: { borderWidth: 2, borderColor: palette.yellow500 },
    resend: { flexDirection: 'row', justifyContent: 'center', marginTop: 24 },
    resendText: { fontFamily: fonts.bodyRegular, fontSize: 14, color: colors.textMuted },
    resendLink: { fontFamily: fonts.bodyBold, fontSize: 14, color: colors.textStrong },
    resendMuted: { fontFamily: fonts.bodyBold, fontSize: 14, color: colors.textFaint },
});
