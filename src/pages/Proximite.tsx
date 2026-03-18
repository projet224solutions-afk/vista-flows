import { useState, useMemo, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { 
  Store, 
  Package, 
  Scissors, 
  Utensils, 
  Car, 
  Wrench, 
  Sparkles,
  Building2,
  ShoppingBag,
  Heart,
  Laptop,
  Home,
  Camera,
  Dumbbell,
  Search,
  MapPin,
  Star,
  ArrowRight,
  TrendingUp,
  RefreshCw,
  Loader2
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import QuickFooter from "@/components/QuickFooter";
import { useProximityStats } from "@/hooks/useProximityStats";
import { Button } from "@/components/ui/button";
import { useTranslation } from "@/hooks/useTranslation";
import { supabase } from "@/integrations/supabase/client";

// Couleurs de la charte : Bleu #04439e, Orange #ff4000, Noir #000000
const BLUE = "#04439e";
const ORANGE = "#ff4000";
const BLACK = "#000000";

const getProximityPopularServices = (stats: any) => [
  {
    id: "restaurant",
    title: "Restaurant",
    icon: Utensils,
    count: stats.restaurant,
    path: "/services-proximite?type=restaurant",
    description: "Cuisine & plats"
  },
  {
    id: "beaute",
    title: "Beauté & Coiffure",
    icon: Scissors,
    count: stats.beaute,
    path: "/services-proximite?type=beaute",
    description: "Soins & styling"
  },
  {
    id: "vtc",
    title: "Transport VTC",
    icon: Car,
    count: stats.vtc,
    path: "/taxi",
    description: "Véhicules privés"
  },
  {
    id: "reparation",
    title: "Réparation",
    icon: Wrench,
    count: stats.reparation,
    path: "/services-proximite?type=reparation",
    description: "Électro & mécanique"
  }
];

const getProximitySecondaryServices = (stats: any) => [
  {
    id: "menage",
    title: "Nettoyage",
    icon: Sparkles,
    count: stats.nettoyage,
    path: "/services-proximite?type=menage",
    description: "Ménage & pressing"
  },
  {
    id: "informatique",
    title: "Informatique",
    icon: Laptop,
    count: stats.informatique,
    path: "/services-proximite?type=informatique",
    description: "Tech & dépannage"
  }
];

const getQuickAccessServices = (stats: any) => [
  {
    id: "boutiques",
    title: "Boutiques",
    icon: Store,
    count: stats.boutiques,
    path: "/proximite/boutiques",
    description: "Commerces locaux",
    trending: stats.boutiques > 5
  },
  {
    id: "livraison",
    title: "Livraison",
    icon: Package,
    count: stats.livraison,
    path: "/proximite/livraison",
    description: "Colis & courses"
  }
];

interface CategoryWithCount {
  id: string;
  name: string;
  image_url?: string;
  product_count: number;
}

const getProfessionalServices = (stats: any) => [
  {
    id: "sport",
    title: "Sport & Fitness",
    icon: Dumbbell,
    description: "Coaching & salles",
    count: stats.sport
  },
  {
    id: "location",
    title: "Immobilier",
    icon: Building2,
    description: "Location & vente",
    count: stats.immobilier
  },
  {
    id: "media",
    title: "Photo & Vidéo",
    icon: Camera,
    description: "Événements & création",
    count: stats.media
  },
  {
    id: "construction",
    title: "Construction & BTP",
    icon: Building2,
    description: "Bâtiment & travaux",
    count: stats.construction
  },
  {
    id: "agriculture",
    title: "Agriculture",
    icon: ShoppingBag,
    description: "Produits locaux",
    count: stats.agriculture
  },
  {
    id: "freelance",
    title: "Administratif",
    icon: ShoppingBag,
    description: "Secrétariat & conseil",
    count: stats.freelance
  },
  {
    id: "sante",
    title: "Santé & Bien-être",
    icon: Heart,
    description: "Pharmacie & soins",
    count: stats.sante
  },
  {
    id: "maison",
    title: "Maison & Déco",
    icon: Home,
    description: "Intérieur & déco",
    count: stats.maison
  }
];

export default function Proximite() {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState("");
  const { stats, loading, userPosition, locationError, refresh, radiusKm, usingRealLocation, debugInfo } = useProximityStats();
  const { t } = useTranslation();
  const [productCategories, setProductCategories] = useState<CategoryWithCount[]>([]);
  const [loadingCategories, setLoadingCategories] = useState(true);
  const [showDebug, setShowDebug] = useState(false);

  useEffect(() => {
    const loadCategoriesWithProducts = async () => {
      try {
        const { data: products, error: productsError } = await supabase
          .from('products')
          .select('id, category_id')
          .eq('is_active', true)
          .not('category_id', 'is', null);

        if (productsError) throw productsError;

        if (!products || products.length === 0) {
          setProductCategories([]);
          setLoadingCategories(false);
          return;
        }

        const categoryCountMap = new Map<string, number>();
        products.forEach((product) => {
          if (product.category_id) {
            const count = categoryCountMap.get(product.category_id) || 0;
            categoryCountMap.set(product.category_id, count + 1);
          }
        });

        const categoryIds = Array.from(categoryCountMap.keys());
        
        const { data: categories, error: categoriesError } = await supabase
          .from('categories')
          .select('id, name, image_url')
          .in('id', categoryIds);

        if (categoriesError) throw categoriesError;

        const categoriesWithProducts: CategoryWithCount[] = (categories || []).map((cat) => ({
          id: cat.id,
          name: cat.name,
          image_url: cat.image_url,
          product_count: categoryCountMap.get(cat.id) || 0
        })).sort((a, b) => b.product_count - a.product_count);

        setProductCategories(categoriesWithProducts);
      } catch (error) {
        console.error('❌ Erreur chargement catégories:', error);
      } finally {
        setLoadingCategories(false);
      }
    };
    loadCategoriesWithProducts();
  }, []);

  const proximityPopularServices = useMemo(() => getProximityPopularServices(stats), [stats]);
  const proximitySecondaryServices = useMemo(() => getProximitySecondaryServices(stats), [stats]);
  const quickAccessServices = useMemo(() => getQuickAccessServices(stats), [stats]);
  const professionalServices = useMemo(() => getProfessionalServices(stats), [stats]);

  const handleServiceClick = (path: string) => {
    navigate(path);
  };

  return (
    <div className="min-h-screen bg-background pb-24">
      {/* Header */}
      <div className="sticky top-0 z-40 backdrop-blur-xl border-b" style={{ backgroundColor: 'rgba(255,255,255,0.95)', borderColor: `${BLUE}20` }}>
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center shadow-lg" style={{ backgroundColor: ORANGE }}>
                <MapPin className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold" style={{ color: BLUE }}>{t('home.nearbyServices')}</h1>
                <p className="text-xs" style={{ color: BLACK }}>{t('proximity.mostRequested') || 'Les plus demandés près de vous'}</p>
              </div>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={refresh}
              disabled={loading}
              className="rounded-full"
              style={{ color: BLUE }}
            >
              {loading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <RefreshCw className="w-5 h-5" />
              )}
            </Button>
          </div>

          {/* Location indicator */}
          <div className="flex items-center gap-2 mb-3 text-xs flex-wrap">
            <button 
              onClick={() => setShowDebug(!showDebug)}
              className="flex items-center gap-1 px-2 py-1 rounded-full transition-colors"
              style={{ 
                backgroundColor: usingRealLocation ? '#dcfce7' : '#fef3c7',
                color: usingRealLocation ? '#15803d' : '#b45309'
              }}
            >
              <MapPin className="w-3 h-3" />
              <span>{usingRealLocation ? "GPS actif" : "GPS désactivé"}</span>
            </button>
            <div className="flex items-center gap-1 px-2 py-1 rounded-full" style={{ backgroundColor: `${BLUE}15`, color: BLUE }}>
              <span>Rayon: {radiusKm} km</span>
            </div>
            {loading && (
              <span className="flex items-center gap-1" style={{ color: BLACK }}>
                <Loader2 className="w-3 h-3 animate-spin" />
                {t('common.loading')}
              </span>
            )}
          </div>

          {/* Debug Panel */}
          {showDebug && debugInfo && (
            <div className="mb-3 p-3 rounded-xl border text-xs space-y-2" style={{ backgroundColor: '#f8fafc', borderColor: `${BLUE}20` }}>
              <div className="font-semibold flex items-center gap-2" style={{ color: BLUE }}>
                🔍 Debug GPS & Rayon {radiusKm}km
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <span style={{ color: BLACK }}>Position utilisée:</span>
                  <div className="font-mono text-[10px]">
                    {debugInfo.positionUsed.latitude.toFixed(5)}, {debugInfo.positionUsed.longitude.toFixed(5)}
                  </div>
                </div>
                <div>
                  <span style={{ color: BLACK }}>Source:</span>
                  <div className="font-medium" style={{ color: debugInfo.usingRealGps ? '#15803d' : '#b45309' }}>
                    {debugInfo.usingRealGps ? "GPS réel" : "Position par défaut (Coyah)"}
                  </div>
                </div>
              </div>
              <div className="border-t pt-2 grid grid-cols-2 sm:grid-cols-4 gap-2" style={{ borderColor: `${BLUE}20` }}>
                {[
                  { label: 'Boutiques', data: debugInfo.vendors },
                  { label: 'Services Pro', data: debugInfo.services },
                  { label: 'Taxi-Moto', data: debugInfo.taxiMoto },
                  { label: 'Livreurs', data: debugInfo.drivers }
                ].map(item => (
                  <div key={item.label} className="bg-white p-2 rounded-lg">
                    <div className="font-medium" style={{ color: BLUE }}>{item.label}</div>
                    <div className="text-[10px]" style={{ color: BLACK }}>
                      Total: {item.data.total} | Sans GPS: {item.data.noGps} | Hors: {item.data.outOfRadius} | ✓ {item.data.inRadius}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
          
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5" style={{ color: BLACK }} />
            <Input
              placeholder={t('home.searchPlaceholder') || t('common.search') + '...'}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 h-12 rounded-xl border-0"
              style={{ backgroundColor: `${BLUE}08`, outline: 'none' }}
            />
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-6 space-y-8">
        {/* SERVICES DE PROXIMITÉ POPULAIRES */}
        <section>
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-lg font-bold flex items-center gap-2" style={{ color: BLUE }}>
                <TrendingUp className="w-5 h-5" style={{ color: ORANGE }} />
                Services de Proximité Populaires
              </h2>
              <p className="text-sm" style={{ color: BLACK }}>Les plus demandés près de vous</p>
            </div>
          </div>

          {/* Ligne 1 - 4 services */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-3">
            {proximityPopularServices.map((service) => {
              const Icon = service.icon;
              return (
                <button
                  key={service.id}
                  onClick={() => handleServiceClick(service.path)}
                  className="group relative rounded-2xl p-4 border transition-all duration-300 text-left overflow-hidden hover:shadow-lg"
                  style={{ borderColor: `${BLUE}15`, backgroundColor: 'white' }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.borderColor = `${BLUE}40`;
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = `${BLUE}15`;
                  }}
                >
                  <div className="w-12 h-12 rounded-xl flex items-center justify-center mb-3 transition-transform group-hover:scale-110"
                    style={{ backgroundColor: `${ORANGE}12` }}>
                    <Icon className="w-6 h-6" style={{ color: ORANGE }} />
                  </div>
                  
                  <h3 className="font-semibold text-sm mb-1" style={{ color: BLUE }}>
                    {service.title}
                  </h3>
                  <p className="text-xs text-muted-foreground mb-2">{service.description}</p>
                  
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium" style={{ color: ORANGE }}>{service.count} disponibles</span>
                    <ArrowRight className="w-4 h-4 text-muted-foreground group-hover:translate-x-1 transition-all" style={{ color: BLUE }} />
                  </div>
                </button>
              );
            })}
          </div>

          {/* Ligne 2 - 2 services centrés */}
          <div className="grid grid-cols-2 gap-3 max-w-md mx-auto">
            {proximitySecondaryServices.map((service) => {
              const Icon = service.icon;
              return (
                <button
                  key={service.id}
                  onClick={() => handleServiceClick(service.path)}
                  className="group relative rounded-2xl p-4 border transition-all duration-300 text-left overflow-hidden hover:shadow-lg"
                  style={{ borderColor: `${BLUE}15`, backgroundColor: 'white' }}
                >
                  <div className="w-12 h-12 rounded-xl flex items-center justify-center mb-3 transition-transform group-hover:scale-110"
                    style={{ backgroundColor: `${ORANGE}12` }}>
                    <Icon className="w-6 h-6" style={{ color: ORANGE }} />
                  </div>
                  
                  <h3 className="font-semibold text-sm mb-1" style={{ color: BLUE }}>
                    {service.title}
                  </h3>
                  <p className="text-xs text-muted-foreground mb-2">{service.description}</p>
                  
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium" style={{ color: ORANGE }}>{service.count} disponibles</span>
                    <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-all" style={{ color: BLUE }} />
                  </div>
                </button>
              );
            })}
          </div>
        </section>

        {/* ACCÈS RAPIDE */}
        <section>
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-lg font-bold flex items-center gap-2" style={{ color: BLUE }}>
                <Store className="w-5 h-5" style={{ color: BLUE }} />
                Accès Rapide
              </h2>
              <p className="text-sm text-muted-foreground">Boutiques & Livraison à proximité</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 max-w-md mx-auto sm:max-w-none sm:grid-cols-2 lg:grid-cols-2">
            {quickAccessServices.map((service) => {
              const Icon = service.icon;
              return (
                <button
                  key={service.id}
                  onClick={() => handleServiceClick(service.path)}
                  className="group relative rounded-2xl p-4 border transition-all duration-300 text-left overflow-hidden hover:shadow-lg"
                  style={{ borderColor: `${BLUE}15`, backgroundColor: 'white' }}
                >
                  {service.trending && (
                    <Badge className="absolute top-2 right-2 border-0 text-[10px] px-1.5" 
                      style={{ backgroundColor: `${ORANGE}15`, color: ORANGE }}>
                      Tendance
                    </Badge>
                  )}
                  
                  <div className="w-12 h-12 rounded-xl flex items-center justify-center mb-3 transition-transform group-hover:scale-110"
                    style={{ backgroundColor: `${BLUE}10` }}>
                    <Icon className="w-6 h-6" style={{ color: BLUE }} />
                  </div>
                  
                  <h3 className="font-semibold text-sm mb-1" style={{ color: BLUE }}>
                    {service.title}
                  </h3>
                  <p className="text-xs text-muted-foreground mb-2">{service.description}</p>
                  
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium" style={{ color: ORANGE }}>{service.count} disponibles</span>
                    <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-all" style={{ color: BLUE }} />
                  </div>
                </button>
              );
            })}
          </div>
        </section>

        {/* Catégories de produits */}
        <section>
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-lg font-bold flex items-center gap-2" style={{ color: BLUE }}>
                <ShoppingBag className="w-5 h-5" style={{ color: BLUE }} />
                {t('home.productCategories') || 'Catégories de Produits'}
              </h2>
              <p className="text-sm text-muted-foreground">{t('home.exploreByCategory') || 'Explorez par catégorie'}</p>
            </div>
            <button 
              onClick={() => navigate('/marketplace')}
              className="text-sm font-medium flex items-center gap-1 hover:gap-2 transition-all"
              style={{ color: ORANGE }}
            >
              {t('home.seeAll')} <ArrowRight className="w-4 h-4" />
            </button>
          </div>

          {loadingCategories ? (
            <div className="flex justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin" style={{ color: BLUE }} />
            </div>
          ) : productCategories.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <ShoppingBag className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p className="text-sm">Aucune catégorie avec des produits pour le moment</p>
              <p className="text-xs mt-1">Les catégories apparaîtront ici dès que des produits seront ajoutés</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {productCategories.slice(0, 8).map((category) => (
                <button
                  key={category.id}
                  onClick={() => navigate(`/marketplace?category=${category.id}&includePhysical=1`)}
                  className="group rounded-2xl p-4 border transition-all duration-300 text-left hover:shadow-lg"
                  style={{ borderColor: `${BLUE}15`, backgroundColor: 'white' }}
                >
                  <div className="w-10 h-10 rounded-lg flex items-center justify-center mb-3 transition-transform group-hover:scale-110"
                    style={{ backgroundColor: `${BLUE}10` }}>
                    <ShoppingBag className="w-5 h-5" style={{ color: BLUE }} />
                  </div>
                  
                  <h3 className="font-semibold text-sm mb-1 line-clamp-1" style={{ color: BLUE }}>
                    {category.name}
                  </h3>
                  
                  <div className="flex items-center gap-1">
                    <span className="text-xs font-medium" style={{ color: ORANGE }}>{category.product_count}</span>
                    <span className="text-xs text-muted-foreground">
                      {category.product_count > 1 ? 'articles' : 'article'}
                    </span>
                  </div>
                </button>
              ))}
            </div>
          )}
        </section>

        {/* Services professionnels */}
        <section>
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-lg font-bold flex items-center gap-2" style={{ color: BLUE }}>
                <Star className="w-5 h-5" style={{ color: ORANGE }} />
                Services Professionnels
              </h2>
              <p className="text-sm text-muted-foreground">Experts qualifiés à votre service</p>
            </div>
            <button 
              onClick={() => navigate('/services-proximite')}
              className="text-sm font-medium flex items-center gap-1 hover:gap-2 transition-all"
              style={{ color: ORANGE }}
            >
              Explorer <ArrowRight className="w-4 h-4" />
            </button>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {professionalServices.map((service) => {
              const Icon = service.icon;
              return (
                <button
                  key={service.id}
                  onClick={() => navigate(`/services-proximite?type=${service.id}`)}
                  className="group relative rounded-2xl p-4 border transition-all duration-300 text-left overflow-hidden hover:shadow-lg"
                  style={{ borderColor: `${BLUE}15`, backgroundColor: 'white' }}
                >
                  <div className="w-10 h-10 rounded-lg flex items-center justify-center mb-3 transition-transform group-hover:scale-110"
                    style={{ backgroundColor: `${ORANGE}12` }}>
                    <Icon className="w-5 h-5" style={{ color: ORANGE }} />
                  </div>
                  
                  <h3 className="font-semibold text-sm mb-1" style={{ color: BLUE }}>
                    {service.title}
                  </h3>
                  <p className="text-xs text-muted-foreground mb-1">{service.description}</p>
                  {service.count > 0 && (
                    <span className="text-xs font-medium" style={{ color: ORANGE }}>{service.count} disponibles</span>
                  )}
                </button>
              );
            })}
          </div>
        </section>

        {/* Banner promotionnel */}
        <div className="relative overflow-hidden rounded-3xl p-6 text-white" style={{ backgroundColor: BLUE }}>
          <div className="absolute top-0 right-0 w-32 h-32 rounded-full -translate-y-1/2 translate-x-1/2" style={{ backgroundColor: 'rgba(255,255,255,0.1)' }} />
          <div className="absolute bottom-0 left-0 w-24 h-24 rounded-full translate-y-1/2 -translate-x-1/2" style={{ backgroundColor: 'rgba(255,255,255,0.1)' }} />
          
          <div className="relative z-10">
            <h3 className="text-xl font-bold mb-2">Devenez prestataire</h3>
            <p className="text-sm opacity-90 mb-4 max-w-md">
              Rejoignez 224Solutions et développez votre activité avec notre plateforme de services de proximité.
            </p>
            <button 
              onClick={() => navigate('/auth')}
              className="px-5 py-2.5 rounded-xl font-semibold text-sm hover:opacity-90 transition-colors shadow-lg"
              style={{ backgroundColor: ORANGE, color: 'white' }}
            >
              S'inscrire maintenant
            </button>
          </div>
        </div>
      </div>

      <QuickFooter />
    </div>
  );
}
