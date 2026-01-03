/**
 * Page Produits Numériques & Marketplace
 * Modules: Voyage, Logiciel, Formation, Livres, Produit custom
 * Note: Dropshipping retiré de l'UI mais authentification conservée
 */

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Package, 
  Plane, 
  Monitor, 
  GraduationCap, 
  BookOpen, 
  Sparkles,
  ArrowLeft,
  Store,
  Lock,
  Bot
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import QuickFooter from '@/components/QuickFooter';
import { MerchantActivationDialog } from '@/components/digital-products/MerchantActivationDialog';
import { CategoryProductsList } from '@/components/digital-products/CategoryProductsList';
import { TravelModule } from '@/components/travel/TravelModule';
import { useTranslation } from '@/hooks/useTranslation';

interface ProductModule {
  id: string;
  icon: React.ReactNode;
  titleKey: string;
  descriptionKey: string;
  gradient: string;
  category: 'dropshipping' | 'voyage' | 'logiciel' | 'formation' | 'livre' | 'custom' | 'ai';
}

// Dropshipping retiré de l'affichage mais catégorie conservée pour l'auth
const productModules: ProductModule[] = [
  {
    id: 'voyage',
    icon: <Plane className="w-7 h-7" />,
    titleKey: 'digital.modules.flight',
    descriptionKey: 'digital.modules.flightDesc',
    gradient: 'from-blue-500 to-cyan-500',
    category: 'voyage'
  },
  {
    id: 'logiciel',
    icon: <Monitor className="w-7 h-7" />,
    titleKey: 'digital.modules.software',
    descriptionKey: 'digital.modules.softwareDesc',
    gradient: 'from-purple-500 to-pink-500',
    category: 'logiciel'
  },
  {
    id: 'formation',
    icon: <GraduationCap className="w-7 h-7" />,
    titleKey: 'digital.modules.training',
    descriptionKey: 'digital.modules.trainingDesc',
    gradient: 'from-green-500 to-emerald-500',
    category: 'formation'
  },
  {
    id: 'livre',
    icon: <BookOpen className="w-7 h-7" />,
    titleKey: 'digital.modules.books',
    descriptionKey: 'digital.modules.booksDesc',
    gradient: 'from-amber-500 to-yellow-500',
    category: 'livre'
  },
  {
    id: 'ai',
    icon: <Bot className="w-7 h-7" />,
    titleKey: 'digital.modules.ai',
    descriptionKey: 'digital.modules.aiDesc',
    gradient: 'from-violet-500 to-fuchsia-500',
    category: 'ai'
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

  const isMerchant = profile?.role === 'vendeur';

  const handleModuleClick = (module: ProductModule) => {
    // Pour le module voyage, afficher le module dédié
    if (module.category === 'voyage') {
      setShowTravelModule(true);
      return;
    }
    
    // Afficher directement les produits de la catégorie
    // Que l'utilisateur soit connecté ou non, il peut consulter
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
    <div className="min-h-screen bg-background pb-20">
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

      {/* Status Banner */}
      {user && !isMerchant && (
        <div className="px-4 py-3 bg-gradient-to-r from-primary/10 via-purple-500/10 to-pink-500/10 border-b border-primary/20">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2 flex-1">
              <Store className="w-4 h-4 text-primary shrink-0" />
              <div className="text-xs">
                <p className="font-medium text-foreground">{t('digital.wantToSell')}</p>
                <p className="text-muted-foreground">{t('digital.activateMerchant')}</p>
              </div>
            </div>
            <Button
              size="sm"
              onClick={handleBecomeMerchant}
              className="shrink-0 h-8 text-xs"
            >
              {t('digital.becomeMerchant')}
            </Button>
          </div>
        </div>
      )}

      {user && isMerchant && (
        <div className="px-4 py-2.5 bg-green-500/10 text-green-600 border-b border-green-500/20 text-center text-sm">
          <span className="flex items-center justify-center gap-2">
            <Store className="w-4 h-4" />
            {t('digital.merchantActive')}
          </span>
        </div>
      )}

      {/* Hero Section */}
      <section className="px-4 py-6">
        <div className="text-center">
          <div className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-primary/10 rounded-full mb-3">
            <Package className="w-4 h-4 text-primary" />
            <span className="text-xs font-medium text-primary">{t('digital.marketplaceDigital')}</span>
          </div>
          <h2 className="text-xl font-bold text-foreground mb-2">
            {t('digital.discover')}
          </h2>
          <p className="text-sm text-muted-foreground max-w-sm mx-auto">
            {t('digital.discoverDesc')}
            {!isMerchant && ` ${t('digital.becomeSellerPrompt')}`}
          </p>
        </div>
      </section>

      {/* Modules Grid */}
      <section className="px-4 pb-6">
        <div className="grid grid-cols-2 gap-3">
          {productModules.map((module) => (
            <Card 
              key={module.id}
              className={cn(
                'cursor-pointer overflow-hidden transition-all duration-200',
                'hover:shadow-lg hover:scale-[1.02]',
                'border-border/50 bg-card'
              )}
              onClick={() => handleModuleClick(module)}
            >
              <CardContent className="p-4">
                <div className={cn(
                  'w-12 h-12 rounded-xl flex items-center justify-center mb-3',
                  'bg-gradient-to-br text-white shadow-md',
                  module.gradient
                )}>
                  {module.icon}
                </div>
                <h3 className="font-semibold text-foreground text-sm mb-1">
                  {t(module.titleKey)}
                </h3>
                <p className="text-xs text-muted-foreground line-clamp-2">
                  {t(module.descriptionKey)}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>


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
