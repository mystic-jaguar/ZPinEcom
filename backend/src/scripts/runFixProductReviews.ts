import dotenv from 'dotenv';
import * as fs from 'fs';
import * as path from 'path';
import { pool } from '../db';

dotenv.config();

async function run() {
  const candidates = [
    path.join(__dirname, 'fix-product-reviews-product-id.sql'),
    path.resolve(process.cwd(), 'src/scripts/fix-product-reviews-product-id.sql'),
    path.resolve(process.cwd(), 'backend/src/scripts/fix-product-reviews-product-id.sql'),
  ];

  const sqlPath = candidates.find(c => fs.existsSync(c));
  if (!sqlPath) {
    throw new Error(`SQL file not found. Looked in: ${candidates.join(', ')}`);
  }

  const sql = fs.readFileSync(sqlPath, 'utf8');
  console.log('Running product_reviews.product_id fix...');
  await pool.query(sql);
  console.log('Done. product_reviews.product_id is now UUID.');
  await pool.end();
}

run().catch(e => {
  console.error('Migration failed:', e.message);
  process.exit(1);
});
