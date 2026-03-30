import { Request, Response, Router } from 'express';
import { pool } from '../db';
import { authenticate, AuthRequest } from '../middleware/auth';

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

// GET /api/v1/products
router.get('/', async (req: Request, res: Response): Promise<void> => {
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
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (!uuidRegex.test(id)) {
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
router.post('/:id/reviews', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  const { rating, comment } = req.body;
  if (!rating || !comment) {
    res.status(400).json({ success: false, message: 'Rating and comment are required' });
    return;
  }

  try {
    const { v4: uuidv4 } = await import('uuid');
    await pool.query(
      `INSERT INTO product_reviews (id, product_id, user_id, rating, comment, created_at, updated_at)
       VALUES ($1,$2,$3,$4,$5,NOW(),NOW())`,
      [uuidv4(), req.params.id, req.userId, rating, comment]
    );
    res.status(201).json({ success: true, message: 'Review added' });
  } catch (err) {
    console.error('addReview error:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

export default router;
