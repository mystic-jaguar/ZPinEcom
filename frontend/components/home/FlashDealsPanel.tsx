import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { ArrowRight, Crown, RotateCcw, ShieldCheck, ShoppingCart, Truck, Zap } from 'lucide-react-native';
import React, { useEffect, useState } from 'react';
import { Pressable, ScrollView, View } from 'react-native';
import { cldImage } from '../../constants/cloudinary';
import { createStyles, colors, fonts, palette, productGridCardWidth, radius, s } from '../../constants/theme';
import { FlashDeal } from '../../services/flashDeals';
import { Text } from '../ui/ScaledText';

/**
 * Home Flash Deals block — the app port of the website's FlashDealsSection
 * (website-customer src/Components/FlashDeals): dark "Live Deals" panel with a
 * card rail + benefits, a yellow countdown card, and the Privilege Club card.
 * Same layout and copy; colours/fonts are the app's own ink + brand-yellow tokens.
 */

const CARD_W = productGridCardWidth;
const inr = (n: number) => `₹${(Number(n) || 0).toLocaleString('en-IN')}`;

const BENEFITS = [
    { label: 'Express 12-Hour Delivery', Icon: Truck },
    { label: '100% Genuine Products', Icon: ShieldCheck },
    { label: 'Easy Returns', Icon: RotateCcw },
];

// Deal stock from the deal's own allocation (stock_remaining / total_stock) —
// the same numbers and thresholds as the website card. Never invented.
function stockStatus(d: FlashDeal) {
    const left = Number(d.stockRemaining) || 0;
    const total = Number(d.totalStock) || 0;
    if (left <= 0) return { label: 'Sold out', low: true, pct: 0, out: true };
    const pct = total > 0 ? Math.max(4, Math.min(100, Math.round((left / total) * 100))) : null;
    if (left <= 5) return { label: `Only ${left} left`, low: true, pct, out: false };
    return { label: total > 0 ? `${left} left of ${total}` : `${left} left`, low: false, pct, out: false };
}

function DealCard({ deal, onOpen }: { deal: FlashDeal; onOpen: () => void }) {
    const stock = stockStatus(deal);
    const hasOriginal = deal.originalPrice > deal.dealPrice;
    return (
        <View style={styles.card}>
            <Pressable onPress={onOpen} accessibilityRole="button" accessibilityLabel={`View ${deal.productName}`}>
                <Image source={{ uri: cldImage(deal.images?.[0] || '', 360) }} style={styles.cardImg} contentFit="cover" />
                {deal.discountPercent > 0 && (
                    <View style={styles.discount}><Text style={styles.discountText}>{deal.discountPercent}% OFF</Text></View>
                )}
            </Pressable>
            <View style={styles.cardBody}>
                <Text style={styles.cardName} numberOfLines={2} onPress={onOpen}>{deal.productName}</Text>
                <Text style={styles.cardLabel} numberOfLines={1}>{deal.label}</Text>
                <View style={styles.priceRow}>
                    <Text style={styles.price}>{inr(deal.dealPrice)}</Text>
                    {hasOriginal && <Text style={styles.strike}>{inr(deal.originalPrice)}</Text>}
                </View>
                <Text style={[styles.stockText, stock.low && styles.stockLow]}>{stock.label}</Text>
                {stock.pct != null && !stock.out && (
                    <View style={styles.barTrack}>
                        <View style={[styles.barFill, stock.low && styles.barFillLow, { width: `${stock.pct}%` }]} />
                    </View>
                )}
                <Pressable
                    onPress={onOpen}
                    disabled={stock.out}
                    accessibilityRole="button"
                    accessibilityLabel={stock.out ? `${deal.productName} is sold out` : `Grab deal on ${deal.productName}`}
                    style={styles.ctaWrap}
                >
                    {stock.out ? (
                        <View style={[styles.cta, styles.ctaOff]}><Text style={styles.ctaOffText}>Sold Out</Text></View>
                    ) : (
                        <LinearGradient colors={[palette.yellow300, palette.yellow600]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.cta}>
                            <ShoppingCart size={s(15)} color={colors.textStrong} />
                            <Text style={styles.ctaText}>Grab Deal</Text>
                        </LinearGradient>
                    )}
                </Pressable>
            </View>
        </View>
    );
}

