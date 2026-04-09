# RuFlo E-Commerce Application - Technical Analysis Report

**Date**: April 2026  
**Application**: Full-stack e-commerce platform (TypeScript/Node.js + Expo React Native)  
**Database**: PostgreSQL  

---

## EXECUTIVE SUMMARY

RuFlo is a multi-seller marketplace with comprehensive features covering product discovery, cart management, orders, payments, user profiles, and customer support. The backend is well-structured with proper middleware, error handling, and rate limiting. The frontend covers all major user journeys including authentication, shopping, checkout, and order management. However, several features show integration gaps where either the backend or frontend endpoints are missing or incomplete.

---

## 1. BACKEND ANALYSIS

### 1.1 Server Architecture

**Location**: `/backend/src/`  
**Port**: 5000  
**Framework**: Express.js with TypeScript  
**Database**: PostgreSQL with connection pooling (max 20 connections)  
**Security Headers**: Helmet.js with HSTS enabled  

**Environment Variables Required**:
- `DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USER`, `DB_PASSWORD`
- `JWT_SECRET`, `JWT_REFRESH_SECRET`
- `PORT`, `NODE_ENV`, `ALLOWED_ORIGINS`

### 1.2 Middleware Stack

#### **2.2.1 Authentication Middleware** (`auth.ts`)
- **Type**: JWT-based token verification
- **Token Sources** (in order of priority):
  1. Authorization header: `Authorization: Bearer <token>`
  2. Header: `x-auth-token`
  3. Cookie: `token`
- **Claims**: `userId`, `userRole`
- **Error Handling**: 
  - 401 if token missing
  - 401 if token invalid or expired
  - Logs authentication failures
- **Interface**: `AuthRequest extends Request` with `userId?` and `userRole?` properties

#### **2.2.2 HTTPS Redirect Middleware** (`httpsRedirect.ts`)
- **Behavior**: Production-only enforcement
- **Implementation**: Checks `x-forwarded-proxy` header (Render reverse proxy)
- **Fallback**: Redirects to HTTPS with 301 status if protocol != 'https'

#### **2.2.3 Rate Limiting Middleware** (`rateLimits.ts`)
- **Global Limiter**: 
  - Production: 300 req/15min
  - Development: 2000 req/15min
  - Skips `/health` endpoint
- **Specialized Limiters**:
  | Endpoint | Production | Dev | Purpose |
  |----------|-----------|-----|---------|
  | `/products` GET | 60/min | unlimited | Prevent scraping |
  | `/orders` POST | 10/hour | unlimited | Prevent order spam |
  | `/cart` (writes) | 60/5min | unlimited | Prevent flooding |
  | `/reviews` POST | 5/hour | unlimited | Prevent spam |
  | `/coupons/validate` | 20/15min | unlimited | Prevent brute-force |
  | `/addresses` POST | 10/hour | unlimited | Prevent flooding |
  | `/auth/login` | 10/15min | unlimited | Brute-force protection |
  | `/auth/signup` | 3/hour | unlimited | Registration spam |
  | `/auth/otp-*` | 5/15min | unlimited | OTP spam |

#### **2.2.4 Request Logger Middleware** (`requestLogger.ts`)
- **Logs**: Method, path, IP, status, duration
- **Anomaly Detection**:
  - Missing user-agent (common in automation)
  - Suspicious user-agents: sqlmap, nikto, nmap, curl, python-requests
  - Slow requests (>5s)
  - 4xx/5xx errors and rate limit hits (429)
- **Uses Custom Logger**: `logger.info()`, `logger.warn()`, `logger.error()`, `logger.suspiciousRequest()`

### 1.3 Database Connection

**Pool Configuration** (`db.ts`):
- **Type**: PostgreSQL connection pooling
- **Max Connections**: 20
- **Idle Timeout**: 30 seconds
- **Connection Timeout**: 5 seconds
- **SSL**: 
  - Production: Enforce SSL, reject self-signed certs
  - Development: Allow self-signed certs
- **Keep-Alive**: Enabled to prevent idle disconnection

---

## 2. API ROUTES SPECIFICATION

### 2.1 Authentication Routes (`/api/v1/auth`)

| Method | Endpoint | Auth | Rate Limit | Purpose |
|--------|----------|------|-----------|---------|
| POST | `/signup` | No | 3/hour | Register new user |
| POST | `/login` | No | 10/15min | Authenticate user |
| POST | `/refresh-token` | No | Global | Refresh access token |
| POST | `/verification/sendOTP` | No | 5/15min | Send OTP for verification |
| POST | `/verification/verifyOTP` | No | Global | Verify OTP and confirm email |
| POST | `/forgetPassword/sendOTP` | No | 5/15min | Send password reset OTP |
| POST | `/forgetPassword/verifyOTP` | No | Global | Verify password reset OTP |

**Signup Implementation**:
- **Validation**: 
  - Name, email, password required
  - Strong password: min 8 chars, ≥1 letter, ≥1 number
  - Valid email format check
- **Database Operations**:
  - Hash password with bcrypt (salt: 12)
  - Insert user with default role 'customer'
  - Auto-create refresh token (30-day expiry)
