import { Image } from 'expo-image';
import { Heart, Zap } from 'lucide-react-native';
import React from 'react';
import { Pressable, View } from 'react-native';
import { createStyles, colors, fonts, palette, radius, productGridCardWidth } from '../../constants/theme';
import { Text } from './ScaledText';

export interface ProductCardProps {
  image: any; // uri string or require()
  brand?: string;
  name: string;
  detail?: string; // single-line product detail, shown under the title
  price?: string | number;
  originalPrice?: string | number;
  discount?: string; // e.g. "41%"
  tryAtDoor?: boolean;
  wished?: boolean;
  width?: number;
  onPress?: () => void;
  onWishlist?: () => void;
  style?: any;
}

const fmt = (v?: string | number) =>
  v == null ? '' : typeof v === 'number' ? `₹${v.toLocaleString('en-IN')}` : v; // strings assumed pre-formatted

/** Product tile used on Home, Listing, Search and Wishlist. */
export default function ProductCard({
  image, brand, name, detail, price, originalPrice, discount, tryAtDoor,
  wished, width, onPress, onWishlist, style,
}: ProductCardProps) {
  const src = typeof image === 'string' ? { uri: image } : image;
  return (
    <Pressable onPress={onPress} style={[styles.card, { width: width ?? productGridCardWidth }, style]}>
      <View style={styles.imageWrap}>
        <Image source={src} style={styles.image} contentFit="cover" transition={150} />
        {onWishlist ? (
          <Pressable onPress={onWishlist} hitSlop={8} style={styles.heart}>
            <Heart size={17} color={wished ? palette.red500 : colors.textStrong} fill={wished ? palette.red500 : 'transparent'} />
          </Pressable>
        ) : null}
        {tryAtDoor ? (
          <View style={styles.badge}>
            <Zap size={10} color={palette.yellow500} fill={palette.yellow500} />
            <Text style={styles.badgeText}>TRY-AT-DOOR</Text>
          </View>
        ) : null}
      </View>
      {brand ? <Text style={styles.brand}>{brand}</Text> : null}
      <Text style={styles.name} numberOfLines={1}>{name}</Text>
      {detail ? <Text style={styles.detail} numberOfLines={1}>{detail}</Text> : null}
      {price != null ? (
        <View style={styles.priceRow}>
          <Text style={styles.price}>{fmt(price)}</Text>
          {originalPrice != null ? <Text style={styles.original}>{fmt(originalPrice)}</Text> : null}
          {discount ? <Text style={styles.discount}>{discount}</Text> : null}
        </View>
      ) : null}
    </Pressable>
  );
}

const styles = createStyles({
  card: {},
  imageWrap: {
    width: '100%', aspectRatio: 0.82, borderRadius: radius.lg, overflow: 'hidden',
    backgroundColor: colors.surfaceSunken, marginBottom: 8, position: 'relative',
  },
  image: { width: '100%', height: '100%' },
  heart: {
    position: 'absolute', top: 10, right: 10, width: 34, height: 34, borderRadius: 17,
    backgroundColor: 'rgba(255,255,255,0.92)', alignItems: 'center', justifyContent: 'center',
  },
  badge: {
    position: 'absolute', left: 10, bottom: 10, flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: colors.surfaceInverse, paddingHorizontal: 9, paddingVertical: 5, borderRadius: 100,
  },
  badgeText: { fontFamily: fonts.monoBold, fontSize: 8, letterSpacing: 0.6, color: colors.textInvert },
  brand: { fontFamily: fonts.monoBold, fontSize: 10, letterSpacing: 1.4, color: colors.textFaint, textTransform: 'uppercase', marginBottom: 3 },
  name: { fontFamily: fonts.bodySemiBold, fontSize: 14, color: colors.textStrong, marginBottom: 3 },
  detail: { fontFamily: fonts.bodyRegular, fontSize: 11.5, color: colors.textFaint, marginBottom: 5 },
  priceRow: { flexDirection: 'row', alignItems: 'baseline', gap: 7 },
  price: { fontFamily: fonts.displayBold, fontSize: 17, color: colors.textStrong },
  original: { fontFamily: fonts.bodyRegular, fontSize: 12, color: colors.textFaint, textDecorationLine: 'line-through' },
  discount: { fontFamily: fonts.bodyBold, fontSize: 12, color: palette.green500 },
});
