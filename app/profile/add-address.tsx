import { Feather } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import ActionModal from '../../components/common/ActionModal';
import Input from '../../components/common/Input';
import { useAddress } from '../../context/AddressContext';

export default function AddAddressScreen() {
    const router = useRouter();
    const params = useLocalSearchParams();
    const { addAddress, updateAddress, addresses } = useAddress();
    const headerTitle = params.id ? 'Edit Address' : 'Add New Address';

    const [form, setForm] = useState({
        name: '',
        phone: '',
        addressLine1: '',
        addressLine2: '',
        city: '',
        state: '',
        pincode: '',
        country: 'India',
        landmark: '',
        label: 'Home' as 'Home' | 'Work' | 'Other'
    });

    const [showSuccessModal, setShowSuccessModal] = useState(false);
    const [successMessage, setSuccessMessage] = useState('');

    useEffect(() => {
        if (params.id) {
            const existingAddress = addresses.find(a => a.id === params.id);
            if (existingAddress) {
                setForm({
                    name: existingAddress.name,
                    phone: existingAddress.phone,
                    addressLine1: existingAddress.addressLine1 || existingAddress.address || '',
                    addressLine2: existingAddress.addressLine2 || '',
                    city: existingAddress.city,
                    state: existingAddress.state,
                    pincode: existingAddress.pincode,
                    country: existingAddress.country,
                    landmark: existingAddress.landmark || '',
                    label: existingAddress.label
                });
            }
        }
    }, [params.id, addresses]);

    const [errors, setErrors] = useState<Record<string, string>>({});

    const validate = () => {
        let valid = true;
        let newErrors: Record<string, string> = {};

        if (!form.name) { newErrors.name = 'Name is required'; valid = false; }
        if (!form.phone) { newErrors.phone = 'Phone number is required'; valid = false; }
        else if (form.phone.length < 10) { newErrors.phone = 'Invalid phone number'; valid = false; }

        if (!form.pincode) { newErrors.pincode = 'Pincode is required'; valid = false; }
        if (!form.addressLine1) { newErrors.addressLine1 = 'Address is required'; valid = false; }
        if (!form.city) { newErrors.city = 'City is required'; valid = false; }
        if (!form.state) { newErrors.state = 'State is required'; valid = false; }

        setErrors(newErrors);
        return valid;
    };

    const handleSave = () => {
        if (validate()) {
            // Construct the combined address field
            const combinedAddress = form.addressLine2
                ? `${form.addressLine1}, ${form.addressLine2}`
                : form.addressLine1;

            const addressData = {
                ...form,
                address: combinedAddress,
                isDefault: false
            };

            if (params.id) {
                updateAddress(params.id as string, addressData);
                setSuccessMessage('Address updated successfully!');
                setShowSuccessModal(true);
            } else {
                addAddress(addressData);
                setSuccessMessage('Address added successfully!');
                setShowSuccessModal(true);
            }
        }
    };

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
                    <Feather name="arrow-left" size={24} color="#1a1a1a" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>{headerTitle}</Text>
                <View style={{ width: 24 }} />
            </View>

            <ScrollView contentContainerStyle={styles.content}>
                <Text style={styles.sectionHeader}>Contact Details</Text>
                <Input
                    label="Full Name"
                    placeholder="Enter full name"
                    value={form.name}
                    onChangeText={t => setForm({ ...form, name: t })}
                    error={errors.name}
                />
                <Input
                    label="Phone Number"
                    placeholder="Enter 10-digit number"
                    keyboardType="phone-pad"
                    maxLength={10}
                    value={form.phone}
                    onChangeText={t => setForm({ ...form, phone: t })}
                    error={errors.phone}
                />

                <Text style={styles.sectionHeader}>Address Details</Text>
                <View style={styles.row}>
                    <View style={{ flex: 1, marginRight: 10 }}>
                        <Input
                            label="Pincode"
                            placeholder="Pincode"
                            keyboardType="numeric"
                            maxLength={6}
                            value={form.pincode}
                            onChangeText={t => setForm({ ...form, pincode: t })}
                            error={errors.pincode}
                        />
                    </View>
                    <View style={{ flex: 1 }}>
                        <Input
                            label="City"
                            placeholder="City"
                            value={form.city}
                            onChangeText={t => setForm({ ...form, city: t })}
                            error={errors.city}
                        />
                    </View>
                </View>

                <View style={styles.row}>
                    <View style={{ flex: 1, marginRight: 10 }}>
                        <Input
                            label="State"
                            placeholder="State"
                            value={form.state}
                            onChangeText={t => setForm({ ...form, state: t })}
                            error={errors.state}
                        />
                    </View>
                    <View style={{ flex: 1 }}>
                        <Input
                            label="Country"
                            placeholder="Country"
                            value={form.country}
                            onChangeText={t => setForm({ ...form, country: t })}
                        />
                    </View>
                </View>

                <Input
                    label="House No., Building Name"
                    placeholder="Enter Address Line 1"
                    value={form.addressLine1}
                    onChangeText={t => setForm({ ...form, addressLine1: t })}
                    error={errors.addressLine1}
                    multiline
                />

                <Input
                    label="Road, Area, Colony (Optional)"
                    placeholder="Enter Address Line 2"
                    value={form.addressLine2}
                    onChangeText={t => setForm({ ...form, addressLine2: t })}
                    multiline
                />

                <Input
                    label="Landmark (Optional)"
                    placeholder="Nearby landmark"
                    value={form.landmark}
                    onChangeText={t => setForm({ ...form, landmark: t })}
                />

                <Text style={styles.sectionHeader}>Type of Address</Text>
                <View style={styles.typeRow}>
                    {['Home', 'Work', 'Other'].map((type) => (
                        <TouchableOpacity
                            key={type}
                            style={[
                                styles.typeChip,
                                form.label === type && styles.selectedTypeChip
                            ]}
                            onPress={() => setForm({ ...form, label: type as any })}
                        >
                            <Feather
                                name={type === 'Home' ? 'home' : type === 'Work' ? 'briefcase' : 'map-pin'}
                                size={16}
                                color={form.label === type ? '#fff' : '#555'}
                            />
                            <Text style={[
                                styles.typeText,
                                form.label === type && styles.selectedTypeText
                            ]}>{type}</Text>
                        </TouchableOpacity>
                    ))}
                </View>

            </ScrollView>

            <View style={styles.footer}>
                <TouchableOpacity style={styles.saveBtn} onPress={handleSave}>
                    <Text style={styles.saveBtnText}>Save Address</Text>
                </TouchableOpacity>
            </View>

            {/* Success Modal */}
            <ActionModal
                visible={showSuccessModal}
                title="Success"
                message={successMessage}
                icon="check-circle"
                primaryButtonText="OK"
                onPrimaryPress={() => {
                    setShowSuccessModal(false);
                    router.back();
                }}
                onClose={() => {
                    setShowSuccessModal(false);
                    router.back();
                }}
            />
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#fff'
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 20,
        paddingVertical: 15,
        borderBottomWidth: 1,
        borderBottomColor: '#f0f0f0'
    },
    backBtn: {
        padding: 5
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: '700',
        color: '#1a1a1a'
    },
    content: {
        padding: 20,
        paddingBottom: 100
    },
    sectionHeader: {
        fontSize: 16,
        fontWeight: '700',
        color: '#1a1a1a',
        marginTop: 10,
        marginBottom: 15
    },
    row: {
        flexDirection: 'row'
    },
    typeRow: {
        flexDirection: 'row',
        marginBottom: 20
    },
    typeChip: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 10,
        paddingHorizontal: 16,
        borderRadius: 20,
        borderWidth: 1,
        borderColor: '#ddd',
        marginRight: 10,
        backgroundColor: '#fff'
    },
    selectedTypeChip: {
        backgroundColor: '#1a1a1a',
        borderColor: '#1a1a1a'
    },
    typeText: {
        marginLeft: 8,
        fontSize: 14,
        fontWeight: '600',
        color: '#555'
    },
    selectedTypeText: {
        color: '#fff'
    },
    footer: {
        padding: 20,
        borderTopWidth: 1,
        borderTopColor: '#f0f0f0',
        backgroundColor: '#fff'
    },
    saveBtn: {
        backgroundColor: '#FBBF24',
        paddingVertical: 16,
        borderRadius: 12,
        alignItems: 'center'
    },
    saveBtnText: {
        fontSize: 16,
        fontWeight: '800',
        color: '#1a1a1a'
    }
});
