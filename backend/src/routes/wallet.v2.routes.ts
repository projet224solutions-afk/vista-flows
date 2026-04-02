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
import { AFRICAN_BANK_SOURCE_URLS, isAfricanBankSourceUrl } from '../constants/africanBankSources.js';
import { creditWallet, debitWallet, transferBetweenWallets } from '../services/wallet.service.js';
import { triggerAffiliateCommission } from '../services/commission.service.js';
import { changeWalletPin, ensureWalletExistsForPin, getWalletPinPolicy, getWalletPinState, setupWalletPin, verifyWalletPin } from '../services/walletPin.service.js';
import { emitCoreFeatureEvent } from '../services/coreFeatureEvents.service.js';

const router = Router();
const SYSTEM_USER_ID = '00000000-0000-0000-0000-000000000000';
const BCRG_OFFICIAL_URL = 'https://www.bcrg-guinee.org';
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

interface ResolvedRecipient {
  userId: string;
  query: string;
  matchedBy: 'uuid' | 'user_ids.custom_id' | 'profiles.public_id' | 'profiles.custom_id' | 'profiles.email' | 'profiles.phone' | 'auth.users.email' | 'auth.users.phone';
  displayName: string | null;
  email: string | null;
  phone: string | null;
  publicId: string | null;
  customId: string | null;
}

function isFxSuccessStatus(status: string | null | undefined): boolean {
  const normalized = (status || '').toLowerCase();
  return normalized === 'success' || normalized === 'completed' || normalized === 'ok';
}

async function requireValidTransactionPin(userId: string, pin: unknown): Promise<{ ok: boolean; error?: string; lockedUntil?: string | null }> {
  const walletPinState = await getWalletPinState(userId);
  const pinEnabled = Boolean(walletPinState?.pin_enabled);

  // Compatibility mode: if PIN is not configured yet, keep operations available.
  if (!pinEnabled) {
    return { ok: true };
  }

  if (typeof pin !== 'string') {
    return { ok: false, error: 'Code PIN requis pour confirmer cette opération' };
  }

  const verification = await verifyWalletPin(userId, pin);
  if (!verification.valid) {
    return { ok: false, error: verification.error, lockedUntil: verification.lockedUntil };
  }

  return { ok: true };
}

function normalizePhoneCandidates(raw: string): string[] {
  const compact = raw.replace(/[\s\-()]/g, '');
  const digits = compact.replace(/[^\d]/g, '');
  const withPlus = digits ? `+${digits}` : '';
  const localNoPrefix = digits.startsWith('00') ? digits.slice(2) : digits;
  return Array.from(new Set([raw, compact, digits, withPlus, localNoPrefix].filter(Boolean)));
}

const CURRENCY_TO_COUNTRY: Record<string, string> = {
  GNF: 'Guinee',
  XOF: 'UEMOA',
  XAF: 'CEMAC',
  NGN: 'Nigeria',
  GHS: 'Ghana',
  KES: 'Kenya',
  UGX: 'Uganda',
  ZAR: 'Afrique du Sud',
  MAD: 'Maroc',
  TND: 'Tunisie',
  EGP: 'Egypte',
  ZMW: 'Zambie',
  RWF: 'Rwanda',
  TZS: 'Tanzanie',
  BWP: 'Botswana',
  MZN: 'Mozambique',
  EUR: 'Zone Euro',
  USD: 'Etats-Unis',
};

function mapCurrencyToCountry(currency: string | null | undefined): string {
  if (!currency) return 'Inconnu';
  return CURRENCY_TO_COUNTRY[String(currency).toUpperCase()] || String(currency).toUpperCase();
}

function isAfricanBankRow(row: { source_url?: string | null; source?: string | null; source_type?: string | null }): boolean {
  if (row?.source_url && isAfricanBankSourceUrl(row.source_url)) {
    return true;
  }

  const source = String(row?.source || '').toLowerCase();
  const sourceType = String(row?.source_type || '').toLowerCase();
  const text = `${source} ${sourceType}`;

  if (sourceType === 'official_fixed_parity' || sourceType === 'official_cross' || sourceType === 'official_html') {
    return true;
  }

  return /bcrg|bceao|beac|cbn|sarb|ecobank|orabank|afreximbank|banque|bank|afric/i.test(text);
}

function resolveOfficialBankSourceUrl(row: { source_url?: string | null; source?: string | null; source_type?: string | null }): string | null {
  if (row?.source_url) return row.source_url;

  const text = `${String(row?.source || '').toLowerCase()} ${String(row?.source_type || '').toLowerCase()}`;

  if (/bcrg|banque centrale de guinee|banque centrale de guinée/.test(text)) {
    return BCRG_OFFICIAL_URL;
  }

  return null;
}

