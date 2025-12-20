import { ReactNode } from 'react';
import { useSubscriptionFeatures, SubscriptionFeature } from '@/hooks/useSubscriptionFeatures';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import { Lock, Crown } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useState } from 'react';

interface FeatureGuardProps {
  feature: SubscriptionFeature;
  children: ReactNode;
  fallback?: ReactNode;
  showUpgradePrompt?: boolean;
}

export function FeatureGuard({ 
  feature, 
  children, 
  fallback,
  showUpgradePrompt = true 
}: FeatureGuardProps) {
  const { canAccessFeature, loading, getPlanName } = useSubscriptionFeatures();
  const [showDialog, setShowDialog] = useState(false);
  const navigate = useNavigate();

  if (loading) {
    return <div className="animate-pulse bg-muted h-10 rounded" />;
  }

  const hasAccess = canAccessFeature(feature);

  if (hasAccess) {
    return <>{children}</>;
  }

  if (fallback) {
    return <>{fallback}</>;
  }

  if (showUpgradePrompt) {
    return (
      <>
        <div className="relative">
          <div className="opacity-50 pointer-events-none">
            {children}
          </div>
          <div className="absolute inset-0 flex items-center justify-center bg-background/60 backdrop-blur-sm rounded-lg">
            <Button
              size="sm"
              className="gap-2"
              onClick={() => setShowDialog(true)}
            >
              <Lock className="w-4 h-4" />
              Débloquer
            </Button>
          </div>
        </div>

        <Dialog open={showDialog} onOpenChange={setShowDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Crown className="w-5 h-5 text-yellow-500" />
                Fonctionnalité Premium
              </DialogTitle>
              <DialogDescription>
                Cette fonctionnalité n'est pas disponible avec votre plan actuel: <strong>{getPlanName()}</strong>
              </DialogDescription>
            </DialogHeader>
            
            <div className="py-4">
              <p className="text-sm text-muted-foreground">
                Passez à un plan supérieur pour accéder à cette fonctionnalité et bien d'autres avantages.
              </p>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setShowDialog(false)}>
                Fermer
              </Button>
              <Button onClick={() => {
                setShowDialog(false);
                navigate('/vendeur/subscription');
              }}>
                Voir les plans
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
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
  const { canAccessFeature, loading, getPlanName } = useSubscriptionFeatures();
  const [showDialog, setShowDialog] = useState(false);
  const navigate = useNavigate();

  const hasAccess = canAccessFeature(feature);

  const handleClick = () => {
    if (hasAccess && !disabled) {
      onClick();
    } else if (!hasAccess) {
      setShowDialog(true);
    }
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
              Cette fonctionnalité n'est pas disponible avec votre plan actuel: <strong>{getPlanName()}</strong>
            </DialogDescription>
          </DialogHeader>
          
          <div className="py-4">
            <p className="text-sm text-muted-foreground">
              Passez à un plan supérieur pour accéder à cette fonctionnalité.
            </p>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDialog(false)}>
              Fermer
            </Button>
            <Button onClick={() => {
              setShowDialog(false);
              navigate('/vendeur/subscription');
            }}>
              Voir les plans
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
