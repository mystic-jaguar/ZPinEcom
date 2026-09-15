import ActionModal from '@/components/common/ActionModal';
import LegalDocModal, { LegalDocType } from '@/components/common/LegalDocModal';
import { useCart } from '@/context/CartContext';
import { useOrder } from '@/context/OrderContext';
import { useWishlist } from '@/context/WishlistContext';
import { authService } from '@/services/auth';
import { Image } from 'expo-image';
import { useFocusEffect, useRouter } from 'expo-router';
import {
    Bell, ChevronRight, Heart, LifeBuoy, LogOut, MapPin, RotateCcw, Settings, Shield, ShoppingBag, Ticket, User, Zap,
} from 'lucide-react-native';
import React, { useCallback, useState } from 'react';
import { Pressable, RefreshControl, ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ZButton, ZText } from '../../components/ui';
import { ArrowRight } from 'lucide-react-native';
import { createStyles, colors, fonts, palette, radius, shadow } from '../../constants/theme';
import { useUser } from '../../context/UserContext';
import { Text } from '../../components/ui/ScaledText';

function initialsOf(name?: string) {
    if (!name) return 'ZP';
    return name.trim().split(/\s+/).slice(0, 2).map((w) => w[0]?.toUpperCase() || '').join('') || 'ZP';
}

