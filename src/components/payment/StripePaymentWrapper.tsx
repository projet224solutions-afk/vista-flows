/**
 * STRIPE PAYMENT WRAPPER
 * Wrapper avec Stripe Elements Provider
 * 224SOLUTIONS
 */

import React, { useState, useEffect } from 'react';
import { Elements } from '@stripe/react-stripe-js';
import { loadStripe, Stripe, StripeElementsOptions } from '@stripe/stripe-js';
import { StripePaymentForm } from './StripePaymentForm';
import { Card, CardContent } from '@/components/ui/card';
import { Loader2, AlertTriangle } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface StripePaymentWrapperProps {
  amount: number;
  currency: string;
  sellerId: string;
  sellerName: string;
  orderId?: string;
  serviceId?: string;
  productId?: string;
  orderDescription?: string;
  metadata?: Record<string, string>;
  onSuccess: (paymentIntentId: string) => void;
  onError: (error: string) => void;
}

let stripePromise: Promise<Stripe | null> | null = null;

const getStripePublishableKey = async (): Promise<string> => {
  // Essayer d'abord les variables d'environnement
  const envKey = import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY;
  if (envKey) {
    return envKey;
  }

  // Sinon, récupérer depuis la base de données
  const { data, error } = await supabase
    .from('stripe_config')
    .select('stripe_publishable_key')
    .limit(1)
    .single();

  if (error || !data?.stripe_publishable_key) {
    throw new Error('Stripe publishable key not configured');
  }

  return data.stripe_publishable_key;
};

const getStripe = async (): Promise<Stripe | null> => {
  if (!stripePromise) {
    const key = await getStripePublishableKey();
    stripePromise = loadStripe(key);
  }
  return stripePromise;
};

export function StripePaymentWrapper({
  amount,
  currency,
  sellerId,
  sellerName,
  orderId,
  serviceId,
  productId,
  orderDescription,
  metadata = {},
  onSuccess,
  onError
}: StripePaymentWrapperProps) {
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [stripe, setStripe] = useState<Stripe | null>(null);

  useEffect(() => {
    const initializePayment = async () => {
      try {
        setLoading(true);
        setError(null);

        // Charger Stripe
        const stripeInstance = await getStripe();
        setStripe(stripeInstance);

        if (!stripeInstance) {
          throw new Error('Failed to load Stripe');
        }

        // Créer PaymentIntent via Edge Function
        const { data, error: apiError } = await supabase.functions.invoke('create-payment-intent', {
          body: {
            amount,
            currency: currency.toLowerCase(),
            seller_id: sellerId,
            order_id: orderId,
            service_id: serviceId,
            product_id: productId,
            metadata,
          }
        });

        if (apiError) {
          throw new Error(apiError.message || 'Failed to create payment intent');
        }

        if (!data?.client_secret) {
          throw new Error('No client secret returned');
        }

        console.log('✅ PaymentIntent created:', data.payment_intent_id);
        setClientSecret(data.client_secret);

      } catch (err) {
        console.error('❌ Payment initialization error:', err);
        const message = err instanceof Error ? err.message : 'Erreur lors de l\'initialisation du paiement';
        setError(message);
        toast.error(message);
        onError(message);
      } finally {
        setLoading(false);
      }
    };

    initializePayment();
  }, [amount, currency, sellerId, orderId, serviceId, productId]);

  if (loading) {
    return (
      <Card className="w-full max-w-md mx-auto">
        <CardContent className="pt-6">
          <div className="flex flex-col items-center justify-center py-12 space-y-4">
            <Loader2 className="w-12 h-12 animate-spin text-primary" />
            <p className="text-sm text-muted-foreground">Chargement du paiement sécurisé...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error || !clientSecret || !stripe) {
    return (
      <Card className="w-full max-w-md mx-auto">
        <CardContent className="pt-6">
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              {error || 'Impossible de charger le système de paiement. Veuillez réessayer.'}
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
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
        colorDanger: 'hsl(var(--destructive))',
        fontFamily: 'system-ui, sans-serif',
        borderRadius: '0.5rem',
      },
    },
    loader: 'auto',
  };

  return (
    <Elements stripe={stripe} options={elementsOptions}>
      <StripePaymentForm
        amount={amount}
        currency={currency}
        sellerName={sellerName}
        orderDescription={orderDescription}
        onSuccess={onSuccess}
        onError={onError}
      />
    </Elements>
  );
}
