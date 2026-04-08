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
};

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
  };

  const transferType = isInternational ? 'international_transfer' : 'transfer';

  const walletTxPromise = supabaseAdmin
    .from('wallet_transactions')
    .insert({
      sender_wallet_id: senderWalletId,
      receiver_wallet_id: receiverWalletId,
      transaction_type: transferType,
      amount: amountSent,
      status: 'completed',
      description,
      metadata,
    });

  const persistEnhancedHistory = async () => {
    const enhancedPayload = {
      sender_id: senderId,
      receiver_id: receiverId,
      amount: amountSent,
      method: transferType,
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

  const [walletTxResult, enhancedTxResult] = await Promise.all([
    walletTxPromise,
    persistEnhancedHistory(),
  ]);

  if (walletTxResult?.error) {
    logger.warn(`[Wallet] wallet_transactions history insert failed: ${walletTxResult.error.message}`);
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
      // Créer le wallet si inexistant
      const { data: newWallet, error: createErr } = await supabaseAdmin
        .from('wallets')
        .insert({ user_id: userId, balance: amount, currency: 'GNF' })
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

    const { data: senderWallet, error: senderErr } = await supabaseAdmin
      .from('wallets')
      .select('id, balance, is_blocked, currency')
      .eq('user_id', senderId)
      .single();

    if (senderErr || !senderWallet) return { success: false, error: 'Wallet expéditeur introuvable' };
    if (senderWallet.is_blocked) return { success: false, error: 'Wallet expéditeur bloqué' };
    if (Number(senderWallet.balance) < amount) return { success: false, error: 'Solde insuffisant' };

    const { data: receiverWallet, error: receiverErr } = await supabaseAdmin
      .from('wallets')
      .select('id, balance, currency')
      .eq('user_id', receiverId)
      .single();

    if (receiverErr || !receiverWallet) return { success: false, error: 'Wallet destinataire introuvable' };

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
        await recordIdempotencyKey(idempotencyKey, senderId, 'transfer');
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
        logger.info(`[Wallet] Transfer via RPC: sender=${senderId}, receiver=${receiverId}, debit=${amount}, credit=${amountToCredit}, ${senderCurrency}->${receiverCurrency}`);
        return { success: true, transactionId: txId };
      }

      logger.warn(`[Wallet] RPC atomic transfer failed (${rpcError.message}), using manual fallback`);
    }

    const newSenderBalance = Number(senderWallet.balance) - amount;
    const newReceiverBalance = Number(receiverWallet.balance) + amountToCredit;

    const { data: debitResult, error: debitErr } = await supabaseAdmin
      .from('wallets')
      .update({ balance: newSenderBalance, updated_at: new Date().toISOString() })
      .eq('user_id', senderId)
      .eq('balance', senderWallet.balance)
      .select('balance')
      .single();

    if (debitErr || !debitResult) {
      return { success: false, error: 'Solde modifié pendant la transaction. Réessayez.' };
    }

    const { error: creditErr } = await supabaseAdmin
      .from('wallets')
      .update({ balance: newReceiverBalance, updated_at: new Date().toISOString() })
      .eq('user_id', receiverId);

    if (creditErr) {
      await supabaseAdmin
        .from('wallets')
        .update({ balance: senderWallet.balance, updated_at: new Date().toISOString() })
        .eq('user_id', senderId);
      return { success: false, error: 'Échec du crédit destinataire — transaction annulée' };
    }

    await recordIdempotencyKey(idempotencyKey, senderId, 'transfer');
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
    logger.info(`[Wallet] Transfer manual: sender=${senderId}, receiver=${receiverId}, debit=${amount}, credit=${amountToCredit}, ${senderCurrency}->${receiverCurrency}`);
    return { success: true };
  } catch (err: any) {
    logger.error(`[Wallet] transferBetweenWallets error: ${err.message}`);
    return { success: false, error: err.message };
  }
}
