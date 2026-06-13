# ZPinEcom — Test Case Specification

**Standard Format:** IBM Rational Rose Test Case Template
**Project:** ZPinEcom (E-commerce Mobile Application)
**Document Version:** 1.0
**Prepared By:** QA Team
**Date Prepared:** 2026-06-13
**Reviewed By:** ___________
**Approved By:** ___________

---

## 1. Document Information

| Field | Description |
|-------|-------------|
| Project Name | ZPinEcom |
| Application Type | E-commerce Mobile Application (Android / iOS / Web) |
| Backend Stack | Node.js, Express, TypeScript, PostgreSQL, Redis |
| Frontend Stack | React Native, Expo Router, TypeScript |
| Test Environment | Staging Server + Expo Go / Android Emulator |
| Test Tool | Jest, Supertest, Manual UI Testing |
| Document Type | Master Test Case Specification |

---

## 2. Test Case Format Legend (IBM Rational Rose Standard)

Each test case is documented with the following fields:

| Field | Description |
|-------|-------------|
| **Test Case ID** | Unique identifier (e.g., TC_AUTH_001) |
| **Test Case Name** | Short descriptive title |
| **Module** | Functional area being tested |
| **Test Objective** | Purpose / what the test validates |
| **Pre-conditions** | State of system before test execution |
| **Test Data / Input** | Inputs supplied to the system |
| **Test Steps** | Sequential actions to be performed |
| **Expected Result** | Anticipated behavior / output |
| **Actual Result** | To be filled during execution |
| **Status** | Pass / Fail / Blocked / Not Executed |
| **Severity** | Critical / High / Medium / Low |
| **Priority** | P1 / P2 / P3 |
| **Test Type** | Functional / Negative / Boundary / Integration / Security |
| **Remarks** | Additional notes |
| **Executed By** | Tester name |
| **Execution Date** | DD-MM-YYYY |

---

## 3. MODULE: USER AUTHENTICATION

---

### TC_AUTH_001 — User Registration with Valid Data

| Field | Detail |
|-------|--------|
| **Test Case ID** | TC_AUTH_001 |
| **Test Case Name** | New user registration with valid credentials |
| **Module** | Authentication / Signup |
| **Test Objective** | Verify that a new user can successfully register using a valid name, email, mobile, and strong password. |
| **Pre-conditions** | 1. App is launched. 2. User is on the Signup screen. 3. Email/mobile not already registered. |
| **Test Data / Input** | Name: "Rahul Sharma"; Email: "rahul@test.com"; Mobile: "9876543210"; Password: "Test@1234"; Confirm Password: "Test@1234" |
| **Test Steps** | 1. Navigate to Signup screen. 2. Enter Name. 3. Enter Email. 4. Enter Mobile. 5. Enter Password and Confirm Password. 6. Accept Terms & Conditions. 7. Tap "Sign Up" button. |
| **Expected Result** | 1. Account is created. 2. OTP is sent to registered email. 3. User is redirected to OTP verification screen. 4. `users` table contains the new record with `is_verified = false`. |
| **Status** | Not Executed |
| **Severity** | Critical |
| **Priority** | P1 |
| **Test Type** | Functional / Positive |
| **Remarks** | Verify password is stored as bcrypt hash, not plain text. |

---

### TC_AUTH_002 — Registration with Weak Password

| Field | Detail |
|-------|--------|
| **Test Case ID** | TC_AUTH_002 |
| **Test Case Name** | Reject signup when password fails strength policy |
| **Module** | Authentication / Signup |
| **Test Objective** | Verify the strong password policy rejects weak passwords. |
| **Pre-conditions** | User on Signup screen. |
| **Test Data / Input** | Password: "12345" |
| **Test Steps** | 1. Fill all valid fields. 2. Enter weak password "12345". 3. Tap "Sign Up". |
| **Expected Result** | Error message: "Password must be at least 8 characters with uppercase, lowercase, number, and special character." Signup is blocked. |
| **Status** | Not Executed |
| **Severity** | High |
| **Priority** | P1 |
| **Test Type** | Negative |
| **Remarks** | Refer commit `f71986f` — strong password policy enforcement. |

---

### TC_AUTH_003 — Registration with Existing Email

| Field | Detail |
|-------|--------|
| **Test Case ID** | TC_AUTH_003 |
| **Test Case Name** | Reject signup with duplicate email |
| **Module** | Authentication / Signup |
| **Test Objective** | Verify the system prevents duplicate registration with the same email. |
| **Pre-conditions** | An account with email "rahul@test.com" already exists. |
| **Test Data / Input** | Email: "rahul@test.com" |
| **Test Steps** | 1. Enter already-registered email. 2. Fill other valid fields. 3. Tap "Sign Up". |
| **Expected Result** | Error: "Email already registered. Please log in." Signup is blocked. |
| **Status** | Not Executed |
| **Severity** | High |
| **Priority** | P1 |
| **Test Type** | Negative |
| **Remarks** | — |

---

### TC_AUTH_004 — OTP Verification (Valid Code)

