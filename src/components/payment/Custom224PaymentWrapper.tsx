/**
 * WRAPPER PAIEMENT 224SOLUTIONS
 * Paiement carte bancaire via PayPal (VISA/Mastercard)
 */

import React, { useEffect, useMemo, useState } from 'react';
import { PayPalButtons, PayPalScriptProvider } from '@paypal/react-paypal-js';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { CheckCircle2, CreditCard, Loader2, Lock, Shield } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useFormatCurrency } from '@/hooks/useFormatCurrency';
import { usePriceConverter } from '@/hooks/usePriceConverter';

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

interface ConversionInfo {
  source_currency: string;
  source_amount: number;
  paypal_currency: string;
  paypal_amount: string;
  fx_rate: number;
  fx_source: string;
  was_converted: boolean;
}

const PAYPAL_SUPPORTED_CURRENCIES = new Set([
  'AUD', 'BRL', 'CAD', 'CNY', 'CZK', 'DKK', 'EUR', 'HKD', 'HUF', 'ILS',
  'JPY', 'MYR', 'MXN', 'TWD', 'NZD', 'NOK', 'PHP', 'PLN', 'GBP', 'SGD',
  'SEK', 'CHF', 'THB', 'USD', 'RUB',
]);

export function Custom224PaymentWrapper({
  amount,
  currency = 'GNF',
  sellerName,
  sellerId,
  orderDescription,
  metadata = {},
  onSuccess,
  onError,
}: Custom224PaymentWrapperProps) {
  const fc = useFormatCurrency();
  const { convert, userCurrency } = usePriceConverter();

  const [paypalClientId, setPaypalClientId] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [succeeded, setSucceeded] = useState(false);
  const [conversionInfo, setConversionInfo] = useState<ConversionInfo | null>(null);

  const sourceCurrency = currency.toUpperCase();

  const sdkCurrency = useMemo(() => {
    if (PAYPAL_SUPPORTED_CURRENCIES.has(sourceCurrency)) return sourceCurrency;
    const preferred = userCurrency?.toUpperCase();
    if (preferred && PAYPAL_SUPPORTED_CURRENCIES.has(preferred)) return preferred;
    return 'USD';
  }, [sourceCurrency, userCurrency]);

  const localAmount = useMemo(() => convert(amount, sourceCurrency), [amount, sourceCurrency, convert]);

  useEffect(() => {
    fetchPayPalClientId();
  }, []);

  const fetchPayPalClientId = async () => {
    try {
      setLoading(true);
      setError('');

      const { data, error: fnError } = await supabase.functions.invoke('paypal-client-id');
      if (fnError) throw fnError;

      if (!data?.clientId) {
        throw new Error('PayPal Client ID non disponible');
      }

      setPaypalClientId(data.clientId);
    } catch (err) {
      console.error('Error fetching PayPal client ID:', err);
      const message = 'Impossible d\'initialiser le paiement PayPal';
      setError(message);
      onError(message);
    } finally {
      setLoading(false);
    }
  };

  const createOrder = async () => {
    try {
      setError('');

      const { data, error: fnError } = await supabase.functions.invoke('create-payment-intent', {
        body: {
          amount,
          currency: sourceCurrency,
          seller_id: sellerId,
          description: orderDescription || `Paiement 224Solutions - ${sellerName}`,
          preferred_paypal_currency: sdkCurrency,
          metadata: {
            ...metadata,
            platform: '224solutions',
            seller_name: sellerName,
            user_currency: userCurrency,
          },
        },
      });

      if (fnError) {
        throw new Error('Service paiement indisponible');
      }

      if (!data?.success || !data?.paypal_order_id) {
        throw new Error(data?.error || 'Erreur lors de la création du paiement');
      }

      if (data?.conversion) {
        setConversionInfo(data.conversion as ConversionInfo);
      }

      return data.paypal_order_id as string;
    } catch (err) {
      console.error('Error creating PayPal order:', err);
      const message = err instanceof Error ? err.message : 'Erreur lors du paiement';
      setError(message);
      onError(message);
      throw err;
    }
  };

  const handleApprove = async (data: any, actions: any) => {
    try {
      const capture = await actions?.order?.capture?.();

      if (!capture || capture.status !== 'COMPLETED') {
        throw new Error('Le paiement n\'a pas été confirmé');
      }

      setSucceeded(true);
      toast.success('Paiement réussi !');
      onSuccess(data.orderID);
    } catch (err) {
      console.error('Error capturing PayPal order:', err);
      const message = err instanceof Error ? err.message : 'Erreur lors de la validation du paiement';
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
              <p className="text-sm text-muted-foreground mt-2">Connexion sécurisée avec 224Solutions</p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error && !paypalClientId) {
    return (
      <Card className="w-full max-w-lg mx-auto border-destructive/40">
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
      <Card className="w-full max-w-lg mx-auto bg-primary/5">
        <CardContent className="pt-8 pb-8">
          <div className="text-center space-y-4">
            <div className="flex justify-center">
              <div className="rounded-full bg-primary/15 p-4">
                <CheckCircle2 className="w-16 h-16 text-primary" />
              </div>
            </div>
            <div>
              <h3 className="text-2xl font-bold text-primary">Paiement réussi !</h3>
              <p className="text-foreground mt-2 text-lg"><strong>{localAmount.formatted}</strong></p>
              <p className="text-sm text-muted-foreground mt-2">Merci pour votre confiance en 224Solutions</p>
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
            <div className="bg-background rounded-lg p-2">
              <span className="text-2xl font-bold text-primary">224</span>
            </div>
            <div>
              <h2 className="text-xl font-bold">224Solutions Paiement</h2>
              <p className="text-sm text-primary-foreground/90">Carte bancaire sécurisée via PayPal</p>
            </div>
          </div>
          <Shield className="w-8 h-8 text-primary-foreground/90" />
        </div>
      </CardHeader>

      <CardContent className="pt-6 space-y-6">
        <div className="bg-muted/40 rounded-xl p-5 border border-border">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground font-medium">Montant à payer</p>
              <p className="text-xs text-muted-foreground mt-1">à {sellerName}</p>
              {orderDescription && <p className="text-xs text-muted-foreground">{orderDescription}</p>}
            </div>
            <div className="text-right">
              <p className="text-3xl font-bold text-primary">{localAmount.formatted}</p>
              {localAmount.wasConverted && (
                <p className="text-xs text-muted-foreground mt-1">Base: {fc(amount, sourceCurrency)}</p>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <CreditCard className="w-5 h-5 text-primary" />
          <span className="font-semibold text-foreground">Paiement VISA / Mastercard</span>
        </div>

        {conversionInfo?.was_converted && (
          <Alert>
            <AlertDescription>
              Conversion automatique: <strong>{conversionInfo.paypal_amount} {conversionInfo.paypal_currency}</strong>
              {` `}(taux {conversionInfo.fx_rate.toFixed(6)}).
            </AlertDescription>
          </Alert>
        )}

        {error && (
          <Alert variant="destructive" className="border-2">
            <AlertDescription className="flex items-center gap-2">
              <span className="font-medium">❌</span>
              {error}
            </AlertDescription>
          </Alert>
        )}

        <PayPalScriptProvider
          key={sdkCurrency}
          options={{
            clientId: paypalClientId,
            currency: sdkCurrency,
            intent: 'capture',
            components: 'buttons,funding-eligibility',
          }}
        >
          <PayPalButtons
            fundingSource="card"
            style={{ layout: 'vertical', color: 'black', shape: 'rect', label: 'pay', height: 55 }}
            createOrder={createOrder}
            onApprove={handleApprove}
            onError={(err) => {
              console.error('PayPal error:', err);
              const message = 'Erreur PayPal. Veuillez réessayer.';
              setError(message);
              onError(message);
            }}
            onCancel={() => toast.info('Paiement annulé')}
          />
        </PayPalScriptProvider>

        <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground mt-4">
          <Lock className="w-4 h-4" />
          <span>Paiement sécurisé PayPal • SSL • PCI-DSS</span>
        </div>

        <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
          <Shield className="w-4 h-4" />
          <span>Vos fonds sont protégés par notre système Escrow jusqu'à la confirmation de la livraison</span>
        </div>
      </CardContent>
    </Card>
  );
}
