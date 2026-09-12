import * as AppleAuthentication from 'expo-apple-authentication';
import { useRouter } from 'expo-router';
import { Check, Lock, Mail, User, Zap } from 'lucide-react-native';
import React, { useEffect, useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import ActionModal from '../../components/common/ActionModal';
import LegalDocModal, { LegalDocType } from '../../components/common/LegalDocModal';
import { AppHeader, GoogleGlyph, ZButton, ZInput, ZText } from '../../components/ui';
import { createStyles, colors, fonts, palette, radius, shadow } from '../../constants/theme';
import { useUser } from '../../context/UserContext';
import { appleAuthService, authService, googleAuthService } from '../../services/auth';
import { validatePassword } from '../../utils/validation';
import { Text, TextInput } from '../../components/ui/ScaledText';

// Google Sign-In requires a native build — not available in Expo Go
let isGoogleSignInAvailable = false;
try {
    require('@react-native-google-signin/google-signin');
    isGoogleSignInAvailable = true;
} catch {
    isGoogleSignInAvailable = false;
}

export default function SignupScreen() {
    const router = useRouter();
    const { setUser } = useUser();
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [mobile, setMobile] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [agreedToTerms, setAgreedToTerms] = useState(false);
    const [loading, setLoading] = useState(false);
    const [showErrorModal, setShowErrorModal] = useState(false);
    const [errorMessage, setErrorMessage] = useState('');
    const [legalModalVisible, setLegalModalVisible] = useState(false);
    const [legalDocType, setLegalDocType] = useState<LegalDocType>('terms');
    const [appleAvailable, setAppleAvailable] = useState(false);

    useEffect(() => {
        appleAuthService.isAvailable().then(setAppleAvailable);
    }, []);

    const handleAppleSignUp = async () => {
        setLoading(true);
        try {
            const { identityToken, rawNonce, fullName } = await appleAuthService.signIn();
            const response = await appleAuthService.authenticateWithBackend(identityToken, rawNonce, fullName);
            if (response.user) {
                setUser(response.user);
                if (!response.user.dob || !response.user.gender) {
                    router.replace('/auth/complete-profile');
                    return;
                }
            }
            router.replace('/(tabs)');
        } catch (error: any) {
            if (error.code !== 'ERR_REQUEST_CANCELED') {
                setErrorMessage(error.message || 'Apple sign-in failed');
                setShowErrorModal(true);
            }
        } finally {
            setLoading(false);
        }
    };

    const openLegalDoc = (type: LegalDocType) => {
        setLegalDocType(type);
        setLegalModalVisible(true);
    };

    const validateInputs = () => {
        if (!name.trim()) { setErrorMessage('Please enter your name'); setShowErrorModal(true); return false; }
        if (!email.trim()) { setErrorMessage('Please enter your email'); setShowErrorModal(true); return false; }
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) { setErrorMessage('Please enter a valid email address'); setShowErrorModal(true); return false; }
        if (!mobile.trim()) { setErrorMessage('Please enter your mobile number'); setShowErrorModal(true); return false; }
        if (!/^\d{10}$/.test(mobile)) { setErrorMessage('Please enter a valid 10-digit mobile number'); setShowErrorModal(true); return false; }
        if (!password.trim()) { setErrorMessage('Please enter a password'); setShowErrorModal(true); return false; }
        // Match the backend's strength policy exactly (validation.ts mirrors isStrongPassword).
        const passwordCheck = validatePassword(password);
        if (!passwordCheck.isValid) {
            setErrorMessage(`Password must contain: ${passwordCheck.requirements.join(', ')}`);
            setShowErrorModal(true);
            return false;
        }
        if (password !== confirmPassword) { setErrorMessage('Passwords do not match'); setShowErrorModal(true); return false; }
        if (!agreedToTerms) { setErrorMessage('Please agree to the Terms and Conditions'); setShowErrorModal(true); return false; }
        return true;
    };

    const handleGoogleSignUp = async () => {
        setLoading(true);
        try {
            const { idToken, accessToken } = await googleAuthService.signIn();
            const response = await googleAuthService.authenticateWithBackend(idToken, accessToken);
            if (response.user) {
                setUser(response.user);
                const userData = response.user;
                if (!userData.dob || !userData.gender) {
                    router.replace('/auth/complete-profile');
                    return;
                }
            }
            router.replace('/(tabs)');
        } catch (error: any) {
            if (error.code !== 'SIGN_IN_CANCELLED') {
                setErrorMessage(error.message || 'Google sign-in failed');
                setShowErrorModal(true);
            }
        } finally {
            setLoading(false);
        }
    };

    const handleSignup = async () => {
        if (!validateInputs()) return;
        setLoading(true);
        try {
            const response = await authService.signup({ name, email, mobile, password });
            // Account is created only after email OTP verification — no tokens yet.
            router.push({
                pathname: '/auth/verify-otp',
                params: { email, otpEmailSent: response.otpEmailSent === false ? '0' : '1' },
            });
        } catch (error: any) {
            setErrorMessage(error.message || 'An error occurred. Please try again.');
            setShowErrorModal(true);
        } finally {
            setLoading(false);
        }
    };

    return (
        <SafeAreaView style={styles.container} edges={['top']}>
            <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.flex}>
                <AppHeader onBack={() => router.back()} />
                <ScrollView
                    contentContainerStyle={styles.scrollContent}
                    keyboardShouldPersistTaps="handled"
                    showsVerticalScrollIndicator={false}
                >
                    <View style={styles.card}>
                    <View style={styles.badgeRow}>
                        <View style={styles.badge}>
                            <Zap size={13} color={palette.yellow600} fill={palette.yellow600} />
                            <Text style={styles.badgeText}>Welcome to ZPIN</Text>
                        </View>
                    </View>

                    <ZText variant="screenTitle" style={styles.title}>Create Account</ZText>
                    <ZText variant="muted" style={styles.subtitle}>Join us and start your shopping journey</ZText>

                    <ZInput label="Full name" icon={User} placeholder="Aarav Sharma" value={name} onChangeText={setName} editable={!loading} />
                    <ZInput label="Email" icon={Mail} placeholder="you@email.com" value={email} onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address" editable={!loading} />

                    <ZText variant="eyebrow" color={colors.textBody} style={styles.label}>Mobile number</ZText>
                    <View style={styles.mobileField}>
                        <Text style={styles.countryCode}>+91</Text>
                        <View style={styles.mobileDivider} />
                        <TextInput
                            style={styles.mobileInput}
                            placeholder="98765 43210"
                            placeholderTextColor={colors.textFaint}
                            value={mobile}
                            onChangeText={(t) => setMobile(t.replace(/[^0-9]/g, ''))}
                            keyboardType="phone-pad"
                            maxLength={10}
                            editable={!loading}
                        />
                    </View>

                    <ZInput label="Password" icon={Lock} secure placeholder="Create a password" value={password} onChangeText={setPassword} autoCapitalize="none" editable={!loading} />
                    <ZInput label="Confirm password" icon={Lock} secure placeholder="Re-enter your password" value={confirmPassword} onChangeText={setConfirmPassword} autoCapitalize="none" editable={!loading} />

                    <Pressable style={styles.terms} onPress={() => setAgreedToTerms((v) => !v)} disabled={loading}>
                        <View style={[styles.checkbox, agreedToTerms && styles.checkboxOn]}>
                            {agreedToTerms && <Check size={14} color={palette.yellow500} />}
                        </View>
                        <Text style={styles.termsText}>
                            I agree to ZPIN&apos;s{' '}
                            <Text style={styles.termsLink} onPress={() => openLegalDoc('terms')}>Terms of Service</Text>
                            {' '}and{' '}
                            <Text style={styles.termsLink} onPress={() => openLegalDoc('privacy')}>Privacy Policy</Text>.
                        </Text>
                    </Pressable>

                    <ZButton label={loading ? 'Creating account…' : 'Create account'} onPress={handleSignup} loading={loading} />

                    <View style={styles.divider}>
                        <View style={styles.dividerLine} />
                        <Text style={styles.dividerText}>OR</Text>
                        <View style={styles.dividerLine} />
                    </View>

                    <View style={styles.socialRow}>
                        {isGoogleSignInAvailable && (
                            <Pressable style={styles.googleBtn} onPress={handleGoogleSignUp} disabled={loading}>
                                <GoogleGlyph size={18} />
                                <Text style={styles.googleText}>Google</Text>
                            </Pressable>
                        )}
                        {appleAvailable && (
                            <AppleAuthentication.AppleAuthenticationButton
                                buttonType={AppleAuthentication.AppleAuthenticationButtonType.SIGN_UP}
                                buttonStyle={AppleAuthentication.AppleAuthenticationButtonStyle.BLACK}
                                cornerRadius={14}
                                style={styles.appleBtn}
                                onPress={handleAppleSignUp}
                            />
                        )}
                    </View>
                    </View>

                    <Pressable style={styles.footer} onPress={() => router.back()}>
                        <Text style={styles.footerText}>Already have an account? </Text>
                        <Text style={styles.footerLink}>Log in</Text>
                    </Pressable>
                </ScrollView>
            </KeyboardAvoidingView>

            <ActionModal visible={showErrorModal} title="Error" message={errorMessage} icon="x-circle" primaryButtonText="OK" onPrimaryPress={() => setShowErrorModal(false)} onClose={() => setShowErrorModal(false)} />
            <LegalDocModal visible={legalModalVisible} docType={legalDocType} onClose={() => setLegalModalVisible(false)} />
        </SafeAreaView>
    );
}

