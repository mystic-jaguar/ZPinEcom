import * as fs from 'fs';
import * as path from 'path';
import { pool } from '../db';

async function run() {
    const sql = fs.readFileSync(
        path.join(__dirname, 'drop-payment-methods-table.sql'),
        'utf8'
    );
    await pool.query(sql);
    console.log('payment_methods table dropped successfully.');
    await pool.end();
}

run().catch(err => {
    console.error('Migration failed:', err);
    process.exit(1);
});
