import { Feather } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { FlatList, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import CouponCard, { CouponStatus, CouponType } from '../../components/Coupons/CouponCard';

interface Coupon {
    id: string;
    title: string;
    discount: string;
    description: string;
    code: string;
    expiry: string;
    type: CouponType;
    status: CouponStatus;
}

const couponsData: Coupon[] = [
    {
        id: '1',
        title: 'FASHION50',
        discount: '50%',
        description: 'Get 50% off on your first summer collection purchase.',
        code: 'FASHION50',
        expiry: '2 days left',
        type: 'Fashion',
        status: 'active',
    },
    {
        id: '2',
        title: 'SNEAK20',
        discount: '₹200',
        description: 'Flat discount on all Nike and Adidas sneakers.',
        code: 'SNEAK20',
        expiry: 'Dec 31',
        type: 'Footwear',
        status: 'active',
    },
    {
        id: '3',
        title: 'GLOW15',
        discount: '15%',
        description: 'Skincare products discount for premium members.',
        code: 'GLOW15',
        expiry: 'Expired',
        type: 'Beauty',
        status: 'used',
    },
    {
        id: '4',
        title: 'FREESHIP',
        discount: 'FREE',
        description: 'Free shipping on all orders above $50.',
        code: 'FREESHIP',
        expiry: 'Jan 15',
        type: 'Free Shipping',
        status: 'active',
    },
];

const TABS = ['All', 'Fashion', 'Footwear', 'Beauty'];

export default function CouponsScreen() {
    const router = useRouter();
    const [selectedTab, setSelectedTab] = useState('All');

    const filteredCoupons = couponsData.filter(coupon =>
        selectedTab === 'All' || coupon.type === selectedTab
    );

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
            {/* Yellow Background for Header Area */}
            <View style={styles.headerBackground}>
                <SafeAreaView edges={['top']}>
                    {renderHeader()}
                </SafeAreaView>
            </View>

            <View style={styles.contentContainer}>
                {/* Tabs */}
                <View style={styles.tabsContainer}>
                    <FlatList
                        horizontal
                        data={TABS}
                        showsHorizontalScrollIndicator={false}
                        contentContainerStyle={styles.tabsContent}
                        keyExtractor={(item) => item}
                        renderItem={({ item }) => (
                            <TouchableOpacity
                                style={[
                                    styles.tab,
                                    selectedTab === item && styles.activeTab
                                ]}
                                onPress={() => setSelectedTab(item)}
                            >
                                <Text style={[
                                    styles.tabText,
                                    selectedTab === item && styles.activeTabText
                                ]}>{item}</Text>
                            </TouchableOpacity>
                        )}
                    />
                </View>

                {/* Coupon List */}
                <FlatList
                    data={filteredCoupons}
                    keyExtractor={(item) => item.id}
                    contentContainerStyle={styles.listContent}
                    renderItem={({ item }) => (
                        <CouponCard
                            title={item.title}
                            discount={item.discount}
                            description={item.description}
                            code={item.code}
                            expiry={item.expiry}
                            type={item.type}
                            status={item.status}
                        />
                    )}
                    showsVerticalScrollIndicator={false}
                />
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
});
