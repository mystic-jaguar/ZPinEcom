import { Colors } from '@/constants/Colors';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import {
    Image,
    KeyboardAvoidingView,
    Platform,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import ActionModal from '../../components/common/ActionModal';
import LegalDocModal, { LegalDocType } from '../../components/common/LegalDocModal';
import { authService, googleAuthService } from '../../services/auth';

export default function SignupScreen() {
    const router = useRouter();
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [mobile, setMobile] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const [agreedToTerms, setAgreedToTerms] = useState(false);
    const [loading, setLoading] = useState(false);
    const [showErrorModal, setShowErrorModal] = useState(false);
    const [errorMessage, setErrorMessage] = useState('');
    const [legalModalVisible, setLegalModalVisible] = useState(false);
    const [legalDocType, setLegalDocType] = useState<LegalDocType>('terms');

    const openLegalDoc = (type: LegalDocType) => {
        setLegalDocType(type);
        setLegalModalVisible(true);
    };

    const validateInputs = () => {
        if (!name.trim()) {
            setErrorMessage('Please enter your name');
            setShowErrorModal(true);
            return false;
        }
        if (!email.trim()) {
            setErrorMessage('Please enter your email');
            setShowErrorModal(true);
            return false;
        }
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            setErrorMessage('Please enter a valid email address');
            setShowErrorModal(true);
            return false;
        }
        if (!mobile.trim()) {
            setErrorMessage('Please enter your mobile number');
            setShowErrorModal(true);
            return false;
        }
        if (!/^\d{10}$/.test(mobile)) {
            setErrorMessage('Please enter a valid 10-digit mobile number');
            setShowErrorModal(true);
            return false;
        }
        if (!password.trim()) {
            setErrorMessage('Please enter a password');
            setShowErrorModal(true);
            return false;
        }
        if (password.length < 8 || !/[a-zA-Z]/.test(password) || !/[0-9]/.test(password)) {
            setErrorMessage('Password must be at least 8 characters and contain at least one letter and one number');
            setShowErrorModal(true);
            return false;
        }
        if (password !== confirmPassword) {
            setErrorMessage('Passwords do not match');
            setShowErrorModal(true);
            return false;
        }
        if (!agreedToTerms) {
            setErrorMessage('Please agree to the Terms and Conditions');
            setShowErrorModal(true);
            return false;
        }
        return true;
    };

    const handleGoogleSignUp = async () => {
        setLoading(true);
        try {
            const { idToken } = await googleAuthService.signIn();
            await googleAuthService.authenticateWithBackend(idToken);
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
            const response = await authService.signup({
                name,
                email,
                mobile,
                password
            });

            // Backend returns tokens on signup — store them and go to OTP verification
            if (response.accessToken) {
                const { tokenManager, userDataManager } = await import('../../services/api');
                await tokenManager.setTokens(response.accessToken, response.refreshToken);
                if (response.user) await userDataManager.setUserData(response.user);
            }

            // Navigate to OTP verification
            router.push({ pathname: '/auth/verify-otp', params: { mobile } });
        } catch (error: any) {
            setErrorMessage(error.message || 'An error occurred. Please try again.');
            setShowErrorModal(true);
        } finally {
            setLoading(false);
        }
    };

    return (
        <SafeAreaView style={styles.container} edges={['top']}>
            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                style={styles.keyboardView}
            >
                <ScrollView
                    contentContainerStyle={styles.scrollContent}
                    keyboardShouldPersistTaps="handled"
                    showsVerticalScrollIndicator={false}
                >
                    {/* Header */}
                    <View style={styles.header}>
                        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                            <Ionicons name="chevron-back" size={28} color="#000" />
                        </TouchableOpacity>
                        <View style={styles.logoContainer}>
                            <Image
                                source={require('../../assets/images/logo_display.png')}
                                style={styles.logoImage}
                                resizeMode="contain"
                            />
                        </View>
                        <Text style={styles.title}>Create Account</Text>
                        <Text style={styles.subtitle}>Sign up to get started</Text>
                    </View>

                    {/* Form */}
                    <View style={styles.form}>
                        {/* Name Input */}
                        <View style={styles.inputContainer}>
                            <Text style={styles.label}>Full Name</Text>
                            <View style={styles.inputWrapper}>
                                <Ionicons name="person-outline" size={20} color="#9E9E9E" style={styles.inputIcon} />
                                <TextInput
                                    style={styles.input}
                                    placeholder="Enter your full name"
                                    placeholderTextColor="#BDBDBD"
                                    value={name}
                                    onChangeText={setName}
                                    editable={!loading}
                                />
                            </View>
                        </View>

                        {/* Email Input */}
                        <View style={styles.inputContainer}>
                            <Text style={styles.label}>Email Address</Text>
                            <View style={styles.inputWrapper}>
                                <Ionicons name="mail-outline" size={20} color="#9E9E9E" style={styles.inputIcon} />
                                <TextInput
                                    style={styles.input}
                                    placeholder="Enter your email"
                                    placeholderTextColor="#BDBDBD"
                                    value={email}
                                    onChangeText={setEmail}
                                    autoCapitalize="none"
                                    keyboardType="email-address"
                                    editable={!loading}
                                />
                            </View>
                        </View>

                        {/* Mobile Input */}
                        <View style={styles.inputContainer}>
                            <Text style={styles.label}>Mobile Number</Text>
                            <View style={styles.inputWrapper}>
                                <Ionicons name="call-outline" size={20} color="#9E9E9E" style={styles.inputIcon} />
                                <Text style={styles.countryCode}>+91</Text>
                                <TextInput
                                    style={styles.input}
                                    placeholder="Enter 10-digit mobile number"
                                    placeholderTextColor="#BDBDBD"
                                    value={mobile}
                                    onChangeText={(text) => setMobile(text.replace(/[^0-9]/g, ''))}
                                    keyboardType="phone-pad"
                                    maxLength={10}
                                    editable={!loading}
                                />
                            </View>
                        </View>

                        {/* Password Input */}
                        <View style={styles.inputContainer}>
                            <Text style={styles.label}>Password</Text>
                            <View style={styles.inputWrapper}>
                                <Ionicons name="lock-closed-outline" size={20} color="#9E9E9E" style={styles.inputIcon} />
                                <TextInput
                                    style={styles.input}
                                    placeholder="Create a password"
                                    placeholderTextColor="#BDBDBD"
                                    value={password}
                                    onChangeText={setPassword}
                                    secureTextEntry={!showPassword}
                                    autoCapitalize="none"
                                    editable={!loading}
                                />
                                <TouchableOpacity
                                    onPress={() => setShowPassword(!showPassword)}
                                    style={styles.eyeIcon}
                                >
                                    <Ionicons
                                        name={showPassword ? 'eye-outline' : 'eye-off-outline'}
                                        size={20}
                                        color="#9E9E9E"
                                    />
                                </TouchableOpacity>
                            </View>
                        </View>

                        {/* Confirm Password Input */}
                        <View style={styles.inputContainer}>
                            <Text style={styles.label}>Confirm Password</Text>
                            <View style={styles.inputWrapper}>
                                <Ionicons name="lock-closed-outline" size={20} color="#9E9E9E" style={styles.inputIcon} />
                                <TextInput
                                    style={styles.input}
                                    placeholder="Re-enter your password"
                                    placeholderTextColor="#BDBDBD"
                                    value={confirmPassword}
                                    onChangeText={setConfirmPassword}
                                    secureTextEntry={!showConfirmPassword}
                                    autoCapitalize="none"
                                    editable={!loading}
                                />
                                <TouchableOpacity
                                    onPress={() => setShowConfirmPassword(!showConfirmPassword)}
                                    style={styles.eyeIcon}
                                >
                                    <Ionicons
                                        name={showConfirmPassword ? 'eye-outline' : 'eye-off-outline'}
                                        size={20}
                                        color="#9E9E9E"
                                    />
                                </TouchableOpacity>
                            </View>
                        </View>

                        {/* Terms Checkbox */}
                        <View style={styles.checkboxContainer}>
                            <TouchableOpacity
                                onPress={() => setAgreedToTerms(!agreedToTerms)}
                                disabled={loading}
                                style={styles.checkboxTouchable}
                            >
                                <View style={[styles.checkbox, agreedToTerms && styles.checkboxChecked]}>
                                    {agreedToTerms && <Ionicons name="checkmark" size={16} color="#000" />}
                                </View>
                            </TouchableOpacity>
                            <Text style={styles.checkboxText}>
                                I agree to the{' '}
                                <Text style={styles.linkText} onPress={() => openLegalDoc('terms')}>Terms and Conditions</Text>
                                {' '}and{' '}
                                <Text style={styles.linkText} onPress={() => openLegalDoc('privacy')}>Privacy Policy</Text>
                            </Text>
                        </View>

                        {/* Signup Button */}
                        <TouchableOpacity
                            style={[styles.signupButton, loading && styles.signupButtonDisabled]}
                            onPress={handleSignup}
                            disabled={loading}
                        >
                            <Text style={styles.signupButtonText}>
                                {loading ? 'Creating Account...' : 'Sign Up'}
                            </Text>
                        </TouchableOpacity>

                        {/* Google Sign Up */}
                        <TouchableOpacity
                            style={styles.googleButton}
                            onPress={handleGoogleSignUp}
                            disabled={loading}
                        >
                            <Image
                                source={{ uri: 'https://www.google.com/favicon.ico' }}
                                style={styles.googleIcon}
                            />
                            <Text style={styles.googleButtonText}>Continue with Google</Text>
                        </TouchableOpacity>

                        {/* Login Link */}
                        <View style={styles.loginContainer}>
                            <Text style={styles.loginText}>Already have an account? </Text>
                            <TouchableOpacity onPress={() => router.back()}>
                                <Text style={styles.loginLink}>Login</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </ScrollView>
            </KeyboardAvoidingView>

            {/* Error Modal */}
            <ActionModal
                visible={showErrorModal}
                title="Error"
                message={errorMessage}
                icon="x-circle"
                primaryButtonText="OK"
                onPrimaryPress={() => setShowErrorModal(false)}
                onClose={() => setShowErrorModal(false)}
            />

            {/* Legal Document Modal */}
            <LegalDocModal
                visible={legalModalVisible}
                docType={legalDocType}
                onClose={() => setLegalModalVisible(false)}
            />
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#FAFAFA',
    },
    keyboardView: {
        flex: 1,
    },
    scrollContent: {
        flexGrow: 1,
        paddingHorizontal: 24,
        paddingBottom: 24,
    },
    header: {
        alignItems: 'center',
        marginTop: 20,
        marginBottom: 30,
    },
    backButton: {
        position: 'absolute',
        left: 0,
        top: 0,
        padding: 8,
    },
    logoContainer: {
        marginBottom: 16,
    },
    logoImage: {
        width: 160,
        height: 80,
    },
    title: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#000',
        marginBottom: 8,
    },
    subtitle: {
        fontSize: 14,
        color: '#757575',
    },
    form: {
        flex: 1,
    },
    inputContainer: {
        marginBottom: 16,
    },
    label: {
        fontSize: 14,
        fontWeight: '600',
        color: '#424242',
        marginBottom: 8,
    },
    inputWrapper: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#fff',
        borderRadius: 12,
        paddingHorizontal: 16,
        height: 52,
        borderWidth: 1,
        borderColor: '#E0E0E0',
    },
    inputIcon: {
        marginRight: 12,
    },
    countryCode: {
        fontSize: 16,
        color: '#000',
        fontWeight: '600',
        marginRight: 8,
    },
    input: {
        flex: 1,
        fontSize: 16,
        color: '#000',
    },
    eyeIcon: {
        padding: 4,
    },
    checkboxContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 24,
        marginTop: 8,
    },
    checkboxTouchable: {
        marginRight: 12,
    },
    checkbox: {
        width: 20,
        height: 20,
        borderRadius: 4,
        borderWidth: 2,
        borderColor: '#E0E0E0',
        justifyContent: 'center',
        alignItems: 'center',
    },
    checkboxChecked: {
        backgroundColor: Colors.light.tint,
        borderColor: Colors.light.tint,
    },
    checkboxText: {
        flex: 1,
        fontSize: 13,
        color: '#757575',
        lineHeight: 18,
    },
    linkText: {
        color: Colors.light.tint,
        fontWeight: '600',
    },
    signupButton: {
        backgroundColor: Colors.light.tint,
        height: 52,
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: Colors.light.tint,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 5,
        marginBottom: 20,
    },
    signupButtonDisabled: {
        opacity: 0.6,
    },
    signupButtonText: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#000',
    },
    loginContainer: {
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
    },
    googleButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#fff',
        borderWidth: 1,
        borderColor: '#E0E0E0',
        borderRadius: 12,
        height: 52,
        marginBottom: 20,
        gap: 12,
    },
    googleIcon: {
        width: 20,
        height: 20,
    },
    googleButtonText: {
        fontSize: 16,
        fontWeight: '600',
        color: '#000',
    },
    loginText: {
        fontSize: 14,
        color: '#757575',
    },
    loginLink: {
        fontSize: 14,
        color: Colors.light.tint,
        fontWeight: 'bold',
    },
});
