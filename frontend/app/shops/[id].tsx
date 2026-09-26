import { Image } from 'expo-image';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { ArrowLeft, BadgeCheck, PackageSearch, Search, Star, Store, X } from 'lucide-react-native';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, RefreshControl, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { EmptyState, ProductCard, ZText, isNewProduct } from '../../components/ui';
import { Text, TextInput } from '../../components/ui/ScaledText';
import { cldImage } from '../../constants/cloudinary';
import { colors, createStyles, fonts, palette, productGridCardWidth, radius } from '../../constants/theme';
import { useRequireAuth } from '../../context/AuthPromptContext';
import { useWishlist } from '../../context/WishlistContext';
import { productService, Shop } from '../../services/product';
import { ProductObject } from '../../types/types';
import { productOneLiner } from '../../utils/productDetail';
import { shopInitials } from './index';

const PAGE = 20;

export default function ShopScreen() {
    const { id } = useLocalSearchParams<{ id: string }>();
    const router = useRouter();
    const requireAuth = useRequireAuth();
    const { addToWishlist, removeFromWishlist, isInWishlist } = useWishlist();

    const [shop, setShop] = useState<Shop | null>(null);
    const [products, setProducts] = useState<ProductObject[]>([]);
    const [total, setTotal] = useState(0);
    const [page, setPage] = useState(1);
    const [hasMore, setHasMore] = useState(false);
    const [loading, setLoading] = useState(true);
    const [searching, setSearching] = useState(false);
    const [loadingMore, setLoadingMore] = useState(false);
    const [refreshing, setRefreshing] = useState(false);
    const [notFound, setNotFound] = useState(false);
    const [query, setQuery] = useState('');
    const debounce = useRef<ReturnType<typeof setTimeout> | null>(null);
    const reqSeq = useRef(0); // drop responses from a superseded search

    const fetchPage = useCallback(async (p: number, q: string) => {
        const seq = ++reqSeq.current;
        const res = await productService.getShop(String(id), { page: p, limit: PAGE, q: q.trim() || undefined });
        if (seq !== reqSeq.current) return;
        setShop(res.shop);
        setProducts(prev => (p === 1 ? res.products : [...prev, ...res.products]));
        setTotal(res.pagination.totalItems);
        setHasMore(res.pagination.hasNextPage);
        setPage(p);
        setNotFound(false);
    }, [id]);

    useEffect(() => {
        fetchPage(1, '').catch(() => setNotFound(true)).finally(() => setLoading(false));
    }, [fetchPage]);

    useEffect(() => () => { if (debounce.current) clearTimeout(debounce.current); }, []);

    const onQuery = (text: string) => {
        setQuery(text);
        if (debounce.current) clearTimeout(debounce.current);
        debounce.current = setTimeout(() => {
            setSearching(true);
            fetchPage(1, text).catch(() => {}).finally(() => setSearching(false));
        }, 350);
    };

    const loadMore = () => {
        if (!hasMore || loadingMore || searching) return;
        setLoadingMore(true);
        fetchPage(page + 1, query).catch(() => {}).finally(() => setLoadingMore(false));
    };

    const onRefresh = async () => {
        setRefreshing(true);
        await fetchPage(1, query).catch(() => {});
        setRefreshing(false);
    };

    const topBar = (
        <View style={styles.topBar}>
            <Pressable onPress={() => router.back()} hitSlop={10} style={styles.iconBtn} accessibilityLabel="Go back">
                <ArrowLeft size={20} color={colors.textStrong} />
            </Pressable>
            <ZText variant="h3" style={styles.topTitle} numberOfLines={1}>{shop?.name || 'Shop'}</ZText>
            <Pressable onPress={() => router.push('/shops' as any)} hitSlop={10} style={styles.iconBtn} accessibilityLabel="All shops">
                <Store size={20} color={colors.textStrong} />
            </Pressable>
        </View>
    );

    if (loading) {
        return (
            <SafeAreaView style={styles.container} edges={['top']}>
                <Stack.Screen options={{ headerShown: false }} />
                {topBar}
                <View style={styles.center}><ActivityIndicator size="large" color={palette.yellow500} /></View>
            </SafeAreaView>
        );
    }

    if (notFound || !shop) {
        return (
            <SafeAreaView style={styles.container} edges={['top']}>
                <Stack.Screen options={{ headerShown: false }} />
                <EmptyState
                    badge="UNAVAILABLE"
                    BadgeIcon={Store}
                    title="This shop is"
                    accent="not available"
                    body="It may not deliver to your area, or it's no longer on ZPIN. Plenty of other shops to explore!"
                    ctaLabel="Browse all shops"
                    onCta={() => router.replace('/shops' as any)}
                    secondaryLabel="Go back"
                    onSecondary={() => router.back()}
                />
            </SafeAreaView>
        );
    }

    const header = (
        <>
            <View style={styles.shopHead}>
                <View style={styles.logo}>
                    {shop.image ? (
                        <Image source={{ uri: cldImage(shop.image, 160) }} style={styles.logoImage} contentFit="cover" cachePolicy="memory-disk" />
                    ) : (
                        <Text style={styles.logoInitials}>{shopInitials(shop.name)}</Text>
                    )}
                </View>
                <View style={styles.shopInfo}>
                    <View style={styles.nameRow}>
                        <Text style={styles.shopName} numberOfLines={2}>{shop.name}</Text>
                        {shop.verified && <BadgeCheck size={18} color={palette.yellow500} fill={colors.textStrong} accessibilityLabel="Verified seller" />}
                    </View>
                    <View style={styles.metaRow}>
                        {shop.review_count > 0 && shop.rating != null && (
                            <View style={styles.metaPill}>
                                <Star size={11} color={palette.yellow500} fill={palette.yellow500} />
                                <Text style={styles.metaText}>{shop.rating.toFixed(1)} ({shop.review_count})</Text>
                            </View>
                        )}
                        <View style={styles.metaPill}>
                            <Text style={styles.metaText}>{shop.product_count} product{shop.product_count !== 1 ? 's' : ''}</Text>
                        </View>
                    </View>
                </View>
            </View>
            {!!shop.description && <Text style={styles.desc}>{shop.description}</Text>}

            <View style={styles.searchField}>
                <Search size={18} color={colors.textStrong} />
                <TextInput
                    style={styles.searchInput}
                    placeholder={`Search in ${shop.name}`}
                    placeholderTextColor={colors.textFaint}
                    value={query}
                    onChangeText={onQuery}
                    returnKeyType="search"
                />
                {searching ? <ActivityIndicator size="small" color={colors.textFaint} />
                    : query.length > 0 && (
                        <Pressable onPress={() => onQuery('')} hitSlop={8} accessibilityLabel="Clear search">
                            <X size={18} color={colors.textFaint} />
                        </Pressable>
                    )}
            </View>
            <Text style={styles.count}>
                {query.trim() ? `${total} result${total !== 1 ? 's' : ''}` : `All products · ${total}`}
            </Text>
        </>
    );

    return (
        <SafeAreaView style={styles.container} edges={['top']}>
            <Stack.Screen options={{ headerShown: false }} />
            {topBar}
            <FlatList
                data={products}
                keyExtractor={p => p.productId}
                numColumns={2}
                columnWrapperStyle={styles.columnWrapper}
                contentContainerStyle={styles.list}
                ListHeaderComponent={header}
                renderItem={({ item }) => (
                    <ProductCard
                        width={productGridCardWidth}
                        style={styles.gridCard}
                        image={item.images?.[0] ?? require('../../assets/images/icon_backup.png')}
                        brand={item.deepestCategoryName}
                        name={item.productName}
                        detail={productOneLiner(item)}
                        price={item.price}
                        originalPrice={item.originalPrice ?? undefined}
                        discount={(item.discount ?? 0) > 0 ? `${item.discount}% OFF` : undefined}
                        wished={isInWishlist(item.productId)}
                        onWishlist={() => {
                            if (!requireAuth('Log in to save items to your wishlist.')) return;
                            if (isInWishlist(item.productId)) removeFromWishlist(item.productId); else addToWishlist(item);
                        }}
                        onPress={() => router.push(`/product/${item.productId}`)}
                        rating={item.rating}
                        isNew={isNewProduct(item.timeStamp)}
                        actionsFor={item}
                    />
                )}
                ListEmptyComponent={
                    <View style={styles.empty}>
                        <PackageSearch size={28} color={colors.textFaint} />
                        <Text style={styles.emptyText}>
                            {query.trim() ? `Nothing in this shop matches “${query.trim()}”.` : 'This shop has no products listed yet.'}
                        </Text>
                    </View>
                }
                ListFooterComponent={loadingMore ? <ActivityIndicator style={{ marginVertical: 16 }} color={palette.yellow500} /> : null}
                onEndReached={loadMore}
                onEndReachedThreshold={0.5}
                keyboardShouldPersistTaps="handled"
                showsVerticalScrollIndicator={false}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[palette.yellow500]} tintColor={palette.yellow500} />}
            />
        </SafeAreaView>
    );
}

