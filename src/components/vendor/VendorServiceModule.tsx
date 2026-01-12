/**
 * VendorServiceModule - Charge le module métier approprié pour le vendor
 * Intègre le VendorBusinessDashboard avec vue complète de la boutique
 */

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { AlertCircle, RefreshCw, Briefcase } from 'lucide-react';
import { useVendorProfessionalService } from '@/hooks/useVendorProfessionalService';
import { VendorBusinessDashboard } from '@/components/vendor/business-module';

export default function VendorServiceModule() {
  const { 
    professionalService, 
    serviceTypeCode, 
    serviceTypeName,
    loading, 
    error 
  } = useVendorProfessionalService();

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-4 w-72 mt-2" />
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {[...Array(4)].map((_, i) => (
              <Skeleton key={i} className="h-24 w-full" />
            ))}
          </div>
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-32 w-full" />
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="border-destructive/50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-destructive">
            <AlertCircle className="w-5 h-5" />
            Erreur de chargement
          </CardTitle>
          <CardDescription>
            Impossible de charger votre module métier
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground mb-4">{error}</p>
          <Button 
            variant="outline" 
            onClick={() => window.location.reload()}
            className="gap-2"
          >
            <RefreshCw className="w-4 h-4" />
            Réessayer
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (!professionalService) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Briefcase className="w-5 h-5" />
            Module Métier
          </CardTitle>
          <CardDescription>
            Aucun service professionnel associé à votre compte
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Votre compte vendeur n'a pas encore de service professionnel configuré.
            Contactez le support pour activer votre module métier spécialisé.
          </p>
        </CardContent>
      </Card>
    );
  }

  // Afficher le dashboard principal avec vue complète de la boutique
  return (
    <VendorBusinessDashboard
      businessName={professionalService.business_name}
      serviceId={professionalService.id}
      serviceTypeName={serviceTypeName || 'Service'}
    />
  );
}
