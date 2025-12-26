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
  Lock
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import QuickFooter from '@/components/QuickFooter';
import { MerchantActivationDialog } from '@/components/digital-products/MerchantActivationDialog';
import { CategoryProductsList } from '@/components/digital-products/CategoryProductsList';

interface ProductModule {
  id: string;
  icon: React.ReactNode;
  title: string;
  description: string;
  gradient: string;
  category: 'dropshipping' | 'voyage' | 'logiciel' | 'formation' | 'livre' | 'custom';
}

// Dropshipping retiré de l'affichage mais catégorie conservée pour l'auth
const productModules: ProductModule[] = [
  {
    id: 'voyage',
    icon: <Plane className="w-7 h-7" />,
    title: 'Vol/Hôtel',
    description: 'Billets d\'avion, hôtels',
    gradient: 'from-blue-500 to-cyan-500',
    category: 'voyage'
  },
  {
    id: 'logiciel',
    icon: <Monitor className="w-7 h-7" />,
    title: 'Logiciel',
    description: 'Antivirus, SaaS, applications',
    gradient: 'from-purple-500 to-pink-500',
    category: 'logiciel'
  },
  {
    id: 'formation',
    icon: <GraduationCap className="w-7 h-7" />,
    title: 'Formation',
    description: 'Créez et vendez vos formations vidéo/PDF',
    gradient: 'from-green-500 to-emerald-500',
    category: 'formation'
  },
  {
    id: 'livre',
    icon: <BookOpen className="w-7 h-7" />,
    title: 'Livres',
    description: 'eBooks PDF, EPUB ou affiliation',
    gradient: 'from-amber-500 to-yellow-500',
    category: 'livre'
  },
  {
    id: 'custom',
    icon: <Sparkles className="w-7 h-7" />,
    title: 'Mon Produit Numérique',
    description: 'Templates, scripts, designs, services',
    gradient: 'from-indigo-500 to-violet-500',
    category: 'custom'
  }
];

export default function DigitalProducts() {
  const navigate = useNavigate();
  const { user, profile, loading } = useAuth();
  const [showActivationDialog, setShowActivationDialog] = useState(false);
  const [selectedModule, setSelectedModule] = useState<ProductModule | null>(null);
  const [showCategoryProducts, setShowCategoryProducts] = useState(false);

  const isMerchant = profile?.role === 'vendeur';

  const handleModuleClick = (module: ProductModule) => {
    // Si pas connecté, rediriger vers auth
    if (!user) {
      toast.info('Connexion requise pour accéder à ce module');
      navigate('/auth', { state: { redirectTo: '/digital-products' } });
      return;
    }

    // Si connecté mais pas marchand, afficher dialog d'activation
    if (!isMerchant) {
      setSelectedModule(module);
      setShowActivationDialog(true);
      return;
    }

    // Si marchand, afficher les produits de la catégorie
    setSelectedModule(module);
    setShowCategoryProducts(true);
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

  // Affichage des produits par catégorie
  if (showCategoryProducts && selectedModule) {
    return (
      <CategoryProductsList
        category={selectedModule.category}
        title={selectedModule.title}
        description={selectedModule.description}
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
              <h1 className="text-lg font-bold text-foreground">Produits Numériques</h1>
              <p className="text-xs text-muted-foreground">
                Créez et vendez sur le marketplace
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
                Marketplace
              </Button>
            )}
          </div>
        </div>
      </header>

      {/* Status Banner */}
      {user && (
        <div className={cn(
          'px-4 py-2 text-center text-sm',
          isMerchant 
            ? 'bg-green-500/10 text-green-600 border-b border-green-500/20' 
            : 'bg-amber-500/10 text-amber-600 border-b border-amber-500/20'
        )}>
          {isMerchant ? (
            <span className="flex items-center justify-center gap-2">
              <Store className="w-4 h-4" />
              Statut Marchand actif - Vous pouvez créer des produits
            </span>
          ) : (
            <span className="flex items-center justify-center gap-2">
              <Lock className="w-4 h-4" />
              Activez votre statut Marchand pour vendre
            </span>
          )}
        </div>
      )}

      {/* Hero Section */}
      <section className="px-4 py-6">
        <div className="text-center mb-6">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-primary/10 rounded-full mb-3">
            <Package className="w-4 h-4 text-primary" />
            <span className="text-xs font-medium text-primary">Marketplace Digital</span>
          </div>
          <h2 className="text-xl font-bold text-foreground mb-2">
            Vendez vos produits numériques
          </h2>
          <p className="text-sm text-muted-foreground max-w-sm mx-auto">
            Choisissez un module et commencez à vendre sur notre marketplace. 
            Vos produits seront visibles par tous les utilisateurs.
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
                  {module.title}
                </h3>
                <p className="text-xs text-muted-foreground line-clamp-2">
                  {module.description}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {/* Info Section */}
      <section className="px-4 py-4">
        <Card className="bg-muted/30 border-border/50">
          <CardContent className="p-4">
            <h3 className="font-semibold text-foreground mb-2 flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-primary" />
              Comment ça marche ?
            </h3>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li className="flex items-start gap-2">
                <span className="w-5 h-5 rounded-full bg-primary/10 text-primary text-xs flex items-center justify-center shrink-0 mt-0.5">1</span>
                <span>Activez votre statut Marchand (gratuit)</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="w-5 h-5 rounded-full bg-primary/10 text-primary text-xs flex items-center justify-center shrink-0 mt-0.5">2</span>
                <span>Choisissez un module et ajoutez votre produit</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="w-5 h-5 rounded-full bg-primary/10 text-primary text-xs flex items-center justify-center shrink-0 mt-0.5">3</span>
                <span>Votre produit apparaît automatiquement sur le marketplace</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="w-5 h-5 rounded-full bg-primary/10 text-primary text-xs flex items-center justify-center shrink-0 mt-0.5">4</span>
                <span>Recevez les paiements directement sur votre wallet</span>
              </li>
            </ul>
          </CardContent>
        </Card>
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
