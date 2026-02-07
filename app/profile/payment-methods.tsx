import ActionModal from '@/components/common/ActionModal';
import { Colors } from '@/constants/Colors';
import { PaymentCard, PaymentUPI, usePayment } from '@/context/PaymentContext';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

export default function ProfilePaymentMethodsScreen() {
    const router = useRouter();
    const { cards, upis, deleteCard, deleteUPI } = usePayment();

    const [modalVisible, setModalVisible] = useState(false);
    const [itemToDelete, setItemToDelete] = useState<{ type: 'Card' | 'UPI', id: string } | null>(null);

    const confirmDelete = (type: 'Card' | 'UPI', id: string) => {
        setItemToDelete({ type, id });
        setModalVisible(true);
    };

    const handleDelete = () => {
        if (itemToDelete) {
            if (itemToDelete.type === 'Card') {
                deleteCard(itemToDelete.id);
            } else {
                deleteUPI(itemToDelete.id);
            }
        }
        setModalVisible(false);
        setItemToDelete(null);
    };

    const handleEdit = (type: 'Card' | 'UPI', id: string) => {
        router.push({
            pathname: '/profile/add-payment-method',
            params: { id, type }
        });
    };

    const renderSavedCard = (card: PaymentCard) => {
        return (
            <TouchableOpacity
                key={card.id}
                activeOpacity={0.9}
                style={[styles.cardContainer]}
                onPress={() => { }}
            >
                <View style={styles.cardHeader}>
                    <View style={styles.bankInfo}>
                        <View style={styles.bankIcon}>
                            <Ionicons name={card.iconName} size={24} color={card.iconColor} />
                        </View>
                        <View>
                            <Text style={styles.bankName}>{card.bankName}</Text>
                            <Text style={styles.cardType}>{card.cardType.toUpperCase()}</Text>
                        </View>
                    </View>
                    <View style={styles.cardActions}>
                        <TouchableOpacity style={styles.actionIcon} onPress={() => handleEdit('Card', card.id)}>
                            <Ionicons name="pencil" size={18} color="#90A4AE" />
                        </TouchableOpacity>
                        <TouchableOpacity style={styles.actionIcon} onPress={() => confirmDelete('Card', card.id)}>
                            <Ionicons name="trash" size={18} color="#90A4AE" />
                        </TouchableOpacity>
                    </View>
                </View>

                <View style={styles.cardNumberContainer}>
                    <Text style={styles.cardNumberDots}>••••   ••••   ••••</Text>
                    <Text style={styles.cardNumberLast}>{card.cardNumber.slice(-4)}</Text>
                </View>

                <View style={styles.cardFooter}>
                    <Text style={styles.expiryText}>EXP {card.expiryDate}</Text>
                    <View style={styles.cardNetworkIcon}>
                        <Ionicons name="card" size={20} color="#757575" />
                    </View>
                </View>
            </TouchableOpacity>
        );
    };

    const renderUpiOption = (upi: PaymentUPI) => {
        return (
            <TouchableOpacity
                key={upi.id}
                style={[styles.upiContainer]}
                onPress={() => { }}
            >
                <View style={styles.upiLeft}>
                    <View style={styles.upiIcon}>
                        <Ionicons name="wallet" size={24} color="#4285F4" />
                    </View>
                    <View>
                        <Text style={styles.upiLabel}>{upi.label}</Text>
                        <Text style={styles.upiSubLabel}>{upi.subLabel}</Text>
                    </View>
                </View>
                <View style={styles.upiActions}>
                    <TouchableOpacity style={styles.editButton} onPress={() => handleEdit('UPI', upi.id)}>
                        <Text style={styles.editButtonText}>EDIT</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.removeButton} onPress={() => confirmDelete('UPI', upi.id)}>
                        <Text style={styles.removeButtonText}>REMOVE</Text>
                    </TouchableOpacity>
                </View>
            </TouchableOpacity>
        );
    }

    return (
        <View style={styles.mainContainer}>
            {/* Header */}
            <View style={styles.headerContainer}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                    <Ionicons name="chevron-back" size={24} color="#000" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Payment Methods</Text>
                <View style={{ width: 40 }} />
            </View>

            <ScrollView style={styles.scrollContainer} contentContainerStyle={styles.contentContainer} showsVerticalScrollIndicator={false}>

                {/* Saved Cards */}
                <View style={styles.sectionHeaderRow}>
                    <Text style={styles.sectionTitle}>Saved Cards</Text>
                    <Text style={styles.cardCount}>{cards.length} CARDS</Text>
                </View>

                {cards.map(renderSavedCard)}

                {/* UPI IDs */}
                <View style={styles.sectionHeaderRow}>
                    <Text style={styles.sectionTitle}>UPI IDs</Text>
                </View>

                {upis.map(renderUpiOption)}

                {/* Add New Method Button */}
                <TouchableOpacity
                    style={styles.addButton}
                    onPress={() => router.push('/profile/add-payment-method')}
                >
                    <Ionicons name="add-circle-outline" size={24} color="#000" />
                    <Text style={styles.addButtonText}>ADD NEW PAYMENT METHOD</Text>
                </TouchableOpacity>

                <View style={{ height: 40 }} />
            </ScrollView>

            <ActionModal
                visible={modalVisible}
                title="Delete Payment Method"
                message="Are you sure you want to delete this payment method?"
                primaryButtonText="DELETE"
                onPrimaryPress={handleDelete}
                secondaryButtonText="CANCEL"
                onSecondaryPress={() => setModalVisible(false)}
                onClose={() => setModalVisible(false)}
                icon="trash"
            />
        </View>
    );
}

