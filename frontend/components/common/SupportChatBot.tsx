import { Send, X } from 'lucide-react-native';
import React, { useEffect, useRef, useState } from 'react';
import { KeyboardAvoidingView, Linking, Modal, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, fonts, palette, radius } from '../../constants/theme';

const SUPPORT_EMAIL = 'support@zpin.com';
const SUPPORT_PHONE = '+911234567890';

// Rule-based knowledge base — matched against the customer's message by keyword
// overlap. Same flow as the website's ChatBot: no backend/LLM call, this answers
// the handful of questions that make up the bulk of real support volume.
const KB: { keywords: string[]; answer: string }[] = [
    {
        keywords: ['instant', 'standard', 'difference', 'delivery type', 'delivery types', 'try at door', 'try-at-door'],
        answer: 'Instant Delivery is "try at your door" — you get 15 minutes to try the items when they arrive, keep what you want and hand the rest straight back to the delivery partner, no return request needed. Standard delivery gives you a 7-day return window afterwards instead.',
    },
    {
        keywords: ['how fast', 'how long', 'delivery time', 'when will', 'arrive', 'deliver', 'shipping time', 'eta'],
        answer: 'Estimated delivery is within 12 hours for both Standard and Instant orders. You can follow either live from Profile > My Orders > Track order.',
    },
    {
        keywords: ['track', 'tracking', 'where is my order', 'order status'],
        answer: 'Open Profile > My Orders, tap the order, and you\'ll see live tracking with the courier\'s details once it\'s picked up.',
    },
    {
        keywords: ['cod', 'cash on delivery', 'pay cash', 'prepay', 'prepaid'],
        answer: 'For Instant Delivery orders paid by Cash on Delivery, the ₹50 delivery fee is prepaid online at checkout — only the product amount is collected at your door. Standard COD orders are paid in full on delivery. Carrying exact change helps.',
    },
    {
        keywords: ['return', 'refund', 'exchange', 'send back', 'money back'],
        answer: 'Standard orders can be returned within 7 days — open the order and tap "Return items". Refunds land within 5–7 business days of us receiving the product. Instant Delivery orders skip this: you decide keep or return right at the door.',
    },
    {
        keywords: ['payment', 'pay', 'upi', 'card', 'netbanking', 'net banking', 'razorpay'],
        answer: 'We accept UPI, credit/debit cards and net banking through Razorpay, plus Cash on Delivery.',
    },
    {
        keywords: ['coupon', 'promo', 'discount', 'offer'],
        answer: 'Coupons are applied at checkout — tap "Apply coupon" on the payment step, or browse the ones you can use from Profile > Coupons.',
    },
    {
        keywords: ['cancel'],
        answer: 'You can cancel an order before it\'s dispatched — open it from Profile > My Orders and tap Cancel. If the option is gone, it\'s already on its way; contact support and we\'ll help.',
    },
    {
        keywords: ['address', 'change address', 'wrong address'],
        answer: 'Manage your addresses from Profile > Saved addresses. Because orders move fast, an address change on a placed order is only possible shortly after checkout — contact support right away.',
    },
    {
        keywords: ['contact', 'human', 'agent', 'call', 'phone', 'email', 'talk to someone', 'representative'],
        answer: `You can reach our team at ${SUPPORT_EMAIL} or ${SUPPORT_PHONE} (8am–11pm) — happy to dig into anything I can't answer here.`,
    },
    { keywords: ['hi', 'hello', 'hey'], answer: 'Hi! I can help with delivery times, Instant vs Standard, returns, payments or tracking — what do you need?' },
    { keywords: ['thank', 'thanks'], answer: 'You\'re welcome! Anything else I can help with?' },
];

const QUICK_REPLIES = [
    'How fast is delivery?',
    'Instant vs Standard?',
    'How do I return an order?',
    'What payment methods do you accept?',
];

function findAnswer(message: string): string | null {
    const text = message.toLowerCase();
    let best: string | null = null;
    let bestScore = 0;
    for (const entry of KB) {
        const score = entry.keywords.reduce((s, kw) => s + (text.includes(kw) ? kw.length : 0), 0);
        if (score > bestScore) {
            bestScore = score;
            best = entry.answer;
        }
    }
    return best;
}

type Msg = { from: 'bot' | 'user'; text: string; escalate?: boolean };

