import { Response, Router } from 'express';
import { pool } from '../db';
import { authenticate, AuthRequest } from '../middleware/auth';
import { logger } from '../utils/logger';

/**
 * Customer support chat — the app half of the same feature the customer
 * website shipped in `1d0b70b`. This is a near-verbatim port of
 * `website-customer/backend/controllers/supportChatController.js`: same two
 * tables, same routes, same request/response shapes, so the app and the
 * website are one conversation and not two.
 *
 * The FAQ bot itself still runs on the client (components/common/SupportChatBot.tsx)
 * — this only persists whatever it produced, so closing the app doesn't lose
 * the conversation and an admin can see it too. Once the customer asks for a
 * human (`status` leaves 'bot'), the client stops running its own matcher and
 * this becomes a plain message relay with the admin panel.
 *
 * One thread per customer (`customer_support_threads.customer_id` is UNIQUE) —
 * a customer has exactly one running conversation with support, not one per
 * topic. Mirrors the seller pair (seller_support_threads/_messages) used by the
 * vendor app and vendor website. Tables are already live on prod; see
 * SCHEMA_CHANGES.md (2026-09-07). No DDL here.
 */

const router = Router();

const HISTORY_HOURS = 24;

interface ThreadRow {
  id: string;
  status: string;
  unread_by_customer: boolean;
}

// Read-then-insert races on the UNIQUE(customer_id) index: the widget fires a
// load and a poll within the same tick on a thread that doesn't exist yet, and
// the loser of that race 500s. ON CONFLICT makes the create idempotent — the
// no-op UPDATE is there only so RETURNING yields the existing row.
const getOrCreateThread = async (customerId: string): Promise<ThreadRow> => {
  const existing = await pool.query(
    'SELECT id, status, unread_by_customer FROM customer_support_threads WHERE customer_id = $1',
    [customerId]
  );
  if (existing.rows.length) return existing.rows[0];

  const created = await pool.query(
    `INSERT INTO customer_support_threads (customer_id) VALUES ($1)
     ON CONFLICT (customer_id) DO UPDATE SET updated_at = customer_support_threads.updated_at
     RETURNING id, status, unread_by_customer`,
    [customerId]
  );
  return created.rows[0];
};

/**
 * `meta` is the bot's own presentation payload (which FAQ entry answered, the
 * deep link, the related questions) echoed back so a rehydrated conversation
 * renders the same as it did live. It is caller-supplied, so it is an
 * allow-list, not a passthrough: an arbitrary object here ends up spread into
 * a rendered message, and an unbounded one ends up in the database.
 */
const SUGGESTION_LIMIT = 6;

const sanitizeMeta = (raw: any): Record<string, any> | null => {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null;

  const str = (v: any, max: number) =>
    typeof v === 'string' && v.trim() ? v.trim().slice(0, max) : undefined;

  const out: Record<string, any> = {};
  const source = str(raw.source, 120);
  if (source) out.source = source;
  const routeLabel = str(raw.routeLabel, 60);
  if (routeLabel) out.routeLabel = routeLabel;

  // In-app path only. A caller-supplied `route` is navigated to / rendered as a
  // link, so anything that isn't a relative path (`javascript:`, an external
  // URL) is dropped rather than sanitised.
  const route = str(raw.route, 200);
  if (route && route.startsWith('/') && !route.startsWith('//')) out.route = route;

  if (Array.isArray(raw.suggestions)) {
    const suggestions = raw.suggestions
      .map((s: any) => str(s, 120))
      .filter(Boolean)
      .slice(0, SUGGESTION_LIMIT);
    if (suggestions.length) out.suggestions = suggestions;
  }

  if (typeof raw.more === 'number' && Number.isFinite(raw.more)) {
    out.more = Math.max(0, Math.min(99, Math.floor(raw.more)));
  }
  if (raw.escalate === true) out.escalate = true;
  if (raw.offerHuman === true) out.offerHuman = true;

  return Object.keys(out).length ? out : null;
};

/**
 * GET /api/v1/support-chat
 * Returns the thread status and, by default, the last 24h of messages — the
 * customer-facing widget only ever rehydrates a day back; admin sees the full
 * history via the separate admin endpoint. `?since=<ISO timestamp>` narrows it
 * further, for the poll that picks up new admin replies.
 */
