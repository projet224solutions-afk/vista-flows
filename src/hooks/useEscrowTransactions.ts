import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface EscrowLog {
  id: string;
  escrow_id: string;
  action: string;
  performed_by: string | null;
  note: string | null;
  metadata: any;
  created_at: string;
}

export interface EscrowTransaction {
  id: string;
  order_id: string;
  payer_id: string;
  receiver_id: string;
  amount: number;
  currency: string;
  status: 'pending' | 'held' | 'released' | 'refunded' | 'dispute';
  commission_percent: number;
  commission_amount: number;
  transaction_id?: string;
  available_to_release_at?: string;
  released_by?: string;
  auto_release_enabled: boolean;
  dispute_reason?: string;
  metadata?: any;
  created_at: string;
  updated_at: string;
  receiver?: {
    id: string;
    business_name: string;
    user_id: string;
  };
  order?: {
    id: string;
    order_number: string;
  };
}

export function useEscrowTransactions() {
  const [transactions, setTransactions] = useState<EscrowTransaction[]>([]);
  const [logs, setLogs] = useState<Record<string, EscrowLog[]>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadTransactions = async () => {
    try {
      setLoading(true);
      
      // Charger les transactions escrow
      const { data: escrowData, error: escrowError } = await supabase
        .from('escrow_transactions')
        .select('*')
        .order('created_at', { ascending: false});

      if (escrowError) throw escrowError;
      
      // Charger les informations des vendeurs et commandes pour chaque transaction
      const enrichedData = await Promise.all((escrowData || []).map(async (transaction) => {
        // Charger les infos du vendeur
        const { data: vendorData } = await supabase
          .from('vendors')
          .select('id, business_name, user_id')
          .eq('id', transaction.receiver_id)
          .maybeSingle();
        
        // Charger les infos de la commande
        const { data: orderData } = await supabase
          .from('orders')
          .select('id, order_number')
          .eq('id', transaction.order_id)
          .maybeSingle();
        
        return {
          ...transaction,
          receiver: vendorData || undefined,
          order: orderData || undefined
        };
      }));
      
      setTransactions(enrichedData as EscrowTransaction[]);
      setError(null);
    } catch (err: any) {
      setError(err.message);
      toast.error('Erreur lors du chargement des transactions escrow');
      console.error('Erreur chargement escrow:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadLogs = async (escrowId: string) => {
    try {
      const { data, error } = await supabase
        .from('escrow_logs')
        .select('*')
        .eq('escrow_id', escrowId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setLogs(prev => ({ ...prev, [escrowId]: (data || []) as EscrowLog[] }));
    } catch (err: any) {
      console.error('Erreur lors du chargement des logs:', err);
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

  const requestRelease = async (escrowId: string) => {
    try {
      await supabase.rpc('log_escrow_action', {
        p_escrow_id: escrowId,
        p_action: 'requested_release',
        p_performed_by: (await supabase.auth.getUser()).data.user?.id,
        p_note: 'Demande de libération par le vendeur'
      });
      toast.success('Demande de libération envoyée');
      await loadTransactions();
    } catch (err: any) {
      toast.error('Erreur lors de la demande');
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
    logs,
    loading,
    error,
    initiateEscrow,
    releaseEscrow,
    refundEscrow,
    disputeEscrow,
    requestRelease,
    loadLogs,
    refresh: loadTransactions
  };
}
