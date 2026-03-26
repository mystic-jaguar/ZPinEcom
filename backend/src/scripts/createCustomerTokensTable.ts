import dotenv from 'dotenv';
import { pool } from '../db';
dotenv.config();

async function run() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS customer_refresh_tokens (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id UUID NOT NULL REFERENCES customer_users(id) ON DELETE CASCADE,
      token TEXT NOT NULL,
      expires_at TIMESTAMP NOT NULL,
      created_at TIMESTAMP DEFAULT NOW()
    )
  `);
  console.log('customer_refresh_tokens table ready');
  await pool.end();
}

run().catch(e => { console.error(e); process.exit(1); });