const styles = createStyles({
    container: { flex: 1, backgroundColor: palette.paperWarm },
    center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
    topBar: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 20, paddingVertical: 8 },
    iconBtn: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
    topTitle: { flex: 1, textAlign: 'center' },

    list: { paddingHorizontal: 20, paddingBottom: 40 },
    columnWrapper: { justifyContent: 'space-between' },
    gridCard: { marginBottom: 18 },

    shopHead: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingTop: 6 },
    logo: {
        width: 72, height: 72, borderRadius: 36, overflow: 'hidden', alignItems: 'center', justifyContent: 'center',
        backgroundColor: palette.yellow50, borderWidth: 2, borderColor: colors.borderInk,
    },
    logoImage: { width: '100%', height: '100%' },
    logoInitials: { fontFamily: fonts.displayBold, fontSize: 24, color: colors.textStrong },
    shopInfo: { flex: 1, minWidth: 0 },
    nameRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
    shopName: { flexShrink: 1, fontFamily: fonts.displayBold, fontSize: 22, color: colors.textStrong, letterSpacing: -0.5 },
    metaRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 6 },
    metaPill: {
        flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 3,
        borderRadius: 100, backgroundColor: colors.surfaceSunken,
    },
    metaText: { fontFamily: fonts.bodySemiBold, fontSize: 11, color: colors.textBody },
    desc: { fontFamily: fonts.bodyRegular, fontSize: 13.5, lineHeight: 19, color: colors.textMuted, marginTop: 12 },

    searchField: {
        flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: colors.surfaceCard, marginTop: 16,
        borderWidth: 2, borderColor: colors.borderInk, borderRadius: radius.md, minHeight: 48, paddingHorizontal: 14,
    },
    searchInput: { flex: 1, fontFamily: fonts.bodyMedium, fontSize: 15, color: colors.textStrong, paddingVertical: 10 },
    count: { fontFamily: fonts.bodySemiBold, fontSize: 12.5, color: colors.textMuted, marginTop: 16, marginBottom: 12 },

    empty: { alignItems: 'center', gap: 10, paddingVertical: 48, paddingHorizontal: 20 },
    emptyText: { fontFamily: fonts.bodyMedium, fontSize: 14, color: colors.textMuted, textAlign: 'center' },
});
