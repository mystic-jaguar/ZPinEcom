import ActionModal from '@/components/common/ActionModal';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Lock } from 'lucide-react-native';
import React, { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AppHeader, ZButton, ZInput, ZText } from '../../components/ui';
import { colors, fonts, palette } from '../../constants/theme';
import { authService } from '../../services/auth';
import { validatePassword } from '../../utils/validation';

export default function ResetPasswordScreen() {
    const router = useRouter();
    const params = useLocalSearchParams();
    const resetToken = params.resetToken as string;

    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [showErrorModal, setShowErrorModal] = useState(false);
    const [showSuccessModal, setShowSuccessModal] = useState(false);
    const [errorMessage, setErrorMessage] = useState('');

    // 0 none, 1 weak, 2 medium, 3 strong
    const getStrength = (pw: string) => {
        if (pw.length === 0) return { level: 0, label: '', color: colors.borderSubtle };
        if (!validatePassword(pw).isValid) return { level: 1, label: 'WEAK', color: palette.danger500 };
        if (pw.length < 12) return { level: 2, label: 'MEDIUM', color: palette.warning500 };
        return { level: 3, label: 'STRONG', color: palette.green500 };
    };

    const validatePasswords = () => {
        if (!newPassword.trim()) { setErrorMessage('Please enter a new password'); setShowErrorModal(true); return false; }
        const passwordCheck = validatePassword(newPassword);
        if (!passwordCheck.isValid) { setErrorMessage(`Password must contain: ${passwordCheck.requirements.join(', ')}`); setShowErrorModal(true); return false; }
        if (!confirmPassword.trim()) { setErrorMessage('Please confirm your password'); setShowErrorModal(true); return false; }
        if (newPassword !== confirmPassword) { setErrorMessage('Passwords do not match'); setShowErrorModal(true); return false; }
        return true;
    };

    const handleResetPassword = async () => {
        if (!validatePasswords()) return;
        setLoading(true);
        try {
            await authService.resetPassword(resetToken, newPassword);
            setShowSuccessModal(true);
        } catch (error: any) {
            setErrorMessage(error.message || 'Failed to reset password. Please try again.');
            setShowErrorModal(true);
        } finally {
            setLoading(false);
        }
    };

    const strength = getStrength(newPassword);

    return (
        <SafeAreaView style={styles.container} edges={['top']}>
            <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.flex}>
                <AppHeader onBack={() => router.back()} />
                <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
                    <ZText variant="h2" style={styles.title}>Set a new password</ZText>
                    <ZText variant="muted" style={styles.subtitle}>
                        Make it strong. At least 8 characters with a number and a symbol.
                    </ZText>

                    <ZInput label="New password" icon={Lock} secure placeholder="Enter new password" value={newPassword} onChangeText={setNewPassword} autoCapitalize="none" editable={!loading} containerStyle={{ marginBottom: 8 }} />
                    {newPassword.length > 0 && (
                        <>
                            <View style={styles.meter}>
                                {[0, 1, 2, 3].map((i) => (
                                    <View key={i} style={[styles.meterSeg, { backgroundColor: i < strength.level ? strength.color : colors.borderSubtle }]} />
                                ))}
                            </View>
                            <Text style={[styles.strengthLabel, { color: strength.color }]}>{strength.label}</Text>
                        </>
                    )}

                    <ZInput label="Confirm password" icon={Lock} secure placeholder="Re-enter new password" value={confirmPassword} onChangeText={setConfirmPassword} autoCapitalize="none" editable={!loading} containerStyle={{ marginTop: 12, marginBottom: 24 }} />

                    <ZButton label={loading ? 'Resetting…' : 'Reset password'} onPress={handleResetPassword} loading={loading} />
                </ScrollView>
            </KeyboardAvoidingView>

            <ActionModal visible={showErrorModal} title="Error" message={errorMessage} primaryButtonText="Try Again" onPrimaryPress={() => setShowErrorModal(false)} onClose={() => setShowErrorModal(false)} icon="alert-circle" />
            <ActionModal
                visible={showSuccessModal}
                title="Password Reset!"
                message="Your password has been reset successfully. You can now login with your new password."
                primaryButtonText="Go to Login"
                onPrimaryPress={() => { setShowSuccessModal(false); router.replace('/auth/login'); }}
                onClose={() => setShowSuccessModal(false)}
                icon="check-circle"
            />
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: palette.paperWarm },
    flex: { flex: 1 },
    content: { paddingHorizontal: 26, paddingBottom: 30 },
    title: { marginTop: 24 },
    subtitle: { marginTop: 10, marginBottom: 28, lineHeight: 23 },
    meter: { flexDirection: 'row', gap: 6, marginBottom: 8 },
    meterSeg: { flex: 1, height: 5, borderRadius: 3 },
    strengthLabel: { fontFamily: fonts.monoBold, fontSize: 10, letterSpacing: 0.6 },
});
