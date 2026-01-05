/**
 * WRAPPER PAIEMENT 224SOLUTIONS
 * Initialisation Stripe avec design personnalisé 224Solutions
 */

import React, { useEffect, useState } from 'react';
import { Elements } from '@stripe/react-stripe-js';
import { loadStripe, StripeElementsOptions } from '@stripe/stripe-js';
import { Custom224PaymentForm } from './Custom224PaymentForm';
import { Card, CardContent } from '@/components/ui/card';
import { Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

// Clé publique Stripe depuis les variables d'environnement
const stripePublicKey = import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY || 'pk_live_51RdKJzRxqizQJVjLFseVlmZ7qOJmOIx9PlsGPY600C0CifOqNyNlbfTb2NZAbW1cyVgk8hUt6vGAD3KQqMCIc7NB00F0KjYCqc';
const stripePromise = loadStripe(stripePublicKey);

interface Custom224PaymentWrapperProps {
  amount: number;
  currency?: string;
  sellerName: string;
  sellerId: string;
  orderDescription?: string;
  metadata?: Record<string, string>;
  onSuccess: (paymentIntentId: string) => void;
  onError: (error: string) => void;
}

export function Custom224PaymentWrapper({
  amount,
  currency = 'GNF',
  sellerName,
  sellerId,
  orderDescription,
  metadata = {},
  onSuccess,
  onError
}: Custom224PaymentWrapperProps) {
  const [clientSecret, setClientSecret] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>('');

  useEffect(() => {
    createPaymentIntent();
  }, [amount, currency]);

  const createPaymentIntent = async () => {
    try {
      setLoading(true);
      setError('');

      // Appeler Edge Function pour créer le Payment Intent
      const { data, error: functionError } = await supabase.functions.invoke('create-payment-intent', {
        body: {
          amount,
          currency: currency.toLowerCase(),
          seller_id: sellerId,
          seller_name: sellerName,
          description: orderDescription || `Paiement 224Solutions - ${sellerName}`,
          metadata: {
            ...metadata,
            platform: '224solutions',
            seller_name: sellerName,
          }
        }
      });

      if (functionError) {
        throw functionError;
      }

      if (!data || !data.clientSecret) {
        throw new Error('Pas de client secret reçu');
      }

      setClientSecret(data.clientSecret);
      
      // Rendre disponible globalement pour Custom224PaymentForm
      (window as any).clientSecret = data.clientSecret;

    } catch (err) {
      console.error('Error creating payment intent:', err);
      const message = err instanceof Error ? err.message : 'Erreur lors de l\'initialisation du paiement';
      setError(message);
      onError(message);
    } finally {
      setLoading(false);
    }
  };

  // Options Stripe Elements avec le thème 224Solutions
  const elementsOptions: StripeElementsOptions = {
    clientSecret,
    appearance: {
      theme: 'stripe',
      variables: {
        colorPrimary: '#0070f3', // Couleur principale 224Solutions
        colorBackground: '#ffffff',
        colorText: '#1a1a1a',
        colorDanger: '#ef4444',
        fontFamily: 'Inter, system-ui, sans-serif',
        spacingUnit: '4px',
        borderRadius: '8px',
      },
      rules: {
        '.Label': {
          fontWeight: '600',
          fontSize: '14px',
          marginBottom: '8px',
        },
        '.Input': {
          padding: '16px',
          border: '2px solid #e5e7eb',
          boxShadow: 'none',
        },
        '.Input:focus': {
          border: '2px solid #0070f3',
          boxShadow: '0 0 0 3px rgba(0, 112, 243, 0.1)',
        },
      }
    },
    locale: 'fr',
  };

  if (loading) {
    return (
      <Card className="w-full max-w-lg mx-auto">
        <CardContent className="pt-12 pb-12">
          <div className="flex flex-col items-center justify-center space-y-4">
            <Loader2 className="w-12 h-12 animate-spin text-primary" />
            <div className="text-center">
              <p className="text-lg font-semibold">Initialisation du paiement...</p>
              <p className="text-sm text-muted-foreground mt-2">
                Connexion sécurisée avec 224Solutions
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="w-full max-w-lg mx-auto border-red-200">
        <CardContent className="pt-8 pb-8">
          <div className="text-center space-y-4">
            <div className="text-red-500 text-4xl">❌</div>
            <div>
              <h3 className="text-xl font-semibold text-red-600">Erreur</h3>
              <p className="text-muted-foreground mt-2">{error}</p>
              <button
                onClick={createPaymentIntent}
                className="mt-4 px-6 py-2 bg-primary text-white rounded-lg hover:bg-primary/90"
              >
                Réessayer
              </button>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!clientSecret) {
    return null;
  }

  return (
    <Elements stripe={stripePromise} options={elementsOptions}>
      <Custom224PaymentForm
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
