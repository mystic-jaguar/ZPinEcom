import dotenv from 'dotenv';
import { pool } from '../db';
dotenv.config();

async function run() {
  const r = await pool.query(
    `SELECT column_name, data_type, is_nullable, column_default 
     FROM information_schema.columns 
     WHERE table_name='customer_users' 
     ORDER BY ordinal_position`
  );
  console.log('customer_users columns:');
  r.rows.forEach(c => console.log(`  ${c.column_name} | ${c.data_type} | nullable:${c.is_nullable} | default:${c.column_default}`));

  // Try a test insert to see the exact error
  try {
    const res = await pool.query(
      `INSERT INTO customer_users (user_name, name, email, mobile, password_hash, user_role, is_verified, is_active, created_at, updated_at)
       VALUES ($1,$2,$3,$4,$5,'customer',false,true,NOW(),NOW()) RETURNING id`,
      ['test_debug_user', 'Test Debug', 'test_debug@test.com', null, 'fakehash']
    );
    console.log('Test insert succeeded, id:', res.rows[0].id);
    // Clean up
    await pool.query(`DELETE FROM customer_users WHERE email = 'test_debug@test.com'`);
    console.log('Test row cleaned up');
  } catch (e: any) {
    console.error('Test insert error:', e.message, '| code:', e.code, '| detail:', e.detail);
  }

  await pool.end();
}

run().catch(console.error);
