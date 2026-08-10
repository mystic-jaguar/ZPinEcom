import { Image } from 'expo-image';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { ChevronLeft, PackageSearch, Search, ShoppingBag, SlidersHorizontal } from 'lucide-react-native';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Dimensions, FlatList, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import FilterModal, { FilterState } from '../components/product/FilterModal';
import SkeletonCard from '../components/product/SkeletonCard';
import { ProductCard, ZButton, ZText } from '../components/ui';
import { CATEGORY_DATA, CategoryNode } from '../constants/categories';
import { colors, fonts, palette, radius } from '../constants/theme';
import { useWishlist } from '../context/WishlistContext';
import { productService, ProductListParams } from '../services/product';
import { ProductObject } from '../types/types';
import { productOneLiner } from '../utils/productDetail';

const { width } = Dimensions.get('window');
const PAGE_SIZE = 20;

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

    const [products, setProducts] = useState<ProductObject[]>([]);
    const [loading, setLoading] = useState(true);
    const [loadingMore, setLoadingMore] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [refreshing, setRefreshing] = useState(false);

    const [page, setPage] = useState(1);
    const [hasNextPage, setHasNextPage] = useState(false);
    const [totalItems, setTotalItems] = useState(0);

    const [activeFilter, setActiveFilter] = useState<string>('All');
    const [availableBrands, setAvailableBrands] = useState<string[]>([]);

    const [filterModalVisible, setFilterModalVisible] = useState(false);
    const [filterState, setFilterState] = useState<FilterState>({
        sortBy: 'relevance', priceRanges: [], brands: [], ratings: [], discounts: [],
    });

    const rootTarget = (subCategoryName as string) || (categoryName as string) || '';
    const effectiveCategory = activeFilter === 'All' ? rootTarget : activeFilter;
    const isAllMode = !rootTarget;

    const buildParams = useCallback((pageNum: number): ProductListParams => {
        const p: ProductListParams = {
            page: pageNum, limit: PAGE_SIZE,
            sort: filterState.sortBy === 'discount' ? 'relevance' : filterState.sortBy,
        };
        if (filterState.ratings.length > 0) p.minRating = Math.min(...filterState.ratings.map(r => parseFloat(r)));
        if (filterState.brands.length > 0) p.brands = filterState.brands.join(',');
        if (filterState.priceRanges.length > 0) {
            p.priceBands = filterState.priceRanges.map(r => PRICE_BAND_MAP[r]).filter(Boolean).join(',');
        }
        return p;
    }, [filterState]);

    const requestIdRef = useRef(0);
    const fetchingRef = useRef(false);
    const pageRef = useRef(1);
    const hasNextRef = useRef(false);

    const loadProducts = useCallback(async (pageNum: number, append: boolean) => {
        if (append && fetchingRef.current) return;
        fetchingRef.current = true;
        const reqId = ++requestIdRef.current;
        try {
            if (append) setLoadingMore(true);
            else { setLoading(true); setError(null); }
            const response = isAllMode
                ? await productService.getProducts(buildParams(pageNum))
                : await productService.getProductsByCategory(effectiveCategory, buildParams(pageNum));
            if (reqId !== requestIdRef.current) return;

            const items = response.products || [];
            setProducts(prev => {
                if (!append) return items;
                const seen = new Set(prev.map(p => p.productId));
                return [...prev, ...items.filter(p => !seen.has(p.productId))];
            });
            pageRef.current = pageNum;
            hasNextRef.current = !!response.pagination?.hasNextPage;
            setPage(pageNum);
            setHasNextPage(hasNextRef.current);
            setTotalItems(response.pagination?.totalItems ?? items.length);
            if (!append) {
                const brands = (response as { brands?: string[] }).brands || [];
                setAvailableBrands(brands.map(b => b.toUpperCase()));
            }
        } catch (err: any) {
            if (reqId !== requestIdRef.current) return;
            if (!append) setError(err.message || 'Failed to load products');
        } finally {
            if (reqId === requestIdRef.current) {
                setLoading(false);
                setLoadingMore(false);
                fetchingRef.current = false;
            }
        }
    }, [effectiveCategory, isAllMode, buildParams]);

    useEffect(() => { loadProducts(1, false); }, [loadProducts]);

    const onRefresh = async () => {
        setRefreshing(true);
        await loadProducts(1, false);
        setRefreshing(false);
    };

    const onEndReached = () => {
        if (fetchingRef.current || !hasNextRef.current) return;
        loadProducts(pageRef.current + 1, true);
    };

    const onSelectTab = (name: string) => {
        setActiveFilter(name);
        setFilterState(prev => (prev.brands.length ? { ...prev, brands: [] } : prev));
    };

    const hasActiveFilters =
        filterState.priceRanges.length > 0 ||
        filterState.brands.length > 0 ||
        filterState.ratings.length > 0 ||
        filterState.discounts.length > 0;

    const clearFilters = () => {
        setActiveFilter('All');
        setFilterState({ sortBy: 'relevance', priceRanges: [], brands: [], ratings: [], discounts: [] });
    };

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

    const currentCategoryNode = useMemo(() => {
        if (!rootTarget) return null;
        return findNode(CATEGORY_DATA, rootTarget);
    }, [rootTarget]);

    const screenTitle = isAllMode
        ? 'Latest arrivals'
        : (currentCategoryNode?.name || (subCategoryName as string) || (categoryName as string) || 'Products');

    // Plain stack back. This screen used to force every exit — header, hardware
    // back and swipe — to a computed "parent" (the Categories tab, re-drilled),
    // which sent people somewhere they had never been. Back now means back;
    // `dismissTo` only covers the case of nothing left to pop.
    const goBack = useCallback(() => {
        if (router.canGoBack()) router.back();
        else router.replace('/(tabs)');
    }, [router]);

    const renderProductItem = ({ item }: { item: ProductObject }) => (
        <ProductCard
            style={styles.gridCard}
            image={item.images?.[0] ?? require('../assets/images/icon_backup.png')}
            brand={item.deepestCategoryName || item.subtitle || 'CLASSIC'}
            name={item.productName}
            detail={productOneLiner(item)}
            price={item.price}
            originalPrice={item.originalPrice ?? undefined}
            discount={(item.discount ?? 0) > 0 ? `${item.discount}% OFF` : undefined}
            wished={isInWishlist(item.productId)}
            onWishlist={() => (isInWishlist(item.productId) ? removeFromWishlist(item.productId) : addToWishlist(item))}
            onPress={() => router.push(`/product/${item.productId}`)}
        />
    );

    const Header = () => (
        <View style={styles.topBar}>
            <Pressable style={styles.backBtn} onPress={goBack}>
                <ChevronLeft size={22} color={colors.textStrong} />
            </Pressable>
            <ZText variant="h3" style={styles.title} numberOfLines={1}>{screenTitle}</ZText>
            <View style={styles.topIcons}>
                <Pressable onPress={() => router.push('/product-search')} hitSlop={6}><Search size={22} color={colors.textStrong} /></Pressable>
                <Pressable onPress={() => router.push('/(tabs)/cart')} hitSlop={6}><ShoppingBag size={22} color={colors.textStrong} /></Pressable>
            </View>
        </View>
    );

    if (loading) {
        return (
            <SafeAreaView style={styles.container} edges={['top']}>
                <Stack.Screen options={{ headerShown: false }} />
                <Header />
                <View style={styles.skeletonGrid}>
                    {Array.from({ length: 6 }).map((_, i) => <SkeletonCard key={i} />)}
                </View>
            </SafeAreaView>
        );
    }

    if (error) {
        return (
            <SafeAreaView style={styles.container} edges={['top']}>
                <Stack.Screen options={{ headerShown: false }} />
                <Header />
                <View style={styles.center}>
                    <ZText variant="muted" style={{ marginBottom: 16 }}>{error}</ZText>
                    <ZButton label="Retry" fullWidth={false} onPress={() => loadProducts(1, false)} />
                </View>
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView style={styles.container} edges={['top']}>
            <Stack.Screen options={{ headerShown: false }} />
            <Header />

            {currentCategoryNode?.children && currentCategoryNode.children.length > 0 && (
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.tabsScroll} contentContainerStyle={styles.tabs}>
                    {['All', ...currentCategoryNode.children.map(c => c.name)].map((name) => {
                        const active = activeFilter === name;
                        return (
                            <Pressable key={name} style={[styles.tab, active && styles.tabActive]} onPress={() => onSelectTab(name)}>
                                <Text style={[styles.tabText, active && styles.tabTextActive]}>{name}</Text>
                            </Pressable>
                        );
                    })}
                </ScrollView>
            )}

            <View style={styles.sortBar}>
                <ZText variant="eyebrow" color={colors.textMuted}>{totalItems} products</ZText>
                {!isAllMode && (
                    <Pressable style={styles.sortBtn} onPress={() => setFilterModalVisible(true)}>
                        <SlidersHorizontal size={14} color={colors.textStrong} />
                        <Text style={styles.sortText}>Sort & filter</Text>
                    </Pressable>
                )}
            </View>

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
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[palette.yellow500]} tintColor={palette.yellow500} />}
                ListFooterComponent={loadingMore ? <View style={styles.footerLoader}><ActivityIndicator size="small" color={palette.yellow600} /></View> : null}
                ListEmptyComponent={
                    <View style={styles.empty}>
                        <View style={styles.emptyIcon}>
                            <PackageSearch size={34} color={colors.textMuted} strokeWidth={1.75} />
                        </View>
                        <ZText variant="h3" style={styles.emptyTitle}>Nothing here yet</ZText>
                        <ZText variant="muted" style={styles.emptyText}>
                            {hasActiveFilters
                                ? "No products match these filters. Try loosening them a little."
                                : "We haven't stocked this collection yet — check back soon."}
                        </ZText>
                        {hasActiveFilters
                            ? <ZButton label="Clear filters" size="md" fullWidth={false} onPress={clearFilters} style={styles.emptyBtn} />
                            : <ZButton label="Browse all products" variant="outline" size="md" fullWidth={false} onPress={() => router.replace('/product-listing')} style={styles.emptyBtn} />}
                    </View>
                }
            />

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
    container: { flex: 1, backgroundColor: palette.paperWarm },
    center: { flex: 1, justifyContent: 'center', alignItems: 'center' },

    topBar: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 20, paddingTop: 6, paddingBottom: 10 },
    backBtn: { width: 40, height: 40, borderRadius: 20, borderWidth: 2, borderColor: colors.borderInk, alignItems: 'center', justifyContent: 'center' },
    title: { flex: 1 },
    topIcons: { flexDirection: 'row', gap: 16 },

    tabsScroll: { flexGrow: 0, flexShrink: 0 },
    tabs: { paddingHorizontal: 20, gap: 8, paddingTop: 6, paddingBottom: 12 },
    tab: { height: 38, paddingHorizontal: 16, borderRadius: 100, borderWidth: 2, borderColor: colors.borderSubtle, backgroundColor: colors.surfaceCard, justifyContent: 'center' },
    tabActive: { backgroundColor: colors.surfaceInverse, borderColor: colors.surfaceInverse },
    tabText: { fontFamily: fonts.bodyBold, fontSize: 13, color: colors.textBody },
    tabTextActive: { color: colors.textInvert },

    sortBar: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 12 },
    sortBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: colors.surfaceSunken, paddingHorizontal: 12, paddingVertical: 7, borderRadius: 100 },
    sortText: { fontFamily: fonts.bodyBold, fontSize: 12, color: colors.textStrong },

    listContent: { flexGrow: 1, paddingHorizontal: 20, paddingBottom: 30 },
    columnWrapper: { justifyContent: 'space-between' },
    gridCard: { width: (width - 40 - 14) / 2, marginBottom: 20 },
    footerLoader: { paddingVertical: 20, alignItems: 'center' },
    skeletonGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', paddingHorizontal: 20, paddingTop: 16 },
    empty: { flexGrow: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 40, paddingBottom: 40 },
    emptyIcon: { width: 76, height: 76, borderRadius: 38, backgroundColor: colors.surfaceSunken, alignItems: 'center', justifyContent: 'center', marginBottom: 20 },
    emptyTitle: { marginBottom: 8 },
    emptyText: { textAlign: 'center', lineHeight: 21, marginBottom: 22 },
    emptyBtn: { paddingHorizontal: 28, alignSelf: 'center' },
});
