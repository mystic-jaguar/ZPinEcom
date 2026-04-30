import { Response, Router } from 'express';
import { pool } from '../db';
import { authenticate, AuthRequest } from '../middleware/auth';
import { generateId } from '../utils/id';
import { safeIdentifier } from '../utils/sql';

const router = Router();
const PM = safeIdentifier('payment_methods');

function normalizeMethod(row: any) {
    if (row.type === 'upi') {
        return {
            id: row.id,
            type: 'upi' as const,
            upiId: row.upi_id,
            upiApp: row.upi_app,
            label: row.upi_app,
            subLabel: row.upi_id,
        };
    }
    return {
        id: row.id,
        type: 'card' as const,
        cardNumber: row.card_number,
        cardHolderName: row.card_holder,
        expiryDate: row.expiry_date,
        cardType: row.card_type,
        bankName: 'HDFC Bank',
        iconName: 'card',
        iconColor: '#4CAF50',
    };
}

// GET /api/v1/payment-methods
router.get('/', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const result = await pool.query(
            `SELECT * FROM ${PM} WHERE user_id = $1 ORDER BY created_at ASC`,
            [req.userId]
        );
        res.json({ success: true, data: result.rows.map(normalizeMethod) });
    } catch (err) {
        console.error('getPaymentMethods error:', err);
        res.status(500).json({ success: false, message: 'Server error' });
    }
});

// POST /api/v1/payment-methods
router.post('/', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
    const { type, upiId, upiApp, cardNumber, cardHolderName, expiryDate, cardType } = req.body;

    if (!type || !['card', 'upi'].includes(type)) {
        res.status(400).json({ success: false, message: 'Invalid type. Must be card or upi.' });
        return;
    }

    if (type === 'upi' && !upiId) {
        res.status(400).json({ success: false, message: 'upiId is required for UPI methods.' });
        return;
    }

    if (type === 'card' && (!cardNumber || !cardHolderName || !expiryDate)) {
        res.status(400).json({ success: false, message: 'cardNumber, cardHolderName, and expiryDate are required for card methods.' });
        return;
    }

    try {
        const id = generateId();
        const result = await pool.query(
            `INSERT INTO ${PM} (id, user_id, type, upi_id, upi_app, card_number, card_holder, expiry_date, card_type, created_at, updated_at)
             VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,NOW(),NOW()) RETURNING *`,
            [
                id,
                req.userId,
                type,
                upiId || null,
                upiApp || null,
                cardNumber || null,
                cardHolderName || null,
                expiryDate || null,
                cardType || null,
            ]
        );
        res.status(201).json({ success: true, data: normalizeMethod(result.rows[0]) });
    } catch (err) {
        console.error('addPaymentMethod error:', err);
        res.status(500).json({ success: false, message: 'Server error' });
    }
});

// PUT /api/v1/payment-methods/:id
router.put('/:id', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
    const { upiId, upiApp, cardNumber, cardHolderName, expiryDate, cardType } = req.body;

    try {
        // Verify ownership
        const existing = await pool.query(
            `SELECT * FROM ${PM} WHERE id = $1 AND user_id = $2`,
            [req.params.id, req.userId]
        );
        if (existing.rows.length === 0) {
            res.status(404).json({ success: false, message: 'Payment method not found.' });
            return;
        }

        const row = existing.rows[0];
        const result = await pool.query(
            `UPDATE ${PM} SET
                upi_id = $1, upi_app = $2,
                card_number = $3, card_holder = $4, expiry_date = $5, card_type = $6,
                updated_at = NOW()
             WHERE id = $7 AND user_id = $8 RETURNING *`,
            [
                upiId ?? row.upi_id,
                upiApp ?? row.upi_app,
                cardNumber ?? row.card_number,
                cardHolderName ?? row.card_holder,
                expiryDate ?? row.expiry_date,
                cardType ?? row.card_type,
                req.params.id,
                req.userId,
            ]
        );
        res.json({ success: true, data: normalizeMethod(result.rows[0]) });
    } catch (err) {
        console.error('updatePaymentMethod error:', err);
        res.status(500).json({ success: false, message: 'Server error' });
    }
});

// DELETE /api/v1/payment-methods/:id
router.delete('/:id', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const result = await pool.query(
            `DELETE FROM ${PM} WHERE id = $1 AND user_id = $2 RETURNING id`,
            [req.params.id, req.userId]
        );
        if (result.rows.length === 0) {
            res.status(404).json({ success: false, message: 'Payment method not found.' });
            return;
        }
        res.json({ success: true, message: 'Payment method deleted.' });
    } catch (err) {
        console.error('deletePaymentMethod error:', err);
        res.status(500).json({ success: false, message: 'Server error' });
    }
});

export default router;
