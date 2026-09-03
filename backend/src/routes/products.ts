import { Request, Response, Router } from 'express';
import jwt from 'jsonwebtoken';
import { pool } from '../db';
import { authenticate, AuthRequest } from '../middleware/auth';
import { productListLimiter, reviewLimiter, reviewUploadLimiter } from '../middleware/rateLimits';
import { generateId } from '../utils/id';
import { expandSearchTerms } from '../utils/searchSynonyms';
import { AUTO_HIDE_THRESHOLD, ensureModerationSchema } from '../utils/moderationSchema';
import { withMarkup, withoutMarkup } from '../utils/pricing';
import { cacheDel, cacheDelPattern, cacheGet, cacheSet } from '../utils/redis';
import { logger } from '../utils/logger';
import multer from 'multer';
import { looksLikeImage } from '../utils/imageBytes';
import { isConfigured as cloudinaryConfigured, uploadReviewImage } from '../utils/cloudinary';

// TTLs (seconds)
// Price/stock edits are made in OTHER backends (vendor app, vendor website) that
// have no access to this Redis, so nothing can invalidate these keys on write.
// The detail key is therefore validated against products.updated_at on every hit
// (see below) and can keep a long TTL; the list keys can't be validated cheaply,
// so they are kept short enough that an edit shows up within a minute.
const TTL_PRODUCT = 7200;       // 2h — individual product (revalidated per hit)
const TTL_PRODUCT_LIST = 60;    // 1m — paginated lists / categories
const TTL_SEARCH = 60;          // 1m — search results
const TTL_REVIEWS = 1800;       // 30m — reviews
const TTL_FRESH_CAT = 7200;     // 2h — fresh categories
const TTL_NEARBY = 3600;        // 1h — nearby categories

// Colour/design variants are separate product rows sharing a variant_group_id
// (2026-08-03 decision). Listings must show ONE card per group, or a jacket in
// three colours reads as three unrelated products with its reviews split three
// ways. Representative = the group's oldest still-listed row; the detail page's
// swatch strip cross-links the rest. Ungrouped products (most of them) pass through.
const VARIANT_PRIMARY = `(p.variant_group_id IS NULL OR p.id = (
        SELECT s.id FROM products s
        WHERE s.variant_group_id = p.variant_group_id
          AND s.in_stock = true AND s.is_approved = true
        ORDER BY s.created_at ASC, s.id ASC LIMIT 1))`;

const router = Router();

// Review photos: one at a time, 5MB, same ceiling and byte-sniffing the vendor
// backend uses for KYC/product uploads (mimetype is the client's own header).
const reviewImageUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024, files: 1 },
  fileFilter: (_req, file, cb) =>
    file.mimetype.startsWith('image/') ? cb(null, true) : cb(new Error('Only image files are allowed')),
});

/**
 * Phase 10 — typo-tolerant search.
 *
 * Postgres' own `pg_trgm` rather than a search service: the stack already has
 * Postgres, and a trigram index answers "kurti" → "kurta" without a new
 * dependency, a new container, or an index to keep in sync.
 *
 * Both the extension and the index are attempted once, at first search, and
 * every failure is swallowed: on a DB role that may not CREATE EXTENSION the
 * search simply stays exact-match, which is what it does today.
 */
let trigramReady: boolean | null = null;
async function ensureTrigram(): Promise<boolean> {
  if (trigramReady !== null) return trigramReady;
  try {
    const { rows } = await pool.query(`SELECT 1 FROM pg_extension WHERE extname = 'pg_trgm'`);
    if (!rows.length) await pool.query('CREATE EXTENSION IF NOT EXISTS pg_trgm');
    // Without this index every fuzzy search is a sequential scan over products.
    await pool.query(
      `CREATE INDEX IF NOT EXISTS idx_products_name_trgm
         ON products USING gin (LOWER(product_name) gin_trgm_ops)`
    );
    trigramReady = true;
  } catch (err) {
    logger.warn('search.trigram_unavailable', {
      error: (err as any)?.message ?? String(err),
      impact: 'search stays exact-match only (see SCHEMA_CHANGES.md)',
    });
    trigramReady = false;
  }
  return trigramReady;
}

// How close a name has to be to count as a typo match. 0.3 is Postgres' own
// default: below it "shirt" starts matching "shorts".
const TRIGRAM_THRESHOLD = 0.3;

export function normalizeProduct(row: any) {
  // Extract sizes from size_quantities keys (e.g. {S:10, M:15} → ['S','M']).
  // Include out-of-stock sizes too so the UI can mark them as unavailable
  // instead of hiding them; availability is driven by sizeQuantities below.
  const sizeQuantities = row.size_quantities || {};
  const sizes = Object.keys(sizeQuantities);

  // Extract colors from extracted_attributes
  const attrs = row.extracted_attributes || {};
  const colors: string[] = attrs.colors || [];

  // Customer-facing price = vendor price + 20% ZPIN platform fee (see `price`
  // below). The vendor-entered MRP gets the SAME markup so the struck-through
  // price and the discount % the customer sees stay the vendor's real ones.
  const price = withMarkup(row.price);
  const originalPrice = withMarkup(row.mrp);
  const hasMrp = originalPrice > price;

  return {
    productId: row.id,
    userId: row.user_id,
    productName: row.product_name,
    description: row.description,
    categoryId: row.category_id,
    deepestCategoryName: row.deepest_category_name,
    categoryPath: row.category_path || 'All',
    price,
    originalPrice: hasMrp ? originalPrice : undefined,
    discount: hasMrp ? Math.round(((originalPrice - price) / originalPrice) * 100) : undefined,
    quantity: row.quantity,
    inStock: row.in_stock,
    images: row.images || [],
    timeStamp: row.created_at,
    rating: Number(row.average_rating) || 0,
    sizes: sizes.length > 0 ? sizes : undefined,
    colors: colors.length > 0 ? colors : undefined,
    sizeQuantities: Object.keys(sizeQuantities).length > 0 ? sizeQuantities : undefined,
    attributes: Object.keys(attrs).length > 0 ? attrs : undefined,
    variantGroupId: row.variant_group_id || undefined,
  };
}

/**
 * A product's category-driven EAV attributes, shaped exactly like the customer
 * website's Specifications card ({ code, name, unit, values[] }) so both surfaces
 * render the same list. Best-effort: never break the product page over it.
 */
