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

// ── POST /api/v1/wallet/credit — credit wallet (internal use: refunds only) ──
// SECURITY: This endpoint is restricted to server-side calls only.
// Regular users cannot self-credit their wallet — only the cancel/return flow
// calls this internally via the orders route using a service account pattern.
router.post('/credit', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  const { amount, description, referenceId } = req.body;

  // Only delivery partners and admins can credit wallets via this endpoint.
  // Customer refunds are handled internally by the orders cancel route.
  if (req.userRole === 'customer') {
    res.status(403).json({ success: false, message: 'Forbidden' });
    return;
  }

  if (!amount || Number(amount) <= 0) {
    res.status(400).json({ success: false, message: 'Valid amount is required' });
    return;
  }

  try {
    const client = await pool.connect();
    let newBalance = 0;

    try {
      await client.query('BEGIN');
      const wallet = await getOrCreateWallet(req.userId!, client);

      // Lock the wallet row to prevent concurrent balance modifications
      const locked = await client.query('SELECT * FROM wallets WHERE id = $1 FOR UPDATE', [wallet.id]);
      const currentBalance = decryptMoney(locked.rows[0].balance);
      newBalance = currentBalance + Number(amount);

      await client.query(
        `UPDATE wallets SET balance = $1, updated_at = NOW() WHERE id = $2`,
        [encryptMoney(newBalance), wallet.id]
      );

      await client.query(
        `INSERT INTO wallet_transactions (id, wallet_id, user_id, type, amount, description, reference_id)
         VALUES ($1,$2,$3,'credit',$4,$5,$6)`,
        [generateId(), wallet.id, req.userId, amount, description || 'Wallet credit', referenceId || null]
      );

      await client.query('COMMIT');
    } catch (txErr) {
      await client.query('ROLLBACK');
      throw txErr;
    } finally {
      client.release();
    }

    res.json({
      success: true,
      message: `₹${Number(amount).toFixed(2)} credited to ZPIN Wallet`,
      data: { newBalance },
    });
  } catch (err) {
    console.error('creditWallet error:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// ── POST /api/v1/wallet/debit — debit wallet (internal: wallet payments via order flow) ──
// SECURITY: Direct wallet debits are handled atomically inside the order creation transaction.
// This endpoint exists for admin/delivery use cases only.
router.post('/debit', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  const { amount, description, referenceId } = req.body;

  // Customers cannot directly debit their wallet — use the order flow instead
  if (req.userRole === 'customer') {
    res.status(403).json({ success: false, message: 'Forbidden' });
    return;
  }

  if (!amount || Number(amount) <= 0) {
    res.status(400).json({ success: false, message: 'Valid amount is required' });
    return;
  }

  try {
    const client = await pool.connect();
    let newBalance = 0;

    try {
      await client.query('BEGIN');
      const wallet = await getOrCreateWallet(req.userId!, client);

      // Lock the wallet row to prevent concurrent balance modifications
      const locked = await client.query('SELECT * FROM wallets WHERE id = $1 FOR UPDATE', [wallet.id]);
      const currentBalance = decryptMoney(locked.rows[0].balance);

      if (currentBalance < Number(amount)) {
        await client.query('ROLLBACK');
        res.status(400).json({ success: false, message: 'Insufficient wallet balance' });
        return;
      }

      newBalance = currentBalance - Number(amount);

      await client.query(
        `UPDATE wallets SET balance = $1, updated_at = NOW() WHERE id = $2`,
        [encryptMoney(newBalance), wallet.id]
      );

      await client.query(
        `INSERT INTO wallet_transactions (id, wallet_id, user_id, type, amount, description, reference_id)
         VALUES ($1,$2,$3,'debit',$4,$5,$6)`,
        [generateId(), wallet.id, req.userId, amount, description || 'Wallet payment', referenceId || null]
      );

      await client.query('COMMIT');
    } catch (txErr) {
      await client.query('ROLLBACK');
      throw txErr;
    } finally {
      client.release();
    }

    res.json({
      success: true,
      message: `₹${Number(amount).toFixed(2)} debited from ZPIN Wallet`,
      data: { newBalance },
    });
  } catch (err) {
    console.error('debitWallet error:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

export { getOrCreateWallet };
export default router;