| Field | Detail |
|-------|--------|
| **Test Case ID** | TC_AUTH_004 |
| **Test Case Name** | Verify email using valid OTP |
| **Module** | Authentication / OTP |
| **Test Objective** | Confirm OTP verification activates the account. |
| **Pre-conditions** | Signup is complete; OTP is delivered via email. |
| **Test Data / Input** | OTP: 6-digit code received in email |
| **Test Steps** | 1. Read OTP from email. 2. Enter the 6-digit OTP. 3. Tap "Verify". |
| **Expected Result** | Account is verified. `users.is_verified = true`. User redirected to Home/Profile completion. |
| **Status** | Not Executed |
| **Severity** | Critical |
| **Priority** | P1 |
| **Test Type** | Functional |
| **Remarks** | — |

---

### TC_AUTH_005 — OTP Verification (Invalid / Expired Code)

| Field | Detail |
|-------|--------|
| **Test Case ID** | TC_AUTH_005 |
| **Test Case Name** | Reject invalid or expired OTP |
| **Module** | Authentication / OTP |
| **Test Objective** | Ensure invalid/expired OTP cannot verify account. |
| **Pre-conditions** | OTP has expired (e.g., > 10 minutes) OR wrong code entered. |
| **Test Data / Input** | OTP: "000000" |
| **Test Steps** | 1. Enter incorrect OTP. 2. Tap "Verify". |
| **Expected Result** | Error: "Invalid or expired OTP." User remains on OTP screen with "Resend OTP" available. |
| **Status** | Not Executed |
| **Severity** | High |
| **Priority** | P1 |
| **Test Type** | Negative / Security |
| **Remarks** | Verify `auth_tokens.is_used = true` after successful use to prevent replay. |

---

### TC_AUTH_006 — Login with Valid Credentials

| Field | Detail |
|-------|--------|
| **Test Case ID** | TC_AUTH_006 |
| **Test Case Name** | Successful login with verified account |
| **Module** | Authentication / Login |
| **Test Objective** | Verify a verified user can log in and receive JWT + refresh tokens. |
| **Pre-conditions** | Verified account exists. |
| **Test Data / Input** | Email: "rahul@test.com"; Password: "Test@1234" |
| **Test Steps** | 1. Open Login screen. 2. Enter email and password. 3. Tap "Login". |
| **Expected Result** | Login is successful. Access token + refresh token returned and stored in AsyncStorage. User navigated to Home. |
| **Status** | Not Executed |
| **Severity** | Critical |
| **Priority** | P1 |
| **Test Type** | Functional |
| **Remarks** | Verify entry created in `refresh_tokens`. |

---

### TC_AUTH_007 — Login Blocked for Unverified Email

| Field | Detail |
|-------|--------|
| **Test Case ID** | TC_AUTH_007 |
| **Test Case Name** | Block login for users with unverified email |
| **Module** | Authentication / Login |
| **Test Objective** | Verify the email verification enforcement on login. |
| **Pre-conditions** | Account exists with `is_verified = false`. |
| **Test Data / Input** | Valid email/password of unverified account. |
| **Test Steps** | 1. Enter credentials. 2. Tap "Login". |
| **Expected Result** | Error: "Please verify your email before logging in." Optionally redirect to OTP screen. |
| **Status** | Not Executed |
| **Severity** | High |
| **Priority** | P1 |
| **Test Type** | Security / Negative |
| **Remarks** | Refer commit `f71986f`. |

---

### TC_AUTH_008 — Login with Incorrect Password

| Field | Detail |
|-------|--------|
| **Test Case ID** | TC_AUTH_008 |
| **Test Case Name** | Reject login with wrong password |
| **Module** | Authentication / Login |
| **Test Objective** | Validate password mismatch handling. |
| **Pre-conditions** | Account exists. |
| **Test Data / Input** | Email: "rahul@test.com"; Password: "WrongPass1!" |
| **Test Steps** | 1. Enter email. 2. Enter wrong password. 3. Tap "Login". |
| **Expected Result** | Generic error: "Invalid email or password." (must not disclose which is wrong). |
| **Status** | Not Executed |
| **Severity** | High |
| **Priority** | P1 |
| **Test Type** | Negative / Security |
| **Remarks** | — |

---

### TC_AUTH_009 — Forgot Password Flow

| Field | Detail |
|-------|--------|
| **Test Case ID** | TC_AUTH_009 |
| **Test Case Name** | Reset password via email OTP |
| **Module** | Authentication / Password Reset |
| **Test Objective** | Verify password-reset flow end-to-end. |
| **Pre-conditions** | Account exists and is verified. |
| **Test Data / Input** | Email + OTP + New Password "NewPass@123" |
| **Test Steps** | 1. Tap "Forgot Password". 2. Enter email; submit. 3. Receive OTP. 4. Verify OTP. 5. Enter new password; confirm. 6. Submit. |
| **Expected Result** | Password updated; old password no longer works; new password works on next login. |
| **Status** | Not Executed |
| **Severity** | High |
| **Priority** | P1 |
| **Test Type** | Functional / Security |
| **Remarks** | Verify `password_hash` updated and OTP marked used. |

