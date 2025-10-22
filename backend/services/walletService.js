/**
 * 💳 SERVICE WALLET - 224SOLUTIONS
 * Gestion complète des wallets avec multi-devises et sécurité
 */

const { createClient } = require('@supabase/supabase-js');
const { generateUniqueId } = require('./idService');

const supabaseUrl = process.env.SUPABASE_URL || 'https://uakkxaibujzxdiqzpnpr.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

/**
 * Créer ou récupérer le wallet d'un utilisateur
 * @param {string} userId - ID de l'utilisateur
 * @param {string} currency - Devise (GNF, USD, EUR)
 * @returns {Promise<Object>} Wallet créé/récupéré
 */
async function ensureWallet(userId, currency = 'GNF') {
  try {
    console.log(`🔄 Vérification wallet pour user ${userId}, devise: ${currency}`);

    // Vérifier si le wallet existe
    const { data: existing, error: checkError } = await supabase
      .from('wallets')
      .select('*')
      .eq('user_id', userId)
      .eq('currency', currency)
      .maybeSingle();

    if (checkError && checkError.code !== 'PGRST116') {
      throw checkError;
    }

    if (existing) {
      console.log('✅ Wallet existant trouvé:', existing.public_id);
      return existing;
    }

    // Créer un nouveau wallet avec public_id
    console.log('🆕 Création nouveau wallet...');
    const public_id = await generateUniqueId('wallets', userId);

    const { data: newWallet, error: createError } = await supabase
      .from('wallets')
      .insert([{
        user_id: userId,
        public_id,
        balance: 0,
        currency,
        wallet_status: 'active',
        is_blocked: false
      }])
      .select()
      .single();

    if (createError) throw createError;

    console.log('✅ Wallet créé avec succès:', public_id);
    return newWallet;

  } catch (error) {
    console.error('❌ Erreur ensureWallet:', error);
    throw error;
  }
}

/**
 * Effectuer un dépôt sur un wallet
 * @param {string} walletId - ID du wallet
 * @param {number} amount - Montant
 * @param {string} method - Méthode (card, mobile_money, cash, wallet_224)
 * @param {Object} metadata - Métadonnées additionnelles
 * @returns {Promise<Object>} Transaction créée
 */
async function depositToWallet(walletId, amount, method, metadata = {}) {
  try {
    console.log(`💰 Dépôt de ${amount} sur wallet ${walletId} via ${method}`);

    // Récupérer le wallet
    const { data: wallet, error: walletError } = await supabase
      .from('wallets')
      .select('*')
      .eq('id', walletId)
      .single();

    if (walletError || !wallet) {
      throw new Error('Wallet non trouvé');
    }

    if (wallet.is_blocked) {
      throw new Error('Wallet bloqué');
    }

    // Calculer les frais
    const fee = await calculateFee('deposit', amount, wallet.currency);
    const netAmount = amount - fee;

    const balanceBefore = wallet.balance;
    const balanceAfter = balanceBefore + netAmount;

    // Mettre à jour le wallet
    const { error: updateError } = await supabase
      .from('wallets')
      .update({
        balance: balanceAfter,
        total_received: wallet.total_received + netAmount,
        last_transaction_at: new Date().toISOString()
      })
      .eq('id', walletId);

    if (updateError) throw updateError;

    // Logger l'opération
    await logWalletOperation({
      wallet_id: walletId,
      user_id: wallet.user_id,
      action: 'deposit',
      amount: netAmount,
      currency: wallet.currency,
      balance_before: balanceBefore,
      balance_after: balanceAfter,
      payment_method: method,
      status: 'completed',
      metadata: { ...metadata, fee, gross_amount: amount }
    });

    console.log(`✅ Dépôt réussi: ${netAmount} (frais: ${fee})`);

    return {
      success: true,
      amount: netAmount,
      fee,
      balance: balanceAfter
    };

  } catch (error) {
    console.error('❌ Erreur depositToWallet:', error);
    throw error;
  }
}

/**
 * Effectuer un retrait d'un wallet
 */