async function resolveRecipient(rawRecipient: string): Promise<ResolvedRecipient | null> {
  const candidate = String(rawRecipient || '').trim();
  if (!candidate) return null;

  if (UUID_REGEX.test(candidate)) {
    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('id, email, phone, first_name, last_name, public_id, custom_id')
      .eq('id', candidate)
      .maybeSingle();

    const displayName = profile
      ? `${String((profile as any).first_name || '').trim()} ${String((profile as any).last_name || '').trim()}`.trim() || null
      : null;

    return {
      userId: candidate,
      query: candidate,
      matchedBy: 'uuid',
      displayName,
      email: profile ? String((profile as any).email || '') || null : null,
      phone: profile ? String((profile as any).phone || '') || null : null,
      publicId: profile ? String((profile as any).public_id || '') || null : null,
      customId: profile ? String((profile as any).custom_id || '') || null : null,
    };
  }

  const normalizedId = candidate.toUpperCase();

  const { data: fromUserIds } = await supabaseAdmin
    .from('user_ids')
    .select('user_id')
    .eq('custom_id', normalizedId)
    .maybeSingle();

  if (fromUserIds?.user_id) {
    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('id, email, phone, first_name, last_name, public_id, custom_id')
      .eq('id', fromUserIds.user_id)
      .maybeSingle();

    const displayName = profile
      ? `${String((profile as any).first_name || '').trim()} ${String((profile as any).last_name || '').trim()}`.trim() || null
      : null;

    return {
      userId: fromUserIds.user_id,
      query: candidate,
      matchedBy: 'user_ids.custom_id',
      displayName,
      email: profile ? String((profile as any).email || '') || null : null,
      phone: profile ? String((profile as any).phone || '') || null : null,
      publicId: profile ? String((profile as any).public_id || '') || null : null,
      customId: profile ? String((profile as any).custom_id || '') || null : null,
    };
  }

  const { data: fromProfileIds } = await supabaseAdmin
    .from('profiles')
    .select('id, email, phone, first_name, last_name, public_id, custom_id')
    .or(`public_id.eq.${normalizedId},custom_id.eq.${normalizedId}`)
    .maybeSingle();

  if (fromProfileIds?.id) {
    const matchedBy = String((fromProfileIds as any).public_id || '').toUpperCase() === normalizedId
      ? 'profiles.public_id'
      : 'profiles.custom_id';
    const displayName = `${String((fromProfileIds as any).first_name || '').trim()} ${String((fromProfileIds as any).last_name || '').trim()}`.trim() || null;
    return {
      userId: fromProfileIds.id,
      query: candidate,
      matchedBy,
      displayName,
      email: String((fromProfileIds as any).email || '') || null,
      phone: String((fromProfileIds as any).phone || '') || null,
      publicId: String((fromProfileIds as any).public_id || '') || null,
      customId: String((fromProfileIds as any).custom_id || '') || null,
    };
  }

  const normalizedEmail = candidate.toLowerCase();
  if (normalizedEmail.includes('@')) {
    const { data: fromEmail } = await supabaseAdmin
      .from('profiles')
      .select('id, email, phone, first_name, last_name, public_id, custom_id')
      .eq('email', normalizedEmail)
      .maybeSingle();

    if (fromEmail?.id) {
      const displayName = `${String((fromEmail as any).first_name || '').trim()} ${String((fromEmail as any).last_name || '').trim()}`.trim() || null;
      return {
        userId: fromEmail.id,
        query: candidate,
        matchedBy: 'profiles.email',
        displayName,
        email: String((fromEmail as any).email || '') || null,
        phone: String((fromEmail as any).phone || '') || null,
        publicId: String((fromEmail as any).public_id || '') || null,
        customId: String((fromEmail as any).custom_id || '') || null,
      };
    }

    const { data: authUser } = await supabaseAdmin
      .schema('auth')
      .from('users')
      .select('id, email, phone')
      .eq('email', normalizedEmail)
      .maybeSingle();

    if (authUser?.id) {
      return {
        userId: authUser.id,
        query: candidate,
        matchedBy: 'auth.users.email',
        displayName: null,
        email: String((authUser as any).email || '') || null,
        phone: String((authUser as any).phone || '') || null,
        publicId: null,
        customId: null,
      };
    }
  }

  const phoneCandidates = normalizePhoneCandidates(candidate);
  if (phoneCandidates.length > 0) {
    const phoneFilter = phoneCandidates.map((p) => `phone.eq.${p}`).join(',');
    const { data: fromPhone } = await supabaseAdmin
      .from('profiles')
      .select('id, email, phone, first_name, last_name, public_id, custom_id')
      .or(phoneFilter)
      .limit(1)
      .maybeSingle();

    if (fromPhone?.id) {
      const displayName = `${String((fromPhone as any).first_name || '').trim()} ${String((fromPhone as any).last_name || '').trim()}`.trim() || null;
      return {
        userId: fromPhone.id,
        query: candidate,
        matchedBy: 'profiles.phone',
        displayName,
        email: String((fromPhone as any).email || '') || null,
        phone: String((fromPhone as any).phone || '') || null,
        publicId: String((fromPhone as any).public_id || '') || null,
        customId: String((fromPhone as any).custom_id || '') || null,
      };
    }

    const authPhoneFilter = phoneCandidates.map((p) => `phone.eq.${p}`).join(',');
    const { data: authPhone } = await supabaseAdmin
      .schema('auth')
      .from('users')
      .select('id, email, phone')
      .or(authPhoneFilter)
      .limit(1)
      .maybeSingle();

    if (authPhone?.id) {
      return {
        userId: authPhone.id,
        query: candidate,
        matchedBy: 'auth.users.phone',
        displayName: null,
        email: String((authPhone as any).email || '') || null,
        phone: String((authPhone as any).phone || '') || null,
        publicId: null,
        customId: null,
      };
    }
  }

  return null;
}