---

### TC_AUTH_010 — Google Sign-In

| Field | Detail |
|-------|--------|
| **Test Case ID** | TC_AUTH_010 |
| **Test Case Name** | Sign in with Google account |
| **Module** | Authentication / Social Login |
| **Test Objective** | Verify Google OAuth login creates/links account. |
| **Pre-conditions** | Google account configured on device. |
| **Test Data / Input** | Google account credentials |
| **Test Steps** | 1. Tap "Continue with Google". 2. Select Google account. 3. Grant permissions. |
| **Expected Result** | Account created (or linked) with `google_id` populated. User logged in and routed to Home or Complete-Profile screen. |
| **Status** | Not Executed |
| **Severity** | High |
| **Priority** | P2 |
| **Test Type** | Integration |
| **Remarks** | — |

---

### TC_AUTH_011 — Logout

| Field | Detail |
|-------|--------|
| **Test Case ID** | TC_AUTH_011 |
| **Test Case Name** | Logout invalidates tokens |
| **Module** | Authentication |
| **Test Objective** | Verify logout clears local storage and revokes refresh token. |
| **Pre-conditions** | User is logged in. |
| **Test Data / Input** | N/A |
| **Test Steps** | 1. Open Profile tab. 2. Tap "Logout". 3. Confirm. |
| **Expected Result** | Tokens cleared from AsyncStorage; refresh token row deleted from `refresh_tokens`; user routed to Login. |
| **Status** | Not Executed |
| **Severity** | High |
| **Priority** | P1 |
| **Test Type** | Functional / Security |
| **Remarks** | — |

---

## 4. MODULE: PRODUCT BROWSING & SEARCH

---

### TC_PROD_001 — Home Screen Product Listing

| Field | Detail |
|-------|--------|
| **Test Case ID** | TC_PROD_001 |
| **Test Case Name** | Home screen loads approved products |
| **Module** | Product / Home |
| **Test Objective** | Verify home displays only `is_approved = true` and `in_stock = true` products. |
| **Pre-conditions** | At least 5 approved products exist. |
| **Test Data / Input** | N/A |
| **Test Steps** | 1. Launch app. 2. Land on Home tab. |
| **Expected Result** | Products list with image, name, price. Loading skeleton then content. No unapproved/out-of-stock items shown. |
| **Status** | Not Executed |
| **Severity** | Critical |
| **Priority** | P1 |
| **Test Type** | Functional |

---

### TC_PROD_002 — Product Search by Keyword

| Field | Detail |
|-------|--------|
| **Test Case ID** | TC_PROD_002 |
| **Test Case Name** | Search products by keyword |
| **Module** | Product / Search |
| **Test Objective** | Validate keyword search returns relevant results. |
| **Pre-conditions** | Products exist with "shirt" in name/tags. |
| **Test Data / Input** | Search term: "shirt" |
| **Test Steps** | 1. Tap search bar. 2. Type "shirt". 3. Submit. |
| **Expected Result** | Results matching name, category, or search tags are displayed; non-matching items excluded. |
| **Status** | Not Executed |
| **Severity** | High |
| **Priority** | P1 |
| **Test Type** | Functional |

---

### TC_PROD_003 — Category Browse

| Field | Detail |
|-------|--------|
| **Test Case ID** | TC_PROD_003 |
| **Test Case Name** | Browse products by category |
| **Module** | Product / Categories |
| **Test Objective** | Verify category navigation filters products correctly. |
| **Pre-conditions** | Categories and child products configured. |
| **Test Data / Input** | Category: "Men > Footwear" |
| **Test Steps** | 1. Open Categories tab. 2. Select parent → child. |
| **Expected Result** | Listing shows only products in selected `category_path`. |
| **Status** | Not Executed |
| **Severity** | High |
| **Priority** | P2 |
| **Test Type** | Functional |

---

### TC_PROD_004 — Product Detail Page

| Field | Detail |
|-------|--------|
| **Test Case ID** | TC_PROD_004 |
| **Test Case Name** | Product detail screen displays full info |
| **Module** | Product / Detail |
| **Test Objective** | Verify all product fields render correctly. |
| **Pre-conditions** | Product with images, reviews, variants exists. |
| **Test Data / Input** | Valid product ID |
| **Test Steps** | 1. Tap product card from listing. |
| **Expected Result** | Image carousel, name, price, description, rating, reviews, size selection, "Add to Cart" and "Buy Now" CTAs all visible. |
| **Status** | Not Executed |
| **Severity** | Critical |
| **Priority** | P1 |
| **Test Type** | Functional |

---

### TC_PROD_005 — Out-of-Stock Product Behaviour

| Field | Detail |
|-------|--------|
| **Test Case ID** | TC_PROD_005 |
| **Test Case Name** | Out-of-stock product disables purchase |
| **Module** | Product / Detail |
| **Test Objective** | Ensure unavailable products cannot be added to cart. |
| **Pre-conditions** | Product `quantity = 0` or `in_stock = false`. |
| **Test Data / Input** | OOS product ID |
| **Test Steps** | 1. Navigate to product detail. |
| **Expected Result** | "Out of Stock" badge shown; Add-to-Cart / Buy-Now buttons disabled. |
| **Status** | Not Executed |
| **Severity** | High |
| **Priority** | P1 |
| **Test Type** | Negative / Boundary |

