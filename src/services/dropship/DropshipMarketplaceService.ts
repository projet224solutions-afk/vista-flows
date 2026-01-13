/**
 * DROPSHIP MARKETPLACE INTEGRATION SERVICE
 * Service pour intégrer les produits dropshipping dans le marketplace
 * sans révéler leur nature aux clients
 * 
 * IMPORTANT: Le client ne voit JAMAIS que le produit est dropshipping
 * Flag interne isDropship = true réservé aux admins/vendeurs
 * 
 * @module DropshipMarketplaceService
 * @version 1.0.0
 * @author 224Solutions
 */

import { supabase } from '@/integrations/supabase/client';

// ==================== TYPES ====================

export interface MarketplaceProduct {
  id: string;
  title: string;
  description: string;
  price: number;
  originalPrice?: number;
  images: string[];
  category: string;
  subcategory?: string;
  vendor: {
    id: string;
    name: string;
    location?: string;
    rating: number;
    ratingCount: number;
    isCertified: boolean;
  };
  rating: number;
  reviewCount: number;
  stock: number;
  deliveryTime: string;
  isPremium: boolean;
  isNew: boolean;
  tags?: string[];
}

export interface DropshipProductInternal extends MarketplaceProduct {
  // Champs internes NON exposés au client
  _isDropship: boolean;
  _sourceConnector?: string;
  _sourceProductId?: string;
  _supplierCost?: number;
  _margin?: number;
  _autoSync?: boolean;
  _lastSyncAt?: string;
}

export interface ProductQueryOptions {
  category?: string;
  subcategory?: string;
  priceMin?: number;
  priceMax?: number;
  vendorId?: string;
  searchQuery?: string;
  sortBy?: 'price_asc' | 'price_desc' | 'rating' | 'newest' | 'popular';
  page?: number;
  limit?: number;
  includeDropship?: boolean; // true par défaut
}

export interface ProductQueryResult {
  products: MarketplaceProduct[];
  total: number;
  page: number;
  totalPages: number;
  hasMore: boolean;
}

// ==================== HELPER FUNCTIONS ====================

/**
 * Nettoie un produit dropship pour le client (supprime les champs internes)
 */
function sanitizeForClient(product: DropshipProductInternal): MarketplaceProduct {
  const {
    _isDropship,
    _sourceConnector,
    _sourceProductId,
    _supplierCost,
    _margin,
    _autoSync,
    _lastSyncAt,
    ...clientProduct
  } = product;
  
  return clientProduct;
}

/**
 * Calcule le délai de livraison estimé pour un produit dropship
 */
function calculateDropshipDeliveryTime(connector: string): string {
  // Délais estimés par plateforme (shipping Chine vers Guinée)
  const deliveryTimes: Record<string, string> = {
    'ALIEXPRESS': '15-30 jours',
    'ALIBABA': '20-40 jours',
    '1688': '25-45 jours',
    'PRIVATE': '7-21 jours', // Fournisseurs locaux/privés
  };
  
  return deliveryTimes[connector] || '15-30 jours';
}

/**
 * Convertit un produit dropship DB en format marketplace
 */
function mapDropshipToMarketplace(
  dropshipProduct: any,
  vendorInfo: any
): DropshipProductInternal {
  const connector = dropshipProduct.source_connector || 'ALIEXPRESS';
  
  return {
    id: dropshipProduct.id,
    title: dropshipProduct.title,
    description: dropshipProduct.description || '',
    price: dropshipProduct.selling_price,
    originalPrice: dropshipProduct.compare_at_price || undefined,
    images: dropshipProduct.images || [],
    category: dropshipProduct.category || 'Divers',
    subcategory: dropshipProduct.subcategory,
    vendor: {
      id: vendorInfo?.id || dropshipProduct.vendor_id,
      name: vendorInfo?.store_name || 'Boutique',
      location: vendorInfo?.location || 'Guinée',
      rating: vendorInfo?.rating || 4.5,
      ratingCount: vendorInfo?.rating_count || 0,
      isCertified: vendorInfo?.is_certified || false,
    },
    rating: dropshipProduct.rating || 4.5,
    reviewCount: dropshipProduct.review_count || 0,
    stock: dropshipProduct.stock_quantity ?? 100, // Stock virtuel pour dropship
    deliveryTime: calculateDropshipDeliveryTime(connector),
    isPremium: dropshipProduct.is_premium || false,
    isNew: isProductNew(dropshipProduct.created_at),
    tags: dropshipProduct.tags || [],
    
    // Champs internes
    _isDropship: true,
    _sourceConnector: connector,
    _sourceProductId: dropshipProduct.source_product_id,
    _supplierCost: dropshipProduct.cost_price,
    _margin: dropshipProduct.margin_percent,
    _autoSync: dropshipProduct.auto_sync,
    _lastSyncAt: dropshipProduct.last_sync_at,
  };
}

