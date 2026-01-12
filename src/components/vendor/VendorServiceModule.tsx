/**
 * VendorServiceModule - Module métier du vendeur
 * Affiche le dashboard complet même sans professional_service
 * Permet de créer un nouveau service professionnel
 */

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { AlertCircle, RefreshCw, Plus, Store } from 'lucide-react';
import { useVendorProfessionalService } from '@/hooks/useVendorProfessionalService';
import { useCurrentVendor } from '@/hooks/useCurrentVendor';
import { VendorBusinessDashboard } from '@/components/vendor/business-module';
import { AddServiceModal } from '@/components/vendor/business-module/AddServiceModal';

export default function VendorServiceModule() {
  const { vendorId, profile, loading: vendorLoading } = useCurrentVendor();
  const { 
    professionalService, 
    serviceTypeName,
    loading: serviceLoading, 
    error 
  } = useVendorProfessionalService();
  
  const [showAddService, setShowAddService] = useState(false);

  const loading = vendorLoading || serviceLoading;

  if (loading) {
    return (
      <div className="space-y-6">
        {/* Header Skeleton */}
        <div className="flex items-center justify-between">
          <div>
            <Skeleton className="h-8 w-64 mb-2" />
            <Skeleton className="h-4 w-48" />
          </div>
          <Skeleton className="h-10 w-28" />
        </div>

        {/* KPI Cards Skeleton */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <Card key={i}>
              <CardContent className="p-4">
                <Skeleton className="h-4 w-20 mb-3" />
                <Skeleton className="h-8 w-16 mb-2" />
                <Skeleton className="h-3 w-24" />
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Content Skeleton */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Skeleton className="h-64 w-full rounded-lg" />
          <Skeleton className="h-64 w-full rounded-lg" />
        </div>
      </div>
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

  // Si pas de professional_service, afficher quand même le dashboard avec les données vendor
  // et permettre de créer un service
  const businessName = professionalService?.business_name 
    || profile?.business_name 
    || profile?.first_name 
    || 'Ma Boutique';

  return (
    <>
      <VendorBusinessDashboard
        businessName={businessName}
        serviceId={professionalService?.id || vendorId || 'default'}
        serviceTypeName={serviceTypeName || 'Commerce'}
      />

      <AddServiceModal 
        open={showAddService} 
        onOpenChange={setShowAddService}
      />
    </>
  );
}
