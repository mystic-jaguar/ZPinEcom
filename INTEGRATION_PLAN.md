# ZPinEcom Integration Plan

This document tracks all hardcoded/mock data issues and the phases to resolve them.
Use this as a reference — check off items as they are completed.

---

## Phase 1 — Auth Flow (Critical Path)
Fix all auth screens to use real API calls instead of simulated delays and mock tokens.

- [x] `frontend/app/auth/login.tsx` — calls real API, setUser fixed
- [x] `frontend/app/auth/signup.tsx` — calls real API
- [x] `frontend/app/auth/forgot-password.tsx` — replace `setTimeout` mock with `authService.sendPasswordResetOTP`
- [x] `frontend/app/auth/verify-reset-otp.tsx` — replace mock token with real API response token; call `authService.verifyPasswordResetOTP`
- [x] `frontend/app/auth/reset-password.tsx` — replace `setTimeout` mock with `authService.resetPassword`

---

## Phase 2 — Checkout & Order Creation (Critical Path)
The payment screen creates orders locally with hardcoded IDs. Must call the real API.

- [x] `frontend/app/checkout/payment.tsx`
  - Remove hardcoded `userId: 'user-current'`, `sellerId: 'seller-123'`
  - Replace local `addOrder()` with `orderService.createOrder()` API call
  - Use real `user.id` from `useUser()` context
  - Use real `selectedAddressId` from `useCheckout()` context
  - Map payment method string to backend-accepted values (`cod`, `razorpay`, `wallet`)

---

## Phase 3 — Product Detail Screen
- [x] `frontend/app/product/[id].tsx`
  - Remove import of `PRODUCTS` from `constants/products`
  - Replace "You might also like" section — fetch real products from API instead of slicing mock array

---

## Phase 4 — Profile Screens
- [ ] `frontend/app/profile/coupons.tsx`
  - Replace hardcoded `COUPONS` import with API fetch (or keep local if no coupons API exists)

---

## Phase 5 — Context Cleanup
- [x] `frontend/context/PaymentContext.tsx`
  - Remove hardcoded mock cards (`card_1`, `card_2`) and UPI (`upi_1`) from initial state
  - Start with empty arrays; user adds their own payment methods

---

## Phase 6 — Home Screen (Low Priority)
The home screen uses hardcoded category/recommendation arrays for navigation tiles.
These are UI navigation tiles (not product data), so they are acceptable as static config.
No action needed unless a CMS/API for banners is added later.

---

## Notes
- `constants/products.ts` — keep the file but it's only used as fallback; real data comes from API
- `constants/coupons.ts` — keep for CartContext coupon validation until a coupons API is built
- Backend `customer_*` tables are the source of truth for all customer data
- IP in `frontend/services/api.ts` must match your machine's local IP when testing on physical device