---

## 5. MODULE: CART

---

### TC_CART_001 — Add Item to Cart

| Field | Detail |
|-------|--------|
| **Test Case ID** | TC_CART_001 |
| **Test Case Name** | Add product to cart from detail page |
| **Module** | Cart |
| **Test Objective** | Verify items are added to `cart_items` table. |
| **Pre-conditions** | User logged in; product is in stock. |
| **Test Data / Input** | Product ID + size selection |
| **Test Steps** | 1. Open product detail. 2. Pick size. 3. Tap "Add to Cart". |
| **Expected Result** | Toast: "Added to cart"; cart badge increments; `cart_items` row inserted with `price_at_add`. |
| **Status** | Not Executed |
| **Severity** | Critical |
| **Priority** | P1 |
| **Test Type** | Functional |

---

### TC_CART_002 — Update Cart Quantity

| Field | Detail |
|-------|--------|
| **Test Case ID** | TC_CART_002 |
| **Test Case Name** | Increment / decrement item quantity |
| **Module** | Cart |
| **Test Objective** | Verify quantity changes update totals correctly. |
| **Pre-conditions** | At least one item in cart. |
| **Test Data / Input** | Tap + / − buttons |
| **Test Steps** | 1. Open Cart tab. 2. Tap "+" twice. 3. Tap "−" once. |
| **Expected Result** | Quantity = 2; subtotal recalculated; DB updated. |
| **Status** | Not Executed |
| **Severity** | High |
| **Priority** | P1 |
| **Test Type** | Functional / Boundary |

---

### TC_CART_003 — Remove Item from Cart

| Field | Detail |
|-------|--------|
| **Test Case ID** | TC_CART_003 |
| **Test Case Name** | Remove single item from cart |
| **Module** | Cart |
| **Test Objective** | Confirm item removal updates database and UI. |
| **Pre-conditions** | Item present in cart. |
| **Test Data / Input** | N/A |
| **Test Steps** | 1. Open Cart. 2. Swipe / tap delete on item. 3. Confirm. |
| **Expected Result** | Row deleted from `cart_items`; item disappears from UI. |
| **Status** | Not Executed |
| **Severity** | High |
| **Priority** | P2 |
| **Test Type** | Functional |

---

### TC_CART_004 — Empty Cart Display

| Field | Detail |
|-------|--------|
| **Test Case ID** | TC_CART_004 |
| **Test Case Name** | Empty cart shows fallback UI |
| **Module** | Cart |
| **Test Objective** | Verify empty-state UI. |
| **Pre-conditions** | No items in cart. |
| **Test Data / Input** | N/A |
| **Test Steps** | 1. Open Cart tab. |
| **Expected Result** | Empty illustration + "Continue Shopping" CTA shown; Checkout button disabled. |
| **Status** | Not Executed |
| **Severity** | Medium |
| **Priority** | P2 |
| **Test Type** | Functional / UI |

---

## 6. MODULE: WISHLIST

---

### TC_WISH_001 — Add to Wishlist

| Field | Detail |
|-------|--------|
| **Test Case ID** | TC_WISH_001 |
| **Test Case Name** | Add product to wishlist |
| **Module** | Wishlist |
| **Test Objective** | Verify heart icon adds product to wishlist. |
| **Pre-conditions** | User logged in. |
| **Test Data / Input** | Product ID |
| **Test Steps** | 1. Tap heart icon on product card. |
| **Expected Result** | Heart turns red; row added to `wishlists`. |
| **Status** | Not Executed |
| **Severity** | Medium |
| **Priority** | P2 |
| **Test Type** | Functional |

---

### TC_WISH_002 — Remove from Wishlist

| Field | Detail |
|-------|--------|
| **Test Case ID** | TC_WISH_002 |
| **Test Case Name** | Remove product from wishlist |
| **Module** | Wishlist |
| **Test Objective** | Verify toggle/remove behaviour. |
| **Pre-conditions** | Product is in wishlist. |
| **Test Data / Input** | N/A |
| **Test Steps** | 1. Open Wishlist screen. 2. Tap heart on item. |
| **Expected Result** | Item removed from UI and `wishlists` table. |
| **Status** | Not Executed |
| **Severity** | Medium |
| **Priority** | P2 |
| **Test Type** | Functional |

---

## 7. MODULE: ADDRESS MANAGEMENT

---

### TC_ADDR_001 — Add New Address

| Field | Detail |
|-------|--------|
| **Test Case ID** | TC_ADDR_001 |
| **Test Case Name** | Add new shipping address |
| **Module** | Profile / Address |
| **Test Objective** | Verify address creation with all required fields. |
| **Pre-conditions** | User is logged in. |
| **Test Data / Input** | Name, Phone, Address Line 1, City, State, Pincode (560001) |
| **Test Steps** | 1. Profile → Addresses → Add. 2. Fill fields. 3. Save. |
| **Expected Result** | Row inserted in `addresses`; visible in address list. |
| **Status** | Not Executed |
| **Severity** | High |
| **Priority** | P1 |
| **Test Type** | Functional |

