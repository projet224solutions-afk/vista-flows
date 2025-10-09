/**
 * SYSTÈME DE CACHE GLOBAL POUR OPTIMISATION DES PERFORMANCES
 * Cache intelligent avec TTL et invalidation automatique
 * 224Solutions - Performance Cache System
 */

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number;
  hits: number;
  lastAccessed: number;
}

interface CacheConfig {
  maxSize: number;
  defaultTTL: number;
  cleanupInterval: number;
  enableMetrics: boolean;
}

interface CacheMetrics {
  hits: number;
  misses: number;
  evictions: number;
  size: number;
  hitRate: number;
}

export class PerformanceCache<T = any> {
  private cache = new Map<string, CacheEntry<T>>();
  private config: CacheConfig;
  private metrics: CacheMetrics;
  private cleanupTimer: NodeJS.Timeout | null = null;

  constructor(config: Partial<CacheConfig> = {}) {
    this.config = {
      maxSize: 1000,
      defaultTTL: 5 * 60 * 1000, // 5 minutes
      cleanupInterval: 60 * 1000, // 1 minute
      enableMetrics: true,
      ...config
    };

    this.metrics = {
      hits: 0,
      misses: 0,
      evictions: 0,
      size: 0,
      hitRate: 0
    };

    this.startCleanup();
  }

  /**
   * Récupère une valeur du cache
   */
  get(key: string): T | null {
    const entry = this.cache.get(key);
    
    if (!entry) {
      this.metrics.misses++;
      this.updateHitRate();
      return null;
    }

    const now = Date.now();
    
    // Vérifier si l'entrée a expiré
    if (now - entry.timestamp > entry.ttl) {
      this.cache.delete(key);
      this.metrics.misses++;
      this.updateHitRate();
      return null;
    }

    // Mettre à jour les métriques
    entry.hits++;
    entry.lastAccessed = now;
    this.metrics.hits++;
    this.updateHitRate();

    return entry.data;
  }

  /**
   * Stocke une valeur dans le cache
   */
  set(key: string, data: T, ttl?: number): void {
    const now = Date.now();
    const entryTTL = ttl || this.config.defaultTTL;

    // Si le cache est plein, évincer l'entrée la moins récemment utilisée
    if (this.cache.size >= this.config.maxSize) {
      this.evictLRU();
    }

    this.cache.set(key, {
      data,
      timestamp: now,
      ttl: entryTTL,
      hits: 0,
      lastAccessed: now
    });

    this.updateMetrics();
  }

  /**
   * Supprime une entrée du cache
   */
  delete(key: string): boolean {
    const deleted = this.cache.delete(key);
    this.updateMetrics();
    return deleted;
  }

  /**
   * Vide le cache
   */
  clear(): void {
    this.cache.clear();
    this.updateMetrics();
  }

  /**
   * Vérifie si une clé existe dans le cache
   */
  has(key: string): boolean {
    const entry = this.cache.get(key);
    if (!entry) return false;

    const now = Date.now();
    if (now - entry.timestamp > entry.ttl) {
      this.cache.delete(key);
      return false;
    }

    return true;
  }

  /**
   * Invalide le cache par pattern
   */
  invalidatePattern(pattern: string | RegExp): number {
    let count = 0;
    const regex = typeof pattern === 'string' ? new RegExp(pattern) : pattern;

    for (const key of this.cache.keys()) {
      if (regex.test(key)) {
        this.cache.delete(key);
        count++;
      }
    }

    this.updateMetrics();
    return count;
  }

  /**
   * Éviction LRU (Least Recently Used)
   */
  private evictLRU(): void {
    let oldestKey = '';
    let oldestTime = Date.now();

    for (const [key, entry] of this.cache.entries()) {
      if (entry.lastAccessed < oldestTime) {
        oldestTime = entry.lastAccessed;
        oldestKey = key;
      }
    }

    if (oldestKey) {
      this.cache.delete(oldestKey);
      this.metrics.evictions++;
    }
  }

  /**
   * Nettoyage automatique des entrées expirées
   */
  private startCleanup(): void {
    this.cleanupTimer = setInterval(() => {
      this.cleanup();
    }, this.config.cleanupInterval);
  }

  private cleanup(): void {
    const now = Date.now();
    let cleaned = 0;

    for (const [key, entry] of this.cache.entries()) {
      if (now - entry.timestamp > entry.ttl) {
        this.cache.delete(key);
        cleaned++;
      }
    }

    if (cleaned > 0) {
      this.updateMetrics();
    }
  }

  /**
   * Met à jour les métriques
   */
  private updateMetrics(): void {
    this.metrics.size = this.cache.size;
  }

  /**
   * Met à jour le taux de réussite
   */
  private updateHitRate(): void {
    const total = this.metrics.hits + this.metrics.misses;
    this.metrics.hitRate = total > 0 ? (this.metrics.hits / total) * 100 : 0;
  }

  /**
   * Récupère les métriques du cache
   */
  getMetrics(): CacheMetrics {
    return { ...this.metrics };
  }

  /**
   * Récupère les statistiques détaillées
   */
  getStats(): {
    metrics: CacheMetrics;
    entries: Array<{
      key: string;
      age: number;
      hits: number;
      ttl: number;
    }>;
  } {
    const now = Date.now();
    const entries = Array.from(this.cache.entries()).map(([key, entry]) => ({
      key,
      age: now - entry.timestamp,
      hits: entry.hits,
      ttl: entry.ttl
    }));

    return {
      metrics: this.getMetrics(),
      entries
    };
  }

  /**
   * Détruit le cache et nettoie les ressources
   */
  destroy(): void {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
      this.cleanupTimer = null;
    }
    this.clear();
  }
}

// Instance globale du cache
export const globalCache = new PerformanceCache({
  maxSize: 500,
  defaultTTL: 10 * 60 * 1000, // 10 minutes
  cleanupInterval: 2 * 60 * 1000, // 2 minutes
  enableMetrics: true
});

// Cache spécialisé pour les requêtes API
export const apiCache = new PerformanceCache({
  maxSize: 200,
  defaultTTL: 5 * 60 * 1000, // 5 minutes
  cleanupInterval: 60 * 1000, // 1 minute
  enableMetrics: true
});

// Cache spécialisé pour les composants
export const componentCache = new PerformanceCache({
  maxSize: 100,
  defaultTTL: 15 * 60 * 1000, // 15 minutes
  cleanupInterval: 5 * 60 * 1000, // 5 minutes
  enableMetrics: true
});

// Utilitaires de cache
export const cacheUtils = {
  /**
   * Génère une clé de cache à partir d'un objet
   */
  generateKey(prefix: string, params: Record<string, any>): string {
    const sortedParams = Object.keys(params)
      .sort()
      .map(key => `${key}:${params[key]}`)
      .join('|');
    return `${prefix}:${sortedParams}`;
  },

  /**
   * Invalide tous les caches
   */
  invalidateAll(): void {
    globalCache.clear();
    apiCache.clear();
    componentCache.clear();
  },

  /**
   * Récupère les métriques de tous les caches
   */
  getAllMetrics(): {
    global: CacheMetrics;
    api: CacheMetrics;
    component: CacheMetrics;
  } {
    return {
      global: globalCache.getMetrics(),
      api: apiCache.getMetrics(),
      component: componentCache.getMetrics()
    };
  }
};
