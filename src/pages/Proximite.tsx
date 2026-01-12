import { useState, useMemo, useEffect } from "react";
import { useNavigate } from "react-router-dom";
// Framer-motion supprimé pour réduire TBT de 914ms
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

/**
 * SERVICES POPULAIRES - Synchronisés avec Auth.tsx "Services de Proximité Populaires"
 * Ces services correspondent exactement aux boutons de sélection de type de service
 */
const getServiceCategories = (stats: any) => [
  // Ligne 1 - Services principaux (comme Auth.tsx)
  {
    id: "restaurant",
    title: "Restaurants",
    icon: Utensils,
    color: "from-red-500 to-red-600",
    bgColor: "bg-red-50",
    textColor: "text-red-600",
    count: stats.restaurant,
    path: "/services-proximite?type=restaurant",
    description: "Cuisine & plats",
    trending: stats.restaurant > 0
  },
  {
    id: "beaute",
    title: "Beauté & Coiffure",
    icon: Scissors,
    color: "from-pink-500 to-pink-600",
    bgColor: "bg-pink-50",
    textColor: "text-pink-600",
    count: stats.beaute,
    path: "/services-proximite?type=beaute",
    description: "Soins & styling"
  },
  {
    id: "vtc",
    title: "Transport VTC",
    icon: Car,
    color: "from-slate-600 to-slate-700",
    bgColor: "bg-slate-50",
    textColor: "text-slate-600",
    count: stats.vtc,
    path: "/taxi",
    description: "Véhicules privés"
  },
  {
    id: "reparation",
    title: "Réparation",
    icon: Wrench,
    color: "from-amber-500 to-amber-600",
    bgColor: "bg-amber-50",
    textColor: "text-amber-600",
    count: stats.reparation,
    path: "/services-proximite?type=reparation",
    description: "Électro & mécanique"
  },
  // Ligne 2 - Services complémentaires (comme Auth.tsx)
  {
    id: "menage",
    title: "Nettoyage",
    icon: Sparkles,
    color: "from-cyan-500 to-cyan-600",
    bgColor: "bg-cyan-50",
    textColor: "text-cyan-600",
    count: stats.nettoyage,
    path: "/services-proximite?type=menage",
    description: "Ménage & pressing"
  },
  {
    id: "informatique",
    title: "Informatique",
    icon: Laptop,
    color: "from-indigo-500 to-indigo-600",
    bgColor: "bg-indigo-50",
    textColor: "text-indigo-600",
    count: stats.informatique,
    path: "/services-proximite?type=informatique",
    description: "Tech & dépannage"
  },
  // Services supplémentaires pour la proximité (Boutiques, Taxi-Moto, Livraison)
  {
    id: "boutiques",
    title: "Boutiques",
    icon: Store,
    color: "from-blue-500 to-blue-600",
    bgColor: "bg-blue-50",
    textColor: "text-blue-600",
    count: stats.boutiques,
    path: "/proximite/boutiques",
    description: "Commerces locaux",
    trending: stats.boutiques > 5
  },
  {
    id: "livraison",
    title: "Livraison",
    icon: Package,
    color: "from-orange-500 to-orange-600",
    bgColor: "bg-orange-50",
    textColor: "text-orange-600",
    count: stats.livraison,
    path: "/proximite/livraison",
    description: "Colis & courses"
  }
];

// Interface pour les catégories avec comptage de produits
interface CategoryWithCount {
  id: string;
  name: string;
  image_url?: string;
  product_count: number;
}

/**
 * SERVICES PROFESSIONNELS - Synchronisés avec Auth.tsx "Services Professionnels"
 * Ces services correspondent exactement aux boutons de la section violette
 */
const getProfessionalServices = (stats: any) => [
  {
    id: "sport",
    title: "Sport & Fitness",
    icon: Dumbbell,
    color: "from-lime-500 to-lime-600",
    bgColor: "bg-lime-50",
    textColor: "text-lime-600",
    description: "Coaching & salles",
    count: stats.sport
  },
  {
    id: "location",
    title: "Immobilier",
    icon: Building2,
    color: "from-violet-500 to-violet-600",
    bgColor: "bg-violet-50",
    textColor: "text-violet-600",
    description: "Location & vente",
    count: stats.immobilier
  },
  {
    id: "media",
    title: "Photo & Vidéo",
    icon: Camera,
    color: "from-fuchsia-500 to-fuchsia-600",
    bgColor: "bg-fuchsia-50",
    textColor: "text-fuchsia-600",
    description: "Événements & création",
    count: stats.media
  },
  {
    id: "construction",
    title: "Construction & BTP",
    icon: Building2,
    color: "from-stone-500 to-stone-600",
    bgColor: "bg-stone-50",
    textColor: "text-stone-600",
    description: "Bâtiment & travaux",
    count: stats.construction
  },
  {
    id: "agriculture",
    title: "Agriculture",
    icon: ShoppingBag,
    color: "from-green-500 to-green-600",
    bgColor: "bg-green-50",
    textColor: "text-green-600",
    description: "Produits locaux",
    count: stats.agriculture
  },
  {
    id: "freelance",
    title: "Administratif",
    icon: ShoppingBag,
    color: "from-gray-500 to-gray-600",
    bgColor: "bg-gray-50",
    textColor: "text-gray-600",
    description: "Secrétariat & conseil",
    count: stats.freelance
  },
  {
    id: "sante",
    title: "Santé & Bien-être",
    icon: Heart,
    color: "from-rose-500 to-rose-600",
    bgColor: "bg-rose-50",
    textColor: "text-rose-600",
    description: "Pharmacie & soins",
    count: stats.sante
  },
  {
    id: "maison",
    title: "Maison & Déco",
    icon: Home,
    color: "from-teal-500 to-teal-600",
    bgColor: "bg-teal-50",
    textColor: "text-teal-600",
    description: "Intérieur & déco",
    count: stats.maison
  }
];

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.05 }
  }
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0 }
};

