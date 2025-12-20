import { ReactNode } from 'react';
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Lock } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useVendorSubscription } from "@/hooks/useVendorSubscription";

interface RestrictedFeatureWrapperProps {
  children: ReactNode;
  feature: 'products' | 'messages' | 'calls' | 'transfer' | 'virtualCard' | 'payments';
  fallbackMessage?: string;
}

export function RestrictedFeatureWrapper({ 
  children, 
  feature,
  fallbackMessage 
}: RestrictedFeatureWrapperProps) {
  const navigate = useNavigate();
  const { hasAccess, isExpired, loading } = useVendorSubscription();

  // Si chargement, afficher le contenu
  if (loading) {
    return <>{children}</>;
  }

  // Si l'utilisateur a un abonnement actif, afficher le contenu
  if (hasAccess && !isExpired) {
    return <>{children}</>;
  }

  // Messages par défaut pour chaque fonctionnalité
  const defaultMessages = {
    products: 'Création de produits désactivée',
    messages: 'Messagerie désactivée',
    calls: 'Appels désactivés',
    transfer: 'Transferts désactivés',
    virtualCard: 'Carte virtuelle suspendue',
    payments: 'Réception de paiements désactivée',
  };

  // Afficher le message de restriction
  return (
    <div className="p-8">
      <Alert className="border-orange-200 bg-orange-50">
        <Lock className="h-5 w-5 text-orange-600" />
        <AlertDescription className="mt-2">
          <p className="font-semibold text-orange-900 mb-2">
            {fallbackMessage || defaultMessages[feature]}
          </p>
          <p className="text-orange-800 mb-4">
            Cette fonctionnalité est temporairement désactivée car votre abonnement a expiré ou vous n'avez pas d'abonnement actif.
            Souscrivez à un abonnement pour accéder à toutes les fonctionnalités.
          </p>
          <Button 
            onClick={() => navigate('/vendeur/subscription')}
            className="bg-orange-600 hover:bg-orange-700"
          >
            Voir les abonnements
          </Button>
        </AlertDescription>
      </Alert>
    </div>
  );
}
