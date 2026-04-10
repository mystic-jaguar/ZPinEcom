import { Request, Response, Router } from 'express';
import { pool } from '../db';
import { authenticate, AuthRequest } from '../middleware/auth';
import { productListLimiter, reviewLimiter } from '../middleware/rateLimits';
import { generateId } from '../utils/id';

const router = Router();

function normalizeProduct(row: any) {
  // Extract sizes from size_quantities keys (e.g. {S:10, M:15} → ['S','M'])
  const sizeQuantities = row.size_quantities || {};
  const sizes = Object.keys(sizeQuantities).filter(k => sizeQuantities[k] > 0);

  // Extract colors from extracted_attributes
  const attrs = row.extracted_attributes || {};
  const colors: string[] = attrs.colors || [];

  return {
    productId: row.id,
    userId: row.user_id,
    productName: row.product_name,
    description: row.description,
    categoryId: row.category_id,
    deepestCategoryName: row.deepest_category_name,
    categoryPath: row.category_path || 'All',
    price: Number(row.price),
    quantity: row.quantity,
    inStock: row.in_stock,
    images: row.images || [],
    timeStamp: row.created_at,
    rating: Number(row.average_rating) || 0,
    sizes: sizes.length > 0 ? sizes : undefined,
    colors: colors.length > 0 ? colors : undefined,
    sizeQuantities: Object.keys(sizeQuantities).length > 0 ? sizeQuantities : undefined,
    attributes: Object.keys(attrs).length > 0 ? attrs : undefined,
  };
}

const PRODUCT_ID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const SHORT_ID_REGEX = /^[A-Z0-9]{7}$/;