---

### TC_ADDR_002 — Invalid Pincode Validation

| Field | Detail |
|-------|--------|
| **Test Case ID** | TC_ADDR_002 |
| **Test Case Name** | Reject address with invalid pincode |
| **Module** | Address |
| **Test Objective** | Verify pincode validation (6-digit numeric). |
| **Pre-conditions** | On add-address form. |
| **Test Data / Input** | Pincode: "ABC12" |
| **Test Steps** | 1. Enter invalid pincode. 2. Save. |
| **Expected Result** | Error: "Enter a valid 6-digit pincode." Save blocked. |
| **Status** | Not Executed |
| **Severity** | Medium |
| **Priority** | P2 |
| **Test Type** | Negative / Boundary |

---

### TC_ADDR_003 — Set Default Address

| Field | Detail |
|-------|--------|
| **Test Case ID** | TC_ADDR_003 |
| **Test Case Name** | Mark address as default |
| **Module** | Address |
| **Test Objective** | Verify only one default address exists per user. |
| **Pre-conditions** | At least 2 addresses exist. |
| **Test Data / Input** | N/A |
| **Test Steps** | 1. Tap "Set as default" on second address. |
| **Expected Result** | Only the selected address has `is_default = true`; previous default flipped to false. |
| **Status** | Not Executed |
| **Severity** | High |
| **Priority** | P2 |
| **Test Type** | Functional |

---

## 8. MODULE: CHECKOUT & PAYMENT

---

### TC_CHK_001 — Proceed to Checkout from Cart

| Field | Detail |
|-------|--------|
| **Test Case ID** | TC_CHK_001 |
| **Test Case Name** | Initiate checkout flow |
| **Module** | Checkout |
| **Test Objective** | Verify user can move from cart to address selection. |
| **Pre-conditions** | Cart has ≥ 1 item; user logged in. |
| **Test Data / Input** | N/A |
| **Test Steps** | 1. Cart → "Proceed to Checkout". |
| **Expected Result** | Address-selection screen opens with saved addresses pre-populated. |
| **Status** | Not Executed |
| **Severity** | Critical |
| **Priority** | P1 |
| **Test Type** | Functional |

---

### TC_CHK_002 — Apply Valid Coupon

| Field | Detail |
|-------|--------|
| **Test Case ID** | TC_CHK_002 |
| **Test Case Name** | Apply valid coupon at checkout |
| **Module** | Checkout / Coupons |
| **Test Objective** | Verify discount is calculated and applied. |
| **Pre-conditions** | Active coupon "FIRST100" exists with 10% off, min order ₹500. |
| **Test Data / Input** | Coupon: "FIRST100"; Order subtotal: ₹600 |
| **Test Steps** | 1. On order summary tap "Apply Coupon". 2. Enter code. 3. Apply. |
| **Expected Result** | Discount of ₹60 applied (within `max_discount_amount`); final amount updated; `coupons.usage_count` incremented after order placement. |
| **Status** | Not Executed |
| **Severity** | High |
| **Priority** | P1 |
| **Test Type** | Functional |

---

### TC_CHK_003 — Reject Expired Coupon

| Field | Detail |
|-------|--------|
| **Test Case ID** | TC_CHK_003 |
| **Test Case Name** | Block expired coupon |
| **Module** | Coupons |
| **Test Objective** | Confirm validation of `valid_until` date. |
| **Pre-conditions** | Coupon "OLDDEAL" expired. |
| **Test Data / Input** | Coupon: "OLDDEAL" |
| **Test Steps** | 1. Enter expired code. 2. Apply. |
| **Expected Result** | Error: "Coupon expired or invalid." |
| **Status** | Not Executed |
| **Severity** | Medium |
| **Priority** | P2 |
| **Test Type** | Negative |

---

### TC_CHK_004 — Razorpay Online Payment (Success)

| Field | Detail |
|-------|--------|
| **Test Case ID** | TC_CHK_004 |
| **Test Case Name** | Successful online payment via Razorpay |
| **Module** | Payment |
| **Test Objective** | Verify Razorpay integration end-to-end. |
| **Pre-conditions** | Checkout summary loaded; payment method = Razorpay. |
| **Test Data / Input** | Test card: 4111 1111 1111 1111, CVV 123, OTP success |
| **Test Steps** | 1. Choose Online Payment. 2. Tap "Pay Now". 3. Complete payment in Razorpay sheet. |
| **Expected Result** | `payments.status = 'success'`; `orders.payment_status = 'paid'`; `orders.status = 'confirmed'`; order created with `order_number`. |
| **Status** | Not Executed |
| **Severity** | Critical |
| **Priority** | P1 |
| **Test Type** | Integration / End-to-End |

---

### TC_CHK_005 — Razorpay Payment Failure / Cancel

