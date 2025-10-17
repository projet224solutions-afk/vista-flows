/**
 * 📊 API ADMIN - STATISTIQUES FINANCIÈRES
 * Endpoint pour récupérer les statistiques financières globales
 */

import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Vérifier l'authentification
    const authHeader = req.headers.authorization;
    if (!authHeader) {
      return res.status(401).json({ error: 'Non autorisé' });
    }

    // Récupérer les statistiques des transactions
    const { data: transactions, error: transError } = await supabase
      .from('wallet_transactions')
      .select('amount, fee, status, created_at')
      .order('created_at', { ascending: false });

    if (transError) {
      console.error('Erreur récupération transactions:', transError);
      return res.status(500).json({ error: 'Erreur serveur' });
    }

    // Calculer les statistiques
    const completedTrans = transactions?.filter(t => t.status === 'completed') || [];
    const pendingTrans = transactions?.filter(t => t.status === 'pending') || [];
    
    const totalRevenue = completedTrans.reduce((sum, t) => sum + Number(t.amount || 0), 0);
    const totalCommissions = completedTrans.reduce((sum, t) => sum + Number(t.fee || 0), 0);
    const pendingPayments = pendingTrans.reduce((sum, t) => sum + Number(t.amount || 0), 0);

    // Compter les portefeuilles actifs
    const { count: activeWallets, error: walletError } = await supabase
      .from('wallets')
      .select('*', { count: 'exact', head: true })
      .eq('is_active', true);

    if (walletError) {
      console.error('Erreur récupération portefeuilles:', walletError);
    }

    const stats = {
      total_revenue: totalRevenue,
      total_commissions: totalCommissions,
      pending_payments: pendingPayments,
      active_wallets: activeWallets || 0,
      total_transactions: transactions?.length || 0,
      completed_transactions: completedTrans.length,
      pending_transactions: pendingTrans.length
    };

    res.status(200).json({
      success: true,
      stats,
      transactions: transactions?.slice(0, 50) || [] // Limiter pour la performance
    });

  } catch (error) {
    console.error('Erreur API finance stats:', error);
    res.status(500).json({ 
      success: false,
      error: 'Erreur serveur interne' 
    });
  }
}
