/**
 * STRIPE CARD PAYMENT MODAL - Modal de paiement carte POS
 * Utilise Stripe Elements pour un paiement sécurisé
 * 
 * LOGIQUE MARKETPLACE:
 * - L'argent est encaissé par Stripe (compte 224Solutions)
 * - La commission est retenue
 * - Le wallet vendeur est crédité du montant NET après confirmation webhook
 * - Le payout réel se fait plus tard
 */

import React, { useState, useEffect } from 'react';
import { loadStripe, Stripe } from '@stripe/stripe-js';
import {
  Elements,
  PaymentElement,
  useStripe,
  useElements,
} from '@stripe/react-stripe-js';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Card, CardContent } from '@/components/ui/card';
import { 
  Loader2, 
  Shield, 
  CreditCard, 
  CheckCircle2, 
  XCircle,
  Info
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface StripeCardPaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  amount: number;
  currency?: string;
  orderId: string;
  sellerId: string;
  description?: string;
  onSuccess: (paymentIntentId: string) => void;
  onError: (error: string) => void;
}

// Charger Stripe une seule fois
let stripePromise: Promise<Stripe | null> | null = null;

const getStripe = () => {
  if (!stripePromise) {
    const key = import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY;
    if (key) {
      stripePromise = loadStripe(key);
    }
  }
  return stripePromise;
};

// Composant de formulaire de paiement
function PaymentForm({
  amount,
  currency,
  commissionRate,
  commissionAmount,
  sellerNetAmount,
  onSuccess,
  onError,
  onClose,
}: {
  amount: number;
  currency: string;
  commissionRate: number;
  commissionAmount: number;
  sellerNetAmount: number;
  onSuccess: (paymentIntentId: string) => void;
  onError: (error: string) => void;
  onClose: () => void;
}) {
  const stripe = useStripe();
  const elements = useElements();
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [succeeded, setSucceeded] = useState(false);

  const formatAmount = (value: number) => {
    return new Intl.NumberFormat('fr-GN', {
      style: 'decimal',
      minimumFractionDigits: 0,
    }).format(value) + ' ' + currency;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!stripe || !elements) {
      setError('Stripe n\'est pas chargé. Veuillez rafraîchir la page.');
      return;
    }

    setProcessing(true);
    setError(null);

    try {
      // Confirmer le paiement
      const { error: confirmError, paymentIntent } = await stripe.confirmPayment({
        elements,
        confirmParams: {
          return_url: `${window.location.origin}/vendeur/pos`,
        },
        redirect: 'if_required',
      });

      if (confirmError) {
        setError(confirmError.message || 'Erreur de paiement');
        onError(confirmError.message || 'Erreur de paiement');
        toast.error('Paiement refusé', {
          description: confirmError.message,
        });
      } else if (paymentIntent) {
        if (paymentIntent.status === 'succeeded') {
          setSucceeded(true);
          toast.success('Paiement accepté!', {
            description: `${formatAmount(amount)} encaissé`,
          });
          onSuccess(paymentIntent.id);
        } else if (paymentIntent.status === 'processing') {
          toast.info('Paiement en cours de traitement...');
        } else if (paymentIntent.status === 'requires_action') {
          // 3D Secure en cours
          toast.info('Authentification 3D Secure requise...');
        }
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erreur inconnue';
      setError(message);
      onError(message);
    } finally {
      setProcessing(false);
    }
  };

  if (succeeded) {
    return (
      <div className="text-center space-y-4 py-8">
        <div className="flex justify-center">
          <div className="rounded-full bg-green-100 p-4">
            <CheckCircle2 className="w-16 h-16 text-green-600" />
          </div>
        </div>
        <div>
          <h3 className="text-2xl font-bold text-green-600">Paiement réussi!</h3>
          <p className="text-muted-foreground mt-2">
            <strong>{formatAmount(amount)}</strong> encaissé
          </p>
          <p className="text-sm text-muted-foreground mt-1">
            Montant net vendeur: <strong>{formatAmount(sellerNetAmount)}</strong>
          </p>
        </div>
        <Button onClick={onClose} className="mt-4">
          Fermer
        </Button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Récapitulatif */}
      <Card className="bg-primary/5 border-primary/20">
        <CardContent className="pt-4">
          <div className="space-y-2">
            <div className="flex justify-between text-lg">
              <span>Total à payer</span>
              <span className="font-bold text-primary">{formatAmount(amount)}</span>
            </div>
            <div className="border-t pt-2 space-y-1 text-sm text-muted-foreground">
              <div className="flex justify-between">
                <span>Commission plateforme ({commissionRate}%)</span>
                <span>-{formatAmount(commissionAmount)}</span>
              </div>
              <div className="flex justify-between font-medium">
                <span>Net vendeur</span>
                <span className="text-green-600">{formatAmount(sellerNetAmount)}</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Info sécurité */}
      <div className="flex items-start gap-2 text-xs text-muted-foreground bg-blue-50 dark:bg-blue-900/20 p-3 rounded-lg">
        <Info className="w-4 h-4 mt-0.5 text-blue-500" />
        <div>
          <p className="font-medium text-blue-700 dark:text-blue-300">Logique Marketplace</p>
          <p className="mt-1">
            L'argent est sécurisé sur Stripe. Le vendeur recevra le montant net sur son wallet interne après confirmation.
          </p>
        </div>
      </div>

      {/* Stripe Payment Element */}
      <div className="space-y-2">
        <div className="flex items-center gap-2 mb-2">
          <CreditCard className="w-4 h-4 text-muted-foreground" />
          <span className="text-sm font-medium">Informations de carte</span>
        </div>
        <PaymentElement
          options={{
            layout: 'tabs',
            paymentMethodOrder: ['card'],
          }}
        />
      </div>

      {/* Erreur */}
      {error && (
        <Alert variant="destructive">
          <XCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Sécurité */}
      <div className="flex items-start gap-2 text-xs text-muted-foreground bg-muted/50 p-3 rounded-lg">
        <Shield className="w-4 h-4 mt-0.5" />
        <div>
          <p className="font-medium">Paiement 100% sécurisé</p>
          <p className="mt-1">
            Cryptage SSL. Compatible 3D Secure. Données protégées par Stripe.
          </p>
        </div>
      </div>

      {/* Boutons */}
      <div className="flex gap-3">
        <Button
          type="button"
          variant="outline"
          onClick={onClose}
          disabled={processing}
          className="flex-1"
        >
          Annuler
        </Button>
        <Button
          type="submit"
          disabled={!stripe || processing}
          className="flex-1"
        >
          {processing ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Traitement...
            </>
          ) : (
            <>
              <CreditCard className="mr-2 h-4 w-4" />
              Payer {formatAmount(amount)}
            </>
          )}
        </Button>
      </div>

      {/* Logos */}
      <div className="flex items-center justify-center gap-3 pt-2">
        <span className="text-xs text-muted-foreground">Cartes acceptées:</span>
        <div className="flex gap-2">
          <div className="w-10 h-6 bg-gradient-to-r from-blue-600 to-blue-400 rounded flex items-center justify-center text-white text-[8px] font-bold">
            VISA
          </div>
          <div className="w-10 h-6 bg-gradient-to-r from-red-600 to-orange-500 rounded flex items-center justify-center">
            <div className="flex gap-0.5">
              <div className="w-2 h-2 rounded-full bg-white opacity-80"></div>
              <div className="w-2 h-2 rounded-full bg-white opacity-60"></div>
            </div>
          </div>
        </div>
      </div>
    </form>
  );
}

