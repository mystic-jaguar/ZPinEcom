import rateLimit from 'express-rate-limit';

const json429 = (msg: string) => ({
  success: false,
  message: msg,
});

// ── Global API limiter — applied to every route ───────────────────────────────
// 300 requests per 15 minutes per IP — blocks scrapers and bots
export const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 300,
  message: json429('Too many requests. Please slow down.'),
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => req.path === '/health', // never limit health checks
});

// ── Product listing — public, high-value scraping target ─────────────────────
// 60 requests per minute per IP
export const productListLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 60,
  message: json429('Too many product requests. Please try again shortly.'),
  standardHeaders: true,
  legacyHeaders: false,
});

// ── Order creation — prevent order spam ──────────────────────────────────────
// 10 orders per hour per IP
export const orderCreateLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 10,
  message: json429('Too many orders placed. Please try again later.'),
  standardHeaders: true,
  legacyHeaders: false,
});

// ── Cart writes — prevent cart flooding ──────────────────────────────────────
// 60 cart mutations per 5 minutes per IP
export const cartWriteLimiter = rateLimit({
  windowMs: 5 * 60 * 1000,
  max: 60,
  message: json429('Too many cart requests. Please slow down.'),
  standardHeaders: true,
  legacyHeaders: false,
});

// ── Review submission — prevent review spam ───────────────────────────────────
// 5 reviews per hour per IP
export const reviewLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 5,
  message: json429('Too many reviews submitted. Please try again later.'),
  standardHeaders: true,
  legacyHeaders: false,
});

// ── Coupon validation — prevent brute-force coupon guessing ──────────────────
// 20 validations per 15 minutes per IP
export const couponLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  message: json429('Too many coupon attempts. Please try again later.'),
  standardHeaders: true,
  legacyHeaders: false,
});

// ── Address creation — prevent address flooding ───────────────────────────────
// 10 addresses per hour per IP
export const addressLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 10,
  message: json429('Too many address requests. Please try again later.'),
  standardHeaders: true,
  legacyHeaders: false,
});
