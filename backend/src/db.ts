import dotenv from 'dotenv';
import { Pool } from 'pg';
import { logger } from './utils/logger';

dotenv.config();

export const pool = new Pool({
  host: process.env.DB_HOST,
  port: Number(process.env.DB_PORT) || 5432,
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  // SSL: always disable cert validation — Hostinger uses self-signed certs
  // Set DB_SSL=false in .env to disable SSL entirely if the server doesn't support it
  ssl: process.env.DB_SSL === 'false'
    ? false
    : { rejectUnauthorized: false },
  max: 20,
  // A runaway query must not hold a pool slot forever — Postgres cancels it at 30s
  // and pg surfaces it as a normal query error (code 57014), not a crash.
  statement_timeout: 30000,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
  allowExitOnIdle: false,
});

pool.on('error', (err) => {
  logger.error('db.pool_error', { message: err.message });
});

pool.on('connect', () => {
  logger.info('db.connected');
});
