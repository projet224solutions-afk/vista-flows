import { useState } from 'react';
import { Crown, Lock, Sparkles, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { VendorSubscriptionPlanSelector } from '@/components/vendor/VendorSubscriptionPlanSelector';
import { useSubscriptionFeatures, FEATURE_MIN_PLAN, SubscriptionFeature } from '@/hooks/useSubscriptionFeatures';

interface UpgradeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  feature?: SubscriptionFeature;
  moduleName?: string;
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

export function UpgradeDialog({ 
  open, 
  onOpenChange, 
  feature,
  moduleName 
}: UpgradeDialogProps) {
  const { getPlanName, isActive } = useSubscriptionFeatures();
  const [showPlanSelector, setShowPlanSelector] = useState(false);
  
  const currentPlan = getPlanName();
  const minPlan = feature ? FEATURE_MIN_PLAN[feature] : 'basic';
  const minPlanDisplay = PLAN_DISPLAY_NAMES[minPlan] || minPlan;

  const handleUpgrade = () => {
    onOpenChange(false);
    setShowPlanSelector(true);
  };

  const handleSubscriptionSuccess = () => {
    setShowPlanSelector(false);
    window.location.reload();
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
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
                <>
                  {moduleName ? (
                    <span>
                      Le module <strong>"{moduleName}"</strong> nécessite le plan{' '}
                      <Badge className={PLAN_COLORS[minPlan]}>{minPlanDisplay}</Badge> ou supérieur.
                    </span>
                  ) : (
                    <span>
                      Cette fonctionnalité nécessite le plan{' '}
                      <Badge className={PLAN_COLORS[minPlan]}>{minPlanDisplay}</Badge> ou supérieur.
                    </span>
                  )}
                </>
              )}
            </DialogDescription>
          </DialogHeader>

          <div className="py-4 space-y-4">
            {/* Plan actuel */}
            <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
              <span className="text-sm text-muted-foreground">Votre plan actuel</span>
              <Badge variant="outline">{currentPlan}</Badge>
            </div>

            {/* Aperçu des fonctionnalités du plan minimum */}
            {minPlan !== 'free' && (
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
            <Button 
              variant="outline" 
              onClick={() => onOpenChange(false)}
              className="flex-1"
            >
              Plus tard
            </Button>
            <Button 
              onClick={handleUpgrade}
              className="flex-1 bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-600 hover:to-orange-600 text-white"
            >
              <Crown className="w-4 h-4 mr-2" />
              Mettre à niveau
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

/**
 * Hook pour gérer l'affichage du dialog d'upgrade
 */
export function useUpgradeDialog() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [targetFeature, setTargetFeature] = useState<SubscriptionFeature | undefined>();
  const [targetModuleName, setTargetModuleName] = useState<string | undefined>();

  const showUpgradeDialog = (feature?: SubscriptionFeature, moduleName?: string) => {
    setTargetFeature(feature);
    setTargetModuleName(moduleName);
    setDialogOpen(true);
  };

  const hideUpgradeDialog = () => {
    setDialogOpen(false);
    setTargetFeature(undefined);
    setTargetModuleName(undefined);
  };

  return {
    dialogOpen,
    targetFeature,
    targetModuleName,
    showUpgradeDialog,
    hideUpgradeDialog,
    setDialogOpen,
  };
}
