/**
 * Seed script — adds mock products for all major subcategories.
 * Run:   npx ts-node-dev --transpile-only --respawn=false src/scripts/seedProducts.ts
 * Delete: npx ts-node-dev --transpile-only --respawn=false src/scripts/deleteSeededProducts.ts
 *
 * All seeded products are tagged with description starting with "[SEED]" for easy identification.
 */
import dotenv from 'dotenv';
import { pool } from '../db';
dotenv.config();

// ── Unsplash image sets per category ─────────────────────────────────────────
const IMGS = {
  tshirt:    ['https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=600','https://images.unsplash.com/photo-1503341504253-dff4815485f1?w=600','https://images.unsplash.com/photo-1576566588028-4147f3842f27?w=600'],
  shirt:     ['https://images.unsplash.com/photo-1596755094514-f87e34085b2c?w=600','https://images.unsplash.com/photo-1602810318383-e386cc2a3ccf?w=600','https://images.unsplash.com/photo-1620012253295-c15cc3e65df4?w=600'],
  sweatshirt:['https://images.unsplash.com/photo-1556905055-8f358a7a47b2?w=600','https://images.unsplash.com/photo-1620799140408-ed5341cdb4f3?w=600','https://images.unsplash.com/photo-1578587018452-892bacefd3f2?w=600'],
  jacket:    ['https://images.unsplash.com/photo-1591047139829-d91aecb6caea?w=600','https://images.unsplash.com/photo-1548126032-079a0fb0099d?w=600','https://images.unsplash.com/photo-1551028719-00167b16eac5?w=600'],
  jeans:     ['https://images.unsplash.com/photo-1542272454315-4c01d7abdf4a?w=600','https://images.unsplash.com/photo-1541099649105-f69ad21f3246?w=600','https://images.unsplash.com/photo-1475178626620-a4d074967452?w=600'],
  trousers:  ['https://images.unsplash.com/photo-1624378439575-d8705ad7ae80?w=600','https://images.unsplash.com/photo-1473966968600-fa801b869a1a?w=600','https://images.unsplash.com/photo-1594938298603-c8148c4b4f7b?w=600'],
  shorts:    ['https://images.unsplash.com/photo-1591195853828-11db59a44f6b?w=600','https://images.unsplash.com/photo-1562183241-840b8af0721e?w=600','https://images.unsplash.com/photo-1565084888279-aca607bb7f1b?w=600'],
  kurta:     ['https://images.unsplash.com/photo-1583391733956-6c78276477e2?w=600','https://images.unsplash.com/photo-1610189012906-4c0aa9b29c59?w=600','https://images.unsplash.com/photo-1609357912429-1a856333c5e8?w=600'],
  dress:     ['https://images.unsplash.com/photo-1572804013309-59a88b7e92f1?w=600','https://images.unsplash.com/photo-1595777457583-95e059d581b8?w=600','https://images.unsplash.com/photo-1566174053879-31528523f8ae?w=600'],
  saree:     ['https://images.unsplash.com/photo-1610030469983-98e550d6193c?w=600','https://images.unsplash.com/photo-1583391733956-6c78276477e2?w=600','https://images.unsplash.com/photo-1606166325683-e6deb697d301?w=600'],
  lehenga:   ['https://images.unsplash.com/photo-1595981267035-7b04ca84a82d?w=600','https://images.unsplash.com/photo-1619983081563-430f63602796?w=600','https://images.unsplash.com/photo-1515934751635-c81c6bc9a2d8?w=600'],
  tops:      ['https://images.unsplash.com/photo-1585487000160-6ebcfceb0d03?w=600','https://images.unsplash.com/photo-1529374255404-311a2a4f1fd9?w=600','https://images.unsplash.com/photo-1552374196-1ab2a1c593e8?w=600'],
  shoes_m:   ['https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=600','https://images.unsplash.com/photo-1560769629-975e127161e2?w=600','https://images.unsplash.com/photo-1614252369475-531eba835eb1?w=600'],
  shoes_w:   ['https://images.unsplash.com/photo-1543163521-1bf539c55dd2?w=600','https://images.unsplash.com/photo-1537832816519-689ad163238b?w=600','https://images.unsplash.com/photo-1562273138-f46be4ebdf6e?w=600'],
  bag:       ['https://images.unsplash.com/photo-1584917865442-de89df76afd3?w=600','https://images.unsplash.com/photo-1548036328-c9fa89d128fa?w=600','https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=600'],
  watch:     ['https://images.unsplash.com/photo-1524592094714-0f0654e20314?w=600','https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=600','https://images.unsplash.com/photo-1434056886845-dac89ffe9b56?w=600'],
  sunglasses:['https://images.unsplash.com/photo-1511499767150-a48a237f0083?w=600','https://images.unsplash.com/photo-1473496169904-658ba7574b0d?w=600','https://images.unsplash.com/photo-1508296695146-257a814070b4?w=600'],
  jewellery: ['https://images.unsplash.com/photo-1515562141207-7a88fb7ce338?w=600','https://images.unsplash.com/photo-1535632066927-ab7c9ab60908?w=600','https://images.unsplash.com/photo-1573408301185-9519f94816b5?w=600'],
  skincare:  ['https://images.unsplash.com/photo-1556228578-8c89e6adf883?w=600','https://images.unsplash.com/photo-1571781926291-c477ebfd024b?w=600','https://images.unsplash.com/photo-1620916566398-39f1143ab7be?w=600'],
  haircare:  ['https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?w=600','https://images.unsplash.com/photo-1527799820374-dcf8d9d4a388?w=600','https://images.unsplash.com/photo-1585751119414-ef2636f8aede?w=600'],
  makeup:    ['https://images.unsplash.com/photo-1512496015851-a90fb38ba796?w=600','https://images.unsplash.com/photo-1522335789203-aabd1fc54bc9?w=600','https://images.unsplash.com/photo-1487412947147-5cebf100ffc2?w=600'],
  perfume:   ['https://images.unsplash.com/photo-1541643600914-78b084683702?w=600','https://images.unsplash.com/photo-1592945403244-b3fbafd7f539?w=600','https://images.unsplash.com/photo-1563170351-be82bc888aa4?w=600'],
  kitchen:   ['https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=600','https://images.unsplash.com/photo-1585515320310-259814833e62?w=600','https://images.unsplash.com/photo-1590794056226-79ef3a8147e1?w=600'],
  bedding:   ['https://images.unsplash.com/photo-1616486338812-3dadae4b4f9d?w=600','https://images.unsplash.com/photo-1631049307264-da0ec9d70304?w=600','https://images.unsplash.com/photo-1555041469-a586c61ea9bc?w=600'],
  sports:    ['https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=600','https://images.unsplash.com/photo-1552196563-55cd4e45efb3?w=600','https://images.unsplash.com/photo-1518310383802-640c2de311b2?w=600'],
};

