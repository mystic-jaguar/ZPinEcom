import { Feather } from '@expo/vector-icons';
import { Stack, useRouter } from 'expo-router';
import React, { useState } from 'react';
import { FlatList, Image, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import SearchBar from '../components/SearchBar';
import SkeletonCard from '../components/product/SkeletonCard';
import { useSearch } from '../context/SearchContext';
import apiClient from '../services/api';
import { ProductObject } from '../types/types';

export default function ProductSearchScreen() {
    const router = useRouter();
    const { addSearch } = useSearch();
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState<ProductObject[]>([]);
    const [relatedProducts, setRelatedProducts] = useState<ProductObject[]>([]);
    const [loading, setLoading] = useState(false);
    const searchTimeout = React.useRef<ReturnType<typeof setTimeout> | null>(null);

    const runSearch = async (query: string) => {
        if (!query.trim()) {
            setSearchResults([]);
            setRelatedProducts([]);
            return;
        }
        setLoading(true);
        try {
            const response = await apiClient.get('products/search', { params: { q: query, limit: 50 } });
            setSearchResults(response.data.products || []);
            setRelatedProducts(response.data.related || []);
        } catch {
            setSearchResults([]);
            setRelatedProducts([]);
        } finally {
            setLoading(false);
        }
    };

    const handleSearchChange = (text: string) => {
        setSearchQuery(text);
        if (searchTimeout.current) clearTimeout(searchTimeout.current);
        if (text.trim().length >= 2) {
            searchTimeout.current = setTimeout(() => runSearch(text), 400);
        } else {
            setSearchResults([]);
            setRelatedProducts([]);
        }
    };

    const handleProductPress = (item: ProductObject) => {
        if (searchQuery.trim().length >= 2) addSearch(searchQuery.trim());
        if (item.deepestCategoryName) addSearch(item.deepestCategoryName);
        router.push(`/product/${item.productId}`);
    };

    const allDisplayed = [
        ...searchResults,
        ...relatedProducts.filter(r => !searchResults.find(s => s.productId === r.productId)),
    ];

    const renderProductItem = ({ item }: { item: ProductObject }) => (
        <TouchableOpacity
            style={styles.productCard}
            onPress={() => handleProductPress(item)}
        >
            <View style={styles.imageContainer}>
                {item.images?.[0] ? (
                    <Image source={{ uri: item.images[0] as string }} style={styles.productImage} />
                ) : (
                    <View style={[styles.productImage, { backgroundColor: '#f0f0f0', alignItems: 'center', justifyContent: 'center' }]}>
                        <Feather name="image" size={24} color="#ccc" />
                    </View>
                )}
                {(item.discount ?? 0) > 0 && (
                    <View style={styles.discountBadge}>
                        <Text style={styles.discountText}>{item.discount}% OFF</Text>
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
                        onChangeText={handleSearchChange}
                        autoFocus
                    />
                </View>
            </View>

            <View style={styles.content}>
                {loading ? (
                    <View style={styles.skeletonGrid}>
                        {Array.from({ length: 6 }).map((_, i) => (
                            <SkeletonCard key={i} />
                        ))}
                    </View>
                ) : searchQuery.length > 0 ? (
                    allDisplayed.length > 0 ? (
                        <FlatList
                            data={allDisplayed}
                            renderItem={renderProductItem}
                            keyExtractor={item => item.productId}
                            numColumns={2}
                            columnWrapperStyle={styles.columnWrapper}
                            contentContainerStyle={styles.listContent}
                            showsVerticalScrollIndicator={false}
                            ListHeaderComponent={
                                relatedProducts.length > 0 && searchResults.length > 0 ? (
                                    <Text style={styles.sectionLabel}>
                                        {searchResults.length} result{searchResults.length !== 1 ? 's' : ''} · Related products below
                                    </Text>
                                ) : null
                            }
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
    skeletonGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'space-between',
        paddingHorizontal: 10,
        paddingTop: 15,
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
    },
    sectionLabel: {
        fontSize: 13,
        color: '#9CA3AF',
        fontWeight: '600',
        paddingHorizontal: 5,
        paddingBottom: 10,
        paddingTop: 5,
    },
});
