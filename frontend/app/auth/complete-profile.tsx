import { useRouter } from 'expo-router';
import { Calendar, Check, Zap } from 'lucide-react-native';
import React, { useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import ActionModal from '../../components/common/ActionModal';
import { ZButton, ZText } from '../../components/ui';
import { colors, fonts, palette, radius } from '../../constants/theme';
import { useUser } from '../../context/UserContext';

const GENDER_OPTIONS = ['Male', 'Female', 'Do not wish to specify'];

export default function CompleteProfileScreen() {
    const router = useRouter();
    const { user, updateUser } = useUser();

    const [dob, setDob] = useState(user?.dob || '');
    const [gender, setGender] = useState(user?.gender || '');
    const [loading, setLoading] = useState(false);
    const [showErrorModal, setShowErrorModal] = useState(false);
    const [errorMessage, setErrorMessage] = useState('');

    const formatDobInput = (text: string) => {
        const cleaned = text.replace(/[^0-9]/g, '');
        let formatted = cleaned;
        if (cleaned.length > 4) formatted = cleaned.slice(0, 4) + '-' + cleaned.slice(4);
        if (cleaned.length > 6) formatted = formatted.slice(0, 7) + '-' + cleaned.slice(6);
        if (formatted.length > 10) formatted = formatted.slice(0, 10);
        setDob(formatted);
    };

    const validateDob = (value: string): boolean => {
        if (!value) return true; // Optional field
        const regex = /^\d{4}-\d{2}-\d{2}$/;
        if (!regex.test(value)) return false;
        const date = new Date(value);
        if (isNaN(date.getTime())) return false;
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
        } catch {
            setErrorMessage('Failed to save profile. Please try again.');
            setShowErrorModal(true);
        } finally {
            setLoading(false);
        }
    };

    return (
        <SafeAreaView style={styles.container} edges={['top']}>
            <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.flex}>
                <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
                    <View style={styles.topRow}>
                        <ZText variant="eyebrow">Step 2 of 2</ZText>
                        <Text style={styles.skip} onPress={() => router.replace('/(tabs)')}>Skip</Text>
                    </View>

                    <ZText variant="h2" style={styles.title}>Almost there.</ZText>
                    <ZText variant="muted" style={styles.subtitle}>Help us tailor your feed. Both are optional.</ZText>

                    <ZText variant="eyebrow" color={colors.textBody} style={styles.label}>Date of birth</ZText>
                    <View style={styles.dobField}>
                        <Calendar size={19} color={colors.textFaint} />
                        <TextInput
                            style={styles.dobInput}
                            placeholder="YYYY-MM-DD"
                            placeholderTextColor={colors.textFaint}
                            value={dob}
                            onChangeText={formatDobInput}
                            keyboardType="numeric"
                            maxLength={10}
                            editable={!loading}
                        />
                    </View>

                    <ZText variant="eyebrow" color={colors.textBody} style={styles.labelGap}>Gender</ZText>
                    <View style={styles.radioGroup}>
                        {GENDER_OPTIONS.map((option) => {
                            const selected = gender === option;
                            return (
                                <Pressable
                                    key={option}
                                    onPress={() => setGender(option)}
                                    disabled={loading}
                                    style={[styles.radioRow, selected && styles.radioRowOn]}
                                >
                                    <Text style={[styles.radioLabel, selected && styles.radioLabelOn]}>{option}</Text>
                                    <View style={[styles.radioBox, selected && styles.radioBoxOn]}>
                                        {selected && <Check size={13} color={colors.textStrong} />}
                                    </View>
                                </Pressable>
                            );
                        })}
                    </View>

                    <ZButton label={loading ? 'Saving…' : 'Start shopping'} icon={Zap} onPress={handleContinue} loading={loading} />
                </ScrollView>
            </KeyboardAvoidingView>

            <ActionModal visible={showErrorModal} title="Error" message={errorMessage} icon="x-circle" primaryButtonText="OK" onPrimaryPress={() => setShowErrorModal(false)} onClose={() => setShowErrorModal(false)} />
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: palette.paperWarm },
    flex: { flex: 1 },
    content: { paddingHorizontal: 26, paddingTop: 12, paddingBottom: 30 },
    topRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    skip: { fontFamily: fonts.bodyBold, fontSize: 13, color: colors.textFaint },
    title: { marginTop: 22 },
    subtitle: { marginTop: 10, marginBottom: 28 },
    label: { marginBottom: 8 },
    labelGap: { marginBottom: 12 },
    dobField: {
        flexDirection: 'row', alignItems: 'center', gap: 11, backgroundColor: colors.surfaceCard,
        borderWidth: 1.5, borderColor: colors.borderSubtle, borderRadius: radius.md, paddingHorizontal: 15, height: 54, marginBottom: 22,
    },
    dobInput: { flex: 1, fontFamily: fonts.monoRegular, fontSize: 15, color: colors.textStrong, padding: 0 },
    radioGroup: { gap: 11, marginBottom: 32 },
    radioRow: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
        backgroundColor: colors.surfaceCard, borderWidth: 1.5, borderColor: colors.borderSubtle,
        borderRadius: radius.md, paddingVertical: 15, paddingHorizontal: 16,
    },
    radioRowOn: { backgroundColor: colors.surfaceInverse, borderColor: colors.surfaceInverse },
    radioLabel: { fontFamily: fonts.bodySemiBold, fontSize: 15, color: colors.textBody },
    radioLabelOn: { fontFamily: fonts.bodyBold, color: colors.textInvert },
    radioBox: { width: 22, height: 22, borderRadius: 11, borderWidth: 2, borderColor: colors.borderSubtle },
    radioBoxOn: { backgroundColor: palette.yellow500, borderWidth: 0, alignItems: 'center', justifyContent: 'center' },
});
