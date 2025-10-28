import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface WalletDetail {
  id: string;
  user_id: string;
  balance: number;
  currency: string;
  wallet_status: string;
  created_at: string;
  updated_at: string;
  profiles?: {
    id: string;
    first_name: string | null;
    last_name: string | null;
    email: string | null;
    phone: string | null;
    role: string;
    status: string;
  };
}

export interface Transaction {
  id: string;
  transaction_id: string;
  sender_wallet_id: string;
  receiver_wallet_id: string;
  amount: number;
  fee: number;
  net_amount: number;
  currency: string;
  status: string;
  transaction_type: string | null;
  description: string | null;
  created_at: string;
  sender_wallet?: {
    profiles: {
      first_name: string | null;
      last_name: string | null;
    };
  };
  receiver_wallet?: {
    profiles: {
      first_name: string | null;
      last_name: string | null;
    };
  };
}

export interface FinanceStats {
  total_revenue: number;
  total_commission: number;
  pending_payments: number;
  active_wallets: number;
}

export function useFinanceData(enabled: boolean = true) {
  const [stats, setStats] = useState<FinanceStats>({
    total_revenue: 0,
    total_commission: 0,
    pending_payments: 0,
    active_wallets: 0,
  });
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [wallets, setWallets] = useState<WalletDetail[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchData = async () => {
    try {
      setLoading(true);

      // Récupérer les transactions
      const { data: transData, error: transError } = await supabase
        .from('wallet_transactions')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(100);

      if (transError) throw transError;

      // Récupérer les wallets avec les profils utilisateurs
      const { data: walletsData, error: walletsError } = await supabase
        .from('wallets')
        .select('*')
        .order('created_at', { ascending: false });
      
      // Récupérer les profils pour chaque wallet
      let enrichedWallets: any[] = [];
      if (walletsData) {
        const profilePromises = walletsData.map(async (wallet) => {
          const { data: profile } = await supabase
            .from('profiles')
            .select('id, first_name, last_name, email, phone, role, status')
            .eq('id', wallet.user_id)
            .single();
          return { ...wallet, profiles: profile };
        });
        enrichedWallets = await Promise.all(profilePromises);
      }
      
      if (walletsError) {
        console.error('Erreur lors de la récupération des wallets:', walletsError);
        throw walletsError;
      }

      console.log('✅ Wallets récupérés:', enrichedWallets);

      setTransactions(transData || []);
      setWallets(enrichedWallets);

      // Calculer les statistiques
      const totalRevenue = (transData || [])
        .filter(t => t.status === 'completed')
        .reduce((sum, t) => sum + Number(t.amount), 0);

      const totalCommission = (transData || [])
        .filter(t => t.status === 'completed')
        .reduce((sum, t) => sum + Number(t.fee), 0);

      const pendingPayments = (transData || [])
        .filter(t => t.status === 'pending')
        .reduce((sum, t) => sum + Number(t.amount), 0);

      const activeWallets = (enrichedWallets || [])
        .filter((w: any) => w.wallet_status === 'active')
        .length;

      setStats({
        total_revenue: totalRevenue,
        total_commission: totalCommission,
        pending_payments: pendingPayments,
        active_wallets: activeWallets,
      });
    } catch (error) {
      console.error('Erreur lors du chargement des données financières:', error);
      toast.error('Erreur lors du chargement des données');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  return {
    stats,
    transactions,
    wallets,
    loading,
    refetch: fetchData,
  };
}