| Field | Detail |
|-------|--------|
| **Test Case ID** | TC_CHK_005 |
| **Test Case Name** | Handle payment failure or user cancellation |
| **Module** | Payment |
| **Test Objective** | Verify graceful failure handling. |
| **Pre-conditions** | Razorpay sheet open. |
| **Test Data / Input** | Cancel payment in sheet |
| **Test Steps** | 1. Open Razorpay sheet. 2. Tap close / cancel. |
| **Expected Result** | Order is not finalized; user returned to summary with message "Payment failed/cancelled". No `orders` row OR row with `payment_status = 'failed'`. |
| **Status** | Not Executed |
| **Severity** | Critical |
| **Priority** | P1 |
| **Test Type** | Negative / Integration |

---

### TC_CHK_006 — Cash on Delivery Order

| Field | Detail |
|-------|--------|
| **Test Case ID** | TC_CHK_006 |
| **Test Case Name** | Place order with COD |
| **Module** | Checkout |
| **Test Objective** | Verify COD orders are created without invoking payment gateway. |
| **Pre-conditions** | COD enabled for selected address; cart non-empty. |
| **Test Data / Input** | Payment Method: "COD" |
| **Test Steps** | 1. Select COD. 2. Confirm Order. |
| **Expected Result** | Order saved with `payment_method = 'COD'`, `payment_status = 'pending'`, `status = 'confirmed'`. |
| **Status** | Not Executed |
| **Severity** | High |
| **Priority** | P1 |
| **Test Type** | Functional |

---

## 9. MODULE: ORDER MANAGEMENT

---

### TC_ORD_001 — View Order History

| Field | Detail |
|-------|--------|
| **Test Case ID** | TC_ORD_001 |
| **Test Case Name** | List of user's previous orders |
| **Module** | Orders |
| **Test Objective** | Confirm only the logged-in user's orders are listed. |
| **Pre-conditions** | User has ≥ 1 placed order. |
| **Test Data / Input** | N/A |
| **Test Steps** | 1. Profile → My Orders. |
| **Expected Result** | All orders of current user sorted by `created_at` DESC; other users' orders are NOT visible (ownership enforced per commit `6160016`). |
| **Status** | Not Executed |
| **Severity** | Critical |
| **Priority** | P1 |
| **Test Type** | Functional / Security |

---

### TC_ORD_002 — Order Detail Page

| Field | Detail |
|-------|--------|
| **Test Case ID** | TC_ORD_002 |
| **Test Case Name** | Drill-down into single order |
| **Module** | Orders |
| **Test Objective** | Verify items, totals, shipping address, and tracking info display. |
| **Pre-conditions** | Order exists for user. |
| **Test Data / Input** | Order ID |
| **Test Steps** | 1. Tap on an order. |
| **Expected Result** | All `order_items` shown with name, qty, price, image; `shipping_address`, `tracking_number`, `estimated_delivery` shown. |
| **Status** | Not Executed |
| **Severity** | High |
| **Priority** | P1 |
| **Test Type** | Functional |

---

### TC_ORD_003 — Cancel Pending Order

| Field | Detail |
|-------|--------|
| **Test Case ID** | TC_ORD_003 |
| **Test Case Name** | Cancel an order in `pending`/`confirmed` state |
| **Module** | Orders |
| **Test Objective** | Confirm cancellation allowed only in early states. |
| **Pre-conditions** | Order in `confirmed` status. |
| **Test Data / Input** | Cancel reason: "Changed mind" |
| **Test Steps** | 1. Order detail → Cancel. 2. Pick reason. 3. Submit. |
| **Expected Result** | `orders.status = 'cancelled'`; `order_status_history` row added; refund process started if paid online. |
| **Status** | Not Executed |
| **Severity** | High |
| **Priority** | P1 |
| **Test Type** | Functional |

---

### TC_ORD_004 — Cancel Blocked After Shipping

| Field | Detail |
|-------|--------|
| **Test Case ID** | TC_ORD_004 |
| **Test Case Name** | Block cancellation after shipment |
| **Module** | Orders |
| **Test Objective** | Verify cancellation disabled when status = `shipped` / `delivered`. |
| **Pre-conditions** | Order is `shipped`. |
| **Test Data / Input** | N/A |
| **Test Steps** | 1. Open order detail. |
| **Expected Result** | Cancel button hidden or disabled; message: "Order cannot be cancelled at this stage." |
| **Status** | Not Executed |
| **Severity** | High |
| **Priority** | P2 |
| **Test Type** | Negative |

---

### TC_ORD_005 — Track Order

| Field | Detail |
|-------|--------|
| **Test Case ID** | TC_ORD_005 |
| **Test Case Name** | Track order progress |
| **Module** | Orders |
| **Test Objective** | Verify status timeline rendering. |
| **Pre-conditions** | Order has multiple status entries. |
| **Test Data / Input** | Order ID |
| **Test Steps** | 1. Order detail → Track Order. |
| **Expected Result** | Stepper UI shows Placed → Confirmed → Shipped → Out for Delivery → Delivered with timestamps from `order_status_history`. |
| **Status** | Not Executed |
| **Severity** | Medium |
| **Priority** | P2 |
| **Test Type** | Functional |