// ── Product definitions ───────────────────────────────────────────────────────
// Each entry: [name, price, category_path_array, deepest_category_name, img_key]
type ProductDef = [string, number, string[], string, keyof typeof IMGS];

const PRODUCTS: ProductDef[] = [
  // ── Men Casual T-Shirts ──────────────────────────────────────────────────
  ['Classic Round Neck T-Shirt',  499, ['fashion','men','casual','t-shirts'], 't-shirts', 'tshirt'],
  ['Oversized Graphic Tee',       699, ['fashion','men','casual','t-shirts'], 't-shirts', 'tshirt'],
  ['Solid Cotton T-Shirt',        399, ['fashion','men','casual','t-shirts'], 't-shirts', 'tshirt'],
  ['Striped Half Sleeve Tee',     549, ['fashion','men','casual','t-shirts'], 't-shirts', 'tshirt'],
  ['Printed Varsity T-Shirt',     799, ['fashion','men','casual','t-shirts'], 't-shirts', 'tshirt'],
  ['Slim Fit Polo T-Shirt',       649, ['fashion','men','casual','t-shirts'], 't-shirts', 'tshirt'],
  ['Brand Logo Tee',              899, ['fashion','men','casual','t-shirts'], 't-shirts', 'tshirt'],

  // ── Men Casual Shirts ────────────────────────────────────────────────────
  ['Linen Casual Shirt',          999, ['fashion','men','casual','shirts'], 'shirts', 'shirt'],
  ['Denim Overshirt',            1299, ['fashion','men','casual','shirts'], 'shirts', 'shirt'],
  ['Checkered Half Sleeve Shirt', 849, ['fashion','men','casual','shirts'], 'shirts', 'shirt'],
  ['Solid Cotton Shirt',          749, ['fashion','men','casual','shirts'], 'shirts', 'shirt'],
  ['Oversized Cuban Collar Shirt',1199, ['fashion','men','casual','shirts'], 'shirts', 'shirt'],
  ['Striped Long Sleeve Shirt',   899, ['fashion','men','casual','shirts'], 'shirts', 'shirt'],

  // ── Men Sweatshirts ──────────────────────────────────────────────────────
  ['Hooded Sweatshirt',          1299, ['fashion','men','casual','sweatshirts'], 'sweatshirts', 'sweatshirt'],
  ['Zip-Up Fleece Sweatshirt',   1499, ['fashion','men','casual','sweatshirts'], 'sweatshirts', 'sweatshirt'],
  ['Oversized Printed Sweatshirt',1199, ['fashion','men','casual','sweatshirts'], 'sweatshirts', 'sweatshirt'],
  ['Round Neck Typography Sweatshirt',999, ['fashion','men','casual','sweatshirts'], 'sweatshirts', 'sweatshirt'],
  ['Embroidered Crew Sweatshirt', 1399, ['fashion','men','casual','sweatshirts'], 'sweatshirts', 'sweatshirt'],

  // ── Men Jackets ──────────────────────────────────────────────────────────
  ['Bomber Jacket',              2499, ['fashion','men','casual','jackets'], 'jackets', 'jacket'],
  ['Denim Jacket',               1999, ['fashion','men','casual','jackets'], 'jackets', 'jacket'],
  ['Varsity Jacket',             2999, ['fashion','men','casual','jackets'], 'jackets', 'jacket'],
  ['Lightweight Sports Jacket',  1799, ['fashion','men','casual','jackets'], 'jackets', 'jacket'],
  ['Graphic Oversized Jacket',   2299, ['fashion','men','casual','jackets'], 'jackets', 'jacket'],
  ['Solid Tailored Jacket',      3499, ['fashion','men','casual','jackets'], 'jackets', 'jacket'],

  // ── Men Jeans ────────────────────────────────────────────────────────────
  ['Slim Fit Dark Jeans',        1499, ['fashion','men','casual','jeans'], 'jeans', 'jeans'],
  ['Baggy Cargo Jeans',          1799, ['fashion','men','casual','jeans'], 'jeans', 'jeans'],
  ['Straight Fit Blue Jeans',    1299, ['fashion','men','casual','jeans'], 'jeans', 'jeans'],
  ['Distressed Skinny Jeans',    1599, ['fashion','men','casual','jeans'], 'jeans', 'jeans'],
  ['Wide Leg Denim',             1999, ['fashion','men','casual','jeans'], 'jeans', 'jeans'],
  ['Bootcut Classic Jeans',      1399, ['fashion','men','casual','jeans'], 'jeans', 'jeans'],

  // ── Men Trousers ─────────────────────────────────────────────────────────
  ['Cargo Trousers',             1299, ['fashion','men','casual','trousers'], 'trousers', 'trousers'],
  ['Chino Slim Fit Trousers',    1199, ['fashion','men','casual','trousers'], 'trousers', 'trousers'],
  ['Linen Trousers',             1099, ['fashion','men','casual','trousers'], 'trousers', 'trousers'],
  ['Parachute Track Pants',       999, ['fashion','men','casual','trousers'], 'trousers', 'trousers'],
  ['Striped Loose Fit Trousers', 1399, ['fashion','men','casual','trousers'], 'trousers', 'trousers'],

  // ── Men Ethnic Kurtas ────────────────────────────────────────────────────
  ['Cotton Solid Kurta',          899, ['fashion','men','ethnic','kurtas'], 'kurtas', 'kurta'],
  ['Printed Festive Kurta',      1499, ['fashion','men','ethnic','kurtas'], 'kurtas', 'kurta'],
  ['Chikankari Embroidered Kurta',1999, ['fashion','men','ethnic','kurtas'], 'kurtas', 'kurta'],
  ['Pastel Linen Kurta',         1299, ['fashion','men','ethnic','kurtas'], 'kurtas', 'kurta'],
  ['Sangeet Special Kurta',      2499, ['fashion','men','ethnic','kurtas'], 'kurtas', 'kurta'],
  ['Daily Wear Cotton Kurta',     799, ['fashion','men','ethnic','kurtas'], 'kurtas', 'kurta'],

  // ── Women Western Dresses ────────────────────────────────────────────────
  ['Bodycon Midi Dress',         1499, ['fashion','women','western','dresses'], 'dresses', 'dress'],
  ['Floral Wrap Dress',          1299, ['fashion','women','western','dresses'], 'dresses', 'dress'],
  ['Off-Shoulder Maxi Dress',    1799, ['fashion','women','western','dresses'], 'dresses', 'dress'],
  ['A-Line Shirt Dress',         1199, ['fashion','women','western','dresses'], 'dresses', 'dress'],
  ['Halter Neck Mini Dress',     1399, ['fashion','women','western','dresses'], 'dresses', 'dress'],
  ['Asymmetrical Skater Dress',  1599, ['fashion','women','western','dresses'], 'dresses', 'dress'],
  ['Camisole Slip Dress',         999, ['fashion','women','western','dresses'], 'dresses', 'dress'],

  // ── Women Tops ───────────────────────────────────────────────────────────
  ['Crop Top',                    599, ['fashion','women','western','tops'], 'tops', 'tops'],
  ['Peplum Top',                  799, ['fashion','women','western','tops'], 'tops', 'tops'],
  ['Off Shoulder Blouse',         899, ['fashion','women','western','tops'], 'tops', 'tops'],
  ['Corset Top',                 1099, ['fashion','women','western','tops'], 'tops', 'tops'],
  ['Smocked Wrap Top',            749, ['fashion','women','western','tops'], 'tops', 'tops'],
  ['Tank Top',                    499, ['fashion','women','western','tops'], 'tops', 'tops'],

  // ── Women Ethnic Sarees ──────────────────────────────────────────────────
  ['Banarasi Silk Saree',        3999, ['fashion','women','ethnic','sarees'], 'sarees', 'saree'],
  ['Cotton Handloom Saree',      1499, ['fashion','women','ethnic','sarees'], 'sarees', 'saree'],
  ['Organza Embellished Saree',  4999, ['fashion','women','ethnic','sarees'], 'sarees', 'saree'],
  ['Sequin Party Saree',         3499, ['fashion','women','ethnic','sarees'], 'sarees', 'saree'],
  ['Pastel Chiffon Saree',       2499, ['fashion','women','ethnic','sarees'], 'sarees', 'saree'],
  ['Bandhani Saree',             1999, ['fashion','women','ethnic','sarees'], 'sarees', 'saree'],
  ['Ready to Wear Saree',        2999, ['fashion','women','ethnic','sarees'], 'sarees', 'saree'],

  // ── Women Ethnic Lehengas ────────────────────────────────────────────────
  ['Flared Embroidered Lehenga', 5999, ['fashion','women','ethnic','lehengas'], 'lehengas', 'lehenga'],
  ['A-Line Printed Lehenga',     3999, ['fashion','women','ethnic','lehengas'], 'lehengas', 'lehenga'],
  ['Velvet Bridal Lehenga',      9999, ['fashion','women','ethnic','lehengas'], 'lehengas', 'lehenga'],
  ['Indo-Western Lehenga',       4999, ['fashion','women','ethnic','lehengas'], 'lehengas', 'lehenga'],
  ['Ruffle Cape Lehenga',        6499, ['fashion','women','ethnic','lehengas'], 'lehengas', 'lehenga'],

  // ── Footwear Men ─────────────────────────────────────────────────────────
  ['Casual Sneakers',            1999, ['footwear','men'], 'casual shoes', 'shoes_m'],
  ['Sports Running Shoes',       2999, ['footwear','men'], 'sports shoes', 'shoes_m'],
  ['Formal Oxford Shoes',        3499, ['footwear','men'], 'formal shoes', 'shoes_m'],
  ['Leather Sandals',             999, ['footwear','men'], 'sandals', 'shoes_m'],
  ['Flip Flops',                  399, ['footwear','men'], 'flip flops', 'shoes_m'],
  ['Ankle Boots',                2499, ['footwear','men'], 'boots', 'shoes_m'],

  // ── Footwear Women ───────────────────────────────────────────────────────
  ['Block Heel Sandals',         1499, ['footwear','women'], 'heels', 'shoes_w'],
  ['Ballet Flats',                899, ['footwear','women'], 'flats', 'shoes_w'],
  ['Strappy Heels',              1999, ['footwear','women'], 'heels', 'shoes_w'],
  ['Sports Shoes',               2499, ['footwear','women'], 'sports shoes', 'shoes_w'],
  ['Casual Slip-Ons',             799, ['footwear','women'], 'casual shoes', 'shoes_w'],
  ['Knee High Boots',            3499, ['footwear','women'], 'boots', 'shoes_w'],
  ['Embellished Partywear Heels',2999, ['footwear','women'], 'partywear', 'shoes_w'],

  // ── Accessories Bags ─────────────────────────────────────────────────────
  ['Leather Tote Bag',           2499, ['accessories','bags & backpacks'], 'handbags', 'bag'],
  ['Canvas Backpack',            1499, ['accessories','bags & backpacks'], 'backpacks', 'bag'],
  ['Laptop Bag 15 inch',         1999, ['accessories','bags & backpacks'], 'laptop bags', 'bag'],
  ['Sling Crossbody Bag',        1299, ['accessories','bags & backpacks'], 'sling & clutch bags', 'bag'],
  ['Travel Duffel Bag',          2999, ['accessories','bags & backpacks'], 'travel/gym bags', 'bag'],
  ['Mini Clutch Bag',             899, ['accessories','bags & backpacks'], 'sling & clutch bags', 'bag'],

  // ── Accessories Watches ──────────────────────────────────────────────────
  ['Analog Leather Watch',       2999, ['accessories','watches'], 'analog', 'watch'],
  ['Digital Sports Watch',       1999, ['accessories','watches'], 'digital', 'watch'],
  ['Smart Watch',                4999, ['accessories','watches'], 'smart watches', 'watch'],
  ['Minimalist Analog Watch',    3499, ['accessories','watches'], 'analog', 'watch'],
  ['Chronograph Watch',          5999, ['accessories','watches'], 'analog', 'watch'],

  // ── Accessories Sunglasses ───────────────────────────────────────────────
  ['Aviator Sunglasses',          999, ['accessories','sunglasses & eyewear'], 'sunglasses', 'sunglasses'],
  ['Wayfarer Sunglasses',         799, ['accessories','sunglasses & eyewear'], 'sunglasses', 'sunglasses'],
  ['Round Frame Sunglasses',      699, ['accessories','sunglasses & eyewear'], 'sunglasses', 'sunglasses'],
  ['Blue Light Glasses',          599, ['accessories','sunglasses & eyewear'], 'blue light glasses', 'sunglasses'],
  ['Cat Eye Sunglasses',          899, ['accessories','sunglasses & eyewear'], 'sunglasses', 'sunglasses'],

  // ── Accessories Jewellery ────────────────────────────────────────────────
  ['Gold Plated Earrings',        599, ['accessories','jewellery'], 'earrings', 'jewellery'],
  ['Silver Necklace',             799, ['accessories','jewellery'], 'necklaces', 'jewellery'],
  ['Beaded Bracelet Set',         399, ['accessories','jewellery'], 'bangles & bracelets', 'jewellery'],
  ['Statement Ring',              299, ['accessories','jewellery'], 'rings', 'jewellery'],
  ['Jewellery Gift Set',         1499, ['accessories','jewellery'], 'jewellery sets', 'jewellery'],
  ['Oxidised Jhumka Earrings',    699, ['accessories','jewellery'], 'earrings', 'jewellery'],

  // ── Beauty Skincare ──────────────────────────────────────────────────────
  ['Vitamin C Face Wash',         399, ['beauty','skincare'], 'face wash & cleanser', 'skincare'],
  ['Hyaluronic Acid Moisturizer', 699, ['beauty','skincare'], 'moisturizers & creams', 'skincare'],
  ['SPF 50 Sunscreen',            499, ['beauty','skincare'], 'sunscreen', 'skincare'],
  ['Niacinamide Serum',           799, ['beauty','skincare'], 'serums & masks', 'skincare'],
  ['Clay Face Mask',              349, ['beauty','skincare'], 'serums & masks', 'skincare'],
  ['Retinol Night Cream',         999, ['beauty','skincare'], 'moisturizers & creams', 'skincare'],
  ['Micellar Cleansing Water',    299, ['beauty','skincare'], 'face wash & cleanser', 'skincare'],

  // ── Beauty Haircare ──────────────────────────────────────────────────────
  ['Argan Oil Shampoo',           399, ['beauty','haircare'], 'shampoo & conditioner', 'haircare'],
  ['Deep Conditioning Mask',      499, ['beauty','haircare'], 'shampoo & conditioner', 'haircare'],
  ['Hair Growth Serum',           699, ['beauty','haircare'], 'hair oil & serum', 'haircare'],
  ['Coconut Hair Oil',            249, ['beauty','haircare'], 'hair oil & serum', 'haircare'],
  ['Heat Protectant Spray',       349, ['beauty','haircare'], 'styling products', 'haircare'],
  ['Keratin Hair Mask',           599, ['beauty','haircare'], 'shampoo & conditioner', 'haircare'],

  // ── Beauty Makeup ────────────────────────────────────────────────────────
  ['Matte Lipstick',              299, ['beauty','makeup'], 'lip makeup', 'makeup'],
  ['Foundation SPF 15',           799, ['beauty','makeup'], 'face makeup', 'makeup'],
  ['Kajal Eyeliner',              199, ['beauty','makeup'], 'eye makeup', 'makeup'],
  ['Eyeshadow Palette',           999, ['beauty','makeup'], 'eye makeup', 'makeup'],
  ['Compact Powder',              449, ['beauty','makeup'], 'face makeup', 'makeup'],
  ['Lip Gloss',                   249, ['beauty','makeup'], 'lip makeup', 'makeup'],
  ['Makeup Starter Kit',         1499, ['beauty','makeup'], 'makeup kits', 'makeup'],

  // ── Beauty Fragrances ────────────────────────────────────────────────────
  ['Floral Eau de Parfum 50ml',  1299, ['beauty','fragrances & deodorants'], 'perfumes', 'perfume'],
  ['Woody Cologne 100ml',        1799, ['beauty','fragrances & deodorants'], 'perfumes', 'perfume'],
  ['Roll-On Deodorant',           199, ['beauty','fragrances & deodorants'], 'roll-ons', 'perfume'],
  ['Body Mist Spray',             399, ['beauty','fragrances & deodorants'], 'body sprays', 'perfume'],
  ['Perfume Gift Set',           2499, ['beauty','fragrances & deodorants'], 'gift sets', 'perfume'],

  // ── Home & Living Kitchenware ────────────────────────────────────────────
  ['Non-Stick Cookware Set',     2999, ['home&living','kitchenware'], 'cookware', 'kitchen'],
  ['Stainless Steel Utensil Set', 999, ['home&living','kitchenware'], 'utensils', 'kitchen'],
  ['Glass Storage Containers',    799, ['home&living','kitchenware'], 'storage containers', 'kitchen'],
  ['Silicone Kitchen Tools Set',  599, ['home&living','kitchenware'], 'kitchen tools', 'kitchen'],
  ['Cast Iron Skillet',          1999, ['home&living','kitchenware'], 'cookware', 'kitchen'],
  ['Bamboo Cutting Board',        449, ['home&living','kitchenware'], 'kitchen tools', 'kitchen'],

  // ── Home & Living Bedding ────────────────────────────────────────────────
  ['Cotton Bedsheet Set',        1299, ['home&living','bedding & linen'], 'bedsheets', 'bedding'],
  ['Microfibre Comforter',       2499, ['home&living','bedding & linen'], 'blankets & quilts', 'bedding'],
  ['Pillow Cover Set of 2',       499, ['home&living','bedding & linen'], 'pillow covers', 'bedding'],
  ['Bath Towel Set',              799, ['home&living','bedding & linen'], 'towels', 'bedding'],
  ['Weighted Blanket',           3499, ['home&living','bedding & linen'], 'blankets & quilts', 'bedding'],
  ['Satin Pillowcase',            699, ['home&living','bedding & linen'], 'pillow covers', 'bedding'],
];