export default function ProfileScreen() {
    const { user, resetUser, isAuthenticated } = useUser();
    const { clearCart, availableCoupons, refreshCoupons } = useCart();
    const { orders, totalOrders, refreshOrders } = useOrder();
    const { wishlistItems, clearWishlist, refreshWishlist } = useWishlist();
    const router = useRouter();
    const [refreshing, setRefreshing] = useState(false);

    const refreshAll = useCallback(
        () => Promise.all([refreshOrders(), refreshCoupons(), refreshWishlist()]),
        [refreshOrders, refreshCoupons, refreshWishlist]
    );

    // Re-fetch the counts each time the profile is focused so a failed cold-start
    // load (Render backend waking up) self-heals instead of showing a stale 0.
    useFocusEffect(useCallback(() => { if (isAuthenticated) refreshAll(); }, [refreshAll, isAuthenticated]));

    const onRefresh = useCallback(async () => {
        setRefreshing(true);
        try { await refreshAll(); } finally { setRefreshing(false); }
    }, [refreshAll]);
    const [logoutModalVisible, setLogoutModalVisible] = useState(false);
    const [legalModalVisible, setLegalModalVisible] = useState(false);
    const [legalDocType, setLegalDocType] = useState<LegalDocType>('terms');

    const openLegalDoc = (type: LegalDocType) => {
        setLegalDocType(type);
        setLegalModalVisible(true);
    };

    const handleLogout = async () => {
        try {
            await authService.logout();
            resetUser();
            clearCart();
            clearWishlist();
            setLogoutModalVisible(false);
            router.replace('/(tabs)');
        } catch (error) {
            console.error('Logout error:', error);
            setLogoutModalVisible(false);
        }
    };

    const quickActions = [
        { icon: ShoppingBag, label: 'Orders', onPress: () => router.push('/profile/orders') },
        { icon: Heart, label: 'Wishlist', onPress: () => router.push('/profile/wishlist') },
        { icon: Ticket, label: 'Coupons', onPress: () => router.push('/profile/coupons') },
        { icon: RotateCcw, label: 'Refunds', onPress: () => router.push('/profile/returns') },
    ];

    const settings = [
        { icon: Bell, label: 'Notifications', onPress: () => router.push('/profile/notifications' as any) },
        { icon: User, label: 'Edit profile', onPress: () => router.push('/profile/edit-profile') },
        { icon: MapPin, label: 'Saved addresses', onPress: () => router.push('/profile/addresses') },
        { icon: LifeBuoy, label: 'Help & support', onPress: () => router.push('/profile/help-center') },
        { icon: Shield, label: 'Privacy & terms', onPress: () => openLegalDoc('privacy') },
    ];

    if (!isAuthenticated) {
        return (
            <SafeAreaView style={styles.container} edges={['top']}>
                <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
                    <View style={styles.headerRow}>
                        <ZText variant="h2">Profile</ZText>
                    </View>
                    <View style={styles.hero}>
                        <Zap size={130} color="rgba(255,196,0,0.12)" fill="rgba(255,196,0,0.12)" style={styles.heroGlow} />
                        <Text style={styles.heroName}>Welcome to ZPIN</Text>
                        <Text style={styles.heroEmail}>Log in to see your orders, wishlist, coupons and saved addresses.</Text>
                        <ZButton label="Log in" icon={ArrowRight} style={{ marginTop: 16 }} onPress={() => router.push('/auth/login')} />
                    </View>
                    <Pressable style={{ paddingVertical: 14 }} onPress={() => router.push('/auth/signup')}>
                        <ZText variant="lg">New to ZPIN? Create account</ZText>
                    </Pressable>
                    <Pressable style={{ paddingVertical: 14 }} onPress={() => router.push('/profile/help-center')}>
                        <ZText variant="lg">Help & support</ZText>
                    </Pressable>
                    <Pressable style={{ paddingVertical: 14 }} onPress={() => openLegalDoc('privacy')}>
                        <ZText variant="lg">Privacy & terms</ZText>
                    </Pressable>
                </ScrollView>
                <LegalDocModal visible={legalModalVisible} docType={legalDocType} onClose={() => setLegalModalVisible(false)} />
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView style={styles.container} edges={['top']}>
            <ScrollView
                showsVerticalScrollIndicator={false}
                contentContainerStyle={styles.scroll}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[palette.yellow500]} tintColor={palette.yellow500} />}
            >
                <View style={styles.headerRow}>
                    <ZText variant="h2">Profile</ZText>
                    <Pressable style={styles.settingsBtn} onPress={() => router.push('/profile/edit-profile')}>
                        <Settings size={20} color={colors.textStrong} />
                    </Pressable>
                </View>

                {/* Hero */}
                <View style={styles.hero}>
                    <Zap size={130} color="rgba(255,196,0,0.12)" fill="rgba(255,196,0,0.12)" style={styles.heroGlow} />
                    <View style={styles.heroTop}>
                        <View style={styles.avatar}>
                            {user.profileImage ? (
                                <Image source={{ uri: user.profileImage }} style={styles.avatarImg} contentFit="cover" />
                            ) : (
                                <Text style={styles.avatarText}>{initialsOf(user.name)}</Text>
                            )}
                        </View>
                        <View style={{ flex: 1 }}>
                            <Text style={styles.heroName} numberOfLines={1}>{user.name || 'ZPIN Shopper'}</Text>
                            {user.email ? <Text style={styles.heroEmail} numberOfLines={1}>{user.email}</Text> : null}
                        </View>
                        {user.isPro && (
                            <View style={styles.proBadge}>
                                <Zap size={11} color={colors.textOnYellow} fill={colors.textOnYellow} />
                                <Text style={styles.proText}>PRO</Text>
                            </View>
                        )}
                    </View>
                    <View style={styles.statsRow}>
                        <Pressable style={[styles.stat, styles.statDivider]} onPress={() => router.push('/profile/orders')}>
                            <Text style={styles.statValue}>{totalOrders}</Text>
                            <Text style={styles.statLabel}>ORDERS</Text>
                        </Pressable>
                        <Pressable style={[styles.stat, styles.statDivider]} onPress={() => router.push('/profile/wishlist')}>
                            <Text style={styles.statValue}>{wishlistItems.length}</Text>
                            <Text style={styles.statLabel}>WISHLIST</Text>
                        </Pressable>
                        <Pressable style={styles.stat} onPress={() => router.push('/profile/coupons')}>
                            <Text style={styles.statValue}>{availableCoupons.length}</Text>
                            <Text style={styles.statLabel}>COUPONS</Text>
                        </Pressable>
                    </View>
                </View>

                {/* Quick actions */}
                <View style={styles.quickRow}>
                    {quickActions.map((a) => (
                        <Pressable key={a.label} style={styles.quickTile} onPress={a.onPress}>
                            <View style={styles.quickIcon}><a.icon size={20} color={palette.yellow700} /></View>
                            <Text style={styles.quickLabel}>{a.label}</Text>
                        </Pressable>
                    ))}
                </View>

                {/* Settings */}
                <ZText variant="eyebrow" style={styles.eyebrow}>Account</ZText>
                <View style={styles.card}>
                    {settings.map((s, i) => (
                        <Pressable key={s.label} style={[styles.row, i < settings.length - 1 && styles.rowBorder]} onPress={s.onPress}>
                            <View style={styles.rowIcon}><s.icon size={18} color={colors.textBody} /></View>
                            <Text style={styles.rowLabel}>{s.label}</Text>
                            <ChevronRight size={18} color={colors.borderStrong} />
                        </Pressable>
                    ))}
                </View>

                <View style={styles.dangerRow}>
                    <Pressable style={styles.outlineBtn} onPress={() => setLogoutModalVisible(true)}>
                        <LogOut size={18} color={colors.textBody} />
                        <Text style={styles.outlineText}>Log out</Text>
                    </Pressable>
                </View>
            </ScrollView>

            <ActionModal
                visible={logoutModalVisible}
                title="Logout"
                message="Are you sure you want to logout?"
                icon="log-out"
                primaryButtonText="LOGOUT"
                onPrimaryPress={handleLogout}
                secondaryButtonText="CANCEL"
                onSecondaryPress={() => setLogoutModalVisible(false)}
                onClose={() => setLogoutModalVisible(false)}
            />
            <LegalDocModal visible={legalModalVisible} docType={legalDocType} onClose={() => setLegalModalVisible(false)} />
        </SafeAreaView>
    );
}

