/**
 * CACHE INSTANTANÉ - ARCHITECTURE "STALE-WHILE-REVALIDATE"
 * Objectif: FCP < 100ms en servant les données depuis cache mémoire/localStorage
 * puis revalidation en arrière-plan
 */

// Cache mémoire ultra-rapide (0ms d'accès)
const MEMORY_CACHE = new Map<string, { value: unknown; timestamp: number }>();
const CACHE_PREFIX = '224_instant_';

// TTL par défaut: 5 minutes
const DEFAULT_TTL_MS = 5 * 60 * 1000;

/**
 * Récupère une valeur du cache INSTANTANÉMENT
 * 1. Mémoire d'abord (0ms)
 * 2. localStorage ensuite (~2ms)
 * @returns null si pas de cache ou expiré
 */
export function getInstant<T = unknown>(key: string, maxAgeMs: number = DEFAULT_TTL_MS): T | null {
  const now = Date.now();
  
  // 1. Cache mémoire (instantané)
  const memEntry = MEMORY_CACHE.get(key);
  if (memEntry && (now - memEntry.timestamp) < maxAgeMs) {
    return memEntry.value as T;
  }
  
  // 2. localStorage (très rapide, ~2ms)
  try {
    const stored = localStorage.getItem(CACHE_PREFIX + key);
    if (stored) {
      const { value, timestamp } = JSON.parse(stored);
      if ((now - timestamp) < maxAgeMs) {
        // Restaurer en mémoire pour accès futurs plus rapides
        MEMORY_CACHE.set(key, { value, timestamp });
        return value as T;
      }
    }
  } catch {
    // Ignorer erreurs de parsing
  }
  
  return null;
}

/**
 * Stocke une valeur dans le cache (mémoire + localStorage)
 */
export function setInstant<T = unknown>(key: string, value: T): void {
  const timestamp = Date.now();
  
  // 1. Cache mémoire (instantané)
  MEMORY_CACHE.set(key, { value, timestamp });
  
  // 2. Persister en localStorage (async pour ne pas bloquer)
  try {
    localStorage.setItem(CACHE_PREFIX + key, JSON.stringify({ value, timestamp }));
  } catch (e) {
    // localStorage plein ou désactivé - continuer avec mémoire seule
    console.warn('InstantCache: localStorage unavailable', e);
  }
}

/**
 * Supprime une entrée du cache
 */
export function deleteInstant(key: string): void {
  MEMORY_CACHE.delete(key);
  try {
    localStorage.removeItem(CACHE_PREFIX + key);
  } catch {
    // Ignorer
  }
}

/**
 * Vide tout le cache instantané
 */
export function clearInstantCache(): void {
  MEMORY_CACHE.clear();
  try {
    const keys = Object.keys(localStorage);
    keys.forEach(key => {
      if (key.startsWith(CACHE_PREFIX)) {
        localStorage.removeItem(key);
      }
    });
  } catch {
    // Ignorer
  }
}

/**
 * Wrapper pour pattern "Stale-While-Revalidate"
 * Retourne immédiatement la valeur en cache, puis revalide en arrière-plan
 */
export function useInstantData<T>(
  key: string,
  fetcher: () => Promise<T>,
  options: {
    maxAgeMs?: number;
    onUpdate?: (data: T) => void;
  } = {}
): { data: T | null; isStale: boolean; revalidate: () => Promise<T> } {
  const { maxAgeMs = DEFAULT_TTL_MS, onUpdate } = options;
  
  // Récupérer depuis cache instantanément
  const cachedData = getInstant<T>(key, maxAgeMs);
  const isStale = cachedData !== null;
  
  // Fonction de revalidation
  const revalidate = async (): Promise<T> => {
    const freshData = await fetcher();
    setInstant(key, freshData);
    if (onUpdate) onUpdate(freshData);
    return freshData;
  };
  
  // Si pas de cache, la data sera null et le composant devra attendre
  // Si cache présent, data est disponible immédiatement
  return { data: cachedData, isStale, revalidate };
}

/**
 * Clés de cache prédéfinies pour cohérence
 */
export const CACHE_KEYS = {
  VENDOR_STATS: 'vendor_stats',
  PROFILE: 'profile',
  SESSION: 'session',
  PRODUCTS: 'products',
  RECENT_ORDERS: 'recent_orders',
  NOTIFICATIONS: 'notifications',
} as const;
