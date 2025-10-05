/**
 * 🤖 ACTIONS MÉTIERS COPILOTE 224
 * Endpoints pour les actions métiers intégrées au Copilote
 * Wallet, transactions, taux, simulations
 */

const express = require("express");
const router = express.Router();
const { createClient } = require('@supabase/supabase-js');
const jwt = require('jsonwebtoken');

// Configuration Supabase
const supabase = createClient(
  process.env.SUPABASE_URL || 'https://uakkxaibujzxdiqzpnpr.supabase.co',
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY
);

// Middleware d'authentification
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Token d\'authentification requis' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key');
    req.user = decoded;
    next();
  } catch (error) {
    return res.status(403).json({ error: 'Token invalide' });
  }
};

// POST /api/copilot/business-action - Exécuter une action métier
router.post('/business-action', authenticateToken, async (req, res) => {
  try {
    const { type, data } = req.body;
    const userId = req.user.sub;

    console.log(`🤖 Action métier ${type} pour ${userId}`);

    let result;

    switch (type) {
      case 'wallet_balance':
        result = await getWalletBalance(userId);
        break;

      case 'transaction_history':
        result = await getTransactionHistory(userId, data?.limit || 10);
        break;

      case 'finance_simulation':
        result = await simulateFinance(data);
        break;

      case 'rate_show':
        result = await getExchangeRates();
        break;

      case 'rate_edit':
        result = await editExchangeRate(userId, data);
        break;

      default:
        return res.status(400).json({ error: 'Type d\'action non supporté' });
    }

    // Logger l'action
    await supabase.from('ai_business_actions').insert({
      user_id: userId,
      action_type: type,
      action_data: data,
      result: result,
      success: true
    });

    res.json({ 
      success: true,
      action: type,
      result,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ Erreur action métier:', error);
    
    // Logger l'erreur
    await supabase.from('ai_business_actions').insert({
      user_id: req.user.sub,
      action_type: req.body.type,
      action_data: req.body.data,
      success: false,
      error_message: error.message
    });

    res.status(500).json({ 
      error: 'Erreur lors de l\'exécution de l\'action métier',
      details: error.message
    });
  }
});

// Obtenir le solde du wallet
async function getWalletBalance(userId) {
  const { data: wallet, error } = await supabase
    .from('wallets')
    .select('balance, currency')
    .eq('user_id', userId)
    .single();

  if (error) throw error;

  return {
    balance: wallet.balance,
    currency: wallet.currency,
    formatted: `${wallet.balance.toLocaleString()} ${wallet.currency}`
  };
}

// Obtenir l'historique des transactions
async function getTransactionHistory(userId, limit = 10) {
  const { data: transactions, error } = await supabase
    .from('transactions')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) throw error;

  return transactions.map(t => ({
    id: t.id,
    amount: t.amount,
    currency: t.currency,
    type: t.type,
    description: t.description,
    date: t.created_at,
    formatted: `${t.type}: ${t.amount} ${t.currency} - ${t.description}`
  }));
}

// Simuler une conversion financière
async function simulateFinance(data) {
  const { amount, fromCurrency, toCurrency } = data;

  if (!amount || !fromCurrency || !toCurrency) {
    throw new Error('Paramètres manquants pour la simulation');
  }

  // Récupérer le taux de change
  const { data: rate, error } = await supabase
    .from('exchange_rates')
    .select('rate')
    .eq('from_currency', fromCurrency)
    .eq('to_currency', toCurrency)
    .single();

  if (error || !rate) {
    throw new Error('Taux de change non trouvé');
  }

  // Calculer la conversion
  const convertedAmount = amount * rate.rate;
  const apiCommission = amount * 0.001; // 0.1% commission API
  const internalFees = convertedAmount * 0.005; // 0.5% frais internes
  const totalFees = apiCommission + internalFees;
  const totalCost = amount + totalFees;

  return {
    originalAmount: amount,
    fromCurrency,
    toCurrency,
    exchangeRate: rate.rate,
    convertedAmount,
    apiCommission,
    internalFees,
    totalFees,
    totalCost,
    netReceived: convertedAmount,
    summary: {
      sent: `${amount.toLocaleString()} ${fromCurrency}`,
      received: `${convertedAmount.toLocaleString()} ${toCurrency}`,
      rate: `1 ${toCurrency} = ${(1/rate.rate).toFixed(2)} ${fromCurrency}`,
      fees: `${totalFees.toLocaleString()} ${fromCurrency}`,
      total: `${totalCost.toLocaleString()} ${fromCurrency}`
    }
  };
}

// Obtenir les taux de change
async function getExchangeRates() {
  const { data: rates, error } = await supabase
    .from('exchange_rates')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) throw error;

  return rates.map(rate => ({
    from: rate.from_currency,
    to: rate.to_currency,
    rate: rate.rate,
    updated: rate.created_at,
    formatted: `1 ${rate.to_currency} = ${rate.rate} ${rate.from_currency}`
  }));
}

// Modifier un taux de change (PDG seulement)
async function editExchangeRate(userId, data) {
  // Vérifier si l'utilisateur est PDG
  const { data: user, error: userError } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', userId)
    .single();

  if (userError || !user) {
    throw new Error('Utilisateur non trouvé');
  }

  if (user.role !== 'PDG' && user.role !== 'admin') {
    throw new Error('Seuls les PDG peuvent modifier les taux de change');
  }

  const { fromCurrency, toCurrency, newRate } = data;

  if (!fromCurrency || !toCurrency || !newRate) {
    throw new Error('Paramètres manquants pour la modification du taux');
  }

  // Mettre à jour le taux
  const { data: updatedRate, error } = await supabase
    .from('exchange_rates')
    .update({ 
      rate: newRate,
      updated_by: userId,
      updated_at: new Date().toISOString()
    })
    .eq('from_currency', fromCurrency)
    .eq('to_currency', toCurrency)
    .select()
    .single();

  if (error) throw error;

  // Logger l'historique des modifications
  await supabase.from('exchange_rate_history').insert({
    from_currency: fromCurrency,
    to_currency: toCurrency,
    old_rate: data.oldRate,
    new_rate: newRate,
    updated_by: userId,
    reason: 'Modification manuelle par PDG'
  });

  return {
    success: true,
    from: fromCurrency,
    to: toCurrency,
    oldRate: data.oldRate,
    newRate: newRate,
    updatedBy: userId,
    updatedAt: new Date().toISOString()
  };
}

// GET /api/copilot/business-action/status - Statut des actions métiers
router.get('/business-action/status', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.sub;

    // Statistiques des actions
    const { data: actions, error } = await supabase
      .from('ai_business_actions')
      .select('action_type, success, created_at')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(50);

    if (error) throw error;

    const stats = {
      totalActions: actions.length,
      successfulActions: actions.filter(a => a.success).length,
      failedActions: actions.filter(a => !a.success).length,
      recentActions: actions.slice(0, 10),
      actionTypes: {
        wallet_balance: actions.filter(a => a.action_type === 'wallet_balance').length,
        transaction_history: actions.filter(a => a.action_type === 'transaction_history').length,
        finance_simulation: actions.filter(a => a.action_type === 'finance_simulation').length,
        rate_show: actions.filter(a => a.action_type === 'rate_show').length,
        rate_edit: actions.filter(a => a.action_type === 'rate_edit').length
      }
    };

    res.json(stats);
  } catch (error) {
    console.error('❌ Erreur statut actions:', error);
    res.status(500).json({ error: 'Erreur lors de la récupération du statut' });
  }
});

module.exports = router;
