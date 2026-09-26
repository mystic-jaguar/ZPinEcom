import { Image } from 'expo-image';
import { Stack, useRouter } from 'expo-router';
import { ArrowLeft, BadgeCheck, ChevronRight, Search, Star, Store, X } from 'lucide-react-native';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, RefreshControl, ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { EmptyState, ZText } from '../../components/ui';
import { Text, TextInput } from '../../components/ui/ScaledText';
import { cldImage } from '../../constants/cloudinary';
import { colors, createStyles, fonts, palette, radius } from '../../constants/theme';
import { productService, Shop } from '../../services/product';

// Chip → the root category names it covers (lowercase, as the API returns them).
// Same grouping as the website's /shops page.
const SHOP_CATEGORIES: { id: string; label: string; roots: string[] | null }[] = [
    { id: 'all', label: 'All Shops', roots: null },
    { id: 'fashion', label: 'Fashion', roots: ['fashion', 'accessories'] },
    { id: 'footwear', label: 'Footwear', roots: ['footwear'] },
    { id: 'beauty', label: 'Beauty', roots: ['beauty'] },
    { id: 'electronics', label: 'Electronics', roots: ['gadgets', 'electrical appliances'] },
    { id: 'home', label: 'Home & Lifestyle', roots: ['home&living', 'furniture', 'decoratives', 'gifts'] },
];

export const shopInitials = (name: string) =>
    name.split(/\s+/).filter(Boolean).slice(0, 2).map(w => w[0]).join('').toUpperCase() || 'Z';

export default function ShopsScreen() {
    const router = useRouter();
    const [shops, setShops] = useState<Shop[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [failed, setFailed] = useState(false);
    const [query, setQuery] = useState('');
    const [category, setCategory] = useState('all');

    const load = useCallback(async () => {
        try {
            setShops(await productService.getShops());
            setFailed(false);
        } catch {
            setFailed(true);
        }
    }, []);

    useEffect(() => { load().finally(() => setLoading(false)); }, [load]);

    const onRefresh = async () => { setRefreshing(true); await load(); setRefreshing(false); };

    const visible = useMemo(() => {
        const roots = SHOP_CATEGORIES.find(c => c.id === category)?.roots;
        const q = query.trim().toLowerCase();
        return shops.filter(s =>
            (!roots || s.categories.some(c => roots.includes(c))) &&
            (!q || s.name.toLowerCase().includes(q)));
    }, [shops, category, query]);

    const header = (
        <>
            <View style={styles.hero}>
                <ZText variant="eyebrow">Shop local</ZText>
                <ZText variant="h2" style={styles.heroTitle}>Every shop near you, in one place</ZText>
                <ZText variant="muted" style={styles.heroBody}>Browse local stores and see everything they sell on ZPIN.</ZText>
            </View>
            <View style={styles.searchField}>
                <Search size={18} color={colors.textStrong} />
                <TextInput
                    style={styles.searchInput}
                    placeholder="Search shops by name"
                    placeholderTextColor={colors.textFaint}
                    value={query}
                    onChangeText={setQuery}
                    returnKeyType="search"
                />
                {query.length > 0 && (
                    <Pressable onPress={() => setQuery('')} hitSlop={8} accessibilityLabel="Clear search">
                        <X size={18} color={colors.textFaint} />
                    </Pressable>
                )}
            </View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips} style={styles.chipsScroll}>
                {SHOP_CATEGORIES.map(c => {
                    const active = c.id === category;
                    return (
                        <Pressable key={c.id} onPress={() => setCategory(c.id)} style={[styles.chip, active && styles.chipActive]} accessibilityState={{ selected: active }}>
                            <Text style={[styles.chipText, active && styles.chipTextActive]}>{c.label}</Text>
                        </Pressable>
                    );
                })}
            </ScrollView>
            {!loading && shops.length > 0 && (
                <Text style={styles.count}>{visible.length} shop{visible.length !== 1 ? 's' : ''}</Text>
            )}
        </>
    );

    return (
        <SafeAreaView style={styles.container} edges={['top']}>
            <Stack.Screen options={{ headerShown: false }} />
            <View style={styles.topBar}>
                <Pressable onPress={() => router.back()} hitSlop={10} style={styles.iconBtn} accessibilityLabel="Go back">
                    <ArrowLeft size={20} color={colors.textStrong} />
                </Pressable>
                <ZText variant="h3" style={styles.topTitle}>Shops</ZText>
                <View style={styles.iconBtn} />
            </View>

            {loading ? (
                <View style={styles.center}><ActivityIndicator size="large" color={palette.yellow500} /></View>
            ) : failed && shops.length === 0 ? (
                <EmptyState
                    badge="OFFLINE"
                    BadgeIcon={Store}
                    title="Couldn't load"
                    accent="the shops"
                    body="Check your connection and try again."
                    ctaLabel="Try again"
                    onCta={() => { setLoading(true); load().finally(() => setLoading(false)); }}
                />
            ) : (
                <FlatList
                    data={visible}
                    keyExtractor={s => s.id}
                    renderItem={({ item }) => (
                        <ShopCard shop={item} onPress={() => router.push({ pathname: '/shops/[id]', params: { id: item.id } } as any)} />
                    )}
                    ListHeaderComponent={header}
                    ListEmptyComponent={
                        <View style={styles.empty}>
                            <Store size={28} color={colors.textFaint} />
                            <Text style={styles.emptyText}>
                                {shops.length === 0 ? 'No shops deliver to your area yet.' : 'No shops match that search.'}
                            </Text>
                        </View>
                    }
                    contentContainerStyle={styles.list}
                    keyboardShouldPersistTaps="handled"
                    showsVerticalScrollIndicator={false}
                    refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[palette.yellow500]} tintColor={palette.yellow500} />}
                />
            )}
        </SafeAreaView>
    );
}

