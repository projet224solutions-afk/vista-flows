/**
 * 💱 CONVERTISSEUR DE DEVISES
 * Conversion en temps réel selon les taux configurés par le PDG
 */

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { ArrowRightLeft, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';

interface Currency {
  code: string;
  name: string;
  symbol: string;
}

interface ExchangeRate {
  from_currency: string;
  to_currency: string;
  rate: number;
}

export function CurrencyConverter() {
  const [currencies, setCurrencies] = useState<Currency[]>([]);
  const [rates, setRates] = useState<ExchangeRate[]>([]);
  const [amount, setAmount] = useState('');
  const [fromCurrency, setFromCurrency] = useState('GNF');
  const [toCurrency, setToCurrency] = useState('USD');
  const [result, setResult] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);

      // Charger les devises
      const { data: currenciesData, error: currError } = await supabase
        .from('currencies')
        .select('*')
        .eq('is_active', true);

      if (currError) throw currError;
      setCurrencies(currenciesData || []);

      // Charger les taux
      const { data: ratesData, error: ratesError } = await supabase
        .from('exchange_rates')
        .select('*')
        .eq('is_active', true);

      if (ratesError) throw ratesError;
      setRates(ratesData || []);

    } catch (error) {
      console.error('❌ Erreur loadData:', error);
      toast.error('Erreur chargement devises');
    } finally {
      setLoading(false);
    }
  };

  const handleConvert = () => {
    const amountNum = parseFloat(amount);
    if (isNaN(amountNum) || amountNum <= 0) {
      toast.error('Montant invalide');
      return;
    }

    if (fromCurrency === toCurrency) {
      setResult(amountNum);
      return;
    }

    // Trouver le taux
    const rate = rates.find(
      r => r.from_currency === fromCurrency && r.to_currency === toCurrency
    );

    if (!rate) {
      toast.error(`Taux de change ${fromCurrency} vers ${toCurrency} non disponible`);
      setResult(null);
      return;
    }

    const converted = amountNum * rate.rate;
    setResult(converted);
    toast.success('Conversion effectuée');
  };

  const swapCurrencies = () => {
    setFromCurrency(toCurrency);
    setToCurrency(fromCurrency);
    setResult(null);
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <RefreshCw className="w-6 h-6 animate-spin mx-auto text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <ArrowRightLeft className="w-5 h-5" />
          Convertisseur de devises
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* De */}
        <div className="space-y-2">
          <Label>Montant à convertir</Label>
          <div className="flex gap-2">
            <Input
              type="number"
              placeholder="100"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="flex-1"
            />
            <Select value={fromCurrency} onValueChange={setFromCurrency}>
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {currencies.map((curr) => (
                  <SelectItem key={curr.code} value={curr.code}>
                    {curr.symbol}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Bouton inverser */}
        <div className="flex justify-center">
          <Button
            variant="ghost"
            size="icon"
            onClick={swapCurrencies}
            className="rounded-full"
          >
            <ArrowRightLeft className="w-4 h-4" />
          </Button>
        </div>

        {/* Vers */}
        <div className="space-y-2">
          <Label>Résultat</Label>
          <div className="flex gap-2">
            <Input
              type="text"
              value={result !== null ? result.toFixed(2) : ''}
              readOnly
              placeholder="..."
              className="flex-1 font-bold text-lg"
            />
            <Select value={toCurrency} onValueChange={setToCurrency}>
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {currencies.map((curr) => (
                  <SelectItem key={curr.code} value={curr.code}>
                    {curr.symbol}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Bouton convertir */}
        <Button
          onClick={handleConvert}
          disabled={!amount}
          className="w-full gap-2"
        >
          <ArrowRightLeft className="w-4 h-4" />
          Convertir
        </Button>

        {/* Info taux */}
        {rates.find(r => r.from_currency === fromCurrency && r.to_currency === toCurrency) && (
          <div className="p-3 bg-muted/50 rounded-lg text-sm text-center">
            <p className="text-muted-foreground">
              1 {fromCurrency} = {rates.find(r => r.from_currency === fromCurrency && r.to_currency === toCurrency)?.rate} {toCurrency}
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default CurrencyConverter;
