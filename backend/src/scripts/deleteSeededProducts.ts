/**
 * Deletes all products seeded by seedProducts.ts.
 * Identified by description starting with "[SEED]".
 * Deletes product_images and product_reviews explicitly first, because the legacy
 * prod tables may lack ON DELETE CASCADE (the reconstructed test schema has it).
 *
 * Run: npx ts-node-dev --transpile-only --respawn=false src/scripts/deleteSeededProducts.ts
 */
import dotenv from 'dotenv';
import { pool } from '../db';
dotenv.config();

async function run() {
  // Count first
  const count = await pool.query(
    `SELECT COUNT(*) FROM products WHERE description LIKE '[SEED]%'`
  );
  const total = Number(count.rows[0].count);

  if (total === 0) {
    console.log('No seeded products found.');
    await pool.end();
    return;
  }

  console.log(`Found ${total} seeded products. Deleting...`);

  // Delete reviews first (no cascade on product_reviews)
  const reviewDel = await pool.query(`
    DELETE FROM product_reviews
    WHERE product_id IN (
      SELECT id FROM products WHERE description LIKE '[SEED]%'
    )
  `);

  // Delete images (no cascade on product_images)
  const imgDel = await pool.query(`
    DELETE FROM product_images
    WHERE product_id IN (
      SELECT id FROM products WHERE description LIKE '[SEED]%'
    )
  `);

  // Delete products
  const prodDel = await pool.query(
    `DELETE FROM products WHERE description LIKE '[SEED]%'`
  );

  console.log(`✓ Deleted:`);
  console.log(`  ${prodDel.rowCount} products`);
  console.log(`  ${imgDel.rowCount} images`);
  console.log(`  ${reviewDel.rowCount} reviews`);

  await pool.end();
}

run().catch(e => { console.error(e.message); process.exit(1); });
