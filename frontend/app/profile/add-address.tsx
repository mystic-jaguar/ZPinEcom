import { useLocalSearchParams, useRouter } from 'expo-router';
import { Briefcase, Home, MapPin } from 'lucide-react-native';
import React, { useEffect, useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import ActionModal from '../../components/common/ActionModal';
import { AppHeader, BottomBar, ZButton, ZInput, ZText } from '../../components/ui';
import { colors, fonts, palette, radius } from '../../constants/theme';
import { DELIVERY_CITY, isPuneCity, isPunePincode } from '../../constants/delivery';
import { useAddress } from '../../context/AddressContext';
import { useUser } from '../../context/UserContext';
import { lookupPincode } from '../../services/location';

const LABELS = [
    { key: 'Home', icon: Home },
    { key: 'Work', icon: Briefcase },
    { key: 'Other', icon: MapPin },
] as const;

export default function AddAddressScreen() {
    const router = useRouter();
    const params = useLocalSearchParams();
    const { addAddress, updateAddress, addresses } = useAddress();
    const { user } = useUser();
    const signupPhone = (user?.mobile || (user as any)?.phoneNumber || '').toString();

    const [form, setForm] = useState({
        name: '', phone: signupPhone, addressLine1: '', addressLine2: '',
        city: '', state: '', pincode: '', country: 'India', landmark: '',
        label: 'Home' as 'Home' | 'Work' | 'Other',
    });
    const [errors, setErrors] = useState<Record<string, string>>({});
    const [showSuccessModal, setShowSuccessModal] = useState(false);
    const [successMessage, setSuccessMessage] = useState('');

    useEffect(() => {
        if (params.id) {
            const existing = addresses.find(a => a.id === params.id);
            if (existing) {
                setForm({
                    name: existing.name,
                    phone: existing.phone || signupPhone,
                    addressLine1: existing.addressLine1 || existing.address || '',
                    addressLine2: existing.addressLine2 || '',
                    city: existing.city,
                    state: existing.state,
                    pincode: existing.pincode,
                    country: existing.country,
                    landmark: existing.landmark || '',
                    label: existing.label,
                });
            }
        }
    }, [params.id, addresses]);

    const validate = () => {
        const e: Record<string, string> = {};
        if (!form.name) e.name = 'Name is required';
        if (!form.phone) e.phone = 'Phone is required';
        else if (form.phone.length < 10) e.phone = 'Invalid phone number';
        if (!form.pincode) e.pincode = 'Pincode is required';
        else if (!isPunePincode(form.pincode)) e.pincode = `We currently deliver only in ${DELIVERY_CITY}`;
        if (!form.addressLine1) e.addressLine1 = 'Address is required';
        if (!form.addressLine2) e.addressLine2 = 'Locality is required';
        if (!form.city) e.city = 'City is required';
        else if (!isPuneCity(form.city)) e.city = `We currently deliver only in ${DELIVERY_CITY}`;
        if (!form.state) e.state = 'State is required';
        setErrors(e);
        return Object.keys(e).length === 0;
    };

    const handleSave = () => {
        if (!validate()) return;
        const combinedAddress = form.addressLine2 ? `${form.addressLine1}, ${form.addressLine2}` : form.addressLine1;
        const addressData = { ...form, address: combinedAddress, isDefault: false };
        if (params.id) {
            updateAddress(params.id as string, addressData);
            setSuccessMessage('Address updated successfully!');
        } else {
            addAddress(addressData);
            setSuccessMessage('Address added successfully!');
        }
        setShowSuccessModal(true);
    };

    // Pincode → city/state autofill (India Post). Ignores stale responses.
    const onPincodeChange = (t: string) => {
        const pincode = t.replace(/[^0-9]/g, '');
        setForm(f => ({ ...f, pincode }));
        if (isPunePincode(pincode)) setErrors(e => ({ ...e, pincode: '' }));
        if (pincode.length !== 6) return;
        lookupPincode(pincode).then(loc => {
            if (!loc) return;
            setForm(f => (f.pincode === pincode ? { ...f, city: loc.city || f.city, state: loc.state || f.state } : f));
            setErrors(e => ({ ...e, city: '', state: '' }));
        });
    };

    const err = (k: string) => (errors[k] ? <Text style={styles.error}>{errors[k]}</Text> : null);

    return (
        <SafeAreaView style={styles.container} edges={['top']}>
            <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
                <AppHeader title={params.id ? 'Edit address' : 'Add address'} onBack={() => router.back()} />
                <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled" keyboardDismissMode="on-drag" automaticallyAdjustKeyboardInsets showsVerticalScrollIndicator={false}>
                    <ZInput label="Full name" placeholder="Enter full name" value={form.name} onChangeText={(t) => setForm({ ...form, name: t })} containerStyle={{ marginBottom: errors.name ? 4 : 16 }} />
                    {err('name')}

                    <ZText variant="eyebrow" color={colors.textBody} style={styles.label}>Mobile number</ZText>
                    <View style={styles.mobileField}>
                        <Text style={styles.countryCode}>+91</Text>
                        <View style={styles.divider} />
                        <TextInput
                            style={styles.mobileInput}
                            placeholder="98765 43210"
                            placeholderTextColor={colors.textFaint}
                            value={form.phone}
                            onChangeText={(t) => setForm({ ...form, phone: t.replace(/[^0-9]/g, '') })}
                            keyboardType="phone-pad"
                            maxLength={10}
                        />
                    </View>
                    {err('phone')}

                    <View style={styles.row}>
                        <View style={{ flex: 1 }}>
                            <ZInput label="Pincode" placeholder="400050" value={form.pincode} onChangeText={onPincodeChange} keyboardType="numeric" maxLength={6} containerStyle={{ marginBottom: 4 }} />
                            {err('pincode')}
                        </View>
                        <View style={{ flex: 1.4 }}>
                            <ZInput label="City" placeholder="Mumbai" value={form.city} onChangeText={(t) => setForm({ ...form, city: t })} containerStyle={{ marginBottom: 4 }} />
                            {err('city')}
                        </View>
                    </View>

                    <View style={styles.row}>
                        <View style={{ flex: 1 }}>
                            <ZInput label="State" placeholder="State" value={form.state} onChangeText={(t) => setForm({ ...form, state: t })} containerStyle={{ marginBottom: 4 }} />
                            {err('state')}
                        </View>
                        <View style={{ flex: 1 }}>
                            <ZInput label="Country" placeholder="Country" value={form.country} onChangeText={(t) => setForm({ ...form, country: t })} />
                        </View>
                    </View>

                    <ZText variant="eyebrow" color={colors.textBody} style={styles.label}>Flat / House no, Building, Area</ZText>
                    <TextInput
                        style={styles.textarea}
                        placeholder="402 Sunrise Residency, Linking Road, Bandra West"
                        placeholderTextColor={colors.textFaint}
                        value={form.addressLine1}
                        onChangeText={(t) => setForm({ ...form, addressLine1: t })}
                        multiline
                    />
                    {err('addressLine1')}

                    <ZInput label="Locality / Area" placeholder="e.g. Bandra West" value={form.addressLine2} onChangeText={(t) => setForm({ ...form, addressLine2: t })} containerStyle={{ marginTop: 16, marginBottom: errors.addressLine2 ? 4 : 0 }} />
                    {err('addressLine2')}

                    <ZInput label="Landmark (optional)" placeholder="Nearby landmark" value={form.landmark} onChangeText={(t) => setForm({ ...form, landmark: t })} containerStyle={{ marginTop: 16 }} />

                    <ZText variant="eyebrow" color={colors.textBody} style={styles.label}>Save as</ZText>
                    <View style={styles.chips}>
                        {LABELS.map(({ key, icon: Icon }) => {
                            const on = form.label === key;
                            return (
                                <Pressable key={key} style={[styles.chip, on ? styles.chipOn : styles.chipOff]} onPress={() => setForm({ ...form, label: key })}>
                                    <Icon size={15} color={on ? colors.textInvert : colors.textBody} />
                                    <Text style={[styles.chipText, on && { color: colors.textInvert }]}>{key}</Text>
                                </Pressable>
                            );
                        })}
                    </View>
                </ScrollView>

                <BottomBar>
                    <ZButton label="Save address" onPress={handleSave} />
                </BottomBar>
            </KeyboardAvoidingView>

            <ActionModal
                visible={showSuccessModal}
                title="Success"
                message={successMessage}
                icon="check-circle"
                primaryButtonText="OK"
                onPrimaryPress={() => { setShowSuccessModal(false); router.back(); }}
                onClose={() => { setShowSuccessModal(false); router.back(); }}
            />
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: palette.paperWarm },
    content: { padding: 26, paddingTop: 8, paddingBottom: 40 },
    label: { marginTop: 16, marginBottom: 7 },
    error: { fontFamily: fonts.bodyMedium, fontSize: 12, color: palette.red500, marginBottom: 12, marginTop: 4 },
    mobileField: { flexDirection: 'row', alignItems: 'center', gap: 11, backgroundColor: colors.surfaceCard, borderWidth: 1.5, borderColor: colors.borderSubtle, borderRadius: radius.md, paddingHorizontal: 15, height: 52 },
    countryCode: { fontFamily: fonts.monoBold, fontSize: 13, color: colors.textStrong },
    divider: { width: 1, height: 22, backgroundColor: colors.borderSubtle },
    mobileInput: { flex: 1, fontFamily: fonts.bodyMedium, fontSize: 15, color: colors.textStrong, padding: 0 },
    row: { flexDirection: 'row', gap: 14 },
    textarea: { backgroundColor: colors.surfaceCard, borderWidth: 1.5, borderColor: colors.borderSubtle, borderRadius: radius.md, paddingHorizontal: 15, paddingTop: 13, height: 78, fontFamily: fonts.bodyMedium, fontSize: 15, color: colors.textStrong, textAlignVertical: 'top' },
    chips: { flexDirection: 'row', gap: 10 },
    chip: { flexDirection: 'row', alignItems: 'center', gap: 7, borderRadius: 100, paddingHorizontal: 16, paddingVertical: 10 },
    chipOn: { backgroundColor: colors.surfaceInverse },
    chipOff: { backgroundColor: colors.surfaceCard, borderWidth: 2, borderColor: colors.borderSubtle },
    chipText: { fontFamily: fonts.bodyBold, fontSize: 13, color: colors.textBody },
});
