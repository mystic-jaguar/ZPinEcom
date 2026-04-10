import dotenv from 'dotenv';
import * as fs from 'fs';
import * as path from 'path';
import { pool } from '../db';

dotenv.config();

async function run() {
  const candidates = [
    path.join(__dirname, 'migrate.sql'),
    path.resolve(process.cwd(), 'src/scripts/migrate.sql'),
    path.resolve(process.cwd(), 'backend/src/scripts/migrate.sql'),
  ];

  const sqlPath = candidates.find(candidate => fs.existsSync(candidate));

  if (!sqlPath) {
    throw new Error(`Migration SQL not found. Looked in: ${candidates.join(', ')}`);
  }

  const sql = fs.readFileSync(sqlPath, 'utf8');
  console.log('Running migration...');
  await pool.query(sql);
  console.log('Migration complete.');
  await pool.end();
}

run().catch(e => {
  console.error('Migration failed:', e.message);
  process.exit(1);
});
