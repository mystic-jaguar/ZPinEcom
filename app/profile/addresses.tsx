import { Feather } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React from 'react';
import { FlatList, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAddress } from '../../context/AddressContext';

export default function SavedAddressesScreen() {
    const { addresses, removeAddress, setDefaultAddress } = useAddress();
    const router = useRouter();

    const renderItem = ({ item }: { item: any }) => (
        <View style={[styles.addressCard, item.isDefault && styles.defaultCard]}>
            <View style={styles.cardHeader}>
                <View style={styles.typeTag}>
                    <Feather
                        name={item.type === 'Home' ? 'home' : item.type === 'Work' ? 'briefcase' : 'map-pin'}
                        size={12}
                        color="#1a1a1a"
                    />
                    <Text style={styles.typeText}>{item.type}</Text>
                </View>
                <View style={styles.actions}>
                    {!item.isDefault && (
                        <TouchableOpacity onPress={() => setDefaultAddress(item.id)} style={styles.setDefaultBtn}>
                            <Text style={styles.setDefaultText}>Set Default</Text>
                        </TouchableOpacity>
                    )}
                    <TouchableOpacity onPress={() => removeAddress(item.id)} style={styles.deleteBtn}>
                        <Feather name="trash-2" size={16} color="#EF4444" />
                    </TouchableOpacity>
                </View>
            </View>

            <View style={styles.details}>
                <Text style={styles.name}>{item.name}</Text>
                <Text style={styles.addressText}>{item.addressLine}</Text>
                <Text style={styles.addressText}>{item.landmark ? `${item.landmark}, ` : ''}{item.city}, {item.state} - {item.pincode}</Text>
                <Text style={styles.addressText}>{item.country}</Text>
                <Text style={styles.phone}>Mobile: {item.phoneNumber}</Text>
            </View>

            {item.isDefault && (
                <View style={styles.defaultBadge}>
                    <Feather name="check-circle" size={12} color="#fff" />
                    <Text style={styles.defaultBadgeText}>Default</Text>
                </View>
            )}
        </View>
    );

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
                    <Feather name="arrow-left" size={24} color="#1a1a1a" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Saved Addresses</Text>
                <TouchableOpacity onPress={() => { /* Mock Add */ }}>
                    <Feather name="plus" size={24} color="#1a1a1a" />
                </TouchableOpacity>
            </View>

            <FlatList
                data={addresses}
                renderItem={renderItem}
                keyExtractor={item => item.id}
                contentContainerStyle={styles.listContent}
                showsVerticalScrollIndicator={false}
                ListHeaderComponent={
                    <TouchableOpacity style={styles.addNewCard} onPress={() => router.push('/profile/add-address')}>
                        <View style={styles.plusIconBg}>
                            <Feather name="plus" size={20} color="#FBBF24" />
                        </View>
                        <Text style={styles.addNewText}>Add New Address</Text>
                    </TouchableOpacity>
                }
            />
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#F8F9FA'
    },
    header: {
        paddingHorizontal: 20,
        paddingVertical: 15,
        backgroundColor: '#fff',
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 5,
        elevation: 2,
        zIndex: 10
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#1a1a1a'
    },
    backBtn: {
        padding: 5
    },
    listContent: {
        padding: 20
    },
    addNewCard: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#fff',
        padding: 16,
        borderRadius: 12,
        marginBottom: 20,
        borderWidth: 1,
        borderColor: '#FBBF24',
        borderStyle: 'dashed'
    },
    plusIconBg: {
        width: 32,
        height: 32,
        borderRadius: 16,
        backgroundColor: '#FFFBE6',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12
    },
    addNewText: {
        fontSize: 16,
        fontWeight: '600',
        color: '#FBBF24'
    },
    addressCard: {
        backgroundColor: '#fff',
        borderRadius: 16,
        padding: 16,
        marginBottom: 16,
        borderWidth: 1,
        borderColor: 'transparent',
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.03,
        shadowRadius: 8,
        elevation: 2,
        position: 'relative'
    },
    defaultCard: {
        borderColor: '#FBBF24',
        backgroundColor: '#FFFCF2'
    },
    cardHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 12
    },
    typeTag: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#f3f4f6',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 6
    },
    typeText: {
        fontSize: 12,
        fontWeight: '600',
        color: '#1a1a1a',
        marginLeft: 4
    },
    actions: {
        flexDirection: 'row',
        alignItems: 'center'
    },
    setDefaultBtn: {
        marginRight: 15
    },
    setDefaultText: {
        fontSize: 12,
        fontWeight: '600',
        color: '#FBBF24'
    },
    deleteBtn: {
        padding: 4
    },
    details: {
        marginTop: 4
    },
    name: {
        fontSize: 16,
        fontWeight: '700',
        color: '#1a1a1a',
        marginBottom: 4
    },
    addressText: {
        fontSize: 14,
        color: '#666',
        marginBottom: 2,
        lineHeight: 20
    },
    phone: {
        fontSize: 14,
        color: '#1a1a1a',
        marginTop: 8,
        fontWeight: '500'
    },
    defaultBadge: {
        position: 'absolute',
        top: -10,
        right: 20,
        backgroundColor: '#FBBF24',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 12,
        flexDirection: 'row',
        alignItems: 'center',
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3
    },
    defaultBadgeText: {
        fontSize: 10,
        fontWeight: '700',
        color: '#fff',
        marginLeft: 4
    }
});