async function withdrawFromWallet(walletId, amount, method, metadata = {}) {
  try {
    console.log(`💸 Retrait de ${amount} du wallet ${walletId}`);

    const { data: wallet, error: walletError } = await supabase
      .from('wallets')
      .select('*')
      .eq('id', walletId)
      .single();

    if (walletError || !wallet) {
      throw new Error('Wallet non trouvé');
    }

    if (wallet.is_blocked) {
      throw new Error('Wallet bloqué');
    }

    // Calculer les frais
    const fee = await calculateFee('withdraw', amount, wallet.currency);
    const totalAmount = amount + fee;

    if (wallet.balance < totalAmount) {
      throw new Error('Solde insuffisant');
    }

    const balanceBefore = wallet.balance;
    const balanceAfter = balanceBefore - totalAmount;

    // Mettre à jour le wallet
    const { error: updateError } = await supabase
      .from('wallets')
      .update({
        balance: balanceAfter,
        total_sent: wallet.total_sent + totalAmount,
        last_transaction_at: new Date().toISOString()
      })
      .eq('id', walletId);

    if (updateError) throw updateError;

    // Logger
    await logWalletOperation({
      wallet_id: walletId,
      user_id: wallet.user_id,
      action: 'withdraw',
      amount: amount,
      currency: wallet.currency,
      balance_before: balanceBefore,
      balance_after: balanceAfter,
      payment_method: method,
      status: 'completed',
      metadata: { ...metadata, fee, total_amount: totalAmount }
    });

    console.log(`✅ Retrait réussi: ${amount} (frais: ${fee})`);

    return {
      success: true,
      amount,
      fee,
      balance: balanceAfter
    };

  } catch (error) {
    console.error('❌ Erreur withdrawFromWallet:', error);
    throw error;
  }
}

/**
 * Transférer entre deux wallets (P2P)
 */
async function transferBetweenWallets(senderWalletId, receiverUserId, amount, description, metadata = {}) {
  try {
    console.log(`🔄 Transfert P2P: ${amount} de ${senderWalletId} vers user ${receiverUserId}`);

    // Récupérer wallet expéditeur
    const { data: senderWallet, error: senderError } = await supabase
      .from('wallets')
      .select('*')
      .eq('id', senderWalletId)
      .single();

    if (senderError || !senderWallet) {
      throw new Error('Wallet expéditeur non trouvé');
    }

    if (senderWallet.is_blocked) {
      throw new Error('Wallet expéditeur bloqué');
    }

    // Calculer frais
    const fee = await calculateFee('transfer', amount, senderWallet.currency);
    const totalAmount = amount + fee;

    if (senderWallet.balance < totalAmount) {
      throw new Error('Solde insuffisant');
    }

    // Récupérer/créer wallet destinataire
    const receiverWallet = await ensureWallet(receiverUserId, senderWallet.currency);

    if (receiverWallet.is_blocked) {
      throw new Error('Wallet destinataire bloqué');
    }

    // Débiter expéditeur
    const { error: debitError } = await supabase
      .from('wallets')
      .update({
        balance: senderWallet.balance - totalAmount,
        total_sent: senderWallet.total_sent + totalAmount,
        last_transaction_at: new Date().toISOString()
      })
      .eq('id', senderWalletId);

    if (debitError) throw debitError;

    // Créditer destinataire
    const { error: creditError } = await supabase
      .from('wallets')
      .update({
        balance: receiverWallet.balance + amount,
        total_received: receiverWallet.total_received + amount,
        last_transaction_at: new Date().toISOString()
      })
      .eq('id', receiverWallet.id);

    if (creditError) throw creditError;

    // Créer transaction avec public_id
    const tx_public_id = await generateUniqueId('transactions', senderWallet.user_id);

    const { data: transaction, error: txError } = await supabase
      .from('enhanced_transactions')
      .insert([{
        public_id: tx_public_id,
        sender_id: senderWallet.user_id,
        receiver_id: receiverUserId,
        amount,
        currency: senderWallet.currency,
        method: 'wallet',
        status: 'completed',
        metadata: { 
          ...metadata, 
          fee,
          description,
          sender_wallet: senderWallet.public_id,
          receiver_wallet: receiverWallet.public_id
        }
      }])
      .select()
      .single();

    if (txError) throw txError;

    // Logger les deux côtés
    await logWalletOperation({
      wallet_id: senderWalletId,
      user_id: senderWallet.user_id,
      action: 'transfer_sent',
      amount: totalAmount,
      currency: senderWallet.currency,
      balance_before: senderWallet.balance,
      balance_after: senderWallet.balance - totalAmount,
      transaction_id: transaction.id,
      metadata: { fee, description, receiver: receiverWallet.public_id }
    });

    await logWalletOperation({
      wallet_id: receiverWallet.id,
      user_id: receiverUserId,
      action: 'transfer_received',
      amount,
      currency: senderWallet.currency,
      balance_before: receiverWallet.balance,
      balance_after: receiverWallet.balance + amount,
      transaction_id: transaction.id,
      metadata: { description, sender: senderWallet.public_id }
    });

    console.log(`✅ Transfert réussi: ${tx_public_id}`);

    return {
      success: true,
      transaction_id: transaction.id,
      public_id: tx_public_id,
      amount,
      fee,
      net_amount: amount,
      sender_balance: senderWallet.balance - totalAmount,
      receiver_balance: receiverWallet.balance + amount
    };

  } catch (error) {
    console.error('❌ Erreur transferBetweenWallets:', error);
    throw error;
  }
}

