import {
    Baby, Backpack, Bike, Brush, DoorOpen, Droplets, Dumbbell, Flower2, Footprints, Gem, Gift, Glasses,
    Handbag, LucideIcon, Shirt, ShoppingBag, Snowflake, Sofa, Sparkles, Watch,
} from 'lucide-react-native';
import React from 'react';
import { StyleProp, View, ViewStyle } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import { createStyles, palette, s } from '../../constants/theme';
import { ArtKind } from '../../utils/artFor';

export { artFor } from '../../utils/artFor';
export type { ArtKind };

/**
 * Vector artwork for the home screen's editorial tiles — category chips, heroes,
 * fresh arrivals, nearby, discounts, fallback banners. Replaces the Unsplash stock
 * photos: on-brand, offline, no per-tile network fetch, never a broken image.
 *
 * Product photos and admin-uploaded banner creative are real content and stay
 * as images; only the hardcoded editorial art goes through here.
 *
 * Shapes are placed in percentages (no viewBox) so the same art reads on a 64dp
 * circle, a tall card and a full-width banner without stretching or cropping away.
 */
const ART: Record<ArtKind, { Icon: LucideIcon; bg: string; accent: string; ink: string }> = {
    fashion: { Icon: Shirt, bg: palette.yellow100, accent: palette.yellow400, ink: palette.yellow900 },
    ethnic: { Icon: Flower2, bg: palette.warning50, accent: '#F4B860', ink: '#7A3E00' },
    western: { Icon: ShoppingBag, bg: '#EDE7F6', accent: '#B9A3E3', ink: '#3F2A78' },
    men: { Icon: Shirt, bg: '#E3ECF7', accent: '#9DB8E0', ink: '#1E3A5F' },
    women: { Icon: Handbag, bg: '#FBE3EC', accent: '#F2A7C3', ink: '#7A1F45' },
    kids: { Icon: Baby, bg: '#E6F4FB', accent: '#8FD0EE', ink: '#0F4C6B' },
    footwear: { Icon: Footprints, bg: '#E3ECF7', accent: '#9DB8E0', ink: '#1E3A5F' },
    accessories: { Icon: Handbag, bg: '#F3E6DA', accent: '#D4A373', ink: '#5A3A1E' },
    bags: { Icon: Backpack, bg: '#F3E6DA', accent: '#D4A373', ink: '#5A3A1E' },
    watch: { Icon: Watch, bg: palette.neutral100, accent: palette.neutral300, ink: palette.neutral800 },
    eyewear: { Icon: Glasses, bg: '#E4F3EF', accent: '#9FD6C6', ink: '#1F5A4C' },
    jewellery: { Icon: Gem, bg: palette.yellow50, accent: palette.yellow300, ink: palette.yellow800 },
    beauty: { Icon: Sparkles, bg: '#FBE3EC', accent: '#F2A7C3', ink: '#7A1F45' },
    makeup: { Icon: Brush, bg: palette.red50, accent: palette.red200, ink: palette.red600 },
    skincare: { Icon: Droplets, bg: '#E4F3EF', accent: '#9FD6C6', ink: '#1F5A4C' },
    home: { Icon: Sofa, bg: palette.green50, accent: palette.green200, ink: palette.green600 },
    sports: { Icon: Dumbbell, bg: '#E6F4FB', accent: '#8FD0EE', ink: '#0F4C6B' },
    winter: { Icon: Snowflake, bg: '#E6F4FB', accent: '#8FD0EE', ink: '#0F4C6B' },
    tryAtDoor: { Icon: DoorOpen, bg: palette.yellow50, accent: palette.yellow300, ink: palette.ink },
    delivery: { Icon: Bike, bg: palette.yellow100, accent: palette.yellow400, ink: palette.ink },
    deal: { Icon: Gift, bg: palette.green50, accent: palette.green200, ink: palette.green600 },
};

type Props = {
    kind: ArtKind;
    /** Icon size in design dp (scaled like every other measurement). */
    size?: number;
    /** `end` parks the icon top-right, leaving the rest of the tile for overlaid text. */
    align?: 'center' | 'end';
    /** Ink background for tiles that carry white text. */
    dark?: boolean;
    /** Box/shape only — the art always paints its own background over this. */
    style?: StyleProp<ViewStyle>;
};

export default function HomeArt({ kind, size = 40, align = 'center', dark, style }: Props) {
    const { Icon, bg, accent, ink } = ART[kind];
    const px = s(size);
    const dot = dark ? accent : ink;
    return (
        <View style={[styles.wrap, style, { backgroundColor: dark ? palette.ink : bg }, align === 'end' && styles.end]}>
            <Svg style={styles.fill} width="100%" height="100%">
                <Circle cx="86%" cy="14%" r="40%" fill={accent} opacity={dark ? 0.3 : 0.55} />
                <Circle cx="86%" cy="14%" r="54%" fill="none" stroke={accent} strokeWidth={1.5} opacity={dark ? 0.35 : 0.5} />
                <Circle cx="6%" cy="104%" r="30%" fill={accent} opacity={dark ? 0.18 : 0.32} />
                <Circle cx="18%" cy="22%" r={2.5} fill={dot} opacity={0.3} />
                <Circle cx="28%" cy="12%" r={1.6} fill={dot} opacity={0.22} />
                <Circle cx="92%" cy="72%" r={2} fill={dot} opacity={0.28} />
            </Svg>
            <View style={[styles.disc, { width: px * 1.8, height: px * 1.8, borderRadius: px * 0.9, backgroundColor: dark ? 'rgba(255,255,255,0.08)' : 'rgba(255,255,255,0.6)' }]}>
                <Icon size={px} color={dark ? accent : ink} strokeWidth={1.6} />
            </View>
        </View>
    );
}

const styles = createStyles({
    wrap: { overflow: 'hidden', alignItems: 'center', justifyContent: 'center' },
    end: { alignItems: 'flex-end', justifyContent: 'flex-start', padding: 18 },
    fill: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 },
    disc: { alignItems: 'center', justifyContent: 'center' },
});