async function resolveRecipientUserId(rawRecipient: string): Promise<string | null> {
  const resolved = await resolveRecipient(rawRecipient);
  return resolved?.userId || null;
}

router.get('/recipient/resolve', verifyJWT, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const query = String(req.query.q || '').trim();
    if (!query) {
      res.status(400).json({ success: false, error: 'q requis (ID public, email, telephone ou UUID)' });
      return;
    }

    const resolved = await resolveRecipient(query);
    if (!resolved) {
      res.status(404).json({ success: false, error: 'Destinataire introuvable' });
      return;
    }

    if (resolved.userId === req.user!.id) {
      res.status(400).json({ success: false, error: 'Transfert vers soi-meme non autorise' });
      return;
    }

    res.json({ success: true, data: resolved });
  } catch (error: any) {
    logger.error(`Wallet recipient resolve error: ${error.message}`);
    res.status(500).json({ success: false, error: 'Erreur lors de la resolution du destinataire' });
  }
});

/**
 * POST /api/v2/wallet/transfer/preview
 * Prévisualisation d'un transfert wallet (frais, solde après, informations destinataire).
 * Entièrement côté backend Node.js (plus de dépendance Edge Function wallet-transfer).
 */
router.post('/transfer/preview', verifyJWT, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const senderId = req.user!.id;
    const { amount, recipient_id } = req.body || {};

    if (!amount || typeof amount !== 'number' || amount <= 0) {
      res.status(400).json({ success: false, error: 'Montant invalide' });
      return;
    }
    if (!recipient_id || typeof recipient_id !== 'string') {
      res.status(400).json({ success: false, error: 'recipient_id requis' });
      return;
    }

    const resolved = await resolveRecipient(recipient_id);
    if (!resolved) {
      res.status(404).json({ success: false, error: 'Destinataire introuvable' });
      return;
    }

    if (resolved.userId === senderId) {
      res.status(400).json({ success: false, error: 'Transfert vers soi-même non autorisé' });
      return;
    }

    const [{ data: senderWallet, error: senderWalletError }, { data: receiverWallet, error: receiverWalletError }] = await Promise.all([
      supabaseAdmin
        .from('wallets')
        .select('id, balance, currency, user_id')
        .eq('user_id', senderId)
        .maybeSingle(),
      supabaseAdmin
        .from('wallets')
        .select('id, balance, currency, user_id')
        .eq('user_id', resolved.userId)
        .maybeSingle(),
    ]);

    if (senderWalletError || !senderWallet) {
      res.status(404).json({ success: false, error: 'Wallet expéditeur introuvable' });
      return;
    }

    let recipientWallet = receiverWallet;
    if (receiverWalletError || !recipientWallet) {
      const { data: createdWallet, error: createWalletError } = await supabaseAdmin
        .from('wallets')
        .insert({ user_id: resolved.userId })
        .select('id, balance, currency, user_id')
        .single();

      if (createWalletError || !createdWallet) {
        res.status(404).json({ success: false, error: 'Wallet destinataire introuvable' });
        return;
      }

      recipientWallet = createdWallet as any;
    }

    const feePercentage = 1;
    const feeAmount = Math.ceil(amount * (feePercentage / 100));
    const totalDebit = amount + feeAmount;
    const senderBalance = Number((senderWallet as any).balance || 0);

    if (senderBalance < totalDebit) {
      res.status(402).json({ success: false, error: 'Solde insuffisant' });
      return;
    }

    const senderCurrency = String((senderWallet as any).currency || 'GNF');
    const receiverCurrency = String((recipientWallet as any).currency || senderCurrency);
    const isInternational = senderCurrency !== receiverCurrency;
    const rateDisplayed = 1;
    const amountAfterFee = amount;
    const amountReceived = amountAfterFee;

    res.json({
      success: true,
      is_international: isInternational,
      sender: {
        id: senderId,
        name: null,
        email: req.user?.email || null,
        phone: null,
        custom_id: null,
      },
      receiver: {
        id: resolved.userId,
        name: resolved.displayName,
        email: resolved.email,
        phone: resolved.phone,
        custom_id: resolved.customId || resolved.publicId || null,
      },
      receiver_name: resolved.displayName,
      receiver_email: resolved.email,
      receiver_phone: resolved.phone,
      receiver_code: resolved.customId || resolved.publicId || resolved.userId,
      amount_sent: amount,
      currency_sent: senderCurrency,
      fee_percentage: feePercentage,
      fee_amount: feeAmount,
      amount_after_fee: amountAfterFee,
      total_debit: totalDebit,
      amount_received: amountReceived,
      currency_received: receiverCurrency,
      rate_displayed: rateDisplayed,
      sender_balance: senderBalance,
      balance_after: senderBalance - totalDebit,
      sender_country: null,
      receiver_country: null,
      commission_conversion: 0,
      frais_international: 0,
      rate_lock_seconds: 60,
    });
  } catch (error: any) {
    logger.error(`Wallet transfer preview error: ${error.message}`);
    res.status(500).json({ success: false, error: 'Erreur lors de la prévisualisation du transfert' });
  }
});

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
      .select('id, balance, currency, wallet_status, is_blocked, blocked_reason, blocked_at, biometric_enabled, daily_limit, monthly_limit, created_at, updated_at, pin_enabled, pin_failed_attempts, pin_locked_until, pin_updated_at')
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