/**
 * Vérifie si un produit est "nouveau" (créé il y a moins de 7 jours)
 */
function isProductNew(createdAt: string): boolean {
  const created = new Date(createdAt);
  const now = new Date();
  const diffDays = Math.floor((now.getTime() - created.getTime()) / (1000 * 60 * 60 * 24));
  return diffDays <= 7;
}

// ==================== MAIN SERVICE CLASS ====================

export class DropshipMarketplaceService {
  private static instance: DropshipMarketplaceService;
  
  private constructor() {}
  
  static getInstance(): DropshipMarketplaceService {
    if (!DropshipMarketplaceService.instance) {
      DropshipMarketplaceService.instance = new DropshipMarketplaceService();
    }
    return DropshipMarketplaceService.instance;
  }
  
  /**
   * Récupère les produits marketplace (inclut dropship par défaut)
   * Les produits dropship sont indistinguables des produits normaux côté client
   */
  async getProducts(options: ProductQueryOptions = {}): Promise<ProductQueryResult> {
    const {
      category,
      subcategory,
      priceMin,
      priceMax,
      vendorId,
      searchQuery,
      sortBy = 'newest',
      page = 1,
      limit = 20,
      includeDropship = true
    } = options;
    
    try {
      // 1. Récupérer les produits classiques
      let classicQuery = supabase
        .from('products')
        .select(`
          *,
          vendor:profiles!products_vendor_id_fkey(
            id,
            store_name,
            location,
            rating,
            rating_count,
            is_certified
          )
        `, { count: 'exact' })
        .eq('status', 'active');
      
      // Appliquer les filtres
      if (category) classicQuery = classicQuery.eq('category', category);
      if (subcategory) classicQuery = classicQuery.eq('subcategory', subcategory);
      if (vendorId) classicQuery = classicQuery.eq('vendor_id', vendorId);
      if (priceMin) classicQuery = classicQuery.gte('price', priceMin);
      if (priceMax) classicQuery = classicQuery.lte('price', priceMax);
      if (searchQuery) {
        classicQuery = classicQuery.or(`title.ilike.%${searchQuery}%,description.ilike.%${searchQuery}%`);
      }
      
      const { data: classicProducts, count: classicCount, error: classicError } = await classicQuery;
      
      if (classicError) {
        console.error('[DropshipMarketplace] Classic products error:', classicError);
        throw classicError;
      }
      
      // 2. Récupérer les produits dropship si activé
      let dropshipProducts: any[] = [];
      let dropshipCount = 0;
      
      if (includeDropship) {
        // Note: La FK est vers auth.users, pas profiles directement
        // On fait une jointure séparée pour récupérer les infos vendeur
        let dropshipQuery = supabase
          .from('dropship_products')
          .select('*', { count: 'exact' })
          .eq('is_published', true)
          .eq('is_available', true);
        
        // Appliquer les mêmes filtres
        if (category) dropshipQuery = dropshipQuery.eq('category', category);
        if (subcategory) dropshipQuery = dropshipQuery.eq('subcategory', subcategory);
        if (vendorId) dropshipQuery = dropshipQuery.eq('vendor_id', vendorId);
        if (priceMin) dropshipQuery = dropshipQuery.gte('selling_price', priceMin);
        if (priceMax) dropshipQuery = dropshipQuery.lte('selling_price', priceMax);
        if (searchQuery) {
          dropshipQuery = dropshipQuery.or(`title.ilike.%${searchQuery}%,description.ilike.%${searchQuery}%`);
        }
        
        const { data: dropship, count: dCount, error: dropshipError } = await dropshipQuery;
        
        if (dropshipError) {
          console.error('[DropshipMarketplace] Dropship products error:', dropshipError);
          // Ne pas throw, continuer avec les produits classiques
        } else {
          dropshipProducts = dropship || [];
          dropshipCount = dCount || 0;
          
          // Récupérer les infos vendeur pour chaque produit dropship
          if (dropshipProducts.length > 0) {
            const vendorIds = [...new Set(dropshipProducts.map(p => p.vendor_id))];
            const { data: vendorProfiles } = await supabase
              .from('profiles')
              .select('id, store_name, location, rating, rating_count, is_certified')
              .in('id', vendorIds);
            
            // Mapper les infos vendeur
            const vendorMap = new Map(vendorProfiles?.map(v => [v.id, v]) || []);
            dropshipProducts = dropshipProducts.map(p => ({
              ...p,
              vendor: vendorMap.get(p.vendor_id) || null
            }));
          }
        }
      }
      
      // 3. Mapper les produits au format marketplace
      const mappedClassic: MarketplaceProduct[] = (classicProducts || []).map(p => ({
        id: p.id,
        title: p.title,
        description: p.description || '',
        price: p.price,
        originalPrice: p.original_price,
        images: p.images || [],
        category: p.category || 'Divers',
        subcategory: p.subcategory,
        vendor: {
          id: p.vendor?.id || p.vendor_id,
          name: p.vendor?.store_name || 'Boutique',
          location: p.vendor?.location || 'Guinée',
          rating: p.vendor?.rating || 4.5,
          ratingCount: p.vendor?.rating_count || 0,
          isCertified: p.vendor?.is_certified || false,
        },
        rating: p.rating || 0,
        reviewCount: p.review_count || 0,
        stock: p.stock_quantity || 0,
        deliveryTime: '2-5 jours',
        isPremium: p.is_premium || false,
        isNew: isProductNew(p.created_at),
        tags: p.tags || [],
      }));
      
      const mappedDropship: MarketplaceProduct[] = dropshipProducts.map(p => 
        sanitizeForClient(mapDropshipToMarketplace(p, p.vendor))
      );
      
      // 4. Combiner et trier
      let allProducts = [...mappedClassic, ...mappedDropship];
      
      switch (sortBy) {
        case 'price_asc':
          allProducts.sort((a, b) => a.price - b.price);
          break;
        case 'price_desc':
          allProducts.sort((a, b) => b.price - a.price);
          break;
        case 'rating':
          allProducts.sort((a, b) => b.rating - a.rating);
          break;
        case 'popular':
          allProducts.sort((a, b) => b.reviewCount - a.reviewCount);
          break;
        case 'newest':
        default:
          // Déjà trié par défaut ou mélanger pour diversité
          allProducts = shuffleArray(allProducts);
          break;
      }
      
      // 5. Pagination
      const total = (classicCount || 0) + dropshipCount;
      const totalPages = Math.ceil(total / limit);
      const startIndex = (page - 1) * limit;
      const paginatedProducts = allProducts.slice(startIndex, startIndex + limit);
      
      return {
        products: paginatedProducts,
        total,
        page,
        totalPages,
        hasMore: page < totalPages
      };
      
    } catch (error) {
      console.error('[DropshipMarketplace] Error fetching products:', error);
      throw error;
    }
  }
  