- **Response**: 
  - User object (normalized)
  - Access token (15-min expiry)
  - Refresh token (30-day expiry)
- **Error Handling**: 
  - 409 Conflict if email/mobile already registered
  - 400 Bad Request for validation failures

**Login Implementation**:
- **Supports**: Email or username authentication
- **Security**:
  - Constant-time response to prevent user enumeration
  - Account deactivation check
  - Social login path detection
- **Response**: User object + tokens

### 2.2 Product Routes (`/api/v1/products`)

| Method | Endpoint | Auth | Rate Limit | Purpose |
|--------|----------|------|-----------|---------|
| GET | `/search?q=` | No | 60/min | Full-text product search with related products |
| GET | `/nearby?lat=&lng=` | No | Global | Category counts for nearby categories (4: Men, Women, Kids, Makeup) |
| GET | `/fresh-categories` | No | Global | Top 5 newest categories by product creation date |
| GET | `/category/:categoryName` | No | 60/min | Paginated products by category name |
| GET | `/?page=&limit=` | No | 60/min | Paginated all products (limit: 200, default: 50) |
| GET | `/:id` | No | Global | Get single product details |

**Search Implementation**:
- **Features**:
  - Full-text search on `product_name`
  - Normalizes queries: "keychain" == "key chain"
  - Returns related products from same deepest_category_name
  - Excludes out-of-stock products
- **Response**: 
  ```json
  {
    "success": true,
    "products": [...],
    "related": [...]
  }
  ```
- **Product Object** (normalized):
  ```
  productId, userId, productName, description, categoryId,
  deepestCategoryName, categoryPath, price, quantity, inStock,
  images[], timeStamp (created_at), rating,
  sizes[] (optional), colors[] (optional), sizeQuantities {},
  attributes {}
  ```

**Category Filtering**:
- Uses `LOWER()` matching on `deepest_category_name`
- Also searches `category_path` JSONB array by element name
- Pagination: max 500 items per page
- Returns: `products[]`, `pagination{}` (currentPage, totalPages, hasNextPage, hasPrevPage)

**Nearby Categories**:
- Hard-coded 4 categories: Men, Women, Kids, Makeup
- Returns: name, rootCategory, subCategory, count, imageUrl

### 2.3 Cart Routes (`/api/v1/cart`, Auth Required)

| Method | Endpoint | Purpose |
|--------|----------|---------|
| GET | `/count` | Returns cart item count |
| GET | `/` | Get full cart with product details |
| POST | `/` | Add product to cart (quantity optional, default 1) |
| PUT | `/:productId` | Update cart item quantity |
| DELETE | `/:productId` | Remove item from cart |
| DELETE | `/` | Clear entire cart |

**Cart Logic**:
- Joins `cart_items` with `products` table
- Includes current product price (may differ from price_at_add)
- Flags items:
  - `isAvailable`: in_stock AND stock_qty ≥ cart quantity
  - `hasPriceChanges`: priceAtAdd ≠ current_price
- Returns: `totalItems`, `totalAmount`, `hasUnavailableItems`, `hasPriceChanges`
- **Rate Limit on Writes**: 60/5min per user

### 2.4 Order Routes (`/api/v1/orders`, Auth Required)

| Method | Endpoint | Purpose |
|--------|----------|---------|
| GET | `/` | List user's orders (paginated, 20 per page default) |
| GET | `/:id` | Get order details with items |
| POST | `/` | Create new order from cart |

**Create Order Process**:
1. Syncs cart items from request body if DB cart empty
2. Validates shipping address exists
3. Computes totals:
   - Base: sum of product prices × quantities
   - Shipping: ₹49 if total < ₹500, else free
   - Tax: 18% GST on base amount
4. Identifies primary seller (seller with most items by value)
5. Creates order with status='pending', payment_status='pending'
6. Clears user's cart
7. Sends notifications:
   - **Customer**: Order confirmation with all items, total, shipping address
   - **Each Seller**: New order notification with their items
8. **Estimated Delivery**: order_date + 5 days (Asia/Kolkata timezone)
9. **Response**:
   ```json
   {
     "orderId": "...",
     "orderNumber": "ZP-{id}",
     "items": [...],
     "finalAmount": number,
     "shippingAddress": {...}
   }
   ```

**Order Object** (normalized):
```
id, orderNumber, userId, status (pending|confirmed|shipped|delivered|cancelled|returned),
paymentStatus (pending|completed|failed|refunded),
totalAmount, shippingAmount, taxAmount, finalAmount,
shippingAddress {}, paymentMethod (razorpay|cod|wallet), paymentId,
estimatedDelivery, trackingNumber, notes, items[], createdAt, updatedAt
```

**Rate Limit**: 10 orders/hour per user

### 2.5 User Routes (`/api/v1/users`, Auth Required unless specified)

| Method | Endpoint | Auth | Purpose |
|--------|----------|------|---------|
| GET | `/orders` | Yes | Duplicate: User's orders (paginated) |
| GET | `/shipping-addresses` | Yes | Get user's saved addresses |
| GET | `/:id` | Yes | Get user profile (owner-only) |
| PUT | `/profileDetails` | Yes | Update user profile |
| POST | `/shipping-address` | Yes | Add new shipping address |

