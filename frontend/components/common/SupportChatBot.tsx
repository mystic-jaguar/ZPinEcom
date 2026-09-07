// ZPIN customer assistant — same matcher as the seller app's SupportChatBot
// (ZPinVendorApp/frontend/src/screens/dashboard/SupportChatBot.tsx): a
// rule-based, IDF-weighted search over SUPPORT_GUIDES/SUPPORT_FAQS. No LLM, so
// every answer is one a human wrote and checked — the bot can't invent a return
// window or a delivery fee.
//
// Beyond the matcher it now does what the customer website's ChatBot does
// (website-customer/src/Components/ChatBot.jsx): the thread is persisted
// server-side (/api/v1/support-chat), so it survives closing the app and is the
// SAME thread the website widget uses; asking for a human hands the
// conversation to zpin-admin's Customer Chats page instead of dead-ending at an
// email address; and admin replies arrive by polling while the sheet is open.
// Endpoint contract, statuses and copy are kept identical to the website on
// purpose — one customer, one conversation, one wording.
import { Mail, Phone, Send, User, X } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { KeyboardAvoidingView, Linking, Modal, Pressable, ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { createStyles, colors, fonts, palette, radius } from '../../constants/theme';
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
import { useUser } from '../../context/UserContext';
import supportChatApi, { SupportMessageRow, SupportThreadStatus } from '../../services/supportChat';
import { Text, TextInput } from '../ui/ScaledText';

const QUICK_REPLIES = [
    'How fast is delivery?',
    'Instant vs Standard?',
    'How do I return an order?',
    'When will I get my refund?',
];

type Msg = {
    id?: string;
    from: 'bot' | 'user' | 'admin' | 'system';
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

const HANDOFF_TEXT =
    "I've flagged this for our team — someone will reply right here, usually within a few hours. Feel free to add any more details while you wait.";

const POLL_MS = 12000;

// Server rows use sender_type: customer/bot/admin/system — map to the `from`
// this component renders on, and unpack the bot's stored meta
// (source/route/suggestions) back into message fields.
//
// meta is spread FIRST, and the authoritative columns are written over it: meta
// is caller-supplied, so letting it land last would let a stored payload
// override `from` or `text` and render a customer's own message as a ZPIN
// Support bubble. (The backend allow-lists meta as well — this is the second
// half of that fix.)
const fromServerRow = (row: SupportMessageRow): Msg => ({
    ...(row.meta || {}),
    id: row.id,
    from: row.sender_type === 'customer' ? 'user' : (row.sender_type as Msg['from']),
    text: row.message,
});

const STATUS_BANNER: Partial<Record<SupportThreadStatus, { text: string; fg: string; bg: string }>> = {
    pending_human: { text: 'Waiting for a person from our team to reply.', fg: palette.warning500, bg: palette.warning50 },
    active_human: { text: "You're chatting with ZPIN support.", fg: palette.success500, bg: palette.success50 },
};

export default function SupportChatBot({ visible, onClose }: { visible: boolean; onClose: () => void }) {
    const index = useMemo(buildIndex, []);
    const router = useRouter();
    const { isAuthenticated } = useUser();
    const [messages, setMessages] = useState<Msg[]>([GREETING]);
    const [input, setInput] = useState('');
    const [typing, setTyping] = useState(false);
    const [status, setStatus] = useState<SupportThreadStatus>('bot');
    const listRef = useRef<ScrollView>(null);
    const loadedRef = useRef(false);
    const awaitingHumanConfirmRef = useRef(false);
    const lastSeenRef = useRef<string | null>(null); // created_at of the newest row we hold

    useEffect(() => {
        if (visible) setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 50);
    }, [messages, typing, visible]);

    // Merge freshly-fetched rows without ever showing the same message twice:
    // dedup on the server id, and advance our own cutoff past whatever we just
    // sent, so a poll can't re-add messages already on screen.
    const mergeServerRows = (rows: SupportMessageRow[]) => {
        if (!rows.length) return;
        lastSeenRef.current = rows[rows.length - 1].created_at;
        setMessages(prev => {
            const seen = new Set(prev.map(m => m.id).filter(Boolean));
            const fresh = rows.map(fromServerRow).filter(r => !seen.has(r.id));
            return fresh.length ? [...prev, ...fresh] : prev;
        });
    };

    // Picks up admin replies (and status changes) while the sheet is open.
    // Signed-out chats never call the backend at all.
    const poll = useCallback(async () => {
        if (!isAuthenticated) return;
        try {
            const { status: s, messages: rows } = await supportChatApi.thread(lastSeenRef.current);
            setStatus(s);
            mergeServerRows(rows);
        } catch {
            // History is a nice-to-have, not a blocker — the bot still answers
            // locally if the backend is briefly unreachable.
        }
    }, [isAuthenticated]);

    // Load history once per app run, then poll while the sheet stays open.
    useEffect(() => {
        if (!visible || !isAuthenticated) return;
        if (!loadedRef.current) {
            loadedRef.current = true;
            (async () => {
                try {
                    const { status: s, messages: rows } = await supportChatApi.thread();
                    setStatus(s);
                    if (rows.length) {
                        lastSeenRef.current = rows[rows.length - 1].created_at;
                        setMessages([GREETING, ...rows.map(fromServerRow)]);
                    }
                } catch {
                    // Fall back to a fresh local-only conversation.
                }
            })();
        }
        const t = setInterval(poll, POLL_MS);
        return () => clearInterval(t);
    }, [visible, isAuthenticated, poll]);

    const push = (m: Msg) => setMessages(prev => [...prev, m]);

    const goToRoute = (route?: string) => {
        if (!route) return;
        onClose();
        router.push(route as any);
    };

    const nextTempId = () => `tmp-${Date.now()}-${Math.random().toString(36).slice(2)}`;

    // Renders immediately with a temporary id (optimistic), then swaps in the
    // server's real id — that id is what lets the next poll recognise this exact
    // message instead of appending a second copy of it. No-op when signed out;
    // the conversation just stays local.
    const persistAndReconcile = async (
        tempId: string,
        message: string,
        senderType: 'customer' | 'bot',
        meta?: Record<string, any>,
    ) => {
        if (!isAuthenticated) return;
        try {
            const row = await supportChatApi.send(message, senderType, meta);
            if (row) {
                lastSeenRef.current = row.created_at;
                setMessages(prev => prev.map(m => (m.id === tempId ? { ...m, id: row.id } : m)));
            }
        } catch {
            // Leave the optimistic bubble — the customer still sees what they sent.
        }
    };

    const requestHuman = () => {
        awaitingHumanConfirmRef.current = false;

        // Support replies into the thread, and a thread needs an account to
        // hang off. Signed out, the only honest handoff is the contact details.
        if (!isAuthenticated) {
            push({
                id: nextTempId(),
                from: 'bot',
                text: `Log in first so our team can reply to you right here — or reach us directly: ${CONTACT_TEXT}`,
                escalate: true,
            });
            return;
        }

        const tempId = nextTempId();
        push({ id: tempId, from: 'bot', text: HANDOFF_TEXT });
        setStatus('pending_human');
        persistAndReconcile(tempId, HANDOFF_TEXT, 'bot');
        supportChatApi.handoff().catch(() => { });
    };

    // No optimistic bubble: the backend writes its own "Customer ended the chat."
    // system message, and polling for it (rather than guessing the wording here)
    // is what keeps it from duplicating.
    const endChat = async () => {
        setStatus('resolved');
        try { await supportChatApi.resolve(); } catch { /* status already flipped locally */ }
        poll();
    };

    const respond = (raw: string) => {
        const text = String(raw || '').trim();
        if (!text) return;

        const userTempId = nextTempId();
        push({ id: userTempId, from: 'user', text });
        setInput('');
        persistAndReconcile(userTempId, text, 'customer');

        // Once a human is (or was asked to be) in the loop the bot stops
        // auto-replying — every further message is just relayed to support.
        if (status === 'pending_human' || status === 'active_human') return;

        // A short "yes" answering the bot's own offer is an acceptance, not a
        // question for the matcher.
        if (awaitingHumanConfirmRef.current) {
            awaitingHumanConfirmRef.current = false;
            if (AFFIRMATIVE.test(text)) { requestHuman(); return; }
        }

        setTyping(true);
        // A beat before replying — an instant answer reads as a canned form
        // response and people stop reading it.
        setTimeout(() => {
            setTyping(false);

            if (GREETING_RE.test(text)) {
                const tempId = nextTempId();
                const reply = 'Hi! What can I help with — an order, a return, a refund or a payment?';
                push({ id: tempId, from: 'bot', text: reply });
                persistAndReconcile(tempId, reply, 'bot');
                return;
            }
            if (THANKS_RE.test(text) && tokenize(text).length <= 3) {
                const tempId = nextTempId();
                const reply = "You're welcome! Anything else I can help with?";
                push({ id: tempId, from: 'bot', text: reply });
                persistAndReconcile(tempId, reply, 'bot');
                return;
            }
            if (HUMAN_INTENT.test(text)) {
                const tempId = nextTempId();
                const reply = 'I can connect you with a person from our team instead of guessing. Want me to do that?';
                awaitingHumanConfirmRef.current = true;
                push({ id: tempId, from: 'bot', text: reply, offerHuman: true });
                persistAndReconcile(tempId, reply, 'bot', { offerHuman: true });
                return;
            }

            const { best, others } = search(index, text);
            const tempId = nextTempId();
            const msg: Msg = best
                ? {
                    id: tempId,
                    from: 'bot',
                    text: best.answer,
                    source: best.title,
                    route: best.route,
                    routeLabel: best.routeLabel,
                    more: best.more,
                    suggestions: others.map(o => o.title),
                }
                : {
                    id: tempId,
                    from: 'bot',
                    text: "I don't have an answer for that one — but our team does.",
                    escalate: true,
                    offerHuman: true,
                };
            if (!best) awaitingHumanConfirmRef.current = true;
            push(msg);
            persistAndReconcile(tempId, msg.text, 'bot', {
                source: msg.source, route: msg.route, routeLabel: msg.routeLabel,
                more: msg.more, suggestions: msg.suggestions,
                escalate: msg.escalate, offerHuman: msg.offerHuman,
            });
        }, 450);
    };

    const banner = STATUS_BANNER[status];
    // The bot is handling the conversation unless a human is actually in it —
    // 'resolved' counts as bot again.
    const botHandling = status !== 'pending_human' && status !== 'active_human';

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

                {!!banner && (
                    <View style={[styles.banner, { backgroundColor: banner.bg }]}>
                        <Text style={[styles.bannerText, { color: banner.fg }]}>{banner.text}</Text>
                        <Pressable onPress={endChat} hitSlop={8} accessibilityLabel="End chat">
                            <Text style={[styles.bannerAction, { color: banner.fg }]}>End chat</Text>
                        </Pressable>
                    </View>
                )}

                {/* 'padding' on both platforms: Expo SDK 54+ edge-to-edge on Android
                    means the window no longer auto-resizes for the IME, so leaving
                    this undefined puts the input row under the keyboard. */}
                <KeyboardAvoidingView style={{ flex: 1 }} behavior="padding">
                    <ScrollView ref={listRef} contentContainerStyle={styles.messages}>
                        {messages.map((m, i) => (
                            <View
                                key={m.id || i}
                                style={[
                                    styles.bubble,
                                    m.from === 'user' ? styles.bubbleUser : styles.bubbleBot,
                                    m.from === 'system' && styles.bubbleSystem,
                                ]}
                            >
                                {/* Naming the topic an answer came from lets the customer
                                    judge whether the bot understood the question. */}
                                {!!m.source && <Text style={styles.source}>{m.source}</Text>}
                                {m.from === 'admin' && <Text style={styles.source}>ZPIN Support</Text>}
                                <Text
                                    style={[
                                        styles.bubbleText,
                                        m.from === 'user' && styles.bubbleTextUser,
                                        m.from === 'system' && styles.bubbleTextSystem,
                                    ]}
                                >
                                    {m.text}
                                </Text>

                                {!!m.more && (
                                    <Text style={styles.more}>+{m.more} more step{m.more === 1 ? '' : 's'} on this in Help &amp; support.</Text>
                                )}

                                {!!m.route && (
                                    <Pressable style={styles.routeLink} onPress={() => goToRoute(m.route)}>
                                        <Text style={styles.routeLinkText}>{m.routeLabel || 'Open'} →</Text>
                                    </Pressable>
                                )}

                                {/* Only while the bot is the one answering — offering to
                                    "talk to a person" mid-conversation with a person is noise. */}
                                {!!m.offerHuman && botHandling && (
                                    <Pressable style={styles.humanBtn} onPress={requestHuman}>
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

                    {messages.length === 1 && status === 'bot' && (
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
                            placeholder={botHandling ? 'Ask about delivery, returns, payments…' : 'Message support…'}
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

const styles = createStyles({
    container: { flex: 1, backgroundColor: palette.paperWarm },
    header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: palette.neutral200, backgroundColor: colors.surfaceCard },
    title: { fontFamily: fonts.displaySemiBold, fontSize: 16, color: colors.textStrong },
    subtitle: { fontFamily: fonts.bodyRegular, fontSize: 12, color: colors.textFaint, marginTop: 2 },

    banner: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 20, paddingVertical: 10 },
    bannerText: { flex: 1, fontFamily: fonts.bodyRegular, fontSize: 12, lineHeight: 17 },
    bannerAction: { fontFamily: fonts.bodySemiBold, fontSize: 12, textDecorationLine: 'underline' },

    messages: { padding: 20, gap: 12 },
    bubble: { maxWidth: '85%', borderRadius: radius.lg, paddingHorizontal: 14, paddingVertical: 11 },
    bubbleBot: { alignSelf: 'flex-start', backgroundColor: colors.surfaceCard, borderWidth: 1, borderColor: palette.neutral200 },
    bubbleUser: { alignSelf: 'flex-end', backgroundColor: colors.surfaceInverse },
    bubbleSystem: { alignSelf: 'center', maxWidth: '95%', backgroundColor: 'transparent', borderWidth: 0, paddingVertical: 2 },
    bubbleText: { fontFamily: fonts.bodyRegular, fontSize: 14, lineHeight: 20, color: colors.textBody },
    bubbleTextUser: { color: '#fff' },
    bubbleTextSystem: { fontSize: 11, color: colors.textFaint, textAlign: 'center' },
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
