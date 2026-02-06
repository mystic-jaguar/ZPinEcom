import { Feather } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React from 'react';
import { Image, StyleSheet, TouchableOpacity, View } from 'react-native';

interface HeaderProps {
    // Add props if needed in future (e.g., title for other screens)
}

export default function Header({ }: HeaderProps) {
    const router = useRouter();

    return (
        <View style={styles.header}>
            <View style={styles.logoContainer}>
                {/* Logo fully visible as requested */}
                <Image
                    source={require('../assets/images/icon.png')}
                    style={styles.logo}
                    resizeMode="contain"
                />
            </View>
            <View style={styles.headerIcons}>
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
        paddingRight: 20,
        paddingStart: 5,
        paddingVertical: 10,
        backgroundColor: '#fff'
    },
    logoContainer: {
        height: 50,
        // Width can be flexible or fixed depending on logo aspect ratio
        width: 100,
        justifyContent: 'center',
        alignItems: 'flex-start'
    },
    logo: {
        width: '100%',
        height: '100%',
    },
    headerIcons: {
        flexDirection: 'row',
    },
    iconButton: {
        marginLeft: 15,
    },
});
