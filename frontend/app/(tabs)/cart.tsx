import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { ArrowRight, ChevronDown, Minus, Plus, ShoppingCart, X, Zap } from 'lucide-react-native';
import { useFocusEffect } from '@react-navigation/native';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Animated, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import ActionModal from '../../components/common/ActionModal';
import { ZButton, ZText } from '../../components/ui';
import { colors, fonts, palette, radius, shadow } from '../../constants/theme';
import { DELIVERY_ETA } from '../../constants/delivery';
import { StockLimitError, useCart } from '../../context/CartContext';
import { useCheckout } from '../../context/CheckoutContext';

interface CartItemProps {
    item: any;
    onRemove: (cartItemId: string) => void;
    onUpdateQuantity: (cartItemId: string, quantity: number) => Promise<void>;
    onChangeSize: (cartItemId: string, size: string) => void;
}

// Sizes read naturally as XS→XXL, or numerically for shoes. Same ordering the
// website's cart uses.
const SIZE_ORDER = ['XS', 'S', 'M', 'L', 'XL', 'XXL', '2XL', '3XL'];
function sortSizes(sizes: string[]) {
    if (sizes.every(s => !isNaN(Number(s)))) return [...sizes].sort((a, b) => Number(a) - Number(b));
    return [...sizes].sort((a, b) => {
        const ai = SIZE_ORDER.indexOf(a.toUpperCase());
        const bi = SIZE_ORDER.indexOf(b.toUpperCase());
        return (ai === -1 ? 99 : ai) - (bi === -1 ? 99 : bi);
    });
}

