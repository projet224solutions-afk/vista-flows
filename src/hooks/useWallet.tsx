/**
 * HOOK WALLET OPÉRATIONNEL - DONNÉES RÉELLES
 * Gestion complète du portefeuille utilisateur
 * 224Solutions - Wallet System Opérationnel
 */

// @ts-nocheck
import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface Wallet {
  id: string;
  user_id: string;
  balance: number;
  currency: string;
  created_at: string;
  updated_at: string;
}

interface VirtualCard {
  id: string;
  user_id: string;
  card_number: string;
  expiry_date: string;
  cvv: string;
  status: string;
  created_at: string;
}

interface Transaction {
  id: string;
  user_id: string;
  order_id?: string;
  amount: number;
  method: string;
  status: string;
  reference_number: string;
  description?: string;
  created_at: string;
  updated_at: string;
}

export const useWallet = (userId?: string) => {
  const [wallet, setWallet] = useState<Wallet | null>(null);
  const [virtualCards, setVirtualCards] = useState<VirtualCard[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Charger le wallet de l'utilisateur
  const loadWallet = useCallback(async (userId: string) => {
    if (!userId) {
      console.log('⚠️ Pas de userId fourni');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      
      const { data: walletData, error: walletError } = await supabase
        .from('wallets')
        .select('*')
        .eq('user_id', userId)
        .maybeSingle();

      if (walletError) {
        console.error('❌ Erreur requête wallet:', walletError);
        throw walletError;
      }

      if (!walletData) {
        // Initialiser le wallet via RPC
        console.log('⚠️ Wallet non trouvé pour:', userId);
        console.log('📝 Initialisation via RPC...');
        
        try {
          const { data: initResult, error: rpcError } = await supabase
            .rpc('initialize_user_wallet', { p_user_id: userId });
          
          if (rpcError) {
            console.error('❌ Erreur RPC:', rpcError);
            throw rpcError;
          }
          
          if (initResult) {
            const result = initResult as any;
            if (result.success) {
              console.log('✅ Wallet initialisé:', result);
              // Recharger le wallet
              const { data: newWalletData } = await supabase
                .from('wallets')
                .select('*')
                .eq('user_id', userId)
                .maybeSingle();
              
              setWallet(newWalletData);
            } else {
              setWallet(null);
            }
          } else {
            setWallet(null);
          }
        } catch (initError) {
          console.error('❌ Erreur appel fonction initialisation:', initError);
          setWallet(null);
        }
      } else {
        console.log('✅ Wallet chargé:', walletData);
        setWallet(walletData);
      }
    } catch (error: any) {
      console.error('❌ Erreur chargement wallet:', error);
      // Ne pas afficher de toast si c'est juste qu'il n'y a pas de userId
      if (userId) {
        setError('Erreur lors du chargement du portefeuille');
        toast.error('Erreur lors du chargement du portefeuille');
      }
    } finally {
      setLoading(false);
    }
  }, []);

  // Charger les cartes virtuelles
  const loadVirtualCards = useCallback(async (userId: string) => {
    try {
      const { data: cardsData, error: cardsError } = await supabase
        .from('virtual_cards')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (cardsError) {
        console.error('❌ Erreur chargement cartes:', cardsError);
        throw cardsError;
      }

      setVirtualCards(cardsData || []);
    } catch (error) {
      console.error('❌ Erreur chargement cartes:', error);
      setError('Erreur lors du chargement des cartes virtuelles');
    }
  }, []);

  // Charger les transactions depuis enhanced_transactions
  const loadTransactions = useCallback(async (userId: string) => {
    try {
      const { data: transactionsData, error: transactionsError } = await supabase
        .from('enhanced_transactions')
        .select('*')
        .or(`sender_id.eq.${userId},receiver_id.eq.${userId}`)
        .order('created_at', { ascending: false })
        .limit(50);

      if (transactionsError) {
        console.error('❌ Erreur chargement transactions:', transactionsError);
        throw transactionsError;
      }

      console.log('✅ Transactions chargées:', transactionsData);
      setTransactions((transactionsData as unknown) as Transaction[]);
    } catch (error) {
      console.error('❌ Erreur chargement transactions:', error);
      setError('Erreur lors du chargement des transactions');
    }
  }, []);

  // Temps réel: écoute des changements de transactions et de solde
  useEffect(() => {
    if (!userId) return;
    let channel: ReturnType<typeof supabase.channel> | null = null;

    const setupRealtime = async () => {
      try {
        channel = supabase
          .channel(`wallet_${userId}`)
          .on('postgres_changes', {
            event: '*',
            schema: 'public',
            table: 'enhanced_transactions',
            filter: `or(sender_id.eq.${userId},receiver_id.eq.${userId})`
          }, () => {
            // Recharger les transactions
            loadTransactions(userId);
          })
          .on('postgres_changes', {
            event: '*',
            schema: 'public',
            table: 'wallets',
            filter: `user_id.eq.${userId}`
          }, (payload) => {
            // Appliquer mise à jour du solde si présent
            const newBalance = (payload.new as unknown)?.balance;
            if (typeof newBalance === 'number') {
              setWallet(prev => prev ? { ...prev, balance: newBalance } : prev);
            } else {
              // Sinon rechargement pour cohérence
              loadWallet(userId);
            }
          })
          .subscribe();
      } catch (e) {
        console.error('❌ Erreur configuration temps réel Wallet:', e);
      }
    };

    setupRealtime();
    return () => {
      if (channel) channel.unsubscribe();
    };
  }, [userId, loadTransactions, loadWallet]);

  // Créer une carte virtuelle
  const createVirtualCard = useCallback(async (userId: string) => {
    try {
      // Générer un numéro de carte au format "4*** **** **** 1234" (19 caractères max)
      const last4Digits = Math.floor(Math.random() * 9999).toString().padStart(4, '0');
      const cardNumber = `4*** **** **** ${last4Digits}`;
      const expiryDate = new Date();
      expiryDate.setFullYear(expiryDate.getFullYear() + 3);
      
      const { data: cardData, error: cardError } = await supabase
        .from('virtual_cards')
        .insert({
          user_id: userId,
          card_number: cardNumber,
          holder_name: 'Utilisateur 224',
          expiry_date: expiryDate.toISOString(),
          cvv: String(Math.floor(Math.random() * 900) + 100),
          daily_limit: 500000,
          monthly_limit: 2000000,
          status: 'active'
        })
        .select()
        .single();

      if (cardError) throw cardError;

      // Recharger les cartes
      await loadVirtualCards(userId);
      
      toast.success('Carte virtuelle créée avec succès');
      return cardData;
    } catch (error) {
      console.error('❌ Erreur création carte:', error);
      toast.error('Erreur lors de la création de la carte virtuelle');
    }
  }, [loadVirtualCards]);

  // Créer une transaction
  const createTransaction = useCallback(async (
    userId: string,
    amount: number,
    method: string,
    description?: string,
    orderId?: string
  ) => {
    try {
      const referenceNumber = `TXN${Date.now()}${Math.floor(Math.random() * 1000)}`;
      
      // Récupérer l'id du wallet de l'utilisateur
      const { data: walletRow } = await supabase
        .from('wallets')
        .select('id')
        .eq('user_id', userId)
        .single();

      if (!walletRow?.id) {
        throw new Error('Wallet introuvable');
      }

      const { data: transactionData, error: transactionError } = await supabase
        .from('wallet_transactions')
        .insert({
          transaction_id: referenceNumber,
          transaction_type: method,
          amount: amount,
          net_amount: amount,
          fee: 0,
          currency: 'GNF',
          status: 'pending',
          description: description,
          sender_wallet_id: method === 'debit' ? walletRow.id : null,
          receiver_wallet_id: method === 'credit' ? walletRow.id : null
        })
        .select()
        .single();

      if (transactionError) throw transactionError;

      // Mettre à jour le solde du wallet
      if (wallet) {
        const newBalance = wallet.balance + amount;
        const { error: updateError } = await supabase
          .from('wallets')
          .update({ balance: newBalance })
          .eq('user_id', userId);

        if (updateError) throw updateError;
        
        setWallet(prev => prev ? { ...prev, balance: newBalance } : null);
      }

      // Recharger les transactions
      await loadTransactions(userId);
      
      toast.success('Transaction créée avec succès');
      return transactionData;
    } catch (error) {
      console.error('❌ Erreur création transaction:', error);
      toast.error('Erreur lors de la création de la transaction');
    }
  }, [wallet, loadTransactions]);

  // Recharger toutes les données
  const refetch = useCallback(async (userId: string) => {
    try {
      setLoading(true);
      setError(null);

      await Promise.all([
        loadWallet(userId),
        loadVirtualCards(userId),
        loadTransactions(userId)
      ]);

      console.log('✅ Données wallet rechargées avec succès');
    } catch (error) {
      console.error('❌ Erreur rechargement wallet:', error);
      setError('Erreur lors du rechargement des données');
    } finally {
      setLoading(false);
    }
  }, [loadWallet, loadVirtualCards, loadTransactions]);

  // Charger les données au montage
  useEffect(() => {
    if (userId) {
      refetch(userId);
    }
  }, [userId, refetch]);

  return {
    wallet,
    virtualCards,
    transactions,
    loading,
    error,
    refetch,
    createVirtualCard,
    createTransaction
  };
};