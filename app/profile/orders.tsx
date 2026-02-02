import { Feather } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useMemo, useState } from 'react';
import { FlatList, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import SearchBar from '../../components/SearchBar';
import OrderCard, { Order } from '../../components/profile/OrderCard';
import OrderFilters from '../../components/profile/OrderFilters';

import { PRODUCTS } from '../../constants/products';

// Helper to get product details
const getProduct = (id: string) => PRODUCTS.find(p => p.id === id) || PRODUCTS[0];

// Mock Data
const ORDERS: Order[] = [
    {
        id: '1',
        orderNumber: 'ZP-29402',
        date: '14 Oct, 2023',
        total: `₹${getProduct('1').price}`,
        status: 'Processing',
        items: [
            { name: getProduct('1').name, image: getProduct('1').image },
        ],
    },
    {
        id: '2',
        orderNumber: 'ZP-28511',
        date: '08 Oct, 2023',
        total: `₹${getProduct('2').price}`,
        status: 'Delivered',
        items: [
            { name: getProduct('2').name, image: getProduct('2').image },
        ],
    },
    {
        id: '3',
        orderNumber: 'ZP-28399',
        date: '22 Sep, 2023',
        total: `₹${getProduct('5').price}`,
        status: 'Delivered',
        items: [
            { name: getProduct('5').name, image: getProduct('5').image },
        ],
    },
    {
        id: '4',
        orderNumber: 'ZP-27104',
        date: '15 Sep, 2023',
        total: `₹${getProduct('9').price}`,
        status: 'Cancelled',
        items: [
            { name: getProduct('9').name, image: getProduct('9').image },
        ],
    },
];

export default function AllOrdersScreen() {
    const router = useRouter();
    const [searchQuery, setSearchQuery] = useState('');
    const [activeFilter, setActiveFilter] = useState('All');

    const filteredOrders = useMemo(() => {
        return ORDERS.filter((order) => {
            // Filter by Status
            if (activeFilter !== 'All') {
                if (activeFilter === 'In Progress' && order.status !== 'Processing' && order.status !== 'Shipped') return false;
                if (activeFilter === 'Completed' && order.status !== 'Delivered') return false;
                if (activeFilter === 'Cancelled' && order.status !== 'Cancelled') return false;
            }

            // Filter by Search Query
            if (searchQuery) {
                const query = searchQuery.toLowerCase();
                const matchesId = order.orderNumber.toLowerCase().includes(query);
                const matchesItem = order.items.some((item) => item.name.toLowerCase().includes(query));
                return matchesId || matchesItem;
            }

            return true;
        });
    }, [activeFilter, searchQuery]);

    const renderHeader = () => (
        <View style={styles.header}>
            <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
                <Feather name="chevron-left" size={28} color="#1a1a1a" />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>My Orders</Text>
            <TouchableOpacity>
                <Feather name="help-circle" size={24} color="#1a1a1a" />
            </TouchableOpacity>
        </View>
    );

    return (
        <SafeAreaView style={styles.container}>
            {renderHeader()}

            <View style={styles.searchSection}>
                <SearchBar
                    placeholder="Search by Order ID or Item Name"
                    value={searchQuery}
                    onChangeText={setSearchQuery}
                />
            </View>

            <View style={styles.filterSection}>
                <OrderFilters
                    selectedFilter={activeFilter}
                    onSelectFilter={setActiveFilter}
                />
            </View>

            <FlatList
                data={filteredOrders}
                renderItem={({ item }) => (
                    <OrderCard
                        order={item}
                        onPress={() => router.push({
                            pathname: '/profile/order-details',
                            params: { orderId: item.orderNumber }
                        })}
                        onTrack={() => { }} // Navigate to Track Order
                        onBuyAgain={() => { }} // Add to Cart
                    />
                )}
                keyExtractor={(item) => item.id}
                contentContainerStyle={styles.listContent}
                showsVerticalScrollIndicator={false}
                ListFooterComponent={
                    <Text style={styles.footerText}>You've reached the end of your orders</Text>
                }
            />
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#F8F9FA',
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
    searchSection: {
        backgroundColor: '#fff',
        paddingTop: 10,
    },
    filterSection: {
        backgroundColor: '#fff',
        paddingBottom: 5,
    },
    listContent: {
        padding: 20,
        paddingBottom: 40,
    },
    footerText: {
        textAlign: 'center',
        color: '#9CA3AF',
        marginTop: 20,
        marginBottom: 20,
        fontSize: 14,
    },
});
