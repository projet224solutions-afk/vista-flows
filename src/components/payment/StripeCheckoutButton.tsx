/**
 * STRIPE CHECKOUT BUTTON - Paiement par carte bancaire via Stripe
 * Remplace PayPalCheckoutButton
 * 224SOLUTIONS
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { loadStripe, Stripe, StripeElementsOptions } from '@stripe/stripe-js';
import { Elements, PaymentElement, useStripe, useElements } from '@stripe/react-stripe-js';
import { supabase } from '@/integrations/supabase/client';
import { signedInvoke, generateIdempotencyKey } from '@/lib/security/hmacSigner';
import { toast } from 'sonner';
import { Loader2, Shield, CreditCard } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';

// Clé publique Stripe (variable d'environnement obligatoire)
const STRIPE_PUBLISHABLE_KEY = import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY || '';

let stripePromise: Promise<Stripe | null> | null = null;
const getStripe = () => {
  if (!stripePromise) {
    stripePromise = loadStripe(STRIPE_PUBLISHABLE_KEY);
  }
  return stripePromise;
};

interface StripeCheckoutButtonProps {
  amount: number;
  currency?: string;
  description?: string;
  orderId?: string;
  /** If provided, uses stripe-pos-payment with commission logic */
  sellerId?: string;
  /** Custom edge function name override */
  edgeFunction?: string;
  /** Extra params to send to the edge function */
  extraParams?: Record<string, unknown>;
  onSuccess: (data: {
    paymentIntentId: string;
    amount: number;
    currency: string;
  }) => void;
  onCancel?: () => void;
  onError?: (error: string) => void;
  /** If true, credit wallet instead of just returning capture data */
  creditWallet?: boolean;
  disabled?: boolean;
}

