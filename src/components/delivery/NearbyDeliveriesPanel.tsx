/**
 * PANNEAU DES COLIS À PROXIMITÉ
 * Affiche tous les colis disponibles près du livreur
 */

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { MapPin, Package, Navigation, Phone, User } from 'lucide-react';
import { DeliveryService, type NearbyDelivery } from '@/services/delivery/DeliveryService';
import { toast } from 'sonner';

export function NearbyDeliveriesPanel() {
  const [deliveries, setDeliveries] = useState<NearbyDelivery[]>([]);
  const [loading, setLoading] = useState(true);
  const [userPosition, setUserPosition] = useState<{ lat: number; lng: number } | null>(null);

  useEffect(() => {
    loadNearbyDeliveries();
  }, []);

  const loadNearbyDeliveries = async () => {
    setLoading(true);
    try {
      // Obtenir la position du livreur
      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          async (position) => {
            const pos = {
              lat: position.coords.latitude,
              lng: position.coords.longitude
            };
            setUserPosition(pos);

            // Charger les livraisons à proximité (10km)
            const nearby = await DeliveryService.findNearbyDeliveries(pos.lat, pos.lng, 10);
            setDeliveries(nearby);
            setLoading(false);
          },
          (error) => {
            console.error('Geolocation error:', error);
            // Charger toutes les livraisons sans filtre de distance
            loadAllDeliveries();
          }
        );
      } else {
        loadAllDeliveries();
      }
    } catch (error) {
      console.error('Error loading deliveries:', error);
      toast.error('Erreur lors du chargement');
      setLoading(false);
    }
  };

  const loadAllDeliveries = async () => {
    try {
      const all = await DeliveryService.findNearbyDeliveries(0, 0, 99999);
      setDeliveries(all);
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAcceptDelivery = async (deliveryId: string) => {
    try {
      await DeliveryService.acceptDelivery(deliveryId);
      toast.success('✅ Livraison acceptée !');
      loadNearbyDeliveries();
    } catch (error) {
      console.error('Error accepting delivery:', error);
      toast.error('Erreur lors de l\'acceptation');
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-center text-muted-foreground">Chargement des colis...</div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Navigation className="h-5 w-5 text-orange-600" />
          Colis à proximité
        </CardTitle>
        <CardDescription>
          {deliveries.length} colis disponibles pour livraison
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {deliveries.length === 0 ? (
            <div className="text-center text-muted-foreground py-8">
              <Package className="h-12 w-12 mx-auto mb-2 opacity-30" />
              <p>Aucun colis disponible pour le moment</p>
            </div>
          ) : (
            deliveries.map((delivery) => (
              <div
                key={delivery.id}
                className="p-4 bg-gradient-to-r from-orange-50 to-green-50 rounded-lg border border-orange-200/50 space-y-3"
              >
                <div className="flex items-start justify-between">
                  <div className="space-y-2 flex-1">
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary" className="bg-orange-100 text-orange-800">
                        {delivery.delivery_fee?.toLocaleString()} GNF
                      </Badge>
                      {delivery.distance_km && (
                        <Badge variant="outline">
                          {delivery.distance_km.toFixed(1)} km
                        </Badge>
                      )}
                    </div>
                    
                    <div className="space-y-1">
                      <div className="flex items-start gap-2 text-sm">
                        <MapPin className="h-4 w-4 text-orange-600 flex-shrink-0 mt-0.5" />
                        <div>
                          <p className="font-medium text-orange-900">Retrait</p>
                          <p className="text-muted-foreground">{delivery.pickup_address}</p>
                        </div>
                      </div>
                      
                      <div className="flex items-start gap-2 text-sm">
                        <MapPin className="h-4 w-4 text-green-600 flex-shrink-0 mt-0.5" />
                        <div>
                          <p className="font-medium text-green-900">Livraison</p>
                          <p className="text-muted-foreground">{delivery.delivery_address}</p>
                        </div>
                      </div>
                    </div>

                    {delivery.customer_name && (
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <User className="h-4 w-4" />
                        <span>{delivery.customer_name}</span>
                        {delivery.customer_phone && (
                          <>
                            <Phone className="h-4 w-4" />
                            <span>{delivery.customer_phone}</span>
                          </>
                        )}
                      </div>
                    )}

                    {delivery.notes && (
                      <p className="text-sm text-muted-foreground italic">
                        Note: {delivery.notes}
                      </p>
                    )}
                  </div>
                </div>

                <Button
                  className="w-full"
                  size="sm"
                  onClick={() => handleAcceptDelivery(delivery.id)}
                  style={{ 
                    background: 'linear-gradient(135deg, hsl(25 98% 55%), hsl(145 65% 35%))',
                    color: 'white'
                  }}
                >
                  <Package className="h-4 w-4 mr-2" />
                  Accepter cette livraison
                </Button>
              </div>
            ))
          )}
        </div>
      </CardContent>
    </Card>
  );
}
