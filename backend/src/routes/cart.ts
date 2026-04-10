import { Response, Router } from 'express';
import { pool } from '../db';
import { authenticate, AuthRequest } from '../middleware/auth';
import { cartWriteLimiter } from '../middleware/rateLimits';
import { generateId, isValidShortId } from '../utils/id';
import { safeIdentifier } from '../utils/sql';

const router = Router();
const T = safeIdentifier('cart_items');

// GET /api/v1/cart/count
router.get('/count', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const result = await pool.query(`SELECT COUNT(*) FROM ${T} WHERE user_id = $1`, [req.userId]);
    res.json({ success: true, data: { count: Number(result.rows[0].count) } });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// GET /api/v1/cart
router.get('/', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const result = await pool.query(
      `SELECT ci.*, p.product_name, p.price as current_price, p.in_stock, p.quantity as stock_qty,
        COALESCE(json_agg(pi.image_url) FILTER (WHERE pi.image_url IS NOT NULL), '[]') as images
       FROM ${T} ci
       JOIN products p ON p.id = ci.product_id
       LEFT JOIN product_images pi ON pi.product_id = p.id
       WHERE ci.user_id = $1
       GROUP BY ci.id, p.product_name, p.price, p.in_stock, p.quantity`,
      [req.userId]
    );

    const cart = result.rows.map(r => ({
      cartItemId: r.id,
      productId: r.product_id,
      quantity: r.quantity,
      priceAtAdd: Number(r.price_at_add),
      isAvailable: r.in_stock && r.stock_qty >= r.quantity,
      product: {
        productId: r.product_id,
        productName: r.product_name,
        price: Number(r.current_price),
        images: r.images,
        inStock: r.in_stock,
      },
      timeStamp: r.created_at,
    }));

    const totalAmount = cart.reduce((sum, item) => sum + item.priceAtAdd * item.quantity, 0);

    res.json({
      success: true,
      data: {
        cart,
        totalItems: cart.length,
        totalAmount,
        hasUnavailableItems: cart.some(i => !i.isAvailable),
        hasPriceChanges: cart.some(i => i.priceAtAdd !== i.product.price),
      },
    });
  } catch (err) {
    console.error('getCart error:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// POST /api/v1/cart
router.post('/', authenticate, cartWriteLimiter, async (req: AuthRequest, res: Response): Promise<void> => {
  const { productId, quantity = 1 } = req.body;
  if (!productId) {
    res.status(400).json({ success: false, message: 'productId is required' });
    return;
  }

  if (typeof productId !== 'string' || !isValidShortId(productId)) {
    res.status(400).json({ success: false, message: 'Invalid productId' });
    return;
  }

  try {
    const product = await pool.query('SELECT price, in_stock FROM products WHERE id = $1', [productId]);
    if (product.rows.length === 0) {
      res.status(404).json({ success: false, message: 'Product not found' });
      return;
    }
    if (!product.rows[0].in_stock) {
      res.status(400).json({ success: false, message: 'Product is out of stock' });
      return;
    }

    const existing = await pool.query(
      `SELECT id FROM ${T} WHERE user_id = $1 AND product_id = $2`,
      [req.userId, productId]
    );

    if (existing.rows.length > 0) {
      await pool.query(
        `UPDATE ${T} SET quantity = quantity + $1, updated_at = NOW() WHERE id = $2`,
        [quantity, existing.rows[0].id]
      );
    } else {
      await pool.query(
        `INSERT INTO ${T} (id, user_id, product_id, quantity, price_at_add, created_at, updated_at)
         VALUES ($1,$2,$3,$4,$5,NOW(),NOW())`,
        [generateId(), req.userId, productId, quantity, product.rows[0].price]
      );
    }

    res.status(201).json({ success: true, message: 'Added to cart' });
  } catch (err) {
    console.error('addToCart error:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// PUT /api/v1/cart/:productId
router.put('/:productId', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  const { quantity } = req.body;
  if (!quantity || quantity < 1) {
    res.status(400).json({ success: false, message: 'Valid quantity is required' });
    return;
  }

  if (!isValidShortId(req.params.productId)) {
    res.status(400).json({ success: false, message: 'Invalid productId' });
    return;
  }

  try {
    const result = await pool.query(
      `UPDATE ${T} SET quantity = $1, updated_at = NOW() WHERE user_id = $2 AND product_id = $3 RETURNING id`,
      [quantity, req.userId, req.params.productId]
    );
    if (result.rows.length === 0) {
      res.status(404).json({ success: false, message: 'Cart item not found' });
      return;
    }
    res.json({ success: true, message: 'Cart updated' });
  } catch (err) {
    console.error('updateCart error:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// DELETE /api/v1/cart/:productId
router.delete('/:productId', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  if (!isValidShortId(req.params.productId)) {
    res.status(400).json({ success: false, message: 'Invalid productId' });
    return;
  }

  try {
    await pool.query(`DELETE FROM ${T} WHERE user_id = $1 AND product_id = $2`, [req.userId, req.params.productId]);
    res.json({ success: true, message: 'Item removed from cart' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// DELETE /api/v1/cart
router.delete('/', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    await pool.query(`DELETE FROM ${T} WHERE user_id = $1`, [req.userId]);
    res.json({ success: true, message: 'Cart cleared' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

export default router;