function CartItem({ item, onRemove, onUpdateQuantity, onChangeSize }: CartItemProps) {
    const router = useRouter();
    const [changingSize, setChangingSize] = React.useState(false);
    // Guards the stepper against double-taps: without it, two rapid presses each
    // start their own async updateQuantity call against the same pre-tap
    // quantity, and the optimistic updates race — the value flickers back and
    // forth as they resolve out of order.
    const [qtyPending, setQtyPending] = React.useState(false);
    const fadeAnim = useRef(new Animated.Value(0)).current;
    const slideAnim = useRef(new Animated.Value(50)).current;

    useEffect(() => {
        // No stagger delay: FlatList recycles rows, so an index-based delay makes
        // rows cascade/flicker while scrolling. A flat fade-in reads smoother.
        Animated.parallel([
            Animated.timing(fadeAnim, { toValue: 1, duration: 300, useNativeDriver: true }),
            Animated.timing(slideAnim, { toValue: 0, duration: 300, useNativeDriver: true }),
        ]).start();
    }, []);

    const handleRemove = () => {
        Animated.parallel([
            Animated.timing(fadeAnim, { toValue: 0, duration: 200, useNativeDriver: true }),
            Animated.timing(slideAnim, { toValue: 100, duration: 200, useNativeDriver: true }),
        ]).start(() => onRemove(item.cartItemId));
    };

    const img = item.product?.images?.[0]
        ? (typeof item.product.images[0] === 'string' ? { uri: item.product.images[0] } : item.product.images[0])
        : (typeof item.image === 'string' ? { uri: item.image } : (item.image || { uri: 'https://via.placeholder.com/80' }));
    const brand = item.product?.brand || item.brand || 'ZPIN';
    const hasSizes = !!item.sizeQuantities && Object.keys(item.sizeQuantities).length > 0;
    const atStockLimit = typeof item.availableStock === 'number' && item.quantity >= item.availableStock;

    const handleStep = async (nextQuantity: number) => {
        if (qtyPending) return;
        setQtyPending(true);
        try {
            await onUpdateQuantity(item.cartItemId, nextQuantity);
        } finally {
            setQtyPending(false);
        }
    };

    return (
        <Animated.View style={[styles.item, { opacity: fadeAnim, transform: [{ translateX: slideAnim }] }]}>
            <Pressable onPress={() => router.push(`/product/${item.productId || item.product?.productId || item.id}`)}>
                <Image source={img} style={styles.itemImage} contentFit="cover" />
            </Pressable>
            <View style={styles.itemBody}>
                <View>
                    <View style={styles.itemTop}>
                        <Text style={styles.itemBrand} numberOfLines={1}>{brand}</Text>
                        <Pressable onPress={handleRemove} hitSlop={8}><X size={17} color={colors.textFaint} /></Pressable>
                    </View>
                    <Text style={styles.itemName} numberOfLines={1}>{item.product?.productName || item.name}</Text>
                    {(item.selectedColor || item.selectedSize || hasSizes) && (
                        <View style={styles.chips}>
                            {(item.selectedSize || hasSizes) ? (
                                // Tap the size chip to swap size in place, like the website's cart.
                                <Pressable
                                    style={styles.chip}
                                    onPress={() => hasSizes && setChangingSize(v => !v)}
                                    disabled={!hasSizes}
                                    hitSlop={6}
                                >
                                    <Text style={styles.chipText}>{item.selectedSize || 'SIZE'}</Text>
                                    {hasSizes ? <ChevronDown size={11} color={colors.textFaint} /> : null}
                                </Pressable>
                            ) : null}
                            {item.selectedColor ? (
                                <View style={styles.chip}>
                                    <View style={[styles.swatch, { backgroundColor: item.selectedColor }]} />
                                    <Text style={styles.chipText}>{String(item.selectedColor).toUpperCase()}</Text>
                                </View>
                            ) : null}
                        </View>
                    )}
                    {changingSize && hasSizes && (
                        <View style={styles.sizeRow}>
                            {sortSizes(Object.keys(item.sizeQuantities)).map((size: string) => {
                                const qty = Number(item.sizeQuantities[size] || 0);
                                const active = item.selectedSize === size;
                                return (
                                    <Pressable
                                        key={size}
                                        disabled={qty === 0}
                                        onPress={() => { setChangingSize(false); onChangeSize(item.cartItemId, size); }}
                                        style={[styles.sizeBtn, active && styles.sizeBtnActive, qty === 0 && styles.sizeBtnOut]}
                                    >
                                        <Text style={[styles.sizeBtnText, active && styles.sizeBtnTextActive, qty === 0 && styles.sizeBtnTextOut]}>
                                            {size}
                                        </Text>
                                    </Pressable>
                                );
                            })}
                        </View>
                    )}
                </View>
                <View style={styles.itemBottom}>
                    <Text style={styles.itemPrice}>₹{((item.product?.price || item.price) * item.quantity).toLocaleString('en-IN')}</Text>
                    <View style={styles.stepper}>
                        <Pressable onPress={() => handleStep(item.quantity - 1)} disabled={qtyPending} hitSlop={6}><Minus size={14} color={colors.textStrong} /></Pressable>
                        <Text style={styles.qty}>{item.quantity}</Text>
                        <Pressable onPress={() => handleStep(item.quantity + 1)} disabled={qtyPending || atStockLimit} hitSlop={6}>
                            <Plus size={14} color={atStockLimit ? colors.textFaint : colors.textStrong} />
                        </Pressable>
                    </View>
                </View>
                {atStockLimit && (
                    <Text style={styles.stockNote}>Only {item.availableStock} left in stock</Text>
                )}
            </View>
        </Animated.View>
    );
}

// Memoized so changing one row's quantity re-renders only that row, not the
// whole list. Relies on the cart handlers being stable (useCallback in CartContext).
const MemoCartItem = React.memo(CartItem);

