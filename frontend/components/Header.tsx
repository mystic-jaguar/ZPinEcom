import { Feather } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import React, { useCallback } from 'react';
import { Dimensions, Image, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useNotificationsBadge } from '../context/NotificationsContext';

const { width } = Dimensions.get('window');

interface HeaderProps {
    // Add props if needed in future (e.g., title for other screens)
}

export default function Header({ }: HeaderProps) {
    const router = useRouter();
    // Shared with the inbox screen and the push listener, so the badge moves the
    // moment a notification arrives — focus is now just a backstop resync.
    const { unread, refresh } = useNotificationsBadge();

    useFocusEffect(useCallback(() => { refresh(); }, [refresh]));

    return (
        <View style={styles.header}>
            <View style={styles.logoContainer}>
                {/* Logo fully visible as requested */}
                <Image
                    source={require('../assets/images/icon_backup.png')}
                    style={styles.logo}
                    resizeMode="contain"
                />
            </View>
            <View style={styles.headerIcons}>
                <TouchableOpacity style={styles.iconButton} onPress={() => router.push('/profile/notifications' as any)}>
                    <Feather name="bell" size={24} color="#333" />
                    {unread > 0 && (
                        <View style={styles.badge}>
                            <Text style={styles.badgeText}>{unread > 9 ? '9+' : unread}</Text>
                        </View>
                    )}
                </TouchableOpacity>
                <TouchableOpacity style={styles.iconButton} onPress={() => router.push('/profile/wishlist')}>
                    <Feather name="heart" size={24} color="#333" />
                </TouchableOpacity>
                <TouchableOpacity style={styles.iconButton} onPress={() => router.push('/profile/orders')}>
                    <Feather name="shopping-bag" size={24} color="#333" />
                </TouchableOpacity>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingRight: '5%',
        paddingStart: '1%',
        paddingVertical: 1,
        backgroundColor: '#fff',
    },
    logoContainer: {
        height: width * 0.175,
        width: width * 0.35,
        justifyContent: 'center',
        alignItems: 'flex-start',
    },
    logo: {
        width: '100%',
        height: '100%',
    },
    headerIcons: {
        flexDirection: 'row',
    },
    iconButton: {
        marginLeft: width * 0.038,
    },
    badge: {
        position: 'absolute',
        top: -4,
        right: -6,
        minWidth: 16,
        height: 16,
        borderRadius: 8,
        paddingHorizontal: 4,
        backgroundColor: '#E23B3B',
        alignItems: 'center',
        justifyContent: 'center',
    },
    badgeText: {
        color: '#fff',
        fontSize: 9,
        fontWeight: '700',
    },
});