async function getProductSpecifications(productId: string) {
  try {
    const { rows } = await pool.query(
      `SELECT a.code, a.name, a.unit,
              o.value AS option_value, pav.value_text, pav.value_number, pav.value_bool
       FROM product_attribute_values pav
       JOIN attributes a ON a.id = pav.attribute_id
       LEFT JOIN attribute_options o ON o.id = pav.option_id
       WHERE pav.product_id = $1::uuid
       ORDER BY a.name`,
      [productId]
    );
    const byCode = new Map<string, { code: string; name: string; unit: string | null; values: string[] }>();
    for (const r of rows) {
      const display = r.option_value ??
        (r.value_number != null ? String(r.value_number) :
        (r.value_bool != null ? (r.value_bool ? 'Yes' : 'No') : r.value_text));
      if (display == null) continue;
      if (!byCode.has(r.code)) byCode.set(r.code, { code: r.code, name: r.name, unit: r.unit, values: [] });
      byCode.get(r.code)!.values.push(display);
    }
    return Array.from(byCode.values());
  } catch {
    return [];
  }
}

const PRODUCT_ID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const SHORT_ID_REGEX = /^[A-Z0-9]{7}$/;

function isValidProductId(id: string): boolean {
  return PRODUCT_ID_REGEX.test(id) || SHORT_ID_REGEX.test(id);
}

/**
 * Resolves a product ID (UUID or 7-char short ID) to its UUID.
 * Returns null if the product doesn't exist.
 */
async function resolveProductUUID(id: string): Promise<string | null> {
  const result = await pool.query('SELECT id FROM products WHERE id = $1::uuid', [id]);
  if (result.rows.length === 0) return null;
  return result.rows[0].id as string;
}

function normalizeReviewImages(images: unknown): string[] {
  if (Array.isArray(images)) {
    return images.filter((image): image is string => typeof image === 'string');
  }

  if (typeof images === 'string') {
    try {
      const parsed = JSON.parse(images);
      return Array.isArray(parsed) ? parsed.filter((image): image is string => typeof image === 'string') : [];
    } catch {
      return [];
    }
  }

  return [];
}

function mapReviewRow(row: any) {
  return {
    id: row.id,
    userId: row.user_id,
    productId: row.product_id,
    rating: Number(row.rating),
    comment: row.comment,
    images: normalizeReviewImages(row.images),
    user: {
      name: row.user_name,
      profileImage: row.user_profile_image || undefined,
    },
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    isVerifiedPurchase: row.is_verified_purchase,
  };
}

function extractToken(req: Request): string | null {
  if (req.headers.authorization?.startsWith('Bearer ')) {
    return req.headers.authorization.slice(7);
  }

  const xAuthToken = req.headers['x-auth-token'];
  if (typeof xAuthToken === 'string' && xAuthToken) {
    return xAuthToken;
  }

  const cookieToken = (req as any).cookies?.token;
  if (typeof cookieToken === 'string' && cookieToken) {
    return cookieToken;
  }

  return null;
}

function getUserIdFromToken(token: string): string | null {
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as { userId?: string };
    return typeof decoded?.userId === 'string' ? decoded.userId : null;
  } catch {
    return null;
  }
}

