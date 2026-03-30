/**
 * 💳 PAYMENTS ROUTES - Backend Node.js centralisé
 *
 * Endpoints de paiement gérés côté Node.js :
 *   - Liens de paiement (lecture publique + confirmation)
 *   - Initiation paiement mobile money Djomy (OM, MTN, KULU, CARD, MOMO)
 *   - Paiement sécurisé avec signature HMAC (init + validate / wallet deposit)
 *   - Historique et résumé des transactions
 *
 * Tables utilisées :
 *   - `payment_links`, `wallet_transactions`, `wallets`, `secure_transactions`,
 *     `djomy_transactions`, `djomy_api_logs`, `financial_audit_logs`
 */

import { Router, Response } from 'express';
import crypto from 'crypto';
import { optionalJWT, verifyJWT } from '../middlewares/auth.middleware.js';
import type { AuthenticatedRequest } from '../middlewares/auth.middleware.js';
import { supabaseAdmin } from '../config/supabase.js';
import { logger } from '../config/logger.js';
import { paymentRateLimit } from '../middlewares/routeRateLimiter.js';
import { initiateDjomyPayment } from '../services/djomy.service.js';
import { triggerAffiliateCommission } from '../services/commission.service.js';

const router = Router();

// Apply payment rate limit to all payment routes
router.use(paymentRateLimit);

/**
 * GET /api/payments/link/:paymentId
 * Lecture publique securisee d'un lien de paiement
 */
router.get('/link/:paymentId', optionalJWT, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { paymentId } = req.params;

    const { data, error } = await supabaseAdmin
      .from('payment_links')
      .select(`
        id,
        payment_id,
        produit,
        description,
        montant,
        remise,
        type_remise,
        frais,
        total,
        devise,
        status,
        expires_at,
        created_at,
        client_id,
        vendeur:vendors!payment_links_vendeur_id_fkey(
          id,
          business_name
        )
      `)
      .eq('payment_id', paymentId)
      .maybeSingle();

    if (error) throw error;

    if (!data) {
      res.status(404).json({ success: false, error: 'Lien de paiement non trouvé' });
      return;
    }

    const now = new Date();
    const expiresAt = new Date(data.expires_at);
    const isExpired = expiresAt.getTime() <= now.getTime();

    // Si client ciblé, on impose l'authentification du client concerné
    if (data.client_id && req.user?.id !== data.client_id) {
      if (!req.user?.id) {
        res.status(401).json({ success: false, error: 'Connexion requise pour ce lien de paiement' });
        return;
      }
      res.status(403).json({ success: false, error: 'Ce lien est réservé à un client spécifique' });
      return;
    }

    if (isExpired && data.status === 'pending') {
      await supabaseAdmin
        .from('payment_links')
        .update({ status: 'expired' })
        .eq('id', data.id)
        .eq('status', 'pending');
      data.status = 'expired';
    }

    res.json({
      success: true,
      payment: {
        id: data.id,
        payment_id: data.payment_id,
        produit: data.produit,
        description: data.description,
        montant: Number(data.montant || 0),
        remise: Number(data.remise || 0),
        type_remise: data.type_remise,
        frais: Number(data.frais || 0),
        total: Number(data.total || 0),
        devise: data.devise,
        status: data.status,
        expires_at: data.expires_at,
        created_at: data.created_at,
        vendeur: {
          name: (data.vendeur as any)?.business_name || 'Vendeur'
        }
      }
    });
  } catch (error: any) {
    logger.error(`Error fetching payment link: ${error.message}`);
    res.status(500).json({ success: false, error: 'Erreur lors du chargement du lien de paiement' });
  }
});

/**
 * POST /api/payments/link/:paymentId/pay
 * Confirmation de paiement d'un lien public
 */
