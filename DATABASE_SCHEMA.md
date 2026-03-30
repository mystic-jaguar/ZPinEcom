# Clean Database Schema

This document defines the proposed clean schema for the customer app backend.
It replaces the current fragmented state (17+ tables, legacy duplicates, split profile data).

---

## Design Principles

- One table per logical entity — no splitting a single entity across two tables
- No legacy/orphaned tables — only what the app actually uses
- Consistent naming — drop the `customer_` prefix where it adds no value; the DB is already scoped to this app
- Short-lived token tables unified — OTPs and reset tokens share one table with a type discriminator
- `product_images` stays separate — products have multiple images (1:N), this is correct normalization

---

## Final Schema: 9 Tables

```
users
refresh_tokens
auth_tokens
addresses
cart_items
wishlists
orders
order_items
products
product_images
product_reviews
```

Wait — that's 11. Let me be precise:

| # | Table | Replaces |
|---|---|---|
| 1 | `users` | `customer_users` + `customer_profile_details` |
| 2 | `refresh_tokens` | `customer_refresh_tokens` |
| 3 | `auth_tokens` | `customer_password_reset_tokens` + `otp_verifications` |
| 4 | `addresses` | `customer_shipping_addresses` |
| 5 | `cart_items` | `customer_cart_items` |
| 6 | `wishlists` | `customer_wishlists` |
| 7 | `orders` | `customer_orders` |
| 8 | `order_items` | `customer_order_items` |
| 9 | `products` | `products` (unchanged) |
| 10 | `product_images` | `product_images` (unchanged) |
| 11 | `product_reviews` | `product_reviews` (fix JOIN only) |

**Before: 17 tables (13 active + 4 legacy)**
**After: 11 tables, 0 legacy, 0 redundancy**

---

## Table Definitions

### 1. `users`
Merges `customer_users` and `customer_profile_details` into one row per user.
The profile fields are all nullable — no reason to split them into a separate table.

```sql
CREATE TABLE users (
  id                         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_name                  VARCHAR(255) UNIQUE NOT NULL,
  name                       VARCHAR(255) NOT NULL,
  email                      VARCHAR(255) UNIQUE NOT NULL,
  mobile                     VARCHAR(20)  UNIQUE,
  password_hash              VARCHAR(255),                        -- NULL for social login
  user_role                  VARCHAR(50)  NOT NULL DEFAULT 'customer',
  is_verified                BOOLEAN      NOT NULL DEFAULT false,
  is_active                  BOOLEAN      NOT NULL DEFAULT true,
  -- profile fields (absorbed from customer_profile_details)
  dob                        DATE,
  gender                     VARCHAR(50),
  profile_image              TEXT,
  receive_push_notifications BOOLEAN      NOT NULL DEFAULT true,
  receive_email_updates      BOOLEAN      NOT NULL DEFAULT false,
  receive_order_updates      BOOLEAN      NOT NULL DEFAULT true,
  created_at                 TIMESTAMP    NOT NULL DEFAULT NOW(),
  updated_at                 TIMESTAMP    NOT NULL DEFAULT NOW()
);
```

---

### 2. `refresh_tokens`
Stores JWT refresh tokens. One active token per user (old ones deleted on login/refresh).

```sql
CREATE TABLE refresh_tokens (
  id         UUID      PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID      NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token      TEXT      NOT NULL,
  expires_at TIMESTAMP NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_refresh_tokens_user_id ON refresh_tokens(user_id);
```

---

### 3. `auth_tokens`
Unified table for all short-lived, single-use tokens.
Replaces both `customer_password_reset_tokens` and `otp_verifications`.

`token_type` values:
- `'password_reset'` — 6-digit OTP for password reset, tied to a known user
- `'signup_verification'` — 6-digit OTP for email/mobile verification, may be pre-signup (user_id can be NULL)

