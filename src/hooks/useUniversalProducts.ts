/**
 * Hook Universel des Produits - 224SOLUTIONS
 * Système unifié pour charger et gérer les produits dans toute l'application
 */

import { useState, useEffect, useCallback } from 'react';
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
    sortBy = 'newest',
    autoLoad = true
  } = options;

  const [products, setProducts] = useState<UniversalProduct[]>([]);
  const [loading, setLoading] = useState(false);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);

  const loadProducts = useCallback(async (reset = false) => {
    try {
      setLoading(true);
      const currentPage = reset ? 1 : page;
      const pageLimit = limit || 12;
      const from = (currentPage - 1) * pageLimit;
      const to = from + pageLimit - 1;

      // Construire la requête
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
            user_id
          ),
          categories(
            name
          )
        `, { count: 'exact' })
        .eq('is_active', true);

      // Filtres
      if (category && category !== 'all') {
        query = query.eq('category_id', category);
      }

      if (searchQuery && searchQuery.trim()) {
        query = query.ilike('name', `%${searchQuery}%`);
      }

      if (minPrice && minPrice > 0) {
        query = query.gte('price', minPrice);
      }

      if (maxPrice && maxPrice > 0) {
        query = query.lte('price', maxPrice);
      }

      if (minRating && minRating > 0) {
        query = query.gte('rating', minRating);
      }

      // Tri
      switch (sortBy) {
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
      console.error('Erreur chargement produits:', error);
      toast.error('Erreur lors du chargement des produits');
    } finally {
      setLoading(false);
    }
  }, [page, limit, category, searchQuery, minPrice, maxPrice, minRating, sortBy]);

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
    if (autoLoad) {
      loadProducts(true);
    }
  }, [category, searchQuery, minPrice, maxPrice, minRating, sortBy, autoLoad]);

  // Charger plus quand la page change
  useEffect(() => {
    if (page > 1) {
      loadProducts(false);
    }
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
