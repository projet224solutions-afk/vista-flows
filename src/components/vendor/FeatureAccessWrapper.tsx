import { ReactNode, useState } from 'react';
import { useSubscriptionFeatures, SubscriptionFeature } from '@/hooks/useSubscriptionFeatures';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Lock, Crown } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface FeatureAccessWrapperProps {
  feature: SubscriptionFeature;
  children: ReactNode;
  blurWhenLocked?: boolean;
}

export function FeatureAccessWrapper({ 
  feature, 
  children,
  blurWhenLocked = true 
}: FeatureAccessWrapperProps) {
  const { canAccessFeature, loading, getPlanName } = useSubscriptionFeatures();
  const [showUpgradeDialog, setShowUpgradeDialog] = useState(false);
  const navigate = useNavigate();
  const hasAccess = canAccessFeature(feature);

  if (loading) {
    return <div className="relative">{children}</div>;
  }

  const handleClick = (e: React.MouseEvent) => {
    if (!hasAccess) {
      e.preventDefault();
      e.stopPropagation();
      setShowUpgradeDialog(true);
    }
  };

  const handleUpgrade = () => {
    setShowUpgradeDialog(false);
    navigate('/vendeur');
    // Scroll to subscription section after navigation
    setTimeout(() => {
      const subscriptionSection = document.querySelector('[data-subscription-section]');
      subscriptionSection?.scrollIntoView({ behavior: 'smooth' });
    }, 100);
  };

  return (
    <>
      <div 
        className="relative"
        onClick={handleClick}
      >
        {!hasAccess && blurWhenLocked && (
          <>
            <div className="absolute inset-0 backdrop-blur-sm bg-background/30 z-10 rounded-lg" />
            <div className="absolute inset-0 z-20 flex items-center justify-center">
              <div className="bg-background/95 backdrop-blur-sm px-6 py-4 rounded-lg shadow-lg border border-border flex items-center gap-3">
                <Lock className="w-5 h-5 text-primary" />
                <div>
                  <p className="font-semibold text-sm">Fonctionnalité verrouillée</p>
                  <p className="text-xs text-muted-foreground">Cliquez pour débloquer</p>
                </div>
              </div>
            </div>
          </>
        )}
        <div className={!hasAccess ? 'pointer-events-none' : ''}>
          {children}
        </div>
      </div>

      <Dialog open={showUpgradeDialog} onOpenChange={setShowUpgradeDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Crown className="w-5 h-5 text-yellow-500" />
              Améliorer votre abonnement
            </DialogTitle>
            <DialogDescription>
              Cette fonctionnalité nécessite un plan d'abonnement supérieur.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <p className="text-sm text-muted-foreground mb-2">
              Votre plan actuel : <span className="font-semibold">{getPlanName()}</span>
            </p>
            <p className="text-sm">
              Pour accéder à cette fonctionnalité, vous devez choisir un plan d'abonnement qui l'inclut.
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowUpgradeDialog(false)}>
              Annuler
            </Button>
            <Button onClick={handleUpgrade}>
              Voir les plans
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
