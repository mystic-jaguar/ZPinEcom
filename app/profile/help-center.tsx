import ActionModal from '@/components/common/ActionModal';
import { Colors } from '@/constants/Colors';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { Alert, Linking, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

type FAQ = {
    id: string;
    category: string;
    question: string;
    answer: string;
};

export default function HelpCenterScreen() {
    const router = useRouter();
    const [searchQuery, setSearchQuery] = useState('');
    const [expandedFaq, setExpandedFaq] = useState<string | null>(null);
    const [showAllFaqs, setShowAllFaqs] = useState(false);
    const [bookingModalVisible, setBookingModalVisible] = useState(false);
    const [chatModalVisible, setChatModalVisible] = useState(false);

    const toggleFaq = (id: string) => {
        setExpandedFaq(expandedFaq === id ? null : id);
    };

    const TOPICS = [
        { id: 'track', label: 'Track Order', icon: 'bus-outline', color: '#FFD54F', route: '/profile/track-order' },
        { id: 'returns', label: 'Returns & Refunds', icon: 'return-down-back-outline', color: '#FFF59D', route: '/profile/returns' },
        { id: 'payment', label: 'Payment Issues', icon: 'wallet-outline', color: '#FFF176', route: '/profile/payment-methods' },
        { id: 'account', label: 'Account Settings', icon: 'person-outline', color: '#FFF9C4', route: '/profile/edit-profile' },
    ];

    const ALL_FAQS: FAQ[] = [
        // Orders & Tracking
        { id: '1', category: 'Orders', question: 'How do I track my order?', answer: 'You can track your order by going to "My Orders" in your profile and clicking on the specific order. You\'ll see real-time tracking information and estimated delivery time.' },
        { id: '2', category: 'Orders', question: 'Can I modify my order after placing it?', answer: 'You can modify your order within 30 minutes of placing it. Go to "My Orders" and select "Modify Order". After 30 minutes, the order is processed and cannot be changed.' },
        { id: '3', category: 'Orders', question: 'How long does delivery take?', answer: 'Standard delivery takes 3-5 business days. Instant Trial delivery is available within 2 hours in select cities. You can see estimated delivery dates during checkout.' },
        { id: '4', category: 'Orders', question: 'Do you deliver to my area?', answer: 'We deliver across India. Enter your pincode during checkout to check if delivery is available in your area and see the estimated delivery time.' },

        // Returns & Refunds
        { id: '5', category: 'Returns', question: 'What is Instant Trial?', answer: 'Instant Trial allows you to try products at the time of delivery. If you don\'t like the product, you can return it immediately to the delivery person without any charges.' },
        { id: '6', category: 'Returns', question: 'How do I return a product?', answer: 'Go to "My Orders", select the order, and click "Initiate Return". Choose your reason and preferred refund method. Standard returns are accepted within 15 days of delivery.' },
        { id: '7', category: 'Returns', question: 'When will I get my refund?', answer: 'Refunds are processed within 5-7 business days after we receive the returned product. The amount will be credited to your original payment method.' },
        { id: '8', category: 'Returns', question: 'What items cannot be returned?', answer: 'Personal care items, innerwear, and sale items marked as "non-returnable" cannot be returned for hygiene and policy reasons.' },
        { id: '9', category: 'Returns', question: 'Is there a return shipping fee?', answer: 'Returns are free if the product is defective or wrong. For change of mind returns, a ₹99 pickup fee applies unless you have a premium membership.' },

        // Payments
        { id: '10', category: 'Payment', question: 'What payment methods do you accept?', answer: 'We accept Credit/Debit Cards, UPI (Google Pay, PhonePe, Paytm), Net Banking, and Cash on Delivery. You can save your payment methods for faster checkout.' },
        { id: '11', category: 'Payment', question: 'Is it safe to save my card details?', answer: 'Yes, all payment information is encrypted and stored securely using industry-standard PCI DSS compliance. We never store your CVV.' },
        { id: '12', category: 'Payment', question: 'Why was my payment declined?', answer: 'Payment can be declined due to insufficient funds, incorrect card details, or bank security measures. Please check with your bank or try a different payment method.' },
        { id: '13', category: 'Payment', question: 'Can I pay in installments?', answer: 'Yes, we offer EMI options on credit cards for orders above ₹3,000. Select the EMI option during checkout to see available plans from your bank.' },

        // Account
        { id: '14', category: 'Account', question: 'How do I change my delivery address?', answer: 'Go to "Account Settings" > "Saved Addresses". You can add, edit, or delete addresses. Make sure to select the correct address during checkout.' },
        { id: '15', category: 'Account', question: 'How do I update my profile information?', answer: 'Go to your Profile and click "Edit Profile". You can update your name, email, phone number, and date of birth.' },
        { id: '16', category: 'Account', question: 'I forgot my password. What should I do?', answer: 'Click on "Forgot Password" on the login screen. Enter your registered email or phone number, and we\'ll send you a password reset link.' },
        { id: '17', category: 'Account', question: 'How do I delete my account?', answer: 'Contact our support team via chat or email to request account deletion. Please note that this action is permanent and cannot be undone.' },

        // Products
        { id: '18', category: 'Products', question: 'How do I find the right size?', answer: 'Each product page has a detailed size guide. Click on "Size Guide" below the size selector to see measurements and find your perfect fit.' },
        { id: '19', category: 'Products', question: 'Are the product images accurate?', answer: 'We strive to show accurate product images. However, colors may vary slightly due to screen settings. Check product descriptions for detailed information.' },
        { id: '20', category: 'Products', question: 'How do I add items to my wishlist?', answer: 'Click the heart icon on any product to add it to your wishlist. Access your wishlist from your profile to view and purchase saved items.' },
        { id: '21', category: 'Products', question: 'Do you restock sold-out items?', answer: 'Popular items are usually restocked within 2-3 weeks. Click "Notify Me" on the product page to get an email when the item is back in stock.' },
    ];

    // Filter FAQs based on search query
    const filteredFaqs = searchQuery.trim()
        ? ALL_FAQS.filter(faq =>
            faq.question.toLowerCase().includes(searchQuery.toLowerCase()) ||
            faq.answer.toLowerCase().includes(searchQuery.toLowerCase())
        )
        : ALL_FAQS;

    // Show first 3 or all FAQs
    const displayedFaqs = showAllFaqs ? filteredFaqs : filteredFaqs.slice(0, 3);

    const handleTopicPress = (route: string) => {
        router.push(route as any);
    };

    const handleCallSupport = () => {
        Linking.openURL('tel:+911234567890').catch(() => {
            Alert.alert('Error', 'Unable to make a call. Please dial +91-1234-567890 manually.');
        });
    };

    const handleEmailSupport = () => {
        Linking.openURL('mailto:support@zpin.com?subject=Support Request').catch(() => {
            Alert.alert('Error', 'Unable to open email. Please email us at support@zpin.com');
        });
    };

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
                        {searchQuery.length > 0 && (
                            <TouchableOpacity onPress={() => setSearchQuery('')}>
                                <Ionicons name="close-circle" size={20} color="#757575" />
                            </TouchableOpacity>
                        )}
                    </View>
                </SafeAreaView>
            </View>

            <ScrollView style={styles.contentScroll} showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>

                {/* Popular Topics */}
                {!searchQuery && (
                    <>
                        <Text style={styles.sectionTitle}>Popular Topics</Text>
                        <View style={styles.topicsGrid}>
                            {TOPICS.map((topic) => (
                                <TouchableOpacity
                                    key={topic.id}
                                    style={styles.topicCard}
                                    onPress={() => handleTopicPress(topic.route)}
                                >
                                    <View style={[styles.topicIconContainer, { backgroundColor: topic.color + '40' }]}>
                                        <Ionicons name={topic.icon as any} size={24} color={Colors.light.tint} />
                                    </View>
                                    <Text style={styles.topicLabel}>{topic.label}</Text>
                                </TouchableOpacity>
                            ))}
                        </View>
                    </>
                )}

                {/* FAQs */}
                <View style={styles.faqHeaderRow}>
                    <Text style={styles.sectionTitle}>
                        {searchQuery ? `Search Results (${filteredFaqs.length})` : 'Frequently Asked Questions'}
                    </Text>
                    {!searchQuery && filteredFaqs.length > 3 && (
                        <TouchableOpacity onPress={() => setShowAllFaqs(!showAllFaqs)}>
                            <Text style={styles.viewAllText}>{showAllFaqs ? 'Show Less' : 'View All'}</Text>
                        </TouchableOpacity>
                    )}
                </View>

                {displayedFaqs.length > 0 ? (
                    <View style={styles.faqContainer}>
                        {displayedFaqs.map((faq) => (
                            <View key={faq.id} style={styles.faqItem}>
                                <TouchableOpacity style={styles.faqQuestionRow} onPress={() => toggleFaq(faq.id)}>
                                    <View style={{ flex: 1 }}>
                                        <Text style={styles.faqCategory}>{faq.category}</Text>
                                        <Text style={styles.faqQuestion}>{faq.question}</Text>
                                    </View>
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
                ) : (
                    <View style={styles.noResultsContainer}>
                        <Ionicons name="search-outline" size={48} color="#BDBDBD" />
                        <Text style={styles.noResultsText}>No FAQs found for "{searchQuery}"</Text>
                        <Text style={styles.noResultsSubtext}>Try different keywords or contact support</Text>
                    </View>
                )}

                {/* Still Need Help */}
                {!searchQuery && (
                    <>
                        <Text style={styles.helpText}>STILL NEED HELP?</Text>

                        <View style={styles.supportButtonsRow}>
                            <TouchableOpacity
                                style={[styles.supportButton, styles.chatButton]}
                                onPress={() => setChatModalVisible(true)}
                            >
                                <Ionicons name="chatbubble" size={20} color="#000" style={{ marginRight: 8 }} />
                                <Text style={styles.supportButtonText}>Chat with Us</Text>
                            </TouchableOpacity>

                            <TouchableOpacity
                                style={[styles.supportButton, styles.callButton]}
                                onPress={handleCallSupport}
                            >
                                <Ionicons name="call-outline" size={20} color="#000" style={{ marginRight: 8 }} />
                                <Text style={styles.supportButtonText}>Call Support</Text>
                            </TouchableOpacity>
                        </View>

                        <TouchableOpacity
                            style={styles.emailButton}
                            onPress={handleEmailSupport}
                        >
                            <Ionicons name="mail-outline" size={20} color="#000" style={{ marginRight: 8 }} />
                            <Text style={styles.supportButtonText}>Email Support</Text>
                        </TouchableOpacity>
                    </>
                )}

                <View style={{ height: 40 }} />
            </ScrollView>

            {/* Chat Modal */}
            <ActionModal
                visible={chatModalVisible}
                title="Chat Support"
                message="Our chat support is available 24/7. We'll connect you with an agent shortly."
                icon="message-circle"
                primaryButtonText="START CHAT"
                onPrimaryPress={() => {
                    setChatModalVisible(false);
                    Alert.alert('Coming Soon', 'Chat feature will be available soon!');
                }}
                secondaryButtonText="CANCEL"
                onSecondaryPress={() => setChatModalVisible(false)}
                onClose={() => setChatModalVisible(false)}
            />

            {/* Booking Modal */}
            <ActionModal
                visible={bookingModalVisible}
                title="Book Stylist Session"
                message="Get personalized fashion advice from our expert stylists. Sessions are completely free and last 30 minutes."
                icon="calendar"
                primaryButtonText="CONFIRM BOOKING"
                onPrimaryPress={() => {
                    setBookingModalVisible(false);
                    Alert.alert('Success', 'Your session has been booked! We\'ll send you a confirmation email shortly.');
                }}
                secondaryButtonText="CANCEL"
                onSecondaryPress={() => setBookingModalVisible(false)}
                onClose={() => setBookingModalVisible(false)}
            />
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
    faqCategory: {
        fontSize: 10,
        fontWeight: 'bold',
        color: '#90A4AE',
        letterSpacing: 0.5,
        marginBottom: 5,
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
    noResultsContainer: {
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 60,
        backgroundColor: '#fff',
        borderRadius: 16,
        marginBottom: 25,
    },
    noResultsText: {
        fontSize: 16,
        fontWeight: '600',
        color: '#424242',
        marginTop: 15,
        textAlign: 'center',
    },
    noResultsSubtext: {
        fontSize: 13,
        color: '#9E9E9E',
        marginTop: 5,
        textAlign: 'center',
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
        marginBottom: 15,
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
    emailButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 15,
        borderRadius: 12,
        borderWidth: 2,
        borderColor: '#EEEEEE',
        backgroundColor: '#fff',
        marginBottom: 30,
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
