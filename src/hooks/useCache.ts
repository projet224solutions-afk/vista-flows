/**
 * Hook React pour utiliser le système de cache distribué
 */

import { useState, useEffect, useCallback } from 'react';
import { cacheService } from '@/services/cache/CacheService';
import { rateLimiter, RateLimitError } from '@/services/cache/RateLimiter';

interface CacheStats {
  hits: number;
  misses: number;
  size: number;
  hitRate: number;
  avgResponseTime: number;
}

interface UseCacheOptions {
  ttl?: number;
  enabled?: boolean;
}

/**
 * Hook pour mettre en cache des données avec React Query-like API
 */
export function useCachedData<T>(
  key: string,
  fetcher: () => Promise<T>,
  options: UseCacheOptions = {}
) {
  const { ttl, enabled = true } = options;
  const [data, setData] = useState<T | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [isFromCache, setIsFromCache] = useState(false);

  const fetchData = useCallback(async () => {
    if (!enabled) return;
    
    setIsLoading(true);
    setError(null);

    try {
      // Try cache first
      const cached = await cacheService.get<T>(key);
      if (cached !== null) {
        setData(cached);
        setIsFromCache(true);
        setIsLoading(false);
        return;
      }

      // Fetch fresh data
      const freshData = await fetcher();
      await cacheService.set(key, freshData, ttl);
      setData(freshData);
      setIsFromCache(false);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Unknown error'));
    } finally {
      setIsLoading(false);
    }
  }, [key, fetcher, ttl, enabled]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const invalidate = useCallback(async () => {
    await cacheService.delete(key);
    await fetchData();
  }, [key, fetchData]);

  const update = useCallback(async (newData: T) => {
    await cacheService.set(key, newData, ttl);
    setData(newData);
  }, [key, ttl]);

  return {
    data,
    isLoading,
    error,
    isFromCache,
    invalidate,
    update,
    refetch: fetchData,
  };
}

/**
 * Hook pour les statistiques du cache
 */
export function useCacheStats() {
  const [stats, setStats] = useState<CacheStats>({
    hits: 0,
    misses: 0,
    size: 0,
    hitRate: 0,
    avgResponseTime: 0,
  });

  useEffect(() => {
    const updateStats = () => {
      setStats(cacheService.getStats());
    };

    updateStats();
    const interval = setInterval(updateStats, 5000);
    return () => clearInterval(interval);
  }, []);

  const clearCache = useCallback(async () => {
    await cacheService.clear();
    setStats(cacheService.getStats());
  }, []);

  return { stats, clearCache };
}

/**
 * Hook pour le rate limiting
 */
export function useRateLimit(
  identifier: string,
  type: 'public' | 'authenticated' | 'financial' | 'auth' | 'search' | 'upload' | 'notification' = 'authenticated'
) {
  const [isLimited, setIsLimited] = useState(false);
  const [remaining, setRemaining] = useState<number | null>(null);
  const [resetAt, setResetAt] = useState<number | null>(null);

  const checkLimit = useCallback(async () => {
    const result = await rateLimiter.peekLimit(identifier, type);
    setIsLimited(!result.allowed);
    setRemaining(result.remaining);
    setResetAt(result.resetAt);
    return result;
  }, [identifier, type]);

  const consumeLimit = useCallback(async () => {
    const result = await rateLimiter.checkLimit(identifier, type);
    setIsLimited(!result.allowed);
    setRemaining(result.remaining);
    setResetAt(result.resetAt);
    return result;
  }, [identifier, type]);

  const withRateLimit = useCallback(
    async <T>(fn: () => Promise<T>): Promise<T> => {
      const result = await rateLimiter.checkLimit(identifier, type);
      
      if (!result.allowed) {
        throw new RateLimitError(
          `Limite atteinte. Réessayez dans ${result.retryAfter} secondes.`,
          result.retryAfter || 60
        );
      }

      setRemaining(result.remaining);
      return fn();
    },
    [identifier, type]
  );

  useEffect(() => {
    checkLimit();
  }, [checkLimit]);

  return {
    isLimited,
    remaining,
    resetAt,
    checkLimit,
    consumeLimit,
    withRateLimit,
  };
}

/**
 * Hook pour gérer le cache utilisateur
 */
export function useUserCache(userId: string | undefined) {
  const cacheUser = useCallback(async (userData: any) => {
    if (!userId) return;
    await cacheService.cacheUser(userId, userData);
  }, [userId]);

  const getUser = useCallback(async () => {
    if (!userId) return null;
    return cacheService.getUser(userId);
  }, [userId]);

  const invalidateUser = useCallback(async () => {
    if (!userId) return;
    await cacheService.invalidateUser(userId);
  }, [userId]);

  return { cacheUser, getUser, invalidateUser };
}

/**
 * Hook pour gérer le cache produit
 */
export function useProductCache() {
  const cacheProduct = useCallback(async (productId: string, productData: any) => {
    await cacheService.cacheProduct(productId, productData);
  }, []);

  const getProduct = useCallback(async (productId: string) => {
    return cacheService.getProduct(productId);
  }, []);

  const invalidateProduct = useCallback(async (productId: string) => {
    await cacheService.invalidateProduct(productId);
  }, []);

  return { cacheProduct, getProduct, invalidateProduct };
}

/**
 * Hook pour le cache de recherche
 */
export function useSearchCache() {
  const cacheSearch = useCallback(async (query: string, results: any[]) => {
    await cacheService.cacheSearch(query, results);
  }, []);

  const getSearchCache = useCallback(async (query: string) => {
    return cacheService.getSearchCache(query);
  }, []);

  return { cacheSearch, getSearchCache };
}
