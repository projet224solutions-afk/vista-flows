/**
 * NEARBY TAXI-MOTO PAGE
 * Liste des taxi-motos disponibles à proximité
 * 224Solutions
 */

import { useState, useEffect, useCallback } from 'react';
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
  User
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import QuickFooter from "@/components/QuickFooter";
import { motion } from "framer-motion";

interface NearbyDriver {
  id: string;
  user_id: string;
  vehicle_type: string;
  vehicle_plate: string;
  rating: number;
  total_rides: number;
  status: string;
  is_online: boolean;
  last_lat: number | null;
  last_lng: number | null;
  distance?: number;
  profile?: {
    first_name: string;
    last_name: string;
    phone: string;
    avatar_url: string | null;
  };
}

// Haversine formula
function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
    Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
}

export default function NearbyTaxiMoto() {
  const navigate = useNavigate();
  const [drivers, setDrivers] = useState<NearbyDriver[]>([]);
  const [loading, setLoading] = useState(true);
  const [userPosition, setUserPosition] = useState<{ lat: number; lng: number } | null>(null);

  const getUserPosition = useCallback(() => {
    return new Promise<{ lat: number; lng: number }>((resolve) => {
      if (!navigator.geolocation) {
        resolve({ lat: 9.6412, lng: -13.5784 }); // Default Conakry
        return;
      }

      navigator.geolocation.getCurrentPosition(
        (position) => {
          const pos = { lat: position.coords.latitude, lng: position.coords.longitude };
          setUserPosition(pos);
          resolve(pos);
        },
        () => {
          resolve({ lat: 9.6412, lng: -13.5784 });
        },
        { timeout: 5000, enableHighAccuracy: false }
      );
    });
  }, []);

  const loadDrivers = useCallback(async () => {
    setLoading(true);
    try {
      const position = await getUserPosition();
      
      // Fetch all online taxi drivers
      const { data: taxiDrivers, error } = await supabase
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
          last_lng
        `)
        .eq('is_online', true);

      if (error) throw error;

      // Fetch profiles for each driver
      const userIds = taxiDrivers?.map(d => d.user_id).filter(Boolean) || [];
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, first_name, last_name, phone, avatar_url')
        .in('id', userIds);

      const profileMap = new Map(profiles?.map(p => [p.id, p]) || []);

      // Calculate distances and sort
      const driversWithDistance = (taxiDrivers || []).map(driver => {
        let distance: number | undefined;
        if (driver.last_lat && driver.last_lng) {
          distance = calculateDistance(
            position.lat,
            position.lng,
            Number(driver.last_lat),
            Number(driver.last_lng)
          );
        }
        return {
          ...driver,
          distance,
          profile: profileMap.get(driver.user_id) as any
        };
      });

      // Sort by distance (nearest first), then by availability
      driversWithDistance.sort((a, b) => {
        // Available drivers first
        if (a.status === 'available' && b.status !== 'available') return -1;
        if (b.status === 'available' && a.status !== 'available') return 1;
        // Then by distance
        if (a.distance !== undefined && b.distance !== undefined) {
          return a.distance - b.distance;
        }
        return 0;
      });

      setDrivers(driversWithDistance);
    } catch (error) {
      console.error('Error loading taxi drivers:', error);
    } finally {
      setLoading(false);
    }
  }, [getUserPosition]);

  useEffect(() => {
    loadDrivers();
  }, [loadDrivers]);

  const handleBookDriver = (driverId: string) => {
    navigate(`/taxi-moto?driver=${driverId}`);
  };

  const handleBookNow = () => {
    navigate('/taxi-moto');
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
                {drivers.length} conducteur{drivers.length !== 1 ? 's' : ''} en ligne
              </p>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={loadDrivers}
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
        {loading ? (
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
        ) : drivers.length === 0 ? (
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
        ) : (
          <motion.div 
            className="space-y-3"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
          >
            {drivers.map((driver, index) => (
              <motion.div
                key={driver.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
              >
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
                            />
                          ) : (
                            <User className="w-6 h-6 text-emerald-600" />
                          )}
                        </div>
                        {/* Status indicator */}
                        <div className={`absolute -bottom-1 -right-1 w-4 h-4 rounded-full border-2 border-white ${
                          driver.status === 'available' ? 'bg-green-500' : 'bg-yellow-500'
                        }`} />
                      </div>

                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="font-semibold text-foreground truncate">
                            {driver.profile?.first_name || 'Conducteur'} {driver.profile?.last_name?.charAt(0) || ''}
                          </h3>
                          <Badge variant={driver.status === 'available' ? 'default' : 'secondary'} className="text-xs">
                            {driver.status === 'available' ? 'Disponible' : 'En course'}
                          </Badge>
                        </div>
                        
                        <div className="flex items-center gap-3 text-xs text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <Star className="w-3 h-3 text-yellow-500 fill-yellow-500" />
                            {Number(driver.rating || 5).toFixed(1)}
                          </span>
                          <span className="flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {driver.total_rides || 0} courses
                          </span>
                          {driver.distance !== undefined && (
                            <span className="flex items-center gap-1">
                              <MapPin className="w-3 h-3" />
                              {driver.distance < 1 
                                ? `${Math.round(driver.distance * 1000)}m` 
                                : `${driver.distance.toFixed(1)}km`}
                            </span>
                          )}
                        </div>

                        <p className="text-xs text-muted-foreground mt-1">
                          {driver.vehicle_plate}
                        </p>
                      </div>

                      {/* Action */}
                      <Button
                        size="sm"
                        onClick={() => handleBookDriver(driver.id)}
                        disabled={driver.status !== 'available'}
                        className="bg-emerald-500 hover:bg-emerald-600"
                      >
                        <Phone className="w-4 h-4 mr-1" />
                        Appeler
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </motion.div>
        )}
      </div>

      <QuickFooter />
    </div>
  );
}
