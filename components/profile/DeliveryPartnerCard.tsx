import { Feather, FontAwesome } from '@expo/vector-icons';
import React from 'react';
import { Image, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

export default function DeliveryPartnerCard() {
    return (
        <View style={styles.container}>
            <View style={styles.content}>
                <View style={styles.avatarContainer}>
                    <Image
                        // Placeholder image for delivery driver
                        source={{ uri: 'https://cdn-icons-png.flaticon.com/512/3252/3252632.png' }}
                        style={styles.avatar}
                    />
                    <View style={styles.statusDot} />
                </View>

                <View style={styles.infoContainer}>
                    <View style={styles.nameRow}>
                        <Text style={styles.name}>Rahul Sharma</Text>
                        <View style={styles.verifiedBadge}>
                            <Feather name="check" size={10} color="#fff" />
                        </View>
                    </View>
                    <View style={styles.ratingRow}>
                        <FontAwesome name="star" size={12} color="#FBBF24" />
                        <Text style={styles.rating}>4.8</Text>
                        <Text style={styles.role}>DELIVERY PARTNER</Text>
                    </View>
                </View>

                <TouchableOpacity style={styles.callButton}>
                    <Feather name="phone" size={20} color="#1a1a1a" />
                </TouchableOpacity>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        backgroundColor: '#FFFFFF', // Off-white/Grayish background from design
        borderRadius: 20,
        padding: 16,
        marginVertical: 10,
        marginHorizontal: 4,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 8,
        elevation: 2,
    },
    content: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    avatarContainer: {
        position: 'relative',
        marginRight: 16,
    },
    avatar: {
        width: 56,
        height: 56,
        borderRadius: 28,
        backgroundColor: '#F3F4F6',
    },
    statusDot: {
        position: 'absolute',
        bottom: 0,
        right: 0,
        width: 14,
        height: 14,
        borderRadius: 7,
        backgroundColor: '#22C55E',
        borderWidth: 2,
        borderColor: '#fff',
    },
    infoContainer: {
        flex: 1,
    },
    nameRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 4,
    },
    name: {
        fontSize: 16,
        fontWeight: '700',
        color: '#1a1a1a',
        marginRight: 6,
    },
    verifiedBadge: {
        width: 16,
        height: 16,
        borderRadius: 8,
        backgroundColor: '#FBBF24',
        alignItems: 'center',
        justifyContent: 'center',
    },
    ratingRow: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    rating: {
        fontSize: 13,
        fontWeight: '700',
        color: '#4B5563',
        marginLeft: 4,
        marginRight: 8,
    },
    role: {
        fontSize: 10,
        fontWeight: '700',
        color: '#6B7280',
        // letterSpacing: 0.5, // Not supported perfectly on all rn versions but good intent
    },
    callButton: {
        width: 48,
        height: 48,
        borderRadius: 16,
        backgroundColor: '#FBBF24',
        alignItems: 'center',
        justifyContent: 'center',
        shadowColor: '#FBBF24',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 4,
    }
});
