import { useRouter } from 'expo-router';
import { BadgeCheck, Calendar, Check, ChevronDown } from 'lucide-react-native';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Switch, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import ActionModal from '../../components/common/ActionModal';
import { AppHeader, BottomBar, ZButton, ZInput, ZText } from '../../components/ui';
import { colors, fonts, palette, radius } from '../../constants/theme';
import { useUser } from '../../context/UserContext';
import { userService } from '../../services/user';

function initialsOf(name?: string) {
    if (!name) return 'ZP';
    return name.trim().split(/\s+/).slice(0, 2).map((w) => w[0]?.toUpperCase() || '').join('') || 'ZP';
}

export default function EditProfileScreen() {
    const router = useRouter();
    const { user, updateUser } = useUser();

    const [form, setForm] = useState({
        name: user.name || '',
        dob: user.dob || '',
        gender: user.gender || '',
        preferences: {
            receivePushNotifications: user.receivePushNotifications ?? true,
            receiveEmailUpdates: user.receiveEmailUpdates ?? false,
            receiveOrderUpdates: user.receiveOrderUpdates ?? true,
        },
    });
    const [isFetching, setIsFetching] = useState(true);
    const [showGenderPicker, setShowGenderPicker] = useState(false);
    const [showSuccessModal, setShowSuccessModal] = useState(false);
    const [showErrorModal, setShowErrorModal] = useState(false);
    const [errorMessage, setErrorMessage] = useState<string | null>(null);
    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => {
        if (!user.id) { setIsFetching(false); return; }
        userService.getUserById(user.id)
            .then(response => {
                if (response.success && response.data) {
                    const raw = response.data as any;
                    setForm({
                        name: raw.name || '',
                        dob: raw.dob ? String(raw.dob).split('T')[0] : '',
                        gender: raw.gender || '',
                        preferences: {
                            receivePushNotifications: raw.receivePushNotifications ?? raw.receive_push_notifications ?? true,
                            receiveEmailUpdates: raw.receiveEmailUpdates ?? raw.receive_email_updates ?? false,
                            receiveOrderUpdates: raw.receiveOrderUpdates ?? raw.receive_order_updates ?? true,
                        },
                    });
                }
            })
            .catch(() => { })
            .finally(() => setIsFetching(false));
    }, [user.id]);

    const handleSave = async () => {
        if (isSaving) return;
        setIsSaving(true);
        try {
            const updates: Record<string, any> = {};
            if (form.name && form.name !== user.name) updates.name = form.name;
            if (form.dob) updates.dob = form.dob;
            if (form.gender) updates.gender = form.gender;
            updates.receivePushNotifications = form.preferences.receivePushNotifications;
            updates.receiveEmailUpdates = form.preferences.receiveEmailUpdates;
            updates.receiveOrderUpdates = form.preferences.receiveOrderUpdates;
            await updateUser(updates as any);
            setShowSuccessModal(true);
        } catch (error) {
            console.error('Failed to update profile:', error);
            setErrorMessage('Failed to update profile. Please try again.');
            setShowErrorModal(true);
        } finally {
            setIsSaving(false);
        }
    };

    const formatDob = (t: string) => {
        const cleaned = t.replace(/[^0-9]/g, '');
        let f = cleaned;
        if (cleaned.length > 4) f = cleaned.slice(0, 4) + '-' + cleaned.slice(4);
        if (cleaned.length > 6) f = f.slice(0, 7) + '-' + cleaned.slice(6);
        if (f.length > 10) f = f.slice(0, 10);
        setForm({ ...form, dob: f });
    };

    if (isFetching) {
        return (
            <SafeAreaView style={styles.container} edges={['top']}>
                <AppHeader title="Edit profile" onBack={() => router.back()} />
                <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
                    <ActivityIndicator size="large" color={palette.yellow500} />
                </View>
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView style={styles.container} edges={['top']}>
            <AppHeader title="Edit profile" onBack={() => router.back()} />

            <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
                <View style={styles.avatarWrap}>
                    <View style={styles.avatar}><Text style={styles.avatarText}>{initialsOf(form.name || user.name)}</Text></View>
                </View>

                <ZInput label="Full name" value={form.name} onChangeText={(t) => setForm({ ...form, name: t })} />

                {user.email ? (
                    <>
                        <ZText variant="eyebrow" color={colors.textBody} style={styles.label}>Email</ZText>
                        <View style={styles.readonlyField}>
                            <Text style={styles.readonlyText} numberOfLines={1}>{user.email}</Text>
                            <BadgeCheck size={18} color={palette.green500} />
                        </View>
                    </>
                ) : null}

                {user.mobile ? (
                    <>
                        <ZText variant="eyebrow" color={colors.textBody} style={styles.label}>Mobile</ZText>
                        <View style={styles.readonlyField}>
                            <Text style={styles.countryCode}>+91</Text>
                            <View style={styles.divider} />
                            <Text style={styles.readonlyText} numberOfLines={1}>{user.mobile}</Text>
                            <BadgeCheck size={18} color={palette.green500} />
                        </View>
                    </>
                ) : null}

                <View style={styles.row}>
                    <View style={{ flex: 1 }}>
                        <ZText variant="eyebrow" color={colors.textBody} style={styles.label}>Date of birth</ZText>
                        <View style={styles.field}>
                            <Calendar size={18} color={colors.textFaint} />
                            <TextInput
                                style={styles.fieldInput}
                                value={form.dob}
                                placeholder="YYYY-MM-DD"
                                placeholderTextColor={colors.textFaint}
                                onChangeText={formatDob}
                                maxLength={10}
                                keyboardType="numeric"
                            />
                        </View>
                    </View>
                    <View style={{ flex: 1 }}>
                        <ZText variant="eyebrow" color={colors.textBody} style={styles.label}>Gender</ZText>
                        <Pressable style={styles.field} onPress={() => setShowGenderPicker((v) => !v)}>
                            <Text style={[styles.fieldInput, !form.gender && { color: colors.textFaint }]} numberOfLines={1}>{form.gender || 'Select'}</Text>
                            <ChevronDown size={18} color={colors.textMuted} />
                        </Pressable>
                        {showGenderPicker && (
                            <View style={styles.dropdown}>
                                {['Male', 'Female', 'Do not wish to specify'].map((opt) => (
                                    <Pressable key={opt} style={styles.dropdownItem} onPress={() => { setForm({ ...form, gender: opt }); setShowGenderPicker(false); }}>
                                        <Text style={styles.dropdownText}>{opt}</Text>
                                        {form.gender === opt && <Check size={16} color={palette.yellow600} />}
                                    </Pressable>
                                ))}
                            </View>
                        )}
                    </View>
                </View>

                <ZText variant="eyebrow" style={styles.section}>Preferences</ZText>
                <View style={styles.prefRow}>
                    <View style={{ flex: 1, paddingRight: 12 }}>
                        <Text style={styles.prefTitle}>Push notifications</Text>
                        <Text style={styles.prefSub}>Get updates on latest trends and offers</Text>
                    </View>
                    <Switch
                        trackColor={{ false: colors.borderSubtle, true: palette.yellow500 }}
                        thumbColor="#fff"
                        onValueChange={() => setForm(prev => ({ ...prev, preferences: { ...prev.preferences, receivePushNotifications: !prev.preferences.receivePushNotifications } }))}
                        value={form.preferences.receivePushNotifications}
                    />
                </View>
            </ScrollView>

            <BottomBar>
                <ZButton label={isSaving ? 'Saving…' : 'Save changes'} onPress={handleSave} loading={isSaving} />
            </BottomBar>

            <ActionModal visible={showSuccessModal} title="Success" message="Profile updated successfully!" primaryButtonText="OK" onPrimaryPress={() => { setShowSuccessModal(false); router.back(); }} onClose={() => { setShowSuccessModal(false); router.back(); }} icon="check-circle" />
            <ActionModal visible={showErrorModal} title="Error" message={errorMessage || 'Something went wrong.'} primaryButtonText="OK" onPrimaryPress={() => setShowErrorModal(false)} onClose={() => setShowErrorModal(false)} icon="x-circle" />
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: palette.paperWarm },
    content: { padding: 26, paddingTop: 8 },
    avatarWrap: { alignSelf: 'center', marginBottom: 26 },
    avatar: { width: 88, height: 88, borderRadius: 44, backgroundColor: colors.surfaceInverse, borderWidth: 3, borderColor: palette.yellow500, alignItems: 'center', justifyContent: 'center' },
    avatarText: { fontFamily: fonts.displayBold, fontSize: 32, color: palette.yellow500 },

    label: { marginBottom: 7 },
    readonlyField: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: '#F5F4F0', borderWidth: 1.5, borderColor: '#EFEDE6', borderRadius: radius.md, paddingHorizontal: 15, height: 52, marginBottom: 16 },
    readonlyText: { flex: 1, fontFamily: fonts.bodyMedium, fontSize: 15, color: colors.textMuted },
    countryCode: { fontFamily: fonts.monoBold, fontSize: 13, color: colors.textMuted },
    divider: { width: 1, height: 22, backgroundColor: colors.borderSubtle },

    row: { flexDirection: 'row', gap: 14 },
    field: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: colors.surfaceCard, borderWidth: 1.5, borderColor: colors.borderSubtle, borderRadius: radius.md, paddingHorizontal: 15, height: 52 },
    fieldInput: { flex: 1, fontFamily: fonts.bodyMedium, fontSize: 14, color: colors.textStrong, padding: 0 },
    dropdown: { backgroundColor: colors.surfaceCard, borderWidth: 1, borderColor: colors.borderSubtle, borderRadius: radius.md, marginTop: 8, overflow: 'hidden' },
    dropdownItem: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 11, paddingHorizontal: 12 },
    dropdownText: { fontFamily: fonts.bodyMedium, fontSize: 13, color: colors.textBody },

    section: { marginTop: 24, marginBottom: 14 },
    prefRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    prefTitle: { fontFamily: fonts.bodySemiBold, fontSize: 14, color: colors.textStrong, marginBottom: 3 },
    prefSub: { fontFamily: fonts.bodyRegular, fontSize: 12, color: colors.textMuted },
});
