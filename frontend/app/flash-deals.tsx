import { Stack, useRouter } from 'expo-router';
import { Zap } from 'lucide-react-native';
import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Dimensions, FlatList, RefreshControl, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AppHeader, EmptyState, ProductCard, ZText } from '../components/ui';
import { createStyles, colors, fonts, palette, radius, productGridCardWidth } from '../constants/theme';
import { FlashDeal, flashDealService } from '../services/flashDeals';
import { Text } from '../components/ui/ScaledText';

const { width } = Dimensions.get('window');
const CARD_W = productGridCardWidth;

/** mm:ss / h:mm:ss left, or 'Ended'. Ticks once a second. */
export function useCountdown(endsAt: string): { label: string; urgent: boolean } {
    const [state, setState] = useState({ label: '', urgent: false });
    useEffect(() => {
        const tick = () => {
            const diff = new Date(endsAt).getTime() - Date.now();
            if (!Number.isFinite(diff) || diff <= 0) return setState({ label: 'Ended', urgent: false });
            const h = Math.floor(diff / 3600000);
            const m = Math.floor((diff % 3600000) / 60000);
            const s = Math.floor((diff % 60000) / 1000);
            setState({
                label: `${h > 0 ? `${h}h ` : ''}${String(m).padStart(2, '0')}m ${String(s).padStart(2, '0')}s`,
                // Under an hour reads red, same threshold as the website's timer.
                urgent: diff < 3600000,
            });
        };
        tick();
        const id = setInterval(tick, 1000);
        return () => clearInterval(id);
    }, [endsAt]);
    return state;
}

function DealCard({ deal, onPress }: { deal: FlashDeal; onPress: () => void }) {
    const { label: left, urgent } = useCountdown(deal.endsAt);
    const soldPct = deal.totalStock > 0
        ? Math.min(100, Math.round(((deal.totalStock - deal.stockRemaining) / deal.totalStock) * 100))
        : 0;
    const lowStock = deal.stockRemaining > 0 && deal.stockRemaining <= 5;

    return (
        <View style={{ width: CARD_W }}>
            <ProductCard
                width={CARD_W}
                image={deal.images?.[0] || ''}
                name={deal.productName}
                price={deal.dealPrice}
                originalPrice={deal.originalPrice}
                discount={deal.discountPercent > 0 ? `${deal.discountPercent}%` : undefined}
                onPress={onPress}
            />
            <View style={styles.meta}>
                {/* The admin sets a label per deal ("Weekend Steal", "Festive Drop");
                    it was fetched but never shown, so every deal read as generic. */}
                <View style={styles.labelChip}>
                    <Zap size={9} color={palette.yellow900} fill={palette.yellow500} />
                    <Text style={styles.labelText} numberOfLines={1}>{deal.label}</Text>
                </View>
                <View style={styles.timerRow}>
                    <Zap size={11} color={urgent ? palette.red600 : palette.yellow600} fill={urgent ? palette.red500 : palette.yellow500} />
                    <Text style={[styles.timer, urgent && styles.timerUrgent]}>{left}</Text>
                </View>
                <View style={styles.barTrack}>
                    <View style={[styles.barFill, lowStock && styles.barFillLow, { width: `${soldPct}%` }]} />
                </View>
                <Text style={[styles.stock, lowStock && styles.stockLow]}>
                    {lowStock ? `Only ${deal.stockRemaining} left!` : `${deal.stockRemaining} left of ${deal.totalStock}`}
                </Text>
            </View>
        </View>
    );
}

export default function FlashDealsScreen() {
    const router = useRouter();
    const [deals, setDeals] = useState<FlashDeal[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    const load = useCallback(async () => {
        const data = await flashDealService.getFlashDeals();
        setDeals(data);
        setLoading(false);
        setRefreshing(false);
    }, []);

    useEffect(() => { load(); }, [load]);

    return (
        <SafeAreaView style={styles.screen} edges={['top']}>
            <Stack.Screen options={{ headerShown: false }} />
            <AppHeader title="Flash Deals" />
            <ZText variant="body" style={styles.sub}>
                Limited stock, limited time — the deal price is what you pay at checkout.
            </ZText>

            {loading ? (
                <View style={styles.center}><ActivityIndicator color={colors.textStrong} /></View>
            ) : (
                <FlatList
                    data={deals}
                    keyExtractor={(d) => d.id}
                    numColumns={2}
                    columnWrapperStyle={{ gap: 12 }}
                    contentContainerStyle={styles.list}
                    refreshControl={
                        <RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} />
                    }
                    ListEmptyComponent={
                        <EmptyState
                            badge="NO LIVE DEALS"
                            BadgeIcon={Zap}
                            title="Fresh deals are"
                            accent="dropping soon!"
                            body="No flash deals are running right now. Check back shortly for limited-time prices."
                            ctaLabel="Browse Products"
                            onCta={() => router.push('/product-listing')}
                        />
                    }
                    renderItem={({ item }) => (
                        <DealCard deal={item} onPress={() => router.push(`/product/${item.productId}`)} />
                    )}
                />
            )}
        </SafeAreaView>
    );
}

const styles = createStyles({
    screen: { flex: 1, backgroundColor: colors.surfacePage },
    sub: { paddingHorizontal: 20, paddingBottom: 10, color: colors.textMuted },
    list: { paddingHorizontal: 20, paddingBottom: 32, gap: 18 },
    center: { paddingVertical: 60, alignItems: 'center', justifyContent: 'center' },
    meta: { marginTop: 6, gap: 5 },
    timerRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
    labelChip: {
        flexDirection: 'row', alignItems: 'center', gap: 3, alignSelf: 'flex-start',
        paddingHorizontal: 6, paddingVertical: 2,
        borderRadius: radius.sm, backgroundColor: palette.yellow100,
    },
    labelText: { fontFamily: fonts.bodyMedium, fontSize: 9, color: palette.yellow900, textTransform: 'uppercase', letterSpacing: 0.4 },
    timer: { fontFamily: fonts.bodyMedium, fontSize: 11, color: palette.yellow900 },
    timerUrgent: { color: palette.red600 },
    barFillLow: { backgroundColor: palette.red500 },
    stockLow: { color: palette.red600, fontFamily: fonts.bodyMedium },
    barTrack: { height: 4, borderRadius: radius.sm, backgroundColor: palette.neutral200, overflow: 'hidden' },
    barFill: { height: 4, borderRadius: radius.sm, backgroundColor: palette.yellow500 },
    stock: { fontFamily: fonts.bodyRegular, fontSize: 10, color: colors.textMuted },
});
