/**
 * HOOK DE CONVERSION DE PRIX AUTOMATIQUE
 * Convertit les prix dans la devise locale de l'utilisateur
 * Utilise les taux de change réels du jour
 */

import { useMemo, useCallback } from 'react';
import { useGeoDetection } from './useGeoDetection';
import { useFxRates } from './useFxRates';
import { formatCurrency } from '@/lib/formatters';

export interface ConvertedPrice {
  /** Prix original */
  originalAmount: number;
  /** Devise originale */
  originalCurrency: string;
  /** Prix converti */
  convertedAmount: number;
  /** Devise de l'utilisateur */
  userCurrency: string;
  /** Taux de change utilisé */
  rate: number;
  /** Prix formaté pour affichage */
  formatted: string;
  /** Prix original formaté (pour référence) */
  originalFormatted: string;
  /** Indique si une conversion a eu lieu */
  wasConverted: boolean;
}

interface UsePriceConverterResult {
  /** Convertit un prix dans la devise locale */
  convert: (amount: number, fromCurrency: string) => ConvertedPrice;
  /** Devise de l'utilisateur */
  userCurrency: string;
  /** Pays de l'utilisateur */
  userCountry: string;
  /** Chargement en cours */
  loading: boolean;
  /** Dernière mise à jour des taux */
  lastUpdated: Date | null;
  /** Rafraîchir les taux */
  refreshRates: () => Promise<void>;
}

// Liste des devises les plus courantes pour le préchargement
const COMMON_CURRENCIES = [
  'USD', 'EUR', 'GBP', 'GNF', 'XOF', 'XAF', 
  'NGN', 'GHS', 'KES', 'ZAR', 'MAD', 'EGP',
  'CAD', 'AUD', 'CHF', 'JPY', 'CNY', 'INR', 'AED'
];

export function usePriceConverter(): UsePriceConverterResult {
  const { geoInfo, loading: geoLoading } = useGeoDetection();
  
  const userCurrency = geoInfo?.currency || 'GNF';
  const userCountry = geoInfo?.country || 'GN';

  // Charger les taux depuis USD comme base (plus de paires disponibles)
  const { rates, lastUpdated, loading: ratesLoading, refresh } = useFxRates({
    base: 'USD',
    symbols: COMMON_CURRENCIES,
    refreshMinutes: 60, // Rafraîchir toutes les heures
  });

  const convert = useCallback((amount: number, fromCurrency: string): ConvertedPrice => {
    const from = fromCurrency.toUpperCase();
    const to = userCurrency.toUpperCase();

    // Si même devise, pas de conversion
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

    // Calculer le taux de conversion
    // rates est basé sur USD, donc on convertit: FROM -> USD -> TO
    let rate = 1;
    let convertedAmount = amount;

    const fromRate = from === 'USD' ? 1 : rates[from];
    const toRate = to === 'USD' ? 1 : rates[to];

    if (fromRate && toRate) {
      // FROM -> USD -> TO
      // Si FROM=EUR, rates[EUR]=0.85 signifie 1 USD = 0.85 EUR
      // Donc 1 EUR = 1/0.85 USD
      // Puis 1 USD = rates[TO] TO
      rate = toRate / fromRate;
      convertedAmount = amount * rate;
    } else if (from === 'USD' && toRate) {
      rate = toRate;
      convertedAmount = amount * rate;
    } else if (to === 'USD' && fromRate) {
      rate = 1 / fromRate;
      convertedAmount = amount * rate;
    }

    // Arrondir selon la devise (certaines n'ont pas de décimales)
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
