import cors from 'cors';
import dotenv from 'dotenv';
import express from 'express';
import helmet from 'helmet';

import { pool } from './db';
import { httpsRedirect } from './middleware/httpsRedirect';
import { inputSanitizer } from './middleware/inputSanitizer';
import { globalLimiter } from './middleware/rateLimits';
import { requestLogger } from './middleware/requestLogger';
import authRoutes from './routes/auth';
import cartRoutes from './routes/cart';
import couponRoutes from './routes/coupons';
import notificationRoutes from './routes/notifications';
import orderRoutes from './routes/orders';
import productRoutes from './routes/products';
import razorpayRoutes from './routes/razorpay';
import userRoutes from './routes/users';
import walletRoutes from './routes/wallet';
import wishlistRoutes from './routes/wishlist';
import { prepareSensitiveDataEncryption } from './utils/encryption';
import { logger } from './utils/logger';
import redis from './utils/redis';

dotenv.config();

// Validate required env vars at startup — fail fast rather than silently
const REQUIRED_ENV = [
  'DB_HOST',
  'DB_NAME',
  'DB_USER',
  'DB_PASSWORD',
  'JWT_SECRET',
  'JWT_REFRESH_SECRET',
  'DATA_ENCRYPTION_KEY',
  'RAZORPAY_KEY_ID',
  'RAZORPAY_KEY_SECRET',
];
const missing = REQUIRED_ENV.filter(k => !process.env[k]);
if (missing.length > 0) {
  logger.error('startup.missing_env', { missing });
  process.exit(1);
}

const app = express();
const PORT = Number(process.env.PORT) || 5002;

// ─── HTTPS Redirect (production only) ────────────────────────────────────────
app.use(httpsRedirect);

// ─── Security Headers ────────────────────────────────────────────────────────
app.use(helmet({
  hsts: {
    maxAge: 31536000,        // 1 year
    includeSubDomains: true,
    preload: true,
  },
  contentSecurityPolicy: false, // API-only server, no HTML served
}));

// ─── Proxy Trust (Render reverse proxy) ─────────────────────────────────────
app.set('trust proxy', 1);

// ─── Request Logging ─────────────────────────────────────────────────────────
app.use(requestLogger);

// ─── Global Rate Limiter ─────────────────────────────────────────────────────
app.use(globalLimiter);

// ─── CORS ────────────────────────────────────────────────────────────────────
const allowedOrigins = process.env.ALLOWED_ORIGINS
  ? process.env.ALLOWED_ORIGINS.split(',')
  : ['*'];

app.use(cors({
  origin: allowedOrigins.includes('*') ? '*' : (origin: string | undefined, cb: (err: Error | null, allow?: boolean) => void) => {
    if (!origin || allowedOrigins.includes(origin)) return cb(null, true);
    logger.warn('cors.blocked', { origin });
    cb(new Error('Not allowed by CORS'));
  },
  credentials: true,
}));

// ─── Body Parsing ─────────────────────────────────────────────────────────────
app.use(express.json({ limit: '50kb' }));
app.use(express.urlencoded({ extended: true, limit: '50kb' }));

// ─── Input Sanitization ──────────────────────────────────────────────────────
app.use(inputSanitizer);

// ─── Routes ─────────────────────────────────────────────────────────────────
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/users', userRoutes);
app.use('/api/v1/products', productRoutes);
app.use('/api/v1/cart', cartRoutes);
app.use('/api/v1/wishlist', wishlistRoutes);
app.use('/api/v1/orders', orderRoutes);
app.use('/api/v1/coupons', couponRoutes);
app.use('/api/v1/notifications', notificationRoutes);
app.use('/api/v1/wallet', walletRoutes);
app.use('/api/v1/razorpay', razorpayRoutes);

// Health check — excluded from rate limiting
app.get('/health', (_, res) => res.json({ status: 'ok', timestamp: new Date().toISOString() }));

// 404
app.use((req, res) => {
  logger.warn('request.not_found', { path: req.path, ip: req.ip });
  res.status(404).json({ success: false, message: 'Route not found' });
});

// Global error handler
app.use((err: any, req: express.Request, res: express.Response, _next: express.NextFunction) => {
  logger.error('unhandled_error', { message: err.message, path: req.path, ip: req.ip });
  res.status(500).json({ success: false, message: 'Internal server error' });
});

// ─── Start ───────────────────────────────────────────────────────────────────
async function startServer() {
  // Run data migration non-fatally — server must start even if migration fails
  try {
    await prepareSensitiveDataEncryption(pool);
  } catch (err: any) {
    logger.warn('startup.encryption_migration_failed', { message: err.message });
  }

  // Connect Redis (non-fatal — app works without cache)
  try {
    await redis.connect();
  } catch (err: any) {
    logger.warn('redis.connect_failed', { message: err.message });
  }

  app.listen(PORT, '0.0.0.0', () => {
    logger.info('server.started', { port: PORT, env: process.env.NODE_ENV || 'development' });
  });
}

startServer().catch((err) => {
  logger.error('startup.failed', { message: err.message, stack: err.stack });
  process.exit(1);
});

// Handle uncaught errors — log before crashing
process.on('uncaughtException', (err) => {
  logger.error('uncaught_exception', { message: err.message, stack: err.stack });
  process.exit(1);
});

process.on('unhandledRejection', (reason) => {
  logger.error('unhandled_rejection', { reason: String(reason) });
});

export default app;