export default function Proximite() {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState("");
  const { stats, loading, userPosition, locationError, refresh, radiusKm } = useProximityStats();
  const { t } = useTranslation();
  const [productCategories, setProductCategories] = useState<CategoryWithCount[]>([]);
  const [loadingCategories, setLoadingCategories] = useState(true);

  // Charger uniquement les catégories qui contiennent des produits avec comptage
  useEffect(() => {
    const loadCategoriesWithProducts = async () => {
      try {
        console.log('📦 Chargement des catégories avec produits...');
        
        // D'abord récupérer tous les produits actifs avec leur category_id
        const { data: products, error: productsError } = await supabase
          .from('products')
          .select('id, category_id')
          .eq('is_active', true)
          .not('category_id', 'is', null);

        if (productsError) {
          console.error('Erreur produits:', productsError);
          throw productsError;
        }

        console.log('📦 Produits trouvés:', products?.length || 0);

        if (!products || products.length === 0) {
          setProductCategories([]);
          setLoadingCategories(false);
          return;
        }

        // Compter les produits par category_id
        const categoryCountMap = new Map<string, number>();
        products.forEach((product) => {
          if (product.category_id) {
            const count = categoryCountMap.get(product.category_id) || 0;
            categoryCountMap.set(product.category_id, count + 1);
          }
        });

        console.log('📦 Catégories avec produits:', categoryCountMap.size);

        // Récupérer les infos des catégories qui ont des produits
        const categoryIds = Array.from(categoryCountMap.keys());
        
        const { data: categories, error: categoriesError } = await supabase
          .from('categories')
          .select('id, name, image_url')
          .in('id', categoryIds);

        if (categoriesError) {
          console.error('Erreur catégories:', categoriesError);
          throw categoriesError;
        }

        console.log('📦 Catégories récupérées:', categories?.length || 0);

        // Combiner les données
        const categoriesWithProducts: CategoryWithCount[] = (categories || []).map((cat) => ({
          id: cat.id,
          name: cat.name,
          image_url: cat.image_url,
          product_count: categoryCountMap.get(cat.id) || 0
        })).sort((a, b) => b.product_count - a.product_count);

        console.log('📦 Catégories finales:', categoriesWithProducts);
        setProductCategories(categoriesWithProducts);
      } catch (error) {
        console.error('❌ Erreur chargement catégories:', error);
      } finally {
        setLoadingCategories(false);
      }
    };
    loadCategoriesWithProducts();
  }, []);

  // Memoize computed categories based on real stats
  const serviceCategories = useMemo(() => getServiceCategories(stats), [stats]);
  const professionalServices = useMemo(() => getProfessionalServices(stats), [stats]);

  const handleServiceClick = (path: string) => {
    navigate(path);
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-background via-background to-muted/30 pb-24">
      {/* Header avec recherche */}
      <div className="sticky top-0 z-40 bg-background/95 backdrop-blur-xl border-b border-border/50">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-primary/80 flex items-center justify-center shadow-lg">
                <MapPin className="w-5 h-5 text-primary-foreground" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-foreground">{t('home.nearbyServices')}</h1>
                <p className="text-xs text-muted-foreground">{t('proximity.mostRequested') || 'Tout ce dont vous avez besoin près de chez vous'}</p>
              </div>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={refresh}
              disabled={loading}
              className="rounded-full"
            >
              {loading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <RefreshCw className="w-5 h-5" />
              )}
            </Button>
          </div>

          {/* Location indicator */}
          <div className="flex items-center gap-2 mb-3 text-xs">
            <div className="flex items-center gap-1 px-2 py-1 rounded-full bg-primary/10 text-primary">
              <MapPin className="w-3 h-3" />
              <span>Rayon: {radiusKm} km</span>
            </div>
            {loading && (
              <span className="text-muted-foreground flex items-center gap-1">
                <Loader2 className="w-3 h-3 animate-spin" />
                {t('common.loading')}
              </span>
            )}
          </div>
          
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
            <Input
              placeholder={t('home.searchPlaceholder') || t('common.search') + '...'}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 h-12 rounded-xl bg-muted/50 border-0 focus-visible:ring-2 focus-visible:ring-primary/50"
            />
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-6 space-y-8">
        {/* Services principaux */}
        <section>
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-primary" />
                {t('home.popularServices') || t('proximity.popularServices')}
              </h2>
              <p className="text-sm text-muted-foreground">{t('proximity.mostRequested') || 'Les plus demandés près de vous'}</p>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
            {serviceCategories.map((service) => {
              const Icon = service.icon;
              return (
                <button
                  key={service.id}
                  onClick={() => handleServiceClick(service.path)}
                  className="group relative bg-card rounded-2xl p-4 border border-border/50 hover:border-primary/30 hover:shadow-lg transition-all duration-300 text-left overflow-hidden"
                >
                  {service.trending && (
                    <Badge className="absolute top-2 right-2 bg-primary/10 text-primary border-0 text-[10px] px-1.5">
                      {t('home.trending') || 'Tendance'}
                    </Badge>
                  )}
                  
                  <div className={cn(
                    "w-12 h-12 rounded-xl flex items-center justify-center mb-3 transition-transform group-hover:scale-110",
                    service.bgColor
                  )}>
                    <Icon className={cn("w-6 h-6", service.textColor)} />
                  </div>
                  
                  <h3 className="font-semibold text-foreground text-sm mb-1 group-hover:text-primary transition-colors">
                    {service.title}
                  </h3>
                  <p className="text-xs text-muted-foreground mb-2">{service.description}</p>
                  
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium text-primary">{service.count} {t('home.available') || 'disponibles'}</span>
                    <ArrowRight className="w-4 h-4 text-muted-foreground group-hover:text-primary group-hover:translate-x-1 transition-all" />
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
              <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
                <ShoppingBag className="w-5 h-5 text-primary" />
                {t('home.productCategories') || t('proximity.productCategories') || 'Catégories de Produits'}
              </h2>
              <p className="text-sm text-muted-foreground">{t('home.exploreByCategory') || t('proximity.exploreByCategory') || 'Explorez par catégorie'}</p>
            </div>
            <button 
              onClick={() => navigate('/marketplace')}
              className="text-sm text-primary font-medium flex items-center gap-1 hover:gap-2 transition-all"
            >
              {t('home.seeAll')} <ArrowRight className="w-4 h-4" />
            </button>
          </div>

          {loadingCategories ? (
            <div className="flex justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-primary" />
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
                  className="group bg-card rounded-2xl p-4 border border-border/50 hover:border-primary/30 hover:shadow-lg transition-all duration-300 text-left"
                >
                  <div className="w-10 h-10 rounded-lg flex items-center justify-center mb-3 transition-transform group-hover:scale-110 bg-primary/10">
                    <ShoppingBag className="w-5 h-5 text-primary" />
                  </div>
                  
                  <h3 className="font-semibold text-foreground text-sm mb-1 group-hover:text-primary transition-colors line-clamp-1">
                    {category.name}
                  </h3>
                  
                  <div className="flex items-center gap-1">
                    <span className="text-xs font-medium text-primary">{category.product_count}</span>
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
              <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
                <Star className="w-5 h-5 text-primary" />
                Services Professionnels
              </h2>
              <p className="text-sm text-muted-foreground">Experts qualifiés à votre service</p>
            </div>
            <button 
              onClick={() => navigate('/services-proximite')}
              className="text-sm text-primary font-medium flex items-center gap-1 hover:gap-2 transition-all"
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
                  className="group relative bg-gradient-to-br from-card to-muted/30 rounded-2xl p-4 border border-border/50 hover:border-primary/30 hover:shadow-lg transition-all duration-300 text-left overflow-hidden"
                >
                  <div className={cn(
                    "w-10 h-10 rounded-lg flex items-center justify-center mb-3 transition-transform group-hover:scale-110",
                    service.bgColor
                  )}>
                    <Icon className={cn("w-5 h-5", service.textColor)} />
                  </div>
                  
                  <h3 className="font-semibold text-foreground text-sm mb-1 group-hover:text-primary transition-colors">
                    {service.title}
                  </h3>
                  <p className="text-xs text-muted-foreground mb-1">{service.description}</p>
                  {service.count > 0 && (
                    <span className="text-xs font-medium text-primary">{service.count} disponibles</span>
                  )}
                </button>
              );
            })}
          </div>
        </section>

        {/* Banner promotionnel */}
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-primary via-primary/90 to-primary/80 p-6 text-primary-foreground">
          <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2" />
          <div className="absolute bottom-0 left-0 w-24 h-24 bg-white/10 rounded-full translate-y-1/2 -translate-x-1/2" />
          
          <div className="relative z-10">
            <h3 className="text-xl font-bold mb-2">Devenez prestataire</h3>
            <p className="text-sm opacity-90 mb-4 max-w-md">
              Rejoignez 224Solutions et développez votre activité avec notre plateforme de services de proximité.
            </p>
            <button 
              onClick={() => navigate('/auth')}
              className="bg-white text-primary px-5 py-2.5 rounded-xl font-semibold text-sm hover:bg-white/90 transition-colors shadow-lg"
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