export default function CartScreen() {
    const { cartItems, updateQuantity, removeFromCart, changeSize, totalPrice, totalSavings, refreshCart } = useCart();
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const [stockMessage, setStockMessage] = useState<string | null>(null);
    const [stockMessageTitle, setStockMessageTitle] = useState('Not enough stock');
    // The absolute footer's real height, measured rather than guessed: a fixed
    // padding left the last row half-hidden behind it on taller devices.
    const [footerHeight, setFooterHeight] = useState(0);

    // Prices and stock are edited in the vendor app/website, so re-pull the cart
    // every time this screen is looked at instead of trusting the mount-time copy.
    useFocusEffect(useCallback(() => { refreshCart(); }, [refreshCart]));

    const count = cartItems.length;

    // Resume a checkout that was killed mid-flow instead of restarting at step 1.
    // Payment (step 3) is deliberately not resumed into: the order/payment
    // round-trip must be re-initiated from a screen the user chose to be on.
    const { lastStep } = useCheckout();
    const resumeRoute = lastStep >= 2 ? '/checkout/summary' : '/checkout/address';

    const FREE_DELIVERY_MIN = 999; // free standard delivery above ₹999 — must match server (orders.ts)
    const freeDeliveryUnlocked = totalPrice > FREE_DELIVERY_MIN;
    const freeDeliveryPct = Math.min(totalPrice / FREE_DELIVERY_MIN, 1) * 100;
    const amountToFree = Math.max(FREE_DELIVERY_MIN - totalPrice, 0);

    // Asking for more than the seller has is refused with the real number, both
    // here and again on the server.
    const handleUpdateQuantity = useCallback(async (cartItemId: string, quantity: number) => {
        try {
            await updateQuantity(cartItemId, quantity);
        } catch (err: any) {
            setStockMessageTitle(err instanceof StockLimitError ? 'Not enough stock' : 'Could not update cart');
            setStockMessage(err?.message || 'Could not update quantity.');
            // A client-side stock refusal never touched the cart, so there is
            // nothing to resync. A server failure might have — re-pull the truth
            // so the stepper can't keep showing a quantity the server rejected.
            if (!(err instanceof StockLimitError)) refreshCart();
        }
    }, [updateQuantity, refreshCart]);

    const renderItem = useCallback(
        ({ item }: { item: any }) => (
            <MemoCartItem item={item} onRemove={removeFromCart} onUpdateQuantity={handleUpdateQuantity} onChangeSize={changeSize} />
        ),
        [removeFromCart, handleUpdateQuantity, changeSize]
    );

    return (
        <SafeAreaView style={styles.container} edges={['top']}>
            <View style={styles.header}>
                <View style={styles.eyebrowRow}>
                    <Zap size={12} color={palette.yellow500} fill={palette.yellow500} />
                    <ZText variant="eyebrow" color={colors.textMuted}>{count} {count === 1 ? 'item' : 'items'} · ready to ride</ZText>
                </View>
                <ZText variant="h2">Your cart</ZText>
            </View>

            {count === 0 ? (
                <View style={styles.empty}>
                    <ShoppingCart size={72} color={colors.borderStrong} />
                    <ZText variant="lg" style={{ marginTop: 20 }}>Your cart is empty</ZText>
                    <ZText variant="muted" style={{ marginTop: 4 }}>Add items to get started</ZText>
                    <ZButton label="Start shopping" fullWidth={false} style={{ marginTop: 20, alignSelf: 'center' }} onPress={() => router.push('/product-listing')} />
                </View>
            ) : (
                <>
                    {/* Free delivery strip */}
                    <View style={styles.freeStrip}>
                        <View style={styles.freeRow}>
                            <Zap size={14} color={palette.yellow500} fill={palette.yellow500} />
                            <Text style={styles.freeText}>
                                {freeDeliveryUnlocked
                                    ? 'Free bike delivery unlocked'
                                    : `Add ₹${amountToFree.toLocaleString('en-IN')} more for free delivery`}
                            </Text>
                        </View>
                        <View style={styles.freeBar}><View style={[styles.freeFill, { width: `${freeDeliveryPct}%` }]} /></View>
                    </View>

                    <Animated.FlatList
                        data={cartItems}
                        renderItem={renderItem}
                        keyExtractor={(item) => item.cartItemId}
                        contentContainerStyle={[styles.list, { paddingBottom: footerHeight + 24 }]}
                        showsVerticalScrollIndicator={false}
                    />

                    <View
                        style={[styles.footer, { paddingBottom: insets.bottom + 78 }]}
                        onLayout={e => setFooterHeight(e.nativeEvent.layout.height)}
                    >
                        <View style={styles.summaryRow}>
                            <View>
                                {totalSavings > 0 && (
                                    <ZText variant="eyebrow" color={colors.textMuted} style={{ marginBottom: 3 }}>
                                        Total · saving ₹{totalSavings.toLocaleString('en-IN')}
                                    </ZText>
                                )}
                                <Text style={styles.total}>₹{totalPrice.toLocaleString('en-IN')}</Text>
                            </View>
                            <View style={{ alignItems: 'flex-end' }}>
                                <Text style={styles.freeDelivery}>{freeDeliveryUnlocked ? 'FREE DELIVERY' : 'DELIVERY'}</Text>
                                <Text style={styles.eta}>{freeDeliveryUnlocked ? DELIVERY_ETA : `₹${amountToFree.toLocaleString('en-IN')} to free`}</Text>
                            </View>
                        </View>
                        <ZButton label="Checkout" icon={ArrowRight} onPress={() => router.push(resumeRoute)} />
                    </View>
                </>
            )}

            <ActionModal
                visible={!!stockMessage}
                title={stockMessageTitle}
                message={stockMessage || ''}
                icon="alert-triangle"
                primaryButtonText="OK"
                onPrimaryPress={() => setStockMessage(null)}
                onClose={() => setStockMessage(null)}
            />
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: palette.paperWarm },
    header: { paddingHorizontal: 20, paddingTop: 8, paddingBottom: 14 },
    eyebrowRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 },

    empty: { flex: 1, alignItems: 'center', justifyContent: 'center', marginTop: -60 },

    freeStrip: { marginHorizontal: 20, marginBottom: 8, backgroundColor: colors.surfaceInverse, borderRadius: radius.md, padding: 14 },
    freeRow: { flexDirection: 'row', alignItems: 'center', gap: 7, marginBottom: 9 },
    freeText: { fontFamily: fonts.bodyBold, fontSize: 11, color: colors.textInvert },
    freeBar: { height: 6, borderRadius: 3, backgroundColor: 'rgba(255,255,255,0.16)', overflow: 'hidden' },
    freeFill: { height: '100%', backgroundColor: palette.yellow500 },

    list: { paddingHorizontal: 20, paddingTop: 8, paddingBottom: 200 },
    item: { flexDirection: 'row', gap: 13, backgroundColor: colors.surfaceCard, borderWidth: 1, borderColor: palette.neutral200, borderRadius: radius.lg, padding: 12, marginBottom: 14 },
    itemImage: { width: 84, height: 96, borderRadius: radius.md, backgroundColor: colors.surfaceSunken },
    itemBody: { flex: 1, justifyContent: 'space-between' },
    itemTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    itemBrand: { fontFamily: fonts.monoBold, fontSize: 10, letterSpacing: 1.2, color: colors.textFaint, textTransform: 'uppercase', flex: 1 },
    itemName: { fontFamily: fonts.bodySemiBold, fontSize: 14, color: colors.textStrong, marginTop: 3, marginBottom: 7 },
    chips: { flexDirection: 'row', gap: 7 },
    chip: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: colors.surfaceSunken, borderRadius: radius.xs, paddingHorizontal: 8, paddingVertical: 3 },
    chipText: { fontFamily: fonts.monoBold, fontSize: 10, color: colors.textBody },
    swatch: { width: 9, height: 9, borderRadius: 5 },
    sizeRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 7 },
    sizeBtn: { minWidth: 32, alignItems: 'center', borderWidth: 1.5, borderColor: colors.borderSubtle, borderRadius: radius.xs, paddingHorizontal: 8, paddingVertical: 4 },
    sizeBtnActive: { borderColor: palette.yellow500, backgroundColor: colors.surfaceSunken },
    sizeBtnOut: { opacity: 0.4 },
    sizeBtnText: { fontFamily: fonts.monoBold, fontSize: 10, color: colors.textBody },
    sizeBtnTextActive: { color: colors.textStrong },
    sizeBtnTextOut: { textDecorationLine: 'line-through' },
    itemBottom: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    itemPrice: { fontFamily: fonts.displayBold, fontSize: 17, color: colors.textStrong },
    stepper: { flexDirection: 'row', alignItems: 'center', gap: 12, borderWidth: 1.5, borderColor: colors.borderSubtle, borderRadius: 100, paddingHorizontal: 12, paddingVertical: 5 },
    qty: { fontFamily: fonts.displayBold, fontSize: 14, color: colors.textStrong },
    stockNote: { fontFamily: fonts.bodySemiBold, fontSize: 11, color: palette.red500, marginTop: 6, textAlign: 'right' },

    footer: {
        position: 'absolute', left: 0, right: 0, bottom: 0, backgroundColor: colors.surfaceCard,
        borderTopWidth: 1, borderTopColor: colors.surfaceSunken, borderTopLeftRadius: 24, borderTopRightRadius: 24,
        paddingHorizontal: 20, paddingTop: 16, ...shadow.sheet,
    },
    summaryRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 14 },
    total: { fontFamily: fonts.displayBold, fontSize: 26, letterSpacing: -0.4, color: colors.textStrong },
    freeDelivery: { fontFamily: fonts.monoBold, fontSize: 10, letterSpacing: 0.6, color: colors.textFaint },
    eta: { fontFamily: fonts.displayBold, fontSize: 13, color: colors.textStrong },
});