**Profile Update Fields**:
```
name, userName, dob, gender, profileImage,
receivePushNotifications, receiveEmailUpdates, receiveOrderUpdates
```
- **Rate Limit on POST /shipping-address**: 10/hour

**User Object** (normalized):
```
id, name, email, mobile, userName, userRole (customer|seller|admin),
isVerified, dob, gender, profileImage, receivePushNotifications,
receiveEmailUpdates, receiveOrderUpdates, timeStamp
```

### 2.6 Wallet Routes (`/api/v1/wallet`, Auth Required)

| Method | Endpoint | Purpose |
|--------|----------|---------|
| GET | `/` | Get wallet balance + last 20 transactions |
| POST | `/credit` | Credit wallet (internal: refunds) |
| POST | `/debit` | Debit wallet (for wallet payments) |

**Implementation**:
- Auto-creates wallet if doesn't exist (balance = 0)
- Transactions table records: id, type (credit/debit), amount, description, reference_id, created_at
- **Debit Validation**: Rejects if insufficient balance
- **Response**: newBalance after transaction

### 2.7 Wishlist Routes (`/api/v1/wishlist`, Auth Required)

| Method | Endpoint | Purpose |
|--------|----------|---------|
| GET | `/count` | Wishlist item count |
| GET | `/` | Get wishlist (paginated, 20 default) |
| POST | `/` | Add product to wishlist |
| DELETE | `/:productId` | Remove from wishlist |
| DELETE | `/clear` | Clear entire wishlist |

**Wishlist Uniqueness**:
- Returns 409 Conflict if product already in wishlist
- Joins with products table to include product details

### 2.8 Coupon Routes (`/api/v1/coupons`)

| Method | Endpoint | Auth | Rate Limit | Purpose |
|--------|----------|------|-----------|---------|
| GET | `/` | No | Global | List all active coupons |
| POST | `/validate` | Yes | 20/15min | Validate coupon against order total |

**Coupon Data**:
```
id, code, description, discountType (percentage|fixed),
discountValue, minOrderAmount, maxDiscountAmount,
validUntil, usageLimit, usageCount, isActive,
status (active|expired|used)
```

**Validation Logic**:
- Checks: is_active, valid_until > NOW(), usage_count < usage_limit
- Validates minimum order amount
- Calculates discount:
  - If percentage: (orderTotal × discountValue%) capped by maxDiscountAmount
  - If fixed: discountValue flat amount
- Returns: discount amount for order summary

### 2.9 Notification Routes (`/api/v1/notifications`)

| Method | Endpoint | Auth | Purpose |
|--------|----------|------|---------|
| GET | `/new-order/count` | No | Get seller's unread new_order notification count |
| POST | `/new-order` | No | Get seller's unread new_order notifications + full order details |

**Implementation** (Seller Notifications):
- Sellers receive notifications when they have items in new orders
- Endpoint used by seller dashboard to fetch orders
- Notifications auto-marked as read after fetch
- **Query**: `?sellerId=xxx`

**Notification Types**:
- `new_order`: Sent to customer (order confirmation) AND to each seller with items
- Data includes: orderId, orderNumber, itemCount, total, items, shippingAddress, paymentMethod

---

## 3. FRONTEND ANALYSIS

### 3.1 App Structure

**Framework**: Expo (React Native)  
**Navigation**: Expo Router (file-based routing)  
**Layouts**: 
- Root: `/app/_layout.tsx` (provider nesting, auth redirect)
- Tabs: `/app/(tabs)/_layout.tsx` (bottom tab navigation)
- Auth: `/app/auth/_layout.tsx` (stack navigation for auth flow)

### 3.2 Provider Architecture

**Context Providers** (nested in this order):
1. **SearchProvider**: Search state
2. **UserProvider**: Authentication, user profile
3. **CartProvider**: Cart items, coupon application
4. **WishlistProvider**: Wishlist items
5. **CheckoutProvider**: Selected address, payment method, delivery type
6. **PaymentProvider**: Saved cards and UPI methods
7. **AddressProvider**: Saved shipping addresses
8. **OrderProvider**: User's orders list

**Keep-Alive Service**: Runs continuously to prevent backend timeout during development

### 3.3 Authentication Flow

**Screens** (`/app/auth/`):
1. **login.tsx**: Email/username + password login
2. **signup.tsx**: Name, email, mobile, password registration
3. **forgot-password.tsx**: Initiate password reset (email/mobile)
4. **verify-otp.tsx**: Verify OTP after signup or email verification
5. **verify-reset-otp.tsx**: Verify OTP for password reset
6. **reset-password.tsx**: Set new password after OTP verification

**Services Integrations**:
- `authService.signup()` → POST `/auth/signup`
- `authService.login()` → POST `/auth/login`
- `authService.sendOTP()` → POST `/auth/verification/sendOTP`
- `authService.verifyOTP()` → POST `/auth/verification/verifyOTP`
- `authService.sendPasswordResetOTP()` → POST `/auth/forgetPassword/sendOTP`
- `authService.verifyPasswordResetOTP()` → POST `/auth/forgetPassword/verifyOTP`