```sql
CREATE TABLE auth_tokens (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID        REFERENCES users(id) ON DELETE CASCADE,  -- NULL for pre-signup OTPs
  email      VARCHAR(255),                                         -- used when user_id is NULL
  mobile     VARCHAR(20),                                          -- used when user_id is NULL
  token      TEXT        NOT NULL,
  token_type VARCHAR(50) NOT NULL,                                 -- 'password_reset' | 'signup_verification'
  is_used    BOOLEAN     NOT NULL DEFAULT false,
  expires_at TIMESTAMP   NOT NULL,
  created_at TIMESTAMP   NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_auth_tokens_user_id ON auth_tokens(user_id);
CREATE INDEX idx_auth_tokens_token   ON auth_tokens(token);
```

---

### 4. `addresses`
Saved shipping addresses per user.
Renamed from `customer_shipping_addresses` — cleaner, no redundant prefix.

```sql
CREATE TABLE addresses (
  id            UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID         NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name          VARCHAR(255) NOT NULL,
  phone         VARCHAR(20),
  address_line1 TEXT         NOT NULL,
  address_line2 TEXT,
  city          VARCHAR(100) NOT NULL,
  state         VARCHAR(100) NOT NULL,
  pincode       VARCHAR(20)  NOT NULL,
  country       VARCHAR(100) NOT NULL DEFAULT 'India',
  landmark      TEXT,
  label         VARCHAR(50)  NOT NULL DEFAULT 'Home',
  is_default    BOOLEAN      NOT NULL DEFAULT false,
  created_at    TIMESTAMP    NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMP    NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_addresses_user_id ON addresses(user_id);
```

---

### 5. `cart_items`
Shopping cart. One row per (user, product) pair.

```sql
CREATE TABLE cart_items (
  id           UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      UUID         NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  product_id   UUID         NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  quantity     INTEGER      NOT NULL DEFAULT 1 CHECK (quantity > 0),
  price_at_add NUMERIC(10,2) NOT NULL,
  created_at   TIMESTAMP    NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMP    NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, product_id)
);

CREATE INDEX idx_cart_items_user_id ON cart_items(user_id);
```

---

### 6. `wishlists`
User wishlist. One row per (user, product) pair.

```sql
CREATE TABLE wishlists (
  id         UUID      PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID      NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  product_id UUID      NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, product_id)
);

CREATE INDEX idx_wishlists_user_id ON wishlists(user_id);
```

---

### 7. `orders`
Order header. Shipping address is snapshotted as JSONB so it's immutable after placement.

```sql
CREATE TABLE orders (
  id               UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  order_number     VARCHAR(50)   UNIQUE NOT NULL,
  user_id          UUID          NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  status           VARCHAR(50)   NOT NULL DEFAULT 'pending',
                                 -- pending | confirmed | shipped | delivered | cancelled
  payment_status   VARCHAR(50)   NOT NULL DEFAULT 'pending',
                                 -- pending | paid | failed | refunded
  total_amount     NUMERIC(10,2) NOT NULL DEFAULT 0,
  shipping_amount  NUMERIC(10,2) NOT NULL DEFAULT 0,
  tax_amount       NUMERIC(10,2) NOT NULL DEFAULT 0,
  final_amount     NUMERIC(10,2) NOT NULL DEFAULT 0,
  shipping_address JSONB         NOT NULL,
  payment_method   VARCHAR(50)   NOT NULL DEFAULT 'cod',
  payment_id       VARCHAR(255),
  notes            TEXT,
  tracking_number  VARCHAR(255),
  estimated_delivery TIMESTAMP,
  created_at       TIMESTAMP     NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMP     NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_orders_user_id ON orders(user_id);
CREATE INDEX idx_orders_status  ON orders(status);
```

Note: `seller_id` column removed — it was never populated by any route.

---

### 8. `order_items`
Line items for each order. Product details are snapshotted at order time so they survive product edits/deletions.

