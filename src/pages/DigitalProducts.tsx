/**
 * Page Produits Numériques & Marketplace
 * Modules: Voyage, Logiciel, Formation, Livres, Produit custom
 * Note: Dropshipping retiré de l'UI mais authentification conservée
 */

import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Package, 
  Plane, 
  Monitor, 
  GraduationCap, 
  BookOpen, 
  ArrowLeft,
  Store,
  ShoppingBag,
  Bot,
  Search,
  Eye,
  ExternalLink,
  Star,
  ShoppingCart,
  Sparkles,
  TrendingUp,
  Users,
  Globe,
  ChevronRight,
  Zap
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import QuickFooter from '@/components/QuickFooter';
import { MerchantActivationDialog } from '@/components/digital-products/MerchantActivationDialog';
import { CategoryProductsList } from '@/components/digital-products/CategoryProductsList';
import { TravelModule } from '@/components/travel/TravelModule';
import { useTranslation } from '@/hooks/useTranslation';
import { useDigitalProducts } from '@/hooks/useDigitalProducts';
import { LocalPrice } from '@/components/ui/LocalPrice';

interface ProductModule {
  id: string;
  icon: React.ReactNode;
  titleKey: string;
  descriptionKey: string;
  gradient: string;
  category: 'dropshipping' | 'voyage' | 'logiciel' | 'formation' | 'livre' | 'custom' | 'ai' | 'physique_affilie';
  stats?: { label: string; value: string };
}

// Dropshipping retiré de l'affichage mais catégorie conservée pour l'auth
const productModules: ProductModule[] = [
  {
    id: 'voyage',
    icon: <Plane className="w-6 h-6" />,
    titleKey: 'digital.modules.flight',
    descriptionKey: 'digital.modules.flightDesc',
    gradient: 'from-sky-500 via-blue-500 to-indigo-600',
    category: 'voyage',
    stats: { label: 'Destinations', value: '190+' }
  },
  {
    id: 'logiciel',
    icon: <Monitor className="w-6 h-6" />,
    titleKey: 'digital.modules.software',
    descriptionKey: 'digital.modules.softwareDesc',
    gradient: 'from-violet-500 via-purple-500 to-fuchsia-600',
    category: 'logiciel',
    stats: { label: 'Apps', value: '500+' }
  },
  {
    id: 'formation',
    icon: <GraduationCap className="w-6 h-6" />,
    titleKey: 'digital.modules.training',
    descriptionKey: 'digital.modules.trainingDesc',
    gradient: 'from-emerald-500 via-green-500 to-teal-600',
    category: 'formation',
    stats: { label: 'Cours', value: '1K+' }
  },
  {
    id: 'livre',
    icon: <BookOpen className="w-6 h-6" />,
    titleKey: 'digital.modules.books',
    descriptionKey: 'digital.modules.booksDesc',
    gradient: 'from-amber-500 via-orange-500 to-yellow-600',
    category: 'livre',
    stats: { label: 'Ebooks', value: '2K+' }
  },
  {
    id: 'ai',
    icon: <Bot className="w-6 h-6" />,
    titleKey: 'digital.modules.ai',
    descriptionKey: 'digital.modules.aiDesc',
    gradient: 'from-pink-500 via-rose-500 to-red-600',
    category: 'ai',
    stats: { label: 'Outils IA', value: '50+' }
  },
  {
    id: 'physique_affilie',
    icon: <ShoppingBag className="w-6 h-6" />,
    titleKey: 'digital.modules.physicalAffiliate',
    descriptionKey: 'digital.modules.physicalAffiliateDesc',
    gradient: 'from-orange-500 via-red-500 to-rose-600',
    category: 'physique_affilie',
    stats: { label: 'Produits', value: '10K+' }
  }
];

