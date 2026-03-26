/**
 * 💰 WALLET ROUTES v2 - TypeScript version
 * Migration progressive depuis wallet.routes.js
 */

import { Router, Response } from 'express';
import { verifyJWT, AuthenticatedRequest } from '../middlewares/auth.middleware.js';
import { supabaseAdmin } from '../config/supabase.js';
import { logger } from '../config/logger.js';

const router = Router();

/**
 * POST /api/wallet/initialize
 */
router.post('/initialize', verifyJWT, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { user_id } = req.body;
    const currentUserId = req.user!.id;

    if (user_id && user_id !== currentUserId) {
      res.status(403).json({ success: false, error: 'Vous ne pouvez initialiser que votre propre wallet' });
      return;
    }

    const targetUserId = user_id || currentUserId;

    // Check existing
    const { data: existing, error: selectError } = await supabaseAdmin
      .from('wallets')
      .select('*')
      .eq('user_id', targetUserId)
      .maybeSingle();

    if (selectError) throw selectError;

    if (existing) {
      res.json({ success: true, wallet: existing, created: false });
      return;
    }

    // Create
    const { data: newWallet, error: insertError } = await supabaseAdmin
      .from('wallets')
      .insert({ user_id: targetUserId, balance: 0, currency: 'GNF', wallet_status: 'active' })
      .select()
      .single();

    if (insertError) throw insertError;

    logger.info(`Wallet created for user: ${targetUserId}`);
    res.status(201).json({ success: true, wallet: newWallet, created: true });
  } catch (error: any) {
    logger.error(`Wallet init error: ${error.message}`);
    res.status(500).json({ success: false, error: 'Erreur lors de l\'initialisation du wallet' });
  }
});

/**
 * GET /api/wallet/balance
 */
router.get('/balance', verifyJWT, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { data, error } = await supabaseAdmin
      .from('wallets')
      .select('id, balance, currency, wallet_status')
      .eq('user_id', req.user!.id)
      .maybeSingle();

    if (error) throw error;

    res.json({ success: true, data: data || null });
  } catch (error: any) {
    logger.error(`Balance error: ${error.message}`);
    res.status(500).json({ success: false, error: 'Erreur' });
  }
});

/**
 * POST /api/wallet/check
 */
router.post('/check', verifyJWT, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const currentUserId = req.body?.user_id || req.user!.id;

    const { data, error } = await supabaseAdmin
      .from('wallets')
      .select('*')
      .eq('user_id', currentUserId)
      .maybeSingle();

    if (error) throw error;

    res.json({ exists: !!data, wallet: data || null });
  } catch (error: any) {
    logger.error(`Wallet check error: ${error.message}`);
    res.status(500).json({ success: false, error: 'Erreur' });
  }
});

/**
 * GET /api/wallet/transactions
 */
router.get('/transactions', verifyJWT, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const limit = Math.min(parseInt(req.query.limit as string) || 20, 100);
    const offset = parseInt(req.query.offset as string) || 0;

    // Get wallet first
    const { data: wallet } = await supabaseAdmin
      .from('wallets')
      .select('id')
      .eq('user_id', req.user!.id)
      .single();

    if (!wallet) {
      res.json({ success: true, data: [], meta: { total: 0 } });
      return;
    }

    const { data, error, count } = await supabaseAdmin
      .from('wallet_transactions')
      .select('*', { count: 'exact' })
      .eq('wallet_id', wallet.id)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) throw error;

    res.json({
      success: true,
      data: data || [],
      meta: { limit, offset, total: count || 0, hasMore: (offset + limit) < (count || 0) }
    });
  } catch (error: any) {
    logger.error(`Transactions error: ${error.message}`);
    res.status(500).json({ success: false, error: 'Erreur' });
  }
});

export default router;
