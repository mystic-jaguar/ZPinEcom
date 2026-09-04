import ActionModal from '@/components/common/ActionModal';
import LegalDocModal, { LegalDocType } from '@/components/common/LegalDocModal';
import SupportChatBot from '@/components/common/SupportChatBot';
import { useRouter } from 'expo-router';
import { ChevronDown, ChevronRight, ChevronUp, CreditCard, FileText, Mail, MessageCircle, Phone, RotateCcw, Search, Shield, Trash2 } from 'lucide-react-native';
import React, { useState } from 'react';
import { Linking, Pressable, ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AppHeader, ZText } from '../../components/ui';
import { SUPPORT_EMAIL, SUPPORT_FAQS, SUPPORT_PHONE } from '../../constants/supportContent';
import { createStyles, colors, fonts, palette, radius } from '../../constants/theme';
import { Text, TextInput } from '../../components/ui/ScaledText';

// FAQs come from constants/supportContent.ts — the same list the ZPIN
// Assistant answers from, so the two can't drift apart.
type FAQ = { id: string; category: string; question: string; answer: string };

const TOPICS = [
    { id: 'returns', icon: RotateCcw, label: 'Returns & refunds', route: '/profile/returns' },
    { id: 'payments', icon: CreditCard, label: 'Payments & coupons', route: '/profile/coupons' },
];

const ALL_FAQS: FAQ[] = SUPPORT_FAQS.map((f, i) => ({
    id: String(i + 1),
    category: f.category,
    question: f.q,
    answer: f.a,
}));

