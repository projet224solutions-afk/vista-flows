/**
 * HOOK DE TAUX DE CHANGE – VERSION INTERNE
 * Lit les taux depuis currency_exchange_rates (alimentée par le cron horaire).
 * Plus aucun appel à l'edge function fx-rates ni à une API externe.
 */

import { useCallback, useEffect, useMemo, useState } from "react";
import { getRatesForBase, invalidateRatesCache, getLastUpdated } from "@/services/exchangeService";

type RatesBySymbol = Record<string, number>;

interface UseFxRatesParams {
  base: string;
  symbols: string[];
  /** Ignoré – les taux sont rafraîchis automatiquement par le backend toutes les heures */
  refreshMinutes?: number;
}

export function useFxRates({ base, symbols }: UseFxRatesParams) {
  const [rates, setRates] = useState<RatesBySymbol>({});
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [loading, setLoading] = useState(false);

  const symbolsKey = useMemo(
    () => symbols.map((s) => s.toUpperCase()).sort().join(","),
    [symbols]
  );

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      invalidateRatesCache();
      const result = await getRatesForBase(base, symbols);
      if (Object.keys(result).length > 0) {
        setRates(result);
      }
      const ts = await getLastUpdated();
      setLastUpdated(ts);
    } catch {
      // Garder les taux actuels en cas d'erreur
    } finally {
      setLoading(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [base, symbolsKey]);

  // Chargement initial
  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    getRatesForBase(base, symbols)
      .then((result) => {
        if (!cancelled && Object.keys(result).length > 0) setRates(result);
      })
      .catch(() => {})
      .finally(() => { if (!cancelled) setLoading(false); });

    getLastUpdated().then((ts) => { if (!cancelled) setLastUpdated(ts); });

    return () => { cancelled = true; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [base, symbolsKey]);

  return { rates, lastUpdated, loading, refresh };
}
