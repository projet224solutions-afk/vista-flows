/**
 * NAVIGATION CONDUCTEUR - Composant avec connexion temps réel
 * Gère la navigation GPS et les mises à jour de statut de course
 */

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Navigation, Phone, Car, CheckCircle, MapPin } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { SimpleMapView } from "./SimpleMapView";
import { GeolocationService } from "@/services/taxi/GeolocationService";
import { TaxiMotoGeolocationService } from "@/services/taxi/TaxiMotoGeolocationService";

interface ActiveRide {
  id: string;
  customer: {
    name: string;
    phone: string;
    rating: number;
  };
  pickup: {
    address: string;
    coords: { latitude: number; longitude: number };
  };
  destination: {
    address: string;
    coords: { latitude: number; longitude: number };
  };
  status: 'accepted' | 'arriving' | 'picked_up' | 'in_progress';
  startTime: string;
  estimatedEarnings: number;
}

interface DriverNavigationProps {
  driverId: string;
  location: { latitude: number; longitude: number } | null;
  onContactCustomer: (phone: string) => void;
}

export function DriverNavigation({
  driverId,
  location,
  onContactCustomer
}: DriverNavigationProps) {
  const [activeRide, setActiveRide] = useState<ActiveRide | null>(null);
  const [loading, setLoading] = useState(false);
  const [nextInstruction, setNextInstruction] = useState('');
  const [distanceToDestination, setDistanceToDestination] = useState(0);
  const [timeToDestination, setTimeToDestination] = useState(0);

  // Charger la course active depuis la base de données
  const loadActiveRide = async () => {
    if (!driverId) return;
    
    setLoading(true);
    try {
      const { data: rides, error } = await supabase
        .from('taxi_trips')
        .select('*')
        .eq('driver_id', driverId)
        .in('status', ['accepted', 'started', 'arriving', 'in_progress'])
        .order('requested_at', { ascending: false })
        .limit(1);

      if (error) throw error;

      if (!rides || rides.length === 0) {
        setActiveRide(null);
        return;
      }

      const ride = rides[0];

      // Charger les infos du client
      let customerName = 'Client';
      let customerPhone = '+224 600 00 00 00';
      let customerRating = 4.5;

      try {
        const { data: customerProfile } = await supabase
          .from('profiles')
          .select('first_name, last_name, phone')
          .eq('id', ride.customer_id)
          .single();

        if (customerProfile) {
          customerName = `${customerProfile.first_name || ''} ${customerProfile.last_name || ''}`.trim() || 'Client';
          customerPhone = customerProfile.phone || customerPhone;
        }
        
        // Note par défaut pour éviter les problèmes de types
        customerRating = 4.5;
      } catch (e) {
        console.error('Error loading customer info:', e);
      }

      // Mapper les statuts
      let frontendStatus: ActiveRide['status'] = 'accepted';
      if (ride.status === 'arriving') {
        frontendStatus = 'arriving';
      } else if (ride.status === 'started') {
        frontendStatus = 'picked_up';
      } else if (ride.status === 'in_progress') {
        frontendStatus = 'in_progress';
      }

      const activeRideData: ActiveRide = {
        id: ride.id,
        customer: {
          name: customerName,
          phone: customerPhone,
          rating: customerRating
        },
        pickup: {
          address: ride.pickup_address,
          coords: {
            latitude: ride.pickup_lat,
            longitude: ride.pickup_lng
          }
        },
        destination: {
          address: ride.dropoff_address,
          coords: {
            latitude: ride.dropoff_lat,
            longitude: ride.dropoff_lng
          }
        },
        status: frontendStatus,
        startTime: ride.accepted_at || ride.requested_at,
        estimatedEarnings: ride.driver_share || Math.round((ride.price_total || 0) * 0.85)
      };

      setActiveRide(activeRideData);

      // Calculer la distance et le temps avec Mapbox
      if (location) {
        const destination = frontendStatus === 'picked_up' || frontendStatus === 'in_progress'
          ? activeRideData.destination.coords
          : activeRideData.pickup.coords;
        
        try {
          const routeInfo = await TaxiMotoGeolocationService.getRoute(
            { latitude: location.latitude, longitude: location.longitude },
            { latitude: destination.latitude, longitude: destination.longitude }
          );
          
          setDistanceToDestination(routeInfo.distance * 1000); // convertir km en mètres
          setTimeToDestination(routeInfo.duration); // déjà en minutes
          
          if (frontendStatus === 'accepted' || frontendStatus === 'arriving') {
            setNextInstruction(`Direction: ${activeRideData.pickup.address}`);
          } else {
            setNextInstruction(`Direction: ${activeRideData.destination.address}`);
          }
        } catch (error) {
          console.error('Erreur calcul route Mapbox:', error);
          // Fallback calcul simple
          const distance = TaxiMotoGeolocationService.calculateDistance(
            location.latitude,
            location.longitude,
            destination.latitude,
            destination.longitude
          );
          setDistanceToDestination(distance * 1000);
          setTimeToDestination(Math.ceil(distance * 3));
        }
      }

      console.log('✅ Active ride loaded:', activeRideData);
    } catch (error) {
      console.error('❌ Error loading active ride:', error);
      toast.error('Erreur de chargement de la course');
    } finally {
      setLoading(false);
    }
  };


  // Mettre à jour le statut de la course
  const updateRideStatus = async (newStatus: string) => {
    if (!activeRide) return;

    setLoading(true);
    try {
      const { error } = await supabase
        .from('taxi_trips')
        .update({ 
          status: newStatus,
          updated_at: new Date().toISOString()
        })
        .eq('id', activeRide.id);

      if (error) throw error;

      toast.success('✅ Statut mis à jour');
      await loadActiveRide();
    } catch (error) {
      console.error('❌ Error updating ride status:', error);
      toast.error('Erreur de mise à jour du statut');
    } finally {
      setLoading(false);
    }
  };

  // Chargement initial
  useEffect(() => {
    loadActiveRide();
  }, [driverId]);

  // S'abonner aux changements en temps réel
  useEffect(() => {
    if (!driverId) return;

    const channel = supabase
      .channel(`driver-navigation-${driverId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'taxi_trips',
          filter: `driver_id=eq.${driverId}`
        },
        () => {
          console.log('🔄 Ride updated, refreshing navigation...');
          loadActiveRide();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [driverId]);

  // Recalculer la distance quand la position change avec Mapbox
  useEffect(() => {
    if (activeRide && location) {
      const destination = activeRide.status === 'picked_up' || activeRide.status === 'in_progress'
        ? activeRide.destination.coords
        : activeRide.pickup.coords;
      
      TaxiMotoGeolocationService.getRoute(
        { latitude: location.latitude, longitude: location.longitude },
        { latitude: destination.latitude, longitude: destination.longitude }
      ).then(routeInfo => {
        setDistanceToDestination(routeInfo.distance * 1000);
        setTimeToDestination(routeInfo.duration);
      }).catch(() => {
        // Fallback
        const distance = TaxiMotoGeolocationService.calculateDistance(
          location.latitude,
          location.longitude,
          destination.latitude,
          destination.longitude
        );
        setDistanceToDestination(distance * 1000);
        setTimeToDestination(Math.ceil(distance * 3));
      });
    }
  }, [location, activeRide]);

  if (loading && !activeRide) {
    return (
      <div className="flex items-center justify-center p-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!activeRide) {
    return (
      <Card className="bg-white/90 backdrop-blur-sm border-0 shadow-lg mt-4">
        <CardContent className="p-8 text-center">
          <Navigation className="w-16 h-16 mx-auto mb-4 text-gray-400" />
          <h3 className="text-xl font-semibold text-gray-700 mb-2">
            Aucune course active
          </h3>
          <p className="text-gray-600 mb-4">
            Acceptez une course pour commencer la navigation
          </p>
          <Button onClick={loadActiveRide} variant="outline">
            🔄 Actualiser
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4 mt-4">
      {/* Carte avec les positions */}
      <SimpleMapView
        driverLocation={location ? { latitude: location.latitude, longitude: location.longitude } : undefined}
        pickupLocation={activeRide.status === 'accepted' || activeRide.status === 'arriving' 
          ? activeRide.pickup.coords 
          : undefined}
        destinationLocation={activeRide.status === 'picked_up' || activeRide.status === 'in_progress'
          ? activeRide.destination.coords 
          : undefined}
        height="300px"
      />

      {/* Instruction de navigation */}
      <Card className="bg-blue-50 border-blue-200">
        <CardContent className="p-6">
          <div className="flex items-start gap-4">
            <Navigation className="w-8 h-8 text-blue-600 flex-shrink-0 mt-1" />
            <div className="flex-1">
              <h3 className="text-lg font-semibold mb-2 text-blue-900">{nextInstruction}</h3>
              <div className="flex items-center gap-4 text-sm text-gray-700">
                <span className="font-medium">📏 {(distanceToDestination / 1000).toFixed(1)} km</span>
                <span>•</span>
                <span className="font-medium">⏱️ {Math.ceil(timeToDestination / 60)} min</span>
              </div>
              
              {/* Bouton pour ouvrir Google Maps */}
              <Button
                onClick={() => {
                  const destination = activeRide.status === 'picked_up' || activeRide.status === 'in_progress'
                    ? activeRide.destination.coords
                    : activeRide.pickup.coords;
                  GeolocationService.openNativeNavigation(
                    { lat: destination.latitude, lng: destination.longitude },
                    location ? { lat: location.latitude, lng: location.longitude } : undefined
                  );
                }}
                className="w-full mt-4 bg-blue-600 hover:bg-blue-700"
                size="lg"
              >
                <Navigation className="w-5 h-5 mr-2" />
                Ouvrir dans Google Maps
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Actions de course */}
      <Card className="bg-white/90 backdrop-blur-sm border-0 shadow-lg">
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Course en cours</span>
            <Badge className={`${
              activeRide.status === 'accepted' ? 'bg-yellow-100 text-yellow-800' :
              activeRide.status === 'arriving' ? 'bg-blue-100 text-blue-800' :
              activeRide.status === 'picked_up' ? 'bg-green-100 text-green-800' :
              'bg-purple-100 text-purple-800'
            }`}>
              {activeRide.status === 'accepted' ? 'Acceptée' :
               activeRide.status === 'arriving' ? 'En route' :
               activeRide.status === 'picked_up' ? 'Client à bord' :
               'En cours'}
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-2 text-sm text-gray-600 mb-3">
            <Phone className="w-4 h-4" />
            <span className="font-medium">{activeRide.customer.name}</span>
            <Button
              onClick={() => onContactCustomer(activeRide.customer.phone)}
              variant="outline"
              size="sm"
              className="ml-auto"
            >
              Appeler
            </Button>
          </div>

          <div className="space-y-2 mb-4">
            <div className="flex items-center gap-2 text-sm bg-green-50 p-3 rounded">
              <MapPin className="w-4 h-4 text-green-600" />
              <span className="font-medium">{activeRide.pickup.address}</span>
            </div>
            <div className="flex items-center gap-2 text-sm bg-red-50 p-3 rounded">
              <MapPin className="w-4 h-4 text-red-600" />
              <span className="font-medium">{activeRide.destination.address}</span>
            </div>
          </div>

          {activeRide.status === 'accepted' && (
            <Button
              onClick={() => updateRideStatus('arriving')}
              className="w-full"
              size="lg"
              disabled={loading}
            >
              <CheckCircle className="w-4 h-4 mr-2" />
              Je suis arrivé au point de départ
            </Button>
          )}

          {activeRide.status === 'arriving' && (
            <Button
              onClick={() => updateRideStatus('started')}
              className="w-full"
              size="lg"
              disabled={loading}
            >
              <Car className="w-4 h-4 mr-2" />
              Client à bord - Démarrer la course
            </Button>
          )}

          {activeRide.status === 'picked_up' && (
            <Button
              onClick={() => updateRideStatus('completed')}
              className="w-full bg-green-600 hover:bg-green-700"
              size="lg"
              disabled={loading}
            >
              <CheckCircle className="w-4 h-4 mr-2" />
              Arrivé à destination - Terminer la course
            </Button>
          )}
        </CardContent>
      </Card>
    </div>
  );
}