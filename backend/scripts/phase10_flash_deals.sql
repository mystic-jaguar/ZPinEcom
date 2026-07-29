-- Phase 10 — flash_deals, the one table behind the admin panel's /api/admin/flash-deals
-- routes (they 500'd purely because it never existed), the customer website's
-- /api/flash-deals and the ecom app's /api/v1/flash-deals.
-- Idempotent; mirrored by ensureFlashDealsSchema() in the ecom backend's boot DDL.
CREATE TABLE IF NOT EXISTS flash_deals (
  id              VARCHAR(36) PRIMARY KEY,
  product_id      UUID        NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  deal_price      NUMERIC(10,2) NOT NULL,
  total_stock     INTEGER     NOT NULL DEFAULT 50,
  stock_remaining INTEGER     NOT NULL DEFAULT 50,
  label           VARCHAR(100) NOT NULL DEFAULT 'Flash Deal',
  starts_at       TIMESTAMP   NOT NULL DEFAULT NOW(),
  ends_at         TIMESTAMP   NOT NULL,
  is_active       BOOLEAN     NOT NULL DEFAULT true,
  created_at      TIMESTAMP   NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_flash_deals_active ON flash_deals(is_active, ends_at);
CREATE INDEX IF NOT EXISTS idx_flash_deals_product ON flash_deals(product_id);