router.get('/', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const customerId = req.userId!;
    const thread = await getOrCreateThread(customerId);

    const since = req.query.since as string | undefined;
    const parsed = since ? new Date(since) : null;
    // A junk `since` must not reach the query as an Invalid Date — fall back to
    // the default window rather than erroring or returning nothing.
    const cutoff = parsed && !Number.isNaN(parsed.getTime())
      ? parsed
      : new Date(Date.now() - HISTORY_HOURS * 60 * 60 * 1000);

    const messages = await pool.query(
      `SELECT id, sender_type, sender_name, message, meta, created_at
         FROM customer_support_messages
        WHERE thread_id = $1 AND created_at > $2
        ORDER BY created_at ASC`,
      [thread.id, cutoff]
    );

    // Opening/polling the widget is the customer "reading" it.
    if (thread.unread_by_customer) {
      await pool.query(
        'UPDATE customer_support_threads SET unread_by_customer = false WHERE id = $1',
        [thread.id]
      );
    }

    res.json({
      success: true,
      thread: { id: thread.id, status: thread.status },
      messages: messages.rows,
    });
  } catch (err: any) {
    logger.error('supportChat.thread_failed', { message: err?.message });
    res.status(500).json({ success: false, error: 'Failed to load chat' });
  }
});

/**
 * POST /api/v1/support-chat/messages
 * Body: { message, senderType: 'customer' | 'bot', meta? }
 * senderType is caller-supplied but constrained to the two values the customer
 * surface is allowed to write — 'admin' only ever comes from the admin panel.
 */
router.post('/messages', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const customerId = req.userId!;

    const message = String(req.body?.message || '').trim();
    const senderType = req.body?.senderType === 'bot' ? 'bot' : 'customer';
    const meta = sanitizeMeta(req.body?.meta);

    if (!message) {
      res.status(400).json({ success: false, error: 'Message is required' });
      return;
    }
    if (message.length > 2000) {
      res.status(400).json({ success: false, error: 'Message is too long' });
      return;
    }

    const thread = await getOrCreateThread(customerId);

    const inserted = await pool.query(
      `INSERT INTO customer_support_messages (thread_id, sender_type, message, meta)
       VALUES ($1, $2, $3, $4)
       RETURNING id, sender_type, sender_name, message, meta, created_at`,
      [thread.id, senderType, message, meta ? JSON.stringify(meta) : null]
    );

    // A customer message is the thing an admin needs to see; a bot message is
    // just the widget's own reply echoed back for history, so it doesn't need
    // to raise the admin's unread flag.
    await pool.query(
      `UPDATE customer_support_threads
          SET last_message_at = NOW(), updated_at = NOW()
              ${senderType === 'customer' ? ', unread_by_admin = true' : ''}
        WHERE id = $1`,
      [thread.id]
    );

    res.status(201).json({ success: true, message: inserted.rows[0] });
  } catch (err: any) {
    logger.error('supportChat.post_message_failed', { message: err?.message });
    res.status(500).json({ success: false, error: 'Failed to send message' });
  }
});

/**
 * POST /api/v1/support-chat/handoff
 * The customer tapped "Talk to a person". Flags the thread for the admin inbox
 * and writes a system note so the admin has context on how the conversation
 * got there.
 */
router.post('/handoff', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const customerId = req.userId!;
    const thread = await getOrCreateThread(customerId);

    // Already waiting on / talking to a human — a repeat tap is a no-op, not a
    // second ticket.
    if (thread.status === 'bot' || thread.status === 'resolved') {
      await pool.query(
        `UPDATE customer_support_threads
            SET status = 'pending_human', last_message_at = NOW(),
                unread_by_admin = true, updated_at = NOW()
          WHERE id = $1`,
        [thread.id]
      );
      await pool.query(
        `INSERT INTO customer_support_messages (thread_id, sender_type, message)
         VALUES ($1, 'system', 'Customer asked to talk to a person.')`,
        [thread.id]
      );
    }

    res.json({ success: true, status: 'pending_human' });
  } catch (err: any) {
    logger.error('supportChat.handoff_failed', { message: err?.message });
    res.status(500).json({ success: false, error: 'Failed to reach support' });
  }
});

/**
 * POST /api/v1/support-chat/resolve
 * The customer's own "End chat" button — same end state admin's "Mark
 * resolved" produces, so either side closing it out behaves identically: the
 * widget falls back to the FAQ bot on the customer's next message.
 */
router.post('/resolve', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const customerId = req.userId!;
    const thread = await getOrCreateThread(customerId);

    // resolved_at and this system message share one timestamp on purpose — it's
    // the cutoff the admin panel uses to stop showing whatever the customer and
    // the bot go on to discuss after this point, and using NOW() twice risks
    // the message landing a few ms after its own cutoff and being hidden too.
    const resolved = await pool.query(
      `UPDATE customer_support_threads SET status = 'resolved', resolved_at = NOW(), updated_at = NOW()
        WHERE id = $1 RETURNING resolved_at`,
      [thread.id]
    );
    await pool.query(
      `INSERT INTO customer_support_messages (thread_id, sender_type, message, created_at)
       VALUES ($1, 'system', 'Customer ended the chat.', $2)`,
      [thread.id, resolved.rows[0].resolved_at]
    );

    res.json({ success: true, status: 'resolved' });
  } catch (err: any) {
    logger.error('supportChat.resolve_failed', { message: err?.message });
    res.status(500).json({ success: false, error: 'Failed to end chat' });
  }
});

export default router;
