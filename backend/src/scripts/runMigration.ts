import dotenv from 'dotenv';
import * as fs from 'fs';
import * as path from 'path';
import { pool } from '../db';

dotenv.config();

async function run() {
  const sql = fs.readFileSync(path.join(__dirname, 'migrate.sql'), 'utf8');
  console.log('Running migration...');
  await pool.query(sql);
  console.log('Migration complete.');
  await pool.end();
}

run().catch(e => {
  console.error('Migration failed:', e.message);
  process.exit(1);
});
