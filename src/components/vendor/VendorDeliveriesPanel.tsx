/**
 * PANNEAU DES COLIS DU VENDEUR
 * Affiche tous les colis créés par le vendeur + Configuration tarification
 */

import { useEffect, useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { 
  MapPin, Package, User, Clock, Truck, Settings, List, CheckCircle, Image, PenTool,
  TrendingUp, CircleDollarSign, Timer, RefreshCw, XCircle
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { ShipmentManager } from './shipment/ShipmentManager';
import { useCurrentVendor } from '@/hooks/useCurrentVendor';
import VendorDeliveryPricing from './settings/VendorDeliveryPricing';

interface VendorDelivery {
  id: string;
  pickup_address: any;
  delivery_address: any;
  delivery_fee: number;
  status: string;
  customer_name?: string;
  customer_phone?: string;
  package_description?: string;
  created_at: string;
  driver_id?: string;
  distance_km?: number;
  completed_at?: string;
  proof_photo_url?: string;
  client_signature?: string;
}

export function VendorDeliveriesPanel() {
  const [deliveries, setDeliveries] = useState<VendorDelivery[]>([]);
  const [loading, setLoading] = useState(true);
  const [showShipmentManager, setShowShipmentManager] = useState(false);
  const [activeTab, setActiveTab] = useState('overview');
  const [selectedDelivery, setSelectedDelivery] = useState<VendorDelivery | null>(null);
  const { vendorId, user, loading: vendorLoading } = useCurrentVendor();

  useEffect(() => {
    if (!vendorLoading && vendorId && user) {
      loadVendorDeliveries();
    }
  }, [vendorId, user, vendorLoading]);

  const loadVendorDeliveries = async () => {
    if (!vendorId || !user) return;
    
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('deliveries')
        .select('*')
        .eq('vendor_id', vendorId)
        .order('created_at', { ascending: false })
        .limit(100);

      if (error) throw error;
      setDeliveries(data as any || []);
    } catch (error) {
      console.error('Error loading vendor deliveries:', error);
    } finally {
      setLoading(false);
    }
  };

  // Statistiques calculées
  const stats = useMemo(() => {
    const pending = deliveries.filter(d => d.status === 'pending');
    const inProgress = deliveries.filter(d => ['assigned', 'picked_up', 'in_transit'].includes(d.status));
    const completed = deliveries.filter(d => d.status === 'delivered');
    const cancelled = deliveries.filter(d => d.status === 'cancelled');
    
    const totalRevenue = completed.reduce((sum, d) => sum + (d.delivery_fee || 0), 0);
    const totalDistance = completed.reduce((sum, d) => sum + (d.distance_km || 0), 0);
    
    return {
      total: deliveries.length,
      pending: pending.length,
      inProgress: inProgress.length,
      completed: completed.length,
      cancelled: cancelled.length,
      totalRevenue,
      totalDistance,
      successRate: deliveries.length > 0 
        ? Math.round((completed.length / (deliveries.length - cancelled.length)) * 100) || 0
        : 0
    };
  }, [deliveries]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400';
      case 'assigned': return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400';
      case 'picked_up': return 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-400';
      case 'in_transit': return 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400';
      case 'delivered': return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400';
      case 'cancelled': return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400';
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'pending': return 'En attente';
      case 'assigned': return 'Assigné';
      case 'picked_up': return 'Récupéré';
      case 'in_transit': return 'En livraison';
      case 'delivered': return 'Livré';
      case 'cancelled': return 'Annulé';
      default: return status;
    }
  };

  const pendingDeliveries = deliveries.filter(d => d.status !== 'delivered' && d.status !== 'cancelled');
  const completedDeliveries = deliveries.filter(d => d.status === 'delivered');

  if (loading || vendorLoading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-center gap-2 text-muted-foreground">
            <RefreshCw className="h-4 w-4 animate-spin" />
            Chargement...
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!vendorId) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-center text-muted-foreground">
            Impossible de charger les données du vendeur
          </div>
        </CardContent>
      </Card>
    );
  }

  if (showShipmentManager) {
    return (
      <div className="space-y-4">
        <Button
          variant="outline"
          onClick={() => {
            setShowShipmentManager(false);
            loadVendorDeliveries();
          }}
        >
          ← Retour aux livraisons
        </Button>
        <ShipmentManager />
      </div>
    );
  }

  const renderDeliveryCard = (delivery: VendorDelivery, showDetails = false) => {
    const pickupAddr = typeof delivery.pickup_address === 'string'
      ? delivery.pickup_address
      : delivery.pickup_address?.address || JSON.stringify(delivery.pickup_address);
    const deliveryAddr = typeof delivery.delivery_address === 'string'
      ? delivery.delivery_address
      : delivery.delivery_address?.address || JSON.stringify(delivery.delivery_address);

    return (
      <div
        key={delivery.id}
        className="p-4 bg-gradient-to-r from-orange-50 to-white dark:from-orange-950/20 dark:to-background rounded-lg border space-y-3"
      >
        <div className="flex items-start justify-between">
          <div className="space-y-2 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <Badge className={getStatusColor(delivery.status)}>
                {getStatusLabel(delivery.status)}
              </Badge>
              <Badge variant="outline">
                {delivery.delivery_fee?.toLocaleString()} GNF
              </Badge>
              {delivery.distance_km && (
                <Badge variant="secondary">
                  {delivery.distance_km} km
                </Badge>
              )}
              {!delivery.driver_id && delivery.status !== 'delivered' && (
                <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">
                  Sans livreur
                </Badge>
              )}
            </div>

            <div className="space-y-1 text-sm">
              <div className="flex items-start gap-2">
                <MapPin className="h-4 w-4 text-orange-600 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-medium">Retrait</p>
                  <p className="text-muted-foreground">{pickupAddr}</p>
                </div>
              </div>

              <div className="flex items-start gap-2">
                <MapPin className="h-4 w-4 text-green-600 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-medium">Livraison</p>
                  <p className="text-muted-foreground">{deliveryAddr}</p>
                </div>
              </div>
            </div>

            {delivery.customer_name && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <User className="h-4 w-4" />
                <span>{delivery.customer_name}</span>
                {delivery.customer_phone && (
                  <span>- {delivery.customer_phone}</span>
                )}
              </div>
            )}

            {delivery.package_description && (
              <p className="text-sm text-muted-foreground">
                <Package className="h-4 w-4 inline mr-1" />
                {delivery.package_description}
              </p>
            )}

            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Clock className="h-3 w-3" />
              <span>Créé: {format(new Date(delivery.created_at), 'dd/MM/yyyy HH:mm', { locale: fr })}</span>
            </div>

            {/* Bouton voir détails pour les livraisons complétées */}
            {showDetails && delivery.status === 'delivered' && (
              <Button
                variant="outline"
                size="sm"
                className="mt-2"
                onClick={() => setSelectedDelivery(delivery)}
              >
                <CheckCircle className="h-4 w-4 mr-2 text-green-600" />
                Voir détails de confirmation
              </Button>
            )}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header avec bouton de création */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Truck className="h-6 w-6 text-orange-600" />
            Gestion des Livraisons
          </h2>
          <p className="text-muted-foreground">Suivez et gérez toutes vos expéditions</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={loadVendorDeliveries}>
            <RefreshCw className="h-4 w-4 mr-1" />
            Actualiser
          </Button>
          <Button
            onClick={() => setShowShipmentManager(true)}
            className="bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700"
          >
            <Package className="mr-2 h-4 w-4" />
            Nouvelle Expédition
          </Button>
        </div>
      </div>

      {/* Statistiques détaillées */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
        <Card className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-950/30 dark:to-blue-900/20 border-blue-200 dark:border-blue-800">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-blue-600 dark:text-blue-400 font-medium">Total</p>
                <p className="text-2xl font-bold text-blue-700 dark:text-blue-300">{stats.total}</p>
              </div>
              <Package className="h-8 w-8 text-blue-500/50" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-yellow-50 to-amber-100 dark:from-yellow-950/30 dark:to-amber-900/20 border-yellow-200 dark:border-yellow-800">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-yellow-600 dark:text-yellow-400 font-medium">En attente</p>
                <p className="text-2xl font-bold text-yellow-700 dark:text-yellow-300">{stats.pending}</p>
              </div>
              <Timer className="h-8 w-8 text-yellow-500/50" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-950/30 dark:to-purple-900/20 border-purple-200 dark:border-purple-800">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-purple-600 dark:text-purple-400 font-medium">En cours</p>
                <p className="text-2xl font-bold text-purple-700 dark:text-purple-300">{stats.inProgress}</p>
              </div>
              <Truck className="h-8 w-8 text-purple-500/50" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-green-50 to-emerald-100 dark:from-green-950/30 dark:to-emerald-900/20 border-green-200 dark:border-green-800">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-green-600 dark:text-green-400 font-medium">Livrées</p>
                <p className="text-2xl font-bold text-green-700 dark:text-green-300">{stats.completed}</p>
              </div>
              <CheckCircle className="h-8 w-8 text-green-500/50" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-orange-50 to-orange-100 dark:from-orange-950/30 dark:to-orange-900/20 border-orange-200 dark:border-orange-800">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-orange-600 dark:text-orange-400 font-medium">Revenus</p>
                <p className="text-lg font-bold text-orange-700 dark:text-orange-300">
                  {stats.totalRevenue.toLocaleString()}
                  <span className="text-xs ml-1">GNF</span>
                </p>
              </div>
              <CircleDollarSign className="h-8 w-8 text-orange-500/50" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-teal-50 to-teal-100 dark:from-teal-950/30 dark:to-teal-900/20 border-teal-200 dark:border-teal-800">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-teal-600 dark:text-teal-400 font-medium">Taux réussite</p>
                <p className="text-2xl font-bold text-teal-700 dark:text-teal-300">{stats.successRate}%</p>
              </div>
              <TrendingUp className="h-8 w-8 text-teal-500/50" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Onglets */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-4 h-12">
          <TabsTrigger value="overview" className="gap-2 data-[state=active]:bg-orange-100 data-[state=active]:text-orange-700">
            <TrendingUp className="h-4 w-4" />
            Vue d'ensemble
          </TabsTrigger>
          <TabsTrigger value="deliveries" className="gap-2 data-[state=active]:bg-yellow-100 data-[state=active]:text-yellow-700">
            <List className="h-4 w-4" />
            En cours ({pendingDeliveries.length})
          </TabsTrigger>
          <TabsTrigger value="delivered" className="gap-2 data-[state=active]:bg-green-100 data-[state=active]:text-green-700">
            <CheckCircle className="h-4 w-4" />
            Livrées ({completedDeliveries.length})
          </TabsTrigger>
          <TabsTrigger value="pricing" className="gap-2 data-[state=active]:bg-blue-100 data-[state=active]:text-blue-700">
            <Settings className="h-4 w-4" />
            Tarifs
          </TabsTrigger>
        </TabsList>

        {/* Vue d'ensemble */}
        <TabsContent value="overview" className="mt-4 space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Dernières livraisons en cours */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Timer className="h-5 w-5 text-yellow-600" />
                  Livraisons en cours
                </CardTitle>
              </CardHeader>
              <CardContent>
                {pendingDeliveries.length === 0 ? (
                  <div className="text-center text-muted-foreground py-6">
                    <Package className="h-10 w-10 mx-auto mb-2 opacity-30" />
                    <p className="text-sm">Aucune livraison en cours</p>
                  </div>
                ) : (
                  <div className="space-y-2 max-h-[300px] overflow-y-auto">
                    {pendingDeliveries.slice(0, 5).map((delivery) => (
                      <div key={delivery.id} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                        <div className="flex-1 min-w-0">
                          <p className="font-medium truncate">{delivery.customer_name || 'Client'}</p>
                          <p className="text-xs text-muted-foreground truncate">
                            {typeof delivery.delivery_address === 'string' 
                              ? delivery.delivery_address 
                              : delivery.delivery_address?.address}
                          </p>
                        </div>
                        <Badge className={getStatusColor(delivery.status)}>
                          {getStatusLabel(delivery.status)}
                        </Badge>
                      </div>
                    ))}
                    {pendingDeliveries.length > 5 && (
                      <Button 
                        variant="ghost" 
                        className="w-full text-sm"
                        onClick={() => setActiveTab('deliveries')}
                      >
                        Voir tout ({pendingDeliveries.length})
                      </Button>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Dernières livraisons complétées */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg flex items-center gap-2">
                  <CheckCircle className="h-5 w-5 text-green-600" />
                  Récemment livrées
                </CardTitle>
              </CardHeader>
              <CardContent>
                {completedDeliveries.length === 0 ? (
                  <div className="text-center text-muted-foreground py-6">
                    <CheckCircle className="h-10 w-10 mx-auto mb-2 opacity-30" />
                    <p className="text-sm">Aucune livraison complétée</p>
                  </div>
                ) : (
                  <div className="space-y-2 max-h-[300px] overflow-y-auto">
                    {completedDeliveries.slice(0, 5).map((delivery) => (
                      <div 
                        key={delivery.id} 
                        className="flex items-center justify-between p-3 bg-green-50 dark:bg-green-950/20 rounded-lg cursor-pointer hover:bg-green-100 dark:hover:bg-green-950/30 transition-colors"
                        onClick={() => setSelectedDelivery(delivery)}
                      >
                        <div className="flex-1 min-w-0">
                          <p className="font-medium truncate">{delivery.customer_name || 'Client'}</p>
                          <p className="text-xs text-muted-foreground">
                            {delivery.completed_at 
                              ? format(new Date(delivery.completed_at), 'dd/MM HH:mm', { locale: fr })
                              : '-'}
                          </p>
                        </div>
                        <span className="text-sm font-medium text-green-600">
                          {delivery.delivery_fee?.toLocaleString()} GNF
                        </span>
                      </div>
                    ))}
                    {completedDeliveries.length > 5 && (
                      <Button 
                        variant="ghost" 
                        className="w-full text-sm"
                        onClick={() => setActiveTab('delivered')}
                      >
                        Voir tout ({completedDeliveries.length})
                      </Button>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="deliveries" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Package className="h-5 w-5 text-orange-600" />
                Livraisons en cours
              </CardTitle>
              <CardDescription>
                {pendingDeliveries.length} colis en attente ou en livraison
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {pendingDeliveries.length === 0 ? (
                  <div className="text-center text-muted-foreground py-8">
                    <Package className="h-12 w-12 mx-auto mb-2 opacity-30" />
                    <p>Aucune livraison en cours</p>
                    <Button 
                      variant="outline" 
                      className="mt-4"
                      onClick={() => setShowShipmentManager(true)}
                    >
                      Créer une expédition
                    </Button>
                  </div>
                ) : (
                  pendingDeliveries.map((delivery) => renderDeliveryCard(delivery, false))
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="delivered" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CheckCircle className="h-5 w-5 text-green-600" />
                Livraisons complétées
              </CardTitle>
              <CardDescription>
                {completedDeliveries.length} livraisons terminées • {stats.totalRevenue.toLocaleString()} GNF générés
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {completedDeliveries.length === 0 ? (
                  <div className="text-center text-muted-foreground py-8">
                    <CheckCircle className="h-12 w-12 mx-auto mb-2 opacity-30" />
                    <p>Aucune livraison complétée</p>
                  </div>
                ) : (
                  completedDeliveries.map((delivery) => renderDeliveryCard(delivery, true))
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="pricing" className="mt-4">
          <VendorDeliveryPricing vendorId={vendorId} />
        </TabsContent>
      </Tabs>

      {/* Dialog détails de confirmation */}
      <Dialog open={!!selectedDelivery} onOpenChange={() => setSelectedDelivery(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-green-600" />
              Détails de la livraison
            </DialogTitle>
          </DialogHeader>
          
          {selectedDelivery && (
            <div className="space-y-4">
              {/* Infos client */}
              <div className="p-3 bg-muted rounded-lg">
                <p className="font-medium">{selectedDelivery.customer_name || 'Client'}</p>
                {selectedDelivery.customer_phone && (
                  <p className="text-sm text-muted-foreground">{selectedDelivery.customer_phone}</p>
                )}
              </div>

              {/* Date de confirmation */}
              <div className="flex items-center gap-3 p-3 bg-green-50 dark:bg-green-950/30 rounded-lg">
                <Clock className="h-5 w-5 text-green-600" />
                <div>
                  <p className="text-sm font-medium">Livré le</p>
                  <p className="text-sm text-muted-foreground">
                    {selectedDelivery.completed_at 
                      ? format(new Date(selectedDelivery.completed_at), "EEEE dd MMMM yyyy 'à' HH:mm", { locale: fr })
                      : 'Date non disponible'}
                  </p>
                </div>
              </div>

              {/* Photo preuve */}
              {selectedDelivery.proof_photo_url ? (
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Image className="h-4 w-4 text-blue-600" />
                    <span className="text-sm font-medium">Photo de preuve</span>
                  </div>
                  <img 
                    src={selectedDelivery.proof_photo_url} 
                    alt="Preuve de livraison" 
                    className="w-full rounded-lg border object-cover max-h-48"
                  />
                </div>
              ) : (
                <div className="flex items-center gap-2 text-sm text-muted-foreground p-3 bg-muted rounded-lg">
                  <Image className="h-4 w-4" />
                  <span>Aucune photo de preuve</span>
                </div>
              )}

              {/* Signature */}
              {selectedDelivery.client_signature ? (
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <PenTool className="h-4 w-4 text-purple-600" />
                    <span className="text-sm font-medium">Signature du client</span>
                  </div>
                  <div className="border rounded-lg p-2 bg-white">
                    <img 
                      src={selectedDelivery.client_signature} 
                      alt="Signature client" 
                      className="w-full h-24 object-contain"
                    />
                  </div>
                </div>
              ) : (
                <div className="flex items-center gap-2 text-sm text-muted-foreground p-3 bg-muted rounded-lg">
                  <PenTool className="h-4 w-4" />
                  <span>Aucune signature</span>
                </div>
              )}

              {/* Montant */}
              <div className="flex items-center justify-between p-3 bg-orange-50 dark:bg-orange-950/30 rounded-lg">
                <span className="font-medium">Frais de livraison</span>
                <span className="font-bold text-orange-600">
                  {selectedDelivery.delivery_fee?.toLocaleString()} GNF
                </span>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}