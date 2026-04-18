import dotenv from 'dotenv';
import { pool } from '../db';
dotenv.config();

async function run() {
  // Check all relevant column types
  const r = await pool.query(
    `SELECT table_name, column_name, data_type 
     FROM information_schema.columns 
     WHERE table_name IN ('product_reviews', 'products', 'users')
       AND column_name IN ('id', 'product_id', 'user_id')
     ORDER BY table_name, column_name`
  );
  console.table(r.rows);

  await pool.end();
}

run().catch(e => { console.error(e.message); process.exit(1); });
