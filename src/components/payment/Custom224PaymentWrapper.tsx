/**
 * WRAPPER PAIEMENT 224SOLUTIONS
 * Tente le formulaire carte inline (CardFields), sinon fallback sur PayPal Buttons
 */

import React, { useEffect, useMemo, useState, useCallback } from 'react';
import {
  PayPalScriptProvider,
  PayPalButtons,
  PayPalCardFieldsProvider,
  PayPalCardFieldsForm,
  usePayPalCardFields,
  FUNDING,
} from '@paypal/react-paypal-js';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
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
  'AUD','BRL','CAD','CNY','CZK','DKK','EUR','HKD','HUF','ILS',
  'JPY','MYR','MXN','TWD','NZD','NOK','PHP','PLN','GBP','SGD',
  'SEK','CHF','THB','USD','RUB',
]);

/* ── Inline submit button (inside CardFieldsProvider) ── */
function InlineSubmitButton({ label }: { label: string }) {
  const { cardFieldsForm } = usePayPalCardFields();
  const [paying, setPaying] = useState(false);

  const handleClick = async () => {
    if (!cardFieldsForm) return;
    const state = await cardFieldsForm.getState();
    if (!state.isFormValid) {
      toast.error('Veuillez vérifier les informations de votre carte');
      return;
    }
    setPaying(true);
    cardFieldsForm.submit().catch(() => setPaying(false));
  };

  return (
    <Button onClick={handleClick} disabled={paying} className="w-full h-12 text-base font-semibold" size="lg">
      {paying ? (
        <><Loader2 className="w-5 h-5 mr-2 animate-spin" />Traitement…</>
      ) : (
        <><Lock className="w-4 h-4 mr-2" />{label}</>
      )}
    </Button>
  );
}

/* ── Inline Card Fields form (with error boundary) ── */
function InlineCardForm({
  createOrder,
  onApprove,
  onError,
  label,
  onFallback,
}: {
  createOrder: () => Promise<string>;
  onApprove: (data: { orderID: string }) => Promise<void>;
  onError: (err: any) => void;
  label: string;
  onFallback: () => void;
}) {
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    // Check if CardFields is available on the PayPal SDK
    if (!(window as any).paypal?.CardFields) {
      console.log('[224Pay] CardFields not available, falling back to buttons');
      onFallback();
    }
  }, [onFallback]);

  if (hasError) return null;

  try {
    return (
      <PayPalCardFieldsProvider
        createOrder={createOrder}
        onApprove={onApprove}
        onError={(err) => {
          console.error('[224Pay] CardFields error:', err);
          setHasError(true);
          onFallback();
        }}
      >
        <PayPalCardFieldsForm />
        <div className="mt-4">
          <InlineSubmitButton label={label} />
        </div>
      </PayPalCardFieldsProvider>
    );
  } catch {
    onFallback();
    return null;
  }
}

