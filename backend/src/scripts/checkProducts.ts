import dotenv from 'dotenv';
import { pool } from '../db';
dotenv.config();

async function run() {
  const r = await pool.query(`SELECT id, product_name, in_stock FROM products LIMIT 5`);
  console.log('Sample products:', r.rows);
  const count = await pool.query(`SELECT COUNT(*) FROM products`);
  console.log('Total products:', count.rows[0].count);
  await pool.end();
}
run().catch(console.error);
