import { Feather } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React from 'react';
import { FlatList, Image, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useCart } from '../../context/CartContext';

export default function CartScreen() {
    const { cartItems, updateQuantity, removeFromCart, totalPrice } = useCart();
    const router = useRouter();

    const renderItem = ({ item }: { item: any }) => (
        <View style={styles.cartItem}>
            <TouchableOpacity
                style={{ flexDirection: 'row', flex: 1 }}
                onPress={() => router.push(`/product/${item.id}`)}
                activeOpacity={0.7}
            >
                <Image source={item.image} style={styles.itemImage} resizeMode="cover" />

                <View style={styles.itemDetails}>
                    <View style={styles.headerRow}>
                        <Text style={styles.itemName} numberOfLines={2}>{item.name}</Text>
                        <TouchableOpacity onPress={(e) => {
                            e.stopPropagation();
                            removeFromCart(item.cartId);
                        }}>
                            <Feather name="x" size={18} color="#999" />
                        </TouchableOpacity>
                    </View>

                    {(item.selectedColor || item.selectedSize) && (
                        <View style={styles.variantContainer}>
                            {item.selectedSize && (
                                <Text style={styles.variantText}>{item.selectedSize}</Text>
                            )}
                            {item.selectedSize && item.selectedColor && (
                                <View style={styles.separator} />
                            )}
                            {item.selectedColor && (
                                <View style={[styles.colorSwatch, { backgroundColor: item.selectedColor }]} />
                            )}
                        </View>
                    )}

                    <View style={styles.priceRow}>
                        <Text style={styles.itemPrice}>₹{(item.price * item.quantity).toLocaleString()}</Text>

                        <View style={styles.quantityControls}>
                            <TouchableOpacity
                                style={styles.qtyBtn}
                                onPress={() => updateQuantity(item.cartId, item.quantity - 1)}
                            >
                                <Feather name="minus" size={14} color="#1a1a1a" />
                            </TouchableOpacity>

                            <Text style={styles.qtyText}>{item.quantity}</Text>

                            <TouchableOpacity
                                style={styles.qtyBtn}
                                onPress={() => updateQuantity(item.cartId, item.quantity + 1)}
                            >
                                <Feather name="plus" size={14} color="#1a1a1a" />
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </TouchableOpacity>
        </View>
    );

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.header}>
                <Text style={styles.headerTitle}>My Cart</Text>
                <Text style={styles.itemCount}>{cartItems.length} Items</Text>
            </View>

            {cartItems.length > 0 ? (
                <>
                    <FlatList
                        data={cartItems}
                        renderItem={renderItem}
                        keyExtractor={item => item.cartId}
                        contentContainerStyle={styles.listContent}
                        showsVerticalScrollIndicator={false}
                    />

                    <View style={styles.footer}>
                        <View style={styles.totalRow}>
                            <Text style={styles.totalLabel}>Total</Text>
                            <Text style={styles.totalAmount}>₹{totalPrice.toLocaleString()}</Text>
                        </View>
                        <TouchableOpacity style={styles.checkoutBtn}>
                            <Text style={styles.checkoutText}>Proceed to Checkout</Text>
                            <Feather name="arrow-right" size={20} color="#1a1a1a" />
                        </TouchableOpacity>
                    </View>
                </>
            ) : (
                <View style={styles.emptyState}>
                    <Feather name="shopping-cart" size={64} color="#ccc" />
                    <Text style={styles.emptyText}>Your cart is empty</Text>
                    <Text style={styles.emptySubtext}>Add items to see them here</Text>
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
        paddingHorizontal: 20,
        paddingVertical: 20,
        backgroundColor: '#fff',
        borderBottomWidth: 1,
        borderBottomColor: '#f1f1f1',
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'baseline'
    },
    headerTitle: {
        fontSize: 28,
        fontWeight: '800',
        color: '#1a1a1a'
    },
    itemCount: {
        fontSize: 14,
        color: '#666',
        fontWeight: '600'
    },
    listContent: {
        padding: 20,
        paddingBottom: 100
    },
    cartItem: {
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
    itemImage: {
        width: 80,
        height: 80,
        borderRadius: 12,
        backgroundColor: '#f5f5f5'
    },
    itemDetails: {
        flex: 1,
        marginLeft: 12,
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
    variantContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 6
    },
    variantText: {
        fontSize: 13,
        color: '#666',
        fontWeight: '500'
    },
    separator: {
        width: 1,
        height: 12,
        backgroundColor: '#ddd',
        marginHorizontal: 8
    },
    colorSwatch: {
        width: 18,
        height: 18,
        borderRadius: 9,
        borderWidth: 1.5,
        borderColor: '#fff',
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 2,
        elevation: 1
    },
    priceRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginTop: 8
    },
    itemPrice: {
        fontSize: 16,
        fontWeight: '700',
        color: '#1a1a1a'
    },
    quantityControls: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#F3F4F6',
        borderRadius: 8,
        padding: 4
    },
    qtyBtn: {
        width: 28,
        height: 28,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#fff',
        borderRadius: 6,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 2,
        elevation: 1
    },
    qtyText: {
        marginHorizontal: 12,
        fontSize: 14,
        fontWeight: '700',
        color: '#1a1a1a'
    },
    footer: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        backgroundColor: '#fff',
        padding: 20,
        paddingBottom: 30, // For bottom tabs if needed, but safer
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: -4 },
        shadowOpacity: 0.05,
        shadowRadius: 10,
        elevation: 10
    },
    totalRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 20
    },
    totalLabel: {
        fontSize: 16,
        color: '#666',
        fontWeight: '600'
    },
    totalAmount: {
        fontSize: 24,
        fontWeight: '800',
        color: '#1a1a1a'
    },
    checkoutBtn: {
        backgroundColor: '#FBBF24',
        borderRadius: 12,
        paddingVertical: 16,
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center'
    },
    checkoutText: {
        fontSize: 16,
        fontWeight: '800',
        color: '#1a1a1a',
        marginRight: 8
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
        color: '#999'
    }
});
