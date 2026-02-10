import { Colors } from '@/constants/Colors';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
import {
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import ActionModal from '../../components/common/ActionModal';

export default function VerifyOTPScreen() {
    const router = useRouter();
    const params = useLocalSearchParams();
    const mobile = params.mobile as string || '';

    const [otp, setOtp] = useState(['', '', '', '', '', '']);
    const [loading, setLoading] = useState(false);
    const [resendTimer, setResendTimer] = useState(30);
    const [canResend, setCanResend] = useState(false);
    const [showErrorModal, setShowErrorModal] = useState(false);
    const [showSuccessModal, setShowSuccessModal] = useState(false);
    const [modalMessage, setModalMessage] = useState('');

    const inputRefs = useRef<Array<TextInput | null>>([]);

    useEffect(() => {
        // Start timer for resend
        const timer = setInterval(() => {
            setResendTimer((prev) => {
                if (prev <= 1) {
                    setCanResend(true);
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);

        return () => clearInterval(timer);
    }, []);

    const handleOtpChange = (value: string, index: number) => {
        const newOtp = [...otp];
        newOtp[index] = value;
        setOtp(newOtp);

        // Auto-focus next input
        if (value && index < 5) {
            inputRefs.current[index + 1]?.focus();
        }

        // Auto-submit when all fields filled
        if (index === 5 && value) {
            const otpCode = [...newOtp.slice(0, 5), value].join('');
            if (otpCode.length === 6) {
                handleVerify(otpCode);
            }
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
            // TODO: Implement API call
            // await authService.verifyOTP(mobile, code);

            // Simulate API call
            await new Promise(resolve => setTimeout(resolve, 1000));

            setModalMessage('Account verified successfully!');
            setShowSuccessModal(true);
        } catch (error) {
            setModalMessage('Invalid OTP. Please try again.');
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
            // TODO: Implement API call
            // await authService.sendOTP(mobile);

            // Simulate API call
            await new Promise(resolve => setTimeout(resolve, 500));

            setResendTimer(30);
            setCanResend(false);
            setModalMessage('A new OTP has been sent to your mobile');
            setShowSuccessModal(true);
        } catch (error) {
            setModalMessage('Failed to resend OTP. Please try again.');
            setShowErrorModal(true);
        }
    };

    return (
        <SafeAreaView style={styles.container} edges={['top']}>
            <View style={styles.content}>
                {/* Header */}
                <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                    <Ionicons name="chevron-back" size={28} color="#000" />
                </TouchableOpacity>

                <View style={styles.header}>
                    <View style={styles.iconContainer}>
                        <Ionicons name="shield-checkmark" size={48} color={Colors.light.tint} />
                    </View>
                    <Text style={styles.title}>Verify OTP</Text>
                    <Text style={styles.subtitle}>
                        Enter the 6-digit code sent to{'\n'}
                        <Text style={styles.mobileNumber}>+91 {mobile}</Text>
                    </Text>
                </View>

                {/* OTP Inputs */}
                <View style={styles.otpContainer}>
                    {otp.map((digit, index) => (
                        <TextInput
                            key={index}
                            ref={(ref) => { inputRefs.current[index] = ref; }}
                            style={[
                                styles.otpInput,
                                digit && styles.otpInputFilled
                            ]}
                            value={digit}
                            onChangeText={(value) => handleOtpChange(value.replace(/[^0-9]/g, ''), index)}
                            onKeyPress={(e) => handleKeyPress(e, index)}
                            keyboardType="number-pad"
                            maxLength={1}
                            selectTextOnFocus
                            autoFocus={index === 0}
                            editable={!loading}
                        />
                    ))}
                </View>

                {/* Resend OTP */}
                <View style={styles.resendContainer}>
                    {canResend ? (
                        <TouchableOpacity onPress={handleResendOTP}>
                            <Text style={styles.resendText}>
                                Didn't receive OTP? <Text style={styles.resendLink}>Resend</Text>
                            </Text>
                        </TouchableOpacity>
                    ) : (
                        <Text style={styles.timerText}>
                            Resend OTP in {resendTimer}s
                        </Text>
                    )}
                </View>

                {/* Verify Button */}
                <TouchableOpacity
                    style={[styles.verifyButton, loading && styles.verifyButtonDisabled]}
                    onPress={() => handleVerify()}
                    disabled={loading}
                >
                    <Text style={styles.verifyButtonText}>
                        {loading ? 'Verifying...' : 'Verify OTP'}
                    </Text>
                </TouchableOpacity>

                {/* Change Number */}
                <TouchableOpacity
                    style={styles.changeNumberButton}
                    onPress={() => router.back()}
                >
                    <Text style={styles.changeNumberText}>Change Mobile Number</Text>
                </TouchableOpacity>
            </View>

            {/* Error Modal */}
            <ActionModal
                visible={showErrorModal}
                title="Error"
                message={modalMessage}
                icon="x-circle"
                primaryButtonText="OK"
                onPrimaryPress={() => setShowErrorModal(false)}
                onClose={() => setShowErrorModal(false)}
            />

            {/* Success Modal */}
            <ActionModal
                visible={showSuccessModal}
                title="Success"
                message={modalMessage}
                icon="check-circle"
                primaryButtonText="OK"
                onPrimaryPress={() => {
                    setShowSuccessModal(false);
                    if (modalMessage.includes('verified')) {
                        router.replace('/auth/login');
                    }
                }}
                onClose={() => {
                    setShowSuccessModal(false);
                    if (modalMessage.includes('verified')) {
                        router.replace('/auth/login');
                    }
                }}
            />
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#FAFAFA',
    },
    content: {
        flex: 1,
        paddingHorizontal: 24,
    },
    backButton: {
        padding: 8,
        alignSelf: 'flex-start',
        marginTop: 8,
    },
    header: {
        alignItems: 'center',
        marginTop: 40,
        marginBottom: 40,
    },
    iconContainer: {
        width: 80,
        height: 80,
        borderRadius: 40,
        backgroundColor: '#FFF8E1',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 20,
    },
    title: {
        fontSize: 28,
        fontWeight: 'bold',
        color: '#000',
        marginBottom: 12,
    },
    subtitle: {
        fontSize: 15,
        color: '#757575',
        textAlign: 'center',
        lineHeight: 22,
    },
    mobileNumber: {
        fontWeight: 'bold',
        color: '#000',
    },
    otpContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 30,
        paddingHorizontal: 4,
    },
    otpInput: {
        width: 50,
        height: 56,
        borderWidth: 2,
        borderColor: '#E0E0E0',
        borderRadius: 12,
        textAlign: 'center',
        fontSize: 20,
        fontWeight: 'bold',
        color: '#000',
        backgroundColor: '#fff',
    },
    otpInputFilled: {
        borderColor: Colors.light.tint,
        backgroundColor: '#FFF8E1',
    },
    resendContainer: {
        alignItems: 'center',
        marginBottom: 30,
    },
    resendText: {
        fontSize: 14,
        color: '#757575',
    },
    resendLink: {
        color: Colors.light.tint,
        fontWeight: 'bold',
    },
    timerText: {
        fontSize: 14,
        color: '#9E9E9E',
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
        marginBottom: 20,
    },
    verifyButtonDisabled: {
        opacity: 0.6,
    },
    verifyButtonText: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#000',
    },
    changeNumberButton: {
        alignItems: 'center',
        padding: 12,
    },
    changeNumberText: {
        fontSize: 14,
        color: '#757575',
        textDecorationLine: 'underline',
    },
});
