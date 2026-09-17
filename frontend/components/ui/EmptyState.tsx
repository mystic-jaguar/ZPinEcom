import { Image } from 'expo-image';
import { Award, ChevronRight, LucideIcon, ShoppingBag, Truck } from 'lucide-react-native';
import React from 'react';
import { Pressable, ScrollView, View } from 'react-native';
import { createStyles, colors, fonts, palette } from '../../constants/theme';
import { Text } from './ScaledText';

type Props = {
    badge: string;
    BadgeIcon: LucideIcon;
    title: string;
    accent: string;
    body: string;
    ctaLabel: string;
    onCta: () => void;
    secondaryLabel?: string;
    onSecondary?: () => void;
};

const FEATURES = [
    { Icon: ShoppingBag, label: 'Curated' },
    { Icon: Award, label: 'Best Quality' },
    { Icon: Truck, label: 'Fast Delivery' },
];

/**
 * Illustrated empty/unavailable card, ported from the website's category
 * "coming soon" state (website-customer GenderPage.css `.gp-empty`). Used by
 * product listing, search, flash deals and product-not-found.
 */
export default function EmptyState({ badge, BadgeIcon, title, accent, body, ctaLabel, onCta, secondaryLabel, onSecondary }: Props) {
    return (
        <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
            <View style={styles.card}>
                <Image source={require('../../assets/images/no_product.png')} style={styles.art} contentFit="contain" />
                <View style={styles.badge}>
                    <BadgeIcon size={12} color="#B45309" strokeWidth={2.4} />
                    <Text style={styles.badgeText}>{badge}</Text>
                </View>
                <Text style={styles.heading}>
                    {title}{'\n'}<Text style={styles.accent}>{accent}</Text>
                </Text>
                <Text style={styles.body}>{body}</Text>
                <View style={styles.features}>
                    {FEATURES.map(({ Icon, label }) => (
                        <View key={label} style={styles.feature}>
                            <Icon size={15} color={palette.yellow700} strokeWidth={1.9} />
                            <Text style={styles.featureText}>{label}</Text>
                        </View>
                    ))}
                </View>
                <Pressable style={styles.cta} onPress={onCta}>
                    <Text style={styles.ctaText}>{ctaLabel}</Text>
                    <ChevronRight size={16} color={colors.textOnYellow} strokeWidth={2.5} />
                </Pressable>
                {!!secondaryLabel && (
                    <Text style={styles.secondary} onPress={onSecondary} suppressHighlighting>{secondaryLabel}</Text>
                )}
            </View>
        </ScrollView>
    );
}

const styles = createStyles({
    scroll: { flexGrow: 1, justifyContent: 'center', paddingVertical: 12 },
    card: { marginHorizontal: 20, paddingHorizontal: 22, paddingTop: 20, paddingBottom: 26, borderRadius: 22, borderWidth: 1, borderColor: '#E7E9ED', backgroundColor: colors.surfaceCard, alignItems: 'center' },
    art: { width: '100%', aspectRatio: 1.5, maxHeight: 190, marginBottom: 14 },
    badge: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 5, borderRadius: 100, backgroundColor: '#FFF2CC', marginBottom: 12 },
    badgeText: { fontFamily: fonts.monoBold, fontSize: 10, letterSpacing: 0.8, color: '#B45309' },
    heading: { fontFamily: fonts.displayBold, fontSize: 24, lineHeight: 30, letterSpacing: -0.5, color: colors.textStrong, textAlign: 'center', marginBottom: 8 },
    accent: { color: '#C98A00' },
    body: { fontFamily: fonts.bodyRegular, fontSize: 14, lineHeight: 21, color: colors.textMuted, textAlign: 'center', marginBottom: 18 },
    features: { alignSelf: 'stretch', flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 14, paddingVertical: 11, paddingHorizontal: 12, borderRadius: 14, backgroundColor: '#FAFAF7', marginBottom: 20 },
    feature: { flexDirection: 'row', alignItems: 'center', gap: 5 },
    featureText: { fontFamily: fonts.bodySemiBold, fontSize: 12, color: colors.textBody },
    cta: { flexDirection: 'row', alignItems: 'center', gap: 6, minHeight: 46, paddingHorizontal: 24, borderRadius: 100, backgroundColor: palette.yellow500 },
    ctaText: { fontFamily: fonts.bodyBold, fontSize: 15, color: colors.textOnYellow },
    secondary: { marginTop: 14, fontFamily: fonts.bodyBold, fontSize: 13, color: colors.textMuted },
});
