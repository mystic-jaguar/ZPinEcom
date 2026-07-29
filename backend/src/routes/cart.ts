import { Response, Router } from 'express';
import { pool } from '../db';
import { authenticate, AuthRequest } from '../middleware/auth';
import { cartWriteLimiter } from '../middleware/rateLimits';
import { generateId, isValidShortId } from '../utils/id';
import { LIVE_DEAL_PREDICATE } from '../utils/flashDeals';
import { withMarkup } from '../utils/pricing';
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
        (SELECT MIN(fd.deal_price) FROM flash_deals fd
          WHERE fd.product_id = ci.product_id AND ${LIVE_DEAL_PREDICATE}) as deal_price,
        COALESCE(json_agg(pi.image_url) FILTER (WHERE pi.image_url IS NOT NULL), '[]') as images
       FROM ${T} ci
       JOIN products p ON p.id = ci.product_id
       LEFT JOIN product_images pi ON pi.product_id = p.id
       WHERE ci.user_id = $1
       GROUP BY ci.id, p.product_name, p.price, p.in_stock, p.quantity`,
      [req.userId]
    );

    const cart = result.rows.map((r: any) => {
      // A live flash deal replaces the price everywhere it is shown, because it
      // is also the price checkout charges (see orders.ts). Never advertise a
      // deal price we don't actually bill.
      const effective = r.deal_price != null ? Number(r.deal_price) : Number(r.current_price);
      return {
      cartItemId: r.id,
      productId: r.product_id,
      quantity: r.quantity,
      // price_at_add / products.price are raw vendor prices; the customer sees
      // them with the 20% ZPIN platform fee applied (never stored).
      priceAtAdd: withMarkup(effective),
      isAvailable: r.in_stock && r.stock_qty >= r.quantity,
      product: {
        productId: r.product_id,
        productName: r.product_name,
        price: withMarkup(effective),
        images: r.images,
        inStock: r.in_stock,
      },
      timeStamp: r.created_at,
      };
    });

    const totalAmount = cart.reduce((sum: number, item: any) => sum + item.priceAtAdd * item.quantity, 0);

    res.json({
      success: true,
      data: {
        cart,
        totalItems: cart.length,
        totalAmount,
        hasUnavailableItems: cart.some((i: any) => !i.isAvailable),
        hasPriceChanges: cart.some((i: any) => i.priceAtAdd !== i.product.price),
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

  const parsedQty = Number(quantity);
  if (!Number.isInteger(parsedQty) || parsedQty < 1 || parsedQty > 100) {
    res.status(400).json({ success: false, message: 'Quantity must be between 1 and 100' });
    return;
  }

  if (typeof productId !== 'string' || !isValidShortId(productId)) {
    res.status(400).json({ success: false, message: 'Invalid productId' });
    return;
  }

  try {
    const product = await pool.query('SELECT price, in_stock FROM products WHERE id = $1::uuid', [productId]);
    if (product.rows.length === 0) {
      res.status(404).json({ success: false, message: 'Product not found' });
      return;
    }
    if (!product.rows[0].in_stock) {
      res.status(400).json({ success: false, message: 'Product is out of stock' });
      return;
    }

    const existing = await pool.query(
      `SELECT id FROM ${T} WHERE user_id = $1 AND product_id = $2::uuid`,
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
         VALUES ($1,$2,$3::uuid,$4,$5,NOW(),NOW())`,
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
  const parsedQty = Number(quantity);
  if (!parsedQty || !Number.isInteger(parsedQty) || parsedQty < 1 || parsedQty > 100) {
    res.status(400).json({ success: false, message: 'Quantity must be between 1 and 100' });
    return;
  }

  if (!isValidShortId(req.params.productId)) {
    res.status(400).json({ success: false, message: 'Invalid productId' });
    return;
  }

  try {
    const result = await pool.query(
      `UPDATE ${T} SET quantity = $1, updated_at = NOW() WHERE user_id = $2 AND product_id = $3::uuid RETURNING id`,
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
    await pool.query(`DELETE FROM ${T} WHERE user_id = $1 AND product_id = $2::uuid`, [req.userId, req.params.productId]);
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