export default function SupportChatBot({ visible, onClose }: { visible: boolean; onClose: () => void }) {
    const [messages, setMessages] = useState<Msg[]>([
        { from: 'bot', text: 'Hi! I\'m the ZPIN assistant. Ask me about delivery, returns, payments or tracking — or pick a question below.' },
    ]);
    const [input, setInput] = useState('');
    const listRef = useRef<ScrollView>(null);

    useEffect(() => {
        if (visible) setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 50);
    }, [messages, visible]);

    const respond = (userText: string) => {
        const trimmed = userText.trim();
        if (!trimmed) return;
        setMessages(prev => [...prev, { from: 'user', text: trimmed }]);
        setInput('');
        setTimeout(() => {
            const answer = findAnswer(trimmed);
            setMessages(prev => [...prev, answer
                ? { from: 'bot', text: answer }
                : {
                    from: 'bot',
                    text: `I don't have an answer for that yet. Our team can help directly — email ${SUPPORT_EMAIL} or call ${SUPPORT_PHONE} (8am–11pm).`,
                    escalate: true,
                }]);
        }, 400);
    };

    return (
        <Modal visible={visible} animationType="slide" onRequestClose={onClose} presentationStyle="pageSheet">
            <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
                <View style={styles.header}>
                    <View style={{ flex: 1 }}>
                        <Text style={styles.title}>ZPIN Assistant</Text>
                        <Text style={styles.subtitle}>Usually replies instantly</Text>
                    </View>
                    <Pressable onPress={onClose} hitSlop={10} accessibilityLabel="Close chat">
                        <X size={22} color={colors.textMuted} />
                    </Pressable>
                </View>

                <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
                    <ScrollView ref={listRef} contentContainerStyle={styles.messages}>
                        {messages.map((m, i) => (
                            <View key={i} style={[styles.bubble, m.from === 'user' ? styles.bubbleUser : styles.bubbleBot]}>
                                <Text style={[styles.bubbleText, m.from === 'user' && styles.bubbleTextUser]}>{m.text}</Text>
                                {m.escalate && (
                                    <View style={styles.escalate}>
                                        <Pressable style={styles.escalateBtn} onPress={() => Linking.openURL(`mailto:${SUPPORT_EMAIL}?subject=Support Request`)}>
                                            <Text style={styles.escalateText}>Email support</Text>
                                        </Pressable>
                                        <Pressable style={styles.escalateBtn} onPress={() => Linking.openURL(`tel:${SUPPORT_PHONE}`)}>
                                            <Text style={styles.escalateText}>Call support</Text>
                                        </Pressable>
                                    </View>
                                )}
                            </View>
                        ))}
                    </ScrollView>

                    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.quickRow}>
                        {QUICK_REPLIES.map(q => (
                            <Pressable key={q} style={styles.quickChip} onPress={() => respond(q)}>
                                <Text style={styles.quickChipText}>{q}</Text>
                            </Pressable>
                        ))}
                    </ScrollView>

                    <View style={styles.inputRow}>
                        <TextInput
                            style={styles.input}
                            value={input}
                            onChangeText={setInput}
                            placeholder="Type your question..."
                            placeholderTextColor={colors.textFaint}
                            returnKeyType="send"
                            onSubmitEditing={() => respond(input)}
                        />
                        <Pressable style={styles.sendBtn} onPress={() => respond(input)} accessibilityLabel="Send">
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
    escalate: { flexDirection: 'row', gap: 8, marginTop: 10 },
    escalateBtn: { paddingHorizontal: 12, paddingVertical: 7, borderRadius: radius.md, backgroundColor: palette.yellow100 },
    escalateText: { fontFamily: fonts.bodySemiBold, fontSize: 12, color: palette.yellow700 },

    quickRow: { paddingHorizontal: 20, paddingBottom: 10, gap: 8 },
    quickChip: { paddingHorizontal: 13, paddingVertical: 8, borderRadius: 999, borderWidth: 1, borderColor: palette.neutral200, backgroundColor: colors.surfaceCard },
    quickChipText: { fontFamily: fonts.bodySemiBold, fontSize: 12, color: colors.textBody },

    inputRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 20, paddingTop: 10, paddingBottom: 14, borderTopWidth: 1, borderTopColor: palette.neutral200, backgroundColor: colors.surfaceCard },
    input: { flex: 1, height: 46, borderRadius: radius.md, backgroundColor: colors.surfaceSunken, paddingHorizontal: 15, fontFamily: fonts.bodyRegular, fontSize: 14, color: colors.textStrong },
    sendBtn: { width: 46, height: 46, borderRadius: radius.md, backgroundColor: palette.yellow500, alignItems: 'center', justifyContent: 'center' },
});
