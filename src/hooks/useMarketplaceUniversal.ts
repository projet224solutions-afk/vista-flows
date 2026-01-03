/**
 * Hook Universel Marketplace - 224SOLUTIONS
 * Charge TOUS les types de contenus: Produits E-commerce, Services Professionnels, Produits Numériques
 * Sans affecter l'affichage de la page Proximité (qui reste géolocalisée)
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface MarketplaceItem {
  id: string;
  name: string;
  price: number;
  originalPrice?: number;
  description?: string;
  images: string[];
  vendor_id: string;
  vendor_name: string;
  vendor_user_id?: string;
  category_name?: string;
  service_type?: string;
  rating: number;
  reviews_count: number;
  item_type: 'product' | 'professional_service' | 'digital_product'; // Type d'item
  free_shipping?: boolean;
  created_at: string;
  // Champs spécifiques aux services professionnels
  business_name?: string;
  address?: string;
  phone?: string;
  opening_hours?: any;
  // Champs spécifiques aux produits numériques
  download_url?: string;
  file_size?: string;
  license_type?: string;
}

interface UseMarketplaceUniversalOptions {
  limit?: number;
  category?: string;
  searchQuery?: string;
  minPrice?: number;
  maxPrice?: number;
  minRating?: number;
  vendorId?: string;
  itemType?: 'all' | 'product' | 'professional_service' | 'digital_product';
  sortBy?: 'popular' | 'price_asc' | 'price_desc' | 'rating' | 'newest';
  autoLoad?: boolean;
}

export const useMarketplaceUniversal = (options: UseMarketplaceUniversalOptions = {}) => {
  const {
    limit = 24,
    category,
    searchQuery,
    minPrice,
    maxPrice,
    minRating,
    vendorId,
    itemType = 'all',
    sortBy = 'newest',
    autoLoad = true
  } = options;

  const [items, setItems] = useState<MarketplaceItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);

  const requestIdRef = useRef(0);

  /**
   * Charge les produits e-commerce classiques
   */
  const loadProducts = async (): Promise<MarketplaceItem[]> => {
    if (itemType !== 'all' && itemType !== 'product') return [];

    try {
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
          rating,
          reviews_count,
          free_shipping,
          created_at,
          vendors(business_name, user_id),
          categories(name)
        `)
        .eq('is_active', true);

      // Filtres
      if (vendorId) query = query.eq('vendor_id', vendorId);
      if (category && category !== 'all') {
        const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(category);
        if (isUUID) {
          query = query.eq('category_id', category);
        }
      }
      if (searchQuery?.trim()) {
        query = query.ilike('name', `%${searchQuery.trim()}%`);
      }
      if (minPrice && minPrice > 0) query = query.gte('price', minPrice);
      if (maxPrice && maxPrice > 0) query = query.lte('price', maxPrice);
      if (minRating && minRating > 0) query = query.gte('rating', minRating);

      const { data, error } = await query;
      if (error) throw error;

      return (data || []).map(product => ({
        id: product.id,
        name: product.name,
        price: product.price,
        description: product.description || '',
        images: Array.isArray(product.images) ? product.images : [],
        vendor_id: product.vendor_id,
        vendor_name: (product.vendors as any)?.business_name || 'Vendeur',
        vendor_user_id: (product.vendors as any)?.user_id,
        category_name: (product.categories as any)?.name || 'Général',
        rating: product.rating || 0,
        reviews_count: product.reviews_count || 0,
        item_type: 'product',
        free_shipping: product.free_shipping || false,
        created_at: product.created_at
      }));
    } catch (error) {
      console.error('Erreur chargement produits:', error);
      return [];
    }
  };

  /**
   * Charge les services professionnels
   */
  const loadProfessionalServices = async (): Promise<MarketplaceItem[]> => {
    if (itemType !== 'all' && itemType !== 'professional_service') return [];

    try {
      let query = supabase
        .from('professional_services')
        .select(`
          id,
          user_id,
          service_type_id,
          business_name,
          description,
          logo_url,
          cover_image_url,
          address,
          phone,
          opening_hours,
          rating,
          total_reviews,
          created_at,
          service_types(code, name, category, commission_rate)
        `)
        .eq('status', 'active')
        .eq('verification_status', 'verified');

      // Filtres
      if (searchQuery?.trim()) {
        query = query.or(`business_name.ilike.%${searchQuery.trim()}%,description.ilike.%${searchQuery.trim()}%`);
      }
      if (minRating && minRating > 0) query = query.gte('rating', minRating);

      const { data, error } = await query;
      if (error) throw error;

      return (data || []).map(service => {
        const serviceType = service.service_types as any;
        // Prix estimé basé sur la commission (pour affichage)
        const estimatedPrice = 50; // Prix de base pour les services

        return {
          id: service.id,
          name: service.business_name,
          price: estimatedPrice,
          description: service.description || '',
          images: [service.cover_image_url, service.logo_url].filter(Boolean) as string[],
          vendor_id: service.user_id,
          vendor_name: service.business_name,
          vendor_user_id: service.user_id,
          category_name: serviceType?.name || 'Service',
          service_type: serviceType?.code,
          rating: service.rating || 0,
          reviews_count: service.total_reviews || 0,
          item_type: 'professional_service',
          business_name: service.business_name,
          address: service.address,
          phone: service.phone,
          opening_hours: service.opening_hours,
          created_at: service.created_at
        };
      });
    } catch (error) {
      console.error('Erreur chargement services professionnels:', error);
      return [];
    }
  };

  /**
   * Charge les produits numériques (service_products)
   */
  const loadDigitalProducts = async (): Promise<MarketplaceItem[]> => {
    if (itemType !== 'all' && itemType !== 'digital_product') return [];

    try {
      let query = supabase
        .from('service_products')
        .select(`
          id,
          professional_service_id,
          name,
          description,
          price,
          compare_at_price,
          images,
          category,
          metadata,
          created_at,
          professional_services(
            business_name,
            user_id,
            service_types(name, code)
          )
        `)
        .eq('is_available', true);

      // Filtres
      if (searchQuery?.trim()) {
        query = query.ilike('name', `%${searchQuery.trim()}%`);
      }
      if (minPrice && minPrice > 0) query = query.gte('price', minPrice);
      if (maxPrice && maxPrice > 0) query = query.lte('price', maxPrice);

      const { data, error } = await query;
      if (error) throw error;

      return (data || []).map(product => {
        const service = product.professional_services as any;
        const metadata = product.metadata as any || {};

        return {
          id: product.id,
          name: product.name,
          price: product.price,
          originalPrice: product.compare_at_price || undefined,
          description: product.description || '',
          images: Array.isArray(product.images) ? product.images : [],
          vendor_id: product.professional_service_id,
          vendor_name: service?.business_name || 'Vendeur',
          vendor_user_id: service?.user_id,
          category_name: product.category || service?.service_types?.name || 'Numérique',
          service_type: service?.service_types?.code,
          rating: 0, // Les service_products n'ont pas de rating pour l'instant
          reviews_count: 0,
          item_type: 'digital_product',
          download_url: metadata.download_url,
          file_size: metadata.file_size,
          license_type: metadata.license_type,
          created_at: product.created_at
        };
      });
    } catch (error) {
      console.error('Erreur chargement produits numériques:', error);
      return [];
    }
  };

  /**
   * Charge tous les items (produits + services + numériques)
   */
  const loadAllItems = useCallback(async (reset = false) => {
    const requestId = ++requestIdRef.current;

    try {
      setLoading(true);

      // Charger en parallèle tous les types d'items
      const [products, professionalServices, digitalProducts] = await Promise.all([
        loadProducts(),
        loadProfessionalServices(),
        loadDigitalProducts()
      ]);

      // Combiner tous les items
      let allItems = [
        ...products,
        ...professionalServices,
        ...digitalProducts
      ];

      // Filtrage global par prix
      if (minPrice && minPrice > 0) {
        allItems = allItems.filter(item => item.price >= minPrice);
      }
      if (maxPrice && maxPrice > 0) {
        allItems = allItems.filter(item => item.price <= maxPrice);
      }

      // Filtrage par rating
      if (minRating && minRating > 0) {
        allItems = allItems.filter(item => item.rating >= minRating);
      }

      // Tri
      switch (sortBy) {
        case 'price_asc':
          allItems.sort((a, b) => a.price - b.price);
          break;
        case 'price_desc':
          allItems.sort((a, b) => b.price - a.price);
          break;
        case 'rating':
          allItems.sort((a, b) => b.rating - a.rating);
          break;
        case 'popular':
          allItems.sort((a, b) => b.reviews_count - a.reviews_count);
          break;
        case 'newest':
        default:
          allItems.sort((a, b) => 
            new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
          );
          break;
      }

      // Pagination
      const currentPage = reset ? 1 : page;
      const startIndex = (currentPage - 1) * limit;
      const endIndex = startIndex + limit;
      const paginatedItems = allItems.slice(startIndex, endIndex);

      if (reset) {
        setItems(paginatedItems);
        setPage(1);
      } else {
        setItems(prev => [...prev, ...paginatedItems]);
      }

      setTotal(allItems.length);
      setHasMore(endIndex < allItems.length);

    } catch (error) {
      if (requestId === requestIdRef.current) {
        console.error('Erreur chargement marketplace:', error);
        toast.error('Erreur lors du chargement des items');
      }
    } finally {
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
    itemType,
    sortBy,
  ]);

  const loadMore = useCallback(() => {
    if (!loading && hasMore) {
      setPage(prev => prev + 1);
    }
  }, [loading, hasMore]);

  const refresh = useCallback(() => {
    loadAllItems(true);
  }, [loadAllItems]);

  // Charger automatiquement au montage et quand les options changent
  useEffect(() => {
    if (!autoLoad) return;

    setPage(1);
    loadAllItems(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    category,
    searchQuery,
    minPrice,
    maxPrice,
    minRating,
    vendorId,
    itemType,
    sortBy,
    autoLoad,
  ]);

  // Charger plus quand la page change
  useEffect(() => {
    if (page > 1 && autoLoad) {
      loadAllItems(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page]);

  return {
    items,
    loading,
    total,
    hasMore,
    loadMore,
    refresh,
    page
  };
};
