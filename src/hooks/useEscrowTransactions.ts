import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface EscrowTransaction {
  id: string;
  order_id: string;
  payer_id: string;
  receiver_id: string;
  amount: number;
  currency: string;
  status: 'pending' | 'released' | 'refunded' | 'dispute';
  commission_percent: number;
  commission_amount: number;
  created_at: string;
  updated_at: string;
}

export function useEscrowTransactions() {
  const [transactions, setTransactions] = useState<EscrowTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadTransactions = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('escrow_transactions')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setTransactions((data || []) as EscrowTransaction[]);
      setError(null);
    } catch (err: any) {
      setError(err.message);
      toast.error('Erreur lors du chargement des transactions escrow');
    } finally {
      setLoading(false);
    }
  };

  const initiateEscrow = async (
    orderId: string,
    payerId: string,
    receiverId: string,
    amount: number,
    currency: string = 'GNF'
  ) => {
    try {
      const { data, error } = await supabase.rpc('initiate_escrow', {
        p_order_id: orderId,
        p_payer_id: payerId,
        p_receiver_id: receiverId,
        p_amount: amount,
        p_currency: currency
      });

      if (error) throw error;
      toast.success('Transaction escrow initiée avec succès');
      await loadTransactions();
      return data;
    } catch (err: any) {
      toast.error('Erreur lors de l\'initiation de l\'escrow');
      throw err;
    }
  };

  const releaseEscrow = async (escrowId: string, commissionPercent: number = 0) => {
    try {
      const { data, error } = await supabase.rpc('release_escrow', {
        p_escrow_id: escrowId,
        p_commission_percent: commissionPercent
      });

      if (error) throw error;
      toast.success('Fonds libérés avec succès');
      await loadTransactions();
      return data;
    } catch (err: any) {
      toast.error('Erreur lors de la libération des fonds');
      throw err;
    }
  };

  const refundEscrow = async (escrowId: string) => {
    try {
      const { data, error } = await supabase.rpc('refund_escrow', {
        p_escrow_id: escrowId
      });

      if (error) throw error;
      toast.success('Remboursement effectué avec succès');
      await loadTransactions();
      return data;
    } catch (err: any) {
      toast.error('Erreur lors du remboursement');
      throw err;
    }
  };

  const disputeEscrow = async (escrowId: string) => {
    try {
      const { data, error } = await supabase.rpc('dispute_escrow', {
        p_escrow_id: escrowId
      });

      if (error) throw error;
      toast.success('Litige ouvert avec succès');
      await loadTransactions();
      return data;
    } catch (err: any) {
      toast.error('Erreur lors de l\'ouverture du litige');
      throw err;
    }
  };

  useEffect(() => {
    loadTransactions();

    // S'abonner aux changements en temps réel
    const subscription = supabase
      .channel('escrow_transactions_changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'escrow_transactions' },
        () => {
          loadTransactions();
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  return {
    transactions,
    loading,
    error,
    initiateEscrow,
    releaseEscrow,
    refundEscrow,
    disputeEscrow,
    refresh: loadTransactions
  };
}