/* ── Main wrapper ── */
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
  const [useButtonsFallback, setUseButtonsFallback] = useState(false);
  const [sdkReady, setSdkReady] = useState(false);

  const sourceCurrency = currency.toUpperCase();

  const sdkCurrency = useMemo(() => {
    if (PAYPAL_SUPPORTED_CURRENCIES.has(sourceCurrency)) return sourceCurrency;
    const preferred = userCurrency?.toUpperCase();
    if (preferred && PAYPAL_SUPPORTED_CURRENCIES.has(preferred)) return preferred;
    return 'USD';
  }, [sourceCurrency, userCurrency]);

  const localAmount = useMemo(() => convert(amount, sourceCurrency), [amount, sourceCurrency, convert]);

  useEffect(() => { fetchPayPalClientId(); }, []);

  const fetchPayPalClientId = async () => {
    try {
      setLoading(true);
      setError('');
      const { data, error: fnError } = await supabase.functions.invoke('paypal-client-id');
      if (fnError) throw fnError;
      if (!data?.clientId) throw new Error('PayPal Client ID non disponible');
      setPaypalClientId(data.clientId);
    } catch (err) {
      console.error('Error fetching PayPal client ID:', err);
      setError("Impossible d'initialiser le paiement");
      onError("Impossible d'initialiser le paiement");
    } finally {
      setLoading(false);
    }
  };

  const createOrder = useCallback(async () => {
    try {
      setError('');
      const { data, error: fnError } = await supabase.functions.invoke('create-payment-intent', {
        body: {
          amount,
          currency: sourceCurrency,
          seller_id: sellerId,
          description: orderDescription || `Paiement 224Solutions - ${sellerName}`,
          preferred_paypal_currency: sdkCurrency,
          metadata: { ...metadata, platform: '224solutions', seller_name: sellerName, user_currency: userCurrency },
        },
      });
      if (fnError) throw new Error('Service paiement indisponible');
      if (!data?.success || !data?.paypal_order_id) throw new Error(data?.error || 'Erreur création paiement');
      if (data?.conversion) setConversionInfo(data.conversion as ConversionInfo);
      return data.paypal_order_id as string;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erreur lors du paiement';
      setError(message);
      onError(message);
      throw err;
    }
  }, [amount, sourceCurrency, sellerId, sellerName, orderDescription, sdkCurrency, metadata, userCurrency, onError]);

  const handleApprove = useCallback(async (data: any, actions?: any) => {
    try {
      // Try client-side capture first (for buttons flow)
      if (actions?.order?.capture) {
        const capture = await actions.order.capture();
        if (!capture || capture.status !== 'COMPLETED') throw new Error("Paiement non confirmé");
      }
      setSucceeded(true);
      toast.success('Paiement réussi !');
      onSuccess(data.orderID);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erreur validation paiement';
      setError(message);
      onError(message);
      toast.error(message);
    }
  }, [onSuccess, onError]);

  const handleFallback = useCallback(() => {
    setUseButtonsFallback(true);
  }, []);

  // Check SDK readiness for card-fields
  const handleScriptReady = useCallback(() => {
    setSdkReady(true);
    // Check immediately if CardFields is available
    if (!(window as any).paypal?.CardFields) {
      setUseButtonsFallback(true);
    }
  }, []);

  if (loading) {
    return (
      <div className="py-8 flex flex-col items-center justify-center space-y-4">
        <Loader2 className="w-10 h-10 animate-spin text-primary" />
        <p className="text-sm text-muted-foreground">Initialisation du paiement sécurisé…</p>
      </div>
    );
  }

  if (error && !paypalClientId) {
    return (
      <div className="py-6 text-center space-y-4">
        <div className="text-destructive text-3xl">❌</div>
        <p className="text-muted-foreground">{error}</p>
        <Button onClick={fetchPayPalClientId} variant="outline">Réessayer</Button>
      </div>
    );
  }

  if (succeeded) {
    return (
      <div className="py-8 text-center space-y-4">
        <div className="flex justify-center">
          <div className="rounded-full bg-primary/15 p-4">
            <CheckCircle2 className="w-14 h-14 text-primary" />
          </div>
        </div>
        <h3 className="text-xl font-bold text-primary">Paiement réussi !</h3>
        <p className="text-foreground text-lg font-semibold">{localAmount.formatted}</p>
      </div>
    );
  }

  if (!paypalClientId) return null;

  return (
    <div className="space-y-5">
      {/* Amount summary */}
      <div className="bg-muted/40 rounded-xl p-4 border border-border">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-muted-foreground font-medium">Montant à payer</p>
            <p className="text-xs text-muted-foreground mt-0.5">à {sellerName}</p>
          </div>
          <div className="text-right">
            <p className="text-2xl font-bold text-primary">{localAmount.formatted}</p>
            {localAmount.wasConverted && (
              <p className="text-xs text-muted-foreground mt-1">Base: {fc(amount, sourceCurrency)}</p>
            )}
          </div>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <CreditCard className="w-5 h-5 text-primary" />
        <span className="font-semibold text-foreground">
          {useButtonsFallback ? 'Paiement VISA / Mastercard' : 'Saisissez votre carte'}
        </span>
      </div>

      {conversionInfo?.was_converted && (
        <Alert>
          <AlertDescription>
            Conversion automatique : <strong>{conversionInfo.paypal_amount} {conversionInfo.paypal_currency}</strong>
            {' '}(taux {conversionInfo.fx_rate.toFixed(6)}).
          </AlertDescription>
        </Alert>
      )}

      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <PayPalScriptProvider
        key={`${sdkCurrency}-${useButtonsFallback ? 'btn' : 'cf'}`}
        options={{
          clientId: paypalClientId,
          currency: sdkCurrency,
          intent: 'capture',
          components: useButtonsFallback ? 'buttons,funding-eligibility' : 'card-fields',
        }}
      >
        {useButtonsFallback ? (
          /* Fallback: PayPal button for card */
          <PayPalButtons
            fundingSource={FUNDING.CARD}
            style={{ layout: 'vertical', color: 'black', shape: 'rect', label: 'pay', height: 55 }}
            createOrder={createOrder}
            onApprove={handleApprove}
            onError={(err) => {
              console.error('PayPal error:', err);
              setError('Erreur PayPal. Veuillez réessayer.');
              onError('Erreur PayPal');
            }}
            onCancel={() => toast.info('Paiement annulé')}
          />
        ) : (
          /* Preferred: Inline card fields */
          <InlineCardForm
            createOrder={createOrder}
            onApprove={handleApprove}
            onError={(err) => {
              console.error('CardFields error:', err);
              setError('Erreur de paiement');
              onError('Erreur de paiement');
            }}
            label={`Payer ${localAmount.formatted}`}
            onFallback={handleFallback}
          />
        )}
      </PayPalScriptProvider>

      <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground pt-2">
        <Lock className="w-3.5 h-3.5" />
        <span>Paiement sécurisé • SSL • PCI-DSS</span>
      </div>

      <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
        <Shield className="w-3.5 h-3.5" />
        <span>Vos fonds sont protégés par notre système Escrow jusqu'à la confirmation de la livraison</span>
      </div>
    </div>
  );
}
