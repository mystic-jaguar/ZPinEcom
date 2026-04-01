import { Request, Response, Router } from 'express';
import { pool } from '../db';
import { authenticate, AuthRequest } from '../middleware/auth';
import { productListLimiter, reviewLimiter } from '../middleware/rateLimits';
import { generateId } from '../utils/id';

const router = Router();

function normalizeProduct(row: any) {
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
  };
}

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
  const limit = Number(req.query.limit) || 50;
  const offset = (page - 1) * limit;
  const { categoryName } = req.params;

  try {
    const countResult = await pool.query(
      `SELECT COUNT(*) FROM products
       WHERE in_stock = true
         AND (
           LOWER(deepest_category_name) = LOWER($1)
           OR category_path::text ILIKE $2
         )`,
      [categoryName, `%${categoryName}%`]
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
           OR p.category_path::text ILIKE $2
         )
       GROUP BY p.id
       ORDER BY p.created_at DESC
       LIMIT $3 OFFSET $4`,
      [categoryName, `%${categoryName}%`, limit, offset]
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
  const limit = Number(req.query.limit) || 20;
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
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  const shortIdRegex = /^[A-Z0-9]{7}$/;
  if (!uuidRegex.test(id) && !shortIdRegex.test(id)) {
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
  const page = Number(req.query.page) || 1;
  const limit = Number(req.query.limit) || 10;
  const offset = (page - 1) * limit;

  try {
    const result = await pool.query(
      `SELECT pr.*, u.name as user_name
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
      data: result.rows.map(r => ({
        id: r.id,
        userId: r.user_id,
        productId: r.product_id,
        rating: r.rating,
        comment: r.comment,
        user: { name: r.user_name },
        createdAt: r.created_at,
      })),
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
  const { rating, comment } = req.body;
  if (!rating || !comment) {
    res.status(400).json({ success: false, message: 'Rating and comment are required' });
    return;
  }
  if (rating < 1 || rating > 5) {
    res.status(400).json({ success: false, message: 'Rating must be between 1 and 5' });
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
      `INSERT INTO product_reviews (id, product_id, user_id, rating, comment, created_at, updated_at)
       VALUES ($1,$2,$3,$4,$5,NOW(),NOW())`,
      [generateId(), req.params.id, req.userId, rating, comment]
    );
    res.status(201).json({ success: true, message: 'Review added' });
  } catch (err) {
    console.error('addReview error:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

export default router;
