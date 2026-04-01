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
  // In production: enforce SSL and reject self-signed certs
  // In development: allow self-signed (Render uses valid certs in prod)
  ssl: isProd
    ? { rejectUnauthorized: true }
    : { rejectUnauthorized: false },
  max: 10,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
});

pool.on('error', (err) => {
  logger.error('db.pool_error', { message: err.message });
});

pool.on('connect', () => {
  logger.info('db.connected');
});