export function StripeCardPaymentModal({
  isOpen,
  onClose,
  amount,
  currency = 'GNF',
  orderId,
  sellerId,
  description,
  onSuccess,
  onError,
}: StripeCardPaymentModalProps) {
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [stripe, setStripe] = useState<Stripe | null>(null);
  const [paymentDetails, setPaymentDetails] = useState({
    commissionRate: 2.5,
    commissionAmount: 0,
    sellerNetAmount: 0,
  });

  // Charger Stripe et créer le Payment Intent
  useEffect(() => {
    if (!isOpen) return;

    const initPayment = async () => {
      setLoading(true);
      setError(null);

      try {
        // Charger Stripe
        const stripeInstance = await getStripe();
        if (!stripeInstance) {
          throw new Error('Clé Stripe non configurée');
        }
        setStripe(stripeInstance);

        // Créer le Payment Intent via edge function
        const { data, error: fnError } = await supabase.functions.invoke('stripe-pos-payment', {
          body: {
            amount,
            currency,
            orderId,
            sellerId,
            description,
          },
        });

        if (fnError || !data?.success) {
          throw new Error(data?.error || fnError?.message || 'Erreur création paiement');
        }

        setClientSecret(data.clientSecret);
        setPaymentDetails({
          commissionRate: data.commissionRate,
          commissionAmount: data.commissionAmount,
          sellerNetAmount: data.sellerNetAmount,
        });

      } catch (err) {
        const message = err instanceof Error ? err.message : 'Erreur inconnue';
        setError(message);
        onError(message);
      } finally {
        setLoading(false);
      }
    };

    initPayment();
  }, [isOpen, amount, currency, orderId, sellerId, description]);

  // Reset quand on ferme
  const handleClose = () => {
    setClientSecret(null);
    setError(null);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <Shield className="w-5 h-5 text-primary" />
            <DialogTitle>Paiement par carte</DialogTitle>
          </div>
          <DialogDescription>
            Paiement sécurisé via Stripe
          </DialogDescription>
        </DialogHeader>

        {loading && (
          <div className="flex flex-col items-center justify-center py-12 space-y-4">
            <Loader2 className="w-12 h-12 animate-spin text-primary" />
            <p className="text-muted-foreground">Initialisation du paiement...</p>
          </div>
        )}

        {error && !loading && (
          <Alert variant="destructive">
            <XCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {clientSecret && stripe && !loading && (
          <Elements
            stripe={stripe}
            options={{
              clientSecret,
              appearance: {
                theme: 'stripe',
                variables: {
                  colorPrimary: '#10b981',
                  colorBackground: '#ffffff',
                  colorText: '#1f2937',
                },
              },
            }}
          >
            <PaymentForm
              amount={amount}
              currency={currency}
              commissionRate={paymentDetails.commissionRate}
              commissionAmount={paymentDetails.commissionAmount}
              sellerNetAmount={paymentDetails.sellerNetAmount}
              onSuccess={onSuccess}
              onError={onError}
              onClose={handleClose}
            />
          </Elements>
        )}
      </DialogContent>
    </Dialog>
  );
}
