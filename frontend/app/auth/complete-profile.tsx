import { Colors } from '@/constants/Colors';
import { Feather, Ionicons } from '@expo/vector-icons';
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
import { useUser } from '../../context/UserContext';

const GENDER_OPTIONS = ['Male', 'Female', 'Do not wish to specify'];

export default function CompleteProfileScreen() {
    const router = useRouter();
    const { user, updateUser } = useUser();

    const [dob, setDob] = useState(user?.dob || '');
    const [gender, setGender] = useState(user?.gender || '');
    const [showGenderPicker, setShowGenderPicker] = useState(false);
    const [loading, setLoading] = useState(false);
    const [showErrorModal, setShowErrorModal] = useState(false);
    const [errorMessage, setErrorMessage] = useState('');

    const formatDobInput = (text: string) => {
        const cleaned = text.replace(/[^0-9]/g, '');
        let formatted = cleaned;
        if (cleaned.length > 4) {
            formatted = cleaned.slice(0, 4) + '-' + cleaned.slice(4);
        }
        if (cleaned.length > 6) {
            formatted = formatted.slice(0, 7) + '-' + cleaned.slice(6);
        }
        if (formatted.length > 10) formatted = formatted.slice(0, 10);
        setDob(formatted);
    };

    const validateDob = (value: string): boolean => {
        if (!value) return true; // Optional field
        const regex = /^\d{4}-\d{2}-\d{2}$/;
        if (!regex.test(value)) return false;
        const date = new Date(value);
        if (isNaN(date.getTime())) return false;
        // Must be in the past and not more than 120 years ago
        const now = new Date();
        const minDate = new Date(now.getFullYear() - 120, 0, 1);
        return date < now && date > minDate;
    };

    const handleContinue = async () => {
        if (dob && !validateDob(dob)) {
            setErrorMessage('Please enter a valid date of birth (YYYY-MM-DD)');
            setShowErrorModal(true);
            return;
        }

        if (!dob && !gender) {
            // Nothing to save, just skip
            router.replace('/(tabs)');
            return;
        }

        setLoading(true);
        try {
            const updates: Record<string, any> = {};
            if (dob) updates.dob = dob;
            if (gender) updates.gender = gender;

            await updateUser(updates as any);
            router.replace('/(tabs)');
        } catch (error) {
            console.error('Failed to update profile:', error);
            setErrorMessage('Failed to save profile. Please try again.');
            setShowErrorModal(true);
        } finally {
            setLoading(false);
        }
    };

    const handleSkip = () => {
        router.replace('/(tabs)');
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
                        <View style={styles.logoContainer}>
                            <Image
                                source={require('../../assets/images/icon_backup.png')}
                                style={styles.logoImage}
                                resizeMode="contain"
                            />
                        </View>
                        <Text style={styles.title}>Complete Your Profile</Text>
                        <Text style={styles.subtitle}>
                            Just a few more details to personalize your experience
                        </Text>
                    </View>

                    {/* Form */}
                    <View style={styles.form}>
                        {/* Date of Birth */}
                        <View style={styles.inputContainer}>
                            <Text style={styles.label}>Date of Birth</Text>
                            <View style={styles.inputWrapper}>
                                <Ionicons name="calendar-outline" size={20} color="#9E9E9E" style={styles.inputIcon} />
                                <TextInput
                                    style={styles.input}
                                    placeholder="YYYY-MM-DD"
                                    placeholderTextColor="#BDBDBD"
                                    value={dob}
                                    onChangeText={formatDobInput}
                                    keyboardType="numeric"
                                    maxLength={10}
                                    editable={!loading}
                                />
                            </View>
                        </View>

                        {/* Gender */}
                        <View style={styles.inputContainer}>
                            <Text style={styles.label}>Gender</Text>
                            <TouchableOpacity
                                style={styles.inputWrapper}
                                onPress={() => setShowGenderPicker(!showGenderPicker)}
                                disabled={loading}
                            >
                                <Ionicons name="person-outline" size={20} color="#9E9E9E" style={styles.inputIcon} />
                                <Text style={[styles.input, !gender && styles.placeholderText]}>
                                    {gender || 'Select your gender'}
                                </Text>
                                <Feather
                                    name={showGenderPicker ? 'chevron-up' : 'chevron-down'}
                                    size={20}
                                    color="#9E9E9E"
                                />
                            </TouchableOpacity>
                            {showGenderPicker && (
                                <View style={styles.dropdownList}>
                                    {GENDER_OPTIONS.map((option) => (
                                        <TouchableOpacity
                                            key={option}
                                            style={styles.dropdownOption}
                                            onPress={() => {
                                                setGender(option);
                                                setShowGenderPicker(false);
                                            }}
                                        >
                                            <Text style={styles.dropdownOptionText}>{option}</Text>
                                            {gender === option && (
                                                <Feather name="check" size={16} color={Colors.light.tint} />
                                            )}
                                        </TouchableOpacity>
                                    ))}
                                </View>
                            )}
                        </View>

                        {/* Continue Button */}
                        <TouchableOpacity
                            style={[styles.continueButton, loading && styles.buttonDisabled]}
                            onPress={handleContinue}
                            disabled={loading}
                        >
                            <Text style={styles.continueButtonText}>
                                {loading ? 'Saving...' : 'Continue'}
                            </Text>
                        </TouchableOpacity>

                        {/* Skip Button */}
                        <TouchableOpacity
                            style={styles.skipButton}
                            onPress={handleSkip}
                            disabled={loading}
                        >
                            <Text style={styles.skipButtonText}>Skip for now</Text>
                        </TouchableOpacity>
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
        marginTop: 40,
        marginBottom: 40,
    },
    logoContainer: {
        marginBottom: 20,
    },
    logoImage: {
        width: 160,
        height: 80,
    },
    title: {
        fontSize: 28,
        fontWeight: 'bold',
        color: '#000',
        marginBottom: 8,
    },
    subtitle: {
        fontSize: 15,
        color: '#757575',
        textAlign: 'center',
        paddingHorizontal: 20,
        lineHeight: 22,
    },
    form: {
        flex: 1,
    },
    inputContainer: {
        marginBottom: 20,
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
    placeholderText: {
        color: '#BDBDBD',
    },
    continueButton: {
        backgroundColor: Colors.light.tint,
        height: 56,
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
        marginTop: 10,
        shadowColor: Colors.light.tint,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 5,
    },
    buttonDisabled: {
        opacity: 0.6,
    },
    continueButtonText: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#000',
    },
    skipButton: {
        height: 48,
        justifyContent: 'center',
        alignItems: 'center',
        marginTop: 12,
    },
    skipButtonText: {
        fontSize: 15,
        color: '#757575',
        fontWeight: '600',
    },
    dropdownList: {
        marginTop: 8,
        backgroundColor: '#fff',
        borderRadius: 12,
        padding: 8,
        borderWidth: 1,
        borderColor: '#E0E0E0',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 5,
    },
    dropdownOption: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 12,
        paddingHorizontal: 12,
    },
    dropdownOptionText: {
        fontSize: 15,
        color: '#1a1a1a',
    },
});
