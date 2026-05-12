# ZPIN E-Commerce Project — Feature Analysis

## Executive Summary

**Project Status:** ~90% Complete | MVP-ready with partial payment gateway

**Backend:** 10 API route modules | Express.js + TypeScript + PostgreSQL + Redis
**Frontend:** Expo React Native | 20+ screens across auth, shopping, checkout, profile
**Key Gap:** Payment gateway integration (Razorpay) — partially implemented; create-order and verify endpoints exist but no webhook, retry, or refund routes

---

## FEATURE MATRIX

### COMPLETE & WORKING

#### Authentication System
| Feature | Status | Details |
|---------|--------|---------|
| User Registration | ✅ | Email + password, bcrypt (12 rounds), rate-limited (3/hour) |
| User Login | ✅ | Email or username, timing-attack prevention, 10 attempts/15min |
| JWT Token System | ✅ | 15-min access tokens + 30-day refresh tokens with rotation |
| OTP Verification | ✅ | Cryptographically secure 6-digit OTP for email verification |
| Password Reset | ✅ | OTP-based flow: sendOTP → verifyOTP → resetPassword |
| Logout | ✅ | Token invalidation and cleanup |
| Role-Based Access | ✅ | `user` vs `seller` roles enforced via middleware |
| User Enumeration Prevention | ✅ | Same response for missing users and wrong passwords |

- Backend: `routes/auth.ts`
- Frontend: `app/auth/` (login, signup, forgot-password, verify-otp, verify-reset-otp, reset-password)
- Middleware: `middleware/auth.ts` — JWT from Bearer token, `x-auth-token` header, or cookies

---

#### Product Management
| Feature | Status | Details |
|---------|--------|---------|
| Browse Products | ✅ | Paginated (default 50, max 200), category-based filtering |
| Product Search | ✅ | Normalized full-text search (handles "keychain" vs "key chain") |
| Product Details | ✅ | Images, price, stock, size quantities, color attributes, ratings |
| Product Images | ✅ | Multiple images per product with display order |
| Variant Support | ✅ | Size quantities as JSON (`{S:10, M:15, L:8}`), color extraction |
| Personalized Recommendations | ✅ | Weighted: purchase history (+3), wishlist (+2), search terms (+1) |
| Nearby Categories | ✅ | Men, Women, Kids, Makeup with live product counts |
| Fresh Categories | ✅ | Top 5 categories by most recently added products |
| Category Hierarchy | ✅ | Full category path stored per product (`category_path`) |
| Stock Management | ✅ | Per-product quantity tracking, `in_stock` flag |
| Product Reviews | ✅ | Full CRUD — submit, list, edit, delete with duplicate prevention |
| Review Images | ✅ | Array of image URLs per review, normalized and validated |
| Verified Purchase Flag | ✅ | `is_verified_purchase` stored per review (defaults false; auto-set pending) |
| Average Rating | ✅ | Calculated in product queries and returned on product cards |
| Redis Caching | ✅ | 2h TTL for products, 30m for reviews |

- Backend: `routes/products.ts` (13+ endpoints)
- Frontend: `app/(tabs)/product-listing.tsx`, `app/product/[id].tsx`, `app/product-search.tsx`
- Rate limit: 60 requests/min for product listing, 30/min for reviews

---

#### Shopping Cart
| Feature | Status | Details |
|---------|--------|---------|
| Add to Cart | ✅ | Auto-increments if item exists, validates stock |
| View Cart | ✅ | Returns items with current prices and availability status |
| Update Quantity | ✅ | Validates against available stock |
| Remove Item | ✅ | Single item removal |
| Clear Cart | ✅ | Bulk delete all items |
| Price Change Detection | ✅ | Flags items where price changed since adding |
| Stock Validation | ✅ | Flags out-of-stock or insufficient quantity items |
| Cart Count | ✅ | Lightweight endpoint for badge display |