**Token Management**:
- Access Token: Stored in AsyncStorage (`@zpin_access_token`)
- Refresh Token: Stored in AsyncStorage (`@zpin_refresh_token`)
- Auto-refresh on 401 response
- Tokens sent via:
  - Cookie header (primary): `token={accessToken}`
  - Authorization header (fallback): `Bearer {accessToken}`
  - Custom header (fallback): `x-auth-token`

**Auth Guard** (in root layout):
- Redirects unauthenticated users to `/auth/login`
- Redirects authenticated users away from `/auth/*` to `/(tabs)`

### 3.4 Main Navigation Tabs

**Tab Routes** (`/app/(tabs)/`):
1. **index.tsx (Home)**: Product discovery, search, nearby categories
2. **categories.tsx**: Category browser
3. **cart.tsx**: View/manage cart, apply coupons, checkout
4. **product-listing.tsx** (hidden): Filtered product list
5. **profile.tsx**: User profile & settings

**Tab Bar** (`TabBar`): Custom bottom tab navigation with cart/wishlist badges

### 3.5 Product Discovery

**Home Screen** (`index.tsx`):
- Search bar integration with `productService.searchProducts()`
- Nearby categories section (using `productService.getNearbyCategories()`)
- Fresh categories section (new products)
- Product recommendations
- Wishlist/cart quick-access

**Product Listing Screen** (`product-listing.tsx`):
- Filterable product grid by category
- State: sorting, price ranges, brands, ratings, discounts
- **Services**:
  - `productService.getProductsByCategory()`
  - Wishlist integration via `useWishlist()`
- Infinite scroll with pagination
- Pull-to-refresh

**Product Detail Screen** (`/product/[id].tsx`):
- Product carousel with images
- Product specs: price, stock, description
- Variant selector (color, size)
- Delivery option selector (instant/standard)
- Related products
- **Features**:
  - Add to cart
  - Add to wishlist
  - View reviews (from API)
  - Active coupon display
- **Services**:
  - `productService.getProductById()`
  - `cartService.addToCart()`
  - `wishlistService.addToWishlist()`
  - API call to fetch reviews

### 3.6 Shopping Cart

**Cart Screen** (`(tabs)/cart.tsx`):
- Display cart items with images, prices, quantities
- Edit quantities
- Remove items
- Clear cart
- Price breakdown: subtotal, savings, tax/fees
- Coupon application section
- "Proceed to Checkout" button

**Cart Management** (`CartContext`):
- Syncs with backend on auth
- Falls back to AsyncStorage if offline
- Coupon state management
- **Methods**:
  - `addToCart(product, color?, size?)`
  - `removeFromCart(cartItemId)`
  - `updateQuantity(cartItemId, qty)`
  - `clearCart()`
  - `applyCoupon(code)` → `couponService.validateCoupon()`
  - `removeCoupon()`

**Services**:
- `cartService.getCart()` → GET `/cart`
- `cartService.addToCart()` → POST `/cart`
- `cartService.updateCartItem()` → PUT `/cart/:productId`
- `cartService.removeFromCart()` → DELETE `/cart/:productId`
- `cartService.getCartCount()` → GET `/cart/count`

### 3.7 Checkout Flow

**Checkout Steps** (ordered screens):
1. **Address Screen** (`checkout/address.tsx`):
   - Show saved addresses
   - Add new address button
   - Select default address
   - Proceed to payment

2. **Payment Screen** (`checkout/payment.tsx`):
   - Show selected address
   - Payment method selection (COD, Card, UPI, Wallet, Razorpay)
   - Order summary with totals
   - Apply delivery type (Standard/Instant)
   - **Services**:
     - `orderService.createOrder()` → POST `/orders`
     - `paymentService.createPayment()` → POST `/payments/create` (if payment-based)
   - On success: Clear cart, redirect to orders profile

3. **Checkout Summary Screen** (`checkout/summary.tsx`):
   - Final review before order creation
   - Items, totals, address, payment method

**Contexts Used**:
- `useCheckout()`: Selected address, payment method, delivery type
- `useCart()`: Cart items, totals, coupons
- `useAddress()`: Saved addresses
- `usePayment()`: Payment methods (cards, UPIs)

### 3.8 User Profile & Management

**Profile Screens** (`/app/profile/`):

| Screen | Features | Backend Call |
|--------|----------|--------------|
| **profile.tsx** | View profile info, orders, addresses, wishlist, returns, settings | GET `/users/:id` |
| **edit-profile.tsx** | Update name, DOB, gender, phone, profile picture | PUT `/users/profileDetails` |
| **addresses.tsx** | List saved addresses, set default | GET `/users/shipping-addresses` |
| **add-address.tsx** | Form to add new address | POST `/users/shipping-address` |
| **orders.tsx** | Paginated order history | GET `/users/orders` |
| **order-details.tsx** | Full order details with items, status | GET `/orders/:id` |
| **track-order.tsx** | Order status, estimated delivery, tracking | GET `/orders/:id/track` (⚠️ not implemented backend) |
| **cancel-order.tsx** | Initiate order cancellation | PATCH `/orders/:id/cancel` (⚠️ not implemented backend) |
| **returns.tsx** | View returnable items, refund status history | GET `/orders` (local filtering) |
| **coupons.tsx** | Browse available coupons | GET `/coupons` |
| **payment-methods.tsx** | Manage saved cards and UPIs | Local AsyncStorage only |
| **add-payment-method.tsx** | Add new card/UPI | Local AsyncStorage only |
| **wishlist.tsx** | View wishlist items | GET `/wishlist` |
| **help-center.tsx** | FAQ/support links | Hardcoded content |

