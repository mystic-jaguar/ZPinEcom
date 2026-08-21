import { Request, Response, Router } from 'express';
import { pool } from '../db';

const router = Router();

// GET /api/v1/banners — public. Read-only mirror of the admin-managed
// `promo_banners` table; same query and payload shape as the customer
// website's /api/banners so both surfaces show the identical carousel.
router.get('/', async (_req: Request, res: Response) => {
  try {
    const { rows } = await pool.query(
      `SELECT id, title, subtitle, image_url, action_url, bg_color, display_order
         FROM promo_banners
        WHERE is_active = true
          AND (starts_at IS NULL OR starts_at <= NOW())
          AND (ends_at   IS NULL OR ends_at   >  NOW())
        ORDER BY display_order ASC, created_at DESC`
    );
    res.json({
      success: true,
      data: rows.map((row: any) => ({
        id: row.id,
        title: row.title,
        subtitle: row.subtitle,
        imageUrl: row.image_url,
        actionUrl: row.action_url,
        bgColor: row.bg_color,
      })),
    });
  } catch (err: any) {
    console.error('getBanners error:', err.message);
    res.status(500).json({ success: false, message: 'Failed to load banners' });
  }
});

export default router;
