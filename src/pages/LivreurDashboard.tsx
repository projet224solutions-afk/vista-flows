/**
 * LIVREUR - INTERFACE COMPLÈTE RESPONSIVE
 * 224Solutions Delivery System  
 * Toutes les fonctionnalités du Taxi-Moto intégrées + Responsive
 */

import { useState, useEffect } from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { MapPin, Package, Clock, Wallet, CheckCircle, AlertTriangle, Truck, Navigation, Bell, TrendingUp, Car } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useCurrentLocation } from "@/hooks/useGeolocation";
import { supabase } from "@/integrations/supabase/client";
import { useDelivery } from "@/hooks/useDelivery";
import { useTaxiRides } from "@/hooks/useTaxiRides";
import { useDriver } from "@/hooks/useDriver";
import { WalletBalanceWidget } from "@/components/wallet/WalletBalanceWidget";
import { UserIdDisplay } from "@/components/UserIdDisplay";
import { NearbyDeliveriesListener } from "@/components/delivery/NearbyDeliveriesListener";
import { DriverStatusToggle } from "@/components/driver/DriverStatusToggle";
import { EarningsDisplay } from "@/components/driver/EarningsDisplay";
import { DeliveryProofUpload } from "@/components/driver/DeliveryProofUpload";
import { useResponsive } from "@/hooks/useResponsive";
import { ResponsiveContainer, ResponsiveGrid } from "@/components/responsive/ResponsiveContainer";
import { MobileBottomNav } from "@/components/responsive/MobileBottomNav";
import CommunicationWidget from "@/components/communication/CommunicationWidget";
import { DriverLayout } from "@/components/driver/DriverLayout";