function isValidProductId(id: string): boolean {
  return PRODUCT_ID_REGEX.test(id) || SHORT_ID_REGEX.test(id);
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

    const result = await pool.query(
      `SELECT p.*,
        COALESCE(json_agg(DISTINCT pi.image_url) FILTER (WHERE pi.image_url IS NOT NULL), '[]') as images,
        COALESCE(AVG(pr.rating), 0) as average_rating
       FROM products p
       LEFT JOIN product_images pi ON pi.product_id = p.id
       LEFT JOIN product_reviews pr ON pr.product_id = p.id
       WHERE p.in_stock = true
         AND (
           LOWER(REPLACE(p.product_name, ' ', '')) LIKE $1
           OR LOWER(p.product_name) LIKE $2
         )
       GROUP BY p.id
       ORDER BY p.created_at DESC
       LIMIT $3`,
      [`%${normalized}%`, `%${spaced}%`, limit]
    );

    const products = result.rows.map(normalizeProduct);

    // Fetch related products — same deepest_category_name, excluding already found
    let related: any[] = [];
    if (products.length > 0) {
      const categories = [...new Set(products.map(p => p.deepestCategoryName).filter(Boolean))];
      const foundIds = products.map(p => p.productId);

      const relatedResult = await pool.query(
        `SELECT p.*,
          COALESCE(json_agg(DISTINCT pi.image_url) FILTER (WHERE pi.image_url IS NOT NULL), '[]') as images,
          COALESCE(AVG(pr.rating), 0) as average_rating
         FROM products p
         LEFT JOIN product_images pi ON pi.product_id = p.id
         LEFT JOIN product_reviews pr ON pr.product_id = p.id
         WHERE p.in_stock = true
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
    console.error('search error:', err);
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

  try {
    const results = await Promise.all(
      NEARBY_CATEGORIES.map(async (cat) => {
        const likeConditions = cat.keywords
          .map((_, i) => `LOWER(p.category_path::text) LIKE $${i + 1}`)
          .join(' OR ');
        const params = cat.keywords.map(k => `%${k}%`);

        const countResult = await pool.query(
          `SELECT COUNT(*) FROM products p WHERE p.in_stock = true AND (${likeConditions})`,
          params
        );

        // Get one representative image
        const imgResult = await pool.query(
          `SELECT pi.image_url FROM products p
           JOIN product_images pi ON pi.product_id = p.id
           WHERE p.in_stock = true AND (${likeConditions})
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

    res.json({ success: true, data: results });
  } catch (err) {
    console.error('nearby error:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// GET /api/v1/products/fresh-categories — top 5 categories with the most recently added product
router.get('/fresh-categories', async (req: Request, res: Response): Promise<void> => {
  try {
    const result = await pool.query(`
      SELECT DISTINCT ON (deepest_category_name)
        deepest_category_name,
        category_path,
        MAX(created_at) OVER (PARTITION BY deepest_category_name) AS latest_at,
        (SELECT image_url FROM product_images WHERE product_id = p.id LIMIT 1) AS image_url
      FROM products p
      WHERE in_stock = true
        AND deepest_category_name IS NOT NULL
        AND deepest_category_name != ''
      ORDER BY deepest_category_name, created_at DESC
    `);

    // Sort by latest_at desc, take top 5
    const sorted = result.rows
      .sort((a, b) => new Date(b.latest_at).getTime() - new Date(a.latest_at).getTime())
      .slice(0, 5);

    const categories = sorted.map(r => ({
      name: r.deepest_category_name,
      categoryPath: r.category_path,
      imageUrl: r.image_url || null,
      latestAt: r.latest_at,
    }));

    res.json({ success: true, data: categories });
  } catch (err) {
    console.error('freshCategories error:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// GET /api/v1/products/category/:categoryName — filter by category name
router.get('/category/:categoryName', productListLimiter, async (req: Request, res: Response): Promise<void> => {
  const page = Number(req.query.page) || 1;
  const limit = Math.min(Number(req.query.limit) || 100, 500); // default 100, max 500
  const offset = (page - 1) * limit;
  const { categoryName } = req.params;

  // Use exact case-insensitive match for deepest_category_name,
  // and a JSON element match for category_path to avoid substring false-positives
  // e.g. "shirts" should NOT match "t-shirts" or "sweatshirts"
  try {
    const countResult = await pool.query(
      `SELECT COUNT(*) FROM products
       WHERE in_stock = true
         AND (
           LOWER(deepest_category_name) = LOWER($1)
           OR EXISTS (
             SELECT 1 FROM jsonb_array_elements(
               CASE WHEN category_path IS NOT NULL
                    THEN category_path::jsonb
                    ELSE '[]'::jsonb
               END
             ) AS elem
             WHERE LOWER(elem->>'name') = LOWER($1)
           )
         )`,
      [categoryName]
    );
    const total = Number(countResult.rows[0].count);

    const result = await pool.query(
      `SELECT p.*,
        COALESCE(json_agg(pi.image_url) FILTER (WHERE pi.image_url IS NOT NULL), '[]') as images,
        COALESCE(AVG(pr.rating), 0) as average_rating
       FROM products p
       LEFT JOIN product_images pi ON pi.product_id = p.id
       LEFT JOIN product_reviews pr ON pr.product_id = p.id
       WHERE p.in_stock = true
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
       GROUP BY p.id
       ORDER BY p.created_at DESC
       LIMIT $2 OFFSET $3`,
      [categoryName, limit, offset]
    );

    res.json({
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
    });
  } catch (err) {
    console.error('getProductsByCategory error:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// GET /api/v1/products — all products (paginated)
router.get('/', productListLimiter, async (req: Request, res: Response): Promise<void> => {
  const page = Number(req.query.page) || 1;
  const limit = Math.min(Number(req.query.limit) || 50, 200); // default 50, max 200
  const offset = (page - 1) * limit;

  try {
    const countResult = await pool.query(`SELECT COUNT(*) FROM products WHERE in_stock = true`);
    const total = Number(countResult.rows[0].count);

    const result = await pool.query(
      `SELECT p.*,
        COALESCE(json_agg(pi.image_url) FILTER (WHERE pi.image_url IS NOT NULL), '[]') as images,
        COALESCE(AVG(pr.rating), 0) as average_rating
       FROM products p
       LEFT JOIN product_images pi ON pi.product_id = p.id
       LEFT JOIN product_reviews pr ON pr.product_id = p.id
       WHERE p.in_stock = true
       GROUP BY p.id
       ORDER BY p.created_at DESC
       LIMIT $1 OFFSET $2`,
      [limit, offset]
    );

    res.json({
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
    });
  } catch (err) {
    console.error('getProducts error:', err);
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

  try {
    const result = await pool.query(
      `SELECT p.*,
        COALESCE(json_agg(DISTINCT pi.image_url) FILTER (WHERE pi.image_url IS NOT NULL), '[]') as images,
        COALESCE(AVG(pr.rating), 0) as average_rating
       FROM products p
       LEFT JOIN product_images pi ON pi.product_id = p.id
       LEFT JOIN product_reviews pr ON pr.product_id = p.id
       WHERE p.id = $1
       GROUP BY p.id`,
      [id]
    );

    if (result.rows.length === 0) {
      res.status(404).json({ success: false, message: 'Product not found' });
      return;
    }

    res.json({ success: true, data: normalizeProduct(result.rows[0]) });
  } catch (err) {
    console.error('getProduct error:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// GET /api/v1/products/:id/reviews
router.get('/:id/reviews', async (req: Request, res: Response): Promise<void> => {
  if (!isValidProductId(req.params.id)) {
    res.status(404).json({ success: false, message: 'Product not found' });
    return;
  }

  const page = Number(req.query.page) || 1;
  const limit = Number(req.query.limit) || 10;
  const offset = (page - 1) * limit;

  try {
    const result = await pool.query(
      `SELECT pr.*, u.name as user_name, u.profile_image as user_profile_image
       FROM product_reviews pr
       JOIN users u ON u.id = pr.user_id
       WHERE pr.product_id = $1
       ORDER BY pr.created_at DESC
       LIMIT $2 OFFSET $3`,
      [req.params.id, limit, offset]
    );

    const countResult = await pool.query(
      'SELECT COUNT(*) FROM product_reviews WHERE product_id = $1', [req.params.id]
    );
    const total = Number(countResult.rows[0].count);

    res.json({
      success: true,
      data: result.rows.map(mapReviewRow),
      pagination: {
        currentPage: page,
        totalPages: Math.ceil(total / limit),
        totalItems: total,
        itemsPerPage: limit,
        hasNextPage: page * limit < total,
        hasPrevPage: page > 1,
      },
    });
  } catch (err) {
    console.error('getReviews error:', err);
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
    // Verify product exists
    const product = await pool.query('SELECT id FROM products WHERE id = $1', [req.params.id]);
    if (product.rows.length === 0) {
      res.status(404).json({ success: false, message: 'Product not found' });
      return;
    }

    // Prevent duplicate reviews from the same user
    const existing = await pool.query(
      'SELECT id FROM product_reviews WHERE product_id = $1 AND user_id = $2',
      [req.params.id, req.userId]
    );
    if (existing.rows.length > 0) {
      res.status(409).json({ success: false, message: 'You have already reviewed this product' });
      return;
    }

    await pool.query(
      `INSERT INTO product_reviews (id, product_id, user_id, rating, comment, images, is_verified_purchase, created_at, updated_at)
       VALUES ($1,$2,$3,$4,$5,$6,false,NOW(),NOW())`,
      [generateId(), req.params.id, req.userId, parsedRating, parsedComment, JSON.stringify(normalizedImages)]
    );
    res.status(201).json({ success: true, message: 'Review added' });
  } catch (err) {
    console.error('addReview error:', err);
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
    const existing = await pool.query(
      `SELECT id, user_id, product_id, rating, comment, images
       FROM product_reviews
       WHERE id = $1 AND product_id = $2`,
      [req.params.reviewId, req.params.id]
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
       WHERE id = $4 AND product_id = $5 AND user_id = $6`,
      [nextRating, nextComment, JSON.stringify(nextImages), req.params.reviewId, req.params.id, req.userId]
    );

    res.json({ success: true, message: 'Review updated' });
  } catch (err) {
    console.error('updateReview error:', err);
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
    const existing = await pool.query(
      `SELECT id, user_id
       FROM product_reviews
       WHERE id = $1 AND product_id = $2`,
      [req.params.reviewId, req.params.id]
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
       WHERE id = $1 AND product_id = $2 AND user_id = $3`,
      [req.params.reviewId, req.params.id, req.userId]
    );

    res.json({ success: true, message: 'Review deleted' });
  } catch (err) {
    console.error('deleteReview error:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

export default router;
