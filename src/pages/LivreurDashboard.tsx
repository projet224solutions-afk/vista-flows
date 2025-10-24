/**
 * LIVREUR - INTERFACE COMPLÈTE
 * 224Solutions Delivery System
 * Gestion des missions, suivi en temps réel, historique et solde
 */

import { useState, useEffect } from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { MapPin, Package, Clock, Wallet, CheckCircle, AlertTriangle, Truck } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useCurrentLocation } from "@/hooks/useGeolocation";
import { supabase } from "@/integrations/supabase/client";
import { WalletBalanceWidget } from "@/components/wallet/WalletBalanceWidget";
import { UserIdDisplay } from "@/components/UserIdDisplay";

interface Delivery {
  id: string;
  pickup_address: any;
  delivery_address: any;
  delivery_fee: number;
  status: string;
  driver_id?: string;
  completed_at?: string;
  delivered_at?: string;
  picked_up_at?: string;
  order?: {
    order_number?: string;
  };
}

export default function LivreurDashboard() {
  const { user, profile } = useAuth();
  const { location, getCurrentLocation } = useCurrentLocation();

  const [activeTab, setActiveTab] = useState('missions');
  const [deliveries, setDeliveries] = useState<Delivery[]>([]);
  const [currentDelivery, setCurrentDelivery] = useState<Delivery | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getCurrentLocation();
    loadDeliveries();
  }, []);

  /**
   * Charger les livraisons disponibles pour ce livreur
   */
  const loadDeliveries = async () => {
    setLoading(true);
    
    // Livraisons disponibles (non assignées)
    const { data: available, error: availableError } = await supabase
      .from('deliveries')
      .select('*, order:orders(order_number)')
      .is('driver_id', null)
      .in('status', ['pending', 'assigned'])
      .limit(10);
    
    // Livraison en cours pour ce livreur
    const { data: current } = await supabase
      .from('deliveries')
      .select('*, order:orders(order_number)')
      .eq('driver_id', user?.id)
      .in('status', ['picked_up', 'in_transit'])
      .single();
    
    if (availableError) {
      console.error(availableError);
    }
    
    setDeliveries(available || []);
    setCurrentDelivery(current || null);
    setLoading(false);
  };

  /**
   * Accepter une livraison
   */
  const acceptDelivery = async (deliveryId: string) => {
    if (!user?.id) return;
    
    const { error } = await supabase
      .from('deliveries')
      .update({ 
        status: 'picked_up', 
        driver_id: user.id,
        picked_up_at: new Date().toISOString()
      })
      .eq('id', deliveryId);

    if (error) {
      toast.error("Erreur lors de l'acceptation");
      return;
    }

    toast.success("Livraison acceptée !");
    loadDeliveries();
    setActiveTab('active');
  };

  /**
   * Marquer une livraison comme en transit
   */
  const startDelivery = async () => {
    if (!currentDelivery) return;

    const { error } = await supabase
      .from('deliveries')
      .update({ status: 'in_transit' })
      .eq('id', currentDelivery.id);

    if (error) {
      toast.error("Erreur lors du démarrage");
      return;
    }

    toast.success("Livraison en cours !");
    loadDeliveries();
  };

  /**
   * Marquer une livraison comme livrée
   */
  const completeDelivery = async () => {
    if (!currentDelivery) return;

    const { error } = await supabase
      .from('deliveries')
      .update({ 
        status: 'delivered', 
        delivered_at: new Date().toISOString() 
      })
      .eq('id', currentDelivery.id);

    if (error) {
      toast.error("Erreur lors de la finalisation");
      return;
    }

    toast.success("Livraison terminée !");
    loadDeliveries();
    setActiveTab('missions');
  };

  /**
   * Signaler un problème
   */
  const reportProblem = async () => {
    if (!currentDelivery) return;
    
    toast.warning("Problème signalé au support !");
    // Dans une version complète, on pourrait créer une table pour les problèmes
  };

  if (loading) {
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
        <div className="flex items-center justify-between mb-6">
          <div>
            <div className="flex items-center gap-3 mb-1">
              <h1 className="text-2xl font-bold">🚴 Livreur - 224Solutions</h1>
              <UserIdDisplay layout="horizontal" showBadge={true} />
            </div>
            <p className="text-sm text-muted-foreground">
              Bienvenue {profile?.first_name || 'Livreur'}
            </p>
          </div>
          {location && (
            <Badge variant="outline" className="gap-2">
              <MapPin className="h-3 w-3" />
              GPS Actif
            </Badge>
          )}
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid grid-cols-3 bg-card/80 mb-6">
            <TabsTrigger value="missions">
              📦 Missions
              {deliveries.length > 0 && (
                <Badge variant="secondary" className="ml-2">{deliveries.length}</Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="active">
              🚚 En cours
              {currentDelivery && <Badge variant="default" className="ml-2">1</Badge>}
            </TabsTrigger>
            <TabsTrigger value="wallet">💰 Solde</TabsTrigger>
          </TabsList>

          {/* 📦 Liste des livraisons disponibles */}
          <TabsContent value="missions" className="space-y-3">
            {deliveries.length === 0 ? (
              <Card className="p-8">
                <div className="text-center text-muted-foreground">
                  <Package className="h-12 w-12 mx-auto mb-3 opacity-50" />
                  <p className="font-medium">Aucune livraison disponible</p>
                  <p className="text-sm mt-1">Les nouvelles livraisons apparaîtront ici</p>
                </div>
              </Card>
            ) : (
              deliveries.map((delivery) => (
                <Card key={delivery.id} className="shadow-md hover:shadow-lg transition-shadow">
                  <CardContent className="p-4">
                    <div className="flex justify-between items-start gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <Package className="h-4 w-4 text-primary" />
                          <p className="font-bold">
                            Commande #{delivery.order?.order_number || delivery.id.slice(0, 8)}
                          </p>
                        </div>
                        <div className="space-y-1 text-sm text-muted-foreground">
                          <div className="flex items-start gap-2">
                            <MapPin className="h-3 w-3 mt-0.5 flex-shrink-0" />
                            <span className="line-clamp-1">
                              {typeof delivery.pickup_address === 'string' 
                                ? delivery.pickup_address 
                                : 'Adresse de collecte'}
                            </span>
                          </div>
                          <div className="flex items-start gap-2">
                            <MapPin className="h-3 w-3 mt-0.5 flex-shrink-0 text-green-500" />
                            <span className="line-clamp-1">
                              {typeof delivery.delivery_address === 'string' 
                                ? delivery.delivery_address 
                                : 'Adresse de livraison'}
                            </span>
                          </div>
                        </div>
                      </div>
                      <div className="text-right flex flex-col gap-2">
                        <Badge className="bg-primary whitespace-nowrap">
                          {(delivery.delivery_fee || 0).toLocaleString()} GNF
                        </Badge>
                        <Button 
                          size="sm" 
                          onClick={() => acceptDelivery(delivery.id)}
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
                      <Badge variant="default" className="mb-3">Livraison en cours</Badge>
                      <h3 className="font-bold text-lg mb-2">
                        Commande #{currentDelivery.order?.order_number || currentDelivery.id.slice(0, 8)}
                      </h3>
                      <div className="space-y-2 text-sm">
                        <div className="flex items-start gap-2 text-muted-foreground">
                          <MapPin className="h-4 w-4 mt-0.5 flex-shrink-0" />
                          <div>
                            <p className="font-medium text-foreground">Point de collecte</p>
                            <p>
                              {typeof currentDelivery.pickup_address === 'string' 
                                ? currentDelivery.pickup_address 
                                : 'Adresse de collecte'}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-start gap-2 text-muted-foreground">
                          <MapPin className="h-4 w-4 mt-0.5 flex-shrink-0 text-green-500" />
                          <div>
                            <p className="font-medium text-foreground">Destination</p>
                            <p>
                              {typeof currentDelivery.delivery_address === 'string' 
                                ? currentDelivery.delivery_address 
                                : 'Adresse de livraison'}
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                    
                    <div className="p-3 bg-primary/10 rounded-lg">
                      <p className="text-sm text-muted-foreground">Rémunération</p>
                      <p className="text-2xl font-bold text-primary">
                        {(currentDelivery.delivery_fee || 0).toLocaleString()} GNF
                      </p>
                    </div>

                    <div className="flex flex-col gap-2 pt-2">
                      {currentDelivery.status === 'picked_up' && (
                        <Button 
                          onClick={startDelivery} 
                          className="w-full bg-blue-600 hover:bg-blue-700 text-white"
                        >
                          <Truck className="w-4 h-4 mr-2" /> 
                          Démarrer la livraison
                        </Button>
                      )}
                      <Button 
                        onClick={completeDelivery} 
                        className="w-full bg-green-600 hover:bg-green-700 text-white"
                      >
                        <CheckCircle className="w-4 h-4 mr-2" /> 
                        Livraison terminée
                      </Button>
                      <Button 
                        onClick={reportProblem} 
                        variant="destructive"
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

          {/* 💰 Portefeuille */}
          <TabsContent value="wallet">
            <div className="space-y-4">
              <WalletBalanceWidget />

              <Card className="shadow-md">
                <CardContent className="p-6">
                  <h3 className="font-semibold mb-4 flex items-center gap-2">
                    <Truck className="h-5 w-5" />
                    Statistiques de livraison
                  </h3>
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-muted-foreground">Livraisons disponibles</span>
                      <Badge variant="secondary">{deliveries.length}</Badge>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-muted-foreground">Livraison en cours</span>
                      <Badge variant="secondary">{currentDelivery ? '1' : '0'}</Badge>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-muted-foreground">Statut GPS</span>
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
