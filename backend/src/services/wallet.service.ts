/**
 * 💰 WALLET SERVICE - Centralisé côté Node.js
 *
 * Responsabilités :
 *  - Crédit wallet (deposit, paiement reçu)
 *  - Débit wallet avec vérification solde + verrouillage optimiste
 *  - Transfert P2P atomic via RPC SQL existant
 *  - Idempotence anti double-paiement
 *  - Détection activité suspecte (volume 24h)
 *
 * Migré depuis l'Edge Function wallet-operations
 */

import { supabaseAdmin } from '../config/supabase.js';
import { logger } from '../config/logger.js';
import { countryToCurrency } from '../utils/countryToCurrency.js';

const ZERO_DECIMAL_CURRENCIES = new Set([
  'GNF', 'XOF', 'XAF', 'VND', 'IDR', 'KRW', 'JPY', 'CLP', 'UGX', 'RWF',
  'PYG', 'COP', 'HUF', 'ISK', 'BIF', 'DJF', 'KMF', 'MGA', 'VUV',
]);

type TransferExecutionOptions = {
  amountToCredit?: number;
  senderCurrency?: string;
  receiverCurrency?: string;
  isInternational?: boolean;
  rateUsed?: number;
  rateSource?: string;
  feeAmount?: number;
  senderWalletId?: string;
  receiverWalletId?: string;
};

type TransferWallet = {
  id: string;
  balance: number;
  is_blocked?: boolean | null;
  currency?: string | null;
};

async function ensureWalletForTransfer(userId: string, fallbackCurrency = 'GNF'): Promise<TransferWallet | null> {
  const { data: existingWallet, error: existingError } = await supabaseAdmin
    .from('wallets')
    .select('id, balance, is_blocked, currency')
    .eq('user_id', userId)
    .order('updated_at', { ascending: false })
    .maybeSingle();

  if (existingWallet) return existingWallet as TransferWallet;

  if (existingError) {
    logger.warn(`[Wallet] Wallet lookup failed before auto-create for ${userId}: ${existingError.message}`);
  }

  // Déterminer la devise selon le pays du profil
  const { data: profile } = await supabaseAdmin
    .from('profiles')
    .select('detected_country, country, detected_currency')
    .eq('id', userId)
    .maybeSingle();

  const userCountry = (profile as any)?.detected_country || (profile as any)?.country || 'GN';
  const resolvedCurrency = ((profile as any)?.detected_currency && (profile as any).detected_currency !== 'GNF')
    ? (profile as any).detected_currency
    : countryToCurrency(userCountry) || fallbackCurrency;

  const { data: createdWallet, error: createError } = await supabaseAdmin
    .from('wallets')
    .insert({
      user_id: userId,
      balance: 0,
      currency: resolvedCurrency,
      currency_locked: true,
      currency_locked_at: new Date().toISOString(),
      currency_lock_reason: `Devise assignée selon pays de résidence: ${userCountry}`,
    })
    .select('id, balance, is_blocked, currency')
    .single();

  if (createError || !createdWallet) {
    logger.error(`[Wallet] Wallet auto-create failed for ${userId}: ${createError?.message || 'no wallet returned'}`);
    return null;
  }

  return createdWallet as TransferWallet;
}

function smartRoundTransferAmount(amount: number, currency: string): number {
  if (!Number.isFinite(amount)) return 0;
  return ZERO_DECIMAL_CURRENCIES.has(String(currency || '').toUpperCase())
    ? Math.round(amount)
    : Math.round(amount * 100) / 100;
}

