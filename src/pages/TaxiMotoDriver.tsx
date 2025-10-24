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
import { GeolocationService } from "@/services/taxi/GeolocationService";
import { useTaxiNotifications } from "@/hooks/useTaxiNotifications";
import { supabase } from "@/integrations/supabase/client";
import { WalletBalanceWidget } from "@/components/wallet/WalletBalanceWidget";
import { QuickTransferButton } from "@/components/wallet/QuickTransferButton";
import { ActiveRideCard } from "@/components/taxi-moto/ActiveRideCard";
import { DriverStatsCard } from "@/components/taxi-moto/DriverStatsCard";
import { DriverSettings } from "@/components/taxi-moto/DriverSettings";
import { DriverEarnings } from "@/components/taxi-moto/DriverEarnings";
import { RideRequestNotification } from "@/components/taxi-moto/RideRequestNotification";
import { DriverDashboard } from "@/components/taxi-moto/DriverDashboard";
import { DriverNavigation } from "@/components/taxi-moto/DriverNavigation";

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
    const [rideHistory, setRideHistory] = useState<any[]>([]);

    // États de navigation
    const [navigationActive, setNavigationActive] = useState(false);
    const [currentStep, setCurrentStep] = useState('');
    const [nextInstruction, setNextInstruction] = useState('');
    const [distanceToDestination, setDistanceToDestination] = useState(0);
    const [timeToDestination, setTimeToDestination] = useState(0);
    const [routeSteps, setRouteSteps] = useState<any[]>([]);

    // Initialisation : Charger le profil et demander la position GPS
    useEffect(() => {
        loadDriverProfile();
        // Demander la position GPS immédiatement
        getCurrentLocation().catch(err => {
            console.error('Erreur GPS:', err);
            toast.error('⚠️ Veuillez activer votre GPS pour utiliser l\'application');
        });
    }, [getCurrentLocation]);

    useEffect(() => {
        if (driverId) {
            // Chargement initial
            loadDriverStats();
            loadActiveRide();
            loadRideHistory();
            
            // Recharger les stats toutes les 30 secondes
            const statsInterval = setInterval(() => {
                loadDriverStats();
            }, 30000);

            // S'abonner aux changements de courses pour rafraîchir immédiatement
            const channel = supabase
                .channel('driver-stats-updates')
                .on(
                    'postgres_changes',
                    {
                        event: '*',
                        schema: 'public',
                        table: 'taxi_trips',
                        filter: `driver_id=eq.${driverId}`
                    },
                    () => {
                        console.log('📊 Course updated, refreshing stats...');
                        loadDriverStats();
                        loadRideHistory();
                    }
                )
                .subscribe();
            
            return () => {
                clearInterval(statsInterval);
                supabase.removeChannel(channel);
            };
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
                        last_lat: position.coords.latitude,
                        last_lng: position.coords.longitude,
                        last_seen: new Date().toISOString()
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

        // Si on veut passer en ligne, vérifier/obtenir la position GPS
        if (next) {
            try {
                // Demander la position GPS
                const position = await getCurrentLocation();
                console.log('📍 Position GPS obtenue:', position);
                
                // Mettre le chauffeur en ligne avec la position
                await TaxiMotoService.updateDriverStatus(
                    driverId,
                    true,
                    true,
                    position.latitude,
                    position.longitude
                );

                setIsOnline(true);
                toast.success('🟢 Vous êtes maintenant en ligne');
                
                // Charger les courses en attente
                loadPendingRides();
                
            } catch (error) {
                console.error('Erreur GPS:', error);
                toast.error('⚠️ Impossible d\'obtenir votre position GPS. Veuillez activer votre GPS et réessayer.');
                return;
            }
        } else {
            // Passer hors ligne
            try {
                await TaxiMotoService.updateDriverStatus(
                    driverId,
                    false,
                    false,
                    location?.latitude,
                    location?.longitude
                );

                setIsOnline(false);
                toast.info('🔴 Vous êtes maintenant hors ligne');
                
                // Vider les demandes de courses
                setRideRequests([]);
            } catch (error) {
                console.error('Error updating status:', error);
                toast.error('Erreur lors du changement de statut');
            }
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
                .in('status', ['accepted', 'started', 'arriving', 'in_progress'])
                .order('requested_at', { ascending: false })
                .limit(1);

            if (error) {
                console.error('Error loading active ride:', error);
                return;
            }

            if (!rides || rides.length === 0) {
                setActiveRide(null);
                setNavigationActive(false);
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

            // Mapper les statuts DB vers les statuts frontend
            let frontendStatus: ActiveRide['status'] = 'accepted';
            if (ride.status === 'arriving') {
                frontendStatus = 'arriving';
            } else if (ride.status === 'started') {
                frontendStatus = 'picked_up';
            } else if (ride.status === 'in_progress') {
                frontendStatus = 'in_progress';
            } else if (ride.status === 'accepted') {
                frontendStatus = 'accepted';
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
                status: frontendStatus,
                startTime: ride.accepted_at || ride.created_at,
                estimatedEarnings: ride.driver_share || Math.round((ride.price_total || 0) * 0.85)
            };

            setActiveRide(activeRideData);
            setNavigationActive(true);
            
            // Si course démarrée, lancer navigation vers destination
            if (frontendStatus === 'picked_up' || frontendStatus === 'in_progress') {
                startNavigation(activeRideData.destination.coords);
            } else {
                // Sinon navigation vers pickup
                startNavigation(activeRideData.pickup.coords);
            }
            
            console.log('✅ Course active chargée:', activeRideData);
        } catch (error) {
            console.error('Error loading active ride:', error);
        }
    };

    /**
     * Charge l'historique des courses
     */
    const loadRideHistory = async () => {
        if (!driverId) return;

        try {
            const rides = await TaxiMotoService.getDriverRides(driverId, 50);
            const completedRides = rides.filter(r => r.status === 'completed');
            setRideHistory(completedRides);
            console.log(`✅ Historique chargé: ${completedRides.length} courses`);
        } catch (error) {
            console.error('Error loading ride history:', error);
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
            
            // Calculer les gains du jour depuis driver_share
            const todayEarnings = todayRides.reduce((sum, r) => {
                return sum + (r.driver_share || 0);
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
            estimatedEarnings: ride.driver_share || Math.round((ride.price_total || 0) * 0.85),
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
        console.log('🎯 Tentative d\'acceptation de course:', request.id);
        
        if (!driverId) {
            console.error('❌ Pas de driverId disponible');
            toast.error('Profil conducteur non trouvé');
            return;
        }

        console.log('✅ DriverId trouvé:', driverId);

        try {
            console.log('📞 Appel de TaxiMotoService.acceptRide...');
            // Appeler le service d'acceptation via TaxiMotoService
            await TaxiMotoService.acceptRide(request.id, driverId);
            console.log('✅ Course acceptée avec succès dans la DB');

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
                    console.log('📱 Téléphone client chargé:', customerPhone);
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

            console.log('🚗 Définition de la course active:', newActiveRide);
            setActiveRide(newActiveRide);
            setRideRequests([]);
            setNavigationActive(true);
            setActiveTab('navigation');

            toast.success('✅ Course acceptée ! Navigation vers le client...');

            // Marquer les notifications comme lues
            const relatedNotifs = notifications.filter(n => n.data?.rideId === request.id);
            relatedNotifs.forEach(n => markAsRead(n.id));

            // Démarrer la navigation
            console.log('🗺️ Démarrage de la navigation vers:', request.pickupCoords);
            startNavigation(request.pickupCoords);
        } catch (error) {
            console.error('❌ Erreur lors de l\'acceptation:', error);
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
    const startNavigation = async (destination: { latitude: number; longitude: number }) => {
        setNavigationActive(true);
        setNextInstruction('📍 Calcul de l\'itinéraire...');
        
        if (!location) {
            toast.error('Position GPS non disponible');
            return;
        }

        try {
            // Calculer l'itinéraire avec Google Maps
            const route = await GeolocationService.calculateRoute(
                { lat: location.latitude, lng: location.longitude },
                { lat: destination.latitude, lng: destination.longitude }
            );

            if (route) {
                setDistanceToDestination(route.distance);
                setTimeToDestination(route.duration);
                setRouteSteps(route.steps);
                
                // Afficher la première instruction
                if (route.steps.length > 0) {
                    const firstStep = route.steps[0];
                    setNextInstruction(firstStep.instruction.replace(/<[^>]*>/g, ''));
                } else {
                    setNextInstruction(`Direction: ${route.endAddress}`);
                }

                toast.success(`🗺️ Itinéraire calculé: ${route.distanceText}, ${route.durationText}`);
            } else {
                // Fallback: calcul de distance simple
                const distance = GeolocationService.calculateDistance(
                    location.latitude,
                    location.longitude,
                    destination.latitude,
                    destination.longitude
                );
                setDistanceToDestination(distance * 1000);
                setTimeToDestination(Math.ceil(distance / 30 * 60));
                setNextInstruction('Navigation démarrée - Suivez les indications');
                toast.info('Navigation activée (mode simplifié)');
            }
        } catch (error) {
            console.error('Navigation error:', error);
            // Fallback en cas d'erreur
            const distance = GeolocationService.calculateDistance(
                location.latitude,
                location.longitude,
                destination.latitude,
                destination.longitude
            );
            setDistanceToDestination(distance * 1000);
            setTimeToDestination(Math.ceil(distance / 30 * 60));
            setNextInstruction('Navigation activée');
            toast.warning('Navigation en mode simplifié');
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
            // Mapper les statuts frontend vers les statuts DB
            let dbStatus: string;
            
            if (newStatus === 'arriving') {
                dbStatus = 'arriving';
            } else if (newStatus === 'picked_up') {
                dbStatus = 'started';
            } else if (newStatus === 'in_progress') {
                dbStatus = 'in_progress';
            } else {
                dbStatus = newStatus;
            }

            // Mettre à jour le statut dans la DB
            await TaxiMotoService.updateRideStatus(activeRide.id, dbStatus);
            
            // Mettre à jour l'état local
            setActiveRide(prev => prev ? { ...prev, status: newStatus } : null);

            switch (newStatus) {
                case 'arriving':
                    toast.success('🎯 Vous êtes arrivé au point de rendez-vous');
                    break;
                case 'picked_up':
                    toast.success('🚗 Client à bord, navigation vers la destination...');
                    if (activeRide) {
                        startNavigation(activeRide.destination.coords);
                    }
                    break;
                case 'in_progress':
                    toast.success('🏁 Arrivé à destination !');
                    // Ne pas terminer tout de suite, attendre confirmation
                    setTimeout(() => {
                        completeRide();
                    }, 2000);
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
            console.log('🏁 Finalisation de la course:', activeRide.id);
            
            // Marquer la course comme complétée
            await TaxiMotoService.updateRideStatus(activeRide.id, 'completed', {
                completed_at: new Date().toISOString()
            });
            
            // Mettre à jour les statistiques du conducteur dans la DB
            const { data: currentDriver, error: driverError } = await supabase
                .from('taxi_drivers')
                .select('total_rides, total_earnings')
                .eq('id', driverId)
                .single();
            
            if (driverError) {
                console.error('Error loading driver stats:', driverError);
            }
            
            if (currentDriver) {
                const newTotalRides = (currentDriver.total_rides || 0) + 1;
                const newTotalEarnings = (currentDriver.total_earnings || 0) + activeRide.estimatedEarnings;
                
                const { error: updateError } = await supabase
                    .from('taxi_drivers')
                    .update({
                        total_rides: newTotalRides,
                        total_earnings: newTotalEarnings,
                        status: 'available',
                        is_available: true
                    })
                    .eq('id', driverId);
                
                if (updateError) {
                    console.error('Error updating driver stats:', updateError);
                }
            }
            
            // Mettre à jour les statistiques locales
            setDriverStats(prev => ({
                ...prev,
                todayEarnings: prev.todayEarnings + activeRide.estimatedEarnings,
                todayRides: prev.todayRides + 1,
                totalRides: prev.totalRides + 1
            }));

            toast.success(`💰 Course terminée ! +${activeRide.estimatedEarnings.toLocaleString()} GNF`);

            // Réinitialiser l'état
            setActiveRide(null);
            setNavigationActive(false);
            setActiveTab('dashboard');
            
            // Recharger les données
            setTimeout(() => {
                loadDriverStats();
                loadRideHistory();
            }, 500);
            
            console.log('✅ Course finalisée avec succès');
        } catch (error) {
            console.error('Error completing ride:', error);
            toast.error('Erreur lors de la finalisation de la course');
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


            {/* Demandes de course en attente - AFFICHAGE PRIORITAIRE */}
            {rideRequests.length > 0 && (
                <div className="fixed top-16 left-0 right-0 z-[100] bg-black/20 backdrop-blur-sm">
                    <div className="max-w-2xl mx-auto p-4 space-y-3 max-h-[calc(100vh-8rem)] overflow-y-auto">
                        {/* Indicateur de nombre de courses */}
                        <div className="bg-yellow-500 text-black font-bold text-center py-2 px-4 rounded-lg shadow-xl animate-bounce">
                          🚨 {rideRequests.length} course(s) disponible(s) ! 🚨
                        </div>
                        
                        {rideRequests.map((request, index) => (
                            <RideRequestNotification
                                key={request.id}
                                request={request}
                                onAccept={() => acceptRideRequest(request)}
                                onDecline={() => declineRideRequest(request.id)}
                                index={index}
                            />
                        ))}
                    </div>
                </div>
            )}

            {/* Message quand en ligne sans courses */}
            {isOnline && rideRequests.length === 0 && !activeRide && (
                <div className="px-4 mt-2">
                    <Card className="bg-blue-50 border-blue-200 shadow-lg">
                        <CardContent className="p-3">
                            <div className="flex items-center justify-between gap-3">
                                <div className="flex items-center gap-3">
                                    <Car className="w-5 h-5 text-blue-600 animate-pulse" />
                                    <div>
                                        <p className="text-sm font-bold text-blue-900">🟢 Vous êtes en ligne</p>
                                        <p className="text-xs text-blue-700">En attente de courses...</p>
                                    </div>
                                </div>
                                <Button
                                    onClick={toggleOnlineStatus}
                                    variant="outline"
                                    size="sm"
                                    className="border-red-300 text-red-600 hover:bg-red-50 text-xs px-2 py-1 h-auto"
                                >
                                    🔴 Hors ligne
                                </Button>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            )}

            {/* Navigation par onglets */}
            <div className="px-4 mt-4">
                <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                    <TabsList className="grid w-full grid-cols-4 bg-white/80 backdrop-blur-sm">
                        <TabsTrigger value="dashboard">
                            <TrendingUp className="w-4 h-4 mr-1" />
                            <span className="hidden sm:inline">Dashboard</span>
                        </TabsTrigger>
                        <TabsTrigger value="navigation">
                            <Navigation className="w-4 h-4 mr-1" />
                            <span className="hidden sm:inline">Course</span>
                        </TabsTrigger>
                        <TabsTrigger value="earnings">
                            <DollarSign className="w-4 h-4 mr-1" />
                            <span className="hidden sm:inline">Gains</span>
                        </TabsTrigger>
                        <TabsTrigger value="settings">
                            <Settings className="w-4 h-4 mr-1" />
                            <span className="hidden sm:inline">Réglages</span>
                        </TabsTrigger>
                    </TabsList>

                    {/* Dashboard - Composant dédié avec connexion temps réel */}
                    <TabsContent value="dashboard" className="mt-0">
                        <DriverDashboard
                            driverId={driverId || ''}
                            isOnline={isOnline}
                            location={location}
                            activeRide={activeRide}
                            onNavigate={setActiveTab}
                            onContactCustomer={contactCustomer}
                            onToggleOnline={toggleOnlineStatus}
                        />
                    </TabsContent>

                    {/* Navigation - Composant dédié avec connexion temps réel */}
                    <TabsContent value="navigation" className="mt-0">
                        <DriverNavigation
                            driverId={driverId || ''}
                            location={location}
                            onContactCustomer={contactCustomer}
                        />
                    </TabsContent>

                    {/* Gains - Composant dédié avec connexion temps réel */}
                    <TabsContent value="earnings" className="mt-0">
                        <DriverEarnings driverId={driverId || ''} />
                    </TabsContent>

                    {/* Onglet Paramètres */}
                    <TabsContent value="settings" className="mt-4">
                        {driverId && <DriverSettings driverId={driverId} />}
                    </TabsContent>
                </Tabs>
            </div>

            {/* Barre de navigation inférieure */}
            <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 shadow-lg z-50">
                <div className="grid grid-cols-4 h-16">
                    <button
                        onClick={() => setActiveTab('dashboard')}
                        className={`flex flex-col items-center justify-center gap-1 transition-colors ${activeTab === 'dashboard' ? 'text-blue-600' : 'text-gray-500'
                            }`}
                    >
                        <TrendingUp className="w-5 h-5" />
                        <span className="text-xs font-medium">Accueil</span>
                    </button>

                    <button
                        onClick={() => window.location.href = '/marketplace'}
                        className="flex flex-col items-center justify-center gap-1 text-gray-500 hover:text-gray-700 transition-colors"
                    >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
                        </svg>
                        <span className="text-xs font-medium">Marketplace</span>
                    </button>

                    <button
                        onClick={() => setActiveTab('navigation')}
                        className={`flex flex-col items-center justify-center gap-1 transition-colors ${activeTab === 'navigation' ? 'text-blue-600' : 'text-gray-500'
                            }`}
                    >
                        <MapPin className="w-5 h-5" />
                        <span className="text-xs font-medium">Tracking</span>
                    </button>

                    <button
                        onClick={() => setActiveTab('settings')}
                        className={`flex flex-col items-center justify-center gap-1 transition-colors ${activeTab === 'settings' ? 'text-blue-600' : 'text-gray-500'
                            }`}
                    >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                        </svg>
                        <span className="text-xs font-medium">Profil</span>
                    </button>
                </div>
            </div>
        </div>
    );
}
