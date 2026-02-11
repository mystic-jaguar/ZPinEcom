import { Feather } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { Dimensions, Image, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import ProfileOption from '../../components/profile/ProfileOption';

import ActionModal from '@/components/common/ActionModal';
import { useCart } from '@/context/CartContext';
import { useWishlist } from '@/context/WishlistContext';
import { authService } from '@/services/auth';
import { useUser } from '../../context/UserContext';

const { width } = Dimensions.get('window');

// Mock Recommended Data
const RECOMMENDED = [
    { id: '1', name: 'Bags', desc: 'Starting from ₹499', image: 'https://images.unsplash.com/photo-1584917865442-de89df76afd3?auto=format&fit=crop&w=400&q=80', category: 'Accessories', subCategory: 'Bags' },
    { id: '2', name: 'Headphones', desc: 'Up to 60% OFF', image: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?auto=format&fit=crop&w=400&q=80', category: 'Gadgets', subCategory: 'Audio Devices' },
    { id: '3', name: 'Watches', desc: 'Min 40% OFF', image: 'https://images.unsplash.com/photo-1524592094714-0f0654e20314?auto=format&fit=crop&w=400&q=80', category: 'Accessories', subCategory: 'Watches' },
    { id: '4', name: 'Sunglasses', desc: 'Stylish & Cool', image: 'https://images.unsplash.com/photo-1511499767150-a48a237f0083?auto=format&fit=crop&w=400&q=80', category: 'Accessories', subCategory: 'Sunglasses' },
    { id: '5', name: 'Wallets', desc: 'Premium Leather', image: 'https://images.unsplash.com/photo-1627123424574-724758594e93?auto=format&fit=crop&w=400&q=80', category: 'Accessories', subCategory: 'Wallets' },
];

export default function ProfileScreen() {
    const { user, resetUser } = useUser();
    const { clearCart } = useCart();
    const { clearWishlist } = useWishlist();
    const router = useRouter();
    const [logoutModalVisible, setLogoutModalVisible] = useState(false);

    const handleLogout = async () => {
        try {
            // Call the auth service to clear tokens and AsyncStorage
            await authService.logout();

            // Clear all context states
            resetUser();
            clearCart();
            clearWishlist();

            // Close modal
            setLogoutModalVisible(false);

            // Navigate to login screen
            router.replace('/auth/login');
        } catch (error) {
            console.error('Logout error:', error);
            setLogoutModalVisible(false);
        }
    };

    const QuickAction = ({ icon, label, onPress }: { icon: any, label: string, onPress: () => void }) => (
        <TouchableOpacity style={styles.quickActionItem} onPress={onPress}>
            <View style={styles.quickActionIcon}>
                <Feather name={icon} size={24} color="#FBBF24" />
            </View>
            <Text style={styles.quickActionLabel}>{label}</Text>
        </TouchableOpacity>
    );

    return (
        <View style={styles.container}>
            {/* Header Background */}
            <View style={styles.headerBg} />

            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>

                {/* Header Content */}
                <SafeAreaView edges={['top']} style={styles.headerSafeArea}>
                    <View style={styles.headerTopRow}>
                        {/* Settings Icon (Placeholder) */}
                        <View style={{ flex: 1 }} />
                        {/* <TouchableOpacity style={styles.settingsButton}>
                            <Feather name="settings" size={20} color="#333" />
                        </TouchableOpacity> */}
                    </View>

                    <View style={styles.profileInfo}>
                        <View style={styles.avatarContainer}>
                            <Image
                                source={
                                    typeof user.profileImage === 'string'
                                        ? { uri: user.profileImage }
                                        : user.profileImage
                                }
                                style={styles.avatar}
                            />
                            <View style={styles.onlineBadge} />
                        </View>
                        <Text style={styles.userName}>{user.name}</Text>

                        {user.isPro && (
                            <View style={styles.proBadge}>
                                <Feather name="star" size={12} color="#333" style={{ marginRight: 4 }} />
                                <Text style={styles.proText}>PRO MEMBER</Text>
                            </View>
                        )}
                    </View>

                    {/* Quick Actions */}
                    <View style={styles.quickActionsRow}>
                        <QuickAction icon="shopping-bag" label="Orders" onPress={() => router.push('/profile/orders')} />
                        <QuickAction icon="heart" label="Wishlist" onPress={() => router.push('/profile/wishlist')} />
                        <QuickAction icon="gift" label="Coupons" onPress={() => router.push('/profile/coupons')} />
                        <QuickAction icon="refresh-cw" label="Refunds" onPress={() => router.push('/profile/returns')} />
                    </View>
                </SafeAreaView>

                {/* Main Content Body */}
                <View style={styles.bodyContent}>

                    {/* Recommended Section */}
                    <View style={styles.sectionHeader}>
                        <Text style={styles.sectionTitle}>Recommended For You</Text>
                        {/* <TouchableOpacity>
                            <Text style={styles.viewAllText}>View All</Text>
                        </TouchableOpacity> */}
                    </View>

                    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.recommendedList}>
                        {RECOMMENDED.map((item) => (
                            <TouchableOpacity key={item.id} style={styles.recommendCard}>
                                <View style={styles.recommendImageContainer}>
                                    <Image source={{ uri: item.image }} style={styles.recommendImage} />
                                </View>
                                <Text style={styles.recommendName}>{item.name}</Text>
                                <Text style={styles.recommendDesc}>{item.desc}</Text>
                            </TouchableOpacity>
                        ))}
                    </ScrollView>

                    {/* Account Settings */}
                    <Text style={[styles.sectionTitle, { marginTop: 20, marginBottom: 15 }]}>Account Settings</Text>
                    <View style={styles.settingsCard}>
                        {/* Edit Profile (Placeholder) */}
                        <ProfileOption
                            label="Edit Profile"
                            icon="user"
                            onPress={() => router.push('/profile/edit-profile')}
                        />
                        <ProfileOption
                            label="Payment Methods"
                            icon="credit-card"
                            onPress={() => router.push('/profile/payment-methods')}
                        />
                        <ProfileOption
                            label="Saved Addresses"
                            icon="map-pin"
                            onPress={() => router.push('/profile/addresses')}
                        />
                        {/* <ProfileOption
                            label="Notifications"
                            icon="bell"
                            onPress={() => router.push('/profile/edit-profile')}
                        /> */}
                        <ProfileOption
                            label="Help & Support"
                            icon="help-circle"
                            onPress={() => router.push('/profile/help-center')}
                        />
                        <ProfileOption
                            label="Logout"
                            icon="log-out"
                            onPress={() => setLogoutModalVisible(true)}
                            isDestructive={true}
                            showBorder={false}
                        />
                    </View>

                    {/* Refer Banner */}
                    <View style={styles.referBanner}>
                        <View style={styles.referContent}>
                            <Text style={styles.referTitle}>Refer a Friend</Text>
                            <Text style={styles.referSubtitle}>Earn ₹100 for every friend you refer to ZPIN.</Text>
                            <TouchableOpacity style={styles.inviteButton}>
                                <Text style={styles.inviteButtonText}>Invite Now</Text>
                            </TouchableOpacity>
                        </View>
                    </View>

                    <View style={{ height: 100 }} />
                </View>
            </ScrollView>

            {/* FAB for Dark Mode (Visual only as per design) */}
            {/* <TouchableOpacity style={styles.fab}>
                <Feather name="moon" size={20} color="#fff" />
            </TouchableOpacity> */}

            {/* Logout Confirmation Modal */}
            <ActionModal
                visible={logoutModalVisible}
                title="Logout"
                message="Are you sure you want to logout?"
                icon="log-out"
                primaryButtonText="LOGOUT"
                onPrimaryPress={handleLogout}
                secondaryButtonText="CANCEL"
                onSecondaryPress={() => setLogoutModalVisible(false)}
                onClose={() => setLogoutModalVisible(false)}
            />
        </View>
    );
}


const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#F3F4F6', // Light gray bg for body
    },
    headerBg: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        height: 380, // Extended height for yellow curve
        backgroundColor: '#FFD700', // Yellow
        borderBottomLeftRadius: 40,
        borderBottomRightRadius: 40,
    },
    headerSafeArea: {
        paddingBottom: 20
    },
    scrollContent: {
        flexGrow: 1
    },
    headerTopRow: {
        flexDirection: 'row',
        justifyContent: 'flex-end',
        paddingHorizontal: 20,
        marginBottom: 10
    },
    settingsButton: {
        width: 40,
        height: 40,
        backgroundColor: 'rgba(255,255,255,0.3)',
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center'
    },
    profileInfo: {
        alignItems: 'center',
        marginBottom: 25
    },
    avatarContainer: {
        position: 'relative',
        marginBottom: 10
    },
    avatar: {
        width: 80,
        height: 80,
        borderRadius: 40,
        borderWidth: 3,
        borderColor: '#fff'
    },
    onlineBadge: {
        position: 'absolute',
        bottom: 2,
        right: 2,
        width: 16,
        height: 16,
        backgroundColor: '#22C55E', // Green
        borderRadius: 8,
        borderWidth: 2,
        borderColor: '#fff'
    },
    userName: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#1a1a1a',
        marginBottom: 8
    },
    proBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(255,255,255,0.4)',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 20
    },
    proText: {
        fontSize: 10,
        fontWeight: '700',
        color: '#333'
    },
    quickActionsRow: {
        flexDirection: 'row',
        justifyContent: 'space-around',
        paddingHorizontal: 10
    },
    quickActionItem: {
        alignItems: 'center',
        width: 70
    },
    quickActionIcon: {
        width: 50,
        height: 50,
        backgroundColor: '#fff',
        borderRadius: 18,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 8,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 4,
        elevation: 2
    },
    quickActionLabel: {
        fontSize: 11,
        color: '#333',
        fontWeight: '500'
    },
    bodyContent: {
        paddingHorizontal: 20,
        paddingTop: 20
    },
    sectionHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 15
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: '700',
        color: '#111'
    },
    viewAllText: {
        fontSize: 12,
        color: '#FBBF24',
        fontWeight: '600'
    },
    recommendedList: {
        paddingRight: 20
    },
    recommendCard: {
        width: 140,
        marginRight: 15,
    },
    recommendImageContainer: {
        height: 140,
        backgroundColor: '#f9f9f9',
        borderRadius: 15,
        marginBottom: 10,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 10,
        shadowColor: "#AAA",
        shadowOffset: {
            width: 0,
            height: 4,
        },
        shadowOpacity: 0.1,
        shadowRadius: 5,
        elevation: 5,
    },
    recommendImage: {
        width: '90%',
        height: '90%',
        resizeMode: 'contain'
    },
    recommendName: {
        fontWeight: '700',
        color: '#333',
        fontSize: 14,
        textAlign: 'center'
    },
    recommendDesc: {
        color: '#888',
        fontSize: 10,
        textAlign: 'center'
    },
    settingsCard: {
        backgroundColor: '#fff',
        borderRadius: 20,
        overflow: 'hidden',
        paddingVertical: 5,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.03,
        shadowRadius: 5,
        elevation: 2
    },
    referBanner: {
        marginTop: 25,
        backgroundColor: '#111827', // Dark blue/black
        borderRadius: 25,
        padding: 25,
        overflow: 'hidden'
    },
    referContent: {
        position: 'relative',
        zIndex: 2
    },
    referTitle: {
        color: '#fff',
        fontSize: 18,
        fontWeight: '700',
        marginBottom: 5
    },
    referSubtitle: {
        color: '#9CA3AF',
        fontSize: 12,
        marginBottom: 15,
        maxWidth: '80%'
    },
    inviteButton: {
        backgroundColor: '#FBBF24',
        paddingHorizontal: 20,
        paddingVertical: 10,
        borderRadius: 20,
        alignSelf: 'flex-start'
    },
    inviteButtonText: {
        color: '#111',
        fontWeight: '700',
        fontSize: 12
    },
    fab: {
        position: 'absolute',
        bottom: 100,
        right: 20,
        width: 50,
        height: 50,
        borderRadius: 25,
        backgroundColor: '#111',
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 8,
        elevation: 5
    }
});
