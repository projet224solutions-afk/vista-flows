/**
 * PAGE CLIENT TAXI-MOTO COMPLÈTE
 * Interface unifiée pour réserver, suivre et consulter l'historique des courses
 * 224Solutions - Taxi-Moto System
 */

// @ts-nocheck
import { useState, useEffect } from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Navigation,
  Clock,
  History,
  LogOut,
  MapPin,
  User
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import useCurrentLocation from "@/hooks/useGeolocation";
import { useTaxiMotoClient } from "@/hooks/useTaxiMotoClient";
import TaxiMotoBooking from "@/components/taxi-moto/TaxiMotoBooking";
import TaxiMotoTracking from "@/components/taxi-moto/TaxiMotoTracking";
import TaxiMotoHistory from "@/components/taxi-moto/TaxiMotoHistory";
import { toast } from "sonner";

interface Driver {
  id: string;
  name: string;
  rating: number;
  distance: number;
  vehicleType: string;
  eta: string;
  rides: number;
}

interface CurrentRide {
  id: string;
  status: 'pending' | 'accepted' | 'driver_arriving' | 'in_progress' | 'completed' | 'cancelled';
  pickupAddress: string;
  destinationAddress: string;
  estimatedPrice: number;
  driver?: {
    id: string;
    name: string;
    rating: number;
    phone: string;
    vehicleType: string;
    vehicleNumber: string;
    photo?: string;
  };
  estimatedArrival?: string;
  actualArrival?: string;
  createdAt: string;
}

export default function TaxiMotoClient() {
  const { user, profile, signOut } = useAuth();
  const { location, getCurrentLocation } = useCurrentLocation();
  
  // Hook données réelles Supabase
  const {
    nearbyDrivers,
    activeTrips,
    tripHistory,
    loading,
    createTrip,
    cancelTrip
  } = useTaxiMotoClient();

  const [activeTab, setActiveTab] = useState('booking');
  const [currentRide, setCurrentRide] = useState<CurrentRide | null>(null);

  useEffect(() => {
    // Obtenir la position
    getCurrentLocation();
  }, []);

  // Synchroniser la course active avec les données Supabase
  useEffect(() => {
    if (activeTrips.length > 0) {
      const activeTrip = activeTrips[0];
      setCurrentRide({
        id: activeTrip.id,
        status: activeTrip.status as any,
        pickupAddress: activeTrip.pickup_address,
        destinationAddress: activeTrip.destination_address,
        estimatedPrice: activeTrip.estimated_price,
        driver: activeTrip.driver ? {
          id: activeTrip.driver.id,
          name: `${activeTrip.driver.profiles?.first_name || ''} ${activeTrip.driver.profiles?.last_name || ''}`.trim(),
          rating: activeTrip.driver.rating || 4.5,
          phone: activeTrip.driver.profiles?.phone || '',
          vehicleType: activeTrip.driver.vehicle_type,
          vehicleNumber: activeTrip.driver.vehicle_number
        } : undefined,
        createdAt: activeTrip.created_at
      });
    } else {
      setCurrentRide(null);
    }
  }, [activeTrips]);

  /**
   * Gère la création d'une nouvelle course (connecté à Supabase)
   */
  const handleRideCreated = async (rideData: any) => {
    const trip = await createTrip({
      pickup_location: rideData.pickupLocation,
      destination_location: rideData.destinationLocation,
      pickup_address: rideData.pickupAddress,
      destination_address: rideData.destinationAddress,
      estimated_price: rideData.estimatedPrice,
      estimated_distance: rideData.estimatedDistance
    });

    if (trip) {
      setActiveTab('tracking');
      toast.success('Course créée avec succès ! En attente d\'un conducteur...');
    }

    // Les mises à jour en temps réel se feront via le hook
    setTimeout(() => {
      if (newRide) {
        setCurrentRide(prev => prev ? { ...prev, status: 'driver_arriving' } : null);
      }
    }, 3000);
  };

  /**
   * Déconnexion
   */
  const handleSignOut = async () => {
    await signOut();
    toast.success('Déconnexion réussie');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-secondary/5 to-background pb-20">
      {/* Header */}
      <header className="bg-card/90 backdrop-blur-sm border-b sticky top-0 z-40 shadow-sm">
        <div className="px-4 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-xl font-bold text-foreground">
                Taxi-Moto 224Solutions
              </h1>
              <div className="flex items-center gap-2 mt-1">
                <User className="w-3 h-3 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">
                  {profile?.first_name || 'Client'}
                </span>
                {location && (
                  <>
                    <span className="text-muted-foreground">•</span>
                    <MapPin className="w-3 h-3 text-green-500" />
                    <span className="text-xs text-muted-foreground">GPS actif</span>
                  </>
                )}
              </div>
            </div>

            <div className="flex items-center gap-2">
              {currentRide && (
                <Badge variant="default" className="bg-green-500">
                  Course active
                </Badge>
              )}
              <Button
                onClick={handleSignOut}
                variant="outline"
                size="sm"
              >
                <LogOut className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Conducteurs à proximité */}
      {location && nearbyDrivers.length > 0 && activeTab === 'booking' && (
        <Card className="mx-4 mt-4 bg-card/90 backdrop-blur-sm border-0 shadow-lg">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-foreground">
                  {nearbyDrivers.length} conducteurs disponibles
                </p>
                <p className="text-xs text-muted-foreground">
                  Le plus proche à {nearbyDrivers[0].distance}km
                </p>
              </div>
              <div className="flex -space-x-2">
                {nearbyDrivers.slice(0, 3).map((driver) => (
                  <div
                    key={driver.id}
                    className="w-8 h-8 rounded-full bg-primary/10 border-2 border-card flex items-center justify-center"
                  >
                    <User className="w-4 h-4 text-primary" />
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Navigation par onglets */}
      <div className="px-4 mt-4">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-3 bg-card/80 backdrop-blur-sm">
            <TabsTrigger value="booking">
              <Navigation className="w-4 h-4 mr-1" />
              Réserver
            </TabsTrigger>
            <TabsTrigger value="tracking" disabled={!currentRide}>
              <Clock className="w-4 h-4 mr-1" />
              Suivi
              {currentRide && (
                <span className="ml-1 w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
              )}
            </TabsTrigger>
            <TabsTrigger value="history">
              <History className="w-4 h-4 mr-1" />
              Historique
            </TabsTrigger>
          </TabsList>

          {/* Réservation */}
          <TabsContent value="booking" className="mt-4">
            <TaxiMotoBooking
              userLocation={location}
              nearbyDrivers={nearbyDrivers}
              onRideCreated={handleRideCreated}
            />
          </TabsContent>

          {/* Suivi en temps réel */}
          <TabsContent value="tracking" className="mt-4">
            <TaxiMotoTracking
              currentRide={currentRide}
              userLocation={location}
            />
          </TabsContent>

          {/* Historique */}
          <TabsContent value="history" className="mt-4">
            <TaxiMotoHistory userId={user?.id} />
          </TabsContent>
        </Tabs>
      </div>

      {/* Statistiques rapides */}
      {activeTab === 'booking' && (
        <Card className="mx-4 mt-4 bg-card/90 backdrop-blur-sm border-0 shadow-lg">
          <CardContent className="p-4">
            <div className="grid grid-cols-3 gap-4 text-center">
              <div>
                <div className="text-2xl font-bold text-primary">4.8</div>
                <div className="text-xs text-muted-foreground">Note moyenne</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-green-600">2 min</div>
                <div className="text-xs text-muted-foreground">Temps d'attente</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-blue-600">24/7</div>
                <div className="text-xs text-muted-foreground">Disponibilité</div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
