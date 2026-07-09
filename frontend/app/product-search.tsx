import { Stack, useRouter } from 'expo-router';
import { ArrowUpLeft, Clock, Search, TrendingUp, X } from 'lucide-react-native';
import React, { useState } from 'react';
import { FlatList, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import SkeletonCard from '../components/product/SkeletonCard';
import { ProductCard, ZText } from '../components/ui';
import { colors, fonts, palette, radius } from '../constants/theme';
import { useSearch } from '../context/SearchContext';
import apiClient from '../services/api';
import { ProductObject } from '../types/types';

const TRENDING = ['Denim jeans', 'Anti-aging serum', 'Kurta sets', 'Sunglasses', 'Messenger bag'];

export default function ProductSearchScreen() {
    const router = useRouter();
    const { addSearch, recentSearches, clearSearches } = useSearch() as any;
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

    const applyTerm = (term: string) => {
        setSearchQuery(term);
        runSearch(term);
    };

    const allDisplayed = [
        ...searchResults,
        ...relatedProducts.filter(r => !searchResults.find(s => s.productId === r.productId)),
    ];

    const renderProductItem = ({ item }: { item: ProductObject }) => (
        <ProductCard
            style={styles.gridCard}
            image={item.images?.[0] ?? require('../assets/images/icon_backup.png')}
            brand={item.deepestCategoryName}
            name={item.productName}
            price={item.price}
            originalPrice={item.originalPrice ?? undefined}
            discount={(item.discount ?? 0) > 0 ? `${item.discount}% OFF` : undefined}
            onPress={() => handleProductPress(item)}
        />
    );

    return (
        <SafeAreaView style={styles.container} edges={['top']}>
            <Stack.Screen options={{ headerShown: false }} />

            <View style={styles.header}>
                <View style={styles.searchField}>
                    <Search size={19} color={colors.textStrong} />
                    <TextInput
                        style={styles.searchInput}
                        placeholder="Search styles, sneakers, gadgets"
                        placeholderTextColor={colors.textFaint}
                        value={searchQuery}
                        onChangeText={handleSearchChange}
                        autoFocus
                        returnKeyType="search"
                    />
                    {searchQuery.length > 0 && (
                        <Pressable onPress={() => handleSearchChange('')} hitSlop={8}>
                            <X size={18} color={colors.textFaint} />
                        </Pressable>
                    )}
                </View>
                <Pressable onPress={() => router.back()} hitSlop={8}>
                    <Text style={styles.cancel}>Cancel</Text>
                </Pressable>
            </View>

            {loading ? (
                <View style={styles.skeletonGrid}>
                    {Array.from({ length: 6 }).map((_, i) => <SkeletonCard key={i} />)}
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
                                <Text style={styles.resultLabel}>
                                    {searchResults.length} result{searchResults.length !== 1 ? 's' : ''} · related below
                                </Text>
                            ) : null
                        }
                    />
                ) : (
                    <View style={styles.empty}>
                        <Search size={44} color={colors.borderStrong} />
                        <ZText variant="muted" style={styles.emptyText}>No products found for “{searchQuery}”</ZText>
                    </View>
                )
            ) : (
                <ScrollView contentContainerStyle={styles.discover} showsVerticalScrollIndicator={false}>
                    {recentSearches?.length > 0 && (
                        <>
                            <View style={styles.rowBetween}>
                                <ZText variant="eyebrow">Recent searches</ZText>
                                <Text style={styles.clear} onPress={() => clearSearches?.()}>Clear all</Text>
                            </View>
                            <View style={styles.recentList}>
                                {recentSearches.slice(0, 6).map((term: string, i: number) => (
                                    <Pressable key={i} style={styles.recentRow} onPress={() => applyTerm(term)}>
                                        <Clock size={18} color={colors.textFaint} />
                                        <Text style={styles.recentText} numberOfLines={1}>{term}</Text>
                                        <ArrowUpLeft size={17} color={colors.borderStrong} />
                                    </Pressable>
                                ))}
                            </View>
                        </>
                    )}

                    <View style={styles.trendingHead}>
                        <TrendingUp size={14} color={palette.yellow500} />
                        <ZText variant="eyebrow">Trending now</ZText>
                    </View>
                    <View style={styles.chips}>
                        {TRENDING.map((t) => (
                            <Pressable key={t} style={styles.chip} onPress={() => applyTerm(t)}>
                                <Text style={styles.chipText}>{t}</Text>
                            </Pressable>
                        ))}
                    </View>
                </ScrollView>
            )}
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: palette.paperWarm },
    header: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 20, paddingTop: 6, paddingBottom: 16 },
    searchField: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 11, backgroundColor: colors.surfaceCard, borderWidth: 2, borderColor: colors.borderInk, borderRadius: radius.md, height: 50, paddingHorizontal: 15 },
    searchInput: { flex: 1, fontFamily: fonts.bodyMedium, fontSize: 15, color: colors.textStrong, padding: 0 },
    cancel: { fontFamily: fonts.bodyBold, fontSize: 14, color: colors.textStrong },

    listContent: { padding: 20, paddingBottom: 40 },
    columnWrapper: { justifyContent: 'space-between' },
    gridCard: { width: '48%', marginBottom: 18 },
    resultLabel: { fontFamily: fonts.bodySemiBold, fontSize: 13, color: colors.textMuted, marginBottom: 12 },

    skeletonGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', paddingHorizontal: 20, paddingTop: 8 },

    empty: { flex: 1, alignItems: 'center', justifyContent: 'center', marginTop: -40 },
    emptyText: { marginTop: 14, textAlign: 'center', paddingHorizontal: 40 },

    discover: { paddingHorizontal: 20, paddingBottom: 40 },
    rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
    clear: { fontFamily: fonts.bodyBold, fontSize: 11, color: palette.red500 },
    recentList: { marginBottom: 22 },
    recentRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 10 },
    recentText: { flex: 1, fontFamily: fonts.bodyMedium, fontSize: 15, color: colors.textBody },
    trendingHead: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 14 },
    chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
    chip: { backgroundColor: colors.surfaceCard, borderWidth: 2, borderColor: colors.borderSubtle, borderRadius: 100, paddingHorizontal: 15, paddingVertical: 9 },
    chipText: { fontFamily: fonts.bodyBold, fontSize: 13, color: colors.textBody },
});
