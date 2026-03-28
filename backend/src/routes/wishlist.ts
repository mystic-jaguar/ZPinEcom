import { Response, Router } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { pool } from '../db';
import { authenticate, AuthRequest } from '../middleware/auth';

const router = Router();
const T = 'customer_wishlists';

// GET /api/v1/wishlist/count — before /:productId
router.get('/count', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const result = await pool.query(`SELECT COUNT(*) FROM ${T} WHERE user_id = $1`, [req.userId]);
    res.json({ success: true, data: { count: Number(result.rows[0].count) } });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// DELETE /api/v1/wishlist/clear — before /:productId
router.delete('/clear', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    await pool.query(`DELETE FROM ${T} WHERE user_id = $1`, [req.userId]);
    res.json({ success: true, message: 'Wishlist cleared' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// GET /api/v1/wishlist
router.get('/', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  const page = Number(req.query.page) || 1;
  const limit = Number(req.query.limit) || 20;
  const offset = (page - 1) * limit;

  try {
    const countResult = await pool.query(`SELECT COUNT(*) FROM ${T} WHERE user_id = $1`, [req.userId]);
    const total = Number(countResult.rows[0].count);

    const result = await pool.query(
      `SELECT w.product_id, p.product_name, p.price, p.in_stock,
        COALESCE(json_agg(pi.image_url) FILTER (WHERE pi.image_url IS NOT NULL), '[]') as images,
        MAX(w.created_at) as created_at
       FROM ${T} w
       JOIN products p ON p.id = w.product_id
       LEFT JOIN product_images pi ON pi.product_id = p.id
       WHERE w.user_id = $1
       GROUP BY w.product_id, p.product_name, p.price, p.in_stock
       ORDER BY MAX(w.created_at) DESC
       LIMIT $2 OFFSET $3`,
      [req.userId, limit, offset]
    );

    res.json({
      success: true,
      data: result.rows.map(r => ({
        productId: r.product_id,
        productName: r.product_name,
        price: Number(r.price),
        inStock: r.in_stock,
        images: r.images,
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
    console.error('getWishlist error:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// POST /api/v1/wishlist
router.post('/', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  const { productId } = req.body;
  if (!productId) {
    res.status(400).json({ success: false, message: 'productId is required' });
    return;
  }

  try {
    const existing = await pool.query(`SELECT id FROM ${T} WHERE user_id = $1 AND product_id = $2`, [req.userId, productId]);
    if (existing.rows.length > 0) {
      res.status(409).json({ success: false, message: 'Already in wishlist' });
      return;
    }
    await pool.query(
      `INSERT INTO ${T} (id, user_id, product_id, created_at) VALUES ($1,$2,$3,NOW())`,
      [uuidv4(), req.userId, productId]
    );
    res.status(201).json({ success: true, message: 'Added to wishlist' });
  } catch (err) {
    console.error('addWishlist error:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// DELETE /api/v1/wishlist/:productId
router.delete('/:productId', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    await pool.query(`DELETE FROM ${T} WHERE user_id = $1 AND product_id = $2`, [req.userId, req.params.productId]);
    res.json({ success: true, message: 'Removed from wishlist' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

export default router;
