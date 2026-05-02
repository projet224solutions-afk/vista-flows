import { useState, useMemo, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  Store,
  Truck,
  Scissors,
  Utensils,
  Bike,
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
import { _Badge } from "@/components/ui/badge";
import { _cn } from "@/lib/utils";
import QuickFooter from "@/components/QuickFooter";
import { useProximityStats } from "@/hooks/useProximityStats";
import { Button } from "@/components/ui/button";
import { useTranslation } from "@/hooks/useTranslation";
import { supabase } from "@/integrations/supabase/client";

// Couleurs de la charte : Bleu #04439e, Orange #ff4000, Noir #000000
const BLUE = "#04439e";
const ORANGE = "#ff4000";
const _BLACK = "#000000";

interface ServiceCardItem {
  id: string;
  title: string;
  icon: any;
  count: number;
  path: string;
  description: string;
  image: string;
  logoImage?: string;
  overlayGradient?: string;
  accent: string;
  trending?: boolean;
}

const getPriorityServices = (stats: any): ServiceCardItem[] => [
  {
    id: "boutique",
    title: "Boutique",
    icon: Store,
    count: stats.boutiques,
    path: "/proximite/boutiques",
    description: "Commerces & achats locaux",
    image: "https://images.unsplash.com/photo-1441986300917-64674bd600d8?auto=format&fit=crop&w=800&q=80",
    logoImage: "/service-icons/logo-boutique.jpeg",
    accent: "#04439e"
  },
  {
    id: "restaurant",
    title: "Restaurant",
    icon: Utensils,
    count: stats.restaurant,
    path: "/services-proximite?type=restaurant",
    description: "Cuisine & plats",
    image: "https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&w=800&q=80",
    logoImage: "/service-icons/logo-resto.jpeg",
    accent: "#e85d04"
  },
  {
    id: "reparation",
    title: "Réparation",
    icon: Wrench,
    count: stats.reparation,
    path: "/services-proximite?type=reparation",
    description: "Électro & mécanique",
    image: "https://images.unsplash.com/photo-1581092580497-e0d23cbdf1dc?auto=format&fit=crop&w=800&q=80",
    accent: "#b45309"
  },
  {
    id: "immobilier",
    title: "Immobilier",
    icon: Building2,
    count: stats.immobilier,
    path: "/services-proximite?type=location",
    description: "Location & vente",
    image: "https://images.unsplash.com/photo-1600585154526-990dced4db0d?auto=format&fit=crop&w=1200&q=80",
    logoImage: "/service-icons/logo-immobilier.jpeg",
    overlayGradient: "linear-gradient(120deg,rgba(3,105,161,0.18) 0%,rgba(191,219,254,0.68) 100%)",
    accent: "#0369a1"
  },
  {
    id: "sante",
    title: "Santé & Bien-être",
    icon: Heart,
    count: stats.sante,
    path: "/services-proximite?type=sante",
    description: "Pharmacie & soins",
    image: "https://images.unsplash.com/photo-1576091160550-2173dba999ef?auto=format&fit=crop&w=800&q=80",
    logoImage: "/service-icons/logo-sante-bien-etre.svg",
    accent: "#dc2626"
  },
  {
    id: "construction",
    title: "Construction & BTP",
    icon: Building2,
    count: stats.construction,
    path: "/services-proximite?type=construction",
    description: "Bâtiment & travaux",
    image: "https://images.unsplash.com/photo-1504307651254-35680f356dfd?auto=format&fit=crop&w=800&q=80",
    logoImage: "/service-icons/logo-construction-btp.jpeg",
    accent: "#b45309"
  },
  {
    id: "media",
    title: "Photo & Vidéo",
    icon: Camera,
    count: stats.media,
    path: "/services-proximite?type=media",
    description: "Événements & création",
    image: "https://images.unsplash.com/photo-1598488035139-bdbb2231ce04?auto=format&fit=crop&w=800&q=80",
    logoImage: "/service-icons/logo-photo-video.svg",
    accent: "#9333ea"
  },
  {
    id: "informatique",
    title: "Informatique",
    icon: Laptop,
    count: stats.informatique,
    path: "/services-proximite?type=informatique",
    description: "Tech & dépannage",
    image: "https://images.unsplash.com/photo-1518770660439-4636190af475?auto=format&fit=crop&w=800&q=80",
    logoImage: "/service-icons/logo-informatique.svg",
    accent: "#7c3aed"
  }
];

const getQuickAccessServices = (stats: any): ServiceCardItem[] => [
  {
    id: "vtc",
    title: "Taxi Moto",
    icon: Bike,
    count: stats.vtc,
    path: "/taxi",
    description: "Déplacements à proximité",
    image: "https://images.unsplash.com/photo-1549317661-bd32c8ce0db2?auto=format&fit=crop&w=800&q=80",
    accent: "#1d4ed8"
  },
  {
    id: "livraison",
    title: "Livreur",
    icon: Truck,
    count: stats.livraison,
    path: "/proximite/livraison",
    description: "Courses & colis rapides",
    trending: stats.livraison > 5,
    image: "https://images.unsplash.com/photo-1566576912321-d58ddd7a6088?auto=format&fit=crop&w=800&q=80",
    accent: "#ff4000"
  }
];

const getComplementaryServices = (stats: any): ServiceCardItem[] => [
  {
    id: "beaute",
    title: "Beauté & Bien-être",
    icon: Scissors,
    description: "Soins & styling",
    count: stats.beaute,
    path: "/services-proximite?type=beaute",
    image: "https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?auto=format&fit=crop&w=800&q=80",
    accent: "#d63384"
  },
  {
    id: "nettoyage",
    title: "Nettoyage",
    icon: Sparkles,
    description: "Ménage & pressing",
    count: stats.nettoyage,
    path: "/services-proximite?type=menage",
    image: "https://images.unsplash.com/photo-1581578731548-c64695cc6952?auto=format&fit=crop&w=800&q=80",
    accent: "#0891b2"
  },
  {
    id: "sport",
    title: "Sport & Fitness",
    icon: Dumbbell,
    description: "Coaching & salles",
    count: stats.sport,
    path: "/services-proximite?type=sport",
    image: "https://images.unsplash.com/photo-1534438327276-14e5300c3a48?auto=format&fit=crop&w=800&q=80",
    accent: "#16a34a"
  },
  {
    id: "agriculture",
    title: "Agriculture",
    icon: ShoppingBag,
    description: "Produits locaux",
    count: stats.agriculture,
    path: "/services-proximite?type=agriculture",
    image: "https://images.unsplash.com/photo-1500937386664-56d1dfef3854?auto=format&fit=crop&w=800&q=80",
    accent: "#15803d"
  },
  {
    id: "freelance",
    title: "Administratif",
    icon: ShoppingBag,
    description: "Secrétariat & conseil",
    count: stats.freelance,
    path: "/services-proximite?type=freelance",
    image: "https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?auto=format&fit=crop&w=800&q=80",
    accent: "#1d4ed8"
  },
  {
    id: "maison",
    title: "Maison & Déco",
    icon: Home,
    description: "Intérieur & déco",
    count: stats.maison,
    path: "/services-proximite?type=maison",
    image: "https://images.unsplash.com/photo-1586023492125-27b2c045efd7?auto=format&fit=crop&w=800&q=80",
    accent: "#c2410c"
  }
];

interface CategoryWithCount {
  id: string;
  name: string;
  image_url: string | null;
  product_count: number;
}

export default function Proximite() {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { stats, loading, refresh, radiusKm, usingRealLocation, debugInfo } = useProximityStats();
  const [searchQuery, setSearchQuery] = useState("");
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
        console.error('Erreur chargement catégories:', error);
      } finally {
        setLoadingCategories(false);
      }
    };
    loadCategoriesWithProducts();
  }, []);

  const priorityServices = useMemo(() => getPriorityServices(stats), [stats]);
  const quickAccessServices = useMemo(() => getQuickAccessServices(stats), [stats]);
  const complementaryServices = useMemo(() => getComplementaryServices(stats), [stats]);

  const handleServiceClick = (path: string) => {
    navigate(path);
  };

  return (
    <div className="min-h-screen pb-24" style={{ background: 'linear-gradient(180deg,#f0f5ff 0%,#eef3fb 60%,#f7faff 100%)' }}>
      {/* HERO HEADER */}
      <div
        className="relative overflow-hidden"
        style={{ background: 'linear-gradient(135deg,#04439e 0%,#0d4fb3 55%,#0b1b33 100%)' }}
      >
        {/* Cercles décoratifs */}
        <div className="absolute -top-10 -right-10 w-56 h-56 rounded-full opacity-10" style={{ background: 'radial-gradient(circle,#fff,transparent)' }} />
        <div className="absolute -bottom-8 -left-8 w-40 h-40 rounded-full opacity-10" style={{ background: 'radial-gradient(circle,#ff4000,transparent)' }} />

        <div className="relative z-10 max-w-7xl mx-auto px-4 pt-6 pb-5">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-2xl flex items-center justify-center shadow-lg" style={{ backgroundColor: ORANGE }}>
                <MapPin className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-white">{t('home.nearbyServices')}</h1>
                <p className="text-xs text-white/70">{t('proximity.mostRequested') || 'Les plus demandés près de vous'}</p>
              </div>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={refresh}
              disabled={loading}
              className="rounded-full text-white/80 hover:text-white hover:bg-white/10"
            >
              {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <RefreshCw className="w-5 h-5" />}
            </Button>
          </div>

          {/* Badges GPS / rayon */}
          <div className="flex items-center gap-2 mb-4 text-xs flex-wrap">
            <button
              onClick={() => setShowDebug(!showDebug)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full font-medium transition-colors"
              style={{
                backgroundColor: usingRealLocation ? 'rgba(22,163,74,0.25)' : 'rgba(234,179,8,0.2)',
                color: usingRealLocation ? '#4ade80' : '#fbbf24'
              }}
            >
              <MapPin className="w-3 h-3" />
              {usingRealLocation ? 'GPS actif' : 'GPS désactivé'}
            </button>
            <div className="flex items-center gap-1 px-3 py-1.5 rounded-full font-medium" style={{ backgroundColor: 'rgba(255,255,255,0.12)', color: 'rgba(255,255,255,0.85)' }}>
              Rayon: {radiusKm} km
            </div>
            {loading && (
              <span className="flex items-center gap-1 text-white/60">
                <Loader2 className="w-3 h-3 animate-spin" />
                {t('common.loading')}
              </span>
            )}
          </div>

          {/* Debug Panel */}
          {showDebug && debugInfo && (
            <div className="mb-4 p-3 rounded-2xl border text-xs space-y-2 backdrop-blur-sm" style={{ backgroundColor: 'rgba(255,255,255,0.08)', borderColor: 'rgba(255,255,255,0.14)' }}>
              <div className="font-semibold text-white flex items-center gap-2">Debug GPS & Rayon {radiusKm}km</div>
              <div className="grid grid-cols-2 gap-2 text-white/80">
                <div>
                  <span>Position:</span>
                  <div className="font-mono text-[10px] text-white/60">{debugInfo.positionUsed.latitude.toFixed(5)}, {debugInfo.positionUsed.longitude.toFixed(5)}</div>
                </div>
                <div>
                  <span>Source:</span>
                  <div className="font-medium" style={{ color: debugInfo.usingRealGps ? '#4ade80' : '#fbbf24' }}>
                    {debugInfo.usingRealGps ? 'GPS réel' : 'Défaut (Coyah)'}
                  </div>
                </div>
              </div>
              <div className="border-t pt-2 grid grid-cols-2 sm:grid-cols-4 gap-2" style={{ borderColor: 'rgba(255,255,255,0.1)' }}>
                {[
                  { label: 'Boutiques', data: debugInfo.vendors },
                  { label: 'Services Pro', data: debugInfo.services },
                  { label: 'Taxi-Moto', data: debugInfo.taxiMoto },
                  { label: 'Livreurs', data: debugInfo.drivers }
                ].map(item => (
                  <div key={item.label} className="rounded-lg p-2" style={{ backgroundColor: 'rgba(255,255,255,0.06)' }}>
                    <div className="font-medium text-white">{item.label}</div>
                    <div className="text-[10px] text-white/60">
                      Total: {item.data.total} | Rayon: {item.data.inRadius}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Search bar */}
          <div className="relative">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-white/50" />
            <Input
              placeholder={t('home.searchPlaceholder') || 'Rechercher un service ou produit...'}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 h-12 rounded-2xl border-0 text-white placeholder:text-white/45 focus-visible:ring-1 focus-visible:ring-white/30"
              style={{ backgroundColor: 'rgba(255,255,255,0.12)' }}
            />
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-6 space-y-8">

        {/* SERVICES POPULAIRES */}
        <section>
          <div className="flex items-center gap-2 mb-4">
            <TrendingUp className="w-5 h-5" style={{ color: ORANGE }} />
            <div>
              <h2 className="text-base font-bold" style={{ color: BLUE }}>Services de Proximité Populaires</h2>
              <p className="text-xs" style={{ color: '#5f78a5' }}>Les plus demandés près de vous, dans le bon ordre</p>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-3">
            {priorityServices.slice(0, 4).map((service) => {
              const Icon = service.icon;
              return (
                <button
                  key={service.id}
                  onClick={() => handleServiceClick(service.path)}
                  className="group relative overflow-hidden rounded-[20px] text-left transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_16px_40px_rgba(4,67,158,0.18)]"
                  style={{ minHeight: 160 }}
                >
                  {/* Image */}
                  <img
                    src={service.image}
                    alt={service.title}
                    className="absolute inset-0 h-full w-full object-cover transition-transform duration-500 group-hover:scale-110"
                    loading="lazy"
                  />
                  {/* Dynamic accent gradient overlay */}
                  <div
                    className="absolute inset-0 pointer-events-none"
                    style={{
                      background: service.overlayGradient || `linear-gradient(120deg,${service.accent}33 0%,rgba(11,27,51,0.80) 100%)`
                    }}
                  />
                  {/* Content */}
                  <div className="relative z-10 flex h-full flex-col justify-end p-3.5" style={{ minHeight: 160 }}>
                    <div className="mb-2 flex h-10 w-10 items-center justify-center overflow-hidden rounded-xl bg-white/90 shadow-md">
                      {service.logoImage ? (
                        <img src={service.logoImage} alt={service.title} className="h-full w-full object-cover" loading="lazy" />
                      ) : (
                        <Icon className="h-5 w-5" style={{ color: service.accent }} />
                      )}
                    </div>
                    <h3 className="text-sm font-bold text-white leading-tight">{service.title}</h3>
                    <p className="text-[11px] text-white/70 mt-0.5">{service.description}</p>
                    <span className="mt-1.5 inline-block text-[11px] font-semibold" style={{ color: service.count > 0 ? '#4ade80' : 'rgba(255,255,255,0.5)' }}>
                      {service.count} disponibles
                    </span>
                  </div>
                </button>
              );
            })}
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {priorityServices.slice(4).map((service) => {
              const Icon = service.icon;
              return (
                <button
                  key={service.id}
                  onClick={() => handleServiceClick(service.path)}
                  className="group relative overflow-hidden rounded-[20px] text-left transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_16px_40px_rgba(4,67,158,0.18)]"
                  style={{ minHeight: 160 }}
                >
                  <img src={service.image} alt={service.title} className="absolute inset-0 h-full w-full object-cover transition-transform duration-500 group-hover:scale-110" loading="lazy" />
                  <div
                    className="absolute inset-0 pointer-events-none"
                    style={{
                      background: service.overlayGradient || `linear-gradient(120deg,${service.accent}33 0%,rgba(11,27,51,0.80) 100%)`
                    }}
                  />
                  <div className="relative z-10 flex h-full flex-col justify-end p-3.5" style={{ minHeight: 160 }}>
                    <div className="mb-2 flex h-10 w-10 items-center justify-center overflow-hidden rounded-xl bg-white/90 shadow-md">
                      {service.logoImage ? (
                        <img src={service.logoImage} alt={service.title} className="h-full w-full object-cover" loading="lazy" />
                      ) : (
                        <Icon className="h-5 w-5" style={{ color: service.accent }} />
                      )}
                    </div>
                    <h3 className="text-sm font-bold text-white leading-tight">{service.title}</h3>
                    <p className="text-[11px] text-white/70 mt-0.5">{service.description}</p>
                    <span className="mt-1.5 inline-block text-[11px] font-semibold" style={{ color: service.count > 0 ? '#4ade80' : 'rgba(255,255,255,0.5)' }}>
                      {service.count} disponibles
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        </section>

        {/* ACCÈS RAPIDE */}
        <section>
          <div className="flex items-center gap-2 mb-4">
            <Store className="w-5 h-5" style={{ color: BLUE }} />
            <div>
              <h2 className="text-base font-bold" style={{ color: BLUE }}>Accès rapide</h2>
              <p className="text-xs" style={{ color: '#5f78a5' }}>Livraison et déplacements à proximité</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            {quickAccessServices.map((service) => {
              const Icon = service.icon;
              return (
                <button
                  key={service.id}
                  onClick={() => handleServiceClick(service.path)}
                  className="group relative overflow-hidden rounded-[20px] text-left transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_16px_40px_rgba(4,67,158,0.18)]"
                  style={{ minHeight: 160 }}
                >
                  <img src={service.image} alt={service.title} className="absolute inset-0 h-full w-full object-cover transition-transform duration-500 group-hover:scale-110" loading="lazy" />
                  <div
                    className="absolute inset-0 pointer-events-none"
                    style={{
                      background: `linear-gradient(120deg,${service.accent}33 0%,rgba(11,27,51,0.78) 100%)`
                    }}
                  />
                  {service.trending && (
                    <div className="absolute top-2.5 right-2.5 z-10 rounded-full px-2 py-0.5 text-[10px] font-bold" style={{ backgroundColor: ORANGE, color: 'white' }}>
                      Tendance
                    </div>
                  )}
                  <div className="relative z-10 flex h-full flex-col justify-end p-3.5" style={{ minHeight: 160 }}>
                    <div className="mb-2 flex h-10 w-10 items-center justify-center overflow-hidden rounded-xl bg-white/90 shadow-md">
                      {service.logoImage ? (
                        <img src={service.logoImage} alt={service.title} className="h-full w-full object-cover" loading="lazy" />
                      ) : (
                        <Icon className="h-5 w-5" style={{ color: service.accent }} />
                      )}
                    </div>
                    <h3 className="text-sm font-bold text-white leading-tight">{service.title}</h3>
                    <p className="text-[11px] text-white/70 mt-0.5">{service.description}</p>
                    <span className="mt-1.5 inline-block text-[11px] font-semibold" style={{ color: service.count > 0 ? '#4ade80' : 'rgba(255,255,255,0.5)' }}>
                      {service.count} disponibles
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        </section>

        {/* CATÉGORIES DE PRODUITS */}
        <section>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <ShoppingBag className="w-5 h-5" style={{ color: BLUE }} />
              <div>
                <h2 className="text-base font-bold" style={{ color: BLUE }}>{t('home.productCategories') || 'Catégories de produits'}</h2>
                <p className="text-xs" style={{ color: '#5f78a5' }}>{t('home.exploreByCategory') || 'Explorez par catégorie'}</p>
              </div>
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
            <div className="text-center py-8" style={{ color: '#5f78a5' }}>
              <ShoppingBag className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p className="text-sm">Aucune catégorie avec des produits pour le moment</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {productCategories.slice(0, 8).map((category) => (
                <button
                  key={category.id}
                  onClick={() => navigate(`/marketplace?category=${category.id}&includePhysical=1`)}
                  className="group relative overflow-hidden rounded-[20px] text-left transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_16px_40px_rgba(4,67,158,0.18)]"
                  style={{ minHeight: 130 }}
                >
                  {category.image_url ? (
                    <img src={category.image_url} alt={category.name} className="absolute inset-0 h-full w-full object-cover transition-transform duration-500 group-hover:scale-110" loading="lazy" />
                  ) : (
                    <div className="absolute inset-0" style={{ background: 'linear-gradient(135deg,#04439e,#0d4fb3)' }} />
                  )}
                  <div className="absolute inset-0" style={{ background: 'linear-gradient(180deg,rgba(11,27,51,0.05) 0%,rgba(11,27,51,0.78) 100%)' }} />
                  <div className="relative z-10 flex h-full flex-col justify-end p-3" style={{ minHeight: 130 }}>
                    <h3 className="text-sm font-bold text-white leading-tight line-clamp-1">{category.name}</h3>
                    <div className="mt-0.5 flex items-center gap-1">
                      <span className="text-xs font-semibold" style={{ color: '#4ade80' }}>{category.product_count}</span>
                      <span className="text-[11px] text-white/60">{category.product_count > 1 ? 'articles' : 'article'}</span>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </section>

        {/* SERVICES COMPLÉMENTAIRES */}
        <section>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Star className="w-5 h-5" style={{ color: ORANGE }} />
              <div>
                <h2 className="text-base font-bold" style={{ color: BLUE }}>Autres services disponibles</h2>
                <p className="text-xs" style={{ color: '#5f78a5' }}>Des services complémentaires bien organisés</p>
              </div>
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
            {complementaryServices.map((service) => {
              const Icon = service.icon;
              return (
                <button
                  key={service.id}
                  onClick={() => navigate(service.path)}
                  className="group relative overflow-hidden rounded-[20px] text-left transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_16px_40px_rgba(4,67,158,0.18)]"
                  style={{ minHeight: 150 }}
                >
                  <img src={service.image} alt={service.title} className="absolute inset-0 h-full w-full object-cover transition-transform duration-500 group-hover:scale-110" loading="lazy" />
                  <div
                    className="absolute inset-0 pointer-events-none"
                    style={{
                      background: `linear-gradient(120deg,${service.accent}33 0%,rgba(11,27,51,0.82) 100%)`
                    }}
                  />
                  <div className="relative z-10 flex h-full flex-col justify-end p-3.5" style={{ minHeight: 150 }}>
                    <div className="mb-1.5 flex h-9 w-9 items-center justify-center overflow-hidden rounded-xl bg-white/90 shadow-md">
                      {service.logoImage ? (
                        <img src={service.logoImage} alt={service.title} className="h-full w-full object-cover" loading="lazy" />
                      ) : (
                        <Icon className="h-4.5 w-4.5" style={{ color: service.accent }} />
                      )}
                    </div>
                    <h3 className="text-sm font-bold text-white leading-tight">{service.title}</h3>
                    <p className="text-[11px] text-white/65 mt-0.5">{service.description}</p>
                    {service.count > 0 && (
                      <span className="mt-1 text-[11px] font-semibold" style={{ color: '#4ade80' }}>{service.count} disponibles</span>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </section>

        {/* BANNIÈRE PROMOTIONNELLE */}
        <div className="relative overflow-hidden rounded-3xl p-6 text-white" style={{ background: 'linear-gradient(135deg,#04439e 0%,#0b1b33 100%)' }}>
          <div className="absolute -top-8 -right-8 w-40 h-40 rounded-full opacity-10" style={{ background: 'radial-gradient(circle,#fff,transparent)' }} />
          <div className="absolute -bottom-6 -left-6 w-28 h-28 rounded-full opacity-10" style={{ background: 'radial-gradient(circle,#ff4000,transparent)' }} />
          <div className="relative z-10">
            <h3 className="text-xl font-bold mb-2">Devenez prestataire</h3>
            <p className="text-sm opacity-85 mb-4 max-w-md">
              Rejoignez 224Solutions et développez votre activité avec notre plateforme de services de proximité.
            </p>
            <button
              onClick={() => navigate('/auth')}
              className="px-5 py-2.5 rounded-xl font-semibold text-sm hover:opacity-90 transition-opacity shadow-lg"
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
