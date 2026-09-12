import { Request, Response, Router } from 'express';
import { pool } from '../db';

const router = Router();

const PLACEMENTS = ['top_carousel', 'feed_inline', 'category_hero'];

/**
 * `promo_banners.placement` says which slot a banner was authored for. It is NOT
 * migrated on every environment yet (SCHEMA_CHANGES.md 2026-09-12 +
 * website-admin/backend/migrate-banner-placement.js), so the column is probed
 * once a minute and, while it is absent, the table keeps its old meaning: every
 * banner is a `top_carousel` banner. A request for any other placement then gets
 * `[]`, which makes the app fall back to its built-in artwork — exactly today's
 * behaviour. Identical to the copies in website-customer and website-admin.
 */
let placementColCache: { value: boolean; at: number } | null = null;

export async function hasPlacementColumn(): Promise<boolean> {
  if (placementColCache && Date.now() - placementColCache.at < 60_000) return placementColCache.value;
  let value = false;
  try {
    const { rows } = await pool.query(
      `SELECT 1 FROM information_schema.columns
        WHERE table_name = 'promo_banners' AND column_name = 'placement'`
    );
    value = rows.length > 0;
  } catch { /* treat as absent */ }
  placementColCache = { value, at: Date.now() };
  return value;
}

// GET /api/v1/banners?placement=top_carousel — public. Read-only mirror of the
// admin-managed `promo_banners` table; same query and payload shape as the
// customer website's /api/banners so both surfaces show identical creative.
router.get('/', async (req: Request, res: Response) => {
  try {
    const requested = String(req.query.placement || 'top_carousel');
    const placement = PLACEMENTS.includes(requested) ? requested : 'top_carousel';
    const hasCol = await hasPlacementColumn();
    if (!hasCol && placement !== 'top_carousel') {
      return res.json({ success: true, data: [] });
    }
    const { rows } = await pool.query(
      `SELECT id, title, subtitle, image_url, action_url, bg_color, display_order
         FROM promo_banners
        WHERE is_active = true
          ${hasCol ? 'AND placement = $1' : ''}
          AND (starts_at IS NULL OR starts_at <= NOW())
          AND (ends_at   IS NULL OR ends_at   >  NOW())
        ORDER BY display_order ASC, created_at DESC`,
      hasCol ? [placement] : []
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
