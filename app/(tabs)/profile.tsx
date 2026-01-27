import { Feather } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React from 'react';
import { Image, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import ProfileOption from '../../components/profile/ProfileOption';

// Mock User Data
const USER = {
    name: 'Jay',
    email: 'jay@example.com',
    avatar: require('../../assets/images/profile_icon.jpg'),
};

export default function ProfileScreen() {
    const router = useRouter();

    return (
        <SafeAreaView style={styles.container}>
            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>

                {/* Header / User Info */}
                <View style={styles.header}>
                    <View style={styles.avatarContainer}>
                        <Image source={USER.avatar} style={styles.avatar} />
                        <View style={styles.editBadge}>
                            <Feather name="edit-2" size={12} color="#fff" />
                        </View>
                    </View>
                    <Text style={styles.userName}>{USER.name}</Text>
                    <Text style={styles.userEmail}>{USER.email}</Text>
                </View>

                {/* Orders Section */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>My Orders</Text>
                    <View style={styles.sectionContent}>
                        <ProfileOption
                            label="All Orders"
                            icon="package"
                            onPress={() => { }}
                        />
                        <ProfileOption
                            label="Returns & Refunds"
                            icon="rotate-ccw"
                            onPress={() => { }}
                            showBorder={false}
                        />
                    </View>
                </View>

                {/* Account Settings */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Account Settings</Text>
                    <View style={styles.sectionContent}>
                        <ProfileOption
                            label="Saved Addresses"
                            icon="map-pin"
                            onPress={() => router.push('/profile/addresses')}
                        />
                        <ProfileOption
                            label="Payment Methods"
                            icon="credit-card"
                            onPress={() => { }}
                        />
                        <ProfileOption
                            label="Wishlist"
                            icon="heart"
                            onPress={() => { }}
                        />
                        {/* <ProfileOption
                            label="Notifications"
                            icon="bell"
                            onPress={() => { }}
                            showBorder={false}
                        /> */}
                    </View>
                </View>

                {/* Support */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Support</Text>
                    <View style={styles.sectionContent}>
                        <ProfileOption
                            label="Help Center"
                            icon="help-circle"
                            onPress={() => { }}
                        />
                        <ProfileOption
                            label="Privacy Policy"
                            icon="lock"
                            onPress={() => { }}
                            showBorder={false}
                        />
                    </View>
                </View>

                {/* Logout */}
                <View style={styles.logoutContainer}>
                    <ProfileOption
                        label="Log Out"
                        icon="log-out"
                        onPress={() => { }}
                        isDestructive={true}
                        showBorder={false}
                    />
                </View>

                <Text style={styles.versionText}>Version 1.0.0</Text>

                {/* Spacer for bottom tab bar */}
                <View style={{ height: 20 }} />

            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#f8f9fa', // Slightly off-white for contrast
    },
    scrollContent: {
        paddingBottom: 20,
    },
    header: {
        backgroundColor: '#fff',
        alignItems: 'center',
        paddingVertical: 30,
        marginBottom: 20,
        borderBottomLeftRadius: 30,
        borderBottomRightRadius: 30,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 10,
        elevation: 3,
    },
    avatarContainer: {
        width: 100,
        height: 100,
        marginBottom: 15,
        position: 'relative',
    },
    avatar: {
        width: '100%',
        height: '100%',
        borderRadius: 50,
        borderWidth: 3,
        borderColor: '#fff',
    },
    editBadge: {
        position: 'absolute',
        bottom: 0,
        right: 0,
        backgroundColor: '#FBBF24',
        width: 30,
        height: 30,
        borderRadius: 15,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 3,
        borderColor: '#fff',
    },
    userName: {
        fontSize: 22,
        fontWeight: 'bold',
        color: '#1a1a1a',
        marginBottom: 4,
    },
    userEmail: {
        fontSize: 14,
        color: '#888',
    },
    section: {
        paddingHorizontal: 20,
        marginBottom: 25,
    },
    sectionTitle: {
        fontSize: 16,
        fontWeight: '700',
        color: '#1a1a1a',
        marginBottom: 10,
        marginLeft: 5,
    },
    sectionContent: {
        backgroundColor: '#fff',
        borderRadius: 15,
        overflow: 'hidden',
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.02,
        shadowRadius: 5,
        elevation: 2,
    },
    logoutContainer: {
        marginHorizontal: 20,
        backgroundColor: '#fff',
        borderRadius: 15,
        overflow: 'hidden',
        marginBottom: 20,
    },
    versionText: {
        textAlign: 'center',
        color: '#ccc',
        fontSize: 12,
        marginBottom: 20,
    }
});
