// @ts-nocheck
import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Grid, List, ArrowUpDown, Menu, ShoppingCart as ShoppingCartIcon, MapPin, Globe, Share2, Filter, Package, Briefcase, Laptop, Plane, Monitor, GraduationCap, BookOpen, Bot, ShoppingBag, Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import SearchBar from "@/components/SearchBar";
import { MarketplaceGrid } from "@/components/marketplace/MarketplaceGrid";
import { TranslatedProductCard } from "@/components/marketplace/TranslatedProductCard";
import { UniversalMarketplaceCard } from "@/components/marketplace/UniversalMarketplaceCard";
import { ProfessionalServiceCard } from "@/components/marketplace/ProfessionalServiceCard";
import { ServiceTypesGrid } from "@/components/marketplace/ServiceTypesGrid";
import { CurrencyIndicator } from "@/components/marketplace/CurrencyIndicator";
import QuickFooter from "@/components/QuickFooter";
import ProductDetailModal from "@/components/marketplace/ProductDetailModal";
import { FavoriteButton } from "@/components/ui/FavoriteButton";
import { BrowseModal } from "@/components/marketplace/BrowseModal";
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
import { cn } from "@/lib/utils";

// Configuration des catégories numériques pour le filtre
const DIGITAL_CATEGORIES = [
  { id: 'all', name: 'Tous', icon: Package, gradient: 'from-slate-500 to-slate-600' },
  { id: 'voyage', name: 'Voyage', icon: Plane, gradient: 'from-primary to-secondary' },
  { id: 'logiciel', name: 'Logiciels', icon: Monitor, gradient: 'from-purple-500 to-pink-500' },
  { id: 'formation', name: 'Formations', icon: GraduationCap, gradient: 'from-green-500 to-emerald-500' },
  { id: 'livre', name: 'Livres', icon: BookOpen, gradient: 'from-amber-500 to-yellow-500' },
  { id: 'ai', name: 'IA', icon: Bot, gradient: 'from-violet-500 to-fuchsia-500' },
  { id: 'physique_affilie', name: 'Affiliés', icon: ShoppingBag, gradient: 'from-orange-500 to-red-500' },
] as const;

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
  const [selectedDigitalCategory, setSelectedDigitalCategory] = useState<string>("all");
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [showBrowseModal, setShowBrowseModal] = useState(false);
  const [sortBy, setSortBy] = useState<'popular' | 'price_asc' | 'price_desc' | 'rating' | 'newest' | 'position'>("position");
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState({ minPrice: 0, maxPrice: 0, minRating: 0 });
  const [selectedProductId, setSelectedProductId] = useState<string | null>(null);
  const [showProductModal, setShowProductModal] = useState(false);
  const [vendorName, setVendorName] = useState<string | null>(null);
  
  const vendorId = searchParams.get('vendor') || undefined;
  const includePhysicalVendors = searchParams.get('includePhysical') === '1';

  const [vendorSlug, setVendorSlug] = useState<string | null>(null);

  // Déterminer quelle catégorie passer au hook:
  // - Si on filtre par produits numériques et une catégorie numérique est sélectionnée, l'utiliser
  // - Sinon utiliser la catégorie e-commerce classique
  const effectiveCategory = selectedItemType === 'digital_product' && selectedDigitalCategory !== 'all' 
    ? selectedDigitalCategory 
    : selectedCategory;

  // 🔥 UTILISER LE HOOK UNIVERSEL pour charger TOUT (produits + services pro + numériques)
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
      // Charger les catégories qui ont au moins un produit actif
      const { data: categoriesWithProducts, error: countError } = await supabase
        .from('products')
        .select('category_id')
        .eq('is_active', true)
        .not('category_id', 'is', null);

      if (countError) throw countError;

      // Compter les produits par catégorie
      const categoryProductCount = new Map<string, number>();
      (categoriesWithProducts || []).forEach(product => {
        if (product.category_id) {
          const count = categoryProductCount.get(product.category_id) || 0;
          categoryProductCount.set(product.category_id, count + 1);
        }
      });

      // Charger uniquement les catégories qui ont des produits
      const categoryIdsWithProducts = Array.from(categoryProductCount.keys());
      
      if (categoryIdsWithProducts.length === 0) {
        setCategories([{ id: 'all', name: t('common.all'), is_active: true }]);
        return;
      }

      const { data, error } = await supabase
        .from('categories')
        .select('id, name, image_url, is_active')
        .eq('is_active', true)
        .in('id', categoryIdsWithProducts)
        .order('name');

      if (error) throw error;
      
      // Trier par nombre de produits (décroissant)
      const sortedCategories = (data || []).sort((a, b) => {
        const countA = categoryProductCount.get(a.id) || 0;
        const countB = categoryProductCount.get(b.id) || 0;
        return countB - countA;
      });

      const allCategory = { id: 'all', name: t('common.all'), is_active: true };
      setCategories([allCategory, ...sortedCategories]);
    } catch (error) {
      console.error('Erreur chargement catégories:', error);
      setCategories([{ id: 'all', name: t('common.all'), is_active: true }]);
    }
  };

  const loadLocations = async (countryFilter?: string) => {
    try {
      // Charger les pays distincts depuis les vendeurs visibles sur le marketplace
      // (actifs, avec un pays défini)
      const { data: countryData, error: countryError } = await supabase
        .from('vendors')
        .select('country')
        .eq('is_active', true)
        .not('country', 'is', null)
        .neq('country', '')
        .or('business_type.is.null,business_type.neq.physical');

      if (countryError) {
        console.error('Erreur chargement pays:', countryError);
      }

      const uniqueCountries = [
        ...new Set(
          (countryData || [])
            .map(v => (v.country || '').trim().replace(/\s+/g, ' '))
            .filter(Boolean)
        )
      ];

      // Si aucun pays trouvé, on peut aussi chercher dans les produits numériques
      if (uniqueCountries.length === 0) {
        const { data: digitalVendors } = await supabase
          .from('digital_products')
          .select('vendors!digital_products_vendor_id_fkey(country)')
          .eq('status', 'published')
          .not('vendor_id', 'is', null);

        const digitalCountries = (digitalVendors || [])
          .map((d: any) => d.vendors?.country)
          .filter(Boolean)
          .map((c: string) => c.trim().replace(/\s+/g, ' '));

        uniqueCountries.push(...new Set(digitalCountries));
      }

      setCountries([...new Set(uniqueCountries)].sort());

      // Charger les villes distinctes (filtrées par pays si sélectionné)
      let cityQuery = supabase
        .from('vendors')
        .select('city, country')
        .eq('is_active', true)
        .not('city', 'is', null)
        .neq('city', '')
        .or('business_type.is.null,business_type.neq.physical');

      // Si un pays est sélectionné, filtrer les villes par ce pays
      if (countryFilter && countryFilter !== 'all') {
        cityQuery = cityQuery.ilike('country', countryFilter);
      }

      const { data: cityData } = await cityQuery;

      const cityMap = new Map<string, string>();
      (cityData || []).forEach(v => {
        const raw = (v.city || '').trim().replace(/\s+/g, ' ');
        if (raw) {
          const key = raw.toLowerCase();
          if (!cityMap.has(key)) {
            // Garder la version avec majuscule
            cityMap.set(key, raw.charAt(0).toUpperCase() + raw.slice(1));
          }
        }
      });
      setCities([...cityMap.values()].sort());
    } catch (error) {
      console.error('Erreur chargement localisations:', error);
    }
  };

  // Recharger les villes quand le pays change
  useEffect(() => {
    loadLocations(selectedCountry);
    // Réinitialiser la ville si on change de pays
    if (selectedCountry !== 'all') {
      setSelectedCity('all');
    }
  }, [selectedCountry]);

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
    <div className="min-h-screen bg-background pb-24">
      {/* Header */}
      <header className="bg-card border-b border-border sticky top-0 z-40">
        <div className="px-4 py-3">
          <div className="flex items-center justify-between gap-3">
            <div className="flex-1 min-w-0 overflow-hidden">
              {vendorName ? (
                <>
                  <h1 className="text-lg sm:text-xl font-bold text-foreground truncate">
                    {vendorName}
                  </h1>
                  <p className="text-xs text-muted-foreground">
                    {marketplaceTotal} article{marketplaceTotal > 1 ? 's' : ''} disponible{marketplaceTotal > 1 ? 's' : ''}
                  </p>
                </>
              ) : (
                <div className="overflow-hidden">
                  <div className="flex animate-vision-ticker" style={{ width: 'max-content' }}>
                    {/* Bloc 1 */}
                    <span className="text-sm sm:text-base font-medium text-primary whitespace-nowrap px-8 font-inter">
                      224SOLUTIONS donne à l'Afrique la possibilité de vendre en ligne et physiquement, que ce soit des produits physiques ou digitaux, via l'affiliation, tout en permettant à chacun de gérer son commerce physique et d'offrir ou accéder aux services les plus proches de lui.
                    </span>
                    <span className="text-primary/40 whitespace-nowrap px-4">•••</span>
                    <span className="text-sm sm:text-base font-medium text-primary whitespace-nowrap px-8 font-inter">
                      La plateforme connecte vendeurs et acheteurs à travers le continent, facilite le commerce digital, sécurise les paiements et crée de nouvelles opportunités économiques sans frontières.
                    </span>
                    <span className="text-primary/40 whitespace-nowrap px-4">•••</span>
                    {/* Bloc 2 (copie exacte pour boucle infinie) */}
                    <span className="text-sm sm:text-base font-medium text-primary whitespace-nowrap px-8 font-inter">
                      224SOLUTIONS donne à l'Afrique la possibilité de vendre en ligne et physiquement, que ce soit des produits physiques ou digitaux, via l'affiliation, tout en permettant à chacun de gérer son commerce physique et d'offrir ou accéder aux services les plus proches de lui.
                    </span>
                    <span className="text-primary/40 whitespace-nowrap px-4">•••</span>
                    <span className="text-sm sm:text-base font-medium text-primary whitespace-nowrap px-8 font-inter">
                      La plateforme connecte vendeurs et acheteurs à travers le continent, facilite le commerce digital, sécurise les paiements et crée de nouvelles opportunités économiques sans frontières.
                    </span>
                    <span className="text-primary/40 whitespace-nowrap px-4">•••</span>
                  </div>
                </div>
              )}
            </div>
            <div className="flex items-center gap-1.5 shrink-0">
              <CurrencyIndicator variant="default" />
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
                    ogType="shop"
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
          
          {/* Barre de recherche avec bouton caméra intégré */}
          <div className="mt-3">
            <SearchBar
              value={searchQuery}
              onChange={setSearchQuery}
              placeholder={t('marketplace.searchProducts')}
              showFilter
              onFilter={() => setShowFilters(!showFilters)}
              showCamera
              onCameraCapture={(file) => {
                // Naviguer vers la recherche visuelle avec l'image capturée
                navigate('/marketplace/visual-search', { state: { capturedImage: file } });
              }}
            />
          </div>
        </div>
      </header>

      {/* Categories Responsive */}
      <section className="px-2 sm:px-4 py-2 border-b border-border overflow-hidden">
        <div className="flex gap-1.5 overflow-x-auto scrollbar-hide pb-1 -mx-1 px-1">
          {categories.map((category) => (
            <Badge
              key={category.id}
              variant={selectedCategory === category.id ? "default" : "secondary"}
              className={`cursor-pointer whitespace-nowrap shrink-0 px-2 sm:px-3 py-1 sm:py-1.5 text-[10px] sm:text-xs ${
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

      {/* Filtres de type - Boutons icônes compacts pour mobile */}
      <section className="px-3 py-2 border-b border-border bg-gradient-to-r from-muted/50 via-background to-muted/50">
        <div className="flex justify-center gap-2 sm:gap-4">
          {/* Services Pro - EN PREMIER */}
          <button
            onClick={() => {
              setSelectedItemType('professional_service');
              setSelectedDigitalCategory('all');
            }}
            className={`group relative flex-1 max-w-[140px] h-14 sm:h-20 rounded-xl sm:rounded-2xl flex flex-col items-center justify-center gap-0.5 sm:gap-1.5 transition-all duration-300 ${
              selectedItemType === 'professional_service' 
                ? 'bg-primary text-white shadow-lg shadow-primary/30 scale-[1.02] ring-2 ring-primary/30' 
                : 'bg-card border border-border hover:border-primary hover:shadow-md'
            }`}
          >
            <div className={`p-1.5 sm:p-2 rounded-lg transition-all ${
              selectedItemType === 'professional_service' 
                ? 'bg-white/20' 
                : 'bg-primary/10'
            }`}>
              <Briefcase className={`w-4 h-4 sm:w-6 sm:h-6 transition-transform group-hover:scale-110 ${
                selectedItemType === 'professional_service' ? 'text-white' : 'text-primary'
              }`} />
            </div>
            <span className={`text-[9px] sm:text-xs font-medium ${
              selectedItemType === 'professional_service' ? 'text-white' : 'text-muted-foreground'
            }`}>
              Services Pro
            </span>
            {selectedItemType === 'professional_service' && (
              <span className="absolute -bottom-0.5 w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full bg-primary/50 animate-pulse" />
            )}
          </button>

          {/* Produits Numériques */}
          <button
            onClick={() => setSelectedItemType('digital_product')}
            className={`group relative flex-1 max-w-[140px] h-14 sm:h-20 rounded-xl sm:rounded-2xl flex flex-col items-center justify-center gap-0.5 sm:gap-1.5 transition-all duration-300 ${
              selectedItemType === 'digital_product' 
                ? 'bg-accent text-white shadow-lg shadow-accent/30 scale-[1.02] ring-2 ring-accent/50' 
                : 'bg-card border border-border hover:border-accent hover:shadow-md'
            }`}
          >
            <div className={`p-1.5 sm:p-2 rounded-lg transition-all ${
              selectedItemType === 'digital_product' 
                ? 'bg-white/20' 
                : 'bg-accent/10'
            }`}>
              <Laptop className={`w-4 h-4 sm:w-6 sm:h-6 transition-transform group-hover:scale-110 ${
                selectedItemType === 'digital_product' ? 'text-white' : 'text-accent'
              }`} />
            </div>
            <span className={`text-[9px] sm:text-xs font-medium ${
              selectedItemType === 'digital_product' ? 'text-white' : 'text-muted-foreground'
            }`}>
              Numériques
            </span>
            {selectedItemType === 'digital_product' && (
              <span className="absolute -bottom-0.5 w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full bg-accent/50 animate-pulse" />
            )}
          </button>
        </div>
      </section>

      {/* 🔥 Filtre Catégories Numériques - Visible uniquement pour les produits numériques */}
      {selectedItemType === 'digital_product' && (
        <section className="px-2 py-2 border-b border-border bg-gradient-to-r from-accent/5 via-background to-accent/5">
          <div className="flex gap-1.5 overflow-x-auto scrollbar-hide pb-1 -mx-1 px-1">
            {DIGITAL_CATEGORIES.map((cat) => {
              const IconComponent = cat.icon;
              const isSelected = selectedDigitalCategory === cat.id;
              return (
                <button
                  key={cat.id}
                  onClick={() => setSelectedDigitalCategory(cat.id)}
                  className={cn(
                    'flex items-center gap-1.5 px-2 py-1.5 rounded-lg shrink-0 transition-all duration-200',
                    'border text-xs font-medium',
                    isSelected
                      ? 'bg-accent text-white border-accent shadow-sm scale-[1.02]'
                      : 'bg-card border-border hover:border-primary/30 hover:bg-primary/5 dark:hover:bg-primary/10'
                  )}
                >
                  <div className={cn(
                    'w-5 h-5 rounded-md flex items-center justify-center',
                    isSelected ? 'bg-white/20' : `bg-gradient-to-br ${cat.gradient}`
                  )}>
                    <IconComponent className={cn(
                      'w-3 h-3',
                      isSelected ? 'text-white' : 'text-white'
                    )} />
                  </div>
                  <span className={cn(
                    'hidden xs:inline',
                    isSelected ? 'text-white' : 'text-foreground'
                  )}>
                    {cat.name}
                  </span>
                </button>
              );
            })}
          </div>
        </section>
      )}

      {/* Filters & View Controls Responsive */}
      <section className="px-2 sm:px-4 py-2 border-b border-border">
        {/* Première ligne de filtres - scrollable horizontalement */}
        <div className="flex gap-1.5 sm:gap-2 overflow-x-auto scrollbar-hide pb-1 -mx-1 px-1">
          {/* Tri */}
          <Select value={sortBy} onValueChange={setSortBy}>
            <SelectTrigger className="h-8 shrink-0 w-auto min-w-[100px] sm:min-w-[120px] text-[10px] sm:text-xs border-border bg-background">
              <ArrowUpDown className="w-3 h-3 mr-1 shrink-0" />
              <span className="truncate"><SelectValue /></span>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="position">Équitable</SelectItem>
              <SelectItem value="newest">Plus récents</SelectItem>
              <SelectItem value="popular">Popularité</SelectItem>
              <SelectItem value="price_asc">Prix ↑</SelectItem>
              <SelectItem value="price_desc">Prix ↓</SelectItem>
              <SelectItem value="rating">Mieux notés</SelectItem>
            </SelectContent>
          </Select>

          {/* Filtre Pays */}
          <Select value={selectedCountry} onValueChange={setSelectedCountry}>
            <SelectTrigger className="h-8 shrink-0 w-auto min-w-[105px] sm:min-w-[130px] text-[10px] sm:text-xs border-border bg-background">
              <Globe className="w-3 h-3 mr-1 shrink-0" />
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
            <SelectTrigger className="h-8 shrink-0 w-auto min-w-[100px] sm:min-w-[140px] text-[10px] sm:text-xs border-border bg-background">
              <MapPin className="w-3 h-3 mr-1 shrink-0" />
              <span className="truncate"><SelectValue placeholder="Toutes villes" /></span>
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
                variant="ghost"
                size="sm"
                onClick={() => setShowBrowseModal(true)}
                className="h-7 w-7 p-0"
                title="Explorer"
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
        {/* Si "Services Pro" est sélectionné, afficher la grille des types de services */}
        {selectedItemType === 'professional_service' ? (
          <ServiceTypesGrid 
            onBack={() => setSelectedItemType('all')} 
            searchQuery={searchQuery}
          />
        ) : (
          <>
            {/* Barre de recherche pour produits numériques */}
            {selectedItemType === 'digital_product' && (
              <div className="mb-4">
                <SearchBar
                  value={searchQuery}
                  onChange={setSearchQuery}
                  placeholder="Rechercher un produit numérique..."
                />
              </div>
            )}

            <div className="flex items-center justify-between mb-3">
              <p className="text-xs text-muted-foreground">
                {marketplaceTotal} résultats
                {selectedItemType !== 'all' && (
                  <span className="ml-2">
                    ({selectedItemType === 'product' ? 'Produits' : 'Produits numériques'})
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
                   'Aucun produit numérique trouvé'}
                </p>
                <p className="text-xs text-muted-foreground">
                  Essayez de modifier vos filtres de recherche
                </p>
              </div>
            ) : (
              <MarketplaceGrid>
                {marketplaceItems.filter(item => item.item_type !== 'professional_service').map((item) => (
                  <TranslatedProductCard
                    key={item.id}
                    id={item.id}
                    image={item.images || []}
                    title={item.name}
                    description={item.description}
                    price={item.price}
                    originalPrice={item.originalPrice}
                    currency={item.currency || 'GNF'}
                    vendor={item.vendor_name}
                    vendorId={item.vendor_id}
                    vendorPublicId={item.vendor_public_id}
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
                        vendor_name: item.vendor_name,
                        currency: item.currency || 'GNF',
                        item_type: item.item_type,
                        product_mode: item.product_mode,
                        affiliate_url: item.affiliate_url
                      });
                      toast.success('Ajouté au panier');
                    }}
                    onContact={() => handleContactVendor(item.id)}
                  />
                ))}
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
          </>
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

      {/* Modal de navigation */}
      <BrowseModal
        open={showBrowseModal}
        onOpenChange={setShowBrowseModal}
        categories={categories}
        onSelectCategory={(catId) => setSelectedCategory(catId)}
        onSelectProduct={(productId) => handleProductClick(productId)}
        onSelectVendor={(vendorId) => navigate(`/marketplace?vendor=${vendorId}`)}
      />
    </div>
  );
}