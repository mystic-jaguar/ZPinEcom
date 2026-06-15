import { Colors } from '@/constants/Colors';
import { Feather, Ionicons } from '@expo/vector-icons';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
    ActivityIndicator,
    Dimensions,
    FlatList,
    Image,
    RefreshControl,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import FilterModal, { FilterState } from '../components/product/FilterModal';
import SkeletonCard from '../components/product/SkeletonCard';
import { CATEGORY_DATA, CategoryNode } from '../constants/categories';
import { useWishlist } from '../context/WishlistContext';
import { productService, ProductListParams } from '../services/product';
import { ProductObject } from '../types/types';

const { width } = Dimensions.get('window');
const CARD_WIDTH = (width / 2) - width * 0.05;
const PAGE_SIZE = 20;

// Maps the FilterModal price-range labels to backend "min-max" bands (max is exclusive).
const PRICE_BAND_MAP: Record<string, string> = {
    'Under ₹500': '0-500',
    '₹500 - ₹1000': '500-1000',
    '₹1000 - ₹2000': '1000-2000',
    '₹2000 - ₹5000': '2000-5000',
    'Above ₹5000': '5000-',
};

export default function ProductListing() {
    const router = useRouter();
    const params = useLocalSearchParams();
    const { categoryName, subCategoryName } = params;
    const { addToWishlist, removeFromWishlist, isInWishlist } = useWishlist();

    // Products State
    const [products, setProducts] = useState<ProductObject[]>([]);
    const [loading, setLoading] = useState(true);          // first page / hard reload
    const [loadingMore, setLoadingMore] = useState(false); // appending next page
    const [error, setError] = useState<string | null>(null);
    const [refreshing, setRefreshing] = useState(false);

    // Pagination State
    const [page, setPage] = useState(1);
    const [hasNextPage, setHasNextPage] = useState(false);
    const [totalItems, setTotalItems] = useState(0);

    // Sub-category tab — drives which category name is queried
    const [activeFilter, setActiveFilter] = useState<string>('All');

    // Brands available in this category (returned by the API, used by the filter modal)
    const [availableBrands, setAvailableBrands] = useState<string[]>([]);

    // Filter Modal State
    const [filterModalVisible, setFilterModalVisible] = useState(false);
    const [filterState, setFilterState] = useState<FilterState>({
        sortBy: 'relevance',
        priceRanges: [],
        brands: [],
        ratings: [],
        discounts: []
    });

    const rootTarget = (subCategoryName as string) || (categoryName as string) || '';
    // The 'All' tab queries the root category; a selected tab queries that sub-category directly.
    const effectiveCategory = activeFilter === 'All' ? rootTarget : activeFilter;

    // Translate the filter modal state into backend query params.
    const buildParams = useCallback((pageNum: number): ProductListParams => {
        const params: ProductListParams = {
            page: pageNum,
            limit: PAGE_SIZE,
            sort: filterState.sortBy === 'discount' ? 'relevance' : filterState.sortBy,
        };
        // Multiple rating checkboxes are OR'd — the lowest threshold is the least restrictive.
        if (filterState.ratings.length > 0) {
            params.minRating = Math.min(...filterState.ratings.map(r => parseFloat(r)));
        }
        if (filterState.brands.length > 0) {
            params.brands = filterState.brands.join(',');
        }
        if (filterState.priceRanges.length > 0) {
            params.priceBands = filterState.priceRanges
                .map(r => PRICE_BAND_MAP[r])
                .filter(Boolean)
                .join(',');
        }
        return params;
    }, [filterState]);

    // Guards against out-of-order responses when filters/tabs change quickly.
    const requestIdRef = useRef(0);
    // Synchronous in-flight lock — prevents duplicate loads when onEndReached fires
    // repeatedly before the async `loading`/`loadingMore` state has committed.
    const fetchingRef = useRef(false);
    // Latest pagination cursor, kept in a ref so onEndReached never reads stale state.
    const pageRef = useRef(1);
    const hasNextRef = useRef(false);

    const loadProducts = useCallback(async (pageNum: number, append: boolean) => {
        if (!effectiveCategory) {
            setProducts([]);
            setLoading(false);
            return;
        }
        // Dedupe only the "load more" path; a filter/tab change (append=false) must
        // always proceed and supersede any in-flight load via the request id.
        if (append && fetchingRef.current) return;
        fetchingRef.current = true;
        const reqId = ++requestIdRef.current;
        try {
            if (append) setLoadingMore(true);
            else { setLoading(true); setError(null); }

            const response = await productService.getProductsByCategory(effectiveCategory, buildParams(pageNum));
            if (reqId !== requestIdRef.current) return; // a newer request superseded this one

            const items = response.products || [];
            setProducts(prev => {
                if (!append) return items;
                // Defensive dedupe — never render the same productId twice across pages.
                const seen = new Set(prev.map(p => p.productId));
                return [...prev, ...items.filter(p => !seen.has(p.productId))];
            });
            pageRef.current = pageNum;
            hasNextRef.current = !!response.pagination?.hasNextPage;
            setPage(pageNum);
            setHasNextPage(hasNextRef.current);
            setTotalItems(response.pagination?.totalItems ?? items.length);
            if (!append) {
                setAvailableBrands((response.brands || []).map(b => b.toUpperCase()));
            }
        } catch (err: any) {
            if (reqId !== requestIdRef.current) return;
            if (!append) setError(err.message || 'Failed to load products');
        } finally {
            // Only the latest request clears the lock/spinners — a superseded request
            // must not unlock while a newer one is still running.
            if (reqId === requestIdRef.current) {
                setLoading(false);
                setLoadingMore(false);
                fetchingRef.current = false;
            }
        }
    }, [effectiveCategory, buildParams]);

    // Reload from page 1 whenever the category tab or any filter/sort changes.
    useEffect(() => {
        loadProducts(1, false);
    }, [loadProducts]);

    const onRefresh = async () => {
        setRefreshing(true);
        await loadProducts(1, false);
        setRefreshing(false);
    };

    const onEndReached = () => {
        if (fetchingRef.current || !hasNextRef.current) return;
        loadProducts(pageRef.current + 1, true);
    };

    // Switching sub-category tabs resets the brand filter (brands differ per category).
    const onSelectTab = (name: string) => {
        setActiveFilter(name);
        setFilterState(prev => (prev.brands.length ? { ...prev, brands: [] } : prev));
    };

    // Helper to find a node by name in the tree
    const findNode = (nodes: CategoryNode[], name: string): CategoryNode | null => {
        for (const node of nodes) {
            if (node.name === name) return node;
            if (node.children) {
                const found = findNode(node.children, name);
                if (found) return found;
            }
        }
        return null;
    };

    // Find the current (root) category node from the tree — drives the sub-category tabs
    const currentCategoryNode = useMemo(() => {
        if (!rootTarget) return null;
        return findNode(CATEGORY_DATA, rootTarget);
    }, [rootTarget]);


    // Render Item
    const renderProductItem = ({ item }: { item: ProductObject }) => (
        <TouchableOpacity
            style={styles.productCard}
            onPress={() => router.push(`/product/${item.productId}`)}
            activeOpacity={0.9}
        >
            <View style={styles.imageContainer}>
                {item.images?.[0] ? (
                    <Image
                        source={typeof item.images[0] === 'string' ? { uri: item.images[0] } : item.images[0]}
                        style={styles.productImage}
                    />
                ) : (
                    <View style={styles.placeholderImage}>
                        <Feather name="image" size={24} color="#ccc" />
                    </View>
                )}

                {/* Favorite Icon */}
                <TouchableOpacity
                    style={styles.favoriteButton}
                    onPress={() => isInWishlist(item.productId) ? removeFromWishlist(item.productId) : addToWishlist(item)}
                >
                    <Ionicons
                        name={isInWishlist(item.productId) ? "heart" : "heart-outline"}
                        size={20}
                        color={isInWishlist(item.productId) ? "#FF3B30" : "#333"}
                    />
                </TouchableOpacity>

                {/* New Arrival Badge (Mock logic: odd IDs) */}
                {/* {parseInt(item.productId) % 2 !== 0 && (
                    <View style={styles.newBadge}>
                        <Text style={styles.newBadgeText}>NEW ARRIVAL</Text>
                    </View>
                )} */}
            </View>

            <View style={styles.productInfo}>
                {/* Brand / Subtitle */}
                <Text style={styles.productBrand}>
                    {item.deepestCategoryName ? item.deepestCategoryName.toUpperCase() : (item.subtitle ? item.subtitle.toUpperCase() : 'CLASSIC')}
                </Text>

                {/* Name */}
                <Text style={styles.productName} numberOfLines={2}>{item.productName}</Text>

                {/* Price Row */}
                <View style={styles.priceRow}>
                    <Text style={styles.price}>₹{item.price}</Text>
                    {item.originalPrice && (
                        <Text style={styles.originalPrice}>₹{item.originalPrice}</Text>
                    )}
                </View>
            </View>
        </TouchableOpacity>
    );

    if (loading) {
        return (
            <SafeAreaView style={styles.container} edges={['bottom', 'left', 'right']}>
                <Stack.Screen options={{
                    headerShown: true,
                    title: (subCategoryName as string) || (categoryName as string) || 'Products',
                    headerLeft: () => (
                        <TouchableOpacity onPress={() => router.back()} style={{ marginRight: 10, marginLeft: '10%' }}>
                            <Feather name="chevron-left" size={28} color="#000" />
                        </TouchableOpacity>
                    ),
                    headerShadowVisible: false,
                    headerTitleStyle: { fontWeight: '700', fontSize: 14 },
                    headerTitleAlign: 'center',
                }} />
                <View style={styles.skeletonGrid}>
                    {Array.from({ length: 6 }).map((_, i) => (
                        <SkeletonCard key={i} />
                    ))}
                </View>
            </SafeAreaView>
        );
    }

    if (error) {
        return (
            <SafeAreaView style={styles.centerContainer} edges={['bottom', 'left', 'right']}>
                <Text style={styles.errorText}>{error}</Text>
                <TouchableOpacity onPress={() => loadProducts(1, false)} style={styles.retryButton}>
                    <Text style={styles.retryText}>Retry</Text>
                </TouchableOpacity>
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView style={styles.container} edges={['bottom', 'left', 'right']}>
            <Stack.Screen options={{
                headerShown: true,
                title: currentCategoryNode?.name || 'Products',
                headerLeft: () => (
                    <TouchableOpacity onPress={() => router.back()} style={{ marginRight: 10, marginLeft: '10%' }}>
                        <Feather name="chevron-left" size={28} color="#000" />
                    </TouchableOpacity>
                ),
                headerRight: () => (
                    <View style={{ flexDirection: 'row', gap: 15, marginRight: '10%' }}>
                        <TouchableOpacity onPress={() => router.push('/product-search')}><Feather name="search" size={24} color="#000" /></TouchableOpacity>
                        <TouchableOpacity onPress={() => router.push('/(tabs)/cart')}><Feather name="shopping-bag" size={24} color="#000" /></TouchableOpacity>
                    </View>
                ),
                headerShadowVisible: false,
                headerTitleStyle: { fontWeight: '700', fontSize: 14 },
                headerTitleAlign: 'center' // Android center
            }} />

            {/* Horizontal Filter Bar */}
            {currentCategoryNode?.children && currentCategoryNode.children.length > 0 && (
                <View style={styles.filterContainer}>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterScroll}>
                        {/* 'All' Option */}
                        <TouchableOpacity
                            style={styles.filterItem}
                            onPress={() => onSelectTab('All')}
                        >
                            <View style={[styles.filterCircle, activeFilter === 'All' && styles.filterCircleActive]}>
                                <View style={{ flex: 1, backgroundColor: '#f5f5f5', alignItems: 'center', justifyContent: 'center' }}>
                                    <Text style={{ fontWeight: '800', fontSize: 12 }}>ALL</Text>
                                </View>
                            </View>
                            <Text style={[styles.filterText, activeFilter === 'All' && styles.filterTextActive]}>All</Text>
                        </TouchableOpacity>

                        {/* Children Options */}
                        {currentCategoryNode.children.map((child) => (
                            <TouchableOpacity
                                key={child.id}
                                style={styles.filterItem}
                                onPress={() => onSelectTab(child.name)}
                            >
                                <View style={[styles.filterCircle, activeFilter === child.name && styles.filterCircleActive]}>
                                    {child.image ? (
                                        <Image source={child.image} style={styles.filterImage} />
                                    ) : (
                                        <View style={{ backgroundColor: '#eee', flex: 1 }} />
                                    )}
                                </View>
                                <Text style={[styles.filterText, activeFilter === child.name && styles.filterTextActive]}>
                                    {child.name}
                                </Text>
                            </TouchableOpacity>
                        ))}
                    </ScrollView>
                </View>
            )}

            {/* Count & Sort Bar */}
            <View style={styles.sortBar}>
                <Text style={styles.productCount}>{totalItems} Products</Text>
                <TouchableOpacity style={styles.sortButton} onPress={() => setFilterModalVisible(true)}>
                    <Feather name="sliders" size={14} color="#000" style={{ marginRight: 6 }} />
                    <Text style={styles.sortButtonText}>Sort & Filter</Text>
                </TouchableOpacity>
            </View>

            {/* Product Grid */}
            <FlatList
                data={products}
                renderItem={renderProductItem}
                keyExtractor={item => item.productId}
                numColumns={2}
                columnWrapperStyle={styles.columnWrapper}
                contentContainerStyle={styles.listContent}
                showsVerticalScrollIndicator={false}
                onEndReached={onEndReached}
                onEndReachedThreshold={0.8}
                initialNumToRender={PAGE_SIZE}
                refreshControl={
                    <RefreshControl
                        refreshing={refreshing}
                        onRefresh={onRefresh}
                        colors={['#FBBF24']}
                        tintColor="#FBBF24"
                    />
                }
                ListFooterComponent={
                    loadingMore ? (
                        <View style={styles.footerLoader}>
                            <ActivityIndicator size="small" color={Colors.light.tint} />
                        </View>
                    ) : null
                }
                ListEmptyComponent={
                    <View style={styles.emptyState}>
                        <Feather name="inbox" size={48} color="#ccc" />
                        <Text style={styles.emptyText}>No products found.</Text>
                    </View>
                }
            />

            {/* Filter Modal */}
            <FilterModal
                visible={filterModalVisible}
                onClose={() => setFilterModalVisible(false)}
                onApply={setFilterState}
                initialFilters={filterState}
                availableBrands={availableBrands}
            />
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#fff' },
    centerContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#fff' },
    skeletonGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'space-between',
        paddingHorizontal: width * 0.038,
        paddingTop: 20,
    },
    errorText: { color: 'red', fontSize: 16, marginBottom: 10 },
    retryButton: { padding: 10, backgroundColor: Colors.light.tint, borderRadius: 5 },
    retryText: { fontWeight: 'bold' },

    // Filters
    filterContainer: {
        paddingTop: 5,
        paddingBottom: 10,
        backgroundColor: '#fff',
    },
    filterScroll: {
        paddingHorizontal: width * 0.038,
        gap: width * 0.038,
    },
    filterItem: {
        alignItems: 'center',
        marginRight: width * 0.038,
    },
    filterCircle: {
        width: width * 0.15,
        height: width * 0.15,
        borderRadius: width * 0.075,
        overflow: 'hidden',
        borderWidth: 2,
        borderColor: 'transparent',
        marginBottom: 4,
        backgroundColor: '#f5f5f5',
    },
    filterCircleActive: {
        borderColor: Colors.light.tint,
    },
    filterImage: {
        width: '100%',
        height: '100%',
        resizeMode: 'cover',
    },
    filterText: {
        fontSize: width * 0.03,
        color: '#888',
        fontWeight: '500',
    },
    filterTextActive: {
        color: '#000',
        fontWeight: '700',
    },

    // Sort Bar
    sortBar: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: width * 0.05,
        paddingBottom: 15,
        marginTop: 5,
    },
    productCount: {
        fontSize: width * 0.035,
        fontWeight: '600',
        color: '#555',
    },
    sortButton: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#f5f5f5',
        paddingHorizontal: width * 0.03,
        paddingVertical: 6,
        borderRadius: 20,
    },
    sortButtonText: {
        fontSize: width * 0.03,
        fontWeight: '600',
        color: '#000',
    },

    // Grid
    listContent: { paddingHorizontal: width * 0.038, paddingBottom: 20 },
    columnWrapper: { justifyContent: 'space-between' },
    footerLoader: { paddingVertical: 20, alignItems: 'center' },

    // Product Card
    productCard: {
        width: CARD_WIDTH,
        marginBottom: 20,
    },
    imageContainer: {
        height: CARD_WIDTH * 1.3,
        borderRadius: 12,
        overflow: 'hidden',
        backgroundColor: '#f0f0f0',
        marginBottom: 10,
        position: 'relative',
    },
    productImage: {
        width: '100%',
        height: '100%',
        resizeMode: 'cover',
    },
    placeholderImage: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
    },
    favoriteButton: {
        position: 'absolute',
        top: 10,
        right: 10,
        width: width * 0.08,
        height: width * 0.08,
        borderRadius: width * 0.04,
        backgroundColor: '#fff',
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: '#000',
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
    },
    newBadge: {
        position: 'absolute',
        bottom: 10,
        left: 10,
        backgroundColor: Colors.light.tint,
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 4,
    },
    newBadgeText: {
        fontSize: width * 0.025,
        fontWeight: '800',
        color: '#000',
    },
    productInfo: {
        paddingHorizontal: '2%',
    },
    productBrand: {
        fontSize: width * 0.025,
        fontWeight: '700',
        color: '#9CA3AF',
        marginBottom: 2,
        letterSpacing: 0.5,
    },
    productName: {
        fontSize: width * 0.035,
        fontWeight: '700',
        color: '#111827',
        marginBottom: 4,
        lineHeight: width * 0.05,
    },
    priceRow: {
        flexDirection: 'row',
        alignItems: 'baseline',
        gap: 6,
    },
    price: {
        fontSize: width * 0.038,
        fontWeight: '800',
        color: '#000',
    },
    originalPrice: {
        fontSize: width * 0.03,
        color: '#9CA3AF',
        textDecorationLine: 'line-through',
    },

    // Empty
    emptyState: { alignItems: 'center', marginTop: 50 },
    emptyText: { marginTop: 10, color: '#888' }
});