- Backend: `routes/cart.ts` (6 endpoints)
- Frontend: `app/(tabs)/cart.tsx`, `context/CartContext.tsx`

---

#### Wishlist
| Feature | Status | Details |
|---------|--------|---------|
| Add to Wishlist | ✅ | Duplicate prevention (409 on conflict) |
| Remove from Wishlist | ✅ | Single item removal |
| Clear Wishlist | ✅ | Bulk delete all items |
| View Wishlist | ✅ | Paginated list with full product details |
| Wishlist Count | ✅ | Quick total count endpoint |

- Backend: `routes/wishlist.ts` (5 endpoints)
- Frontend: `app/profile/wishlist.tsx`, `context/WishlistContext.tsx`

---

#### User Profile Management
| Feature | Status | Details |
|---------|--------|---------|
| View Profile | ✅ | Ownership enforced — users can only read their own profile |
| Edit Profile | ✅ | Name, username, DOB, gender, profile image |
| Notification Preferences | ✅ | Push, email, and order update toggles |
| View Orders | ✅ | Paginated order history with items |
| Shipping Addresses | ✅ | Add, list, set default — encrypted at rest |
| Address Labels | ✅ | Home, Work, etc. |

- Backend: `routes/users.ts` (5 endpoints)
- Frontend: `app/profile/` (edit-profile, addresses, add-address, orders, order-details)

---

#### Order Management
| Feature | Status | Details |
|---------|--------|---------|
| Create Order | ✅ | Transaction-safe, multi-seller support, auto-clears cart |
| List Orders | ✅ | Paginated order history |
| Order Details | ✅ | Full order with items, totals, shipping address (decrypted) |
| Order Tracking | ✅ | Status history: pending → confirmed → processing → shipped → delivered |
| Estimated Delivery | ✅ | Calculated on order creation |
| Tracking Number | ✅ | Generated on shipment |
| Cancel Order | ✅ | Allowed for pending/confirmed orders; wallet refund option |
| Return Request | ✅ | Submit return with reason and item IDs |
| Return Status | ✅ | Full workflow: requested → picked_up → refunded with timestamps |
| Seller Notifications | ✅ | New order notifications sent to all relevant sellers |
| Customer Notifications | ✅ | Order confirmation notification sent to customer |

- Backend: `routes/orders.ts` (10+ endpoints)
- Frontend: `app/profile/orders.tsx`, `app/profile/order-details.tsx`, `app/profile/track-order.tsx`, `app/profile/cancel-order.tsx`, `app/profile/returns.tsx`

---

#### Coupon System
| Feature | Status | Details |
|---------|--------|---------|
| Browse Coupons | ✅ | Lists all coupons with active/expired/used status |
| Validate Coupon | ✅ | Checks expiry, min order amount, usage limits |
| Percentage Discounts | ✅ | e.g., 20% off |
| Fixed Discounts | ✅ | e.g., ₹500 off |
| Max Discount Cap | ✅ | Prevents excessive discounts on percentage coupons |
| Usage Tracking | ✅ | Per-coupon usage count enforced |
| Redis Caching | ✅ | 1h TTL |

- Backend: `routes/coupons.ts`
- Frontend: `app/profile/coupons.tsx`, `context/CheckoutContext.tsx`
- Rate limit: 20 attempts/15min

---

#### Wallet System
| Feature | Status | Details |
|---------|--------|---------|
| View Balance | ✅ | Encrypted balance decrypted on read |
| Transaction History | ✅ | Last 20 transactions with type, amount, description |
| Credit Wallet | ✅ | Used internally for refunds on cancellations/returns |
| Debit Wallet | ✅ | Used for wallet payments; atomically debited during order creation |
| Auto-create Wallet | ✅ | Wallet created on first access if not exists |
| Transaction Safety | ✅ | All balance changes wrapped in DB transactions |

