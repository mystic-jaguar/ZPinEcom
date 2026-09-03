import { useFocusEffect, useRouter } from 'expo-router';
import { Bell, CheckCheck, PackageCheck, Truck, Wallet, XCircle } from 'lucide-react-native';
import React, { useCallback, useState } from 'react';
import { ActivityIndicator, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AppHeader, ZText } from '../../components/ui';
import { colors, fonts, palette, radius } from '../../constants/theme';
import { useNotificationsBadge } from '../../context/NotificationsContext';
import { NotificationItem, notificationService, routeForNotification } from '../../services/notification';

function iconFor(n: NotificationItem) {
    const status = n.data?.status;
    if (status === 'delivered') return PackageCheck;
    if (status === 'delivery_failed' || status === 'returned') return XCircle;
    if (status === 'shipped' || status === 'out_for_delivery') return Truck;
    if (n.type === 'payment_success') return Wallet;
    return Bell;
}

function timeAgo(iso: string) {
    const mins = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
    if (!Number.isFinite(mins) || mins < 1) return 'Just now';
    if (mins < 60) return `${mins}m ago`;
    if (mins < 1440) return `${Math.floor(mins / 60)}h ago`;
    return `${Math.floor(mins / 1440)}d ago`;
}

export default function NotificationsScreen() {
    const router = useRouter();
    const { refresh } = useNotificationsBadge();
    const [items, setItems] = useState<NotificationItem[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    const load = useCallback(async () => {
        try {
            const res = await notificationService.getNotifications({ limit: 50 });
            setItems(res.data || []);
        } catch {
            setItems([]);
        } finally {
            setIsLoading(false);
        }
    }, []);

    useFocusEffect(useCallback(() => { load(); }, [load]));

    const onRefresh = async () => {
        setRefreshing(true);
        await load();
        setRefreshing(false);
    };

    const open = async (n: NotificationItem) => {
        if (!n.isRead) {
            setItems(prev => prev.map(i => (i.id === n.id ? { ...i, isRead: true } : i)));
            notificationService.markRead(n.id).then(refresh).catch(() => { });
        }
        // Same helper the push tap handler uses — one definition of where a
        // notification leads, in the app or from the lock screen.
        const route = routeForNotification(n.data);
        if (!route) return;
        router.push({ pathname: route.pathname as any, params: route.params });
    };

    const markAll = async () => {
        setItems(prev => prev.map(i => ({ ...i, isRead: true })));
        notificationService.markAllRead().then(refresh).catch(() => { });
    };

    const hasUnread = items.some(i => !i.isRead);

    return (
        <SafeAreaView style={styles.container} edges={['top']}>
            <AppHeader
                title="Notifications"
                onBack={() => router.back()}
                right={hasUnread ? (
                    <Pressable style={styles.markAllBtn} onPress={markAll}>
                        <CheckCheck size={18} color={colors.textStrong} />
                    </Pressable>
                ) : undefined}
            />
            <ScrollView
                contentContainerStyle={styles.content}
                showsVerticalScrollIndicator={false}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[palette.yellow500]} tintColor={palette.yellow500} />}
            >
                {isLoading ? (
                    <View style={styles.empty}><ActivityIndicator color={palette.yellow500} /><ZText variant="muted" style={{ marginTop: 12 }}>Loading…</ZText></View>
                ) : items.length === 0 ? (
                    <View style={styles.empty}>
                        <Bell size={44} color={colors.borderStrong} />
                        <ZText variant="muted" style={{ marginTop: 12 }}>No notifications yet</ZText>
                    </View>
                ) : (
                    items.map(n => {
                        const Icon = iconFor(n);
                        return (
                            <Pressable key={n.id} style={[styles.card, !n.isRead && styles.cardUnread]} onPress={() => open(n)}>
                                <View style={[styles.iconWrap, !n.isRead && styles.iconWrapUnread]}>
                                    <Icon size={20} color={n.isRead ? colors.textMuted : colors.textOnYellow} />
                                </View>
                                <View style={{ flex: 1 }}>
                                    <View style={styles.titleRow}>
                                        <Text style={styles.title} numberOfLines={1}>{n.title}</Text>
                                        <Text style={styles.time}>{timeAgo(n.createdAt)}</Text>
                                    </View>
                                    <Text style={styles.message}>{n.message}</Text>
                                </View>
                                {!n.isRead && <View style={styles.dot} />}
                            </Pressable>
                        );
                    })
                )}
                <View style={{ height: 30 }} />
            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: palette.paperWarm },
    markAllBtn: { width: 40, height: 40, borderRadius: 20, borderWidth: 2, borderColor: colors.borderInk, alignItems: 'center', justifyContent: 'center' },
    content: { padding: 20, paddingTop: 4 },

    card: { flexDirection: 'row', alignItems: 'flex-start', gap: 13, backgroundColor: colors.surfaceCard, borderWidth: 1, borderColor: palette.neutral200, borderRadius: radius.lg, padding: 16, marginBottom: 12 },
    cardUnread: { borderColor: palette.yellow200, backgroundColor: colors.surfaceBrandTint },
    iconWrap: { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.surfaceSunken, alignItems: 'center', justifyContent: 'center' },
    iconWrapUnread: { backgroundColor: palette.yellow500 },
    titleRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    title: { flex: 1, fontFamily: fonts.bodySemiBold, fontSize: 14, color: colors.textStrong },
    time: { fontFamily: fonts.monoBold, fontSize: 9, letterSpacing: 0.4, color: colors.textFaint },
    message: { fontFamily: fonts.bodyRegular, fontSize: 13, color: colors.textMuted, marginTop: 3, lineHeight: 18 },
    dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: palette.yellow500, marginTop: 6 },

    empty: { alignItems: 'center', paddingVertical: 60 },
});
