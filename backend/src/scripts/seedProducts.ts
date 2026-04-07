/**
 * Seed script — adds mock products for all major subcategories.
 * Run:   npx ts-node-dev --transpile-only --respawn=false src/scripts/seedProducts.ts
 * Delete: npx ts-node-dev --transpile-only --respawn=false src/scripts/deleteSeededProducts.ts
 *
 * All seeded products are tagged with description starting with "[SEED]" for easy identification.
 * Each product has its own unique set of images.
 */
import dotenv from 'dotenv';
import { pool } from '../db';
dotenv.config();

// ── Product definitions ───────────────────────────────────────────────────────
// Each entry: [name, price, category_path_array, deepest_category_name, images[]]
type ProductDef = [string, number, string[], string, string[]];

const PRODUCTS: ProductDef[] = [
  // ── Men Casual T-Shirts ──────────────────────────────────────────────────
  ['Classic Round Neck T-Shirt',  499, ['fashion','men','casual','t-shirts'], 't-shirts',
    ['https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=600','https://images.unsplash.com/photo-1503341504253-dff4815485f1?w=600','https://images.unsplash.com/photo-1576566588028-4147f3842f27?w=600']],
  ['Oversized Graphic Tee',       699, ['fashion','men','casual','t-shirts'], 't-shirts',
    ['https://images.unsplash.com/photo-1583743814966-8936f5b7be1a?w=600','https://images.unsplash.com/photo-1529374255404-311a2a4f1fd9?w=600','https://images.unsplash.com/photo-1562157873-818bc0726f68?w=600']],
  ['Solid Cotton T-Shirt',        399, ['fashion','men','casual','t-shirts'], 't-shirts',
    ['https://images.unsplash.com/photo-1618354691373-d851c5c3a990?w=600','https://images.unsplash.com/photo-1622445275463-afa2ab738c34?w=600','https://images.unsplash.com/photo-1586790170083-2f9ceadc732d?w=600']],
  ['Striped Half Sleeve Tee',     549, ['fashion','men','casual','t-shirts'], 't-shirts',
    ['https://images.unsplash.com/photo-1596755094514-f87e34085b2c?w=600','https://images.unsplash.com/photo-1571945153237-4929e783af4a?w=600','https://images.unsplash.com/photo-1604006852748-903fccbc4019?w=600']],
  ['Printed Varsity T-Shirt',     799, ['fashion','men','casual','t-shirts'], 't-shirts',
    ['https://images.unsplash.com/photo-1554568218-0f1715e72254?w=600','https://images.unsplash.com/photo-1503342217505-b0a15ec3261c?w=600','https://images.unsplash.com/photo-1523381294911-8d3cead13475?w=600']],
  ['Slim Fit Polo T-Shirt',       649, ['fashion','men','casual','t-shirts'], 't-shirts',
    ['https://images.unsplash.com/photo-1626557981101-aae6f84aa6ff?w=600','https://images.unsplash.com/photo-1625910513462-e8e5e5e5e5e5?w=600','https://images.unsplash.com/photo-1598033129183-c4f50c736f10?w=600']],
  ['Brand Logo Tee',              899, ['fashion','men','casual','t-shirts'], 't-shirts',
    ['https://images.unsplash.com/photo-1527719327859-c6ce80353573?w=600','https://images.unsplash.com/photo-1543076447-215ad9ba6923?w=600','https://images.unsplash.com/photo-1581655353564-df123a1eb820?w=600']],

  // ── Men Casual Shirts ────────────────────────────────────────────────────
  ['Linen Casual Shirt',          999, ['fashion','men','casual','shirts'], 'shirts',
    ['https://images.unsplash.com/photo-1596755094514-f87e34085b2c?w=600','https://images.unsplash.com/photo-1602810318383-e386cc2a3ccf?w=600','https://images.unsplash.com/photo-1620012253295-c15cc3e65df4?w=600']],
  ['Denim Overshirt',            1299, ['fashion','men','casual','shirts'], 'shirts',
    ['https://images.unsplash.com/photo-1607345366928-199ea26cfe3e?w=600','https://images.unsplash.com/photo-1589310243389-96a5483213a8?w=600','https://images.unsplash.com/photo-1563630423918-b58f07336ac9?w=600']],
  ['Checkered Half Sleeve Shirt', 849, ['fashion','men','casual','shirts'], 'shirts',
    ['https://images.unsplash.com/photo-1598033129183-c4f50c736f10?w=600','https://images.unsplash.com/photo-1516826957135-700dedea698c?w=600','https://images.unsplash.com/photo-1604006852748-903fccbc4019?w=600']],
  ['Solid Cotton Shirt',          749, ['fashion','men','casual','shirts'], 'shirts',
    ['https://images.unsplash.com/photo-1620799140408-ed5341cdb4f3?w=600','https://images.unsplash.com/photo-1603252109303-2751441dd157?w=600','https://images.unsplash.com/photo-1594938298603-c8148c4b4f7b?w=600']],
  ['Oversized Cuban Collar Shirt',1199, ['fashion','men','casual','shirts'], 'shirts',
    ['https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=600','https://images.unsplash.com/photo-1552196563-55cd4e45efb3?w=600','https://images.unsplash.com/photo-1518310383802-640c2de311b2?w=600']],
  ['Striped Long Sleeve Shirt',   899, ['fashion','men','casual','shirts'], 'shirts',
    ['https://images.unsplash.com/photo-1512327428889-b6e8e5e5e5e5?w=600','https://images.unsplash.com/photo-1490114538077-0a7f8cb49891?w=600','https://images.unsplash.com/photo-1506629082955-511b1aa562c8?w=600']],

  // ── Men Sweatshirts ──────────────────────────────────────────────────────
  ['Hooded Sweatshirt',          1299, ['fashion','men','casual','sweatshirts'], 'sweatshirts',
    ['https://images.unsplash.com/photo-1556905055-8f358a7a47b2?w=600','https://images.unsplash.com/photo-1620799140408-ed5341cdb4f3?w=600','https://images.unsplash.com/photo-1578587018452-892bacefd3f2?w=600']],
  ['Zip-Up Fleece Sweatshirt',   1499, ['fashion','men','casual','sweatshirts'], 'sweatshirts',
    ['https://images.unsplash.com/photo-1591047139829-d91aecb6caea?w=600','https://images.unsplash.com/photo-1548126032-079a0fb0099d?w=600','https://images.unsplash.com/photo-1551028719-00167b16eac5?w=600']],
  ['Oversized Printed Sweatshirt',1199, ['fashion','men','casual','sweatshirts'], 'sweatshirts',
    ['https://images.unsplash.com/photo-1614252369475-531eba835eb1?w=600','https://images.unsplash.com/photo-1607345366928-199ea26cfe3e?w=600','https://images.unsplash.com/photo-1583743814966-8936f5b7be1a?w=600']],
  ['Round Neck Typography Sweatshirt',999, ['fashion','men','casual','sweatshirts'], 'sweatshirts',
    ['https://images.unsplash.com/photo-1562157873-818bc0726f68?w=600','https://images.unsplash.com/photo-1523381294911-8d3cead13475?w=600','https://images.unsplash.com/photo-1554568218-0f1715e72254?w=600']],
  ['Embroidered Crew Sweatshirt', 1399, ['fashion','men','casual','sweatshirts'], 'sweatshirts',
    ['https://images.unsplash.com/photo-1618354691373-d851c5c3a990?w=600','https://images.unsplash.com/photo-1586790170083-2f9ceadc732d?w=600','https://images.unsplash.com/photo-1622445275463-afa2ab738c34?w=600']],

  // ── Men Jackets ──────────────────────────────────────────────────────────
  ['Bomber Jacket',              2499, ['fashion','men','casual','jackets'], 'jackets',
    ['https://images.unsplash.com/photo-1591047139829-d91aecb6caea?w=600','https://images.unsplash.com/photo-1548126032-079a0fb0099d?w=600','https://images.unsplash.com/photo-1551028719-00167b16eac5?w=600']],
  ['Denim Jacket',               1999, ['fashion','men','casual','jackets'], 'jackets',
    ['https://images.unsplash.com/photo-1576871337622-98d48d1cf531?w=600','https://images.unsplash.com/photo-1611312449408-fcece27cdbb7?w=600','https://images.unsplash.com/photo-1601333144130-8cbb312386b6?w=600']],
  ['Varsity Jacket',             2999, ['fashion','men','casual','jackets'], 'jackets',
    ['https://images.unsplash.com/photo-1520975954732-35dd22299614?w=600','https://images.unsplash.com/photo-1544441893-675973e31985?w=600','https://images.unsplash.com/photo-1509631179647-0177331693ae?w=600']],
  ['Lightweight Sports Jacket',  1799, ['fashion','men','casual','jackets'], 'jackets',
    ['https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=600','https://images.unsplash.com/photo-1560769629-975e127161e2?w=600','https://images.unsplash.com/photo-1606107557195-0e29a4b5b4aa?w=600']],
  ['Graphic Oversized Jacket',   2299, ['fashion','men','casual','jackets'], 'jackets',
    ['https://images.unsplash.com/photo-1503341504253-dff4815485f1?w=600','https://images.unsplash.com/photo-1527719327859-c6ce80353573?w=600','https://images.unsplash.com/photo-1543076447-215ad9ba6923?w=600']],
  ['Solid Tailored Jacket',      3499, ['fashion','men','casual','jackets'], 'jackets',
    ['https://images.unsplash.com/photo-1507679799987-c73779587ccf?w=600','https://images.unsplash.com/photo-1593030761757-71fae45fa0e7?w=600','https://images.unsplash.com/photo-1617137968427-85924c800a22?w=600']],

  // ── Men Jeans ────────────────────────────────────────────────────────────
  ['Slim Fit Dark Jeans',        1499, ['fashion','men','casual','jeans'], 'jeans',
    ['https://images.unsplash.com/photo-1542272454315-4c01d7abdf4a?w=600','https://images.unsplash.com/photo-1541099649105-f69ad21f3246?w=600','https://images.unsplash.com/photo-1475178626620-a4d074967452?w=600']],
  ['Baggy Cargo Jeans',          1799, ['fashion','men','casual','jeans'], 'jeans',
    ['https://images.unsplash.com/photo-1604176354204-9268737828e4?w=600','https://images.unsplash.com/photo-1624378439575-d8705ad7ae80?w=600','https://images.unsplash.com/photo-1473966968600-fa801b869a1a?w=600']],
  ['Straight Fit Blue Jeans',    1299, ['fashion','men','casual','jeans'], 'jeans',
    ['https://images.unsplash.com/photo-1555689502-c4b22d76c56f?w=600','https://images.unsplash.com/photo-1582552938357-32b906df40cb?w=600','https://images.unsplash.com/photo-1598554747436-c9293d6a588f?w=600']],
  ['Distressed Skinny Jeans',    1599, ['fashion','men','casual','jeans'], 'jeans',
    ['https://images.unsplash.com/photo-1565084888279-aca607bb7f1b?w=600','https://images.unsplash.com/photo-1591195853828-11db59a44f6b?w=600','https://images.unsplash.com/photo-1562183241-840b8af0721e?w=600']],
  ['Wide Leg Denim',             1999, ['fashion','men','casual','jeans'], 'jeans',
    ['https://images.unsplash.com/photo-1473966968600-fa801b869a1a?w=600','https://images.unsplash.com/photo-1594938298603-c8148c4b4f7b?w=600','https://images.unsplash.com/photo-1624378439575-d8705ad7ae80?w=600']],
  ['Bootcut Classic Jeans',      1399, ['fashion','men','casual','jeans'], 'jeans',
    ['https://images.unsplash.com/photo-1598554747436-c9293d6a588f?w=600','https://images.unsplash.com/photo-1555689502-c4b22d76c56f?w=600','https://images.unsplash.com/photo-1582552938357-32b906df40cb?w=600']],

  // ── Men Trousers ─────────────────────────────────────────────────────────
  ['Cargo Trousers',             1299, ['fashion','men','casual','trousers'], 'trousers',
    ['https://images.unsplash.com/photo-1624378439575-d8705ad7ae80?w=600','https://images.unsplash.com/photo-1473966968600-fa801b869a1a?w=600','https://images.unsplash.com/photo-1594938298603-c8148c4b4f7b?w=600']],
  ['Chino Slim Fit Trousers',    1199, ['fashion','men','casual','trousers'], 'trousers',
    ['https://images.unsplash.com/photo-1552902865-b72c031ac5ea?w=600','https://images.unsplash.com/photo-1541099649105-f69ad21f3246?w=600','https://images.unsplash.com/photo-1604176354204-9268737828e4?w=600']],
  ['Linen Trousers',             1099, ['fashion','men','casual','trousers'], 'trousers',
    ['https://images.unsplash.com/photo-1598554747436-c9293d6a588f?w=600','https://images.unsplash.com/photo-1542272454315-4c01d7abdf4a?w=600','https://images.unsplash.com/photo-1555689502-c4b22d76c56f?w=600']],
  ['Parachute Track Pants',       999, ['fashion','men','casual','trousers'], 'trousers',
    ['https://images.unsplash.com/photo-1565084888279-aca607bb7f1b?w=600','https://images.unsplash.com/photo-1591195853828-11db59a44f6b?w=600','https://images.unsplash.com/photo-1562183241-840b8af0721e?w=600']],
  ['Striped Loose Fit Trousers', 1399, ['fashion','men','casual','trousers'], 'trousers',
    ['https://images.unsplash.com/photo-1582552938357-32b906df40cb?w=600','https://images.unsplash.com/photo-1475178626620-a4d074967452?w=600','https://images.unsplash.com/photo-1624378439575-d8705ad7ae80?w=600']],

  // ── Men Ethnic Kurtas ────────────────────────────────────────────────────
  ['Cotton Solid Kurta',          899, ['fashion','men','ethnic','kurtas'], 'kurtas',
    ['https://images.unsplash.com/photo-1583391733956-6c78276477e2?w=600','https://images.unsplash.com/photo-1610189012906-4c0aa9b29c59?w=600','https://images.unsplash.com/photo-1609357912429-1a856333c5e8?w=600']],
  ['Printed Festive Kurta',      1499, ['fashion','men','ethnic','kurtas'], 'kurtas',
    ['https://images.unsplash.com/photo-1610030469983-98e550d6193c?w=600','https://images.unsplash.com/photo-1606166325683-e6deb697d301?w=600','https://images.unsplash.com/photo-1583391733956-6c78276477e2?w=600']],
  ['Chikankari Embroidered Kurta',1999, ['fashion','men','ethnic','kurtas'], 'kurtas',
    ['https://images.unsplash.com/photo-1609357912429-1a856333c5e8?w=600','https://images.unsplash.com/photo-1583391733956-6c78276477e2?w=600','https://images.unsplash.com/photo-1610189012906-4c0aa9b29c59?w=600']],
  ['Pastel Linen Kurta',         1299, ['fashion','men','ethnic','kurtas'], 'kurtas',
    ['https://images.unsplash.com/photo-1606166325683-e6deb697d301?w=600','https://images.unsplash.com/photo-1610030469983-98e550d6193c?w=600','https://images.unsplash.com/photo-1609357912429-1a856333c5e8?w=600']],
  ['Sangeet Special Kurta',      2499, ['fashion','men','ethnic','kurtas'], 'kurtas',
    ['https://images.unsplash.com/photo-1595981267035-7b04ca84a82d?w=600','https://images.unsplash.com/photo-1619983081563-430f63602796?w=600','https://images.unsplash.com/photo-1515934751635-c81c6bc9a2d8?w=600']],
  ['Daily Wear Cotton Kurta',     799, ['fashion','men','ethnic','kurtas'], 'kurtas',
    ['https://images.unsplash.com/photo-1610189012906-4c0aa9b29c59?w=600','https://images.unsplash.com/photo-1609357912429-1a856333c5e8?w=600','https://images.unsplash.com/photo-1583391733956-6c78276477e2?w=600']],

  // ── Women Western Dresses ────────────────────────────────────────────────
  ['Bodycon Midi Dress',         1499, ['fashion','women','western','dresses'], 'dresses',
    ['https://images.unsplash.com/photo-1572804013309-59a88b7e92f1?w=600','https://images.unsplash.com/photo-1595777457583-95e059d581b8?w=600','https://images.unsplash.com/photo-1566174053879-31528523f8ae?w=600']],
  ['Floral Wrap Dress',          1299, ['fashion','women','western','dresses'], 'dresses',
    ['https://images.unsplash.com/photo-1496747611176-843222e1e57c?w=600','https://images.unsplash.com/photo-1515372039744-b8f02a3ae446?w=600','https://images.unsplash.com/photo-1539109136881-3be0616acf4b?w=600']],
  ['Off-Shoulder Maxi Dress',    1799, ['fashion','women','western','dresses'], 'dresses',
    ['https://images.unsplash.com/photo-1502716119720-b23a93e5fe1b?w=600','https://images.unsplash.com/photo-1485968579580-b6d095142e6e?w=600','https://images.unsplash.com/photo-1490481651871-ab68de25d43d?w=600']],
  ['A-Line Shirt Dress',         1199, ['fashion','women','western','dresses'], 'dresses',
    ['https://images.unsplash.com/photo-1583744946564-b52ac1c389c8?w=600','https://images.unsplash.com/photo-1518611012118-696072aa579a?w=600','https://images.unsplash.com/photo-1469334031218-e382a71b716b?w=600']],
  ['Halter Neck Mini Dress',     1399, ['fashion','women','western','dresses'], 'dresses',
    ['https://images.unsplash.com/photo-1551803091-e20673f15770?w=600','https://images.unsplash.com/photo-1568252542512-9fe8fe9c87bb?w=600','https://images.unsplash.com/photo-1509631179647-0177331693ae?w=600']],
  ['Asymmetrical Skater Dress',  1599, ['fashion','women','western','dresses'], 'dresses',
    ['https://images.unsplash.com/photo-1520975954732-35dd22299614?w=600','https://images.unsplash.com/photo-1544441893-675973e31985?w=600','https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?w=600']],
  ['Camisole Slip Dress',         999, ['fashion','women','western','dresses'], 'dresses',
    ['https://images.unsplash.com/photo-1551232864-3f0890e580d9?w=600','https://images.unsplash.com/photo-1485968579580-b6d095142e6e?w=600','https://images.unsplash.com/photo-1496747611176-843222e1e57c?w=600']],

  // ── Women Tops ───────────────────────────────────────────────────────────
  ['Crop Top',                    599, ['fashion','women','western','tops'], 'tops',
    ['https://images.unsplash.com/photo-1585487000160-6ebcfceb0d03?w=600','https://images.unsplash.com/photo-1529374255404-311a2a4f1fd9?w=600','https://images.unsplash.com/photo-1552374196-1ab2a1c593e8?w=600']],
  ['Peplum Top',                  799, ['fashion','women','western','tops'], 'tops',
    ['https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?w=600','https://images.unsplash.com/photo-1469334031218-e382a71b716b?w=600','https://images.unsplash.com/photo-1490481651871-ab68de25d43d?w=600']],
  ['Off Shoulder Blouse',         899, ['fashion','women','western','tops'], 'tops',
    ['https://images.unsplash.com/photo-1485968579580-b6d095142e6e?w=600','https://images.unsplash.com/photo-1502716119720-b23a93e5fe1b?w=600','https://images.unsplash.com/photo-1496747611176-843222e1e57c?w=600']],
  ['Corset Top',                 1099, ['fashion','women','western','tops'], 'tops',
    ['https://images.unsplash.com/photo-1539109136881-3be0616acf4b?w=600','https://images.unsplash.com/photo-1515372039744-b8f02a3ae446?w=600','https://images.unsplash.com/photo-1583744946564-b52ac1c389c8?w=600']],
  ['Smocked Wrap Top',            749, ['fashion','women','western','tops'], 'tops',
    ['https://images.unsplash.com/photo-1518611012118-696072aa579a?w=600','https://images.unsplash.com/photo-1551803091-e20673f15770?w=600','https://images.unsplash.com/photo-1568252542512-9fe8fe9c87bb?w=600']],
  ['Tank Top',                    499, ['fashion','women','western','tops'], 'tops',
    ['https://images.unsplash.com/photo-1552374196-1ab2a1c593e8?w=600','https://images.unsplash.com/photo-1585487000160-6ebcfceb0d03?w=600','https://images.unsplash.com/photo-1529374255404-311a2a4f1fd9?w=600']],

  // ── Women Ethnic Sarees ──────────────────────────────────────────────────
  ['Banarasi Silk Saree',        3999, ['fashion','women','ethnic','sarees'], 'sarees',
    ['https://images.unsplash.com/photo-1610030469983-98e550d6193c?w=600','https://images.unsplash.com/photo-1606166325683-e6deb697d301?w=600','https://images.unsplash.com/photo-1583391733956-6c78276477e2?w=600']],
  ['Cotton Handloom Saree',      1499, ['fashion','women','ethnic','sarees'], 'sarees',
    ['https://images.unsplash.com/photo-1609357912429-1a856333c5e8?w=600','https://images.unsplash.com/photo-1610030469983-98e550d6193c?w=600','https://images.unsplash.com/photo-1606166325683-e6deb697d301?w=600']],
  ['Organza Embellished Saree',  4999, ['fashion','women','ethnic','sarees'], 'sarees',
    ['https://images.unsplash.com/photo-1595981267035-7b04ca84a82d?w=600','https://images.unsplash.com/photo-1619983081563-430f63602796?w=600','https://images.unsplash.com/photo-1515934751635-c81c6bc9a2d8?w=600']],
  ['Sequin Party Saree',         3499, ['fashion','women','ethnic','sarees'], 'sarees',
    ['https://images.unsplash.com/photo-1515934751635-c81c6bc9a2d8?w=600','https://images.unsplash.com/photo-1595981267035-7b04ca84a82d?w=600','https://images.unsplash.com/photo-1619983081563-430f63602796?w=600']],
  ['Pastel Chiffon Saree',       2499, ['fashion','women','ethnic','sarees'], 'sarees',
    ['https://images.unsplash.com/photo-1619983081563-430f63602796?w=600','https://images.unsplash.com/photo-1515934751635-c81c6bc9a2d8?w=600','https://images.unsplash.com/photo-1610030469983-98e550d6193c?w=600']],
  ['Bandhani Saree',             1999, ['fashion','women','ethnic','sarees'], 'sarees',
    ['https://images.unsplash.com/photo-1606166325683-e6deb697d301?w=600','https://images.unsplash.com/photo-1609357912429-1a856333c5e8?w=600','https://images.unsplash.com/photo-1583391733956-6c78276477e2?w=600']],
  ['Ready to Wear Saree',        2999, ['fashion','women','ethnic','sarees'], 'sarees',
    ['https://images.unsplash.com/photo-1583391733956-6c78276477e2?w=600','https://images.unsplash.com/photo-1595981267035-7b04ca84a82d?w=600','https://images.unsplash.com/photo-1610030469983-98e550d6193c?w=600']],

  // ── Women Ethnic Lehengas ────────────────────────────────────────────────
  ['Flared Embroidered Lehenga', 5999, ['fashion','women','ethnic','lehengas'], 'lehengas',
    ['https://images.unsplash.com/photo-1595981267035-7b04ca84a82d?w=600','https://images.unsplash.com/photo-1619983081563-430f63602796?w=600','https://images.unsplash.com/photo-1515934751635-c81c6bc9a2d8?w=600']],
  ['A-Line Printed Lehenga',     3999, ['fashion','women','ethnic','lehengas'], 'lehengas',
    ['https://images.unsplash.com/photo-1619983081563-430f63602796?w=600','https://images.unsplash.com/photo-1515934751635-c81c6bc9a2d8?w=600','https://images.unsplash.com/photo-1595981267035-7b04ca84a82d?w=600']],
  ['Velvet Bridal Lehenga',      9999, ['fashion','women','ethnic','lehengas'], 'lehengas',
    ['https://images.unsplash.com/photo-1515934751635-c81c6bc9a2d8?w=600','https://images.unsplash.com/photo-1595981267035-7b04ca84a82d?w=600','https://images.unsplash.com/photo-1619983081563-430f63602796?w=600']],
  ['Indo-Western Lehenga',       4999, ['fashion','women','ethnic','lehengas'], 'lehengas',
    ['https://images.unsplash.com/photo-1610030469983-98e550d6193c?w=600','https://images.unsplash.com/photo-1606166325683-e6deb697d301?w=600','https://images.unsplash.com/photo-1609357912429-1a856333c5e8?w=600']],
  ['Ruffle Cape Lehenga',        6499, ['fashion','women','ethnic','lehengas'], 'lehengas',
    ['https://images.unsplash.com/photo-1606166325683-e6deb697d301?w=600','https://images.unsplash.com/photo-1610030469983-98e550d6193c?w=600','https://images.unsplash.com/photo-1583391733956-6c78276477e2?w=600']],

  // ── Footwear Men ─────────────────────────────────────────────────────────
  ['Casual Sneakers',            1999, ['footwear','men'], 'casual shoes',
    ['https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=600','https://images.unsplash.com/photo-1560769629-975e127161e2?w=600','https://images.unsplash.com/photo-1606107557195-0e29a4b5b4aa?w=600']],
  ['Sports Running Shoes',       2999, ['footwear','men'], 'sports shoes',
    ['https://images.unsplash.com/photo-1595950653106-6c9ebd614d3a?w=600','https://images.unsplash.com/photo-1491553895911-0055eca6402d?w=600','https://images.unsplash.com/photo-1539185441755-769473a23570?w=600']],
  ['Formal Oxford Shoes',        3499, ['footwear','men'], 'formal shoes',
    ['https://images.unsplash.com/photo-1614252369475-531eba835eb1?w=600','https://images.unsplash.com/photo-1507679799987-c73779587ccf?w=600','https://images.unsplash.com/photo-1617137968427-85924c800a22?w=600']],
  ['Leather Sandals',             999, ['footwear','men'], 'sandals',
    ['https://images.unsplash.com/photo-1603487742131-4160ec999306?w=600','https://images.unsplash.com/photo-1562183241-840b8af0721e?w=600','https://images.unsplash.com/photo-1591195853828-11db59a44f6b?w=600']],
  ['Flip Flops',                  399, ['footwear','men'], 'flip flops',
    ['https://images.unsplash.com/photo-1565084888279-aca607bb7f1b?w=600','https://images.unsplash.com/photo-1603487742131-4160ec999306?w=600','https://images.unsplash.com/photo-1562183241-840b8af0721e?w=600']],
  ['Ankle Boots',                2499, ['footwear','men'], 'boots',
    ['https://images.unsplash.com/photo-1520639888713-7851133b1ed0?w=600','https://images.unsplash.com/photo-1608256246200-53e635b5b65f?w=600','https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=600']],

  // ── Footwear Women ───────────────────────────────────────────────────────
  ['Block Heel Sandals',         1499, ['footwear','women'], 'heels',
    ['https://images.unsplash.com/photo-1543163521-1bf539c55dd2?w=600','https://images.unsplash.com/photo-1537832816519-689ad163238b?w=600','https://images.unsplash.com/photo-1562273138-f46be4ebdf6e?w=600']],
  ['Ballet Flats',                899, ['footwear','women'], 'flats',
    ['https://images.unsplash.com/photo-1515347619252-60a4bf4fff4f?w=600','https://images.unsplash.com/photo-1543163521-1bf539c55dd2?w=600','https://images.unsplash.com/photo-1537832816519-689ad163238b?w=600']],
  ['Strappy Heels',              1999, ['footwear','women'], 'heels',
    ['https://images.unsplash.com/photo-1562273138-f46be4ebdf6e?w=600','https://images.unsplash.com/photo-1515347619252-60a4bf4fff4f?w=600','https://images.unsplash.com/photo-1543163521-1bf539c55dd2?w=600']],
  ['Sports Shoes',               2499, ['footwear','women'], 'sports shoes',
    ['https://images.unsplash.com/photo-1595950653106-6c9ebd614d3a?w=600','https://images.unsplash.com/photo-1491553895911-0055eca6402d?w=600','https://images.unsplash.com/photo-1539185441755-769473a23570?w=600']],
  ['Casual Slip-Ons',             799, ['footwear','women'], 'casual shoes',
    ['https://images.unsplash.com/photo-1537832816519-689ad163238b?w=600','https://images.unsplash.com/photo-1562273138-f46be4ebdf6e?w=600','https://images.unsplash.com/photo-1515347619252-60a4bf4fff4f?w=600']],
  ['Knee High Boots',            3499, ['footwear','women'], 'boots',
    ['https://images.unsplash.com/photo-1608256246200-53e635b5b65f?w=600','https://images.unsplash.com/photo-1520639888713-7851133b1ed0?w=600','https://images.unsplash.com/photo-1543163521-1bf539c55dd2?w=600']],
  ['Embellished Partywear Heels',2999, ['footwear','women'], 'partywear',
    ['https://images.unsplash.com/photo-1515347619252-60a4bf4fff4f?w=600','https://images.unsplash.com/photo-1562273138-f46be4ebdf6e?w=600','https://images.unsplash.com/photo-1537832816519-689ad163238b?w=600']],

  // ── Accessories Bags ─────────────────────────────────────────────────────
  ['Leather Tote Bag',           2499, ['accessories','bags & backpacks'], 'handbags',
    ['https://images.unsplash.com/photo-1584917865442-de89df76afd3?w=600','https://images.unsplash.com/photo-1548036328-c9fa89d128fa?w=600','https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=600']],
  ['Canvas Backpack',            1499, ['accessories','bags & backpacks'], 'backpacks',
    ['https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=600','https://images.unsplash.com/photo-1622560480605-d83c853bc5c3?w=600','https://images.unsplash.com/photo-1581605405669-fcdf81165afa?w=600']],
  ['Laptop Bag 15 inch',         1999, ['accessories','bags & backpacks'], 'laptop bags',
    ['https://images.unsplash.com/photo-1548036328-c9fa89d128fa?w=600','https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=600','https://images.unsplash.com/photo-1622560480605-d83c853bc5c3?w=600']],
  ['Sling Crossbody Bag',        1299, ['accessories','bags & backpacks'], 'sling & clutch bags',
    ['https://images.unsplash.com/photo-1590874103328-eac38a683ce7?w=600','https://images.unsplash.com/photo-1584917865442-de89df76afd3?w=600','https://images.unsplash.com/photo-1548036328-c9fa89d128fa?w=600']],
  ['Travel Duffel Bag',          2999, ['accessories','bags & backpacks'], 'travel/gym bags',
    ['https://images.unsplash.com/photo-1581605405669-fcdf81165afa?w=600','https://images.unsplash.com/photo-1590874103328-eac38a683ce7?w=600','https://images.unsplash.com/photo-1622560480605-d83c853bc5c3?w=600']],
  ['Mini Clutch Bag',             899, ['accessories','bags & backpacks'], 'sling & clutch bags',
    ['https://images.unsplash.com/photo-1622560480605-d83c853bc5c3?w=600','https://images.unsplash.com/photo-1581605405669-fcdf81165afa?w=600','https://images.unsplash.com/photo-1590874103328-eac38a683ce7?w=600']],

  // ── Accessories Watches ──────────────────────────────────────────────────
  ['Analog Leather Watch',       2999, ['accessories','watches'], 'analog',
    ['https://images.unsplash.com/photo-1524592094714-0f0654e20314?w=600','https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=600','https://images.unsplash.com/photo-1434056886845-dac89ffe9b56?w=600']],
  ['Digital Sports Watch',       1999, ['accessories','watches'], 'digital',
    ['https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=600','https://images.unsplash.com/photo-1434056886845-dac89ffe9b56?w=600','https://images.unsplash.com/photo-1524592094714-0f0654e20314?w=600']],
  ['Smart Watch',                4999, ['accessories','watches'], 'smart watches',
    ['https://images.unsplash.com/photo-1579586337278-3befd40fd17a?w=600','https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=600','https://images.unsplash.com/photo-1434056886845-dac89ffe9b56?w=600']],
  ['Minimalist Analog Watch',    3499, ['accessories','watches'], 'analog',
    ['https://images.unsplash.com/photo-1434056886845-dac89ffe9b56?w=600','https://images.unsplash.com/photo-1524592094714-0f0654e20314?w=600','https://images.unsplash.com/photo-1579586337278-3befd40fd17a?w=600']],
  ['Chronograph Watch',          5999, ['accessories','watches'], 'analog',
    ['https://images.unsplash.com/photo-1547996160-81dfa63595aa?w=600','https://images.unsplash.com/photo-1579586337278-3befd40fd17a?w=600','https://images.unsplash.com/photo-1524592094714-0f0654e20314?w=600']],

  // ── Accessories Sunglasses ───────────────────────────────────────────────
  ['Aviator Sunglasses',          999, ['accessories','sunglasses & eyewear'], 'sunglasses',
    ['https://images.unsplash.com/photo-1511499767150-a48a237f0083?w=600','https://images.unsplash.com/photo-1473496169904-658ba7574b0d?w=600','https://images.unsplash.com/photo-1508296695146-257a814070b4?w=600']],
  ['Wayfarer Sunglasses',         799, ['accessories','sunglasses & eyewear'], 'sunglasses',
    ['https://images.unsplash.com/photo-1473496169904-658ba7574b0d?w=600','https://images.unsplash.com/photo-1508296695146-257a814070b4?w=600','https://images.unsplash.com/photo-1511499767150-a48a237f0083?w=600']],
  ['Round Frame Sunglasses',      699, ['accessories','sunglasses & eyewear'], 'sunglasses',
    ['https://images.unsplash.com/photo-1508296695146-257a814070b4?w=600','https://images.unsplash.com/photo-1511499767150-a48a237f0083?w=600','https://images.unsplash.com/photo-1473496169904-658ba7574b0d?w=600']],
  ['Blue Light Glasses',          599, ['accessories','sunglasses & eyewear'], 'blue light glasses',
    ['https://images.unsplash.com/photo-1574258495973-f010dfbb5371?w=600','https://images.unsplash.com/photo-1508296695146-257a814070b4?w=600','https://images.unsplash.com/photo-1511499767150-a48a237f0083?w=600']],
  ['Cat Eye Sunglasses',          899, ['accessories','sunglasses & eyewear'], 'sunglasses',
    ['https://images.unsplash.com/photo-1556306535-0f09a537f0a3?w=600','https://images.unsplash.com/photo-1574258495973-f010dfbb5371?w=600','https://images.unsplash.com/photo-1473496169904-658ba7574b0d?w=600']],

  // ── Accessories Jewellery ────────────────────────────────────────────────
  ['Gold Plated Earrings',        599, ['accessories','jewellery'], 'earrings',
    ['https://images.unsplash.com/photo-1515562141207-7a88fb7ce338?w=600','https://images.unsplash.com/photo-1535632066927-ab7c9ab60908?w=600','https://images.unsplash.com/photo-1573408301185-9519f94816b5?w=600']],
  ['Silver Necklace',             799, ['accessories','jewellery'], 'necklaces',
    ['https://images.unsplash.com/photo-1535632066927-ab7c9ab60908?w=600','https://images.unsplash.com/photo-1573408301185-9519f94816b5?w=600','https://images.unsplash.com/photo-1515562141207-7a88fb7ce338?w=600']],
  ['Beaded Bracelet Set',         399, ['accessories','jewellery'], 'bangles & bracelets',
    ['https://images.unsplash.com/photo-1573408301185-9519f94816b5?w=600','https://images.unsplash.com/photo-1515562141207-7a88fb7ce338?w=600','https://images.unsplash.com/photo-1535632066927-ab7c9ab60908?w=600']],
  ['Statement Ring',              299, ['accessories','jewellery'], 'rings',
    ['https://images.unsplash.com/photo-1605100804763-247f67b3557e?w=600','https://images.unsplash.com/photo-1573408301185-9519f94816b5?w=600','https://images.unsplash.com/photo-1515562141207-7a88fb7ce338?w=600']],
  ['Jewellery Gift Set',         1499, ['accessories','jewellery'], 'jewellery sets',
    ['https://images.unsplash.com/photo-1611591437281-460bfbe1220a?w=600','https://images.unsplash.com/photo-1605100804763-247f67b3557e?w=600','https://images.unsplash.com/photo-1535632066927-ab7c9ab60908?w=600']],
  ['Oxidised Jhumka Earrings',    699, ['accessories','jewellery'], 'earrings',
    ['https://images.unsplash.com/photo-1599643478518-a784e5dc4c8f?w=600','https://images.unsplash.com/photo-1611591437281-460bfbe1220a?w=600','https://images.unsplash.com/photo-1605100804763-247f67b3557e?w=600']],

  // ── Beauty Skincare ──────────────────────────────────────────────────────
  ['Vitamin C Face Wash',         399, ['beauty','skincare'], 'face wash & cleanser',
    ['https://images.unsplash.com/photo-1556228578-8c89e6adf883?w=600','https://images.unsplash.com/photo-1571781926291-c477ebfd024b?w=600','https://images.unsplash.com/photo-1620916566398-39f1143ab7be?w=600']],
  ['Hyaluronic Acid Moisturizer', 699, ['beauty','skincare'], 'moisturizers & creams',
    ['https://images.unsplash.com/photo-1571781926291-c477ebfd024b?w=600','https://images.unsplash.com/photo-1620916566398-39f1143ab7be?w=600','https://images.unsplash.com/photo-1556228578-8c89e6adf883?w=600']],
  ['SPF 50 Sunscreen',            499, ['beauty','skincare'], 'sunscreen',
    ['https://images.unsplash.com/photo-1620916566398-39f1143ab7be?w=600','https://images.unsplash.com/photo-1556228578-8c89e6adf883?w=600','https://images.unsplash.com/photo-1571781926291-c477ebfd024b?w=600']],
  ['Niacinamide Serum',           799, ['beauty','skincare'], 'serums & masks',
    ['https://images.unsplash.com/photo-1608248543803-ba4f8c70ae0b?w=600','https://images.unsplash.com/photo-1620916566398-39f1143ab7be?w=600','https://images.unsplash.com/photo-1556228578-8c89e6adf883?w=600']],
  ['Clay Face Mask',              349, ['beauty','skincare'], 'serums & masks',
    ['https://images.unsplash.com/photo-1596755389378-c31d21fd1273?w=600','https://images.unsplash.com/photo-1608248543803-ba4f8c70ae0b?w=600','https://images.unsplash.com/photo-1571781926291-c477ebfd024b?w=600']],
  ['Retinol Night Cream',         999, ['beauty','skincare'], 'moisturizers & creams',
    ['https://images.unsplash.com/photo-1631390163780-e5e3e5e5e5e5?w=600','https://images.unsplash.com/photo-1596755389378-c31d21fd1273?w=600','https://images.unsplash.com/photo-1608248543803-ba4f8c70ae0b?w=600']],
  ['Micellar Cleansing Water',    299, ['beauty','skincare'], 'face wash & cleanser',
    ['https://images.unsplash.com/photo-1556228453-efd6c1ff04f6?w=600','https://images.unsplash.com/photo-1596755389378-c31d21fd1273?w=600','https://images.unsplash.com/photo-1556228578-8c89e6adf883?w=600']],

  // ── Beauty Haircare ──────────────────────────────────────────────────────
  ['Argan Oil Shampoo',           399, ['beauty','haircare'], 'shampoo & conditioner',
    ['https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?w=600','https://images.unsplash.com/photo-1527799820374-dcf8d9d4a388?w=600','https://images.unsplash.com/photo-1585751119414-ef2636f8aede?w=600']],
  ['Deep Conditioning Mask',      499, ['beauty','haircare'], 'shampoo & conditioner',
    ['https://images.unsplash.com/photo-1527799820374-dcf8d9d4a388?w=600','https://images.unsplash.com/photo-1585751119414-ef2636f8aede?w=600','https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?w=600']],
  ['Hair Growth Serum',           699, ['beauty','haircare'], 'hair oil & serum',
    ['https://images.unsplash.com/photo-1585751119414-ef2636f8aede?w=600','https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?w=600','https://images.unsplash.com/photo-1527799820374-dcf8d9d4a388?w=600']],
  ['Coconut Hair Oil',            249, ['beauty','haircare'], 'hair oil & serum',
    ['https://images.unsplash.com/photo-1608248543803-ba4f8c70ae0b?w=600','https://images.unsplash.com/photo-1585751119414-ef2636f8aede?w=600','https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?w=600']],
  ['Heat Protectant Spray',       349, ['beauty','haircare'], 'styling products',
    ['https://images.unsplash.com/photo-1556228453-efd6c1ff04f6?w=600','https://images.unsplash.com/photo-1608248543803-ba4f8c70ae0b?w=600','https://images.unsplash.com/photo-1527799820374-dcf8d9d4a388?w=600']],
  ['Keratin Hair Mask',           599, ['beauty','haircare'], 'shampoo & conditioner',
    ['https://images.unsplash.com/photo-1596755389378-c31d21fd1273?w=600','https://images.unsplash.com/photo-1556228453-efd6c1ff04f6?w=600','https://images.unsplash.com/photo-1585751119414-ef2636f8aede?w=600']],

  // ── Beauty Makeup ────────────────────────────────────────────────────────
  ['Matte Lipstick',              299, ['beauty','makeup'], 'lip makeup',
    ['https://images.unsplash.com/photo-1512496015851-a90fb38ba796?w=600','https://images.unsplash.com/photo-1522335789203-aabd1fc54bc9?w=600','https://images.unsplash.com/photo-1487412947147-5cebf100ffc2?w=600']],
  ['Foundation SPF 15',           799, ['beauty','makeup'], 'face makeup',
    ['https://images.unsplash.com/photo-1522335789203-aabd1fc54bc9?w=600','https://images.unsplash.com/photo-1487412947147-5cebf100ffc2?w=600','https://images.unsplash.com/photo-1512496015851-a90fb38ba796?w=600']],
  ['Kajal Eyeliner',              199, ['beauty','makeup'], 'eye makeup',
    ['https://images.unsplash.com/photo-1487412947147-5cebf100ffc2?w=600','https://images.unsplash.com/photo-1512496015851-a90fb38ba796?w=600','https://images.unsplash.com/photo-1522335789203-aabd1fc54bc9?w=600']],
  ['Eyeshadow Palette',           999, ['beauty','makeup'], 'eye makeup',
    ['https://images.unsplash.com/photo-1583241475880-083f84372725?w=600','https://images.unsplash.com/photo-1487412947147-5cebf100ffc2?w=600','https://images.unsplash.com/photo-1512496015851-a90fb38ba796?w=600']],
  ['Compact Powder',              449, ['beauty','makeup'], 'face makeup',
    ['https://images.unsplash.com/photo-1596462502278-27bfdc403348?w=600','https://images.unsplash.com/photo-1583241475880-083f84372725?w=600','https://images.unsplash.com/photo-1522335789203-aabd1fc54bc9?w=600']],
  ['Lip Gloss',                   249, ['beauty','makeup'], 'lip makeup',
    ['https://images.unsplash.com/photo-1631390163780-e5e3e5e5e5e5?w=600','https://images.unsplash.com/photo-1596462502278-27bfdc403348?w=600','https://images.unsplash.com/photo-1583241475880-083f84372725?w=600']],
  ['Makeup Starter Kit',         1499, ['beauty','makeup'], 'makeup kits',
    ['https://images.unsplash.com/photo-1522335789203-aabd1fc54bc9?w=600','https://images.unsplash.com/photo-1596462502278-27bfdc403348?w=600','https://images.unsplash.com/photo-1512496015851-a90fb38ba796?w=600']],

  // ── Beauty Fragrances ────────────────────────────────────────────────────
  ['Floral Eau de Parfum 50ml',  1299, ['beauty','fragrances & deodorants'], 'perfumes',
    ['https://images.unsplash.com/photo-1541643600914-78b084683702?w=600','https://images.unsplash.com/photo-1592945403244-b3fbafd7f539?w=600','https://images.unsplash.com/photo-1563170351-be82bc888aa4?w=600']],
  ['Woody Cologne 100ml',        1799, ['beauty','fragrances & deodorants'], 'perfumes',
    ['https://images.unsplash.com/photo-1592945403244-b3fbafd7f539?w=600','https://images.unsplash.com/photo-1563170351-be82bc888aa4?w=600','https://images.unsplash.com/photo-1541643600914-78b084683702?w=600']],
  ['Roll-On Deodorant',           199, ['beauty','fragrances & deodorants'], 'roll-ons',
    ['https://images.unsplash.com/photo-1563170351-be82bc888aa4?w=600','https://images.unsplash.com/photo-1541643600914-78b084683702?w=600','https://images.unsplash.com/photo-1592945403244-b3fbafd7f539?w=600']],
  ['Body Mist Spray',             399, ['beauty','fragrances & deodorants'], 'body sprays',
    ['https://images.unsplash.com/photo-1588776814546-1ffedbe47add?w=600','https://images.unsplash.com/photo-1563170351-be82bc888aa4?w=600','https://images.unsplash.com/photo-1541643600914-78b084683702?w=600']],
  ['Perfume Gift Set',           2499, ['beauty','fragrances & deodorants'], 'gift sets',
    ['https://images.unsplash.com/photo-1615634260167-c8cdede054de?w=600','https://images.unsplash.com/photo-1588776814546-1ffedbe47add?w=600','https://images.unsplash.com/photo-1592945403244-b3fbafd7f539?w=600']],

  // ── Home & Living Kitchenware ────────────────────────────────────────────
  ['Non-Stick Cookware Set',     2999, ['home&living','kitchenware'], 'cookware',
    ['https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=600','https://images.unsplash.com/photo-1585515320310-259814833e62?w=600','https://images.unsplash.com/photo-1590794056226-79ef3a8147e1?w=600']],
  ['Stainless Steel Utensil Set', 999, ['home&living','kitchenware'], 'utensils',
    ['https://images.unsplash.com/photo-1585515320310-259814833e62?w=600','https://images.unsplash.com/photo-1590794056226-79ef3a8147e1?w=600','https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=600']],
  ['Glass Storage Containers',    799, ['home&living','kitchenware'], 'storage containers',
    ['https://images.unsplash.com/photo-1590794056226-79ef3a8147e1?w=600','https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=600','https://images.unsplash.com/photo-1585515320310-259814833e62?w=600']],
  ['Silicone Kitchen Tools Set',  599, ['home&living','kitchenware'], 'kitchen tools',
    ['https://images.unsplash.com/photo-1556909172-54557c7e4fb7?w=600','https://images.unsplash.com/photo-1590794056226-79ef3a8147e1?w=600','https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=600']],
  ['Cast Iron Skillet',          1999, ['home&living','kitchenware'], 'cookware',
    ['https://images.unsplash.com/photo-1544233726-9f1d2b27be8b?w=600','https://images.unsplash.com/photo-1556909172-54557c7e4fb7?w=600','https://images.unsplash.com/photo-1585515320310-259814833e62?w=600']],
  ['Bamboo Cutting Board',        449, ['home&living','kitchenware'], 'kitchen tools',
    ['https://images.unsplash.com/photo-1607877742574-a7d9a7449af3?w=600','https://images.unsplash.com/photo-1544233726-9f1d2b27be8b?w=600','https://images.unsplash.com/photo-1556909172-54557c7e4fb7?w=600']],

  // ── Home & Living Bedding ────────────────────────────────────────────────
  ['Cotton Bedsheet Set',        1299, ['home&living','bedding & linen'], 'bedsheets',
    ['https://images.unsplash.com/photo-1616486338812-3dadae4b4f9d?w=600','https://images.unsplash.com/photo-1631049307264-da0ec9d70304?w=600','https://images.unsplash.com/photo-1555041469-a586c61ea9bc?w=600']],
  ['Microfibre Comforter',       2499, ['home&living','bedding & linen'], 'blankets & quilts',
    ['https://images.unsplash.com/photo-1631049307264-da0ec9d70304?w=600','https://images.unsplash.com/photo-1555041469-a586c61ea9bc?w=600','https://images.unsplash.com/photo-1616486338812-3dadae4b4f9d?w=600']],
  ['Pillow Cover Set of 2',       499, ['home&living','bedding & linen'], 'pillow covers',
    ['https://images.unsplash.com/photo-1555041469-a586c61ea9bc?w=600','https://images.unsplash.com/photo-1616486338812-3dadae4b4f9d?w=600','https://images.unsplash.com/photo-1631049307264-da0ec9d70304?w=600']],
  ['Bath Towel Set',              799, ['home&living','bedding & linen'], 'towels',
    ['https://images.unsplash.com/photo-1583845112203-29329902332e?w=600','https://images.unsplash.com/photo-1555041469-a586c61ea9bc?w=600','https://images.unsplash.com/photo-1616486338812-3dadae4b4f9d?w=600']],
  ['Weighted Blanket',           3499, ['home&living','bedding & linen'], 'blankets & quilts',
    ['https://images.unsplash.com/photo-1600369671236-e74521d4b6ad?w=600','https://images.unsplash.com/photo-1583845112203-29329902332e?w=600','https://images.unsplash.com/photo-1631049307264-da0ec9d70304?w=600']],
  ['Satin Pillowcase',            699, ['home&living','bedding & linen'], 'pillow covers',
    ['https://images.unsplash.com/photo-1631049421450-348ccd7f8949?w=600','https://images.unsplash.com/photo-1600369671236-e74521d4b6ad?w=600','https://images.unsplash.com/photo-1583845112203-29329902332e?w=600']],
];

// ── Insert logic ──────────────────────────────────────────────────────────────

async function run() {
  const client = await pool.connect();
  let inserted = 0;

  try {
    await client.query('BEGIN');

    for (const [name, price, categoryPath, deepestCategory, images] of PRODUCTS) {
      // products table uses UUID (seller app table — not our VARCHAR(7) tables)
      const productId = (await client.query('SELECT uuid_generate_v4() AS id')).rows[0].id;
      const quantity = Math.floor(Math.random() * 50) + 10; // 10–59

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

      inserted++;
      if (inserted % 20 === 0) process.stdout.write(`  ${inserted}/${PRODUCTS.length} products inserted...\n`);
    }

    await client.query('COMMIT');
    console.log(`\n✓ Seeded ${inserted} products with unique images.`);
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
