import { Feather } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useMemo, useState } from 'react';
import { FlatList, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import SearchBar from '../../components/SearchBar';
import OrderCard, { Order } from '../../components/profile/OrderCard';
import OrderFilters from '../../components/profile/OrderFilters';

// Mock Data
const ORDERS: Order[] = [
    {
        id: '1',
        orderNumber: 'ZP-29402',
        date: '14 Oct, 2023',
        total: '₹3,499.00',
        status: 'Processing',
        items: [
            { name: 'Jacket', image: require('../../assets/images/winterwear.jpg') },
        ],
    },
    {
        id: '2',
        orderNumber: 'ZP-28511',
        date: '08 Oct, 2023',
        total: '₹1,250.00',
        status: 'Delivered',
        items: [
            { name: 'Backpack', image: require('../../assets/images/backpacks.jpg') },
        ],
    },
    {
        id: '3',
        orderNumber: 'ZP-28399',
        date: '22 Sep, 2023',
        total: '₹5,999.00',
        status: 'Delivered',
        items: [
            { name: 'Watch', image: require('../../assets/images/analog.jpg') },
        ],
    },
    {
        id: '4',
        orderNumber: 'ZP-27104',
        date: '15 Sep, 2023',
        total: '₹2,199.00',
        status: 'Cancelled',
        items: [
            { name: 'Sunglasses', image: require('../../assets/images/sunglasses.jpg') },
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
                        onPress={() => { }} // Navigate to Order Details
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
