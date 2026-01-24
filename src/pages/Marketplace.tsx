// @ts-nocheck
/**
 * MARKETPLACE PAGE - Page Marketplace Ultra-Professionnelle
 * 224Solutions - Design E-Commerce International Premium
 * 
 * Features:
 * - Architecture modulaire avec composants réutilisables
 * - Design responsive mobile-first
 * - Animations fluides avec Framer Motion
 * - UX optimisée pour conversion
 */

import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { motion, AnimatePresence } from "framer-motion";

// Marketplace Components
import { MarketplaceHeader } from "@/components/marketplace/MarketplaceHeader";
import { MarketplaceTypeSelector } from "@/components/marketplace/MarketplaceTypeSelector";
import { MarketplaceCategoryBadges } from "@/components/marketplace/MarketplaceCategoryBadges";
import { MarketplaceFiltersBar } from "@/components/marketplace/MarketplaceFiltersBar";
import { MarketplaceDigitalCategories } from "@/components/marketplace/MarketplaceDigitalCategories";
import { MarketplaceResultsHeader } from "@/components/marketplace/MarketplaceResultsHeader";
import { MarketplaceGrid } from "@/components/marketplace/MarketplaceGrid";
import { MarketplaceProductCard } from "@/components/marketplace/MarketplaceProductCard";
import { ServiceTypesGrid } from "@/components/marketplace/ServiceTypesGrid";
import ProductDetailModal from "@/components/marketplace/ProductDetailModal";
import QuickFooter from "@/components/QuickFooter";
import SearchBar from "@/components/SearchBar";

// Hooks & Utils
import { supabase } from "@/integrations/supabase/client";
import { useMarketplaceUniversal } from "@/hooks/useMarketplaceUniversal";
import { useResponsive } from "@/hooks/useResponsive";
import { useCart } from "@/contexts/CartContext";
import { useAuth } from "@/hooks/useAuth";
import { useTranslation } from "@/hooks/useTranslation";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface Category {
  id: string;
  name: string;
  image_url?: string;
  is_active: boolean;
}

