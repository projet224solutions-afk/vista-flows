import { ReactNode } from 'react';
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Lock } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useVendorRestrictions } from "@/hooks/useVendorRestrictions";

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
  const { restrictions, loading } = useVendorRestrictions();
  const navigate = useNavigate();

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  // Check if feature is allowed
  const featureAllowed = {
    products: restrictions.canCreateProducts,
    messages: restrictions.canSendMessages,
    calls: restrictions.canMakeCalls,
    transfer: restrictions.canTransfer,
    virtualCard: restrictions.canUseVirtualCard,
    payments: restrictions.canReceivePayments,
  }[feature];

  if (featureAllowed) {
    return <>{children}</>;
  }

  // Show restriction message
  const defaultMessages = {
    products: 'Création de produits désactivée',
    messages: 'Messagerie désactivée',
    calls: 'Appels désactivés',
    transfer: 'Transferts désactivés',
    virtualCard: 'Carte virtuelle suspendue',
    payments: 'Réception de paiements désactivée',
  };

  return (
    <div className="p-8">
      <Alert className="border-orange-200 bg-orange-50">
        <Lock className="h-5 w-5 text-orange-600" />
        <AlertDescription className="mt-2">
          <p className="font-semibold text-orange-900 mb-2">
            {fallbackMessage || defaultMessages[feature]}
          </p>
          <p className="text-orange-800 mb-4">
            Cette fonctionnalité est temporairement désactivée car votre abonnement a expiré.
            Renouvelez votre abonnement pour retrouver un accès complet.
          </p>
          <Button 
            onClick={() => navigate('/vendeur/subscription')}
            className="bg-orange-600 hover:bg-orange-700"
          >
            Renouveler l'abonnement
          </Button>
        </AlertDescription>
      </Alert>
    </div>
  );
}
