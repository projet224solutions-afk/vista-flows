/**
 * NEARBY TAXI MODAL - Premium Design
 * Checks for taxi drivers within 5km radius
 */

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Car, MapPin, RefreshCw, AlertCircle, CheckCircle2, Navigation } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';

interface NearbyDriver {
  driver_id: string;
  user_id: string;
  distance_km: number | null;
  rating?: number;
  vehicle_type?: string;
  vehicle_plate?: string;
  full_name?: string;
}

interface NearbyTaxiModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const MAX_DISTANCE_KM = 5;
const FALLBACK_LOCATION = { lat: 9.509167, lng: -13.712222 }; // Conakry (fallback)
const FALLBACK_RADIUS_KM = 50;
const SEARCH_RADII_KM = [MAX_DISTANCE_KM, 10, 20, FALLBACK_RADIUS_KM] as const;

export function NearbyTaxiModal({ open, onOpenChange }: NearbyTaxiModalProps) {
  const navigate = useNavigate();
  const [drivers, setDrivers] = useState<NearbyDriver[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [noDriversNearby, setNoDriversNearby] = useState(false);
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [usingFallbackLocation, setUsingFallbackLocation] = useState(false);
  const [usedRadiusKm, setUsedRadiusKm] = useState<number>(MAX_DISTANCE_KM);

  const runRpcSearch = async (lat: number, lng: number, radiusKm: number) => {
    const { data, error: rpcError } = await supabase.rpc('find_nearby_taxi_drivers', {
      p_lat: lat,
      p_lng: lng,
      p_radius_km: radiusKm,
      p_limit: 10,
    });

    if (rpcError) throw rpcError;
    return (data || []) as any[];
  };

  // Fallback (sans GPS): recherche large via RPC (bypass RLS) autour d'un point par défaut
  const searchAllOnlineDrivers = async () => {
    setLoading(true);
    setError(null);
    setNoDriversNearby(false);

    try {
      setUsingFallbackLocation(true);
      setUsedRadiusKm(FALLBACK_RADIUS_KM);

      const data = await runRpcSearch(FALLBACK_LOCATION.lat, FALLBACK_LOCATION.lng, FALLBACK_RADIUS_KM);

      if (!data || data.length === 0) {
        setNoDriversNearby(true);
        setDrivers([]);
        return;
      }

      const userIds = data.map((d: any) => d.user_id);
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, full_name')
        .in('id', userIds);

      const driversWithNames = data.map((driver: any) => ({
        ...driver,
        distance_km: driver.distance_km === null || driver.distance_km === undefined ? null : Number(driver.distance_km),
        full_name: profiles?.find(p => p.id === driver.user_id)?.full_name || 'Chauffeur'
      }));

      setDrivers(driversWithNames);
    } catch (err) {
      console.error('Error finding drivers (fallback):', err);
      setError('Impossible de charger les chauffeurs.');
    } finally {
      setLoading(false);
    }
  };

  const searchNearbyDrivers = async (lat: number, lng: number) => {
    setLoading(true);
    setError(null);
    setNoDriversNearby(false);
    setUsingFallbackLocation(false);

    try {
      let data: any[] = [];
      let radiusUsed: number | null = null;

      for (const radiusKm of SEARCH_RADII_KM) {
        radiusUsed = radiusKm;
        const result = await runRpcSearch(lat, lng, radiusKm);
        if (result.length > 0) {
          data = result;
          break;
        }
      }

      setUsedRadiusKm(radiusUsed ?? MAX_DISTANCE_KM);

      if (!data || data.length === 0) {
        setNoDriversNearby(true);
        setDrivers([]);
        return;
      }

      const userIds = data.map((d: any) => d.user_id);
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, full_name')
        .in('id', userIds);

      const driversWithNames = data.map((driver: any) => ({
        ...driver,
        distance_km: driver.distance_km === null || driver.distance_km === undefined ? null : Number(driver.distance_km),
        full_name: profiles?.find(p => p.id === driver.user_id)?.full_name || 'Chauffeur'
      }));

      setDrivers(driversWithNames);
    } catch (err) {
      console.error('Error finding nearby drivers:', err);
      // Fallback to large RPC search in Conakry (bypass RLS)
      await searchAllOnlineDrivers();
    } finally {
      setLoading(false);
    }
  };

  const getUserLocation = () => {
    setLoading(true);
    setUsingFallbackLocation(false);

    if (!navigator.geolocation) {
      console.log('Geolocation not supported, falling back to RPC search');
      setUserLocation(null);
      setUsingFallbackLocation(true);
      searchAllOnlineDrivers();
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        setUserLocation({ lat: latitude, lng: longitude });
        setUsingFallbackLocation(false);
        searchNearbyDrivers(latitude, longitude);
      },
      (err) => {
        console.error('Geolocation error, falling back to RPC search:', err);
        setUserLocation(null);
        setUsingFallbackLocation(true);
        searchAllOnlineDrivers();
      },
      { enableHighAccuracy: true, timeout: 5000 }
    );
  };

  useEffect(() => {
    if (open) {
      getUserLocation();
    }
  }, [open]);

  const handleRefresh = () => {
    if (userLocation) {
      searchNearbyDrivers(userLocation.lat, userLocation.lng);
    } else {
      getUserLocation();
    }
  };

  const handleOrderTaxi = () => {
    onOpenChange(false);
    navigate('/taxi-moto');
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader className="pb-3 border-b border-border/40">
          <DialogTitle className="flex items-center gap-2">
            <Car className="w-5 h-5 text-taxi-primary" />
            Taxi-Motos à proximité
          </DialogTitle>
        </DialogHeader>

        <div className="py-6">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
              <div className="relative">
                <Car className="w-12 h-12 text-taxi-primary animate-pulse" />
                <div className="absolute inset-0 rounded-full border-4 border-taxi-primary/30 border-t-taxi-primary animate-spin" style={{ animationDuration: '1s' }} />
              </div>
              <p className="text-sm mt-4">Recherche de chauffeurs autour de vous...</p>
            </div>
          ) : error ? (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <div className="w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center mb-4">
                <AlertCircle className="w-8 h-8 text-destructive" />
              </div>
              <p className="text-sm text-muted-foreground mb-4">{error}</p>
              <Button variant="outline" size="sm" onClick={handleRefresh}>
                <RefreshCw className="w-4 h-4 mr-2" />
                Réessayer
              </Button>
            </div>
          ) : noDriversNearby ? (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <div className="w-20 h-20 rounded-full bg-amber-500/10 flex items-center justify-center mb-4">
                <Navigation className="w-10 h-10 text-amber-500" />
              </div>
              <h3 className="font-semibold text-foreground mb-2">
                Aucun chauffeur proche
              </h3>
              <p className="text-sm text-muted-foreground mb-6 max-w-xs">
                Il n'y a pas de chauffeur disponible dans un rayon de {usedRadiusKm} km autour de votre position.
              </p>
              <div className="flex flex-col gap-2 w-full max-w-xs">
                <Button 
                  onClick={handleRefresh}
                  className="w-full bg-taxi-primary hover:bg-taxi-primary/90"
                >
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Nouvelle recherche
                </Button>
                <Button 
                  variant="outline" 
                  onClick={() => onOpenChange(false)}
                  className="w-full"
                >
                  Fermer
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Success banner */}
              <div className="flex items-center gap-3 p-3 rounded-xl bg-green-500/10 border border-green-500/20">
                <CheckCircle2 className="w-5 h-5 text-green-500 flex-shrink-0" />
                <div>
                  <p className="text-sm font-medium text-foreground">
                    {drivers.length} chauffeur{drivers.length > 1 ? 's' : ''} disponible{drivers.length > 1 ? 's' : ''}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {usingFallbackLocation
                      ? `Localisation désactivée : affichage élargi (${usedRadiusKm} km)`
                      : `Dans un rayon de ${usedRadiusKm} km`}
                  </p>
                </div>
              </div>

              {/* Drivers list */}
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {drivers.slice(0, 5).map((driver, index) => (
                  <div
                    key={driver.driver_id}
                    className={cn(
                      'flex items-center gap-3 p-3 rounded-xl',
                      'bg-card border border-border/40'
                    )}
                  >
                    <div className="w-10 h-10 rounded-full bg-taxi-primary/10 flex items-center justify-center">
                      <Car className="w-5 h-5 text-taxi-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">
                        {driver.full_name}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {driver.vehicle_type || 'Moto'} • {driver.vehicle_plate || '---'}
                      </p>
                    </div>
                        <div className="text-right">
                          <span className="text-sm font-semibold text-taxi-primary">
                            {driver.distance_km !== null && Number.isFinite(driver.distance_km)
                              ? `${driver.distance_km.toFixed(1)} km`
                              : 'En ligne'}
                          </span>
                        </div>
                  </div>
                ))}
              </div>

              {/* Action button */}
              <Button 
                onClick={handleOrderTaxi}
                className="w-full bg-taxi-primary hover:bg-taxi-primary/90"
                size="lg"
              >
                Commander un Taxi-Moto
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default NearbyTaxiModal;