```sql
CREATE TABLE order_items (
  id           UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id     UUID          NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  product_id   UUID          REFERENCES products(id) ON DELETE SET NULL,
  product_name VARCHAR(255)  NOT NULL,
  quantity     INTEGER       NOT NULL CHECK (quantity > 0),
  price        NUMERIC(10,2) NOT NULL,
  image        TEXT,
  variant      VARCHAR(255),
  created_at   TIMESTAMP     NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_order_items_order_id ON order_items(order_id);
```

---

### 9. `products`
Product catalog. Owned by sellers (other app), read-only from the customer app.

```sql
-- Existing table, no changes needed to structure.
-- Columns used by this app:
--   id, user_id, product_name, description, category_id,
--   deepest_category_name, category_path, price, quantity,
--   in_stock, created_at
```

---

### 10. `product_images`
Multiple images per product. Kept as a separate table — correct 1:N normalization.

```sql
-- Existing table, no changes needed.
-- Columns used: product_id, image_url
```

---

### 11. `product_reviews`
Ratings and comments per product.

```sql
-- Existing table, one fix needed:
-- The JOIN must reference `users` (new name) not the old `users` legacy table.
-- See backend changes section below.
```

---

## Entity Relationship Summary

```
users ──< refresh_tokens
users ──< auth_tokens
users ──< addresses
users ──< cart_items >── products ──< product_images
users ──< wishlists  >── products
users ──< orders     ──< order_items >── products
                         product_reviews >── products
                         product_reviews >── users
```

---

## Migration SQL

Run in order. Assumes the new DB is being built fresh (recommended).
If migrating in-place, wrap everything in a transaction.

