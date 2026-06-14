# ZPinEcom — Project Memory

> Auto-maintained living document. Last full scan: 2026-06-14

---

## Project Overview

ZPinEcom is a **full-stack mobile e-commerce platform** (customer-facing app) built with a Node.js/Express backend and React Native/Expo frontend. It supports product browsing, cart/wishlist, checkout with Razorpay payments, order tracking, wallet, coupons, reviews, and notifications.

**Repository:** `C:\Zpin\ZPinEcom`  
**Branch:** `master`

---

## Architecture

### Tech Stack

| Layer      | Technology                                      |
|------------|------------------------------------------------|
| Backend    | Node.js + TypeScript, Express 4.19.2           |
| Database   | PostgreSQL 8.12.0                              |
| Cache      | Redis (ioredis 5.3.2)                          |
| Auth       | JWT (jsonwebtoken 9.0.2) + Firebase Admin      |
| Payments   | Razorpay 2.9.6                                 |
| Email      | Nodemailer 8.0.8                               |
| Security   | Helmet 8.1.0, bcryptjs 2.4.3, AES-256-GCM     |
| Frontend   | React Native 0.81.5 / Expo 54.0.34             |
| Navigation | Expo Router 6.0.23 (file-based routing)        |
| State      | React Context API + AsyncStorage               |
| HTTP       | Axios 1.13.4                                   |
| Testing    | Jest 30.4.2, Supertest 7.2.2                   |

### Backend Structure (`backend/src/`)

```
index.ts                  — Express app init, middleware, route registration
routes/
  auth.ts          (787L) — Login, signup, OTP, password reset, Google OAuth, rate limiting
  products.ts      (886L) — Product CRUD, search, filtering, reviews, Redis caching
  orders.ts       (1043L) — Order creation, cancellation, returns, refunds, status tracking
  cart.ts          (180L) — Cart add/remove/update/clear
  users.ts         (382L) — Profile, addresses, preferences
  coupons.ts       (128L) — Coupon listing & validation
  wallet.ts        (183L) — Balance, transactions, credit/debit
  wishlist.ts      (124L) — Wishlist CRUD
  razorpay.ts      (174L) — Payment order creation & signature verification
  notifications.ts (128L) — Seller order notifications
middleware/
  auth.ts                 — JWT verification (userId, userRole extraction)
  httpsRedirect.ts        — Force HTTPS in production
  inputSanitizer.ts       — Request input sanitization
  rateLimits.ts           — Per-endpoint rate limiting
  requestLogger.ts        — Request logging with IP tracking
utils/
  db.ts                   — PostgreSQL connection pool (max 20)
  redis.ts                — Cache helpers (get/set/delete/pattern)
  encryption.ts           — AES-256-GCM encryption (addresses, money)
  id.ts                   — UUID & 7-char short ID generation
  logger.ts               — Structured event logging
  mailer.ts               — Nodemailer setup
  firebaseAdmin.ts        — Firebase token verification
  sql.ts                  — SQL identifier escaping
scripts/
  runMigration.ts         — DB initialization
  seedProducts.ts         — Product seeding (49KB)
  deleteSeededProducts.ts — Cleanup
  migrate.sql             — Raw SQL migrations
tests/
  auth.test.ts     (576L)
  products.test.ts (346L)
  orders.test.ts   (411L)
  cart.test.ts     (296L)
  users.test.ts    (239L)
  wallet.test.ts   (255L)
  coupons.test.ts  (186L)
  notifications.test.ts (132L)
  setup/app.ts, setup/helpers.ts
```

### Frontend Structure (`frontend/`)

```
app/
  _layout.tsx             — Root layout with SafeAreaProvider
  (auth)/
    login.tsx             — Email/password + Google Sign-In
    signup.tsx            — Account creation
    verify-otp.tsx        — OTP verification
    complete-profile.tsx  — Post-signup profile
    forgot-password.tsx   — Password reset initiation
    reset-password.tsx    — New password entry
    verify-reset-otp.tsx  — Reset OTP verification
  (tabs)/
    index.tsx             — Home (categories, fresh arrivals, recommendations)
    categories.tsx        — Category browser
    cart.tsx              — Shopping cart
    profile.tsx           — User profile dashboard
  product/[id].tsx        — Product detail view
  product-listing.tsx     — Category-based listing
  product-search.tsx      — Search results
  checkout/
    address.tsx           — Address selection/entry
    payment.tsx           — Payment method selection
    summary.tsx           — Order confirmation
  profile/
    edit-profile.tsx      — Update user details
    addresses.tsx         — Manage saved addresses
    add-address.tsx       — Add new address
    orders.tsx            — Order history
    order-details.tsx     — Single order details
    track-order.tsx       — Real-time tracking
    cancel-order.tsx      — Initiate cancellation
    returns.tsx           — Return management
    coupons.tsx           — Available coupons
    wishlist.tsx          — Wishlist management
    help-center.tsx       — Support/FAQ

services/    (14 files) — Axios-based API clients per domain
context/     (7 files)  — UserContext, CartContext, WishlistContext, OrderContext,
                          AddressContext, CheckoutContext, SearchContext
components/  (40+ files)— Reusable UI (ErrorBoundary, Modals, Skeletons, Cards, etc.)
constants/               — Colors, categories, products, coupons
types/types.ts (150+L)  — Full TypeScript interfaces
utils/                   — apiErrorHandler, validation, preventDoubleClick, typeAdapters
```

