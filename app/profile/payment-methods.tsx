import { Colors } from '@/constants/Colors';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

export default function ProfilePaymentMethodsScreen() {
    const router = useRouter();
    // In a real app, we would fetch saved methods from a user context or API
    // For now, we use the same mock data as the design

    // --- Mock Data Rendering Helper ---
    const renderSavedCard = (id: string, bankName: string, cardType: string, number: string, expiry: string, iconName: any, iconColor: string) => {
        return (
            <TouchableOpacity
                activeOpacity={0.9}
                style={[styles.cardContainer]}
                onPress={() => { }}
            >
                <View style={styles.cardHeader}>
                    <View style={styles.bankInfo}>
                        <View style={styles.bankIcon}>
                            <Ionicons name={iconName} size={24} color={iconColor} />
                        </View>
                        <View>
                            <Text style={styles.bankName}>{bankName}</Text>
                            <Text style={styles.cardType}>{cardType}</Text>
                        </View>
                    </View>
                    <View style={styles.cardActions}>
                        <TouchableOpacity style={styles.actionIcon}>
                            <Ionicons name="pencil" size={18} color="#90A4AE" />
                        </TouchableOpacity>
                        <TouchableOpacity style={styles.actionIcon}>
                            <Ionicons name="trash" size={18} color="#90A4AE" />
                        </TouchableOpacity>
                    </View>
                </View>

                <View style={styles.cardNumberContainer}>
                    <Text style={styles.cardNumberDots}>••••   ••••   ••••</Text>
                    <Text style={styles.cardNumberLast}>{number}</Text>
                </View>

                <View style={styles.cardFooter}>
                    <Text style={styles.expiryText}>{expiry}</Text>
                    {/* Mock Card Type Icon */}
                    <View style={styles.cardNetworkIcon}>
                        <Ionicons name="card" size={20} color="#757575" />
                    </View>
                </View>
            </TouchableOpacity>
        );
    };

    const renderUpiOption = (id: string, label: string, subLabel: string, logoName: any, logoColor: string) => {
        return (
            <TouchableOpacity
                style={[styles.upiContainer]}
                onPress={() => { }}
            >
                <View style={styles.upiLeft}>
                    <View style={styles.upiIcon}>
                        <Ionicons name={logoName} size={24} color={logoColor} />
                    </View>
                    <View>
                        <Text style={styles.upiLabel}>{label}</Text>
                        <Text style={styles.upiSubLabel}>{subLabel}</Text>
                    </View>
                </View>
                <View style={styles.upiActions}>
                    <TouchableOpacity style={styles.editButton}>
                        <Text style={styles.editButtonText}>EDIT</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.removeButton}>
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
                    <Text style={styles.cardCount}>2 CARDS</Text>
                </View>

                {renderSavedCard('hdfc_credit', 'HDFC Bank', 'CREDIT CARD', '1 2 3 4', 'EXP 09/28', 'business', '#1565C0')}
                {renderSavedCard('icici_debit', 'ICICI Bank', 'DEBIT CARD', '5 6 7 8', 'EXP 12/26', 'home', '#E65100')}

                {/* UPI IDs */}
                <View style={styles.sectionHeaderRow}>
                    <Text style={styles.sectionTitle}>UPI IDs</Text>
                </View>

                {renderUpiOption('google_pay', 'Google Pay', 'sarahj@okaxis', 'wallet', '#4285F4')}

                {/* Add New Method Button */}
                <TouchableOpacity style={styles.addMethodButton}>
                    <Ionicons name="add-circle" size={24} color="#000" />
                    <Text style={styles.addMethodText}>ADD NEW PAYMENT METHOD</Text>
                </TouchableOpacity>

                <View style={{ height: 40 }} />
            </ScrollView>
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
    addMethodButton: {
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
    addMethodText: {
        fontSize: 14,
        fontWeight: 'bold',
        color: '#000',
        marginLeft: 10,
        letterSpacing: 0.5,
    },
});