/** Own component so only the clock re-renders every second, not the rail. */
function CountdownCard({ endsAt, count, onView }: { endsAt: number; count: number; onView: () => void }) {
    const [now, setNow] = useState(Date.now());
    useEffect(() => {
        const id = setInterval(() => setNow(Date.now()), 1000);
        return () => clearInterval(id);
    }, []);
    const diff = Math.max(0, endsAt - now);
    const pad = (n: number) => String(n).padStart(2, '0');
    const units = [
        [pad(Math.floor(diff / 3600000)), 'Hours'],
        [pad(Math.floor((diff % 3600000) / 60000)), 'Minutes'],
        [pad(Math.floor((diff % 60000) / 1000)), 'Seconds'],
    ];
    return (
        <LinearGradient colors={[palette.yellow300, palette.yellow500, palette.yellow600]} style={styles.count}>
            <Text style={styles.countEyebrow}>FLASH SALE ENDING</Text>
            <View style={styles.countRow} accessibilityLabel={`${units[0][0]} hours, ${units[1][0]} minutes, ${units[2][0]} seconds left`}>
                {units.map(([v, l]) => (
                    <View key={l} style={styles.countUnit}>
                        <View style={styles.countBox}><Text style={styles.countNum}>{v}</Text></View>
                        <Text style={styles.countLabel}>{l}</Text>
                    </View>
                ))}
            </View>
            <Text style={styles.countNote}>Order now for delivery within 12 hours.</Text>
            <Pressable style={styles.countPill} onPress={onView} accessibilityRole="button">
                <Text style={styles.countPillText}>Today Only · {count} Deals</Text>
                <ArrowRight size={s(14)} color={palette.yellow500} />
            </Pressable>
        </LinearGradient>
    );
}

export default function FlashDealsPanel({ deals }: { deals: FlashDeal[] }) {
    const router = useRouter();
    const shown = deals.slice(0, 8);
    const ends = shown.map(d => new Date(d.endsAt).getTime()).filter(Number.isFinite);
    const viewAll = () => router.push('/flash-deals' as any);

    return (
        <View style={styles.wrap}>
            <View style={styles.panel}>
                <Zap size={s(150)} color="rgba(255,196,0,0.07)" fill="rgba(255,196,0,0.07)" style={styles.bgBolt} />
                <View style={styles.pill}>
                    <Zap size={s(11)} color={colors.textStrong} fill={colors.textStrong} />
                    <Text style={styles.pillText}>Live Deals</Text>
                </View>
                <Text style={styles.title}>
                    Flash Deals — <Text style={styles.titleAccent}>Ending Soon</Text>
                </Text>
                <Text style={styles.sub}>Unmissable deals. Limited time only.</Text>

                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.rail}>
                    {shown.map(d => (
                        <DealCard key={d.id} deal={d} onOpen={() => router.push(`/product/${d.productId}`)} />
                    ))}
                </ScrollView>

                <View style={styles.benefits}>
                    {BENEFITS.map(({ label, Icon }) => (
                        <View key={label} style={styles.benefit}>
                            <Icon size={s(13)} color={palette.yellow500} />
                            <Text style={styles.benefitText}>{label}</Text>
                        </View>
                    ))}
                </View>
            </View>

            {ends.length > 0 && <CountdownCard endsAt={Math.min(...ends)} count={deals.length} onView={viewAll} />}

            <View style={styles.club}>
                <View style={styles.clubPill}>
                    <Crown size={s(11)} color={palette.yellow900} fill={palette.yellow500} />
                    <Text style={styles.clubPillText}>Privilege Club</Text>
                </View>
                <Text style={styles.clubTitle}>
                    Express <Text style={styles.clubMark}>12-Hour</Text>{'\n'}Delivery
                </Text>
                <Text style={styles.clubText}>
                    Experience the fastest luxury delivery. Your order arrives at your doorstep in under 12 hours.
                </Text>
                <Pressable style={styles.clubLink} onPress={viewAll} accessibilityRole="button">
                    <Text style={styles.clubLinkText}>Learn More</Text>
                    <ArrowRight size={s(14)} color={colors.textStrong} />
                </Pressable>
                <Truck size={s(84)} color={palette.yellow200} style={styles.clubArt} />
            </View>
        </View>
    );
}