export default function LivreurDashboard() {
  const { user, profile } = useAuth();
  const { location, getCurrentLocation } = useCurrentLocation();
  const { isMobile, isTablet } = useResponsive();
  const [activeTab, setActiveTab] = useState('missions');
  const [showProofUpload, setShowProofUpload] = useState(false);

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
    acceptDelivery: acceptDeliveryFn,
    startDelivery: startDeliveryFn,
    completeDelivery: completeDeliveryFn,
    cancelDelivery,
    loadTracking,
    subscribeToTracking,
    trackPosition: trackDeliveryPosition,
    processPayment: processDeliveryPayment,
    loadDeliveryHistory,
    loadCurrentDelivery
  } = useDelivery();

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
  const error = deliveryError;

  // Charger la position GPS au montage
  useEffect(() => {
    getCurrentLocation().catch(err => {
      console.error('[LivreurDashboard] GPS error:', err);
      // L'erreur est gérée par le hook et affichée dans l'interface
    });
  }, [getCurrentLocation]);

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
      await acceptDeliveryFn(deliveryId);
      toast.success('Livraison acceptée! Direction le point de collecte.');
      setActiveTab('active');
      // Recharger les livraisons disponibles
      if (location) {
        await findNearbyDeliveries(location.latitude, location.longitude, 10);
      }
    } catch (error) {
      console.error('Error accepting delivery:', error);
      toast.error('Impossible d\'accepter cette livraison');
    }
  };

  /**
   * Démarrer une livraison
   */
  const handleStartDelivery = async () => {
    if (!currentDelivery) return;
    try {
      await startDeliveryFn(currentDelivery.id);
    } catch (error) {
      console.error('Error starting delivery:', error);
    }
  };

  /**
   * Terminer une livraison avec preuve
   */
  const handleCompleteWithProof = async (photoUrl: string, signature: string) => {
    if (!currentDelivery) return;
    try {
      // Enregistrer photo et signature dans la BD
      const { error: updateError } = await supabase
        .from('deliveries')
        .update({
          proof_photo_url: photoUrl,
          client_signature: signature
        })
        .eq('id', currentDelivery.id);

      if (updateError) throw updateError;

      // Terminer la livraison
      await completeDeliveryFn(currentDelivery.id);
      
      setShowProofUpload(false);
      setActiveTab('history');
      toast.success('🎉 Livraison terminée avec succès!');
    } catch (error) {
      console.error('Error completing delivery:', error);
      toast.error('Erreur lors de la finalisation');
    }
  };

  /**
   * Annuler une livraison
   */
  const handleCancelDelivery = async (reason: string) => {
    if (!currentDelivery) return;
    try {
      await cancelDelivery(currentDelivery.id, reason);
      setActiveTab('missions');
    } catch (error) {
      console.error('Error cancelling delivery:', error);
    }
  };

  /**
   * Signaler un problème
   */
  const reportProblem = () => {
    toast.warning("Problème signalé au support !");
  };

  /**
   * Traiter le paiement (livraison ou course)
   */
  const handleProcessPayment = async (paymentMethod: string) => {
    try {
      if (currentDelivery) {
        const result = await processDeliveryPayment(currentDelivery.id, paymentMethod);
        if (result.success) {
          setActiveTab('history');
        }
      } else if (currentRide) {
        const result = await processRidePayment(currentRide.id, paymentMethod);
        if (result.success) {
          setActiveTab('history');
        }
      }
    } catch (error) {
      console.error('Error processing payment:', error);
    }
  };

  if (loading && !currentDelivery && nearbyDeliveries.length === 0) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <Truck className="h-12 w-12 animate-bounce mx-auto mb-4 text-primary" />
          <p>Chargement des données...</p>
        </div>
      </div>
    );
  }

  return (
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

      <ResponsiveContainer maxWidth="full">
        {/* Statut du livreur Online/Offline */}
        {driver && (
          <DriverStatusToggle
            status={driver.status}
            isOnline={driver.is_online}
            onGoOnline={goOnline}
            onGoOffline={goOffline}
            onPause={pause}
          />
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
                🚴 Tableau de Bord Livreur
              </h1>
            </div>
            <p className="text-sm md:text-base text-muted-foreground">
              Bienvenue {profile?.first_name || 'Livreur'} - 224Solutions Delivery
            </p>
            {(currentDelivery || currentRide) && (
              <Badge 
                variant="default" 
                className="mt-2 gap-1"
                style={{ background: 'linear-gradient(135deg, hsl(25 98% 55%), hsl(145 65% 35%))' }}
              >
                ⚡ {currentDelivery ? 'Livraison en cours' : 'Course en cours'}
              </Badge>
            )}
          </div>
          
          {/* Boutons de navigation */}
          <div className="flex gap-2">
            <Button
              onClick={() => window.location.href = '/delivery-request'}
              style={{ 
                background: 'linear-gradient(135deg, hsl(25 98% 55%), hsl(145 65% 35%))',
                color: 'white'
              }}
              className="gap-2"
            >
              <Package className="h-4 w-4" />
              {!isMobile && 'Nouvelle Livraison'}
            </Button>
            <Button
              onClick={() => window.location.href = '/taxi-moto'}
              variant="outline"
              className="gap-2 border-orange-500/30"
            >
              <Car className="h-4 w-4" />
              {!isMobile && 'Taxi-Moto'}
            </Button>
          </div>
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

            {nearbyDeliveries.length === 0 ? (
              <Card className="p-8 border-2 border-dashed border-orange-500/30 bg-gradient-to-br from-orange-500/5 to-transparent">
                <div className="text-center text-muted-foreground">
                  <Package className="h-16 w-16 mx-auto mb-4 text-orange-500 opacity-50" />
                  <p className="font-medium text-lg">Aucune livraison disponible</p>
                  <p className="text-sm mt-2">
                    Les nouvelles missions apparaîtront ici automatiquement
                  </p>
                  {location && (
                    <Button 
                      onClick={() => findNearbyDeliveries(location.latitude, location.longitude, 10)}
                      variant="outline"
                      className="mt-6 border-orange-500 text-orange-600 hover:bg-orange-50"
                    >
                      <Navigation className="h-4 w-4 mr-2" />
                      Actualiser les missions
                    </Button>
                  )}
                </div>
              </Card>
            ) : (
              <ResponsiveGrid mobileCols={1} tabletCols={2} desktopCols={2} gap={isMobile ? "sm" : "md"}>
                {nearbyDeliveries.map((delivery) => (
                <Card key={delivery.id} className="shadow-md hover:shadow-lg transition-shadow">
                  <CardContent className="p-4">
                    <div className="flex justify-between items-start gap-4">
                      <div className="flex-1 space-y-2">
                        <div className="flex items-center gap-2">
                          <Package className="h-4 w-4 text-primary" />
                          <p className="font-bold">Livraison #{delivery.id.slice(0, 8)}</p>
                          {delivery.distance_km && (
                            <Badge variant="outline" className="text-xs">
                              {delivery.distance_km.toFixed(1)} km
                            </Badge>
                          )}
                        </div>
                        <div className="space-y-1 text-sm">
                          <div className="flex items-start gap-2 text-muted-foreground">
                            <MapPin className="h-3 w-3 mt-0.5 flex-shrink-0" />
                            <span className="line-clamp-2">{delivery.pickup_address || 'Adresse de collecte'}</span>
                          </div>
                          <div className="flex items-start gap-2 text-muted-foreground">
                            <MapPin className="h-3 w-3 mt-0.5 flex-shrink-0 text-green-500" />
                            <span className="line-clamp-2">{delivery.delivery_address || 'Adresse de livraison'}</span>
                          </div>
                        </div>
                        {delivery.customer_name && (
                          <p className="text-xs text-muted-foreground">Client: {delivery.customer_name}</p>
                        )}
                        {delivery.notes && (
                          <p className="text-xs text-muted-foreground italic">Note: {delivery.notes}</p>
                        )}
                      </div>
                      <div className="text-right flex flex-col gap-2">
                        <Badge className="whitespace-nowrap text-base font-bold"
                          style={{ background: 'linear-gradient(135deg, hsl(25 98% 55%), hsl(145 65% 35%))' }}>
                          {(delivery.delivery_fee || 0).toLocaleString()} GNF
                        </Badge>
                        <Button 
                          size="sm" 
                          onClick={() => handleAcceptDelivery(delivery.id)}
                          disabled={loading}
                          className="whitespace-nowrap gap-2"
                          style={{ background: 'linear-gradient(135deg, hsl(25 98% 55%), hsl(145 65% 35%))' }}
                        >
                          {loading ? (
                            <>
                              <div className="h-3 w-3 animate-spin rounded-full border-2 border-current border-t-transparent" />
                              Acceptation...
                            </>
                          ) : (
                            <>
                              <CheckCircle className="h-3 w-3" />
                              Accepter
                            </>
                          )}
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                ))}
              </ResponsiveGrid>
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
                      <Button 
                        onClick={() => setShowProofUpload(true)} 
                        disabled={loading}
                        className="w-full text-white"
                        size="lg"
                        style={{ background: 'linear-gradient(135deg, hsl(145 65% 35%), hsl(145 65% 45%))' }}
                      >
                        <CheckCircle className="w-5 h-5 mr-2" /> 
                        ✅ Terminer & Confirmer
                      </Button>
                      
                      <Button 
                        onClick={reportProblem} 
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
                        onClick={reportProblem} 
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
                {deliveryHistory.map((delivery) => (
                <Card key={delivery.id} className="shadow-sm">
                  <CardContent className="p-4">
                    <div className="flex justify-between items-start">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <Package className="h-4 w-4 text-muted-foreground" />
                          <p className="font-medium">#{delivery.id.slice(0, 8)}</p>
                          <Badge variant={
                            delivery.status === 'delivered' ? 'default' : 
                            delivery.status === 'cancelled' ? 'destructive' : 
                            'secondary'
                          }>
                            {delivery.status}
                          </Badge>
                        </div>
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
                          {(delivery.delivery_fee || 0).toLocaleString()} GNF
                        </p>
                      </div>
                    </div>
                  </CardContent>
                  </Card>
                ))}
                
                {/* Courses taxi terminées */}
                {rideHistory.map((ride) => (
                <Card key={ride.id} className="shadow-sm border-yellow-500/20">
                  <CardContent className="p-4">
                    <div className="flex justify-between items-start">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <Car className="h-4 w-4 text-yellow-500" />
                          <p className="font-medium">#{ride.id.slice(0, 8)}</p>
                          <Badge variant={
                            ride.status === 'completed' ? 'default' : 
                            ride.status === 'cancelled' ? 'destructive' : 
                            'secondary'
                          }>
                            {ride.status}
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
                          {(ride.price_total || 0).toLocaleString()} GNF
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
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
      
      {/* Modal de preuve de livraison */}
      {showProofUpload && currentDelivery && (
        <DeliveryProofUpload
          deliveryId={currentDelivery.id}
          onProofUploaded={handleCompleteWithProof}
          onCancel={() => setShowProofUpload(false)}
        />
      )}
    </div>
    </DriverLayout>
  );
}
