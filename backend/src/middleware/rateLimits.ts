import rateLimit from 'express-rate-limit';

const json429 = (msg: string) => ({
  success: false,
  message: msg,
});

const isProd = process.env.NODE_ENV === 'production';

// ── Global API limiter — applied to every route ───────────────────────────────
// Production: 300 req/15min — blocks scrapers and bots
// Development: 2000 req/15min — allows normal dev/testing without hitting limits
export const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: isProd ? 300 : 2000,
  message: json429('Too many requests. Please slow down.'),
  standardHeaders: true,
  legacyHeaders: false,
  // Auth routes carry their own limiters with action-specific messages ("Too many
  // OTP requests…", "Too many signup attempts…"). Letting the global limiter fire
  // first replaced those with a useless generic 429 — and on mobile carrier NAT,
  // where many users share one IP, it tripped far earlier than intended.
  skip: (req) => req.path === '/health' || req.path.startsWith('/api/v1/auth/'),
});

// ── Product listing — public, high-value scraping target ─────────────────────
// Production: 60/min | Development: unlimited
export const productListLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: isProd ? 60 : 10000,
  message: json429('Too many product requests. Please try again shortly.'),
  standardHeaders: true,
  legacyHeaders: false,
});

// ── Order creation — prevent order spam ──────────────────────────────────────
// Production: 20/hour | Development: unlimited
export const orderCreateLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: isProd ? 20 : 10000,
  message: json429('Too many orders placed. Please try again later.'),
  standardHeaders: true,
  legacyHeaders: false,
});

// ── Cart writes — prevent cart flooding ──────────────────────────────────────
// Production: 60/5min | Development: unlimited
export const cartWriteLimiter = rateLimit({
  windowMs: 5 * 60 * 1000,
  max: isProd ? 60 : 10000,
  message: json429('Too many cart requests. Please slow down.'),
  standardHeaders: true,
  legacyHeaders: false,
});

// ── Review submission — prevent review spam ───────────────────────────────────
// Production: 10/hour | Development: unlimited
export const reviewLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: isProd ? 10 : 10000,
  message: json429('Too many reviews submitted. Please try again later.'),
  standardHeaders: true,
  legacyHeaders: false,
});

// ── Coupon validation — prevent brute-force coupon guessing ──────────────────
// Production: 20/15min | Development: unlimited
export const couponLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: isProd ? 20 : 10000,
  message: json429('Too many coupon attempts. Please try again later.'),
  standardHeaders: true,
  legacyHeaders: false,
});

// ── Address creation — prevent address flooding ───────────────────────────────
// Production: 10/hour | Development: unlimited
export const addressLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: isProd ? 10 : 10000,
  message: json429('Too many address requests. Please try again later.'),
  standardHeaders: true,
  legacyHeaders: false,
});