const styles = createStyles({
    container: { flex: 1, backgroundColor: palette.paperWarm },
    flex: { flex: 1 },
    scrollContent: { paddingHorizontal: 16, paddingBottom: 30 },

    // Matches the login screen and the website's mobile auth card.
    card: {
        backgroundColor: colors.surfaceCard,
        borderRadius: radius.xl,
        paddingHorizontal: 20,
        paddingVertical: 26,
        marginTop: 6,
        ...shadow.md,
    },
    badgeRow: { alignItems: 'center', marginBottom: 18 },
    badge: {
        flexDirection: 'row', alignItems: 'center', gap: 6,
        backgroundColor: palette.yellow100, borderRadius: 999,
        paddingHorizontal: 13, paddingVertical: 7,
    },
    badgeText: { fontFamily: fonts.bodyBold, fontSize: 12, color: colors.textStrong },
    title: { textAlign: 'center' },
    subtitle: { textAlign: 'center', marginTop: 8, marginBottom: 24 },
    label: { marginBottom: 7 },
    mobileField: {
        flexDirection: 'row', alignItems: 'center', gap: 11,
        backgroundColor: colors.surfaceCard, borderWidth: 1.5, borderColor: colors.borderSubtle,
        borderRadius: radius.md, paddingHorizontal: 15, height: 52, marginBottom: 16,
    },
    countryCode: { fontFamily: fonts.monoBold, fontSize: 13, color: colors.textStrong },
    mobileDivider: { width: 1, height: 22, backgroundColor: colors.borderSubtle },
    mobileInput: { flex: 1, fontFamily: fonts.bodyMedium, fontSize: 15, color: colors.textStrong, padding: 0 },
    terms: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, marginBottom: 20 },
    checkbox: {
        width: 22, height: 22, borderRadius: 7, borderWidth: 2, borderColor: colors.borderSubtle,
        alignItems: 'center', justifyContent: 'center', marginTop: 1,
    },
    checkboxOn: { backgroundColor: colors.surfaceInverse, borderColor: colors.surfaceInverse },
    termsText: { flex: 1, fontFamily: fonts.bodyRegular, fontSize: 12, lineHeight: 18, color: colors.textMuted },
    termsLink: { fontFamily: fonts.bodyBold, color: colors.textStrong },
    divider: { flexDirection: 'row', alignItems: 'center', gap: 12, marginVertical: 18 },
    dividerLine: { flex: 1, height: 1, backgroundColor: colors.borderSubtle },
    dividerText: { fontFamily: fonts.monoBold, fontSize: 10, letterSpacing: 1, color: colors.textFaint },
    socialRow: { flexDirection: 'row', gap: 12 },
    googleBtn: {
        flex: 1, height: 50, borderRadius: radius.md, borderWidth: 2, borderColor: colors.borderSubtle,
        backgroundColor: colors.surfaceCard, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 9,
    },
    googleText: { fontFamily: fonts.bodyBold, fontSize: 13, color: colors.textStrong },
    appleBtn: { flex: 1, height: 50 },
    footer: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', paddingVertical: 22 },
    footerText: { fontFamily: fonts.bodyRegular, fontSize: 14, color: colors.textMuted },
    footerLink: { fontFamily: fonts.bodyBold, fontSize: 14, color: colors.textStrong },
});
