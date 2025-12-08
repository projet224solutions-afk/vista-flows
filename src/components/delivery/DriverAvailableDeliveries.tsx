/**
 * LIVRAISONS DISPONIBLES POUR LE LIVREUR
 * Affiche les offres avec les prix calculés selon la configuration du vendeur
 */

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Package, 
  RefreshCw, 
  MapPin,
  Navigation,
  Clock,
  DollarSign,
  Store,
  Phone,
  CreditCard,
  Route,
  Calculator,
  Check,
  X,
  Loader2,
  Truck,
  WifiOff
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useAuth } from '@/hooks/useAuth';

interface AvailableDelivery {
  id: string;
  vendor_id?: string;
  vendor_name?: string;
  vendor_phone?: string;
  vendor_location?: any;
  pickup_address: any;
  delivery_address: any;
  delivery_fee: number;
  distance_km?: number;
  distance_to_vendor?: number;
  distance_vendor_to_client?: number;
  total_distance?: number;
  estimated_time_minutes?: number;
  package_type?: string;
  package_description?: string;
  payment_method?: string;
  created_at: string;
  // Données de tarification
  base_price?: number;
  price_per_km?: number;
  distance_price?: number;
}

interface DriverAvailableDeliveriesProps {
  onAccept: (delivery: AvailableDelivery) => void;
  driverLocation?: { lat: number; lng: number } | null;
}

