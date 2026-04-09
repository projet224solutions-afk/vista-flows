/**
 * HOOK DE FORMATAGE DE DEVISE DYNAMIQUE
 * Utilise la devise détectée/sélectionnée par l'utilisateur
 * Remplace tous les Intl.NumberFormat('fr-GN') hardcodés
 */

import { useCallback } from 'react';
import { useCurrency } from '@/contexts/CurrencyContext';
import { formatCurrency } from '@/lib/formatters';

/**
 * Hook React pour formater les montants dans la devise de l'utilisateur.
 * 
 * @example
 * const fc = useFormatCurrency();
 * fc(15000);           // "15 000 GNF" ou "9 150 XOF" selon la devise détectée
 * fc(100, 'USD');      // "$100.00" (override explicite)
 */
export function useFormatCurrency() {
  const { currency } = useCurrency();

  return useCallback(
    (amount: number, overrideCurrency?: string) =>
      formatCurrency(amount, overrideCurrency || currency),
    [currency]
  );
}

/**
 * Formatage simple (non-hook) pour les fichiers utilitaires non-React.
 * Nécessite de passer la devise explicitement.
 */
export { formatCurrency } from '@/lib/formatters';
