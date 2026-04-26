import dotenv from 'dotenv';
import { Pool } from 'pg';
import { logger } from './utils/logger';

dotenv.config();

const isProd = process.env.NODE_ENV === 'production';

export const pool = new Pool({
  host: process.env.DB_HOST,
  port: Number(process.env.DB_PORT) || 5432,
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  // SSL: use env var to control cert validation (Hostinger may use self-signed)
  ssl: isProd
    ? { rejectUnauthorized: process.env.DB_SSL_REJECT_UNAUTHORIZED !== 'false' }
    : { rejectUnauthorized: false },
  max: 20,                        // Increased from 10 to 20 for better concurrency
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
  allowExitOnIdle: false,         // Keep pool alive even when idle
});

pool.on('error', (err) => {
  logger.error('db.pool_error', { message: err.message });
});

pool.on('connect', () => {
  logger.info('db.connected');
});
