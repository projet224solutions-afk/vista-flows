/**
 * PayPal Inline Card Deposit Component
 * Renders PayPal buttons directly in the wallet - no redirect needed
 * Supports Visa, Mastercard, Amex via PayPal
 * 224SOLUTIONS
 */

import { useState, useEffect, useCallback } from 'react';
import { PayPalScriptProvider, PayPalButtons, FUNDING } from '@paypal/react-paypal-js';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Loader2, Shield, CreditCard } from 'lucide-react';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useCurrency } from '@/context/CurrencyContext';
import { getSortedCurrencies, getCurrencyByCode, type Currency } from '@/data/currencies';

// Devises supportées nativement par PayPal (transaction directe)
const PAYPAL_NATIVE_CODES = new Set([
  'USD','EUR','GBP','CAD','AUD','JPY','CHF','SEK','NOK','DKK','PLN',
  'BRL','MXN','SGD','HKD','NZD','CZK','HUF','ILS','MYR','PHP','THB','TWD','RUB','TRY',
]);

interface PayPalInlineDepositProps {
  onSuccess: () => void;
  onClose?: () => void;
}

const QUICK_AMOUNTS = [10, 25, 50, 100, 250, 500];

export default function PayPalInlineDeposit({ onSuccess, onClose }: PayPalInlineDepositProps) {
  const { currency: userCurrency } = useCurrency();
  const allCurrencies = getSortedCurrencies().filter(c => PAYPAL_NATIVE_CODES.has(c.code));
  const defaultCurrency = PAYPAL_NATIVE_CODES.has(userCurrency) ? userCurrency : 'USD';
  const [selectedCurrency, setSelectedCurrency] = useState(defaultCurrency);
  const currencyInfo = getCurrencyByCode(selectedCurrency);
  const symbol = currencyInfo?.symbol || selectedCurrency;
  const paypalCurrency = selectedCurrency;
  const needsConversion = false;
  const [amount, setAmount] = useState('');
  const [showPayPal, setShowPayPal] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [clientId, setClientId] = useState<string | null>(null);
  const [feeRate, setFeeRate] = useState(0.02); // default 2%, will be overridden by pdg_settings

  useEffect(() => {
    // Fetch PayPal client ID and deposit fee in parallel
    supabase.functions.invoke('paypal-client-id').then(({ data }) => {
      if (data?.clientId) setClientId(data.clientId);
    });

    supabase
      .from('pdg_settings')
      .select('setting_value')
      .eq('setting_key', 'deposit_fee_percentage')
      .maybeSingle()
      .then(({ data }) => {
        const val = (data?.setting_value as any)?.value;
        if (val != null) {
          setFeeRate(Number(val) / 100);
        }
      });
  }, []);

  const numAmount = parseFloat(amount);
  const isValidAmount = numAmount >= 5;
  const fee = isValidAmount ? Math.round(numAmount * feeRate * 100) / 100 : 0;
  const netAmount = isValidAmount ? Math.round((numAmount - fee) * 100) / 100 : 0;

  const handleAmountConfirm = () => {
    if (!isValidAmount) {
      toast.error(`Montant minimum: 5 ${selectedCurrency}`);
      return;
    }
    setShowPayPal(true);
  };

  const createOrder = useCallback(async () => {
    const { data, error } = await supabase.functions.invoke('paypal-deposit', {
      body: { amount: numAmount, currency: paypalCurrency, userCurrency: selectedCurrency, action: 'create' },
    });
    if (error) throw new Error(error.message);
    if (!data?.success) throw new Error(data?.error || 'Erreur création ordre PayPal');
    return data.orderId;
  }, [numAmount, selectedCurrency]);

  const onApprove = useCallback(async (data: any) => {
    setProcessing(true);
    try {
      const { data: captureData, error } = await supabase.functions.invoke('paypal-deposit', {
        body: { action: 'capture', orderId: data.orderID },
      });
      if (error) throw new Error(error.message);
      if (!captureData?.success) throw new Error(captureData?.error || 'Capture échouée');
      
      toast.success('Dépôt réussi !', {
        description: `${captureData.netAmount?.toFixed(2)} ${selectedCurrency} crédités sur votre wallet`,
      });
      window.dispatchEvent(new Event('wallet-updated'));
      onSuccess();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erreur de capture');
    } finally {
      setProcessing(false);
    }
  }, [onSuccess]);

  if (!showPayPal) {
    return (
      <div className="space-y-4">
        {/* Sélecteur de devise */}
        <div className="space-y-2">
          <Label>Devise de dépôt {currencyInfo?.flag && <span>{currencyInfo.flag}</span>}</Label>
          <Select value={selectedCurrency} onValueChange={setSelectedCurrency}>
            <SelectTrigger>
              <SelectValue placeholder="Choisir une devise">
                {currencyInfo && (
                  <span className="flex items-center gap-1.5">
                    {currencyInfo.flag && <span>{currencyInfo.flag}</span>}
                    <span>{currencyInfo.code} - {currencyInfo.name}</span>
                  </span>
                )}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              <ScrollArea className="h-[300px]">
                {allCurrencies.map((c) => (
                  <SelectItem key={c.code} value={c.code}>
                    <span className="flex items-center gap-2">
                      {c.flag && <span>{c.flag}</span>}
                      <span className="font-medium">{c.code}</span>
                      <span className="text-muted-foreground text-xs truncate">{c.name}</span>
                    </span>
                  </SelectItem>
                ))}
              </ScrollArea>
            </SelectContent>
          </Select>
          {needsConversion && (
            <p className="text-xs text-destructive">
              ⚠️ {selectedCurrency} n'est pas supporté par PayPal. La transaction sera effectuée en USD puis convertie.
            </p>
          )}
        </div>

        <div className="space-y-3">
          <Label>Montants rapides ({selectedCurrency})</Label>
          <div className="grid grid-cols-3 gap-2">
            {QUICK_AMOUNTS.map((amt) => (
              <Button
                key={amt}
                variant={amount === amt.toString() ? "default" : "outline"}
                size="sm"
                onClick={() => setAmount(amt.toString())}
                className="text-xs"
              >
                {symbol}{amt}
              </Button>
            ))}
          </div>
        </div>

        <div>
          <Label htmlFor="paypal-card-amount">Montant personnalisé ({selectedCurrency})</Label>
          <Input
            id="paypal-card-amount"
            type="number"
            placeholder="Ex: 50"
            min="5"
            step="0.01"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
          />
          <p className="text-xs text-muted-foreground mt-1">Minimum: {symbol}5 {selectedCurrency} · Frais: {(feeRate * 100).toFixed(1)}%</p>
        </div>

        {isValidAmount && (
          <div className="p-3 rounded-lg bg-muted space-y-1">
            <div className="flex justify-between text-sm">
              <span>Montant</span>
              <span className="font-medium">{symbol}{numAmount.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-sm text-muted-foreground">
              <span>Frais ({(feeRate * 100).toFixed(1)}%)</span>
              <span>-{symbol}{fee.toFixed(2)}</span>
            </div>
            <div className="border-t pt-1 flex justify-between text-sm font-bold">
              <span>Crédité</span>
              <span className="text-primary">{symbol}{netAmount.toFixed(2)}</span>
            </div>
          </div>
        )}

        <div className="flex items-center gap-2 p-3 rounded-lg bg-muted">
          <Shield className="w-4 h-4 text-primary flex-shrink-0" />
          <p className="text-xs text-muted-foreground">Paiement sécurisé - Visa, Mastercard, Amex</p>
        </div>

        <Button
          onClick={handleAmountConfirm}
          disabled={!isValidAmount}
          className="w-full"
        >
          <CreditCard className="w-4 h-4 mr-2" />
          Continuer - {symbol}{isValidAmount ? numAmount.toFixed(2) : '0.00'}
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="p-3 rounded-lg bg-muted text-center">
        <p className="text-sm font-medium">Montant: <span className="text-primary">{symbol}{numAmount.toFixed(2)} {selectedCurrency}</span></p>
        <p className="text-xs text-muted-foreground">Crédité après frais: {symbol}{netAmount.toFixed(2)}</p>
      </div>

      {processing && (
        <div className="flex items-center justify-center gap-2 p-4">
          <Loader2 className="w-5 h-5 animate-spin text-primary" />
          <span className="text-sm">Traitement du paiement...</span>
        </div>
      )}

      {!clientId ? (
        <div className="flex items-center justify-center p-4">
          <Loader2 className="w-5 h-5 animate-spin text-primary" />
          <span className="text-sm ml-2">Chargement PayPal...</span>
        </div>
      ) : (
        <PayPalScriptProvider options={{
          clientId,
          currency: paypalCurrency,
          intent: "capture",
        }}>
          <PayPalButtons
            style={{
              layout: "vertical",
              shape: "rect",
              label: "pay",
              height: 45,
            }}
            fundingSource={FUNDING.PAYPAL}
            createOrder={async () => {
              try {
                return await createOrder();
              } catch (err) {
                toast.error(err instanceof Error ? err.message : 'Erreur');
                throw err;
              }
            }}
            onApprove={async (data) => {
              await onApprove(data);
            }}
            onError={(err) => {
              console.error('PayPal error:', err);
              toast.error('Erreur PayPal. Veuillez réessayer.');
            }}
            onCancel={() => {
              toast.info('Paiement annulé');
            }}
          />
        </PayPalScriptProvider>
      )}

      <Button variant="ghost" size="sm" className="w-full" onClick={() => setShowPayPal(false)}>
        ← Modifier le montant
      </Button>
    </div>
  );
}
