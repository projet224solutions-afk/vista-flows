/**
 * PANNEAU DES COLIS DU VENDEUR
 * Affiche tous les colis créés par le vendeur + Configuration tarification
 */

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { MapPin, Package, User, Clock, Truck, Settings, List, CheckCircle, Image, PenTool } from 'lucide-react';
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
  const [activeTab, setActiveTab] = useState('deliveries');
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
        .eq('client_id', user.id)
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;

      setDeliveries(data as any || []);
    } catch (error) {
      console.error('Error loading vendor deliveries:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'picked_up': return 'bg-blue-100 text-blue-800';
      case 'in_transit': return 'bg-purple-100 text-purple-800';
      case 'delivered': return 'bg-green-100 text-green-800';
      case 'cancelled': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'pending': return 'En attente';
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
          <div className="text-center text-muted-foreground">Chargement...</div>
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
          onClick={() => setShowShipmentManager(false)}
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
    <div className="space-y-4">
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="deliveries" className="gap-2">
            <List className="h-4 w-4" />
            En cours ({pendingDeliveries.length})
          </TabsTrigger>
          <TabsTrigger value="delivered" className="gap-2">
            <CheckCircle className="h-4 w-4" />
            Livrées ({completedDeliveries.length})
          </TabsTrigger>
          <TabsTrigger value="pricing" className="gap-2">
            <Settings className="h-4 w-4" />
            Tarifs
          </TabsTrigger>
        </TabsList>

        <TabsContent value="deliveries" className="mt-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Package className="h-5 w-5 text-orange-600" />
                    Livraisons en cours
                  </CardTitle>
                  <CardDescription>
                    {pendingDeliveries.length} colis en attente ou en livraison
                  </CardDescription>
                </div>
                <Button
                  onClick={() => setShowShipmentManager(true)}
                  className="bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700"
                >
                  <Truck className="mr-2 h-4 w-4" />
                  Gestion expéditions
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {pendingDeliveries.length === 0 ? (
                  <div className="text-center text-muted-foreground py-8">
                    <Package className="h-12 w-12 mx-auto mb-2 opacity-30" />
                    <p>Aucune livraison en cours</p>
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
                {completedDeliveries.length} livraisons terminées avec succès
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