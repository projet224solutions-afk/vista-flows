/**
 * 💰 WALLET v2 ROUTES - Backend Node.js centralisé
 *
 * Tables utilisées :
 *   - `wallets`, `wallet_transactions`, `wallet_idempotency_keys`
 *
 * Endpoints :
 *   - GET /balance, /transactions, /status (lecture)
 *   - POST /initialize (creation)
 *   - POST /deposit  — crédit wallet (migré depuis wallet-operations Edge Function)
 *   - POST /withdraw — débit wallet (migré depuis wallet-operations Edge Function)
 *   - POST /transfer — transfert P2P (migré depuis wallet-operations / wallet-transfer Edge Function)
 *   - POST /credit   — crédit admin/interne (service rôle)
 *
 * ⚠️ Route montée sur /api/v2/wallet (séparée du legacy /api/wallet)
 */

import { Router, Response } from 'express';
import crypto from 'crypto';
import { verifyJWT } from '../middlewares/auth.middleware.js';
import { requirePermissionOrRole } from '../middlewares/permissions.middleware.js';
import type { AuthenticatedRequest } from '../middlewares/auth.middleware.js';
import { supabaseAdmin } from '../config/supabase.js';
import { logger } from '../config/logger.js';
import { creditWallet, debitWallet, transferBetweenWallets } from '../services/wallet.service.js';
import { triggerAffiliateCommission } from '../services/commission.service.js';

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

// ─────────────────────────────────────────────────────────
// WALLET OPERATIONS — Migré depuis Edge Functions wallet-operations / wallet-transfer
// ─────────────────────────────────────────────────────────

/**
 * POST /api/v2/wallet/deposit
 * Crédite le wallet de l'utilisateur connecté.
 *
 * Auth : verifyJWT
 * Body : { amount, description?, reference?, idempotency_key? }
 */
router.post('/deposit', verifyJWT, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const { amount, description, reference, idempotency_key } = req.body || {};

    if (!amount || typeof amount !== 'number' || amount <= 0) {
      res.status(400).json({ success: false, error: 'Montant invalide' });
      return;
    }
    if (amount > 100000000) {
      res.status(400).json({ success: false, error: 'Montant trop élevé' });
      return;
    }

    const idemKey = idempotency_key || `deposit:${userId}:${amount}:${Math.floor(Date.now() / 60000)}`;
    const ref = reference || `dep_${Date.now()}`;

    const result = await creditWallet(userId, amount, description || 'Dépôt', ref, 'deposit', idemKey);

    if (!result.success) {
      res.status(400).json({ success: false, error: result.error });
      return;
    }

    // Déclencher commissions affiliées
    await triggerAffiliateCommission(userId, amount, 'deposit', ref);

    logger.info(`[WalletV2] Deposit: user=${userId}, amount=${amount}`);
    res.json({ success: true, new_balance: result.newBalance, operation: 'deposit' });
  } catch (error: any) {
    logger.error(`Wallet deposit error: ${error.message}`);
    res.status(500).json({ success: false, error: 'Erreur lors du dépôt' });
  }
});

/**
 * POST /api/v2/wallet/withdraw
 * Débite le wallet de l'utilisateur connecté.
 *
 * Auth : verifyJWT
 * Body : { amount, description?, idempotency_key }
 */
router.post('/withdraw', verifyJWT, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const { amount, description, idempotency_key } = req.body || {};

    if (!amount || typeof amount !== 'number' || amount <= 0) {
      res.status(400).json({ success: false, error: 'Montant invalide' });
      return;
    }

    const idemKey = idempotency_key || `withdraw:${userId}:${amount}:${crypto.randomBytes(8).toString('hex')}`;

    const result = await debitWallet(userId, amount, description || 'Retrait', idemKey);

    if (!result.success) {
      const statusCode = result.error === 'Solde insuffisant' ? 402
        : result.error === 'Wallet bloqué' ? 403
        : result.error?.includes('activité suspecte') ? 403
        : 400;
      res.status(statusCode).json({ success: false, error: result.error });
      return;
    }

    logger.info(`[WalletV2] Withdraw: user=${userId}, amount=${amount}`);
    res.json({ success: true, new_balance: result.newBalance, operation: 'withdraw' });
  } catch (error: any) {
    logger.error(`Wallet withdraw error: ${error.message}`);
    res.status(500).json({ success: false, error: 'Erreur lors du retrait' });
  }
});