/**
 * Calculer les frais de transaction
 */
async function calculateFee(transactionType, amount, currency = 'GNF') {
  try {
    const { data: feeConfig, error } = await supabase
      .from('wallet_fees')
      .select('*')
      .eq('transaction_type', transactionType)
      .eq('currency', currency)
      .eq('is_active', true)
      .maybeSingle();

    if (error || !feeConfig) {
      return 0;
    }

    let fee = 0;
    if (feeConfig.fee_type === 'fixed') {
      fee = feeConfig.fee_value;
    } else if (feeConfig.fee_type === 'percentage') {
      fee = (amount * feeConfig.fee_value) / 100;
    }

    return Math.max(0, fee);

  } catch (error) {
    console.error('❌ Erreur calculateFee:', error);
    return 0;
  }
}

/**
 * Logger une opération wallet
 */
async function logWalletOperation(logData) {
  try {
    const { error } = await supabase
      .from('wallet_logs')
      .insert([logData]);

    if (error) {
      console.error('⚠️  Erreur logging wallet:', error);
    }
  } catch (error) {
    console.error('⚠️  Erreur logWalletOperation:', error);
  }
}

/**
 * Bloquer un wallet
 */
async function blockWallet(walletId, reason, blockedBy) {
  try {
    const { error } = await supabase
      .from('wallets')
      .update({
        is_blocked: true,
        blocked_reason: reason,
        blocked_at: new Date().toISOString(),
        wallet_status: 'blocked'
      })
      .eq('id', walletId);

    if (error) throw error;

    await logWalletOperation({
      wallet_id: walletId,
      action: 'block',
      status: 'completed',
      metadata: { reason, blocked_by: blockedBy }
    });

    console.log(`✅ Wallet ${walletId} bloqué`);
    return { success: true };

  } catch (error) {
    console.error('❌ Erreur blockWallet:', error);
    throw error;
  }
}

/**
 * Débloquer un wallet
 */
async function unblockWallet(walletId, unblockedBy) {
  try {
    const { error } = await supabase
      .from('wallets')
      .update({
        is_blocked: false,
        blocked_reason: null,
        blocked_at: null,
        wallet_status: 'active'
      })
      .eq('id', walletId);

    if (error) throw error;

    await logWalletOperation({
      wallet_id: walletId,
      action: 'unblock',
      status: 'completed',
      metadata: { unblocked_by: unblockedBy }
    });

    console.log(`✅ Wallet ${walletId} débloqué`);
    return { success: true };

  } catch (error) {
    console.error('❌ Erreur unblockWallet:', error);
    throw error;
  }
}