async function persistTransferHistory(params: {
  transactionId?: string;
  senderId: string;
  receiverId: string;
  senderWalletId: string;
  receiverWalletId: string;
  amountSent: number;
  amountReceived: number;
  description: string;
  idempotencyKey: string;
  senderCurrency: string;
  receiverCurrency: string;
  isInternational: boolean;
  rateUsed: number;
  rateSource: string;
  feeAmount: number;
}) {
  const {
    transactionId,
    senderId,
    receiverId,
    senderWalletId,
    receiverWalletId,
    amountSent,
    amountReceived,
    description,
    idempotencyKey,
    senderCurrency,
    receiverCurrency,
    isInternational,
    rateUsed,
    rateSource,
    feeAmount,
  } = params;

  // Résoudre les noms des profils sender/receiver pour l'historique
  let senderName = 'Expéditeur';
  let receiverName = 'Destinataire';
  try {
    const [senderProfile, receiverProfile] = await Promise.all([
      supabaseAdmin.from('profiles').select('full_name, first_name, last_name, custom_id').eq('id', senderId).maybeSingle(),
      supabaseAdmin.from('profiles').select('full_name, first_name, last_name, custom_id').eq('id', receiverId).maybeSingle(),
    ]);
    if (senderProfile.data) {
      const p = senderProfile.data as any;
      senderName = p.full_name || [p.first_name, p.last_name].filter(Boolean).join(' ') || p.custom_id || senderName;
    }
    if (receiverProfile.data) {
      const p = receiverProfile.data as any;
      receiverName = p.full_name || [p.first_name, p.last_name].filter(Boolean).join(' ') || p.custom_id || receiverName;
    }
  } catch {
    // profils non critiques — on continue sans noms
  }

  const metadata = {
    idempotency_key: idempotencyKey,
    source: 'backend-node',
    description,
    is_international: isInternational,
    amount_sent: amountSent,
    amount_received: amountReceived,
    sender_currency: senderCurrency,
    receiver_currency: receiverCurrency,
    rate_used: rateUsed,
    rate_source: rateSource,
    fee_amount: feeAmount,
    sender_name: senderName,
    receiver_name: receiverName,
  };

  // 'international_transfer' n'existe pas dans l'enum PostgreSQL — on utilise toujours
  // 'transfer_out' et on stocke is_international dans metadata
  const outType = 'transfer_out' as const;
  const ts = Date.now();
  const rand = () => Math.random().toString(36).slice(2, 8).toUpperCase();
  const txIdOut = `TRF-OUT-${ts}-${rand()}`;
  const txIdIn  = `TRF-IN-${ts}-${rand()}`;

  const walletTxPromise = Promise.all([
    supabaseAdmin.from('wallet_transactions').insert({
      transaction_id: txIdOut,
      sender_wallet_id: senderWalletId,
      receiver_wallet_id: receiverWalletId,
      sender_user_id: senderId,
      receiver_user_id: receiverId,
      transaction_type: outType,
      amount: amountSent,
      fee: feeAmount,
      net_amount: amountSent - feeAmount,
      currency: senderCurrency,
      status: 'completed',
      description,
      metadata,
    }),
    supabaseAdmin.from('wallet_transactions').insert({
      transaction_id: txIdIn,
      sender_wallet_id: senderWalletId,
      receiver_wallet_id: receiverWalletId,
      sender_user_id: senderId,
      receiver_user_id: receiverId,
      transaction_type: 'transfer_in',
      amount: amountReceived,
      fee: 0,
      net_amount: amountReceived,
      currency: receiverCurrency,
      status: 'completed',
      description,
      metadata,
    }),
  ]);

  const persistEnhancedHistory = async () => {
    const enhancedPayload = {
      sender_id: senderId,
      receiver_id: receiverId,
      amount: amountSent,
      method: outType,
      status: 'completed',
      currency: senderCurrency,
      metadata,
    };

    if (transactionId) {
      const { data: updatedRows, error: updateError } = await supabaseAdmin
        .from('enhanced_transactions')
        .update(enhancedPayload)
        .eq('id', transactionId)
        .select('id');

      if (updateError) {
        return { error: updateError };
      }

      if (Array.isArray(updatedRows) && updatedRows.length > 0) {
        return { error: null };
      }

      const { error: insertWithIdError } = await supabaseAdmin
        .from('enhanced_transactions')
        .insert({
          id: transactionId,
          ...enhancedPayload,
        });

      if (!insertWithIdError) {
        return { error: null };
      }
    }

    const { error: insertError } = await supabaseAdmin
      .from('enhanced_transactions')
      .insert(enhancedPayload);

    return { error: insertError };
  };

  const [walletTxResults, enhancedTxResult] = await Promise.all([
    walletTxPromise,
    persistEnhancedHistory(),
  ]);

  for (const walletTxResult of walletTxResults) {
    if (walletTxResult?.error) {
      logger.warn(`[Wallet] wallet_transactions history insert failed: ${walletTxResult.error.message}`);
    }
  }
  if (enhancedTxResult?.error) {
    logger.warn(`[Wallet] enhanced_transactions history write failed: ${enhancedTxResult.error.message}`);
  }
}

