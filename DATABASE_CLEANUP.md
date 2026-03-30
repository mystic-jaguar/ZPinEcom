# Database Cleanup Plan

## Approach: Fresh Start

Do not migrate in-place. Create the clean schema from scratch, update the backend, then drop the old tables.
Full schema definition is in `DATABASE_SCHEMA.md`.

---

## Step 1 — Create the New Schema

Run the CREATE TABLE statements from `DATABASE_SCHEMA.md` in this order (respects FK dependencies):

```
1. users
2. refresh_tokens
3. auth_tokens
4. addresses
5. cart_items
6. wishlists
7. orders
8. order_items
9. products          (already exists, no change)
10. product_images   (already exists, no change)
11. product_reviews  (already exists, no change)
```

Status: `[x] done` — see `backend/src/scripts/migrate.sql`

---

## Step 2 — Update Backend Routes

All changes are in `backend/src/routes/`. The logic is unchanged — these are table/column renames only, except where noted.

### `auth.ts`

| What | Change |
|---|---|
| `const TABLE` | `'customer_users'` → `'users'` |
| `const TOKEN_TABLE` | `'customer_refresh_tokens'` → `'refresh_tokens'` |
| `const PWD_RESET_TABLE` | remove — replaced by `auth_tokens` with `token_type` |
| `INSERT INTO customer_password_reset_tokens` | `INSERT INTO auth_tokens` — add `token_type = 'password_reset'`, rename `reset_token` → `token` |
| `SELECT FROM customer_password_reset_tokens` | `SELECT FROM auth_tokens WHERE token_type = 'password_reset'` — rename `reset_token` → `token` |
| `UPDATE customer_password_reset_tokens SET is_used` | `UPDATE auth_tokens SET is_used` |
| `DELETE FROM otp_verifications` | `DELETE FROM auth_tokens WHERE (email = $1 OR mobile = $2) AND token_type = 'signup_verification'` |
| `INSERT INTO otp_verifications` | `INSERT INTO auth_tokens` — add `token_type = 'signup_verification'`, rename `otp` → `token`, remove `otp_type` column |
| `SELECT FROM otp_verifications` | `SELECT FROM auth_tokens WHERE token_type = 'signup_verification'` — rename `otp` → `token`, `is_verified` → `is_used` |
| `UPDATE otp_verifications SET is_verified` | `UPDATE auth_tokens SET is_used` |

Status: `[x] done`

---

### `users.ts`

| What | Change |
|---|---|
| `const TABLE` | `'customer_users'` → `'users'` |
| `customer_shipping_addresses` (all refs) | → `addresses` |
| `customer_orders` (all refs) | → `orders` |
| `customer_order_items` (all refs) | → `order_items` |
| `PUT /profileDetails` — two-query upsert | Collapse into a single `UPDATE users SET dob, gender, receive_push_notifications, receive_email_updates, receive_order_updates, name, user_name, updated_at WHERE id = $n` — remove the `customer_profile_details` upsert entirely |

Status: `[x] done`

---

### `cart.ts`

| What | Change |
|---|---|
| `const T` | `'customer_cart_items'` → `'cart_items'` |

Status: `[x] done`

---

### `orders.ts`

| What | Change |
|---|---|
| `const ORDER_T` | `'customer_orders'` → `'orders'` |
| `const ITEM_T` | `'customer_order_items'` → `'order_items'` |
| `const CART_T` | `'customer_cart_items'` → `'cart_items'` |
| `customer_shipping_addresses` | → `addresses` |

Status: `[x] done`

---

### `wishlist.ts`

| What | Change |
|---|---|
| `const T` | `'customer_wishlists'` → `'wishlists'` |

Status: `[x] done`

---

### `products.ts`

| What | Change |
|---|---|
| `JOIN users u ON u.id = pr.user_id` | Fixed — now correctly joins the new `users` table |

Status: `[x] done`

---

## Step 3 — Delete the Scripts Folder

Delete `backend/src/scripts/` entirely. All files are one-time setup or debug utilities.

```
backend/src/scripts/checkCustomerUsers.ts
backend/src/scripts/checkFK.ts
backend/src/scripts/checkProducts.ts
backend/src/scripts/checkTable.ts
backend/src/scripts/createCustomerProfileDetails.ts
backend/src/scripts/createCustomerPwdResetTable.ts
backend/src/scripts/createCustomerTable.ts
backend/src/scripts/createCustomerTables.ts
backend/src/scripts/createCustomerTokensTable.ts
backend/src/scripts/fixCustomerProfiles.ts
```

