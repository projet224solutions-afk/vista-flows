/**
 * LIVREUR - INTERFACE COMPLÈTE RESPONSIVE
 * 224Solutions Delivery System  
 * Toutes les fonctionnalités du Taxi-Moto intégrées + Responsive
 */

import { useState, useEffect, lazy, Suspense } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from "@/hooks/useTranslation";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { toast } from "sonner";
import { MapPin, Package, Clock, Wallet, CheckCircle, AlertTriangle, Truck, Navigation, Bell, TrendingUp, Car, MessageSquare } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useCurrentLocation } from "@/hooks/useGeolocation";
import { supabase } from "@/integrations/supabase/client";
import { useDelivery } from "@/hooks/useDelivery";
import { useTaxiRides } from "@/hooks/useTaxiRides";
import { useDriver } from "@/hooks/useDriver";
import { useResponsive } from "@/hooks/useResponsive";
import { ErrorBanner } from "@/components/ui/ErrorBanner";
import { useLivreurErrorBoundary } from "@/hooks/useLivreurErrorBoundary";
import { useDeliveryActions } from "@/hooks/useDeliveryActions";
import { useRealtimeDelivery } from "@/hooks/useRealtimeDelivery";
import { useDriverSubscription } from "@/hooks/useDriverSubscription";

// Lazy loading des composants lourds
const NearbyDeliveriesPanel = lazy(() => import('@/components/delivery/NearbyDeliveriesPanel').then(m => ({ default: m.NearbyDeliveriesPanel })));
const DriverSubscriptionBanner = lazy(() => import('@/components/driver/DriverSubscriptionBanner').then(m => ({ default: m.DriverSubscriptionBanner })));
const DriverSubscriptionButton = lazy(() => import('@/components/driver/DriverSubscriptionButton').then(m => ({ default: m.DriverSubscriptionButton })));
const WalletBalanceWidget = lazy(() => import("@/components/wallet/WalletBalanceWidget").then(m => ({ default: m.WalletBalanceWidget })));
const UserIdDisplay = lazy(() => import("@/components/UserIdDisplay").then(m => ({ default: m.UserIdDisplay })));
const NearbyDeliveriesListener = lazy(() => import('@/components/delivery/NearbyDeliveriesListener').then(m => ({ default: m.NearbyDeliveriesListener })));
const DriverStatusToggle = lazy(() => import('@/components/driver/DriverStatusToggle').then(m => ({ default: m.DriverStatusToggle })));
const EarningsDisplay = lazy(() => import('@/components/driver/EarningsDisplay').then(m => ({ default: m.EarningsDisplay })));
const DeliveryProofUpload = lazy(() => import('@/components/driver/DeliveryProofUpload').then(m => ({ default: m.DeliveryProofUpload })));
const ResponsiveContainer = lazy(() => import("@/components/responsive/ResponsiveContainer").then(m => ({ default: m.ResponsiveContainer })));
const ResponsiveGrid = lazy(() => import("@/components/responsive/ResponsiveContainer").then(m => ({ default: m.ResponsiveGrid })));
const MobileBottomNav = lazy(() => import("@/components/responsive/MobileBottomNav").then(m => ({ default: m.MobileBottomNav })));
const CommunicationWidget = lazy(() => import("@/components/communication/CommunicationWidget"));
const DriverLayout = lazy(() => import('@/components/driver/DriverLayout').then(m => ({ default: m.DriverLayout })));
const DeliveryChat = lazy(() => import('@/components/delivery/DeliveryChat'));
const DeliveryGPSNavigation = lazy(() => import('@/components/delivery/DeliveryGPSNavigation').then(m => ({ default: m.DeliveryGPSNavigation })));
const DeliveryPaymentModal = lazy(() => import('@/components/delivery/DeliveryPaymentModal'));

