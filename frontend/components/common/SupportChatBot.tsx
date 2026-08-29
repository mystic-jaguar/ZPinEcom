// ZPIN customer assistant — same matcher as the seller app's SupportChatBot
// (ZPinVendorApp/frontend/src/screens/dashboard/SupportChatBot.tsx): a
// rule-based, IDF-weighted search over SUPPORT_GUIDES/SUPPORT_FAQS. No LLM, so
// every answer is one a human wrote and checked — the bot can't invent a return
// window or a delivery fee.
//
// What it replaces: a plain `text.includes(keyword)` scan that scored by keyword
// LENGTH, so "how long does delivery take" matched the longest overlapping
// phrase rather than the closest answer, "cancel my return" landed on the
// cancel-order entry, and asking for a human returned a contact line only if
// the exact word appeared. Now: stemming + synonyms, a confidence floor that
// escalates instead of answering wrongly, related questions, deep links into
// the screen an answer describes, and an explicit talk-to-a-person intent
// checked before the search.
//
// Not ported from the seller version: server-side thread persistence and the
// admin hand-off inbox — those exist for sellers only (seller_support_threads);
// there is no customer equivalent table or admin queue, so escalation here is
// still email/phone.
import { Mail, Phone, Send, User, X } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { KeyboardAvoidingView, Linking, Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, fonts, palette, radius } from '../../constants/theme';
import { SUPPORT_EMAIL, SUPPORT_PHONE } from '../../constants/supportContent';
import {
    AFFIRMATIVE,
    buildIndex,
    GREETING_RE,
    HUMAN_INTENT,
    search,
    THANKS_RE,
    tokenize,
} from '../../constants/supportMatcher';

const QUICK_REPLIES = [
    'How fast is delivery?',
    'Instant vs Standard?',
    'How do I return an order?',
    'When will I get my refund?',
];

type Msg = {
    from: 'bot' | 'user';
    text: string;
    source?: string;
    route?: string;
    routeLabel?: string;
    more?: number;
    suggestions?: string[];
    escalate?: boolean;
    offerHuman?: boolean;
};

const GREETING: Msg = {
    from: 'bot',
    text: "Hi! I'm the ZPIN assistant. Ask me about delivery, tracking, returns, refunds or payments — or pick a question below.",
};

const CONTACT_TEXT = `Our team can take it from here — email ${SUPPORT_EMAIL} or call ${SUPPORT_PHONE} (8am–11pm) and we'll dig into your order.`;

