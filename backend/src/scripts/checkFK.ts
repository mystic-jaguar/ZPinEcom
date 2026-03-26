import dotenv from 'dotenv';
import { pool } from '../db';
dotenv.config();

async function run() {
  const r = await pool.query(`
    SELECT tc.constraint_name, kcu.column_name, ccu.table_name AS foreign_table, ccu.column_name AS foreign_column
    FROM information_schema.table_constraints tc
    JOIN information_schema.key_column_usage kcu ON tc.constraint_name = kcu.constraint_name
    JOIN information_schema.constraint_column_usage ccu ON ccu.constraint_name = tc.constraint_name
    WHERE tc.constraint_type = 'FOREIGN KEY' AND tc.table_name = 'refresh_tokens'
  `);
  console.log('refresh_tokens foreign keys:', r.rows);
  await pool.end();
}
run().catch(console.error);
