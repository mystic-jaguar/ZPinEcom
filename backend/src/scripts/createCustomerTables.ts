import dotenv from 'dotenv';
import { pool } from '../db';
dotenv.config();

async function run() {
  // customer_cart_items
  await pool.query(`
    CREATE TABLE IF NOT EXISTS customer_cart_items (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id UUID NOT NULL REFERENCES customer_users(id) ON DELETE CASCADE,
      product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
      quantity INTEGER NOT NULL DEFAULT 1,
      price_at_add NUMERIC(10,2) NOT NULL,
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW(),
      UNIQUE(user_id, product_id)
    )
  `);
  console.log('customer_cart_items ready');

  // customer_wishlists
  await pool.query(`
    CREATE TABLE IF NOT EXISTS customer_wishlists (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id UUID NOT NULL REFERENCES customer_users(id) ON DELETE CASCADE,
      product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
      created_at TIMESTAMP DEFAULT NOW(),
      UNIQUE(user_id, product_id)
    )
  `);
  console.log('customer_wishlists ready');

  // customer_orders
  await pool.query(`
    CREATE TABLE IF NOT EXISTS customer_orders (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      order_number VARCHAR(50) UNIQUE NOT NULL,
      user_id UUID NOT NULL REFERENCES customer_users(id) ON DELETE CASCADE,
      seller_id UUID,
      status VARCHAR(50) NOT NULL DEFAULT 'pending',
      payment_status VARCHAR(50) NOT NULL DEFAULT 'pending',
      total_amount NUMERIC(10,2) NOT NULL DEFAULT 0,
      shipping_amount NUMERIC(10,2) NOT NULL DEFAULT 0,
      tax_amount NUMERIC(10,2) NOT NULL DEFAULT 0,
      final_amount NUMERIC(10,2) NOT NULL DEFAULT 0,
      shipping_address JSONB,
      payment_method VARCHAR(50) NOT NULL DEFAULT 'cod',
      payment_id VARCHAR(255),
      notes TEXT,
      estimated_delivery TIMESTAMP,
      tracking_number VARCHAR(255),
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW()
    )
  `);
  console.log('customer_orders ready');

  // customer_order_items
  await pool.query(`
    CREATE TABLE IF NOT EXISTS customer_order_items (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      order_id UUID NOT NULL REFERENCES customer_orders(id) ON DELETE CASCADE,
      product_id UUID,
      product_name VARCHAR(255) NOT NULL,
      quantity INTEGER NOT NULL,
      price NUMERIC(10,2) NOT NULL,
      image TEXT,
      variant VARCHAR(255),
      created_at TIMESTAMP DEFAULT NOW()
    )
  `);
  console.log('customer_order_items ready');

  // customer_shipping_addresses
  await pool.query(`
    CREATE TABLE IF NOT EXISTS customer_shipping_addresses (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id UUID NOT NULL REFERENCES customer_users(id) ON DELETE CASCADE,
      name VARCHAR(255) NOT NULL,
      phone VARCHAR(20),
      address_line1 TEXT NOT NULL,
      address_line2 TEXT,
      city VARCHAR(100) NOT NULL,
      state VARCHAR(100) NOT NULL,
      pincode VARCHAR(20) NOT NULL,
      country VARCHAR(100) DEFAULT 'India',
      landmark TEXT,
      label VARCHAR(50) DEFAULT 'Home',
      is_default BOOLEAN DEFAULT false,
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW()
    )
  `);
  console.log('customer_shipping_addresses ready');

  await pool.end();
}

run().catch(e => { console.error(e); process.exit(1); });