---

### TC_ORD_006 — Return Request

| Field | Detail |
|-------|--------|
| **Test Case ID** | TC_ORD_006 |
| **Test Case Name** | Raise return request for delivered order |
| **Module** | Orders / Returns |
| **Test Objective** | Verify return workflow. |
| **Pre-conditions** | Order delivered within return window. |
| **Test Data / Input** | Reason: "Wrong size"; Images: 1 file |
| **Test Steps** | 1. Order detail → Return. 2. Select items. 3. Enter reason. 4. Upload image. 5. Submit. |
| **Expected Result** | `return_requests` row created with `status = 'pending'`; confirmation toast. |
| **Status** | Not Executed |
| **Severity** | High |
| **Priority** | P2 |
| **Test Type** | Functional |

---

## 10. MODULE: PROFILE & SETTINGS

---

### TC_PRF_001 — Edit Profile Details

| Field | Detail |
|-------|--------|
| **Test Case ID** | TC_PRF_001 |
| **Test Case Name** | Update user profile fields |
| **Module** | Profile |
| **Test Objective** | Verify name, DOB, gender, image update is persisted. |
| **Pre-conditions** | User logged in. |
| **Test Data / Input** | Name: "Rahul S."; DOB: 1995-04-10; Gender: M |
| **Test Steps** | 1. Profile → Edit. 2. Change fields. 3. Save. |
| **Expected Result** | `users` table updated; UI reflects changes. |
| **Status** | Not Executed |
| **Severity** | Medium |
| **Priority** | P2 |
| **Test Type** | Functional |

---

### TC_PRF_002 — Notification Preferences

| Field | Detail |
|-------|--------|
| **Test Case ID** | TC_PRF_002 |
| **Test Case Name** | Toggle push / email notification settings |
| **Module** | Profile / Settings |
| **Test Objective** | Verify preference toggles are persisted. |
| **Pre-conditions** | User logged in. |
| **Test Data / Input** | Push: OFF, Email: ON, Order updates: ON |
| **Test Steps** | 1. Profile → Notification Settings. 2. Toggle. 3. Save. |
| **Expected Result** | `users.receive_push_notifications`, `receive_email_updates`, `receive_order_updates` updated. |
| **Status** | Not Executed |
| **Severity** | Low |
| **Priority** | P3 |
| **Test Type** | Functional |

---

## 11. MODULE: NOTIFICATIONS

---

### TC_NOT_001 — Notifications Filtered by User

| Field | Detail |
|-------|--------|
| **Test Case ID** | TC_NOT_001 |
| **Test Case Name** | Show only logged-in user's notifications |
| **Module** | Notifications |
| **Test Objective** | Verify ownership filter (per commit `6160016`). |
| **Pre-conditions** | Multiple users with notifications exist. |
| **Test Data / Input** | N/A |
| **Test Steps** | 1. Open Notifications screen. |
| **Expected Result** | Only rows from `notifications` where `user_id = current_user_id` are returned. |
| **Status** | Not Executed |
| **Severity** | Critical |
| **Priority** | P1 |
| **Test Type** | Security |

---

### TC_NOT_002 — Mark Notification as Read

| Field | Detail |
|-------|--------|
| **Test Case ID** | TC_NOT_002 |
| **Test Case Name** | Mark notification as read |
| **Module** | Notifications |
| **Test Objective** | Verify state update. |
| **Pre-conditions** | At least one unread notification. |
| **Test Data / Input** | N/A |
| **Test Steps** | 1. Tap notification. |
| **Expected Result** | `notifications.is_read = true`; badge count decreases. |
| **Status** | Not Executed |
| **Severity** | Medium |
| **Priority** | P2 |
| **Test Type** | Functional |

---

## 12. MODULE: REVIEWS

---

### TC_REV_001 — Submit Product Review (Verified Purchase)

| Field | Detail |
|-------|--------|
| **Test Case ID** | TC_REV_001 |
| **Test Case Name** | Submit review for purchased product |
| **Module** | Product / Reviews |
| **Test Objective** | Verify review insertion and rating averaging. |
| **Pre-conditions** | User delivered an order containing the product. |
| **Test Data / Input** | Rating: 5; Comment: "Great quality"; Images: 1 |
| **Test Steps** | 1. Order detail → Write Review. 2. Fill form. 3. Submit. |
| **Expected Result** | Row in `product_reviews` with `is_verified_purchase = true`; product rating recalculated. |
| **Status** | Not Executed |
| **Severity** | Medium |
| **Priority** | P2 |
| **Test Type** | Functional |

---

### TC_REV_002 — Block Duplicate Review

| Field | Detail |
|-------|--------|
| **Test Case ID** | TC_REV_002 |
| **Test Case Name** | Reject duplicate review by same user |
| **Module** | Reviews |
| **Test Objective** | Verify one-review-per-user-per-product constraint. |
| **Pre-conditions** | User already reviewed product. |
| **Test Data / Input** | Same product / user |
| **Test Steps** | 1. Try to submit a new review. |
| **Expected Result** | Error: "You have already reviewed this product." Edit instead is offered. |
| **Status** | Not Executed |
| **Severity** | Medium |
| **Priority** | P3 |
| **Test Type** | Negative |

