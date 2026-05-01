import Redis from 'ioredis';

const redis = new Redis({
  host: process.env.REDIS_HOST || 'localhost',
  port: Number(process.env.REDIS_PORT) || 6379,
  password: process.env.REDIS_PASSWORD || undefined,
  // Retry strategy — back off on repeated failures
  retryStrategy: (times) => Math.min(times * 100, 3000),
  // Don't crash the app if Redis is unavailable
  lazyConnect: true,
  enableOfflineQueue: false,
});

redis.on('error', (err) => {
  // Log but don't crash — app works without cache
  console.warn('[Redis] connection error:', err.message);
});

redis.on('connect', () => {
  console.info('[Redis] connected');
});

/**
 * Get a cached value. Returns null on cache miss or Redis error.
 */
export async function cacheGet<T>(key: string): Promise<T | null> {
  try {
    const val = await redis.get(key);
    return val ? (JSON.parse(val) as T) : null;
  } catch {
    return null;
  }
}

/**
 * Set a cached value with a TTL in seconds.
 */
export async function cacheSet(key: string, value: unknown, ttlSeconds: number): Promise<void> {
  try {
    await redis.set(key, JSON.stringify(value), 'EX', ttlSeconds);
  } catch {
    // Silently ignore — cache is best-effort
  }
}

/**
 * Delete one or more cache keys. Supports glob patterns via SCAN+DEL.
 */
export async function cacheDel(...keys: string[]): Promise<void> {
  try {
    if (keys.length > 0) await redis.del(...keys);
  } catch {
    // Silently ignore
  }
}

/**
 * Delete all keys matching a glob pattern (e.g. "product:*").
 */
export async function cacheDelPattern(pattern: string): Promise<void> {
  try {
    let cursor = '0';
    do {
      const [nextCursor, keys] = await redis.scan(cursor, 'MATCH', pattern, 'COUNT', 100);
      cursor = nextCursor;
      if (keys.length > 0) await redis.del(...keys);
    } while (cursor !== '0');
  } catch {
    // Silently ignore
  }
}

export default redis;
