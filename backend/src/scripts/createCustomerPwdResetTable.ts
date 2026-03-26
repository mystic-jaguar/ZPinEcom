import dotenv from 'dotenv';
import { pool } from '../db';
dotenv.config();

async function run() {
  // Check if password_reset_tokens has FK to users
  const fk = await pool.query(`
    SELECT ccu.table_name AS foreign_table
    FROM information_schema.table_constraints tc
    JOIN information_schema.key_column_usage kcu ON tc.constraint_name = kcu.constraint_name
    JOIN information_schema.constraint_column_usage ccu ON ccu.constraint_name = tc.constraint_name
    WHERE tc.constraint_type = 'FOREIGN KEY' AND tc.table_name = 'password_reset_tokens'
  `);
  console.log('password_reset_tokens FKs:', fk.rows);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS customer_password_reset_tokens (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id UUID NOT NULL REFERENCES customer_users(id) ON DELETE CASCADE,
      reset_token TEXT NOT NULL,
      expires_at TIMESTAMP NOT NULL,
      is_used BOOLEAN DEFAULT false,
      created_at TIMESTAMP DEFAULT NOW()
    )
  `);
  console.log('customer_password_reset_tokens table ready');
  await pool.end();
}

run().catch(e => { console.error(e); process.exit(1); });
