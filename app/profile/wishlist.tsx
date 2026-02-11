import { Feather } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React from 'react';
import { FlatList, Image, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useCart } from '../../context/CartContext';
import { useWishlist } from '../../context/WishlistContext';

export default function WishlistScreen() {
    const router = useRouter();
    const { wishlistItems, removeFromWishlist } = useWishlist();
    const { addToCart } = useCart();

    const renderItem = ({ item }: { item: any }) => (
        <View style={styles.itemCard}>
            <TouchableOpacity
                style={styles.imageContainer}
                onPress={() => router.push(`/product/${item.productId}`)}
            >
                <Image
                    source={
                        item.images?.[0]
                            ? (typeof item.images[0] === 'string' ? { uri: item.images[0] } : item.images[0])
                            : { uri: 'https://via.placeholder.com/80' }
                    }
                    style={styles.itemImage}
                    resizeMode="cover"
                />
            </TouchableOpacity>

            <View style={styles.itemDetails}>
                <View style={styles.headerRow}>
                    <Text style={styles.itemName} numberOfLines={2}>{item.productName}</Text>
                    <TouchableOpacity onPress={() => removeFromWishlist(item.productId)}>
                        <Feather name="x" size={18} color="#999" />
                    </TouchableOpacity>
                </View>

                <Text style={styles.itemPrice}>₹{item.price.toLocaleString()}</Text>

                <TouchableOpacity
                    style={styles.addToCartBtn}
                    onPress={() => {
                        // Default options for quick add, or maybe prompt? 
                        // For now simply add with defaults or redirect to product page?
                        // Let's redirect to product page for options, but user expects quick add often.
                        // Given we need size/color, safe bet is redirect.
                        router.push(`/product/${item.productId}`);
                    }}
                >
                    <Text style={styles.addToCartText}>View Details</Text>
                    <Feather name="arrow-right" size={14} color="#1a1a1a" />
                </TouchableOpacity>
            </View>
        </View>
    );

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                    <Feather name="arrow-left" size={24} color="#1a1a1a" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>My Wishlist</Text>
                <View style={{ width: 24 }} />
            </View>

            {wishlistItems.length > 0 ? (
                <FlatList
                    data={wishlistItems}
                    renderItem={renderItem}
                    keyExtractor={item => item.productId}
                    contentContainerStyle={styles.listContent}
                    showsVerticalScrollIndicator={false}
                />
            ) : (
                <View style={styles.emptyState}>
                    <Feather name="heart" size={64} color="#ccc" />
                    <Text style={styles.emptyText}>Your wishlist is empty</Text>
                    <Text style={styles.emptySubtext}>Save items you love to view them here</Text>
                    <TouchableOpacity style={styles.shopBtn} onPress={() => router.push('/(tabs)')}>
                        <Text style={styles.shopBtnText}>Start Shopping</Text>
                    </TouchableOpacity>
                </View>
            )}
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#F8F9FA'
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 20,
        paddingVertical: 15,
        backgroundColor: '#fff',
        borderBottomWidth: 1,
        borderBottomColor: '#f1f1f1'
    },
    backButton: {
        padding: 4
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: '700',
        color: '#1a1a1a'
    },
    listContent: {
        padding: 20
    },
    itemCard: {
        backgroundColor: '#fff',
        borderRadius: 16,
        padding: 12,
        marginBottom: 16,
        flexDirection: 'row',
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.03,
        shadowRadius: 8,
        elevation: 2
    },
    imageContainer: {
        marginRight: 12
    },
    itemImage: {
        width: 80,
        height: 80,
        borderRadius: 12,
        backgroundColor: '#f5f5f5'
    },
    itemDetails: {
        flex: 1,
        justifyContent: 'space-between'
    },
    headerRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start'
    },
    itemName: {
        fontSize: 14,
        fontWeight: '600',
        color: '#1a1a1a',
        flex: 1,
        marginRight: 8,
        lineHeight: 20
    },
    itemPrice: {
        fontSize: 16,
        fontWeight: '700',
        color: '#1a1a1a',
        marginTop: 4
    },
    addToCartBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        alignSelf: 'flex-start',
        marginTop: 8,
        backgroundColor: '#FBBF24',
        paddingVertical: 6,
        paddingHorizontal: 12,
        borderRadius: 8
    },
    addToCartText: {
        fontSize: 12,
        fontWeight: '700',
        color: '#1a1a1a',
        marginRight: 4
    },
    emptyState: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        marginTop: -50
    },
    emptyText: {
        fontSize: 20,
        fontWeight: '700',
        color: '#1a1a1a',
        marginTop: 20,
        marginBottom: 8
    },
    emptySubtext: {
        fontSize: 14,
        color: '#999',
        marginBottom: 24
    },
    shopBtn: {
        backgroundColor: '#FBBF24',
        paddingHorizontal: 24,
        paddingVertical: 12,
        borderRadius: 24
    },
    shopBtnText: {
        fontSize: 14,
        fontWeight: '700',
        color: '#1a1a1a'
    }
});
