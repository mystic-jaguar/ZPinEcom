import { Feather } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, FlatList, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import CouponCard, { CouponStatus, CouponType } from '../../components/Coupons/CouponCard';
import { useCart } from '../../context/CartContext';

const TABS = ['All', 'Active', 'Expired'];

export default function CouponsScreen() {
    const router = useRouter();
    const { availableCoupons } = useCart();
    const [selectedTab, setSelectedTab] = useState('All');
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        if (availableCoupons !== undefined) setIsLoading(false);
    }, [availableCoupons]);

    const filteredCoupons = availableCoupons.filter(coupon => {
        if (selectedTab === 'All') return true;
        if (selectedTab === 'Active') return coupon.status === 'active' || !coupon.status;
        if (selectedTab === 'Expired') return coupon.status === 'expired';
        return true;
    });

    const renderHeader = () => (
        <View style={styles.header}>
            <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
                <Feather name="arrow-left" size={24} color="#1A1A1A" />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>My Coupons</Text>
            <View style={{ width: 24 }} />
        </View>
    );

    return (
        <View style={styles.container}>
            <View style={styles.headerBackground}>
                <SafeAreaView edges={['top']}>
                    {renderHeader()}
                </SafeAreaView>
            </View>

            <View style={styles.contentContainer}>
                <View style={styles.tabsContainer}>
                    <FlatList
                        horizontal
                        data={TABS}
                        showsHorizontalScrollIndicator={false}
                        contentContainerStyle={styles.tabsContent}
                        keyExtractor={(item) => item}
                        renderItem={({ item }) => (
                            <TouchableOpacity
                                style={[styles.tab, selectedTab === item && styles.activeTab]}
                                onPress={() => setSelectedTab(item)}
                            >
                                <Text style={[styles.tabText, selectedTab === item && styles.activeTabText]}>
                                    {item}
                                </Text>
                            </TouchableOpacity>
                        )}
                    />
                </View>

                {isLoading ? (
                    <ActivityIndicator style={{ marginTop: 40 }} color="#FFD700" />
                ) : filteredCoupons.length === 0 ? (
                    <View style={styles.emptyContainer}>
                        <Feather name="tag" size={48} color="#E0E0E0" />
                        <Text style={styles.emptyText}>No coupons available</Text>
                    </View>
                ) : (
                    <FlatList
                        data={filteredCoupons}
                        keyExtractor={(item) => item.id}
                        contentContainerStyle={styles.listContent}
                        renderItem={({ item }) => (
                            <CouponCard
                                title={item.title || item.code}
                                discount={item.discountType === 'percentage'
                                    ? `${item.discountValue}%`
                                    : `₹${item.discountValue}`}
                                description={item.description}
                                code={item.code}
                                expiry={item.expiryDate
                                    ? new Date(item.expiryDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
                                    : ''}
                                type={(item.type || 'General') as CouponType}
                                status={(item.status || 'active') as CouponStatus}
                            />
                        )}
                        showsVerticalScrollIndicator={false}
                    />
                )}
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#F8F9FA',
    },
    headerBackground: {
        backgroundColor: '#FFD700', // Yellow
        paddingBottom: 20,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 20,
        paddingVertical: 10,
    },
    backBtn: {
        padding: 5,
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: '700',
        color: '#1A1A1A',
    },
    contentContainer: {
        flex: 1,
        backgroundColor: '#F8F9FA',
        marginTop: -20, // Overlap to create rounded effect if needed, but design shows straight cut or maybe rounded tabs
        borderTopLeftRadius: 0,
        borderTopRightRadius: 0,
    },
    tabsContainer: {
        backgroundColor: '#F8F9FA', // Or white? Design looks like pills on white/grey
        paddingVertical: 15,
    },
    tabsContent: {
        paddingHorizontal: 20,
        gap: 10,
    },
    tab: {
        paddingHorizontal: 20,
        paddingVertical: 8,
        borderRadius: 20,
        backgroundColor: '#fff',
        borderWidth: 1,
        borderColor: '#E5E7EB',
        marginRight: 8,
    },
    activeTab: {
        backgroundColor: '#1A1A1A',
        borderColor: '#1A1A1A',
    },
    tabText: {
        fontSize: 14,
        fontWeight: '600',
        color: '#6B7280',
    },
    activeTabText: {
        color: '#fff',
    },
    listContent: {
        paddingBottom: 40,
        paddingTop: 0,
    },
    emptyContainer: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        paddingTop: 80,
    },
    emptyText: {
        marginTop: 16,
        fontSize: 16,
        color: '#9E9E9E',
        fontWeight: '500',
    },
});