// ─────────────────────────────────────────────────────────
// IDEMPOTENCY
// ─────────────────────────────────────────────────────────

export async function checkIdempotency(idempotencyKey: string): Promise<boolean> {
  try {
    const { data } = await supabaseAdmin
      .from('wallet_idempotency_keys')
      .select('id')
      .eq('idempotency_key', idempotencyKey)
      .maybeSingle();
    return !!data;
  } catch {
    return false;
  }
}

async function recordIdempotencyKey(
  idempotencyKey: string,
  userId: string,
  operation: string
): Promise<void> {
  try {
    await supabaseAdmin.from('wallet_idempotency_keys').insert({
      idempotency_key: idempotencyKey,
      user_id: userId,
      operation,
      created_at: new Date().toISOString(),
      expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
    });
  } catch {
    // Non-blocking — idempotency key may already exist (race condition)
  }
}

// ─────────────────────────────────────────────────────────
// SUSPICIOUS ACTIVITY DETECTION
// ─────────────────────────────────────────────────────────

async function detectSuspiciousActivity(
  userId: string,
  amount: number
): Promise<{ suspicious: boolean; shouldBlock: boolean; flags: string[]; severity: string }> {
  try {
    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const { data: recentLogs } = await supabaseAdmin
      .from('wallet_logs')
      .select('amount')
      .eq('user_id', userId)
      .gte('created_at', yesterday);

    const total24h = (recentLogs || []).reduce((s: number, l: any) => s + (Number(l.amount) || 0), 0);
    const count24h = (recentLogs || []).length;
    const flags: string[] = [];
    let severity = 'low';

    if (amount > 2000000) { flags.push('high_amount'); severity = 'high'; }
    if (count24h > 10) { flags.push('high_frequency'); if (severity === 'low') severity = 'medium'; }
    if (total24h > 5000000) { flags.push('high_volume'); severity = 'critical'; }

    if (flags.length > 0) {
      const { data: wallet } = await supabaseAdmin
        .from('wallets')
        .select('id')
        .eq('user_id', userId)
        .single();

      if (wallet) {
        await supabaseAdmin.from('wallet_suspicious_activities').insert({
          wallet_id: wallet.id,
          user_id: userId,
          activity_type: flags.join(', '),
          severity,
          description: `Activité suspecte: montant ${amount}, total 24h: ${total24h}, nb: ${count24h}`,
          metadata: { amount, total24h, count24h, flags },
        });
      }
    }

    return {
      suspicious: flags.length > 0,
      shouldBlock: severity === 'critical',
      flags,
      severity,
    };
  } catch {
    return { suspicious: false, shouldBlock: false, flags: [], severity: 'low' };
  }
}

// ─────────────────────────────────────────────────────────
// CREDIT
// ─────────────────────────────────────────────────────────

/**
 * Crédite le wallet d'un utilisateur.
 * Utilise le RPC SQL credit_wallet si disponible, sinon fallback manuel.
 */