export default function LivreurDashboard() {
  const { user, profile } = useAuth();
  const { location, getCurrentLocation } = useCurrentLocation();
  const { isMobile, isTablet } = useResponsive();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState('missions');
  const [showProofUpload, setShowProofUpload] = useState(false);
  const [showChat, setShowChat] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);

  // Gestion des erreurs centralisée
  const { error, captureError, clearError } = useLivreurErrorBoundary();

  // Vérification subscription et KYC
  const { hasAccess, subscription, loading: subscriptionLoading, isExpired } = useDriverSubscription();

  // Hook pour le profil et statut du driver
  const { driver, stats, goOnline, goOffline, pause, updateLocation, uploadProof } = useDriver();

  // Hook pour les livraisons
  const {
    currentDelivery,
    deliveryHistory,
    nearbyDeliveries,
    trackingPoints,
    loading: deliveryLoading,
    error: deliveryError,
    findNearbyDeliveries,
    loadTracking,
    subscribeToTracking,
    trackPosition: trackDeliveryPosition,
    processPayment: processDeliveryPayment,
    loadDeliveryHistory,
    loadCurrentDelivery
  } = useDelivery();

  // Hook pour les actions de livraison (logique métier extraite)
  const {
    acceptDelivery,
    startDelivery,
    completeDeliveryWithProof,
    cancelDelivery,
    reportProblem,
  } = useDeliveryActions({
    driverId: user?.id || null,
    onDeliveryAccepted: () => {
      setActiveTab('active');
      loadCurrentDelivery();
      if (location) {
        findNearbyDeliveries(location.latitude, location.longitude, 10);
      }
    },
    onDeliveryCompleted: () => {
      console.log('📥 [LivreurDashboard] onDeliveryCompleted callback triggered');
      setShowProofUpload(false);
      // setCurrentDelivery(null); // Commenté car setCurrentDelivery n'existe pas
      
      // Recharger toutes les données
      loadCurrentDelivery();
      loadDeliveryHistory();
      
      // Recharger les livraisons disponibles
      if (location) {
        findNearbyDeliveries(location.latitude, location.longitude, 10);
      }
      
      // Basculer vers l'historique après un court délai
      setTimeout(() => {
        setActiveTab('history');
      }, 1000);
    },
    onDeliveryCancelled: () => {
      loadCurrentDelivery();
      setActiveTab('missions');
      if (location) {
        findNearbyDeliveries(location.latitude, location.longitude, 10);
      }
    },
  });

  // Realtime delivery subscription avec guards
  useRealtimeDelivery({
    deliveryId: currentDelivery?.id || null,
    isOnline: driver?.is_online || false,
    hasAccess,
    onDeliveryUpdate: (delivery) => {
      console.log('[LivreurDashboard] Delivery updated via realtime:', delivery);
      loadCurrentDelivery();
    },
  });

  // Hook pour les courses taxi-moto
  const {
    currentRide,
    rideHistory,
    loading: rideLoading,
    acceptRide: acceptRideFn,
    startRide: startRideFn,
    completeRide: completeRideFn,
    cancelRide,
    trackPosition: trackRidePosition,
    processPayment: processRidePayment
  } = useTaxiRides();

  const loading = deliveryLoading || rideLoading;

  // Charger la position GPS au montage avec capture d'erreur
  useEffect(() => {
    getCurrentLocation().catch(err => {
      console.error('[LivreurDashboard] GPS error:', err);
      captureError('gps', 'Impossible d\'accéder à votre position GPS', err);
    });
  }, [getCurrentLocation, captureError]);

  // Mettre à jour la position du driver toutes les 30 secondes si en ligne
  useEffect(() => {
    if (!driver?.is_online || !location) return;

    const intervalId = setInterval(() => {
      updateLocation({ lat: location.latitude, lng: location.longitude });
    }, 30000); // Toutes les 30 secondes

    return () => clearInterval(intervalId);
  }, [driver?.is_online, location, updateLocation]);

  // Recharger les livraisons quand on bascule sur l'onglet missions
  useEffect(() => {
    if (activeTab === 'missions' && !currentDelivery && !currentRide) {
      if (location) {
        findNearbyDeliveries(location.latitude, location.longitude, 10);
      } else {
        // Charger toutes les livraisons même sans GPS
        findNearbyDeliveries(0, 0, 99999);
      }
    }
  }, [activeTab, location, currentDelivery, currentRide, findNearbyDeliveries]);

  // Charger les livraisons à proximité quand la position change OU au montage
  useEffect(() => {
    // Charger sans filtrage GPS au montage si pas de location
    if (!currentDelivery && !currentRide) {
      if (location) {
        findNearbyDeliveries(location.latitude, location.longitude, 10);
      } else {
        // Charger toutes les livraisons même sans GPS
        findNearbyDeliveries(0, 0, 99999);
      }
    }
  }, [location, currentDelivery, currentRide, findNearbyDeliveries]);

  // S'abonner au tracking en temps réel pour livraison ou course
  useEffect(() => {
    if (currentDelivery) {
      const unsubscribe = subscribeToTracking(currentDelivery.id);
      
      // Envoyer la position toutes les 10 secondes
      const intervalId = setInterval(() => {
        if (location) {
          trackDeliveryPosition(
            currentDelivery.id,
            location.latitude,
            location.longitude,
            undefined,
            undefined,
            location.accuracy
          );
        }
      }, 10000);

      return () => {
        unsubscribe();
        clearInterval(intervalId);
      };
    }

    if (currentRide && location) {
      const intervalId = setInterval(() => {
        trackRidePosition(
          currentRide.id,
          location.latitude,
          location.longitude,
          undefined,
          undefined
        );
      }, 10000);

      return () => clearInterval(intervalId);
    }
  }, [currentDelivery, currentRide, location, trackDeliveryPosition, trackRidePosition, subscribeToTracking]);

  /**
   * Accepter une livraison
   */
  const handleAcceptDelivery = async (deliveryId: string) => {
    try {
      await acceptDelivery(deliveryId);
    } catch (error) {
      captureError('network', 'Impossible d\'accepter la livraison', error);
    }
  };

  /**
   * Démarrer une livraison
   */
  const handleStartDelivery = async () => {
    if (!currentDelivery) return;
    try {
      await startDelivery(currentDelivery.id);
    } catch (error) {
      captureError('network', 'Impossible de démarrer la livraison', error);
    }
  };

  /**
   * Terminer une livraison avec preuve
   */
  const handleCompleteWithProof = async (photoUrl: string, signature: string) => {
    if (!currentDelivery) return;
    try {
      await completeDeliveryWithProof(currentDelivery.id, photoUrl, signature);
    } catch (error) {
      captureError('network', 'Erreur lors de la finalisation', error);
    }
  };

  /**
   * Annuler une livraison
   */
  const handleCancelDelivery = async (reason: string) => {
    if (!currentDelivery) return;
    try {
      await cancelDelivery(currentDelivery.id, reason);
    } catch (error) {
      captureError('network', 'Impossible d\'annuler la livraison', error);
    }
  };

  /**
   * Signaler un problème
   */
  const handleReportProblem = () => {
    if (!currentDelivery) return;
    reportProblem(currentDelivery.id, 'Problème signalé par le livreur');
  };

  /**
   * Traiter le paiement (livraison ou course)
   */
  const handleProcessPayment = () => {
    if (currentDelivery || currentRide) {
      setShowPaymentModal(true);
    }
  };

  if (loading && !currentDelivery && nearbyDeliveries.length === 0) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <Truck className="h-12 w-12 animate-bounce mx-auto mb-4 text-primary" />
          <p>{t('delivery.loadingData')}</p>
        </div>
      </div>
    );
  }

  return (
    <Suspense fallback={
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center space-y-3">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="text-sm text-muted-foreground">Chargement du dashboard livreur...</p>
        </div>
      </div>
    }>
    <>
      {/* Bannière d'abonnement */}
      <DriverSubscriptionBanner />
      
      <DriverLayout currentPage="dashboard">
    <div className="p-responsive bg-gradient-to-br from-orange-500/5 via-background to-green-600/5">
      {/* Listener temps réel pour nouvelles livraisons */}
      <NearbyDeliveriesListener 
        enabled={!currentDelivery && !currentRide}
        onNewDelivery={() => {
          if (location) {
            findNearbyDeliveries(location.latitude, location.longitude, 10);
          }
        }}
      />

      {/* Error Banner - Affichage des erreurs persistantes */}
      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-800 mb-4">
          <p className="font-medium">{error.message}</p>
          <button onClick={clearError} className="text-sm underline mt-2">Fermer</button>
        </div>
      )}

      <ResponsiveContainer maxWidth="full">
        {/* Statut du livreur Online/Offline avec KYC Badge */}
        {driver && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <DriverStatusToggle
                status={driver.status}
                isOnline={driver.is_online}
                onGoOnline={goOnline}
                onGoOffline={goOffline}
                onPause={pause}
              />
            </div>
          </div>
        )}

        {/* Statistiques de gains */}
        {driver && (
          <div className="mt-4 mb-6">
            <EarningsDisplay
              totalEarnings={driver.earnings_total || 0}
              todayEarnings={stats.todayEarnings}
              todayDeliveries={stats.todayDeliveries}
              weekEarnings={stats.weekEarnings}
              weekDeliveries={stats.weekDeliveries}
              monthEarnings={stats.monthEarnings}
              monthDeliveries={stats.monthDeliveries}
            />
          </div>
        )}

        {/* En-tête avec informations utilisateur - Responsive */}
        <div className="flex items-center justify-between mb-6 flex-wrap gap-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-3 mb-2 flex-wrap">
              <h1 className={`font-bold bg-gradient-to-r from-orange-600 to-green-600 bg-clip-text text-transparent ${isMobile ? 'text-xl' : 'text-3xl'}`}>
                🚴 {t('delivery.dashboard')}
              </h1>
            </div>
            <p className="text-sm md:text-base text-muted-foreground">
              {t('common.welcome')} {profile?.first_name || 'Livreur'} - 224Solutions Delivery
            </p>
            <div className="mt-1">
              <UserIdDisplay />
            </div>
            {(currentDelivery || currentRide) && (
              <Badge 
                variant="default" 
                className="mt-2 gap-1"
                style={{ background: 'linear-gradient(135deg, hsl(25 98% 55%), hsl(145 65% 35%))' }}
              >
                ⚡ {currentDelivery ? t('delivery.inProgressDelivery') : t('taxi.dashboard')}
              </Badge>
            )}
          </div>
          
          {/* Bouton de navigation */}
          <Button
            onClick={() => navigate('/delivery-request')}
            style={{ 
              background: 'linear-gradient(135deg, hsl(25 98% 55%), hsl(145 65% 35%))',
              color: 'white'
            }}
            className="gap-2"
          >
            <Package className="h-4 w-4" />
            {!isMobile && t('delivery.newDelivery')}
          </Button>
        </div>

        {/* Onglets de navigation - Responsive */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className={`grid bg-card/80 backdrop-blur mb-6 ${isMobile ? 'grid-cols-2' : 'grid-cols-4'} border border-orange-500/20`}>
            <TabsTrigger value="missions" className="text-xs md:text-sm data-[state=active]:bg-gradient-to-r data-[state=active]:from-orange-500 data-[state=active]:to-orange-600 data-[state=active]:text-white">
              📦 {isMobile ? 'Missions' : 'Missions disponibles'}
              {nearbyDeliveries.length > 0 && (
                <Badge variant="secondary" className="ml-2 text-xs bg-white text-orange-600">{nearbyDeliveries.length}</Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="active" disabled={!currentDelivery && !currentRide} className="text-xs md:text-sm data-[state=active]:bg-gradient-to-r data-[state=active]:from-green-600 data-[state=active]:to-green-700 data-[state=active]:text-white">
              🚚 {isMobile ? 'Active' : 'En cours'}
              {(currentDelivery || currentRide) && <Badge variant="default" className="ml-2 text-xs bg-white text-green-600">1</Badge>}
            </TabsTrigger>
            {!isMobile && (
              <>
                <TabsTrigger value="history" className="text-xs md:text-sm data-[state=active]:bg-gradient-to-r data-[state=active]:from-blue-600 data-[state=active]:to-blue-700 data-[state=active]:text-white">
                  📋 Historique
                  {(deliveryHistory.length + rideHistory.length) > 0 && (
                    <Badge variant="outline" className="ml-2 text-xs">{deliveryHistory.length + rideHistory.length}</Badge>
                  )}
                </TabsTrigger>
                <TabsTrigger value="wallet" className="text-xs md:text-sm data-[state=active]:bg-gradient-to-r data-[state=active]:from-purple-600 data-[state=active]:to-purple-700 data-[state=active]:text-white">💰 Solde</TabsTrigger>
              </>
            )}
          </TabsList>

          {/* 📦 Liste des livraisons disponibles */}
          <TabsContent value="missions" className="space-y-3">
            {/* Panneau des colis à proximité */}
            <NearbyDeliveriesPanel />

            {/* Alerte GPS si non activé */}
            {!location && (
              <Card className="p-4 bg-yellow-500/10 border-yellow-500/30">
                <div className="flex items-center gap-3">
                  <AlertTriangle className="h-5 w-5 text-yellow-600" />
                  <div>
                    <p className="font-medium text-yellow-700">GPS désactivé</p>
                    <p className="text-sm text-yellow-600">
                      Activez le GPS pour voir les missions à proximité et filtrer par distance
                    </p>
                  </div>
                </div>
              </Card>
            )}

          </TabsContent>

          {/* 🚚 Livraison en cours */}
          <TabsContent value="active">
            {currentDelivery ? (
              <Card className="shadow-lg border-orange-500/30 bg-gradient-to-br from-orange-500/5 to-green-600/5">
                <CardContent className="p-6">
                  <div className="space-y-4">
                    <div>
                      <div className="flex items-center justify-between mb-4">
                        <Badge 
                          variant="default"
                          style={{ background: 'linear-gradient(135deg, hsl(25 98% 55%), hsl(145 65% 35%))' }}
                        >
                          ⚡ Livraison en cours
                        </Badge>
                        <Badge variant="outline" className="border-orange-500">{currentDelivery.status}</Badge>
                      </div>
                      <h3 className="font-bold text-lg mb-3">
                        Livraison #{currentDelivery.id.slice(0, 8)}
                      </h3>
                      <div className="space-y-3">
                        <div className="flex items-start gap-3 p-3 bg-muted/50 rounded-lg">
                          <MapPin className="h-5 w-5 flex-shrink-0 text-primary mt-0.5" />
                          <div className="flex-1">
                            <p className="font-medium">Point de collecte</p>
                            <p className="text-sm text-muted-foreground mt-1">
                              {typeof currentDelivery.pickup_address === 'string' 
                                ? currentDelivery.pickup_address 
                                : JSON.stringify(currentDelivery.pickup_address)}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-start gap-3 p-3 bg-muted/50 rounded-lg">
                          <MapPin className="h-5 w-5 flex-shrink-0 text-green-500 mt-0.5" />
                          <div className="flex-1">
                            <p className="font-medium">Destination</p>
                            <p className="text-sm text-muted-foreground mt-1">
                              {typeof currentDelivery.delivery_address === 'string' 
                                ? currentDelivery.delivery_address 
                                : JSON.stringify(currentDelivery.delivery_address)}
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                    
                    <div className="p-5 bg-gradient-to-r from-orange-500/20 to-green-600/20 rounded-xl border border-orange-500/30">
                      <p className="text-sm text-muted-foreground mb-2 font-medium">💰 Votre rémunération</p>
                      <p className="text-4xl font-bold bg-gradient-to-r from-orange-600 to-green-600 bg-clip-text text-transparent">
                        {(currentDelivery.delivery_fee || 0).toLocaleString()} GNF
                      </p>
                    </div>

                    {trackingPoints.length > 0 && (
                      <div className="p-3 bg-muted/30 rounded-lg">
                        <p className="text-sm font-medium mb-1 flex items-center gap-2">
                          <Navigation className="h-4 w-4" />
                          Tracking GPS
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {trackingPoints.length} points enregistrés
                        </p>
                      </div>
                    )}

                    <div className="flex flex-col gap-2 pt-2">
                      {/* Composant de Navigation GPS avec données réelles */}
                      <DeliveryGPSNavigation 
                        activeDelivery={currentDelivery as any}
                        currentLocation={location ? { latitude: location.latitude, longitude: location.longitude } : null}
                        onContactCustomer={(phone) => window.open(`tel:${phone}`, '_self')}
                      />

                      {currentDelivery.status === 'picked_up' && (
                        <Button 
                          onClick={handleStartDelivery} 
                          disabled={loading}
                          className="w-full text-white"
                          size="lg"
                          style={{ background: 'linear-gradient(135deg, hsl(211 100% 50%), hsl(211 100% 40%))' }}
                        >
                          <Truck className="w-5 h-5 mr-2" /> 
                          🚀 Démarrer la livraison
                        </Button>
                      )}
                      
                      <div className="grid grid-cols-2 gap-2">
                        <Button 
                          onClick={() => setShowChat(true)} 
                          variant="outline"
                          className="w-full border-blue-500 text-blue-600 hover:bg-blue-50"
                        >
                          <MessageSquare className="w-4 h-4 mr-2" /> 
                          Chat
                        </Button>
                        <Button 
                          onClick={() => setShowProofUpload(true)} 
                          disabled={loading}
                          className="w-full text-white"
                          style={{ background: 'linear-gradient(135deg, hsl(145 65% 35%), hsl(145 65% 45%))' }}
                        >
                          <CheckCircle className="w-4 h-4 mr-2" /> 
                          Terminer
                        </Button>
                      </div>

                      {/* Bouton de paiement - 5 méthodes disponibles */}
                      {currentDelivery.status === 'delivered' && (currentDelivery as any).payment_status !== 'paid' && (
                        <Button 
                          onClick={handleProcessPayment} 
                          className="w-full text-white"
                          size="lg"
                          style={{ background: 'linear-gradient(135deg, hsl(142 76% 36%), hsl(142 76% 46%))' }}
                        >
                          <Wallet className="w-5 h-5 mr-2" /> 
                          💳 Traiter le paiement
                        </Button>
                      )}
                      
                      <Button 
                        onClick={handleReportProblem} 
                        variant="outline"
                        disabled={loading}
                        className="w-full border-red-500 text-red-600 hover:bg-red-50"
                      >
                        <AlertTriangle className="w-4 h-4 mr-2" /> 
                        Signaler un problème
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ) : currentRide ? (
              <Card className="shadow-lg border-yellow-500/30">
                <CardContent className="p-6">
                  <div className="space-y-4">
                    <div>
                      <div className="flex items-center justify-between mb-3">
                        <Badge className="bg-yellow-500">Course Taxi</Badge>
                        <Badge variant="outline">{currentRide.status}</Badge>
                      </div>
                      <h3 className="font-bold text-lg mb-3 flex items-center gap-2">
                        <Car className="h-5 w-5" />
                        Course #{currentRide.id.slice(0, 8)}
                      </h3>
                      <div className="space-y-3">
                        <div className="flex items-start gap-3 p-3 bg-muted/50 rounded-lg">
                          <MapPin className="h-5 w-5 flex-shrink-0 text-primary mt-0.5" />
                          <div className="flex-1">
                            <p className="font-medium">Point de départ</p>
                            <p className="text-sm text-muted-foreground mt-1">
                              {typeof currentRide.pickup_address === 'string' 
                                ? currentRide.pickup_address 
                                : 'Adresse non disponible'}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-start gap-3 p-3 bg-muted/50 rounded-lg">
                          <MapPin className="h-5 w-5 flex-shrink-0 text-green-500 mt-0.5" />
                          <div className="flex-1">
                            <p className="font-medium">Destination</p>
                            <p className="text-sm text-muted-foreground mt-1">
                              {typeof currentRide.dropoff_address === 'string' 
                                ? currentRide.dropoff_address 
                                : 'Adresse non disponible'}
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                    
                    <div className="p-4 bg-yellow-500/10 rounded-lg">
                      <p className="text-sm text-muted-foreground mb-1">Prix de la course</p>
                      <p className="text-3xl font-bold text-yellow-600">
                        {(currentRide.price_total || 0).toLocaleString()} GNF
                      </p>
                    </div>

                    <div className="flex flex-col gap-2 pt-2">
                      {currentRide.status === 'accepted' && (
                        <Button 
                          onClick={() => startRideFn(currentRide.id)} 
                          disabled={loading}
                          className="w-full bg-blue-600 hover:bg-blue-700"
                        >
                          <CheckCircle className="w-4 h-4 mr-2" /> 
                          Client récupéré
                        </Button>
                      )}
                      {(currentRide.status === 'picked_up' || currentRide.status === 'in_transit') && (
                        <Button 
                          onClick={() => completeRideFn(currentRide.id)} 
                          disabled={loading}
                          className="w-full bg-green-600 hover:bg-green-700"
                        >
                          <CheckCircle className="w-4 h-4 mr-2" /> 
                          Terminer la course
                        </Button>
                      )}
                      <Button 
                        onClick={(e) => {
                          e.preventDefault();
                          const problem = prompt("Décrivez le problème:");
                          if (problem && currentDelivery) reportProblem(currentDelivery.id, problem);
                        }} 
                        variant="destructive"
                        disabled={loading}
                        className="w-full"
                      >
                        <AlertTriangle className="w-4 h-4 mr-2" /> 
                        Signaler un problème
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ) : (
              <Card className="p-8">
                <div className="text-center text-muted-foreground">
                  <Clock className="h-12 w-12 mx-auto mb-3 opacity-50" />
                  <p className="font-medium">Aucune mission active</p>
                  <p className="text-sm mt-1">Acceptez une livraison ou une course pour commencer</p>
                </div>
              </Card>
            )}
          </TabsContent>

          {/* 📋 Historique unifié */}
          <TabsContent value="history" className="space-y-3">
            {deliveryHistory.length === 0 && rideHistory.length === 0 ? (
              <Card className="p-8">
                <div className="text-center text-muted-foreground">
                  <Clock className="h-12 w-12 mx-auto mb-3 opacity-50" />
                  <p className="font-medium">Aucun historique</p>
                  <p className="text-sm mt-1">Vos livraisons et courses terminées apparaîtront ici</p>
                </div>
              </Card>
            ) : (
              <>
                {/* Livraisons terminées */}
                {deliveryHistory.map((delivery) => {
                  const getStatusLabel = (status: string) => {
                    switch(status) {
                      case 'delivered': return 'Livrée';
                      case 'cancelled': return 'Annulée';
                      case 'pending': return 'En attente';
                      case 'assigned': return 'Assignée';
                      case 'picked_up': return 'Récupérée';
                      case 'in_transit': return 'En transit';
                      default: return status;
                    }
                  };
                  
                  return (
                    <Card key={delivery.id} className="shadow-sm">
                      <CardContent className="p-4">
                        <div className="flex justify-between items-start">
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <Package className="h-4 w-4 text-muted-foreground" />
                              <p className="font-medium">
                                Livraison #{delivery.id.slice(0, 8)}
                              </p>
                              <Badge variant={
                                delivery.status === 'delivered' ? 'default' : 
                                delivery.status === 'cancelled' ? 'destructive' : 
                                'secondary'
                              }>
                                {getStatusLabel(delivery.status)}
                              </Badge>
                            </div>
                            {(delivery as any).vendor_name && (
                              <p className="text-sm text-foreground">
                                🏪 {(delivery as any).vendor_name}
                              </p>
                            )}
                            {(delivery as any).customer_name && (
                              <p className="text-sm text-muted-foreground">
                                👤 {(delivery as any).customer_name}
                              </p>
                            )}
                            <p className="text-xs text-muted-foreground">
                              {new Date(delivery.created_at || '').toLocaleDateString('fr-FR', {
                                day: 'numeric',
                                month: 'long',
                                year: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit'
                              })}
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="font-bold text-primary">
                              +{((delivery as any).driver_earning || delivery.delivery_fee || 0).toLocaleString()} GNF
                            </p>
                            {(delivery as any).distance_km && (
                              <p className="text-xs text-muted-foreground">
                                {(delivery as any).distance_km} km
                              </p>
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
                
                {/* Courses taxi terminées */}
                {rideHistory.map((ride) => {
                  const getRideStatusLabel = (status: string) => {
                    switch(status) {
                      case 'completed': return 'Terminée';
                      case 'cancelled': return 'Annulée';
                      default: return status;
                    }
                  };
                  
                  return (
                    <Card key={ride.id} className="shadow-sm border-yellow-500/20">
                      <CardContent className="p-4">
                        <div className="flex justify-between items-start">
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <Car className="h-4 w-4 text-yellow-500" />
                              <p className="font-medium">Course #{ride.id.slice(0, 8)}</p>
                              <Badge variant={
                                ride.status === 'completed' ? 'default' : 
                                ride.status === 'cancelled' ? 'destructive' : 
                                'secondary'
                              }>
                                {getRideStatusLabel(ride.status)}
                              </Badge>
                            </div>
                            <p className="text-xs text-muted-foreground">
                              {new Date(ride.requested_at || '').toLocaleDateString('fr-FR', {
                                day: 'numeric',
                                month: 'long',
                                year: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit'
                              })}
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="font-bold text-yellow-600">
                              +{(ride.price_total || 0).toLocaleString()} GNF
                            </p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </>
            )}
          </TabsContent>

          {/* 💰 Portefeuille */}
          <TabsContent value="wallet">
            <div className="space-y-4">
              <WalletBalanceWidget />

              <Card className="shadow-md">
                <CardContent className="p-6">
                  <h3 className="font-semibold mb-4 flex items-center gap-2">
                    <TrendingUp className="h-5 w-5" />
                    Statistiques de livraison
                  </h3>
                  <div className="space-y-3">
                    <div className="flex justify-between items-center p-3 bg-muted/30 rounded-lg">
                      <span className="text-sm font-medium">Livraisons disponibles</span>
                      <Badge variant="secondary">{nearbyDeliveries.length}</Badge>
                    </div>
                    <div className="flex justify-between items-center p-3 bg-muted/30 rounded-lg">
                      <span className="text-sm font-medium">Livraison en cours</span>
                      <Badge variant={currentDelivery ? 'default' : 'secondary'}>
                        {currentDelivery ? '1' : '0'}
                      </Badge>
                    </div>
                    <div className="flex justify-between items-center p-3 bg-muted/30 rounded-lg">
                      <span className="text-sm font-medium">Livraisons terminées</span>
                      <Badge variant="outline">
                        {deliveryHistory.filter(d => d.status === 'delivered').length}
                      </Badge>
                    </div>
                    <div className="flex justify-between items-center p-3 bg-muted/30 rounded-lg">
                      <span className="text-sm font-medium">Statut GPS</span>
                      <Badge variant={location ? 'default' : 'secondary'}>
                        {location ? '✓ Actif' : 'Inactif'}
                      </Badge>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </ResponsiveContainer>
      
      {/* Dialog de chat pour communication avec client/vendeur */}
      <Dialog open={showChat} onOpenChange={setShowChat}>
        <DialogContent className="max-w-2xl h-[600px] p-0">
          <DialogHeader className="px-6 pt-6 pb-0">
            <DialogTitle>Communication - Livraison</DialogTitle>
          </DialogHeader>
          {currentDelivery && user && currentDelivery.client_id && (
            <div className="flex-1 px-6 pb-6 h-full overflow-hidden">
              <DeliveryChat
                deliveryId={currentDelivery.id}
                recipientId={currentDelivery.client_id}
                recipientName="Client"
                recipientRole="client"
              />
            </div>
          )}
        </DialogContent>
      </Dialog>
      
      {/* Modal de preuve de livraison */}
      {showProofUpload && currentDelivery && (
        <DeliveryProofUpload
          deliveryId={currentDelivery.id}
          onProofUploaded={handleCompleteWithProof}
          onCancel={() => setShowProofUpload(false)}
        />
      )}

      {/* Modal de paiement avec 5 méthodes */}
      {showPaymentModal && currentDelivery && user && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg max-w-md">
            <h3 className="font-bold mb-4">Traitement du paiement</h3>
            <p>Montant: {currentDelivery.delivery_fee} GNF</p>
            <Button onClick={() => setShowPaymentModal(false)} className="mt-4 w-full">Fermer</Button>
          </div>
        </div>
      )}
    </div>
    </DriverLayout>
    </>
    </Suspense>
  );
}
