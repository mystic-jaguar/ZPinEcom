# Cross-surface changes originating in the customer/ecom app

Per CLAUDE.md rule 3: changes here that depend on, or enforce, behaviour that must
also exist on another ZPIN surface. Newest first.

---

## 2026-08-06 — `users.deleted_at` now blocks login here

This app never checked `users.deleted_at`, so an account deleted on another surface
could still sign in and shop here. It now refuses on **every** path that mints tokens.

`deleted_at` is a column on the SHARED `users` row, written by two deletion flows
that both live in other codebases:

- `website-customer/backend/controllers/accountDeletionController.js` (customer website)
- `ZPinVendorApp/backend/src/controllers/accountDeletionController.js` (vendor app,
  seller-only accounts — added 2026-08-06)

It is deliberately **not** the same thing as `is_active`, which means "suspended by
an admin". Collapsing the two would let a restore silently un-suspend a banned account.

| Change | Where |
|---|---|
| `isDeletedAccount()` / `rejectDeletedAccount()` helpers → HTTP 403 `ACCOUNT_DELETED` | `backend/src/routes/auth.ts` |
| Applied to password login, refresh-token, Google sign-in, Apple sign-in | same file |

Google and Apple needed the guard specifically because both *link and re-verify* an
existing row on sign-in — without it, signing in with Google would have silently
revived a deleted account (`is_verified = true`) instead of refusing it.

### Live sessions, not just new logins

The `authenticate` middleware here does **not** load a `users` row (it verifies the
JWT and checks `customer_token_revocations` only), and it deliberately stays that
way — this is the most capacity-constrained backend on the platform (~22 rps, see
memory `zpin-load-capacity`), so adding a per-request users lookup would be the wrong
trade. Live sessions are killed at deletion time instead, via the revocation table
the middleware already reads:

| Deleting surface | Writes `customer_token_revocations`? |
|---|---|
| Customer website | ✅ already did (`middleware/auth.js:29`) |
| Vendor app (seller-only soft delete) | ✅ added 2026-08-06 in the same change |
| Vendor app (dual-role branch) | ❌ **on purpose** — that branch keeps the customer account alive |

### Affects other surfaces

| Surface | Impact | Status |
|---|---|---|
| **Customer + vendor websites** | Already enforce `deleted_at` at login and in middleware. No change. | ✅ already enforced |
| **Vendor app** | Enforces it as of 2026-08-06. No change needed here. | ✅ done |
| **Delivery app** | **Not applicable** — authenticates against `delivery_partner_profiles`, never loads a `users` row. Do NOT gate its login on `is_active`: that column is its online/offline duty toggle. | ✅ n/a by design |
| **Admin website** | No restore path exists anywhere to clear `deleted_at`/`purge_after` inside the 30-day window; it is a manual SSH job today. | ⚠️ not implemented |

**No schema change** — reads a column applied to prod 2026-08-06 (`account_deletion_ddl.sql`).
**Needs a redeploy of the ecom backend to take effect.**

---

## Pune-only delivery area — now enforced server-side (2026-08-07)

**What the rule is:** the *customer* may be anywhere; only the **delivery address** must be inside Pune (core `411xxx` / PCMC-greater `412xxx`, city text matching `pune|pimpri|chinchwad|pcmc`). Both pincode AND city must match.

**Before this change** the rule existed only as a client-side guard in the ecom app frontend (`frontend/constants/delivery.ts`). It was bypassable via the customer website or by calling the ecom API directly.

**What was added:**

| Surface | Change | Status |
|---|---|---|
| **Ecom app backend** | New `src/utils/delivery.ts`. Enforced on `POST /users/shipping-address`, `PUT /users/shipping-address/:id`, and — authoritatively — at order creation in `routes/orders.ts` (after the address is decrypted, before anything is written). | ✅ done, needs redeploy |
| **Ecom app frontend** | Already had the check; unchanged. | ✅ pre-existing |
| **Customer website backend** | New `backend/utils/delivery.js` (identical logic). Enforced in `addressController.addAddress` / `updateAddress` and in `orderController` at order creation. | ✅ code done, **ayush must deploy** |
| **Customer website frontend** | New `src/utils/delivery.js`. Checked in `AddAddress.jsx` validation and `Checkout.jsx` `handlePlaceOrder`. | ✅ code done, **ayush must deploy** |
| **Vendor app / vendor website** | Not applicable — sellers do not create delivery addresses. | n/a |
| **Delivery app** | Not applicable — it only receives orders that already passed the gate. | n/a |
| **Admin website** | ⚠️ Not checked. If admin can create or edit a customer address, it can still bypass the rule. | ⚠️ unverified |

**The order-creation gate is the one that actually matters** — it also catches addresses that were saved *before* this restriction existed, which a save-time check alone cannot.

**No schema change.** Four copies of the rule now exist (ecom backend, ecom frontend, website backend, website frontend) — they must stay identical; each file names the other three in its header comment.

**Known pre-existing quirk (not introduced here):** the website's `placeOrder` sends `addressId`, but `orderController` ignores it and uses the user's *default* address. The gate follows the backend's actual behaviour (it checks the default address), so it is correct either way — but that mismatch is worth fixing separately.
