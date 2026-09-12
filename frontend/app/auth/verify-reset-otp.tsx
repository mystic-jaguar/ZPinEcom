import ActionModal from '@/components/common/ActionModal';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Mail } from 'lucide-react-native';
import React, { useEffect, useRef, useState } from 'react';
import { View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AppHeader, AuthCard, ZButton } from '../../components/ui';
import { createStyles, colors, fonts, palette } from '../../constants/theme';
import { authService } from '../../services/auth';
import type { TextInput as RNTextInput } from 'react-native';
import { Text, TextInput } from '../../components/ui/ScaledText';

export default function VerifyResetOTPScreen() {
    const router = useRouter();
    const params = useLocalSearchParams();
    const emailOrPhone = params.emailOrPhone as string;
    const isEmail = params.isEmail === 'true';

    const [otp, setOtp] = useState(['', '', '', '', '', '']);
    const [loading, setLoading] = useState(false);
    const [resendTimer, setResendTimer] = useState(60);
    const [canResend, setCanResend] = useState(false);
    const [focusIndex, setFocusIndex] = useState(0);
    const [showErrorModal, setShowErrorModal] = useState(false);
    const [showSuccessModal, setShowSuccessModal] = useState(false);
    const [errorMessage, setErrorMessage] = useState('');
    const [resetToken, setResetToken] = useState('');
    const inputRefs = useRef<Array<RNTextInput | null>>([]);

    useEffect(() => {
        if (resendTimer > 0) {
            const timer = setTimeout(() => setResendTimer(resendTimer - 1), 1000);
            return () => clearTimeout(timer);
        }
        setCanResend(true);
    }, [resendTimer]);

    const handleOtpChange = (index: number, value: string) => {
        if (value.length > 1) value = value.charAt(value.length - 1);
        const newOtp = [...otp];
        newOtp[index] = value;
        setOtp(newOtp);
        if (value && index < 5) inputRefs.current[index + 1]?.focus();
    };

    const handleKeyPress = (index: number, key: string) => {
        if (key === 'Backspace' && !otp[index] && index > 0) inputRefs.current[index - 1]?.focus();
    };

    const handleVerifyOTP = async () => {
        const otpString = otp.join('');
        if (otpString.length !== 6) {
            setErrorMessage('Please enter the complete 6-digit OTP');
            setShowErrorModal(true);
            return;
        }
        setLoading(true);
        try {
            const response = await authService.verifyPasswordResetOTP(
                isEmail ? '' : emailOrPhone,
                isEmail ? emailOrPhone : '',
                otpString
            );
            setResetToken(response.resetToken || otpString);
            setShowSuccessModal(true);
        } catch (error: any) {
            setErrorMessage(error.message || 'Invalid OTP. Please try again.');
            setShowErrorModal(true);
        } finally {
            setLoading(false);
        }
    };

    const handleResendOTP = async () => {
        if (!canResend) return;
        setLoading(true);
        try {
            await authService.sendPasswordResetOTP(isEmail ? '' : emailOrPhone, isEmail ? emailOrPhone : '');
            setResendTimer(60);
            setCanResend(false);
            setOtp(['', '', '', '', '', '']);
        } catch (error: any) {
            setErrorMessage(error.message || 'Failed to resend OTP. Please try again.');
            setShowErrorModal(true);
        } finally {
            setLoading(false);
        }
    };

    return (
        <SafeAreaView style={styles.container} edges={['top']}>
            <AppHeader onBack={() => router.back()} />
            <View style={styles.content}>
                <AuthCard
                    icon={Mail}
                    title="Verify your email"
                    subtitle={<>
                        We&apos;ve sent a verification code to{'\n'}
                        <Text style={styles.email}>{emailOrPhone}</Text>
                    </>}
                >

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
                            onChangeText={(value) => handleOtpChange(index, value)}
                            onKeyPress={({ nativeEvent }) => handleKeyPress(index, nativeEvent.key)}
                            onFocus={() => setFocusIndex(index)}
                            keyboardType="number-pad"
                            maxLength={1}
                            editable={!loading}
                        />
                    ))}
                </View>

                <ZButton label={loading ? 'Verifying…' : 'Verify & continue'} onPress={handleVerifyOTP} loading={loading} />

                <View style={styles.resend}>
                    <Text style={styles.resendText}>Didn&apos;t get it? </Text>
                    {canResend ? (
                        <Text style={styles.resendLink} onPress={handleResendOTP}>Resend now</Text>
                    ) : (
                        <Text style={styles.resendMuted}>Resend in 0:{String(resendTimer).padStart(2, '0')}</Text>
                    )}
                </View>
                </AuthCard>
            </View>

            <ActionModal visible={showErrorModal} title="Error" message={errorMessage} primaryButtonText="Try Again" onPrimaryPress={() => setShowErrorModal(false)} onClose={() => setShowErrorModal(false)} icon="alert-circle" />
            <ActionModal
                visible={showSuccessModal}
                title="Verified!"
                message="OTP verified successfully. Let's reset your password."
                primaryButtonText="Continue"
                onPrimaryPress={() => { setShowSuccessModal(false); router.push({ pathname: '/auth/reset-password', params: { resetToken } }); }}
                onClose={() => setShowSuccessModal(false)}
                icon="check-circle"
            />
        </SafeAreaView>
    );
}

const styles = createStyles({
    container: { flex: 1, backgroundColor: palette.paperWarm },
    content: { flex: 1, paddingHorizontal: 16, paddingTop: 10 },
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
