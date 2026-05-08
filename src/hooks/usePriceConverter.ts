/**
 * HOOK DE CONVERSION DE PRIX – VERSION INTERNE
 * Convertit les prix dans la devise locale de l'utilisateur
 * Utilise exclusivement les taux internes (currency_exchange_rates)
 * alimentés par le cron horaire african-fx-collect + marge 3%
 */

import { useMemo, useCallback, useState, useEffect } from 'react';
import { useGeoDetection } from './useGeoDetection';
import { formatCurrency } from '@/lib/formatters';
import { useCurrency } from '@/contexts/CurrencyContext';
import { getRatesForBase, invalidateRatesCache, getLastUpdated } from '@/services/exchangeService';
import { WORLD_CURRENCIES } from '@/data/currencies';

export interface ConvertedPrice {
  originalAmount: number;
  originalCurrency: string;
  convertedAmount: number;
  userCurrency: string;
  rate: number;
  formatted: string;
  originalFormatted: string;
  wasConverted: boolean;
}

interface UsePriceConverterResult {
  convert: (amount: number, fromCurrency: string) => ConvertedPrice;
  userCurrency: string;
  userCountry: string;
  loading: boolean;
  lastUpdated: Date | null;
  refreshRates: () => Promise<void>;
}

// Toutes les devises connues du système
const WORLD_CURRENCY_CODES = Array.from(new Set(WORLD_CURRENCIES.map((c) => c.code.toUpperCase())));

// Taux GNF→X de secours (utilisés quand la table currency_exchange_rates est vide)
// Source: taux approximatifs 2025. Mis à jour par le cron african-fx-collect en prod.
const FALLBACK_RATES: Record<string, number> = {
  GNF: 1,
  USD: 0.0001163,   // 1 GNF ≈ 0.000116 USD
  EUR: 0.0001075,   // 1 GNF ≈ 0.000108 EUR
  GBP: 0.0000920,   // 1 GNF ≈ 0.000092 GBP
  XOF: 0.0724,      // 1 GNF ≈ 0.0724 XOF
  XAF: 0.0724,      // même zone CFA
  NGN: 0.1800,      // 1 GNF ≈ 0.18 NGN
  GHS: 0.00161,     // 1 GNF ≈ 0.0016 GHS
  MAD: 0.00116,     // 1 GNF ≈ 0.0012 MAD
  CDF: 0.3320,      // 1 GNF ≈ 0.33 CDF
  KES: 0.01502,     // 1 GNF ≈ 0.015 KES
  ZAR: 0.00213,     // 1 GNF ≈ 0.0021 ZAR
  CNY: 0.000843,    // 1 GNF ≈ 0.00084 CNY
  JPY: 0.01738,     // 1 GNF ≈ 0.017 JPY
  CAD: 0.0001592,   // 1 GNF ≈ 0.00016 CAD
  AUD: 0.0001803,   // 1 GNF ≈ 0.00018 AUD
};

export function usePriceConverter(): UsePriceConverterResult {
  const { geoInfo, loading: geoLoading } = useGeoDetection();
  const { currency: contextCurrency } = useCurrency();

  const userCurrency = contextCurrency || geoInfo?.currency || 'GNF';
  const userCountry = geoInfo?.country || 'GN';

  const [rates, setRates] = useState<Record<string, number>>({});
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [ratesLoading, setRatesLoading] = useState(false);

  // Charger les taux depuis la DB (une seule fois, cache 5 min côté service)
  useEffect(() => {
    let cancelled = false;
    setRatesLoading(true);

    getRatesForBase('GNF', WORLD_CURRENCY_CODES)
      .then((result) => {
        if (!cancelled) {
          // Si la DB retourne des taux, on les utilise ; sinon on garde les taux de secours
          setRates(Object.keys(result).length > 0 ? result : FALLBACK_RATES);
        }
      })
      .catch(() => {
        // En cas d'erreur réseau, utiliser les taux hardcodés
        if (!cancelled) setRates(FALLBACK_RATES);
      })
      .finally(() => { if (!cancelled) setRatesLoading(false); });

    getLastUpdated().then((ts) => { if (!cancelled) setLastUpdated(ts); });

    return () => { cancelled = true; };
  }, [userCurrency]);

  const refresh = useCallback(async () => {
    invalidateRatesCache();
    setRatesLoading(true);
    try {
      const result = await getRatesForBase('GNF', WORLD_CURRENCY_CODES);
      if (Object.keys(result).length > 0) setRates(result);
      const ts = await getLastUpdated();
      setLastUpdated(ts);
    } catch {
      // garder les taux actuels
    } finally {
      setRatesLoading(false);
    }
  }, []);

  const convert = useCallback((amount: number, fromCurrency: string): ConvertedPrice => {
    const from = fromCurrency.toUpperCase();
    const to = userCurrency.toUpperCase();

    // Même devise → pas de conversion
    if (from === to) {
      const formatted = formatCurrency(amount, to);
      return {
        originalAmount: amount,
        originalCurrency: from,
        convertedAmount: amount,
        userCurrency: to,
        rate: 1,
        formatted,
        originalFormatted: formatted,
        wasConverted: false,
      };
    }

    // Calculer le taux (les rates sont basés sur GNF: rates[X] = combien de X pour 1 GNF)
    let rate = 1;
    let convertedAmount = amount;

    if (from === 'GNF') {
      const toRate = rates[to];
      if (toRate && toRate > 0) {
        rate = toRate;
        convertedAmount = amount * rate;
      }
    } else if (to === 'GNF') {
      const fromRate = rates[from];
      if (fromRate && fromRate > 0) {
        rate = 1 / fromRate;
        convertedAmount = amount * rate;
      }
    } else {
      // Conversion croisée via GNF
      const fromRate = rates[from];
      const toRate = rates[to];
      if (fromRate && toRate && fromRate > 0) {
        rate = toRate / fromRate;
        convertedAmount = amount * rate;
      }
    }

    // Arrondi selon la devise
    const noDecimalCurrencies = ['GNF', 'XOF', 'XAF', 'JPY', 'KRW', 'VND'];
    if (noDecimalCurrencies.includes(to)) {
      convertedAmount = Math.round(convertedAmount);
    } else {
      convertedAmount = Math.round(convertedAmount * 100) / 100;
    }

    return {
      originalAmount: amount,
      originalCurrency: from,
      convertedAmount,
      userCurrency: to,
      rate,
      formatted: formatCurrency(convertedAmount, to),
      originalFormatted: formatCurrency(amount, from),
      wasConverted: true,
    };
  }, [userCurrency, rates]);

  return {
    convert,
    userCurrency,
    userCountry,
    loading: geoLoading || ratesLoading,
    lastUpdated,
    refreshRates: refresh,
  };
}

/**
 * Hook simplifié pour convertir un prix unique
 */
export function useConvertedPrice(amount: number, fromCurrency: string): ConvertedPrice | null {
  const { convert, loading } = usePriceConverter();

  return useMemo(() => {
    if (loading || !amount || !fromCurrency) return null;
    return convert(amount, fromCurrency);
  }, [convert, loading, amount, fromCurrency]);
}