**Profile Context Management**:
- **UserContext**: 
  - Auto-sync profile on app launch
  - Fields: id, name, email, mobile, dob, gender, profileImage, preferences
  - Storage: AsyncStorage + backend sync
  - Server fetch on window focus
  
- **AddressContext**: 
  - Load addresses on auth
  - Add address (local + API)
  - Set default
  - Storage: AsyncStorage backup
  
- **OrderContext**: 
  - Load orders on auth
  - Refresh orders on profile visit
  - Cancel/return operations
  - Storage: In-memory only
  
- **PaymentContext**: 
  - Local-only storage (AsyncStorage)
  - No backend integration
  - Add/update/delete cards and UPIs

### 3.9 Service Layer & API Integration

**API Configuration** (`services/api.ts`):
- Base URL resolution:
  1. `EXPO_PUBLIC_API_URL` env var (highest priority)
  2. Expo Go debugger host IP
  3. Android emulator default: `10.0.2.2:5000`
  4. Fallback: `localhost:5000`
- Endpoint: `/api/v1/`
- Timeout: 60 seconds (accommodates Render cold starts)
- Interceptors:
  - **Request**: Attach auth tokens
  - **Response**: Handle 401 refreshes, SESSION_EXPIRED events

**Available Services**:

| Service | Endpoints |
|---------|-----------|
| **authService** | signup, login, sendOTP, verifyOTP, sendPasswordResetOTP, verifyPasswordResetOTP, logout |
| **productService** | getProducts, getProductById, getNearbyCategories, searchProducts, getProductsBySeller, getRecommended |
| **cartService** | getCart, addToCart, updateCartItem, removeFromCart, clearCart, getCartCount |
| **orderService** | createOrder, getOrders, getOrderById, cancelOrder, trackOrder, returnOrder, downloadInvoice |
| **userService** | getUsers, getUserById, getUserOrders, updateProfile, updateProfileJson, addShippingAddress, getShippingAddresses |
| **couponService** | getCoupons, validateCoupon |
| **walletService** | getWallet, creditWallet, debitWallet |
| **wishlistService** | getWishlist, getWishlistCount, addToWishlist, removeFromWishlist, clearWishlist |
| **paymentService** | createPayment, verifyPayment, retryPayment, getPaymentDetails, requestRefund |

---

## 4. INTEGRATION POINTS ANALYSIS

### 4.1 State Management Flow

```
UserProvider (auth state)
    ↓
CartProvider (+ CouponService)
    ↓
CheckoutProvider (+ OrderService)
    ↓
AddressProvider (+ UserService)
    ↓
OrderProvider
    ↓
PaymentProvider
```

### 4.2 Frontend-to-Backend Service Mapping

**Complete Integrations**:
- ✅ Authentication: signup, login, logout, token refresh
- ✅ Product Discovery: search, browse, details, categories
- ✅ Cart Management: add, remove, update, clear, count
- ✅ Orders: create, list, get details
- ✅ User Profile: get, update profile details
- ✅ Addresses: add, list, set default
- ✅ Wishlist: add, remove, list, count, clear
- ✅ Coupons: browse, validate
- ✅ Wallet: get balance, view transactions

**Partial Integrations**:
- ⚠️ Payment: Frontend calls `paymentService.createPayment()` but backend route `/payments/create` not implemented
- ⚠️ Order Tracking: Frontend calls `orderService.trackOrder()` but backend route `/orders/:id/track` not implemented
- ⚠️ Order Cancellation: Frontend calls `orderService.cancelOrder()` but backend route `/orders/:id/cancel` not implemented
- ⚠️ Order Returns: Frontend calls `orderService.returnOrder()` but backend route `/orders/:id/return` not implemented
- ⚠️ Payment Methods: Frontend stores locally only, no backend sync

**Not Integrated**:
- ❌ Seller Notifications: Backend has `/notifications/new-order` endpoint but frontend has no integration
- ❌ Product Reviews: Backend has no review routes; frontend attempts to fetch reviews but fails
- ❌ Refunds: Backend wallet has credit/debit but no automated refund flow
- ❌ Multi-vendor notifications: Backend sends seller notifications but frontend doesn't consume

---

## 5. FEATURE COMPLETENESS MATRIX

### 5.1 COMPLETE FEATURES
*(Backend routes + Frontend screens fully implemented & integrated)*

