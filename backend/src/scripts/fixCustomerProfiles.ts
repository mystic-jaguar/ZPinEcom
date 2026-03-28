import dotenv from 'dotenv';
import { pool } from '../db';
dotenv.config();

async function run() {
  // Check if customer_profiles exists and its columns
  const cols = await pool.query(
    `SELECT column_name, data_type FROM information_schema.columns 
     WHERE table_name = 'customer_profiles' ORDER BY ordinal_position`
  );
  console.log('customer_profiles columns:', cols.rows.map((c: any) => c.column_name).join(', '));

  // Add missing columns if they don't exist
  const existing = cols.rows.map((c: any) => c.column_name);

  if (!existing.includes('receive_push_notifications')) {
    await pool.query(`ALTER TABLE customer_profiles ADD COLUMN IF NOT EXISTS receive_push_notifications BOOLEAN DEFAULT true`);
    console.log('Added receive_push_notifications');
  }
  if (!existing.includes('receive_email_updates')) {
    await pool.query(`ALTER TABLE customer_profiles ADD COLUMN IF NOT EXISTS receive_email_updates BOOLEAN DEFAULT false`);
    console.log('Added receive_email_updates');
  }
  if (!existing.includes('receive_order_updates')) {
    await pool.query(`ALTER TABLE customer_profiles ADD COLUMN IF NOT EXISTS receive_order_updates BOOLEAN DEFAULT true`);
    console.log('Added receive_order_updates');
  }

  // Check if customer_profiles has a FK to customer_users or users
  const fks = await pool.query(`
    SELECT ccu.table_name AS foreign_table
    FROM information_schema.table_constraints tc
    JOIN information_schema.key_column_usage kcu ON tc.constraint_name = kcu.constraint_name
    JOIN information_schema.constraint_column_usage ccu ON ccu.constraint_name = tc.constraint_name
    WHERE tc.constraint_type = 'FOREIGN KEY' AND tc.table_name = 'customer_profiles'
  `);
  console.log('customer_profiles FKs:', fks.rows);

  // Show sample data
  const sample = await pool.query('SELECT * FROM customer_profiles LIMIT 3');
  console.log('Sample customer_profiles:', JSON.stringify(sample.rows, null, 2));

  await pool.end();
}
run().catch(console.error);
