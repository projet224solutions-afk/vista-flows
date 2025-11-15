import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface FinanceStats {
  total_revenue: number;
  total_commission: number;
  pending_payments: number;
  active_wallets: number;
  transactions_count: number;
  revenue_by_service: Array<{
    service_name: string;
    revenue: number;
    commission: number;
    count: number;
  }>;
  escrow_stats: {
    total_held: number;
    total_released: number;
    pending_count: number;
  };
}

export interface Transaction {
  id: string;
  amount: number;
  fee: number;
  status: string;
  transaction_type: string;
  description?: string;
  created_at: string;
  currency: string;
}

export interface Wallet {
  id: string;
  user_id: string;
  balance: number;
  currency: string;
  wallet_status: string;
  created_at: string;
  profiles?: {
    first_name?: string;
    last_name?: string;
    phone?: string;
    email?: string;
  };
}

export function useFinanceData(autoLoad: boolean = false) {
  const [stats, setStats] = useState<FinanceStats>({
    total_revenue: 0,
    total_commission: 0,
    pending_payments: 0,
    active_wallets: 0,
    transactions_count: 0,
    revenue_by_service: [],
    escrow_stats: {
      total_held: 0,
      total_released: 0,
      pending_count: 0
    }
  });
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [wallets, setWallets] = useState<Wallet[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchFinanceData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      console.log('🔄 [useFinanceData] Fetching financial data...');

      // Appeler l'edge function pour obtenir les statistiques
      const { data: statsData, error: statsError } = await supabase.functions.invoke('financial-stats', {
        method: 'GET'
      });

      if (statsError) {
        console.error('❌ [useFinanceData] Error fetching stats:', statsError);
        throw statsError;
      }

      console.log('✅ [useFinanceData] Stats received:', statsData);
      setStats(statsData);
      setTransactions(statsData.recent_transactions || []);

      // Charger les détails des wallets (sans les profils pour éviter les erreurs de relation)
      const { data: walletsData, error: walletsError } = await supabase
        .from('wallets')
        .select('*')
        .eq('wallet_status', 'active')
        .order('balance', { ascending: false })
        .limit(50);

      if (walletsError) {
        console.error('❌ [useFinanceData] Error fetching wallets:', walletsError);
      } else {
        console.log(`📊 [useFinanceData] Loaded ${walletsData?.length || 0} wallets`);
        setWallets(walletsData || []);
      }

    } catch (err: any) {
      console.error('❌ [useFinanceData] Error:', err);
      setError(err.message || 'Erreur lors du chargement des données financières');
      toast.error('Erreur lors du chargement des données financières');
    } finally {
      setLoading(false);
    }
  }, []);

  const refetch = useCallback(() => {
    console.log('🔄 [useFinanceData] Manual refetch triggered');
    return fetchFinanceData();
  }, [fetchFinanceData]);

  useEffect(() => {
    if (autoLoad) {
      console.log('🚀 [useFinanceData] Auto-loading financial data');
      fetchFinanceData();
    }
  }, [autoLoad, fetchFinanceData]);

  // Écouter les changements en temps réel sur les transactions
  useEffect(() => {
    console.log('📡 [useFinanceData] Setting up realtime subscription');
    
    const channel = supabase
      .channel('finance-updates')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'wallet_transactions'
        },
        (payload) => {
          console.log('💰 [useFinanceData] Transaction update detected:', payload);
          // Recharger les données après un court délai
          setTimeout(() => {
            fetchFinanceData();
          }, 1000);
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'escrow_transactions'
        },
        (payload) => {
          console.log('🔒 [useFinanceData] Escrow update detected:', payload);
          setTimeout(() => {
            fetchFinanceData();
          }, 1000);
        }
      )
      .subscribe();

    return () => {
      console.log('🔌 [useFinanceData] Cleaning up realtime subscription');
      supabase.removeChannel(channel);
    };
  }, [fetchFinanceData]);

  return {
    stats,
    transactions,
    wallets,
    loading,
    error,
    refetch
  };
}