router.get('/pin/status', verifyJWT, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const wallet = await ensureWalletExistsForPin(req.user!.id);
    res.json({
      success: true,
      data: {
        pin_enabled: Boolean(wallet?.pin_enabled),
        pin_failed_attempts: Number(wallet?.pin_failed_attempts || 0),
        pin_locked_until: wallet?.pin_locked_until || null,
        pin_updated_at: wallet?.pin_updated_at || null,
        policy: getWalletPinPolicy(),
      },
    });
  } catch (error: any) {
    logger.error(`Wallet pin status error: ${error.message}`);
    res.status(500).json({ success: false, error: 'Erreur lors du chargement du statut PIN' });
  }
});

router.post('/pin/setup', verifyJWT, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { pin, confirm_pin, confirmPin } = req.body || {};
    const confirmPinValue = confirm_pin ?? confirmPin;

    if (typeof pin !== 'string' || typeof confirmPinValue !== 'string') {
      res.status(400).json({ success: false, error: 'pin et confirm_pin requis' });
      return;
    }
    if (pin !== confirmPinValue) {
      res.status(400).json({ success: false, error: 'Les deux codes PIN ne correspondent pas' });
      return;
    }

    await setupWalletPin(req.user!.id, pin);
    res.json({ success: true, message: 'Code PIN configuré avec succès' });
  } catch (error: any) {
    logger.error(`Wallet pin setup error: ${error.message}`);
    res.status(400).json({ success: false, error: error.message || 'Erreur lors de la configuration du code PIN' });
  }
});