| Feature | Backend Endpoints | Frontend Screens | Status |
|---------|-------------------|------------------|--------|
| **User Authentication** | Login, Signup, Token Refresh, OTP Verification | Login, Signup, Forgot Password, OTP Verify, Reset Password | ✅ COMPLETE |
| **Product Discovery** | Search, Browse by Category, Get Details, Nearby Categories | Home, Category Browser, Product Listing, Product Detail | ✅ COMPLETE |
| **Shopping Cart** | Add, Remove, Update, Clear, Get Cart, Count | Cart view, Add-to-cart, Quantity controls | ✅ COMPLETE |
| **Wishlist** | Add, Remove, List, Count, Clear | Wishlist screen, Wishlist toggle on products | ✅ COMPLETE |
| **User Profile** | Get Profile, Update Profile, Get User Orders | Edit Profile, View Orders, View Personal Info | ✅ COMPLETE |
| **Addresses** | Add Address, List Addresses | Add Address, List Addresses, Select Address in Checkout | ✅ COMPLETE |
| **Coupons** | List Coupons, Validate Coupon | Browse Coupons, Apply in Checkout | ✅ COMPLETE |
| **Wallet** | Get Balance, Get Transactions, Credit, Debit | View Wallet Balance, View Transactions | ✅ COMPLETE |
| **Order Creation** | Create Order (POST) | Checkout Summary, Checkout Payment, Order Confirmation | ✅ COMPLETE |
| **Order History** | List Orders, Get Order Details | Orders screen, Order Details screen | ✅ COMPLETE |

### 5.2 PARTIALLY IMPLEMENTED FEATURES
*(Either backend or frontend incomplete)*

| Feature | Backend Status | Frontend Status | Gap | Severity |
|---------|----------------|-----------------|-----|----------|
| **Order Tracking** | ⚠️ Route not implemented | ⚠️ Screen calls missing endpoint | Backend missing `/orders/:id/track` | HIGH |
| **Order Cancellation** | ⚠️ Route not implemented | ⚠️ Screen calls missing endpoint | Backend missing `PATCH /orders/:id/cancel` | HIGH |
| **Order Returns/Refunds** | ⚠️ Route not implemented | ⚠️ Screen calls missing endpoint | Backend missing `POST /orders/:id/return` | HIGH |
| **Payment Gateway Integration** | ⚠️ Route not implemented | ✅ UI ready (COD, Card, UPI, Wallet options) | Backend missing `/payments/create`, `/payments/verify` | CRITICAL |
| **Product Reviews** | ❌ No backend routes | ✅ Display in product detail | Backend not implemented | MEDIUM |
| **Multi-seller Notifications** | ✅ Seller notifications sent | ❌ No frontend integration | Frontend doesn't consume `/notifications/new-order` | MEDIUM |
| **Payment Methods** | ❌ No backend routes | ⚠️ Local storage only | No backend sync for saved cards/UPIs | MEDIUM |
| **Order Invoice Download** | ❌ Route not implemented | ✅ Button in order detail | Backend missing `GET /orders/:id/invoice` | LOW |
| **User Settings** | ✅ Partial implementation | ⚠️ Not all settings persisted | Some preference fields not syncing | LOW |

### 5.3 NOT YET IMPLEMENTED FEATURES
*(Neither backend nor frontend - future work)*

| Feature | Priority | Notes |
|---------|----------|-------|
| **Seller Dashboard** | HIGH | Multi-seller platform requires seller order management console |
| **Admin Dashboard** | HIGH | Product management, user management, analytics |
| **Real-time Notifications** | MEDIUM | WebSocket integration for live order updates |
| **Product Ratings & Reviews** | MEDIUM | Requires backend review schema and endpoints |
| **Wishlist Sharing** | LOW | Social feature; not critical for MVP |
| **Product Comparison** | LOW | UI ready in component but no backend support |
| **Advanced Search Filters** | LOW | Filters UI ready but backend doesn't support all params |
| **Order Filters & Search** | LOW | Frontend filters orders locally only |
| **Delivery Boy Assignment** | LOW | Backend schema has `deliveryBoyId` but not implemented |
| **Push Notifications** | LOW | Backend sends notifications but no mobile push integration |

### 5.4 BROKEN/INCONSISTENT FEATURES
*(Where implementations exist but have issues)*

| Issue | Frontend | Backend | Root Cause | Impact |
|-------|----------|---------|-----------|--------|
| **Review Endpoint Mismatch** | Calls `products/:id/reviews` | No route implemented | Missing backend | Reviews fail to load |
| **Payment Method Sync** | Local storage only | No endpoints | No integration designed | Payment methods lost on app reinstall |
| **Product Image Formats** | Expects `images[]` array | Returns JSONB array + joins | Type mismatch | Image display inconsistent |
| **Order Item Variant** | Stores color/size | Backend doesn't track variants | Schema gap | Variant info lost in orders |
| **Wallet Credit/Debit** | No auto-trigger on refunds | Manual endpoints exist | Integration missing | Refunds must be manual |
| **Coupon Update Count** | Frontend doesn't call | Backend increments `usage_count` | Manual only | Usage tracking untested |
| **User Preferences Fields** | Props in UserContext | Some columns missing from schema | Partial schema | Preference updates may fail |

---

## 6. ERROR HANDLING & SECURITY

### 6.1 Error Handling Patterns

