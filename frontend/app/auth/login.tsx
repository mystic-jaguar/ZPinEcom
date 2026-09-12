import * as AppleAuthentication from 'expo-apple-authentication';
import { useRouter } from 'expo-router';
import { ArrowRight, Lock, Mail, Zap } from 'lucide-react-native';
import React, { useEffect, useState } from 'react';
import {
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import ActionModal from '../../components/common/ActionModal';
import { AuthCard, GoogleGlyph, ZButton, ZInput } from '../../components/ui';
import { createStyles, colors, fonts, palette, radius } from '../../constants/theme';
import { useUser } from '../../context/UserContext';
import { userDataManager } from '../../services/api';
import { appleAuthService, authService, googleAuthService } from '../../services/auth';
import { Text } from '../../components/ui/ScaledText';

// Google Sign-In requires a native build — not available in Expo Go
let isGoogleSignInAvailable = false;
try {
    require('@react-native-google-signin/google-signin');
    isGoogleSignInAvailable = true;
} catch {
    isGoogleSignInAvailable = false;
}

export default function LoginScreen() {
    const router = useRouter();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [showErrorModal, setShowErrorModal] = useState(false);
    const [errorMessage, setErrorMessage] = useState('');
    const [appleAvailable, setAppleAvailable] = useState(false);

    const { setUser } = useUser();

    useEffect(() => {
        appleAuthService.isAvailable().then(setAppleAvailable);
    }, []);

    const handleAppleSignIn = async () => {
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
        } catch (error: any) {
            if (error.code !== 'ERR_REQUEST_CANCELED') {
                setErrorMessage(error.message || 'Apple sign-in failed');
                setShowErrorModal(true);
            }
        } finally {
            setLoading(false);
        }
    };

    const validateInputs = () => {
        if (!email.trim()) {
            setErrorMessage('Please enter your email or username');
            setShowErrorModal(true);
            return false;
        }
        if (!password.trim()) {
            setErrorMessage('Please enter your password');
            setShowErrorModal(true);
            return false;
        }
        return true;
    };

    const handleGoogleSignIn = async () => {
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
        } catch (error: any) {
            if (error.code !== 'SIGN_IN_CANCELLED') {
                setErrorMessage(error.message || 'Google sign-in failed');
                setShowErrorModal(true);
            }
        } finally {
            setLoading(false);
        }
    };

    const handleLogin = async () => {
        if (!validateInputs()) return;

        setLoading(true);
        try {
            const response = await authService.login(email, password);
            if (response.success) {
                const responseData = response.data || response;
                const userData = response.user || responseData.user || await userDataManager.getUserData();
                if (userData) {
                    setUser(userData);
                } else {
                    throw new Error('Unable to retrieve user data');
                }
            } else {
                throw new Error(response.message || 'Login failed');
            }
            // RootLayout auto-redirects to /(tabs) when isAuthenticated becomes true.
        } catch (error) {
            const message = error instanceof Error ? error.message : 'Invalid email or password';
            setErrorMessage(message);
            setShowErrorModal(true);
        } finally {
            setLoading(false);
        }
    };

    return (
        <SafeAreaView style={styles.container} edges={['top']}>
            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                style={styles.flex}
            >
                <ScrollView
                    contentContainerStyle={styles.scrollContent}
                    keyboardShouldPersistTaps="handled"
                    showsVerticalScrollIndicator={false}
                >

                    <View style={styles.brand}>
                        <Image
                            source={require('../../assets/images/zpin_wordmark.png')}
                            style={styles.logo}
                            resizeMode="contain"
                        />
                        <Text style={styles.brandTag}>
                            Shop Faster. <Text style={styles.brandTagMuted}>Live Better.</Text>
                        </Text>
                    </View>

                    <AuthCard
                        badge="Welcome to ZPIN"
                        mark
                        badgeIcon={Zap}
                        title="Welcome Back"
                        titleVariant="screenTitle"
                        subtitle="Login to your account to continue shopping"
                    >
                    <ZInput
                        label="Email or username"
                        icon={Mail}
                        placeholder="aarav.sharma@email.com"
                        value={email}
                        onChangeText={setEmail}
                        autoCapitalize="none"
                        keyboardType="email-address"
                        editable={!loading}
                    />

                    <ZInput
                        label="Password"
                        icon={Lock}
                        secure
                        placeholder="Enter your password"
                        value={password}
                        onChangeText={setPassword}
                        autoCapitalize="none"
                        editable={!loading}
                    />

                    <Pressable style={styles.forgot} onPress={() => router.push('/auth/forgot-password')}>
                        <Text style={styles.forgotText}>Forgot password?</Text>
                    </Pressable>

                    <ZButton
                        label={loading ? 'Logging in…' : 'Log in'}
                        icon={ArrowRight}
                        onPress={handleLogin}
                        loading={loading}
                    />

                    <View style={styles.divider}>
                        <View style={styles.dividerLine} />
                        <Text style={styles.dividerText}>OR</Text>
                        <View style={styles.dividerLine} />
                    </View>

                    <View style={styles.socialRow}>
                        {isGoogleSignInAvailable && (
                            <Pressable style={styles.googleBtn} onPress={handleGoogleSignIn} disabled={loading}>
                                <GoogleGlyph />
                                <Text style={styles.googleText}>Google</Text>
                            </Pressable>
                        )}
                        {appleAvailable && (
                            <AppleAuthentication.AppleAuthenticationButton
                                buttonType={AppleAuthentication.AppleAuthenticationButtonType.SIGN_IN}
                                buttonStyle={AppleAuthentication.AppleAuthenticationButtonStyle.BLACK}
                                cornerRadius={14}
                                style={styles.appleBtn}
                                onPress={handleAppleSignIn}
                            />
                        )}
                    </View>
                    </AuthCard>

                    <Pressable style={styles.footer} onPress={() => router.push('/auth/signup')}>
                        <Text style={styles.footerText}>New to ZPIN? </Text>
                        <Text style={styles.footerLink}>Create account</Text>
                    </Pressable>
                </ScrollView>
            </KeyboardAvoidingView>

            <ActionModal
                visible={showErrorModal}
                title="Error"
                message={errorMessage}
                icon="x-circle"
                primaryButtonText="OK"
                onPrimaryPress={() => setShowErrorModal(false)}
                onClose={() => setShowErrorModal(false)}
            />
        </SafeAreaView>
    );
}

