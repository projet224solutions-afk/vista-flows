/**
 * LIVREUR - INTERFACE COMPLÈTE
 * 224Solutions Delivery System  
 * Toutes les fonctionnalités du Taxi-Moto intégrées
 */

import { useState, useEffect } from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { MapPin, Package, Clock, Wallet, CheckCircle, AlertTriangle, Truck, Navigation, Bell, TrendingUp } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useCurrentLocation } from "@/hooks/useGeolocation";
import { useDelivery } from "@/hooks/useDelivery";
import { WalletBalanceWidget } from "@/components/wallet/WalletBalanceWidget";
import { UserIdDisplay } from "@/components/UserIdDisplay";

export default function LivreurDashboard() {
  const { user, profile } = useAuth();
  const { location, getCurrentLocation } = useCurrentLocation();
  const [activeTab, setActiveTab] = useState('missions');

  const {
    currentDelivery,
    deliveryHistory,
    nearbyDeliveries,
    trackingPoints,
    loading,
    error,
    findNearbyDeliveries,
    acceptDelivery: acceptDeliveryFn,
    startDelivery: startDeliveryFn,
    completeDelivery: completeDeliveryFn,
    cancelDelivery,
    loadTracking,
    subscribeToTracking,
    trackPosition,
    processPayment,
    loadDeliveryHistory,
    loadCurrentDelivery
  } = useDelivery();

  // Charger la position au montage
  useEffect(() => {
    getCurrentLocation();
  }, []);

  // Charger les livraisons à proximité quand la position change
  useEffect(() => {
    if (location && !currentDelivery) {
      findNearbyDeliveries(location.latitude, location.longitude, 10);
    }
  }, [location, currentDelivery]);

  // S'abonner au tracking en temps réel si livraison en cours
  useEffect(() => {
    if (currentDelivery) {
      const unsubscribe = subscribeToTracking(currentDelivery.id);
      
      // Envoyer la position toutes les 10 secondes
      const intervalId = setInterval(() => {
        if (location) {
          trackPosition(
            currentDelivery.id,
            location.latitude,
            location.longitude,
            undefined, // speed
            undefined, // heading  
            location.accuracy
          );
        }
      }, 10000);

      return () => {
        unsubscribe();
        clearInterval(intervalId);
      };
    }
  }, [currentDelivery, location]);

  /**
   * Accepter une livraison
   */
  const handleAcceptDelivery = async (deliveryId: string) => {
    try {
      await acceptDeliveryFn(deliveryId);
      setActiveTab('active');
      if (location) {
        await findNearbyDeliveries(location.latitude, location.longitude, 10);
      }
    } catch (error) {
      console.error('Error accepting delivery:', error);
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
   * Terminer une livraison
   */
  const handleCompleteDelivery = async () => {
    if (!currentDelivery) return;
    try {
      await completeDeliveryFn(currentDelivery.id);
      setActiveTab('history');
    } catch (error) {
      console.error('Error completing delivery:', error);
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
    // Appeler handleCancelDelivery avec une raison si nécessaire
  };

  /**
   * Traiter le paiement
   */
  const handleProcessPayment = async (paymentMethod: string) => {
    if (!currentDelivery) return;
    try {
      const result = await processPayment(currentDelivery.id, paymentMethod);
      if (result.success) {
        setActiveTab('history');
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
    <div className="min-h-screen bg-gradient-to-b from-background to-secondary/10 p-4">
      <div className="max-w-4xl mx-auto">
        {/* En-tête avec informations utilisateur */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <div className="flex items-center gap-3 mb-1">
              <h1 className="text-2xl font-bold">🚴 Livreur - 224Solutions</h1>
              <UserIdDisplay layout="horizontal" showBadge={true} />
            </div>
            <p className="text-sm text-muted-foreground">
              Bienvenue {profile?.first_name || 'Livreur'}
            </p>
            {currentDelivery && (
              <Badge variant="default" className="mt-1">
                Livraison en cours
              </Badge>
            )}
          </div>
          <div className="flex flex-col gap-2 items-end">
            <Badge variant={location ? 'default' : 'secondary'} className="gap-2">
              <Navigation className="h-3 w-3" />
              GPS {location ? 'Actif' : 'Inactif'}
            </Badge>
            {nearbyDeliveries.length > 0 && (
              <Badge variant="outline" className="gap-1">
                <Bell className="h-3 w-3" />
                {nearbyDeliveries.length} nouvelles
              </Badge>
            )}
          </div>
        </div>

        {/* Onglets de navigation */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid grid-cols-4 bg-card/80 mb-6">
            <TabsTrigger value="missions">
              📦 Missions
              {nearbyDeliveries.length > 0 && (
                <Badge variant="secondary" className="ml-2">{nearbyDeliveries.length}</Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="active" disabled={!currentDelivery}>
              🚚 En cours
              {currentDelivery && <Badge variant="default" className="ml-2">1</Badge>}
            </TabsTrigger>
            <TabsTrigger value="history">
              📋 Historique
              {deliveryHistory.length > 0 && (
                <Badge variant="outline" className="ml-2">{deliveryHistory.length}</Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="wallet">💰 Solde</TabsTrigger>
          </TabsList>

          {/* 📦 Liste des livraisons disponibles */}
          <TabsContent value="missions" className="space-y-3">
            {nearbyDeliveries.length === 0 ? (
              <Card className="p-8">
                <div className="text-center text-muted-foreground">
                  <Package className="h-12 w-12 mx-auto mb-3 opacity-50" />
                  <p className="font-medium">Aucune livraison disponible</p>
                  <p className="text-sm mt-1">
                    {!location 
                      ? "Activez le GPS pour voir les missions à proximité"
                      : "Les nouvelles livraisons apparaîtront ici"}
                  </p>
                </div>
              </Card>
            ) : (
              nearbyDeliveries.map((delivery) => (
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
                        <Badge className="bg-primary whitespace-nowrap text-base font-bold">
                          {(delivery.delivery_fee || 0).toLocaleString()} GNF
                        </Badge>
                        <Button 
                          size="sm" 
                          onClick={() => handleAcceptDelivery(delivery.id)}
                          disabled={loading}
                          className="whitespace-nowrap"
                        >
                          Accepter
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </TabsContent>

          {/* 🚚 Livraison en cours */}
          <TabsContent value="active">
            {currentDelivery ? (
              <Card className="shadow-lg">
                <CardContent className="p-6">
                  <div className="space-y-4">
                    <div>
                      <div className="flex items-center justify-between mb-3">
                        <Badge variant="default">Livraison en cours</Badge>
                        <Badge variant="outline">{currentDelivery.status}</Badge>
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
                    
                    <div className="p-4 bg-primary/10 rounded-lg">
                      <p className="text-sm text-muted-foreground mb-1">Rémunération</p>
                      <p className="text-3xl font-bold text-primary">
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
                          className="w-full bg-blue-600 hover:bg-blue-700 text-white"
                        >
                          <Truck className="w-4 h-4 mr-2" /> 
                          Démarrer la livraison
                        </Button>
                      )}
                      <Button 
                        onClick={handleCompleteDelivery} 
                        disabled={loading}
                        className="w-full bg-green-600 hover:bg-green-700 text-white"
                      >
                        <CheckCircle className="w-4 h-4 mr-2" /> 
                        Livraison terminée
                      </Button>
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
                  <p className="font-medium">Aucune livraison active</p>
                  <p className="text-sm mt-1">Acceptez une livraison pour commencer</p>
                </div>
              </Card>
            )}
          </TabsContent>

          {/* 📋 Historique */}
          <TabsContent value="history" className="space-y-3">
            {deliveryHistory.length === 0 ? (
              <Card className="p-8">
                <div className="text-center text-muted-foreground">
                  <Clock className="h-12 w-12 mx-auto mb-3 opacity-50" />
                  <p className="font-medium">Aucun historique</p>
                  <p className="text-sm mt-1">Vos livraisons terminées apparaîtront ici</p>
                </div>
              </Card>
            ) : (
              deliveryHistory.map((delivery) => (
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
              ))
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
      </div>
    </div>
  );
}
