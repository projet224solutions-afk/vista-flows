/**
 * HOOK DE CONVERSION DE PRIX AUTOMATIQUE
 * Convertit les prix dans la devise locale de l'utilisateur
 * Utilise les taux de change réels du jour
 */

import { useMemo, useCallback } from 'react';
import { useGeoDetection } from './useGeoDetection';
import { useFxRates } from './useFxRates';
import { formatCurrency } from '@/lib/formatters';
import { useCurrency } from '@/context/CurrencyContext';
import { WORLD_CURRENCIES } from '@/data/currencies';

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

// Couverture mondiale: précharge toutes les devises connues du système
const WORLD_CURRENCY_CODES = Array.from(new Set(WORLD_CURRENCIES.map((c) => c.code.toUpperCase())));

export function usePriceConverter(): UsePriceConverterResult {
  const { geoInfo, loading: geoLoading } = useGeoDetection();
  const { currency: contextCurrency } = useCurrency();
  
  // Utiliser la devise du CurrencyContext (synchronisé avec la sélection manuelle + géo)
  // Priorité: contexte (qui reflète le choix manuel) > géo-détection > défaut GNF
  const userCurrency = contextCurrency || geoInfo?.currency || 'GNF';
  const userCountry = geoInfo?.country || 'GN';

  // Charger les taux depuis GNF comme base (devise de tous les produits)
  const { rates, lastUpdated, loading: ratesLoading, refresh } = useFxRates({
    base: 'GNF',
    symbols: WORLD_CURRENCY_CODES,
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
    // Les taux sont basés sur GNF: rates[X] = combien de X pour 1 GNF
    let rate = 1;
    let convertedAmount = amount;

    if (from === 'GNF') {
      // Conversion directe: GNF -> autre devise
      // rates[EUR] = 0.000092 signifie 1 GNF = 0.000092 EUR
      const toRate = rates[to];
      if (toRate && toRate > 0) {
        rate = toRate;
        convertedAmount = amount * rate;
      }
    } else if (to === 'GNF') {
      // Conversion inverse: autre devise -> GNF
      // Pour convertir EUR -> GNF, on divise par le taux EUR
      const fromRate = rates[from];
      if (fromRate && fromRate > 0) {
        rate = 1 / fromRate;
        convertedAmount = amount * rate;
      }
    } else {
      // Conversion croisée: autre devise -> GNF -> autre devise
      // Ex: EUR -> USD = EUR -> GNF -> USD
      const fromRate = rates[from]; // EUR par 1 GNF
      const toRate = rates[to];     // USD par 1 GNF
      
      if (fromRate && toRate && fromRate > 0) {
        // Montant en GNF = amount / fromRate
        // Puis en toDevise = montant_gnf * toRate
        rate = toRate / fromRate;
        convertedAmount = amount * rate;
      }
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