  /**
   * Récupère un produit par son ID (classique ou dropship)
   */
  async getProductById(productId: string): Promise<MarketplaceProduct | null> {
    try {
      // Essayer d'abord les produits classiques
      const { data: classicProduct, error: classicError } = await supabase
        .from('products')
        .select(`
          *,
          vendor:profiles!products_vendor_id_fkey(
            id,
            store_name,
            location,
            rating,
            rating_count,
            is_certified
          )
        `)
        .eq('id', productId)
        .eq('status', 'active')
        .single();
      
      if (classicProduct && !classicError) {
        return {
          id: classicProduct.id,
          title: classicProduct.title,
          description: classicProduct.description || '',
          price: classicProduct.price,
          originalPrice: classicProduct.original_price,
          images: classicProduct.images || [],
          category: classicProduct.category || 'Divers',
          subcategory: classicProduct.subcategory,
          vendor: {
            id: classicProduct.vendor?.id || classicProduct.vendor_id,
            name: classicProduct.vendor?.store_name || 'Boutique',
            location: classicProduct.vendor?.location || 'Guinée',
            rating: classicProduct.vendor?.rating || 4.5,
            ratingCount: classicProduct.vendor?.rating_count || 0,
            isCertified: classicProduct.vendor?.is_certified || false,
          },
          rating: classicProduct.rating || 0,
          reviewCount: classicProduct.review_count || 0,
          stock: classicProduct.stock_quantity || 0,
          deliveryTime: '2-5 jours',
          isPremium: classicProduct.is_premium || false,
          isNew: isProductNew(classicProduct.created_at),
          tags: classicProduct.tags || [],
        };
      }
      
      // Sinon, essayer les produits dropship
      const { data: dropshipProduct, error: dropshipError } = await supabase
        .from('dropship_products')
        .select('*')
        .eq('id', productId)
        .eq('is_published', true)
        .single();
      
      if (dropshipProduct && !dropshipError) {
        // Récupérer les infos vendeur séparément
        const { data: vendorInfo } = await supabase
          .from('profiles')
          .select('id, store_name, location, rating, rating_count, is_certified')
          .eq('id', dropshipProduct.vendor_id)
          .single();
        
        return sanitizeForClient(mapDropshipToMarketplace(dropshipProduct, vendorInfo));
      }
      
      return null;
      
    } catch (error) {
      console.error('[DropshipMarketplace] Error fetching product:', error);
      return null;
    }
  }
  
