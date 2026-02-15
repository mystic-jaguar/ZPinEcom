import ActionModal from '@/components/common/ActionModal';
import { usePayment } from '@/context/PaymentContext';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Input from '../../components/common/Input';

type PaymentType = 'Card' | 'UPI';

export default function AddPaymentMethodScreen() {
    const router = useRouter();
    const { id, type } = useLocalSearchParams<{ id: string, type: 'Card' | 'UPI' }>();
    const { addCard, updateCard, addUPI, updateUPI, getCard, getUPI } = usePayment();

    const [selectedType, setSelectedType] = useState<PaymentType>(type === 'UPI' ? 'UPI' : 'Card');

    // Form States
    const [cardNumber, setCardNumber] = useState('');
    const [cardHolder, setCardHolder] = useState('');
    const [expiry, setExpiry] = useState('');
    const [cvv, setCvv] = useState('');
    const [cardType, setCardType] = useState<'Credit Card' | 'Debit Card'>('Credit Card');
    const [upiId, setUpiId] = useState('');
    const [upiApp, setUpiApp] = useState<'Google Pay' | 'PhonePe' | 'Paytm'>('Google Pay');

    // Modal State
    const [modalVisible, setModalVisible] = useState(false);
    const [modalConfig, setModalConfig] = useState({
        title: '',
        message: '',
        icon: 'alert-circle' as 'alert-circle' | 'check-circle' | 'x-circle',
        onPrimary: () => setModalVisible(false),
        primaryText: 'OK'
    });

    const showModal = (title: string, message: string, icon: 'alert-circle' | 'check-circle' = 'alert-circle', onPrimary?: () => void) => {
        setModalConfig({
            title,
            message,
            icon,
            onPrimary: onPrimary || (() => setModalVisible(false)),
            primaryText: 'OK'
        });
        setModalVisible(true);
    };

    useEffect(() => {
        if (id) {
            if (type === 'Card') {
                const card = getCard(id);
                if (card) {
                    setSelectedType('Card');
                    setCardNumber(card.cardNumber);
                    setCardHolder(card.cardHolderName);
                    setExpiry(card.expiryDate);
                    setCvv(card.cvv || '');
                    setCardType(card.cardType);
                }
            } else if (type === 'UPI') {
                const upi = getUPI(id);
                if (upi) {
                    setSelectedType('UPI');
                    setUpiId(upi.upiId);
                    setUpiApp(upi.upiApp || 'Google Pay');
                }
            }
        }
    }, [id, type]);

    const validateCard = () => {
        // Remove spaces for validation
        const cleanNumber = cardNumber.replace(/\s/g, '');
        if (!/^\d{16}$/.test(cleanNumber)) {
            showModal('Invalid Card Number', 'Card number must be exactly 16 digits.');
            return false;
        }
        if (!/^[a-zA-Z\s]+$/.test(cardHolder)) {
            showModal('Invalid Name', 'Cardholder name should only contain letters.');
            return false;
        }
        // Expiry format MM/YY where MM is 01-12
        if (!/^(0[1-9]|1[0-2])\/\d{2}$/.test(expiry)) {
            showModal('Invalid Expiry Date', 'Expiry date must be in MM/YY format (e.g., 09/25) and month between 01-12.');
            return false;
        }
        if (!/^\d{3}$/.test(cvv)) {
            showModal('Invalid CVV', 'CVV must be exactly 3 digits.');
            return false;
        }
        return true;
    };

    const validateUPI = () => {
        // Basic UPI validation: username@bank
        if (!/^[a-zA-Z0-9.\-_]{2,256}@[a-zA-Z]{2,64}$/.test(upiId)) {
            showModal('Invalid UPI ID', 'Please enter a valid UPI ID (e.g., username@bank).');
            return false;
        }
        return true;
    };

    const handleSave = () => {
        if (selectedType === 'Card') {
            if (!validateCard()) return;
            const cleanNumber = cardNumber.replace(/\s/g, '');

            if (id && type === 'Card') {
                updateCard(id, {
                    cardNumber: cleanNumber,
                    cardHolderName: cardHolder,
                    expiryDate: expiry,
                    cvv: cvv,
                    cardType: cardType
                });
                showModal('Success', 'Card updated successfully!', 'check-circle', () => {
                    setModalVisible(false);
                    router.back();
                });
            } else {
                addCard({
                    cardNumber: cleanNumber,
                    cardHolderName: cardHolder,
                    expiryDate: expiry,
                    cvv: cvv,
                    cardType: cardType
                });
                showModal('Success', 'Card added successfully!', 'check-circle', () => {
                    setModalVisible(false);
                    router.back();
                });
            }
        } else {
            if (!validateUPI()) return;

            if (id && type === 'UPI') {
                updateUPI(id, upiId, upiApp);
                showModal('Success', 'UPI ID updated successfully!', 'check-circle', () => {
                    setModalVisible(false);
                    router.back();
                });
            } else {
                addUPI(upiId, upiApp);
                showModal('Success', 'UPI ID added successfully!', 'check-circle', () => {
                    setModalVisible(false);
                    router.back();
                });
            }
        }
    };

    return (
        <SafeAreaView style={styles.container} edges={['top']}>
            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()}>
                    <Ionicons name="chevron-back" size={28} color="#000" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>{id ? 'Edit Payment Method' : 'Add New Payment Method'}</Text>
                <View style={{ width: 28 }} />
            </View>

            <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
                {/* Toggle Switch - Only show if not editing, or allow changing type? Usually edit is fix type. Let's disable toggle if editing for simplicity or keeping it enabled creates complexity with ID. */}
                {/* User request: "editable same for the upi id". If I allow changing type during edit, it's basically a delete and add. Let's disable toggle if editing. */}
                <View style={styles.toggleContainer}>
                    <TouchableOpacity
                        style={[styles.toggleButton, selectedType === 'Card' && styles.toggleButtonActive, id && type !== 'Card' && { opacity: 0.5 }]}
                        onPress={() => !id && setSelectedType('Card')}
                        disabled={!!id}
                    >
                        <Ionicons name="card" size={20} color={selectedType === 'Card' ? '#000' : '#6B7280'} style={{ marginRight: 8 }} />
                        <Text style={[styles.toggleText, selectedType === 'Card' && styles.toggleTextActive]}>Card</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={[styles.toggleButton, selectedType === 'UPI' && styles.toggleButtonActive, id && type !== 'UPI' && { opacity: 0.5 }]}
                        onPress={() => !id && setSelectedType('UPI')}
                        disabled={!!id}
                    >
                        <Ionicons name="wallet" size={20} color={selectedType === 'UPI' ? '#000' : '#6B7280'} style={{ marginRight: 8 }} />
                        <Text style={[styles.toggleText, selectedType === 'UPI' && styles.toggleTextActive]}>UPI</Text>
                    </TouchableOpacity>
                </View>

                {/* Form Content */}
                {selectedType === 'Card' ? (
                    <View style={styles.formContainer}>
                        <Text style={styles.sectionHeader}>CARD DETAILS</Text>

                        {/* Card Type Selection */}
                        <View style={styles.cardTypeContainer}>
                            <TouchableOpacity
                                style={[styles.cardTypeButton, cardType === 'Credit Card' && styles.cardTypeButtonActive]}
                                onPress={() => setCardType('Credit Card')}
                            >
                                <Text style={[styles.cardTypeText, cardType === 'Credit Card' && styles.cardTypeTextActive]}>Credit Card</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={[styles.cardTypeButton, cardType === 'Debit Card' && styles.cardTypeButtonActive]}
                                onPress={() => setCardType('Debit Card')}
                            >
                                <Text style={[styles.cardTypeText, cardType === 'Debit Card' && styles.cardTypeTextActive]}>Debit Card</Text>
                            </TouchableOpacity>
                        </View>

                        <View style={styles.cardIconsRow}>
                            <View style={styles.cardIconPlaceholder} />
                            <View style={styles.cardIconPlaceholder} />
                        </View>

                        <Text style={styles.label}>Card Number</Text>
                        <View style={styles.inputWithIcon}>
                            <TextInput
                                style={styles.inputInner}
                                placeholder="XXXX XXXX XXXX XXXX"
                                placeholderTextColor="#9CA3AF"
                                value={cardNumber}
                                onChangeText={(text) => {
                                    // Allow spaces for readability, but validate on clean
                                    // User asked: "card number should not be more than 16 characters" (probably means digits)
                                    // Let's enforce max length of digits
                                    const digits = text.replace(/\D/g, '');
                                    if (digits.length <= 16) {
                                        setCardNumber(text); // Basic input, let them type
                                    }
                                }}
                                keyboardType="number-pad"
                                maxLength={19} // 16 digits + 3 spaces roughly
                            />
                            <Ionicons name="lock-closed" size={20} color="#CBD5E1" />
                        </View>

                        <Text style={styles.label}>Cardholder Name</Text>
                        <Input
                            placeholder="Full Name as on Card"
                            value={cardHolder}
                            onChangeText={setCardHolder}
                            containerStyle={styles.inputContainer}
                        />

                        <View style={styles.row}>
                            <View style={{ flex: 1, marginRight: 15 }}>
                                <Text style={styles.label}>Expiry Date</Text>
                                <Input
                                    placeholder="MM / YY"
                                    value={expiry}
                                    onChangeText={(text) => {
                                        const clean = text.replace(/\D/g, '');
                                        let formatted = clean;
                                        if (clean.length >= 2) {
                                            formatted = clean.slice(0, 2) + '/' + clean.slice(2, 4);
                                        }
                                        setExpiry(formatted);
                                    }}
                                    containerStyle={styles.inputContainer}
                                    maxLength={5}
                                />
                            </View>
                            <View style={{ flex: 1 }}>
                                <Text style={styles.label}>CVV</Text>
                                <View style={styles.inputWithIcon}>
                                    <TextInput
                                        style={styles.inputInner}
                                        placeholder="***"
                                        placeholderTextColor="#9CA3AF"
                                        value={cvv}
                                        onChangeText={(text) => {
                                            // Only allow digits, max 3
                                            const clean = text.replace(/\D/g, '');
                                            if (clean.length <= 3) {
                                                setCvv(clean);
                                            }
                                        }}
                                        keyboardType="number-pad"
                                        secureTextEntry
                                        maxLength={3}
                                    />
                                    <Ionicons name="help-circle" size={20} color="#CBD5E1" />
                                </View>
                            </View>
                        </View>

                        {!id && (
                            <View>
                                <Text style={[styles.sectionHeader, { marginTop: 30 }]}>OR ADD VIA UPI</Text>
                                {/* <Text style={[styles.label, { color: '#6B7280', fontWeight: '400', fontSize: 13 }]}>
                                    You can also add a UPI ID if you prefer.
                                </Text> */}
                            </View>
                        )}
                    </View>
                ) : (
                    <View style={styles.formContainer}>
                        <Text style={styles.sectionHeader}>{id ? 'EDIT UPI ID' : 'OR ADD VIA UPI'}</Text>

                        {/* UPI App Selection */}
                        <Text style={styles.label}>Select UPI App</Text>
                        <View style={styles.cardTypeContainer}>
                            <TouchableOpacity
                                style={[styles.cardTypeButton, upiApp === 'Google Pay' && styles.cardTypeButtonActive]}
                                onPress={() => setUpiApp('Google Pay')}
                            >
                                <Text style={[styles.cardTypeText, upiApp === 'Google Pay' && styles.cardTypeTextActive]}>GPay</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={[styles.cardTypeButton, upiApp === 'PhonePe' && styles.cardTypeButtonActive]}
                                onPress={() => setUpiApp('PhonePe')}
                            >
                                <Text style={[styles.cardTypeText, upiApp === 'PhonePe' && styles.cardTypeTextActive]}>PhonePe</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={[styles.cardTypeButton, upiApp === 'Paytm' && styles.cardTypeButtonActive]}
                                onPress={() => setUpiApp('Paytm')}
                            >
                                <Text style={[styles.cardTypeText, upiApp === 'Paytm' && styles.cardTypeTextActive]}>Paytm</Text>
                            </TouchableOpacity>
                        </View>

                        <Text style={styles.label}>UPI ID</Text>
                        <View style={styles.inputWithIcon}>
                            <TextInput
                                style={styles.inputInner}
                                placeholder="username@bankid"
                                placeholderTextColor="#9CA3AF"
                                value={upiId}
                                onChangeText={setUpiId}
                                autoCapitalize="none"
                            />
                            <View style={styles.upiIconSuffix}>
                                <Ionicons name="flash" size={14} color="#6B7280" />
                                <Text style={styles.upiTextSuffix}>UPI</Text>
                            </View>
                        </View>
                    </View>
                )}
            </ScrollView>

            <View style={styles.footer}>
                <TouchableOpacity style={styles.saveButton} onPress={handleSave}>
                    <Text style={styles.saveButtonText}>SAVE PAYMENT METHOD</Text>
                </TouchableOpacity>
            </View>

            <ActionModal
                visible={modalVisible}
                title={modalConfig.title}
                message={modalConfig.message}
                primaryButtonText={modalConfig.primaryText}
                onPrimaryPress={modalConfig.onPrimary}
                onClose={() => setModalVisible(false)}
                icon={modalConfig.icon}
            />
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#fff',
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 20,
        paddingVertical: 15,
        backgroundColor: '#fff',
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: '700',
        color: '#1a1a1a',
    },
    content: {
        padding: 20,
        paddingBottom: 100
    },
    toggleContainer: {
        flexDirection: 'row',
        backgroundColor: '#F3F4F6',
        borderRadius: 12,
        padding: 4,
        marginBottom: 30,
        height: 50
    },
    toggleButton: {
        flex: 1,
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        borderRadius: 10,
    },
    toggleButtonActive: {
        backgroundColor: '#fff',
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 2,
        elevation: 2,
    },
    toggleText: {
        fontSize: 14,
        fontWeight: '600',
        color: '#6B7280',
    },
    toggleTextActive: {
        color: '#1a1a1a',
    },
    formContainer: {
        // 
    },
    sectionHeader: {
        fontSize: 14,
        fontWeight: '700',
        color: '#1a1a1a',
        marginBottom: 20,
        textTransform: 'uppercase',
        letterSpacing: 0.5
    },
    cardIconsRow: {
        position: 'absolute',
        right: 0,
        top: -5,
        flexDirection: 'row',
        gap: 8
    },
    cardIconPlaceholder: {
        width: 24,
        height: 16,
        backgroundColor: '#D1D5DB',
        borderRadius: 2
    },
    label: {
        fontSize: 13,
        fontWeight: '600',
        color: '#64748B',
        marginBottom: 8,
    },
    inputContainer: {
        marginTop: 0,
        marginBottom: 20,
        borderColor: '#E2E8F0'
    },
    inputWithIcon: {
        flexDirection: 'row',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#E2E8F0',
        borderRadius: 12,
        paddingHorizontal: 16,
        height: 50,
        marginBottom: 20,
        backgroundColor: '#fff'
    },
    inputInner: {
        flex: 1,
        fontSize: 16,
        color: '#1a1a1a',
        height: '100%'
    },
    row: {
        flexDirection: 'row',
    },
    upiIconSuffix: {
        flexDirection: 'row',
        alignItems: 'center',
        opacity: 0.6
    },
    upiTextSuffix: {
        fontSize: 10,
        fontWeight: '800',
        marginLeft: 2,
        color: '#6B7280'
    },
    footer: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        padding: 20,
        backgroundColor: '#fff', // or gradient fade
        paddingBottom: 30
    },
    saveButton: {
        backgroundColor: '#FFD700',
        borderRadius: 12,
        height: 50,
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: '#FFD700',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 4,
    },
    saveButtonText: {
        fontSize: 16,
        fontWeight: '800',
        color: '#1a1a1a',
    },
    cardTypeContainer: {
        flexDirection: 'row',
        gap: 12,
        marginBottom: 20,
    },
    cardTypeButton: {
        flex: 1,
        paddingVertical: 10,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: '#E2E8F0',
        alignItems: 'center',
        backgroundColor: '#fff',
    },
    cardTypeButtonActive: {
        backgroundColor: '#1a1a1a',
        borderColor: '#1a1a1a',
    },
    cardTypeText: {
        fontSize: 14,
        fontWeight: '600',
        color: '#64748B',
    },
    cardTypeTextActive: {
        color: '#fff',
    }
});