router.post('/link/:paymentId/pay', optionalJWT, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { paymentId } = req.params;
    const { payment_method, transaction_id, client_info } = req.body || {};

    if (!payment_method) {
      res.status(400).json({ success: false, error: 'payment_method requis' });
      return;
    }

    const { data: current, error: fetchError } = await supabaseAdmin
      .from('payment_links')
      .select('id, status, expires_at, client_id, metadata')
      .eq('payment_id', paymentId)
      .maybeSingle();

    if (fetchError) throw fetchError;

    if (!current) {
      res.status(404).json({ success: false, error: 'Lien de paiement non trouvé' });
      return;
    }

    if (current.client_id && req.user?.id !== current.client_id) {
      if (!req.user?.id) {
        res.status(401).json({ success: false, error: 'Connexion requise pour ce lien de paiement' });
        return;
      }
      res.status(403).json({ success: false, error: 'Ce lien est réservé à un client spécifique' });
      return;
    }

    if (current.status !== 'pending') {
      res.status(409).json({ success: false, error: `Lien déjà traité (status=${current.status})` });
      return;
    }

    if (new Date(current.expires_at).getTime() <= Date.now()) {
      await supabaseAdmin
        .from('payment_links')
        .update({ status: 'expired' })
        .eq('id', current.id)
        .eq('status', 'pending');
      res.status(410).json({ success: false, error: 'Lien expiré' });
      return;
    }

    const fallbackTxn = `plink_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
    const nextMetadata = {
      ...(current.metadata || {}),
      client_info: client_info || null,
      paid_via: payment_method,
      paid_by_user_id: req.user?.id || null,
      source: 'api_payments_link_pay',
    };

    const { data: updated, error: updateError } = await supabaseAdmin
      .from('payment_links')
      .update({
        status: 'success',
        paid_at: new Date().toISOString(),
        payment_method,
        transaction_id: transaction_id || fallbackTxn,
        metadata: nextMetadata,
      })
      .eq('id', current.id)
      .eq('status', 'pending')
      .select('payment_id, status, transaction_id')
      .maybeSingle();

    if (updateError) throw updateError;

    if (!updated) {
      res.status(409).json({ success: false, error: 'Le lien a été traité en parallèle, veuillez rafraîchir' });
      return;
    }

    res.json({ success: true, payment: updated });
  } catch (error: any) {
    logger.error(`Error confirming payment link: ${error.message}`);
    res.status(500).json({ success: false, error: 'Erreur lors de la confirmation du paiement' });
  }
});

// ─────────────────────────────────────────────────────────
// DJOMY MOBILE MONEY — INITIATION
// Migré depuis l'Edge Function payment-core
// ─────────────────────────────────────────────────────────

type PaymentType = 'ORDER_PAYMENT' | 'SUBSCRIPTION' | 'BOOST' | 'DELIVERY' | 'COMMISSION' | 'WALLET_TOPUP' | 'TRANSFER';
type PaymentMethod = 'OM' | 'MTN' | 'KULU' | 'CARD' | 'MOMO';

const VALID_PAYMENT_TYPES: PaymentType[] = ['ORDER_PAYMENT', 'SUBSCRIPTION', 'BOOST', 'DELIVERY', 'COMMISSION', 'WALLET_TOPUP', 'TRANSFER'];
const VALID_PAYMENT_METHODS: PaymentMethod[] = ['OM', 'MTN', 'KULU', 'CARD', 'MOMO'];

/**
 * POST /api/payments/djomy/initiate
 * Initie un paiement mobile money via l'API Djomy.
 * Remplace l'Edge Function payment-core.
 *
 * Auth : optionalJWT (les paiements invités sont autorisés)
 * Body : { type, reference_id, amount, phone, method, vendor_id?, metadata?, description?, idempotency_key? }
 */
router.post('/djomy/initiate', optionalJWT, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const {
      type,
      reference_id,
      amount,
      currency = 'GNF',
      phone,
      method,
      vendor_id,
      metadata = {},
      description,
      idempotency_key,
    } = req.body || {};

    // ── Validation ──
    if (!type || !VALID_PAYMENT_TYPES.includes(type as PaymentType)) {
      res.status(400).json({ success: false, error: `Type invalide. Valeurs: ${VALID_PAYMENT_TYPES.join(', ')}` });
      return;
    }
    if (!reference_id) {
      res.status(400).json({ success: false, error: 'reference_id requis' });
      return;
    }
    if (!amount || typeof amount !== 'number' || amount <= 0) {
      res.status(400).json({ success: false, error: 'Montant invalide' });
      return;
    }
    if (!phone || String(phone).length < 8) {
      res.status(400).json({ success: false, error: 'Numéro de téléphone invalide' });
      return;
    }
    if (!method || !VALID_PAYMENT_METHODS.includes(method as PaymentMethod)) {
      res.status(400).json({ success: false, error: `Méthode invalide. Valeurs: ${VALID_PAYMENT_METHODS.join(', ')}` });
      return;
    }

    const userId = req.user?.id || null;
    logger.info(`[PaymentDjomy] Initiation: type=${type}, method=${method}, amount=${amount}, user=${userId}`);

    // ── Idempotence ──
    if (idempotency_key) {
      const { data: existing } = await supabaseAdmin
        .from('djomy_transactions')
        .select('id, status, djomy_transaction_id, order_id')
        .eq('idempotency_key', idempotency_key)
        .maybeSingle();

      if (existing) {
        res.json({
          success: true,
          transaction_id: existing.id,
          djomy_transaction_id: existing.djomy_transaction_id,
          order_id: existing.order_id,
          status: existing.status,
          message: 'Transaction existante (idempotent)',
        });
        return;
      }
    }

    // ── Création de la transaction en base (statut PENDING) ──
    const orderId = `224-${String(type).substring(0, 3)}-${Date.now()}-${crypto.randomBytes(3).toString('hex').toUpperCase()}`;

    const { data: newTransaction, error: insertError } = await supabaseAdmin
      .from('djomy_transactions')
      .insert({
        order_id: orderId,
        payment_type: type,
        reference_id,
        user_id: userId,
        vendor_id: vendor_id || null,
        amount,
        currency,
        payment_method: method,
        status: 'PENDING',
        payer_phone: String(phone).replace(/\s/g, ''),
        country_code: 'GN',
        description: description || `Paiement ${type} - ${orderId}`,
        metadata,
        idempotency_key: idempotency_key || null,
        ip_address: req.headers['x-forwarded-for'] || req.ip,
        user_agent: req.headers['user-agent'],
        auto_released: false,
        release_type: 'BLOCKED',
      })
      .select()
      .single();

    if (insertError) {
      logger.error(`[PaymentDjomy] DB insert error: ${insertError.message}`);
      res.status(500).json({ success: false, error: 'Erreur lors de la création de la transaction' });
      return;
    }

    // ── Log API request ──
    await supabaseAdmin.from('djomy_api_logs').insert({
      request_type: 'PAYMENT_INIT_BACKEND',
      endpoint: '/v1/payments',
      request_payload: { type, amount, method, reference_id },
      transaction_id: newTransaction.id,
    }).catch(() => {});

    // ── Appel API Djomy ──
    const djomyResult = await initiateDjomyPayment({
      paymentMethod: method,
      payerIdentifier: String(phone).replace(/\s/g, ''),
      amount,
      countryCode: 'GN',
      merchantPaymentReference: orderId,
      description: description || `224Solutions - ${type} - ${orderId}`,
    });

    if (!djomyResult.success) {
      // Marquer la transaction comme échouée
      await supabaseAdmin
        .from('djomy_transactions')
        .update({
          status: 'FAILED',
          error_message: djomyResult.error,
          updated_at: new Date().toISOString(),
        })
        .eq('id', newTransaction.id);

      res.status(502).json({ success: false, error: `Paiement Djomy échoué: ${djomyResult.error}` });
      return;
    }

    // ── Mise à jour avec la réponse Djomy ──
    await supabaseAdmin
      .from('djomy_transactions')
      .update({
        status: 'PROCESSING',
        djomy_transaction_id: djomyResult.transactionId,
        djomy_response: djomyResult.data,
        updated_at: new Date().toISOString(),
      })
      .eq('id', newTransaction.id);

    logger.info(`[PaymentDjomy] Initiated: order=${orderId}, djomyTx=${djomyResult.transactionId}`);

    res.json({
      success: true,
      transaction_id: newTransaction.id,
      djomy_transaction_id: djomyResult.transactionId,
      order_id: orderId,
      status: 'PROCESSING',
      message: 'Paiement initié. Veuillez confirmer sur votre téléphone.',
    });
  } catch (error: any) {
    logger.error(`[PaymentDjomy] Unexpected error: ${error.message}`);
    res.status(500).json({ success: false, error: 'Erreur interne' });
  }
});

// ─────────────────────────────────────────────────────────
// PAIEMENT SÉCURISÉ (Init + Validate) — WALLET DEPOSIT
// Migré depuis les Edge Functions secure-payment-init / secure-payment-validate
// ─────────────────────────────────────────────────────────

const FEE_PERCENTAGE = 0.025; // 2.5%

function computeSecureSignature(transactionId: string, totalAmount: number): string {
  const secret = process.env.TRANSACTION_SECRET_KEY;
  if (!secret) throw new Error('CRITICAL: TRANSACTION_SECRET_KEY non configuré');
  return crypto
    .createHmac('sha256', secret)
    .update(`${transactionId}${totalAmount}`)
    .digest('hex');
}

/**
 * POST /api/payments/secure/init
 * Initialise un paiement wallet sécurisé (calcul de frais côté serveur + signature HMAC).
 * Remplace l'Edge Function secure-payment-init.
 *
 * Auth : verifyJWT (authentification obligatoire)
 * Body : { requested_amount, payment_method?, transaction_type?, interface_type? }
 */
router.post('/secure/init', verifyJWT, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const {
      requested_amount,
      payment_method = 'OM',
      transaction_type = 'deposit',
      interface_type = 'client',
    } = req.body || {};

    if (!requested_amount || typeof requested_amount !== 'number' || requested_amount <= 0) {
      res.status(400).json({ success: false, error: 'INVALID_AMOUNT', message: 'Montant invalide' });
      return;
    }

    // Vérifier si l'utilisateur est bloqué
    const { data: securityFlags } = await supabaseAdmin
      .from('user_security_flags')
      .select('is_blocked, blocked_reason')
      .eq('user_id', userId)
      .maybeSingle();

    if (securityFlags?.is_blocked) {
      await supabaseAdmin.from('financial_audit_logs').insert({
        user_id: userId,
        action_type: 'attempt',
        description: 'Tentative de paiement par utilisateur bloqué',
        is_suspicious: true,
        security_flags: ['blocked_user_attempt'],
        ip_address: req.headers['x-forwarded-for'] || req.ip,
        user_agent: req.headers['user-agent'],
      }).catch(() => {});

      res.status(403).json({ success: false, error: 'USER_BLOCKED', message: 'Compte bloqué' });
      return;
    }

    // Calcul des montants côté serveur (jamais depuis le frontend)
    const feeAmount = Math.round(requested_amount * FEE_PERCENTAGE * 100) / 100;
    const totalAmount = requested_amount + feeAmount;
    const netAmount = requested_amount;
    const transactionId = crypto.randomUUID();
    const signature = computeSecureSignature(transactionId, totalAmount);

    const { error: insertError } = await supabaseAdmin
      .from('secure_transactions')
      .insert({
        id: transactionId,
        user_id: userId,
        requested_amount,
        fee_percentage: FEE_PERCENTAGE,
        fee_amount: feeAmount,
        total_amount: totalAmount,
        net_amount: netAmount,
        signature_hash: signature,
        transaction_type,
        interface_type,
        payment_method,
        status: 'pending',
        payment_provider: 'djomy',
        ip_address: req.headers['x-forwarded-for'] || req.ip,
        user_agent: req.headers['user-agent'],
      });

    if (insertError) {
      logger.error(`[SecurePayment] Init insert error: ${insertError.message}`);
      res.status(500).json({ success: false, error: 'TRANSACTION_CREATION_FAILED' });
      return;
    }

    await supabaseAdmin.from('financial_audit_logs').insert({
      transaction_id: transactionId,
      user_id: userId,
      action_type: 'create',
      description: `Transaction sécurisée créée - Total: ${totalAmount} GNF`,
      new_status: 'pending',
      request_data: { requested_amount, fee_amount: feeAmount, total_amount: totalAmount },
      ip_address: req.headers['x-forwarded-for'] || req.ip,
    }).catch(() => {});

    logger.info(`[SecurePayment] Init: user=${userId}, total=${totalAmount}, tx=${transactionId}`);

    res.json({
      success: true,
      transaction_id: transactionId,
      requested_amount,
      fee_amount: feeAmount,
      total_amount: totalAmount,
      net_amount: netAmount,
      signature,
      payment_method,
      status: 'pending',
    });
  } catch (error: any) {
    logger.error(`[SecurePayment] Init error: ${error.message}`);
    res.status(500).json({ success: false, error: 'Erreur interne' });
  }
});

/**
 * POST /api/payments/secure/validate
 * Valide un paiement sécurisé (vérifie signature HMAC + montant + statut).
 * Si tout est correct, crédite le wallet.
 * Remplace l'Edge Function secure-payment-validate.
 *
 * Auth : verifyJWT (ou appel S2S avec signature)
 * Body : { transaction_id, external_transaction_id, amount_paid, payment_status, signature }
 */
router.post('/secure/validate', optionalJWT, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const {
      transaction_id,
      external_transaction_id,
      amount_paid,
      payment_status,
      signature,
    } = req.body || {};

    if (!transaction_id) {
      res.status(400).json({ success: false, error: 'transaction_id requis' });
      return;
    }

    // Récupérer la transaction
    const { data: transaction, error: fetchError } = await supabaseAdmin
      .from('secure_transactions')
      .select('*')
      .eq('id', transaction_id)
      .single();

    if (fetchError || !transaction) {
      await supabaseAdmin.from('financial_audit_logs').insert({
        user_id: '00000000-0000-0000-0000-000000000000',
        action_type: 'attempt',
        description: 'Tentative validation avec ID transaction invalide',
        request_data: { transaction_id },
        is_suspicious: true,
        security_flags: ['invalid_transaction_id'],
      }).catch(() => {});

      res.status(404).json({ success: false, error: 'TRANSACTION_NOT_FOUND' });
      return;
    }

    const userId = transaction.user_id;

    // Vérifier statut pending
    if (transaction.status !== 'pending') {
      res.status(400).json({
        success: false,
        error: 'INVALID_TRANSACTION_STATUS',
        current_status: transaction.status,
      });
      return;
    }

    // Vérifier la signature HMAC (règle de sécurité absolue)
    let expectedSignature: string;
    try {
      expectedSignature = computeSecureSignature(transaction_id, transaction.total_amount);
    } catch (sigErr: any) {
      res.status(500).json({ success: false, error: 'SIGNATURE_CONFIG_ERROR' });
      return;
    }

    if (!signature || signature !== expectedSignature) {
      await supabaseAdmin.from('financial_security_alerts').insert({
        transaction_id,
        user_id: userId,
        alert_type: 'signature_invalid',
        severity: 'critical',
        title: 'Signature API invalide',
        description: 'Tentative de validation avec signature incorrecte',
        expected_value: expectedSignature,
        received_value: signature || 'NULL',
      }).catch(() => {});

      await supabaseAdmin
        .from('secure_transactions')
        .update({ status: 'rejected', rejection_reason: 'INVALID_SIGNATURE', failed_at: new Date().toISOString() })
        .eq('id', transaction_id);

      await supabaseAdmin.from('financial_audit_logs').insert({
        transaction_id,
        user_id: userId,
        action_type: 'reject',
        description: 'SIGNATURE INVALIDE — Paiement REFUSÉ',
        is_suspicious: true,
        security_flags: ['invalid_signature'],
      }).catch(() => {});

      res.status(403).json({ success: false, error: 'INVALID_SIGNATURE', message: 'Paiement REFUSÉ' });
      return;
    }

    // Vérifier le statut du paiement
    if (payment_status !== 'SUCCESS' && payment_status !== 'completed') {
      await supabaseAdmin
        .from('secure_transactions')
        .update({
          status: 'failed',
          rejection_reason: `PAYMENT_${String(payment_status || 'FAILED').toUpperCase()}`,
          external_transaction_id,
          failed_at: new Date().toISOString(),
        })
        .eq('id', transaction_id);

      res.status(400).json({ success: false, error: 'PAYMENT_FAILED', status: payment_status });
      return;
    }

    // Vérifier l'exact montant payé
    const amountDiff = Math.abs(Number(amount_paid) - Number(transaction.total_amount));
    if (!amount_paid || amountDiff > 0.01) {
      await supabaseAdmin.from('financial_security_alerts').insert({
        transaction_id,
        user_id: userId,
        alert_type: 'amount_mismatch',
        severity: 'critical',
        title: 'Montant payé différent',
        description: 'Le montant payé ne correspond pas au montant attendu',
        expected_value: String(transaction.total_amount),
        received_value: String(amount_paid ?? 'NULL'),
      }).catch(() => {});

      await supabaseAdmin
        .from('secure_transactions')
        .update({ status: 'rejected', rejection_reason: 'AMOUNT_MISMATCH', failed_at: new Date().toISOString() })
        .eq('id', transaction_id);

      res.status(400).json({
        success: false,
        error: 'AMOUNT_MISMATCH',
        expected: transaction.total_amount,
        received: amount_paid,
      });
      return;
    }

    // ── TOUTES LES VALIDATIONS OK → Créditer le wallet ──

    // Récupérer ou créer le wallet
    let walletId: string;
    let currentBalance: number;

    const { data: wallet, error: walletError } = await supabaseAdmin
      .from('wallets')
      .select('id, balance')
      .eq('user_id', userId)
      .single();

    if (walletError || !wallet) {
      const { data: newWallet, error: createError } = await supabaseAdmin
        .from('wallets')
        .insert({ user_id: userId, balance: 0, currency: 'GNF' })
        .select('id, balance')
        .single();

      if (createError || !newWallet) {
        res.status(500).json({ success: false, error: 'WALLET_CREATION_FAILED' });
        return;
      }
      walletId = newWallet.id;
      currentBalance = newWallet.balance;
    } else {
      walletId = wallet.id;
      currentBalance = wallet.balance;
    }

    const newBalance = Number(currentBalance) + Number(transaction.net_amount);

    const { error: updateError } = await supabaseAdmin
      .from('wallets')
      .update({ balance: newBalance, updated_at: new Date().toISOString() })
      .eq('id', walletId);

    if (updateError) {
      logger.error(`[SecurePayment] Wallet update failed: ${updateError.message}`);
      res.status(500).json({ success: false, error: 'WALLET_UPDATE_FAILED' });
      return;
    }

    // Marquer la transaction comme complétée
    await supabaseAdmin
      .from('secure_transactions')
      .update({
        status: 'completed',
        signature_verified: true,
        external_transaction_id,
        amount_paid,
        validated_at: new Date().toISOString(),
        completed_at: new Date().toISOString(),
      })
      .eq('id', transaction_id);

    // Journal wallets (aligné au schéma wallet_transactions existant)
    await supabaseAdmin.from('wallet_transactions').insert({
      sender_wallet_id: walletId,
      receiver_wallet_id: walletId,
      transaction_type: 'deposit',
      amount: transaction.net_amount,
      description: `Recharge sécurisée via ${transaction.payment_method || 'Djomy'}`,
      status: 'completed',
      metadata: {
        reference: external_transaction_id,
        secure_transaction_id: transaction_id,
        source: 'backend-node',
      },
    }).catch(() => {});

    // Déclencher les commissions affiliées
    await triggerAffiliateCommission(userId, Number(transaction.net_amount), 'wallet_deposit', transaction_id);

    await supabaseAdmin.from('financial_audit_logs').insert({
      transaction_id,
      user_id: userId,
      action_type: 'complete',
      description: `Paiement validé et wallet crédité: ${transaction.net_amount} GNF`,
      old_status: 'pending',
      new_status: 'completed',
    }).catch(() => {});

    logger.info(`[SecurePayment] Validated: user=${userId}, net=${transaction.net_amount}, newBalance=${newBalance}`);

    res.json({
      success: true,
      message: 'Paiement validé et wallet crédité',
      credited_amount: transaction.net_amount,
      new_balance: newBalance,
      transaction_id,
    });
  } catch (error: any) {
    logger.error(`[SecurePayment] Validate error: ${error.message}`);
    res.status(500).json({ success: false, error: 'Erreur interne' });
  }
});

// ─────────────────────────────────────────────────────────
// HISTORIQUE DES PAIEMENTS
// ─────────────────────────────────────────────────────────

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