export default function SupportChatBot({ visible, onClose }: { visible: boolean; onClose: () => void }) {
    const index = useMemo(buildIndex, []);
    const router = useRouter();
    const [messages, setMessages] = useState<Msg[]>([GREETING]);
    const [input, setInput] = useState('');
    const [typing, setTyping] = useState(false);
    const listRef = useRef<ScrollView>(null);
    const awaitingHumanConfirmRef = useRef(false);

    useEffect(() => {
        if (visible) setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 50);
    }, [messages, typing, visible]);

    const push = (m: Msg) => setMessages(prev => [...prev, m]);

    const goToRoute = (route?: string) => {
        if (!route) return;
        onClose();
        router.push(route as any);
    };

    const showContact = () => push({ from: 'bot', text: CONTACT_TEXT, escalate: true });

    const respond = (raw: string) => {
        const text = String(raw || '').trim();
        if (!text) return;
        push({ from: 'user', text });
        setInput('');

        // A short "yes" answering the bot's own offer is an acceptance, not a
        // question for the matcher.
        if (awaitingHumanConfirmRef.current) {
            awaitingHumanConfirmRef.current = false;
            if (AFFIRMATIVE.test(text)) { showContact(); return; }
        }

        setTyping(true);
        // A beat before replying — an instant answer reads as a canned form
        // response and people stop reading it.
        setTimeout(() => {
            setTyping(false);

            if (GREETING_RE.test(text)) {
                push({ from: 'bot', text: 'Hi! What can I help with — an order, a return, a refund or a payment?' });
                return;
            }
            if (THANKS_RE.test(text) && tokenize(text).length <= 3) {
                push({ from: 'bot', text: "You're welcome! Anything else I can help with?" });
                return;
            }
            if (HUMAN_INTENT.test(text)) {
                awaitingHumanConfirmRef.current = true;
                push({
                    from: 'bot',
                    text: "I'd rather hand you to a person than guess. Want our team's contact details?",
                    offerHuman: true,
                });
                return;
            }

            const { best, others } = search(index, text);
            if (best) {
                push({
                    from: 'bot',
                    text: best.answer,
                    source: best.title,
                    route: best.route,
                    routeLabel: best.routeLabel,
                    more: best.more,
                    suggestions: others.map(o => o.title),
                });
            } else {
                awaitingHumanConfirmRef.current = true;
                push({
                    from: 'bot',
                    text: "I don't have an answer for that one — but our team does.",
                    escalate: true,
                    offerHuman: true,
                });
            }
        }, 450);
    };

    return (
        <Modal visible={visible} animationType="slide" onRequestClose={onClose} presentationStyle="pageSheet">
            <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
                <View style={styles.header}>
                    <View style={{ flex: 1 }}>
                        <Text style={styles.title}>ZPIN Assistant</Text>
                        <Text style={styles.subtitle}>Answers from the help centre</Text>
                    </View>
                    <Pressable onPress={onClose} hitSlop={10} accessibilityLabel="Close chat">
                        <X size={22} color={colors.textMuted} />
                    </Pressable>
                </View>

                {/* 'padding' on both platforms: Expo SDK 54+ edge-to-edge on Android
                    means the window no longer auto-resizes for the IME, so leaving
                    this undefined puts the input row under the keyboard. */}
                <KeyboardAvoidingView style={{ flex: 1 }} behavior="padding">
                    <ScrollView ref={listRef} contentContainerStyle={styles.messages}>
                        {messages.map((m, i) => (
                            <View key={i} style={[styles.bubble, m.from === 'user' ? styles.bubbleUser : styles.bubbleBot]}>
                                {/* Naming the topic an answer came from lets the customer
                                    judge whether the bot understood the question. */}
                                {!!m.source && <Text style={styles.source}>{m.source}</Text>}
                                <Text style={[styles.bubbleText, m.from === 'user' && styles.bubbleTextUser]}>{m.text}</Text>

                                {!!m.more && (
                                    <Text style={styles.more}>+{m.more} more step{m.more === 1 ? '' : 's'} on this in Help &amp; support.</Text>
                                )}

                                {!!m.route && (
                                    <Pressable style={styles.routeLink} onPress={() => goToRoute(m.route)}>
                                        <Text style={styles.routeLinkText}>{m.routeLabel || 'Open'} →</Text>
                                    </Pressable>
                                )}

                                {!!m.offerHuman && (
                                    <Pressable style={styles.humanBtn} onPress={() => { awaitingHumanConfirmRef.current = false; showContact(); }}>
                                        <User size={13} color="#fff" />
                                        <Text style={styles.humanBtnText}>Talk to a person</Text>
                                    </Pressable>
                                )}

                                {!!m.escalate && (
                                    <View style={styles.escalate}>
                                        <Pressable style={styles.escalateBtn} onPress={() => Linking.openURL(`mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent('Support request')}`)}>
                                            <Mail size={12} color={palette.yellow700} />
                                            <Text style={styles.escalateText}>Email support</Text>
                                        </Pressable>
                                        <Pressable style={styles.escalateBtn} onPress={() => Linking.openURL(`tel:${SUPPORT_PHONE}`)}>
                                            <Phone size={12} color={palette.yellow700} />
                                            <Text style={styles.escalateText}>Call support</Text>
                                        </Pressable>
                                    </View>
                                )}

                                {!!m.suggestions?.length && (
                                    <View style={styles.suggestions}>
                                        <Text style={styles.suggestionsLabel}>Related</Text>
                                        {m.suggestions.map(s => (
                                            <Pressable key={s} onPress={() => respond(s)}>
                                                <Text style={styles.suggestionItem}>{s}</Text>
                                            </Pressable>
                                        ))}
                                    </View>
                                )}
                            </View>
                        ))}

                        {typing && (
                            <View style={[styles.bubble, styles.bubbleBot]}>
                                <Text style={styles.bubbleText}>···</Text>
                            </View>
                        )}
                    </ScrollView>

                    {messages.length === 1 && (
                        <View style={styles.quickRow}>
                            {QUICK_REPLIES.map(q => (
                                <Pressable key={q} style={styles.quickChip} onPress={() => respond(q)}>
                                    <Text style={styles.quickChipText} numberOfLines={2} ellipsizeMode="tail">{q}</Text>
                                </Pressable>
                            ))}
                        </View>
                    )}

                    <View style={styles.inputRow}>
                        <TextInput
                            style={styles.input}
                            value={input}
                            onChangeText={setInput}
                            placeholder="Ask about delivery, returns, payments…"
                            placeholderTextColor={colors.textFaint}
                            returnKeyType="send"
                            onSubmitEditing={() => respond(input)}
                        />
                        <Pressable
                            style={[styles.sendBtn, !input.trim() && styles.sendBtnDisabled]}
                            disabled={!input.trim()}
                            onPress={() => respond(input)}
                            accessibilityLabel="Send"
                        >
                            <Send size={18} color={palette.ink} />
                        </Pressable>
                    </View>
                </KeyboardAvoidingView>
            </SafeAreaView>
        </Modal>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: palette.paperWarm },
    header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: palette.neutral200, backgroundColor: colors.surfaceCard },
    title: { fontFamily: fonts.displaySemiBold, fontSize: 16, color: colors.textStrong },
    subtitle: { fontFamily: fonts.bodyRegular, fontSize: 12, color: colors.textFaint, marginTop: 2 },

    messages: { padding: 20, gap: 12 },
    bubble: { maxWidth: '85%', borderRadius: radius.lg, paddingHorizontal: 14, paddingVertical: 11 },
    bubbleBot: { alignSelf: 'flex-start', backgroundColor: colors.surfaceCard, borderWidth: 1, borderColor: palette.neutral200 },
    bubbleUser: { alignSelf: 'flex-end', backgroundColor: colors.surfaceInverse },
    bubbleText: { fontFamily: fonts.bodyRegular, fontSize: 14, lineHeight: 20, color: colors.textBody },
    bubbleTextUser: { color: '#fff' },
    source: { fontFamily: fonts.bodySemiBold, fontSize: 11, color: palette.yellow700, textTransform: 'uppercase', marginBottom: 4 },
    more: { fontFamily: fonts.bodyRegular, fontSize: 11, color: colors.textFaint, marginTop: 6 },

    routeLink: { marginTop: 10 },
    routeLinkText: { fontFamily: fonts.bodySemiBold, fontSize: 12, color: palette.yellow700 },

    humanBtn: { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 10, alignSelf: 'flex-start', paddingHorizontal: 12, paddingVertical: 7, borderRadius: radius.md, backgroundColor: colors.surfaceInverse },
    humanBtnText: { fontFamily: fonts.bodySemiBold, fontSize: 12, color: '#fff' },

    escalate: { flexDirection: 'row', gap: 8, marginTop: 10 },
    escalateBtn: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 12, paddingVertical: 7, borderRadius: radius.md, backgroundColor: palette.yellow100 },
    escalateText: { fontFamily: fonts.bodySemiBold, fontSize: 12, color: palette.yellow700 },

    suggestions: { marginTop: 10, paddingTop: 8, borderTopWidth: 1, borderTopColor: palette.neutral200, gap: 4 },
    suggestionsLabel: { fontFamily: fonts.bodySemiBold, fontSize: 11, color: colors.textFaint, textTransform: 'uppercase', marginBottom: 2 },
    suggestionItem: { fontFamily: fonts.bodyRegular, fontSize: 12, color: palette.yellow700 },

    // ponytail: fixed 2-column grid keeps every capsule identical on any screen width; go FlatList/numColumns if QUICK_REPLIES ever grows past a handful
    quickRow: { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: 20, paddingBottom: 10, gap: 8 },
    quickChip: { width: '48.5%', minHeight: 44, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 999, borderWidth: 1, borderColor: palette.neutral200, backgroundColor: colors.surfaceCard },
    quickChipText: { fontFamily: fonts.bodySemiBold, fontSize: 12, color: colors.textBody, textAlign: 'center' },

    inputRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 20, paddingTop: 10, paddingBottom: 14, borderTopWidth: 1, borderTopColor: palette.neutral200, backgroundColor: colors.surfaceCard },
    input: { flex: 1, height: 46, borderRadius: radius.md, backgroundColor: colors.surfaceSunken, paddingHorizontal: 15, fontFamily: fonts.bodyRegular, fontSize: 14, color: colors.textStrong },
    sendBtn: { width: 46, height: 46, borderRadius: radius.md, backgroundColor: palette.yellow500, alignItems: 'center', justifyContent: 'center' },
    sendBtnDisabled: { opacity: 0.4 },
});