const styles = createStyles({
    container: { flex: 1, backgroundColor: palette.paperWarm },
    flex: { flex: 1 },
    scrollContent: { flexGrow: 1, paddingHorizontal: 16, paddingBottom: 30 },

    // Centred wordmark + tagline above the card, as the website's mobile auth view
    // does (website-customer Pages/Auth/AuthBrand.css, the max-width:860px block).
    brand: { alignItems: 'center', marginTop: 26, marginBottom: 18 },
    logo: { height: 34, width: 77, marginBottom: 8 },
    brandTag: { fontFamily: fonts.bodyBold, fontSize: 14, color: colors.textStrong },
    brandTagMuted: { fontFamily: fonts.bodyRegular, color: colors.textMuted },

    forgot: { alignSelf: 'flex-end', marginTop: 4, marginBottom: 20 },
    forgotText: { fontFamily: fonts.bodyBold, fontSize: 12, color: palette.yellow600 },
    divider: { flexDirection: 'row', alignItems: 'center', gap: 12, marginVertical: 20 },
    dividerLine: { flex: 1, height: 1, backgroundColor: colors.borderSubtle },
    dividerText: { fontFamily: fonts.monoBold, fontSize: 10, letterSpacing: 1, color: colors.textFaint },
    socialRow: { flexDirection: 'row', gap: 12 },
    googleBtn: {
        flex: 1,
        height: 52,
        borderRadius: radius.md,
        borderWidth: 2,
        borderColor: colors.borderSubtle,
        backgroundColor: colors.surfaceCard,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 9,
    },
    googleText: { fontFamily: fonts.bodyBold, fontSize: 14, color: colors.textStrong },
    appleBtn: { flex: 1, height: 52 },
    footer: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', paddingVertical: 24 },
    footerText: { fontFamily: fonts.bodyRegular, fontSize: 14, color: colors.textMuted },
    footerLink: { fontFamily: fonts.bodyBold, fontSize: 14, color: colors.textStrong },
});
