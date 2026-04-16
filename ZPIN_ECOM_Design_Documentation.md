# ZPIN E-Commerce — Design Documentation
### For Software Testers | Version 1.0 | April 2026

---

## Table of Contents

1. [High-Level Overview](#1-high-level-overview)
2. [System Architecture](#2-system-architecture)
3. [Technology Stack](#3-technology-stack)
4. [Database Schema](#4-database-schema)
5. [Module-Wise Breakdown](#5-module-wise-breakdown)
6. [Key User Journeys / Workflows](#6-key-user-journeys--workflows)
7. [API Endpoints Reference](#7-api-endpoints-reference)
8. [Authentication & Security](#8-authentication--security)
9. [Data Handling & Storage Logic](#9-data-handling--storage-logic)
10. [Business Logic & Rules](#10-business-logic--rules)
11. [Error Handling & Edge Cases](#11-error-handling--edge-cases)
12. [Assumptions & Limitations](#12-assumptions--limitations)
13. [Diagrams (Described)](#13-diagrams-described)

---

## 1. High-Level Overview

ZPIN is a mobile-first e-commerce application targeting the Indian market. Customers can browse products across multiple categories (Fashion, Accessories, Beauty, Home), add items to a cart, place orders, and track deliveries. The platform supports two delivery modes — Standard Delivery and Instant Trial Delivery — along with a built-in digital wallet for refunds and payments.

**Who uses it:**
- Customers: Browse, buy, track, return products
- Sellers: Receive order notifications (referenced in code, no full seller portal)
- Admins: Manage coupons, update order/return statuses

**Core capabilities:**
- Product discovery (search, category browse, personalized recommendations)
- Cart and wishlist management
- Multi-step checkout (address → payment → summary)
- Order lifecycle management (place → track → cancel → return → refund)
- ZPIN Wallet (credit from refunds, debit on payment)
- Coupon/discount system
- Product reviews and ratings

---

## 2. System Architecture

ZPIN follows a classic client-server architecture with a mobile frontend and a RESTful backend API.

```
+------------------------------------------------------------------+
|              MOBILE CLIENT (Expo / React Native)                 |
|  +----------+  +----------+  +----------+  +----------------+   |
|  | Auth     |  | Products |  | Cart /   |  | Orders /       |   |
|  | Screens  |  | Browse   |  | Wishlist |  | Tracking       |   |
|  +----------+  +----------+  +----------+  +----------------+   |
|              Context API (State Management)                      |
|              Axios HTTP Client (with auto token refresh)         |
+-----------------------------+------------------------------------+
                              | HTTPS REST API  /api/v1/
                              v
+------------------------------------------------------------------+
|              BACKEND (Node.js / Express / TypeScript)            |
|  +----------+  +----------+  +----------+  +----------------+   |
|  | /auth    |  | /products|  | /orders  |  | /wallet        |   |
|  | /users   |  | /cart    |  | /coupons |  | /wishlist      |   |
|  +----------+  +----------+  +----------+  +----------------+   |
|  Middleware: JWT Auth, Rate Limiting, Helmet, Input Sanitizer    |
+-----------------------------+------------------------------------+
                              | SQL via node-postgres pool
                              v
+------------------------------------------------------------------+
|              DATABASE (PostgreSQL on Render)                     |
|  users, products, orders, order_items, cart_items, wishlists,   |
|  wallets, wallet_transactions, coupons, return_requests,         |
|  order_cancellations, refresh_tokens, auth_tokens, addresses     |
+------------------------------------------------------------------+
```

**Key architectural decisions:**
- No separate admin panel — admin operations are done directly via API or database
- Products are seeded externally via a seed script; the product table is managed separately from the main migration
- Sensitive data (shipping addresses, wallet balances) is AES-256 encrypted at rest
- The frontend resolves the API base URL dynamically: in development it auto-detects the Expo host IP; in production it reads EXPO_PUBLIC_API_URL

---

## 3. Technology Stack

| Layer | Technology | Notes |
|---|---|---|
| Mobile Frontend | React Native + Expo | File-based routing via Expo Router |
| Language (Frontend) | TypeScript | Strict mode enabled |
| State Management | React Context API | Separate contexts per domain |
| HTTP Client | Axios | Custom interceptor for token refresh |
| Local Storage | AsyncStorage | Stores access/refresh tokens |
| Backend Framework | Express.js (Node.js) | TypeScript |
| Database | PostgreSQL | Hosted on Render |
| DB Client | node-postgres (pg) | Connection pool |
| Authentication | JWT (jsonwebtoken) | Access token 15m, Refresh token 30d |
| Password Hashing | bcryptjs | 12 salt rounds |
| Encryption | AES-256 (Node crypto) | For addresses and wallet balance |
| Security Headers | Helmet.js | HSTS, CSP, X-Frame-Options, etc. |
| Rate Limiting | express-rate-limit | Per-route limits |
| Logging | Custom structured logger | JSON format |
| Deployment | Render (backend + DB) | HTTPS enforced in production |


---

## 4. Database Schema

The database has 15 tables. Below is a description of each, its purpose, and key columns.

### 4.1 users
Stores all registered users.

| Column | Type | Description |
|---|---|---|
| id | VARCHAR(7) | Primary key, 7-char alphanumeric (e.g. "A3K9X2M") |
| user_name | VARCHAR(255) | Unique username |
| name | VARCHAR(255) | Display name |
| email | VARCHAR(255) | Unique, used for login |
| mobile | VARCHAR(20) | Unique, optional |
| password_hash | VARCHAR(255) | bcrypt hash, null for social logins |
| user_role | VARCHAR(50) | 'customer' (default) or 'admin' |
| is_verified | BOOLEAN | Email/mobile verified flag |
| is_active | BOOLEAN | Soft-disable account |
| dob, gender | Various | Optional profile fields |
| profile_image | TEXT | URL to profile picture |
| receive_push_notifications | BOOLEAN | Notification preference |
| receive_order_updates | BOOLEAN | Notification preference |

### 4.2 refresh_tokens
Stores active refresh tokens for session management.

| Column | Description |
|---|---|
| token | The JWT refresh token string |
| expires_at | Expiry timestamp (30 days from issue) |
| user_id | FK to users |

### 4.3 auth_tokens
Stores OTP tokens for email verification and password reset.

| Column | Description |
|---|---|
| token | The OTP or signed reset token |
| token_type | 'email_verification', 'password_reset', etc. |
| is_used | Prevents token reuse |
| expires_at | Short-lived expiry |

### 4.4 addresses
Stores user shipping addresses. Address fields are encrypted before storage.

| Column | Description |
|---|---|
| address_line1, city, state, pincode | Core address fields (encrypted as JSONB payload) |
| label | 'Home', 'Work', 'Other' |
| is_default | Whether this is the user's default address |
| phone | Contact number for delivery |

### 4.5 products
Managed externally via seed scripts. Key fields used by the app:

| Column | Description |
|---|---|
| id | UUID (not the 7-char format) |
| product_name | Display name |
| price | Current selling price |
| images | JSONB array of image URLs |
| category_id | FK to category |
| size_quantities | JSONB e.g. {"S": 10, "M": 15} |
| extracted_attributes | JSONB with colors, brand, etc. |
| average_rating | Computed from reviews |
| in_stock | Boolean |

### 4.6 cart_items
One row per product per user in the cart.

| Column | Description |
|---|---|
| user_id, product_id | Composite unique constraint |
| quantity | Must be > 0 |
| price_at_add | Price captured at time of adding to cart |

### 4.7 wishlists
One row per product per user in the wishlist.

### 4.8 orders
The central order record.

| Column | Description |
|---|---|
| order_number | Human-readable e.g. "ZPIN-88219" |
| status | pending / confirmed / processing / shipped / delivered / cancelled |
| payment_status | pending / paid / refunded |
| total_amount | Sum of item prices |
| shipping_amount | 0 (free above Rs.500) or 49 |
| tax_amount | 18% GST on subtotal |
| final_amount | total + shipping + tax - discount |
| shipping_address | Encrypted JSONB |
| payment_method | 'cod' or 'wallet' |
| notes | 'instant_delivery' flag stored here |
| estimated_delivery | Timestamp |

### 4.9 order_items
Line items for each order.

| Column | Description |
|---|---|
| product_name | Snapshot of name at time of order |
| price | Snapshot of price at time of order |
| variant | Size/color selected |
| image | Snapshot of product image URL |

### 4.10 return_requests
Tracks return requests for delivered orders.

| Column | Description |
|---|---|
| order_item_ids | JSONB array of item IDs being returned |
| reason | Customer-provided reason |
| status | requested / picked_up / refunded |
| status_history | JSONB array of status change events with timestamps |
| picked_up_at, refunded_at | Milestone timestamps |

### 4.11 order_cancellations
Records cancellation details when an order is cancelled.

| Column | Description |
|---|---|
| reason | Customer-provided reason |
| refund_method | 'original' or 'wallet' |

### 4.12 wallets
One wallet per user. Balance is AES-256 encrypted.

### 4.13 wallet_transactions
Audit log of all wallet credits and debits.

| Column | Description |
|---|---|
| type | 'credit' or 'debit' |
| amount | Always positive |
| description | Human-readable reason |
| reference_id | Links to order/return ID |

### 4.14 product_reviews
One review per user per product (enforced by UNIQUE constraint).

| Column | Description |
|---|---|
| rating | 1-5 integer |
| comment | Text review |
| images | JSON array of image URLs |
| is_verified_purchase | True if user has a delivered order for this product |

### 4.15 coupons
Discount codes managed by admin.

| Column | Description |
|---|---|
| code | Coupon code string (case-insensitive match) |
| discount_type | 'percentage' or 'fixed' |
| discount_value | Amount or percentage |
| min_order_amount | Minimum cart value to apply |
| max_discount_amount | Cap on percentage discounts |
| valid_until | Expiry timestamp |
| usage_limit | Max total uses (null = unlimited) |
| usage_count | Current use count |


---

## 5. Module-Wise Breakdown

### 5.1 Frontend Modules

#### Authentication Module (/app/auth/)
Handles all user identity flows. Screens: login, signup, forgot-password, verify-otp, reset-password, verify-reset-otp.

- UserContext manages the global auth state (isAuthenticated, user object, tokens)
- Tokens are persisted in AsyncStorage
- On app load, _layout.tsx checks auth state and redirects unauthenticated users to /auth/login
- A keep-alive service (keepAlive.ts) runs in the background to silently refresh tokens before they expire

#### Product Discovery Module (/(tabs)/)
- index.tsx — Home screen: featured products, categories, recommendations
- categories.tsx — Category tree browser
- product-listing.tsx — Grid view of products filtered by category; supports filter modal (sort, price range, brand, rating, discount)
- product-search.tsx — Full-text search with debounce
- product/[id].tsx — Product detail page: images, description, size/color selector, reviews, add to cart/wishlist

#### Cart Module (/(tabs)/cart.tsx)
- CartContext holds cart items in memory and syncs with backend
- Displays items, quantities, price breakdown
- Entry point to checkout flow

#### Checkout Module (/checkout/)
Three-step flow:
1. address.tsx — Select or add a shipping address
2. payment.tsx — Choose payment method (COD or ZPIN Wallet), apply coupon
3. summary.tsx — Final review before placing order

#### Profile & Orders Module (/profile/)
- orders.tsx — Paginated order history
- order-details.tsx — Full order breakdown with items
- track-order.tsx — Live tracking timeline, delivery type badge (STD/FAST), cancel/return actions
- cancel-order.tsx — Cancel with reason selection
- returns.tsx — Initiate return for delivered orders
- addresses.tsx / add-address.tsx — Manage saved addresses
- edit-profile.tsx — Update name, mobile, DOB, gender, profile image
- wishlist.tsx — Saved products
- coupons.tsx — Browse available coupons
- payment-methods.tsx / add-payment-method.tsx — Saved payment methods (UI present, backend wallet used)
- help-center.tsx — Support contact

#### Context / State Management
Each domain has its own React Context:

| Context | Responsibility |
|---|---|
| UserContext | Auth state, user profile, token management |
| CartContext | Cart items, add/remove/update, cart count |
| WishlistContext | Wishlist items, add/remove |
| OrderContext | Order list, order lookup by ID, refresh |
| CheckoutContext | Checkout state across steps (address, payment, coupon) |
| PaymentContext | Payment method selection |
| AddressContext | Saved addresses |
| SearchContext | Search query and results |

### 5.2 Backend Modules

#### Auth Route (/routes/auth.ts)
Handles signup, login, logout, token refresh, OTP generation/verification, and password reset.

#### Products Route (/routes/products.ts)
Handles product listing, search, category filtering, recommendations, and reviews CRUD.

#### Cart Route (/routes/cart.ts)
Handles add, update quantity, remove, and clear cart operations.

#### Orders Route (/routes/orders.ts)
Handles order creation, listing, detail fetch, tracking, cancellation, and return request management.

#### Users Route (/routes/users.ts)
Handles profile fetch/update, address management, and order history.

#### Wallet Route (/routes/wallet.ts)
Handles balance fetch, credit (refunds), and debit (payments). Uses DB transactions to prevent race conditions.

#### Coupons Route (/routes/coupons.ts)
Handles listing all active coupons and validating a coupon code against an order total.

#### Wishlist Route (/routes/wishlist.ts)
Handles add, remove, clear, and list wishlist items.

#### Notifications Route (/routes/notifications.ts)
Sends in-app notifications on order events to customers and sellers.

#### Middleware

| Middleware | Purpose |
|---|---|
| auth.ts | Verifies JWT, attaches userId and userRole to request |
| rateLimits.ts | Per-route rate limiters (login, OTP, signup, coupon, etc.) |
| inputSanitizer.ts | Strips dangerous characters from request body/query |
| httpsRedirect.ts | Redirects HTTP to HTTPS in production |
| requestLogger.ts | Logs all incoming requests with method, path, status, duration |

#### Utilities

| Utility | Purpose |
|---|---|
| encryption.ts | AES-256 encrypt/decrypt for addresses and money values |
| id.ts | Generates 7-character alphanumeric IDs (e.g. "A3K9X2M") |
| logger.ts | Structured JSON logger with event-based methods |
| sql.ts | safeIdentifier() — escapes table/column names to prevent SQL injection |


---

## 6. Key User Journeys / Workflows

### 6.1 User Registration & Login

**Signup Flow:**
1. User enters name, email, mobile, password on Signup Screen
2. POST /auth/signup — backend validates input, checks email/mobile uniqueness, hashes password (bcrypt 12 rounds), creates user, generates OTP
3. User enters OTP on Verify OTP Screen
4. POST /auth/verification/verifyOTP — backend marks user as is_verified = true
5. Backend issues access token (15m) + refresh token (30d)
6. Tokens stored in AsyncStorage
7. User redirected to Home (/(tabs))

**Login Flow:**
1. User enters email + password
2. POST /auth/login — backend finds user, compares bcrypt hash, generates new token pair, stores refresh token in DB
3. Tokens stored in AsyncStorage, user redirected to Home

**Token Refresh Flow:**
1. Any API call returns 401 (token expired)
2. Axios interceptor catches it
3. POST /auth/refresh-token with refresh token
4. Backend validates refresh token from DB, issues new pair, rotates (deletes old, inserts new) refresh token
5. Original request retried with new access token
6. If refresh also fails: logout user, redirect to login

### 6.2 Product Discovery

**Home Screen:**
- GET /products/recommended — personalized based on purchase/wishlist/search history
- GET /products/fresh-categories — recently added categories

**Category Browse:**
1. User taps a category
2. GET /products/category/:categoryName?limit=500
3. Product listing screen renders grid
4. User can apply filters (sort, price range, rating, discount) — filters applied client-side on the fetched list

**Search:**
1. User types in search bar (debounced)
2. GET /products/search?q=term
3. Results displayed in list view

### 6.3 Cart & Checkout

**Adding to Cart:**
1. User selects size/color on Product Detail screen, taps "Add to Cart"
2. POST /cart { productId, quantity }
3. CartContext updates count badge

**Cart Screen:**
1. GET /cart — loads all cart items
2. User adjusts quantities: PUT /cart/:productId
3. User removes item: DELETE /cart/:productId
4. User taps "Proceed to Checkout"

**Checkout Step 1 — Address:**
1. GET /users/shipping-addresses — loads saved addresses
2. User selects existing or adds new address
3. POST /users/shipping-address (if new) — address stored encrypted in DB

**Checkout Step 2 — Payment:**
1. User selects COD or ZPIN Wallet
2. If Wallet: GET /wallet (checks balance)
3. User optionally enters coupon code
4. POST /coupons/validate { code, orderTotal }
5. Backend validates: active, not expired, usage limit, min order amount
6. Discount calculated and shown

**Checkout Step 3 — Summary:**
1. Shows items, address, payment method, price breakdown
2. User taps "Place Order"
3. POST /orders { items, addressId, paymentMethod, couponId, deliveryType }
4. Backend: calculates shipping + tax, applies coupon, creates order + order_items, debits wallet (if wallet payment), clears cart, sends notifications
5. Frontend navigates to order confirmation

### 6.4 Order Tracking

1. GET /orders?page=1&limit=20 — order list
2. User taps an order
3. GET /orders/:id/track — returns currentStatus, estimatedDelivery, trackingNumber, trackingHistory array
4. Frontend renders OrderTimeline component
5. If order.notes === 'instant_delivery': shows FAST badge + InstantTrialCard; otherwise STD badge + StandardDeliveryCard

**Bottom Actions (context-sensitive):**
- status in [pending, confirmed]: "Cancel Order" button shown
- status === 'delivered': "Return Order" button shown
- otherwise: "Contact Support" button shown

### 6.5 Order Cancellation

1. User selects cancellation reason on Cancel Order screen
2. PATCH /orders/:id/cancel { reason, refundMethod }
3. Backend: validates order is cancellable (pending or confirmed), updates status to 'cancelled', creates order_cancellations record
4. If payment was wallet: credits wallet back, updates payment_status to 'refunded'
5. User sees updated status on tracking screen

### 6.6 Return & Refund

1. User selects items to return, provides reason on Returns screen
2. POST /orders/:id/return { orderItemIds, reason, description }
3. Backend: validates order status is 'delivered', creates return_requests record with status 'requested'
4. Admin/seller updates status: PATCH /orders/:id/return-status { status: 'picked_up' }
5. Admin/seller marks refunded: PATCH /orders/:id/return-status { status: 'refunded', refundMethod }
6. On 'refunded': wallet is credited, order payment_status updated
7. User can check GET /orders/:id/return-status

### 6.7 Password Reset

1. User enters email on Forgot Password screen
2. POST /auth/forgetPassword/sendOTP { email } — backend generates OTP, stores in auth_tokens
3. User enters OTP on Verify Reset OTP screen
4. POST /auth/forgetPassword/verifyOTP { email, otp } — backend validates OTP, returns signed reset token
5. User enters new password on Reset Password screen
6. POST /auth/forgetPassword/resetPassword { resetToken, newPassword } — backend validates reset token, updates password_hash, invalidates token


---

## 7. API Endpoints Reference

All endpoints are prefixed with /api/v1/. Protected endpoints require a valid JWT in the Authorization: Bearer <token> header (or x-auth-token header, or token cookie).

### Auth (/auth)

| Method | Endpoint | Auth Required | Description |
|---|---|---|---|
| POST | /auth/signup | No | Register new user |
| POST | /auth/login | No | Login, returns token pair |
| POST | /auth/logout | Yes | Invalidates refresh token |
| POST | /auth/refresh-token | No | Exchange refresh token for new pair |
| POST | /auth/verification/sendOTP | Yes | Send email/mobile verification OTP |
| POST | /auth/verification/verifyOTP | Yes | Verify OTP, mark user as verified |
| POST | /auth/forgetPassword/sendOTP | No | Send password reset OTP |
| POST | /auth/forgetPassword/verifyOTP | No | Verify reset OTP, get reset token |
| POST | /auth/forgetPassword/resetPassword | No | Reset password using reset token |

### Products (/products)

| Method | Endpoint | Auth Required | Description |
|---|---|---|---|
| GET | /products | No | Paginated product list |
| GET | /products/:id | No | Single product detail |
| GET | /products/search?q= | No | Full-text product search |
| GET | /products/category/:categoryName | No | Products by category |
| GET | /products/recommended | Yes | Personalized recommendations |
| GET | /products/nearby | Yes | Products near user location |
| GET | /products/fresh-categories | No | Recently added categories |
| GET | /products/:id/reviews | No | Paginated reviews for a product |
| POST | /products/:id/reviews | Yes | Submit a review |
| PUT | /products/:id/reviews/:reviewId | Yes | Edit own review |
| DELETE | /products/:id/reviews/:reviewId | Yes | Delete own review |

### Cart (/cart)

| Method | Endpoint | Auth Required | Description |
|---|---|---|---|
| GET | /cart | Yes | Get all cart items |
| GET | /cart/count | Yes | Get cart item count |
| POST | /cart | Yes | Add item to cart |
| PUT | /cart/:productId | Yes | Update item quantity |
| DELETE | /cart/:productId | Yes | Remove item from cart |
| DELETE | /cart | Yes | Clear entire cart |

### Orders (/orders)

| Method | Endpoint | Auth Required | Description |
|---|---|---|---|
| GET | /orders | Yes | Paginated order list |
| GET | /orders/:id | Yes | Single order detail |
| GET | /orders/:id/track | Yes | Order tracking history |
| POST | /orders | Yes | Create new order |
| PATCH | /orders/:id/cancel | Yes | Cancel an order |
| PATCH | /orders/:id/confirm | Yes | Confirm an order (admin) |
| POST | /orders/:id/return | Yes | Submit return request |
| PATCH | /orders/:id/return-status | Yes | Update return status (admin) |
| GET | /orders/:id/return-status | Yes | Get return request status |

### Users (/users)

| Method | Endpoint | Auth Required | Description |
|---|---|---|---|
| GET | /users/:id | Yes | Get user profile |
| PUT | /users/profileDetails | Yes | Update profile (name, mobile, DOB, gender, image) |
| GET | /users/orders | Yes | Get user's orders (paginated) |
| GET | /users/shipping-addresses | Yes | List saved addresses |
| POST | /users/shipping-address | Yes | Add new address |

### Wallet (/wallet)

| Method | Endpoint | Auth Required | Description |
|---|---|---|---|
| GET | /wallet | Yes | Get balance + last 20 transactions |
| POST | /wallet/credit | Yes | Credit wallet (used internally for refunds) |
| POST | /wallet/debit | Yes | Debit wallet (used for wallet payments) |

### Coupons (/coupons)

| Method | Endpoint | Auth Required | Description |
|---|---|---|---|
| GET | /coupons | No | List all active coupons |
| POST | /coupons/validate | Yes | Validate coupon against order total |

### Wishlist (/wishlist)

| Method | Endpoint | Auth Required | Description |
|---|---|---|---|
| GET | /wishlist | Yes | Get wishlist items |
| GET | /wishlist/count | Yes | Get wishlist count |
| POST | /wishlist | Yes | Add product to wishlist |
| DELETE | /wishlist/:productId | Yes | Remove from wishlist |
| DELETE | /wishlist/clear | Yes | Clear entire wishlist |

### Notifications (/notifications)

| Method | Endpoint | Auth Required | Description |
|---|---|---|---|
| GET | /notifications | Yes | Get user notifications |
| PATCH | /notifications/:id/read | Yes | Mark notification as read |


---

## 8. Authentication & Security

### JWT Token Strategy

The system uses a dual-token approach:

- Access Token: Short-lived (15 minutes). Sent with every API request. Contains userId and userRole.
- Refresh Token: Long-lived (30 days). Stored in the refresh_tokens DB table. Used only to get a new access token.

Token acceptance — the backend accepts tokens from three places (checked in order):
1. Authorization: Bearer <token> header
2. x-auth-token header
3. token cookie

Token rotation: Every time a refresh token is used, the old one is deleted and a new one is issued. This limits the window of exposure if a refresh token is stolen.

### Rate Limiting

| Endpoint Group | Limit (Production) | Window |
|---|---|---|
| Login | 10 attempts | 15 minutes per IP |
| OTP requests | 5 requests | 15 minutes per IP |
| Signup | 3 attempts | 1 hour per IP |
| Coupon validation | Separate limiter | Configured in rateLimits.ts |
| Product listing | Separate limiter | Configured in rateLimits.ts |
| Global | Applied to all routes | Configured in rateLimits.ts |

In development (NODE_ENV=development), all limits are relaxed to 1000 requests to avoid blocking during testing.

### Password Security

- Passwords are hashed using bcrypt with 12 salt rounds before storage
- Password strength rule: minimum 8 characters, at least one letter and one number
- Plain-text passwords are never stored or logged

### Data Encryption

Two types of sensitive data are encrypted at rest using AES-256:
1. Shipping addresses — the entire address JSONB payload is encrypted before being stored in the addresses and orders tables
2. Wallet balance — the balance number is encrypted as a string in the wallets table

The encryption key is stored in the DATA_ENCRYPTION_KEY environment variable.

### Input Sanitization

All incoming request bodies and query parameters pass through the inputSanitizer middleware, which strips potentially dangerous characters before they reach route handlers.

### HTTPS & Security Headers

- In production, all HTTP requests are redirected to HTTPS
- Helmet.js sets security headers including HSTS (1 year), Content-Security-Policy, X-Frame-Options, etc.
- CORS is configured via ALLOWED_ORIGINS env variable (set to * in development)

---

## 9. Data Handling & Storage Logic

### ID Generation

All primary keys (except products, which use UUIDs) are 7-character alphanumeric strings generated by the app's generateId() utility. Example: "A3K9X2M". This applies to users, orders, cart items, addresses, wallet records, etc.

### Price Snapshots

When a product is added to the cart, price_at_add is captured. When an order is created, price is captured in order_items. This means price changes after adding to cart do not affect existing cart items or placed orders.

### Address Encryption Flow

Write path: Plain address object -> JSON.stringify -> AES-256 encrypt -> Base64 string -> Store in DB
Read path: Base64 string from DB -> AES-256 decrypt -> JSON.parse -> Plain address object -> Return to client

### Wallet Balance Encryption Flow

Wallet created with balance = encryptMoney(0)
On credit/debit:
1. Read encrypted balance from DB
2. Decrypt to number
3. Add/subtract amount
4. Re-encrypt new balance
5. Update DB (inside a DB transaction to prevent race conditions)

### Product Recommendations Algorithm

The backend builds a weighted interest profile per user:
- Each product purchased by the user contributes weight +3 to its category/attributes
- Each wishlisted product contributes weight +2
- Each search term contributes weight +1

Products are then ranked by how well they match the user's interest profile. If no signals exist (new user), the system falls back to returning the latest products.

### Pagination

Orders and products support pagination via page and limit query parameters. Responses include a pagination object:

```json
{
  "currentPage": 1,
  "totalPages": 5,
  "totalItems": 98,
  "itemsPerPage": 20,
  "hasNextPage": true,
  "hasPrevPage": false
}
```

### Static Product Data (Frontend Fallback)

The frontend has a large static product list in constants/products.ts (100+ products across Fashion, Accessories, Beauty, Home categories). This is used as fallback/mock data when the backend is unavailable or for development. Real products come from the backend API.


---

## 10. Business Logic & Rules

### Order Pricing Calculation

```
subtotal        = sum of (item.price x item.quantity)
shipping        = subtotal > 500 ? 0 : 49   (in INR)
tax             = subtotal x 0.18            (18% GST)
coupon_discount = calculated from coupon rules (see below)
final_amount    = subtotal + shipping + tax - coupon_discount
```

For Instant Trial Delivery:
```
trial_fee = Rs.50 (non-refundable, added to final_amount)
```

### Coupon Discount Calculation

```
IF discount_type === 'percentage':
  discount = (orderTotal x discountValue) / 100
  IF max_discount_amount is set:
    discount = min(discount, max_discount_amount)
ELSE (fixed):
  discount = discountValue

Coupon is INVALID if:
  - Code not found or is_active = false
  - valid_until < NOW()
  - usage_count >= usage_limit (when limit is set)
  - orderTotal < min_order_amount
```

### Order Status Flow

```
pending -> confirmed -> processing -> shipped -> delivered
                                              -> cancelled (from pending or confirmed only)
delivered -> return_requested -> picked_up -> refunded
```

- Cancellation is only allowed when status is 'pending' or 'confirmed'
- Returns are only allowed when status is 'delivered'
- Once 'shipped' or 'delivered', the order cannot be cancelled (must use return flow)

### Delivery Types

**Standard Delivery:**
- Free shipping on orders above Rs.500
- Rs.49 shipping fee otherwise
- Estimated delivery: 3-7 business days

**Instant Trial Delivery:**
- Rs.50 non-refundable trial fee
- 2-12 hour delivery window
- Customer gets a 15-minute trial period after delivery
- Identified by notes = 'instant_delivery' on the order record
- Shown with a "FAST" badge in the tracking screen

### Refund Rules

- If payment method was 'wallet': refund goes back to wallet immediately on cancellation
- If payment method was 'cod': no monetary refund on cancellation (nothing was charged)
- On return approval ('refunded' status): wallet is credited regardless of original payment method

### Review Rules

- Only one review per user per product (enforced by DB UNIQUE constraint)
- is_verified_purchase is set to true if the user has a delivered order containing that product
- Reviews include optional images (stored as JSON array of URLs)
- Product's average_rating is computed from all reviews

### Seller Notification on Order

When an order is placed:
1. The backend identifies the "primary seller" — the seller who contributed the most value (by price x quantity) to the order
2. A notification is sent to each unique seller whose products are in the order
3. A confirmation notification is also sent to the customer

### User Roles

- customer (default): Can browse, buy, review, manage own orders
- admin: Can confirm orders, update return statuses, manage coupons

---

## 11. Error Handling & Edge Cases

### Standard API Error Response Format

All errors follow this structure:
```json
{
  "success": false,
  "message": "Human-readable error description"
}
```

### HTTP Status Codes Used

| Code | Meaning | When Used |
|---|---|---|
| 200 | OK | Successful GET, PUT, PATCH |
| 201 | Created | Successful POST (resource created) |
| 400 | Bad Request | Missing fields, validation failure, business rule violation |
| 401 | Unauthorized | No token, expired token, invalid token |
| 403 | Forbidden | Valid token but insufficient role/ownership |
| 404 | Not Found | Resource does not exist or does not belong to user |
| 409 | Conflict | Duplicate (e.g. email already registered, already reviewed) |
| 429 | Too Many Requests | Rate limit exceeded |
| 500 | Internal Server Error | Unexpected server-side failure |

### Key Edge Cases

**Authentication:**
- Expired access token: auto-refresh via interceptor (transparent to user)
- Expired refresh token: user is logged out and redirected to login
- Multiple concurrent requests on 401: only one refresh call is made; others queue and retry after

**Cart:**
- Adding the same product twice: updates quantity (UNIQUE constraint on user_id + product_id)
- Product goes out of stock after being added to cart: in_stock check at order creation time
- Price changes after adding to cart: price_at_add is used for display; final price recalculated at checkout

**Orders:**
- Attempting to cancel a shipped/delivered order: 400 error
- Attempting to return a non-delivered order: 400 error
- Wallet payment with insufficient balance: 400 "Insufficient wallet balance"
- Concurrent wallet debit (race condition): handled by DB transaction with BEGIN/COMMIT/ROLLBACK

**Coupons:**
- Case-insensitive code matching (UPPER() comparison in SQL)
- Expired coupon: 404 "Invalid or expired coupon code"
- Order total below minimum: 400 with minimum amount in message
- Coupon usage limit reached: treated same as expired (404)

**Products:**
- Product ID can be either a UUID or a 7-char short ID — both formats are accepted
- Invalid product ID format: 400 error before DB query

**Reviews:**
- Duplicate review attempt: 409 Conflict
- Editing/deleting another user's review: 403 Forbidden

**Database:**
- All DB errors are caught, logged server-side, and return a generic "Server error" (500) to the client — no internal details are exposed

**Environment:**
- Missing required environment variables at startup: server refuses to start and logs the missing keys
- Android emulator cannot reach localhost: frontend automatically uses 10.0.2.2 as the host IP


---

## 12. Assumptions & Limitations

### Assumptions

1. Single currency: All prices are in Indian Rupees (Rs.). No multi-currency support.
2. India-only: Addresses default to country = 'India'. Pincode format is Indian (6 digits).
3. Single user role per account: A user is either a customer or an admin, not both.
4. No real payment gateway: The system supports COD and ZPIN Wallet only. There is no integration with Razorpay, Stripe, or any external payment processor. The payment_id field exists but is not populated by a real gateway.
5. No real OTP delivery: The OTP generation code exists, but actual SMS/email delivery infrastructure (e.g. Twilio, SendGrid) is not implemented in the visible codebase. OTPs are generated and stored but delivery mechanism is a TODO.
6. No real delivery tracking: The tracking number field exists, but there is no integration with a courier API. Tracking history is built from order status changes, not from a real logistics provider.
7. Seller portal not implemented: Sellers receive notifications but there is no seller-facing UI or API for managing their products or fulfilling orders.
8. Product management is manual: Products are added via a seed script (seedProducts.ts), not through an admin UI.

### Limitations

1. No real-time updates: Order status changes are not pushed to the client. Users must pull-to-refresh to see updates.
2. No image upload: Profile images and review images are stored as URLs. There is no file upload endpoint — images must be hosted externally.
3. No multi-seller cart split: If a cart contains products from multiple sellers, they are all placed as a single order. There is no automatic order splitting per seller.
4. Wallet is refund-only in practice: While the wallet can be debited for payments, there is no way for a user to top up their wallet directly (no deposit endpoint). Wallet balance only grows through refunds.
5. No address editing: Users can add addresses but there is no PUT endpoint to edit an existing address.
6. Coupon usage count not incremented: The usage_count field exists in the schema but the order creation flow does not appear to increment it. This is a potential bug.
7. No product inventory decrement: When an order is placed, the product's quantity field in the database is not decremented. Stock management is not enforced at the order level.
8. Keep-alive service: The frontend runs a background keep-alive service that periodically refreshes tokens. On low-end devices or poor network conditions, this could cause unexpected behavior.
9. Rate limits relaxed in development: All rate limits are set to 1000 in non-production environments, so rate limiting cannot be tested without setting NODE_ENV=production.

---

## 13. Diagrams (Described)

Since this is a text document, diagrams are described below. A tester or developer can use these descriptions to draw them in tools like draw.io, Lucidchart, or Mermaid.

---

### Diagram 1: System Architecture (Component Diagram)

Three horizontal layers:
- Top layer (Mobile Client): Five boxes — Auth Screens, Product Browse, Cart/Wishlist, Checkout, Orders/Profile. All connected downward to a "Context API + Axios" bar.
- Middle layer (Backend): Eight boxes — /auth, /products, /cart, /orders, /users, /wallet, /coupons, /wishlist. All connected downward to a "PostgreSQL Pool" bar. A "Middleware" bar sits above the route boxes (JWT Auth, Rate Limiter, Helmet, Sanitizer).
- Bottom layer (Database): Fifteen table boxes grouped by domain: Auth (users, refresh_tokens, auth_tokens), Commerce (products, cart_items, wishlists, orders, order_items), Finance (wallets, wallet_transactions, coupons), Post-Order (return_requests, order_cancellations), Addresses.

Arrows: Mobile -> Backend (HTTPS REST), Backend -> Database (SQL via pg pool).

---

### Diagram 2: Authentication Flow (Sequence Diagram)

Actors: Mobile App, Backend, Database

```
Mobile App           Backend               Database
    |                    |                     |
    |-- POST /signup --> |                     |
    |                    |-- INSERT user ----> |
    |                    |-- INSERT OTP -----> |
    |<-- 201 + tokens ---|                     |
    |                    |                     |
    |-- POST /verifyOTP->|                     |
    |                    |-- UPDATE is_verified|
    |<-- 200 OK ---------|                     |
    |                    |                     |
    |  [Later: token expires]                  |
    |-- Any API call --> |                     |
    |<-- 401 Expired ----|                     |
    |-- POST /refresh -->|                     |
    |                    |-- SELECT token ---> |
    |                    |-- DELETE old -----> |
    |                    |-- INSERT new -----> |
    |<-- new tokens -----|                     |
    |-- Retry original ->|                     |
```

---

### Diagram 3: Checkout Flow (Flowchart)

```
[Cart Screen]
      |
      v
[Select/Add Address] --> [Validate address fields]
      |
      v
[Select Payment Method]
  COD or Wallet?
  |              |
  v              v
[COD]       [Check wallet balance]
  |              |
  |         Sufficient? No --> [Show error]
  |              |
  v              v
[Apply Coupon (optional)]
  |
  v
[Order Summary Screen]
  |
  v
[POST /orders]
  |
  v
[Backend: Calculate totals -> Create order -> Create order_items
         -> Debit wallet (if wallet) -> Clear cart -> Send notifications]
  |
  v
[Order Confirmation Screen]
```

---

### Diagram 4: Order Lifecycle (State Machine)

```
                    +---------+
                    | PENDING | <-- Order placed
                    +----+----+
                         | Admin confirms
                         v
                   +-----------+
                   | CONFIRMED |
                   +-----+-----+
                         | Processing begins
                         v
                   +------------+
                   | PROCESSING |
                   +-----+------+
                         | Dispatched
                         v
                    +--------+
                    |SHIPPED |
                    +----+---+
                         | Delivered
                         v
                   +-----------+
                   | DELIVERED |
                   +-----+-----+
                         | Return requested
                         v
              +----------------------+
              | RETURN_REQUESTED     |
              +-----------+----------+
                          | Picked up
                          v
                   +------------+
                   | PICKED_UP  |
                   +-----+------+
                          | Refund issued
                          v
                    +----------+
                    | REFUNDED |
                    +----------+

CANCELLED <-- from PENDING or CONFIRMED only
```

---

### Diagram 5: Wallet Flow

```
Scenario A — Wallet Payment:
  Checkout -> POST /wallet/debit { amount }
  Backend: BEGIN -> read balance -> decrypt -> check sufficient
        -> subtract -> encrypt -> UPDATE -> INSERT transaction -> COMMIT
  Order created with payment_method = 'wallet'

Scenario B — Cancellation Refund:
  PATCH /orders/:id/cancel
  Backend: UPDATE order status -> INSERT cancellation record
        -> POST /wallet/credit { amount }
  Backend: BEGIN -> read balance -> decrypt -> add
        -> encrypt -> UPDATE -> INSERT transaction -> COMMIT

Scenario C — Return Refund:
  PATCH /orders/:id/return-status { status: 'refunded' }
  Backend: UPDATE return_request -> POST /wallet/credit { amount }
```

---

### Diagram 6: Data Encryption Flow

```
Write path:
  Plain address object -> JSON.stringify -> AES-256 encrypt
  -> Base64 string -> Store in DB

Read path:
  Base64 string from DB -> AES-256 decrypt -> JSON.parse
  -> Plain address object -> Return to client

Same pattern applies to wallet balance (number -> string -> encrypt -> store).
```

---

*End of ZPIN E-Commerce Design Documentation*
*Generated by reverse engineering the codebase — April 2026*
