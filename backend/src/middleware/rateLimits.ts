import rateLimit from 'express-rate-limit';

const json429 = (msg: string) => ({
  success: false,
  message: msg,
});

const isProd = process.env.NODE_ENV === 'production';

const SELF_LIMITED_AUTH =
  /^\/api\/v1\/auth\/(login|signup|refresh-token|google|apple|forgetPassword\/.+|verification\/.+)$/;

// ── Global API limiter — applied to every route ───────────────────────────────
// Production: 1000 req/15min — blocks scrapers and bots
// Development: 2000 req/15min — allows normal dev/testing without hitting limits
//
// 300 was too tight for a real browsing session: this limiter keys on IP, and on
// mobile carrier NAT one key covers many customers, so an ordinary shop-and-check-
// out run tripped it. 1000/15min (~1.1 rps sustained) still stops scraping.
export const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: isProd ? 1000 : 2000,
  message: json429('Too many requests. Please slow down.'),
  standardHeaders: true,
  legacyHeaders: false,
  // Auth routes that carry their own limiter with an action-specific message
  // ("Too many OTP requests…", "Too many signup attempts…") are skipped: letting
  // the global limiter fire first replaced those with a useless generic 429 —
  // and on mobile carrier NAT, where many users share one IP, it tripped far
  // earlier than intended. Only THOSE routes — logout and the push-token
  // endpoints have no limiter of their own and stay under the global one.
  skip: (req) => req.path === '/health' || SELF_LIMITED_AUTH.test(req.path),
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

// ── Review photo uploads ─────────────────────────────────────────────────────
// Separate from reviewLimiter on purpose: a review can carry 4 photos, and
// uploading them must not eat the budget the review submission itself needs.
export const reviewUploadLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: isProd ? 40 : 10000,
  message: json429('Too many image uploads. Please try again later.'),
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
