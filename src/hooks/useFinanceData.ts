/**
 * 🏦 HOOK FINANCE DATA
 * Gestion centralisée des données financières pour l'interface PDG
 */

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface FinanceStats {
  total_revenue: number;
  total_commissions: number;
  pending_payments: number;
  active_wallets: number;
  total_transactions: number;
  completed_transactions: number;
  pending_transactions: number;
}

interface Transaction {
  id: string;
  transaction_id: string;
  transaction_type: string;
  amount: number;
  fee: number;
  net_amount: number;
  status: string;
  currency: string;
  description: string | null;
  created_at: string;
  sender_wallet?: {
    user_id: string;
    profiles?: {
      first_name?: string;
      last_name?: string;
      business_name?: string;
    };
  } | null;
  receiver_wallet?: {
    user_id: string;
    profiles?: {
      first_name?: string;
      last_name?: string;
      business_name?: string;
    };
  } | null;
}

export function useFinanceData(autoLoad: boolean = true) {
  const [stats, setStats] = useState<FinanceStats>({
    total_revenue: 0,
    total_commissions: 0,
    pending_payments: 0,
    active_wallets: 0,
    total_transactions: 0,
    completed_transactions: 0,
    pending_transactions: 0
  });
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadFinanceData = useCallback(async () => {
    setLoading(true);
    setError(null);
    
    try {
      // Charger les transactions avec les informations des wallets et utilisateurs
      const { data: trans, error: transError } = await supabase
        .from('wallet_transactions')
        .select(`
          *,
          sender_wallet:sender_wallet_id(
            user_id,
            profiles(first_name, last_name, business_name)
          ),
          receiver_wallet:receiver_wallet_id(
            user_id,
            profiles(first_name, last_name, business_name)
          )
        `)
        .order('created_at', { ascending: false })
        .limit(100);

      if (transError) {
        console.error('Erreur transactions:', transError);
        throw new Error(`Erreur transactions: ${transError.message}`);
      }

      setTransactions((trans || []) as any);

      // Calculer les statistiques réelles
      const completedTrans = (trans || []).filter((t: any) => t.status === 'completed');
      const pendingTrans = (trans || []).filter((t: any) => t.status === 'pending');
      
      const revenue = completedTrans.reduce((sum: number, t: any) => sum + Number(t.amount || 0), 0);
      const commissions = completedTrans.reduce((sum: number, t: any) => sum + Number(t.fee || 0), 0);
      const pending = pendingTrans.reduce((sum: number, t: any) => sum + Number(t.amount || 0), 0);

      // Compter tous les portefeuilles
      const { count: walletCount, error: walletError } = await supabase
        .from('wallets')
        .select('*', { count: 'exact', head: true });

      if (walletError) {
        console.error('Erreur wallets:', walletError);
      }

      const newStats: FinanceStats = {
        total_revenue: revenue,
        total_commissions: commissions,
        pending_payments: pending,
        active_wallets: walletCount || 0,
        total_transactions: (trans || []).length,
        completed_transactions: completedTrans.length,
        pending_transactions: pendingTrans.length
      };

      setStats(newStats);

      console.log('✅ Données financières chargées:', newStats);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erreur inconnue';
      console.error('❌ Erreur chargement finances:', err);
      setError(errorMessage);
      toast.error('Erreur lors du chargement des données financières');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (autoLoad) {
      loadFinanceData();
    }
  }, [autoLoad, loadFinanceData]);

  return {
    stats,
    transactions,
    loading,
    error,
    refetch: loadFinanceData
  };
}
