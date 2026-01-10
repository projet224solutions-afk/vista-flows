/**
 * 💳 HOOK: GESTION WALLET COMPLÈTE
 * Hook principal pour toutes les opérations wallet
 */

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';

export interface WalletData {
  id: string;
  user_id: string;
  balance: number;
  currency: string;
  wallet_status: string;
  is_blocked: boolean;
  blocked_reason: string | null;
  daily_limit: number;
  monthly_limit: number;
  created_at: string;
}

export interface TransactionData {
  id: string;
  sender_id: string;
  receiver_id: string;
  amount: number;
  currency: string;
  method: string;
  status: string;
  created_at: string;
  metadata: any;
}

export interface WalletStats {
  balance: number;
  total_received: number;
  total_sent: number;
  transactions_count: number;
  last_transaction: string | null;
}

export const useWallet = () => {
  const { user } = useAuth();
  const [wallet, setWallet] = useState<WalletData | null>(null);
  const [transactions, setTransactions] = useState<TransactionData[]>([]);
  const [stats, setStats] = useState<WalletStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);

  // Charger le wallet
  const loadWallet = useCallback(async () => {
    if (!user?.id) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);

      // Récupérer ou créer le wallet
      let { data: walletData, error: walletError } = await supabase
        .from('wallets')
        .select('*')
        .eq('user_id', user.id)
        .eq('currency', 'GNF')
        .maybeSingle();

      // Créer le wallet si inexistant via RPC
      if (!walletData) {
        console.log('⚠️ Wallet non trouvé pour user:', user.id);
        console.log('📝 Initialisation via RPC...');
        
        try {
          const { data: initResult, error: rpcError } = await supabase
            .rpc('initialize_user_wallet', { p_user_id: user.id });
          
          if (rpcError) {
            console.error('❌ Erreur RPC:', rpcError);
            setWallet(null);
            setLoading(false);
            return;
          }
          
          if (initResult) {
            const result = initResult as any;
            if (result.success) {
              console.log('✅ Wallet initialisé:', result);
              // Recharger le wallet
              const { data: newWalletData } = await supabase
                .from('wallets')
                .select('*')
                .eq('user_id', user.id)
                .eq('currency', 'GNF')
                .maybeSingle();
              
              walletData = newWalletData;
            }
          } else {
            setWallet(null);
            setLoading(false);
            return;
          }
        } catch (initError) {
          console.error('❌ Erreur appel fonction initialisation:', initError);
          setWallet(null);
          setLoading(false);
          return;
        }
      }

      if (walletData) {
        setWallet({ ...walletData, id: String(walletData.id) } as WalletData);

        // Calculer les stats à partir des transactions
        const { data: txData } = await supabase
          .from('wallet_transactions')
          .select('amount, transaction_type, created_at')
          .or(`sender_wallet_id.eq.${walletData.id},receiver_wallet_id.eq.${walletData.id}`)
          .eq('status', 'completed')
          .order('created_at', { ascending: false })
          .limit(100);

        const totalReceived = txData?.filter(t => t.transaction_type === 'deposit' || t.transaction_type === 'mobile_money_in')
          .reduce((sum, t) => sum + Math.abs(t.amount), 0) || 0;
        const totalSent = txData?.filter(t => t.transaction_type === 'withdrawal' || t.transaction_type === 'mobile_money_out')
          .reduce((sum, t) => sum + Math.abs(t.amount), 0) || 0;

        setStats({
          balance: walletData.balance,
          total_received: totalReceived,
          total_sent: totalSent,
          transactions_count: txData?.length || 0,
          last_transaction: txData?.[0]?.created_at || null
        });
      } else {
        setWallet(null);
      }

    } catch (error: any) {
      console.error('❌ Erreur loadWallet:', error);
      toast.error('Erreur chargement wallet');
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  // Charger les transactions
  const loadTransactions = useCallback(async () => {
    if (!user?.id) return;

    try {
      const { data, error } = await (supabase
        .from('enhanced_transactions' as any)
        .select('*')
        .or(`sender_id.eq.${user.id},receiver_id.eq.${user.id}`)
        .neq('is_archived', true)
        .order('created_at', { ascending: false })
        .limit(50) as any);

      if (error) throw error;
      setTransactions((data || []) as TransactionData[]);

    } catch (error) {
      console.error('❌ Erreur loadTransactions:', error);
    }
  }, [user?.id]);

  // Dépôt
  const deposit = async (amount: number, method: string = 'card', metadata: any = {}) => {
    if (!wallet) {
      toast.error('Wallet non disponible');
      return false;
    }

    setProcessing(true);

    try {
      const { data, error } = await supabase.functions.invoke('wallet-operations', {
        body: {
          operation: 'deposit',
          amount,
          description: metadata.description || 'Dépôt sur wallet'
        }
      });

      if (error) throw error;

      toast.success(`Dépôt de ${amount.toLocaleString()} GNF réussi !`);
      await loadWallet();
      await loadTransactions();
      
      // Émettre événement
      window.dispatchEvent(new Event('wallet-updated'));

      return true;

    } catch (error: any) {
      console.error('❌ Erreur deposit:', error);
      toast.error(error.message || 'Erreur lors du dépôt');
      return false;
    } finally {
      setProcessing(false);
    }
  };

  // Retrait
  const withdraw = async (amount: number, method: string = 'card', metadata: any = {}) => {
    if (!wallet) {
      toast.error('Wallet non disponible');
      return false;
    }

    if (amount > wallet.balance) {
      toast.error('Solde insuffisant');
      return false;
    }

    setProcessing(true);

    try {
      const { data, error } = await supabase.functions.invoke('wallet-operations', {
        body: {
          operation: 'withdraw',
          amount,
          description: metadata.description || 'Retrait de wallet'
        }
      });

      if (error) throw error;

      toast.success(`Retrait de ${amount.toLocaleString()} GNF réussi !`);
      await loadWallet();
      await loadTransactions();
      
      window.dispatchEvent(new Event('wallet-updated'));

      return true;

    } catch (error: any) {
      console.error('❌ Erreur withdraw:', error);
      toast.error(error.message || 'Erreur lors du retrait');
      return false;
    } finally {
      setProcessing(false);
    }
  };

  // Transfert P2P
  const transfer = async (
    recipientId: string,
    amount: number,
    description: string = '',
    metadata: any = {}
  ) => {
    if (!wallet) {
      toast.error('Wallet non disponible');
      return false;
    }

    if (amount > wallet.balance) {
      toast.error('Solde insuffisant');
      return false;
    }

    if (recipientId === user?.id) {
      toast.error('Vous ne pouvez pas transférer à vous-même');
      return false;
    }

    setProcessing(true);

    try {
      const { data, error } = await supabase.functions.invoke('wallet-operations', {
        body: {
          operation: 'transfer',
          amount,
          recipient_id: recipientId,
          description
        }
      });

      if (error) throw error;

      toast.success(`Transfert de ${amount.toLocaleString()} GNF réussi !`);
      await loadWallet();
      await loadTransactions();
      
      window.dispatchEvent(new Event('wallet-updated'));

      return true;

    } catch (error: any) {
      console.error('❌ Erreur transfer:', error);
      toast.error(error.message || 'Erreur lors du transfert');
      return false;
    } finally {
      setProcessing(false);
    }
  };

  // Actualiser
  const refresh = useCallback(async () => {
    await Promise.all([loadWallet(), loadTransactions()]);
  }, [loadWallet, loadTransactions]);

  // Charger au montage
  useEffect(() => {
    loadWallet();
    loadTransactions();
  }, [loadWallet, loadTransactions]);

  // Écouter les mises à jour
  useEffect(() => {
    const handleUpdate = () => {
      loadWallet();
      loadTransactions();
    };

    window.addEventListener('wallet-updated', handleUpdate);
    return () => window.removeEventListener('wallet-updated', handleUpdate);
  }, [loadWallet, loadTransactions]);

  return {
    wallet,
    transactions,
    stats,
    loading,
    processing,
    deposit,
    withdraw,
    transfer,
    refresh,
    // Helpers
    balance: wallet?.balance || 0,
    currency: wallet?.currency || 'GNF',
    publicId: wallet?.id,
    isBlocked: wallet?.is_blocked || false
  };
};

export default useWallet;
