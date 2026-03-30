/**
 * Page Produits Numériques & Marketplace
 * Modules: Voyage, Logiciel, Formation, Livres, Dropshipping, Produit custom
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
  Box
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
  iconColor: string;
  coverImage: string;
  category: 'dropshipping' | 'voyage' | 'logiciel' | 'formation' | 'livre' | 'custom' | 'ai' | 'physique_affilie';
}

const productModules: ProductModule[] = [
  {
    id: 'dropshipping',
    icon: <Box className="w-7 h-7" />,
    titleKey: 'digital.modules.dropshipping',
    descriptionKey: 'digital.modules.dropshippingDesc',
    gradient: 'bg-[#1f2a44]',
    iconColor: 'text-[#2f4a83]',
    coverImage: 'https://images.unsplash.com/photo-1556740738-b6a63e27c4df?auto=format&fit=crop&w=1200&q=80',
    category: 'dropshipping'
  },
  {
    id: 'voyage',
    icon: <Plane className="w-7 h-7" />,
    titleKey: 'digital.modules.flight',
    descriptionKey: 'digital.modules.flightDesc',
    gradient: 'bg-[#0d3b8f]',
    iconColor: 'text-[#1f61d5]',
    coverImage: 'https://images.unsplash.com/photo-1436491865332-7a61a109cc05?auto=format&fit=crop&w=1200&q=80',
    category: 'voyage'
  },
  {
    id: 'logiciel',
    icon: <Monitor className="w-7 h-7" />,
    titleKey: 'digital.modules.software',
    descriptionKey: 'digital.modules.softwareDesc',
    gradient: 'bg-[#2a2f78]',
    iconColor: 'text-[#4f5bd5]',
    coverImage: 'https://images.unsplash.com/photo-1518770660439-4636190af475?auto=format&fit=crop&w=1200&q=80',
    category: 'logiciel'
  },
  {
    id: 'formation',
    icon: <GraduationCap className="w-7 h-7" />,
    titleKey: 'digital.modules.training',
    descriptionKey: 'digital.modules.trainingDesc',
    gradient: 'bg-[#135d3b]',
    iconColor: 'text-[#22c55e]',
    coverImage: 'https://images.unsplash.com/photo-1523240795612-9a054b0db644?auto=format&fit=crop&w=1200&q=80',
    category: 'formation'
  },
  {
    id: 'livre',
    icon: <BookOpen className="w-7 h-7" />,
    titleKey: 'digital.modules.books',
    descriptionKey: 'digital.modules.booksDesc',
    gradient: 'bg-[#6a4a12]',
    iconColor: 'text-[#f59e0b]',
    coverImage: 'https://images.unsplash.com/photo-1512820790803-83ca734da794?auto=format&fit=crop&w=1200&q=80',
    category: 'livre'
  },
  {
    id: 'ai',
    icon: <Bot className="w-7 h-7" />,
    titleKey: 'digital.modules.ai',
    descriptionKey: 'digital.modules.aiDesc',
    gradient: 'bg-[#3c2b7a]',
    iconColor: 'text-[#8b5cf6]',
    coverImage: 'https://images.unsplash.com/photo-1677442136019-21780ecad995?auto=format&fit=crop&w=1200&q=80',
    category: 'ai'
  },
  {
    id: 'physique_affilie',
    icon: <ShoppingBag className="w-7 h-7" />,
    titleKey: 'digital.modules.physicalAffiliate',
    descriptionKey: 'digital.modules.physicalAffiliateDesc',
    gradient: 'bg-[#8a2f0a]',
    iconColor: 'text-[#fb923c]',
    coverImage: 'https://images.unsplash.com/photo-1553413077-190dd305871c?auto=format&fit=crop&w=1200&q=80',
    category: 'physique_affilie'
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

    // Si le profil est encore en chargement, attendre
    if (!profile) {
      toast.info('Chargement de votre profil en cours...');
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
    return module?.gradient || 'bg-[#04439e]';
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
    <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,rgba(4,67,158,0.10),transparent_28%),linear-gradient(180deg,#f4f8ff_0%,#eef4ff_42%,#f7faff_100%)] pb-24">
      {/* Header */}
      <header className="bg-card/95 backdrop-blur-md border-b border-border sticky top-0 z-40">
        <div className="px-4 py-3">
          <div className="flex items-center gap-3">
            <Button 
              variant="ghost" 
              size="icon"
              onClick={() => navigate('/')}
              className="shrink-0"
            >
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div className="flex-1">
              <h1 className="text-lg font-bold text-foreground">{t('digital.title')}</h1>
              <p className="text-xs text-muted-foreground">
                {t('digital.subtitle')}
              </p>
            </div>
            {user && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigate('/marketplace?type=digital')}
                className="shrink-0"
              >
                <Store className="w-4 h-4 mr-1.5" />
                {t('nav.marketplace')}
              </Button>
            )}
          </div>
        </div>
      </header>

      {/* Barre de recherche */}
      <section className="px-4 py-3 border-b border-border">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            type="text"
            placeholder="Rechercher un produit numérique..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 h-10 bg-muted/50 border-border"
          />
        </div>
        {isSearching && (
          <p className="text-xs text-muted-foreground mt-2">
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
              <div className="w-16 h-16 mx-auto mb-4 rounded-2xl flex items-center justify-center bg-muted">
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
                  className="cursor-pointer overflow-hidden hover:shadow-lg transition-all duration-200"
                  onClick={() => handleProductClick(product)}
                >
                  <div className="relative aspect-square bg-muted">
                    {product.images && product.images[0] ? (
                      <img 
                        src={product.images[0]} 
                        alt={product.title}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className={cn(
                        'w-full h-full flex items-center justify-center',
                        'text-white/50',
                        getCategoryGradient(product.category)
                      )}>
                        <ShoppingCart className="w-10 h-10" />
                      </div>
                    )}
                    
                    {/* Badges */}
                    <div className="absolute top-2 left-2 flex flex-col gap-1">
                      {product.product_mode === 'affiliate' && (
                        <Badge variant="secondary" className="text-[10px] px-1.5 py-0.5">
                          <ExternalLink className="w-3 h-3 mr-1" />
                          Affilié
                        </Badge>
                      )}
                      {product.is_featured && (
                        <Badge className="text-[10px] px-1.5 py-0.5 bg-yellow-500">
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
          {/* Status Banner */}
          {user && !isMerchant && (
            <div className="mx-4 mt-4 rounded-2xl border border-[#04439e]/25 bg-[linear-gradient(135deg,rgba(4,67,158,0.12),rgba(4,67,158,0.04))] px-4 py-3 shadow-[0_12px_28px_rgba(4,67,158,0.10)]">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2 flex-1">
                  <Store className="w-4 h-4 text-[#04439e] shrink-0" />
                  <div className="text-xs">
                    <p className="font-semibold text-[#0b1b33]">{t('digital.wantToSell')}</p>
                    <p className="text-[#5673a7]">{t('digital.activateMerchant')}</p>
                  </div>
                </div>
                <Button
                  size="sm"
                  onClick={handleBecomeMerchant}
                  className="shrink-0 h-8 text-xs bg-[#04439e] text-white hover:bg-[#05378a]"
                >
                  {t('digital.becomeMerchant')}
                </Button>
              </div>
            </div>
          )}

          {user && isMerchant && (
            <div className="mx-4 mt-4 rounded-2xl px-4 py-3 bg-[#04439e] text-white border border-[#04439e]/30 text-center text-sm shadow-[0_12px_28px_rgba(4,67,158,0.25)]">
              <span className="flex items-center justify-center gap-2 font-bold">
                <Store className="w-4 h-4" />
                {t('digital.merchantActive')}
              </span>
            </div>
          )}

          {/* Hero Section */}
          <section className="px-4 pt-6 pb-5">
            <div className="overflow-hidden rounded-[28px] border border-[#04439e]/25 bg-[linear-gradient(135deg,#04439e_0%,#0d4fb3_56%,#0b1b33_100%)] px-5 py-6 shadow-[0_22px_52px_rgba(4,67,158,0.28)] sm:px-7 sm:py-8">
              <div className="flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
                <div className="max-w-2xl">
                  <div className="mb-3 inline-flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1.5">
                    <Package className="w-4 h-4 text-white" />
                    <span className="text-xs font-semibold uppercase tracking-[0.15em] text-white">{t('digital.marketplaceDigital')}</span>
                  </div>
                  <h2 className="text-2xl font-semibold leading-tight text-white sm:text-3xl">
                    {t('digital.discover')}
                  </h2>
                  <p className="mt-3 max-w-xl text-sm leading-6 text-white/72 sm:text-base">
                    {t('digital.discoverDesc')}
                    {!isMerchant && ` ${t('digital.becomeSellerPrompt')}`}
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:min-w-[360px]">
                  <div className="rounded-2xl border border-white/18 bg-white/10 p-3.5">
                    <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-white/55">Modules</p>
                    <p className="mt-2 text-2xl font-semibold text-white">{productModules.length}</p>
                  </div>
                  <div className="rounded-2xl border border-white/18 bg-white/10 p-3.5">
                    <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-white/55">Marketplace</p>
                    <p className="mt-2 text-2xl font-semibold text-white">24/7</p>
                  </div>
                  <div className="rounded-2xl border border-white/18 bg-white/10 p-3.5 col-span-2 sm:col-span-1">
                    <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-white/55">Focus</p>
                    <p className="mt-2 text-base font-semibold text-[#ffb599]">Produits digitaux</p>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* Modules Grid */}
          <section className="px-4 pb-6">
            <div className="mb-4 flex items-end justify-between gap-3">
              <div>
                <h3 className="text-lg font-semibold tracking-tight text-[#0b1b33]">Choisissez votre module de vente</h3>
                <p className="mt-1 text-sm text-[#5f78a5]">Une structure claire, orientee conversion et distribution internationale.</p>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {productModules.map((module) => (
                <Card
                  key={module.id}
                  className={cn(
                    'group cursor-pointer overflow-hidden rounded-[24px] transition-all duration-300',
                    'border border-[#d6e2f7] bg-white/96 backdrop-blur-sm',
                    'hover:-translate-y-1 hover:shadow-[0_18px_42px_rgba(4,67,158,0.16)] hover:border-[#04439e]/35'
                  )}
                  onClick={() => handleModuleClick(module)}
                >
                  <CardContent className="p-0">
                    <div className="relative h-36 w-full overflow-hidden">
                      <img
                        src={module.coverImage}
                        alt={t(module.titleKey)}
                        className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                        loading="lazy"
                      />
                      <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(11,27,51,0.10)_0%,rgba(11,27,51,0.72)_100%)]" />

                      <div className="absolute bottom-3 left-1/2 -translate-x-1/2">
                        <div className={cn(
                          'flex h-12 w-12 items-center justify-center rounded-2xl bg-white/95 shadow-[0_10px_22px_rgba(11,27,51,0.26)]',
                          module.iconColor
                        )}>
                          <div className="[&_svg]:h-8 [&_svg]:w-8 [&_svg]:stroke-[2.1]">{module.icon}</div>
                        </div>
                      </div>
                    </div>

                    <div className="p-5">
                    <div className="text-center">
                      <h3 className="text-base font-semibold tracking-tight text-[#0b1b33]">
                        {t(module.titleKey)}
                      </h3>
                      <p className="mx-auto mt-1.5 max-w-[17rem] text-sm leading-6 text-[#5f78a5] line-clamp-2">
                        {t(module.descriptionKey)}
                      </p>
                      <span className="mt-3 inline-flex items-center rounded-full border border-[#d9e6fb] px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-[#04439e]">
                        Ouvrir le module
                      </span>
                    </div>
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
