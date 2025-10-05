import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { useToast } from './use-toast';
import WalletTransferService from '@/services/WalletTransferService';

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
  reference_number?: string;
  description?: string;
  created_at: string;
  updated_at: string;
}

export const useWallet = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [wallet, setWallet] = useState<Wallet | null>(null);
  const [virtualCards, setVirtualCards] = useState<VirtualCard[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Récupérer le wallet de l'utilisateur
  const fetchWallet = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('wallets')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      if (error) throw error;
      setWallet(data);
    } catch (err) {
      setError(err.message);
      console.error('Error fetching wallet:', err);
    }
  };

  // Récupérer les cartes virtuelles
  const fetchVirtualCards = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('virtual_cards')
        .select('*')
        .eq('user_id', user.id)
        .eq('status', 'active');

      if (error) throw error;
      setVirtualCards(data || []);
    } catch (err) {
      console.error('Error fetching virtual cards:', err);
    }
  };

  // Récupérer les transactions
  const fetchTransactions = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('transactions')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(20);

      if (error) throw error;
      setTransactions(data || []);
    } catch (err) {
      console.error('Error fetching transactions:', err);
    }
  };

  // Créer une carte virtuelle
  const createVirtualCard = async () => {
    if (!user) return null;

    try {
      // Générer une date d'expiration (5 ans dans le futur)
      const now = new Date();
      const expiryDate = `${String(now.getMonth() + 1).padStart(2, '0')}/${String(now.getFullYear() + 5).slice(-2)}`;
      
      // Générer un CVV aléatoire
      const cvv = Math.floor(100 + Math.random() * 900).toString();
      
      const { data, error } = await supabase.rpc('generate_card_number');
      
      if (error) throw error;

      const cardNumber = data;

      const { data: newCard, error: insertError } = await supabase
        .from('virtual_cards')
        .insert({
          user_id: user.id,
          card_number: cardNumber,
          expiry_date: expiryDate,
          cvv: cvv,
          status: 'active'
        })
        .select()
        .single();

      if (insertError) throw insertError;

      setVirtualCards(prev => [...prev, newCard]);
      toast({
        title: "Carte virtuelle créée",
        description: "Votre nouvelle carte 224SOLUTIONS a été générée avec succès",
      });

      return newCard;
    } catch (err) {
      toast({
        title: "Erreur",
        description: "Impossible de créer la carte virtuelle",
        variant: "destructive",
      });
      console.error('Error creating virtual card:', err);
      return null;
    }
  };

  // Créer une transaction
  const createTransaction = async (
    amount: number,
    method: 'card' | 'wallet' | 'mobile_money' | 'escrow' | 'orange_money' | 'mtn' | 'wave',
    description?: string,
    orderId?: string
  ) => {
    if (!user) return null;

    try {
      const { data, error } = await supabase
        .from('transactions')
        .insert([{
          user_id: user.id,
          order_id: orderId,
          amount,
          method,
          status: 'pending',
          description,
          reference_number: `TXN-${Date.now()}`
        }])
        .select()
        .single();

      if (error) throw error;

      setTransactions(prev => [data, ...prev]);
      
      toast({
        title: "Transaction créée",
        description: `Transaction de ${amount} ${wallet?.currency || 'GNF'} créée`,
      });

      return data;
    } catch (err) {
      toast({
        title: "Erreur",
        description: "Impossible de créer la transaction",
        variant: "destructive",
      });
      console.error('Error creating transaction:', err);
      return null;
    }
  };

  // Recharger le wallet
  const rechargeWallet = async (amount: number, method: 'card' | 'wallet' | 'mobile_money' | 'escrow' | 'orange_money' | 'mtn' | 'wave') => {
    if (!user || !wallet) return false;

    try {
      // Créer la transaction
      const transaction = await createTransaction(amount, method, `Rechargement wallet via ${method}`);
      
      if (!transaction) return false;

      // Mettre à jour le solde du wallet
      const { error } = await supabase
        .from('wallets')
        .update({ 
          balance: wallet.balance + amount,
          updated_at: new Date().toISOString()
        })
        .eq('id', wallet.id);

      if (error) throw error;

      // Mettre à jour le statut de la transaction
      await supabase
        .from('transactions')
        .update({ status: 'completed' })
        .eq('id', transaction.id);

      setWallet(prev => prev ? { ...prev, balance: prev.balance + amount } : null);
      
      toast({
        title: "Rechargement réussi",
        description: `Votre wallet a été rechargé de ${amount} ${wallet.currency}`,
      });

      return true;
    } catch (err) {
      toast({
        title: "Erreur de rechargement",
        description: "Impossible de recharger le wallet",
        variant: "destructive",
      });
      console.error('Error recharging wallet:', err);
      return false;
    }
  };

  useEffect(() => {
    if (user) {
      Promise.all([
        fetchWallet(),
        fetchVirtualCards(),
        fetchTransactions()
      ]).finally(() => setLoading(false));
    }
  }, [user]);


  // Transfert entre wallets
  const transferFunds = async (
    toUserEmail: string,
    amount: number,
    description?: string,
    currency: string = 'GNF'
  ) => {
    if (!user || !wallet) {
      toast({
        title: "Erreur",
        description: "Utilisateur ou wallet non trouvé",
        variant: "destructive",
      });
      return false;
    }

    if (wallet.balance < amount) {
      toast({
        title: "Erreur",
        description: "Solde insuffisant",
        variant: "destructive",
      });
      return false;
    }

    try {
      const result = await WalletTransferService.transferFunds({
        fromUserId: user.id,
        toUserEmail,
        amount,
        description,
        currency
      });

      if (result.success) {
        // Mettre à jour le solde local
        setWallet(prev => prev ? { ...prev, balance: result.newBalance || 0 } : null);
        
        // Recharger les données
        await Promise.all([fetchWallet(), fetchTransactions()]);
        
        toast({
          title: "Transfert réussi",
          description: `${amount} ${currency} transféré vers ${toUserEmail}`,
        });
        
        return true;
      } else {
        toast({
          title: "Erreur de transfert",
          description: result.error || "Erreur inconnue",
          variant: "destructive",
        });
        return false;
      }
    } catch (error) {
      toast({
        title: "Erreur",
        description: "Erreur lors du transfert",
        variant: "destructive",
      });
      console.error('Error transferring funds:', error);
      return false;
    }
  };

  // Vérifier si un utilisateur peut recevoir des transferts
  const canReceiveTransfer = async (userEmail: string) => {
    return await WalletTransferService.canReceiveTransfer(userEmail);
  };

  // Récupérer l'historique des transferts
  const getTransferHistory = async (limit: number = 20) => {
    if (!user) return [];
    return await WalletTransferService.getTransferHistory(user.id, limit);
  };

    return {
    wallet,
    virtualCards,
    transactions,
    loading,
    error,
    createVirtualCard,
    createTransaction,
    rechargeWallet,
    refetch: () => {
      fetchWallet();
      fetchVirtualCards();
      fetchTransactions();
    }
  };
};