const styles = createStyles({
    wrap: { paddingHorizontal: 20, marginTop: 28, gap: 14 },

    panel: { backgroundColor: palette.ink, borderRadius: radius.xl, paddingVertical: 22, overflow: 'hidden' },
    bgBolt: { position: 'absolute', right: -20, top: -24 },
    pill: {
        flexDirection: 'row', alignItems: 'center', gap: 4, alignSelf: 'flex-start',
        marginHorizontal: 18, paddingHorizontal: 10, paddingVertical: 4,
        borderRadius: radius.full, backgroundColor: palette.yellow500,
    },
    pillText: { fontFamily: fonts.bodyBold, fontSize: 11, color: colors.textStrong },
    title: { marginTop: 12, marginHorizontal: 18, fontFamily: fonts.displayBold, fontSize: 22, color: colors.textInvert },
    titleAccent: { color: palette.yellow500 },
    sub: { marginTop: 4, marginHorizontal: 18, fontFamily: fonts.bodyRegular, fontSize: 13, color: palette.neutral400 },
    rail: { paddingHorizontal: 18, paddingTop: 18, gap: 12 },

    card: { width: CARD_W, backgroundColor: colors.surfaceCard, borderRadius: radius.lg, overflow: 'hidden' },
    cardImg: { width: '100%', aspectRatio: 1, backgroundColor: palette.neutral100 },
    discount: {
        position: 'absolute', top: 10, left: 10, paddingHorizontal: 8, paddingVertical: 3,
        borderRadius: radius.full, backgroundColor: palette.danger500,
    },
    discountText: { fontFamily: fonts.bodyBold, fontSize: 10, color: colors.textInvert },
    cardBody: { padding: 12, gap: 4, flex: 1 },
    cardName: { fontFamily: fonts.bodySemiBold, fontSize: 13, color: colors.textStrong, minHeight: 34 },
    cardLabel: { fontFamily: fonts.bodyMedium, fontSize: 10, color: colors.textMuted, textTransform: 'uppercase', letterSpacing: 0.4 },
    priceRow: { flexDirection: 'row', alignItems: 'baseline', gap: 6 },
    price: { fontFamily: fonts.displayBold, fontSize: 16, color: colors.textStrong },
    strike: { fontFamily: fonts.bodyRegular, fontSize: 12, color: colors.textFaint, textDecorationLine: 'line-through' },
    stockText: { fontFamily: fonts.bodyMedium, fontSize: 11, color: palette.warning500 },
    stockLow: { color: palette.danger500 },
    barTrack: { height: 4, borderRadius: radius.full, backgroundColor: palette.neutral200, overflow: 'hidden' },
    barFill: { height: 4, borderRadius: radius.full, backgroundColor: palette.yellow500 },
    barFillLow: { backgroundColor: palette.danger500 },
    ctaWrap: { marginTop: 8 },
    cta: { height: 40, borderRadius: radius.sm, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 },
    ctaText: { fontFamily: fonts.bodyBold, fontSize: 13, color: colors.textStrong },
    ctaOff: { backgroundColor: palette.neutral200 },
    ctaOffText: { fontFamily: fonts.bodyBold, fontSize: 13, color: colors.textMuted },

    benefits: { marginTop: 18, marginHorizontal: 18, gap: 8 },
    benefit: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    benefitText: { fontFamily: fonts.bodyMedium, fontSize: 12, color: palette.neutral300 },

    count: { borderRadius: radius.xl, paddingVertical: 22, paddingHorizontal: 18, alignItems: 'center' },
    countEyebrow: { fontFamily: fonts.bodyBlack, fontSize: 12, letterSpacing: 2.4, color: colors.textStrong, marginBottom: 14 },
    countRow: { flexDirection: 'row', gap: 10 },
    countUnit: { alignItems: 'center', gap: 6 },
    countBox: { minWidth: 64, paddingVertical: 10, borderRadius: radius.md, backgroundColor: palette.ink, alignItems: 'center' },
    countNum: { fontFamily: fonts.monoBold, fontSize: 26, color: palette.yellow500 },
    countLabel: { fontFamily: fonts.bodySemiBold, fontSize: 11, color: colors.textStrong },
    countNote: { marginTop: 14, fontFamily: fonts.bodyMedium, fontSize: 12, color: palette.neutral800 },
    countPill: {
        marginTop: 12, flexDirection: 'row', alignItems: 'center', gap: 6,
        paddingHorizontal: 16, paddingVertical: 9, borderRadius: radius.full, backgroundColor: palette.ink,
    },
    countPillText: { fontFamily: fonts.bodyBold, fontSize: 12, color: palette.yellow500 },

    club: {
        borderRadius: radius.xl, padding: 20, overflow: 'hidden',
        backgroundColor: palette.yellow50, borderWidth: 1, borderColor: palette.yellow100,
    },
    clubPill: {
        flexDirection: 'row', alignItems: 'center', gap: 4, alignSelf: 'flex-start',
        paddingHorizontal: 10, paddingVertical: 4, borderRadius: radius.full, backgroundColor: palette.yellow100,
    },
    clubPillText: { fontFamily: fonts.bodyBold, fontSize: 11, color: palette.yellow900 },
    clubTitle: { marginTop: 12, fontFamily: fonts.displayBold, fontSize: 22, lineHeight: 26, color: colors.textStrong },
    clubMark: { color: palette.yellow700 },
    clubText: { marginTop: 8, maxWidth: '72%', fontFamily: fonts.bodyRegular, fontSize: 13, color: colors.textBody },
    clubLink: { marginTop: 12, flexDirection: 'row', alignItems: 'center', gap: 6 },
    clubLinkText: { fontFamily: fonts.bodyBold, fontSize: 13, color: colors.textStrong, textDecorationLine: 'underline' },
    clubArt: { position: 'absolute', right: 14, bottom: 14 },
});
