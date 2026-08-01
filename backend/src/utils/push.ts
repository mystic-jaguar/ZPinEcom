import { pool } from '../db';
import { logger } from './logger';

/**
 * Device push notifications via Expo's push service.
 *
 * ZPIN has always written a `notifications` row per event — that's the in-app
 * inbox and it stays exactly as it is. This module is purely additive: the same
 * event also reaches the device when the app is closed.
 *
 * No new dependency: Expo's push API is one HTTPS POST, and Node 18+ has fetch.
 *
 * IMPORTANT — this file is duplicated near-verbatim in all three ZPIN backends
 * (ecom TS, vendor ESM, delivery CJS). Keep them in step; the wire format and
 * the `push_tokens` table are shared. Note that pushes from THIS backend reach
 * sellers on the vendor app as well as customers — one table, all surfaces.
 *
 * Degrades gracefully: `push_tokens` is in SCHEMA_CHANGES.md and NOT yet applied,
 * so every function here no-ops when the table is missing rather than throwing
 * into a request that was really about an order.
 */

const EXPO_PUSH_URL = 'https://exp.host/--/api/v2/push/send';

export const PUSH_APP = 'customer';

let tableExists: boolean | null = null;

async function tableReady(): Promise<boolean> {
  if (tableExists !== null) return tableExists;
  try {
    const { rows } = await pool.query(
      `SELECT 1 FROM information_schema.tables
        WHERE table_schema = 'public' AND table_name = 'push_tokens'`
    );
    tableExists = rows.length > 0;
  } catch {
    tableExists = false;
  }
  return tableExists;
}

/** Expo tokens look like ExponentPushToken[xxxx] (or ExpoPushToken[...]). */
export const isExpoPushToken = (t: unknown): t is string =>
  typeof t === 'string' && /^Expo(nent)?PushToken\[[^\]]+\]$/.test(t) && t.length <= 200;

/**
 * Register (or re-point) a device token. Token is the primary key: when a device
 * is handed to another account the row moves rather than duplicating, so a push
 * never reaches the previous owner.
 */
export async function registerPushToken(
  userId: string,
  token: unknown,
  platform?: string
): Promise<boolean> {
  if (!isExpoPushToken(token) || !(await tableReady())) return false;
  await pool.query(
    `INSERT INTO push_tokens (token, user_id, app, platform, updated_at)
     VALUES ($1, $2, $3, $4, NOW())
     ON CONFLICT (token) DO UPDATE
       SET user_id = EXCLUDED.user_id, app = EXCLUDED.app,
           platform = EXCLUDED.platform, updated_at = NOW()`,
    [token, userId, PUSH_APP, platform || null]
  );
  return true;
}

/** Logout: drop this device's token so the next user of the phone gets nothing. */
export async function removePushToken(token: unknown): Promise<boolean> {
  if (!isExpoPushToken(token) || !(await tableReady())) return false;
  await pool.query('DELETE FROM push_tokens WHERE token = $1', [token]);
  return true;
}

/**
 * Fire-and-forget push to every device a user has registered.
 *
 * Best-effort by contract: a failed push must never roll back or fail the order
 * operation that triggered it, exactly like the notification insert it sits next
 * to. Callers do not await this.
 */
export async function sendPush(
  userId: string | null | undefined,
  title: string,
  body: string,
  data: Record<string, unknown> = {}
): Promise<void> {
  try {
    if (!userId || !(await tableReady())) return;

    const { rows } = await pool.query(
      'SELECT token FROM push_tokens WHERE user_id = $1 LIMIT 20',
      [String(userId)]
    );
    if (rows.length === 0) return;

    const messages = rows.map((r: any) => ({
      to: r.token,
      title,
      body,
      data,
      sound: 'default',
      priority: 'high',
      channelId: 'default',
    }));

    const res = await fetch(EXPO_PUSH_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify(messages),
      // Never let a slow push service hold an order request's event loop work.
      signal: AbortSignal.timeout(8000),
    });
    const json: any = await res.json().catch(() => null);

    // Expo returns one ticket per message, in order. A DeviceNotRegistered ticket
    // means the app was uninstalled — delete the token or we retry it forever.
    const tickets: any[] = Array.isArray(json?.data) ? json.data : [];
    const dead = tickets
      .map((t, i) => (t?.details?.error === 'DeviceNotRegistered' ? rows[i].token : null))
      .filter(Boolean);
    if (dead.length) {
      await pool.query('DELETE FROM push_tokens WHERE token = ANY($1)', [dead]);
    }
  } catch (err: any) {
    logger.warn('push.send_failed', { error: err?.message });
  }
}
