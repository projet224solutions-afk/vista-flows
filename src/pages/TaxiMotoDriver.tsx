// @ts-nocheck
/**
 * INTERFACE CONDUCTEUR TAXI-MOTO ULTRA PROFESSIONNELLE
 * Dashboard complet pour les conducteurs avec navigation temps réel
 * 224Solutions - Taxi-Moto System
 */

import { useState, useEffect } from 'react';
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
    AlertTriangle,
    CheckCircle,
    Car,
    TrendingUp,
    Battery,
    Wifi,
    Settings,
    LogOut,
    Bell
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import useCurrentLocation from "@/hooks/useGeolocation";
import { toast } from "sonner";
import { TaxiMotoService } from "@/services/taxi/TaxiMotoService";
import { useTaxiNotifications } from "@/hooks/useTaxiNotifications";
import { supabase } from "@/integrations/supabase/client";
import { WalletBalanceWidget } from "@/components/wallet/WalletBalanceWidget";
import { QuickTransferButton } from "@/components/wallet/QuickTransferButton";

// API_BASE supprimé - Utilisation directe de Supabase

interface RideRequest {
    id: string;
    customerId: string;
    customerName: string;
    customerRating: number;
    pickupAddress: string;
    destinationAddress: string;
    distance: number;
    estimatedEarnings: number;
    estimatedDuration: number;
    pickupCoords: { latitude: number; longitude: number };
    destinationCoords: { latitude: number; longitude: number };
    requestTime: string;
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

export default function TaxiMotoDriver() {
    const { user, profile, signOut } = useAuth();
    const { location, getCurrentLocation, watchLocation, stopWatching } = useCurrentLocation();
    const { notifications, unreadCount, markAsRead, markAllAsRead } = useTaxiNotifications();

    const [isOnline, setIsOnline] = useState(false);
    const [activeTab, setActiveTab] = useState('dashboard');
    const [rideRequests, setRideRequests] = useState<RideRequest[]>([]);
    const [activeRide, setActiveRide] = useState<ActiveRide | null>(null);
    const [driverStats, setDriverStats] = useState({
        todayEarnings: 0,
        todayRides: 0,
        rating: 0,
        totalRides: 0,
        onlineTime: '0h 0m'
    });
    const [driverId, setDriverId] = useState<string | null>(null);
    const [locationWatchId, setLocationWatchId] = useState<number | null>(null);

    // États de navigation
    const [navigationActive, setNavigationActive] = useState(false);
    const [currentStep, setCurrentStep] = useState('');
    const [nextInstruction, setNextInstruction] = useState('');
    const [distanceToDestination, setDistanceToDestination] = useState(0);
    const [timeToDestination, setTimeToDestination] = useState(0);

    useEffect(() => {
        loadDriverProfile();
    }, []);

    useEffect(() => {
        if (driverId) {
            loadDriverStats();
            loadActiveRide(); // Charger la course active
            
            // Recharger les stats toutes les 30 secondes
            const statsInterval = setInterval(() => {
                loadDriverStats();
            }, 30000);
            
            return () => clearInterval(statsInterval);
        }
    }, [driverId]);

    // Gérer le statut en ligne et le tracking
    useEffect(() => {
        if (isOnline && driverId) {
            startLocationTracking();
            loadPendingRides(); // Charger les courses en attente
        } else if (locationWatchId !== null) {
            stopWatching(locationWatchId);
            setLocationWatchId(null);
        }
    }, [isOnline, driverId]);

    // S'abonner aux demandes de courses temps réel
    useEffect(() => {
        if (!driverId || !isOnline) return;

        const channel = supabase
            .channel('driver-ride-requests')
            .on(
                'postgres_changes',
                {
                    event: 'INSERT',
                    schema: 'public',
                    table: 'taxi_trips',
                    filter: `status=eq.requested`
                },
                async (payload) => {
                    console.log('📲 Nouvelle course disponible:', payload);
                    const ride = payload.new as any;
                    
                    // Vérifier si le chauffeur est à proximité
                    if (location) {
                        const distance = calculateDistance(
                            location.latitude,
                            location.longitude,
                            ride.pickup_lat,
                            ride.pickup_lng
                        );
                        
                        // Si à moins de 5km, afficher la demande
                        if (distance <= 5) {
                            await addRideRequestFromDB(ride);
                            toast.success('🚗 Nouvelle course disponible!');
                            // Audio notification
                            try {
                                const audio = new Audio('/notification.mp3');
                                audio.play().catch(() => {});
                            } catch (e) {}
                        }
                    }
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [driverId, isOnline, location]);

    // S'abonner aux mises à jour de la course active
    useEffect(() => {
        if (!activeRide) return;

        const unsubscribe = TaxiMotoService.subscribeToRide(activeRide.id, (updatedRide) => {
            console.log('📍 Mise à jour course:', updatedRide);
            
            // Mettre à jour la course active
            if (updatedRide.status === 'cancelled' || updatedRide.status === 'completed') {
                setActiveRide(null);
                setNavigationActive(false);
                if (updatedRide.status === 'cancelled') {
                    toast.error('❌ La course a été annulée');
                }
            }
        });

        return unsubscribe;
    }, [activeRide]);


    /**
     * Démarre le suivi de position en temps réel
     */
    const startLocationTracking = () => {
        const watchId = watchLocation((position) => {
            // Mettre à jour la position dans la DB en temps réel
            if (driverId) {
                supabase
                    .from('taxi_drivers')
                    .update({
                        current_lat: position.coords.latitude,
                        current_lng: position.coords.longitude,
                        last_location_update: new Date().toISOString()
                    })
                    .eq('id', driverId)
                    .then(({ error }) => {
                        if (error) console.error('Error updating driver location:', error);
                    });

                // Si une course est active, tracker la position
                if (activeRide && (activeRide.status === 'picked_up' || activeRide.status === 'in_progress')) {
                    TaxiMotoService.trackPosition(
                        activeRide.id,
                        driverId,
                        position.coords.latitude,
                        position.coords.longitude,
                        position.coords.speed || undefined,
                        position.coords.heading || undefined,
                        position.coords.accuracy || undefined
                    ).catch(err => console.error('Error tracking position:', err));
                }
            }
        });
        setLocationWatchId(watchId);
        console.log('📍 Suivi de position GPS activé');
    };

    /**
     * Bascule le statut en ligne/hors ligne
     */
    const toggleOnlineStatus = async () => {
        const next = !isOnline;
        
        if (!driverId) {
            toast.error('Profil conducteur non trouvé');
            return;
        }

        if (!location && next) {
            toast.error('Impossible d\'obtenir votre position GPS');
            return;
        }

        try {
            await TaxiMotoService.updateDriverStatus(
                driverId,
                next,
                next,
                location?.latitude,
                location?.longitude
            );

            setIsOnline(next);
            
            if (next) {
                toast.success('🟢 Vous êtes maintenant en ligne');
            } else {
                toast.info('🔴 Vous êtes maintenant hors ligne');
            }
        } catch (error) {
            console.error('Error updating status:', error);
            toast.error('Erreur lors du changement de statut');
        }
    };

    /**
     * Charge le profil conducteur
     */
    const loadDriverProfile = async () => {
        if (!user) return;
        
        try {
            const { data, error } = await supabase
                .from('taxi_drivers')
                .select('*')
                .eq('user_id', user.id)
                .single();

            if (data) {
                setDriverId(data.id);
                setIsOnline(data.is_online || false);
            }
        } catch (error) {
            console.error('Error loading driver profile:', error);
        }
    };

    /**
     * Charge la course active depuis la DB
     */
    const loadActiveRide = async () => {
        if (!driverId) return;

        try {
            const { data: rides, error } = await supabase
                .from('taxi_trips')
                .select('*')
                .eq('driver_id', driverId)
                .in('status', ['accepted', 'started', 'driver_arriving'])
                .limit(1);

            if (error) {
                console.error('Error loading active ride:', error);
                return;
            }

            if (!rides || rides.length === 0) return;
            
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

                const { data: ratings } = await supabase
                    .from('taxi_ratings')
                    .select('rating')
                    .eq('customer_id', ride.customer_id);
                
                if (ratings && ratings.length > 0) {
                    customerRating = ratings.reduce((sum, r) => sum + r.rating, 0) / ratings.length;
                }
            } catch (e) {
                console.error('Error loading customer info:', e);
            }

            const activeRideData: ActiveRide = {
                id: ride.id,
                customer: {
                    name: customerName,
                    phone: customerPhone,
                    rating: Math.round(customerRating * 10) / 10
                },
                pickup: {
                    address: ride.pickup_address,
                    coords: { latitude: ride.pickup_lat || 0, longitude: ride.pickup_lng || 0 }
                },
                destination: {
                    address: ride.dropoff_address,
                    coords: { latitude: ride.dropoff_lat || 0, longitude: ride.dropoff_lng || 0 }
                },
                status: ride.status === 'started' ? 'picked_up' : 'accepted',
                startTime: ride.accepted_at || ride.created_at,
                estimatedEarnings: ride.estimated_price || 0
            };

            setActiveRide(activeRideData);
            setNavigationActive(true);
            
            console.log('✅ Course active chargée:', activeRideData);
        } catch (error) {
            console.error('Error loading active ride:', error);
        }
    };

    /**
     * Charge les courses en attente depuis la DB
     */
    const loadPendingRides = async () => {
        if (!driverId || !location) return;

        try {
            // Charger toutes les courses "requested" à proximité (5km)
            const { data: rides, error } = await supabase
                .from('taxi_trips')
                .select('*')
                .eq('status', 'requested')
                .is('driver_id', null);

            if (error) throw error;
            if (!rides || rides.length === 0) return;

            // Filtrer par distance et ajouter à la liste
            const nearbyRides = rides.filter(ride => {
                if (!ride.pickup_lat || !ride.pickup_lng) return false;
                const distance = calculateDistance(
                    location.latitude,
                    location.longitude,
                    ride.pickup_lat,
                    ride.pickup_lng
                );
                return distance <= 5; // 5km radius
            });

            // Charger les détails pour chaque course
            for (const ride of nearbyRides) {
                await addRideRequestFromDB(ride);
            }

            if (nearbyRides.length > 0) {
                toast.success(`${nearbyRides.length} course(s) disponible(s)!`);
            }
        } catch (error) {
            console.error('Error loading pending rides:', error);
        }
    };

    /**
     * Charge les statistiques du conducteur
     */
    const loadDriverStats = async () => {
        if (!driverId) return;

        try {
            // Charger le profil conducteur complet
            const { data: driverData } = await supabase
                .from('taxi_drivers')
                .select('rating, total_rides, total_earnings, is_online, last_seen, created_at')
                .eq('id', driverId)
                .single();

            // Charger toutes les courses du conducteur
            const rides = await TaxiMotoService.getDriverRides(driverId, 100);
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            
            const todayRides = rides.filter(r => {
                const rideDate = new Date(r.requested_at || r.created_at);
                return rideDate >= today && r.status === 'completed';
            });
            
            // Calculer les gains du jour depuis les courses complétées
            const todayEarnings = todayRides.reduce((sum, r) => {
                // 85% du prix total va au chauffeur
                return sum + ((r.estimated_price || r.price_total || 0) * 0.85);
            }, 0);
            
            // Calculer le temps en ligne aujourd'hui
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

            setDriverStats({
                todayEarnings: Math.round(todayEarnings),
                todayRides: todayRides.length,
                rating: Number(driverData?.rating) || 5.0,
                totalRides: driverData?.total_rides || 0,
                onlineTime: `${hours}h ${mins}m`
            });
        } catch (error) {
            console.error('Error loading stats:', error);
            toast.error('Erreur de chargement des statistiques');
        }
    };


    /**
     * Ajoute une demande de course depuis la DB
     */
    const addRideRequestFromDB = async (ride: any) => {
        // Charger les données du client
        let customerName = 'Client';
        let customerRating = 4.5;
        
        try {
            const { data: customerProfile } = await supabase
                .from('profiles')
                .select('first_name, last_name')
                .eq('id', ride.customer_id)
                .single();

            if (customerProfile) {
                customerName = `${customerProfile.first_name || ''} ${customerProfile.last_name || ''}`.trim() || 'Client';
            }

            // Charger la note du client depuis taxi_ratings
            const { data: ratings } = await supabase
                .from('taxi_ratings')
                .select('rating')
                .eq('customer_id', ride.customer_id);
            
            if (ratings && ratings.length > 0) {
                customerRating = ratings.reduce((sum, r) => sum + r.rating, 0) / ratings.length;
            }
        } catch (error) {
            console.error('Error loading customer:', error);
        }

        const request: RideRequest = {
            id: ride.id,
            customerId: ride.customer_id,
            customerName,
            customerRating: Math.round(customerRating * 10) / 10,
            pickupAddress: ride.pickup_address,
            destinationAddress: ride.dropoff_address,
            distance: ride.distance_km || 0,
            estimatedEarnings: ride.estimated_price || 0,
            estimatedDuration: ride.duration_min || 0,
            pickupCoords: { 
                latitude: ride.pickup_lat || 0, 
                longitude: ride.pickup_lng || 0 
            },
            destinationCoords: { 
                latitude: ride.dropoff_lat || 0, 
                longitude: ride.dropoff_lng || 0 
            },
            requestTime: ride.created_at
        };

        setRideRequests(prev => {
            // Éviter les doublons
            if (prev.some(r => r.id === request.id)) return prev;
            return [...prev, request];
        });
    };

    /**
     * Accepte une demande de course avec chargement des données client réelles
     */
    const acceptRideRequest = async (request: RideRequest) => {
        if (!driverId) {
            toast.error('Profil conducteur non trouvé');
            return;
        }

        try {
            // Appeler le service d'acceptation via TaxiMotoService
            await TaxiMotoService.acceptRide(request.id, driverId);

            // Charger le téléphone réel du client
            let customerPhone = '+224 600 00 00 00';
            try {
                const { data: customerProfile } = await supabase
                    .from('profiles')
                    .select('phone')
                    .eq('id', request.customerId)
                    .single();
                
                if (customerProfile?.phone) {
                    customerPhone = customerProfile.phone;
                }
            } catch (error) {
                console.error('Error loading customer phone:', error);
            }

            const newActiveRide: ActiveRide = {
                id: request.id,
                customer: {
                    name: request.customerName,
                    phone: customerPhone,
                    rating: request.customerRating
                },
                pickup: {
                    address: request.pickupAddress,
                    coords: request.pickupCoords
                },
                destination: {
                    address: request.destinationAddress,
                    coords: request.destinationCoords
                },
                status: 'accepted',
                startTime: new Date().toISOString(),
                estimatedEarnings: request.estimatedEarnings
            };

            setActiveRide(newActiveRide);
            setRideRequests([]);
            setNavigationActive(true);
            setActiveTab('navigation');

            toast.success('✅ Course acceptée ! Navigation vers le client...');

            // Marquer les notifications comme lues
            const relatedNotifs = notifications.filter(n => n.data?.rideId === request.id);
            relatedNotifs.forEach(n => markAsRead(n.id));

            // Démarrer la navigation
            startNavigation(request.pickupCoords);
        } catch (error) {
            console.error('Error accepting ride:', error);
            toast.error('Impossible d\'accepter la course. Elle a peut-être déjà été prise.');
        }
    };

    /**
     * Refuse une demande de course
     */
    const declineRideRequest = async (requestId: string) => {
        if (!driverId) return;

        try {
            await TaxiMotoService.refuseRide(requestId, driverId);
            setRideRequests(prev => prev.filter(req => req.id !== requestId));
            
            // Marquer les notifications comme lues
            const relatedNotifs = notifications.filter(n => n.data?.rideId === requestId);
            relatedNotifs.forEach(n => markAsRead(n.id));
            
            toast.info('❌ Demande refusée');
        } catch (error) {
            console.error('Error declining ride:', error);
            toast.error('Erreur lors du refus');
        }
    };

    /**
     * Démarre la navigation GPS vers une destination
     */
    const startNavigation = (destination: { latitude: number; longitude: number }) => {
        setNavigationActive(true);
        setNextInstruction('Navigation démarrée');
        
        // En production, utiliser une vraie API de navigation (Google Maps, Mapbox, etc.)
        // Ici on initialise juste l'état de navigation
        if (location) {
            const distance = calculateDistance(
                location.latitude,
                location.longitude,
                destination.latitude,
                destination.longitude
            );
            setDistanceToDestination(distance * 1000);
            setTimeToDestination(Math.ceil(distance / 30 * 60)); // Estimation à 30km/h
        }
    };

    const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
        const R = 6371; // Rayon de la Terre en km
        const dLat = (lat2 - lat1) * Math.PI / 180;
        const dLon = (lon2 - lon1) * Math.PI / 180;
        const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
                  Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
                  Math.sin(dLon/2) * Math.sin(dLon/2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
        return R * c;
    };

    /**
     * Met à jour le statut de la course
     */
    const updateRideStatus = async (newStatus: ActiveRide['status']) => {
        if (!activeRide) return;

        try {
            let dbStatus = newStatus === 'arriving' ? 'accepted' : 
                          newStatus === 'picked_up' ? 'started' : 
                          newStatus === 'in_progress' ? 'completed' : newStatus;

            await TaxiMotoService.updateRideStatus(activeRide.id, dbStatus);
            setActiveRide(prev => prev ? { ...prev, status: newStatus } : null);

            switch (newStatus) {
                case 'arriving':
                    toast.success('🎯 Vous êtes arrivé au point de rendez-vous');
                    break;
                case 'picked_up':
                    toast.success('🚗 Client à bord, navigation vers la destination...');
                    if (activeRide && driverId) {
                        startNavigation(activeRide.destination.coords);
                    }
                    break;
                case 'in_progress':
                    toast.success('🏁 Course terminée !');
                    completeRide();
                    break;
            }
        } catch (error) {
            console.error('Error updating ride status:', error);
            toast.error('Erreur lors de la mise à jour');
        }
    };

    /**
     * Termine la course
     */
    const completeRide = async () => {
        if (!activeRide || !driverId) return;

        try {
            // Marquer la course comme complétée
            await TaxiMotoService.updateRideStatus(activeRide.id, 'completed');
            
            // Mettre à jour les statistiques du conducteur dans la DB
            const { data: currentDriver } = await supabase
                .from('taxi_drivers')
                .select('total_trips, total_earnings')
                .eq('id', driverId)
                .single();
            
            if (currentDriver) {
                await supabase
                    .from('taxi_drivers')
                    .update({
                        total_rides: (currentDriver.total_rides || 0) + 1,
                        total_earnings: (currentDriver.total_earnings || 0) + activeRide.estimatedEarnings,
                        status: 'available',
                        is_available: true
                    })
                    .eq('id', driverId);
            }
            
            // Mettre à jour les statistiques locales
            setDriverStats(prev => ({
                ...prev,
                todayEarnings: prev.todayEarnings + activeRide.estimatedEarnings,
                todayRides: prev.todayRides + 1,
                totalRides: prev.totalRides + 1
            }));

            toast.success(`💰 Course terminée ! +${activeRide.estimatedEarnings.toLocaleString()} GNF`);

            setActiveRide(null);
            setNavigationActive(false);
            setActiveTab('dashboard');
            
            // Recharger les statistiques
            loadDriverStats();
        } catch (error) {
            console.error('Error completing ride:', error);
            toast.error('Erreur lors de la finalisation');
        }
    };

    /**
     * Contacte le client
     */
    const contactCustomer = (phone: string) => {
        window.open(`tel:${phone}`);
    };

    /**
     * Déconnexion
     */
    const handleSignOut = async () => {
        setIsOnline(false);
        await signOut();
        toast.success('Déconnexion réussie');
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-blue-50 to-green-50 pb-20">
            {/* Header conducteur */}
            <header className="bg-white/90 backdrop-blur-sm border-b border-gray-200 sticky top-0 z-40">
                <div className="px-4 py-4">
                    <div className="flex items-center justify-between">
                        <div>
                            <h1 className="text-xl font-bold text-gray-900">
                                Conducteur {profile?.first_name || 'Taxi-Moto'}
                            </h1>
                            <div className="flex items-center gap-2">
                                <div className={`w-2 h-2 rounded-full ${isOnline ? 'bg-green-500' : 'bg-red-500'}`}></div>
                                <span className="text-sm text-gray-600">
                                    {isOnline ? 'En ligne' : 'Hors ligne'}
                                </span>
                                {location && (
                                    <>
                                        <span className="text-gray-400">•</span>
                                        <span className="text-xs text-gray-500">GPS actif</span>
                                    </>
                                )}
                            </div>
                        </div>

                        <div className="flex items-center gap-2">
                            <div className="hidden lg:block">
                                <WalletBalanceWidget className="max-w-[260px]" showTransferButton={false} />
                            </div>
                            <QuickTransferButton variant="ghost" size="icon" showText={false} />
                            {unreadCount > 0 && (
                                <div className="relative">
                                    <Bell className="w-5 h-5 text-gray-600" />
                                    <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-4 h-4 flex items-center justify-center">
                                        {unreadCount}
                                    </span>
                                </div>
                            )}
                            <Button
                                onClick={toggleOnlineStatus}
                                variant={isOnline ? "destructive" : "default"}
                                size="sm"
                            >
                                {isOnline ? 'Se déconnecter' : 'Se connecter'}
                            </Button>
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

            {/* Demandes de course en attente */}
            {rideRequests.length > 0 && (
                <div className="fixed top-20 left-4 right-4 z-50 max-h-[60vh] overflow-y-auto">
                    {rideRequests.map((request) => (
                        <Card key={request.id} className="bg-yellow-50 border-yellow-200 mb-2 animate-in slide-in-from-top">
                            <CardContent className="p-4">
                                <div className="flex items-center justify-between mb-3">
                                    <div>
                                        <h3 className="font-semibold">Nouvelle course 🚗</h3>
                                        <p className="text-sm text-gray-600">{request.customerName}</p>
                                    </div>
                                    <Badge className="bg-green-100 text-green-800 text-base font-bold">
                                        +{request.estimatedEarnings.toLocaleString()} GNF
                                    </Badge>
                                </div>

                                <div className="space-y-1 mb-3 text-sm">
                                    <div className="flex items-center gap-2">
                                        <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                                        <span className="font-medium">Départ:</span>
                                        <span>{request.pickupAddress}</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                                        <span className="font-medium">Arrivée:</span>
                                        <span>{request.destinationAddress}</span>
                                    </div>
                                </div>

                                <div className="flex items-center justify-between text-xs text-gray-600 mb-3 bg-gray-50 p-2 rounded">
                                    <span className="font-medium">{request.distance.toFixed(1)}km • {request.estimatedDuration}min</span>
                                    <div className="flex items-center gap-1">
                                        <Star className="w-3 h-3 fill-yellow-400 text-yellow-400" />
                                        <span className="font-medium">{request.customerRating}</span>
                                    </div>
                                </div>

                                <div className="flex gap-2 mt-3">
                                    <Button
                                        onClick={() => declineRideRequest(request.id)}
                                        variant="outline"
                                        size="sm"
                                        className="flex-1"
                                    >
                                        ❌ Refuser
                                    </Button>
                                    <Button
                                        onClick={() => acceptRideRequest(request)}
                                        size="sm"
                                        className="flex-1 bg-green-600 hover:bg-green-700"
                                    >
                                        ✅ Accepter
                                    </Button>
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            )}

            {/* Message quand en ligne sans courses */}
            {isOnline && rideRequests.length === 0 && !activeRide && (
                <div className="fixed top-20 left-4 right-4 z-40">
                    <Card className="bg-blue-50 border-blue-200">
                        <CardContent className="p-4 text-center">
                            <div className="flex flex-col items-center gap-2">
                                <Car className="w-8 h-8 text-blue-600 animate-pulse" />
                                <p className="text-sm font-medium text-blue-900">En attente de courses...</p>
                                <p className="text-xs text-blue-700">Vous recevrez une notification dès qu'une course est disponible</p>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            )}

            {/* Navigation par onglets */}
            <div className="px-4 mt-4">
                <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                    <TabsList className="grid w-full grid-cols-3 bg-white/80 backdrop-blur-sm">
                        <TabsTrigger value="dashboard">
                            <TrendingUp className="w-4 h-4 mr-1" />
                            Dashboard
                        </TabsTrigger>
                        <TabsTrigger value="navigation" disabled={!activeRide}>
                            <Navigation className="w-4 h-4 mr-1" />
                            Navigation
                        </TabsTrigger>
                        <TabsTrigger value="earnings">
                            <DollarSign className="w-4 h-4 mr-1" />
                            Gains
                        </TabsTrigger>
                    </TabsList>

                    {/* Dashboard */}
                    <TabsContent value="dashboard" className="space-y-4 mt-4">
                        {/* Statistiques du jour */}
                        <div className="grid grid-cols-2 gap-4">
                            <Card className="bg-white/90 backdrop-blur-sm border-0 shadow-lg">
                                <CardContent className="p-4 text-center">
                                    <div className="text-2xl font-bold text-green-600">
                                        {driverStats.todayEarnings.toLocaleString()}
                                    </div>
                                    <div className="text-sm text-gray-600">FCFA aujourd'hui</div>
                                </CardContent>
                            </Card>

                            <Card className="bg-white/90 backdrop-blur-sm border-0 shadow-lg">
                                <CardContent className="p-4 text-center">
                                    <div className="text-2xl font-bold text-blue-600">
                                        {driverStats.todayRides}
                                    </div>
                                    <div className="text-sm text-gray-600">Courses</div>
                                </CardContent>
                            </Card>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <Card className="bg-white/90 backdrop-blur-sm border-0 shadow-lg">
                                <CardContent className="p-4 text-center">
                                    <div className="text-2xl font-bold text-yellow-600 flex items-center justify-center gap-1">
                                        {driverStats.rating}
                                        <Star className="w-5 h-5 fill-current" />
                                    </div>
                                    <div className="text-sm text-gray-600">Note moyenne</div>
                                </CardContent>
                            </Card>

                            <Card className="bg-white/90 backdrop-blur-sm border-0 shadow-lg">
                                <CardContent className="p-4 text-center">
                                    <div className="text-2xl font-bold text-purple-600">
                                        {driverStats.onlineTime}
                                    </div>
                                    <div className="text-sm text-gray-600">En ligne</div>
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
                                        <Badge className={`${activeRide.status === 'accepted' ? 'bg-yellow-100 text-yellow-800' :
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
                                            onClick={() => contactCustomer(activeRide.customer.phone)}
                                            variant="outline"
                                            size="sm"
                                            className="flex-1"
                                        >
                                            <Phone className="w-4 h-4 mr-1" />
                                            Appeler
                                        </Button>
                                        <Button
                                            onClick={() => setActiveTab('navigation')}
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

                        {/* État du système */}
                        <Card className="bg-white/90 backdrop-blur-sm border-0 shadow-lg">
                            <CardHeader>
                                <CardTitle className="text-lg">État du système</CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-3">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <MapPin className="w-4 h-4 text-green-600" />
                                        <span className="text-sm">GPS</span>
                                    </div>
                                    <Badge className="bg-green-100 text-green-800">Actif</Badge>
                                </div>

                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <Wifi className="w-4 h-4 text-green-600" />
                                        <span className="text-sm">Connexion</span>
                                    </div>
                                    <Badge className="bg-green-100 text-green-800">Excellente</Badge>
                                </div>

                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <Battery className="w-4 h-4 text-yellow-600" />
                                        <span className="text-sm">Batterie</span>
                                    </div>
                                    <Badge className="bg-yellow-100 text-yellow-800">75%</Badge>
                                </div>
                            </CardContent>
                        </Card>
                    </TabsContent>

                    {/* Navigation */}
                    <TabsContent value="navigation" className="space-y-4 mt-4">
                        {activeRide && navigationActive ? (
                            <>
                                {/* Instruction de navigation */}
                                <Card className="bg-blue-50 border-blue-200">
                                    <CardContent className="p-6 text-center">
                                        <Navigation className="w-12 h-12 mx-auto mb-4 text-blue-600" />
                                        <h3 className="text-lg font-semibold mb-2">{nextInstruction}</h3>
                                        <div className="flex items-center justify-center gap-4 text-sm text-gray-600">
                                            <span>{distanceToDestination}m</span>
                                            <span>•</span>
                                            <span>{timeToDestination} min</span>
                                        </div>
                                    </CardContent>
                                </Card>

                                {/* Actions de course */}
                                <Card className="bg-white/90 backdrop-blur-sm border-0 shadow-lg">
                                    <CardContent className="p-4 space-y-3">
                                        {activeRide.status === 'accepted' && (
                                            <Button
                                                onClick={() => updateRideStatus('arriving')}
                                                className="w-full"
                                            >
                                                <CheckCircle className="w-4 h-4 mr-2" />
                                                Je suis arrivé
                                            </Button>
                                        )}

                                        {activeRide.status === 'arriving' && (
                                            <Button
                                                onClick={() => updateRideStatus('picked_up')}
                                                className="w-full"
                                            >
                                                <Car className="w-4 h-4 mr-2" />
                                                Client à bord
                                            </Button>
                                        )}

                                        {activeRide.status === 'picked_up' && (
                                            <Button
                                                onClick={() => updateRideStatus('in_progress')}
                                                className="w-full bg-green-600 hover:bg-green-700"
                                            >
                                                <CheckCircle className="w-4 h-4 mr-2" />
                                                Terminer la course
                                            </Button>
                                        )}
                                    </CardContent>
                                </Card>
                            </>
                        ) : (
                            <Card className="bg-white/90 backdrop-blur-sm border-0 shadow-lg">
                                <CardContent className="p-8 text-center">
                                    <Navigation className="w-12 h-12 mx-auto mb-4 text-gray-400" />
                                    <h3 className="text-lg font-semibold text-gray-700 mb-2">
                                        Aucune navigation active
                                    </h3>
                                    <p className="text-gray-600">
                                        Acceptez une course pour commencer la navigation
                                    </p>
                                </CardContent>
                            </Card>
                        )}
                    </TabsContent>

                    {/* Gains */}
                    <TabsContent value="earnings" className="space-y-4 mt-4">
                        <Card className="bg-white/90 backdrop-blur-sm border-0 shadow-lg">
                            <CardHeader>
                                <CardTitle>Résumé des gains</CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="text-center">
                                    <div className="text-3xl font-bold text-green-600 mb-2">
                                        {driverStats.todayEarnings.toLocaleString()} FCFA
                                    </div>
                                    <p className="text-gray-600">Gains d'aujourd'hui</p>
                                </div>

                                <div className="grid grid-cols-2 gap-4 pt-4 border-t">
                                    <div className="text-center">
                                        <div className="text-lg font-bold text-blue-600">
                                            {driverStats.todayRides}
                                        </div>
                                        <div className="text-sm text-gray-600">Courses</div>
                                    </div>
                                    <div className="text-center">
                                        <div className="text-lg font-bold text-purple-600">
                                            {driverStats.todayRides > 0 ? Math.round(driverStats.todayEarnings / driverStats.todayRides) : 0}
                                        </div>
                                        <div className="text-sm text-gray-600">FCFA/course</div>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    </TabsContent>
                </Tabs>
            </div>
        </div>
    );
}
