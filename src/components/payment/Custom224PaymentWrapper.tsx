/**
 * WRAPPER PAIEMENT 224SOLUTIONS
 * Paiement par carte bancaire via PayPal
 */

import React, { useEffect, useState } from 'react';
import { PayPalScriptProvider, PayPalButtons } from '@paypal/react-paypal-js';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, Shield, CheckCircle2, CreditCard, Lock } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { formatAmount } from '@/types/stripePayment';
import { toast } from 'sonner';

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
  const [paypalClientId, setPaypalClientId] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>('');
  const [succeeded, setSucceeded] = useState(false);

  useEffect(() => {
    fetchPayPalClientId();
  }, []);

  const fetchPayPalClientId = async () => {
    try {
      setLoading(true);
      const { data, error: fnError } = await supabase.functions.invoke('paypal-client-id');
      if (fnError) throw fnError;
      if (!data?.clientId) throw new Error('PayPal Client ID non disponible');
      setPaypalClientId(data.clientId);
    } catch (err) {
      console.error('Error fetching PayPal client ID:', err);
      setError('Impossible d\'initialiser le paiement PayPal');
      onError('Erreur d\'initialisation PayPal');
    } finally {
      setLoading(false);
    }
  };

  const createOrder = async () => {
    try {
      const { data, error: fnError } = await supabase.functions.invoke('create-payment-intent', {
        body: {
          amount,
          currency: currency.toLowerCase(),
          seller_id: sellerId,
          description: orderDescription || `Paiement 224Solutions - ${sellerName}`,
          metadata: {
            ...metadata,
            platform: '224solutions',
            seller_name: sellerName,
          },
          return_url: window.location.origin + '/payment-success',
          cancel_url: window.location.origin + '/payment-cancelled',
        }
      });

      if (fnError) throw fnError;
      if (!data?.success || !data?.paypal_order_id) {
        throw new Error(data?.error || 'Erreur création commande PayPal');
      }

      return data.paypal_order_id;
    } catch (err) {
      console.error('Error creating PayPal order:', err);
      const message = err instanceof Error ? err.message : 'Erreur lors de la création du paiement';
      setError(message);
      onError(message);
      throw err;
    }
  };

  const onApprove = async (data: any) => {
    try {
      // Capturer le paiement
      const { data: captureData, error: captureError } = await supabase.functions.invoke('paypal-capture-order', {
        body: { orderID: data.orderID }
      });

      if (captureError) throw captureError;
      if (!captureData?.success) throw new Error(captureData?.error || 'Erreur capture paiement');

      setSucceeded(true);
      toast.success('Paiement réussi !');
      onSuccess(data.orderID);
    } catch (err) {
      console.error('Error capturing PayPal order:', err);
      const message = err instanceof Error ? err.message : 'Erreur lors de la capture du paiement';
      setError(message);
      onError(message);
      toast.error(message);
    }
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

  if (error && !paypalClientId) {
    return (
      <Card className="w-full max-w-lg mx-auto border-destructive/50">
        <CardContent className="pt-8 pb-8">
          <div className="text-center space-y-4">
            <div className="text-destructive text-4xl">❌</div>
            <div>
              <h3 className="text-xl font-semibold text-destructive">Erreur</h3>
              <p className="text-muted-foreground mt-2">{error}</p>
              <button
                onClick={fetchPayPalClientId}
                className="mt-4 px-6 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90"
              >
                Réessayer
              </button>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (succeeded) {
    return (
      <Card className="w-full max-w-lg mx-auto bg-gradient-to-br from-green-50 to-emerald-50">
        <CardContent className="pt-8 pb-8">
          <div className="text-center space-y-4">
            <div className="flex justify-center">
              <div className="rounded-full bg-green-100 p-4">
                <CheckCircle2 className="w-16 h-16 text-green-600" />
              </div>
            </div>
            <div>
              <h3 className="text-2xl font-bold text-green-600">Paiement réussi !</h3>
              <p className="text-gray-600 mt-2 text-lg">
                <strong>{formatAmount(amount, currency)}</strong>
              </p>
              <p className="text-sm text-gray-500 mt-2">
                Merci pour votre confiance en 224Solutions
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!paypalClientId) return null;

  return (
    <Card className="w-full max-w-lg mx-auto shadow-xl border-2 border-primary/20">
      <CardHeader className="bg-gradient-to-r from-primary to-primary/80 text-primary-foreground">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-white rounded-lg p-2">
              <span className="text-2xl font-bold text-primary">224</span>
            </div>
            <div>
              <h2 className="text-xl font-bold">224Solutions Paiement</h2>
              <p className="text-sm text-primary-foreground/90">Paiement sécurisé par carte bancaire</p>
            </div>
          </div>
          <Shield className="w-8 h-8 text-primary-foreground/90" />
        </div>
      </CardHeader>

      <CardContent className="pt-6 space-y-6">
        {/* Montant */}
        <div className="bg-gradient-to-r from-primary/10 to-primary/5 rounded-xl p-5 border-2 border-primary/30">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground font-medium">Montant à payer</p>
              <p className="text-xs text-muted-foreground mt-1">à {sellerName}</p>
              {orderDescription && (
                <p className="text-xs text-muted-foreground">{orderDescription}</p>
              )}
            </div>
            <div className="text-right">
              <p className="text-3xl font-bold text-primary">
                {formatAmount(amount, currency)}
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 mb-2">
          <CreditCard className="w-5 h-5 text-primary" />
          <span className="font-semibold text-foreground">Carte bancaire VISA / Mastercard</span>
        </div>

        {error && (
          <Alert variant="destructive" className="border-2">
            <AlertDescription className="flex items-center gap-2">
              <span className="font-medium">❌</span>
              {error}
            </AlertDescription>
          </Alert>
        )}

        {/* PayPal Buttons - Card only */}
        <PayPalScriptProvider options={{
          clientId: paypalClientId,
          currency: 'USD',
          intent: 'capture',
          components: 'buttons,funding-eligibility',
        }}>
          <PayPalButtons
            fundingSource="card"
            style={{
              layout: 'vertical',
              color: 'black',
              shape: 'rect',
              label: 'pay',
              height: 55,
            }}
            createOrder={createOrder}
            onApprove={onApprove}
            onError={(err) => {
              console.error('PayPal error:', err);
              setError('Erreur PayPal. Veuillez réessayer.');
              onError('Erreur PayPal');
            }}
            onCancel={() => {
              toast.info('Paiement annulé');
            }}
          />
        </PayPalScriptProvider>

        {/* Sécurité */}
        <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground mt-4">
          <Lock className="w-4 h-4" />
          <span>Paiement sécurisé PayPal • Cryptage SSL • PCI-DSS</span>
        </div>

        <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
          <Shield className="w-4 h-4" />
          <span>Vos fonds sont protégés par notre système Escrow jusqu'à la confirmation de la livraison</span>
        </div>
        
        <div className="text-center pt-3 border-t">
          <p className="text-xs text-muted-foreground">
            Propulsé par <span className="font-bold text-primary">224Solutions</span>
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
