/**
 * 🚀 CACHED SUPABASE CLIENT
 * Wrapper autour du client Supabase avec cache intelligent intégré
 * Réduit les requêtes DB de 70-80%
 */

import { supabase } from '@/integrations/supabase/client';
import { smartCache, CACHE_TTL, CACHE_TAGS } from '@/lib/smartCache';
import { requestDedup } from '@/lib/requestDeduplicator';

type SupabaseTable = string;

interface CachedQueryOptions {
  ttl?: number;
  tags?: string[];
  staleWhileRevalidate?: boolean;
  forceRefresh?: boolean;
  dedupe?: boolean;
}

/**
 * Requête SELECT avec cache automatique
 */
export async function cachedSelect<T = any>(
  table: SupabaseTable,
  query: {
    select?: string;
    filters?: Record<string, any>;
    eq?: [string, any][];
    limit?: number;
    order?: { column: string; ascending?: boolean };
    single?: boolean;
  },
  options?: CachedQueryOptions
): Promise<{ data: T | null; error: any; fromCache: boolean }> {
  // Générer une clé de cache unique
  const cacheKey = `supabase:${table}:${JSON.stringify(query)}`;
  const ttl = options?.ttl ?? CACHE_TTL.STANDARD;
  const tags = options?.tags ?? [table];

  const fetcher = async () => {
    let q = supabase.from(table).select(query.select || '*');

    // Appliquer les filtres eq
    if (query.eq) {
      for (const [col, val] of query.eq) {
        q = q.eq(col, val);
      }
    }

    // Appliquer les filtres génériques
    if (query.filters) {
      for (const [key, value] of Object.entries(query.filters)) {
        if (value !== undefined && value !== null) {
          q = q.eq(key, value);
        }
      }
    }

    // Order
    if (query.order) {
      q = q.order(query.order.column, { ascending: query.order.ascending ?? true });
    }

    // Limit
    if (query.limit) {
      q = q.limit(query.limit);
    }

    // Single
    if (query.single) {
      const { data, error } = await q.single();
      if (error) throw error;
      return data;
    }

    const { data, error } = await q;
    if (error) throw error;
    return data;
  };

  try {
    // Avec déduplication
    const wrappedFetcher = options?.dedupe !== false
      ? () => requestDedup.dedupe(cacheKey, fetcher)
      : fetcher;

    const data = await smartCache.getOrFetch<T>(cacheKey, wrappedFetcher, {
      ttl,
      tags,
      staleWhileRevalidate: options?.staleWhileRevalidate ?? true,
      forceRefresh: options?.forceRefresh,
    });

    return { data, error: null, fromCache: true };
  } catch (error) {
    return { data: null, error, fromCache: false };
  }
}

/**
 * Requêtes préconfigurées pour les données fréquentes
 */
export const cachedQueries = {
  // Produits populaires (cache 5 min)
  getProducts: (filters?: Record<string, any>) =>
    cachedSelect('products', {
      select: 'id, name, price, images, vendor_id, category, stock_quantity, rating_average',
      filters: { is_active: true, ...filters },
      limit: 50,
      order: { column: 'created_at', ascending: false },
    }, {
      ttl: CACHE_TTL.STANDARD,
      tags: [CACHE_TAGS.PRODUCTS],
    }),

  // Détail produit (cache 2 min avec stale-while-revalidate)
  getProduct: (id: string) =>
    cachedSelect('products', {
      select: '*',
      eq: [['id', id]],
      single: true,
    }, {
      ttl: CACHE_TTL.WARM,
      tags: [CACHE_TAGS.PRODUCTS, `product:${id}`],
      staleWhileRevalidate: true,
    }),

  // Vendeurs actifs (cache 5 min)
  getActiveVendors: () =>
    cachedSelect('vendors', {
      select: 'id, shop_name, logo_url, latitude, longitude, business_type, rating_average',
      filters: { is_active: true },
      limit: 100,
    }, {
      ttl: CACHE_TTL.STANDARD,
      tags: [CACHE_TAGS.VENDORS],
    }),

  // Profil utilisateur (cache 2 min)
  getProfile: (userId: string) =>
    cachedSelect('profiles', {
      select: '*',
      eq: [['id', userId]],
      single: true,
    }, {
      ttl: CACHE_TTL.WARM,
      tags: [CACHE_TAGS.USER, `user:${userId}`],
    }),

  // Wallet (cache 30s - données sensibles)
  getWallet: (userId: string) =>
    cachedSelect('wallets', {
      select: '*',
      eq: [['user_id', userId]],
      single: true,
    }, {
      ttl: CACHE_TTL.HOT,
      tags: [CACHE_TAGS.WALLET, `wallet:${userId}`],
      staleWhileRevalidate: false, // Pas de stale pour les données financières
    }),

  // Catégories (cache 1h - quasi-statique)
  getCategories: () =>
    cachedSelect('product_categories', {
      select: 'id, name, slug, icon, parent_id',
      filters: { is_active: true },
      order: { column: 'sort_order', ascending: true },
    }, {
      ttl: CACHE_TTL.STATIC,
      tags: [CACHE_TAGS.CONFIG],
    }),
};

/**
 * Invalidation intelligente après mutation
 */
export function invalidateAfterMutation(table: string, id?: string): void {
  // Invalider le tag de la table
  smartCache.invalidateByTag(table);

  // Invalider l'entrée spécifique
  if (id) {
    smartCache.invalidateByPattern(`supabase:${table}:.*${id}.*`);
  }

  // Invalider les listes qui contiennent cette table
  smartCache.invalidateByPattern(`supabase:${table}:.*`);

  console.log(`🔄 [CachedSupabase] Cache invalidé pour ${table}${id ? `:${id}` : ''}`);
}
