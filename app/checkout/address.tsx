import { CheckoutProgress } from '@/components/checkout/CheckoutProgress';
import { Colors } from '@/constants/Colors';
import { useAddress } from '@/context/AddressContext';
import { useCheckout } from '@/context/CheckoutContext';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

export default function CheckoutAddressScreen() {
    const router = useRouter();
    const { addresses } = useAddress();
    const { selectedAddressId, setSelectedAddressId } = useCheckout();

    // Set default selection if none selected
    React.useEffect(() => {
        if (!selectedAddressId && addresses.length > 0) {
            const defaultAddr = addresses.find(a => a.isDefault) || addresses[0];
            setSelectedAddressId(defaultAddr.id);
        }
    }, [addresses, selectedAddressId]);

    const handleAddressSelect = (id: string) => {
        setSelectedAddressId(id);
    };

    const handleConfirm = () => {
        if (selectedAddressId) {
            router.push('/checkout/summary');
        } else {
            // Should theoretically prompt user to select address, but auto-selection handles most cases
            alert("Please select an address");
        }
    };

    const renderAddressItem = ({ item }: { item: any }) => {
        const isSelected = selectedAddressId === item.id;
        return (
            <TouchableOpacity
                activeOpacity={0.9}
                style={[styles.card, isSelected && styles.selectedCard]}
                onPress={() => handleAddressSelect(item.id)}
            >
                <View style={styles.cardHeader}>
                    <View style={styles.radioButtonContainer}>
                        <View style={[
                            styles.radioButton,
                            isSelected && styles.radioButtonSelected
                        ]}>
                            {isSelected && <View style={styles.radioButtonInner} />}
                        </View>
                    </View>
                    <Text style={styles.name}>{item.name}</Text>
                    <View style={styles.tagContainer}>
                        <Text style={styles.tagText}>{item.type.toUpperCase()}</Text>
                    </View>
                </View>

                <View style={styles.addressContent}>
                    <Text style={styles.addressText}>
                        {item.addressLine}, {item.city},
                    </Text>
                    <Text style={styles.addressText}>
                        {item.state} {item.pincode}, {item.country}
                    </Text>
                    <Text style={styles.phoneText}>
                        +91 {item.phoneNumber}
                    </Text>
                </View>

                <View style={styles.actionRow}>
                    <TouchableOpacity
                        style={styles.editBtn}
                        onPress={() => router.push({ pathname: '/profile/add-address', params: { id: item.id } })}
                    >
                        <Text style={styles.editText}>EDIT ADDRESS</Text>
                    </TouchableOpacity>
                    <TouchableOpacity>
                        <Ionicons name="trash-outline" size={20} color="#9E9E9E" />
                    </TouchableOpacity>
                </View>
            </TouchableOpacity>
        );
    };

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                    <Ionicons name="chevron-back" size={24} color="#000" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Shipping Address</Text>
            </View>

            <CheckoutProgress currentStep={1} />

            <ScrollView style={styles.scrollContainer} contentContainerStyle={styles.contentContainer}>
                {addresses.map(item => (
                    <View key={item.id} style={{ marginBottom: 16 }}>
                        {renderAddressItem({ item })}
                    </View>
                ))}

                <TouchableOpacity
                    style={styles.addNewCard}
                    onPress={() => router.push('/profile/add-address')}
                >
                    <View style={styles.addIconCircle}>
                        <Ionicons name="add" size={24} color={Colors.light.tint} />
                    </View>
                    <Text style={styles.addNewText}>Add New Address</Text>
                </TouchableOpacity>
            </ScrollView>

            <View style={styles.footer}>
                <TouchableOpacity
                    style={styles.confirmButton}
                    onPress={handleConfirm}
                >
                    <Text style={styles.confirmButtonText}>Confirm Address</Text>
                    <Ionicons name="chevron-forward" size={20} color="#000" />
                </TouchableOpacity>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#F8F9FA',
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingTop: 50,
        paddingBottom: 15,
        backgroundColor: '#fff',
    },
    backButton: {
        padding: 5,
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        marginLeft: 10,
        flex: 1,
        textAlign: 'center',
        marginRight: 40, // Balance the back button
    },
    scrollContainer: {
        flex: 1,
    },
    contentContainer: {
        padding: 16,
    },
    card: {
        backgroundColor: '#fff',
        borderRadius: 12,
        padding: 16,
        marginBottom: 0, // Handled by parent view for spacing
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 5,
        elevation: 2,
        borderWidth: 1,
        borderColor: 'transparent',
    },
    selectedCard: {
        borderColor: 'transparent', // Design doesn't show border, but maybe slight elevation change?
    },
    cardHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 10,
    },
    radioButtonContainer: {
        marginRight: 10,
    },
    radioButton: {
        height: 20,
        width: 20,
        borderRadius: 10,
        borderWidth: 1,
        borderColor: '#E0E0E0',
        alignItems: 'center',
        justifyContent: 'center',
    },
    radioButtonSelected: {
        borderColor: Colors.light.tint, // Warning color or Theme color
    },
    radioButtonInner: {
        height: 10,
        width: 10,
        borderRadius: 5,
        backgroundColor: '#FFA726', // Orange-ish color from design
    },
    name: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#000',
        marginRight: 10,
    },
    tagContainer: {
        backgroundColor: '#FFF8E1',
        paddingHorizontal: 8,
        paddingVertical: 2,
        borderRadius: 4,
    },
    tagText: {
        fontSize: 10,
        color: '#FFA000',
        fontWeight: 'bold',
    },
    addressContent: {
        marginLeft: 30, // Align with name (skip radio)
    },
    addressText: {
        fontSize: 14,
        color: '#5C6BC0', // Bluish gray text from design? Actually design looks like dark gray/blue
        lineHeight: 20,
    },
    phoneText: {
        fontSize: 14,
        color: '#5C6BC0',
        marginTop: 5,
    },
    actionRow: {
        flexDirection: 'row',
        justifyContent: 'flex-end',
        alignItems: 'center',
        marginTop: 15,
        borderTopWidth: 1,
        borderTopColor: '#f5f5f5',
        paddingTop: 10,
    },
    editBtn: {
        marginRight: 15,
    },
    editText: {
        fontSize: 12,
        fontWeight: 'bold',
        color: '#FFB300',
    },
    addNewCard: {
        borderWidth: 1,
        borderColor: '#FFD54F',
        borderStyle: 'dashed',
        borderRadius: 12,
        padding: 20,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#fff',
        marginTop: 10,
        marginBottom: 30,
    },
    addIconCircle: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: '#FFF8E1',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 10,
    },
    addNewText: {
        fontSize: 14,
        fontWeight: 'bold',
        color: '#000',
    },
    footer: {
        backgroundColor: '#fff',
        padding: 16,
        borderTopWidth: 1,
        borderTopColor: '#EEEEEE',
    },
    confirmButton: {
        backgroundColor: '#FFC107', // Amber/Yellow
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        paddingVertical: 15,
        borderRadius: 12,
        shadowColor: '#FFC107',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 5,
    },
    confirmButtonText: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#000',
        marginRight: 5,
    },
});
