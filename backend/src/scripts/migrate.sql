-- ============================================================
-- Clean Schema Migration
-- Run this against a fresh database (no old tables present).
-- If running against existing DB, ensure old tables exist first.
-- ============================================================

-- ── 1. users ──────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS users (
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

-- ── 2. refresh_tokens ─────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS refresh_tokens (
  id         UUID      PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID      NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token      TEXT      NOT NULL,
  expires_at TIMESTAMP NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_refresh_tokens_user_id ON refresh_tokens(user_id);

-- ── 3. auth_tokens ────────────────────────────────────────────────────────────
-- Unified table for password_reset OTPs and signup verification OTPs.
-- token_type: 'password_reset' | 'signup_verification'
CREATE TABLE IF NOT EXISTS auth_tokens (
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
CREATE INDEX IF NOT EXISTS idx_auth_tokens_user_id ON auth_tokens(user_id);
CREATE INDEX IF NOT EXISTS idx_auth_tokens_token   ON auth_tokens(token);

-- ── 4. addresses ──────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS addresses (
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
CREATE INDEX IF NOT EXISTS idx_addresses_user_id ON addresses(user_id);

-- ── 5. cart_items ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS cart_items (
  id           UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      UUID          NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  product_id   UUID          NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  quantity     INTEGER       NOT NULL DEFAULT 1 CHECK (quantity > 0),
  price_at_add NUMERIC(10,2) NOT NULL,
  created_at   TIMESTAMP     NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMP     NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, product_id)
);
CREATE INDEX IF NOT EXISTS idx_cart_items_user_id ON cart_items(user_id);

-- ── 6. wishlists ──────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS wishlists (
  id         UUID      PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID      NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  product_id UUID      NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, product_id)
);
CREATE INDEX IF NOT EXISTS idx_wishlists_user_id ON wishlists(user_id);

-- ── 7. orders ─────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS orders (
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
CREATE INDEX IF NOT EXISTS idx_orders_user_id ON orders(user_id);
CREATE INDEX IF NOT EXISTS idx_orders_status  ON orders(status);

-- ── 8. order_items ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS order_items (
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
CREATE INDEX IF NOT EXISTS idx_order_items_order_id ON order_items(order_id);

-- ── 9-11. products, product_images, product_reviews ──────────────────────────
-- These tables already exist and require no structural changes.
-- product_reviews JOIN fix is handled in the backend code (products.ts).
