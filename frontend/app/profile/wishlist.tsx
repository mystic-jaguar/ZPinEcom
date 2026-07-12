import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { Heart, ShoppingCart } from 'lucide-react-native';
import React from 'react';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AppHeader, ZButton, ZText } from '../../components/ui';
import { colors, fonts, palette, radius } from '../../constants/theme';
import { useWishlist } from '../../context/WishlistContext';

export default function WishlistScreen() {
    const router = useRouter();
    const { wishlistItems, removeFromWishlist } = useWishlist();

    const renderItem = ({ item }: { item: any }) => (
        <View style={styles.card}>
            <Pressable style={styles.imageWrap} onPress={() => router.push(`/product/${item.productId}`)}>
                <Image
                    source={item.images?.[0] ? (typeof item.images[0] === 'string' ? { uri: item.images[0] } : item.images[0]) : require('../../assets/images/icon_backup.png')}
                    style={styles.image}
                    contentFit="cover"
                />
                <Pressable style={styles.heart} hitSlop={6} onPress={() => removeFromWishlist(item.productId)}>
                    <Heart size={16} color={palette.red500} fill={palette.red500} />
                </Pressable>
            </Pressable>
            <Text style={styles.name} numberOfLines={1}>{item.productName}</Text>
            <View style={styles.priceRow}>
                <Text style={styles.price}>₹{Number(item.price).toLocaleString('en-IN')}</Text>
                {item.originalPrice ? <Text style={styles.original}>₹{Number(item.originalPrice).toLocaleString('en-IN')}</Text> : null}
            </View>
            <Pressable style={styles.addBtn} onPress={() => router.push(`/product/${item.productId}`)}>
                <ShoppingCart size={15} color={colors.textOnYellow} />
                <Text style={styles.addText}>Add to cart</Text>
            </Pressable>
        </View>
    );

    return (
        <SafeAreaView style={styles.container} edges={['top']}>
            <AppHeader title="Wishlist" onBack={() => router.back()} />
            {wishlistItems.length > 0 ? (
                <FlatList
                    data={wishlistItems}
                    renderItem={renderItem}
                    keyExtractor={item => item.productId}
                    numColumns={2}
                    columnWrapperStyle={{ justifyContent: 'space-between' }}
                    contentContainerStyle={styles.list}
                    showsVerticalScrollIndicator={false}
                />
            ) : (
                <View style={styles.empty}>
                    <Heart size={64} color={colors.borderStrong} />
                    <ZText variant="lg" style={{ marginTop: 20 }}>Your wishlist is empty</ZText>
                    <ZText variant="muted" style={{ marginTop: 4, marginBottom: 20 }}>Save items you love to view them here</ZText>
                    <ZButton label="Start shopping" fullWidth={false} style={{ alignSelf: 'center' }} onPress={() => router.push('/(tabs)')} />
                </View>
            )}
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: palette.paperWarm },
    list: { padding: 20, paddingTop: 6 },
    card: { width: '48%', marginBottom: 18 },
    imageWrap: { height: 190, borderRadius: 18, overflow: 'hidden', backgroundColor: colors.surfaceSunken, marginBottom: 9 },
    image: { width: '100%', height: '100%' },
    heart: { position: 'absolute', top: 9, right: 9, width: 32, height: 32, borderRadius: 16, backgroundColor: 'rgba(255,255,255,0.92)', alignItems: 'center', justifyContent: 'center' },
    name: { fontFamily: fonts.bodySemiBold, fontSize: 13, color: colors.textStrong, marginBottom: 4 },
    priceRow: { flexDirection: 'row', alignItems: 'baseline', gap: 6, marginBottom: 9 },
    price: { fontFamily: fonts.displayBold, fontSize: 16, color: colors.textStrong },
    original: { fontFamily: fonts.bodyRegular, fontSize: 11, color: colors.textFaint, textDecorationLine: 'line-through' },
    addBtn: { height: 38, borderRadius: 11, backgroundColor: palette.yellow500, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 },
    addText: { fontFamily: fonts.bodyBlack, fontSize: 12, color: colors.textOnYellow },
    empty: { flex: 1, alignItems: 'center', justifyContent: 'center', marginTop: -50 },
});
