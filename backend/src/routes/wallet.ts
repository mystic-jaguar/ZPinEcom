import { Response, Router } from 'express';
import { pool } from '../db';
import { authenticate, AuthRequest } from '../middleware/auth';
import { decryptMoney, encryptMoney } from '../utils/encryption';
import { generateId } from '../utils/id';

const router = Router();

// ── Helper: get or create wallet for a user ───────────────────────────────────
type Queryable = { query: (text: string, params?: any[]) => Promise<any> };

async function getOrCreateWallet(userId: string, db: Queryable = pool) {
  const existing = await db.query('SELECT * FROM wallets WHERE user_id = $1', [userId]);
  if (existing.rows.length > 0) return existing.rows[0];

  const walletId = generateId();
  const created = await db.query(
    `INSERT INTO wallets (id, user_id, balance) VALUES ($1,$2,$3) RETURNING *`,
    [walletId, userId, encryptMoney(0)]
  );
  return created.rows[0];
}

// ── GET /api/v1/wallet — get balance + recent transactions ────────────────────
router.get('/', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const wallet = await getOrCreateWallet(req.userId!);

    const txns = await pool.query(
      `SELECT id, type, amount, description, reference_id, created_at
       FROM wallet_transactions
       WHERE wallet_id = $1
       ORDER BY created_at DESC
       LIMIT 20`,
      [wallet.id]
    );

    res.json({
      success: true,
      data: {
        walletId: wallet.id,
        balance: decryptMoney(wallet.balance),
        transactions: txns.rows.map((t: any) => ({
          id: t.id,
          type: t.type,
          amount: Number(t.amount),
          description: t.description,
          referenceId: t.reference_id,
          createdAt: t.created_at,
        })),
      },
    });
  } catch (err) {
    console.error('getWallet error:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// NOTE: There are deliberately no client-facing /credit or /debit endpoints.
// Wallet balance only changes inside atomic server-side transactions:
//   - credits: order cancel/return flow (orders.ts)
//   - debits:  order creation with wallet payment (orders.ts)
// Exposing standalone credit/debit routes let any authenticated non-customer
// JWT mint money into their own wallet — removed 2026-07-24.

export { getOrCreateWallet };
export default router;