- Backend: `routes/wallet.ts` (3 endpoints)
- Frontend: `app/profile/payment-methods.tsx` (wallet balance + transactions), `app/checkout/payment.tsx` (wallet selectable as payment method with live balance display)
- Encryption: AES-256-GCM on balance values

---

#### Payment Processing (Razorpay)
| Feature | Status | Details |
|---------|--------|---------|
| Create Razorpay Order | ✅ | `POST /api/v1/razorpay/create-order` — creates Razorpay order for app order ID, verifies ownership, converts to paise |
| Verify Payment | ✅ | `POST /api/v1/razorpay/verify` — HMAC-SHA256 signature verification, marks order paid + confirmed, sends payment_success notification |
| Razorpay SDK (backend) | ✅ | `razorpay@2.9.6` installed and initialized from env vars |
| Razorpay SDK (frontend) | ✅ | `react-native-razorpay@3.0.0` installed |
| Frontend Service | ✅ | `services/payment.ts` — `createRazorpayOrder`, `verifyRazorpayPayment`, `requestRefund` (via wallet credit) |
| Wallet Payment | ✅ | Debit atomically wired into order creation; balance validated before order commit |
| COD | ⚠️ | Orders can be created with `payment_method: 'cod'` but no confirmation flow |
| Webhook Handler | ❌ | No Razorpay webhook endpoint for server-side payment events |
| Payment Retry | ❌ | No retry endpoint for failed payments |
| Dedicated Refund Route | ❌ | Refunds handled via `wallet/credit` directly; no Razorpay refund API call |

- Backend: `routes/razorpay.ts` (2 endpoints — `/create-order`, `/verify`)
- Frontend: `services/payment.ts`
- Env required: `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET`

---

#### Notifications
| Feature | Status | Details |
|---------|--------|---------|
| New Order Notifications (Seller) | ✅ | POST fetch with full order details + decrypted address |
| Unread Count (Seller) | ✅ | GET count of unread `new_order` notifications |
| Mark as Read | ✅ | Auto-marked read on fetch |
| Payment Success Notification (Customer) | ✅ | Inserted into notifications table on successful Razorpay verify |
| Notification Types | ✅ | `new_order`, `payment_success` types implemented |

- Backend: `routes/notifications.ts` (2 endpoints — seller-facing fetch/count)
- Note: Customer notifications are written to DB but no customer-facing read endpoint exists

---

### PARTIAL / INCOMPLETE

#### Verified Purchase Automation
| Feature | Status | Details |
|---------|--------|---------|
| Auto-set `is_verified_purchase` | ⚠️ | Flag exists in DB and is stored, but not auto-set when reviewer has a delivered order for the product |

---

#### Seller Management (Not Implemented)
| Feature | Status |
|---------|--------|
| Seller Registration | ❌ |
| Seller Dashboard | ❌ |
| Inventory Management | ❌ |
| Order Fulfillment UI | ❌ |

---

## TECHNICAL DETAILS

### Backend Stack
- Express.js + TypeScript
- PostgreSQL with `pg` connection pool
- Redis (ioredis) — product cache (2h), review cache (30m), coupon cache (1h)
- JWT (jsonwebtoken) — 15m access / 30d refresh
- bcrypt (12 rounds) for password hashing
- AES-256-GCM encryption for addresses and wallet balances
- Razorpay SDK (`razorpay@2.9.6`) for payment order creation and HMAC verification
- Helmet, CORS, express-rate-limit, custom input sanitizer

### Database Schema (21 Active Tables)
| Table | Purpose |
|-------|---------|
| `users` | Accounts with profile fields, notification prefs |
| `refresh_tokens` | JWT refresh token rotation |
| `auth_tokens` | OTP and password reset tokens |
| `addresses` | Encrypted shipping addresses |
| `cart_items` | Shopping cart with `price_at_add` |
| `wishlists` | Saved products |
| `orders` | Order header — status, payment, shipping |
| `order_items` | Line items per order |
| `products` | Catalog with category path, size quantities, attributes |
| `product_images` | Images with display order |
| `product_reviews` | Ratings, comments, images, verified purchase flag |
| `categories` | Hierarchical category tree |
| `coupons` | Discount codes with usage tracking |
| `wallets` | Encrypted user wallet balances |
| `wallet_transactions` | Credit/debit history |
| `notifications` | Seller new-order + customer payment_success notifications |
| `return_requests` | Return workflow with status history |
| `order_cancellations` | Cancellation reasons and refund method |

