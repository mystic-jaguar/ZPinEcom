import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import {
  Linking,
  Modal,
  ScrollView,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { PRIVACY_POLICY_URL, TERMS_URL } from '../../constants/legal';
import { Text } from '../ui/ScaledText';
import { createStyles } from '../../constants/theme';

// Same text as docs/legal/*.html and website-customer src/Pages/Legal/*.jsx — edit all three together.
const PRIVACY_POLICY = `PRIVACY POLICY - ZPIN
Effective date: 7 October 2026

This Privacy Policy explains how ZPIN Pvt. Ltd. ("ZPIN", "we", "us", "our") collects, uses, shares, stores and protects your personal data when you use the ZPIN customer mobile app and the website www.zpinservices.com (together, the "Platform"). It is published under the Information Technology Act, 2000 and its rules, the Digital Personal Data Protection Act, 2023 and the Consumer Protection (E-Commerce) Rules, 2020. By creating an account or placing an order you consent to the processing described here.

1. WHO WE ARE

ZPIN is an online marketplace. Products on the Platform are listed and sold by independent local sellers; ZPIN provides the Platform, takes payments and arranges delivery through delivery partners. ZPIN Pvt. Ltd. is the data fiduciary for the personal data described in this Policy.

2. INFORMATION WE COLLECT

Information you give us:

- Account details: your name, email address and password. Your password is stored only as a one-way hash, never in readable form. A username is created for your account.
- Optional profile details: mobile number, date of birth, gender and profile photo, if you choose to add them.
- Sign-in with Google or Apple: if you use "Continue with Google" or "Sign in with Apple" (Apple is offered in the iOS app), we receive your name, email address and an account identifier from that provider. We do not receive your Google or Apple password.
- Delivery addresses: name, phone number, address lines, landmark, city, state, pincode and country.
- Orders: the products you buy, quantities, sizes, prices, coupons, delivery type, payment method and status, order and delivery history, cancellations, returns and the reasons you give for them.
- Reviews: star ratings, written comments and any photos you upload with a review.
- Support conversations: the messages you send through the in-app or website support chat.
- Notification settings: your choices for push notifications, email updates and order updates.

Information collected automatically:

- Location (only with your permission). If you are not signed in, or have no saved address, the Platform asks for your device location to find your pincode so we can show products from sellers who deliver to your area. In the app, your device converts the location into a pincode. On the website, your browser location is converted into an address using OpenStreetMap's Nominatim service. Approximate coordinates may be sent with a product request to show nearby categories, but we do not save your GPS location to your account. On the website you can also use "Use current location" to pre-fill an address form; nothing is filled in unless you tap it.
- Push notification token: if you allow notifications in the app, we store a device push token so we can send order and account updates.
- Technical data: IP address, device and browser type, and app version, which our servers receive with every request and use for security, rate-limiting and troubleshooting.

Information kept only on your device: recent searches and recently viewed products are stored in the app's local storage (or your browser's local storage on the website) and are not sent to us as a history. Your recent search terms may be sent with a request for personalised recommendations.

We do not collect card numbers, CVV, UPI PINs or net-banking passwords. We do not verify phone numbers by SMS; account verification is done by a one-time code sent to your email address.

3. HOW WE USE YOUR INFORMATION

- To create and secure your account, including email one-time codes for verification, password reset and account deletion.
- To show products available in your delivery area, process orders, take payment, arrange delivery, and handle cancellations, returns and refunds.
- To send order confirmation emails, in-app notifications and push notifications about your orders, returns and account.
- To show product recommendations based on your purchase history, wishlist and recent searches.
- To answer support requests and resolve complaints.
- To prevent fraud and misuse, for example rate-limiting sign-in attempts and blocking suspended accounts.
- To meet our legal, tax and accounting obligations.

We do not sell your personal data and we do not use third-party advertising or analytics trackers on the Platform.

4. WHO WE SHARE IT WITH

- Sellers: the seller fulfilling your order sees your name, your delivery address and the items ordered. Sellers do not see your phone number or email address.
- Delivery partners: the partner delivering your order (or collecting a return) receives your name, delivery address and phone number so they can reach you.
- Razorpay: online payments are processed by Razorpay. You enter your card, UPI or bank details directly with Razorpay; we receive only the payment reference and status.
- Cloudinary: review photos you upload are stored and served by Cloudinary.
- Expo push service: push notifications to the app are delivered through Expo's push service and, through it, Google (Android) and Apple (iOS).
- Our email provider: one-time codes and order emails are sent through our email service provider.
- Google and Apple: only if you choose to sign in with them.
- India Post pincode lookup (api.postalpincode.in) and OpenStreetMap Nominatim: a pincode or location you enter is sent to these services to fill in city and state.
- ZPIN support staff: our support team can see your account, orders and addresses in order to help you.
- Authorities: where required by law, court order or a lawful request from a government agency.

5. STORAGE AND SECURITY

Your data is stored on servers used by ZPIN and is sent over encrypted HTTPS connections. Saved addresses, the delivery address on each order, notification contents that include an address, and wallet balances are additionally encrypted in our database using AES-256-GCM. Passwords are stored as bcrypt hashes. Sign-in sessions can be revoked, and suspended or deleted accounts are signed out.

No system is completely secure. If we become aware of a personal data breach affecting you, we will notify you and the authorities as required by law.

6. COOKIES AND LOCAL STORAGE

The website stores your sign-in session, cart, wishlist and preferences in your browser's local storage so the site works. We do not use advertising or analytics cookies. You can clear this data in your browser settings, which will sign you out.

7. HOW LONG WE KEEP IT

We keep your account data while your account is active. Order, payment, return and refund records are kept for as long as required for tax, accounting and legal purposes, including after an account is deleted.

8. DELETING YOUR ACCOUNT

You can delete your account yourself: in the app under Profile > Help Centre > Delete account, or on the website at www.zpinservices.com/delete-account. We email you a one-time code to confirm. Once confirmed, your account is closed and you are signed out.

For 30 days the account can be restored by contacting us. After 30 days it is permanently anonymised: your name, email, username, mobile number, password, Google link, profile photo, date of birth and gender are removed, and your saved addresses, cart, wishlist, notifications and sign-in sessions are erased. Order records (including the delivery address on each order) are kept for legal and tax purposes, and reviews you posted may remain on the Platform without your name.

9. YOUR RIGHTS

Under the Digital Personal Data Protection Act, 2023 you may:

- ask for a summary of the personal data we hold about you;
- correct or update your details (most can be edited directly in your profile and address book);
- delete your account as described above;
- withdraw consent, for example by turning off location or notification permissions or deleting your account (some features will then not work);
- raise a grievance with our Grievance Officer, and nominate another person to exercise these rights on your behalf.

To exercise any right, write to zpinpvtltd@gmail.com.

10. CHILDREN

The Platform is meant for users aged 18 and over. We do not knowingly collect personal data from children. If you believe a child has created an account, contact us and we will delete it.

11. CHANGES TO THIS POLICY

We may update this Policy when the Platform changes. The updated version will be posted here with a new effective date.

12. GRIEVANCE OFFICER AND CONTACT

In accordance with the Information Technology Act, 2000, the Digital Personal Data Protection Act, 2023 and the Consumer Protection (E-Commerce) Rules, 2020, complaints about personal data or the Platform may be sent to our Grievance Officer at zpinpvtltd@gmail.com. We will acknowledge a complaint within 48 hours and aim to resolve it within one month.

ZPIN Pvt. Ltd., Pune, Maharashtra, India. Email: zpinpvtltd@gmail.com. Website: www.zpinservices.com`;

const TERMS_AND_CONDITIONS = `TERMS & CONDITIONS - ZPIN
Effective date: 7 October 2026

These Terms govern your use of the ZPIN customer mobile app and the website www.zpinservices.com (the "Platform"), operated by ZPIN Pvt. Ltd. ("ZPIN", "we", "us"). By creating an account or placing an order you agree to these Terms and to our Privacy Policy. These Terms are an electronic record under the Information Technology Act, 2000.

1. ABOUT ZPIN

ZPIN is an online marketplace. Products are listed and sold by independent local sellers registered on the Platform. ZPIN provides the Platform, collects payment and arranges delivery through delivery partners. Each seller is responsible for its products, their description, quality and legal compliance. Seller name and details are shown on product and shop pages.

2. ELIGIBILITY AND YOUR ACCOUNT

- You must be at least 18 years old and able to enter into a binding contract under Indian law.
- You can sign up with your email address and a password (verified by a one-time code sent to your email), or with Google, or with Apple on iOS. We do not use SMS verification.
- Keep your password and sign-in codes private. You are responsible for activity on your account. If you suspect unauthorised use, contact us immediately.
- Give accurate information, especially your delivery address and contact number.
- We may suspend or close accounts used for fraud, abuse or breach of these Terms. A suspended account is signed out and cannot place orders.

3. DELIVERY AREA

We currently deliver only to:

- Pune: pincodes starting 411 or 412, with the city given as Pune, Pimpri, Chinchwad or PCMC; and
- Muzaffarpur: pincodes 842001, 842002, 842003 and 842004.

You will only see products from sellers in the same delivery zone as your pincode, and an order cannot be placed for a delivery address outside these areas or for items from a seller outside your zone.

4. ORDERS, PRICES AND PAYMENT

- All prices are in Indian Rupees. GST at 18% and any delivery fee are shown separately at checkout before you pay. The amount shown at checkout is calculated by our server and is the amount you pay.
- A cart with items from several sellers is placed as one checkout but is fulfilled as a separate parcel by each seller.
- Coupons are checked when you place the order and apply only if valid at that time. A coupon is returned to you if every parcel in that checkout is cancelled.
- Payment methods: online payment through Razorpay (cards, UPI, net banking and other methods Razorpay offers), or Cash on Delivery. For Cash on Delivery, the order stays unpaid until you pay at the door.
- An order placed with online payment is confirmed only after Razorpay confirms the payment. If an online checkout is not paid within 30 minutes, it is removed automatically and the items are released.
- Stock is limited. If an item sells out before you check out, we will not take the order for it.

Cancellation: you can cancel an order from My Orders while it is still pending or confirmed, before the seller marks it ready for pickup. You must give a reason. If you had paid online, the amount you paid is refunded to your original payment method through Razorpay; how long it takes to appear depends on your bank. Cash on Delivery orders have nothing to refund. Once the seller has marked the order ready, it can no longer be cancelled; you may refuse it or return it as described below.

5. DELIVERY

- Standard Delivery: free on orders above Rs 999; Rs 49 on orders of Rs 999 or less.
- Instant Delivery: a fixed Rs 50 delivery fee, paid online when you place the order, even if you choose Cash on Delivery for the items.
- Try at Door (Instant Delivery only, if you select it): you get 15 minutes at the door to try the items, keep the ones you want and hand the rest back to the delivery partner. You pay only for the items you keep; the Rs 50 delivery fee is not refunded.
- We show an estimated delivery time of within 12 hours. This is an estimate, not a guarantee.
- Delivery is confirmed when you give the delivery partner the one-time code shown in your order.
- If delivery fails (for example, nobody is available), the partner may retry, after which the parcel is returned to the seller. Any refund of an online payment on a failed delivery is reviewed by our support team.

6. RETURNS AND REFUNDS

- Standard Delivery orders can be returned within 7 days of the date the order was placed, once the order has been delivered. You can return some or all items and must give a reason.
- Instant Delivery orders are returned at the door using Try at Door, not through a later return request.
- Return requests are approved automatically and a delivery partner is assigned to collect the item.
- You can cancel a return from My Orders until the partner picks it up.
- Items should be unused and in their original condition with tags and packaging. The delivery partner records the item's condition at pickup; a return collected damaged may be rejected and not refunded.
- The refund covers the price of the returned items and the GST on them. Delivery fees are not refunded on returns.
- Refunds for returns are paid once the seller has received the returned item. They are paid by our support team, and the payment details are shown on the return in your order screen.

7. REVIEWS AND CONTENT YOU POST

Reviews, ratings, photos and support messages must be honest and lawful, and must not be abusive, misleading or infringe anyone's rights. By posting a review you allow ZPIN to display it on the Platform. We may remove content that breaks these rules.

8. ACCEPTABLE USE

You must not misuse the Platform, including by fraud, placing orders you do not intend to accept, attempting to access other accounts or our systems, scraping, or interfering with the service. We rate-limit sign-in, sign-up and order requests to protect the Platform.

9. INTELLECTUAL PROPERTY

The ZPIN name, logo, app, website and their design belong to ZPIN Pvt. Ltd. Product images and descriptions belong to the sellers who provided them. You may not copy or reuse them without permission.

10. LIABILITY

Sellers are responsible for the products they sell. To the extent permitted by law, ZPIN's total liability for any claim relating to an order is limited to the amount you paid for that order. Nothing in these Terms limits your rights under the Consumer Protection Act, 2019.

11. ACCOUNT DELETION

You can delete your account at any time as described in our Privacy Policy. Orders already placed continue to be handled under these Terms.

12. CHANGES, GOVERNING LAW AND DISPUTES

We may update these Terms; the new version will be posted here with a new effective date. These Terms are governed by the laws of India, and courts in Pune, Maharashtra have jurisdiction, without affecting your right to approach a consumer commission.

13. GRIEVANCE OFFICER AND CONTACT

In accordance with the Consumer Protection (E-Commerce) Rules, 2020 and the Information Technology Act, 2000, complaints may be sent to our Grievance Officer at zpinpvtltd@gmail.com. We will acknowledge a complaint within 48 hours and aim to resolve it within one month. You can also reach us through the support chat in the app or on the website.

ZPIN Pvt. Ltd., Pune, Maharashtra, India. Email: zpinpvtltd@gmail.com. Website: www.zpinservices.com`;

export type LegalDocType = 'privacy' | 'terms';

interface LegalDocModalProps {
    visible: boolean;
    docType: LegalDocType;
    onClose: () => void;
}

export default function LegalDocModal({ visible, docType, onClose }: LegalDocModalProps) {
    const isPrivacy = docType === 'privacy';
    const title = isPrivacy ? 'Privacy Policy' : 'Terms & Conditions';
    const content = isPrivacy ? PRIVACY_POLICY : TERMS_AND_CONDITIONS;
    const onlineUrl = isPrivacy ? PRIVACY_POLICY_URL : TERMS_URL;

    return (
        <Modal
            visible={visible}
            animationType="slide"
            presentationStyle="pageSheet"
            onRequestClose={onClose}
        >
            <SafeAreaView style={styles.container} edges={['top', 'bottom', 'left', 'right']}>
                {/* Header */}
                <View style={styles.header}>
                    <Text style={styles.title}>{title}</Text>
                    <TouchableOpacity onPress={onClose} style={styles.closeButton} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                        <Ionicons name="close" size={24} color="#333" />
                    </TouchableOpacity>
                </View>

                <View style={styles.divider} />

                {/* Content */}
                <ScrollView
                    style={styles.scrollView}
                    contentContainerStyle={styles.scrollContent}
                    showsVerticalScrollIndicator={true}
                >
                    <Text style={styles.content}>{content}</Text>
                </ScrollView>

                {/* Footer */}
                <View style={styles.footer}>
                    <TouchableOpacity
                        style={styles.onlineLink}
                        onPress={() => Linking.openURL(onlineUrl)}
                        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                    >
                        <Ionicons name="open-outline" size={15} color="#6B7280" />
                        <Text style={styles.onlineLinkText}>View latest version online</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.closeBtn} onPress={onClose}>
                        <Text style={styles.closeBtnText}>Close</Text>
                    </TouchableOpacity>
                </View>
            </SafeAreaView>
        </Modal>
    );
}

