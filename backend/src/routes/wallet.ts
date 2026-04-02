import { Response, Router } from 'express';
import { pool } from '../db';
import { authenticate, AuthRequest } from '../middleware/auth';
import { generateId } from '../utils/id';

const router = Router();

// ── Helper: get or create wallet for a user ───────────────────────────────────
async function getOrCreateWallet(userId: string) {
  const existing = await pool.query('SELECT * FROM wallets WHERE user_id = $1', [userId]);
  if (existing.rows.length > 0) return existing.rows[0];

  const walletId = generateId();
  const created = await pool.query(
    `INSERT INTO wallets (id, user_id, balance) VALUES ($1,$2,0.00) RETURNING *`,
    [walletId, userId]
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
        balance: Number(wallet.balance),
        transactions: txns.rows.map(t => ({
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

// ── POST /api/v1/wallet/credit — credit wallet (internal use: refunds) ────────
// This is called internally by the cancel/return flow, not directly by the user
router.post('/credit', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  const { amount, description, referenceId } = req.body;

  if (!amount || Number(amount) <= 0) {
    res.status(400).json({ success: false, message: 'Valid amount is required' });
    return;
  }

  try {
    const wallet = await getOrCreateWallet(req.userId!);

    await pool.query(
      `UPDATE wallets SET balance = balance + $1, updated_at = NOW() WHERE id = $2`,
      [amount, wallet.id]
    );

    await pool.query(
      `INSERT INTO wallet_transactions (wallet_id, user_id, type, amount, description, reference_id)
       VALUES ($1,$2,'credit',$3,$4,$5)`,
      [wallet.id, req.userId, amount, description || 'Wallet credit', referenceId || null]
    );

    const updated = await pool.query('SELECT balance FROM wallets WHERE id = $1', [wallet.id]);

    res.json({
      success: true,
      message: `₹${Number(amount).toFixed(2)} credited to ZPIN Wallet`,
      data: { newBalance: Number(updated.rows[0].balance) },
    });
  } catch (err) {
    console.error('creditWallet error:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// ── POST /api/v1/wallet/debit — debit wallet (for wallet payments) ────────────
router.post('/debit', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  const { amount, description, referenceId } = req.body;

  if (!amount || Number(amount) <= 0) {
    res.status(400).json({ success: false, message: 'Valid amount is required' });
    return;
  }

  try {
    const wallet = await getOrCreateWallet(req.userId!);

    if (Number(wallet.balance) < Number(amount)) {
      res.status(400).json({ success: false, message: 'Insufficient wallet balance' });
      return;
    }

    await pool.query(
      `UPDATE wallets SET balance = balance - $1, updated_at = NOW() WHERE id = $2`,
      [amount, wallet.id]
    );

    await pool.query(
      `INSERT INTO wallet_transactions (wallet_id, user_id, type, amount, description, reference_id)
       VALUES ($1,$2,'debit',$3,$4,$5)`,
      [wallet.id, req.userId, amount, description || 'Wallet payment', referenceId || null]
    );

    const updated = await pool.query('SELECT balance FROM wallets WHERE id = $1', [wallet.id]);

    res.json({
      success: true,
      message: `₹${Number(amount).toFixed(2)} debited from ZPIN Wallet`,
      data: { newBalance: Number(updated.rows[0].balance) },
    });
  } catch (err) {
    console.error('debitWallet error:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

export { getOrCreateWallet };
export default router;