router.post('/pin/change', verifyJWT, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { current_pin, new_pin, confirm_pin, currentPin, newPin, confirmPin } = req.body || {};
    const currentPinValue = current_pin ?? currentPin;
    const newPinValue = new_pin ?? newPin;
    const confirmPinValue = confirm_pin ?? confirmPin;

    if (typeof currentPinValue !== 'string' || typeof newPinValue !== 'string' || typeof confirmPinValue !== 'string') {
      res.status(400).json({ success: false, error: 'current_pin, new_pin et confirm_pin requis' });
      return;
    }
    if (newPinValue !== confirmPinValue) {
      res.status(400).json({ success: false, error: 'Le nouveau code PIN et sa confirmation ne correspondent pas' });
      return;
    }

    await changeWalletPin(req.user!.id, currentPinValue, newPinValue);
    res.json({ success: true, message: 'Code PIN modifié avec succès' });
  } catch (error: any) {
    logger.error(`Wallet pin change error: ${error.message}`);
    res.status(400).json({ success: false, error: error.message || 'Erreur lors du changement du code PIN' });
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
      await emitCoreFeatureEvent({
        featureKey: 'wallet.deposit',
        coreEngine: 'payment',
        ownerModule: 'wallet',
        criticality: 'high',
        status: 'failure',
        userId,
        payload: { amount, error: result.error || 'deposit_failed' },
      });
      res.status(400).json({ success: false, error: result.error });
      return;
    }

    // Déclencher commissions affiliées
    await triggerAffiliateCommission(userId, amount, 'deposit', ref);

    logger.info(`[WalletV2] Deposit: user=${userId}, amount=${amount}`);
    await emitCoreFeatureEvent({
      featureKey: 'wallet.deposit',
      coreEngine: 'payment',
      ownerModule: 'wallet',
      criticality: 'high',
      status: 'success',
      userId,
      payload: { amount },
    });
    res.json({ success: true, new_balance: result.newBalance, operation: 'deposit' });
  } catch (error: any) {
    logger.error(`Wallet deposit error: ${error.message}`);
    await emitCoreFeatureEvent({
      featureKey: 'wallet.deposit',
      coreEngine: 'payment',
      ownerModule: 'wallet',
      criticality: 'high',
      status: 'failure',
      userId: req.user?.id || null,
      payload: { error: error.message },
    });
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
    const { amount, description, idempotency_key, pin } = req.body || {};

    if (!amount || typeof amount !== 'number' || amount <= 0) {
      res.status(400).json({ success: false, error: 'Montant invalide' });
      return;
    }

    const pinCheck = await requireValidTransactionPin(userId, pin);
    if (!pinCheck.ok) {
      await emitCoreFeatureEvent({
        featureKey: 'wallet.withdraw',
        coreEngine: 'payment',
        ownerModule: 'wallet',
        criticality: 'critical',
        status: 'failure',
        userId,
        payload: { amount, reason: pinCheck.error || 'pin_invalid' },
      });
      res.status(403).json({ success: false, error: pinCheck.error, locked_until: pinCheck.lockedUntil || null });
      return;
    }

    const idemKey = idempotency_key || `withdraw:${userId}:${amount}:${crypto.randomBytes(8).toString('hex')}`;

    const result = await debitWallet(userId, amount, description || 'Retrait', idemKey);

    if (!result.success) {
      await emitCoreFeatureEvent({
        featureKey: 'wallet.withdraw',
        coreEngine: 'payment',
        ownerModule: 'wallet',
        criticality: 'critical',
        status: 'failure',
        userId,
        payload: { amount, error: result.error || 'withdraw_failed' },
      });
      const statusCode = result.error === 'Solde insuffisant' ? 402
        : result.error === 'Wallet bloqué' ? 403
        : result.error?.includes('activité suspecte') ? 403
        : 400;
      res.status(statusCode).json({ success: false, error: result.error });
      return;
    }

    logger.info(`[WalletV2] Withdraw: user=${userId}, amount=${amount}`);
    await emitCoreFeatureEvent({
      featureKey: 'wallet.withdraw',
      coreEngine: 'payment',
      ownerModule: 'wallet',
      criticality: 'critical',
      status: 'success',
      userId,
      payload: { amount },
    });
    res.json({ success: true, new_balance: result.newBalance, operation: 'withdraw' });
  } catch (error: any) {
    logger.error(`Wallet withdraw error: ${error.message}`);
    await emitCoreFeatureEvent({
      featureKey: 'wallet.withdraw',
      coreEngine: 'payment',
      ownerModule: 'wallet',
      criticality: 'critical',
      status: 'failure',
      userId: req.user?.id || null,
      payload: { error: error.message },
    });
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
    const { amount, recipient_id, description, idempotency_key, pin } = req.body || {};

    if (!amount || typeof amount !== 'number' || amount <= 0) {
      res.status(400).json({ success: false, error: 'Montant invalide' });
      return;
    }
    if (!recipient_id || typeof recipient_id !== 'string') {
      res.status(400).json({ success: false, error: 'recipient_id requis' });
      return;
    }

    const resolvedRecipientId = await resolveRecipientUserId(recipient_id);
    if (!resolvedRecipientId) {
      res.status(404).json({ success: false, error: 'Destinataire introuvable (UUID, ID public, email ou téléphone)' });
      return;
    }

    if (resolvedRecipientId === senderId) {
      res.status(400).json({ success: false, error: 'Transfert vers soi-même non autorisé' });
      return;
    }

    const pinCheck = await requireValidTransactionPin(senderId, pin);
    if (!pinCheck.ok) {
      await emitCoreFeatureEvent({
        featureKey: 'wallet.transfer',
        coreEngine: 'payment',
        ownerModule: 'wallet',
        criticality: 'critical',
        status: 'failure',
        userId: senderId,
        payload: { amount, recipient_id, resolved_recipient_id: resolvedRecipientId, reason: pinCheck.error || 'pin_invalid' },
      });
      res.status(403).json({ success: false, error: pinCheck.error, locked_until: pinCheck.lockedUntil || null });
      return;
    }

    // Vérifier que le destinataire existe
    let { data: recipient } = await supabaseAdmin
      .from('wallets')
      .select('user_id')
      .eq('user_id', resolvedRecipientId)
      .maybeSingle();

    if (!recipient) {
      // Auto-initialiser le wallet destinataire pour éviter les échecs sur comptes PDG/agent nouvellement créés
      const { error: initError } = await supabaseAdmin
        .from('wallets')
        .insert({ user_id: resolvedRecipientId })
        .select('user_id')
        .single();

      if (initError) {
        res.status(404).json({ success: false, error: 'Wallet destinataire introuvable' });
        return;
      }

      recipient = { user_id: resolvedRecipientId } as any;
    }

    const idemKey = idempotency_key || `transfer:${senderId}:${resolvedRecipientId}:${amount}:${crypto.randomBytes(8).toString('hex')}`;

    const result = await transferBetweenWallets(senderId, resolvedRecipientId, amount, description || 'Transfert', idemKey);

    if (!result.success) {
      await emitCoreFeatureEvent({
        featureKey: 'wallet.transfer',
        coreEngine: 'payment',
        ownerModule: 'wallet',
        criticality: 'critical',
        status: 'failure',
        userId: senderId,
        payload: { amount, recipient_id, resolved_recipient_id: resolvedRecipientId, error: result.error || 'transfer_failed' },
      });
      const statusCode = result.error === 'Solde insuffisant' ? 402
        : result.error?.includes('bloqué') ? 403
        : 400;
      res.status(statusCode).json({ success: false, error: result.error });
      return;
    }

    logger.info(`[WalletV2] Transfer: sender=${senderId}, receiver=${resolvedRecipientId}, amount=${amount}`);
    await emitCoreFeatureEvent({
      featureKey: 'wallet.transfer',
      coreEngine: 'payment',
      ownerModule: 'wallet',
      criticality: 'critical',
      status: 'success',
      userId: senderId,
      payload: { amount, recipient_id, resolved_recipient_id: resolvedRecipientId },
    });
    res.json({ success: true, transaction_id: result.transactionId, operation: 'transfer' });
  } catch (error: any) {
    logger.error(`Wallet transfer error: ${error.message}`);
    await emitCoreFeatureEvent({
      featureKey: 'wallet.transfer',
      coreEngine: 'payment',
      ownerModule: 'wallet',
      criticality: 'critical',
      status: 'failure',
      userId: req.user?.id || null,
      payload: { error: error.message },
    });
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

/**
 * GET /api/v2/wallet/admin/fx-health
 * Dashboard FX pour PDG/Admin (fraicheur + alertes + sources bancaires)
 */
router.get(
  '/admin/fx-health',
  verifyJWT,
  requirePermissionOrRole({
    permissionKey: 'manage_wallet_transactions',
    allowedRoles: ['admin', 'pdg', 'ceo'],
  }),
  async (_req: AuthenticatedRequest, res: Response) => {
    try {
      const now = Date.now();
      // Conakry uses UTC+0; use UTC start-of-day to avoid host machine/local timezone drift.
      const startOfDay = new Date();
      startOfDay.setUTCHours(0, 0, 0, 0);
      const startOfDayIso = startOfDay.toISOString();

      const [{ data: latestAnyRate }, { data: latestUsdGnfRate }, { data: recentRuns }, { data: unresolvedAlerts }, { data: todayRates }] = await Promise.all([
        supabaseAdmin
          .from('currency_exchange_rates')
          .select('from_currency, to_currency, rate, margin, source_type, source_url, retrieved_at')
          .eq('is_active', true)
          .order('retrieved_at', { ascending: false })
          .limit(1)
          .maybeSingle(),
        supabaseAdmin
          .from('currency_exchange_rates')
          .select('from_currency, to_currency, rate, margin, source_type, source_url, retrieved_at')
          .eq('is_active', true)
          .eq('from_currency', 'USD')
          .eq('to_currency', 'GNF')
          .order('retrieved_at', { ascending: false })
          .limit(1)
          .maybeSingle(),
        supabaseAdmin
          .from('fx_collection_log')
          .select('currency_code, status, source, source_url, source_type, error_message, collected_at')
          .order('collected_at', { ascending: false })
          .limit(30),
        supabaseAdmin
          .from('financial_security_alerts')
          .select('id, alert_type, severity, title, description, created_at, metadata')
          .like('alert_type', 'fx_%')
          .eq('is_resolved', false)
          .order('created_at', { ascending: false })
          .limit(20),
        supabaseAdmin
          .from('currency_exchange_rates')
          .select('from_currency, to_currency, rate, margin, source_type, source_url, retrieved_at')
          .eq('is_active', true)
          .gte('retrieved_at', startOfDayIso)
          .order('retrieved_at', { ascending: false })
          .limit(200),
      ]);

      const currentRate = latestUsdGnfRate || latestAnyRate;
      const lastRetrievedAt = currentRate?.retrieved_at ? new Date(currentRate.retrieved_at).getTime() : null;
      const ageMinutes = lastRetrievedAt ? Math.floor((now - lastRetrievedAt) / 60000) : null;
      const staleThresholdMinutes = 90;
      const stale = ageMinutes === null || ageMinutes > staleThresholdMinutes;

      const runRows = recentRuns || [];
      const recentGnfRuns = runRows
        .filter((row) => row.currency_code === 'GNF')
        .slice(0, 2);
      const twoConsecutiveFailures = recentGnfRuns.length >= 2 && recentGnfRuns.every((row) => !isFxSuccessStatus(row.status));

      const bankSources = Array.from(new Map(
        runRows
          .filter((row) => isAfricanBankRow(row))
          .map((row) => {
            const resolvedSourceUrl = resolveOfficialBankSourceUrl(row);
            return [resolvedSourceUrl || `${row.source || 'source'}:${row.source_type || 'type'}`, {
            source: row.source,
            source_type: row.source_type,
            source_url: resolvedSourceUrl,
            last_seen_at: row.collected_at,
            }];
          })
      ).values());

      const hasBcrgSource = bankSources.some((source) => String(source?.source_url || '').includes('bcrg-guinee.org'));
      if (!hasBcrgSource) {
        bankSources.unshift({
          source: 'Banque Centrale de Guinee (BCRG)',
          source_type: 'official_html',
          source_url: BCRG_OFFICIAL_URL,
          last_seen_at: currentRate?.retrieved_at || null,
        });
      }

        const todaysHistory = (todayRates || [])
        .filter((rate: any) => isAfricanBankRow(rate))
        .map((rate: any) => ({
          from_currency: rate.from_currency,
          to_currency: rate.to_currency,
          rate: rate.rate,
          margin: rate.margin,
          source_type: rate.source_type,
          source_url: resolveOfficialBankSourceUrl(rate),
          retrieved_at: rate.retrieved_at,
        }));

      const gnfTodayHistory = todaysHistory.filter((rate: any) => rate.from_currency === 'GNF' || rate.to_currency === 'GNF');

      res.json({
        success: true,
        data: {
          timezone: 'Africa/Conakry',
          start_of_day_iso: startOfDayIso,
          stale_threshold_minutes: staleThresholdMinutes,
          is_stale: stale,
          age_minutes: ageMinutes,
          last_rate: currentRate || null,
          two_consecutive_failures: twoConsecutiveFailures,
          current_rate: currentRate || null,
          recent_runs: runRows.slice(0, 10),
          today_history: todaysHistory,
          gnf_today_history: gnfTodayHistory,
          bank_sources: bankSources,
          active_alerts: unresolvedAlerts || [],
        },
      });
    } catch (error: any) {
      logger.error(`FX health error: ${error.message}`);
      res.status(500).json({ success: false, error: 'Erreur lors du chargement du monitoring FX' });
    }
  }
);

/**
 * GET /api/v2/wallet/admin/fx-conversion-stats
 * Statistiques conversions/transferts: volume utilisateur, pays et corridors pays->pays
 */
router.get(
  '/admin/fx-conversion-stats',
  verifyJWT,
  requirePermissionOrRole({
    permissionKey: 'manage_wallet_transactions',
    allowedRoles: ['admin', 'pdg', 'ceo'],
  }),
  async (_req: AuthenticatedRequest, res: Response) => {
    try {
      const windowHours = 24;
      const sinceIso = new Date(Date.now() - windowHours * 3600000).toISOString();

      const [{ data: txRows }, { data: wallets }, { data: profiles }] = await Promise.all([
        supabaseAdmin
          .from('wallet_transactions')
          .select('id, sender_wallet_id, receiver_wallet_id, amount, transaction_type, created_at')
          .eq('status', 'completed')
          .gte('created_at', sinceIso)
          .order('created_at', { ascending: false })
          .limit(5000),
        supabaseAdmin
          .from('wallets')
          .select('id, user_id, currency'),
        supabaseAdmin
          .from('profiles')
          .select('id, country, email, first_name, last_name'),
      ]);

      const walletMap = new Map((wallets || []).map((w: any) => [w.id, w]));
      const profileMap = new Map((profiles || []).map((p: any) => [p.id, p]));

      const byUser = new Map<string, { user_id: string; user_label: string; country: string; conversions_count: number; total_amount: number }>();
      const byCountry = new Map<string, { country: string; conversions_count: number; total_amount: number }>();
      const countryCorridors = new Map<string, { from_country: string; to_country: string; conversions_count: number; total_amount: number }>();

      let totalConversions = 0;
      let internationalConversions = 0;

      for (const tx of txRows || []) {
        if (tx.transaction_type !== 'transfer') continue;

        const senderWallet = walletMap.get(tx.sender_wallet_id);
        const receiverWallet = walletMap.get(tx.receiver_wallet_id);
        if (!senderWallet || !receiverWallet) continue;

        const senderProfile = profileMap.get(senderWallet.user_id);
        const receiverProfile = profileMap.get(receiverWallet.user_id);

        const senderCountry = String(senderProfile?.country || mapCurrencyToCountry(senderWallet.currency || null));
        const receiverCountry = String(receiverProfile?.country || mapCurrencyToCountry(receiverWallet.currency || null));
        const amount = Number(tx.amount || 0);

        totalConversions += 1;
        if (senderCountry !== receiverCountry) internationalConversions += 1;

        const senderName = `${String(senderProfile?.first_name || '').trim()} ${String(senderProfile?.last_name || '').trim()}`.trim();
        const senderLabel = senderName || String(senderProfile?.email || senderWallet.user_id);

        const currentUser = byUser.get(senderWallet.user_id) || {
          user_id: senderWallet.user_id,
          user_label: senderLabel,
          country: senderCountry,
          conversions_count: 0,
          total_amount: 0,
        };
        currentUser.conversions_count += 1;
        currentUser.total_amount += amount;
        byUser.set(senderWallet.user_id, currentUser);

        const senderCountryStats = byCountry.get(senderCountry) || {
          country: senderCountry,
          conversions_count: 0,
          total_amount: 0,
        };
        senderCountryStats.conversions_count += 1;
        senderCountryStats.total_amount += amount;
        byCountry.set(senderCountry, senderCountryStats);

        const corridorKey = `${senderCountry}=>${receiverCountry}`;
        const corridorStats = countryCorridors.get(corridorKey) || {
          from_country: senderCountry,
          to_country: receiverCountry,
          conversions_count: 0,
          total_amount: 0,
        };
        corridorStats.conversions_count += 1;
        corridorStats.total_amount += amount;
        countryCorridors.set(corridorKey, corridorStats);
      }

      res.json({
        success: true,
        data: {
          window_hours: windowHours,
          total_conversions: totalConversions,
          international_conversions: internationalConversions,
          by_user: Array.from(byUser.values()).sort((a, b) => b.conversions_count - a.conversions_count).slice(0, 50),
          by_country: Array.from(byCountry.values()).sort((a, b) => b.conversions_count - a.conversions_count),
          country_corridors: Array.from(countryCorridors.values()).sort((a, b) => b.conversions_count - a.conversions_count).slice(0, 100),
        },
      });
    } catch (error: any) {
      logger.error(`FX conversion stats error: ${error.message}`);
      res.status(500).json({ success: false, error: 'Erreur lors du chargement des stats de conversion' });
    }
  }
);

/**
 * POST /api/v2/wallet/admin/fx-rate-alert-check
 * Bouton alerte: crée une alerte si un changement de taux est détecté en moins d'1h.
 */
router.post(
  '/admin/fx-rate-alert-check',
  verifyJWT,
  requirePermissionOrRole({
    permissionKey: 'manage_wallet_transactions',
    allowedRoles: ['admin', 'pdg', 'ceo'],
  }),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { data: rateRows } = await supabaseAdmin
        .from('currency_exchange_rates')
        .select('from_currency, to_currency, rate, source_url, retrieved_at')
        .eq('is_active', true)
        .order('retrieved_at', { ascending: false })
        .limit(100);

      const validRates = (rateRows || []).filter((r: any) => isAfricanBankSourceUrl(r?.source_url));
      if (validRates.length < 2) {
        res.json({ success: true, data: { alert_created: false, reason: 'not_enough_data' } });
        return;
      }

      const latest = validRates[0] as any;
      const previous = validRates.find((r: any) => r.from_currency === latest.from_currency && r.to_currency === latest.to_currency && r.retrieved_at !== latest.retrieved_at) as any;
      if (!previous) {
        res.json({ success: true, data: { alert_created: false, reason: 'no_previous_same_pair' } });
        return;
      }

      const latestTs = latest.retrieved_at ? new Date(latest.retrieved_at).getTime() : 0;
      const previousTs = previous.retrieved_at ? new Date(previous.retrieved_at).getTime() : 0;
      const minutesBetween = Math.abs(latestTs - previousTs) / 60000;

      const latestRate = Number(latest.rate || 0);
      const previousRate = Number(previous.rate || 0);
      const changed = latestRate > 0 && previousRate > 0 && latestRate !== previousRate;
      const changedUnderOneHour = changed && minutesBetween <= 60;

      let alertCreated = false;
      if (changedUnderOneHour) {
        const thresholdIso = new Date(Date.now() - 60 * 60000).toISOString();
        const { data: existing } = await supabaseAdmin
          .from('financial_security_alerts')
          .select('id')
          .eq('alert_type', 'fx_rate_change_under_1h')
          .eq('is_resolved', false)
          .gte('created_at', thresholdIso)
          .limit(1)
          .maybeSingle();

        if (!existing) {
          await supabaseAdmin.from('financial_security_alerts').insert({
            user_id: SYSTEM_USER_ID,
            alert_type: 'fx_rate_change_under_1h',
            severity: 'high',
            title: 'Changement de taux detecte en moins d\'1 heure',
            description: `${latest.from_currency}/${latest.to_currency} a change de ${previousRate} a ${latestRate} en ${Math.round(minutesBetween)} minutes.`,
            metadata: {
              actor_id: req.user!.id,
              latest,
              previous,
              minutes_between: Math.round(minutesBetween),
            },
          }).catch(() => {});
          alertCreated = true;
        }
      }

      res.json({
        success: true,
        data: {
          alert_created: alertCreated,
          changed_under_one_hour: changedUnderOneHour,
          minutes_between: Math.round(minutesBetween),
          latest,
          previous,
        },
      });
    } catch (error: any) {
      logger.error(`FX rate alert check error: ${error.message}`);
      res.status(500).json({ success: false, error: 'Erreur lors de la verification d\'alerte FX' });
    }
  }
);

