/**
 * NEARBY LIVRAISON PAGE
 * Liste des livreurs disponibles à proximité
 * 224Solutions - Optimisé
 */

import { useState, useEffect, useCallback, useMemo, memo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  ArrowLeft,
  Package,
  MapPin,
  Star,
  RefreshCw,
  Loader2,
  Truck,
  Clock,
  User,
  Bike,
  Car,
  AlertCircle
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import QuickFooter from "@/components/QuickFooter";
import { useGeoDistance } from "@/hooks/useGeoDistance";
import {
  type NearbyDriver,
  type DriverProfile,
  processDeliveryDriver,
  processTaxiDriver,
  filterDriversByRadius,
  sortDrivers,
  createProfileMap,
  formatDriverDistance,
} from '@/lib/drivers';

const RADIUS_KM = 20;

// Composant mémoïsé pour la carte du livreur
interface DriverCardProps {
  driver: NearbyDriver;
  onRequestDelivery: () => void;
}

const DriverCard = memo(function DriverCard({ driver, onRequestDelivery }: DriverCardProps) {
  const getVehicleIcon = (type: string) => {
    switch (type) {
      case 'car': return <Car className="w-4 h-4" />;
      case 'moto': return <Bike className="w-4 h-4" />;
      default: return <Truck className="w-4 h-4" />;
    }
  };

  const totalDeliveries = driver.source === 'drivers'
    ? driver.total_deliveries
    : (driver as any).total_rides ?? 0;

  return (
    <Card className="border-border/50 hover:border-orange-500/50 transition-colors">
      <CardContent className="p-4">
        <div className="flex items-center gap-4">
          {/* Avatar */}
          <div className="relative">
            <div className="w-14 h-14 rounded-full bg-orange-100 flex items-center justify-center">
              {driver.profile?.avatar_url ? (
                <img
                  src={driver.profile.avatar_url}
                  alt=""
                  className="w-14 h-14 rounded-full object-cover"
                  loading="lazy"
                />
              ) : (
                <User className="w-6 h-6 text-orange-600" />
              )}
            </div>
            <div className={`absolute -bottom-1 -right-1 w-4 h-4 rounded-full border-2 border-white ${
              driver.is_online ? 'bg-green-500' : 'bg-gray-400'
            }`} />
          </div>

          {/* Info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <h3 className="font-semibold text-foreground truncate">
                {driver.profile?.first_name || 'Livreur'} {driver.profile?.last_name?.charAt(0) || ''}
              </h3>
              <Badge variant={driver.is_online ? 'default' : 'secondary'} className="text-xs">
                {driver.is_online ? 'En ligne' : 'Hors ligne'}
              </Badge>
            </div>

            <div className="flex items-center gap-3 text-xs text-muted-foreground">
              {/* Rating - seulement si disponible */}
              {driver.rating !== null && driver.rating > 0 && (
                <span className="flex items-center gap-1">
                  <Star className="w-3 h-3 text-yellow-500 fill-yellow-500" />
                  {driver.rating.toFixed(1)}
                </span>
              )}
              <span className="flex items-center gap-1">
                <Clock className="w-3 h-3" />
                {totalDeliveries || 0} livraisons
              </span>
              {driver.distance !== undefined && (
                <span className="flex items-center gap-1">
                  <MapPin className="w-3 h-3" />
                  {formatDriverDistance(driver.distance)}
                </span>
              )}
            </div>

            <div className="flex items-center gap-1 text-xs text-muted-foreground mt-1">
              {getVehicleIcon(driver.vehicle_type)}
              <span className="capitalize">{driver.vehicle_type}</span>
            </div>
          </div>

          {/* Action */}
          <Button
            size="sm"
            onClick={onRequestDelivery}
            disabled={!driver.is_online}
            className="bg-orange-500 hover:bg-orange-600"
          >
            <Package className="w-4 h-4 mr-1" />
            Envoyer
          </Button>
        </div>
      </CardContent>
    </Card>
  );
});

export default function NearbyLivraison() {
  const navigate = useNavigate();
  const [drivers, setDrivers] = useState<NearbyDriver[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // ✅ Utiliser useGeoDistance centralisé (fallback: Coyah)
  const { userPosition, positionReady, refreshPosition } = useGeoDistance();

  const loadDrivers = useCallback(async () => {
    if (!positionReady) return;

    setLoading(true);
    setError(null);

    try {
      const position = { lat: userPosition.latitude, lng: userPosition.longitude };

      // ✅ Requêtes parallèles optimisées
      const [deliveryRes, taxiRes] = await Promise.all([
        supabase
          .from('drivers')
          .select(`
            id,
            user_id,
            vehicle_type,
            status,
            is_online,
            current_location,
            rating,
            total_deliveries,
            profiles:user_id (id, first_name, last_name, phone, avatar_url)
          `)
          .or('status.eq.active,is_online.eq.true'),

        supabase
          .from('taxi_drivers')
          .select(`
            id,
            user_id,
            vehicle_type,
            status,
            is_online,
            last_lat,
            last_lng,
            rating,
            total_rides,
            profiles:user_id (id, first_name, last_name, phone, avatar_url)
          `)
          .eq('is_online', true),
      ]);

      if (deliveryRes.error) throw new Error(`Erreur drivers: ${deliveryRes.error.message}`);
      if (taxiRes.error) throw new Error(`Erreur taxi: ${taxiRes.error.message}`);

      const allDrivers: NearbyDriver[] = [];

      // Traitement des delivery drivers avec profil inclus
      for (const raw of deliveryRes.data || []) {
        const profile = raw.profiles as unknown as DriverProfile | null;
        const profileMap = new Map<string, DriverProfile>();
        if (profile?.id) profileMap.set(raw.user_id, profile);

        allDrivers.push(processDeliveryDriver(raw, position, profileMap));
      }

      // Traitement des taxi drivers avec profil inclus
      for (const raw of taxiRes.data || []) {
        const profile = raw.profiles as unknown as DriverProfile | null;
        const profileMap = new Map<string, DriverProfile>();
        if (profile?.id) profileMap.set(raw.user_id, profile);

        allDrivers.push(processTaxiDriver(raw, position, profileMap));
      }

      // Filtrer par rayon et trier
      const filtered = filterDriversByRadius(allDrivers, RADIUS_KM);
      const sorted = sortDrivers(filtered);

      setDrivers(sorted);
    } catch (err) {
      console.error('Error loading drivers:', err);
      setError(err instanceof Error ? err.message : 'Erreur lors du chargement');
    } finally {
      setLoading(false);
    }
  }, [positionReady, userPosition]);

  // Charger les livreurs quand la position est prête
  useEffect(() => {
    if (positionReady) {
      loadDrivers();
    }
  }, [positionReady, loadDrivers]);

  // Fonction de rafraîchissement
  const handleRefresh = useCallback(async () => {
    await refreshPosition();
    await loadDrivers();
  }, [refreshPosition, loadDrivers]);

  const handleRequestDelivery = useCallback(() => {
    navigate('/delivery-request');
  }, [navigate]);

  // Mémoïser le contenu de la liste
  const driversList = useMemo(() => {
    if (loading) {
      return (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <Card key={i} className="border-border/50">
              <CardContent className="p-4">
                <div className="flex items-center gap-4">
                  <Skeleton className="w-14 h-14 rounded-full" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-4 w-32" />
                    <Skeleton className="h-3 w-24" />
                  </div>
                  <Skeleton className="h-9 w-24" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      );
    }

    if (error) {
      return (
        <Card className="border-border/50">
          <CardContent className="p-8 text-center">
            <AlertCircle className="w-12 h-12 text-destructive mx-auto mb-4" />
            <h3 className="font-semibold text-foreground mb-2">Erreur de chargement</h3>
            <p className="text-sm text-muted-foreground mb-4">{error}</p>
            <Button variant="outline" onClick={loadDrivers}>
              <RefreshCw className="w-4 h-4 mr-2" />
              Réessayer
            </Button>
          </CardContent>
        </Card>
      );
    }

    if (drivers.length === 0) {
      return (
        <Card className="border-border/50">
          <CardContent className="p-8 text-center">
            <Package className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="font-semibold text-foreground mb-2">Aucun livreur disponible</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Réessayez dans quelques instants
            </p>
            <Button variant="outline" onClick={loadDrivers}>
              <RefreshCw className="w-4 h-4 mr-2" />
              Actualiser
            </Button>
          </CardContent>
        </Card>
      );
    }

    return (
      <div className="space-y-3">
        {drivers.map((driver) => (
          <DriverCard
            key={`${driver.source}-${driver.id}`}
            driver={driver}
            onRequestDelivery={handleRequestDelivery}
          />
        ))}
      </div>
    );
  }, [loading, error, drivers, loadDrivers, handleRequestDelivery]);

  return (
    <div className="min-h-screen bg-gradient-to-b from-background via-background to-muted/30 pb-24">
      {/* Header */}
      <div className="sticky top-0 z-40 bg-background/95 backdrop-blur-xl border-b border-border/50">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate(-1)}
              className="rounded-full"
            >
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div className="flex-1">
              <h1 className="text-xl font-bold text-foreground flex items-center gap-2">
                <Package className="w-5 h-5 text-orange-500" />
                Livraison à Proximité
              </h1>
              <p className="text-xs text-muted-foreground">
                {drivers.length} livreur{drivers.length !== 1 ? 's' : ''} dans un rayon de {RADIUS_KM} km
              </p>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={handleRefresh}
              disabled={loading}
              className="rounded-full"
            >
              {loading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <RefreshCw className="w-5 h-5" />
              )}
            </Button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-6 space-y-4">
        {/* Quick Request Button */}
        <Card className="bg-gradient-to-r from-orange-500 to-orange-600 border-0 shadow-lg">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="text-white">
                <h3 className="font-semibold">Demander une livraison</h3>
                <p className="text-sm opacity-90">Envoyez un colis rapidement</p>
              </div>
              <Button
                onClick={handleRequestDelivery}
                className="bg-white text-orange-600 hover:bg-white/90"
              >
                <Truck className="w-4 h-4 mr-2" />
                Commander
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Drivers List */}
        {driversList}
      </div>

      <QuickFooter />
    </div>
  );
}