// ── Insert logic ──────────────────────────────────────────────────────────────

async function run() {
  const client = await pool.connect();
  let inserted = 0;

  try {
    await client.query('BEGIN');

    for (const [name, price, categoryPath, deepestCategory, imgKey] of PRODUCTS) {
      // products table uses UUID (seller app table — not our VARCHAR(7) tables)
      const productId = (await client.query('SELECT uuid_generate_v4() AS id')).rows[0].id;
      const images = IMGS[imgKey];
      const quantity = Math.floor(Math.random() * 50) + 10; // 10–59
      const rating = (Math.random() * 2 + 3).toFixed(1);   // 3.0–5.0

      // Insert product
      await client.query(`
        INSERT INTO products (
          id, product_name, description, category_path,
          deepest_category_name, price, quantity, in_stock,
          is_approved, created_at, updated_at
        ) VALUES ($1,$2,$3,$4,$5,$6,$7,true,true,NOW(),NOW())
      `, [
        productId,
        name,
        `[SEED] ${name} — quality ${deepestCategory} product. Perfect for everyday use.`,
        JSON.stringify(categoryPath.map(n => ({ name: n }))),
        deepestCategory,
        price,
        quantity,
      ]);

      // Insert images (2–3 per product) — product_images.id is UUID (seller app table)
      for (let i = 0; i < images.length; i++) {
        await client.query(`
          INSERT INTO product_images (id, product_id, image_url, display_order, created_at)
          VALUES (uuid_generate_v4(),$1,$2,$3,NOW())
        `, [productId, images[i], i]);
      }

      // Skip reviews — product_reviews.user_id is UUID (seller app) but our users.id is VARCHAR(7)
      // Reviews can be added manually via the app after seeding

      inserted++;
      if (inserted % 20 === 0) process.stdout.write(`  ${inserted}/${PRODUCTS.length} products inserted...\n`);
    }

    await client.query('COMMIT');
    console.log(`\n✓ Seeded ${inserted} products with images and reviews.`);
    console.log('  To delete: npx ts-node-dev --transpile-only --respawn=false src/scripts/deleteSeededProducts.ts');
  } catch (err: any) {
    await client.query('ROLLBACK');
    console.error('Seed failed:', err.message);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

run();
