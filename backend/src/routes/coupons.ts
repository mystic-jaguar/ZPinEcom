import { Request, Response, Router } from 'express';
import { pool } from '../db';
import { authenticate, AuthRequest } from '../middleware/auth';
import { couponLimiter } from '../middleware/rateLimits';

const router = Router();

// GET /api/v1/coupons — list all coupons with computed status
router.get('/', async (req: Request, res: Response): Promise<void> => {
  try {
    const result = await pool.query(`
      SELECT id, code, description, discount_type, discount_value,
             min_order_amount, max_discount_amount, valid_until, usage_limit, usage_count,
             is_active,
             valid_until > NOW() AS not_expired,
             (usage_limit IS NULL OR usage_count < usage_limit) AS under_limit
      FROM coupons
      WHERE is_active = true
      ORDER BY not_expired DESC, created_at DESC
    `);

    const coupons = result.rows.map((r: any) => {
      let status: 'active' | 'expired' | 'used';
      if (!r.not_expired) status = 'expired';
      else if (!r.under_limit) status = 'used';
      else status = 'active';

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
        status,
      };
    });

    res.json({ success: true, data: coupons });
  } catch (err) {
    console.error('getCoupons error:', err);
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
        AND valid_until > NOW()
        AND (usage_limit IS NULL OR usage_count < usage_limit)
    `, [code]);

    if (result.rows.length === 0) {
      res.status(404).json({ success: false, message: 'Invalid or expired coupon code' });
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
    console.error('validateCoupon error:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

export default router;

