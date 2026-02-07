import { Colors } from '@/constants/Colors';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import {
    Alert,
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

    const validateInputs = () => {
        if (!name.trim()) {
            Alert.alert('Error', 'Please enter your name');
            return false;
        }
        if (!email.trim()) {
            Alert.alert('Error', 'Please enter your email');
            return false;
        }
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            Alert.alert('Error', 'Please enter a valid email address');
            return false;
        }
        if (!mobile.trim()) {
            Alert.alert('Error', 'Please enter your mobile number');
            return false;
        }
        if (!/^\d{10}$/.test(mobile)) {
            Alert.alert('Error', 'Please enter a valid 10-digit mobile number');
            return false;
        }
        if (!password.trim()) {
            Alert.alert('Error', 'Please enter a password');
            return false;
        }
        if (password.length < 6) {
            Alert.alert('Error', 'Password must be at least 6 characters');
            return false;
        }
        if (password !== confirmPassword) {
            Alert.alert('Error', 'Passwords do not match');
            return false;
        }
        if (!agreedToTerms) {
            Alert.alert('Error', 'Please agree to the Terms and Conditions');
            return false;
        }
        return true;
    };

    const handleSignup = async () => {
        if (!validateInputs()) return;

        setLoading(true);
        try {
            // TODO: Implement API call
            // const response = await authService.signup({ name, email, mobile, password });

            // Simulate API call
            await new Promise(resolve => setTimeout(resolve, 1000));

            // Navigate to OTP verification
            router.push({ pathname: '/auth/verify-otp', params: { mobile } });
        } catch (error) {
            Alert.alert('Signup Failed', 'An error occurred. Please try again.');
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
                                source={require('../../assets/images/icon.png')}
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
                        <TouchableOpacity
                            style={styles.checkboxContainer}
                            onPress={() => setAgreedToTerms(!agreedToTerms)}
                            disabled={loading}
                        >
                            <View style={[styles.checkbox, agreedToTerms && styles.checkboxChecked]}>
                                {agreedToTerms && <Ionicons name="checkmark" size={16} color="#000" />}
                            </View>
                            <Text style={styles.checkboxText}>
                                I agree to the{' '}
                                <Text style={styles.linkText}>Terms and Conditions</Text>
                                {' '}and{' '}
                                <Text style={styles.linkText}>Privacy Policy</Text>
                            </Text>
                        </TouchableOpacity>

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
        width: 80,
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
    checkbox: {
        width: 20,
        height: 20,
        borderRadius: 4,
        borderWidth: 2,
        borderColor: '#E0E0E0',
        marginRight: 12,
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
