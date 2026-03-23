/**
 * SERVICE INTERNE DE TAUX DE CHANGE
 * Lit les taux depuis la table currency_exchange_rates (alimentée par le cron horaire)
 * Remplace toute dépendance aux API externes (fx-rates edge function, open.er-api.com)
 * 
 * Les taux incluent déjà la marge de 3% configurée dans margin_config.
 * Le backend (african-fx-collect) actualise les taux toutes les heures via pg_cron.
 */

import { supabase } from '@/integrations/supabase/client';

/** Cache mémoire côté client – TTL 5 min (les taux changent au max toutes les heures) */
const CACHE_TTL_MS = 5 * 60_000;

interface CachedRates {
  rates: Map<string, number>;
  fetchedAt: number;
}

let ratesCache: CachedRates | null = null;

/**
 * Charge tous les taux actifs depuis la DB en une seule requête.
 * Résultat mis en cache 5 min côté client.
 */
async function loadAllRates(): Promise<Map<string, number>> {
  if (ratesCache && Date.now() - ratesCache.fetchedAt < CACHE_TTL_MS) {
    return ratesCache.rates;
  }

  const { data, error } = await (supabase as any)
    .from('currency_exchange_rates')
    .select('from_currency, to_currency, rate, margin')
    .eq('is_active', true);

  const map = new Map<string, number>();

  if (!error && data && Array.isArray(data)) {
    for (const row of data) {
      if (typeof row.rate === 'number' && row.rate > 0) {
        const key = `${row.from_currency}→${row.to_currency}`;
        // Le taux stocké est le taux officiel ; on applique la marge
        const margin = typeof row.margin === 'number' ? row.margin : 0.03;
        map.set(key, row.rate * (1 + margin));
      }
    }
  }

  ratesCache = { rates: map, fetchedAt: Date.now() };
  return map;
}

/**
 * Obtient le taux final (avec marge) pour une paire de devises.
 * Essaie d'abord la paire directe, puis le pivot via USD, puis EUR.
 * 
 * @returns taux final ou null si indisponible
 */
export async function getFinalRate(from: string, to: string): Promise<number | null> {
  const f = from.toUpperCase();
  const t = to.toUpperCase();
  if (f === t) return 1;

  const rates = await loadAllRates();

  // 1. Paire directe
  const direct = rates.get(`${f}→${t}`);
  if (direct) return direct;

  // 2. Paire inverse
  const inverse = rates.get(`${t}→${f}`);
  if (inverse && inverse > 0) return 1 / inverse;

  // 3. Pivot via USD : from→USD * USD→to
  const fromToUsd = rates.get(`${f}→USD`) ?? (rates.get(`USD→${f}`) ? 1 / rates.get(`USD→${f}`)! : null);
  const usdToTo = rates.get(`USD→${t}`) ?? (rates.get(`${t}→USD`) ? 1 / rates.get(`${t}→USD`)! : null);
  if (fromToUsd && usdToTo) return fromToUsd * usdToTo;

  // 4. Pivot via EUR
  const fromToEur = rates.get(`${f}→EUR`) ?? (rates.get(`EUR→${f}`) ? 1 / rates.get(`EUR→${f}`)! : null);
  const eurToTo = rates.get(`EUR→${t}`) ?? (rates.get(`${t}→EUR`) ? 1 / rates.get(`${t}→EUR`)! : null);
  if (fromToEur && eurToTo) return fromToEur * eurToTo;

  return null;
}

/**
 * Charge les taux pour une devise de base vers plusieurs cibles.
 * Renvoie un Record<symbol, rate>.
 */
export async function getRatesForBase(base: string, symbols: string[]): Promise<Record<string, number>> {
  const result: Record<string, number> = {};
  // Paralléliser toutes les résolutions
  const entries = await Promise.all(
    symbols.map(async (sym) => {
      const rate = await getFinalRate(base, sym);
      return [sym.toUpperCase(), rate] as const;
    })
  );
  for (const [sym, rate] of entries) {
    if (rate !== null) result[sym] = rate;
  }
  return result;
}

/**
 * Convertit un montant d'une devise à une autre en utilisant le taux final interne.
 */
export async function convertAmount(amount: number, from: string, to: string): Promise<{ converted: number; rate: number } | null> {
  const rate = await getFinalRate(from, to);
  if (rate === null) return null;
  return { converted: amount * rate, rate };
}

/**
 * Force le rechargement du cache (par ex. après un changement de devise utilisateur).
 */
export function invalidateRatesCache() {
  ratesCache = null;
}

/**
 * Retourne la date de dernière mise à jour des taux.
 */
export async function getLastUpdated(): Promise<Date | null> {
  const { data } = await (supabase as any)
    .from('currency_exchange_rates')
    .select('retrieved_at')
    .eq('is_active', true)
    .order('retrieved_at', { ascending: false })
    .limit(1);

  if (data && data[0]?.retrieved_at) {
    return new Date(data[0].retrieved_at);
  }
  return null;
}
