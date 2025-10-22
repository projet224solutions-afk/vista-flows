/**
 * INTERFACE CHAUFFEUR TAXI MOTO
 * Interface complète pour les chauffeurs
 */

import { useState, useEffect } from 'react';
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { MapPin, DollarSign, Clock, Star, TrendingUp } from 'lucide-react';
import { TaxiMotoService } from '@/services/taxi/TaxiMotoService';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export function TaxiMotoDriverInterface() {
  const [driverProfile, setDriverProfile] = useState<any>(null);
  const [isOnline, setIsOnline] = useState(false);
  const [pendingRides, setPendingRides] = useState<any[]>([]);
  const [currentRide, setCurrentRide] = useState<any>(null);
  const [earnings, setEarnings] = useState({ today: 0, week: 0, month: 0 });
  const [loading, setLoading] = useState(false);

  // Charger le profil chauffeur
  useEffect(() => {
    const loadDriverProfile = async () => {
      try {
        const { data: user } = await supabase.auth.getUser();
        if (!user.user) return;

        const { data: driver } = await supabase
          .from('taxi_drivers')
          .select('*')
          .eq('user_id', user.user.id)
          .single();

        if (driver) {
          setDriverProfile(driver);
          setIsOnline(driver.is_online);
        }
      } catch (error) {
        console.error('Error loading driver profile:', error);
      }
    };

    loadDriverProfile();
  }, []);

  // S'abonner aux demandes de courses
  useEffect(() => {
    if (!driverProfile) return;

    const channel = supabase
      .channel('taxi-notifications')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'taxi_notifications',
          filter: `user_id=eq.${driverProfile.user_id}`
        },
        async (payload) => {
          const notification = payload.new as any;
          if (notification.type === 'ride_request') {
            // Charger les détails de la course
            const ride = await TaxiMotoService.getRideDetails(notification.ride_id);
            if (ride) {
              setPendingRides((prev) => [...prev, ride]);
              toast.success('Nouvelle demande de course!');
              // Notification audio
              new Audio('/notification.mp3').play().catch(() => {});
            }
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [driverProfile]);

  // Mettre à jour le statut en ligne
  const handleToggleOnline = async (checked: boolean) => {
    if (!driverProfile) return;

    try {
      // Obtenir la position actuelle
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          await TaxiMotoService.updateDriverStatus(
            driverProfile.id,
            checked,
            checked,
            position.coords.latitude,
            position.coords.longitude
          );
          setIsOnline(checked);
          toast.success(checked ? 'Vous êtes en ligne' : 'Vous êtes hors ligne');
        },
        (error) => {
          console.error('Geolocation error:', error);
          toast.error('Impossible d\'obtenir votre position');
        }
      );
    } catch (error) {
      console.error('Error toggling online status:', error);
      toast.error('Erreur lors du changement de statut');
    }
  };

  // Accepter une course
  const handleAcceptRide = async (rideId: string) => {
    if (!driverProfile) return;

    try {
      setLoading(true);
      await TaxiMotoService.acceptRide(rideId, driverProfile.id);
      setPendingRides((prev) => prev.filter((r) => r.id !== rideId));
      
      // Charger les détails de la course acceptée
      const ride = await TaxiMotoService.getRideDetails(rideId);
      setCurrentRide(ride);
      
      toast.success('Course acceptée!');
    } catch (error) {
      console.error('Error accepting ride:', error);
      toast.error('Erreur lors de l\'acceptation');
    } finally {
      setLoading(false);
    }
  };

  // Refuser une course
  const handleRefuseRide = async (rideId: string) => {
    if (!driverProfile) return;

    try {
      setLoading(true);
      await TaxiMotoService.refuseRide(rideId, driverProfile.id);
      setPendingRides((prev) => prev.filter((r) => r.id !== rideId));
      toast.info('Course refusée');
    } catch (error) {
      console.error('Error refusing ride:', error);
      toast.error('Erreur lors du refus');
    } finally {
      setLoading(false);
    }
  };

  // Démarrer la course
  const handleStartRide = async () => {
    if (!currentRide) return;

    try {
      await TaxiMotoService.updateRideStatus(currentRide.id, 'started');
      toast.success('Course démarrée!');
    } catch (error) {
      console.error('Error starting ride:', error);
      toast.error('Erreur lors du démarrage');
    }
  };

  // Terminer la course
  const handleCompleteRide = async () => {
    if (!currentRide) return;

    try {
      await TaxiMotoService.updateRideStatus(currentRide.id, 'completed');
      setCurrentRide(null);
      toast.success('Course terminée!');
    } catch (error) {
      console.error('Error completing ride:', error);
      toast.error('Erreur lors de la finalisation');
    }
  };

  if (!driverProfile) {
    return (
      <Card className="p-6">
        <p>Chargement du profil chauffeur...</p>
      </Card>
    );
  }

  return (
    <div className="space-y-6 p-6">
      {/* Header avec statut */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">🏍️ Chauffeur Taxi Moto</h1>
          <p className="text-muted-foreground">{driverProfile.full_name}</p>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-sm font-medium">
            {isOnline ? 'En ligne' : 'Hors ligne'}
          </span>
          <Switch checked={isOnline} onCheckedChange={handleToggleOnline} />
        </div>
      </div>

      {/* Statistiques */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="p-4">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-sm text-muted-foreground">Note</p>
              <p className="text-2xl font-bold">{driverProfile.rating.toFixed(1)}</p>
            </div>
            <Star className="w-6 h-6 text-yellow-500" />
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-sm text-muted-foreground">Courses totales</p>
              <p className="text-2xl font-bold">{driverProfile.total_trips}</p>
            </div>
            <TrendingUp className="w-6 h-6 text-green-500" />
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-sm text-muted-foreground">Revenus totaux</p>
              <p className="text-2xl font-bold">{driverProfile.total_earnings} GNF</p>
            </div>
            <DollarSign className="w-6 h-6 text-blue-500" />
          </div>
        </Card>
      </div>

      {/* Course en cours */}
      {currentRide && (
        <Card className="p-6 bg-primary/10 border-primary">
          <h2 className="text-xl font-semibold mb-4">Course en cours</h2>
          <div className="space-y-3">
            <div className="flex justify-between">
              <span className="font-medium">Code:</span>
              <span className="font-mono">{currentRide.ride_code}</span>
            </div>
            <div className="flex items-start gap-2">
              <MapPin className="w-5 h-5 mt-0.5 text-green-500" />
              <div>
                <p className="font-medium">Départ:</p>
                <p className="text-sm text-muted-foreground">{currentRide.pickup_address}</p>
              </div>
            </div>
            <div className="flex items-start gap-2">
              <MapPin className="w-5 h-5 mt-0.5 text-red-500" />
              <div>
                <p className="font-medium">Arrivée:</p>
                <p className="text-sm text-muted-foreground">{currentRide.dropoff_address}</p>
              </div>
            </div>
            <div className="flex justify-between text-lg font-bold pt-2 border-t">
              <span>Montant:</span>
              <span>{currentRide.estimated_price} GNF</span>
            </div>

            <div className="flex gap-2 mt-4">
              {currentRide.status === 'accepted' && (
                <Button onClick={handleStartRide} className="flex-1">
                  Démarrer la course
                </Button>
              )}
              {currentRide.status === 'started' && (
                <Button onClick={handleCompleteRide} className="flex-1">
                  Terminer la course
                </Button>
              )}
            </div>
          </div>
        </Card>
      )}

      {/* Demandes de courses en attente */}
      {pendingRides.length > 0 && (
        <Card className="p-6">
          <h2 className="text-xl font-semibold mb-4">
            Nouvelles demandes ({pendingRides.length})
          </h2>
          <div className="space-y-3">
            {pendingRides.map((ride) => (
              <Card key={ride.id} className="p-4 border-primary">
                <div className="space-y-2">
                  <div className="flex justify-between items-start">
                    <div className="space-y-1">
                      <p className="text-sm text-muted-foreground">De:</p>
                      <p className="font-medium">{ride.pickup_address}</p>
                    </div>
                    <Badge variant="default">{ride.distance_km} km</Badge>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">À:</p>
                    <p className="font-medium">{ride.dropoff_address}</p>
                  </div>
                  <div className="flex justify-between items-center pt-2 border-t">
                    <span className="text-lg font-bold">{ride.estimated_price} GNF</span>
                    <span className="text-sm text-muted-foreground">
                      <Clock className="w-4 h-4 inline mr-1" />
                      {ride.duration_min} min
                    </span>
                  </div>
                  <div className="flex gap-2 mt-3">
                    <Button
                      onClick={() => handleAcceptRide(ride.id)}
                      disabled={loading}
                      className="flex-1"
                    >
                      Accepter
                    </Button>
                    <Button
                      onClick={() => handleRefuseRide(ride.id)}
                      disabled={loading}
                      variant="outline"
                      className="flex-1"
                    >
                      Refuser
                    </Button>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}
