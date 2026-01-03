// @ts-nocheck
import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Grid, List, ArrowUpDown, Menu, ShoppingCart as ShoppingCartIcon, Camera, MapPin, Globe, Share2, Filter, Package, Briefcase, Laptop } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import SearchBar from "@/components/SearchBar";
import { MarketplaceGrid } from "@/components/marketplace/MarketplaceGrid";
import { MarketplaceProductCard } from "@/components/marketplace/MarketplaceProductCard";
import { UniversalMarketplaceCard } from "@/components/marketplace/UniversalMarketplaceCard";
import { CurrencyIndicator } from "@/components/marketplace/CurrencyIndicator";
import QuickFooter from "@/components/QuickFooter";
import ProductDetailModal from "@/components/marketplace/ProductDetailModal";
import { supabase } from "@/integrations/supabase/client";
import { useUniversalProducts } from "@/hooks/useUniversalProducts";
import { useMarketplaceUniversal } from "@/hooks/useMarketplaceUniversal";
import { toast } from "sonner";
import { useResponsive } from "@/hooks/useResponsive";
import { ResponsiveContainer } from "@/components/responsive/ResponsiveContainer";
import { useCart } from "@/contexts/CartContext";
import { useAuth } from "@/hooks/useAuth";
import { ShareButton } from "@/components/shared/ShareButton";
import { useTranslation } from "@/hooks/useTranslation";

const PAGE_LIMIT = 24;

interface Category {
  id: string;
  name: string;
  image_url?: string;
  is_active: boolean;
}

interface Product {
  id: string;
  name: string;
  price: number;
  description?: string;
  images?: string[];
  vendor_id: string;
  vendors?: {
    business_name: string;
  };
}

