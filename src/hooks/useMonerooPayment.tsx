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
          methods: paymentData.methods || ['om_gn', 'mtn_gn', 'moov_gn'],
          return_url: `${window.location.origin}/payment-success`,
        },
      });

      if (error) {
        console.error('Error initializing payment:', error);
        toast({
          title: 'Erreur',
          description: 'Impossible d\'initialiser le paiement',
          variant: 'destructive',
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