/** Inner form rendered inside <Elements> */
function CheckoutForm({
  amount,
  currency,
  onSuccess,
  onCancel,
  onError,
  creditWallet,
}: {
  amount: number;
  currency: string;
  onSuccess: StripeCheckoutButtonProps['onSuccess'];
  onCancel?: () => void;
  onError?: (error: string) => void;
  creditWallet?: boolean;
}) {
  const stripe = useStripe();
  const elements = useElements();
  const [processing, setProcessing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!stripe || !elements) return;

    setProcessing(true);
    setErrorMessage(null);

    try {
      const { error, paymentIntent } = await stripe.confirmPayment({
        elements,
        confirmParams: {
          return_url: `${window.location.origin}/payment/success`,
        },
        redirect: 'if_required',
      });

      if (error) {
        const msg = error.message || 'Erreur de paiement';
        setErrorMessage(msg);
        onError?.(msg);
        toast.error(msg);
      } else if (paymentIntent?.status === 'succeeded' || paymentIntent?.status === 'requires_capture') {
        // requires_capture = escrow (capture manuelle), succeeded = capture immédiate
        const isEscrow = paymentIntent.status === 'requires_capture';
        toast.success(isEscrow ? 'Fonds sécurisés en escrow !' : 'Paiement réussi !');
        if (creditWallet) {
          window.dispatchEvent(new Event('wallet-updated'));
        }
        onSuccess({
          paymentIntentId: paymentIntent.id,
          amount,
          currency,
        });
      } else if (paymentIntent?.status === 'processing') {
        toast.info('Paiement en cours de traitement...');
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Erreur inconnue';
      setErrorMessage(msg);
      onError?.(msg);
      toast.error(msg);
    } finally {
      setProcessing(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <PaymentElement
        options={{
          layout: 'tabs',
          paymentMethodOrder: ['card'],
        }}
      />

      {errorMessage && (
        <Alert variant="destructive">
          <AlertDescription>{errorMessage}</AlertDescription>
        </Alert>
      )}

      <Button
        type="submit"
        disabled={!stripe || processing}
        className="w-full"
        size="lg"
      >
        {processing ? (
          <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Traitement...</>
        ) : (
          <><CreditCard className="mr-2 h-4 w-4" /> Payer par carte</>
        )}
      </Button>

      {onCancel && (
        <Button type="button" variant="ghost" onClick={onCancel} className="w-full" size="sm">
          Annuler
        </Button>
      )}

      <div className="flex items-center gap-2 justify-center">
        <Shield className="w-3.5 h-3.5 text-muted-foreground" />
        <p className="text-xs text-muted-foreground">Paiement sécurisé via Stripe</p>
      </div>
    </form>
  );
}

export default function StripeCheckoutButton({
  amount,
  currency = 'USD',
  description = 'Paiement 224Solutions',
  orderId,
  sellerId,
  edgeFunction,
  extraParams,
  onSuccess,
  onCancel,
  onError,
  creditWallet = false,
  disabled = false,
}: StripeCheckoutButtonProps) {
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [stripe, setStripe] = useState<Stripe | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const mountedRef = useRef(true);
  const initCalledRef = useRef(false);

  useEffect(() => {
    mountedRef.current = true;
    initCalledRef.current = false;
    return () => { mountedRef.current = false; };
  }, []);

  useEffect(() => {
    // Guard against duplicate calls (StrictMode double-mount)
    if (initCalledRef.current) return;

    const init = async () => {
      initCalledRef.current = true;
      try {
        setLoading(true);
        setError(null);

        const stripeInstance = await getStripe();
        if (!mountedRef.current) return;
        setStripe(stripeInstance);

        if (!stripeInstance) {
          throw new Error('Impossible de charger Stripe');
        }

        // Determine which edge function to use
        let functionName: string;
        let body: Record<string, unknown>;

        if (edgeFunction) {
          functionName = edgeFunction;
          body = { amount, currency: currency.toLowerCase(), orderId, sellerId, description, ...extraParams };
        } else if (creditWallet) {
          functionName = 'stripe-deposit';
          body = { amount, currency: currency.toLowerCase() };
        } else if (sellerId) {
          functionName = 'stripe-pos-payment';
          body = { amount, currency: currency.toLowerCase(), orderId, sellerId, description };
        } else {
          functionName = 'stripe-deposit';
          body = { amount, currency: currency.toLowerCase() };
        }

        const { data, error: apiError } = await supabase.functions.invoke(functionName, { body });

        if (!mountedRef.current) return;

        if (apiError) throw new Error(apiError.message);
        if (!data?.success && !data?.clientSecret && !data?.client_secret) {
          throw new Error(data?.error || 'Erreur création paiement');
        }

        const secret = data.clientSecret || data.client_secret;
        if (!secret) throw new Error('Pas de client secret retourné');

        setClientSecret(secret);
      } catch (err) {
        if (!mountedRef.current) return;
        const msg = err instanceof Error ? err.message : 'Erreur initialisation';
        setError(msg);
        onError?.(msg);
      } finally {
        if (mountedRef.current) setLoading(false);
      }
    };

    if (!disabled) init();
  }, [amount, currency, orderId, creditWallet, disabled]);

  if (disabled) {
    return (
      <div className="opacity-50 pointer-events-none p-4 text-center text-sm text-muted-foreground">
        Paiement par carte non disponible
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center p-4 gap-2">
        <Loader2 className="w-4 h-4 animate-spin text-primary" />
        <span className="text-sm text-muted-foreground">Chargement du paiement...</span>
      </div>
    );
  }

  if (error || !clientSecret || !stripe) {
    return (
      <Alert variant="destructive" className="my-2">
        <AlertDescription>
          {error || 'Impossible de charger le système de paiement. Veuillez réessayer.'}
        </AlertDescription>
      </Alert>
    );
  }

  const elementsOptions: StripeElementsOptions = {
    clientSecret,
    appearance: {
      theme: 'stripe',
      variables: {
        colorPrimary: 'hsl(var(--primary))',
        colorBackground: 'hsl(var(--background))',
        colorText: 'hsl(var(--foreground))',
        fontFamily: 'system-ui, sans-serif',
        borderRadius: '0.5rem',
      },
    },
    loader: 'auto',
  };

  return (
    <Elements stripe={stripe} options={elementsOptions}>
      <CheckoutForm
        amount={amount}
        currency={currency}
        onSuccess={onSuccess}
        onCancel={onCancel}
        onError={onError}
        creditWallet={creditWallet}
      />
    </Elements>
  );
}
