import { Image } from 'expo-image';
import { Check, Heart, ShoppingCart, Star, Zap } from 'lucide-react-native';
import React, { useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, View } from 'react-native';
import { useQuickBuy } from '../../hooks/useQuickBuy';
import { ProductObject } from '../../types/types';
import { createStyles, colors, fonts, palette, radius, productGridCardWidth } from '../../constants/theme';
import { Text } from './ScaledText';
import { cldImage } from '../../constants/cloudinary';

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
  rating?: number; // shown on the image when > 0
  isNew?: boolean; // "NEW" tag, see isNewProduct()
  /** Pass the product to get the cart icon + yellow Buy Now row. */
  actionsFor?: ProductObject;
}

const NEW_WINDOW_MS = 14 * 24 * 60 * 60 * 1000;
/** Listed within the last two weeks — same window as the website's cards. */
export const isNewProduct = (timeStamp?: string) => {
  const t = timeStamp ? Date.parse(timeStamp) : NaN;
  return Number.isFinite(t) && Date.now() - t < NEW_WINDOW_MS;
};

const fmt = (v?: string | number) =>
  v == null ? '' : typeof v === 'number' ? `₹${v.toLocaleString('en-IN')}` : v; // strings assumed pre-formatted

/** Product tile used on Home, Listing, Search and Wishlist. */
export default function ProductCard({
  image, brand, name, detail, price, originalPrice, discount, tryAtDoor,
  wished, width, onPress, onWishlist, style, rating, isNew, actionsFor,
}: ProductCardProps) {
  // Memoised so a parent re-render (wishlist toggle, countdown tick, list recycling) hands
  // expo-image the SAME source object; a fresh object made it re-run the fade-in = flicker.
  const w = width ?? productGridCardWidth;
  const src = useMemo(() => (typeof image === 'string' ? { uri: cldImage(image, w) } : image), [image, w]);
  return (
    <Pressable onPress={onPress} style={[styles.card, { width: width ?? productGridCardWidth }, style]}>
      <View style={styles.imageWrap}>
        <Image source={src} style={styles.image} contentFit="cover" transition={150} cachePolicy="memory-disk" recyclingKey={typeof image === 'string' ? image : undefined} />
        {onWishlist ? (
          <Pressable onPress={onWishlist} hitSlop={8} style={styles.heart}>
            <Heart size={17} color={wished ? palette.red500 : colors.textStrong} fill={wished ? palette.red500 : 'transparent'} />
          </Pressable>
        ) : null}
        {isNew ? (
          <View style={styles.newTag}><Text style={styles.newTagText}>NEW</Text></View>
        ) : null}
        {rating && rating > 0 ? (
          <View style={styles.rating}>
            <Star size={10} color={palette.yellow500} fill={palette.yellow500} />
            <Text style={styles.ratingText}>{rating.toFixed(1)}</Text>
          </View>
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
      {actionsFor ? <CardActions product={actionsFor} /> : null}
    </Pressable>
  );
}

// Cart icon + yellow Buy Now. Nested Pressables claim the touch, so tapping them
// never also opens the product.
function CardActions({ product }: { product: ProductObject }) {
  const { quickAdd } = useQuickBuy();
  const [busy, setBusy] = useState<'cart' | 'buy' | null>(null);
  const [added, setAdded] = useState(false);
  const soldOut = product.inStock === false;

  const run = async (buyNow: boolean) => {
    if (busy || soldOut) return;
    setBusy(buyNow ? 'buy' : 'cart');
    try {
      const ok = await quickAdd(product, buyNow);
      if (ok && !buyNow) { setAdded(true); setTimeout(() => setAdded(false), 1500); }
    } finally {
      setBusy(null);
    }
  };

  return (
    <View style={styles.actions}>
      <Pressable
        onPress={() => run(false)} disabled={soldOut} hitSlop={4}
        accessibilityRole="button" accessibilityLabel={added ? 'Added to cart' : 'Add to cart'}
        style={[styles.cartBtn, soldOut && styles.disabled]}
      >
        {busy === 'cart' ? <ActivityIndicator size="small" color={colors.textStrong} />
          : added ? <Check size={16} color={palette.green500} />
          : <ShoppingCart size={16} color={colors.textStrong} />}
      </Pressable>
      <Pressable
        onPress={() => run(true)} disabled={soldOut}
        accessibilityRole="button" accessibilityLabel="Buy now"
        style={[styles.buyBtn, soldOut && styles.disabled]}
      >
        {busy === 'buy' ? <ActivityIndicator size="small" color={colors.textOnYellow} />
          : <Text style={styles.buyText} numberOfLines={1}>{soldOut ? 'Sold out' : 'Buy Now'}</Text>}
      </Pressable>
    </View>
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
  newTag: {
    position: 'absolute', top: 10, left: 10, backgroundColor: palette.yellow500,
    paddingHorizontal: 7, paddingVertical: 3, borderRadius: 100,
  },
  newTagText: { fontFamily: fonts.monoBold, fontSize: 8.5, letterSpacing: 0.8, color: colors.textOnYellow },
  rating: {
    position: 'absolute', right: 10, bottom: 10, flexDirection: 'row', alignItems: 'center', gap: 3,
    backgroundColor: 'rgba(17,17,17,0.72)', paddingHorizontal: 7, paddingVertical: 3, borderRadius: 100,
  },
  ratingText: { fontFamily: fonts.bodyBold, fontSize: 10.5, color: '#fff' },
  actions: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 8 },
  cartBtn: {
    width: 36, height: 36, borderRadius: 18, borderWidth: 1, borderColor: colors.borderStrong,
    alignItems: 'center', justifyContent: 'center', backgroundColor: colors.surfaceCard,
  },
  buyBtn: {
    flex: 1, minHeight: 36, borderRadius: 18, backgroundColor: palette.yellow500,
    alignItems: 'center', justifyContent: 'center', paddingHorizontal: 8,
  },
  buyText: { fontFamily: fonts.bodyBold, fontSize: 12.5, color: colors.textOnYellow },
  disabled: { opacity: 0.45 },
});
