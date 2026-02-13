/**
 * Hook Universel Marketplace - 224SOLUTIONS
 * Charge les produits E-commerce, les produits numériques et les services professionnels
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { getCurrencyForCountry } from '@/data/countryMappings';

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
  vendor_public_id?: string; // public_id du vendeur (VND0001, etc.)
  category_name?: string;
  service_type?: string;
  rating: number;
  reviews_count: number;
  item_type: 'product' | 'digital_product' | 'professional_service';
  free_shipping?: boolean;
  created_at: string;
  marketplace_position?: number; // Position dans le marketplace (rotation automatique)
  is_sponsored?: boolean; // Produit sponsorisé (toujours en tête)
  // Champs spécifiques aux services professionnels
  business_name?: string;
  address?: string;
  phone?: string;
  opening_hours?: any;
  // Champs spécifiques aux produits numériques
  download_url?: string;
  file_size?: string;
  license_type?: string;
  // Champs pour affiliés
  product_mode?: 'direct' | 'affiliate';
  affiliate_url?: string;
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
  sortBy?: 'popular' | 'price_asc' | 'price_desc' | 'rating' | 'newest' | 'position';
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
          marketplace_position,
          is_sponsored,
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
        
        // Filtrage par pays (normaliser les espaces comme dans loadLocations)
        if (country && country !== 'all') {
          const vendorCountry = (vendor.country || '').trim().replace(/\s+/g, ' ').toLowerCase();
          const normalizedCountry = country.trim().replace(/\s+/g, ' ').toLowerCase();
          if (vendorCountry !== normalizedCountry) return false;
        }

        // Filtrage par ville (bidirectionnel: Coyah inclut Coyah Centre, et Coyah Centre inclut Coyah)
        if (city && city !== 'all') {
          const vendorCity = (vendor.city || '').trim().replace(/\s+/g, ' ').toLowerCase();
          const normalizedCity = city.trim().replace(/\s+/g, ' ').toLowerCase();
          if (!vendorCity.startsWith(normalizedCity) && !normalizedCity.startsWith(vendorCity)) return false;
        }
        
        return true;
      });

      // Récupérer les public_id des vendeurs depuis profiles
      const vendorUserIds = filtered
        .map(p => (p.vendors as any)?.user_id)
        .filter(Boolean);
      
      let vendorPublicIds: Record<string, string> = {};
      if (vendorUserIds.length > 0) {
        const { data: profiles } = await supabase
          .from('profiles')
          .select('id, public_id')
          .in('id', vendorUserIds);
        
        if (profiles) {
          vendorPublicIds = Object.fromEntries(
            profiles.map(p => [p.id, p.public_id || ''])
          );
        }
      }

      return filtered.map(product => {
        const vendor = product.vendors as any;
        const vendorUserId = vendor?.user_id;
        const vendorCountry = vendor?.country || '';
        const derivedCurrency = vendorCountry ? getCurrencyForCountry(vendorCountry) : 'GNF';
        
        return {
          id: product.id,
          name: product.name,
          price: product.price,
          currency: derivedCurrency,
          description: product.description || '',
          images: Array.isArray(product.images) ? (product.images as string[]) : [],
          promotional_videos: Array.isArray(product.promotional_videos) ? (product.promotional_videos as string[]) : [],
          vendor_id: product.vendor_id,
          vendor_name: vendor?.business_name || 'Vendeur',
          vendor_user_id: vendorUserId,
          vendor_public_id: vendorUserId ? vendorPublicIds[vendorUserId] : undefined,
          category_name: (product.categories as any)?.name || 'Général',
          rating: product.rating || 0,
          reviews_count: product.reviews_count || 0,
          item_type: 'product' as const,
          free_shipping: product.free_shipping || false,
          created_at: product.created_at,
          marketplace_position: (product as any).marketplace_position || 0,
          is_sponsored: (product as any).is_sponsored || false,
        };
      });
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

      // Filtrage par ville (bidirectionnel pour services pro)
      if (city && city !== 'all') {
        query = query.or(`city.ilike.${city.trim()}%,city.ilike.${city.trim().split(' ')[0]}%`);
      }

      const { data, error } = await query;
      if (error) throw error;

      // Note: professional_services n'a pas de champ country,
      // donc le filtrage par pays n'est pas applicable pour ce type

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
          product_type,
          product_mode,
          price,
          currency,
          original_price,
          rating,
          reviews_count,
          created_at,
          affiliate_url,
          file_type,
          marketplace_position,
          is_sponsored,
          vendors:vendors!digital_products_vendor_id_fkey (business_name, user_id, shop_slug, country, city)
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

      // Filtrage par pays et ville (via le vendeur associé)
      const filtered = (data || []).filter((product: any) => {
        const vendor = product.vendors as any;
        if (!vendor) return true;

        // Filtrage par pays (normaliser les espaces comme dans loadLocations)
        if (country && country !== 'all') {
          const vendorCountry = (vendor.country || '').trim().replace(/\s+/g, ' ').toLowerCase();
          const normalizedCountry = country.trim().replace(/\s+/g, ' ').toLowerCase();
          if (vendorCountry !== normalizedCountry) return false;
        }

        // Filtrage par ville (bidirectionnel: Coyah inclut Coyah Centre, et vice versa)
        if (city && city !== 'all') {
          const vendorCity = (vendor.city || '').trim().replace(/\s+/g, ' ').toLowerCase();
          const normalizedCity = city.trim().replace(/\s+/g, ' ').toLowerCase();
          if (!vendorCity.startsWith(normalizedCity) && !normalizedCity.startsWith(vendorCity)) return false;
        }

        return true;
      });

      // Récupérer les public_id des vendeurs depuis profiles
      const vendorUserIds = filtered
        .map((p: any) => (p.vendors as any)?.user_id || p.merchant_id)
        .filter(Boolean);
      
      let vendorPublicIds: Record<string, string> = {};
      if (vendorUserIds.length > 0) {
        const { data: profiles } = await supabase
          .from('profiles')
          .select('id, public_id')
          .in('id', vendorUserIds);
        
        if (profiles) {
          vendorPublicIds = Object.fromEntries(
            profiles.map(p => [p.id, p.public_id || ''])
          );
        }
      }

      return filtered.map((product: any) => {
        const images = Array.isArray(product.images) ? (product.images as string[]) : [];
        const v = product.vendors as any;
        const vendorUserId = v?.user_id || product.merchant_id;

        // Devise: utiliser celle du produit si définie, sinon dériver du pays du vendeur
        const vendorCountry = v?.country || '';
        const derivedCurrency = product.currency || (vendorCountry ? getCurrencyForCountry(vendorCountry) : 'GNF');

        return {
          id: product.id,
          name: product.title,
          price: product.price || 0,
          originalPrice: product.original_price || undefined,
          currency: derivedCurrency, // Devise du produit ou dérivée du vendeur
          description: product.short_description || product.description || "",
          images,
          promotional_videos: [],
          vendor_id: product.vendor_id || product.merchant_id,
          vendor_name: v?.business_name || "Vendeur",
          vendor_user_id: vendorUserId,
          vendor_public_id: vendorUserId ? vendorPublicIds[vendorUserId] : undefined,
          // Afficher product_type (saisi par l'utilisateur) s'il existe, sinon fallback sur category
          category_name: product.product_type?.trim() || CATEGORY_DISPLAY_NAMES[product.category] || product.category || "Numérique",
          service_type: product.product_mode,
          rating: product.rating || 0,
          reviews_count: product.reviews_count || 0,
          item_type: "digital_product" as const,
          download_url: product.affiliate_url || undefined,
          file_size: product.file_type || undefined,
          license_type: product.product_mode === "affiliate" ? "Affiliation" : "Vente directe",
          created_at: product.created_at,
          marketplace_position: product.marketplace_position || 0,
          is_sponsored: product.is_sponsored || false,
          // Exposer product_mode et affiliate_url pour le panier
          product_mode: product.product_mode as 'direct' | 'affiliate' | undefined,
          affiliate_url: product.affiliate_url || undefined,
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
      // D'abord, séparer les produits sponsorisés (toujours en tête)
      const sponsored = allItems.filter(item => item.is_sponsored);
      const nonSponsored = allItems.filter(item => !item.is_sponsored);
      
      // Fonction de tri pour les non-sponsorisés
      const sortItems = (items: MarketplaceItem[]) => {
        switch (sortBy) {
          case 'position':
            // Tri par position de rotation (le plus petit = en tête)
            items.sort((a, b) => (a.marketplace_position || 0) - (b.marketplace_position || 0));
            break;
          case 'price_asc':
            items.sort((a, b) => a.price - b.price);
            break;
          case 'price_desc':
            items.sort((a, b) => b.price - a.price);
            break;
          case 'rating':
            items.sort((a, b) => b.rating - a.rating);
            break;
          case 'popular':
            items.sort((a, b) => b.reviews_count - a.reviews_count);
            break;
          case 'newest':
          default:
            // Par défaut, utiliser la position de rotation pour un ordre équitable
            items.sort((a, b) => (a.marketplace_position || 0) - (b.marketplace_position || 0));
            break;
        }
        return items;
      };
      
      // Trier les deux groupes séparément
      sortItems(sponsored);
      sortItems(nonSponsored);
      
      // Combiner: sponsorisés en tête, puis les autres
      allItems = [...sponsored, ...nonSponsored];

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
