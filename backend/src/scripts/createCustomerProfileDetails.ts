import dotenv from 'dotenv';
import { pool } from '../db';
dotenv.config();

async function run() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS customer_profile_details (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id UUID NOT NULL REFERENCES customer_users(id) ON DELETE CASCADE,
      dob DATE,
      gender VARCHAR(50),
      profile_image TEXT,
      receive_push_notifications BOOLEAN DEFAULT true,
      receive_email_updates BOOLEAN DEFAULT false,
      receive_order_updates BOOLEAN DEFAULT true,
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW(),
      UNIQUE(user_id)
    )
  `);
  console.log('customer_profile_details table ready');
  await pool.end();
}
run().catch(e => { console.error(e); process.exit(1); });
