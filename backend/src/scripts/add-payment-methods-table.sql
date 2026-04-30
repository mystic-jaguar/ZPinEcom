-- ── payment_methods ──────────────────────────────────────────────────────────
-- Stores saved UPI IDs and cards per user.
-- Sensitive card data (number, holder name, expiry) is stored encrypted.
-- type: 'card' | 'upi'
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS payment_methods (
  id         VARCHAR(7)   PRIMARY KEY,
  user_id    VARCHAR(7)   NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type       VARCHAR(10)  NOT NULL CHECK (type IN ('card', 'upi')),
  -- UPI fields
  upi_id     TEXT,
  upi_app    VARCHAR(50),
  -- Card fields (stored encrypted)
  card_number     TEXT,
  card_holder     TEXT,
  expiry_date     TEXT,
  card_type       VARCHAR(50),
  created_at TIMESTAMP    NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP    NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_payment_methods_user_id ON payment_methods(user_id);