/**
 * Détecter activités suspectes
 */
async function detectSuspiciousActivity(userId, transactionAmount, transactionType) {
  try {
    // Récupérer transactions récentes
    const { data: recentTx, error } = await supabase
      .from('wallet_logs')
      .select('*')
      .eq('user_id', userId)
      .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
      .order('created_at', { ascending: false });

    if (error) throw error;

    const flags = [];
    let severity = 'low';

    // Règle 1: Montant élevé (> 2M GNF)
    if (transactionAmount > 2000000) {
      flags.push('high_amount');
      severity = 'high';
    }

    // Règle 2: Plus de 10 transactions en 24h
    if (recentTx && recentTx.length > 10) {
      flags.push('high_frequency');
      severity = severity === 'high' ? 'critical' : 'medium';
    }

    // Règle 3: Total > 5M en 24h
    const total24h = recentTx?.reduce((sum, tx) => sum + (tx.amount || 0), 0) || 0;
    if (total24h > 5000000) {
      flags.push('high_volume_24h');
      severity = 'critical';
    }

    // Si activité suspecte détectée
    if (flags.length > 0) {
      const { data: wallet } = await supabase
        .from('wallets')
        .select('id')
        .eq('user_id', userId)
        .single();

      if (wallet) {
        await supabase
          .from('wallet_suspicious_activities')
          .insert([{
            wallet_id: wallet.id,
            user_id: userId,
            activity_type: flags.join(', '),
            severity,
            description: `Activité suspecte détectée: ${flags.join(', ')}. Montant: ${transactionAmount}, Total 24h: ${total24h}`,
            metadata: { 
              transaction_amount: transactionAmount,
              transaction_type: transactionType,
              flags,
              total_24h: total24h,
              transaction_count_24h: recentTx?.length || 0
            }
          }]);

        console.log(`⚠️  Activité suspecte détectée: ${severity} - ${flags.join(', ')}`);
      }

      return {
        suspicious: true,
        severity,
        flags,
        should_block: severity === 'critical'
      };
    }

    return { suspicious: false };

  } catch (error) {
    console.error('❌ Erreur detectSuspiciousActivity:', error);
    return { suspicious: false };
  }
}

/**
 * Convertir devise
 */
async function convertCurrency(amount, fromCurrency, toCurrency) {
  if (fromCurrency === toCurrency) {
    return amount;
  }

  try {
    const { data: rate, error } = await supabase
      .from('exchange_rates')
      .select('rate')
      .eq('from_currency', fromCurrency)
      .eq('to_currency', toCurrency)
      .eq('is_active', true)
      .order('valid_from', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error || !rate) {
      throw new Error(`Taux de change ${fromCurrency} vers ${toCurrency} non trouvé`);
    }

    return amount * rate.rate;

  } catch (error) {
    console.error('❌ Erreur convertCurrency:', error);
    throw error;
  }
}

/**
 * Obtenir les statistiques wallet d'un utilisateur
 */
async function getUserWalletStats(userId) {
  try {
    const { data: wallets, error } = await supabase
      .from('wallets')
      .select('*')
      .eq('user_id', userId);

    if (error) throw error;

    const { data: logs, error: logsError } = await supabase
      .from('wallet_logs')
      .select('*')
      .eq('user_id', userId)
      .gte('created_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString());

    if (logsError) throw logsError;

    return {
      total_wallets: wallets?.length || 0,
      total_balance: wallets?.reduce((sum, w) => sum + (w.balance || 0), 0) || 0,
      transactions_30d: logs?.length || 0,
      last_transaction: logs?.[0]?.created_at || null
    };

  } catch (error) {
    console.error('❌ Erreur getUserWalletStats:', error);
    return null;
  }
}

module.exports = {
  ensureWallet,
  depositToWallet,
  withdrawFromWallet,
  transferBetweenWallets,
  calculateFee,
  logWalletOperation,
  blockWallet,
  unblockWallet,
  detectSuspiciousActivity,
  convertCurrency,
  getUserWalletStats
};
