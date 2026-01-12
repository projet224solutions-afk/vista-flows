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
            Configuration du module métier en cours
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="rounded-lg border border-amber-200 bg-amber-50 p-4">
            <div className="flex gap-3">
              <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
              <div>
                <h3 className="font-semibold text-amber-900 mb-1">Module métier non configuré</h3>
                <p className="text-sm text-amber-800 mb-3">
                  Votre compte vendeur n'a pas encore de module métier activé. 
                  Cela peut arriver si votre compte a été créé avant la mise à jour du système.
                </p>
                <p className="text-sm text-amber-800">
                  <strong>Solutions :</strong>
                </p>
                <ul className="text-sm text-amber-800 list-disc list-inside mt-2 space-y-1">
                  <li>Contactez le support technique</li>
                  <li>Ou reconnectez-vous pour activer automatiquement le module</li>
                </ul>
              </div>
            </div>
          </div>
          
          <div className="flex gap-2">
            <Button 
              variant="outline" 
              onClick={() => window.location.reload()}
              className="gap-2"
            >
              <RefreshCw className="w-4 h-4" />
              Actualiser
            </Button>
            <Button 
              onClick={() => window.location.href = '/auth'}
              className="gap-2"
            >
              Se reconnecter
            </Button>
          </div>
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
