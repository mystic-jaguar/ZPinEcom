import dotenv from 'dotenv';
import { pool } from '../db';
dotenv.config();

async function run() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS customer_users (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_name VARCHAR(255) UNIQUE NOT NULL,
      name VARCHAR(255) NOT NULL,
      mobile VARCHAR(20) UNIQUE,
      email VARCHAR(255) UNIQUE NOT NULL,
      password_hash VARCHAR(255),
      user_role VARCHAR(50) NOT NULL DEFAULT 'customer',
      is_verified BOOLEAN DEFAULT false,
      is_active BOOLEAN DEFAULT true,
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW()
    )
  `);
  console.log('customer_users table ready');
  await pool.end();
}

run().catch(e => { console.error(e); process.exit(1); });
