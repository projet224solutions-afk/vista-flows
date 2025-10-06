/**
 * HOOK DE REQUÊTE OPTIMISÉE
 * Cache intelligent et gestion des performances
 * 224Solutions - Optimized Query System
 */

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { globalCache, apiCache, cacheUtils } from '@/services/PerformanceCache';

interface QueryOptions<T> {
  enabled?: boolean;
  staleTime?: number;
  cacheTime?: number;
  refetchOnMount?: boolean;
  refetchOnWindowFocus?: boolean;
  retry?: number;
  retryDelay?: number;
  onSuccess?: (data: T) => void;
  onError?: (error: Error) => void;
  onSettled?: (data: T | undefined, error: Error | null) => void;
}

interface QueryResult<T> {
  data: T | undefined;
  error: Error | null;
  isLoading: boolean;
  isFetching: boolean;
  isSuccess: boolean;
  isError: boolean;
  refetch: () => Promise<T | undefined>;
  invalidate: () => void;
}

interface QueryConfig<T> {
  queryKey: string | string[];
  queryFn: () => Promise<T>;
  options?: QueryOptions<T>;
}

/**
 * Hook de requête optimisée avec cache intelligent
 */
export function useOptimizedQuery<T>({
  queryKey,
  queryFn,
  options = {}
}: QueryConfig<T>): QueryResult<T> {
  const {
    enabled = true,
    staleTime = 5 * 60 * 1000, // 5 minutes
    cacheTime = 10 * 60 * 1000, // 10 minutes
    refetchOnMount = true,
    refetchOnWindowFocus = false,
    retry = 3,
    retryDelay = 1000,
    onSuccess,
    onError,
    onSettled
  } = options;

  const [data, setData] = useState<T | undefined>(undefined);
  const [error, setError] = useState<Error | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isFetching, setIsFetching] = useState(false);
  const [retryCount, setRetryCount] = useState(0);
  
  const abortControllerRef = useRef<AbortController | null>(null);
  const mountedRef = useRef(true);
  const lastFetchRef = useRef<number>(0);

  // Générer la clé de cache
  const cacheKey = useMemo(() => {
    const key = Array.isArray(queryKey) ? queryKey.join(':') : queryKey;
    return `query:${key}`;
  }, [queryKey]);

  // Vérifier si les données sont fraîches
  const isStale = useCallback(() => {
    const now = Date.now();
    return now - lastFetchRef.current > staleTime;
  }, [staleTime]);

  // Fonction de fetch avec retry
  const fetchData = useCallback(async (force = false): Promise<T | undefined> => {
    if (!enabled) return undefined;

    // Vérifier le cache si pas de force refresh
    if (!force) {
      const cached = apiCache.get(cacheKey);
      if (cached && !isStale()) {
        setData(cached);
        setIsLoading(false);
        setIsFetching(false);
        onSuccess?.(cached);
        return cached;
      }
    }

    // Annuler la requête précédente
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    abortControllerRef.current = new AbortController();
    setIsFetching(true);
    setError(null);

    try {
      const result = await queryFn();
      
      if (!abortControllerRef.current.signal.aborted && mountedRef.current) {
        setData(result);
        setError(null);
        setRetryCount(0);
        lastFetchRef.current = Date.now();
        
        // Mettre en cache
        apiCache.set(cacheKey, result, cacheTime);
        
        onSuccess?.(result);
        onSettled?.(result, null);
      }

      return result;
    } catch (err) {
      if (!abortControllerRef.current.signal.aborted && mountedRef.current) {
        const error = err as Error;
        setError(error);
        
        // Retry automatique
        if (retryCount < retry) {
          setRetryCount(prev => prev + 1);
          setTimeout(() => {
            if (mountedRef.current) {
              fetchData(true);
            }
          }, retryDelay * Math.pow(2, retryCount));
        } else {
          onError?.(error);
          onSettled?.(undefined, error);
        }
      }
      throw err;
    } finally {
      if (!abortControllerRef.current.signal.aborted && mountedRef.current) {
        setIsLoading(false);
        setIsFetching(false);
      }
    }
  }, [
    enabled,
    cacheKey,
    queryFn,
    isStale,
    cacheTime,
    retry,
    retryDelay,
    retryCount,
    onSuccess,
    onError,
    onSettled
  ]);

  // Refetch manuel
  const refetch = useCallback(async () => {
    return await fetchData(true);
  }, [fetchData]);

  // Invalider le cache
  const invalidate = useCallback(() => {
    apiCache.delete(cacheKey);
    setData(undefined);
  }, [cacheKey]);

  // Effet initial
  useEffect(() => {
    if (enabled && refetchOnMount) {
      fetchData();
    }
  }, [enabled, refetchOnMount, fetchData]);

  // Refetch sur focus de la fenêtre
  useEffect(() => {
    if (!refetchOnWindowFocus) return;

    const handleFocus = () => {
      if (isStale()) {
        fetchData(true);
      }
    };

    window.addEventListener('focus', handleFocus);
    return () => window.removeEventListener('focus', handleFocus);
  }, [refetchOnWindowFocus, isStale, fetchData]);

  // Nettoyage
  useEffect(() => {
    return () => {
      mountedRef.current = false;
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  return {
    data,
    error,
    isLoading,
    isFetching,
    isSuccess: !error && !isLoading && data !== undefined,
    isError: !!error,
    refetch,
    invalidate
  };
}

/**
 * Hook pour les requêtes multiples
 */
export function useOptimizedQueries<T>(
  queries: QueryConfig<T>[]
): QueryResult<T>[] {
  return queries.map(query => useOptimizedQuery(query));
}

/**
 * Hook pour la mutation optimisée
 */
interface MutationOptions<T, V> {
  onSuccess?: (data: T, variables: V) => void;
  onError?: (error: Error, variables: V) => void;
  onSettled?: (data: T | undefined, error: Error | null, variables: V) => void;
  retry?: number;
  retryDelay?: number;
}

interface MutationResult<T, V> {
  data: T | undefined;
  error: Error | null;
  isLoading: boolean;
  isSuccess: boolean;
  isError: boolean;
  mutate: (variables: V) => Promise<T | undefined>;
  mutateAsync: (variables: V) => Promise<T>;
  reset: () => void;
}

export function useOptimizedMutation<T, V>(
  mutationFn: (variables: V) => Promise<T>,
  options: MutationOptions<T, V> = {}
): MutationResult<T, V> {
  const {
    onSuccess,
    onError,
    onSettled,
    retry = 3,
    retryDelay = 1000
  } = options;

  const [data, setData] = useState<T | undefined>(undefined);
  const [error, setError] = useState<Error | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [retryCount, setRetryCount] = useState(0);

  const mutate = useCallback(async (variables: V): Promise<T | undefined> => {
    setIsLoading(true);
    setError(null);

    try {
      const result = await mutationFn(variables);
      setData(result);
      setRetryCount(0);
      onSuccess?.(result, variables);
      onSettled?.(result, null, variables);
      return result;
    } catch (err) {
      const error = err as Error;
      setError(error);

      // Retry automatique
      if (retryCount < retry) {
        setRetryCount(prev => prev + 1);
        setTimeout(() => {
          mutate(variables);
        }, retryDelay * Math.pow(2, retryCount));
      } else {
        onError?.(error, variables);
        onSettled?.(undefined, error, variables);
      }
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, [mutationFn, onSuccess, onError, onSettled, retry, retryDelay, retryCount]);

  const mutateAsync = useCallback(async (variables: V): Promise<T> => {
    const result = await mutate(variables);
    if (!result) {
      throw new Error('Mutation failed');
    }
    return result;
  }, [mutate]);

  const reset = useCallback(() => {
    setData(undefined);
    setError(null);
    setIsLoading(false);
    setRetryCount(0);
  }, []);

  return {
    data,
    error,
    isLoading,
    isSuccess: !error && !isLoading && data !== undefined,
    isError: !!error,
    mutate,
    mutateAsync,
    reset
  };
}

/**
 * Hook pour invalider les caches
 */
export function useCacheInvalidation() {
  const invalidateAll = useCallback(() => {
    cacheUtils.invalidateAll();
  }, []);

  const invalidatePattern = useCallback((pattern: string | RegExp) => {
    globalCache.invalidatePattern(pattern);
    apiCache.invalidatePattern(pattern);
    componentCache.invalidatePattern(pattern);
  }, []);

  const getMetrics = useCallback(() => {
    return cacheUtils.getAllMetrics();
  }, []);

  return {
    invalidateAll,
    invalidatePattern,
    getMetrics
  };
}