// GET /api/v1/products/recommended — personalized recommendations for authenticated user
// Signals (weighted): purchase history (+3/category), wishlist (+2/category), search terms (+1/category)
// Excludes already-purchased product IDs. Falls back to latest products if no signals.
router.get('/recommended', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  const limit = Math.min(Number(req.query.limit) || 10, 30);
  const searchTerms: string[] = req.query.terms
    ? String(req.query.terms).split(',').map(t => t.trim()).filter(Boolean).slice(0, 5)
    : [];

  try {
    const categoryScores = new Map<string, number>();
    const purchasedProductIds: string[] = [];

    // Signal 1: purchase history (weight 3)
    const orderResult = await pool.query(
      `SELECT oi.product_id, p.deepest_category_name
       FROM order_items oi
       JOIN orders o ON o.id = oi.order_id
       JOIN products p ON p.id = oi.product_id
       WHERE o.user_id = $1 AND p.deepest_category_name IS NOT NULL`,
      [req.userId]
    );
    for (const row of orderResult.rows) {
      purchasedProductIds.push(row.product_id);
      const cat = row.deepest_category_name as string;
      categoryScores.set(cat, (categoryScores.get(cat) ?? 0) + 3);
    }

    // Signal 2: wishlist (weight 2)
    const wishlistResult = await pool.query(
      `SELECT p.deepest_category_name
       FROM wishlists w
       JOIN products p ON p.id = w.product_id
       WHERE w.user_id = $1 AND p.deepest_category_name IS NOT NULL`,
      [req.userId]
    );
    for (const row of wishlistResult.rows) {
      const cat = row.deepest_category_name as string;
      categoryScores.set(cat, (categoryScores.get(cat) ?? 0) + 2);
    }

    // Signal 3: search terms — match against deepest_category_name (weight 1)
    if (searchTerms.length > 0) {
      const termResult = await pool.query(
        `SELECT DISTINCT deepest_category_name FROM products
         WHERE in_stock = true AND is_approved = true
           AND deepest_category_name IS NOT NULL
           AND LOWER(deepest_category_name) = ANY($1)`,
        [searchTerms.map(t => t.toLowerCase())]
      );
      for (const row of termResult.rows) {
        const cat = row.deepest_category_name as string;
        categoryScores.set(cat, (categoryScores.get(cat) ?? 0) + 1);
      }
    }

    // No signals at all — fall back to latest products
    if (categoryScores.size === 0) {
      const fallback = await pool.query(
        `SELECT p.*,
          COALESCE(json_agg(DISTINCT pi.image_url) FILTER (WHERE pi.image_url IS NOT NULL), '[]') as images,
          COALESCE(AVG(pr.rating), 0) as average_rating
         FROM products p
         LEFT JOIN product_images pi ON pi.product_id = p.id
         LEFT JOIN product_reviews pr ON pr.product_id = p.id
         WHERE p.in_stock = true AND p.is_approved = true AND ${VARIANT_PRIMARY}
         GROUP BY p.id
         ORDER BY p.created_at DESC
         LIMIT $1`,
        [limit]
      );
      res.json({ success: true, products: fallback.rows.map(normalizeProduct), source: 'fallback' });
      return;
    }

    // Sort categories by score descending, take top 5
    const topCategories = [...categoryScores.entries()]
      .sort((a: [string, number], b: [string, number]) => b[1] - a[1])
      .slice(0, 5)
      .map(([cat]) => cat);

    // Fetch products from top categories, excluding already-purchased items
    const result = await pool.query(
      `SELECT p.*,
        COALESCE(json_agg(DISTINCT pi.image_url) FILTER (WHERE pi.image_url IS NOT NULL), '[]') as images,
        COALESCE(AVG(pr.rating), 0) as average_rating
       FROM products p
       LEFT JOIN product_images pi ON pi.product_id = p.id
       LEFT JOIN product_reviews pr ON pr.product_id = p.id
       WHERE p.in_stock = true AND p.is_approved = true AND ${VARIANT_PRIMARY}
         AND p.deepest_category_name = ANY($1)
         AND p.id != ALL($2)
       GROUP BY p.id
       ORDER BY p.created_at DESC
       LIMIT $3`,
      [topCategories, purchasedProductIds.length > 0 ? purchasedProductIds : [''], limit]
    );

    res.json({ success: true, products: result.rows.map(normalizeProduct), source: 'personalized' });
  } catch (err) {
    logger.error('recommended_error', { error: (err as any)?.message ?? String(err) });
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// GET /api/v1/products/search?q= — full-text product name search with related products
router.get('/search', productListLimiter, async (req: Request, res: Response): Promise<void> => {
  const q = (req.query.q as string || '').trim();
  const limit = Math.min(Number(req.query.limit) || 50, 200);

  if (!q) {
    res.json({ success: true, products: [], related: [] });
    return;
  }

  try {
    // Normalize query — treat "keychain" and "key chain" as equivalent
    const normalized = q.replace(/\s+/g, '').toLowerCase();
    const spaced = q.replace(/([a-z])([A-Z])/g, '$1 $2').toLowerCase();

    // Same synonym/typo expansion the customer website uses, so "sari", "jaket"
    // or "chappal" find the same products on both surfaces.
    const terms = expandSearchTerms(q);
    const params: any[] = [`%${normalized}%`, `%${spaced}%`];
    const termClauses = terms.map((t) => {
      params.push(`%${t}%`);
      const i = params.length;
      return `(p.product_name ILIKE $${i} OR p.description ILIKE $${i} OR p.deepest_category_name ILIKE $${i})`;
    });
    params.push(limit);

    const result = await pool.query(
      `SELECT p.*,
        COALESCE(json_agg(DISTINCT pi.image_url) FILTER (WHERE pi.image_url IS NOT NULL), '[]') as images,
        COALESCE(AVG(pr.rating), 0) as average_rating
       FROM products p
       LEFT JOIN product_images pi ON pi.product_id = p.id
       LEFT JOIN product_reviews pr ON pr.product_id = p.id
       WHERE p.in_stock = true AND p.is_approved = true AND ${VARIANT_PRIMARY}
         AND (
           LOWER(REPLACE(p.product_name, ' ', '')) LIKE $1
           OR LOWER(p.product_name) LIKE $2
           OR ${termClauses.join(' OR ')}
         )
       GROUP BY p.id
       ORDER BY p.created_at DESC
       LIMIT $${params.length}`,
      params
    );

    // Nothing matched literally — try again allowing typos. Only on a miss, so
    // the common case pays nothing for this.
    let rows = result.rows;
    if (rows.length === 0 && q.length >= 3 && await ensureTrigram()) {
      const fuzzy = await pool.query(
        `SELECT p.*,
          COALESCE(json_agg(DISTINCT pi.image_url) FILTER (WHERE pi.image_url IS NOT NULL), '[]') as images,
          COALESCE(AVG(pr.rating), 0) as average_rating,
          GREATEST(
            similarity(LOWER(p.product_name), $1),
            similarity(LOWER(COALESCE(p.deepest_category_name, '')), $1)
          ) AS match_score
         FROM products p
         LEFT JOIN product_images pi ON pi.product_id = p.id
         LEFT JOIN product_reviews pr ON pr.product_id = p.id
         WHERE p.in_stock = true AND p.is_approved = true AND ${VARIANT_PRIMARY}
           AND GREATEST(
                 similarity(LOWER(p.product_name), $1),
                 similarity(LOWER(COALESCE(p.deepest_category_name, '')), $1)
               ) > $2
         GROUP BY p.id
         ORDER BY match_score DESC, p.created_at DESC
         LIMIT $3`,
        [q.toLowerCase(), TRIGRAM_THRESHOLD, limit]
      );
      rows = fuzzy.rows;
    }

    const products = rows.map(normalizeProduct);

    // Fetch related products — same deepest_category_name, excluding already found
    let related: any[] = [];
    if (products.length > 0) {
      const categories = [...new Set(products.map((p: any) => p.deepestCategoryName).filter(Boolean))];
      const foundIds = products.map((p: any) => p.productId);

      const relatedResult = await pool.query(
        `SELECT p.*,
          COALESCE(json_agg(DISTINCT pi.image_url) FILTER (WHERE pi.image_url IS NOT NULL), '[]') as images,
          COALESCE(AVG(pr.rating), 0) as average_rating
         FROM products p
         LEFT JOIN product_images pi ON pi.product_id = p.id
         LEFT JOIN product_reviews pr ON pr.product_id = p.id
         WHERE p.in_stock = true AND p.is_approved = true AND ${VARIANT_PRIMARY}
           AND p.deepest_category_name = ANY($1)
           AND p.id != ALL($2)
         GROUP BY p.id
         ORDER BY p.created_at DESC
         LIMIT 10`,
        [categories, foundIds]
      );
      related = relatedResult.rows.map(normalizeProduct);
    }

    res.json({ success: true, products, related });
  } catch (err) {
    logger.error('search_error', { error: (err as any)?.message ?? String(err) });
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// GET /api/v1/products/nearby — product counts per nearby category based on location context
// Since products don't have coordinates, we return counts per category
// filtered by the 4 nearby categories: Men, Women, Kids, Makeup
router.get('/nearby', async (req: Request, res: Response): Promise<void> => {
  // lat/lng accepted for future geo-filtering; currently returns category counts
  const NEARBY_CATEGORIES = [
    { name: 'Men',    keywords: ['men', 'man', 'male'],          rootCategory: 'Fashion', subCategory: 'Men'    },
    { name: 'Women',  keywords: ['women', 'woman', 'female'],    rootCategory: 'Fashion', subCategory: 'Women'  },
    { name: 'Kids',   keywords: ['kids', 'kid', 'children', 'child', 'boy', 'girl'], rootCategory: 'Fashion', subCategory: 'Men' },
    { name: 'Makeup', keywords: ['makeup', 'make-up', 'cosmetic', 'beauty', 'skincare', 'haircare'], rootCategory: 'Beauty', subCategory: 'Makeup' },
  ];

  const cacheKey = 'products:nearby';
  const cached = await cacheGet(cacheKey);
  if (cached) { res.json(cached); return; }

  try {
    const results = await Promise.all(
      NEARBY_CATEGORIES.map(async (cat) => {
        const likeConditions = cat.keywords
          .map((_, i) => `LOWER(p.category_path::text) LIKE $${i + 1}`)
          .join(' OR ');
        const params = cat.keywords.map(k => `%${k}%`);

        const countResult = await pool.query(
          `SELECT COUNT(*) FROM products p WHERE p.in_stock = true AND p.is_approved = true AND ${VARIANT_PRIMARY} AND (${likeConditions})`,
          params
        );

        // Get one representative image
        const imgResult = await pool.query(
          `SELECT pi.image_url FROM products p
           JOIN product_images pi ON pi.product_id = p.id
           WHERE p.in_stock = true AND p.is_approved = true AND ${VARIANT_PRIMARY} AND (${likeConditions})
           LIMIT 1`,
          params
        );

        return {
          name: cat.name,
          rootCategory: cat.rootCategory,
          subCategory: cat.subCategory,
          count: Number(countResult.rows[0].count),
          imageUrl: imgResult.rows[0]?.image_url || null,
        };
      })
    );

    const response = { success: true, data: results };
    await cacheSet(cacheKey, response, TTL_NEARBY);
    res.json(response);
  } catch (err) {
    logger.error('nearby_error', { error: (err as any)?.message ?? String(err) });
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// GET /api/v1/products/fresh-categories — top 5 categories with the most recently added product
router.get('/fresh-categories', async (req: Request, res: Response): Promise<void> => {
  const cacheKey = 'products:fresh-categories';
  const cached = await cacheGet(cacheKey);
  if (cached) { res.json(cached); return; }

  try {
    const result = await pool.query(`
      SELECT DISTINCT ON (deepest_category_name)
        deepest_category_name,
        category_path,
        MAX(created_at) OVER (PARTITION BY deepest_category_name) AS latest_at,
        (SELECT image_url FROM product_images WHERE product_id = p.id LIMIT 1) AS image_url
      FROM products p
      WHERE p.in_stock = true AND p.is_approved = true AND ${VARIANT_PRIMARY}
        AND deepest_category_name IS NOT NULL
        AND deepest_category_name != ''
      ORDER BY deepest_category_name, created_at DESC
    `);

    // Sort by latest_at desc, take top 5
    const sorted = result.rows
      .sort((a: any, b: any) => new Date(b.latest_at).getTime() - new Date(a.latest_at).getTime())
      .slice(0, 5);

    const categories = sorted.map(r => ({
      name: r.deepest_category_name,
      categoryPath: r.category_path,
      imageUrl: r.image_url || null,
      latestAt: r.latest_at,
    }));

    const response = { success: true, data: categories };
    await cacheSet(cacheKey, response, TTL_FRESH_CAT);
    res.json(response);
  } catch (err) {
    logger.error('freshcategories_error', { error: (err as any)?.message ?? String(err) });
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Whitelist of sort keys → SQL ORDER BY clause (prevents SQL injection via sort param).
// Every clause ends with `p.id ASC` as a stable tiebreaker so OFFSET-based pagination
// is deterministic — without it, rows that tie on the sort column (e.g. many products
// sharing the same created_at after a bulk seed) get reordered between pages, causing
// duplicate/skipped products as the user scrolls.
const CATEGORY_SORT: Record<string, string> = {
  relevance: 'p.created_at DESC, p.id ASC',
  new: 'p.created_at DESC, p.id ASC',
  price_low: 'p.price ASC, p.id ASC',
  price_high: 'p.price DESC, p.id ASC',
  rating: 'COALESCE(AVG(pr.rating), 0) DESC, p.id ASC',
};

// Parse "0-500,500-1000,5000-" → [{ min: 0, max: 500 }, ...]. A blank bound means open-ended.
function parsePriceBands(raw: string): { min: number | null; max: number | null }[] {
  if (!raw) return [];
  return raw
    .split(',')
    .map((band) => {
      const [lo, hi] = band.split('-');
      const min = lo !== undefined && lo !== '' && Number.isFinite(Number(lo)) ? Number(lo) : null;
      const max = hi !== undefined && hi !== '' && Number.isFinite(Number(hi)) ? Number(hi) : null;
      return { min, max };
    })
    .filter((b) => b.min !== null || b.max !== null);
}

// GET /api/v1/products/category/:categoryName — filter by category name
// Supports server-side pagination (page, limit), sorting (sort), and filtering by
// price (priceBands), customer rating (minRating), and brand/deepest category (brands).
router.get('/category/:categoryName', productListLimiter, async (req: Request, res: Response): Promise<void> => {
  const page = Math.max(Number(req.query.page) || 1, 1);
  const limit = Math.min(Math.max(Number(req.query.limit) || 20, 1), 100); // default 20, max 100
  const offset = (page - 1) * limit;
  const { categoryName } = req.params;

  // Parse and normalize filter/sort inputs
  const sortKey = String(req.query.sort || 'relevance');
  const orderBy = CATEGORY_SORT[sortKey] || CATEGORY_SORT.relevance;
  const minRating = Math.min(Math.max(Number(req.query.minRating) || 0, 0), 5);
  const brands = String(req.query.brands || '')
    .split(',')
    .map((b) => b.trim().toLowerCase())
    .filter(Boolean);
  const priceBandsRaw = String(req.query.priceBands || '').trim();
  const priceBands = parsePriceBands(priceBandsRaw);

  const cacheKey =
    `products:category:${categoryName.toLowerCase()}:p${page}:l${limit}` +
    `:s${sortKey}:r${minRating}:b${brands.join('|')}:pb${priceBandsRaw}`;
  const cached = await cacheGet(cacheKey);
  if (cached) { res.json(cached); return; }

  // Use exact case-insensitive match for deepest_category_name,
  // and a JSON element match for category_path to avoid substring false-positives
  // e.g. "shirts" should NOT match "t-shirts" or "sweatshirts"
  try {
    // $1 is always the category name. Subsequent filter params are appended dynamically.
    const params: any[] = [categoryName];
    let where = `p.in_stock = true AND p.is_approved = true AND ${VARIANT_PRIMARY}
      AND (
        LOWER(p.deepest_category_name) = LOWER($1)
        OR EXISTS (
          SELECT 1 FROM jsonb_array_elements(
            CASE WHEN p.category_path IS NOT NULL
                 THEN p.category_path::jsonb
                 ELSE '[]'::jsonb
            END
          ) AS elem
          WHERE LOWER(elem->>'name') = LOWER($1)
        )
      )`;

    // Price bands → OR group, e.g. (price >= 0 AND price < 500) OR (price >= 5000)
    // The bands the user picked are DISPLAY prices (markup included), but p.price
    // is the raw vendor price — so convert the bounds back before comparing.
    if (priceBands.length > 0) {
      const bandConds = priceBands.map((b) => {
        const parts: string[] = [];
        if (b.min !== null) { params.push(withoutMarkup(b.min)); parts.push(`p.price >= $${params.length}`); }
        if (b.max !== null) { params.push(withoutMarkup(b.max)); parts.push(`p.price < $${params.length}`); }
        return `(${parts.join(' AND ')})`;
      });
      where += ` AND (${bandConds.join(' OR ')})`;
    }

    // Brand filter — brand maps to the product's deepest category name
    if (brands.length > 0) {
      params.push(brands);
      where += ` AND LOWER(p.deepest_category_name) = ANY($${params.length})`;
    }

    // minRating is applied as a HAVING clause on the aggregated rating
    const having = minRating > 0 ? `HAVING COALESCE(AVG(pr.rating), 0) >= ${minRating}` : '';

    // Count distinct matching products (grouped so HAVING/rating filter is honored)
    const countResult = await pool.query(
      `SELECT COUNT(*) FROM (
         SELECT p.id
         FROM products p
         LEFT JOIN product_reviews pr ON pr.product_id = p.id
         WHERE ${where}
         GROUP BY p.id
         ${having}
       ) sub`,
      params
    );
    const total = Number(countResult.rows[0].count);

    // Distinct brands (deepest category names) available within this category,
    // ignoring the active brand/price/rating filters so the filter UI stays complete.
    const brandsResult = await pool.query(
      `SELECT DISTINCT p.deepest_category_name AS name
       FROM products p
       WHERE p.in_stock = true AND p.is_approved = true AND ${VARIANT_PRIMARY}
         AND p.deepest_category_name IS NOT NULL
         AND p.deepest_category_name <> ''
         AND (
           LOWER(p.deepest_category_name) = LOWER($1)
           OR EXISTS (
             SELECT 1 FROM jsonb_array_elements(
               CASE WHEN p.category_path IS NOT NULL
                    THEN p.category_path::jsonb
                    ELSE '[]'::jsonb
               END
             ) AS elem
             WHERE LOWER(elem->>'name') = LOWER($1)
           )
         )
       ORDER BY p.deepest_category_name ASC`,
      [categoryName]
    );

    const pageParams = [...params, limit, offset];
    const result = await pool.query(
      `SELECT p.*,
        COALESCE(json_agg(DISTINCT pi.image_url) FILTER (WHERE pi.image_url IS NOT NULL), '[]') as images,
        COALESCE(AVG(pr.rating), 0) as average_rating
       FROM products p
       LEFT JOIN product_images pi ON pi.product_id = p.id
       LEFT JOIN product_reviews pr ON pr.product_id = p.id
       WHERE ${where}
       GROUP BY p.id
       ${having}
       ORDER BY ${orderBy}
       LIMIT $${pageParams.length - 1} OFFSET $${pageParams.length}`,
      pageParams
    );

    const response = {
      success: true,
      products: result.rows.map(normalizeProduct),
      brands: brandsResult.rows.map((r: any) => r.name),
      pagination: {
        currentPage: page,
        totalPages: Math.ceil(total / limit),
        totalItems: total,
        itemsPerPage: limit,
        hasNextPage: page * limit < total,
        hasPrevPage: page > 1,
      },
    };
    await cacheSet(cacheKey, response, TTL_PRODUCT_LIST);
    res.json(response);
  } catch (err) {
    logger.error('getproductsbycategory_error', { error: (err as any)?.message ?? String(err) });
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// GET /api/v1/products — all products (paginated)
router.get('/', productListLimiter, async (req: Request, res: Response): Promise<void> => {
  const page = Number(req.query.page) || 1;
  const limit = Math.min(Number(req.query.limit) || 50, 200); // default 50, max 200
  const offset = (page - 1) * limit;

  const cacheKey = `products:all:p${page}:l${limit}`;
  const cached = await cacheGet(cacheKey);
  if (cached) { res.json(cached); return; }

  try {
    const countResult = await pool.query(`SELECT COUNT(*) FROM products p WHERE p.in_stock = true AND p.is_approved = true AND ${VARIANT_PRIMARY}`);
    const total = Number(countResult.rows[0].count);

    const result = await pool.query(
      `SELECT p.*,
        COALESCE(json_agg(pi.image_url) FILTER (WHERE pi.image_url IS NOT NULL), '[]') as images,
        COALESCE(AVG(pr.rating), 0) as average_rating
       FROM products p
       LEFT JOIN product_images pi ON pi.product_id = p.id
       LEFT JOIN product_reviews pr ON pr.product_id = p.id
       WHERE p.in_stock = true AND p.is_approved = true AND ${VARIANT_PRIMARY}
       GROUP BY p.id
       ORDER BY p.created_at DESC, p.id ASC
       LIMIT $1 OFFSET $2`,
      [limit, offset]
    );

    const response = {
      success: true,
      products: result.rows.map(normalizeProduct),
      pagination: {
        currentPage: page,
        totalPages: Math.ceil(total / limit),
        totalItems: total,
        itemsPerPage: limit,
        hasNextPage: page * limit < total,
        hasPrevPage: page > 1,
      },
    };
    await cacheSet(cacheKey, response, TTL_PRODUCT_LIST);
    res.json(response);
  } catch (err) {
    logger.error('getproducts_error', { error: (err as any)?.message ?? String(err) });
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// GET /api/v1/products/:id
router.get('/:id', async (req: Request, res: Response): Promise<void> => {
  const { id } = req.params;
  // Accept both UUID format (legacy) and 7-char alphanumeric IDs
  if (!isValidProductId(id)) {
    res.status(404).json({ success: false, message: 'Product not found' });
    return;
  }

  // A cached detail page is only served if products.updated_at still matches the
  // stamp taken when it was cached. A vendor price edit (any backend, plus the
  // `update_products_updated_at` trigger) bumps that column, so the next request
  // rebuilds instead of serving the old price for up to 2h.
  //
  // The stamp also covers the product's colour-variant siblings, because the
  // `variants` list below is part of this cached payload. Adding a Blue jacket
  // does not touch the Red row's updated_at, so on its own stamp the Red page
  // would keep serving a cached variants list with no Blue in it for up to 2h —
  // Blue showed Red and Green, but never the other way round.
  const cacheKey = `product:${id}`;
  const cached = await cacheGet<{ stamp: string; response: unknown }>(cacheKey);
  let freshStamp: string | null = null;
  try {
    const stampRow = await pool.query(
      `SELECT p.updated_at,
              (SELECT MAX(s.updated_at) FROM products s
                WHERE s.variant_group_id = p.variant_group_id AND s.is_approved = true) AS group_updated_at,
              (SELECT COUNT(*) FROM products s
                WHERE s.variant_group_id = p.variant_group_id AND s.is_approved = true) AS group_size
         FROM products p WHERE p.id = $1::uuid`,
      [id]
    );
    const r = stampRow.rows[0];
    // COUNT as well as MAX: removing or unapproving a sibling lowers the count
    // while leaving the group's newest updated_at untouched.
    freshStamp = r
      ? [r.updated_at, r.group_updated_at, r.group_size]
          .map((v: any) => String(v?.valueOf?.() ?? v))
          .join('|')
      : null;
  } catch { /* fall through to a full rebuild */ }
  if (cached?.response && freshStamp && cached.stamp === freshStamp) {
    res.json(cached.response);
    return;
  }

  try {
    const result = await pool.query(
      `SELECT p.*,
        COALESCE(json_agg(DISTINCT pi.image_url) FILTER (WHERE pi.image_url IS NOT NULL), '[]') as images,
        COALESCE(AVG(pr.rating), 0) as average_rating,
        u.name as seller_name,
        (u.is_live IS NOT FALSE) as seller_is_live,
        sp.personal_address as seller_address
       FROM products p
       LEFT JOIN product_images pi ON pi.product_id = p.id
       LEFT JOIN product_reviews pr ON pr.product_id = p.id
       LEFT JOIN users u ON u.id = p.user_id
       LEFT JOIN seller_profiles sp ON sp.user_id = p.user_id
       WHERE p.id = $1::uuid AND p.is_approved = true
       GROUP BY p.id, u.name, u.is_live, sp.personal_address`,
      [id]
    );

    if (result.rows.length === 0) {
      res.status(404).json({ success: false, message: 'Product not found' });
      return;
    }

    // Sibling color/design variants (vendor-website feature: each color is its
    // own product row, linked by variant_group_id). Absent for most products.
    let variants: Array<{ id: string; label: string; thumbnail?: string; price: number; inStock: boolean }> = [];
    const variantGroupId = result.rows[0].variant_group_id;
    if (variantGroupId) {
      const siblings = await pool.query(
        `SELECT p.id, p.variant_label, p.price, p.in_stock,
                (SELECT pi.image_url FROM product_images pi
                 WHERE pi.product_id = p.id ORDER BY pi.display_order, pi.created_at LIMIT 1) AS thumbnail
         FROM products p
         WHERE p.variant_group_id = $1 AND p.is_approved = true
         ORDER BY p.created_at`,
        [variantGroupId]
      );
      variants = siblings.rows.map((v) => ({
        id: v.id,
        label: v.variant_label || 'Untitled',
        thumbnail: v.thumbnail || undefined,
        price: withMarkup(v.price),
        inStock: v.in_stock,
      }));
    }

    const specifications = await getProductSpecifications(result.rows[0].id);

    // Seller name is inline; the address is detail-only and the app keeps it
    // behind a "More information" reveal (never in listings or search).
    const response = {
      success: true,
      data: {
        ...normalizeProduct(result.rows[0]),
        sellerName: result.rows[0].seller_name || undefined,
        sellerAddress: result.rows[0].seller_address || undefined,
        // users.is_live — the seller's go-live toggle. Same field name and same
        // meaning as the customer website's ProductDetail: advisory here, enforced
        // server-side at checkout.
        sellerIsLive: result.rows[0].seller_is_live !== false,
        variants: variants.length > 1 ? variants : undefined,
        specifications: specifications.length > 0 ? specifications : undefined,
      },
    };
    if (freshStamp) await cacheSet(cacheKey, { stamp: freshStamp, response }, TTL_PRODUCT);
    res.json(response);
  } catch (err) {
    logger.error('getproduct_error', { error: (err as any)?.message ?? String(err) });
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// POST /api/v1/products/reviews/upload
// Hosts one review photo and returns its URL; the URL is then sent in the
// `images` array of the review POST/PUT. Declared before the /:id routes so the
// literal path always wins.
router.post('/reviews/upload', authenticate, reviewUploadLimiter, reviewImageUpload.single('image'), async (req: AuthRequest, res: Response): Promise<void> => {
  if (!cloudinaryConfigured()) {
    res.status(503).json({ success: false, message: 'Image uploads are not available right now' });
    return;
  }
  if (!req.file?.buffer || !looksLikeImage(req.file.buffer)) {
    res.status(400).json({ success: false, message: 'Please choose a valid image file' });
    return;
  }

  try {
    const url = await uploadReviewImage(req.file.buffer, req.userId as string);
    res.status(201).json({ success: true, data: { url } });
  } catch (err) {
    logger.error('reviewimageupload_error', { error: (err as any)?.message ?? String(err) });
    res.status(500).json({ success: false, message: 'Failed to upload image' });
  }
});

// GET /api/v1/products/:id/reviews
router.get('/:id/reviews', async (req: Request, res: Response): Promise<void> => {
  if (!isValidProductId(req.params.id)) {
    res.status(404).json({ success: false, message: 'Product not found' });
    return;
  }

  try {
    await ensureModerationSchema();
    const page = Math.max(Number(req.query.page) || 1, 1);
    const limit = Math.min(Math.max(Number(req.query.limit) || 10, 1), 100);
    const offset = (page - 1) * limit;
    const mineOnly = String(req.query.mine || '').toLowerCase() === 'true' || String(req.query.mine || '') === '1';

    let mineUserId: string | null = null;

    if (mineOnly) {
      const token = extractToken(req);
      if (!token) {
        res.json({
          success: true,
          data: [],
          pagination: {
            currentPage: page,
            totalPages: 0,
            totalItems: 0,
            itemsPerPage: limit,
            hasNextPage: false,
            hasPrevPage: false,
          },
        });
        return;
      }

      mineUserId = getUserIdFromToken(token);
      if (!mineUserId) {
        res.json({
          success: true,
          data: [],
          pagination: {
            currentPage: page,
            totalPages: 0,
            totalItems: 0,
            itemsPerPage: limit,
            hasNextPage: false,
            hasPrevPage: false,
          },
        });
        return;
      }
    }

    const productUUID = await resolveProductUUID(req.params.id);
    if (!productUUID) {
      res.status(404).json({ success: false, message: 'Product not found' });
      return;
    }

    // For the public list, identify the (optional) requester so we can hide
    // reviews written by users they've blocked. This view is per-user, so it
    // bypasses the shared cache; only anonymous public requests are cached.
    let requesterId: string | null = null;
    if (!mineOnly) {
      const token = extractToken(req);
      requesterId = token ? getUserIdFromToken(token) : null;
    }
    const canUseCache = !mineOnly && !requesterId;

    if (canUseCache) {
      const cacheKey = `product:${productUUID}:reviews:p${page}:l${limit}`;
      const cached = await cacheGet(cacheKey);
      if (cached) { res.json(cached); return; }
    }

    // Shared public WHERE clause: never show hidden (moderated) reviews, and
    // exclude any authors the requester has blocked.
    const blockedFilter = requesterId
      ? ` AND pr.user_id::text NOT IN (SELECT blocked_user_id FROM user_blocks WHERE blocker_user_id = $2)`
      : '';

    const result = await pool.query(
      mineOnly
        ? `SELECT pr.*, u.name as user_name, NULL::text as user_profile_image
           FROM product_reviews pr
           JOIN users u ON u.id = pr.user_id::text
           WHERE pr.product_id = $1 AND pr.user_id::text = $2
           ORDER BY pr.created_at DESC
           LIMIT $3 OFFSET $4`
        : `SELECT pr.*, u.name as user_name, NULL::text as user_profile_image
           FROM product_reviews pr
           JOIN users u ON u.id = pr.user_id::text
           WHERE pr.product_id = $1 AND pr.is_hidden = false${blockedFilter}
           ORDER BY pr.created_at DESC
           LIMIT $${requesterId ? 3 : 2} OFFSET $${requesterId ? 4 : 3}`,
      mineOnly
        ? [productUUID, mineUserId, limit, offset]
        : requesterId
          ? [productUUID, requesterId, limit, offset]
          : [productUUID, limit, offset]
    );

    const countResult = await pool.query(
      mineOnly
        ? 'SELECT COUNT(*) FROM product_reviews WHERE product_id = $1 AND user_id::text = $2'
        : `SELECT COUNT(*) FROM product_reviews pr WHERE pr.product_id = $1 AND pr.is_hidden = false${blockedFilter}`,
      mineOnly
        ? [productUUID, mineUserId]
        : requesterId
          ? [productUUID, requesterId]
          : [productUUID]
    );
    const total = Number(countResult.rows[0].count);

    // Star distribution over ALL visible reviews, not just this page — the app
    // draws the 5/4/3/2/1 bars from it and the page only ever holds 10 rows.
    const distResult = await pool.query(
      mineOnly
        ? 'SELECT rating, COUNT(*)::int AS count FROM product_reviews WHERE product_id = $1 AND user_id::text = $2 GROUP BY rating'
        : `SELECT pr.rating, COUNT(*)::int AS count FROM product_reviews pr WHERE pr.product_id = $1 AND pr.is_hidden = false${blockedFilter} GROUP BY pr.rating`,
      mineOnly ? [productUUID, mineUserId] : requesterId ? [productUUID, requesterId] : [productUUID]
    );
    const ratingCounts: Record<string, number> = { '1': 0, '2': 0, '3': 0, '4': 0, '5': 0 };
    for (const row of distResult.rows) ratingCounts[String(row.rating)] = Number(row.count);

    const response = {
      success: true,
      data: result.rows.map(mapReviewRow),
      ratingCounts,
      pagination: {
        currentPage: page,
        totalPages: Math.ceil(total / limit),
        totalItems: total,
        itemsPerPage: limit,
        hasNextPage: page * limit < total,
        hasPrevPage: page > 1,
      },
    };

    // Only cache anonymous public review pages (per-user block views aren't shared)
    if (canUseCache) {
      await cacheSet(`product:${productUUID}:reviews:p${page}:l${limit}`, response, TTL_REVIEWS);
    }

    res.json(response);
  } catch (err) {
    logger.error('getreviews_error', { error: (err as any)?.message ?? String(err) });
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// POST /api/v1/products/:id/reviews
router.post('/:id/reviews', authenticate, reviewLimiter, async (req: AuthRequest, res: Response): Promise<void> => {
  if (!isValidProductId(req.params.id)) {
    res.status(404).json({ success: false, message: 'Product not found' });
    return;
  }

  const { rating, comment, images } = req.body;
  const parsedRating = Number(rating);
  const parsedComment = typeof comment === 'string' ? comment.trim() : '';

  if (!Number.isInteger(parsedRating) || parsedRating < 1 || parsedRating > 5) {
    res.status(400).json({ success: false, message: 'Rating must be between 1 and 5' });
    return;
  }
  if (!parsedComment) {
    res.status(400).json({ success: false, message: 'Rating and comment are required' });
    return;
  }
  if (parsedComment.length > 2000) {
    res.status(400).json({ success: false, message: 'Comment must be 2000 characters or fewer' });
    return;
  }

  if (images !== undefined && !Array.isArray(images)) {
    res.status(400).json({ success: false, message: 'Images must be an array of strings' });
    return;
  }
  const normalizedImages = normalizeReviewImages(images);
  if (images !== undefined && normalizedImages.length !== images.length) {
    res.status(400).json({ success: false, message: 'Images must be an array of strings' });
    return;
  }

  try {
    // Verify product exists and resolve UUID
    const product = await pool.query('SELECT id FROM products WHERE id = $1::uuid', [req.params.id]);
    if (product.rows.length === 0) {
      res.status(404).json({ success: false, message: 'Product not found' });
      return;
    }
    const productUUID = product.rows[0].id as string;

    // Prevent duplicate reviews from the same user
    const existing = await pool.query(
      'SELECT id FROM product_reviews WHERE product_id = $1 AND user_id::text = $2',
      [productUUID, req.userId]
    );
    if (existing.rows.length > 0) {
      res.status(409).json({ success: false, message: 'You have already reviewed this product' });
      return;
    }

    await pool.query(
      // id is a uuid with a DB default - never pass the 7-char generateId() here
      `INSERT INTO product_reviews (product_id, user_id, rating, comment, images, is_verified_purchase, created_at, updated_at)
       VALUES ($1,$2,$3,$4,$5,false,NOW(),NOW())`,
      [productUUID, req.userId, parsedRating, parsedComment, JSON.stringify(normalizedImages)]
    );
    // Invalidate product cache (rating changed) and all review pages
    await Promise.all([
      cacheDelPattern(`product:${productUUID}:reviews:*`),
      cacheDel(`product:${productUUID}`, `product:${req.params.id}`),
    ]);
    res.status(201).json({ success: true, message: 'Review added' });
  } catch (err) {
    logger.error('addreview_error', { error: (err as any)?.message ?? String(err) });
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// PUT /api/v1/products/:id/reviews/:reviewId
router.put('/:id/reviews/:reviewId', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  if (!isValidProductId(req.params.id)) {
    res.status(404).json({ success: false, message: 'Product not found' });
    return;
  }

  const { rating, comment, images } = req.body;

  if (rating === undefined && comment === undefined && images === undefined) {
    res.status(400).json({ success: false, message: 'No review fields provided' });
    return;
  }

  if (rating !== undefined) {
    const parsedRating = Number(rating);
    if (!Number.isInteger(parsedRating) || parsedRating < 1 || parsedRating > 5) {
      res.status(400).json({ success: false, message: 'Rating must be between 1 and 5' });
      return;
    }
  }

  if (comment !== undefined && (typeof comment !== 'string' || !comment.trim())) {
    res.status(400).json({ success: false, message: 'Comment cannot be empty' });
    return;
  }

  if (images !== undefined && !Array.isArray(images)) {
    res.status(400).json({ success: false, message: 'Images must be an array of strings' });
    return;
  }

  const normalizedImages = images !== undefined ? normalizeReviewImages(images) : [];
  if (images !== undefined && normalizedImages.length !== images.length) {
    res.status(400).json({ success: false, message: 'Images must be an array of strings' });
    return;
  }

  try {
    const productUUID = await resolveProductUUID(req.params.id);
    if (!productUUID) {
      res.status(404).json({ success: false, message: 'Product not found' });
      return;
    }

    const existing = await pool.query(
      `SELECT id, user_id::text as user_id, product_id, rating, comment, images
       FROM product_reviews
       WHERE id = $1 AND product_id = $2`,
      [req.params.reviewId, productUUID]
    );

    if (existing.rows.length === 0) {
      res.status(404).json({ success: false, message: 'Review not found' });
      return;
    }

    if (existing.rows[0].user_id !== req.userId) {
      res.status(403).json({ success: false, message: 'You can only edit your own review' });
      return;
    }

    const nextRating = rating !== undefined ? Number(rating) : Number(existing.rows[0].rating);
    const nextComment = comment !== undefined ? String(comment).trim() : String(existing.rows[0].comment);
    const nextImages = images !== undefined ? normalizedImages : normalizeReviewImages(existing.rows[0].images);

    await pool.query(
      `UPDATE product_reviews
       SET rating = $1,
           comment = $2,
           images = $3,
           updated_at = NOW()
       WHERE id = $4 AND product_id = $5 AND user_id::text = $6`,
      [nextRating, nextComment, JSON.stringify(nextImages), req.params.reviewId, productUUID, req.userId]
    );

    await Promise.all([
      cacheDelPattern(`product:${productUUID}:reviews:*`),
      cacheDel(`product:${productUUID}`, `product:${req.params.id}`),
    ]);

    res.json({ success: true, message: 'Review updated' });
  } catch (err) {
    logger.error('updatereview_error', { error: (err as any)?.message ?? String(err) });
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// DELETE /api/v1/products/:id/reviews/:reviewId
router.delete('/:id/reviews/:reviewId', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  if (!isValidProductId(req.params.id)) {
    res.status(404).json({ success: false, message: 'Product not found' });
    return;
  }

  try {
    const productUUID = await resolveProductUUID(req.params.id);
    if (!productUUID) {
      res.status(404).json({ success: false, message: 'Product not found' });
      return;
    }

    const existing = await pool.query(
      `SELECT id, user_id::text as user_id
       FROM product_reviews
       WHERE id = $1 AND product_id = $2`,
      [req.params.reviewId, productUUID]
    );

    if (existing.rows.length === 0) {
      res.status(404).json({ success: false, message: 'Review not found' });
      return;
    }

    if (existing.rows[0].user_id !== req.userId) {
      res.status(403).json({ success: false, message: 'You can only delete your own review' });
      return;
    }

    await pool.query(
      `DELETE FROM product_reviews
       WHERE id = $1 AND product_id = $2 AND user_id::text = $3`,
      [req.params.reviewId, productUUID, req.userId]
    );

    await Promise.all([
      cacheDelPattern(`product:${productUUID}:reviews:*`),
      cacheDel(`product:${productUUID}`, `product:${req.params.id}`),
    ]);

    res.json({ success: true, message: 'Review deleted' });
  } catch (err) {
    logger.error('deletereview_error', { error: (err as any)?.message ?? String(err) });
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// POST /api/v1/products/:id/reviews/:reviewId/report
// Report a review as abusive/objectionable (App Store guideline 1.2). After
// AUTO_HIDE_THRESHOLD distinct reports the review is auto-hidden pending
// manual moderation, which the team commits to completing within 24 hours.
router.post('/:id/reviews/:reviewId/report', authenticate, reviewLimiter, async (req: AuthRequest, res: Response): Promise<void> => {
  const reason = typeof req.body?.reason === 'string' ? req.body.reason.trim().slice(0, 500) : '';

  try {
    await ensureModerationSchema();

    const reviewRes = await pool.query(
      'SELECT id, product_id, user_id::text as user_id FROM product_reviews WHERE id = $1',
      [req.params.reviewId]
    );
    if (reviewRes.rows.length === 0) {
      res.status(404).json({ success: false, message: 'Review not found' });
      return;
    }
    const review = reviewRes.rows[0];

    if (review.user_id === req.userId) {
      res.status(400).json({ success: false, message: 'You cannot report your own review' });
      return;
    }

    // Idempotent: re-reporting just refreshes the reason, never double-counts.
    await pool.query(
      `INSERT INTO review_reports (id, review_id, reporter_user_id, reason, created_at)
       VALUES ($1, $2, $3, $4, NOW())
       ON CONFLICT (review_id, reporter_user_id)
       DO UPDATE SET reason = EXCLUDED.reason, created_at = NOW()`,
      [generateId(), req.params.reviewId, req.userId, reason || null]
    );

    const countRes = await pool.query(
      'SELECT COUNT(*)::int AS count FROM review_reports WHERE review_id = $1',
      [req.params.reviewId]
    );
    const reportCount = Number(countRes.rows[0].count);

    let hidden = false;
    if (reportCount >= AUTO_HIDE_THRESHOLD) {
      await pool.query(
        'UPDATE product_reviews SET is_hidden = true, updated_at = NOW() WHERE id = $1',
        [req.params.reviewId]
      );
      hidden = true;
      await cacheDelPattern(`product:${review.product_id}:reviews:*`);
    }

    res.json({
      success: true,
      message: 'Thanks for reporting. Our team reviews reports within 24 hours.',
      hidden,
    });
  } catch (err) {
    logger.error('reportreview_error', { error: (err as any)?.message ?? String(err) });
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

export default router;
