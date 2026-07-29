import { Stack, useRouter } from 'expo-router';
import { Zap } from 'lucide-react-native';
import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Dimensions, FlatList, RefreshControl, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AppHeader, ProductCard, ZText } from '../components/ui';
import { colors, fonts, palette, radius } from '../constants/theme';
import { FlashDeal, flashDealService } from '../services/flashDeals';

const { width } = Dimensions.get('window');
const CARD_W = (width - 48) / 2;

/** mm:ss / h:mm:ss left, or 'Ended'. Ticks once a second. */
export function useCountdown(endsAt: string): string {
    const [label, setLabel] = useState('');
    useEffect(() => {
        const tick = () => {
            const diff = new Date(endsAt).getTime() - Date.now();
            if (!Number.isFinite(diff) || diff <= 0) return setLabel('Ended');
            const h = Math.floor(diff / 3600000);
            const m = Math.floor((diff % 3600000) / 60000);
            const s = Math.floor((diff % 60000) / 1000);
            setLabel(`${h > 0 ? `${h}h ` : ''}${String(m).padStart(2, '0')}m ${String(s).padStart(2, '0')}s`);
        };
        tick();
        const id = setInterval(tick, 1000);
        return () => clearInterval(id);
    }, [endsAt]);
    return label;
}

function DealCard({ deal, onPress }: { deal: FlashDeal; onPress: () => void }) {
    const left = useCountdown(deal.endsAt);
    const soldPct = deal.totalStock > 0
        ? Math.min(100, Math.round(((deal.totalStock - deal.stockRemaining) / deal.totalStock) * 100))
        : 0;

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
                <View style={styles.timerRow}>
                    <Zap size={11} color={palette.yellow600} fill={palette.yellow500} />
                    <Text style={styles.timer}>{left}</Text>
                </View>
                <View style={styles.barTrack}>
                    <View style={[styles.barFill, { width: `${soldPct}%` }]} />
                </View>
                <Text style={styles.stock}>{deal.stockRemaining} left of {deal.totalStock}</Text>
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
                        <View style={styles.center}>
                            <ZText variant="body" style={styles.empty}>No flash deals running right now.</ZText>
                        </View>
                    }
                    renderItem={({ item }) => (
                        <DealCard deal={item} onPress={() => router.push(`/product/${item.productId}`)} />
                    )}
                />
            )}
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    screen: { flex: 1, backgroundColor: colors.surfacePage },
    sub: { paddingHorizontal: 20, paddingBottom: 10, color: colors.textMuted },
    list: { paddingHorizontal: 20, paddingBottom: 32, gap: 18 },
    center: { paddingVertical: 60, alignItems: 'center', justifyContent: 'center' },
    empty: { color: colors.textMuted },
    meta: { marginTop: 6, gap: 5 },
    timerRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
    timer: { fontFamily: fonts.bodyMedium, fontSize: 11, color: palette.yellow900 },
    barTrack: { height: 4, borderRadius: radius.sm, backgroundColor: palette.neutral200, overflow: 'hidden' },
    barFill: { height: 4, borderRadius: radius.sm, backgroundColor: palette.yellow500 },
    stock: { fontFamily: fonts.bodyRegular, fontSize: 10, color: colors.textMuted },
});