const styles = StyleSheet.create({
    mainContainer: {
        flex: 1,
        backgroundColor: '#F8F9FA',
    },
    headerContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 20,
        paddingTop: 60,
        paddingBottom: 30,
        backgroundColor: Colors.light.tint, // Yellow
        borderBottomLeftRadius: 30,
        borderBottomRightRadius: 30,
        justifyContent: 'space-between',
        zIndex: 10,
    },
    backButton: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: 'rgba(255,255,255,0.3)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    headerTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#000',
    },
    scrollContainer: {
        flex: 1,
        marginTop: 10,
    },
    contentContainer: {
        padding: 20,
    },
    sectionHeaderRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 15,
        marginTop: 10,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#000',
    },
    cardCount: {
        fontSize: 12,
        fontWeight: 'bold',
        color: '#90A4AE',
        letterSpacing: 1,
    },
    // Card Styles
    cardContainer: {
        backgroundColor: '#fff',
        borderRadius: 24,
        padding: 24,
        marginBottom: 16,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 10,
        elevation: 2,
        borderWidth: 2,
        borderColor: 'transparent',
    },
    cardHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: 30,
    },
    bankInfo: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    bankIcon: {
        width: 48,
        height: 48,
        borderRadius: 24,
        backgroundColor: '#fff',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 16,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
    },
    bankName: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#000',
        marginBottom: 2,
    },
    cardType: {
        fontSize: 10,
        fontWeight: 'bold',
        color: '#90A4AE',
        letterSpacing: 1,
    },
    cardActions: {
        flexDirection: 'row',
        gap: 15,
    },
    actionIcon: {
        padding: 4,
    },
    cardNumberContainer: {
        marginBottom: 10,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 15,
    },
    cardNumberDots: {
        fontSize: 24,
        fontWeight: '900',
        color: '#000',
        letterSpacing: 2,
        marginTop: 5,
    },
    cardNumberLast: {
        fontSize: 20,
        fontWeight: '500',
        color: '#000',
        letterSpacing: 2,
    },
    cardFooter: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-end',
    },
    expiryText: {
        fontSize: 12,
        color: '#90A4AE',
        fontWeight: '600',
        letterSpacing: 0.5,
    },
    cardNetworkIcon: {
        width: 36,
        height: 24,
        backgroundColor: '#EEEEEE',
        borderRadius: 4,
        justifyContent: 'center',
        alignItems: 'center',
    },

    // UPI Styles
    upiContainer: {
        backgroundColor: '#F3F6FA', // Light blueish grey
        borderRadius: 24,
        padding: 20,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 30, // Space before button
    },
    upiLeft: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    upiIcon: {
        width: 48,
        height: 48,
        borderRadius: 16,
        backgroundColor: '#fff', // White box for logo
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 16,
    },
    upiLabel: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#000',
    },
    upiSubLabel: {
        fontSize: 14,
        color: '#757575',
    },
    upiActions: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 15,
    },
    editButton: {
        backgroundColor: '#F8F1D8', // Light yellow bg
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 8,
    },
    editButtonText: {
        fontSize: 10,
        fontWeight: 'bold',
        color: '#000',
        letterSpacing: 0.5,
    },
    removeButton: {
    },
    removeButtonText: {
        fontSize: 10,
        fontWeight: 'bold',
        color: '#F44336',
        letterSpacing: 0.5,
    },

    // Add Method Button
    addButton: {
        backgroundColor: Colors.light.tint,
        borderRadius: 16,
        paddingVertical: 18,
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 20,
        shadowColor: Colors.light.tint,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.4,
        shadowRadius: 10,
        elevation: 6,
    },
    addButtonText: {
        fontSize: 14,
        fontWeight: 'bold',
        color: '#000',
        marginLeft: 10,
        letterSpacing: 0.5,
    },
});
