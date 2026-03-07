import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Store, Settings, DollarSign, TrendingUp, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { useProfessionalServices } from '@/hooks/useProfessionalServices';
import type { ProfessionalService } from '@/hooks/useProfessionalServices';
import { ServiceModuleManager } from '@/components/professional-services/modules/ServiceModuleManager';
import { BookingManagement } from '@/components/professional-services/modules/BookingManagement';
import { ServiceSettingsPanel } from '@/components/professional-services/ServiceSettingsPanel';
import { ServiceSubscriptionCard } from '@/components/professional-services/ServiceSubscriptionCard';
import CommunicationWidget from '@/components/communication/CommunicationWidget';

// Types de services qui ont leur propre module complet
function isFullModuleService(service: ProfessionalService): boolean {
  const code = service.service_type?.code?.toLowerCase() || '';
  const name = service.service_type?.name?.toLowerCase() || '';
  return (
    code === 'location' ||
    code === 'construction' ||
    name.includes('immobili') ||
    name.includes('construction') ||
    name.includes('btp')
  );
}

export default function ServiceDashboard() {
  const { serviceId } = useParams<{ serviceId: string }>();
  const navigate = useNavigate();
  const { userServices, loading } = useProfessionalServices();
  const [service, setService] = useState<ProfessionalService | null>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);

  useEffect(() => {
    if (!loading && userServices.length > 0) {
      const found = userServices.find((s) => s.id === serviceId);
      if (found) {
        setService(found);
      } else {
        navigate('/services');
      }
    }
  }, [serviceId, userServices, loading, navigate]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-muted-foreground">Chargement du dashboard...</p>
        </div>
      </div>
    );
  }

  if (!service) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center space-y-4">
          <p className="text-muted-foreground">Service introuvable</p>
          <Button onClick={() => navigate('/services')}>
            Retour aux services
          </Button>
        </div>
      </div>
    );
  }

  // Pour les services avec module complet → afficher directement
  if (isFullModuleService(service)) {
    return (
      <div className="min-h-screen bg-background pb-24">
        <div className="container mx-auto px-4 py-6">
          {/* Header avec bouton paramètres */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <Store className="w-6 h-6 text-primary" />
              <h1 className="text-xl sm:text-2xl font-bold">{service.business_name}</h1>
            </div>
            <Button
              variant="outline"
              size="sm"
              className="gap-2"
              onClick={() => setSettingsOpen(true)}
            >
              <Settings className="w-4 h-4" />
              <span className="hidden sm:inline">Paramètres</span>
            </Button>
          </div>

          {/* Barre d'abonnement compacte */}
          <ServiceSubscriptionCard serviceId={service.id} compact />

          <ServiceModuleManager
            serviceId={service.id}
            serviceTypeId={service.service_type_id}
            serviceTypeName={service.service_type?.name || 'Service'}
            serviceTypeCode={service.service_type?.code}
            businessName={service.business_name}
          />
        </div>
        <ServiceSettingsPanel
          open={settingsOpen}
          onOpenChange={setSettingsOpen}
          service={service}
          onUpdated={() => window.location.reload()}
        />
        <CommunicationWidget position="bottom-right" showNotifications={true} />
      </div>
    );
  }

  // Dashboard générique pour les autres types de services
  const statusColors: Record<string, string> = {
    pending: 'bg-yellow-500',
    active: 'bg-green-500',
    suspended: 'bg-red-500',
    rejected: 'bg-gray-500',
  };

  const verificationColors: Record<string, string> = {
    unverified: 'bg-gray-500',
    pending: 'bg-yellow-500',
    verified: 'bg-green-500',
    rejected: 'bg-red-500',
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="border-b bg-card sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div>
                <div className="flex items-center gap-3">
                  <Store className="w-6 h-6 text-primary" />
                  <h1 className="text-2xl font-bold">{service.business_name}</h1>
                  <Badge className={statusColors[service.status]}>
                    {service.status}
                  </Badge>
                  <Badge className={verificationColors[service.verification_status]}>
                    {service.verification_status}
                  </Badge>
                </div>
                <p className="text-sm text-muted-foreground mt-1">
                  {service.service_type?.name} • Commission: {service.service_type?.commission_rate}%
                </p>
              </div>
            </div>
            <Button variant="outline" className="gap-2" onClick={() => setSettingsOpen(true)}>
              <Settings className="w-4 h-4" />
              Paramètres
            </Button>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Revenus Totaux</CardTitle>
              <DollarSign className="w-4 h-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{service.total_revenue.toLocaleString()} GNF</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Commandes</CardTitle>
              <TrendingUp className="w-4 h-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{service.total_orders}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Avis</CardTitle>
              <Users className="w-4 h-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{service.total_reviews}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Note Moyenne</CardTitle>
              <span className="text-xl">⭐</span>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{service.rating.toFixed(1)}/5.0</div>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="overview" className="space-y-6">
          <TabsList>
            <TabsTrigger value="overview">Vue d'ensemble</TabsTrigger>
            <TabsTrigger value="products">Produits/Services</TabsTrigger>
            <TabsTrigger value="bookings">Réservations</TabsTrigger>
            <TabsTrigger value="reviews">Avis Clients</TabsTrigger>
            <TabsTrigger value="analytics">Statistiques</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Informations du Service</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Description</p>
                  <p className="mt-1">{service.description || 'Aucune description'}</p>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Téléphone</p>
                    <p className="mt-1">{service.phone || 'Non renseigné'}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Email</p>
                    <p className="mt-1">{service.email || 'Non renseigné'}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Adresse</p>
                    <p className="mt-1">{service.address || 'Non renseignée'}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Site Web</p>
                    <p className="mt-1">{service.website || 'Non renseigné'}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="products">
            <ServiceModuleManager
              serviceId={service.id}
              serviceTypeId={service.service_type_id}
              serviceTypeName={service.service_type?.name || 'Service'}
              serviceTypeCode={service.service_type?.code}
              businessName={service.business_name}
            />
          </TabsContent>

          <TabsContent value="bookings">
            <BookingManagement serviceId={service.id} />
          </TabsContent>

          <TabsContent value="reviews">
            <Card>
              <CardHeader>
                <CardTitle>Avis Clients</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">Module de gestion des avis à implémenter...</p>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="analytics">
            <Card>
              <CardHeader>
                <CardTitle>Statistiques Détaillées</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">Module d'analytics à implémenter...</p>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
      
      <ServiceSettingsPanel
        open={settingsOpen}
        onOpenChange={setSettingsOpen}
        service={service}
        onUpdated={() => window.location.reload()}
      />
      <CommunicationWidget position="bottom-right" showNotifications={true} />
    </div>
  );
}
