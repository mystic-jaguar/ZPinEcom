import ActionModal from '@/components/common/ActionModal';
import { useAddress } from '@/context/AddressContext';
import { useCheckout } from '@/context/CheckoutContext';
import { useRouter } from 'expo-router';
import { ArrowRight, Check, MapPin, Pencil, Plus, Trash2 } from 'lucide-react-native';
import React, { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AppHeader, BottomBar, CheckoutSteps, ZButton, ZText } from '../../components/ui';
import { DELIVERY_CITY, isPuneAddress } from '../../constants/delivery';
import { colors, fonts, palette, radius } from '../../constants/theme';

export default function CheckoutAddressScreen() {
    const router = useRouter();
    const { addresses, removeAddress } = useAddress();
    const { selectedAddressId, setSelectedAddressId, setLastStep } = useCheckout();
    const [showModal, setShowModal] = useState(false);
    const [showAreaModal, setShowAreaModal] = useState(false);
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [addressToDelete, setAddressToDelete] = useState<string | null>(null);

    React.useEffect(() => { setLastStep(1); }, []);

    // No exit guard here: nothing is lost (selections live in CheckoutContext),
    // and backing out of payment would otherwise re-prompt on every step down.

    React.useEffect(() => {
        if (addresses.length === 0) return;
        // A restored selection can point at an address deleted since — fall back
        // to the default rather than carrying a dangling id into the summary.
        const stillExists = addresses.some(a => a.id === selectedAddressId);
        if (!selectedAddressId || !stillExists) {
            const defaultAddr = addresses.find(a => a.isDefault) || addresses[0];
            setSelectedAddressId(defaultAddr.id);
        }
    }, [addresses, selectedAddressId]);

    const handleConfirm = () => {
        const selected = addresses.find((a: any) => a.id === selectedAddressId);
        if (!selected) { setShowModal(true); return; }
        if (!isPuneAddress(selected.city, selected.pincode)) { setShowAreaModal(true); return; }
        router.push('/checkout/summary');
    };

    return (
        <SafeAreaView style={styles.container} edges={['top']}>
            <AppHeader title="Checkout" onBack={() => router.back()} />
            <CheckoutSteps step={1} />

            <ScrollView style={{ flex: 1 }} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
                <View style={styles.eyebrowRow}>
                    <MapPin size={13} color={palette.yellow500} />
                    <ZText variant="eyebrow" color={colors.textMuted}>Deliver to</ZText>
                </View>

                {addresses.map((item: any) => {
                    const selected = selectedAddressId === item.id;
                    return (
                        <Pressable
                            key={item.id}
                            style={[styles.card, selected ? styles.cardSelected : styles.cardUnselected]}
                            onPress={() => setSelectedAddressId(item.id)}
                        >
                            <View style={styles.cardHead}>
                                <View style={[styles.radio, selected && styles.radioOn]}>
                                    {selected && <Check size={13} color={palette.yellow500} />}
                                </View>
                                <Text style={styles.name}>{item.name}</Text>
                                <View style={[styles.tag, selected && styles.tagOn]}>
                                    <Text style={[styles.tagText, selected && styles.tagTextOn]}>{item.label?.toUpperCase() || 'OTHER'}</Text>
                                </View>
                            </View>
                            <Text style={styles.address}>{item.address}, {item.city}, {item.state} {item.pincode}, {item.country}</Text>
                            <Text style={styles.phone}>+91 {item.phone}</Text>
                            {selected && (
                                <View style={styles.actions}>
                                    <Pressable style={styles.actionBtn} onPress={() => router.push({ pathname: '/profile/add-address', params: { id: item.id } })}>
                                        <Pencil size={13} color={colors.textStrong} />
                                        <Text style={styles.actionText}>EDIT</Text>
                                    </Pressable>
                                    <Pressable style={styles.actionBtn} onPress={() => { setAddressToDelete(item.id); setShowDeleteModal(true); }}>
                                        <Trash2 size={13} color={palette.red500} />
                                        <Text style={[styles.actionText, { color: palette.red500 }]}>DELETE</Text>
                                    </Pressable>
                                </View>
                            )}
                        </Pressable>
                    );
                })}

                <Pressable style={styles.addCard} onPress={() => router.push('/profile/add-address')}>
                    <View style={styles.addIcon}><Plus size={22} color={palette.yellow700} /></View>
                    <View>
                        <Text style={styles.addTitle}>Add new address</Text>
                        <Text style={styles.addSub}>Home, work, or anywhere</Text>
                    </View>
                </Pressable>
            </ScrollView>

            <BottomBar>
                <ZButton label="Continue to summary" icon={ArrowRight} onPress={handleConfirm} />
            </BottomBar>

            <ActionModal visible={showModal} title="No Address Selected" message="Please select a delivery address to continue." icon="map-pin" primaryButtonText="OK" onPrimaryPress={() => setShowModal(false)} onClose={() => setShowModal(false)} />
            <ActionModal visible={showAreaModal} title="Outside delivery area" message={`We currently deliver only in ${DELIVERY_CITY}. Please select or add a ${DELIVERY_CITY} address to continue.`} icon="map-pin" primaryButtonText="OK" onPrimaryPress={() => setShowAreaModal(false)} onClose={() => setShowAreaModal(false)} />
            <ActionModal
                visible={showDeleteModal}
                title="Delete Address"
                message="Are you sure you want to delete this address?"
                icon="trash-2"
                primaryButtonText="Delete"
                onPrimaryPress={() => {
                    if (addressToDelete) {
                        removeAddress(addressToDelete);
                        if (selectedAddressId === addressToDelete) setSelectedAddressId(null);
                    }
                    setShowDeleteModal(false);
                    setAddressToDelete(null);
                }}
                secondaryButtonText="Cancel"
                onSecondaryPress={() => { setShowDeleteModal(false); setAddressToDelete(null); }}
                onClose={() => { setShowDeleteModal(false); setAddressToDelete(null); }}
            />
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: palette.paperWarm },
    content: { padding: 20, paddingTop: 4 },
    eyebrowRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 14 },

    card: { backgroundColor: colors.surfaceCard, borderRadius: radius.lg, padding: 16, marginBottom: 14 },
    cardSelected: { borderWidth: 2, borderColor: colors.borderInk },
    cardUnselected: { borderWidth: 1, borderColor: palette.neutral200 },
    cardHead: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 12 },
    radio: { width: 22, height: 22, borderRadius: 11, borderWidth: 2, borderColor: colors.borderSubtle, alignItems: 'center', justifyContent: 'center' },
    radioOn: { backgroundColor: colors.surfaceInverse, borderWidth: 0 },
    name: { flex: 1, fontFamily: fonts.displaySemiBold, fontSize: 16, color: colors.textStrong },
    tag: { backgroundColor: colors.surfaceSunken, paddingHorizontal: 9, paddingVertical: 3, borderRadius: radius.xs },
    tagOn: { backgroundColor: palette.yellow500 },
    tagText: { fontFamily: fonts.monoBold, fontSize: 9, letterSpacing: 0.6, color: colors.textBody },
    tagTextOn: { color: colors.textOnYellow },
    address: { fontFamily: fonts.bodyRegular, fontSize: 14, lineHeight: 21, color: colors.textBody, marginLeft: 32 },
    phone: { fontFamily: fonts.monoBold, fontSize: 13, color: colors.textMuted, marginLeft: 32, marginTop: 6 },
    actions: { flexDirection: 'row', gap: 20, marginLeft: 32, marginTop: 14 },
    actionBtn: { flexDirection: 'row', alignItems: 'center', gap: 5 },
    actionText: { fontFamily: fonts.monoBold, fontSize: 11, letterSpacing: 0.4, color: colors.textStrong },

    addCard: { flexDirection: 'row', alignItems: 'center', gap: 14, borderWidth: 2, borderColor: '#D8D4C8', borderStyle: 'dashed', borderRadius: radius.lg, padding: 18, backgroundColor: colors.surfaceCard, marginTop: 4 },
    addIcon: { width: 44, height: 44, borderRadius: 14, backgroundColor: palette.yellow100, alignItems: 'center', justifyContent: 'center' },
    addTitle: { fontFamily: fonts.displaySemiBold, fontSize: 15, color: colors.textStrong },
    addSub: { fontFamily: fonts.bodyRegular, fontSize: 12, color: colors.textFaint, marginTop: 1 },
});
