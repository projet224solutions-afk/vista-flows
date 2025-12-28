import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';

export interface TransferPreview {
  success: boolean;
  amount_sent: number;
  currency_sent: string;
  fee_percentage: number;
  fee_amount: number;
  amount_after_fee: number;
  rate_displayed: number;
  amount_received: number;
  currency_received: string;
  error?: string;
}

export interface TransferResult extends TransferPreview {
  transfer_id?: string;
  transfer_code?: string;
}

interface UseWalletTransferResult {
  preview: TransferPreview | null;
  loading: boolean;
  executing: boolean;
  error: string | null;
  getPreview: (receiverId: string, amount: number) => Promise<TransferPreview | null>;
  executeTransfer: (receiverId: string, amount: number, description?: string) => Promise<TransferResult | null>;
  clearPreview: () => void;
}

export function useWalletTransfer(): UseWalletTransferResult {
  const { user } = useAuth();
  const [preview, setPreview] = useState<TransferPreview | null>(null);
  const [loading, setLoading] = useState(false);
  const [executing, setExecuting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const getPreview = useCallback(async (receiverId: string, amount: number): Promise<TransferPreview | null> => {
    if (!user?.id) {
      setError('Non authentifié');
      return null;
    }

    if (amount <= 0) {
      setError('Le montant doit être positif');
      return null;
    }

    try {
      setLoading(true);
      setError(null);

      const { data, error: fnError } = await supabase.functions.invoke('wallet-transfer', {
        body: {
          sender_id: user.id,
          receiver_id: receiverId,
          amount,
        },
        headers: {
          'Content-Type': 'application/json',
        },
        method: 'POST',
      });

      // Ajouter le query param pour l'action preview via URL reconstruction
      const { data: previewData, error: previewError } = await supabase.functions.invoke(
        'wallet-transfer?action=preview',
        {
          body: {
            sender_id: user.id,
            receiver_id: receiverId,
            amount,
          },
        }
      );

      if (previewError) throw previewError;

      if (previewData?.success) {
        setPreview(previewData);
        return previewData;
      } else {
        throw new Error(previewData?.error || 'Erreur lors de la prévisualisation');
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erreur de prévisualisation';
      setError(message);
      toast.error(message);
      return null;
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  const executeTransfer = useCallback(async (
    receiverId: string,
    amount: number,
    description?: string
  ): Promise<TransferResult | null> => {
    if (!user?.id) {
      setError('Non authentifié');
      return null;
    }

    try {
      setExecuting(true);
      setError(null);

      const { data, error: fnError } = await supabase.functions.invoke(
        'wallet-transfer?action=transfer',
        {
          body: {
            sender_id: user.id,
            receiver_id: receiverId,
            amount,
            description,
          },
        }
      );

      if (fnError) throw fnError;

      if (data?.success) {
        toast.success(`Transfert réussi! Code: ${data.transfer_code}`);
        
        // Déclencher l'événement de mise à jour du wallet
        window.dispatchEvent(new CustomEvent('wallet-updated'));
        
        setPreview(null);
        return data;
      } else {
        throw new Error(data?.error || 'Erreur lors du transfert');
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erreur de transfert';
      setError(message);
      toast.error(message);
      return null;
    } finally {
      setExecuting(false);
    }
  }, [user?.id]);

  const clearPreview = useCallback(() => {
    setPreview(null);
    setError(null);
  }, []);

  return {
    preview,
    loading,
    executing,
    error,
    getPreview,
    executeTransfer,
    clearPreview,
  };
}