export default function DigitalProducts() {
  const navigate = useNavigate();
  const { user, profile, loading } = useAuth();
  const { t } = useTranslation();
  const [showActivationDialog, setShowActivationDialog] = useState(false);
  const [selectedModule, setSelectedModule] = useState<ProductModule | null>(null);
  const [showCategoryProducts, setShowCategoryProducts] = useState(false);
  const [showTravelModule, setShowTravelModule] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const { products: allProducts, loading: productsLoading } = useDigitalProducts({ limit: 100 });

  const isMerchant = profile?.role === 'vendeur';

  // Filtrer les produits par recherche
  const filteredProducts = useMemo(() => {
    if (!searchQuery.trim()) return [];
    const query = searchQuery.toLowerCase().trim();
    return allProducts.filter(product => 
      product.title?.toLowerCase().includes(query) ||
      product.short_description?.toLowerCase().includes(query) ||
      product.description?.toLowerCase().includes(query)
    );
  }, [allProducts, searchQuery]);

  const isSearching = searchQuery.trim().length > 0;

  const handleModuleClick = (module: ProductModule) => {
    // Afficher directement les produits de la catégorie
    // Tous les modules fonctionnent de la même manière - les utilisateurs publient leurs liens d'affiliation
    setSelectedModule(module);
    setShowCategoryProducts(true);
  };

  const handleBecomeMerchant = () => {
    // Si pas connecté, rediriger vers auth
    if (!user) {
      toast.info(t('digital.loginRequired'));
      navigate('/auth', { state: { redirectTo: '/digital-products' } });
      return;
    }

    // Si connecté mais pas marchand, afficher dialog d'activation
    if (!isMerchant) {
      setShowActivationDialog(true);
      return;
    }

    // Si déjà marchand, rediriger vers la création de produit
    toast.info(t('digital.alreadyMerchant'));
  };

  const handleActivationSuccess = () => {
    setShowActivationDialog(false);
    if (selectedModule) {
      setShowCategoryProducts(true);
    }
  };

  const handleProductClick = (product: any) => {
    if (product.product_mode === 'affiliate' && product.affiliate_url) {
      window.open(product.affiliate_url, '_blank');
    } else {
      navigate(`/digital-product/${product.id}`);
    }
  };

  const getCategoryGradient = (category: string) => {
    const module = productModules.find(m => m.category === category);
    return module?.gradient || 'from-primary to-primary/80';
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  // Affichage du module voyage
  if (showTravelModule) {
    return <TravelModule onBack={() => setShowTravelModule(false)} />;
  }

  // Affichage des produits par catégorie
  if (showCategoryProducts && selectedModule) {
    return (
      <CategoryProductsList
        category={selectedModule.category}
        title={t(selectedModule.titleKey)}
        description={t(selectedModule.descriptionKey)}
        gradient={selectedModule.gradient}
        onBack={() => {
          setShowCategoryProducts(false);
          setSelectedModule(null);
        }}
      />
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-background via-background to-muted/30 pb-24">
      {/* Header Premium */}
      <header className="bg-gradient-to-r from-card via-card to-card/95 backdrop-blur-xl border-b border-border/50 sticky top-0 z-40 shadow-sm">
        <div className="px-4 py-3">
          <div className="flex items-center gap-3">
            <Button 
              variant="ghost" 
              size="icon"
              onClick={() => navigate('/')}
              className="shrink-0 hover:bg-muted/80"
            >
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <h1 className="text-lg font-bold text-foreground truncate">{t('digital.title')}</h1>
                <Badge variant="secondary" className="bg-primary/10 text-primary text-[10px] px-1.5">
                  <Sparkles className="w-3 h-3 mr-0.5" />
                  Pro
                </Badge>
              </div>
              <p className="text-[11px] text-muted-foreground truncate">
                {t('digital.subtitle')}
              </p>
            </div>
            {user && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigate('/marketplace?type=digital')}
                className="shrink-0 h-8 text-xs border-primary/30 hover:bg-primary/5"
              >
                <Store className="w-3.5 h-3.5 mr-1" />
                <span className="hidden xs:inline">{t('nav.marketplace')}</span>
              </Button>
            )}
          </div>
        </div>
      </header>

      {/* Hero Section Premium */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-purple-500/5 to-pink-500/5" />
        <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-bl from-primary/10 to-transparent rounded-full blur-3xl" />
        <div className="absolute bottom-0 left-0 w-48 h-48 bg-gradient-to-tr from-purple-500/10 to-transparent rounded-full blur-3xl" />
        
        <div className="relative px-4 py-6 sm:py-8">
          <div className="text-center max-w-md mx-auto">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-gradient-to-r from-primary/20 to-purple-500/20 backdrop-blur-sm rounded-full mb-4 border border-primary/20">
              <Zap className="w-3.5 h-3.5 text-primary" />
              <span className="text-xs font-semibold text-primary">{t('digital.marketplaceDigital')}</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-bold bg-gradient-to-r from-foreground via-foreground to-foreground/70 bg-clip-text text-transparent mb-3">
              {t('digital.discover')}
            </h2>
            <p className="text-sm text-muted-foreground leading-relaxed">
              {t('digital.discoverDesc')}
            </p>
          </div>

          {/* Stats rapides */}
          <div className="flex justify-center gap-6 mt-6">
            <div className="text-center">
              <div className="flex items-center justify-center gap-1 text-primary mb-1">
                <Users className="w-4 h-4" />
                <span className="text-lg font-bold">15K+</span>
              </div>
              <span className="text-[10px] text-muted-foreground">Utilisateurs</span>
            </div>
            <div className="h-8 w-px bg-border" />
            <div className="text-center">
              <div className="flex items-center justify-center gap-1 text-purple-500 mb-1">
                <Package className="w-4 h-4" />
                <span className="text-lg font-bold">5K+</span>
              </div>
              <span className="text-[10px] text-muted-foreground">Produits</span>
            </div>
            <div className="h-8 w-px bg-border" />
            <div className="text-center">
              <div className="flex items-center justify-center gap-1 text-green-500 mb-1">
                <Globe className="w-4 h-4" />
                <span className="text-lg font-bold">50+</span>
              </div>
              <span className="text-[10px] text-muted-foreground">Pays</span>
            </div>
          </div>
        </div>
      </section>

      {/* Barre de recherche Premium */}
      <section className="px-4 py-3 -mt-2">
        <div className="relative">
          <div className="absolute inset-0 bg-gradient-to-r from-primary/10 via-purple-500/10 to-pink-500/10 rounded-xl blur-sm" />
          <div className="relative bg-card/80 backdrop-blur-sm rounded-xl border border-border/50 shadow-sm">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Rechercher un produit numérique..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 h-11 bg-transparent border-0 focus-visible:ring-1 focus-visible:ring-primary/50"
            />
          </div>
        </div>
        {isSearching && (
          <p className="text-xs text-muted-foreground mt-2 ml-1">
            {filteredProducts.length} résultat{filteredProducts.length !== 1 ? 's' : ''} pour "{searchQuery}"
          </p>
        )}
      </section>

      {/* Résultats de recherche */}
      {isSearching ? (
        <section className="px-4 py-4">
          {productsLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
            </div>
          ) : filteredProducts.length === 0 ? (
            <div className="text-center py-12">
              <div className="w-16 h-16 mx-auto mb-4 rounded-2xl flex items-center justify-center bg-gradient-to-br from-muted to-muted/50">
                <Search className="w-8 h-8 text-muted-foreground" />
              </div>
              <h3 className="font-semibold text-foreground mb-2">
                Aucun résultat pour "{searchQuery}"
              </h3>
              <p className="text-sm text-muted-foreground mb-4">
                Essayez avec d'autres mots-clés
              </p>
              <Button variant="outline" onClick={() => setSearchQuery('')}>
                Effacer la recherche
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3">
              {filteredProducts.map((product) => (
                <Card 
                  key={product.id}
                  className="cursor-pointer overflow-hidden hover:shadow-xl transition-all duration-300 border-border/50 group"
                  onClick={() => handleProductClick(product)}
                >
                  <div className="relative aspect-square bg-muted overflow-hidden">
                    {product.images && product.images[0] ? (
                      <img 
                        src={product.images[0]} 
                        alt={product.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                    ) : (
                      <div className={cn(
                        'w-full h-full flex items-center justify-center',
                        'bg-gradient-to-br text-white/50',
                        getCategoryGradient(product.category)
                      )}>
                        <ShoppingCart className="w-10 h-10" />
                      </div>
                    )}
                    
                    {/* Badges */}
                    <div className="absolute top-2 left-2 flex flex-col gap-1">
                      {product.product_mode === 'affiliate' && (
                        <Badge variant="secondary" className="text-[10px] px-1.5 py-0.5 bg-background/90 backdrop-blur-sm">
                          <ExternalLink className="w-3 h-3 mr-1" />
                          Affilié
                        </Badge>
                      )}
                      {product.is_featured && (
                        <Badge className="text-[10px] px-1.5 py-0.5 bg-gradient-to-r from-amber-500 to-yellow-500 border-0">
                          <Star className="w-3 h-3 mr-1" />
                          Featured
                        </Badge>
                      )}
                    </div>
                  </div>

                  <CardContent className="p-3">
                    <h3 className="font-medium text-sm text-foreground line-clamp-2 mb-1">
                      {product.title}
                    </h3>
                    
                    {product.short_description && (
                      <p className="text-xs text-muted-foreground line-clamp-1 mb-2">
                        {product.short_description}
                      </p>
                    )}

                    <div className="flex items-center justify-between">
                      <LocalPrice 
                        amount={product.price} 
                        currency={product.currency || 'GNF'} 
                        size="sm"
                        className="font-bold text-primary"
                      />
                      <div className="flex items-center gap-1 text-muted-foreground">
                        <Eye className="w-3 h-3" />
                        <span className="text-xs">{product.views_count || 0}</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </section>
      ) : (
        <>
          {/* Status Banner Premium */}
          {user && !isMerchant && (
            <div className="mx-4 my-3 p-3 bg-gradient-to-r from-primary/10 via-purple-500/10 to-pink-500/10 rounded-xl border border-primary/20 backdrop-blur-sm">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-3 flex-1">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-purple-500 flex items-center justify-center shrink-0">
                    <TrendingUp className="w-5 h-5 text-white" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-foreground">{t('digital.wantToSell')}</p>
                    <p className="text-xs text-muted-foreground truncate">{t('digital.activateMerchant')}</p>
                  </div>
                </div>
                <Button
                  size="sm"
                  onClick={handleBecomeMerchant}
                  className="shrink-0 h-9 px-4 bg-gradient-to-r from-primary to-purple-600 hover:opacity-90 shadow-lg shadow-primary/25"
                >
                  <Sparkles className="w-3.5 h-3.5 mr-1.5" />
                  {t('digital.becomeMerchant')}
                </Button>
              </div>
            </div>
          )}

          {user && isMerchant && (
            <div className="mx-4 my-3 p-3 bg-gradient-to-r from-green-500/10 to-emerald-500/10 rounded-xl border border-green-500/20">
              <div className="flex items-center justify-center gap-2 text-green-600">
                <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                <Store className="w-4 h-4" />
                <span className="text-sm font-medium">{t('digital.merchantActive')}</span>
              </div>
            </div>
          )}

          {/* Section Titre */}
          <div className="px-4 pt-4 pb-2">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-foreground">Catégories</h3>
              <Badge variant="outline" className="text-[10px] text-muted-foreground">
                {productModules.length} disponibles
              </Badge>
            </div>
          </div>

          {/* Modules Grid Premium */}
          <section className="px-4 pb-6">
            <div className="grid grid-cols-2 gap-3">
              {productModules.map((module, index) => (
                <Card 
                  key={module.id}
                  className={cn(
                    'cursor-pointer overflow-hidden transition-all duration-300 group',
                    'hover:shadow-2xl hover:scale-[1.02] hover:-translate-y-0.5',
                    'border-0 bg-gradient-to-br from-card to-card/80',
                    'ring-1 ring-border/50 hover:ring-primary/30'
                  )}
                  onClick={() => handleModuleClick(module)}
                  style={{ animationDelay: `${index * 50}ms` }}
                >
                  <CardContent className="p-0">
                    {/* Gradient Header */}
                    <div className={cn(
                      'relative h-20 sm:h-24 bg-gradient-to-br flex items-center justify-center overflow-hidden',
                      module.gradient
                    )}>
                      {/* Decorative elements */}
                      <div className="absolute top-0 right-0 w-16 h-16 bg-white/10 rounded-full blur-xl" />
                      <div className="absolute bottom-0 left-0 w-12 h-12 bg-white/10 rounded-full blur-lg" />
                      
                      <div className="relative z-10 w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center border border-white/20 shadow-lg group-hover:scale-110 transition-transform duration-300">
                        <div className="text-white">
                          {module.icon}
                        </div>
                      </div>

                      {/* Stats Badge */}
                      {module.stats && (
                        <div className="absolute top-2 right-2 px-2 py-0.5 bg-white/20 backdrop-blur-sm rounded-full">
                          <span className="text-[9px] font-semibold text-white">
                            {module.stats.value}
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Content */}
                    <div className="p-3 sm:p-4">
                      <div className="flex items-start justify-between gap-1">
                        <h3 className="font-bold text-foreground text-sm line-clamp-1">
                          {t(module.titleKey)}
                        </h3>
                        <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0 group-hover:text-primary group-hover:translate-x-0.5 transition-all" />
                      </div>
                      <p className="text-[11px] text-muted-foreground line-clamp-2 mt-1 leading-relaxed">
                        {t(module.descriptionKey)}
                      </p>
                      
                      {/* Mini stats */}
                      {module.stats && (
                        <div className="mt-2 pt-2 border-t border-border/50">
                          <div className="flex items-center gap-1.5">
                            <TrendingUp className="w-3 h-3 text-green-500" />
                            <span className="text-[10px] text-muted-foreground">
                              {module.stats.label}: <span className="font-semibold text-foreground">{module.stats.value}</span>
                            </span>
                          </div>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </section>
        </>
      )}

      {/* Dialog d'activation marchand */}
      <MerchantActivationDialog
        open={showActivationDialog}
        onOpenChange={setShowActivationDialog}
        onSuccess={handleActivationSuccess}
      />

      <QuickFooter />
    </div>
  );
}