### Rate Limiting Strategy
| Endpoint | Limit |
|----------|-------|
| Global | 300 req/15min (prod) |
| Login | 10 attempts/15min |
| OTP | 5 requests/15min |
| Signup | 3 attempts/hour |
| Product List | 60 req/min |
| Reviews | 30 req/min |
| Cart Writes | 60 req/5min |
| Order Create | 10 orders/hour |
| Addresses | 10 adds/hour |
| Coupons | 20 attempts/15min |

### Security Implemented
- HTTPS redirect (production)
- Helmet security headers (HSTS 1yr, CSP disabled for API-only server)
- CORS with origin validation
- Input sanitization (null bytes, control chars, HTML tags, sensitive key protection)
- SQL injection prevention (parameterized queries + `safeIdentifier` for dynamic identifiers)
- Timing-attack prevention on login (dummy bcrypt hash on missing user)
- User enumeration prevention
- Password strength validation (8+ chars, letter + number)
- JWT expiration + refresh token rotation (old tokens invalidated on use)
- Ownership enforcement on all user data endpoints
- Role-based access (seller-only endpoints)
- AES-256-GCM encryption for addresses and wallet balances at rest
- HMAC-SHA256 signature verification for Razorpay payments
- Structured security event logging with suspicious request detection
- Fail-fast env var validation at startup (9 required vars checked)

### Migration Scripts
- `scripts/runMigration.ts` — main schema migration
- `scripts/runFixProductReviews.ts` — fixes `product_reviews.product_id` to UUID
- `scripts/runFixProductReviewsUserId.ts` — fixes `product_reviews.user_id` column
- `scripts/seedProducts.ts` — seed product data
- `scripts/deleteSeededProducts.ts` — cleanup seeded data
- `scripts/runPaymentMethodsMigration.ts` — payment methods table migration
- `scripts/runDropPaymentMethods.ts` — drop payment methods table

---

## FRONTEND ARCHITECTURE

### Stack
- React Native + Expo SDK 54 (file-based routing via Expo Router 6)
- React 19.1.0 / React Native 0.81.5
- Axios with auto token refresh on 401
- React Navigation (bottom tabs)
- Reanimated 4 + Worklets for animations
- AsyncStorage for local persistence
- `react-native-razorpay@3.0.0` for payment UI

### Screen Map
```
Root (_layout.tsx)
├── Auth Stack (app/auth/)
│   ├── login.tsx
│   ├── signup.tsx
│   ├── forgot-password.tsx
│   ├── verify-reset-otp.tsx
│   ├── reset-password.tsx
│   └── verify-otp.tsx
├── Tabs (app/(tabs)/)
│   ├── index.tsx          — Home / Dashboard
│   ├── categories.tsx     — Category browser
│   ├── product-listing.tsx
│   ├── cart.tsx
│   └── profile.tsx
├── app/product/[id].tsx   — Product detail
├── app/product-search.tsx — Search
├── Checkout (app/checkout/)
│   ├── address.tsx
│   ├── payment.tsx
│   └── summary.tsx
└── Profile Sub-screens (app/profile/)
    ├── edit-profile.tsx
    ├── orders.tsx
    ├── order-details.tsx
    ├── track-order.tsx
    ├── cancel-order.tsx
    ├── returns.tsx
    ├── addresses.tsx
    ├── add-address.tsx
    ├── payment-methods.tsx
    ├── add-payment-method.tsx
    ├── coupons.tsx
    ├── wishlist.tsx
    └── help-center.tsx
```

