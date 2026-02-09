import { Colors } from '@/constants/Colors';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
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

export default function ResetPasswordScreen() {
    const router = useRouter();
    const params = useLocalSearchParams();
    const resetToken = params.resetToken as string;

    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [showNewPassword, setShowNewPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const [loading, setLoading] = useState(false);

    const getPasswordStrength = (password: string) => {
        if (password.length === 0) return { text: '', color: '#E0E0E0', widthPercent: 0 };
        if (password.length < 6) return { text: 'Weak', color: '#FF5252', widthPercent: 33 };
        if (password.length < 10) return { text: 'Medium', color: '#FFA726', widthPercent: 66 };
        return { text: 'Strong', color: '#66BB6A', widthPercent: 100 };
    };

    const validatePasswords = () => {
        if (!newPassword.trim()) {
            Alert.alert('Error', 'Please enter a new password');
            return false;
        }

        if (newPassword.length < 6) {
            Alert.alert('Error', 'Password must be at least 6 characters long');
            return false;
        }

        if (!confirmPassword.trim()) {
            Alert.alert('Error', 'Please confirm your password');
            return false;
        }

        if (newPassword !== confirmPassword) {
            Alert.alert('Error', 'Passwords do not match');
            return false;
        }

        return true;
    };

    const handleResetPassword = async () => {
        if (!validatePasswords()) return;

        setLoading(true);
        try {
            const requestData = {
                resetToken: resetToken,
                newPassword: newPassword,
            };

            // TODO: Replace with actual API endpoint
            // const response = await fetch('YOUR_BASE_URL/api/v1/auth/forgetPassword/resetPassword', {
            //     method: 'POST',
            //     headers: {
            //         'Content-Type': 'application/json',
            //     },
            //     body: JSON.stringify(requestData),
            // });
            // const data = await response.json();

            // Simulate API call
            await new Promise(resolve => setTimeout(resolve, 1000));

            Alert.alert(
                'Success',
                'Your password has been reset successfully',
                [
                    {
                        text: 'OK',
                        onPress: () => {
                            // Navigate back to login screen
                            router.replace('/auth/login');
                        }
                    }
                ]
            );
        } catch (error) {
            Alert.alert('Error', 'Failed to reset password. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    const passwordStrength = getPasswordStrength(newPassword);

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
                            <Ionicons name="lock-closed" size={48} color={Colors.light.tint} />
                        </View>
                        <Text style={styles.title}>Reset Password</Text>
                        <Text style={styles.description}>
                            Create a new strong password for your account
                        </Text>
                    </View>

                    {/* Form */}
                    <View style={styles.form}>
                        {/* New Password Input */}
                        <View style={styles.inputContainer}>
                            <Text style={styles.label}>New Password</Text>
                            <View style={styles.inputWrapper}>
                                <Ionicons name="lock-closed-outline" size={20} color="#9E9E9E" style={styles.inputIcon} />
                                <TextInput
                                    style={styles.input}
                                    placeholder="Enter new password"
                                    placeholderTextColor="#BDBDBD"
                                    value={newPassword}
                                    onChangeText={setNewPassword}
                                    secureTextEntry={!showNewPassword}
                                    autoCapitalize="none"
                                    editable={!loading}
                                />
                                <TouchableOpacity
                                    onPress={() => setShowNewPassword(!showNewPassword)}
                                    style={styles.eyeIcon}
                                >
                                    <Ionicons
                                        name={showNewPassword ? 'eye-outline' : 'eye-off-outline'}
                                        size={20}
                                        color="#9E9E9E"
                                    />
                                </TouchableOpacity>
                            </View>

                            {/* Password Strength Indicator */}
                            {newPassword.length > 0 && (
                                <View style={styles.strengthContainer}>
                                    <View style={styles.strengthBar}>
                                        <View
                                            style={[
                                                styles.strengthFill,
                                                { width: `${passwordStrength.widthPercent}%`, backgroundColor: passwordStrength.color }
                                            ]}
                                        />
                                    </View>
                                    <Text style={[styles.strengthText, { color: passwordStrength.color }]}>
                                        {passwordStrength.text}
                                    </Text>
                                </View>
                            )}
                        </View>

                        {/* Confirm Password Input */}
                        <View style={styles.inputContainer}>
                            <Text style={styles.label}>Confirm Password</Text>
                            <View style={styles.inputWrapper}>
                                <Ionicons name="lock-closed-outline" size={20} color="#9E9E9E" style={styles.inputIcon} />
                                <TextInput
                                    style={styles.input}
                                    placeholder="Re-enter new password"
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

                            {/* Password Match Indicator */}
                            {confirmPassword.length > 0 && (
                                <View style={styles.matchContainer}>
                                    <Ionicons
                                        name={newPassword === confirmPassword ? 'checkmark-circle' : 'close-circle'}
                                        size={16}
                                        color={newPassword === confirmPassword ? '#66BB6A' : '#FF5252'}
                                    />
                                    <Text
                                        style={[
                                            styles.matchText,
                                            { color: newPassword === confirmPassword ? '#66BB6A' : '#FF5252' }
                                        ]}
                                    >
                                        {newPassword === confirmPassword ? 'Passwords match' : 'Passwords do not match'}
                                    </Text>
                                </View>
                            )}
                        </View>

                        {/* Reset Password Button */}
                        <TouchableOpacity
                            style={[styles.resetButton, loading && styles.resetButtonDisabled]}
                            onPress={handleResetPassword}
                            disabled={loading}
                        >
                            <Text style={styles.resetButtonText}>
                                {loading ? 'Resetting...' : 'Reset Password'}
                            </Text>
                        </TouchableOpacity>
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
    inputIcon: {
        marginRight: 12,
    },
    input: {
        flex: 1,
        fontSize: 16,
        color: '#000',
    },
    eyeIcon: {
        padding: 4,
    },
    strengthContainer: {
        marginTop: 8,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    strengthBar: {
        flex: 1,
        height: 4,
        backgroundColor: '#E0E0E0',
        borderRadius: 2,
        overflow: 'hidden',
    },
    strengthFill: {
        height: '100%',
        borderRadius: 2,
    },
    strengthText: {
        fontSize: 12,
        fontWeight: '600',
        width: 60,
    },
    matchContainer: {
        marginTop: 8,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    matchText: {
        fontSize: 12,
        fontWeight: '600',
    },
    resetButton: {
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
        marginTop: 16,
    },
    resetButtonDisabled: {
        opacity: 0.6,
    },
    resetButtonText: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#000',
    },
});
