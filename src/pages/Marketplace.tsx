// @ts-nocheck
import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Grid, List, ArrowUpDown, Menu, ShoppingCart as ShoppingCartIcon, Camera, MapPin, Globe, Share2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import SearchBar from "@/components/SearchBar";
import { MarketplaceGrid } from "@/components/marketplace/MarketplaceGrid";
import { MarketplaceProductCard } from "@/components/marketplace/MarketplaceProductCard";
import QuickFooter from "@/components/QuickFooter";
import ProductDetailModal from "@/components/marketplace/ProductDetailModal";
import { supabase } from "@/integrations/supabase/client";
import { useUniversalProducts } from "@/hooks/useUniversalProducts";
import { toast } from "sonner";
import { useResponsive } from "@/hooks/useResponsive";
import { ResponsiveContainer } from "@/components/responsive/ResponsiveContainer";
import { useCart } from "@/contexts/CartContext";
import { useAuth } from "@/hooks/useAuth";
import { ShareButton } from "@/components/shared/ShareButton";

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
  const [categories, setCategories] = useState<Category[]>([]);
  const [countries, setCountries] = useState<string[]>([]);
  const [cities, setCities] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState(searchParams.get('search') || "");
  const [selectedCategory, setSelectedCategory] = useState(searchParams.get('category') || "all");
  const [selectedCountry, setSelectedCountry] = useState("all");
  const [selectedCity, setSelectedCity] = useState("all");
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [sortBy, setSortBy] = useState<'popular' | 'price_asc' | 'price_desc' | 'rating' | 'newest'>("newest");
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState({ minPrice: 0, maxPrice: 0, minRating: 0 });
  const [selectedProductId, setSelectedProductId] = useState<string | null>(null);
  const [showProductModal, setShowProductModal] = useState(false);
  const [vendorName, setVendorName] = useState<string | null>(null);
  
  const vendorId = searchParams.get('vendor') || undefined;

  // Charger le nom du vendeur si filtré par vendeur
  useEffect(() => {
    if (vendorId) {
      const loadVendorName = async () => {
        const { data } = await supabase
          .from('vendors')
          .select('business_name')
          .eq('id', vendorId)
          .single();
        if (data) setVendorName(data.business_name);
      };
      loadVendorName();
    } else {
      setVendorName(null);
    }
  }, [vendorId]);

  // Utiliser le hook universel pour les produits
  const { 
    products, 
    loading, 
    total, 
    hasMore, 
    loadMore 
  } = useUniversalProducts({
    limit: 24,
    category: selectedCategory,
    searchQuery,
    minPrice: filters.minPrice,
    maxPrice: filters.maxPrice,
    minRating: filters.minRating,
    vendorId,
    country: selectedCountry,
    city: selectedCity,
    sortBy,
    autoLoad: true
  });

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
      
      const allCategory = { id: 'all', name: 'Toutes', is_active: true };
      setCategories([allCategory, ...(data || [])]);
    } catch (error) {
      console.error('Erreur chargement catégories:', error);
      setCategories([{ id: 'all', name: 'Toutes', is_active: true }]);
    }
  };

  const loadLocations = async () => {
    try {
      // Charger les pays distincts
      const { data: countryData } = await supabase
        .from('vendors')
        .select('country')
        .not('country', 'is', null);
      
      const uniqueCountries = [...new Set((countryData || []).map(v => v.country).filter(Boolean))];
      setCountries(uniqueCountries.sort());

      // Charger les villes distinctes
      const { data: cityData } = await supabase
        .from('vendors')
        .select('city')
        .not('city', 'is', null);
      
      const uniqueCities = [...new Set((cityData || []).map(v => v.city).filter(Boolean))];
      setCities(uniqueCities.sort());
    } catch (error) {
      console.error('Erreur chargement localisations:', error);
    }
  };

  const handleProductClick = (productId: string) => {
    setSelectedProductId(productId);
    setShowProductModal(true);
  };

  const handleContactVendor = async (productId: string) => {
    // Trouver le produit dans la liste
    const product = products.find(p => p.id === productId);
    if (!product) {
      toast.error('Produit introuvable');
      return;
    }

    if (!product.vendor_user_id) {
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
      const initialMessage = `Bonjour, je suis intéressé par votre produit "${product.name}". Pouvez-vous me donner plus d'informations ?`;
      
      const { error } = await supabase
        .from('messages')
        .insert({
          sender_id: user.id,
          recipient_id: product.vendor_user_id,
          content: initialMessage,
          type: 'text'
        });

      if (error) throw error;

      toast.success('Message envoyé au vendeur!');
      navigate(`/messages?recipientId=${product.vendor_user_id}`);
    } catch (error) {
      console.error('Erreur lors du contact:', error);
      toast.error('Impossible de contacter le vendeur');
    }
  };

  return (
    <div className="min-h-screen bg-background pb-20">
      {/* Header Responsive */}
      <header className="bg-card border-b border-border sticky top-0 z-40">
        <ResponsiveContainer autoPadding>
          <div className="flex items-center justify-between">
            <div className="flex-1 min-w-0">
              <h1 className="heading-responsive font-bold text-foreground truncate">
                {vendorName ? vendorName : 'Marketplace'}
              </h1>
              {vendorName && (
                <p className="text-xs text-muted-foreground">
                  {total} produit{total > 1 ? 's' : ''} disponible{total > 1 ? 's' : ''}
                </p>
              )}
            </div>
            <div className="flex items-center gap-2">
              {vendorId && (
                <>
                  <ShareButton
                    title={vendorName || 'Boutique'}
                    text={`Découvrez la boutique ${vendorName} sur 224 Solutions`}
                    url={`${window.location.origin}/shop/${vendorId}`}
                    variant="ghost"
                    size="icon"
                  />
                  <Button 
                    variant="ghost" 
                    size="sm"
                    onClick={() => navigate('/marketplace')}
                    className="text-xs"
                  >
                    Voir tout
                  </Button>
                </>
              )}
              {user && (
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="relative"
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
                <Button variant="ghost" size="icon">
                  <Menu className="w-5 h-5" />
                </Button>
              )}
            </div>
          </div>
          <div className="mt-4 flex gap-2">
            <div className="flex-1">
              <SearchBar
                value={searchQuery}
                onChange={setSearchQuery}
                placeholder="Rechercher des produits..."
                showFilter
                onFilter={() => setShowFilters(!showFilters)}
              />
            </div>
            <Button 
              variant="outline" 
              size="icon"
              onClick={() => navigate('/marketplace/visual-search')}
              className="shrink-0 h-10 w-10 border-primary/30 hover:bg-primary/10"
              title="Recherche par image"
            >
              <Camera className="w-5 h-5 text-primary" />
            </Button>
          </div>
        </ResponsiveContainer>
      </header>

      {/* Categories Responsive */}
      <section className="p-responsive border-b border-border">
        <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-2">
          {categories.map((category) => (
            <Badge
              key={category.id}
              variant={selectedCategory === category.id ? "default" : "secondary"}
              className={`cursor-pointer whitespace-nowrap ${
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

      {/* Filters & View Controls Responsive */}
      <section className="p-responsive border-b border-border">
        <div className="flex flex-wrap items-center justify-between gap-2">
          {/* Tri */}
          <Select value={sortBy} onValueChange={setSortBy}>
            <SelectTrigger className="w-auto min-w-fit text-xs sm:text-sm">
              <ArrowUpDown className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2 shrink-0" />
              <SelectValue />
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
            <SelectTrigger className="w-auto min-w-fit text-xs sm:text-sm">
              <Globe className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2 shrink-0" />
              <SelectValue placeholder="Tous les pays" />
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
            <SelectTrigger className="w-auto min-w-fit text-xs sm:text-sm">
              <MapPin className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2 shrink-0" />
              <SelectValue placeholder="Toutes les villes" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Toutes les villes</SelectItem>
              {cities.map((city) => (
                <SelectItem key={city} value={city}>{city}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          {!isMobile && (
            <div className="flex items-center gap-1 bg-accent rounded-lg p-1">
              <Button
                variant={viewMode === 'grid' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setViewMode('grid')}
                className="h-8 w-8 p-0"
              >
                <Grid className="w-4 h-4" />
              </Button>
              <Button
                variant={viewMode === 'list' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setViewMode('list')}
                className="h-8 w-8 p-0"
              >
                <List className="w-4 h-4" />
              </Button>
            </div>
          )}
        </div>

        {showFilters && (
          <div className="mt-4 p-4 bg-accent rounded-lg animate-fade-in">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium mb-2 block">Prix (GNF)</label>
                <div className="flex gap-2">
                  <input
                    type="number"
                    placeholder="Min"
                    className="flex-1 px-3 py-2 border border-border rounded-md text-sm bg-background"
                    onChange={e => setFilters(prev => ({ ...prev, minPrice: parseInt(e.target.value) || 0 }))}
                  />
                  <input
                    type="number"
                    placeholder="Max"
                    className="flex-1 px-3 py-2 border border-border rounded-md text-sm bg-background"
                    onChange={e => setFilters(prev => ({ ...prev, maxPrice: parseInt(e.target.value) || 0 }))}
                  />
                </div>
              </div>
              <div>
                <label className="text-sm font-medium mb-2 block">Note minimum</label>
                <Select onValueChange={(val) => setFilters(prev => ({ ...prev, minRating: parseInt(val) || 0 }))}>
                  <SelectTrigger>
                    <SelectValue placeholder="Choisir" />
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

      {/* Results Responsive */}
      <section className="p-responsive">
        <div className="flex items-center justify-between mb-4">
          <p className="text-xs md:text-sm text-muted-foreground">
            {products.length} / {total} résultats
          </p>
        </div>

        {loading ? (
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
        ) : products.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-muted-foreground">Aucun produit trouvé</p>
          </div>
        ) : (
          <MarketplaceGrid>
            {products.map((product) => (
              <MarketplaceProductCard 
                key={product.id} 
                id={product.id}
                image={product.images || 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=300&h=300&fit=crop'}
                title={product.name}
                price={product.price}
                originalPrice={product.original_price}
                vendor={product.vendor_name}
                vendorLocation={product.vendor_location}
                vendorRating={product.vendor_rating}
                vendorRatingCount={product.vendor_rating_count}
                rating={product.rating || 0}
                reviewCount={product.reviews_count || 0}
                stock={product.stock_quantity}
                category={product.category_name}
                deliveryTime={product.delivery_time}
                onBuy={() => handleProductClick(product.id)}
                onAddToCart={() => {
                  addToCart({
                    id: product.id,
                    name: product.name,
                    price: product.price,
                    image: product.images?.[0],
                    vendor_id: product.vendor_id,
                    vendor_name: product.vendor_name
                  });
                  toast.success('Produit ajouté au panier');
                }}
                onContact={() => handleContactVendor(product.id)}
                isPremium={product.is_hot}
              />
            ))}
          </MarketplaceGrid>
        )}

        {hasMore && !loading && (
          <div className="text-center mt-4 md:mt-6">
            <Button 
              onClick={loadMore} 
              disabled={loading}
              size={isMobile ? "sm" : "default"}
            >
              {loading ? 'Chargement...' : 'Voir plus'}
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