### Context / State Management
- `UserContext` — auth state, tokens
- `CartContext` — cart with AsyncStorage sync
- `WishlistContext` — wishlisted items
- `AddressContext` — shipping addresses
- `CheckoutContext` — delivery type, payment method selection
- `OrderContext` — order history

### Services Layer
| File | Status |
|------|--------|
| `api.ts` | ✅ Axios wrapper with 401 token refresh, dev/prod URL resolution, Android emulator support |
| `auth.ts` | ✅ Login, signup, OTP, password reset |
| `product.ts` | ✅ Browse, search, recommendations |
| `cart.ts` | ✅ Full CRUD |
| `order.ts` | ✅ Full CRUD + tracking |
| `user.ts` | ✅ Profile + addresses |
| `wishlist.ts` | ✅ Full CRUD |
| `wallet.ts` | ✅ Balance + transactions |
| `coupon.ts` | ✅ Validate + list |
| `review.ts` | ✅ Full CRUD |
| `payment.ts` | ✅ `createRazorpayOrder`, `verifyRazorpayPayment`, `requestRefund` — all backed by live endpoints |
| `location.ts` | ✅ Location utilities |
| `keepAlive.ts` | ✅ Token refresh mechanism |

### Utilities
- `utils/apiErrorHandler.ts` — standardized error extraction
- `utils/preventDoubleClick.ts` — debounce for form submissions
- `utils/typeAdapters.ts` — API response normalization
- `utils/validation.ts` — input validation helpers

---

## DEPLOYMENT READINESS

### Ready for MVP Launch
- Core e-commerce flow (browse → cart → checkout with COD or Razorpay)
- Full authentication with OTP and password reset
- Product discovery (search, categories, recommendations)
- Order lifecycle (create, track, cancel, return)
- Wishlist, coupons, wallet
- Product reviews (full CRUD)
- Encrypted sensitive data at rest
- Rate limiting and security hardening
- Redis caching for products, reviews, and coupons

### Remaining Gaps
- Razorpay webhook handler — payment status updates without client-side verify call
- Payment retry flow for failed Razorpay payments
- Razorpay-side refund API (currently refunds go to ZPIN wallet only)
- Auto-set `is_verified_purchase` when reviewer has a delivered order for the product
- Customer-facing notification read endpoint (notifications are written but not readable by customers)
- Email/SMS delivery for OTPs (generation exists; delivery mechanism not visible in codebase)
- Encryption key rotation runbook

### Recommended Next Steps
1. Add Razorpay webhook endpoint (`POST /api/v1/razorpay/webhook`) for server-side payment confirmation
2. Add payment retry endpoint for failed/pending Razorpay orders
3. Auto-set `is_verified_purchase` on review submission by checking delivered orders
4. Add `GET /api/v1/notifications` endpoint for customer-facing notification feed
5. Wire up email/SMS OTP delivery
6. Encryption key rotation runbook

---

## SUMMARY TABLE

| Feature Area | Status | Endpoints | Notes |
|---|---|---|---|
| Authentication | ✅ 100% | 8 | Production-ready |
| Products | ✅ 100% | 13+ | Production-ready, Redis cached |
| Cart | ✅ 100% | 6 | Production-ready |
| Wishlist | ✅ 100% | 5 | Production-ready |
| Orders | ✅ 95% | 10+ | Missing payment retry coupling |
| User Profile | ✅ 100% | 5 | Production-ready |
| Coupons | ✅ 100% | 2 | Production-ready, Redis cached |
| Wallet | ✅ 100% | 3 | Fully wired into checkout flow |
| Notifications | ✅ 75% | 2 | Seller + payment_success written; no customer read endpoint |
| Payments (Razorpay) | ✅ 70% | 2 | Create + verify working; no webhook/retry/Razorpay refund |
| **Overall** | **~90%** | **56+** | MVP-ready with COD and Razorpay |
