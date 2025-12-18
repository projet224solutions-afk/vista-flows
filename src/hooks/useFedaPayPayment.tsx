import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { getEdgeFunctionErrorMessage } from '@/utils/supabaseFunctionsError';

interface FedaPayPaymentOptions {
  amount: number;
  currency?: string;
  description?: string;
  customerEmail?: string;
  customerPhone?: string;
  customerName?: string;
  orderId?: string;
  callbackUrl?: string;
  returnUrl?: string;
}

interface FedaPayPaymentResult {
  success: boolean;
  transactionId?: string;
  paymentUrl?: string;
  paymentToken?: string;
  error?: string;
}

export function useFedaPayPayment() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const initializePayment = async (options: FedaPayPaymentOptions): Promise<FedaPayPaymentResult> => {
    setIsLoading(true);
    setError(null);

    try {
      console.log('Initializing FedaPay payment:', options);

      const { data, error: fnError } = await supabase.functions.invoke('fedapay-initialize-payment', {
        body: {
          amount: options.amount,
          currency: options.currency || 'GNF',
          description: options.description,
          customer_email: options.customerEmail,
          customer_phone: options.customerPhone,
          customer_name: options.customerName,
          order_id: options.orderId,
          callback_url: options.callbackUrl,
          return_url: options.returnUrl,
        },
      });

      if (fnError) {
        const errorMessage = await getEdgeFunctionErrorMessage(fnError) || fnError.message || 'Erreur inconnue';
        console.error('FedaPay function error:', fnError);
        setError(errorMessage);
        toast.error('Erreur FedaPay', { description: errorMessage });
        return { success: false, error: errorMessage };
      }

      if (data?.error) {
        const errorMessage = data.fedapay_message || data.error || 'Erreur inconnue';
        console.error('FedaPay API error:', data);
        setError(errorMessage);
        toast.error('Erreur FedaPay', { description: errorMessage });
        return { success: false, error: errorMessage };
      }

      if (data?.success && data?.payment_url) {
        console.log('FedaPay payment initialized:', data);
        return {
          success: true,
          transactionId: data.transaction_id,
          paymentUrl: data.payment_url,
          paymentToken: data.payment_token,
        };
      }

      const errorMessage = 'Réponse inattendue de FedaPay';
      setError(errorMessage);
      return { success: false, error: errorMessage };

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erreur inattendue';
      console.error('FedaPay unexpected error:', err);
      setError(errorMessage);
      toast.error('Erreur', { description: errorMessage });
      return { success: false, error: errorMessage };
    } finally {
      setIsLoading(false);
    }
  };

  const openPaymentPage = async (options: FedaPayPaymentOptions): Promise<boolean> => {
    const result = await initializePayment(options);
    
    if (result.success && result.paymentUrl) {
      window.open(result.paymentUrl, '_blank');
      return true;
    }
    
    return false;
  };

  return {
    initializePayment,
    openPaymentPage,
    isLoading,
    error,
  };
}