export function DriverAvailableDeliveries({ onAccept, driverLocation }: DriverAvailableDeliveriesProps) {
  const { user } = useAuth();
  const [deliveries, setDeliveries] = useState<AvailableDelivery[]>([]);
  const [loading, setLoading] = useState(false);
  const [acceptingId, setAcceptingId] = useState<string | null>(null);
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());

  const loadAvailableDeliveries = useCallback(async () => {
    setLoading(true);
    try {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);

      // Charger les livraisons en attente
      const { data, error } = await supabase
        .from('deliveries')
        .select('*')
        .eq('status', 'pending')
        .is('driver_id', null)
        .gte('created_at', yesterday.toISOString())
        .order('created_at', { ascending: false })
        .limit(20);

      if (error) throw error;

      const validDeliveries = (data || []).filter(d => 
        d.status === 'pending' && !d.driver_id && d.vendor_name
      );

      // Récupérer les configurations de prix des vendeurs
      const vendorIds = [...new Set(validDeliveries.filter(d => d.vendor_id).map(d => d.vendor_id))];
      let vendorPricing: Record<string, { base_price: number; price_per_km: number }> = {};

      if (vendorIds.length > 0) {
        const { data: vendorData } = await supabase
          .from('vendors')
          .select('id, delivery_base_price, delivery_price_per_km')
          .in('id', vendorIds);

        if (vendorData) {
          vendorData.forEach(v => {
            vendorPricing[v.id] = {
              base_price: v.delivery_base_price || 5000,
              price_per_km: v.delivery_price_per_km || 1000
            };
          });
        }
      }

      // Enrichir avec les données de tarification
      const enrichedDeliveries = validDeliveries.map(d => {
        const pricing = d.vendor_id ? vendorPricing[d.vendor_id] : null;
        const distanceKm = d.distance_km || d.distance_vendor_to_client || 5;

        return {
          ...d,
          base_price: pricing?.base_price || 5000,
          price_per_km: pricing?.price_per_km || 1000,
          distance_price: Math.round(distanceKm * (pricing?.price_per_km || 1000)),
          distance_vendor_to_client: distanceKm,
          total_distance: (d.distance_to_vendor || 2) + distanceKm
        };
      });

      setDeliveries(enrichedDeliveries);
      setLastRefresh(new Date());
    } catch (error) {
      console.error('Error loading deliveries:', error);
      toast.error('Erreur lors du chargement des livraisons');
    } finally {
      setLoading(false);
    }
  }, []);

  const handleAccept = async (delivery: AvailableDelivery) => {
    if (!user) return;

    setAcceptingId(delivery.id);
    try {
      // Vérifier disponibilité
      const { data: check, error: checkError } = await supabase
        .from('deliveries')
        .select('status, driver_id')
        .eq('id', delivery.id)
        .single();

      if (checkError) throw checkError;
      if (check.status !== 'pending' || check.driver_id) {
        toast.error('Cette livraison n\'est plus disponible');
        await loadAvailableDeliveries();
        return;
      }

      // Accepter la livraison
      const { error } = await supabase
        .from('deliveries')
        .update({
          driver_id: user.id,
          status: 'assigned',
          accepted_at: new Date().toISOString()
        })
        .eq('id', delivery.id)
        .eq('status', 'pending')
        .is('driver_id', null);

      if (error) throw error;

      toast.success('Livraison acceptée !');
      onAccept(delivery);
      setDeliveries(prev => prev.filter(d => d.id !== delivery.id));
    } catch (error) {
      console.error('Error accepting delivery:', error);
      toast.error('Erreur lors de l\'acceptation');
    } finally {
      setAcceptingId(null);
    }
  };

  const handleRefuse = (deliveryId: string) => {
    // Masquer localement (le livreur peut l'ignorer)
    setDeliveries(prev => prev.filter(d => d.id !== deliveryId));
    toast.info('Livraison ignorée');
  };

  // Charger au montage et s'abonner aux nouvelles livraisons
  useEffect(() => {
    loadAvailableDeliveries();

    // S'abonner aux nouvelles livraisons
    const channel = supabase
      .channel('new-deliveries')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'deliveries',
          filter: 'status=eq.pending'
        },
        () => {
          loadAvailableDeliveries();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [loadAvailableDeliveries]);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('fr-GN').format(amount) + ' GNF';
  };

  const parseAddress = (addr: any): string => {
    if (!addr) return 'Adresse non disponible';
    if (typeof addr === 'string') {
      try {
        const parsed = JSON.parse(addr);
        return parsed.address || addr;
      } catch {
        return addr;
      }
    }
    return addr.address || addr.name || 'Adresse non disponible';
  };

  if (deliveries.length === 0 && !loading) {
    return (
      <Card className="border-dashed">
        <CardContent className="pt-8 pb-8 text-center">
          <Package className="h-12 w-12 mx-auto text-muted-foreground/30 mb-4" />
          <p className="text-muted-foreground mb-4">Aucune livraison disponible</p>
          <Button onClick={loadAvailableDeliveries} variant="outline" disabled={loading}>
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Actualiser
          </Button>
          <p className="text-xs text-muted-foreground mt-2">
            Dernière mise à jour: {lastRefresh.toLocaleTimeString('fr-FR')}
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header avec refresh */}
      <div className="flex items-center justify-between">
        <h3 className="font-semibold flex items-center gap-2">
          <Truck className="h-5 w-5 text-orange-600" />
          Livraisons disponibles ({deliveries.length})
        </h3>
        <Button onClick={loadAvailableDeliveries} variant="outline" size="sm" disabled={loading}>
          <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
        </Button>
      </div>

      {/* Liste des livraisons */}
      {deliveries.map((delivery) => (
        <Card 
          key={delivery.id} 
          className="border-2 border-orange-200 hover:border-orange-400 transition-colors bg-gradient-to-br from-orange-50/50 to-green-50/50 dark:from-orange-950/20 dark:to-green-950/20"
        >
          <CardContent className="pt-4 space-y-4">
            {/* Vendeur */}
            <div className="flex items-start gap-3">
              <Store className="h-5 w-5 text-orange-600 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="font-semibold">{delivery.vendor_name || 'Vendeur'}</p>
                <p className="text-sm text-muted-foreground">{parseAddress(delivery.pickup_address)}</p>
                {delivery.vendor_phone && (
                  <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                    <Phone className="h-3 w-3" />
                    {delivery.vendor_phone}
                  </p>
                )}
              </div>
            </div>

            {/* Distances */}
            <div className="grid grid-cols-3 gap-2">
              <div className="text-center p-2 bg-orange-100/50 dark:bg-orange-900/20 rounded">
                <MapPin className="h-4 w-4 mx-auto text-orange-600 mb-1" />
                <p className="text-xs text-muted-foreground">Vers vendeur</p>
                <p className="font-bold text-sm text-orange-700 dark:text-orange-400">
                  {(delivery.distance_to_vendor || 2).toFixed(1)} km
                </p>
              </div>
              <div className="text-center p-2 bg-green-100/50 dark:bg-green-900/20 rounded">
                <Navigation className="h-4 w-4 mx-auto text-green-600 mb-1" />
                <p className="text-xs text-muted-foreground">Vers client</p>
                <p className="font-bold text-sm text-green-700 dark:text-green-400">
                  {(delivery.distance_vendor_to_client || delivery.distance_km || 5).toFixed(1)} km
                </p>
              </div>
              <div className="text-center p-2 bg-blue-100/50 dark:bg-blue-900/20 rounded">
                <Clock className="h-4 w-4 mx-auto text-blue-600 mb-1" />
                <p className="text-xs text-muted-foreground">Temps estimé</p>
                <p className="font-bold text-sm text-blue-700 dark:text-blue-400">
                  ~{delivery.estimated_time_minutes || 15} min
                </p>
              </div>
            </div>

            {/* Détail tarification vendeur */}
            <div className="p-3 bg-gradient-to-r from-emerald-50 to-green-50 dark:from-emerald-950/20 dark:to-green-950/20 rounded-lg border border-green-200/50">
              <div className="flex items-center gap-2 mb-2">
                <Calculator className="h-4 w-4 text-green-600" />
                <span className="text-xs font-medium text-green-700 dark:text-green-400">Tarification vendeur</span>
              </div>
              <div className="space-y-1 text-xs">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Prix de base</span>
                  <span>{formatCurrency(delivery.base_price || 5000)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">
                    Distance × {(delivery.price_per_km || 1000).toLocaleString()} GNF/km
                  </span>
                  <span>{formatCurrency(delivery.distance_price || 0)}</span>
                </div>
                <div className="flex justify-between pt-1 border-t border-green-200/50 font-medium">
                  <span>Total livraison</span>
                  <span className="text-green-700 dark:text-green-400">{formatCurrency(delivery.delivery_fee)}</span>
                </div>
              </div>
            </div>

            {/* Vos gains */}
            <div className="flex items-center justify-between p-2 bg-gradient-to-r from-green-500 to-emerald-500 rounded-lg text-white">
              <div className="flex items-center gap-2">
                <DollarSign className="h-5 w-5" />
                <div>
                  <p className="text-xs opacity-90">Vos gains (98.5%)</p>
                  <p className="font-bold">{formatCurrency(Math.round(delivery.delivery_fee * 0.985))}</p>
                </div>
              </div>
              <Badge 
                variant="secondary" 
                className={delivery.payment_method === 'cod' 
                  ? 'bg-yellow-100 text-yellow-800' 
                  : 'bg-white/20 text-white'
                }
              >
                <CreditCard className="h-3 w-3 mr-1" />
                {delivery.payment_method === 'cod' ? 'COD' : 'Prépayé'}
              </Badge>
            </div>

            {/* Colis */}
            <div className="flex items-center gap-2 text-sm">
              <Package className="h-4 w-4 text-muted-foreground" />
              <span>{delivery.package_type || delivery.package_description || 'Colis standard'}</span>
            </div>

            {/* Note sécurité */}
            <p className="text-xs text-center text-muted-foreground">
              🔒 L'adresse du client sera révélée après acceptation
            </p>

            {/* Actions */}
            <div className="grid grid-cols-2 gap-2">
              <Button
                variant="outline"
                size="sm"
                className="border-red-300 text-red-600 hover:bg-red-50"
                onClick={() => handleRefuse(delivery.id)}
                disabled={acceptingId === delivery.id}
              >
                <X className="h-4 w-4 mr-1" />
                Ignorer
              </Button>
              <Button
                size="sm"
                className="bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600"
                onClick={() => handleAccept(delivery)}
                disabled={acceptingId === delivery.id}
              >
                {acceptingId === delivery.id ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <>
                    <Check className="h-4 w-4 mr-1" />
                    Accepter
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}