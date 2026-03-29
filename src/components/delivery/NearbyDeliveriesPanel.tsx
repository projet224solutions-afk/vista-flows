/**
 * PANNEAU DES COLIS Ã€ PROXIMITÃ‰ - AMÃ‰LIORÃ‰
 * Affiche tous les dÃ©tails AVANT acceptation:
 * - Distance livreur â†’ vendeur
 * - Distance vendeur â†’ client  
 * - Prix total Ã  gagner
 * - Nom et adresse vendeur
 * - Adresse client CACHÃ‰E (sÃ©curitÃ©)
 */

import { useEffect, useState } from 'react';
import { useFormatCurrency } from '@/hooks/useFormatCurrency';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  MapPin, Package, Navigation, Phone, Store, Clock, 
  DollarSign, CreditCard, Truck, Check, X, Loader2, RefreshCw 
} from 'lucide-react';
import { DeliveryService, type NearbyDelivery } from '@/services/delivery/DeliveryService';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface EnhancedDelivery extends NearbyDelivery {
  vendor_name?: string;
  vendor_phone?: string;
  payment_method?: string;
  package_type?: string;
  distance_to_vendor?: number;
  distance_vendor_to_client?: number;
  total_distance?: number;
  estimated_earnings?: number;
  estimated_time?: number;
}