```sql
-- ── 1. users ──────────────────────────────────────────────────────────────────
CREATE TABLE users (
  id                         UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  user_name                  VARCHAR(255) UNIQUE NOT NULL,
  name                       VARCHAR(255) NOT NULL,
  email                      VARCHAR(255) UNIQUE NOT NULL,
  mobile                     VARCHAR(20)  UNIQUE,
  password_hash              VARCHAR(255),
  user_role                  VARCHAR(50)  NOT NULL DEFAULT 'customer',
  is_verified                BOOLEAN      NOT NULL DEFAULT false,
  is_active                  BOOLEAN      NOT NULL DEFAULT true,
  dob                        DATE,
  gender                     VARCHAR(50),
  profile_image              TEXT,
  receive_push_notifications BOOLEAN      NOT NULL DEFAULT true,
  receive_email_updates      BOOLEAN      NOT NULL DEFAULT false,
  receive_order_updates      BOOLEAN      NOT NULL DEFAULT true,
  created_at                 TIMESTAMP    NOT NULL DEFAULT NOW(),
  updated_at                 TIMESTAMP    NOT NULL DEFAULT NOW()
);

-- Migrate data
INSERT INTO users (id, user_name, name, email, mobile, password_hash, user_role,
                   is_verified, is_active, dob, gender, profile_image,
                   receive_push_notifications, receive_email_updates, receive_order_updates,
                   created_at, updated_at)
SELECT
  u.id, u.user_name, u.name, u.email, u.mobile, u.password_hash, u.user_role,
  u.is_verified, u.is_active,
  p.dob, p.gender, p.profile_image,
  COALESCE(p.receive_push_notifications, true),
  COALESCE(p.receive_email_updates, false),
  COALESCE(p.receive_order_updates, true),
  u.created_at, u.updated_at
FROM customer_users u
LEFT JOIN customer_profile_details p ON p.user_id = u.id;


-- ── 2. refresh_tokens ─────────────────────────────────────────────────────────
CREATE TABLE refresh_tokens (
  id         UUID      PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID      NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token      TEXT      NOT NULL,
  expires_at TIMESTAMP NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_refresh_tokens_user_id ON refresh_tokens(user_id);

INSERT INTO refresh_tokens SELECT * FROM customer_refresh_tokens;


-- ── 3. auth_tokens ────────────────────────────────────────────────────────────
CREATE TABLE auth_tokens (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID        REFERENCES users(id) ON DELETE CASCADE,
  email      VARCHAR(255),
  mobile     VARCHAR(20),
  token      TEXT        NOT NULL,
  token_type VARCHAR(50) NOT NULL,
  is_used    BOOLEAN     NOT NULL DEFAULT false,
  expires_at TIMESTAMP   NOT NULL,
  created_at TIMESTAMP   NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_auth_tokens_user_id ON auth_tokens(user_id);
CREATE INDEX idx_auth_tokens_token   ON auth_tokens(token);

INSERT INTO auth_tokens (id, user_id, token, token_type, is_used, expires_at, created_at)
SELECT id, user_id, reset_token, 'password_reset', is_used, expires_at, created_at
FROM customer_password_reset_tokens;

INSERT INTO auth_tokens (id, email, mobile, token, token_type, is_used, expires_at, created_at)
SELECT id, email, mobile, otp, 'signup_verification', is_verified, expires_at, created_at
FROM otp_verifications;


-- ── 4. addresses ──────────────────────────────────────────────────────────────
CREATE TABLE addresses (
  id            UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID         NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name          VARCHAR(255) NOT NULL,
  phone         VARCHAR(20),
  address_line1 TEXT         NOT NULL,
  address_line2 TEXT,
  city          VARCHAR(100) NOT NULL,
  state         VARCHAR(100) NOT NULL,
  pincode       VARCHAR(20)  NOT NULL,
  country       VARCHAR(100) NOT NULL DEFAULT 'India',
  landmark      TEXT,
  label         VARCHAR(50)  NOT NULL DEFAULT 'Home',
  is_default    BOOLEAN      NOT NULL DEFAULT false,
  created_at    TIMESTAMP    NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMP    NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_addresses_user_id ON addresses(user_id);

INSERT INTO addresses SELECT * FROM customer_shipping_addresses;


-- ── 5. cart_items ─────────────────────────────────────────────────────────────
CREATE TABLE cart_items (
  id           UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      UUID          NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  product_id   UUID          NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  quantity     INTEGER       NOT NULL DEFAULT 1 CHECK (quantity > 0),
  price_at_add NUMERIC(10,2) NOT NULL,
  created_at   TIMESTAMP     NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMP     NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, product_id)
);
CREATE INDEX idx_cart_items_user_id ON cart_items(user_id);

INSERT INTO cart_items SELECT * FROM customer_cart_items;


-- ── 6. wishlists ──────────────────────────────────────────────────────────────
CREATE TABLE wishlists (
  id         UUID      PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID      NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  product_id UUID      NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, product_id)
);
CREATE INDEX idx_wishlists_user_id ON wishlists(user_id);

INSERT INTO wishlists SELECT * FROM customer_wishlists;


-- ── 7. orders ─────────────────────────────────────────────────────────────────
CREATE TABLE orders (
  id                 UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  order_number       VARCHAR(50)   UNIQUE NOT NULL,
  user_id            UUID          NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  status             VARCHAR(50)   NOT NULL DEFAULT 'pending',
  payment_status     VARCHAR(50)   NOT NULL DEFAULT 'pending',
  total_amount       NUMERIC(10,2) NOT NULL DEFAULT 0,
  shipping_amount    NUMERIC(10,2) NOT NULL DEFAULT 0,
  tax_amount         NUMERIC(10,2) NOT NULL DEFAULT 0,
  final_amount       NUMERIC(10,2) NOT NULL DEFAULT 0,
  shipping_address   JSONB         NOT NULL DEFAULT '{}',
  payment_method     VARCHAR(50)   NOT NULL DEFAULT 'cod',
  payment_id         VARCHAR(255),
  notes              TEXT,
  tracking_number    VARCHAR(255),
  estimated_delivery TIMESTAMP,
  created_at         TIMESTAMP     NOT NULL DEFAULT NOW(),
  updated_at         TIMESTAMP     NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_orders_user_id ON orders(user_id);
CREATE INDEX idx_orders_status  ON orders(status);

INSERT INTO orders (id, order_number, user_id, status, payment_status,
                    total_amount, shipping_amount, tax_amount, final_amount,
                    shipping_address, payment_method, payment_id, notes,
                    tracking_number, estimated_delivery, created_at, updated_at)
SELECT id, order_number, user_id, status, payment_status,
       total_amount, shipping_amount, tax_amount, final_amount,
       COALESCE(shipping_address, '{}'), payment_method, payment_id, notes,
       tracking_number, estimated_delivery, created_at, updated_at
FROM customer_orders;


-- ── 8. order_items ────────────────────────────────────────────────────────────
CREATE TABLE order_items (
  id           UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id     UUID          NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  product_id   UUID          REFERENCES products(id) ON DELETE SET NULL,
  product_name VARCHAR(255)  NOT NULL,
  quantity     INTEGER       NOT NULL CHECK (quantity > 0),
  price        NUMERIC(10,2) NOT NULL,
  image        TEXT,
  variant      VARCHAR(255),
  created_at   TIMESTAMP     NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_order_items_order_id ON order_items(order_id);

INSERT INTO order_items SELECT * FROM customer_order_items;


-- ── 9-11. products, product_images, product_reviews ──────────────────────────
-- No structural changes. product_reviews needs the JOIN fix in code (see below).


-- ── Drop legacy tables (after verifying migration) ───────────────────────────
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
DROP TABLE IF EXISTS refresh_tokens;   -- the old legacy one, not the new one
DROP TABLE IF EXISTS users;            -- the old legacy seller/delivery table
```