---

## Features

| Feature                  | Backend Route        | Frontend Screens                        |
|--------------------------|---------------------|-----------------------------------------|
| Authentication           | `auth.ts`           | login, signup, verify-otp, forgot/reset |
| Product Catalog & Search | `products.ts`       | home, product-listing, product-search, product/[id] |
| Shopping Cart            | `cart.ts`           | cart tab                                |
| Wishlist                 | `wishlist.ts`       | profile/wishlist                        |
| Checkout & Payments      | `orders.ts`, `razorpay.ts` | checkout/address, payment, summary |
| Order Management         | `orders.ts`         | profile/orders, order-details, track, cancel, returns |
| User Profile & Addresses | `users.ts`          | profile tab, edit-profile, addresses    |
| Wallet                   | `wallet.ts`         | (integrated in checkout)                |
| Coupons & Discounts      | `coupons.ts`        | profile/coupons                         |
| Reviews & Ratings        | `products.ts`       | product/[id]                            |
| Notifications            | `notifications.ts`  | (seller-facing)                         |

---

## APIs

Base path: `/api/v1/`

| Group          | Prefix                | Key Endpoints                                      |
|----------------|-----------------------|----------------------------------------------------|
| Auth           | `/auth/`              | login, signup, google, send-otp, verify-otp, refresh-token, forgot-password, reset-password |
| Products       | `/products/`          | GET /, /:id, /search, /nearby, /fresh, /recommendations, /reviews/:id, /count; POST /reviews |
| Cart           | `/cart/`              | GET /, /count; POST / (add); PUT /:id; DELETE /:id |
| Orders         | `/orders/`            | GET /, /:id, /status/:id, /track/:id; POST / (create), /cancel, /return; PATCH /:id/status |
| Users          | `/users/`             | GET /, /orders, /addresses; PATCH /, /profile; POST /addresses; PUT /addresses/:id; DELETE /addresses/:id |
| Coupons        | `/coupons/`           | GET /; POST /validate                              |
| Wallet         | `/wallet/`            | GET /; POST /credit, /debit                        |
| Wishlist       | `/wishlist/`          | GET /, /count; POST /; DELETE /:id, /clear          |
| Razorpay       | `/razorpay/`          | POST /create-order, /verify-payment                |
| Notifications  | `/notifications/`     | POST /new-order                                    |

---

## Database Schema

### Core Tables (Customer App)

| Table                | Purpose                                    |
|----------------------|--------------------------------------------|
| `users`              | User accounts (18 fields)                  |
| `refresh_tokens`     | JWT refresh token storage                  |
| `auth_tokens`        | Auth token management                      |
| `addresses`          | Saved shipping addresses (encrypted)       |
| `cart_items`          | Shopping cart with price snapshots          |
| `wishlists`          | User wishlist items                        |
| `orders`             | Order records with encrypted addresses     |
| `order_items`        | Individual items per order                 |
| `products`           | Product catalog                            |
| `product_images`     | Product image URLs                         |
| `product_reviews`    | Reviews & ratings (with verified flag)     |
| `coupons`            | Discount codes with usage tracking         |
| `categories`         | Hierarchical product categories            |
| `wallets`            | User wallet balances                       |
| `wallet_transactions`| Wallet transaction history                 |
| `notifications`      | Order notifications                        |
| `payments`           | Payment records                            |
| `refunds`            | Refund records                             |
| `return_requests`    | Return request tracking                    |
| `order_status_history`| Order status change log                   |

### Other Tables (Seller/Admin/Delivery — not in customer app)

- Seller profiles, bank details, earnings, payouts
- Delivery partner profiles, documents, earnings
- Admin users, shipping addresses

---

## Configuration

### Backend (`backend/package.json`)

- **Start:** `node dist/index.js`
- **Dev:** `npx ts-node-dev --respawn src/index.ts`
- **Test:** `jest --config jest.config.ts`
- **Build:** `tsc`
- **Migrate:** `ts-node src/scripts/runMigration.ts`
- **Seed:** `ts-node src/scripts/seedProducts.ts`

### Frontend (`frontend/package.json`)

- **Start:** `npx expo start`
- **Android:** `npx expo run:android`
- **iOS:** `npx expo run:ios`
- **Web:** `npx expo start --web`

