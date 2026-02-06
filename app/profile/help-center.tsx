import { Colors } from '@/constants/Colors';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function HelpCenterScreen() {
    const router = useRouter();
    const [searchQuery, setSearchQuery] = useState('');
    const [expandedFaq, setExpandedFaq] = useState<string | null>(null);

    const toggleFaq = (id: string) => {
        setExpandedFaq(expandedFaq === id ? null : id);
    };

    const TOPICS = [
        { id: 'track', label: 'Track Order', icon: 'bus-outline', color: '#FFD54F' },
        { id: 'returns', label: 'Returns & Refunds', icon: 'return-down-back-outline', color: '#FFF59D' },
        { id: 'payment', label: 'Payment Issues', icon: 'wallet-outline', color: '#FFF176' },
        { id: 'account', label: 'Account Settings', icon: 'person-outline', color: '#FFF9C4' },
    ];

    const FAQS = [
        { id: '1', question: 'How do I track my order?', answer: 'You can track your order by clicking on "Track Order" in the Popular Topics section or by going to My Orders in your profile.' },
        { id: '2', question: 'What is Instant Trial?', answer: 'Instant Trial allows you to try out products at the time of delivery and return them immediately if you don\'t like them.' },
        { id: '3', question: 'How do I change my delivery address?', answer: 'You can change your delivery address in the Account Settings section under Saved Addresses.' },
    ];

    return (
        <View style={styles.container}>
            {/* Header Background */}
            <View style={styles.headerBackground}>
                <SafeAreaView edges={['top']} style={styles.safeArea}>
                    <View style={styles.headerTop}>
                        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                            <Ionicons name="chevron-back" size={24} color="#000" />
                        </TouchableOpacity>
                        <Text style={styles.headerTitle}>Help Center</Text>
                        <View style={{ width: 40 }} />
                    </View>

                    <View style={styles.searchContainer}>
                        <Ionicons name="search" size={20} color="#757575" style={styles.searchIcon} />
                        <TextInput
                            style={styles.searchInput}
                            placeholder="How can we help you today?"
                            placeholderTextColor="#9E9E9E"
                            value={searchQuery}
                            onChangeText={setSearchQuery}
                        />
                    </View>
                </SafeAreaView>
            </View>

            <ScrollView style={styles.contentScroll} showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>

                {/* Popular Topics */}
                <Text style={styles.sectionTitle}>Popular Topics</Text>
                <View style={styles.topicsGrid}>
                    {TOPICS.map((topic) => (
                        <TouchableOpacity key={topic.id} style={styles.topicCard}>
                            <View style={[styles.topicIconContainer, { backgroundColor: topic.color + '40' }]}>
                                <Ionicons name={topic.icon as any} size={24} color={Colors.light.tint} />
                            </View>
                            <Text style={styles.topicLabel}>{topic.label}</Text>
                        </TouchableOpacity>
                    ))}
                </View>

                {/* FAQs */}
                <View style={styles.faqHeaderRow}>
                    <Text style={styles.sectionTitle}>Frequently Asked Questions</Text>
                    <TouchableOpacity>
                        <Text style={styles.viewAllText}>View All</Text>
                    </TouchableOpacity>
                </View>

                <View style={styles.faqContainer}>
                    {FAQS.map((faq) => (
                        <View key={faq.id} style={styles.faqItem}>
                            <TouchableOpacity style={styles.faqQuestionRow} onPress={() => toggleFaq(faq.id)}>
                                <Text style={styles.faqQuestion}>{faq.question}</Text>
                                <Ionicons
                                    name={expandedFaq === faq.id ? "chevron-up" : "chevron-down"}
                                    size={20}
                                    color="#757575"
                                />
                            </TouchableOpacity>
                            {expandedFaq === faq.id && (
                                <Text style={styles.faqAnswer}>{faq.answer}</Text>
                            )}
                        </View>
                    ))}
                </View>

                {/* Still Need Help */}
                <Text style={styles.helpText}>STILL NEED HELP?</Text>

                <View style={styles.supportButtonsRow}>
                    <TouchableOpacity style={[styles.supportButton, styles.chatButton]}>
                        <Ionicons name="chatbubble" size={20} color="#000" style={{ marginRight: 8 }} />
                        <Text style={styles.supportButtonText}>Chat with Us</Text>
                    </TouchableOpacity>

                    <TouchableOpacity style={[styles.supportButton, styles.callButton]}>
                        <Ionicons name="call-outline" size={20} color="#000" style={{ marginRight: 8 }} />
                        <Text style={styles.supportButtonText}>Call Support</Text>
                    </TouchableOpacity>
                </View>

                {/* Expert Advice Banner */}
                <View style={styles.expertBanner}>
                    <View style={styles.expertContent}>
                        <Text style={styles.expertTitle}>EXPERT ADVICE</Text>
                        <Text style={styles.expertHeading}>Book a free session{'\n'}with a fashion stylist.</Text>
                        <TouchableOpacity style={styles.bookButton}>
                            <Text style={styles.bookButtonText}>Book Now</Text>
                        </TouchableOpacity>
                    </View>
                    {/* Placeholder for illustration */}
                    <View style={styles.expertIllustration}>
                        <Ionicons name="sparkles" size={60} color="#F5F5F5" />
                    </View>
                </View>

                <View style={{ height: 40 }} />
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#F8F9FA',
    },
    headerBackground: {
        backgroundColor: Colors.light.tint,
        paddingBottom: 30,
        borderBottomLeftRadius: 30,
        borderBottomRightRadius: 30,
    },
    safeArea: {
        paddingHorizontal: 20,
    },
    headerTop: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 20,
        marginTop: 10,
    },
    backButton: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: 'rgba(255,255,255,0.3)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    headerTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#000',
    },
    searchContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#fff',
        borderRadius: 12,
        paddingHorizontal: 15,
        paddingVertical: 12,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
    },
    searchIcon: {
        marginRight: 10,
    },
    searchInput: {
        flex: 1,
        fontSize: 14,
        color: '#000',
    },
    contentScroll: {
        flex: 1,
        marginTop: 10,
    },
    scrollContent: {
        padding: 20,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#000',
        marginBottom: 15,
    },
    topicsGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'space-between',
        marginBottom: 25,
    },
    topicCard: {
        width: '48%',
        backgroundColor: '#fff',
        borderRadius: 16,
        padding: 16,
        alignItems: 'center',
        marginBottom: 15,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 3,
        elevation: 2,
    },
    topicIconContainer: {
        width: 50,
        height: 50,
        borderRadius: 25,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 10,
    },
    topicLabel: {
        fontSize: 14,
        fontWeight: '600',
        color: '#000',
        textAlign: 'center',
    },
    faqHeaderRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 15,
    },
    viewAllText: {
        fontSize: 14,
        fontWeight: 'bold',
        color: '#FBC02D',
    },
    faqContainer: {
        backgroundColor: '#fff',
        borderRadius: 16,
        padding: 10,
        marginBottom: 25,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 3,
        elevation: 2,
    },
    faqItem: {
        borderBottomWidth: 1,
        borderBottomColor: '#F5F5F5',
    },
    faqQuestionRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 15,
        paddingHorizontal: 10,
    },
    faqQuestion: {
        fontSize: 14,
        fontWeight: '600',
        color: '#000',
        flex: 1,
        marginRight: 10,
    },
    faqAnswer: {
        fontSize: 13,
        color: '#757575',
        paddingHorizontal: 10,
        paddingBottom: 15,
        lineHeight: 20,
    },
    helpText: {
        textAlign: 'center',
        fontSize: 12,
        fontWeight: 'bold',
        color: '#90A4AE',
        marginBottom: 15,
        letterSpacing: 1,
    },
    supportButtonsRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 30,
        gap: 15,
    },
    supportButton: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 15,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#EEEEEE',
        backgroundColor: '#fff',
    },
    chatButton: {
        backgroundColor: Colors.light.tint,
        borderColor: Colors.light.tint,
    },
    callButton: {
        borderColor: Colors.light.tint,
        borderWidth: 2,
    },
    supportButtonText: {
        fontSize: 14,
        fontWeight: 'bold',
        color: '#000',
    },
    expertBanner: {
        backgroundColor: '#F3F4F6',
        borderRadius: 20,
        padding: 20,
        flexDirection: 'row',
        alignItems: 'center',
        overflow: 'hidden',
    },
    expertContent: {
        flex: 1,
    },
    expertTitle: {
        fontSize: 10,
        fontWeight: 'bold',
        color: '#757575',
        letterSpacing: 1,
        marginBottom: 5,
    },
    expertHeading: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#000',
        marginBottom: 15,
        lineHeight: 22,
    },
    bookButton: {
        backgroundColor: '#000',
        paddingHorizontal: 20,
        paddingVertical: 10,
        borderRadius: 20,
        alignSelf: 'flex-start',
    },
    bookButtonText: {
        color: '#fff',
        fontSize: 12,
        fontWeight: 'bold',
    },
    expertIllustration: {
        width: 80,
        justifyContent: 'center',
        alignItems: 'center',
    },
});
