import ActionModal from '@/components/common/ActionModal';
import { Colors } from '@/constants/Colors';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
import {
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

export default function VerifyResetOTPScreen() {
    const router = useRouter();
    const params = useLocalSearchParams();
    const emailOrPhone = params.emailOrPhone as string;
    const isEmail = params.isEmail === 'true';

    const [otp, setOtp] = useState(['', '', '', '', '', '']);
    const [loading, setLoading] = useState(false);
    const [resendTimer, setResendTimer] = useState(60);
    const [canResend, setCanResend] = useState(false);
    const [showErrorModal, setShowErrorModal] = useState(false);
    const [showSuccessModal, setShowSuccessModal] = useState(false);
    const [errorMessage, setErrorMessage] = useState('');

    const inputRefs = useRef<(TextInput | null)[]>([]);

    useEffect(() => {
        // Start timer countdown
        if (resendTimer > 0) {
            const timer = setTimeout(() => {
                setResendTimer(resendTimer - 1);
            }, 1000);
            return () => clearTimeout(timer);
        } else {
            setCanResend(true);
        }
    }, [resendTimer]);

    const handleOtpChange = (index: number, value: string) => {
        if (value.length > 1) {
            value = value.charAt(value.length - 1);
        }

        const newOtp = [...otp];
        newOtp[index] = value;
        setOtp(newOtp);

        // Auto-focus next input
        if (value && index < 5) {
            inputRefs.current[index + 1]?.focus();
        }
    };

    const handleKeyPress = (index: number, key: string) => {
        if (key === 'Backspace' && !otp[index] && index > 0) {
            inputRefs.current[index - 1]?.focus();
        }
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
            const requestData = {
                mobile: isEmail ? '' : emailOrPhone,
                email: isEmail ? emailOrPhone : '',
                otp: otpString,
            };

            // TODO: Replace with actual API endpoint
            // const response = await fetch('YOUR_BASE_URL/api/v1/auth/forgetPassword/verifyOTP', {
            //     method: 'POST',
            //     headers: {
            //         'Content-Type': 'application/json',
            //     },
            //     body: JSON.stringify(requestData),
            // });
            // const data = await response.json();

            // Simulate API call
            await new Promise(resolve => setTimeout(resolve, 1000));

            // Mock reset token - in real implementation, get this from API response
            const resetToken = 'mock_reset_token_' + Date.now();

            // Show success modal
            setShowSuccessModal(true);
        } catch (error) {
            setErrorMessage('Invalid OTP. Please try again.');
            setShowErrorModal(true);
        } finally {
            setLoading(false);
        }
    };

    const handleResendOTP = async () => {
        if (!canResend) return;

        setLoading(true);
        try {
            const requestData = isEmail
                ? { email: emailOrPhone, mobile: '' }
                : { mobile: emailOrPhone, email: '' };

            // TODO: Replace with actual API endpoint
            // await fetch('YOUR_BASE_URL/api/v1/auth/forgetPassword/sendOTP', {
            //     method: 'POST',
            //     headers: {
            //         'Content-Type': 'application/json',
            //     },
            //     body: JSON.stringify(requestData),
            // });

            // Simulate API call
            await new Promise(resolve => setTimeout(resolve, 1000));

            setResendTimer(60);
            setCanResend(false);
            setOtp(['', '', '', '', '', '']);
        } catch (error) {
            setErrorMessage('Failed to resend OTP. Please try again.');
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
                    {/* Back Button */}
                    <TouchableOpacity
                        style={styles.backButton}
                        onPress={() => router.back()}
                    >
                        <Ionicons name="chevron-back" size={28} color="#000" />
                    </TouchableOpacity>

                    {/* Header */}
                    <View style={styles.header}>
                        <View style={styles.iconContainer}>
                            <Ionicons name="mail" size={48} color={Colors.light.tint} />
                        </View>
                        <Text style={styles.title}>Verify OTP</Text>
                        <Text style={styles.description}>
                            We've sent a verification code to{'\n'}
                            <Text style={styles.highlightText}>{emailOrPhone}</Text>
                        </Text>
                    </View>

                    {/* OTP Input */}
                    <View style={styles.otpContainer}>
                        {otp.map((digit, index) => (
                            <TextInput
                                key={index}
                                ref={ref => { inputRefs.current[index] = ref; }}
                                style={[
                                    styles.otpInput,
                                    digit && styles.otpInputFilled
                                ]}
                                value={digit}
                                onChangeText={(value) => handleOtpChange(index, value)}
                                onKeyPress={({ nativeEvent }) => handleKeyPress(index, nativeEvent.key)}
                                keyboardType="number-pad"
                                maxLength={1}
                                editable={!loading}
                            />
                        ))}
                    </View>

                    {/* Resend OTP */}
                    <View style={styles.resendContainer}>
                        <Text style={styles.resendText}>
                            {canResend ? "Didn't receive the code? " : `Resend OTP in ${resendTimer}s`}
                        </Text>
                        {canResend && (
                            <TouchableOpacity onPress={handleResendOTP} disabled={loading}>
                                <Text style={styles.resendLink}>Resend</Text>
                            </TouchableOpacity>
                        )}
                    </View>

                    {/* Verify Button */}
                    <TouchableOpacity
                        style={[styles.verifyButton, loading && styles.verifyButtonDisabled]}
                        onPress={handleVerifyOTP}
                        disabled={loading}
                    >
                        <Text style={styles.verifyButtonText}>
                            {loading ? 'Verifying...' : 'Verify & Continue'}
                        </Text>
                    </TouchableOpacity>
                </ScrollView>
            </KeyboardAvoidingView>

            {/* Error Modal */}
            <ActionModal
                visible={showErrorModal}
                title="Error"
                message={errorMessage}
                primaryButtonText="Try Again"
                onPrimaryPress={() => setShowErrorModal(false)}
                onClose={() => setShowErrorModal(false)}
                icon="alert-circle"
            />

            {/* Success Modal */}
            <ActionModal
                visible={showSuccessModal}
                title="Verified!"
                message="OTP verified successfully. Let's reset your password."
                primaryButtonText="Continue"
                onPrimaryPress={() => {
                    setShowSuccessModal(false);
                    const resetToken = 'mock_reset_token_' + Date.now();
                    router.push({
                        pathname: '/auth/reset-password',
                        params: { resetToken }
                    });
                }}
                onClose={() => setShowSuccessModal(false)}
                icon="check-circle"
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
    backButton: {
        marginTop: 16,
        marginBottom: 24,
        width: 40,
        height: 40,
        justifyContent: 'center',
    },
    header: {
        alignItems: 'center',
        marginBottom: 40,
    },
    iconContainer: {
        width: 100,
        height: 100,
        borderRadius: 50,
        backgroundColor: '#FFF9E6',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 24,
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
    },
    highlightText: {
        color: '#000',
        fontWeight: '600',
    },
    otpContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 24,
        gap: 8,
    },
    otpInput: {
        flex: 1,
        height: 56,
        backgroundColor: '#fff',
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#E0E0E0',
        textAlign: 'center',
        fontSize: 24,
        fontWeight: 'bold',
        color: '#000',
    },
    otpInputFilled: {
        borderColor: Colors.light.tint,
        backgroundColor: '#FFFBF0',
    },
    resendContainer: {
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 30,
    },
    resendText: {
        fontSize: 14,
        color: '#757575',
    },
    resendLink: {
        fontSize: 14,
        color: Colors.light.tint,
        fontWeight: 'bold',
    },
    verifyButton: {
        backgroundColor: Colors.light.tint,
        height: 56,
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: Colors.light.tint,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 5,
    },
    verifyButtonDisabled: {
        opacity: 0.6,
    },
    verifyButtonText: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#000',
    },
});
