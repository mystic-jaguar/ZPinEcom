// ── Customer support knowledge base ─────────────────────────────────────
// Single source of truth for the Help & support FAQs and for the ZPIN
// Assistant's answers, mirroring the seller app's legalContent.ts. Keeping
// both surfaces on one list is the point: a customer who reads an FAQ and
// then asks the bot the same thing must not get a different answer.
//
// `route` (+ optional `routeLabel`) deep-links an answer to the expo-router
// screen it describes — the ecom equivalent of the vendor app's `screen`.

export const SUPPORT_EMAIL = 'zpinpvtltd@gmail.com';
// ponytail: placeholder number carried over from the old chat bot — swap for
// the real support line before launch; it's dialled from Help & support too.
export const SUPPORT_PHONE = '+911234567890';

export interface SupportGuide {
  id: string;
  title: string;
  summary: string;
  steps: string[];
  route?: string;
  routeLabel?: string;
}

export interface SupportFaq {
  category: 'Orders' | 'Delivery' | 'Returns' | 'Payment' | 'Products' | 'Account';
  q: string;
  a: string;
  route?: string;
  routeLabel?: string;
}

// Order matters: entries are ranked by score and ties fall to whichever comes
// first, so the guide answering the single most common question ("where is my
// order?") leads.
export const SUPPORT_GUIDES: SupportGuide[] = [
  {
    id: 'tracking',
    route: '/profile/orders',
    routeLabel: 'Open My Orders',
    title: 'Tracking an order',
    summary: 'Where your order is, what each stage means, and when it moves.',
    steps: [
      'Open Profile → My Orders and tap the order to see live tracking.',
      'The route animates store → your home once the seller hands the parcel to a delivery partner.',
      'Stages: Confirmed → Processing (the seller is packing) → Shipped (picked up) → Delivered.',
      'The delivery partner\'s name and phone number appear on the tracking screen once the parcel is picked up.',
      'A delivery partner asks for a one-time code at your door — that OTP is the proof of delivery, so share it only when you actually have the parcel in hand.',
      'If a delivery attempt fails, the partner retries; you can also ask for a same-day retry by calling them back from the tracking screen.',
    ],
  },
  {
    id: 'delivery-types',
    title: 'Instant Delivery vs Standard Delivery',
    summary: 'The two ways a ZPIN order can reach you, and what changes between them.',
    steps: [
      'Instant Delivery is "try at your door" — when the partner arrives you get 15 minutes to try the items on.',
      'Keep what you want and hand the rest straight back to the delivery partner. There is no return request to raise and no waiting for a pickup.',
      'You are charged only for the items you keep; the rest is refunded automatically once the partner marks the handover.',
      'Standard Delivery is a normal delivery — you receive everything, and you then have a 7-day window to raise a return.',
      'Both types are estimated to arrive within 12 hours in serviceable areas.',
      'The delivery type is chosen on the product and confirmed at checkout, so check the summary step before you pay.',
    ],
  },
  {
    id: 'returns',
    route: '/profile/returns',
    routeLabel: 'Open Returns',
    title: 'Returns & refunds',
    summary: 'Sending a Standard Delivery order back, and when the money comes back.',
    steps: [
      'Open the delivered order from Profile → My Orders and tap Return items. Returns are accepted within 7 days of delivery.',
      'You can return part of an order — pick the exact items, and the quantity of each, rather than sending everything back.',
      'Return requests are approved automatically; there is no waiting for an admin to review them.',
      'A delivery partner collects the parcel from your address. Hand over the OTP shown on the return screen so the pickup can be confirmed.',
      'Refunds are issued after the seller confirms the returned item, and reach the original payment method within 5–7 business days.',
      'You can cancel a return any time before it is picked up — the order goes back to normal and Buy again reappears.',
      'Instant Delivery orders have no return flow: you decide keep or hand back at the door.',
    ],
  },
  {
    id: 'cancellation',
    route: '/profile/orders',
    routeLabel: 'Open My Orders',
    title: 'Cancelling an order',
    summary: 'When you can still cancel, and what happens to your money.',
    steps: [
      'Open the order from Profile → My Orders and tap Cancel. Cancellation is possible until the order is dispatched.',
      'Pick a reason — it is passed to the seller so repeat problems can be fixed.',
      'A seller can also cancel an order they cannot fulfil; the reason they give is shown on your order card.',
      'Prepaid cancellations are refunded to the original payment method within 5–7 business days. Nothing is charged on a cancelled COD order.',
      'If the Cancel option is gone the parcel is already on its way — contact support and we will help.',
    ],
  },
  {
    id: 'payments',
    route: '/profile/coupons',
    routeLabel: 'Open Coupons',
    title: 'Payments, COD & coupons',
    summary: 'How you can pay, and how discounts are applied.',
    steps: [
      'UPI, credit/debit cards and net banking are handled through Razorpay; Cash on Delivery is also available.',
      'On an Instant Delivery COD order the ₹50 delivery fee is paid online at checkout and only the product amount is collected at your door.',
      'A Standard COD order is paid in full on delivery — exact change helps the partner.',
      'Coupons are applied on the payment step at checkout. Profile → Coupons lists the ones your account can use.',
      'If a payment is debited but the order does not appear, do not pay again — the amount is auto-reversed by the bank, and support can confirm it against the order.',
    ],
  },
  {
    id: 'products',
    title: 'Products, sizes & reviews',
    summary: 'Choosing the right variant, and what other customers thought.',
    steps: [
      'Colour variants of the same product appear as separate cards in listings; opening one lets you switch colour from inside the product page.',
      'For clothing and footwear, tap Size chart on the product page for the seller\'s measurements before you pick a size.',
      'A size that is out of stock is shown greyed out — the count is per size, not per product.',
      'The Specifications card lists the material, care and category details the seller filled in.',
      'Ratings show a star breakdown plus customer photos. You can review a product yourself once its order is delivered.',
      'Tap the heart on any product to save it to your Wishlist for later.',
    ],
  },
  {
    id: 'account',
    route: '/profile/addresses',
    routeLabel: 'Open Saved addresses',
    title: 'Account, addresses & notifications',
    summary: 'Signing in, where we deliver, and keeping your details current.',
    steps: [
      'Sign in with your email — we send a one-time code instead of asking for a password. Google sign-in is also available.',
      'ZPIN currently delivers within Pune only; an address outside a serviceable pincode is rejected at checkout.',
      'Entering a pincode auto-fills the city and state, so double-check the house and street lines.',
      'Manage addresses from Profile → Saved addresses. Changing the address on an order already placed is only possible shortly after checkout — contact support right away.',
      'Order updates arrive as push notifications and are kept in Profile → Notifications, so nothing is lost if you miss one.',
      'Profile → Edit profile updates your name, email and phone number.',
    ],
  },
];