---

## 13. NON-FUNCTIONAL TEST CASES

---

### TC_NFR_001 — JWT Token Expiry & Refresh

| Field | Detail |
|-------|--------|
| **Test Case ID** | TC_NFR_001 |
| **Test Case Name** | Auto-refresh of expired access token |
| **Module** | Security / Session |
| **Test Objective** | Verify expired access token is silently refreshed using refresh token. |
| **Pre-conditions** | Access token expired; refresh token valid. |
| **Test Data / Input** | API request to a protected endpoint. |
| **Test Steps** | 1. Wait until access token expires. 2. Trigger any authenticated request from app. |
| **Expected Result** | Interceptor refreshes the access token transparently; user remains logged in; original request retries. |
| **Status** | Not Executed |
| **Severity** | High |
| **Priority** | P1 |
| **Test Type** | Security / Integration |

---

### TC_NFR_002 — Rate Limiting on Auth Endpoints

| Field | Detail |
|-------|--------|
| **Test Case ID** | TC_NFR_002 |
| **Test Case Name** | Brute force protection on login |
| **Module** | Security |
| **Test Objective** | Verify express-rate-limit blocks too many login attempts. |
| **Pre-conditions** | N/A |
| **Test Data / Input** | 10 rapid login attempts |
| **Test Steps** | 1. Send 10 invalid login attempts within 1 minute via API. |
| **Expected Result** | After threshold, HTTP 429 returned: "Too many requests, please try again later." |
| **Status** | Not Executed |
| **Severity** | High |
| **Priority** | P1 |
| **Test Type** | Security |

---

### TC_NFR_003 — API Performance Benchmark

| Field | Detail |
|-------|--------|
| **Test Case ID** | TC_NFR_003 |
| **Test Case Name** | Product listing response time |
| **Module** | Performance |
| **Test Objective** | Verify products listing returns within SLA. |
| **Pre-conditions** | Production-like dataset (~10K products). |
| **Test Data / Input** | GET /api/products?limit=20 |
| **Test Steps** | 1. Hit endpoint 20 times. 2. Record p50/p95 latency. |
| **Expected Result** | p95 latency < 800 ms; no 5xx errors. |
| **Status** | Not Executed |
| **Severity** | Medium |
| **Priority** | P2 |
| **Test Type** | Performance |

---

### TC_NFR_004 — Offline / Poor Network Handling

| Field | Detail |
|-------|--------|
| **Test Case ID** | TC_NFR_004 |
| **Test Case Name** | Graceful degradation when offline |
| **Module** | Frontend / UX |
| **Test Objective** | Verify the app shows clear error and retry instead of crashing. |
| **Pre-conditions** | Network disabled on device. |
| **Test Data / Input** | N/A |
| **Test Steps** | 1. Disable network. 2. Navigate Home / Cart / Product. |
| **Expected Result** | Friendly error banner with "Retry"; no crash; no infinite loader. |
| **Status** | Not Executed |
| **Severity** | High |
| **Priority** | P2 |
| **Test Type** | Reliability / UX |

---

### TC_NFR_005 — Hardcoded Production API URL

| Field | Detail |
|-------|--------|
| **Test Case ID** | TC_NFR_005 |
| **Test Case Name** | Frontend uses correct production API |
| **Module** | Configuration |
| **Test Objective** | Verify the built app points to production API endpoint (per commit `e999b82`). |
| **Pre-conditions** | Production build (EAS Build). |
| **Test Data / Input** | Inspect outgoing requests. |
| **Test Steps** | 1. Build APK. 2. Capture network traffic. |
| **Expected Result** | All API requests target the production base URL; no localhost / dev URLs. |
| **Status** | Not Executed |
| **Severity** | Critical |
| **Priority** | P1 |
| **Test Type** | Configuration / Smoke |

---

## 14. Test Execution Summary (To Be Filled)

| Module | Total | Passed | Failed | Blocked | Not Executed |
|--------|------:|------:|------:|------:|------:|
| Authentication | 11 | — | — | — | 11 |
| Product | 5 | — | — | — | 5 |
| Cart | 4 | — | — | — | 4 |
| Wishlist | 2 | — | — | — | 2 |
| Address | 3 | — | — | — | 3 |
| Checkout & Payment | 6 | — | — | — | 6 |
| Orders | 6 | — | — | — | 6 |
| Profile | 2 | — | — | — | 2 |
| Notifications | 2 | — | — | — | 2 |
| Reviews | 2 | — | — | — | 2 |
| Non-Functional | 5 | — | — | — | 5 |
| **TOTAL** | **48** | — | — | — | **48** |

---

## 15. Sign-Off

| Role | Name | Signature | Date |
|------|------|-----------|------|
| Test Lead | | | |
| Project Manager | | | |
| QA Manager | | | |
| Client / Stakeholder | | | |

---

*End of Document — TEST_CASES.md*