**Backend**:
- ✅ Global error handler with 500 response
- ✅ 404 handler for missing routes
- ✅ Structured error responses: `{ success: false, message: "..." }`
- ✅ Validation error handling with specific messages
- ✅ Database error detection (e.g., unique constraint violations)
- ✅ Logging of all errors with context (path, IP, status)

**Frontend**:
- ✅ API error handler: `handleApiError(error)`
- ✅ 401 token refresh with retry logic
- ✅ SESSION_EXPIRED signal for forced re-login
- ⚠️ Inconsistent error messaging to users
- ⚠️ No retry logic for failed API calls (except auth)
- ⚠️ Offline detection not implemented

### 6.2 Security Implementation

**Backend Security**:
- ✅ HTTPS redirect in production
- ✅ HSTS headers with 1-year max-age
- ✅ JWT token validation on protected routes
- ✅ Brute-force rate limiting (login: 10/15min, signup: 3/hour)
- ✅ Coupon brute-force protection (20/15min)
- ✅ Password hashing: bcrypt with salt=12
- ✅ Timing attack prevention on login
- ✅ SQL injection prevention (parameterized queries)
- ✅ Suspicious user-agent detection
- ✅ Request logging for audit trail

**Frontend Security**:
- ✅ Tokens stored in AsyncStorage (persistent)
- ⚠️ No encryption of stored tokens
- ✅ Tokens sent via headers (not URL params)
- ✅ Cookie header support for HttpOnly fallback
- ⚠️ No HTTPS enforcement check on frontend
- ⚠️ No certificate pinning

**Database Security**:
- ✅ SSL connections in production
- ✅ Connection pooling (attack surface reduction)
- ✅ Prepared statements (parameterized queries)
- ⚠️ No field-level encryption

---

## 7. PERFORMANCE OBSERVATIONS

### 7.1 Backend Performance

**Strengths**:
- ✅ Connection pooling (max 20, prevents exhaustion)
- ✅ Rate limiting (protects against DoS)
- ✅ Request logging (identifies slow queries)
- ✅ Keep-alive enabled (prevents reconnects)
- ✅ Helmet middleware (security overhead minimal)

**Concerns**:
- ⚠️ No caching layer (Redis not used)
- ⚠️ Product search uses LIKE patterns (could be slow with large datasets)
- ⚠️ Full product join with images/reviews on every request
- ⚠️ No database indexes mentioned
- ⚠️ File size limit: 50KB for uploads (enforced by Express)

### 7.2 Frontend Performance

**Strengths**:
- ✅ Context caching (prevents repeated API calls in same session)
- ✅ AsyncStorage fallback (works offline)
- ✅ Keep-alive service (maintains session)
- ✅ Pagination support (infinite scroll)
- ✅ Lazy loading potential with Expo Router

**Concerns**:
- ⚠️ No image caching strategy visible
- ⚠️ Full cart re-fetch on every auth change
- ⚠️ No lazy loading on lists
- ⚠️ 60s timeout for API calls (high latency tolerance)

---

## 8. DATABASE SCHEMA OBSERVATIONS

**Tables Inferred from Queries**:
1. `users` - User profiles with preferences
2. `products` - Product catalog with category path JSONB
3. `product_images` - Product images (1:many)
4. `product_reviews` - Product ratings and reviews
5. `cart_items` - Shopping cart items (user:product:quantity)
6. `wishlists` - Wishlist items (user:product)
7. `orders` - Orders with seller reference
8. `order_items` - Order line items (1:many)
9. `addresses` - User shipping addresses
10. `coupons` - Coupon definitions with usage tracking
11. `wallets` - User wallet accounts
12. `wallet_transactions` - Wallet transaction log
13. `notifications` - Notification records
14. `refresh_tokens` - Refresh token storage

**Notes**:
- ✅ Proper JSONB for complex types (category_path, extracted_attributes)
- ✅ Timestamp columns: created_at, updated_at on all tables
- ✅ Foreign keys implied (product_id, user_id, etc.)
- ✅ Nullable fields for optional data (mobile, landmark, etc.)
- ⚠️ No explicit schema documentation visible
- ⚠️ No indexes documented for performance

---

## 9. DEPLOYMENT & INFRASTRUCTURE

### 9.1 Backend Deployment

**Platform**: Render (reverse proxy with SSL termination)  
**Configuration**:
- Environment variables loaded from .env (gitignored)
- Cold start tolerance: 60s timeout
- HTTP → HTTPS redirect enabled
- Trusted proxy: Render's reverse proxy
- Health check: GET `/health` (200 + timestamp)

**Database Deployment**:
- PostgreSQL on external provider (AWS RDS, Render, etc.)
- Network access: Host/port-based
- SSL enforcement in production
- Connection pooling at app level

### 9.2 Frontend Deployment

**Platform**: Expo Go (development) / EAS Build (production)  
**Configuration**:
- Base URL: Environment-driven (`EXPO_PUBLIC_API_URL`)
- Fallback URLs: Emulator support, Expo Go IP detection
- Build targets: Android, iOS (via EAS)

---

## 10. RECOMMENDED FIXES & IMPROVEMENTS

### 10.1 CRITICAL (Blocking Production)

