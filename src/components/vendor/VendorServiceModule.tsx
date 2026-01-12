/**
 * VendorServiceModule - Module métier du vendeur
 * Support multi-services avec sélecteur et interface dédiée par service
 */

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { AlertCircle, RefreshCw, Plus, Store } from 'lucide-react';
import { useCurrentVendor } from '@/hooks/useCurrentVendor';
import { useVendorServices } from '@/hooks/useVendorServices';
import { VendorBusinessDashboard } from '@/components/vendor/business-module';
import { AddServiceModal } from '@/components/vendor/business-module/AddServiceModal';
import { ServiceSelector } from '@/components/vendor/business-module/ServiceSelector';

export default function VendorServiceModule() {
  const { vendorId, profile, loading: vendorLoading } = useCurrentVendor();
  const { 
    services,
    selectedService,
    selectedServiceId,
    selectService,
    hasMultipleServices,
    loading: servicesLoading, 
    error,
    refresh
  } = useVendorServices();
  
  const [showAddService, setShowAddService] = useState(false);

  const loading = vendorLoading || servicesLoading;

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

        {/* Service Selector Skeleton */}
        <Skeleton className="h-12 w-full md:w-[350px]" />

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
            Impossible de charger vos services professionnels
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

  // Déterminer le nom de la boutique
  const businessName = selectedService?.business_name 
    || profile?.business_name 
    || profile?.first_name 
    || 'Ma Boutique';

  const serviceTypeName = selectedService?.service_type?.name || 'Commerce';

  return (
    <div className="space-y-6">
      {/* 🆕 Service Selector (si plusieurs services) */}
      {hasMultipleServices && (
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 pb-4 border-b">
          <div>
            <h2 className="text-lg font-semibold mb-1">Mes services professionnels</h2>
            <p className="text-sm text-muted-foreground">
              Sélectionnez le service à gérer
            </p>
          </div>
          <ServiceSelector
            services={services}
            selectedServiceId={selectedServiceId}
            onSelectService={selectService}
            onCreateNew={() => setShowAddService(true)}
          />
        </div>
      )}

      {/* Dashboard du service sélectionné */}
      <VendorBusinessDashboard
        businessName={businessName}
        serviceId={selectedService?.id || vendorId || 'default'}
        serviceTypeName={serviceTypeName}
        onRefresh={refresh}
        professionalService={selectedService}
      />

      <AddServiceModal 
        open={showAddService} 
        onOpenChange={setShowAddService}
      />
    </div>
  );
}