/**
 * POST /api/v2/wallet/admin/fx-refresh
 * Déclenche manuellement une collecte des taux (PDG/Admin)
 */
router.post(
  '/admin/fx-refresh',
  verifyJWT,
  requirePermissionOrRole({
    permissionKey: 'manage_wallet_transactions',
    allowedRoles: ['admin', 'pdg', 'ceo'],
  }),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const functionUrl = `${process.env.SUPABASE_URL}/functions/v1/african-fx-collect`;
      const response = await fetch(functionUrl, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY || ''}`,
          apikey: process.env.SUPABASE_SERVICE_ROLE_KEY || '',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          source: 'pdg_manual_refresh',
          actor_id: req.user!.id,
          strict_african_sources: true,
          include_all_african_banks: true,
          primary_source_url: BCRG_OFFICIAL_URL,
          preferred_currency_pairs: [
            { from: 'USD', to: 'GNF' },
            { from: 'EUR', to: 'GNF' },
          ],
          bcrg_source_urls: [
            BCRG_OFFICIAL_URL,
          ],
          preferred_source_urls: AFRICAN_BANK_SOURCE_URLS,
        }),
      });

      const raw = await response.text();
      let payload: any = null;
      try {
        payload = raw ? JSON.parse(raw) : null;
      } catch {
        payload = { raw };
      }

      if (!response.ok) {
        await supabaseAdmin.from('financial_security_alerts').insert({
          user_id: SYSTEM_USER_ID,
          alert_type: 'fx_manual_refresh_failed',
          severity: 'high',
          title: 'Échec du refresh FX manuel',
          description: 'Le déclenchement manuel de la collecte FX a échoué.',
          metadata: {
            actor_id: req.user!.id,
            status: response.status,
            error: payload?.error || payload?.message || 'unknown',
          },
        }).catch(() => {});

        res.status(response.status).json({
          success: false,
          error: payload?.error || payload?.message || 'Le refresh FX manuel a échoué',
        });
        return;
      }

      res.json({ success: true, data: payload });
    } catch (error: any) {
      logger.error(`FX manual refresh error: ${error.message}`);
      res.status(500).json({ success: false, error: 'Erreur lors du refresh FX manuel' });
    }
  }
);

export default router;
