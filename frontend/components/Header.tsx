import { Feather } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React from 'react';
import { Dimensions, Image, StyleSheet, TouchableOpacity, View } from 'react-native';

const { width } = Dimensions.get('window');

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
                    source={require('../assets/images/icon_backup.png')}
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
});
