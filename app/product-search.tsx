import { Feather } from '@expo/vector-icons';
import { Stack, useRouter } from 'expo-router';
import React, { useState } from 'react';
import { FlatList, Image, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import SearchBar from '../components/SearchBar';
import { PRODUCTS, Product } from '../constants/products';

export default function ProductSearchScreen() {
    const router = useRouter();
    const [searchQuery, setSearchQuery] = useState('');

    const filteredProducts = searchQuery
        ? PRODUCTS.filter(product =>
            product.productName.toLowerCase().includes(searchQuery.toLowerCase()) ||
            product.categoryPath.toLowerCase().includes(searchQuery.toLowerCase()) ||
            product.deepestCategoryName.toLowerCase().includes(searchQuery.toLowerCase())
        )
        : [];

    const renderProductItem = ({ item }: { item: Product }) => (
        <TouchableOpacity
            style={styles.productCard}
            onPress={() => router.push(`/product/${item.productId}`)}
        >
            <View style={styles.imageContainer}>
                {item.images?.[0] ? (
                    <Image source={{ uri: item.images[0] }} style={styles.productImage} />
                ) : (
                    <View style={[styles.productImage, { backgroundColor: '#f0f0f0', alignItems: 'center', justifyContent: 'center' }]}>
                        <Feather name="image" size={24} color="#ccc" />
                    </View>
                )}
                {(item.discount ?? 0) > 0 && (
                    <View style={styles.discountBadge}>
                        <Text style={styles.discountText}>{(item.discount || 0)}% OFF</Text>
                    </View>
                )}
            </View>
            <View style={styles.productInfo}>
                <Text style={styles.productName} numberOfLines={1}>{item.productName}</Text>
                <Text style={styles.productCategory}>{item.deepestCategoryName}</Text>
                <View style={styles.priceRow}>
                    <Text style={styles.price}>₹{item.price}</Text>
                    {item.originalPrice && (
                        <Text style={styles.originalPrice}>₹{item.originalPrice}</Text>
                    )}
                </View>
            </View>
        </TouchableOpacity>
    );

    return (
        <SafeAreaView style={styles.container}>
            <Stack.Screen options={{ headerShown: false }} />

            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                    <Feather name="arrow-left" size={24} color="#333" />
                </TouchableOpacity>
                <View style={styles.searchBarWrapper}>
                    <SearchBar
                        placeholder="Search for products..."
                        value={searchQuery}
                        onChangeText={setSearchQuery}
                        autoFocus
                    />
                </View>
            </View>

            <View style={styles.content}>
                {searchQuery.length > 0 ? (
                    filteredProducts.length > 0 ? (
                        <FlatList
                            data={filteredProducts}
                            renderItem={renderProductItem}
                            keyExtractor={item => item.productId}
                            numColumns={2}
                            columnWrapperStyle={styles.columnWrapper}
                            contentContainerStyle={styles.listContent}
                            showsVerticalScrollIndicator={false}
                        />
                    ) : (
                        <View style={styles.emptyState}>
                            <Feather name="search" size={48} color="#ccc" />
                            <Text style={styles.emptyText}>No products found matching "{searchQuery}"</Text>
                        </View>
                    )
                ) : (
                    <View style={styles.emptyState}>
                        <Feather name="search" size={48} color="#eee" />
                        <Text style={styles.emptyTextPlaceholder}>Type to search products</Text>
                    </View>
                )}
            </View>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#fff',
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingTop: 10,
        backgroundColor: '#fff',
    },
    backButton: {
        paddingLeft: 20,
        paddingRight: 5,
        paddingBottom: 15, // Align with search bar bottom padding
        justifyContent: 'center',
    },
    searchBarWrapper: {
        flex: 1,
    },
    content: {
        flex: 1,
        backgroundColor: '#fff',
    },
    listContent: {
        padding: 10,
    },
    columnWrapper: {
        justifyContent: 'space-between',
    },
    productCard: {
        width: '48%',
        backgroundColor: '#fff',
        borderRadius: 12,
        marginBottom: 15,
        borderWidth: 1,
        borderColor: '#f0f0f0',
        overflow: 'hidden',
    },
    imageContainer: {
        height: 140,
        backgroundColor: '#f9f9f9',
        position: 'relative',
    },
    productImage: {
        width: '100%',
        height: '100%',
        resizeMode: 'cover',
    },
    discountBadge: {
        position: 'absolute',
        top: 8,
        left: 8,
        backgroundColor: '#FBBF24',
        paddingHorizontal: 5,
        paddingVertical: 2,
        borderRadius: 4,
    },
    discountText: {
        fontSize: 9,
        fontWeight: '700',
        color: '#1a1a1a',
    },
    productInfo: {
        padding: 10,
    },
    productName: {
        fontSize: 13,
        fontWeight: '600',
        color: '#1a1a1a',
        marginBottom: 2,
    },
    productCategory: {
        fontSize: 10,
        color: '#888',
        marginBottom: 6,
    },
    priceRow: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    price: {
        fontSize: 14,
        fontWeight: '700',
        color: '#1a1a1a',
        marginRight: 6,
    },
    originalPrice: {
        fontSize: 11,
        color: '#999',
        textDecorationLine: 'line-through',
    },
    emptyState: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        marginTop: 50,
    },
    emptyText: {
        marginTop: 15,
        fontSize: 16,
        color: '#888',
        textAlign: 'center',
        paddingHorizontal: 40,
    },
    emptyTextPlaceholder: {
        marginTop: 15,
        fontSize: 16,
        color: '#ccc',
    }
});
