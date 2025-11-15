import { AlertTriangle, Clock, Ban } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { useDriverSubscription } from '@/hooks/useDriverSubscription';
import { useNavigate } from 'react-router-dom';

export function DriverSubscriptionBanner() {
  const { subscription, isExpired, isExpiringSoon, daysRemaining, hasAccess, isDriver, loading } = useDriverSubscription();
  const navigate = useNavigate();

  if (loading || !isDriver || hasAccess) {
    return null;
  }

  const handleSubscribe = () => {
    navigate('/driver-subscription');
  };

  if (isExpired) {
    return (
      <Alert className="border-destructive bg-destructive/10 mb-4">
        <Ban className="h-5 w-5 text-destructive" />
        <AlertTitle className="text-destructive font-bold">
          Abonnement Expiré
        </AlertTitle>
        <AlertDescription className="text-destructive/90">
          Votre abonnement est expiré. Vous ne pouvez plus recevoir de courses ou de livraisons.
          Veuillez le renouveler pour continuer à travailler sur 224Solutions.
          <div className="mt-3">
            <Button 
              onClick={handleSubscribe}
              variant="destructive"
              size="sm"
            >
              Renouveler maintenant
            </Button>
          </div>
        </AlertDescription>
      </Alert>
    );
  }

  if (isExpiringSoon) {
    return (
      <Alert className="border-warning bg-warning/10 mb-4">
        <AlertTriangle className="h-5 w-5 text-warning" />
        <AlertTitle className="text-warning font-bold">
          <Clock className="inline h-4 w-4 mr-1" />
          Abonnement expire bientôt
        </AlertTitle>
        <AlertDescription className="text-warning/90">
          Votre abonnement expire dans {daysRemaining} jour{daysRemaining > 1 ? 's' : ''}.
          Pensez à le renouveler pour éviter toute interruption de service.
          <div className="mt-3">
            <Button 
              onClick={handleSubscribe}
              variant="outline"
              size="sm"
              className="border-warning text-warning hover:bg-warning/20"
            >
              Renouveler maintenant
            </Button>
          </div>
        </AlertDescription>
      </Alert>
    );
  }

  return null;
}
