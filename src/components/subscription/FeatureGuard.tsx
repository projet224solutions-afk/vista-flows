import { ReactNode, useState } from 'react';
import { useSubscriptionFeatures, SubscriptionFeature, FEATURE_MIN_PLAN } from '@/hooks/useSubscriptionFeatures';
import { Button } from '@/components/ui/button';
import { Lock, Crown, Sparkles, Check } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { VendorSubscriptionPlanSelector } from '@/components/vendor/VendorSubscriptionPlanSelector';

interface FeatureGuardProps {
  feature: SubscriptionFeature;
  children: ReactNode;
  fallback?: ReactNode;
  showUpgradePrompt?: boolean;
}

const PLAN_DISPLAY_NAMES: Record<string, string> = {
  'free': 'Gratuit',
  'basic': 'Basic',
  'pro': 'Pro',
  'business': 'Business',
  'premium': 'Premium',
};

const PLAN_COLORS: Record<string, string> = {
  'free': 'bg-gray-100 text-gray-700',
  'basic': 'bg-blue-100 text-blue-700',
  'pro': 'bg-purple-100 text-purple-700',
  'business': 'bg-orange-100 text-orange-700',
  'premium': 'bg-gradient-to-r from-yellow-400 to-orange-500 text-white',
};

const PLAN_DESCRIPTIONS: Record<string, string> = {
  'free': 'Accès aux fonctions de base : gestion produits, commandes simples, dashboard et profil public.',
  'basic': 'Gestion produits avancée, suivi commandes et livraisons, CRM basique, analytics de base et facturation automatique.',
  'pro': 'Stocks et inventaire, marketing, affiliation, agents de vente, liens de paiement et support prioritaire.',
  'business': 'Point de vente (POS), gestion fournisseurs et dettes, entrepôts multiples, exports et accès API.',
  'premium': 'Assistant IA Gemini, hub communication, analytics temps réel, account manager dédié et formation.',
};

const PLAN_FEATURES_PREVIEW: Record<string, string[]> = {
  'basic': [
    'POS - Point de vente',
    'Gestion inventaire',
    'Livraison intégrée',
    'Messages clients',
    'Copilot IA',
  ],
  'pro': [
    'Tout de Basic +',
    'Marketing & Promotions',
    'Gestion clients avancée',
    'Programme affiliation',
    'Analytics avancés',
  ],
  'business': [
    'Tout de Pro +',
    'Devis & Factures',
    'Liens de paiement',
    'Gestion dettes',
    'Produits illimités',
  ],
  'premium': [
    'Toutes les fonctionnalités',
    'Support prioritaire dédié',
    'Assistant IA Gemini',
    'API Premium',
    'Formation personnalisée',
  ],
};