export default function Marketplace() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { isMobile, isTablet } = useResponsive();
  const { user } = useAuth();
  const { addToCart } = useCart();
  const { t } = useTranslation();
  
  // State
  const [categories, setCategories] = useState<Category[]>([]);
  const [countries, setCountries] = useState<string[]>([]);
  const [cities, setCities] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState(searchParams.get('search') || "");
  const [selectedCategory, setSelectedCategory] = useState(searchParams.get('category') || "all");
  const [selectedCountry, setSelectedCountry] = useState("all");
  const [selectedCity, setSelectedCity] = useState("all");
  const [selectedItemType, setSelectedItemType] = useState<'all' | 'product' | 'professional_service' | 'digital_product'>('all');
  const [selectedDigitalCategory, setSelectedDigitalCategory] = useState<string>("all");
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [sortBy, setSortBy] = useState<string>("newest");
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState({ minPrice: 0, maxPrice: 0, minRating: 0 });
  const [selectedProductId, setSelectedProductId] = useState<string | null>(null);
  const [showProductModal, setShowProductModal] = useState(false);
  const [vendorName, setVendorName] = useState<string | null>(null);
  const [vendorSlug, setVendorSlug] = useState<string | null>(null);
  
  const vendorId = searchParams.get('vendor') || undefined;

  // Effective category for API
  const effectiveCategory = selectedItemType === 'digital_product' && selectedDigitalCategory !== 'all' 
    ? selectedDigitalCategory 
    : selectedCategory;

  // Load marketplace items
  const { 
    items: marketplaceItems,
    loading: marketplaceLoading,
    total: marketplaceTotal,
    hasMore: marketplaceHasMore,
    loadMore: marketplaceLoadMore
  } = useMarketplaceUniversal({
    limit: 24,
    category: effectiveCategory,
    searchQuery,
    minPrice: filters.minPrice,
    maxPrice: filters.maxPrice,
    minRating: filters.minRating,
    vendorId,
    country: selectedCountry,
    city: selectedCity,
    itemType: selectedItemType,
    sortBy,
    autoLoad: true
  });

  // Load vendor info if filtered
  useEffect(() => {
    if (vendorId) {
      const loadVendorName = async () => {
        const { data } = await supabase
          .from('vendors')
          .select('business_name, shop_slug')
          .eq('id', vendorId)
          .single();
        if (data) {
          setVendorName(data.business_name);
          setVendorSlug(data.shop_slug);
        }
      };
      loadVendorName();
    } else {
      setVendorName(null);
      setVendorSlug(null);
    }
  }, [vendorId]);

  // Load categories and locations
  useEffect(() => {
    loadCategories();
    loadLocations();
  }, []);

  const loadCategories = async () => {
    try {
      const { data: categoriesWithProducts } = await supabase
        .from('products')
        .select('category_id')
        .eq('is_active', true)
        .not('category_id', 'is', null);

      const categoryProductCount = new Map<string, number>();
      (categoriesWithProducts || []).forEach(product => {
        if (product.category_id) {
          const count = categoryProductCount.get(product.category_id) || 0;
          categoryProductCount.set(product.category_id, count + 1);
        }
      });

      const categoryIdsWithProducts = Array.from(categoryProductCount.keys());
      
      if (categoryIdsWithProducts.length === 0) {
        setCategories([{ id: 'all', name: t('common.all'), is_active: true }]);
        return;
      }

      const { data } = await supabase
        .from('categories')
        .select('id, name, image_url, is_active')
        .eq('is_active', true)
        .in('id', categoryIdsWithProducts)
        .order('name');

      const sortedCategories = (data || []).sort((a, b) => {
        const countA = categoryProductCount.get(a.id) || 0;
        const countB = categoryProductCount.get(b.id) || 0;
        return countB - countA;
      });

      setCategories([{ id: 'all', name: t('common.all'), is_active: true }, ...sortedCategories]);
    } catch (error) {
      console.error('Error loading categories:', error);
      setCategories([{ id: 'all', name: t('common.all'), is_active: true }]);
    }
  };

  const loadLocations = async (countryFilter?: string) => {
    try {
      const { data: countryData } = await supabase
        .from('vendors')
        .select('country')
        .not('country', 'is', null);
      
      const uniqueCountries = [
        ...new Set(
          (countryData || [])
            .map(v => (v.country || '').trim().replace(/\s+/g, ' '))
            .filter(Boolean)
        )
      ];
      setCountries(uniqueCountries.sort());

      let cityQuery = supabase
        .from('vendors')
        .select('city, country')
        .not('city', 'is', null);
      
      if (countryFilter && countryFilter !== 'all') {
        cityQuery = cityQuery.ilike('country', countryFilter);
      }
      
      const { data: cityData } = await cityQuery;
      
      const uniqueCities = [
        ...new Set(
          (cityData || [])
            .map(v => (v.city || '').trim().replace(/\s+/g, ' '))
            .filter(Boolean)
        )
      ];
      setCities(uniqueCities.sort());
    } catch (error) {
      console.error('Error loading locations:', error);
    }
  };

  useEffect(() => {
    loadLocations(selectedCountry);
    if (selectedCountry !== 'all') {
      setSelectedCity('all');
    }
  }, [selectedCountry]);

  const handleProductClick = (itemId: string) => {
    setSelectedProductId(itemId);
    setShowProductModal(true);
  };

  const handleContactVendor = async (itemId: string) => {
    const item = marketplaceItems.find(p => p.id === itemId);
    if (!item?.vendor_user_id) {
      toast.error('Informations du vendeur non disponibles');
      return;
    }

    if (!user) {
      toast.error('Veuillez vous connecter pour contacter le vendeur');
      navigate('/auth');
      return;
    }

    try {
      const initialMessage = `Bonjour, je suis intéressé par "${item.name}". Pouvez-vous me donner plus d'informations ?`;
      
      await supabase.from('messages').insert({
        sender_id: user.id,
        recipient_id: item.vendor_user_id,
        content: initialMessage,
        type: 'text'
      });

      toast.success('Message envoyé au vendeur!');
      navigate(`/messages?recipientId=${item.vendor_user_id}`);
    } catch (error) {
      console.error('Error contacting vendor:', error);
      toast.error('Impossible de contacter le vendeur');
    }
  };

  const handleTypeChange = (type: 'all' | 'product' | 'professional_service' | 'digital_product') => {
    setSelectedItemType(type);
    if (type !== 'digital_product') {
      setSelectedDigitalCategory('all');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-background via-background to-muted/20 pb-24">
      {/* Header */}
      <MarketplaceHeader
        vendorName={vendorName}
        vendorSlug={vendorSlug}
        vendorId={vendorId}
        itemCount={marketplaceTotal}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        onFilterToggle={() => setShowFilters(!showFilters)}
        onCameraCapture={(file) => navigate('/marketplace/visual-search', { state: { capturedImage: file } })}
        isMobile={isMobile}
      />

      {/* Category Badges */}
      <MarketplaceCategoryBadges
        categories={categories}
        selectedCategory={selectedCategory}
        onCategoryChange={setSelectedCategory}
      />

      {/* Type Selector */}
      <MarketplaceTypeSelector
        selectedType={selectedItemType}
        onTypeChange={handleTypeChange}
      />

      {/* Digital Categories - Only when digital products selected */}
      <AnimatePresence>
        {selectedItemType === 'digital_product' && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2 }}
          >
            <MarketplaceDigitalCategories
              selectedCategory={selectedDigitalCategory}
              onCategoryChange={setSelectedDigitalCategory}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Filters Bar */}
      <MarketplaceFiltersBar
        sortBy={sortBy}
        onSortChange={setSortBy}
        countries={countries}
        selectedCountry={selectedCountry}
        onCountryChange={setSelectedCountry}
        cities={cities}
        selectedCity={selectedCity}
        onCityChange={setSelectedCity}
        viewMode={viewMode}
        onViewModeChange={setViewMode}
        showFilters={showFilters}
        onToggleFilters={() => setShowFilters(!showFilters)}
        filters={filters}
        onFiltersChange={setFilters}
        isMobile={isMobile}
      />

      {/* Results Section - Padding contrôlé */}
      <section className="px-2 sm:px-4 py-3 sm:py-5">
        {/* Professional Services Grid */}
        {selectedItemType === 'professional_service' ? (
          <ServiceTypesGrid 
            onBack={() => setSelectedItemType('all')} 
            searchQuery={searchQuery}
          />
        ) : (
          <>
            {/* Digital Products Search */}
            {selectedItemType === 'digital_product' && (
              <div className="mb-4">
                <SearchBar
                  value={searchQuery}
                  onChange={setSearchQuery}
                  placeholder="Rechercher un produit numérique..."
                />
              </div>
            )}

            {/* Results Header */}
            <MarketplaceResultsHeader
              total={marketplaceTotal}
              selectedItemType={selectedItemType}
              loading={marketplaceLoading}
            />

            {/* Products Grid */}
            {marketplaceLoading ? (
              <MarketplaceGrid>
                {Array.from({ length: 12 }).map((_, i) => (
                  <motion.div 
                    key={i} 
                    className="marketplace-card animate-pulse"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.05 }}
                  >
                    <div className="marketplace-card-image-container bg-muted" />
                    <div className="marketplace-card-content space-y-2.5">
                      <div className="h-3 bg-muted rounded w-1/3" />
                      <div className="h-4 bg-muted rounded w-3/4" />
                      <div className="h-3 bg-muted rounded w-1/2" />
                      <div className="h-5 bg-muted rounded w-1/3" />
                      <div className="h-8 bg-muted rounded w-full mt-2" />
                    </div>
                  </motion.div>
                ))}
              </MarketplaceGrid>
            ) : marketplaceItems.length === 0 ? (
              <motion.div 
                className="text-center py-16 sm:py-20"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
              >
                <div className="w-20 h-20 sm:w-24 sm:h-24 mx-auto mb-4 rounded-full bg-muted/50 flex items-center justify-center">
                  <span className="text-3xl sm:text-4xl">🔍</span>
                </div>
                <p className="text-base sm:text-lg font-medium text-foreground mb-1">
                  {selectedItemType === 'all' ? 'Aucun article trouvé' :
                   selectedItemType === 'product' ? 'Aucun produit trouvé' :
                   'Aucun produit numérique trouvé'}
                </p>
                <p className="text-xs sm:text-sm text-muted-foreground max-w-xs mx-auto">
                  Essayez de modifier vos filtres ou votre recherche
                </p>
              </motion.div>
            ) : (
              <MarketplaceGrid>
                {marketplaceItems
                  .filter(item => item.item_type !== 'professional_service')
                  .map((item, index) => (
                    <motion.div
                      key={item.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.03, duration: 0.3 }}
                    >
                      <MarketplaceProductCard
                        id={item.id}
                        image={item.images || []}
                        title={item.name}
                        price={item.price}
                        originalPrice={item.originalPrice}
                        currency={item.currency || 'GNF'}
                        vendor={item.vendor_name}
                        vendorId={item.vendor_id}
                        vendorLocation={item.address}
                        vendorRating={item.rating}
                        vendorRatingCount={item.reviews_count}
                        rating={item.rating}
                        reviewCount={item.reviews_count}
                        isPremium={item.is_premium || item.is_featured}
                        stock={item.stock}
                        category={item.category_name}
                        onBuy={() => handleProductClick(item.id)}
                        onAddToCart={() => {
                          addToCart({
                            id: item.id,
                            name: item.name,
                            price: item.price,
                            image: item.images?.[0],
                            vendor_id: item.vendor_id,
                            vendor_name: item.vendor_name
                          });
                          toast.success('Ajouté au panier');
                        }}
                        onContact={() => handleContactVendor(item.id)}
                      />
                    </motion.div>
                  ))}
              </MarketplaceGrid>
            )}

            {/* Load More */}
            {marketplaceHasMore && !marketplaceLoading && (
              <motion.div 
                className="text-center mt-6 sm:mt-8"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
              >
                <Button 
                  onClick={marketplaceLoadMore} 
                  disabled={marketplaceLoading}
                  size={isMobile ? "default" : "lg"}
                  className="px-8 sm:px-12 rounded-full shadow-lg hover:shadow-xl transition-all"
                >
                  {marketplaceLoading ? 'Chargement...' : 'Voir plus de produits'}
                </Button>
              </motion.div>
            )}
          </>
        )}
      </section>

      {/* Footer */}
      <QuickFooter />

      {/* Product Detail Modal */}
      <ProductDetailModal
        productId={selectedProductId}
        open={showProductModal}
        onClose={() => {
          setShowProductModal(false);
          setSelectedProductId(null);
        }}
      />
    </div>
  );
}
