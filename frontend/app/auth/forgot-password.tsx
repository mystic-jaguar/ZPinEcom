import ActionModal from '@/components/common/ActionModal';
import { useRouter } from 'expo-router';
import { ArrowRight, KeyRound, Mail } from 'lucide-react-native';
import React, { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AppHeader, AuthCard, ZButton, ZInput } from '../../components/ui';
import { createStyles, colors, fonts, palette } from '../../constants/theme';
import { authService } from '../../services/auth';
import { Text } from '../../components/ui/ScaledText';

export default function ForgotPasswordScreen() {
    const router = useRouter();
    const [emailOrPhone, setEmailOrPhone] = useState('');
    const [showErrorModal, setShowErrorModal] = useState(false);
    const [showSuccessModal, setShowSuccessModal] = useState(false);
    const [errorMessage, setErrorMessage] = useState('');
    const [loading, setLoading] = useState(false);

    const validateInput = () => {
        if (!emailOrPhone.trim()) {
            setErrorMessage('Please enter your email address');
            setShowErrorModal(true);
            return false;
        }
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(emailOrPhone.trim())) {
            setErrorMessage('Please enter a valid email address');
            setShowErrorModal(true);
            return false;
        }
        return true;
    };

    const handleSendResetLink = async () => {
        if (!validateInput()) return;
        setLoading(true);
        try {
            // Password reset is email-only (OTP delivered by email).
            await authService.sendPasswordResetOTP('', emailOrPhone.trim());
            setShowSuccessModal(true);
        } catch (error: any) {
            setErrorMessage(error.message || 'Failed to send OTP. Please try again.');
            setShowErrorModal(true);
        } finally {
            setLoading(false);
        }
    };

    return (
        <SafeAreaView style={styles.container} edges={['top']}>
            <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.flex}>
                <AppHeader onBack={() => router.back()} />
                <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
                    <AuthCard
                        icon={KeyRound}
                        iconBg={palette.yellow500}
                        iconColor={colors.textStrong}
                        title="Forgot password?"
                        subtitle="Enter your email and we'll send a code to reset it. Quick as a courier."
                    >
                    <ZInput
                        label="Email"
                        icon={Mail}
                        placeholder="you@email.com"
                        value={emailOrPhone}
                        onChangeText={setEmailOrPhone}
                        autoCapitalize="none"
                        keyboardType="email-address"
                        editable={!loading}
                    />
                    <View style={{ height: 8 }} />
                    <ZButton label={loading ? 'Sending…' : 'Send reset code'} icon={ArrowRight} onPress={handleSendResetLink} loading={loading} />
                    </AuthCard>
                    <Text style={styles.back} onPress={() => router.back()}>Back to log in</Text>
                </ScrollView>
            </KeyboardAvoidingView>

            <ActionModal visible={showErrorModal} title="Error" message={errorMessage} primaryButtonText="Try Again" onPrimaryPress={() => setShowErrorModal(false)} onClose={() => setShowErrorModal(false)} icon="alert-circle" />
            <ActionModal
                visible={showSuccessModal}
                title="OTP Sent!"
                message={`We've sent a verification code to ${emailOrPhone}`}
                primaryButtonText="Continue"
                onPrimaryPress={() => {
                    setShowSuccessModal(false);
                    router.push({ pathname: '/auth/verify-reset-otp', params: { emailOrPhone: emailOrPhone.trim(), isEmail: 'true' } });
                }}
                onClose={() => setShowSuccessModal(false)}
                icon="mail"
            />
        </SafeAreaView>
    );
}

const styles = createStyles({
    container: { flex: 1, backgroundColor: palette.paperWarm },
    flex: { flex: 1 },
    content: { paddingHorizontal: 16, paddingTop: 10, paddingBottom: 30 },
    back: { fontFamily: fonts.bodyBold, fontSize: 14, color: colors.textStrong, textAlign: 'center', marginTop: 20 },
});
