import { Colors } from '@/constants/Colors';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import {
    Alert,
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

export default function ForgotPasswordScreen() {
    const router = useRouter();
    const [emailOrPhone, setEmailOrPhone] = useState('');
    const [loading, setLoading] = useState(false);

    const validateInput = () => {
        if (!emailOrPhone.trim()) {
            Alert.alert('Error', 'Please enter your email or phone number');
            return false;
        }

        // Check if it's a valid email or phone number
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        const phoneRegex = /^[0-9]{10}$/;

        if (!emailRegex.test(emailOrPhone) && !phoneRegex.test(emailOrPhone)) {
            Alert.alert('Error', 'Please enter a valid email address or 10-digit phone number');
            return false;
        }

        return true;
    };

    const handleSendResetLink = async () => {
        if (!validateInput()) return;

        setLoading(true);
        try {
            // Determine if input is email or phone
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            const isEmail = emailRegex.test(emailOrPhone);

            const requestData = isEmail
                ? { email: emailOrPhone, mobile: '' }
                : { mobile: emailOrPhone, email: '' };

            // TODO: Replace with actual API endpoint
            // const response = await fetch('YOUR_BASE_URL/api/v1/auth/forgetPassword/sendOTP', {
            //     method: 'POST',
            //     headers: {
            //         'Content-Type': 'application/json',
            //     },
            //     body: JSON.stringify(requestData),
            // });

            // Simulate API call
            await new Promise(resolve => setTimeout(resolve, 1000));

            // Navigate to OTP verification screen
            router.push({
                pathname: '/auth/verify-reset-otp',
                params: {
                    emailOrPhone: emailOrPhone,
                    isEmail: isEmail ? 'true' : 'false'
                }
            });

            Alert.alert('Success', 'OTP has been sent to your ' + (isEmail ? 'email' : 'phone number'));
        } catch (error) {
            Alert.alert('Error', 'Failed to send OTP. Please try again.');
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
                    {/* Back Button */}
                    <TouchableOpacity
                        style={styles.backButton}
                        onPress={() => router.back()}
                    >
                        <Ionicons name="chevron-back" size={28} color="#000" />
                    </TouchableOpacity>

                    {/* Icon */}
                    <View style={styles.iconContainer}>
                        <View style={styles.iconCircle}>
                            <View style={styles.iconInnerCircle}>
                                <Ionicons name="lock-closed" size={48} color={Colors.light.tint} />
                            </View>
                            <View style={styles.arrowContainer}>
                                <Ionicons name="arrow-undo" size={32} color={Colors.light.tint} />
                            </View>
                        </View>
                    </View>

                    {/* Title and Description */}
                    <View style={styles.header}>
                        <Text style={styles.title}>Forgot Password?</Text>
                        <Text style={styles.description}>
                            Enter your email or phone number to reset your password and get back to shopping.
                        </Text>
                    </View>

                    {/* Form */}
                    <View style={styles.form}>
                        {/* Email/Phone Input */}
                        <View style={styles.inputContainer}>
                            <Text style={styles.label}>Email or Phone Number</Text>
                            <View style={styles.inputWrapper}>
                                <TextInput
                                    style={styles.input}
                                    placeholder="e.g. name@email.com"
                                    placeholderTextColor="#BDBDBD"
                                    value={emailOrPhone}
                                    onChangeText={setEmailOrPhone}
                                    autoCapitalize="none"
                                    keyboardType="email-address"
                                    editable={!loading}
                                />
                                <Ionicons name="at" size={24} color="#9E9E9E" style={styles.inputIcon} />
                            </View>
                        </View>

                        {/* Send Reset Link Button */}
                        <TouchableOpacity
                            style={[styles.resetButton, loading && styles.resetButtonDisabled]}
                            onPress={handleSendResetLink}
                            disabled={loading}
                        >
                            <Text style={styles.resetButtonText}>
                                {loading ? 'Sending...' : 'Send Reset Link'}
                            </Text>
                            <Ionicons name="arrow-forward" size={20} color="#000" />
                        </TouchableOpacity>

                        {/* Login Link */}
                        <View style={styles.loginContainer}>
                            <Text style={styles.loginText}>Remember your password? </Text>
                            <TouchableOpacity onPress={() => router.back()}>
                                <Text style={styles.loginLink}>Login</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </ScrollView>
            </KeyboardAvoidingView>
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
    backButton: {
        marginTop: 16,
        marginBottom: 24,
        width: 40,
        height: 40,
        justifyContent: 'center',
    },
    iconContainer: {
        alignItems: 'center',
        marginBottom: 32,
    },
    iconCircle: {
        width: 200,
        height: 200,
        borderRadius: 100,
        backgroundColor: '#FFF9E6',
        borderWidth: 2,
        borderStyle: 'dashed',
        borderColor: '#FFE794',
        justifyContent: 'center',
        alignItems: 'center',
        position: 'relative',
    },
    iconInnerCircle: {
        width: 100,
        height: 100,
        borderRadius: 16,
        backgroundColor: '#fff',
        justifyContent: 'center',
        alignItems: 'center',
    },
    arrowContainer: {
        position: 'absolute',
        top: 20,
        left: 20,
    },
    header: {
        alignItems: 'center',
        marginBottom: 40,
    },
    title: {
        fontSize: 28,
        fontWeight: 'bold',
        color: '#000',
        marginBottom: 12,
    },
    description: {
        fontSize: 15,
        color: '#757575',
        textAlign: 'center',
        lineHeight: 22,
        paddingHorizontal: 16,
    },
    form: {
        flex: 1,
    },
    inputContainer: {
        marginBottom: 24,
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
        height: 56,
        borderWidth: 1,
        borderColor: '#E0E0E0',
    },
    input: {
        flex: 1,
        fontSize: 16,
        color: '#000',
    },
    inputIcon: {
        marginLeft: 8,
    },
    resetButton: {
        backgroundColor: Colors.light.tint,
        height: 56,
        borderRadius: 12,
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: Colors.light.tint,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 5,
        gap: 8,
    },
    resetButtonDisabled: {
        opacity: 0.6,
    },
    resetButtonText: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#000',
    },
    loginContainer: {
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        marginTop: 24,
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