export function FeatureGuard({ 
  feature, 
  children, 
  fallback,
  showUpgradePrompt = true 
}: FeatureGuardProps) {
  const { canAccessFeature, loading, getPlanName, isActive } = useSubscriptionFeatures();
  const [showDialog, setShowDialog] = useState(false);
  const [showPlanSelector, setShowPlanSelector] = useState(false);

  // En cours de chargement
  if (loading) {
    return <div className="animate-pulse bg-muted h-20 rounded" />;
  }

  // Vérifier l'accès à la fonctionnalité
  // Pour le plan gratuit, on vérifie si la feature est dans le plan free
  const hasAccess = canAccessFeature(feature);

  if (hasAccess) {
    return <>{children}</>;
  }

  if (fallback) {
    return <>{fallback}</>;
  }

  const handleSubscribe = () => {
    setShowDialog(false);
    setShowPlanSelector(true);
  };

  const handleSubscriptionSuccess = () => {
    setShowPlanSelector(false);
    window.location.reload();
  };

  const minPlan = FEATURE_MIN_PLAN[feature] || 'basic';
  const minPlanDisplay = PLAN_DISPLAY_NAMES[minPlan] || minPlan;

  if (showUpgradePrompt) {
    return (
      <>
        <div className="relative min-h-[200px]">
          <div className="opacity-30 pointer-events-none blur-[2px]">
            {children}
          </div>
          <div className="absolute inset-0 flex items-center justify-center bg-background/80 backdrop-blur-sm rounded-lg">
            <div className="text-center space-y-4 p-6 max-w-md">
              <div className="mx-auto w-16 h-16 rounded-full bg-gradient-to-br from-yellow-400 to-orange-500 flex items-center justify-center">
                <Lock className="w-8 h-8 text-white" />
              </div>
              <div>
                <h3 className="text-lg font-semibold">Fonctionnalité Premium</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  {!isActive() 
                    ? "Votre abonnement est expiré ou inactif."
                    : <>Requiert le plan <Badge className={PLAN_COLORS[minPlan]}>{minPlanDisplay}</Badge> ou supérieur</>
                  }
                </p>
              </div>
              <Button
                className="gap-2 bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-600 hover:to-orange-600 text-white"
                onClick={() => setShowDialog(true)}
              >
                <Crown className="w-4 h-4" />
                Mettre à niveau
              </Button>
            </div>
          </div>
        </div>

        {/* Dialog d'information */}
        <Dialog open={showDialog} onOpenChange={setShowDialog}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <div className="p-2 rounded-full bg-gradient-to-br from-yellow-400 to-orange-500">
                  <Crown className="w-5 h-5 text-white" />
                </div>
                <span>Fonctionnalité Premium</span>
              </DialogTitle>
              <DialogDescription className="pt-2">
                {!isActive() ? (
                  <span className="text-destructive font-medium">
                    Votre abonnement est expiré ou inactif.
                  </span>
                ) : (
                  <span>
                    Cette fonctionnalité nécessite le plan{' '}
                    <Badge className={PLAN_COLORS[minPlan]}>{minPlanDisplay}</Badge> ou supérieur.
                  </span>
                )}
              </DialogDescription>
            </DialogHeader>
            
            <div className="py-4 space-y-4">
              {/* Plan actuel */}
              <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
                <span className="text-sm text-muted-foreground">Votre plan actuel</span>
                <Badge variant="outline">{getPlanName()}</Badge>
              </div>

              {/* Aperçu des fonctionnalités du plan minimum */}
              {minPlan !== 'free' && PLAN_FEATURES_PREVIEW[minPlan] && (
                <div className="space-y-2">
                  <p className="text-sm font-medium flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-yellow-500" />
                    Ce que vous obtiendrez avec {minPlanDisplay}
                  </p>
                  <ul className="space-y-1.5">
                    {PLAN_FEATURES_PREVIEW[minPlan]?.slice(0, 5).map((feat, i) => (
                      <li key={i} className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Check className="w-4 h-4 text-green-500 flex-shrink-0" />
                        {feat}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>

            <div className="flex gap-3">
              <Button variant="outline" onClick={() => setShowDialog(false)} className="flex-1">
                Plus tard
              </Button>
              <Button 
                onClick={handleSubscribe}
                className="flex-1 bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-600 hover:to-orange-600 text-white"
              >
                <Crown className="w-4 h-4 mr-2" />
                Mettre à niveau
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* Sélecteur de plan intégré */}
        <VendorSubscriptionPlanSelector 
          open={showPlanSelector} 
          onOpenChange={setShowPlanSelector}
          onSuccess={handleSubscriptionSuccess}
        />
      </>
    );
  }

  return null;
}

// Composant pour les boutons de fonctionnalité
interface FeatureButtonProps {
  feature: SubscriptionFeature;
  onClick: () => void;
  children: ReactNode;
  className?: string;
  variant?: 'default' | 'outline' | 'ghost' | 'destructive' | 'secondary' | 'link';
  size?: 'default' | 'sm' | 'lg' | 'icon';
  disabled?: boolean;
}

export function FeatureButton({ 
  feature, 
  onClick, 
  children, 
  className,
  variant = 'default',
  size = 'default',
  disabled = false
}: FeatureButtonProps) {
  const { canAccessFeature, loading, isActive, getPlanName } = useSubscriptionFeatures();
  const [showDialog, setShowDialog] = useState(false);
  const [showPlanSelector, setShowPlanSelector] = useState(false);

  // Vérifier l'accès à la fonctionnalité ET que l'abonnement est actif
  const hasAccess = isActive() && canAccessFeature(feature);

  const handleClick = () => {
    if (hasAccess && !disabled) {
      onClick();
    } else if (!hasAccess) {
      setShowDialog(true);
    }
  };

  const handleSubscribe = () => {
    setShowDialog(false);
    setShowPlanSelector(true);
  };

  const handleSubscriptionSuccess = () => {
    setShowPlanSelector(false);
    window.location.reload();
  };

  return (
    <>
      <Button
        variant={variant}
        size={size}
        className={className}
        onClick={handleClick}
        disabled={loading || disabled}
      >
        {!hasAccess && <Lock className="w-3 h-3 mr-1" />}
        {children}
      </Button>

      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Crown className="w-5 h-5 text-yellow-500" />
              Fonctionnalité Premium
            </DialogTitle>
            <DialogDescription>
              {!isActive() 
                ? "Votre abonnement est expiré ou inactif. Veuillez le renouveler pour accéder à cette fonctionnalité."
                : `Cette fonctionnalité n'est pas disponible avec votre plan actuel: ${getPlanName()}`
              }
            </DialogDescription>
          </DialogHeader>
          
          <div className="py-4">
            <p className="text-sm text-muted-foreground">
              Passez à un plan supérieur pour accéder à cette fonctionnalité et bien d'autres avantages.
            </p>
          </div>

          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={() => setShowDialog(false)}>
              Fermer
            </Button>
            <Button onClick={handleSubscribe}>
              S'abonner maintenant
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <VendorSubscriptionPlanSelector 
        open={showPlanSelector} 
        onOpenChange={setShowPlanSelector}
        onSuccess={handleSubscriptionSuccess}
      />
    </>
  );
}
