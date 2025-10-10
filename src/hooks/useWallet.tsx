/**
 * HOOK WALLET OPÉRATIONNEL - DONNÉES RÉELLES
 * Gestion complète du portefeuille utilisateur
 * 224Solutions - Wallet System Opérationnel
 */

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
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
    try {
      setLoading(true);
      const { data: walletData, error: walletError } = await supabase
        .from('wallets')
        .select('*')
        .eq('user_id', userId)
        .single();

      if (walletError) {
        if (walletError.code === 'PGRST116') {
          // Créer un wallet s'il n'existe pas
          const { data: newWallet, error: createError } = await supabase
            .from('wallets')
            .insert({
              user_id: userId,
              balance: 0,
              currency: 'GNF'
            })
            .select()
            .single();

          if (createError) throw createError;
          setWallet(newWallet);
        } else {
          throw walletError;
        }
      } else {
        setWallet(walletData);
      }
    } catch (error) {
      console.error('❌ Erreur chargement wallet:', error);
      setError('Erreur lors du chargement du portefeuille');
      toast.error('Erreur lors du chargement du portefeuille');
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

  // Charger les transactions
  const loadTransactions = useCallback(async (userId: string) => {
    try {
      // Récupérer l'id du wallet de l'utilisateur
      const { data: walletRow, error: walletErr } = await supabase
        .from('wallets')
        .select('id')
        .eq('user_id', userId)
        .single();

      if (walletErr || !walletRow?.id) {
        throw walletErr || new Error('Wallet introuvable');
      }

      const { data: transactionsData, error: transactionsError } = await supabase
        .from('wallet_transactions')
        .select('*')
        .or(`sender_wallet_id.eq.${walletRow.id},receiver_wallet_id.eq.${walletRow.id}`)
        .order('created_at', { ascending: false })
        .limit(50);

      if (transactionsError) {
        console.error('❌ Erreur chargement transactions:', transactionsError);
        throw transactionsError;
      }

      // Le schéma wallet_transactions diffère de l'interface locale; on caste pour affichage
      setTransactions((transactionsData as unknown) as Transaction[]);
    } catch (error) {
      console.error('❌ Erreur chargement transactions:', error);
      setError('Erreur lors du chargement des transactions');
    }
  }, []);

  // Créer une carte virtuelle
  const createVirtualCard = useCallback(async (userId: string) => {
    try {
      const cardNumber = Math.random().toString().slice(2, 18);
      const expiryDate = new Date();
      expiryDate.setFullYear(expiryDate.getFullYear() + 3);
      
      const { data: cardData, error: cardError } = await supabase
        .from('virtual_cards')
        .insert({
          user_id: userId,
          card_number: cardNumber,
          expiry_date: expiryDate.toISOString().split('T')[0],
          cvv: Math.floor(Math.random() * 900) + 100,
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
      
      const { data: transactionData, error: transactionError } = await supabase
        .from('wallet_transactions')
        .insert({
          user_id: userId,
          order_id: orderId,
          amount: amount,
          transaction_type: method,
          status: 'pending',
          reference_number: referenceNumber,
          description: description
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