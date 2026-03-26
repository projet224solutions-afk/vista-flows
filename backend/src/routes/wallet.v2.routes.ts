/**
 * 💰 WALLET v2 ROUTES - TypeScript (aligné DB existante)
 * 
 * Tables utilisées :
 *   - `wallets` (bigint id, numeric balance, wallet_status enum, pin_hash, daily_limit, etc.)
 *   - `wallet_transactions` (bigint id, sender/receiver_wallet_id, transaction_type enum, status enum)
 * 
 * ⚠️ Ce fichier est monté sur /api/v2/wallet (séparé du legacy /api/wallet)
 * Le legacy wallet.routes.js reste actif et inchangé.
 */

import { Router, Response } from 'express';
import { verifyJWT } from '../middlewares/auth.middleware.js';
import type { AuthenticatedRequest } from '../middlewares/auth.middleware.js';
import { supabaseAdmin } from '../config/supabase.js';
import { logger } from '../config/logger.js';

const router = Router();

/**
 * GET /api/v2/wallet/balance
 * Récupère le solde du wallet de l'utilisateur connecté
 */
router.get('/balance', verifyJWT, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { data, error } = await supabaseAdmin
      .from('wallets')
      .select('id, balance, currency, wallet_status, is_blocked, daily_limit, monthly_limit, created_at')
      .eq('user_id', req.user!.id)
      .maybeSingle();

    if (error) throw error;

    res.json({ success: true, data: data || null, exists: !!data });
  } catch (error: any) {
    logger.error(`Wallet balance error: ${error.message}`);
    res.status(500).json({ success: false, error: 'Erreur lors de la récupération du solde' });
  }
});

/**
 * POST /api/v2/wallet/initialize
 * Initialise le wallet si inexistant
 */
router.post('/initialize', verifyJWT, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.id;

    // Vérifier si le wallet existe
    const { data: existing, error: selectError } = await supabaseAdmin
      .from('wallets')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle();

    if (selectError) throw selectError;

    if (existing) {
      res.json({ success: true, wallet: existing, created: false });
      return;
    }

    // Créer — la table utilise des defaults pour balance, currency, wallet_status, limits
    const { data: newWallet, error: insertError } = await supabaseAdmin
      .from('wallets')
      .insert({ user_id: userId })
      .select()
      .single();

    if (insertError) throw insertError;

    logger.info(`Wallet created for user: ${userId}`);
    res.status(201).json({ success: true, wallet: newWallet, created: true });
  } catch (error: any) {
    logger.error(`Wallet init error: ${error.message}`);
    res.status(500).json({ success: false, error: 'Erreur lors de l\'initialisation du wallet' });
  }
});

/**
 * GET /api/v2/wallet/transactions
 * Historique des transactions du wallet
 */
router.get('/transactions', verifyJWT, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const limit = Math.min(parseInt(req.query.limit as string) || 20, 100);
    const offset = parseInt(req.query.offset as string) || 0;

    // Récupérer le wallet
    const { data: wallet } = await supabaseAdmin
      .from('wallets')
      .select('id')
      .eq('user_id', userId)
      .single();

    if (!wallet) {
      res.json({ success: true, data: [], meta: { total: 0, limit, offset, hasMore: false } });
      return;
    }

    // Transactions où l'utilisateur est sender OU receiver
    const { data, error, count } = await supabaseAdmin
      .from('wallet_transactions')
      .select('*', { count: 'exact' })
      .or(`sender_wallet_id.eq.${wallet.id},receiver_wallet_id.eq.${wallet.id}`)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) throw error;

    res.json({
      success: true,
      data: data || [],
      meta: { limit, offset, total: count || 0, hasMore: (offset + limit) < (count || 0) }
    });
  } catch (error: any) {
    logger.error(`Wallet transactions error: ${error.message}`);
    res.status(500).json({ success: false, error: 'Erreur' });
  }
});

/**
 * GET /api/v2/wallet/status
 * Statut complet du wallet (sécurité, limites, blocage)
 */
router.get('/status', verifyJWT, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { data, error } = await supabaseAdmin
      .from('wallets')
      .select('id, balance, currency, wallet_status, is_blocked, blocked_reason, blocked_at, biometric_enabled, daily_limit, monthly_limit, created_at, updated_at')
      .eq('user_id', req.user!.id)
      .maybeSingle();

    if (error) throw error;

    if (!data) {
      res.json({ success: true, exists: false, data: null });
      return;
    }

    res.json({ success: true, exists: true, data });
  } catch (error: any) {
    logger.error(`Wallet status error: ${error.message}`);
    res.status(500).json({ success: false, error: 'Erreur' });
  }
});

export default router;
