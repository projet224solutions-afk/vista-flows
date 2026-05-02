import { useEffect, useState, Suspense, lazy } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Store, Settings, DollarSign, TrendingUp, Users, ShoppingBag, Key, Wallet, CreditCard } from 'lucide-react';
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
import { ServiceIdBadge } from '@/components/professional-services/ServiceIdBadge';
import CommunicationWidget from '@/components/communication/CommunicationWidget';

const MyPurchasesOrdersList = lazy(() => import('@/components/shared/MyPurchasesOrdersList'));
const WalletApiPanel = lazy(() => import('@/components/professional-services/modules/WalletApiPanel'));
const ServiceWalletWidget = lazy(() => import('@/components/professional-services/ServiceWalletWidget'));
const PaymentLinksManager = lazy(() => import('@/components/vendor/PaymentLinksManager'));

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

  // Auto-fill GPS is now handled globally via useAutoFillGps in App.tsx

  useEffect(() => {
    if (!loading) {
      const found = userServices.find((s) => s.id === serviceId);
      if (found) {
        setService(found);
      } else if (userServices.length > 0 || !serviceId) {
        // Services loaded but this one not found
        navigate('/services');
      }
      // If userServices is empty, we still show "Service introuvable"
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
             <div className="flex items-center gap-2">
               <ServiceIdBadge serviceId={service.id} compact />
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
           </div>

          {/* Barre d'abonnement compacte */}
          <ServiceSubscriptionCard serviceId={service.id} serviceTypeId={service.service_type_id} compact />

          <ServiceModuleManager
            serviceId={service.id}
            serviceTypeId={service.service_type_id}
            serviceTypeName={service.service_type?.name || 'Service'}
            serviceTypeCode={service.service_type?.code}
            businessName={service.business_name}
          />
          {/* Wallet du prestataire */}
          <div className="mt-6">
            <Suspense fallback={<div className="flex items-center justify-center py-8"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div></div>}>
              <ServiceWalletWidget businessName={service.business_name} />
            </Suspense>
          </div>

          {/* Liens de paiement prestataire */}
          <div className="mt-6">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2">
                  <CreditCard className="w-5 h-5" />
                  Liens de paiement
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0 sm:p-2">
                <Suspense fallback={<div className="flex items-center justify-center py-8"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div></div>}>
                  <PaymentLinksManager />
                </Suspense>
              </CardContent>
            </Card>
          </div>

          {/* Bouton Mes Achats */}
          <div className="mt-6">
            <Button
              variant="outline"
              className="w-full gap-2 py-3"
              onClick={() => {
                const el = document.getElementById('my-purchases-section');
                if (el) el.scrollIntoView({ behavior: 'smooth' });
              }}
            >
              <ShoppingBag className="w-5 h-5" />
              Mes Achats
            </Button>
          </div>

          <div id="my-purchases-section" className="mt-4">
            <Suspense fallback={<div className="flex items-center justify-center py-12"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div></div>}>
              <MyPurchasesOrdersList
                title="Mes Achats Personnels"
                emptyMessage="Vous n'avez pas encore effectué d'achats sur le marketplace"
              />
            </Suspense>
          </div>
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

  // Dashboard generique pour les autres types de services
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
    <div className="min-h-screen bg-background pb-24">
      {/* Header mobile-optimized */}
      <div className="border-b bg-card sticky top-0 z-10">
        <div className="container mx-auto px-3 sm:px-4 py-3 sm:py-4">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                <Store className="w-5 h-5 sm:w-6 sm:h-6 text-primary shrink-0" />
                <h1 className="text-lg sm:text-2xl font-bold truncate">{service.business_name}</h1>
              </div>
              <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                <Badge className={`${statusColors[service.status]} text-xs`}>
                  {service.status}
                </Badge>
                <Badge className={`${verificationColors[service.verification_status]} text-xs`}>
                  {service.verification_status}
                </Badge>
                <ServiceIdBadge serviceId={service.id} compact />
              </div>
              <p className="text-xs sm:text-sm text-muted-foreground mt-1 truncate">
                {service.service_type?.name} • Commission: {service.service_type?.commission_rate}%
              </p>
            </div>
            <Button variant="outline" size="sm" className="gap-1.5 shrink-0" onClick={() => setSettingsOpen(true)}>
              <Settings className="w-4 h-4" />
              <span className="hidden sm:inline">Paramètres</span>
            </Button>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-3 sm:px-4 py-4 sm:py-8">
        {/* Stats grid - 2 cols mobile, 4 cols desktop */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-6 mb-6 sm:mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-1 sm:pb-2 p-3 sm:p-6">
              <CardTitle className="text-xs sm:text-sm font-medium">Revenus</CardTitle>
              <DollarSign className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-muted-foreground" />
            </CardHeader>
            <CardContent className="p-3 pt-0 sm:p-6 sm:pt-0">
              <div className="text-lg sm:text-2xl font-bold truncate">{service.total_revenue.toLocaleString()} GNF</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-1 sm:pb-2 p-3 sm:p-6">
              <CardTitle className="text-xs sm:text-sm font-medium">Commandes</CardTitle>
              <TrendingUp className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-muted-foreground" />
            </CardHeader>
            <CardContent className="p-3 pt-0 sm:p-6 sm:pt-0">
              <div className="text-lg sm:text-2xl font-bold">{service.total_orders}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-1 sm:pb-2 p-3 sm:p-6">
              <CardTitle className="text-xs sm:text-sm font-medium">Avis</CardTitle>
              <Users className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-muted-foreground" />
            </CardHeader>
            <CardContent className="p-3 pt-0 sm:p-6 sm:pt-0">
              <div className="text-lg sm:text-2xl font-bold">{service.total_reviews}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-1 sm:pb-2 p-3 sm:p-6">
              <CardTitle className="text-xs sm:text-sm font-medium">Note</CardTitle>
              <span className="text-sm sm:text-xl">⭐</span>
            </CardHeader>
            <CardContent className="p-3 pt-0 sm:p-6 sm:pt-0">
              <div className="text-lg sm:text-2xl font-bold">{service.rating.toFixed(1)}/5</div>
            </CardContent>
          </Card>
        </div>

        {/* Carte abonnement */}
        <div className="mb-6">
          <ServiceSubscriptionCard serviceId={service.id} serviceTypeId={service.service_type_id} />
        </div>

        <Tabs defaultValue="overview" className="space-y-4 sm:space-y-6">
          <div className="overflow-x-auto -mx-3 px-3 sm:mx-0 sm:px-0">
            <TabsList className="inline-flex w-max sm:w-auto sm:flex sm:flex-wrap gap-0.5">
              <TabsTrigger value="overview" className="text-xs sm:text-sm px-2.5 sm:px-3">Vue d'ensemble</TabsTrigger>
              <TabsTrigger value="wallet" className="text-xs sm:text-sm px-2.5 sm:px-3 gap-1">
                <Wallet className="w-3.5 h-3.5" />
                Wallet
              </TabsTrigger>
              <TabsTrigger value="products" className="text-xs sm:text-sm px-2.5 sm:px-3">Produits</TabsTrigger>
              <TabsTrigger value="bookings" className="text-xs sm:text-sm px-2.5 sm:px-3">Réservations</TabsTrigger>
              <TabsTrigger value="payment-links" className="text-xs sm:text-sm px-2.5 sm:px-3 gap-1">
                <CreditCard className="w-3.5 h-3.5" />
                Paiements
              </TabsTrigger>
              <TabsTrigger value="my-purchases" className="text-xs sm:text-sm px-2.5 sm:px-3 gap-1">
                <ShoppingBag className="w-3.5 h-3.5" />
                Achats
              </TabsTrigger>
              <TabsTrigger value="reviews" className="text-xs sm:text-sm px-2.5 sm:px-3">Avis</TabsTrigger>
              <TabsTrigger value="analytics" className="text-xs sm:text-sm px-2.5 sm:px-3">Stats</TabsTrigger>
              <TabsTrigger value="api" className="text-xs sm:text-sm px-2.5 sm:px-3 gap-1">
                <Key className="w-3.5 h-3.5" />
                API
              </TabsTrigger>
            </TabsList>
          </div>

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

          <TabsContent value="wallet">
            <Suspense fallback={<div className="flex items-center justify-center py-12"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div></div>}>
              <ServiceWalletWidget businessName={service.business_name} />
            </Suspense>
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

          <TabsContent value="payment-links">
            <Suspense fallback={<div className="flex items-center justify-center py-12"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div></div>}>
              <PaymentLinksManager />
            </Suspense>
          </TabsContent>

          <TabsContent value="my-purchases">
            <Suspense fallback={<div className="flex items-center justify-center py-12"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div></div>}>
              <MyPurchasesOrdersList
                title="Mes Achats Personnels"
                emptyMessage="Vous n'avez pas encore effectué d'achats sur le marketplace"
              />
            </Suspense>
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

          <TabsContent value="api">
            <Suspense fallback={<div className="flex items-center justify-center py-12"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div></div>}>
              <WalletApiPanel serviceId={service.id} businessName={service.business_name} />
            </Suspense>
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