Status: `[x] done` — all 10 scripts deleted, `migrate.sql` kept

Test every route against the new schema before dropping anything.

| Route | Test |
|---|---|
| `POST /api/v1/auth/signup` | Creates row in `users` and `refresh_tokens` |
| `POST /api/v1/auth/login` | Reads `users`, rotates `refresh_tokens` |
| `POST /api/v1/auth/refresh-token` | Validates and rotates `refresh_tokens` |
| `POST /api/v1/auth/forgetPassword/sendOTP` | Inserts into `auth_tokens` with `token_type = 'password_reset'` |
| `POST /api/v1/auth/forgetPassword/verifyOTP` | Reads `auth_tokens` |
| `POST /api/v1/auth/forgetPassword/resetPassword` | Updates `users.password_hash`, marks `auth_tokens.is_used` |
| `POST /api/v1/auth/verification/sendOTP` | Inserts into `auth_tokens` with `token_type = 'signup_verification'` |
| `POST /api/v1/auth/verification/verifyOTP` | Reads `auth_tokens`, updates `users.is_verified` |
| `GET /api/v1/users/:id` | Reads `users` |
| `PUT /api/v1/users/profileDetails` | Single UPDATE on `users` |
| `GET /api/v1/users/shipping-addresses` | Reads `addresses` |
| `POST /api/v1/users/shipping-address` | Inserts into `addresses` |
| `GET /api/v1/cart` | Joins `cart_items` → `products` → `product_images` |
| `POST /api/v1/cart` | Inserts/updates `cart_items` |
| `PUT /api/v1/cart/:productId` | Updates `cart_items` |
| `DELETE /api/v1/cart/:productId` | Deletes from `cart_items` |
| `GET /api/v1/wishlist` | Joins `wishlists` → `products` → `product_images` |
| `POST /api/v1/wishlist` | Inserts into `wishlists` |
| `DELETE /api/v1/wishlist/:productId` | Deletes from `wishlists` |
| `POST /api/v1/orders` | Reads `cart_items`, `addresses`; inserts `orders` + `order_items`; clears `cart_items` |
| `GET /api/v1/orders` | Joins `orders` → `order_items` |
| `GET /api/v1/orders/:id` | Joins `orders` → `order_items` |
| `PATCH /api/v1/orders/:id/cancel` | Updates `orders.status` |
| `GET /api/v1/products` | Joins `products` → `product_images` → `product_reviews` |
| `GET /api/v1/products/:id` | Same |
| `GET /api/v1/products/:id/reviews` | Joins `product_reviews` → `users` |
| `POST /api/v1/products/:id/reviews` | Inserts into `product_reviews` |

Status: `[ ] pending — run migrate.sql against the DB first, then test`

---

## Step 5 — Drop Old Tables

Only run after Step 4 passes completely.

```sql
DROP TABLE IF EXISTS customer_profile_details;
DROP TABLE IF EXISTS customer_users;
DROP TABLE IF EXISTS customer_refresh_tokens;
DROP TABLE IF EXISTS customer_password_reset_tokens;
DROP TABLE IF EXISTS otp_verifications;
DROP TABLE IF EXISTS customer_shipping_addresses;
DROP TABLE IF EXISTS customer_cart_items;
DROP TABLE IF EXISTS customer_wishlists;
DROP TABLE IF EXISTS customer_orders;
DROP TABLE IF EXISTS customer_order_items;
DROP TABLE IF EXISTS customer_profiles;
DROP TABLE IF EXISTS password_reset_tokens;
DROP TABLE IF EXISTS refresh_tokens;    -- the old legacy one
DROP TABLE IF EXISTS users;             -- the old legacy seller/delivery table
```

Status: `[ ] pending — only after Step 4 passes`

---

## Progress Tracker

| Step | Description | Status |
|---|---|---|
| 1 | Create new schema | `[x] done` |
| 2 | Update backend routes | `[x] done` |
| 3 | Delete scripts folder | `[x] done` |
| 4 | Test end-to-end | `[ ] pending` |
| 5 | Drop old tables | `[ ] pending` |
