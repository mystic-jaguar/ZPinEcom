import { useRouter } from 'expo-router';
import { Briefcase, Home, MapPin, Pencil, Plus, Trash2 } from 'lucide-react-native';
import React from 'react';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AppHeader, BottomBar, ZButton } from '../../components/ui';
import { colors, fonts, palette, radius } from '../../constants/theme';
import { useAddress } from '../../context/AddressContext';

export default function SavedAddressesScreen() {
    const { addresses, removeAddress, setDefaultAddress } = useAddress();
    const router = useRouter();

    const renderItem = ({ item }: { item: any }) => {
        const Icon = item.label === 'Home' ? Home : item.label === 'Work' ? Briefcase : MapPin;
        return (
            <View style={[styles.card, item.isDefault ? styles.cardDefault : styles.cardPlain]}>
                <View style={styles.head}>
                    <Icon size={19} color={colors.textStrong} />
                    <Text style={styles.name}>{item.name}</Text>
                    <View style={[styles.tag, item.isDefault && styles.tagOn]}>
                        <Text style={[styles.tagText, item.isDefault && styles.tagTextOn]}>{(item.label || 'OTHER').toUpperCase()}</Text>
                    </View>
                    {item.isDefault ? (
                        <Text style={styles.defaultTag}>DEFAULT</Text>
                    ) : (
                        <Text style={styles.setDefault} onPress={() => setDefaultAddress(item.id)}>SET DEFAULT</Text>
                    )}
                </View>
                <Text style={styles.address}>{item.address}, {item.landmark ? `${item.landmark}, ` : ''}{item.city}, {item.state} {item.pincode}</Text>
                <Text style={styles.phone}>+91 {item.phone}</Text>
                <View style={styles.actions}>
                    <Pressable style={styles.actionBtn} onPress={() => router.push({ pathname: '/profile/add-address', params: { id: item.id } })}>
                        <Pencil size={13} color={colors.textStrong} />
                        <Text style={styles.actionText}>EDIT</Text>
                    </Pressable>
                    <Pressable style={styles.actionBtn} onPress={() => removeAddress(item.id)}>
                        <Trash2 size={13} color={palette.red500} />
                        <Text style={[styles.actionText, { color: palette.red500 }]}>DELETE</Text>
                    </Pressable>
                </View>
            </View>
        );
    };

    return (
        <SafeAreaView style={styles.container} edges={['top']}>
            <AppHeader title="Saved addresses" onBack={() => router.back()} />
            <FlatList
                data={addresses}
                renderItem={renderItem}
                keyExtractor={item => item.id}
                contentContainerStyle={styles.list}
                showsVerticalScrollIndicator={false}
            />
            <BottomBar>
                <ZButton label="Add new address" variant="outline" iconLeft={Plus} onPress={() => router.push('/profile/add-address')} />
            </BottomBar>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: palette.paperWarm },
    list: { padding: 20, paddingTop: 6 },
    card: { backgroundColor: colors.surfaceCard, borderRadius: radius.lg, padding: 16, marginBottom: 14 },
    cardDefault: { borderWidth: 2, borderColor: colors.borderInk },
    cardPlain: { borderWidth: 1, borderColor: palette.neutral200 },
    head: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 10 },
    name: { fontFamily: fonts.displaySemiBold, fontSize: 16, color: colors.textStrong },
    tag: { backgroundColor: colors.surfaceSunken, paddingHorizontal: 9, paddingVertical: 3, borderRadius: radius.xs },
    tagOn: { backgroundColor: palette.yellow500 },
    tagText: { fontFamily: fonts.monoBold, fontSize: 9, letterSpacing: 0.6, color: colors.textBody },
    tagTextOn: { color: colors.textOnYellow },
    defaultTag: { marginLeft: 'auto', fontFamily: fonts.monoBold, fontSize: 9, color: palette.green500 },
    setDefault: { marginLeft: 'auto', fontFamily: fonts.monoBold, fontSize: 9, color: colors.textMuted },
    address: { fontFamily: fonts.bodyRegular, fontSize: 14, lineHeight: 21, color: colors.textBody, marginLeft: 29 },
    phone: { fontFamily: fonts.monoBold, fontSize: 13, color: colors.textMuted, marginLeft: 29, marginTop: 6 },
    actions: { flexDirection: 'row', gap: 20, marginLeft: 29, marginTop: 14 },
    actionBtn: { flexDirection: 'row', alignItems: 'center', gap: 5 },
    actionText: { fontFamily: fonts.monoBold, fontSize: 11, letterSpacing: 0.4, color: colors.textStrong },
});
