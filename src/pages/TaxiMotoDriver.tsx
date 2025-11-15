/**
 * INTERFACE CONDUCTEUR TAXI-MOTO - Connectée Supabase
 * Dashboard complet avec données réelles, wallet et navigation Google Maps
 */

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Navigation,
  MapPin,
  Clock,
  DollarSign,
  Star,
  Phone,
  MessageCircle,
  CheckCircle,
  Car,
  TrendingUp,
  Settings,
  LogOut,
  Home,
  User,
  Activity,
  Wallet
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import useCurrentLocation from "@/hooks/useGeolocation";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import SimpleCommunicationInterface from "@/components/communication/SimpleCommunicationInterface";

interface DriverData {
  id: string;
  user_id: string;
  is_online: boolean;
  status: string;
  last_lat: number | null;
  last_lng: number | null;
  rating: number;
  total_rides: number;
  earnings_today: number;
  earnings_total: number;
}

interface Trip {
  id: string;
  customer_id: string;
  pickup_lat: number;
  pickup_lng: number;
  dropoff_lat: number;
  dropoff_lng: number;
  pickup_address: string;
  dropoff_address: string;
  distance_km: number;
  duration_min: number;
  price_total: number;
  driver_share: number;
  platform_fee: number;
  status: string;
  requested_at: string;
  accepted_at: string | null;
  started_at: string | null;
  completed_at: string | null;
}

interface WalletBalance {
  balance: number;
  currency: string;
}

