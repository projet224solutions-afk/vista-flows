/**
 * 💳 PAYMENTS ROUTES - Phase 2 (aligné DB existante)
 * 
 * Tables utilisées :
 *   - `wallet_transactions` (table existante) : bigint id, transaction_type enum, status enum
 *   - `wallets` (table existante) : bigint id, user_id, balance
 * 
 * Ce module fournit des endpoints de consultation.
 * La logique de paiement réelle (Stripe, wallet-to-wallet) reste dans les Edge Functions existantes.
 * Ce backend ne crée PAS de paiement directement — il sert de point de consultation et validation.
 */

import { Router, Response } from 'express';
import { verifyJWT } from '../middlewares/auth.middleware.js';
import type { AuthenticatedRequest } from '../middlewares/auth.middleware.js';
import { supabaseAdmin } from '../config/supabase.js';
import { logger } from '../config/logger.js';

const router = Router();

/**
 * GET /api/payments/
 * Historique des paiements de l'utilisateur (via wallet_transactions)
 */
router.get('/', verifyJWT, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const limit = Math.min(parseInt(req.query.limit as string) || 20, 100);
    const offset = parseInt(req.query.offset as string) || 0;
    const status = req.query.status as string;

    let query = supabaseAdmin
      .from('wallet_transactions')
      .select('*', { count: 'exact' })
      .or(`sender_user_id.eq.${userId},receiver_user_id.eq.${userId}`)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (status) {
      query = query.eq('status', status);
    }

    const { data, error, count } = await query;

    if (error) throw error;

    res.json({
      success: true,
      data: data || [],
      meta: { limit, offset, total: count || 0, hasMore: (offset + limit) < (count || 0) }
    });
  } catch (error: any) {
    logger.error(`Error fetching payment history: ${error.message}`);
    res.status(500).json({ success: false, error: 'Erreur' });
  }
});

/**
 * GET /api/payments/:transactionId
 * Détails d'une transaction spécifique
 */
router.get('/:transactionId', verifyJWT, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const { transactionId } = req.params;

    // Chercher par transaction_id (VARCHAR) ou par id (BIGINT)
    const { data, error } = await supabaseAdmin
      .from('wallet_transactions')
      .select('*')
      .or(`transaction_id.eq.${transactionId},id.eq.${transactionId}`)
      .or(`sender_user_id.eq.${userId},receiver_user_id.eq.${userId}`)
      .maybeSingle();

    if (error) throw error;

    if (!data) {
      res.status(404).json({ success: false, error: 'Transaction non trouvée' });
      return;
    }

    res.json({ success: true, data });
  } catch (error: any) {
    logger.error(`Error fetching payment: ${error.message}`);
    res.status(500).json({ success: false, error: 'Erreur' });
  }
});

/**
 * GET /api/payments/summary
 * Résumé des paiements (total envoyé, total reçu, nb transactions)
 */
router.get('/summary/me', verifyJWT, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.id;

    // Transactions envoyées (complétées)
    const { data: sent, error: sentError } = await supabaseAdmin
      .from('wallet_transactions')
      .select('amount, fee, currency')
      .eq('sender_user_id', userId)
      .eq('status', 'completed');

    if (sentError) throw sentError;

    // Transactions reçues (complétées)
    const { data: received, error: receivedError } = await supabaseAdmin
      .from('wallet_transactions')
      .select('net_amount, currency')
      .eq('receiver_user_id', userId)
      .eq('status', 'completed');

    if (receivedError) throw receivedError;

    const totalSent = (sent || []).reduce((sum, t) => sum + Number(t.amount), 0);
    const totalFees = (sent || []).reduce((sum, t) => sum + Number(t.fee || 0), 0);
    const totalReceived = (received || []).reduce((sum, t) => sum + Number(t.net_amount), 0);

    res.json({
      success: true,
      data: {
        total_sent: totalSent,
        total_fees: totalFees,
        total_received: totalReceived,
        transactions_sent: (sent || []).length,
        transactions_received: (received || []).length,
        currency: 'GNF'
      }
    });
  } catch (error: any) {
    logger.error(`Error fetching payment summary: ${error.message}`);
    res.status(500).json({ success: false, error: 'Erreur' });
  }
});

export default router;
