import * as Clipboard from 'expo-clipboard';
import { useRouter } from 'expo-router';
import { Ticket } from 'lucide-react-native';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AppHeader, ZText } from '../../components/ui';
import { colors, fonts, palette, radius } from '../../constants/theme';
import { useCart } from '../../context/CartContext';

const TABS = ['All', 'Active', 'Expired'];

export default function CouponsScreen() {
    const router = useRouter();
    const { availableCoupons, applyCoupon } = useCart();
    const [selectedTab, setSelectedTab] = useState('All');
    const [isLoading, setIsLoading] = useState(true);
    const [code, setCode] = useState('');
    const [copied, setCopied] = useState<string | null>(null);

    useEffect(() => {
        if (availableCoupons !== undefined) setIsLoading(false);
    }, [availableCoupons]);

    const filtered = availableCoupons.filter((c: any) => {
        if (selectedTab === 'All') return true;
        if (selectedTab === 'Active') return c.status === 'active' || !c.status;
        if (selectedTab === 'Expired') return c.status === 'expired';
        return true;
    });

    const copyCode = async (c: string) => {
        await Clipboard.setStringAsync(c);
        setCopied(c);
        setTimeout(() => setCopied((cur) => (cur === c ? null : cur)), 1500);
    };

    const renderItem = ({ item, index }: { item: any; index: number }) => {
        const expired = item.status === 'expired';
        const featured = index === 0 && !expired;
        const discountLabel = item.discountType === 'percentage' ? `${item.discountValue}%` : `₹${item.discountValue}`;
        return (
            <View style={[styles.coupon, featured ? styles.couponDark : expired ? styles.couponExpired : styles.couponWhite]}>
                <View style={styles.couponHead}>
                    <Text style={[styles.code, featured && { color: palette.yellow500 }, expired && { color: colors.textFaint }]}>{item.code}</Text>
                    <View style={[styles.catChip, featured && styles.catChipBrand]}>
                        <Text style={[styles.catChipText, featured && { color: colors.textOnYellow }]}>{expired ? 'USED' : (item.type || 'OFFER').toUpperCase()}</Text>
                    </View>
                </View>
                <Text style={[styles.couponDesc, featured && { color: palette.neutral300 }]} numberOfLines={2}>
                    {item.description || `Save ${discountLabel} on your order.`}
                </Text>
                {!expired && (
                    <View style={styles.couponFoot}>
                        <Text style={[styles.expiry, featured && { color: palette.yellow300 }]}>
                            {item.expiryDate ? `EXPIRES ${new Date(item.expiryDate).toLocaleDateString('en-IN', { timeZone: 'Asia/Kolkata', day: 'numeric', month: 'short' }).toUpperCase()}` : 'LIMITED TIME'}
                        </Text>
                        <Pressable style={[styles.copyBtn, featured && styles.copyBtnDark]} onPress={() => copyCode(item.code)}>
                            <Text style={[styles.copyText, featured && { color: '#fff' }]}>{copied === item.code ? 'Copied!' : 'Copy code'}</Text>
                        </Pressable>
                    </View>
                )}
            </View>
        );
    };

    return (
        <SafeAreaView style={styles.container} edges={['top']}>
            <AppHeader title="Coupons" onBack={() => router.back()} />

            <View style={styles.applyWrap}>
                <View style={styles.applyField}>
                    <Ticket size={19} color={colors.textFaint} />
                    <TextInput
                        style={styles.applyInput}
                        placeholder="Enter coupon code"
                        placeholderTextColor={colors.textFaint}
                        value={code}
                        onChangeText={setCode}
                        autoCapitalize="characters"
                    />
                    <Pressable disabled={!code.trim()} onPress={() => { if (code.trim()) applyCoupon(code.trim()); }}>
                        <Text style={[styles.applyLink, !code.trim() && { opacity: 0.4 }]}>APPLY</Text>
                    </Pressable>
                </View>
            </View>

            <View style={styles.tabs}>
                {TABS.map((t) => (
                    <Pressable key={t} style={[styles.tab, selectedTab === t && styles.tabOn]} onPress={() => setSelectedTab(t)}>
                        <Text style={[styles.tabText, selectedTab === t && styles.tabTextOn]}>{t}</Text>
                    </Pressable>
                ))}
            </View>

            {isLoading ? (
                <ActivityIndicator style={{ marginTop: 40 }} color={palette.yellow500} />
            ) : filtered.length === 0 ? (
                <View style={styles.empty}>
                    <Ticket size={48} color={colors.borderStrong} />
                    <ZText variant="muted" style={{ marginTop: 16 }}>No coupons available</ZText>
                </View>
            ) : (
                <FlatList
                    data={filtered}
                    keyExtractor={(item) => item.id}
                    contentContainerStyle={styles.list}
                    renderItem={renderItem}
                    showsVerticalScrollIndicator={false}
                />
            )}
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: palette.paperWarm },
    applyWrap: { paddingHorizontal: 20, paddingBottom: 12 },
    applyField: { flexDirection: 'row', alignItems: 'center', gap: 11, backgroundColor: colors.surfaceCard, borderWidth: 1.5, borderColor: '#C9C5B8', borderStyle: 'dashed', borderRadius: radius.md, paddingHorizontal: 15, height: 52 },
    applyInput: { flex: 1, fontFamily: fonts.monoBold, fontSize: 14, letterSpacing: 0.4, color: colors.textStrong },
    applyLink: { fontFamily: fonts.bodyBold, fontSize: 12, color: palette.yellow600 },

    tabs: { flexDirection: 'row', gap: 10, paddingHorizontal: 20, paddingBottom: 14 },
    tab: { paddingHorizontal: 18, paddingVertical: 8, borderRadius: 100, backgroundColor: colors.surfaceCard, borderWidth: 1.5, borderColor: colors.borderSubtle },
    tabOn: { backgroundColor: colors.surfaceInverse, borderColor: colors.surfaceInverse },
    tabText: { fontFamily: fonts.bodyBold, fontSize: 13, color: colors.textMuted },
    tabTextOn: { color: colors.textInvert },

    list: { paddingHorizontal: 20, paddingBottom: 40 },
    coupon: { borderRadius: 18, padding: 18, marginBottom: 14, overflow: 'hidden' },
    couponDark: { backgroundColor: colors.surfaceInverse },
    couponWhite: { backgroundColor: colors.surfaceCard, borderWidth: 1, borderColor: palette.neutral200 },
    couponExpired: { backgroundColor: '#F5F4F0', borderWidth: 1, borderColor: palette.neutral200, opacity: 0.75 },
    couponHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
    code: { fontFamily: fonts.displayBold, fontSize: 22, letterSpacing: 0.4, color: colors.textStrong },
    catChip: { backgroundColor: colors.surfaceSunken, paddingHorizontal: 8, paddingVertical: 4, borderRadius: radius.xs },
    catChipBrand: { backgroundColor: palette.yellow500 },
    catChipText: { fontFamily: fonts.monoBold, fontSize: 9, letterSpacing: 0.4, color: colors.textBody },
    couponDesc: { fontFamily: fonts.bodyRegular, fontSize: 13, lineHeight: 19, color: colors.textMuted, marginBottom: 14 },
    couponFoot: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    expiry: { fontFamily: fonts.monoBold, fontSize: 10, letterSpacing: 0.6, color: colors.textMuted },
    copyBtn: { backgroundColor: palette.yellow500, borderRadius: 8, paddingHorizontal: 14, paddingVertical: 7 },
    copyBtnDark: { backgroundColor: 'transparent', borderWidth: 1.5, borderColor: '#4A4842', borderStyle: 'dashed' },
    copyText: { fontFamily: fonts.bodyBold, fontSize: 12, color: colors.textOnYellow },
    empty: { flex: 1, alignItems: 'center', justifyContent: 'center', marginTop: -40 },
});