export default function HelpCenterScreen() {
    const router = useRouter();
    const [searchQuery, setSearchQuery] = useState('');
    const [expandedFaq, setExpandedFaq] = useState<string | null>(null);
    const [infoModalVisible, setInfoModalVisible] = useState(false);
    const [infoModalConfig, setInfoModalConfig] = useState({ title: '', message: '', icon: 'info' as any });
    const [chatOpen, setChatOpen] = useState(false);
    const [legalModalVisible, setLegalModalVisible] = useState(false);
    const [legalDocType, setLegalDocType] = useState<LegalDocType>('privacy');
    const openLegal = (docType: LegalDocType) => { setLegalDocType(docType); setLegalModalVisible(true); };

    const filteredFaqs = searchQuery.trim()
        ? ALL_FAQS.filter(f => f.question.toLowerCase().includes(searchQuery.toLowerCase()) || f.answer.toLowerCase().includes(searchQuery.toLowerCase()))
        : ALL_FAQS;

    const contact = (fn: () => Promise<any>, errTitle: string, errMsg: string) => {
        fn().catch(() => { setInfoModalConfig({ title: errTitle, message: errMsg, icon: 'x-circle' }); setInfoModalVisible(true); });
    };
    const callSupport = () => contact(() => Linking.openURL(`tel:${SUPPORT_PHONE}`), 'Error', `Unable to make a call. Please dial ${SUPPORT_PHONE} manually.`);
    const emailSupport = () => contact(() => Linking.openURL(`mailto:${SUPPORT_EMAIL}?subject=Support Request`), 'Error', `Unable to open email. Please email ${SUPPORT_EMAIL}`);

    const QUICK = [
        { icon: MessageCircle, title: 'Live chat', sub: 'Replies instantly', onPress: () => setChatOpen(true) },
        { icon: Phone, title: 'Call us', sub: '8am–11pm', onPress: callSupport },
        { icon: Mail, title: 'Email', sub: '24h reply', onPress: emailSupport },
    ];

    return (
        <SafeAreaView style={styles.container} edges={['top']}>
            <AppHeader title="Help & support" onBack={() => router.back()} />
            <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
                {/* Hero */}
                <View style={styles.hero}>
                    <ZText variant="h3" color="#fff" style={{ marginBottom: 6 }}>How can we help?</ZText>
                    <Text style={styles.heroSub}>Real people, fast answers.</Text>
                    <View style={styles.heroSearch}>
                        <Search size={18} color={colors.textFaint} />
                        <TextInput
                            style={styles.heroInput}
                            placeholder="Search help topics"
                            placeholderTextColor={colors.textFaint}
                            value={searchQuery}
                            onChangeText={setSearchQuery}
                        />
                    </View>
                </View>

                {/* Quick contact */}
                <View style={styles.quickRow}>
                    {QUICK.map((q) => (
                        <Pressable key={q.title} style={styles.quickCard} onPress={q.onPress}>
                            <View style={styles.quickIcon}><q.icon size={22} color={palette.yellow700} /></View>
                            <Text style={styles.quickTitle}>{q.title}</Text>
                            <Text style={styles.quickSub}>{q.sub}</Text>
                        </Pressable>
                    ))}
                </View>

                {/* Popular topics / search results */}
                <ZText variant="eyebrow" style={{ marginBottom: 12 }}>{searchQuery ? `Results (${filteredFaqs.length})` : 'Popular topics'}</ZText>

                {!searchQuery && (
                    <View style={styles.card}>
                        {TOPICS.map((t, i) => (
                            <Pressable key={t.id} style={[styles.topicRow, i < TOPICS.length - 1 && styles.rowBorder]} onPress={() => router.push(t.route as any)}>
                                <View style={styles.topicIcon}><t.icon size={18} color={colors.textBody} /></View>
                                <Text style={styles.topicLabel}>{t.label}</Text>
                                <ChevronRight size={18} color={colors.borderStrong} />
                            </Pressable>
                        ))}
                    </View>
                )}

                {/* FAQs */}
                {(searchQuery ? filteredFaqs.length > 0 : true) ? (
                    <View style={[styles.card, { marginTop: searchQuery ? 0 : 20 }]}>
                        {filteredFaqs.map((faq, i) => (
                            <View key={faq.id} style={[i < filteredFaqs.length - 1 && styles.rowBorder]}>
                                <Pressable style={styles.faqRow} onPress={() => setExpandedFaq(expandedFaq === faq.id ? null : faq.id)}>
                                    <View style={{ flex: 1 }}>
                                        <ZText variant="eyebrow" style={{ marginBottom: 4 }}>{faq.category}</ZText>
                                        <Text style={styles.faqQ}>{faq.question}</Text>
                                    </View>
                                    {expandedFaq === faq.id ? <ChevronUp size={18} color={colors.textMuted} /> : <ChevronDown size={18} color={colors.textMuted} />}
                                </Pressable>
                                {expandedFaq === faq.id && <Text style={styles.faqA}>{faq.answer}</Text>}
                            </View>
                        ))}
                    </View>
                ) : (
                    <View style={styles.noResults}>
                        <Search size={44} color={colors.borderStrong} />
                        <ZText variant="muted" style={{ marginTop: 14 }}>No results for “{searchQuery}”</ZText>
                    </View>
                )}
                {/* Still need help */}
                {!searchQuery && (
                    <>
                        <ZText variant="eyebrow" style={{ marginTop: 24, marginBottom: 12 }}>Still need help?</ZText>
                        <Pressable style={styles.helpCard} onPress={() => setChatOpen(true)}>
                            <Text style={styles.helpTitle}>Chat with the ZPIN Assistant</Text>
                            <Text style={styles.helpSub}>Instant answers on delivery, returns, payments and tracking — with a hand-off to our team if it can’t help.</Text>
                            <View style={styles.helpCta}><Text style={styles.helpCtaText}>Start chat →</Text></View>
                        </Pressable>

                        <ZText variant="eyebrow" style={{ marginTop: 24, marginBottom: 12 }}>Legal</ZText>
                        <View style={styles.card}>
                            <Pressable style={[styles.topicRow, styles.rowBorder]} onPress={() => openLegal('privacy')}>
                                <View style={styles.topicIcon}><Shield size={18} color={colors.textBody} /></View>
                                <Text style={styles.topicLabel}>Privacy Policy</Text>
                                <ChevronRight size={18} color={colors.borderStrong} />
                            </Pressable>
                            <Pressable style={styles.topicRow} onPress={() => openLegal('terms')}>
                                <View style={styles.topicIcon}><FileText size={18} color={colors.textBody} /></View>
                                <Text style={styles.topicLabel}>Terms &amp; Conditions</Text>
                                <ChevronRight size={18} color={colors.borderStrong} />
                            </Pressable>
                        </View>

                        <ZText variant="eyebrow" style={{ marginTop: 24, marginBottom: 12 }}>Account</ZText>
                        <Pressable style={styles.deleteRow} onPress={() => router.push('/profile/delete-account')}>
                            <Trash2 size={16} color={palette.red500} />
                            <Text style={styles.deleteRowText}>Delete account</Text>
                        </Pressable>
                    </>
                )}
                <View style={{ height: 30 }} />
            </ScrollView>

            <SupportChatBot visible={chatOpen} onClose={() => setChatOpen(false)} />
            <LegalDocModal visible={legalModalVisible} docType={legalDocType} onClose={() => setLegalModalVisible(false)} />

            <ActionModal visible={infoModalVisible} title={infoModalConfig.title} message={infoModalConfig.message} icon={infoModalConfig.icon} primaryButtonText="OK" onPrimaryPress={() => setInfoModalVisible(false)} onClose={() => setInfoModalVisible(false)} />

        </SafeAreaView>
    );
}