export const SUPPORT_FAQS: SupportFaq[] = [
  {
    category: 'Delivery',
    q: 'What is the difference between Instant Delivery and Standard Delivery?',
    a: 'Instant Delivery is try-at-your-door: you get 15 minutes to try the items when the partner arrives, keep what you want and hand the rest straight back — no return request needed. Standard Delivery is a normal delivery with a 7-day return window afterwards.',
  },
  {
    category: 'Delivery',
    q: 'How long does delivery take?',
    a: 'Estimated delivery is within 12 hours for both Standard and Instant orders in serviceable areas.',
  },
  {
    category: 'Delivery',
    q: 'Which areas do you deliver to?',
    a: 'ZPIN currently delivers within Pune only. A delivery address outside a serviceable pincode is rejected at checkout.',
    route: '/profile/addresses',
    routeLabel: 'Open Saved addresses',
  },
  {
    category: 'Orders',
    q: 'How do I track my order?',
    a: 'Open Profile → My Orders and tap the order for live tracking, the current stage and the delivery partner\'s details once the parcel is picked up.',
    route: '/profile/orders',
    routeLabel: 'Open My Orders',
  },
  {
    category: 'Orders',
    q: 'Why does my order still say Confirmed?',
    a: 'Confirmed means the seller has the order but has not started packing. It moves to Processing when packing begins and Shipped when a delivery partner collects it. If it has been stuck for hours, contact support and we will chase the seller.',
  },
  {
    category: 'Orders',
    q: 'Can I cancel an order?',
    a: 'Yes, until it is dispatched. Open the order from My Orders and tap Cancel. If the option is gone the parcel is already on its way — contact support and we will help.',
    route: '/profile/orders',
    routeLabel: 'Open My Orders',
  },
  {
    category: 'Orders',
    q: 'The delivery partner is asking for an OTP. Should I share it?',
    a: 'Yes — that one-time code is the proof of delivery. Share it only once the parcel is actually in your hand, and never before.',
  },
  {
    category: 'Orders',
    q: 'Nobody came to deliver my order. What now?',
    a: 'A failed attempt is recorded with a reason and the partner retries. You can also call the partner from the tracking screen and ask for a same-day retry.',
    route: '/profile/orders',
    routeLabel: 'Open My Orders',
  },
  {
    category: 'Orders',
    q: 'My order was split into two. Why?',
    a: 'Items from different sellers ship as separate orders so each seller can pack and hand over their own parcel. You pay once; each part is tracked on its own.',
  },
  {
    category: 'Returns',
    q: 'How do I return a product?',
    a: 'Open the delivered order and tap Return items, within 7 days of delivery. Pick a reason, and a delivery partner comes to collect the parcel.',
    route: '/profile/returns',
    routeLabel: 'Open Returns',
  },
  {
    category: 'Returns',
    q: 'Can I return only some of the items?',
    a: 'Yes. Choose the exact items and the quantity of each on the return screen — the rest of the order stays with you and only the returned items are refunded.',
  },
  {
    category: 'Returns',
    q: 'Does someone have to approve my return?',
    a: 'No. Return requests are approved automatically, so a pickup is scheduled as soon as you submit one.',
  },
  {
    category: 'Returns',
    q: 'When will I get my refund?',
    a: 'The refund is issued once the seller confirms the returned item, and reaches your original payment method within 5–7 business days.',
  },
  {
    category: 'Returns',
    q: 'Can I cancel a return I already requested?',
    a: 'Yes, any time before the parcel is picked up. Open the order and tap Cancel return — the order goes back to normal.',
    route: '/profile/orders',
    routeLabel: 'Open My Orders',
  },
  {
    category: 'Returns',
    q: 'How do I return an Instant Delivery order?',
    a: 'You do not need to. Instant Delivery is try-at-door: hand back whatever you do not want to the delivery partner right there, and you are only charged for what you keep.',
  },
  {
    category: 'Payment',
    q: 'What payment methods do you accept?',
    a: 'UPI, credit/debit cards and net banking through Razorpay, plus Cash on Delivery.',
  },
  {
    category: 'Payment',
    q: 'How does Cash on Delivery work for Instant Delivery?',
    a: 'For Instant Delivery COD orders the ₹50 delivery fee is prepaid online at checkout and only the product amount is collected at your door. Standard COD orders are paid in full on delivery.',
  },
  {
    category: 'Payment',
    q: 'Money was deducted but I do not see an order.',
    a: 'Do not pay again. An incomplete payment is auto-reversed by your bank, usually within a few working days. Contact support with the payment reference and we will confirm it against the order.',
  },
  {
    category: 'Payment',
    q: 'How do I use a coupon?',
    a: 'Tap Apply coupon on the payment step at checkout, or browse the coupons your account can use from Profile → Coupons.',
    route: '/profile/coupons',
    routeLabel: 'Open Coupons',
  },
  {
    category: 'Products',
    q: 'Which size should I pick?',
    a: 'Tap Size chart on the product page for the seller\'s own measurements. Stock is counted per size, so a greyed-out size is sold out rather than unavailable.',
  },
  {
    category: 'Products',
    q: 'The same product appears more than once in the list.',
    a: 'Those are colour variants of one product, shown as a card each so you can see every colour. Open any of them and switch colour from inside the product page.',
  },
  {
    category: 'Products',
    q: 'Why does the price look different from what I saw earlier?',
    a: 'Prices and stock are refreshed when you open the product, so a seller\'s change can land between browsing and checkout. The price on the checkout summary is the one you pay.',
  },
  {
    category: 'Products',
    q: 'How do I review something I bought?',
    a: 'Open the delivered order and tap Rate product. You can add a star rating, a written review and photos.',
    route: '/profile/orders',
    routeLabel: 'Open My Orders',
  },
  {
    category: 'Account',
    q: 'How do I sign in — I never set a password?',
    a: 'ZPIN signs you in with a one-time code emailed to your address; there is no password to remember. You can also continue with Google.',
  },
  {
    category: 'Account',
    q: 'How do I change my delivery address?',
    a: 'Go to Profile → Saved addresses to add, edit or set a default. On an order already placed, an address change is only possible shortly after checkout — contact support right away.',
    route: '/profile/addresses',
    routeLabel: 'Open Saved addresses',
  },
  {
    category: 'Account',
    q: 'Where do my order notifications go?',
    a: 'Every alert is kept in Profile → Notifications, so nothing is lost if you miss the push.',
    route: '/profile/notifications',
    routeLabel: 'Open Notifications',
  },
  {
    category: 'Account',
    q: 'How do I delete my account?',
    a: 'Profile → Help & support → Delete account. Your profile, addresses, cart, wishlist and reviews are removed; order and invoice records are kept in anonymised form as the law requires.',
  },
  {
    category: 'Account',
    q: 'Does ZPIN ever ask for my OTP or card details over the phone?',
    a: 'Never. ZPIN will not ask for an OTP, card number, UPI PIN or password by phone, email or chat. Treat any such request as fraud and report it to us.',
  },
];
