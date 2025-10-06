/**
 * HOOK D'OPTIMISATION DES PERFORMANCES
 * Système intelligent de cache et lazy loading
 * 224Solutions - Performance Optimization System
 */

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { debounce, throttle } from 'lodash-es';

interface PerformanceConfig {
  enableLazyLoading?: boolean;
  enableVirtualization?: boolean;
  enableDebouncing?: boolean;
  enableThrottling?: boolean;
  cacheTimeout?: number;
  maxCacheSize?: number;
}

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number;
}

interface PerformanceMetrics {
  loadTime: number;
  renderTime: number;
  memoryUsage: number;
  cacheHitRate: number;
}

export function usePerformanceOptimization<T>(
  key: string,
  fetchFn: () => Promise<T>,
  config: PerformanceConfig = {}
) {
  const {
    enableLazyLoading = true,
    enableVirtualization = false,
    enableDebouncing = true,
    enableThrottling = true,
    cacheTimeout = 5 * 60 * 1000, // 5 minutes
    maxCacheSize = 100
  } = config;

  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [metrics, setMetrics] = useState<PerformanceMetrics>({
    loadTime: 0,
    renderTime: 0,
    memoryUsage: 0,
    cacheHitRate: 0
  });

  const cacheRef = useRef<Map<string, CacheEntry<T>>>(new Map());
  const abortControllerRef = useRef<AbortController | null>(null);
  const renderStartRef = useRef<number>(0);

  // Cache intelligent avec TTL
  const getFromCache = useCallback((cacheKey: string): T | null => {
    const entry = cacheRef.current.get(cacheKey);
    if (!entry) return null;

    const now = Date.now();
    if (now - entry.timestamp > entry.ttl) {
      cacheRef.current.delete(cacheKey);
      return null;
    }

    // Mettre à jour les métriques
    setMetrics(prev => ({
      ...prev,
      cacheHitRate: prev.cacheHitRate + 1
    }));

    return entry.data;
  }, []);

  const setCache = useCallback((cacheKey: string, data: T, ttl: number = cacheTimeout) => {
    // Nettoyer le cache si nécessaire
    if (cacheRef.current.size >= maxCacheSize) {
      const oldestKey = cacheRef.current.keys().next().value;
      cacheRef.current.delete(oldestKey);
    }

    cacheRef.current.set(cacheKey, {
      data,
      timestamp: Date.now(),
      ttl
    });
  }, [cacheTimeout, maxCacheSize]);

  // Fonction de fetch optimisée
  const fetchData = useCallback(async (forceRefresh = false) => {
    const cacheKey = `${key}_${JSON.stringify(config)}`;
    
    // Vérifier le cache d'abord
    if (!forceRefresh) {
      const cached = getFromCache(cacheKey);
      if (cached) {
        setData(cached);
        return cached;
      }
    }

    // Annuler la requête précédente si elle existe
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    abortControllerRef.current = new AbortController();
    const startTime = performance.now();

    try {
      setLoading(true);
      setError(null);

      const result = await fetchFn();
      
      // Vérifier si la requête n'a pas été annulée
      if (!abortControllerRef.current.signal.aborted) {
        setData(result);
        setCache(cacheKey, result);
        
        const loadTime = performance.now() - startTime;
        setMetrics(prev => ({
          ...prev,
          loadTime
        }));
      }

      return result;
    } catch (err) {
      if (!abortControllerRef.current.signal.aborted) {
        const error = err as Error;
        setError(error);
        console.error(`❌ Performance fetch error for ${key}:`, error);
      }
      throw err;
    } finally {
      if (!abortControllerRef.current.signal.aborted) {
        setLoading(false);
      }
    }
  }, [key, fetchFn, config, getFromCache, setCache]);

  // Debounced fetch pour éviter les appels répétés
  const debouncedFetch = useMemo(() => {
    if (!enableDebouncing) return fetchData;
    return debounce(fetchData, 300);
  }, [fetchData, enableDebouncing]);

  // Throttled fetch pour les mises à jour fréquentes
  const throttledFetch = useMemo(() => {
    if (!enableThrottling) return fetchData;
    return throttle(fetchData, 1000);
  }, [fetchData, enableThrottling]);

  // Lazy loading
  const lazyFetch = useCallback(() => {
    if (enableLazyLoading && !data && !loading) {
      return debouncedFetch();
    }
    return Promise.resolve(data);
  }, [enableLazyLoading, data, loading, debouncedFetch]);

  // Mesure des performances de rendu
  useEffect(() => {
    renderStartRef.current = performance.now();
    
    return () => {
      const renderTime = performance.now() - renderStartRef.current;
      setMetrics(prev => ({
        ...prev,
        renderTime
      }));
    };
  }, [data]);

  // Nettoyage à la destruction
  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  return {
    data,
    loading,
    error,
    metrics,
    fetch: fetchData,
    lazyFetch,
    debouncedFetch,
    throttledFetch,
    clearCache: () => cacheRef.current.clear()
  };
}

