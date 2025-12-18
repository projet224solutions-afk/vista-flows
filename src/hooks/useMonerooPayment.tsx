import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { getEdgeFunctionErrorMessage } from '@/utils/supabaseFunctionsError';

interface PaymentData {
  amount: number;
  currency?: string;
  description: string;
  customer: {
    email: string;
    first_name: string;
    last_name: string;
  };
  methods?: string[];
  metadata?: Record<string, any>;
}

interface PaymentResponse {
  success: boolean;
  payment_id: string;
  checkout_url: string;
  status: string;
}

export const useMonerooPayment = () => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);

  const initializePayment = async (paymentData: PaymentData): Promise<PaymentResponse | null> => {
    try {
      setLoading(true);

      const { data, error } = await supabase.functions.invoke('moneroo-initialize-payment', {
        body: {
          ...paymentData,
          currency: paymentData.currency || 'GNF',
          methods: paymentData.methods || ['orange_gn', 'mtn_gn'],
          return_url: `${window.location.origin}/payment-success`,
        },
      });

      if (error) {
        console.error('Error initializing payment:', error);

        const detailsMessage = await getEdgeFunctionErrorMessage(error);

        // Message par défaut
        let displayMessage = detailsMessage || error.message || 'Impossible d\'initialiser le paiement';

        // Détecter l'erreur de configuration Moneroo (donnée par Moneroo)
        if (
          displayMessage.includes('No payment methods enabled') ||
          displayMessage.includes('payment methods enabled for this currency')
        ) {
          displayMessage =
            '⚠️ Configuration requise: activez les méthodes (Orange/MTN) pour la devise GNF dans Moneroo (dans le même environnement que votre clé: Live/Test).';
        }

        toast({
          title: 'Erreur de paiement',
          description: displayMessage,
          variant: 'destructive',
          duration: 10000,
        });
        return null;
      }

      return data as PaymentResponse;
    } catch (error) {
      console.error('Error:', error);
      toast({
        title: 'Erreur',
        description: 'Une erreur est survenue',
        variant: 'destructive',
      });
      return null;
    } finally {
      setLoading(false);
    }
  };

  const verifyPayment = async (paymentId: string) => {
    try {
      setLoading(true);

      const { data, error } = await supabase.functions.invoke('moneroo-verify-payment', {
        body: { payment_id: paymentId },
      });

      if (error) {
        console.error('Error verifying payment:', error);
        const detailsMessage = await getEdgeFunctionErrorMessage(error);

        toast({
          title: 'Erreur',
          description: detailsMessage || 'Impossible de vérifier le paiement',
          variant: 'destructive',
        });
        return null;
      }

      return data;
    } catch (error) {
      console.error('Error:', error);
      toast({
        title: 'Erreur',
        description: 'Une erreur est survenue',
        variant: 'destructive',
      });
      return null;
    } finally {
      setLoading(false);
    }
  };

  return {
    initializePayment,
    verifyPayment,
    loading,
  };
};
