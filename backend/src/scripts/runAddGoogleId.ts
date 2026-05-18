import * as fs from 'fs';
import * as path from 'path';
import { pool } from '../db';

async function run() {
  const sql = fs.readFileSync(path.join(__dirname, 'add-google-id.sql'), 'utf8');
  await pool.query(sql);
  console.log('google_id column added successfully');
  await pool.end();
}

run().catch(err => { console.error(err); process.exit(1); });