const styles = createStyles({
    container: {
        flex: 1,
        backgroundColor: '#fff',
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 20,
        paddingVertical: 16,
    },
    title: {
        fontSize: 18,
        fontWeight: '700',
        color: '#111',
    },
    closeButton: {
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: '#F3F4F6',
        justifyContent: 'center',
        alignItems: 'center',
    },
    divider: {
        height: 1,
        backgroundColor: '#E5E7EB',
        marginHorizontal: 20,
    },
    scrollView: {
        flex: 1,
    },
    scrollContent: {
        paddingHorizontal: 20,
        paddingVertical: 20,
        paddingBottom: 40,
    },
    content: {
        fontSize: 14,
        color: '#374151',
        lineHeight: 22,
    },
    footer: {
        paddingHorizontal: 20,
        paddingVertical: 16,
        borderTopWidth: 1,
        borderTopColor: '#E5E7EB',
    },
    onlineLink: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 6,
        paddingVertical: 8,
        marginBottom: 8,
    },
    onlineLinkText: {
        fontSize: 13,
        color: '#6B7280',
        fontWeight: '600',
    },
    closeBtn: {
        backgroundColor: '#FBBF24',
        height: 48,
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
    },
    closeBtnText: {
        fontSize: 16,
        fontWeight: '700',
        color: '#111',
    },
});
