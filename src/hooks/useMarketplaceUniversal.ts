/**
 * Hook Universel Marketplace - 224SOLUTIONS
 * Charge les produits E-commerce, les produits numériques et les services professionnels
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

// Mapping des catégories techniques vers des noms lisibles
const CATEGORY_DISPLAY_NAMES: Record<string, string> = {
  'dropshipping': 'Dropshipping',
  'voyage': 'Voyage & Billetterie',
  'logiciel': 'Logiciel & SaaS',
  'formation': 'Formation & Coaching',
  'livre': 'Livre & eBook',
  'custom': 'Produit Numérique',
  'ai': 'Intelligence Artificielle',
  'physique_affilie': 'Produit Physique',
};

export interface MarketplaceItem {
  id: string;
  name: string;
  price: number;
  originalPrice?: number;
  currency?: string; // Devise du produit (USD, EUR, GNF, etc.)
  description?: string;
  images: string[];
  promotional_videos?: string[];
  vendor_id: string;
  vendor_name: string;
  vendor_user_id?: string;
  category_name?: string;
  service_type?: string;
  rating: number;
  reviews_count: number;
  item_type: 'product' | 'digital_product' | 'professional_service';
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
  country?: string;
  city?: string;
  itemType?: 'all' | 'product' | 'digital_product' | 'professional_service';
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
    country,
    city,
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
    if (itemType === 'professional_service' || itemType === 'digital_product') return [];

    try {
      let query = supabase
        .from('products')
        .select(`
          id,
          name,
          price,
          description,
          images,
          promotional_videos,
          vendor_id,
          category_id,
          rating,
          reviews_count,
          free_shipping,
          created_at,
          vendors(business_name, user_id, business_type, country, city),
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
      // + Filtrage par pays et ville
      const filtered = (data || []).filter(product => {
        const vendor = (product.vendors as any);
        if (!vendor) return true;
        
        // Exclure les vendeurs physical
        if (vendor.business_type === 'physical') return false;
        
        // Filtrage par pays
        if (country && country !== 'all') {
          const vendorCountry = (vendor.country || '').trim().toLowerCase();
          if (vendorCountry !== country.trim().toLowerCase()) return false;
        }
        
        // Filtrage par ville
        if (city && city !== 'all') {
          const vendorCity = (vendor.city || '').trim().toLowerCase();
          if (vendorCity !== city.trim().toLowerCase()) return false;
        }
        
        return true;
      });

      return filtered.map(product => ({
        id: product.id,
        name: product.name,
        price: product.price,
        description: product.description || '',
        images: Array.isArray(product.images) ? (product.images as string[]) : [],
        promotional_videos: Array.isArray(product.promotional_videos) ? (product.promotional_videos as string[]) : [],
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
   * Charge les services professionnels (restaurants, salons, etc.)
   */
  const loadProfessionalServices = async (): Promise<MarketplaceItem[]> => {
    if (itemType !== 'all' && itemType !== 'professional_service') return [];

    try {
      let query = supabase
        .from('professional_services')
        .select(`
          id,
          business_name,
          description,
          address,
          city,
          phone,
          logo_url,
          cover_image_url,
          rating,
          total_reviews,
          opening_hours,
          user_id,
          created_at,
          status,
          verification_status,
          service_types(name, code)
        `)
        .eq('status', 'active');

      // Filtres
      if (searchQuery?.trim()) {
        query = query.or(`business_name.ilike.%${searchQuery.trim()}%,description.ilike.%${searchQuery.trim()}%`);
      }
      if (minRating && minRating > 0) query = query.gte('rating', minRating);

      const { data, error } = await query;
      if (error) throw error;

      return (data || []).map(service => {
        // Construire le tableau d'images à partir de logo_url et cover_image_url
        const images: string[] = [];
        if (service.cover_image_url) images.push(service.cover_image_url);
        if (service.logo_url) images.push(service.logo_url);
        
        return {
          id: service.id,
          name: service.business_name,
          price: 0, // Les services pro n'ont pas de prix direct
          description: service.description || '',
          images,
          vendor_id: service.id,
          vendor_name: service.business_name,
          vendor_user_id: service.user_id,
          category_name: (service.service_types as any)?.name || 'Service',
          service_type: (service.service_types as any)?.code,
          rating: Number(service.rating) || 0,
          reviews_count: service.total_reviews || 0,
          item_type: 'professional_service' as const,
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
   * Charge les produits numériques depuis la table digital_products
   */
  const loadDigitalProducts = async (): Promise<MarketplaceItem[]> => {
    if (itemType === "professional_service" || itemType === "product") return [];

    const DIGITAL_CATEGORIES = new Set([
      "dropshipping",
      "voyage",
      "logiciel",
      "formation",
      "livre",
      "custom",
    ]);

    try {
      let query = supabase
        .from("digital_products")
        .select(
          `
          id,
          merchant_id,
          vendor_id,
          title,
          description,
          short_description,
          images,
          category,
          product_mode,
          price,
          currency,
          original_price,
          rating,
          reviews_count,
          created_at,
          affiliate_url,
          file_type,
          vendors:vendors!digital_products_vendor_id_fkey (business_name, user_id, shop_slug)
        `
        )
        .eq("status", "published");

      // Filtre vendeur (⚠️ vendorId = vendors.id dans l'UI marketplace)
      if (vendorId) {
        query = query.eq("vendor_id", vendorId);
      }

      // Filtre recherche
      if (searchQuery?.trim()) {
        query = query.or(
          `title.ilike.%${searchQuery.trim()}%,description.ilike.%${searchQuery.trim()}%`
        );
      }

      // Filtre prix
      if (minPrice && minPrice > 0) query = query.gte("price", minPrice);
      if (maxPrice && maxPrice > 0) query = query.lte("price", maxPrice);

      // Filtre catégorie: uniquement si la catégorie sélectionnée correspond à l'enum digital_products.category
      if (category && category !== "all" && DIGITAL_CATEGORIES.has(category)) {
        query = query.eq("category", category);
      }

      const { data, error } = await query;
      if (error) throw error;

      return (data || []).map((product: any) => {
        const images = Array.isArray(product.images) ? (product.images as string[]) : [];
        const v = product.vendors as any;

        return {
          id: product.id,
          name: product.title,
          price: product.price || 0,
          originalPrice: product.original_price || undefined,
          currency: product.currency || 'GNF', // Devise du produit
          description: product.short_description || product.description || "",
          images,
          promotional_videos: [],
          vendor_id: product.vendor_id || product.merchant_id,
          vendor_name: v?.business_name || "Vendeur",
          vendor_user_id: product.merchant_id,
          category_name: CATEGORY_DISPLAY_NAMES[product.category] || product.category || "Numérique",
          service_type: product.product_mode,
          rating: product.rating || 0,
          reviews_count: product.reviews_count || 0,
          item_type: "digital_product" as const,
          download_url: product.affiliate_url || undefined,
          file_size: product.file_type || undefined,
          license_type: product.product_mode === "affiliate" ? "Affiliation" : "Vente directe",
          created_at: product.created_at,
        };
      });
    } catch (error) {
      console.error("Erreur chargement produits numériques:", error);
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
   * Charge tous les items (produits e-commerce + produits numériques + services professionnels)
   */
  const loadAllItems = useCallback(async (reset = false) => {
    const requestId = ++requestIdRef.current;

    try {
      setLoading(true);

      // Récupérer le nom de la catégorie si c'est un UUID
      const categoryName = category && category !== 'all' ? await getCategoryName(category) : null;
      
      // Si une catégorie e-commerce est sélectionnée (UUID), ne charger que les produits
      const isEcommerceCategorySelected = category && category !== 'all' && 
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(category);

      // Charger selon le type sélectionné
      let allItems: MarketplaceItem[] = [];
      if (itemType === 'product') {
        allItems = await loadProducts();
      } else if (itemType === 'digital_product') {
        // Si une catégorie e-commerce est sélectionnée, ne pas charger les produits numériques
        allItems = isEcommerceCategorySelected ? [] : await loadDigitalProducts();
      } else if (itemType === 'professional_service') {
        // Si une catégorie e-commerce est sélectionnée, ne pas charger les services pro
        allItems = isEcommerceCategorySelected ? [] : await loadProfessionalServices();
      } else {
        // 'all' = produits + numériques + services professionnels
        // Si une catégorie e-commerce est sélectionnée, ne charger que les produits
        if (isEcommerceCategorySelected) {
          allItems = await loadProducts();
        } else {
          const [products, digitalProducts, professionalServices] = await Promise.all([
            loadProducts(),
            loadDigitalProducts(),
            loadProfessionalServices()
          ]);
          allItems = [...products, ...digitalProducts, ...professionalServices];
        }
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
    country,
    city,
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
    country,
    city,
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