1. **Implement Payment Gateway Integration**
   - Backend: Create `/payments/create` and `/payments/verify` endpoints
   - Backend: Add Razorpay/Stripe integration
   - Frontend: Wire payment screens to backend
   - Status Effect: BLOCKS checkout

2. **Implement Order Cancellation**
   - Backend: `PATCH /orders/:id/cancel` endpoint
   - Frontend: Hook up cancel-order.tsx screen
   - Include refund logic (wallet credit or original method revert)
   - Status Effect: BLOCKS cancel-order feature

3. **Implement Order Returns**
   - Backend: `POST /orders/:id/return` endpoint
   - Frontend: Hook up returns.tsx screen
   - Include refund calculation and wallet credit
   - Status Effect: BLOCKS returns/refunds feature

### 10.2 HIGH PRIORITY (Affecting User Experience)

4. **Fix Product Reviews**
   - Backend: Add review endpoints (POST, GET, DELETE)
   - Frontend: reviews.tsx screen
   - Database: Ensure schema has review table
   - Status Effect: Reviews currently non-functional

5. **Implement Order Tracking**
   - Backend: `GET /orders/:id/track` endpoint with location history
   - Frontend: Wire track-order.tsx to backend
   - Consider: Integration with delivery partner APIs
   - Status Effect: Users can't track orders

6. **Seller Notifications Integration**
   - Backend: Already sends notifications on new orders ✅
   - Frontend: Create seller dashboard to consume `/notifications/new-order`
   - Implement real-time updates (WebSocket or polling)
   - Status Effect: Multi-vendor feature incomplete

### 10.3 MEDIUM PRIORITY (Feature Completeness)

7. **Payment Methods Backend**
   - Backend: Create endpoints for card/UPI management
   - Frontend: Sync PaymentContext with backend
   - Database: Add payment_methods table
   - Status Effect: Payment methods lost on reinstall

8. **Order Invoice Download**
   - Backend: `GET /orders/:id/invoice` endpoint
   - Generate PDF from order data
   - Include tax, items, address, payment method
   - Status Effect: Users can't download invoices

9. **Coupon Usage Tracking**
   - Frontend: Call increment after successful order payment
   - Backend: Verify coupon not over-used before applying
   - Status Effect: Coupons may be over-used if multiple simultaneous orders

10. **Advanced Search Filters**
    - Backend: Add filter parameters to `/products` endpoint
    - Frontend: Wire FilterModal to backend filters
    - Support: price range, brand, rating, discount
    - Status Effect: Filters only work locally on client

### 10.4 LOW PRIORITY (Nice-to-Have)

11. **Real-time Notifications (WebSocket)**
    - Upgrade notification system to WebSocket
    - Real-time order status updates
    - Live cart sync across devices
    - Status Effect: Minor UX improvement

12. **Image Optimization**
    - Add image compression on upload
    - Implement responsive image sizing
    - Cache strategy on frontend
    - Status Effect: Performance optimization

---

## 11. QUICK REFERENCE: API COMPLETENESS

### Routes Implemented ✅
- auth/* (except refresh-token appears to be partial)
- products/* (GET endpoints)
- cart/*
- orders/* (POST, GET only)
- users/* (partial - missing some endpoints)
- wallet/*
- wishlist/*
- coupons/*
- notifications/new-order

### Routes Missing ❌
- products/:id (GET single product)
- products/addProduct (create product)
- products/:id (PUT, DELETE - seller endpoints)
- products/seller/:userId
- orders/:id/cancel
- orders/:id/return
- orders/:id/track
- orders/:id/invoice
- orders/:id/payment/verify
- payments/*
- users/refresh-token
- users/payment-methods
- users/:id/addresses/:id (update/delete)
- reviews/* (all endpoints)

---

## 12. CONCLUSION

RuFlo is a **well-architected full-stack application** with comprehensive backend middleware, proper error handling, and rate limiting. The frontend provides a complete user journey from discovery to checkout. 

**Strengths**:
- ✅ Clean separation of concerns (backend, frontend, services)
- ✅ Proper authentication with token refresh
- ✅ State management via React Context
- ✅ Multi-seller order notification system
- ✅ Comprehensive rate limiting strategy
- ✅ Good logging and security practices

**Critical Gaps**:
- ❌ Payment gateway integration (NO PAYMENT PROCESSING)
- ❌ Order cancellation/returns (INCOMPLETE)
- ❌ Order tracking (INCOMPLETE)
- ⚠️ Product reviews (NOT IMPLEMENTED)
- ⚠️ Payment methods backend (LOCAL STORAGE ONLY)

**Estimated Effort to Production Ready**:
- Payment integration: 2-3 weeks
- Order management (cancel/return/track): 1-2 weeks
- Reviews system: 1 week
- Testing & deployment: 1-2 weeks
- **TOTAL: 1-2 months** (assuming Razorpay integration and experienced team)

**Overall Assessment**: **BETA READY** with critical payment functionality missing. Suitable for internal testing and demo, but not for production without payment integration.

---

**Report Generated**: April 2026  
**Analyzer**: Code Analysis Agent  
**Confidence Level**: HIGH (comprehensive codebase review)
