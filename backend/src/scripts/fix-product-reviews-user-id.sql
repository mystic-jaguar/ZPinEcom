-- Migration: Change product_reviews.user_id from UUID to VARCHAR(7)
-- users.id is character varying (VARCHAR(7)), so user_id must match.

BEGIN;

-- Drop dependent constraints
ALTER TABLE product_reviews DROP CONSTRAINT IF EXISTS product_reviews_user_id_fkey;
ALTER TABLE product_reviews DROP CONSTRAINT IF EXISTS product_reviews_product_id_user_id_key;
DROP INDEX IF EXISTS idx_product_reviews_user_id;

-- Cast user_id to text (varchar)
ALTER TABLE product_reviews
  ALTER COLUMN user_id TYPE VARCHAR(7) USING user_id::text;

-- Re-add foreign key to users
ALTER TABLE product_reviews
  ADD CONSTRAINT product_reviews_user_id_fkey
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;

-- Re-add unique constraint
ALTER TABLE product_reviews
  ADD CONSTRAINT product_reviews_product_id_user_id_key
    UNIQUE (product_id, user_id);

-- Re-add index
CREATE INDEX idx_product_reviews_user_id ON product_reviews(user_id);

COMMIT;