### Environment

- Production API URL hardcoded in `frontend/services/api.ts`
- Backend uses `process.env` for DB, Redis, JWT secrets, Razorpay keys, SMTP config
- Rate limits differ between production and development

---

## Dependencies

### Backend Key Dependencies

| Package            | Version | Purpose                    |
|--------------------|---------|----------------------------|
| express            | 4.19.2  | Web framework              |
| pg                 | 8.12.0  | PostgreSQL client          |
| ioredis            | 5.3.2   | Redis client               |
| jsonwebtoken       | 9.0.2   | JWT auth                   |
| bcryptjs           | 2.4.3   | Password hashing           |
| razorpay           | 2.9.6   | Payment gateway            |
| firebase-admin     | 13.10.0 | Firebase integration       |
| nodemailer         | 8.0.8   | Email service              |
| helmet             | 8.1.0   | Security headers           |
| express-rate-limit | 7.5.0   | Rate limiting              |
| cors               | 2.8.5   | CORS handling              |
| uuid               | 10.0.0  | ID generation              |

### Frontend Key Dependencies

| Package                    | Version | Purpose               |
|----------------------------|---------|-----------------------|
| expo                       | 54.0.34 | Framework             |
| react-native               | 0.81.5  | Mobile UI             |
| expo-router                | 6.0.23  | File-based navigation |
| axios                      | 1.13.4  | HTTP client           |
| @react-native-firebase/auth| 22.1.2  | Firebase auth         |
| react-native-razorpay      | 3.0.0   | Payment UI            |
| expo-location              | 19.0.8  | Geolocation           |
| @react-native-async-storage| 2.1.2   | Local persistence     |

---

## Security Patterns

- **JWT** with refresh token rotation
- **AES-256-GCM** encryption for addresses and wallet balances (PBKDF2 key derivation)
- **Rate limiting** per endpoint (stricter in production)
- **Input sanitization** middleware
- **Helmet** security headers
- **HTTPS enforcement** in production
- **Parameterized SQL queries** (no string interpolation)
- **Password policy:** min 8 chars, uppercase, lowercase, digit, special char
- **Email verification** enforced before access

## Caching Strategy

- Redis with TTL-based expiration
- Products: 2h, lists: 1h, search: 30m, reviews: 30m, coupons: 1h
- Cache invalidation via wildcard key deletion

---

## Known Issues

_(None documented yet)_

---

## Technical Debt

- Return request status updates (`orders.ts:770`) mutate `status_history` in JS — concurrent updates can lose entries. Should use PostgreSQL `jsonb_array_append` or row-level locking.
- Cart/wishlist context `saveCart()`/`saveWishlist()` calls inside `setState` callbacks are fire-and-forget — if the component unmounts mid-save, data could be lost.

---

## Change History

| Timestamp  | Files Modified | Summary | Impact |
|------------|---------------|---------|--------|
| 2026-06-14 | `docs/project-memory.md` (created) | Initial full repository scan and project memory creation | Baseline documentation established |
| 2026-06-14 | `backend/src/routes/wallet.ts` | Fix critical race condition: added `SELECT ... FOR UPDATE` row locks in wallet credit/debit endpoints | Prevents lost wallet balance updates under concurrent requests |
| 2026-06-14 | `frontend/app/auth/signup.tsx`, `frontend/app/auth/verify-otp.tsx` | Fix critical missing import: added `sendFirebaseOTP` import from `firebaseAuth` service | Fixes crash on signup and OTP resend flows |
| 2026-06-14 | `frontend/app/checkout/summary.tsx` | Fix tax/shipping calculation mismatch: use `Math.round` for GST, add conditional shipping fee (₹49 under ₹500) to match backend and payment screen | Prevents user seeing different totals on summary vs payment |
| 2026-06-14 | `frontend/app/product/[id].tsx` | Fix default size selection: use `sizes[0]` instead of `sizes[2]` which caused undefined for products with <3 sizes | Prevents wrong default size display |
| 2026-06-14 | `frontend/context/WishlistContext.tsx` | Fix missing `await` on `AsyncStorage.removeItem` in `clearWishlist()` | Prevents potential data loss if app closes before async write completes |
| 2026-06-14 | Root directory | Deleted 10 xlsx test case files, 2 docx files (TEST_CASES.docx, ZPIN_Use_Case_Specifications.docx) | Cleanup: removed redundant/binary docs from repo |
| 2026-06-14 | `.idea/` | Removed 6 JetBrains IDE config files from git tracking | Cleanup: IDE configs should not be versioned |
| 2026-06-14 | `gen_cart_test.py`, `gen_checkout_test.py`, `gen_product_test.py` | Deleted throwaway Python generator scripts | Cleanup: one-time-use scripts removed |