export function NearbyDeliveriesPanel() {
  const [deliveries, setDeliveries] = useState<EnhancedDelivery[]>([]);
  const [loading, setLoading] = useState(true);
  const [acceptingId, setAcceptingId] = useState<string | null>(null);
  const [userPosition, setUserPosition] = useState<{ lat: number; lng: number } | null>(null);

  useEffect(() => {
    loadNearbyDeliveries();
  }, []);

  const loadNearbyDeliveries = async () => {
    setLoading(true);
    try {
      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          async (position) => {
            const pos = { lat: position.coords.latitude, lng: position.coords.longitude };
            setUserPosition(pos);
            await fetchDeliveries(pos);
          },
          () => fetchDeliveries(null)
        );
      } else {
        await fetchDeliveries(null);
      }
    } catch (error) {
      console.error('Error loading deliveries:', error);
      toast.error('Erreur lors du chargement');
    } finally {
      setLoading(false);
    }
  };

  const fetchDeliveries = async (driverPos: { lat: number; lng: number } | null) => {
    try {
      // Charger les livraisons en attente (sans filtre ready_for_pickup pour inclure toutes les livraisons crÃ©Ã©es par les vendeurs)
      const { data, error } = await supabase
        .from('deliveries')
        .select('*')
        .eq('status', 'pending')
        .is('driver_id', null)
        .order('created_at', { ascending: false })
        .limit(20);

      if (error) throw error;

      const enhanced: EnhancedDelivery[] = (data || []).map((d: any) => {
        const pickup = typeof d.pickup_address === 'object' ? d.pickup_address : {};
        const delivery = typeof d.delivery_address === 'object' ? d.delivery_address : {};
        
        // Calcul simple des distances si position dispo
        let distToVendor = d.distance_to_vendor || 0;
        if (driverPos && pickup.lat && pickup.lng && !distToVendor) {
          distToVendor = calculateDistance(driverPos.lat, driverPos.lng, pickup.lat, pickup.lng);
        }
        
        const distVendorClient = d.distance_vendor_to_client || d.distance_km || 0;
        const totalDist = distToVendor + distVendorClient;
        const earnings = d.driver_earning || d.delivery_fee || Math.round(5000 + totalDist * 2000);

        return {
          id: d.id,
          pickup_address: pickup.address || 'Adresse de rÃ©cupÃ©ration',
          delivery_address: 'ðŸ”’ RÃ©vÃ©lÃ©e aprÃ¨s acceptation',
          pickup_lat: pickup.lat,
          pickup_lng: pickup.lng,
          delivery_lat: delivery.lat,
          delivery_lng: delivery.lng,
          distance_km: d.distance_km,
          delivery_fee: d.delivery_fee || 0,
          status: d.status,
          vendor_name: d.vendor_name || 'Vendeur',
          vendor_phone: d.vendor_phone,
          payment_method: d.payment_method || 'prepaid',
          package_type: d.package_type || 'Standard',
          distance_to_vendor: Math.round(distToVendor * 10) / 10,
          distance_vendor_to_client: Math.round(distVendorClient * 10) / 10,
          total_distance: Math.round(totalDist * 10) / 10,
          estimated_earnings: earnings,
          estimated_time: Math.round(totalDist * 3) || 30
        };
      });

      setDeliveries(enhanced);
    } catch (error) {
      console.error('Error fetching deliveries:', error);
      setDeliveries([]);
    } finally {
      setLoading(false);
    }
  };

  const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
    const R = 6371;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
              Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
              Math.sin(dLon/2) * Math.sin(dLon/2);
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  };

  const handleAccept = async (deliveryId: string) => {
    setAcceptingId(deliveryId);
    try {
      const acceptedDelivery = await DeliveryService.acceptDelivery(deliveryId);
      
      // Retirer immÃ©diatement de la liste pour un feedback visuel instantanÃ©
      setDeliveries(prev => prev.filter(d => d.id !== deliveryId));
      
      toast.success('âœ… Livraison acceptÃ©e avec succÃ¨s !', {
        description: 'Rendez-vous chez le vendeur pour rÃ©cupÃ©rer le colis'
      });
      
      // RafraÃ®chir la liste complÃ¨te aprÃ¨s un court dÃ©lai
      setTimeout(() => loadNearbyDeliveries(), 1000);
      
      return acceptedDelivery;
    } catch (error: any) {
      console.error('[NearbyDeliveriesPanel] Accept error:', error);
      toast.error(error.message || 'Erreur lors de l\'acceptation', {
        description: 'La livraison est peut-Ãªtre dÃ©jÃ  prise par un autre livreur'
      });
      // RafraÃ®chir pour avoir l'Ã©tat actuel
      loadNearbyDeliveries();
    } finally {
      setAcceptingId(null);
    }
  };

  const formatCurrency = useFormatCurrency();

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6 text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto text-orange-600" />
          <p className="mt-2 text-muted-foreground">Recherche de livraisons...</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Navigation className="h-5 w-5 text-orange-600" />
              Livraisons disponibles
            </CardTitle>
            <CardDescription>{deliveries.length} offres prÃ¨s de vous</CardDescription>
          </div>
          <Button variant="ghost" size="sm" onClick={loadNearbyDeliveries}>
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {deliveries.length === 0 ? (
          <div className="text-center py-8">
            <Package className="h-12 w-12 mx-auto text-muted-foreground/30 mb-2" />
            <p className="text-muted-foreground">Aucune livraison disponible</p>
          </div>
        ) : (
          deliveries.map((d) => (
            <div key={d.id} className="p-4 bg-gradient-to-r from-orange-50 to-primary-orange-50 dark:from-orange-950/20 dark:to-primary-orange-950/20 rounded-xl border border-orange-200/50 space-y-3">
              {/* Vendeur */}
              <div className="flex items-start gap-3">
                <Store className="h-5 w-5 text-orange-600 flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <p className="font-semibold">{d.vendor_name}</p>
                  <p className="text-sm text-muted-foreground">{d.pickup_address}</p>
                  {d.vendor_phone && (
                    <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                      <Phone className="h-3 w-3" /> {d.vendor_phone}
                    </p>
                  )}
                </div>
              </div>

              {/* Distances */}
              <div className="grid grid-cols-3 gap-2 text-center">
                <div className="p-2 bg-orange-100 dark:bg-orange-900/30 rounded-lg">
                  <p className="text-xs text-muted-foreground">Vous â†’ Vendeur</p>
                  <p className="font-bold text-orange-700">{d.distance_to_vendor} km</p>
                </div>
                <div className="p-2 bg-primary-orange-100 dark:bg-primary-orange-900/30 rounded-lg">
                  <p className="text-xs text-muted-foreground">Vendeur â†’ Client</p>
                  <p className="font-bold text-primary-orange-700">{d.distance_vendor_to_client} km</p>
                </div>
                <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                  <p className="text-xs text-muted-foreground">Total</p>
                  <p className="font-bold text-blue-700">{d.total_distance} km</p>
                </div>
              </div>

              {/* Prix et infos */}
              <div className="flex items-center justify-between p-3 bg-gradient-to-r from-primary-blue-500 to-primary-orange-500 rounded-lg text-white">
                <div className="flex items-center gap-2">
                  <DollarSign className="h-5 w-5" />
                  <span className="font-bold text-lg">{formatCurrency(d.estimated_earnings || 0)}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="secondary" className={d.payment_method === 'cod' ? 'bg-yellow-100 text-yellow-800' : 'bg-white/20 text-white'}>
                    <CreditCard className="h-3 w-3 mr-1" />
                    {d.payment_method === 'cod' ? 'COD' : 'PrÃ©payÃ©'}
                  </Badge>
                  <Badge variant="secondary" className="bg-white/20 text-white">
                    <Clock className="h-3 w-3 mr-1" />
                    ~{d.estimated_time} min
                  </Badge>
                </div>
              </div>

              {/* Note sÃ©curitÃ© */}
              <p className="text-xs text-center text-muted-foreground italic">
                ðŸ”’ L'adresse du client sera rÃ©vÃ©lÃ©e aprÃ¨s acceptation
              </p>

              {/* Bouton accepter */}
              <Button
                className="w-full bg-primary-blue-600 hover:bg-primary-blue-700 shadow-lg shadow-primary-orange-600/40"
                onClick={() => handleAccept(d.id)}
                disabled={acceptingId === d.id}
              >
                {acceptingId === d.id ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <>
                    <Check className="h-4 w-4 mr-2" />
                    Accepter cette livraison
                  </>
                )}
              </Button>
            </div>
          ))
        )}
      </CardContent>
    </Card>
  );
}