export default function TaxiMotoDriver() {
  const { user, profile, signOut } = useAuth();
  const navigate = useNavigate();
  const { location, getCurrentLocation, watchLocation } = useCurrentLocation();

  const [loading, setLoading] = useState(true);
  const [driverData, setDriverData] = useState<DriverData | null>(null);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [nearbyTrips, setNearbyTrips] = useState<Trip[]>([]);
  const [activeTrip, setActiveTrip] = useState<Trip | null>(null);
  const [tripHistory, setTripHistory] = useState<Trip[]>([]);
  const [walletBalance, setWalletBalance] = useState<WalletBalance | null>(null);
  const [isOnline, setIsOnline] = useState(false);

  useEffect(() => {
    if (user) {
      initializeDriver();
      loadWallet();
    }
  }, [user]);

  useEffect(() => {
    if (isOnline && location) {
      updateDriverLocation();
    }
  }, [location, isOnline]);

  useEffect(() => {
    if (isOnline) {
      const interval = setInterval(() => {
        loadNearbyTrips();
        loadActiveTrip();
      }, 5000);

      return () => clearInterval(interval);
    }
  }, [isOnline]);

  const initializeDriver = async () => {
    try {
      setLoading(true);

      let { data: driver, error } = await supabase
        .from('taxi_drivers')
        .select('*')
        .eq('user_id', user!.id)
        .single();

      if (error && error.code === 'PGRST116') {
        const { data: newDriver, error: createError } = await supabase
          .from('taxi_drivers')
          .insert({
            user_id: user!.id,
            is_online: false,
            status: 'offline'
          })
          .select()
          .single();

        if (createError) throw createError;
        driver = newDriver;
      } else if (error) {
        throw error;
      }

      const { data: trips } = await supabase
        .from('taxi_trips')
        .select('*')
        .eq('driver_id', driver.id);

      const completedTrips = trips?.filter(t => t.status === 'completed') || [];
      const todayTrips = completedTrips.filter(t => 
        new Date(t.completed_at).toDateString() === new Date().toDateString()
      );

      const driverStats: DriverData = {
        ...driver,
        rating: 4.8,
        total_rides: completedTrips.length,
        earnings_today: todayTrips.reduce((sum, t) => sum + (t.driver_share || 0), 0),
        earnings_total: completedTrips.reduce((sum, t) => sum + (t.driver_share || 0), 0)
      };

      setDriverData(driverStats);
      setIsOnline(driver.is_online);
      loadTripHistory();
    } catch (error) {
      console.error('Erreur initialisation conducteur:', error);
      toast.error('Erreur de chargement');
    } finally {
      setLoading(false);
    }
  };

  const loadWallet = async () => {
    try {
      const { data, error } = await supabase
        .from('wallets')
        .select('balance, currency')
        .eq('user_id', user!.id)
        .single();

      if (error) throw error;
      setWalletBalance(data);
    } catch (error) {
      console.error('Erreur chargement wallet:', error);
    }
  };

  const updateDriverLocation = async () => {
    if (!location || !driverData) return;

    try {
      await supabase
        .from('taxi_drivers')
        .update({
          last_lat: location.latitude,
          last_lng: location.longitude,
          last_seen: new Date().toISOString()
        })
        .eq('id', driverData.id);
    } catch (error) {
      console.error('Erreur mise à jour position:', error);
    }
  };

  const loadNearbyTrips = async () => {
    if (!driverData || !location) return;

    try {
      const { data, error } = await supabase
        .from('taxi_trips')
        .select('*')
        .eq('status', 'requested')
        .order('requested_at', { ascending: false })
        .limit(10);

      if (error) throw error;
      
      const nearby = (data || []).filter(trip => {
        if (!trip.pickup_lat || !trip.pickup_lng) return false;
        const distance = calculateDistance(
          location.latitude,
          location.longitude,
          trip.pickup_lat,
          trip.pickup_lng
        );
        return distance <= 5;
      });

      setNearbyTrips(nearby);
    } catch (error) {
      console.error('Erreur chargement courses:', error);
    }
  };

  const loadActiveTrip = async () => {
    if (!driverData) return;

    try {
      const { data, error } = await supabase
        .from('taxi_trips')
        .select('*')
        .eq('driver_id', driverData.id)
        .in('status', ['accepted', 'arriving', 'picked_up', 'in_progress'])
        .order('accepted_at', { ascending: false })
        .limit(1)
        .single();

      if (error && error.code !== 'PGRST116') throw error;
      setActiveTrip(data || null);
    } catch (error) {
      console.error('Erreur chargement course active:', error);
    }
  };

  const loadTripHistory = async () => {
    if (!driverData) return;

    try {
      const { data, error } = await supabase
        .from('taxi_trips')
        .select('*')
        .eq('driver_id', driverData.id)
        .eq('status', 'completed')
        .order('completed_at', { ascending: false })
        .limit(20);

      if (error) throw error;
      setTripHistory(data || []);
    } catch (error) {
      console.error('Erreur chargement historique:', error);
    }
  };

  const toggleOnlineStatus = async () => {
    if (!driverData) return;

    try {
      const newStatus = !isOnline;
      
      if (newStatus) {
        await getCurrentLocation();
      }

      await supabase
        .from('taxi_drivers')
        .update({
          is_online: newStatus,
          status: newStatus ? 'available' : 'offline'
        })
        .eq('id', driverData.id);

      setIsOnline(newStatus);
      toast.success(newStatus ? '✅ Vous êtes en ligne' : '🔴 Vous êtes hors ligne');

      if (newStatus) {
        loadNearbyTrips();
      }
    } catch (error) {
      console.error('Erreur changement statut:', error);
      toast.error('Erreur lors du changement de statut');
    }
  };

  const handleAcceptTrip = async (trip: Trip) => {
    if (!driverData) return;

    try {
      const { error } = await supabase
        .from('taxi_trips')
        .update({
          driver_id: driverData.id,
          status: 'accepted',
          accepted_at: new Date().toISOString()
        })
        .eq('id', trip.id);

      if (error) throw error;

      await supabase
        .from('taxi_drivers')
        .update({ status: 'on_trip' })
        .eq('id', driverData.id);

      setActiveTrip({ ...trip, status: 'accepted', accepted_at: new Date().toISOString() });
      toast.success('Course acceptée !');
      setActiveTab('active');
    } catch (error) {
      console.error('Erreur acceptation course:', error);
      toast.error('Erreur lors de l\'acceptation');
    }
  };

  const handleUpdateTripStatus = async (status: string) => {
    if (!activeTrip) return;

    try {
      const updates: any = { status };
      
      if (status === 'picked_up') {
        updates.started_at = new Date().toISOString();
      } else if (status === 'completed') {
        updates.completed_at = new Date().toISOString();
        
        if (activeTrip.driver_share) {
          await supabase
            .from('wallets')
            .update({ 
              balance: (walletBalance?.balance || 0) + activeTrip.driver_share 
            })
            .eq('user_id', user!.id);
        }
      }

      await supabase
        .from('taxi_trips')
        .update(updates)
        .eq('id', activeTrip.id);

      if (status === 'completed') {
        await supabase
          .from('taxi_drivers')
          .update({ status: 'available' })
          .eq('id', driverData!.id);
        
        setActiveTrip(null);
        loadTripHistory();
        loadWallet();
        toast.success(`+${activeTrip.driver_share} GNF ajoutés à votre wallet`);
      } else {
        setActiveTrip({ ...activeTrip, ...updates });
        toast.success('Statut mis à jour');
      }
    } catch (error) {
      console.error('Erreur mise à jour course:', error);
      toast.error('Erreur lors de la mise à jour');
    }
  };

  const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
    const R = 6371;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
              Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
              Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  };

  const openGoogleMaps = (lat: number, lng: number) => {
    const url = `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}&travelmode=driving`;
    window.open(url, '_blank');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Activity className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-20">
      <div className="bg-gradient-to-r from-green-600 to-blue-600 p-6 text-white">
        <div className="container mx-auto flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold">Conducteur Taxi-Moto</h1>
            <p className="text-white/80">{profile?.first_name || 'Conducteur'}</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="icon" onClick={() => navigate('/home')} className="bg-white/10 border-white/20 text-white hover:bg-white/20">
              <Home className="w-5 h-5" />
            </Button>
            <Button variant="outline" size="icon" onClick={() => navigate('/profil')} className="bg-white/10 border-white/20 text-white hover:bg-white/20">
              <User className="w-5 h-5" />
            </Button>
            <Button variant="outline" size="icon" onClick={signOut} className="bg-white/10 border-white/20 text-white hover:bg-white/20">
              <LogOut className="w-5 h-5" />
            </Button>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-6 -mt-6">
        <Card className="shadow-lg">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-semibold text-lg">Statut</p>
                <p className="text-sm text-muted-foreground">
                  {isOnline ? 'En ligne - Disponible pour les courses' : 'Hors ligne'}
                </p>
              </div>
              <Button
                onClick={toggleOnlineStatus}
                variant={isOnline ? 'destructive' : 'default'}
                size="lg"
              >
                {isOnline ? '🔴 Se déconnecter' : '🟢 Se connecter'}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="container mx-auto px-6 py-6">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <DollarSign className="w-5 h-5 text-green-600" />
                <div>
                  <p className="text-xs text-muted-foreground">Aujourd'hui</p>
                  <p className="text-lg font-bold">{driverData?.earnings_today.toLocaleString()} GNF</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <Wallet className="w-5 h-5 text-blue-600" />
                <div>
                  <p className="text-xs text-muted-foreground">Wallet</p>
                  <p className="text-lg font-bold">{walletBalance?.balance.toLocaleString() || 0} GNF</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <Car className="w-5 h-5 text-purple-600" />
                <div>
                  <p className="text-xs text-muted-foreground">Courses</p>
                  <p className="text-lg font-bold">{driverData?.total_rides}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <Star className="w-5 h-5 text-yellow-600" />
                <div>
                  <p className="text-xs text-muted-foreground">Note</p>
                  <p className="text-lg font-bold">{driverData?.rating}/5</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      <div className="container mx-auto px-6">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="dashboard">Dashboard</TabsTrigger>
            <TabsTrigger value="requests">Demandes</TabsTrigger>
            <TabsTrigger value="active">Course Active</TabsTrigger>
            <TabsTrigger value="history">Historique</TabsTrigger>
          </TabsList>

          <TabsContent value="dashboard" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Vue d'ensemble</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex justify-between items-center p-4 bg-muted rounded-lg">
                    <span>Revenus totaux</span>
                    <span className="font-bold text-xl">{driverData?.earnings_total.toLocaleString()} GNF</span>
                  </div>
                  <div className="flex justify-between items-center p-4 bg-muted rounded-lg">
                    <span>Position actuelle</span>
                    <Badge variant="outline">
                      {location ? `${location.latitude.toFixed(4)}, ${location.longitude.toFixed(4)}` : 'Non disponible'}
                    </Badge>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Communication</CardTitle>
              </CardHeader>
              <CardContent>
                <SimpleCommunicationInterface />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="requests" className="space-y-4">
            {!isOnline ? (
              <Card>
                <CardContent className="p-8 text-center">
                  <p className="text-muted-foreground">Connectez-vous pour voir les demandes de courses</p>
                </CardContent>
              </Card>
            ) : nearbyTrips.length === 0 ? (
              <Card>
                <CardContent className="p-8 text-center">
                  <p className="text-muted-foreground">Aucune demande de course à proximité</p>
                </CardContent>
              </Card>
            ) : (
              nearbyTrips.map((trip) => (
                <Card key={trip.id}>
                  <CardContent className="p-6">
                    <div className="space-y-4">
                      <div className="flex justify-between items-start">
                        <div className="space-y-2">
                          <div className="flex items-center gap-2">
                            <MapPin className="w-4 h-4 text-green-600" />
                            <span className="font-medium">{trip.pickup_address}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Navigation className="w-4 h-4 text-red-600" />
                            <span className="font-medium">{trip.dropoff_address}</span>
                          </div>
                        </div>
                        <Badge variant="outline" className="text-lg font-bold">
                          {trip.price_total.toLocaleString()} GNF
                        </Badge>
                      </div>
                      <div className="flex gap-4 text-sm text-muted-foreground">
                        <span>📏 {trip.distance_km.toFixed(1)} km</span>
                        <span>⏱️ {trip.duration_min} min</span>
                        <span>💰 Votre part: {trip.driver_share.toLocaleString()} GNF</span>
                      </div>
                      <div className="flex gap-2">
                        <Button onClick={() => handleAcceptTrip(trip)} className="flex-1">
                          Accepter la course
                        </Button>
                        <Button
                          variant="outline"
                          onClick={() => openGoogleMaps(trip.pickup_lat, trip.pickup_lng)}
                        >
                          <Navigation className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </TabsContent>

          <TabsContent value="active" className="space-y-4">
            {!activeTrip ? (
              <Card>
                <CardContent className="p-8 text-center">
                  <p className="text-muted-foreground">Aucune course active</p>
                </CardContent>
              </Card>
            ) : (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <span>Course en cours</span>
                    <Badge>{activeTrip.status}</Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <MapPin className="w-4 h-4 text-green-600" />
                      <span>{activeTrip.pickup_address}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Navigation className="w-4 h-4 text-red-600" />
                      <span>{activeTrip.dropoff_address}</span>
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-4 p-4 bg-muted rounded-lg">
                    <div className="text-center">
                      <p className="text-sm text-muted-foreground">Distance</p>
                      <p className="font-bold">{activeTrip.distance_km.toFixed(1)} km</p>
                    </div>
                    <div className="text-center">
                      <p className="text-sm text-muted-foreground">Durée</p>
                      <p className="font-bold">{activeTrip.duration_min} min</p>
                    </div>
                    <div className="text-center">
                      <p className="text-sm text-muted-foreground">Votre part</p>
                      <p className="font-bold text-green-600">{activeTrip.driver_share.toLocaleString()} GNF</p>
                    </div>
                  </div>

                  <div className="space-y-2">
                    {activeTrip.status === 'accepted' && (
                      <Button onClick={() => handleUpdateTripStatus('picked_up')} className="w-full">
                        <CheckCircle className="w-4 h-4 mr-2" />
                        Client récupéré
                      </Button>
                    )}
                    {activeTrip.status === 'picked_up' && (
                      <Button onClick={() => handleUpdateTripStatus('completed')} className="w-full">
                        <CheckCircle className="w-4 h-4 mr-2" />
                        Course terminée
                      </Button>
                    )}
                    <Button
                      variant="outline"
                      onClick={() => openGoogleMaps(
                        activeTrip.status === 'accepted' ? activeTrip.pickup_lat : activeTrip.dropoff_lat,
                        activeTrip.status === 'accepted' ? activeTrip.pickup_lng : activeTrip.dropoff_lng
                      )}
                      className="w-full"
                    >
                      <Navigation className="w-4 h-4 mr-2" />
                      Navigation Google Maps
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="history" className="space-y-4">
            {tripHistory.length === 0 ? (
              <Card>
                <CardContent className="p-8 text-center">
                  <p className="text-muted-foreground">Aucune course terminée</p>
                </CardContent>
              </Card>
            ) : (
              tripHistory.map((trip) => (
                <Card key={trip.id}>
                  <CardContent className="p-4">
                    <div className="flex justify-between items-start">
                      <div className="space-y-1">
                        <p className="font-medium text-sm">{trip.pickup_address}</p>
                        <p className="text-xs text-muted-foreground">→ {trip.dropoff_address}</p>
                        <p className="text-xs text-muted-foreground">
                          {new Date(trip.completed_at!).toLocaleString()}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-green-600">+{trip.driver_share.toLocaleString()} GNF</p>
                        <p className="text-xs text-muted-foreground">{trip.distance_km.toFixed(1)} km</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
