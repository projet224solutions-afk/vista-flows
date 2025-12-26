import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface PawapayPaymentOptions {
  amount: number;
  currency?: string;
  phoneNumber: string;
  correspondent: 'orange_money' | 'mtn_money';
  description: string;
  metadata?: Record<string, any>;
}

interface PawapayPaymentResult {
  success: boolean;
  depositId?: string;
  status?: string;
  error?: string;
}

interface PaymentStatus {
  status: string;
  mappedStatus: 'pending' | 'completed' | 'failed' | 'cancelled' | 'unknown';
  amount?: string;
  currency?: string;
}

export const usePawapayPayment = () => {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * Initier un paiement Orange Money ou MTN via PawaPay
   */
  const initializePayment = async (options: PawapayPaymentOptions): Promise<PawapayPaymentResult> => {
    setIsLoading(true);
    setError(null);

    try {
      console.log('[PawaPay] Initializing payment:', options);

      const { data, error: functionError } = await supabase.functions.invoke('pawapay-initialize-payment', {
        body: {
          amount: options.amount,
          currency: options.currency || 'GNF',
          phone_number: options.phoneNumber,
          correspondent: options.correspondent,
          description: options.description,
          metadata: options.metadata,
        },
      });

      if (functionError) {
        console.error('[PawaPay] Function error:', functionError);
        throw new Error(functionError.message || 'Erreur lors de l\'initialisation du paiement');
      }

      if (!data?.success) {
        throw new Error(data?.error || 'Échec de l\'initialisation du paiement');
      }

      console.log('[PawaPay] Payment initialized:', data);

      toast({
        title: 'Paiement initié',
        description: 'Veuillez confirmer le paiement sur votre téléphone',
      });

      return {
        success: true,
        depositId: data.deposit_id,
        status: data.status,
      };

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erreur inconnue';
      console.error('[PawaPay] Error:', errorMessage);
      setError(errorMessage);

      toast({
        title: 'Erreur de paiement',
        description: errorMessage,
        variant: 'destructive',
      });

      return {
        success: false,
        error: errorMessage,
      };
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Vérifier le statut d'un paiement
   */
  const verifyPayment = async (depositId: string): Promise<PaymentStatus | null> => {
    try {
      console.log('[PawaPay] Verifying payment:', depositId);

      const { data, error: functionError } = await supabase.functions.invoke('pawapay-verify-payment', {
        body: { deposit_id: depositId },
      });

      if (functionError) {
        console.error('[PawaPay] Verification error:', functionError);
        throw new Error(functionError.message);
      }

      if (!data?.success) {
        throw new Error(data?.error || 'Échec de la vérification');
      }

      console.log('[PawaPay] Payment status:', data);

      return {
        status: data.status,
        mappedStatus: data.mapped_status,
        amount: data.amount,
        currency: data.currency,
      };

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erreur inconnue';
      console.error('[PawaPay] Verification error:', errorMessage);
      
      toast({
        title: 'Erreur de vérification',
        description: errorMessage,
        variant: 'destructive',
      });

      return null;
    }
  };

  /**
   * Polling pour attendre la confirmation du paiement
   */
  const waitForPaymentConfirmation = async (
    depositId: string,
    options: {
      maxAttempts?: number;
      intervalMs?: number;
      onStatusChange?: (status: PaymentStatus) => void;
    } = {}
  ): Promise<PaymentStatus | null> => {
    const { maxAttempts = 60, intervalMs = 5000, onStatusChange } = options;
    let attempts = 0;

    while (attempts < maxAttempts) {
      const status = await verifyPayment(depositId);
      
      if (status) {
        onStatusChange?.(status);

        if (status.mappedStatus === 'completed') {
          toast({
            title: 'Paiement confirmé',
            description: 'Votre paiement a été effectué avec succès',
          });
          return status;
        }

        if (status.mappedStatus === 'failed' || status.mappedStatus === 'cancelled') {
          toast({
            title: 'Paiement échoué',
            description: 'Le paiement n\'a pas pu être complété',
            variant: 'destructive',
          });
          return status;
        }
      }

      attempts++;
      await new Promise(resolve => setTimeout(resolve, intervalMs));
    }

    toast({
      title: 'Délai dépassé',
      description: 'La vérification du paiement a pris trop de temps',
      variant: 'destructive',
    });

    return null;
  };

  return {
    initializePayment,
    verifyPayment,
    waitForPaymentConfirmation,
    isLoading,
    error,
  };
};
