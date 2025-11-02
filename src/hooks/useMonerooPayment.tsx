import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

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
        
        // Analyser le message d'erreur
        const errorMessage = error.message || '';
        let displayMessage = 'Impossible d\'initialiser le paiement';
        
        // Détecter l'erreur de configuration Moneroo
        if (errorMessage.includes('No payment methods enabled') || 
            errorMessage.includes('payment methods enabled for this currency')) {
          displayMessage = '⚠️ Configuration requise: Veuillez activer Orange Money et MTN MoMo pour la Guinée (GNF) dans votre tableau de bord Moneroo sur app.moneroo.io';
        }
        
        toast({
          title: 'Erreur de configuration',
          description: displayMessage,
          variant: 'destructive',
          duration: 10000, // Afficher plus longtemps pour ce message important
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
        toast({
          title: 'Erreur',
          description: 'Impossible de vérifier le paiement',
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
