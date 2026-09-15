import { Request, Response, Router } from 'express';
import { catalogZone } from '../utils/delivery';
import { pool } from '../db';
import { withMarkup } from '../utils/pricing';
import { LIVE_DEAL_PREDICATE, flashDealsEnabled } from '../utils/flashDeals';

const router = Router();

// GET /api/v1/flash-deals — public. Read-only mirror of the admin-managed table;
// same payload shape as the customer website's /api/flash-deals.
router.get('/', async (req: Request, res: Response) => {
  const zone = catalogZone(req.query.pincode);
  try {
    // Master switch off → no deals, which makes every consumer hide its
    // flash-deal / Bargain Deals section (they all hide on an empty list).
    if (!(await flashDealsEnabled())) { res.json({ success: true, data: [] }); return; }

    const { rows } = await pool.query(
      `SELECT fd.*, p.product_name, p.price AS original_price, p.description, p.in_stock,
        COALESCE(json_agg(DISTINCT pi.image_url) FILTER (WHERE pi.image_url IS NOT NULL), '[]') AS images,
        COALESCE(AVG(pr.rating), 0) AS average_rating
       FROM flash_deals fd
       JOIN products p ON p.id = fd.product_id
       LEFT JOIN product_images pi ON pi.product_id = p.id
       LEFT JOIN product_reviews pr ON pr.product_id = p.id AND pr.is_hidden = false
       WHERE ${LIVE_DEAL_PREDICATE} AND p.in_stock = true AND p.is_approved = true AND EXISTS (SELECT 1 FROM users su WHERE su.id = p.user_id AND su.is_active IS NOT FALSE AND su.deleted_at IS NULL)${zone.sql}
         -- Same display filter the customer website applies: a deal whose product
         -- has no usable image renders as a blank card. The row is untouched.
         AND EXISTS (
           SELECT 1 FROM product_images img
            WHERE img.product_id = p.id
              AND btrim(COALESCE(img.image_url, '')) <> ''
         )
       GROUP BY fd.id, p.product_name, p.price, p.description, p.in_stock
       ORDER BY fd.ends_at ASC
       LIMIT 20`
    );

    res.json({
      success: true,
      data: rows.map((row: any) => {
        // Both prices carry the same 20% platform fee, so the discount the
        // customer sees is exactly the discount the admin configured.
        const originalPrice = withMarkup(row.original_price);
        const dealPrice = withMarkup(row.deal_price);
        return {
          id: row.id,
          productId: row.product_id,
          productName: row.product_name,
          description: row.description,
          originalPrice,
          dealPrice,
          discountPercent: originalPrice > 0
            ? Math.round(((originalPrice - dealPrice) / originalPrice) * 100)
            : 0,
          images: row.images,
          rating: Number(row.average_rating) || 0,
          stockRemaining: row.stock_remaining,
          totalStock: row.total_stock,
          endsAt: row.ends_at,
          label: row.label || 'Flash Deal',
        };
      }),
    });
  } catch (err: any) {
    res.status(500).json({ success: false, message: 'Failed to load flash deals' });
  }
});

export default router;
