import { ReactNode } from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { Shield } from "lucide-react";
import { useAuth } from '@/hooks/useAuth';
import { useCurrentVendor } from '@/hooks/useCurrentVendor';

interface VendorRoleGuardProps {
  children: ReactNode;
  fallbackMessage?: string;
}

/**
 * Composant de protection pour les fonctionnalités vendeur
 * Vérifie le rôle et affiche un message si l'utilisateur n'est pas autorisé
 */
export function VendorRoleGuard({ 
  children, 
  fallbackMessage = "🚫 Vous devez être un vendeur pour accéder à cette fonctionnalité." 
}: VendorRoleGuardProps) {
  const { profile, loading: authLoading } = useAuth();
  const { vendorId, loading: vendorLoading } = useCurrentVendor();

  if (authLoading || vendorLoading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Vérifier si l'utilisateur a le rôle vendeur ou agent
  const isVendorOrAgent = profile?.role === 'vendeur' || vendorId !== null;

  if (!isVendorOrAgent) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex flex-col items-center justify-center space-y-4 text-center">
            <Shield className="h-12 w-12 text-orange-500" />
            <p className="text-lg font-semibold text-foreground">{fallbackMessage}</p>
            <p className="text-sm text-muted-foreground">
              Cette fonctionnalité est réservée aux vendeurs et agents autorisés.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return <>{children}</>;
}