function ShopCard({ shop, onPress }: { shop: Shop; onPress: () => void }) {
    const comingSoon = shop.product_count === 0;
    return (
        <Pressable onPress={onPress} disabled={comingSoon} style={({ pressed }) => [styles.card, pressed && { opacity: 0.9 }]} accessibilityRole="button" accessibilityLabel={`${shop.name} shop`}>
            <View style={styles.cardMedia}>
                {shop.image ? (
                    <Image source={{ uri: cldImage(shop.image, 400) }} style={styles.cardImage} contentFit="cover" transition={150} cachePolicy="memory-disk" />
                ) : (
                    <View style={styles.cardFallback}><Text style={styles.cardInitials}>{shopInitials(shop.name)}</Text></View>
                )}
            </View>
            <View style={styles.cardBody}>
                <View style={styles.nameRow}>
                    <Text style={styles.cardName} numberOfLines={1}>{shop.name}</Text>
                    {shop.verified && <BadgeCheck size={16} color={palette.yellow500} fill={colors.textStrong} accessibilityLabel="Verified seller" />}
                </View>
                <Text style={styles.cardDesc} numberOfLines={2}>
                    {shop.description || `Browse everything ${shop.name} sells on ZPIN.`}
                </Text>
                <View style={styles.metaRow}>
                    {shop.review_count > 0 && shop.rating != null && (
                        <View style={styles.metaPill}>
                            <Star size={11} color={palette.yellow500} fill={palette.yellow500} />
                            <Text style={styles.metaText}>{shop.rating.toFixed(1)} ({shop.review_count})</Text>
                        </View>
                    )}
                    <View style={[styles.metaPill, comingSoon && styles.soonPill]}>
                        <Text style={styles.metaText}>
                            {comingSoon ? 'Coming soon' : `${shop.product_count} product${shop.product_count !== 1 ? 's' : ''}`}
                        </Text>
                    </View>
                </View>
            </View>
            {!comingSoon && <ChevronRight size={18} color={colors.textFaint} style={styles.chevron} />}
        </Pressable>
    );
}

const styles = createStyles({
    container: { flex: 1, backgroundColor: palette.paperWarm },
    center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
    topBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 8 },
    iconBtn: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
    topTitle: { flex: 1, textAlign: 'center' },

    list: { paddingHorizontal: 20, paddingBottom: 40 },
    hero: { paddingTop: 6, paddingBottom: 16, gap: 6 },
    heroTitle: { marginTop: 2 },
    heroBody: { fontSize: 14 },

    searchField: {
        flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: colors.surfaceCard,
        borderWidth: 2, borderColor: colors.borderInk, borderRadius: radius.md, minHeight: 48, paddingHorizontal: 14,
    },
    searchInput: { flex: 1, fontFamily: fonts.bodyMedium, fontSize: 15, color: colors.textStrong, paddingVertical: 10 },

    chipsScroll: { marginHorizontal: -20, marginTop: 14 },
    chips: { paddingHorizontal: 20, gap: 8 },
    chip: {
        paddingHorizontal: 14, minHeight: 36, justifyContent: 'center', borderRadius: 18,
        borderWidth: 1, borderColor: colors.borderStrong, backgroundColor: colors.surfaceCard,
    },
    chipActive: { backgroundColor: colors.surfaceInverse, borderColor: colors.surfaceInverse },
    chipText: { fontFamily: fonts.bodySemiBold, fontSize: 13, color: colors.textBody },
    chipTextActive: { color: colors.textInvert },
    count: { fontFamily: fonts.bodySemiBold, fontSize: 12.5, color: colors.textMuted, marginTop: 16, marginBottom: 10 },

    card: {
        flexDirection: 'row', alignItems: 'center', gap: 14, padding: 12, marginBottom: 12,
        backgroundColor: colors.surfaceCard, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.borderSubtle,
    },
    cardMedia: { width: 84, height: 84, borderRadius: radius.md, overflow: 'hidden', backgroundColor: colors.surfaceSunken },
    cardImage: { width: '100%', height: '100%' },
    cardFallback: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: palette.yellow50 },
    cardInitials: { fontFamily: fonts.displayBold, fontSize: 26, color: colors.textStrong },
    cardBody: { flex: 1, minWidth: 0 },
    nameRow: { flexDirection: 'row', alignItems: 'center', gap: 5 },
    cardName: { flexShrink: 1, fontFamily: fonts.bodyBold, fontSize: 15.5, color: colors.textStrong },
    cardDesc: { fontFamily: fonts.bodyRegular, fontSize: 12.5, lineHeight: 17, color: colors.textMuted, marginTop: 3 },
    metaRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 8 },
    metaPill: {
        flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 3,
        borderRadius: 100, backgroundColor: colors.surfaceSunken,
    },
    soonPill: { backgroundColor: palette.yellow50 },
    metaText: { fontFamily: fonts.bodySemiBold, fontSize: 11, color: colors.textBody },
    chevron: { marginLeft: -4 },

    empty: { alignItems: 'center', gap: 10, paddingVertical: 48 },
    emptyText: { fontFamily: fonts.bodyMedium, fontSize: 14, color: colors.textMuted, textAlign: 'center' },
});
