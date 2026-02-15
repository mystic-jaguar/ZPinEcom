import { Feather } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { Image, ScrollView, StyleSheet, Switch, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import ActionModal from '../../components/common/ActionModal';
import Input from '../../components/common/Input';
import { useUser } from '../../context/UserContext';
// import DateTimePicker from '@react-native-community/datetimepicker'; // Assuming we might want a date picker later

export default function EditProfileScreen() {
    const router = useRouter();
    const { user, updateUser, userDetails, updateUserDetails } = useUser();

    const [form, setForm] = useState({
        name: user.name,
        dob: userDetails?.dob || '',
        gender: userDetails?.gender || '',
        preferences: userDetails?.preferences || {
            receivePushNotifications: true,
            receiveEmailUpdates: false,
            receiveOrderUpdates: true
        },
    });

    const [showGenderPicker, setShowGenderPicker] = useState(false);
    const [showSuccessModal, setShowSuccessModal] = useState(false);

    const handleSave = () => {
        // Update basic user info
        if (form.name !== user.name) {
            updateUser({ name: form.name });
        }

        // Update extended user details
        updateUserDetails({
            dob: form.dob,
            gender: form.gender,
            preferences: form.preferences
        });

        setShowSuccessModal(true);
    };

    const handleModalClose = () => {
        setShowSuccessModal(false);
        router.back();
    };

    const togglePreference = (key: 'receivePushNotifications' | 'receiveEmailUpdates' | 'receiveOrderUpdates') => {
        setForm(prev => ({
            ...prev,
            preferences: {
                ...prev.preferences,
                [key]: !prev.preferences[key]
            }
        }));
    };

    return (
        <SafeAreaView style={styles.container}>
            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
                    <Feather name="chevron-left" size={28} color="#1a1a1a" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Edit Profile</Text>
                <View style={{ width: 28 }} />
            </View>

            <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>

                {/* Profile Image Section */}
                <View style={styles.imageSection}>
                    <View style={styles.imageContainer}>
                        <Image
                            source={typeof user.profileImage === 'string'
                                ? { uri: user.profileImage }
                                : user.profileImage || require('../../assets/images/profile_icon.jpg')
                            }
                            style={styles.image}
                        />
                        <TouchableOpacity style={styles.cameraIcon}>
                            <Feather name="camera" size={16} color="#000" />
                        </TouchableOpacity>
                    </View>
                    <Text style={styles.changePhotoText}>CHANGE PHOTO</Text>
                </View>

                {/* Personal Details */}
                <Text style={styles.label}>FULL NAME</Text>
                <Input
                    value={form.name}
                    onChangeText={t => setForm({ ...form, name: t })}
                    containerStyle={{ marginTop: 0 }}
                />

                <View style={styles.row}>
                    <View style={{ flex: 1, marginRight: 10 }}>
                        <Text style={styles.label}>DATE OF BIRTH</Text>
                        <Input
                            value={form.dob}
                            placeholder="YYYY-MM-DD"
                            onChangeText={t => {
                                // Simple auto-formatting for YYYY-MM-DD
                                const cleaned = t.replace(/[^0-9]/g, '');
                                let formatted = cleaned;
                                if (cleaned.length > 4) {
                                    formatted = cleaned.slice(0, 4) + '-' + cleaned.slice(4);
                                }
                                if (cleaned.length > 6) {
                                    formatted = formatted.slice(0, 7) + '-' + cleaned.slice(6);
                                }
                                if (formatted.length > 10) formatted = formatted.slice(0, 10);
                                setForm({ ...form, dob: formatted });
                            }}
                            containerStyle={{ marginTop: 0 }}
                            maxLength={10}
                            keyboardType="numeric"
                        // In a real app, use a proper Date Picker
                        />
                    </View>
                    <View style={{ flex: 1 }}>
                        <Text style={styles.label}>GENDER</Text>
                        <TouchableOpacity
                            style={styles.genderContainer}
                            onPress={() => setShowGenderPicker(!showGenderPicker)}
                        >
                            <Text style={styles.genderText}>
                                {form.gender || 'Select'}
                            </Text>
                            <Feather name={showGenderPicker ? "chevron-up" : "chevron-down"} size={20} color="#6B7280" />
                        </TouchableOpacity>
                        {showGenderPicker && (
                            <View style={styles.dropdownList}>
                                {['Male', 'Female', 'Do not wish to specify'].map((option) => (
                                    <TouchableOpacity
                                        key={option}
                                        style={styles.dropdownOption}
                                        onPress={() => {
                                            setForm({ ...form, gender: option });
                                            setShowGenderPicker(false);
                                        }}
                                    >
                                        <Text style={styles.dropdownOptionText}>{option}</Text>
                                        {form.gender === option && <Feather name="check" size={16} color="#FBBF24" />}
                                    </TouchableOpacity>
                                ))}
                            </View>
                        )}
                    </View>
                </View>

                {/* Preferences */}
                <Text style={styles.sectionHeader}>PREFERENCES</Text>

                <View style={styles.preferenceRow}>
                    <View>
                        <Text style={styles.preferenceTitle}>Receive Push Notifications</Text>
                        <Text style={styles.preferenceSubtitle}>Get updates on latest trends and offers</Text>
                    </View>
                    <Switch
                        trackColor={{ false: "#E5E7EB", true: "#FBBF24" }}
                        thumbColor={form.preferences.receivePushNotifications ? "#fff" : "#f4f3f4"}
                        onValueChange={() => togglePreference('receivePushNotifications')}
                        value={form.preferences.receivePushNotifications}
                    />
                </View>

                <TouchableOpacity style={styles.saveButton} onPress={handleSave}>
                    <Text style={styles.saveButtonText}>Update Profile</Text>
                </TouchableOpacity>

                <View style={{ height: 40 }} />
            </ScrollView>

            <ActionModal
                visible={showSuccessModal}
                title="Success"
                message="Profile updated successfully!"
                primaryButtonText="OK"
                onPrimaryPress={handleModalClose}
                onClose={handleModalClose}
                icon="check-circle"
            />

            {/* Dark Mode FAB (Visual) removed as per clean UI request or can handle via preferences */}
            {/* Keeping it if user wants consistent "visual" from previous design elsewhere, but strictly following 'above image' */}
            {/* <View style={styles.fab}>
                <Feather name="moon" size={24} color="#fff" />
            </View> */}
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#fff', // White background
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 20,
        paddingVertical: 15,
        backgroundColor: '#fff',
    },
    backBtn: {
        padding: 5,
        marginLeft: -5,
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: '700',
        color: '#1a1a1a',
    },
    content: {
        padding: 20,
    },
    imageSection: {
        alignItems: 'center',
        marginBottom: 30,
    },
    imageContainer: {
        position: 'relative',
        marginBottom: 10,
    },
    image: {
        width: 100,
        height: 100,
        borderRadius: 50,
        backgroundColor: '#F3F4F6', // Placeholder color
    },
    cameraIcon: {
        position: 'absolute',
        bottom: 0,
        right: 0,
        backgroundColor: '#FBBF24',
        width: 32,
        height: 32,
        borderRadius: 16,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 2,
        borderColor: '#fff',
    },
    changePhotoText: {
        fontSize: 12,
        fontWeight: '700',
        color: '#4B5563',
        letterSpacing: 0.5,
    },
    row: {
        flexDirection: 'row',
        marginBottom: 16,
    },
    label: {
        fontSize: 12,
        fontWeight: '700',
        color: '#6B7280', // Lighter label color
        marginBottom: 8,
        textTransform: 'uppercase',
        letterSpacing: 0.5
    },
    genderContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#E5E7EB',
        borderRadius: 12,
        paddingHorizontal: 16,
        paddingVertical: 12,
        backgroundColor: '#fff',
        height: 50,
    },
    genderText: {
        fontSize: 16,
        color: '#1a1a1a',
    },
    phoneInputContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#E5E7EB',
        borderRadius: 12,
        paddingHorizontal: 16,
        backgroundColor: '#fff',
        height: 50,
    },
    sectionHeader: {
        fontSize: 12,
        fontWeight: '700',
        color: '#9CA3AF',
        marginTop: 10,
        marginBottom: 15,
        letterSpacing: 1,
        textTransform: 'uppercase'
    },
    preferenceRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 20
    },
    preferenceTitle: {
        fontSize: 14,
        fontWeight: '600',
        color: '#1a1a1a',
        marginBottom: 4
    },
    preferenceSubtitle: {
        fontSize: 12,
        color: '#9CA3AF'
    },
    saveButton: {
        backgroundColor: '#FBBF24',
        borderRadius: 12,
        height: 50,
        justifyContent: 'center',
        alignItems: 'center',
        marginTop: 20,
        shadowColor: '#FBBF24',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 4,
    },
    saveButtonText: {
        fontSize: 16,
        fontWeight: '700',
        color: '#1a1a1a',
    },
    fab: {
        position: 'absolute',
        bottom: 120,
        right: 20,
        width: 50,
        height: 50,
        borderRadius: 25,
        backgroundColor: '#111827',
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 8,
        elevation: 5,
    },
    dropdownList: {
        position: 'absolute',
        top: 60, // Adjust based on genderContainer position + height
        left: 0,
        right: 0,
        backgroundColor: '#fff',
        borderRadius: 12,
        padding: 8,
        borderWidth: 1,
        borderColor: '#E5E7EB',
        zIndex: 1000,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 5
    },
    dropdownOption: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 10,
        paddingHorizontal: 12,
    },
    dropdownOptionText: {
        fontSize: 14,
        color: '#1a1a1a'
    }
});
