import { Feather } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useMemo, useState } from 'react';
import { FlatList, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import OrderCard from '../../components/profile/OrderCard';
import OrderFilters from '../../components/profile/OrderFilters';
import SearchBar from '../../components/SearchBar';
import { useOrder } from '../../context/OrderContext';

export default function AllOrdersScreen() {
    const router = useRouter();
    const { orders } = useOrder();
    const [searchQuery, setSearchQuery] = useState('');
    const [activeFilter, setActiveFilter] = useState('All');

    const filteredOrders = useMemo(() => {
        return orders.filter((order) => {
            // Filter by Status
            if (activeFilter !== 'All') {
                if (activeFilter === 'In Progress' && order.status !== 'Processing' && order.status !== 'Shipped' && order.status !== 'Unpacked') return false;
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
    }, [activeFilter, searchQuery, orders]);

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
                        order={{
                            id: item.id,
                            orderNumber: item.orderNumber,
                            date: item.date,
                            total: `₹${item.total.toFixed(2)}`,
                            status: item.status === 'Unpacked' ? 'Processing' : item.status, // Map Unpacked to Processing for card display if needed
                            items: item.items.map(i => ({ name: i.name, image: i.image }))
                        }}
                        onPress={() => router.push({
                            pathname: '/profile/order-details',
                            params: { orderId: item.id }
                        })}
                        onTrack={() => router.push({
                            pathname: '/profile/track-order',
                            params: { orderId: item.id }
                        })} // Navigate to Track Order
                        onBuyAgain={() => { }} // Add to Cart
                    />
                )}
                keyExtractor={(item) => item.id}
                contentContainerStyle={styles.listContent}
                showsVerticalScrollIndicator={false}
                ListFooterComponent={
                    <Text style={styles.footerText}>You've reached the end of your orders</Text>
                }
                ListEmptyComponent={
                    <View style={styles.emptyContainer}>
                        <Feather name="shopping-bag" size={48} color="#E5E7EB" />
                        <Text style={styles.emptyText}>No orders found</Text>
                    </View>
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
        flexGrow: 1,
    },
    footerText: {
        textAlign: 'center',
        color: '#9CA3AF',
        marginTop: 20,
        marginBottom: 20,
        fontSize: 14,
    },
    emptyContainer: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: 50
    },
    emptyText: {
        marginTop: 10,
        fontSize: 16,
        color: '#9CA3AF'
    }
});
