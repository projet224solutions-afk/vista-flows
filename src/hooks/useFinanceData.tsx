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
  custom_id?: string;
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
  sender_id: string | null;
  receiver_id: string | null;
  amount: number;
  currency: string;
  status: string;
  method: string | null;
  transaction_type?: string | null;
  fee?: number;
  description?: string | null;
  created_at: string;
  updated_at: string;
  metadata?: any;
  custom_id?: string;
  public_id?: string;
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

      // Récupérer les transactions depuis wallet_transactions
      const { data: transData, error: transError } = await supabase
        .from('wallet_transactions')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(100);

      if (transError) {
        console.error('❌ Erreur récupération transactions:', transError);
        throw transError;
      }

      console.log('✅ Transactions récupérées depuis wallet_transactions:', transData?.length);

      // Mapper les transactions avec les bons noms de colonnes
      const mappedTransactions = (transData || []).map((t: any) => ({
        id: t.id,
        sender_id: t.sender_wallet_id,
        receiver_id: t.receiver_wallet_id,
        amount: Number(t.amount),
        currency: t.currency || 'GNF',
        status: t.status,
        method: t.transaction_type,
        transaction_type: t.transaction_type,
        fee: Number(t.fee || 0),
        description: t.description,
        created_at: t.created_at,
        updated_at: t.updated_at || t.created_at,
        metadata: t.metadata,
        custom_id: t.id,
        public_id: t.id
      }));

      console.log('📊 Transactions mappées:', mappedTransactions.length);

      // Récupérer les wallets avec les profils utilisateurs
      const { data: walletsData, error: walletsError } = await supabase
        .from('wallets')
        .select('*')
        .order('created_at', { ascending: false });
      
      // Récupérer les profils et custom_id pour chaque wallet
      let enrichedWallets: any[] = [];
      if (walletsData) {
        const profilePromises = walletsData.map(async (wallet) => {
          const { data: profile } = await supabase
            .from('profiles')
            .select('id, first_name, last_name, email, phone, role, status')
            .eq('id', wallet.user_id)
            .single();
          
          // Récupérer le custom_id
          const { data: userIdData } = await supabase
            .from('user_ids')
            .select('custom_id')
            .eq('user_id', wallet.user_id)
            .single();
          
          return { ...wallet, profiles: profile, custom_id: userIdData?.custom_id };
        });
        enrichedWallets = await Promise.all(profilePromises);
      }
      
      if (walletsError) {
        console.error('Erreur lors de la récupération des wallets:', walletsError);
        throw walletsError;
      }

      console.log('✅ Wallets récupérés:', enrichedWallets);

      setTransactions(mappedTransactions);
      setWallets(enrichedWallets);

      // Calculer les statistiques
      const totalRevenue = mappedTransactions
        .filter(t => t.status === 'completed')
        .reduce((sum, t) => sum + Number(t.amount), 0);

      const totalCommission = mappedTransactions
        .filter(t => t.status === 'completed')
        .reduce((sum, t) => sum + Number(t.fee || 0), 0);

      const pendingPayments = mappedTransactions
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
    if (!enabled) return;

    fetchData();

    // Subscription temps réel pour les wallets
    const walletsChannel = supabase
      .channel('wallets-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'wallets',
        },
        (payload) => {
          console.log('💰 Wallet modifié:', payload);
          fetchData(); // Recharger toutes les données
        }
      )
      .subscribe();

    // Subscription temps réel pour les transactions (wallet_transactions)
    const transactionsChannel = supabase
      .channel('wallet-transactions-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'wallet_transactions',
        },
        (payload) => {
          console.log('💸 Transaction modifiée:', payload);
          fetchData(); // Recharger toutes les données
        }
      )
      .subscribe();

    // Cleanup
    return () => {
      walletsChannel.unsubscribe();
      transactionsChannel.unsubscribe();
    };
  }, [enabled]);

  return {
    stats,
    transactions,
    wallets,
    loading,
    refetch: fetchData,
  };
}
