import dotenv from 'dotenv';
import { pool } from '../db';
dotenv.config();

async function run() {
  const cols = await pool.query(
    `SELECT column_name, data_type FROM information_schema.columns 
     WHERE table_name = 'customer_users' ORDER BY ordinal_position`
  );
  console.log('customer_users columns:', cols.rows.map((c: any) => `${c.column_name}(${c.data_type})`).join(', '));

  const sample = await pool.query(
    `SELECT id, name, email, user_name, user_role, is_verified FROM customer_users LIMIT 3`
  );
  console.log('Sample rows:', JSON.stringify(sample.rows, null, 2));
  await pool.end();
}
run().catch(console.error);
