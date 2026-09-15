import { useRouter } from 'expo-router';
import { Bike, LucideIcon, MapPin, Navigation } from 'lucide-react-native';
import React from 'react';
import { Linking, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, createStyles, fonts, palette, radius, shadow } from '../../constants/theme';
import { useUser } from '../../context/UserContext';
import { useZone } from '../../context/ZoneContext';
import { ZButton } from '../ui';
import { Text } from '../ui/ScaledText';

const ZONES = [
    { name: 'Pune', pins: '411xxx · 412xxx' },
    { name: 'Muzaffarpur', pins: '842001 – 842004' },
];

function Illustration({ icon: Icon }: { icon: LucideIcon }) {
    return (
        <View style={styles.ringOuter}>
            <View style={styles.ringMid}>
                <View style={styles.ringInner}>
                    <Icon size={42} color={palette.ink} />
                </View>
            </View>
            <View style={[styles.dot, styles.dotA]} />
            <View style={[styles.dot, styles.dotB]} />
            <View style={[styles.dot, styles.dotC]} />
        </View>
    );
}

/** Full-screen gate shown over the app while location is denied/unavailable. */
export function LocationRequiredScreen() {
    const zone = useZone();
    const router = useRouter();
    const { isAuthenticated } = useUser();
    const denied = zone.status === 'denied';
    const needsSettings = denied && !zone.canAskAgain;

    return (
        <SafeAreaView style={[StyleSheet.absoluteFill, styles.screen]}>
            <ScrollView contentContainerStyle={styles.body}>
                <Illustration icon={Navigation} />
                <Text style={styles.eyebrow}>{denied ? 'LOCATION NEEDED' : 'CAN’T FIND YOU'}</Text>
                <Text style={styles.title}>{denied ? 'Allow location to start shopping' : 'We couldn’t get your location'}</Text>
                <Text style={styles.message}>
                    {denied
                        ? 'ZPIN only shows products from shops that can deliver to you, so we need your location to find your pincode. We don’t track you in the background.'
                        : 'Make sure location (GPS) is switched on, then try again.'}
                    {needsSettings ? '\n\nLocation is turned off for ZPIN. Open Settings → Permissions → Location and choose “Allow”.' : ''}
                </Text>
                <ZButton
                    label={needsSettings ? 'Open settings' : denied ? 'Allow location' : 'Try again'}
                    iconLeft={MapPin}
                    style={styles.cta}
                    onPress={() => (needsSettings ? Linking.openSettings() : zone.retry())}
                />
                <Pressable
                    style={styles.link}
                    onPress={() => router.push(isAuthenticated ? '/profile/add-address' : '/auth/login')}
                >
                    <Text style={styles.linkText}>
                        {isAuthenticated ? 'Add a delivery address instead' : 'Log in to use a saved address'}
                    </Text>
                </Pressable>
            </ScrollView>
        </SafeAreaView>
    );
}

/** Home tab replacement when the customer's pincode is outside every zone. */
export function ComingSoonScreen() {
    const zone = useZone();
    const router = useRouter();
    const fromAddress = zone.source === 'address';
    const place = zone.label && zone.label !== zone.pincode ? `${zone.label} (${zone.pincode})` : zone.pincode;

    return (
        <SafeAreaView style={styles.screen} edges={['top']}>
            <ScrollView contentContainerStyle={[styles.body, styles.bodyTabs]}>
                <Illustration icon={Bike} />
                <Text style={styles.eyebrow}>COMING SOON</Text>
                <Text style={styles.title}>We'll be in your area soon</Text>
                <Text style={styles.message}>
                    ZPIN doesn't deliver to {place || 'your location'} yet. Right now we're live in:
                </Text>
                <View style={styles.zones}>
                    {ZONES.map((z) => (
                        <View key={z.name} style={styles.zoneChip}>
                            <MapPin size={16} color={palette.yellow600} />
                            <View>
                                <Text style={styles.zoneName}>{z.name}</Text>
                                <Text style={styles.zonePins}>{z.pins}</Text>
                            </View>
                        </View>
                    ))}
                </View>
                <ZButton
                    label={fromAddress ? 'Change delivery address' : 'Deliver to a saved address'}
                    iconLeft={MapPin}
                    style={styles.cta}
                    onPress={() => router.push('/profile/addresses')}
                />
                {!fromAddress && (
                    <Pressable style={styles.link} onPress={zone.retry}>
                        <Text style={styles.linkText}>Check my location again</Text>
                    </Pressable>
                )}
            </ScrollView>
        </SafeAreaView>
    );
}

const styles = createStyles({
    screen: { flex: 1, backgroundColor: palette.paperWarm },
    body: { flexGrow: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 28, paddingVertical: 32 },
    bodyTabs: { paddingBottom: 130 },

    ringOuter: { width: 210, height: 210, borderRadius: 105, backgroundColor: palette.yellow50, borderWidth: 1, borderColor: palette.yellow200, alignItems: 'center', justifyContent: 'center', marginBottom: 28 },
    ringMid: { width: 146, height: 146, borderRadius: 73, backgroundColor: palette.yellow200, alignItems: 'center', justifyContent: 'center' },
    ringInner: { width: 92, height: 92, borderRadius: 46, backgroundColor: palette.yellow500, alignItems: 'center', justifyContent: 'center', ...shadow.sm },
    dot: { position: 'absolute', width: 12, height: 12, borderRadius: 6, backgroundColor: palette.yellow500 },
    dotA: { top: 22, right: 34 },
    dotB: { bottom: 34, left: 20, width: 8, height: 8, borderRadius: 4, backgroundColor: palette.ink },
    dotC: { top: 70, left: 8, width: 6, height: 6, borderRadius: 3 },

    eyebrow: { fontFamily: fonts.monoBold, fontSize: 11, letterSpacing: 1.4, color: palette.yellow600, marginBottom: 8 },
    title: { fontFamily: fonts.displayBold, fontSize: 26, lineHeight: 30, letterSpacing: -0.5, color: colors.textStrong, textAlign: 'center' },
    message: { fontFamily: fonts.bodyRegular, fontSize: 14, lineHeight: 21, color: colors.textMuted, textAlign: 'center', marginTop: 10 },

    zones: { flexDirection: 'row', gap: 10, marginTop: 18 },
    zoneChip: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: colors.surfaceCard, borderRadius: radius.md, borderWidth: 1, borderColor: colors.borderSubtle, paddingVertical: 10, paddingHorizontal: 12 },
    zoneName: { fontFamily: fonts.bodyBold, fontSize: 14, color: colors.textStrong },
    zonePins: { fontFamily: fonts.bodyRegular, fontSize: 11, color: colors.textMuted },

    cta: { marginTop: 26, alignSelf: 'stretch' },
    link: { marginTop: 16, padding: 8 },
    linkText: { fontFamily: fonts.bodyBold, fontSize: 14, color: colors.textStrong, textDecorationLine: 'underline' },
});