  /**
   * Vérifie si un produit est un dropship (pour admin/vendeur uniquement)
   */
  async isDropshipProduct(productId: string): Promise<boolean> {
    const { data, error } = await supabase
      .from('dropship_products')
      .select('id')
      .eq('id', productId)
      .single();
    
    return !error && data !== null;
  }
  
  /**
   * Récupère les infos dropship d'un produit (admin/vendeur seulement)
   */
  async getDropshipInfo(productId: string): Promise<DropshipProductInternal | null> {
    const { data, error } = await supabase
      .from('dropship_products')
      .select('*')
      .eq('id', productId)
      .single();
    
    if (error || !data) return null;
    
    // Récupérer les infos vendeur séparément
    const { data: vendorInfo } = await supabase
      .from('profiles')
      .select('id, store_name, location, rating, rating_count, is_certified')
      .eq('id', data.vendor_id)
      .single();
    
    return mapDropshipToMarketplace(data, vendorInfo);
  }
  
  /**
   * Récupère les produits recommandés (mix classique + dropship)
   */
  async getRecommendedProducts(
    currentProductId?: string,
    category?: string,
    limit = 8
  ): Promise<MarketplaceProduct[]> {
    const result = await this.getProducts({
      category,
      limit: limit + 1, // +1 pour exclure le produit courant
      sortBy: 'popular'
    });
    
    return result.products
      .filter(p => p.id !== currentProductId)
      .slice(0, limit);
  }
  
  /**
   * Recherche produits (unifie classique + dropship)
   */
  async searchProducts(query: string, limit = 20): Promise<MarketplaceProduct[]> {
    const result = await this.getProducts({
      searchQuery: query,
      limit
    });
    
    return result.products;
  }
}

// ==================== UTILITY FUNCTIONS ====================

function shuffleArray<T>(array: T[]): T[] {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

// ==================== SINGLETON EXPORT ====================

export const dropshipMarketplace = DropshipMarketplaceService.getInstance();

export default dropshipMarketplace;
