/**
 * DASHBOARD CONDUCTEUR - Composant principal avec connexion temps réel
 * Affiche les statistiques en temps réel depuis la base de données
 */

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Star, MapPin, Wifi, Battery, Phone, Navigation, Car } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { TaxiMotoService } from "@/services/taxi/TaxiMotoService";

interface DriverStats {
  todayEarnings: number;
  todayRides: number;
  rating: number;
  totalRides: number;
  onlineTime: string;
}

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

interface DriverDashboardProps {
  driverId: string;
  isOnline: boolean;
  location: { latitude: number; longitude: number } | null;
  activeRide: ActiveRide | null;
  onNavigate: (tab: string) => void;
  onContactCustomer: (phone: string) => void;
  onToggleOnline: () => void;
}

export function DriverDashboard({
  driverId,
  isOnline,
  location,
  activeRide,
  onNavigate,
  onContactCustomer,
  onToggleOnline
}: DriverDashboardProps) {
  const [stats, setStats] = useState<DriverStats>({
    todayEarnings: 0,
    todayRides: 0,
    rating: 5.0,
    totalRides: 0,
    onlineTime: '0h 0m'
  });
  const [loading, setLoading] = useState(false);

  const loadStats = async () => {
    if (!driverId) return;
    setLoading(true);

    try {
      // Charger le profil conducteur
      const { data: driverData, error: driverError } = await supabase
        .from('taxi_drivers')
        .select('rating, total_rides, total_earnings, is_online, last_seen, created_at')
        .eq('id', driverId)
        .single();

      if (driverError) throw driverError;

      // Charger toutes les courses du conducteur
      const rides = await TaxiMotoService.getDriverRides(driverId, 100);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      const todayRides = rides.filter(r => {
        const rideDate = new Date(r.requested_at);
        return rideDate >= today && r.status === 'completed';
      });
      
      // Calculer les gains du jour
      const todayEarnings = todayRides.reduce((sum, r) => {
        return sum + (r.driver_share || 0);
      }, 0);
      
      // Calculer le temps en ligne
      let onlineMinutes = 0;
      todayRides.forEach(ride => {
        if (ride.completed_at && ride.accepted_at) {
          const start = new Date(ride.accepted_at);
          const end = new Date(ride.completed_at);
          onlineMinutes += Math.floor((end.getTime() - start.getTime()) / 60000);
        }
      });
      
      const hours = Math.floor(onlineMinutes / 60);
      const mins = onlineMinutes % 60;

      setStats({
        todayEarnings: Math.round(todayEarnings),
        todayRides: todayRides.length,
        rating: Number(driverData?.rating) || 5.0,
        totalRides: driverData?.total_rides || 0,
        onlineTime: `${hours}h ${mins}m`
      });

      console.log('✅ Stats loaded:', {
        todayEarnings,
        todayRides: todayRides.length,
        totalRides: driverData?.total_rides
      });
    } catch (error) {
      console.error('❌ Error loading stats:', error);
      toast.error('Erreur de chargement des statistiques');
    } finally {
      setLoading(false);
    }
  };

  // Chargement initial
  useEffect(() => {
    loadStats();
  }, [driverId]);

  // S'abonner aux changements en temps réel
  useEffect(() => {
    if (!driverId) return;

    const channel = supabase
      .channel(`driver-dashboard-${driverId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'taxi_trips',
          filter: `driver_id=eq.${driverId}`
        },
        (payload) => {
          console.log('📊 Trip changed, refreshing dashboard...', payload);
          loadStats();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [driverId]);

  return (
    <div className="space-y-4 mt-4">
      {/* Bouton de statut en ligne/hors ligne */}
      <Card className={`shadow-lg ${isOnline ? 'bg-gradient-to-br from-green-500 to-green-600' : 'bg-gradient-to-br from-gray-400 to-gray-500'}`}>
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className={`w-4 h-4 rounded-full ${isOnline ? 'bg-white animate-pulse' : 'bg-gray-300'}`} />
              <div>
                <h3 className="text-white font-bold text-lg">
                  {isOnline ? '🟢 En ligne' : '🔴 Hors ligne'}
                </h3>
                <p className="text-white/90 text-xs">
                  {isOnline ? 'Vous recevez les demandes de courses' : 'Cliquez pour passer en ligne'}
                </p>
              </div>
            </div>
            <Button
              onClick={onToggleOnline}
              size="lg"
              className={`font-bold ${
                isOnline 
                  ? 'bg-white text-green-600 hover:bg-gray-100' 
                  : 'bg-white text-gray-600 hover:bg-gray-100'
              }`}
            >
              {isOnline ? 'Passer hors ligne' : 'Passer en ligne'}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* En-tête avec bouton de rafraîchissement */}
      <div className="flex items-center justify-between mb-2">
        <h2 className="text-lg font-bold text-gray-800">Statistiques du jour</h2>
        <Button
          onClick={() => {
            loadStats();
            toast.success('✓ Données actualisées');
          }}
          variant="outline"
          size="sm"
          className="gap-1"
          disabled={loading}
        >
          {loading ? '⏳' : '🔄'} Actualiser
        </Button>
      </div>

      {/* Statistiques du jour */}
      <div className="grid grid-cols-2 gap-4">
        <Card className="bg-gradient-to-br from-green-50 to-green-100 border-green-200 shadow-lg hover:shadow-xl transition-shadow">
          <CardContent className="p-4 text-center">
            <div className="text-3xl font-bold text-green-700 mb-1">
              {stats.todayEarnings.toLocaleString()}
            </div>
            <div className="text-xs font-medium text-gray-600">GNF aujourd'hui</div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200 shadow-lg hover:shadow-xl transition-shadow">
          <CardContent className="p-4 text-center">
            <div className="text-3xl font-bold text-blue-700 mb-1">
              {stats.todayRides}
            </div>
            <div className="text-xs font-medium text-gray-600">Courses aujourd'hui</div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <Card className="bg-gradient-to-br from-yellow-50 to-yellow-100 border-yellow-200 shadow-lg hover:shadow-xl transition-shadow">
          <CardContent className="p-4 text-center">
            <div className="text-3xl font-bold text-yellow-700 flex items-center justify-center gap-1 mb-1">
              {stats.rating.toFixed(1)}
              <Star className="w-6 h-6 fill-yellow-500 text-yellow-500" />
            </div>
            <div className="text-xs font-medium text-gray-600">Note moyenne</div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200 shadow-lg hover:shadow-xl transition-shadow">
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-purple-700 mb-1">
              {stats.onlineTime}
            </div>
            <div className="text-xs font-medium text-gray-600">Temps en ligne</div>
          </CardContent>
        </Card>
      </div>

      {/* Course active */}
      {activeRide && (
        <Card className="bg-white/90 backdrop-blur-sm border-0 shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Car className="w-5 h-5 text-blue-600" />
              Course en cours
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-semibold">{activeRide.customer.name}</h3>
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <Star className="w-3 h-3 fill-yellow-400 text-yellow-400" />
                  <span>{activeRide.customer.rating}</span>
                </div>
              </div>
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
            </div>

            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm">
                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                <span>{activeRide.pickup.address}</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                <span>{activeRide.destination.address}</span>
              </div>
            </div>

            <div className="flex gap-2">
              <Button
                onClick={() => onContactCustomer(activeRide.customer.phone)}
                variant="outline"
                size="sm"
                className="flex-1"
              >
                <Phone className="w-4 h-4 mr-1" />
                Appeler
              </Button>
              <Button
                onClick={() => onNavigate('navigation')}
                size="sm"
                className="flex-1"
              >
                <Navigation className="w-4 h-4 mr-1" />
                Navigation
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* État du système - Connexion temps réel */}
      <Card className="bg-white/90 backdrop-blur-sm border-0 shadow-lg">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <div className={`w-2 h-2 rounded-full ${isOnline ? 'bg-green-500 animate-pulse' : 'bg-gray-400'}`}></div>
            État du système
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <MapPin className="w-4 h-4 text-green-600" />
              <span className="text-sm font-medium">GPS</span>
            </div>
            <Badge className={location ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"}>
              {location ? '✓ Actif' : '✗ Inactif'}
            </Badge>
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Wifi className="w-4 h-4 text-green-600" />
              <span className="text-sm font-medium">Base de données</span>
            </div>
            <Badge className={driverId ? "bg-green-100 text-green-800" : "bg-yellow-100 text-yellow-800"}>
              {driverId ? '✓ Connecté' : '⏳ En attente'}
            </Badge>
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Battery className="w-4 h-4 text-blue-600" />
              <span className="text-sm font-medium">Statut</span>
            </div>
            <Badge className={isOnline ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-800"}>
              {isOnline ? '🟢 En ligne' : '⚫ Hors ligne'}
            </Badge>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}