/**
 * POST /api/v2/wallet/transfer
 * Transfert P2P entre deux wallets.
 *
 * Auth : verifyJWT
 * Body : { amount, recipient_id (UUID), description?, idempotency_key? }
 */
router.post('/transfer', verifyJWT, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const senderId = req.user!.id;
    const { amount, recipient_id, description, idempotency_key } = req.body || {};

    if (!amount || typeof amount !== 'number' || amount <= 0) {
      res.status(400).json({ success: false, error: 'Montant invalide' });
      return;
    }
    if (!recipient_id || typeof recipient_id !== 'string') {
      res.status(400).json({ success: false, error: 'recipient_id requis' });
      return;
    }
    if (recipient_id === senderId) {
      res.status(400).json({ success: false, error: 'Transfert vers soi-même non autorisé' });
      return;
    }

    // Vérifier que le destinataire existe
    const { data: recipient } = await supabaseAdmin
      .from('wallets')
      .select('user_id')
      .eq('user_id', recipient_id)
      .maybeSingle();

    if (!recipient) {
      res.status(404).json({ success: false, error: 'Wallet destinataire introuvable' });
      return;
    }

    const idemKey = idempotency_key || `transfer:${senderId}:${recipient_id}:${amount}:${crypto.randomBytes(8).toString('hex')}`;

    const result = await transferBetweenWallets(senderId, recipient_id, amount, description || 'Transfert', idemKey);

    if (!result.success) {
      const statusCode = result.error === 'Solde insuffisant' ? 402
        : result.error?.includes('bloqué') ? 403
        : 400;
      res.status(statusCode).json({ success: false, error: result.error });
      return;
    }

    logger.info(`[WalletV2] Transfer: sender=${senderId}, receiver=${recipient_id}, amount=${amount}`);
    res.json({ success: true, transaction_id: result.transactionId, operation: 'transfer' });
  } catch (error: any) {
    logger.error(`Wallet transfer error: ${error.message}`);
    res.status(500).json({ success: false, error: 'Erreur lors du transfert' });
  }
});

/**
 * POST /api/v2/wallet/credit
 * Crédit admin/interne d'un wallet (service rôle uniquement).
 * Utilisé par les admins pour créditer manuellement un vendeur/affilié.
 *
 * Auth : verifyJWT + rôle admin/PDG/CEO
 * Body : { user_id, amount, description, reference?, transaction_type? }
 */
router.post(
  '/credit',
  verifyJWT,
  requirePermissionOrRole({
    permissionKey: 'manage_wallet_transactions',
    allowedRoles: ['admin', 'pdg', 'ceo'],
  }),
  async (req: AuthenticatedRequest, res: Response) => {
  try {
    const actorId = req.user!.id;

    const { user_id, amount, description, reference, transaction_type = 'admin_credit' } = req.body || {};

    if (!user_id || !amount || typeof amount !== 'number' || amount <= 0) {
      res.status(400).json({ success: false, error: 'user_id et amount (positif) requis' });
      return;
    }

    const ref = reference || `admin_${Date.now()}`;
    const result = await creditWallet(user_id, amount, description || 'Crédit administrateur', ref, transaction_type);

    if (!result.success) {
      res.status(400).json({ success: false, error: result.error });
      return;
    }

    // Audit log
    await supabaseAdmin.from('financial_audit_logs').insert({
      user_id: actorId,
      action_type: 'admin_credit',
      description: `Crédit admin: ${amount} GNF → user=${user_id}`,
      request_data: { user_id, amount, description, reference: ref },
    }).catch(() => {});

    logger.info(`[WalletV2] Admin credit: actor=${actorId}, target=${user_id}, amount=${amount}`);
    res.json({ success: true, new_balance: result.newBalance, operation: 'admin_credit' });
  } catch (error: any) {
    logger.error(`Wallet credit error: ${error.message}`);
    res.status(500).json({ success: false, error: 'Erreur lors du crédit' });
  }
});

export default router;