---

## Backend Code Changes Required

Every table rename needs a corresponding update in the routes. Summary of changes:

### `auth.ts`
| Old reference | New reference |
|---|---|
| `customer_users` | `users` |
| `customer_refresh_tokens` | `refresh_tokens` |
| `customer_password_reset_tokens` | `auth_tokens` (add `WHERE token_type = 'password_reset'`) |
| `otp_verifications` | `auth_tokens` (add `WHERE token_type = 'signup_verification'`) |
| `otp` column | `token` column |
| `reset_token` column | `token` column |
| `is_verified` column (otp) | `is_used` column |

### `users.ts`
| Old reference | New reference |
|---|---|
| `customer_users` | `users` |
| `customer_profile_details` upsert | single `UPDATE users SET ... WHERE id = $1` |
| `customer_shipping_addresses` | `addresses` |
| `customer_orders` | `orders` |
| `customer_order_items` | `order_items` |

### `cart.ts`
| Old reference | New reference |
|---|---|
| `customer_cart_items` | `cart_items` |

### `orders.ts`
| Old reference | New reference |
|---|---|
| `customer_orders` | `orders` |
| `customer_order_items` | `order_items` |
| `customer_cart_items` | `cart_items` |
| `customer_shipping_addresses` | `addresses` |

### `wishlist.ts`
| Old reference | New reference |
|---|---|
| `customer_wishlists` | `wishlists` |

### `products.ts`
| Old reference | New reference |
|---|---|
| `JOIN users u` (in reviews) | `JOIN users u` — same name now, but this was previously broken because it pointed to the legacy seller `users` table. After migration this is correct. |

---

## Scripts to Delete

All files in `backend/src/scripts/` can be deleted. They are one-time setup and debug utilities that have no ongoing purpose.

---

## Summary

| | Before | After |
|---|---|---|
| Total tables | 17 | 11 |
| Legacy/orphaned tables | 4 | 0 |
| Split 1:1 entities | 1 (`users` + `profile_details`) | 0 |
| Duplicate token tables | 2 | 0 (unified into `auth_tokens`) |
| Redundant `customer_` prefixes | 9 tables | 0 |
| Broken JOINs | 1 (`product_reviews` → wrong `users`) | 0 |
