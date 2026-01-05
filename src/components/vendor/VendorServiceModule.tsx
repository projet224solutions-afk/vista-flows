/**
 * VendorServiceModule - Charge le module métier approprié pour le vendor
 * Basé sur son professional_service.service_type.code
 */

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { AlertCircle, RefreshCw, Briefcase } from 'lucide-react';
import { useVendorProfessionalService } from '@/hooks/useVendorProfessionalService';
import { ServiceModuleManager } from '@/components/professional-services/modules/ServiceModuleManager';

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

  // Afficher le module métier approprié via ServiceModuleManager
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold flex items-center gap-2">
            <Briefcase className="w-5 h-5 text-primary" />
            {serviceTypeName || 'Module Métier'}
          </h2>
          <p className="text-sm text-muted-foreground">
            {professionalService.business_name}
          </p>
        </div>
      </div>

      <ServiceModuleManager
        serviceId={professionalService.id}
        serviceTypeId={professionalService.service_type_id}
        serviceTypeName={serviceTypeName || 'Service'}
        serviceTypeCode={serviceTypeCode || undefined}
        businessName={professionalService.business_name}
      />
    </div>
  );
}