export async function creditWallet(
  userId: string,
  amount: number,
  description: string,
  reference: string,
  transactionType: string = 'credit',
  idempotencyKey?: string
): Promise<{ success: boolean; newBalance?: number; error?: string }> {
  try {
    if (idempotencyKey && await checkIdempotency(idempotencyKey)) {
      logger.info(`[Wallet] Credit already processed: ${idempotencyKey}`);
      return { success: true };
    }

    // Essayer d'abord via RPC SQL (atomique, géré côté DB)
    const { data: rpcData, error: rpcError } = await supabaseAdmin.rpc('credit_wallet', {
      p_user_id: userId,
      p_amount: amount,
      p_description: description,
      p_transaction_type: transactionType,
      p_reference: reference,
    });

    if (!rpcError) {
      if (idempotencyKey) {
        await recordIdempotencyKey(idempotencyKey, userId, 'credit');
      }
      logger.info(`[Wallet] Credited via RPC: user=${userId}, amount=${amount}`);
      return { success: true, newBalance: rpcData?.new_balance };
    }

    // Fallback manuel si le RPC n'existe pas ou échoue
    logger.warn(`[Wallet] RPC credit_wallet failed (${rpcError.message}), using manual fallback`);

    const { data: wallet, error: walletErr } = await supabaseAdmin
      .from('wallets')
      .select('id, balance')
      .eq('user_id', userId)
      .single();

    if (walletErr || !wallet) {
      // Créer le wallet si inexistant — devise selon pays du profil
      const { data: profileForCredit } = await supabaseAdmin
        .from('profiles')
        .select('detected_country, country, detected_currency')
        .eq('id', userId)
        .maybeSingle();
      const creditCountry = (profileForCredit as any)?.detected_country || (profileForCredit as any)?.country || 'GN';
      const creditCurrency = ((profileForCredit as any)?.detected_currency && (profileForCredit as any).detected_currency !== 'GNF')
        ? (profileForCredit as any).detected_currency
        : countryToCurrency(creditCountry);

      const { data: newWallet, error: createErr } = await supabaseAdmin
        .from('wallets')
        .insert({
          user_id: userId,
          balance: amount,
          currency: creditCurrency,
          currency_locked: true,
          currency_locked_at: new Date().toISOString(),
          currency_lock_reason: `Devise assignée selon pays de résidence: ${creditCountry}`,
        })
        .select('id, balance')
        .single();

      if (createErr || !newWallet) {
        return { success: false, error: createErr?.message || 'Impossible de créer le wallet' };
      }
      if (idempotencyKey) {
        await recordIdempotencyKey(idempotencyKey, userId, 'credit');
      }
      return { success: true, newBalance: newWallet.balance };
    }

    const newBalance = Number(wallet.balance) + amount;
    const { error: updateErr } = await supabaseAdmin
      .from('wallets')
      .update({ balance: newBalance, updated_at: new Date().toISOString() })
      .eq('id', wallet.id);

    if (updateErr) return { success: false, error: updateErr.message };

    // Journal transaction
    await supabaseAdmin.from('wallet_transactions').insert({
      sender_wallet_id: wallet.id,
      receiver_wallet_id: wallet.id,
      transaction_type: transactionType,
      amount,
      status: 'completed',
      description,
      metadata: { reference, source: 'backend-node' },
    });

    if (idempotencyKey) {
      await recordIdempotencyKey(idempotencyKey, userId, 'credit');
    }

    logger.info(`[Wallet] Credited manually: user=${userId}, amount=${amount}, newBalance=${newBalance}`);
    return { success: true, newBalance };
  } catch (err: any) {
    logger.error(`[Wallet] creditWallet error: ${err.message}`);
    return { success: false, error: err.message };
  }
}

// ─────────────────────────────────────────────────────────
// DEBIT
// ─────────────────────────────────────────────────────────

/**
 * Débite le wallet d'un utilisateur.
 * Vérifie le solde, applique le verrouillage optimiste, enregistre l'idempotence.
 */
export async function debitWallet(
  userId: string,
  amount: number,
  description: string,
  idempotencyKey: string
): Promise<{ success: boolean; newBalance?: number; error?: string }> {
  try {
    // Anti double-paiement
    if (await checkIdempotency(idempotencyKey)) {
      logger.info(`[Wallet] Debit already processed: ${idempotencyKey}`);
      return { success: true };
    }

    // Vérification activité suspecte
    const suspect = await detectSuspiciousActivity(userId, amount);
    if (suspect.shouldBlock) {
      logger.warn(`[Wallet] Debit blocked: suspicious activity for user=${userId}`);
      return { success: false, error: 'Transaction bloquée pour activité suspecte' };
    }

    // Récupérer le wallet
    const { data: wallet, error: walletErr } = await supabaseAdmin
      .from('wallets')
      .select('id, balance, is_blocked, currency')
      .eq('user_id', userId)
      .single();

    if (walletErr || !wallet) return { success: false, error: 'Wallet introuvable' };
    if (wallet.is_blocked) return { success: false, error: 'Wallet bloqué' };
    if (Number(wallet.balance) < amount) return { success: false, error: 'Solde insuffisant' };

    const newBalance = Number(wallet.balance) - amount;

    // Verrouillage optimiste : on ne met à jour que si le solde n'a pas changé
    const { data: updated, error: updateErr } = await supabaseAdmin
      .from('wallets')
      .update({ balance: newBalance, updated_at: new Date().toISOString() })
      .eq('user_id', userId)
      .eq('balance', wallet.balance)
      .select('balance')
      .single();

    if (updateErr || !updated) {
      return { success: false, error: 'Solde modifié pendant la transaction. Réessayez.' };
    }

    // Journal transaction
    await supabaseAdmin.from('wallet_transactions').insert({
      sender_wallet_id: wallet.id,
      receiver_wallet_id: wallet.id,
      transaction_type: 'withdrawal',
      amount,
      status: 'completed',
      description,
      metadata: { idempotency_key: idempotencyKey, source: 'backend-node' },
    });

    await recordIdempotencyKey(idempotencyKey, userId, 'withdraw');

    logger.info(`[Wallet] Debited: user=${userId}, amount=${amount}, newBalance=${newBalance}`);
    return { success: true, newBalance };
  } catch (err: any) {
    logger.error(`[Wallet] debitWallet error: ${err.message}`);
    return { success: false, error: err.message };
  }
}

