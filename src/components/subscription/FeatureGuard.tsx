import { ReactNode, useState } from 'react';
import { useSubscriptionFeatures, SubscriptionFeature, FEATURE_MIN_PLAN } from '@/hooks/useSubscriptionFeatures';
import { Button } from '@/components/ui/button';
import { Lock, Crown, Zap, Check } from 'lucide-react';
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
  'free': "Plan basique pour dÃ©marrer : gestion des produits, commandes simples, tableau de bord et profil public.",
  'basic': "Plan intermÃ©diaire pour une gestion structurÃ©e : produits avancÃ©s, suivi des commandes/livraisons, CRM et analytics de base, facturation automatique.",
  'pro': "Plan avancÃ© pour dÃ©velopper lâ€™activitÃ© : inventaire, marketing/affiliation, agents de vente, liens de paiement et support prioritaire.",
  'business': "Plan complet pour une gestion Ã©tendue : POS, fournisseurs et dettes, multiâ€‘entrepÃ´ts, exports et accÃ¨s API.",
  'premium': "Plan premium avec outils et accompagnement avancÃ©s : assistant IA Gemini, hub de communication, analytics temps rÃ©el, account manager dÃ©diÃ© et formation.",
};

const PLAN_FEATURES_PREVIEW: Record<string, string[]> = {
  'basic': [
    'POS - Point de vente',
    'Gestion inventaire',
    'Livraison intÃ©grÃ©e',
    'Messages clients',
    'Copilot IA',
  ],
  'pro': [
    'Tout de Basic +',
    'Marketing & Promotions',
    'Gestion clients avancÃ©e',
    'Programme affiliation',
    'Analytics avancÃ©s',
  ],
  'business': [
    'Tout de Pro +',
    'Devis & Factures',
    'Liens de paiement',
    'Gestion dettes',
    'Produits illimitÃ©s',
  ],
  'premium': [
    'Toutes les fonctionnalitÃ©s',
    'Support prioritaire dÃ©diÃ©',
    'Assistant IA Gemini',
    'API Premium',
    'Formation personnalisÃ©e',
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

  // VÃ©rifier l'accÃ¨s Ã  la fonctionnalitÃ©
  // Pour le plan gratuit, on vÃ©rifie si la feature est dans le plan free
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
                <h3 className="text-lg font-semibold">FonctionnalitÃ© Premium</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  {!isActive() 
                    ? "Votre abonnement est expirÃ© ou inactif."
                    : <>Requiert le plan <Badge className={PLAN_COLORS[minPlan]}>{minPlanDisplay}</Badge> ou supÃ©rieur</>
                  }
                </p>
              </div>
              <Button
                className="gap-2 bg-amber-500 hover:bg-amber-600 text-white shadow-lg shadow-amber-500/40"
                onClick={() => setShowDialog(true)}
              >
                <Crown className="w-4 h-4" />
                Mettre Ã  niveau
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
                <span>FonctionnalitÃ© Premium</span>
              </DialogTitle>
              <DialogDescription className="pt-2">
                {!isActive() ? (
                  <span className="text-destructive font-medium">
                    Votre abonnement est expirÃ© ou inactif.
                  </span>
                ) : (
                  <span>
                    Cette fonctionnalitÃ© nÃ©cessite le plan{' '}
                    <Badge className={PLAN_COLORS[minPlan]}>{minPlanDisplay}</Badge> ou supÃ©rieur.
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

              {/* AperÃ§u des fonctionnalitÃ©s du plan minimum */}
              {minPlan !== 'free' && PLAN_FEATURES_PREVIEW[minPlan] && (
                <div className="space-y-2">
                  <p className="text-sm font-medium flex items-center gap-2">
                    <Crown className="w-4 h-4 text-yellow-500" />
                    Ce que vous obtiendrez avec {minPlanDisplay}
                  </p>
                  <ul className="space-y-1.5">
                    {PLAN_FEATURES_PREVIEW[minPlan]?.slice(0, 5).map((feat, i) => (
                      <li key={i} className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Check className="w-4 h-4 text-primary-orange-500 flex-shrink-0" />
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
                className="flex-1 bg-amber-500 hover:bg-amber-600 text-white shadow-lg shadow-amber-500/40"
              >
                <Crown className="w-4 h-4 mr-2" />
                Mettre Ã  niveau
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* SÃ©lecteur de plan intÃ©grÃ© */}
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

// Composant pour les boutons de fonctionnalitÃ©
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

  // VÃ©rifier l'accÃ¨s Ã  la fonctionnalitÃ© ET que l'abonnement est actif
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
              FonctionnalitÃ© Premium
            </DialogTitle>
            <DialogDescription>
              {!isActive() 
                ? "Votre abonnement est expirÃ© ou inactif. Veuillez le renouveler pour accÃ©der Ã  cette fonctionnalitÃ©."
                : `Cette fonctionnalitÃ© n'est pas disponible avec votre plan actuel: ${getPlanName()}`
              }
            </DialogDescription>
          </DialogHeader>
          
          <div className="py-4">
            <p className="text-sm text-muted-foreground">
              Passez Ã  un plan supÃ©rieur pour accÃ©der Ã  cette fonctionnalitÃ© et bien d'autres avantages.
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