const styles = createStyles({
    container: { flex: 1, backgroundColor: palette.paperWarm },
    content: { padding: 20, paddingTop: 4 },
    hero: { backgroundColor: colors.surfaceInverse, borderRadius: radius.xl, padding: 20, marginBottom: 20 },
    heroSub: { fontFamily: fonts.bodyRegular, fontSize: 13, color: palette.neutral300, marginBottom: 16 },
    heroSearch: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: '#fff', borderRadius: radius.md, paddingHorizontal: 15, height: 50 },
    heroInput: { flex: 1, fontFamily: fonts.bodyRegular, fontSize: 14, color: colors.textStrong, padding: 0 },

    quickRow: { flexDirection: 'row', gap: 12, marginBottom: 22 },
    quickCard: { flex: 1, backgroundColor: colors.surfaceCard, borderWidth: 1, borderColor: palette.neutral200, borderRadius: 18, paddingVertical: 16, alignItems: 'center' },
    quickIcon: { width: 44, height: 44, borderRadius: 14, backgroundColor: palette.yellow100, alignItems: 'center', justifyContent: 'center', marginBottom: 9 },
    quickTitle: { fontFamily: fonts.displaySemiBold, fontSize: 13, color: colors.textStrong },
    quickSub: { fontFamily: fonts.bodyRegular, fontSize: 11, color: colors.textFaint, marginTop: 1 },

    card: { backgroundColor: colors.surfaceCard, borderWidth: 1, borderColor: palette.neutral200, borderRadius: radius.lg, overflow: 'hidden' },
    rowBorder: { borderBottomWidth: 1, borderBottomColor: palette.neutral100 },
    topicRow: { flexDirection: 'row', alignItems: 'center', gap: 14, padding: 16 },
    topicIcon: { width: 36, height: 36, borderRadius: 11, backgroundColor: colors.surfaceSunken, alignItems: 'center', justifyContent: 'center' },
    topicLabel: { flex: 1, fontFamily: fonts.bodySemiBold, fontSize: 15, color: colors.textBody },

    faqRow: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 16 },
    faqQ: { fontFamily: fonts.bodySemiBold, fontSize: 14, color: colors.textStrong },
    faqA: { fontFamily: fonts.bodyRegular, fontSize: 13, lineHeight: 20, color: colors.textMuted, paddingHorizontal: 16, paddingBottom: 16, marginTop: -4 },
    noResults: { alignItems: 'center', paddingVertical: 40 },

    helpCard: { backgroundColor: palette.yellow100, borderRadius: radius.lg, padding: 18 },
    helpTitle: { fontFamily: fonts.displaySemiBold, fontSize: 15, color: colors.textStrong },
    helpSub: { fontFamily: fonts.bodyRegular, fontSize: 13, lineHeight: 19, color: colors.textBody, marginTop: 6 },
    helpCta: { marginTop: 12 },
    helpCtaText: { fontFamily: fonts.bodySemiBold, fontSize: 13, color: palette.yellow700 },

    deleteRow: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: colors.surfaceCard, borderWidth: 1, borderColor: palette.neutral200, borderRadius: radius.lg, padding: 16 },
    deleteRowText: { fontFamily: fonts.bodySemiBold, fontSize: 14, color: palette.red500 },
});