// ─────────────────────────────────────────────────────────
// TRANSFER P2P
// ─────────────────────────────────────────────────────────

/**
 * Transfert atomic entre deux wallets.
 * Utilise le RPC SQL execute_atomic_wallet_transfer si disponible.
 */
export async function transferBetweenWallets(
  senderId: string,
  receiverId: string,
  amount: number,
  description: string,
  idempotencyKey: string,
  options: TransferExecutionOptions = {}
): Promise<{ success: boolean; transactionId?: string; error?: string }> {
  try {
    if (await checkIdempotency(idempotencyKey)) {
      logger.info(`[Wallet] Transfer already processed: ${idempotencyKey}`);
      return { success: true };
    }

    const suspect = await detectSuspiciousActivity(senderId, amount);
    if (suspect.shouldBlock) {
      return { success: false, error: 'Transfert bloqué pour activité suspecte' };
    }

    // Utiliser les IDs wallet fournis par la route (déjà validés) pour éviter un double-fetch
    // qui pourrait retourner un wallet différent si l'utilisateur en a plusieurs
    let senderWallet: TransferWallet;
    if (options.senderWalletId) {
      const { data: sw } = await supabaseAdmin
        .from('wallets')
        .select('id, balance, is_blocked, currency')
        .eq('id', options.senderWalletId)
        .single();
      if (!sw) return { success: false, error: 'Wallet expéditeur introuvable' };
      senderWallet = sw as TransferWallet;
    } else {
      const sw = await ensureWalletForTransfer(senderId, options.senderCurrency || 'GNF');
      if (!sw) return { success: false, error: 'Wallet expéditeur indisponible' };
      senderWallet = sw;
    }
    if (senderWallet.is_blocked) return { success: false, error: 'Wallet expéditeur bloqué' };
    if (Number(senderWallet.balance) < amount) return { success: false, error: 'Solde insuffisant' };

    let receiverWallet: TransferWallet;
    if (options.receiverWalletId) {
      const { data: rw } = await supabaseAdmin
        .from('wallets')
        .select('id, balance, is_blocked, currency')
        .eq('id', options.receiverWalletId)
        .single();
      if (!rw) return { success: false, error: 'Wallet destinataire introuvable' };
      receiverWallet = rw as TransferWallet;
    } else {
      const rw = await ensureWalletForTransfer(receiverId, options.receiverCurrency || senderWallet.currency || 'GNF');
      if (!rw) return { success: false, error: 'Wallet destinataire indisponible' };
      receiverWallet = rw;
    }

    const senderCurrency = String(options.senderCurrency || senderWallet.currency || 'GNF').toUpperCase();
    const receiverCurrency = String(options.receiverCurrency || receiverWallet.currency || senderCurrency).toUpperCase();
    const isInternational = Boolean(options.isInternational || senderCurrency !== receiverCurrency);
    const rateUsed = Number(options.rateUsed ?? 1);
    const rateSource = String(options.rateSource || 'identity');
    const feeAmount = Number(options.feeAmount ?? 0);
    const amountToCredit = smartRoundTransferAmount(
      Number(options.amountToCredit ?? amount),
      receiverCurrency,
    );

    if (!Number.isFinite(amountToCredit) || amountToCredit <= 0) {
      return { success: false, error: 'Montant crédité invalide pour le destinataire' };
    }

    const canUseRpc = !isInternational && Math.abs(amountToCredit - amount) < 0.000001;

    if (canUseRpc) {
      const { data: rpcData, error: rpcError } = await supabaseAdmin.rpc('execute_atomic_wallet_transfer', {
        p_sender_id: senderId,
        p_receiver_id: receiverId,
        p_amount: amount,
        p_description: description,
        p_sender_wallet_id: senderWallet.id,
        p_recipient_wallet_id: receiverWallet.id,
        p_sender_balance_before: senderWallet.balance,
        p_recipient_balance_before: receiverWallet.balance,
      });

      if (!rpcError) {
        const txId = Array.isArray(rpcData)
          ? (rpcData[0]?.transaction_id || rpcData[0]?.id)
          : (rpcData?.transaction_id || rpcData?.id);
        await persistTransferHistory({
          transactionId: txId,
          senderId,
          receiverId,
          senderWalletId: senderWallet.id,
          receiverWalletId: receiverWallet.id,
          amountSent: amount,
          amountReceived: amountToCredit,
          description,
          idempotencyKey,
          senderCurrency,
          receiverCurrency,
          isInternational,
          rateUsed,
          rateSource,
          feeAmount,
        });
        await recordIdempotencyKey(idempotencyKey, senderId, 'transfer');
        logger.info(`[Wallet] Transfer via RPC: sender=${senderId}, receiver=${receiverId}, debit=${amount}, credit=${amountToCredit}, ${senderCurrency}->${receiverCurrency}`);
        return { success: true, transactionId: txId };
      }

      logger.warn(`[Wallet] RPC atomic transfer failed (${rpcError.message}), using manual fallback`);
    }

    const newSenderBalance = Number(senderWallet.balance) - amount;

    // Débit expéditeur — verrou optimiste sur balance ET ciblage par wallet ID (pas user_id)
    const { data: debitResult, error: debitErr } = await supabaseAdmin
      .from('wallets')
      .update({ balance: newSenderBalance, updated_at: new Date().toISOString() })
      .eq('id', senderWallet.id)
      .eq('balance', senderWallet.balance)
      .select('balance')
      .single();

    if (debitErr || !debitResult) {
      logger.warn(`[Wallet] Debit failed for wallet ${senderWallet.id} (user=${senderId}): ${debitErr?.message || 'no row matched — concurrent modification'}`);
      return { success: false, error: 'Solde modifié pendant la transaction. Réessayez.' };
    }

    // Récupérer le solde courant du destinataire pour éviter une valeur périmée
    const { data: freshReceiverWallet } = await supabaseAdmin
      .from('wallets')
      .select('balance')
      .eq('id', receiverWallet.id)
      .single();

    const currentReceiverBalance = Number(freshReceiverWallet?.balance ?? receiverWallet.balance);
    const newReceiverBalance = currentReceiverBalance + amountToCredit;

    // Crédit destinataire — ciblage par wallet ID uniquement
    const { data: creditResult, error: creditErr } = await supabaseAdmin
      .from('wallets')
      .update({ balance: newReceiverBalance, updated_at: new Date().toISOString() })
      .eq('id', receiverWallet.id)
      .select('balance')
      .single();

    if (creditErr || !creditResult) {
      logger.error(`[Wallet] Credit failed for wallet ${receiverWallet.id} (user=${receiverId}), rolling back debit on wallet ${senderWallet.id}: ${creditErr?.message || 'no row matched'}`);
      await supabaseAdmin
        .from('wallets')
        .update({ balance: senderWallet.balance, updated_at: new Date().toISOString() })
        .eq('id', senderWallet.id);
      return { success: false, error: 'Échec du crédit destinataire — transaction annulée' };
    }

    logger.info(`[Wallet] Balances updated: sender wallet ${senderWallet.id} ${senderWallet.balance}→${newSenderBalance} ${senderCurrency}, receiver wallet ${receiverWallet.id} ${currentReceiverBalance}→${newReceiverBalance} ${receiverCurrency}`);

    await persistTransferHistory({
      senderId,
      receiverId,
      senderWalletId: senderWallet.id,
      receiverWalletId: receiverWallet.id,
      amountSent: amount,
      amountReceived: amountToCredit,
      description,
      idempotencyKey,
      senderCurrency,
      receiverCurrency,
      isInternational,
      rateUsed,
      rateSource,
      feeAmount,
    });
    await recordIdempotencyKey(idempotencyKey, senderId, 'transfer');
    logger.info(`[Wallet] Transfer manual: sender=${senderId}, receiver=${receiverId}, debit=${amount}, credit=${amountToCredit}, ${senderCurrency}->${receiverCurrency}`);
    return { success: true };
  } catch (err: any) {
    logger.error(`[Wallet] transferBetweenWallets error: ${err.message}`);
    return { success: false, error: err.message };
  }
}
