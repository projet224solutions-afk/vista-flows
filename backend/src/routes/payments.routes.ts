/**
 * 💳 PAYMENTS ROUTES - Phase 2 (scaffold)
 * Gestion centralisée des paiements multi-provider
 */

import { Router, Response } from 'express';
import { verifyJWT, AuthenticatedRequest } from '../middlewares/auth.middleware.js';
import { supabaseAdmin } from '../config/supabase.js';
import { logger } from '../config/logger.js';

const router = Router();

/**
 * POST /api/payments/initiate
 * Initier un paiement
 */
router.post('/initiate', verifyJWT, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const { amount, currency, provider, metadata, order_id } = req.body;

    if (!amount || !currency || !provider) {
      res.status(400).json({ success: false, error: 'amount, currency et provider requis' });
      return;
    }

    const validProviders = ['stripe', 'paypal', 'orange_money', 'mtn_money', 'wallet'];
    if (!validProviders.includes(provider)) {
      res.status(400).json({ success: false, error: `Provider invalide. Valides: ${validProviders.join(', ')}` });
      return;
    }

    const reference = `PAY-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    const { data: payment, error } = await supabaseAdmin
      .from('payments')
      .insert({
        user_id: userId,
        amount,
        currency,
        provider,
        status: 'pending',
        reference,
        order_id: order_id || null,
        metadata: metadata || {}
      })
      .select()
      .single();

    if (error) throw error;

    logger.info(`Payment initiated: ${reference} by user ${userId} - ${amount} ${currency} via ${provider}`);

    // TODO: Route vers le provider approprié (Stripe checkout, etc.)

    res.status(201).json({ success: true, data: payment });
  } catch (error: any) {
    logger.error(`Error initiating payment: ${error.message}`);
    res.status(500).json({ success: false, error: 'Erreur lors de l\'initiation du paiement' });
  }
});

/**
 * GET /api/payments/:id
 * Détails d'un paiement
 */
router.get('/:id', verifyJWT, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const { id } = req.params;

    const { data, error } = await supabaseAdmin
      .from('payments')
      .select('*')
      .eq('id', id)
      .eq('user_id', userId)
      .single();

    if (error || !data) {
      res.status(404).json({ success: false, error: 'Paiement non trouvé' });
      return;
    }

    res.json({ success: true, data });
  } catch (error: any) {
    logger.error(`Error fetching payment: ${error.message}`);
    res.status(500).json({ success: false, error: 'Erreur' });
  }
});

/**
 * GET /api/payments/history
 * Historique des paiements de l'utilisateur
 */
router.get('/', verifyJWT, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const limit = Math.min(parseInt(req.query.limit as string) || 20, 100);
    const offset = parseInt(req.query.offset as string) || 0;

    const { data, error, count } = await supabaseAdmin
      .from('payments')
      .select('*', { count: 'exact' })
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

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

export default router;
