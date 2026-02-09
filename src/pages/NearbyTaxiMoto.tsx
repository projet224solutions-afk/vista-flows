/**
 * NEARBY TAXI-MOTO PAGE
 * Liste des taxi-motos disponibles à proximité
 * 224Solutions - Ultra Optimisé v2
 */

import { useState, useEffect, useCallback, memo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  ArrowLeft,
  Bike,
  MapPin,
  Star,
  Navigation,
  RefreshCw,
  Loader2,
  Phone,
  Clock,
  User,
  AlertCircle
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import QuickFooter from "@/components/QuickFooter";
import { useGeoDistance } from "@/hooks/useGeoDistance";
import {
  type TaxiDriver,
  processTaxiDriver,
  filterDriversByRadius,
  sortDrivers,
  formatDriverDistance,
  getVehiclePlateDisplay,
  extractProfilesFromJoinedData,
} from '@/lib/drivers';

const RADIUS_KM = 20;
const AUTO_REFRESH_INTERVAL = 20000; // 20 secondes
const MAX_DRIVERS_LIMIT = 100;

// ============================================================================
// Composant mémoïsé pour la carte du conducteur
// ============================================================================

interface TaxiDriverCardProps {
  driver: TaxiDriver;
  onBook: (driverId: string) => void;
}

const TaxiDriverCard = memo(function TaxiDriverCard({ driver, onBook }: TaxiDriverCardProps) {
  const displayName = driver.profile?.first_name
    ? `${driver.profile.first_name}${driver.profile.last_name ? ` ${driver.profile.last_name.charAt(0)}.` : ''}`
    : 'Conducteur';
  const vehiclePlate = getVehiclePlateDisplay(driver);
  const isAvailable = driver.status === 'available';

  return (
    <Card className="border-border/50 hover:border-emerald-500/50 transition-colors">
      <CardContent className="p-4">
        <div className="flex items-center gap-4">
          {/* Avatar */}
          <div className="relative">
            <div className="w-14 h-14 rounded-full bg-emerald-100 flex items-center justify-center">
              {driver.profile?.avatar_url ? (
                <img
                  src={driver.profile.avatar_url}
                  alt=""
                  className="w-14 h-14 rounded-full object-cover"
                  loading="lazy"
                />
              ) : (
                <User className="w-6 h-6 text-emerald-600" />
              )}
            </div>
            {/* Status indicator */}
            <div className={`absolute -bottom-1 -right-1 w-4 h-4 rounded-full border-2 border-white ${
              isAvailable ? 'bg-green-500' : 'bg-yellow-500'
            }`} />
          </div>

          {/* Info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <h3 className="font-semibold text-foreground truncate">
                {displayName}
              </h3>
              <Badge variant={isAvailable ? 'default' : 'secondary'} className="text-xs">
                {isAvailable ? 'Disponible' : 'En course'}
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
                {driver.total_rides ?? 0} courses
              </span>
              {driver.distance !== undefined && (
                <span className="flex items-center gap-1">
                  <MapPin className="w-3 h-3" />
                  {formatDriverDistance(driver.distance)}
                </span>
              )}
            </div>

            <p className="text-xs text-muted-foreground mt-1">
              {vehiclePlate}
            </p>
          </div>

          {/* Action */}
          <Button
            size="sm"
            onClick={() => onBook(driver.id)}
            disabled={!isAvailable}
            title={!isAvailable ? 'Conducteur en course' : undefined}
            className="bg-emerald-500 hover:bg-emerald-600"
          >
            <Phone className="w-4 h-4 mr-1" />
            Appeler
          </Button>
        </div>
      </CardContent>
    </Card>
  );
});

// ============================================================================
// Composant principal
// ============================================================================

export default function NearbyTaxiMoto() {
  const navigate = useNavigate();
  const [drivers, setDrivers] = useState<TaxiDriver[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const autoRefreshRef = useRef<NodeJS.Timeout | null>(null);

  // ✅ Utiliser useGeoDistance centralisé (fallback: Coyah)
  const { userPosition, positionReady, refreshPosition } = useGeoDistance();

  // ✅ Fonction de chargement optimisée
  const loadDrivers = useCallback(async () => {
    if (!positionReady) return;

    setLoading(true);
    setError(null);

    try {
      const position = { lat: userPosition.latitude, lng: userPosition.longitude };

      // ✅ Requête optimisée avec jointure profil et limite
      const { data, error: queryError } = await supabase
        .from('taxi_drivers')
        .select(`
          id,
          user_id,
          vehicle_type,
          vehicle_plate,
          rating,
          total_rides,
          status,
          is_online,
          last_lat,
          last_lng,
          profiles:user_id (id, first_name, last_name, phone, avatar_url)
        `)
        .eq('is_online', true)
        .limit(MAX_DRIVERS_LIMIT);

      if (queryError) throw new Error(`Erreur: ${queryError.message}`);

      // ✅ OPTIMISATION: Créer une seule Map globale de profils
      const rawData = (data || []) as Array<Record<string, unknown>>;
      const profileMap = extractProfilesFromJoinedData(rawData);

      // ✅ Traitement des conducteurs avec la Map globale
      const processedDrivers: TaxiDriver[] = [];

      for (const raw of rawData) {
        processedDrivers.push(processTaxiDriver(raw, position, profileMap));
      }

      // ✅ Filtrer par rayon et trier (distance puis rating)
      const filtered = filterDriversByRadius(processedDrivers, RADIUS_KM);
      const sorted = sortDrivers(filtered) as TaxiDriver[];

      setDrivers(sorted);
    } catch (err) {
      console.error('Error loading taxi drivers:', err);
      setError(err instanceof Error ? err.message : 'Erreur lors du chargement');
    } finally {
      setLoading(false);
    }
  }, [positionReady, userPosition]);

  // ✅ Chargement initial
  useEffect(() => {
    if (positionReady) {
      loadDrivers();
    }
  }, [positionReady, loadDrivers]);

  // ✅ Auto-refresh toutes les 20 secondes
  useEffect(() => {
    if (!positionReady) return;

    autoRefreshRef.current = setInterval(() => {
      loadDrivers();
    }, AUTO_REFRESH_INTERVAL);

    return () => {
      if (autoRefreshRef.current) {
        clearInterval(autoRefreshRef.current);
      }
    };
  }, [positionReady, loadDrivers]);

  // Fonction de rafraîchissement manuel
  const handleRefresh = useCallback(async () => {
    await refreshPosition();
    await loadDrivers();
  }, [refreshPosition, loadDrivers]);

  const handleBookDriver = useCallback((driverId: string) => {
    navigate(`/taxi-moto?driver=${driverId}`);
  }, [navigate]);

  const handleBookNow = useCallback(() => {
    navigate('/taxi-moto');
  }, [navigate]);

  // ============================================================================
  // RENDU SIMPLIFIÉ - Sans useMemo complexe
  // ============================================================================

  const renderDriversList = () => {
    // État de chargement
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

    // État d'erreur
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

    // Liste vide
    if (drivers.length === 0) {
      return (
        <Card className="border-border/50">
          <CardContent className="p-8 text-center">
            <Bike className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="font-semibold text-foreground mb-2">Aucun conducteur en ligne</h3>
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

    // Liste des drivers
    return (
      <div className="space-y-3">
        {drivers.map((driver) => (
          <TaxiDriverCard
            key={driver.id}
            driver={driver}
            onBook={handleBookDriver}
          />
        ))}
      </div>
    );
  };

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
                <Bike className="w-5 h-5 text-emerald-500" />
                Taxi-Moto à Proximité
              </h1>
              <p className="text-xs text-muted-foreground">
                {drivers.length} conducteur{drivers.length !== 1 ? 's' : ''} dans un rayon de {RADIUS_KM} km
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
        {/* Quick Book Button */}
        <Card className="bg-gradient-to-r from-emerald-500 to-emerald-600 border-0 shadow-lg">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="text-white">
                <h3 className="font-semibold">Réserver maintenant</h3>
                <p className="text-sm opacity-90">Laissez-nous trouver le plus proche</p>
              </div>
              <Button
                onClick={handleBookNow}
                className="bg-white text-emerald-600 hover:bg-white/90"
              >
                <Navigation className="w-4 h-4 mr-2" />
                Réserver
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Drivers List */}
        {renderDriversList()}
      </div>

      <QuickFooter />
    </div>
  );
}