const styles = createStyles({
    container: { flex: 1, backgroundColor: palette.paperWarm },
    scroll: { paddingBottom: 130 },
    headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingTop: 6, paddingBottom: 14 },
    settingsBtn: { width: 42, height: 42, borderRadius: 21, borderWidth: 2, borderColor: colors.borderInk, alignItems: 'center', justifyContent: 'center' },

    hero: { marginHorizontal: 20, backgroundColor: colors.surfaceInverse, borderRadius: 26, padding: 20, overflow: 'hidden' },
    heroGlow: { position: 'absolute', right: -24, top: -24 },
    heroTop: { flexDirection: 'row', alignItems: 'center', gap: 15, marginBottom: 18 },
    avatar: { width: 64, height: 64, borderRadius: 32, backgroundColor: palette.neutral800, borderWidth: 2, borderColor: palette.yellow500, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
    avatarImg: { width: '100%', height: '100%' },
    avatarText: { fontFamily: fonts.displayBold, fontSize: 24, color: palette.yellow500 },
    heroName: { fontFamily: fonts.displayBold, fontSize: 20, letterSpacing: -0.2, color: colors.textInvert, marginBottom: 3 },
    heroEmail: { fontFamily: fonts.bodyRegular, fontSize: 12, color: palette.neutral400 },
    proBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: palette.yellow500, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 100 },
    proText: { fontFamily: fonts.monoBold, fontSize: 9, letterSpacing: 0.8, color: colors.textOnYellow },
    statsRow: { flexDirection: 'row', backgroundColor: 'rgba(255,255,255,0.07)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.12)', borderRadius: radius.md, paddingVertical: 12 },
    stat: { flex: 1, alignItems: 'center', justifyContent: 'center' },
    statDivider: { borderRightWidth: 1, borderRightColor: 'rgba(255,255,255,0.12)' },
    statValue: { fontFamily: fonts.displayBold, fontSize: 20, color: palette.yellow500 },
    statLabel: { fontFamily: fonts.monoBold, fontSize: 9, letterSpacing: 0.6, color: palette.neutral300 },

    quickRow: { flexDirection: 'row', gap: 12, paddingHorizontal: 20, marginTop: 16, marginBottom: 22 },
    quickTile: { flex: 1, backgroundColor: colors.surfaceCard, borderWidth: 1, borderColor: palette.neutral200, borderRadius: 18, paddingVertical: 14, alignItems: 'center' },
    quickIcon: { width: 40, height: 40, borderRadius: 13, backgroundColor: palette.yellow100, alignItems: 'center', justifyContent: 'center', marginBottom: 8 },
    quickLabel: { fontFamily: fonts.bodySemiBold, fontSize: 11, color: colors.textBody },

    eyebrow: { paddingHorizontal: 20, marginBottom: 12 },
    card: { marginHorizontal: 20, backgroundColor: colors.surfaceCard, borderWidth: 1, borderColor: palette.neutral200, borderRadius: radius.lg, overflow: 'hidden' },
    row: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingVertical: 15, paddingHorizontal: 16 },
    rowBorder: { borderBottomWidth: 1, borderBottomColor: palette.neutral100 },
    rowIcon: { width: 36, height: 36, borderRadius: 11, backgroundColor: colors.surfaceSunken, alignItems: 'center', justifyContent: 'center' },
    rowLabel: { flex: 1, fontFamily: fonts.bodySemiBold, fontSize: 15, color: colors.textBody },

    dangerRow: { flexDirection: 'row', gap: 12, paddingHorizontal: 20, marginTop: 16 },
    outlineBtn: { flex: 1, height: 50, borderRadius: radius.md, borderWidth: 2, borderColor: colors.borderSubtle, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
    outlineText: { fontFamily: fonts.bodyBold, fontSize: 13, color: colors.textBody },
    dangerBtn: { borderColor: '#F3D3D0' },
});
