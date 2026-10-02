import { Request, Response, Router } from 'express';
import { pool } from '../db';
import { authenticate, AuthRequest } from '../middleware/auth';
import { couponLimiter } from '../middleware/rateLimits';
import { cacheGet, cacheSet } from '../utils/redis';
import { logger } from '../utils/logger';

const COUPON_CACHE_KEY = 'coupons:all';
const TTL_COUPONS = 3600; // 1h

const router = Router();

// GET /api/v1/coupons — list all coupons with computed status
router.get('/', async (req: Request, res: Response): Promise<void> => {
  // Status is computed per request, not cached: a cached 'active' used to outlive expiry by up to 1h.
  const withStatus = (rows: any[]) => ({
    success: true,
    data: rows
      .map((c: any) => {
        const expired = c.expiryDate !== null && new Date(c.expiryDate).getTime() <= Date.now();
        const usedUp = c.usageLimit !== null && c.usageCount >= c.usageLimit;
        return { ...c, status: expired ? 'expired' : usedUp ? 'used' : 'active' };
      })
      .sort((a: any, b: any) => Number(a.status === 'expired') - Number(b.status === 'expired')),
  });

  const cached = await cacheGet(COUPON_CACHE_KEY);
  if (cached) { res.json(withStatus(cached as any[])); return; }

  try {
    const result = await pool.query(`
      SELECT id, code, description, discount_type, discount_value,
             min_order_amount, max_discount_amount, valid_until, usage_limit, usage_count,
             is_active
      FROM coupons
      WHERE is_active = true
      ORDER BY created_at DESC
    `);

    const coupons = result.rows.map((r: any) => {
      return {
        id: r.id,
        code: r.code,
        title: r.code,
        description: r.description,
        discountType: r.discount_type,
        discountValue: Number(r.discount_value),
        minOrderValue: Number(r.min_order_amount),
        maxDiscount: r.max_discount_amount ? Number(r.max_discount_amount) : null,
        expiryDate: r.valid_until,
        usageLimit: r.usage_limit,
        usageCount: r.usage_count,
      };
    });

    await cacheSet(COUPON_CACHE_KEY, coupons, TTL_COUPONS);
    res.json(withStatus(coupons));
  } catch (err) {
    logger.error('getcoupons_error', { error: (err as any)?.message ?? String(err) });
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// POST /api/v1/coupons/validate — validate a coupon code against an order total (auth required)
router.post('/validate', authenticate, couponLimiter, async (req: AuthRequest, res: Response): Promise<void> => {
  const { code, orderTotal } = req.body;

  if (!code || orderTotal === undefined) {
    res.status(400).json({ success: false, message: 'code and orderTotal are required' });
    return;
  }

  try {
    const result = await pool.query(`
      SELECT id, code, description, discount_type, discount_value,
             min_order_amount, max_discount_amount, valid_until, usage_limit, usage_count
      FROM coupons
      WHERE UPPER(code) = UPPER($1)
        AND is_active = true
        AND (valid_until IS NULL OR valid_until > NOW())
        AND (usage_limit IS NULL OR usage_count < usage_limit)
    `, [code]);

    if (result.rows.length === 0) {
      res.status(404).json({ success: false, message: 'Invalid or expired coupon code' });
      return;
    }

    // Single use per user, same as checkout and the website — say so here, not at the last step.
    const used = await pool.query(
      'SELECT 1 FROM coupon_redemptions WHERE user_id = $1 AND UPPER(coupon_code) = UPPER($2)',
      [String(req.userId), code]
    );
    if (used.rows.length > 0) {
      res.status(409).json({ success: false, message: 'You have already used this coupon' });
      return;
    }

    const c = result.rows[0];
    const minOrder = Number(c.min_order_amount);

    if (orderTotal < minOrder) {
      res.status(400).json({
        success: false,
        message: `Minimum order value of ₹${minOrder} required for this coupon`,
      });
      return;
    }

    let discount = 0;
    if (c.discount_type === 'percentage') {
      discount = (orderTotal * Number(c.discount_value)) / 100;
      if (c.max_discount_amount) {
        discount = Math.min(discount, Number(c.max_discount_amount));
      }
    } else {
      discount = Number(c.discount_value);
    }

    res.json({
      success: true,
      data: {
        id: c.id,
        code: c.code,
        title: c.code,
        description: c.description,
        discountType: c.discount_type,
        discountValue: Number(c.discount_value),
        minOrderValue: minOrder,
        maxDiscount: c.max_discount_amount ? Number(c.max_discount_amount) : null,
        expiryDate: c.valid_until,
        discount,
      },
    });
  } catch (err) {
    logger.error('validatecoupon_error', { error: (err as any)?.message ?? String(err) });
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

export default router;

