/**
 * Hook Universel des Produits - 224SOLUTIONS
 * Système unifié pour charger et gérer les produits dans toute l'application
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface UniversalProduct {
  id: string;
  name: string;
  price: number;
  originalPrice?: number;
  description?: string;
  images: string[];
  vendor_id: string;
  vendor_name: string;
  vendor_user_id: string;
  vendor_rating: number;
  vendor_rating_count: number;
  category_id?: string;
  category_name?: string;
  stock_quantity: number;
  rating: number;
  reviews_count: number;
  is_hot?: boolean;
  is_new?: boolean;
  free_shipping?: boolean;
  created_at: string;
}

interface UseUniversalProductsOptions {
  limit?: number;
  category?: string;
  searchQuery?: string;
  minPrice?: number;
  maxPrice?: number;
  minRating?: number;
  vendorId?: string;
  country?: string;
  city?: string;
  /**
   * Quand true, inclut aussi les produits des vendeurs "physical".
   * Par défaut (false), ils sont exclus.
   */
  includePhysicalVendors?: boolean;
  sortBy?: 'popular' | 'price_asc' | 'price_desc' | 'rating' | 'newest';
  autoLoad?: boolean;
}

export const useUniversalProducts = (options: UseUniversalProductsOptions = {}) => {
  const {
    limit,
    category,
    searchQuery,
    minPrice,
    maxPrice,
    minRating,
    vendorId,
    country,
    city,
    includePhysicalVendors = false,
    sortBy = 'newest',
    autoLoad = true
  } = options;

  const [products, setProducts] = useState<UniversalProduct[]>([]);
  const [loading, setLoading] = useState(false);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);

  // Permet d'ignorer les réponses "anciennes" quand l'utilisateur change rapidement les filtres/tri
  const requestIdRef = useRef(0);

  const normalizeLocation = (value: string) => value.trim().replace(/\s+/g, ' ');

  const loadProducts = useCallback(async (reset = false) => {
    const requestId = ++requestIdRef.current;

    const filters = {
      category,
      searchQuery,
      minPrice,
      maxPrice,
      minRating,
      vendorId,
      country,
      city,
      includePhysicalVendors,
      sortBy,
    };

    try {
      setLoading(true);
      const currentPage = reset ? 1 : page;
      const pageLimit = limit || 12;
      const from = (currentPage - 1) * pageLimit;
      const to = from + pageLimit - 1;

      // Requête optimisée - une seule requête
      // Par défaut, exclure les produits des vendeurs "physical" (boutique physique uniquement)
      let query = supabase
        .from('products')
        .select(`
          id,
          name,
          price,
          description,
          images,
          vendor_id,
          category_id,
          stock_quantity,
          rating,
          reviews_count,
          is_hot,
          free_shipping,
          created_at,
          is_active,
          vendors!inner(
            business_name,
            user_id,
            country,
            city,
            business_type
          ),
          categories(
            name
          )
        `, { count: 'exact' })
        .eq('is_active', true);

      if (!filters.includePhysicalVendors) {
        query = query.neq('vendors.business_type', 'physical');
      }

      // Filtres - utiliser les valeurs du filters object
      if (filters.vendorId) {
        query = query.eq('vendor_id', filters.vendorId);
      }

      if (filters.category && filters.category !== 'all') {
        // Vérifier si c'est un UUID valide ou un nom de catégorie
        const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(filters.category);
        if (isUUID) {
          query = query.eq('category_id', filters.category);
        } else {
          // Filtrer par nom de catégorie (ilike pour être insensible à la casse)
          query = query.ilike('categories.name', `%${filters.category}%`);
        }
      }

      if (filters.searchQuery && filters.searchQuery.trim()) {
        const q = filters.searchQuery.trim();
        query = query.ilike('name', `%${q}%`);
      }

      if (filters.minPrice && filters.minPrice > 0) {
        query = query.gte('price', filters.minPrice);
      }

      if (filters.maxPrice && filters.maxPrice > 0) {
        query = query.lte('price', filters.maxPrice);
      }

      if (filters.minRating && filters.minRating > 0) {
        query = query.gte('rating', filters.minRating);
      }

      // Filtre par pays (tolérant aux espaces / casse)
      if (filters.country && filters.country !== 'all') {
        const c = normalizeLocation(filters.country);
        query = query.ilike('vendors.country', `%${c}%`);
      }

      // Filtre par ville (tolérant aux espaces / casse)
      if (filters.city && filters.city !== 'all') {
        const c = normalizeLocation(filters.city);
        query = query.ilike('vendors.city', `%${c}%`);
      }

      // Tri - utiliser filters.sortBy
      switch (filters.sortBy) {
        case 'price_asc':
          query = query.order('price', { ascending: true });
          break;
        case 'price_desc':
          query = query.order('price', { ascending: false });
          break;
        case 'rating':
          query = query.order('rating', { ascending: false });
          break;
        case 'popular':
          query = query.order('reviews_count', { ascending: false });
          break;
        case 'newest':
        default:
          query = query.order('created_at', { ascending: false });
          break;
      }

      // Pagination
      query = query.range(from, to);

      const { data, error, count } = await query;

      if (error) throw error;

      // Transformation directe sans requête supplémentaire
      const formattedProducts: UniversalProduct[] = (data || []).map(product => {
        const vendor = product.vendors as any;
        const category = product.categories as any;
        const isNew = new Date(product.created_at) > new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

        return {
          id: product.id,
          name: product.name,
          price: product.price,
          description: product.description || '',
          images: Array.isArray(product.images) ? product.images : [],
          vendor_id: product.vendor_id,
          vendor_name: vendor?.business_name || 'Vendeur',
          vendor_user_id: vendor?.user_id || '',
          vendor_rating: product.rating || 0,
          vendor_rating_count: product.reviews_count || 0,
          category_id: product.category_id || '',
          category_name: category?.name || 'Général',
          stock_quantity: product.stock_quantity || 0,
          rating: product.rating || 0,
          reviews_count: product.reviews_count || 0,
          is_hot: product.is_hot || false,
          is_new: isNew,
          free_shipping: product.free_shipping || false,
          created_at: product.created_at
        };
      });

      if (reset) {
        setProducts(formattedProducts);
        setPage(1);
      } else {
        setProducts(prev => [...prev, ...formattedProducts]);
      }

      setTotal(count || 0);
      setHasMore(formattedProducts.length === pageLimit);

    } catch (error) {
      // Ne pas afficher d'erreur si cette requête n'est plus la dernière
      if (requestId === requestIdRef.current) {
        console.error('Erreur chargement produits:', error);
        toast.error('Erreur lors du chargement des produits');
      }
    } finally {
      // Éviter qu'une ancienne requête "éteigne" le loading d'une nouvelle
      if (requestId === requestIdRef.current) {
        setLoading(false);
      }
    }
  }, [
    page,
    limit,
    category,
    searchQuery,
    minPrice,
    maxPrice,
    minRating,
    vendorId,
    country,
    city,
    includePhysicalVendors,
    sortBy,
  ]);

  const loadMore = useCallback(() => {
    if (!loading && hasMore) {
      setPage(prev => prev + 1);
    }
  }, [loading, hasMore]);

  const refresh = useCallback(() => {
    loadProducts(true);
  }, [loadProducts]);

  // Charger automatiquement au montage et quand les options changent
  useEffect(() => {
    if (!autoLoad) return;

    setPage(1);
    loadProducts(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    category,
    searchQuery,
    minPrice,
    maxPrice,
    minRating,
    vendorId,
    country,
    city,
    includePhysicalVendors,
    sortBy,
    autoLoad,
  ]);

  // Charger plus quand la page change (pagination)
  useEffect(() => {
    if (page > 1 && autoLoad) {
      loadProducts(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page]);

  return {
    products,
    loading,
    total,
    hasMore,
    loadMore,
    refresh,
    page
  };
};
