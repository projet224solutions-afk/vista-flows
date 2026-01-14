/**
 * Hook Universel Marketplace - 224SOLUTIONS
 * Charge les produits E-commerce et les produits numériques (articles des services pro)
 * 
 * IMPORTANT: Les services professionnels eux-mêmes sont EXCLUS du marketplace
 * Ils s'affichent uniquement sur la page Proximité (géolocalisée)
 * Seuls leurs PRODUITS/ARTICLES (service_products) apparaissent ici
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
  item_type: 'product' | 'digital_product'; // Services professionnels EXCLUS du marketplace
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
  itemType?: 'all' | 'product' | 'digital_product'; // 'professional_service' EXCLU - disponible uniquement sur Proximité
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
          vendors(business_name, user_id, business_type),
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

      // Règle marketplace: exclure les vendeurs "physical" (boutique physique uniquement)
      const filtered = (data || []).filter(product => {
        const vendor = (product.vendors as any);
        return !vendor || (vendor.business_type !== 'physical');
      });

      return filtered.map(product => ({
        id: product.id,
        name: product.name,
        price: product.price,
        description: product.description || '',
        images: Array.isArray(product.images) ? (product.images as string[]) : [],
        vendor_id: product.vendor_id,
        vendor_name: (product.vendors as any)?.business_name || 'Vendeur',
        vendor_user_id: (product.vendors as any)?.user_id,
        category_name: (product.categories as any)?.name || 'Général',
        rating: product.rating || 0,
        reviews_count: product.reviews_count || 0,
        item_type: 'product' as const,
        free_shipping: product.free_shipping || false,
        created_at: product.created_at
      }));
    } catch (error) {
      console.error('Erreur chargement produits:', error);
      return [];
    }
  };

  /**
   * NOTE: Les services professionnels ne sont PAS chargés sur le marketplace
   * Ils sont uniquement affichés sur la page Proximité (géolocalisée)
   * Cette fonction est conservée mais désactivée pour le marketplace
   */

  /**
   * Charge les produits numériques (service_products)
   */
  const loadDigitalProducts = async (categoryName?: string): Promise<MarketplaceItem[]> => {
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
      if (vendorId) {
        const { data: services } = await supabase
          .from('professional_services')
          .select('id')
          .eq('user_id', vendorId);
        const serviceIds = services?.map(s => s.id) || [];
        if (serviceIds.length > 0) {
          query = query.in('professional_service_id', serviceIds);
        } else {
          return [];
        }
      }
      if (searchQuery?.trim()) {
        query = query.ilike('name', `%${searchQuery.trim()}%`);
      }
      if (minPrice && minPrice > 0) query = query.gte('price', minPrice);
      if (maxPrice && maxPrice > 0) query = query.lte('price', maxPrice);
      
      // Filtre par catégorie (champ texte dans service_products)
      if (categoryName) {
        query = query.ilike('category', `%${categoryName}%`);
      }

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
          images: Array.isArray(product.images) ? (product.images as string[]) : [],
          vendor_id: product.professional_service_id,
          vendor_name: service?.business_name || 'Vendeur',
          vendor_user_id: service?.user_id,
          category_name: product.category || service?.service_types?.name || 'Numérique',
          service_type: service?.service_types?.code,
          rating: 0, // Les service_products n'ont pas de rating pour l'instant
          reviews_count: 0,
          item_type: 'digital_product' as const,
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
   * Récupère le nom de la catégorie à partir de son ID
   */
  const getCategoryName = async (categoryId: string): Promise<string | null> => {
    if (!categoryId || categoryId === 'all') return null;
    
    const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(categoryId);
    if (!isUUID) return categoryId; // C'est déjà un nom
    
    try {
      const { data } = await supabase
        .from('categories')
        .select('name')
        .eq('id', categoryId)
        .single();
      return data?.name || null;
    } catch {
      return null;
    }
  };

  /**
   * Charge tous les items (produits e-commerce + produits numériques)
   * NOTE: Les services professionnels sont EXCLUS - ils s'affichent sur Proximité uniquement
   */
  const loadAllItems = useCallback(async (reset = false) => {
    const requestId = ++requestIdRef.current;

    try {
      setLoading(true);

      // Récupérer le nom de la catégorie si c'est un UUID
      const categoryName = category && category !== 'all' ? await getCategoryName(category) : null;

      // Charger uniquement produits e-commerce et numériques (PAS les services pro)
      let allItems: MarketplaceItem[] = [];
      if (itemType === 'product') {
        allItems = await loadProducts();
      } else if (itemType === 'digital_product') {
        allItems = await loadDigitalProducts(categoryName || undefined);
      } else {
        // 'all' = produits + numériques (SANS services professionnels)
        const [products, digitalProducts] = await Promise.all([
          loadProducts(),
          loadDigitalProducts(categoryName || undefined)
        ]);
        allItems = [...products, ...digitalProducts];
      }

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
    setItems([]);
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
