/**
 * NEARBY LIVRAISON PAGE
 * Liste des livreurs disponibles à proximité
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
  Package,
  MapPin,
  Star,
  RefreshCw,
  Loader2,
  Truck,
  Clock,
  User,
  Bike,
  Car
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import QuickFooter from "@/components/QuickFooter";
import { motion } from "framer-motion";
import { useGeoDistance, calculateDistance } from "@/hooks/useGeoDistance";

const RADIUS_KM = 20;

interface NearbyDriver {
  id: string;
  user_id: string;
  vehicle_type: string;
  status: string;
  is_online: boolean;
  current_lat?: number;
  current_lng?: number;
  last_lat?: number;
  last_lng?: number;
  rating?: number;
  total_deliveries?: number;
  distance?: number;
  profile?: {
    first_name: string;
    last_name: string;
    phone: string;
    avatar_url: string | null;
  };
  source: 'drivers' | 'taxi_drivers';
}

export default function NearbyLivraison() {
  const navigate = useNavigate();
  const [drivers, setDrivers] = useState<NearbyDriver[]>([]);
  const [loading, setLoading] = useState(true);
  const [userPosition, setUserPosition] = useState<{ lat: number; lng: number } | null>(null);

  const getUserPosition = useCallback(() => {
    return new Promise<{ lat: number; lng: number }>((resolve) => {
      if (!navigator.geolocation) {
        resolve({ lat: 9.6412, lng: -13.5784 });
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
      
      // Fetch delivery drivers
      const { data: deliveryDrivers, error: driversError } = await supabase
        .from('drivers')
        .select('id, user_id, vehicle_type, status, is_online, current_location, rating, total_deliveries')
        .or('status.eq.active,is_online.eq.true');

      if (driversError) throw driversError;

      // Fetch taxi drivers (can also do delivery)
      const { data: taxiDrivers, error: taxiError } = await supabase
        .from('taxi_drivers')
        .select('id, user_id, vehicle_type, status, is_online, last_lat, last_lng, rating, total_rides')
        .eq('is_online', true);

      if (taxiError) throw taxiError;

      // Get all user IDs
      const allUserIds = [
        ...(deliveryDrivers?.map(d => d.user_id) || []),
        ...(taxiDrivers?.map(d => d.user_id) || [])
      ].filter(Boolean);

      // Fetch profiles
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, first_name, last_name, phone, avatar_url')
        .in('id', allUserIds);

      const profileMap = new Map(profiles?.map(p => [p.id, p]) || []);

      // Combine and process drivers
      const allDrivers: NearbyDriver[] = [];

      // Process delivery drivers
      deliveryDrivers?.forEach(driver => {
        let lat: number | undefined;
        let lng: number | undefined;
        
        if (driver.current_location) {
          const locationStr = String(driver.current_location);
          const match = locationStr.match(/\(([^,]+),([^)]+)\)/);
          if (match) {
            lng = parseFloat(match[1]);
            lat = parseFloat(match[2]);
          }
        }

        let distance: number | undefined;
        if (lat && lng) {
          distance = calculateDistance(position.lat, position.lng, lat, lng);
        }

        allDrivers.push({
          id: driver.id,
          user_id: driver.user_id,
          vehicle_type: driver.vehicle_type,
          status: driver.status,
          is_online: driver.is_online,
          current_lat: lat,
          current_lng: lng,
          rating: driver.rating,
          total_deliveries: driver.total_deliveries,
          distance,
          profile: profileMap.get(driver.user_id) as any,
          source: 'drivers'
        });
      });

      // Process taxi drivers
      taxiDrivers?.forEach(driver => {
        let distance: number | undefined;
        if (driver.last_lat && driver.last_lng) {
          distance = calculateDistance(
            position.lat, position.lng,
            Number(driver.last_lat), Number(driver.last_lng)
          );
        }

        allDrivers.push({
          id: driver.id,
          user_id: driver.user_id,
          vehicle_type: driver.vehicle_type || 'moto',
          status: driver.status,
          is_online: driver.is_online,
          last_lat: Number(driver.last_lat),
          last_lng: Number(driver.last_lng),
          rating: Number(driver.rating),
          total_deliveries: driver.total_rides,
          distance,
          profile: profileMap.get(driver.user_id) as any,
          source: 'taxi_drivers'
        });
      });

      // Filtre: seulement les livreurs dans un rayon de 20 km
      const filteredDrivers = allDrivers.filter(d => d.distance !== undefined && d.distance <= RADIUS_KM);

      // Sort by availability and distance
      filteredDrivers.sort((a, b) => {
        if (a.is_online && !b.is_online) return -1;
        if (!a.is_online && b.is_online) return 1;
        if (a.distance !== undefined && b.distance !== undefined) {
          return a.distance - b.distance;
        }
        return 0;
      });

      setDrivers(filteredDrivers);
    } catch (error) {
      console.error('Error loading drivers:', error);
    } finally {
      setLoading(false);
    }
  }, [getUserPosition]);

  useEffect(() => {
    loadDrivers();
  }, [loadDrivers]);

  const handleRequestDelivery = () => {
    navigate('/delivery-request');
  };

  const getVehicleIcon = (type: string) => {
    switch (type) {
      case 'car': return <Car className="w-4 h-4" />;
      case 'moto': return <Bike className="w-4 h-4" />;
      default: return <Truck className="w-4 h-4" />;
    }
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
        ) : (
          <motion.div 
            className="space-y-3"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
          >
            {drivers.map((driver, index) => (
              <motion.div
                key={`${driver.source}-${driver.id}`}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
              >
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
                          <span className="flex items-center gap-1">
                            <Star className="w-3 h-3 text-yellow-500 fill-yellow-500" />
                            {(driver.rating || 5).toFixed(1)}
                          </span>
                          <span className="flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {driver.total_deliveries || 0} livraisons
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

                        <div className="flex items-center gap-1 text-xs text-muted-foreground mt-1">
                          {getVehicleIcon(driver.vehicle_type)}
                          <span className="capitalize">{driver.vehicle_type}</span>
                        </div>
                      </div>

                      {/* Action */}
                      <Button
                        size="sm"
                        onClick={handleRequestDelivery}
                        disabled={!driver.is_online}
                        className="bg-orange-500 hover:bg-orange-600"
                      >
                        <Package className="w-4 h-4 mr-1" />
                        Envoyer
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