/**
 * Hook pour la virtualisation des listes
 */
export function useVirtualization<T>(
  items: T[],
  itemHeight: number,
  containerHeight: number,
  overscan: number = 5
) {
  const [scrollTop, setScrollTop] = useState(0);
  
  const visibleRange = useMemo(() => {
    const startIndex = Math.floor(scrollTop / itemHeight);
    const endIndex = Math.min(
      startIndex + Math.ceil(containerHeight / itemHeight) + overscan,
      items.length - 1
    );
    
    return {
      start: Math.max(0, startIndex - overscan),
      end: endIndex
    };
  }, [scrollTop, itemHeight, containerHeight, overscan, items.length]);

  const visibleItems = useMemo(() => {
    return items.slice(visibleRange.start, visibleRange.end + 1);
  }, [items, visibleRange]);

  const totalHeight = items.length * itemHeight;
  const offsetY = visibleRange.start * itemHeight;

  return {
    visibleItems,
    totalHeight,
    offsetY,
    setScrollTop
  };
}

/**
 * Hook pour le lazy loading des images
 */
export function useLazyImage(src: string, placeholder?: string) {
  const [imageSrc, setImageSrc] = useState(placeholder || '');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const imgRef = useRef<HTMLImageElement>(null);

  useEffect(() => {
    const img = imgRef.current;
    if (!img) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setImageSrc(src);
          observer.disconnect();
        }
      },
      { threshold: 0.1 }
    );

    observer.observe(img);
    return () => observer.disconnect();
  }, [src]);

  const handleLoad = useCallback(() => {
    setLoading(false);
    setError(false);
  }, []);

  const handleError = useCallback(() => {
    setLoading(false);
    setError(true);
  }, []);

  return {
    imageSrc,
    loading,
    error,
    imgRef,
    handleLoad,
    handleError
  };
}

/**
 * Hook pour la gestion de la mémoire
 */
export function useMemoryManagement() {
  const [memoryUsage, setMemoryUsage] = useState<number>(0);
  const [isLowMemory, setIsLowMemory] = useState(false);

  useEffect(() => {
    const checkMemory = () => {
      if ('memory' in performance) {
        const memory = (performance as any).memory;
        const used = memory.usedJSHeapSize;
        const total = memory.totalJSHeapSize;
        const percentage = (used / total) * 100;
        
        setMemoryUsage(percentage);
        setIsLowMemory(percentage > 80);
      }
    };

    const interval = setInterval(checkMemory, 5000);
    checkMemory();

    return () => clearInterval(interval);
  }, []);

  const clearMemory = useCallback(() => {
    if ('gc' in window) {
      (window as any).gc();
    }
  }, []);

  return {
    memoryUsage,
    isLowMemory,
    clearMemory
  };
}
