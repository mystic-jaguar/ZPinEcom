-- Migration: Change product_reviews.product_id from VARCHAR to UUID
-- Handles dependent views by dropping and recreating them.

BEGIN;

-- Find and drop any views that depend on product_reviews.product_id
DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN
    SELECT DISTINCT dependent_view.relname AS view_name
    FROM pg_depend
    JOIN pg_rewrite ON pg_depend.objid = pg_rewrite.oid
    JOIN pg_class AS dependent_view ON pg_rewrite.ev_class = dependent_view.oid
    JOIN pg_class AS source_table ON pg_depend.refobjid = source_table.oid
    JOIN pg_attribute ON pg_depend.refobjid = pg_attribute.attrelid
      AND pg_depend.refobjsubid = pg_attribute.attnum
    WHERE source_table.relname = 'product_reviews'
      AND pg_attribute.attname = 'product_id'
      AND dependent_view.relkind = 'v'
  LOOP
    EXECUTE 'DROP VIEW IF EXISTS ' || quote_ident(r.view_name) || ' CASCADE';
    RAISE NOTICE 'Dropped view: %', r.view_name;
  END LOOP;
END $$;

-- Drop the foreign key constraint and indexes
ALTER TABLE product_reviews DROP CONSTRAINT IF EXISTS product_reviews_product_id_fkey;
ALTER TABLE product_reviews DROP CONSTRAINT IF EXISTS product_reviews_product_id_user_id_key;
DROP INDEX IF EXISTS idx_product_reviews_product_id;

-- Cast the column to UUID
ALTER TABLE product_reviews
  ALTER COLUMN product_id TYPE UUID USING product_id::uuid;

-- Re-add constraints and index
ALTER TABLE product_reviews
  ADD CONSTRAINT product_reviews_product_id_fkey
    FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE;

ALTER TABLE product_reviews
  ADD CONSTRAINT product_reviews_product_id_user_id_key
    UNIQUE (product_id, user_id);

CREATE INDEX idx_product_reviews_product_id ON product_reviews(product_id);

COMMIT;
