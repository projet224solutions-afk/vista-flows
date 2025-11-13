/**
 * PANNEAU DES COLIS DU VENDEUR
 * Affiche tous les colis créés par le vendeur
 */

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { MapPin, Package, User, Clock, Truck } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';
import { ShipmentManager } from './shipment/ShipmentManager';
import { useCurrentVendor } from '@/hooks/useCurrentVendor';

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
}

export function VendorDeliveriesPanel() {
  const [deliveries, setDeliveries] = useState<VendorDelivery[]>([]);
  const [loading, setLoading] = useState(true);
  const [showShipmentManager, setShowShipmentManager] = useState(false);
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

      // Charger les livraisons du vendeur (client_id = vendor user_id)
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

  // Si on affiche le gestionnaire d'expéditions
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

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Package className="h-5 w-5 text-orange-600" />
              Mes colis à livrer
            </CardTitle>
            <CardDescription>
              {deliveries.length} colis au total
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
          {deliveries.length === 0 ? (
            <div className="text-center text-muted-foreground py-8">
              <Package className="h-12 w-12 mx-auto mb-2 opacity-30" />
              <p>Aucun colis créé pour le moment</p>
            </div>
          ) : (
            deliveries.map((delivery) => {
              const pickupAddr = typeof delivery.pickup_address === 'string'
                ? delivery.pickup_address
                : delivery.pickup_address?.address || JSON.stringify(delivery.pickup_address);
              const deliveryAddr = typeof delivery.delivery_address === 'string'
                ? delivery.delivery_address
                : delivery.delivery_address?.address || JSON.stringify(delivery.delivery_address);

              return (
                <div
                  key={delivery.id}
                  className="p-4 bg-gradient-to-r from-orange-50 to-white rounded-lg border space-y-3"
                >
                  <div className="flex items-start justify-between">
                    <div className="space-y-2 flex-1">
                      <div className="flex items-center gap-2">
                        <Badge className={getStatusColor(delivery.status)}>
                          {getStatusLabel(delivery.status)}
                        </Badge>
                        <Badge variant="outline">
                          {delivery.delivery_fee?.toLocaleString()} GNF
                        </Badge>
                        {!delivery.driver_id && (
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
                        <span>{format(new Date(delivery.created_at), 'dd/MM/yyyy HH:mm')}</span>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </CardContent>
    </Card>
  );
}