export default function Marketplace() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { isMobile, isTablet } = useResponsive();
  const { user } = useAuth();
  const { addToCart, getCartCount } = useCart();
  const { t } = useTranslation();
  const [categories, setCategories] = useState<Category[]>([]);
  const [countries, setCountries] = useState<string[]>([]);
  const [cities, setCities] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState(searchParams.get('search') || "");
  const [selectedCategory, setSelectedCategory] = useState(searchParams.get('category') || "all");
  const [selectedCountry, setSelectedCountry] = useState("all");
  const [selectedCity, setSelectedCity] = useState("all");
  const [selectedItemType, setSelectedItemType] = useState<'all' | 'product' | 'professional_service' | 'digital_product'>('all');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [sortBy, setSortBy] = useState<'popular' | 'price_asc' | 'price_desc' | 'rating' | 'newest'>("newest");
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState({ minPrice: 0, maxPrice: 0, minRating: 0 });
  const [selectedProductId, setSelectedProductId] = useState<string | null>(null);
  const [showProductModal, setShowProductModal] = useState(false);
  const [vendorName, setVendorName] = useState<string | null>(null);
  
  const vendorId = searchParams.get('vendor') || undefined;
  const includePhysicalVendors = searchParams.get('includePhysical') === '1';

  const [vendorSlug, setVendorSlug] = useState<string | null>(null);

  // 🔥 UTILISER LE HOOK UNIVERSEL pour charger TOUT (produits + services pro + numériques)
  const { 
    items: marketplaceItems,
    loading: marketplaceLoading,
    total: marketplaceTotal,
    hasMore: marketplaceHasMore,
    loadMore: marketplaceLoadMore
  } = useMarketplaceUniversal({
    limit: 24,
    category: selectedCategory,
    searchQuery,
    minPrice: filters.minPrice,
    maxPrice: filters.maxPrice,
    minRating: filters.minRating,
    vendorId,
    itemType: selectedItemType,
    sortBy,
    autoLoad: true
  });
  // Charger le nom du vendeur si filtré par vendeur
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

  // Charger les catégories et les localisations
  useEffect(() => {
    loadCategories();
    loadLocations();
  }, []);

  const loadCategories = async () => {
    try {
      const { data, error } = await supabase
        .from('categories')
        .select('id, name, image_url, is_active')
        .eq('is_active', true)
        .order('name');

      if (error) throw error;
      
      const allCategory = { id: 'all', name: t('common.all'), is_active: true };
      setCategories([allCategory, ...(data || [])]);
    } catch (error) {
      console.error('Erreur chargement catégories:', error);
      setCategories([{ id: 'all', name: t('common.all'), is_active: true }]);
    }
  };

  const loadLocations = async () => {
    try {
      // Charger les pays distincts
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

      // Charger les villes distinctes
      const { data: cityData } = await supabase
        .from('vendors')
        .select('city')
        .not('city', 'is', null);
      
      const uniqueCities = [
        ...new Set(
          (cityData || [])
            .map(v => (v.city || '').trim().replace(/\s+/g, ' '))
            .filter(Boolean)
        )
      ];
      setCities(uniqueCities.sort());
    } catch (error) {
      console.error('Erreur chargement localisations:', error);
    }
  };

  const handleProductClick = (itemId: string) => {
    setSelectedProductId(itemId);
    setShowProductModal(true);
  };

  const handleContactVendor = async (itemId: string) => {
    // Trouver l'item dans la liste
    const item = marketplaceItems.find(p => p.id === itemId);
    if (!item) {
      toast.error('Item introuvable');
      return;
    }

    if (!item.vendor_user_id) {
      toast.error('Informations du vendeur non disponibles');
      return;
    }

    try {
      if (!user) {
        toast.error('Veuillez vous connecter pour contacter le vendeur');
        navigate('/auth');
        return;
      }

      // Créer un message initial
      const initialMessage = `Bonjour, je suis intéressé par "${item.name}". Pouvez-vous me donner plus d'informations ?`;
      
      const { error } = await supabase
        .from('messages')
        .insert({
          sender_id: user.id,
          recipient_id: item.vendor_user_id,
          content: initialMessage,
          type: 'text'
        });

      if (error) throw error;

      toast.success('Message envoyé au vendeur!');
      navigate(`/messages?recipientId=${item.vendor_user_id}`);
    } catch (error) {
      console.error('Erreur lors du contact:', error);
      toast.error('Impossible de contacter le vendeur');
    }
  };

  return (
    <div className="min-h-screen bg-background pb-20">
      {/* Header */}
      <header className="bg-card border-b border-border sticky top-0 z-40">
        <div className="px-4 py-3">
          <div className="flex items-center justify-between gap-3">
            <div className="flex-1 min-w-0">
              <h1 className="text-lg sm:text-xl font-bold text-foreground truncate">
                {vendorName ? vendorName : 'Marketplace 224'}
              </h1>
              {vendorName && (
                <p className="text-xs text-muted-foreground">
                  {marketplaceTotal} article{marketplaceTotal > 1 ? 's' : ''} disponible{marketplaceTotal > 1 ? 's' : ''}
                </p>
              )}
            </div>
            <div className="flex items-center gap-1.5 shrink-0">
              <CurrencyIndicator variant="compact" />
              {vendorId && (
                <>
                  <ShareButton
                    title={vendorName || 'Boutique'}
                    text={`Découvrez la boutique ${vendorName} sur 224 Solutions`}
                    url={`${window.location.origin}/boutique/${vendorSlug || vendorId}`}
                    variant="outline"
                    size="icon"
                    resourceType="shop"
                    resourceId={vendorId}
                    useShortUrl={true}
                  />
                  <Button 
                    variant="ghost" 
                    size="sm"
                    onClick={() => navigate('/marketplace')}
                    className="text-xs"
                  >
                    {t('home.seeAll')}
                  </Button>
                </>
              )}
              {user && (
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="relative h-9 w-9"
                  onClick={() => navigate('/cart')}
                >
                  <ShoppingCartIcon className="w-5 h-5" />
                  {getCartCount() > 0 && (
                    <Badge className="absolute -top-1 -right-1 h-5 w-5 p-0 flex items-center justify-center text-xs">
                      {getCartCount()}
                    </Badge>
                  )}
                </Button>
              )}
              {isMobile && (
                <Button variant="ghost" size="icon" className="h-9 w-9">
                  <Menu className="w-5 h-5" />
                </Button>
              )}
            </div>
          </div>
          
          {/* Barre de recherche */}
          <div className="mt-3 flex gap-2">
            <div className="flex-1 min-w-0">
              <SearchBar
                value={searchQuery}
                onChange={setSearchQuery}
                placeholder={t('marketplace.searchProducts')}
                showFilter
                onFilter={() => setShowFilters(!showFilters)}
              />
            </div>
            <Button 
              variant="outline" 
              size="icon"
              onClick={() => navigate('/marketplace/visual-search')}
              className="shrink-0 h-11 w-11 border-primary/30 hover:bg-primary/10"
              title="Recherche par image"
            >
              <Camera className="w-5 h-5 text-primary" />
            </Button>
          </div>
        </div>
      </header>

      {/* Categories Responsive */}
      <section className="px-4 py-3 border-b border-border overflow-hidden">
        <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-1 -mx-1 px-1">
          {categories.map((category) => (
            <Badge
              key={category.id}
              variant={selectedCategory === category.id ? "default" : "secondary"}
              className={`cursor-pointer whitespace-nowrap shrink-0 px-3 py-1.5 text-xs ${
                selectedCategory === category.id
                  ? "bg-primary text-primary-foreground" 
                  : "hover:bg-accent"
              }`}
              onClick={() => setSelectedCategory(category.id)}
            >
              {category.name}
            </Badge>
          ))}
        </div>
      </section>

      {/* Filtres de type - Boutons icônes stylés */}
      <section className="px-4 py-3 border-b border-border bg-gradient-to-r from-muted/50 via-background to-muted/50">
        <div className="flex justify-center gap-3 sm:gap-6">
          <button
            onClick={() => setSelectedItemType('professional_service')}
            className={`group relative w-28 h-16 sm:w-36 sm:h-20 rounded-2xl sm:rounded-3xl flex flex-col items-center justify-center gap-1 sm:gap-1.5 transition-all duration-300 ${
              selectedItemType === 'professional_service' 
                ? 'bg-gradient-to-br from-blue-500 via-blue-600 to-indigo-600 text-white shadow-lg sm:shadow-xl shadow-blue-500/40 scale-105 ring-2 ring-blue-300/50' 
                : 'bg-card border-2 border-border hover:border-blue-400 hover:shadow-lg hover:scale-102'
            }`}
          >
            <div className={`p-2 sm:p-2.5 rounded-lg sm:rounded-xl transition-all ${
              selectedItemType === 'professional_service' 
                ? 'bg-white/20' 
                : 'bg-blue-100'
            }`}>
              <Briefcase className={`w-5 h-5 sm:w-7 sm:h-7 transition-transform group-hover:scale-110 ${
                selectedItemType === 'professional_service' ? 'text-white' : 'text-blue-600'
              }`} />
            </div>
            <span className={`text-[10px] sm:text-xs font-semibold ${
              selectedItemType === 'professional_service' ? 'text-white' : 'text-muted-foreground'
            }`}>
              Services Pro
            </span>
            {selectedItemType === 'professional_service' && (
              <span className="absolute -bottom-1 sm:-bottom-1.5 w-2 h-2 sm:w-3 sm:h-3 rounded-full bg-blue-300 animate-pulse shadow-lg" />
            )}
          </button>

          <button
            onClick={() => setSelectedItemType('digital_product')}
            className={`group relative w-28 h-16 sm:w-36 sm:h-20 rounded-2xl sm:rounded-3xl flex flex-col items-center justify-center gap-1 sm:gap-1.5 transition-all duration-300 ${
              selectedItemType === 'digital_product' 
                ? 'bg-gradient-to-br from-purple-500 via-purple-600 to-fuchsia-600 text-white shadow-lg sm:shadow-xl shadow-purple-500/40 scale-105 ring-2 ring-purple-300/50' 
                : 'bg-card border-2 border-border hover:border-purple-400 hover:shadow-lg hover:scale-102'
            }`}
          >
            <div className={`p-2 sm:p-2.5 rounded-lg sm:rounded-xl transition-all ${
              selectedItemType === 'digital_product' 
                ? 'bg-white/20' 
                : 'bg-purple-100'
            }`}>
              <Laptop className={`w-5 h-5 sm:w-7 sm:h-7 transition-transform group-hover:scale-110 ${
                selectedItemType === 'digital_product' ? 'text-white' : 'text-purple-600'
              }`} />
            </div>
            <span className={`text-[10px] sm:text-xs font-semibold ${
              selectedItemType === 'digital_product' ? 'text-white' : 'text-muted-foreground'
            }`}>
              Numériques
            </span>
            {selectedItemType === 'digital_product' && (
              <span className="absolute -bottom-1 sm:-bottom-1.5 w-2 h-2 sm:w-3 sm:h-3 rounded-full bg-purple-300 animate-pulse shadow-lg" />
            )}
          </button>
        </div>
      </section>

      {/* Filters & View Controls Responsive */}
      <section className="px-4 py-3 border-b border-border">
        {/* Première ligne de filtres - scrollable horizontalement */}
        <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-2 -mx-1 px-1">
          {/* Tri */}
          <Select value={sortBy} onValueChange={setSortBy}>
            <SelectTrigger className="h-9 shrink-0 w-auto min-w-[120px] text-xs border-border bg-background">
              <ArrowUpDown className="w-3 h-3 mr-1.5 shrink-0" />
              <span className="truncate"><SelectValue /></span>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="newest">Plus récents</SelectItem>
              <SelectItem value="popular">Popularité</SelectItem>
              <SelectItem value="price_asc">Prix croissant</SelectItem>
              <SelectItem value="price_desc">Prix décroissant</SelectItem>
              <SelectItem value="rating">Mieux notés</SelectItem>
            </SelectContent>
          </Select>

          {/* Filtre Pays */}
          <Select value={selectedCountry} onValueChange={setSelectedCountry}>
            <SelectTrigger className="h-9 shrink-0 w-auto min-w-[130px] text-xs border-border bg-background">
              <Globe className="w-3 h-3 mr-1.5 shrink-0" />
              <span className="truncate"><SelectValue placeholder="Tous les pays" /></span>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tous les pays</SelectItem>
              {countries.map((country) => (
                <SelectItem key={country} value={country}>{country}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Filtre Ville */}
          <Select value={selectedCity} onValueChange={setSelectedCity}>
            <SelectTrigger className="h-9 shrink-0 w-auto min-w-[140px] text-xs border-border bg-background">
              <MapPin className="w-3 h-3 mr-1.5 shrink-0" />
              <span className="truncate"><SelectValue placeholder="Toutes les villes" /></span>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Toutes les villes</SelectItem>
              {cities.map((city) => (
                <SelectItem key={city} value={city}>{city}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          {!isMobile && (
            <div className="flex items-center gap-1 bg-accent rounded-lg p-1 shrink-0">
              <Button
                variant={viewMode === 'grid' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setViewMode('grid')}
                className="h-7 w-7 p-0"
              >
                <Grid className="w-4 h-4" />
              </Button>
              <Button
                variant={viewMode === 'list' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setViewMode('list')}
                className="h-7 w-7 p-0"
              >
                <List className="w-4 h-4" />
              </Button>
            </div>
          )}
        </div>

        {/* Panneau de filtres avancés */}
        {showFilters && (
          <div className="mt-3 p-3 bg-muted/50 rounded-lg border border-border">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium mb-1.5 block text-foreground">Prix (GNF)</label>
                <div className="flex gap-2">
                  <input
                    type="number"
                    placeholder="Min"
                    className="flex-1 px-3 py-2 border border-border rounded-md text-xs bg-background w-full"
                    onChange={e => setFilters(prev => ({ ...prev, minPrice: parseInt(e.target.value) || 0 }))}
                  />
                  <input
                    type="number"
                    placeholder="Max"
                    className="flex-1 px-3 py-2 border border-border rounded-md text-xs bg-background w-full"
                    onChange={e => setFilters(prev => ({ ...prev, maxPrice: parseInt(e.target.value) || 0 }))}
                  />
                </div>
              </div>
              <div>
                <label className="text-xs font-medium mb-1.5 block text-foreground">Note minimum</label>
                <Select onValueChange={(val) => setFilters(prev => ({ ...prev, minRating: parseInt(val) || 0 }))}>
                  <SelectTrigger className="h-9 text-xs w-full">
                    <SelectValue placeholder="Choisir une note" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="4">4+ étoiles</SelectItem>
                    <SelectItem value="3">3+ étoiles</SelectItem>
                    <SelectItem value="2">2+ étoiles</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
        )}
      </section>

      {/* Results */}
      <section className="px-4 py-3">
        <div className="flex items-center justify-between mb-3">
          <p className="text-xs text-muted-foreground">
            {marketplaceItems.length} / {marketplaceTotal} résultats
            {selectedItemType !== 'all' && (
              <span className="ml-2">
                ({selectedItemType === 'product' ? 'Produits' : 
                  selectedItemType === 'professional_service' ? 'Services professionnels' : 
                  'Produits numériques'})
              </span>
            )}
          </p>
        </div>

        {marketplaceLoading ? (
          <div className="marketplace-grid">
            {/* Skeleton Loading */}
            {Array.from({ length: 12 }).map((_, i) => (
              <div key={i} className="marketplace-card animate-pulse">
                <div className="marketplace-card-image-container bg-muted" />
                <div className="marketplace-card-content space-y-2">
                  <div className="h-4 bg-muted rounded w-3/4" />
                  <div className="h-3 bg-muted rounded w-1/2" />
                  <div className="h-5 bg-muted rounded w-1/3" />
                </div>
              </div>
            ))}
          </div>
        ) : marketplaceItems.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-muted-foreground mb-2">
              {selectedItemType === 'all' ? 'Aucun article trouvé' :
               selectedItemType === 'product' ? 'Aucun produit trouvé' :
               selectedItemType === 'professional_service' ? 'Aucun service professionnel trouvé' :
               'Aucun produit numérique trouvé'}
            </p>
            <p className="text-xs text-muted-foreground">
              Essayez de modifier vos filtres de recherche
            </p>
          </div>
        ) : (
          <MarketplaceGrid>
            {marketplaceItems.map((item) => {
              // Pour les services professionnels, utiliser UniversalMarketplaceCard
              if (item.item_type === 'professional_service') {
                return (
                  <UniversalMarketplaceCard
                    key={item.id}
                    item={item}
                    onAddToCart={() => navigate(`/services-proximite/${item.id}`)}
                    onViewDetails={() => navigate(`/services-proximite/${item.id}`)}
                  />
                );
              }
              
              // Pour les produits physiques et numériques, utiliser MarketplaceProductCard
              return (
                <MarketplaceProductCard
                  key={item.id}
                  id={item.id}
                  image={item.images || []}
                  title={item.name}
                  price={item.price}
                  originalPrice={item.originalPrice}
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
              );
            })}
          </MarketplaceGrid>
        )}

        {marketplaceHasMore && !marketplaceLoading && (
          <div className="text-center mt-4 md:mt-6">
            <Button 
              onClick={marketplaceLoadMore} 
              disabled={marketplaceLoading}
              size={isMobile ? "sm" : "default"}
            >
              {marketplaceLoading ? 'Chargement...' : 'Voir plus'}
            </Button>
          </div>
        )}
      </section>

      {/* Footer de navigation */}
      <QuickFooter />

      {/* Modal de détails du produit */}
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