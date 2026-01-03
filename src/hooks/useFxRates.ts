import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

type RatesBySymbol = Record<string, number>;

interface UseFxRatesParams {
  base: string;
  symbols: string[];
  /** Rafraîchissement automatique (minutes). Par défaut: toutes les 12h. */
  refreshMinutes?: number;
}

export function useFxRates({ base, symbols, refreshMinutes = 12 * 60 }: UseFxRatesParams) {
  const [rates, setRates] = useState<RatesBySymbol>({});
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [loading, setLoading] = useState(false);

  const symbolsKey = useMemo(
    () => symbols.map((s) => s.toUpperCase()).sort().join(","),
    [symbols]
  );

  const inFlightRef = useRef<Promise<void> | null>(null);

  const refresh = useCallback(async () => {
    if (inFlightRef.current) return inFlightRef.current;

    const run = (async () => {
      setLoading(true);
      try {
        const payload = {
          base: base.toUpperCase(),
          symbols: symbols.map((s) => s.toUpperCase()),
        };

        const { data, error } = await supabase.functions.invoke("fx-rates", {
          body: payload,
        });

        if (error) throw error;

        const nextRates: RatesBySymbol = (data?.rates || {}) as RatesBySymbol;
        if (!nextRates || Object.keys(nextRates).length === 0) {
          throw new Error("Aucun taux renvoyé");
        }

        setRates(nextRates);

        const ts =
          (typeof data?.time_last_update_utc === "string" && data.time_last_update_utc) ||
          (typeof data?.fetched_at === "string" && data.fetched_at) ||
          null;
        setLastUpdated(ts ? new Date(ts) : new Date());
        return;
      } catch (_err) {
        // Fallback local (si API externe indisponible): taux configurés en DB
        try {
          // Essayer d'abord currency_exchange_rates (nouvelle table)
          const { data: dbRates, error: dbError } = await (supabase as any)
            .from("currency_exchange_rates")
            .select("from_currency,to_currency,rate")
            .eq("is_active", true)
            .eq("from_currency", base.toUpperCase())
            .in("to_currency", symbols.map((s) => s.toUpperCase()));

          if (!dbError && dbRates && Array.isArray(dbRates) && dbRates.length > 0) {
            const nextRates: RatesBySymbol = {};
            for (const r of dbRates) {
              if (typeof r.rate === "number" && r.rate > 0) {
                nextRates[String(r.to_currency).toUpperCase()] = r.rate;
              }
            }
            if (Object.keys(nextRates).length > 0) {
              setRates(nextRates);
              setLastUpdated(new Date());
              return;
            }
          }

          // Fallback sur exchange_rates (ancienne table si existe)
          const { data: legacyRates, error: legacyError } = await (supabase as any)
            .from("exchange_rates")
            .select("from_currency,to_currency,rate")
            .eq("is_active", true)
            .eq("from_currency", base.toUpperCase())
            .in("to_currency", symbols.map((s) => s.toUpperCase()));

          if (!legacyError && legacyRates && Array.isArray(legacyRates)) {
            const nextRates: RatesBySymbol = {};
            for (const r of legacyRates) {
              if (typeof r.rate === "number" && r.rate > 0) {
                nextRates[String(r.to_currency).toUpperCase()] = r.rate;
              }
            }
            if (Object.keys(nextRates).length > 0) {
              setRates(nextRates);
              setLastUpdated(new Date());
            }
          }
        } catch {
          // garder les taux actuels
        }
      } finally {
        setLoading(false);
        inFlightRef.current = null;
      }
    })();

    inFlightRef.current = run;
    return run;
  }, [base, symbolsKey]);

  useEffect(() => {
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [base, symbolsKey]);

  useEffect(() => {
    const ms = Math.max(5, refreshMinutes) * 60_000;
    const id = window.setInterval(() => {
      refresh();
    }, ms);
    return () => window.clearInterval(id);
  }, [refresh, refreshMinutes]);

  return { rates, lastUpdated, loading, refresh };
}
