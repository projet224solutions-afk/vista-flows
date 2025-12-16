// @ts-nocheck
/**
 * INTERFACE CONDUCTEUR TAXI-MOTO ULTRA PROFESSIONNELLE
 * Dashboard complet pour les conducteurs avec navigation temps réel
 * 224Solutions - Taxi-Moto System
 */

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from "@/hooks/useTranslation";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";
import useCurrentLocation from "@/hooks/useGeolocation";
import { useDriverSubscription } from "@/hooks/useDriverSubscription";
import { useTaxiNotifications } from "@/hooks/useTaxiNotifications";
import { useTaxiErrorBoundary } from "@/hooks/useTaxiErrorBoundary";
import { TaxiMotoService } from "@/services/taxi/TaxiMotoService";
import { supabase } from "@/integrations/supabase/client";
import { Car, Star } from "lucide-react";

// UI Components - New Uber/Bolt Style
import { 
    DriverHeader, 
    BottomNavigation, 
    DriverMainDashboard,
    ActiveRideNavigationPanel
} from "@/components/taxi-moto/driver";

// Existing components
import { GoogleMapsNavigation } from "@/components/taxi-moto/GoogleMapsNavigation";
import { GPSPermissionHelper } from "@/components/taxi-moto/GPSPermissionHelper";
import { DriverSettings } from "@/components/taxi-moto/DriverSettings";
import { DriverEarnings } from "@/components/taxi-moto/DriverEarnings";
import { DriverNavigation } from "@/components/taxi-moto/DriverNavigation";
import { InstallPromptBanner } from "@/components/pwa/InstallPromptBanner";
import CommunicationWidget from "@/components/communication/CommunicationWidget";


// API_BASE supprimé - Utilisation directe de Supabase

interface RideRequest {
    id: string;
    customerId: string;
    customerName: string;
    customerPhone: string;
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
    const { error, capture, clear } = useTaxiErrorBoundary();
    const { t } = useTranslation();
const { location: hookLocation, getCurrentLocation, watchLocation, stopWatching } = useCurrentLocation();
    const [activeLocation, setActiveLocation] = useState<{ latitude: number; longitude: number } | null>(null);
    
    // Location effective = soit la location du hook, soit la location obtenue manuellement
    const location = hookLocation || activeLocation;
    const { notifications, unreadCount, markAsRead, markAllAsRead } = useTaxiNotifications();
    const { hasAccess, subscription, loading: subscriptionLoading, isExpired } = useDriverSubscription();

    const [isOnline, setIsOnline] = useState(false);
    const [onlineSince, setOnlineSince] = useState<Date | null>(null);
    const [activeTab, setActiveTab] = useState('dashboard');
    const [rideRequests, setRideRequests] = useState<RideRequest[]>([]);
    const [activeRide, setActiveRide] = useState<ActiveRide | null>(null);
    const [acceptingRideId, setAcceptingRideId] = useState<string | null>(null);
    const [driverStats, setDriverStats] = useState({
        todayEarnings: 0,
        todayRides: 0,
        rating: 0,
        totalRides: 0,
        onlineTime: '0h 0m'
    });
    const [driverId, setDriverId] = useState<string | null>(null);
    const [driverLoading, setDriverLoading] = useState(true);
    const [locationWatchId, setLocationWatchId] = useState<number | null>(null);
    const [rideHistory, setRideHistory] = useState<any[]>([]);

    // Calcul temps en ligne en temps réel
    useEffect(() => {
        if (!isOnline || !onlineSince) {
            setDriverStats(prev => ({ ...prev, onlineTime: '0h 0m' }));
            return;
        }

        const updateOnlineTime = () => {
            const now = new Date();
            const diffMs = now.getTime() - onlineSince.getTime();
            const hours = Math.floor(diffMs / (1000 * 60 * 60));
            const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
            const seconds = Math.floor((diffMs % (1000 * 60)) / 1000);
            
            let timeStr = '';
            if (hours > 0) {
                timeStr = `${hours}h ${minutes}m`;
            } else if (minutes > 0) {
                timeStr = `${minutes}m ${seconds}s`;
            } else {
                timeStr = `${seconds}s`;
            }
            
            setDriverStats(prev => ({ ...prev, onlineTime: timeStr }));
        };

        // Mettre à jour immédiatement
        updateOnlineTime();
        
        // Puis toutes les secondes
        const interval = setInterval(updateOnlineTime, 1000);
        
        return () => clearInterval(interval);
    }, [isOnline, onlineSince]);

    // États de navigation
    const [navigationActive, setNavigationActive] = useState(false);
    const [currentStep, setCurrentStep] = useState('');
    const [nextInstruction, setNextInstruction] = useState('');
    const [distanceToDestination, setDistanceToDestination] = useState(0);
    const [timeToDestination, setTimeToDestination] = useState(0);
    const [routeSteps, setRouteSteps] = useState<any[]>([]);

    // Initialisation : Charger le profil quand l'utilisateur est connecté
    useEffect(() => {
        if (user?.id) {
            console.log('🔄 [useEffect] User connecté, chargement profil...');
            loadDriverProfile();
        }
    }, [user?.id]);

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
                    (payload) => {
                        console.log('📊 Course updated, refreshing data...', payload);
                        
                        // Si la course est annulée ou terminée, réinitialiser activeRide
                        if (payload.new && (payload.new.status === 'cancelled' || payload.new.status === 'completed')) {
                            console.log('🚫 Course annulée ou terminée, nettoyage de activeRide');
                            setActiveRide(null);
                            setNavigationActive(false);
                        }
                        
                        // Recharger toutes les données
                        loadDriverStats();
                        loadRideHistory();
                        loadActiveRide();
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
        if (isOnline && driverId && hasAccess) {
            startLocationTracking();
            loadPendingRides(); // Charger les courses en attente
        } else if (locationWatchId !== null) {
            stopWatching(locationWatchId);
            setLocationWatchId(null);
        }
    }, [isOnline, driverId, hasAccess]);

    // S'abonner aux demandes de courses temps réel
    useEffect(() => {
        if (!driverId || !isOnline || !hasAccess) {
            console.log('⚠️ [TaxiMotoDriver] Subscription NON activée:', { driverId, isOnline, hasAccess });
            return;
        }

        console.log('🔔 [TaxiMotoDriver] Subscription aux courses activée pour driver:', driverId);

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
                    console.log('📲 [TaxiMotoDriver] Nouvelle course détectée:', payload);
                    const ride = payload.new as any;
                    
                    // Vérifier si le conducteur a déjà refusé cette course
                    const declinedDrivers = ride.declined_drivers || [];
                    if (declinedDrivers.includes(driverId)) {
                        console.log('⚠️ Course déjà refusée par ce conducteur, ignorée');
                        return;
                    }
                    
                    // Toujours afficher une notification, même si hors distance
                    console.log('🔊 Affichage notification + son pour course:', ride.id);
                    toast.success('🚗 Nouvelle course disponible!', {
                        description: `De ${ride.pickup_address || 'Adresse inconnue'}`,
                        duration: 10000
                    });
                    
                    // Audio notification
                    try {
                        const audio = new Audio('/notification.mp3');
                        audio.volume = 0.8;
                        audio.play().catch(() => console.log('Autoplay bloqué'));
                    } catch (e) {
                        console.log('Erreur lecture son:', e);
                    }
                    
                    // Vérifier si le chauffeur est à proximité pour afficher dans la liste
                    if (location) {
                        const distance = calculateDistance(
                            location.latitude,
                            location.longitude,
                            ride.pickup_lat,
                            ride.pickup_lng
                        );
                        
                        console.log(`📍 Distance calculée: ${distance.toFixed(2)}km`);
                        
                        // Si à moins de 10km, afficher la demande dans la liste
                        if (distance <= 10) {
                            console.log('✅ Ajout course à la liste (< 10km)');
                            await addRideRequestFromDB(ride);
                        } else {
                            console.log('⚠️ Course trop loin (> 10km), notification uniquement');
                        }
                    } else {
                        console.log('⚠️ Pas de localisation disponible, ajout de la course quand même');
                        await addRideRequestFromDB(ride);
                    }
                }
            )
            .subscribe((status) => {
                console.log('🔔 Subscription status:', status);
                if (status === 'SUBSCRIBED') {
                    console.log('✅ [TaxiMotoDriver] ABONNÉ avec succès aux courses pour driver:', driverId);
                } else if (status === 'CHANNEL_ERROR') {
                    console.error('❌ [TaxiMotoDriver] ERREUR subscription Realtime!');
                    toast.error('Erreur de connexion temps réel. Rechargez la page.');
                } else if (status === 'TIMED_OUT') {
                    console.error('⏱️ [TaxiMotoDriver] TIMEOUT subscription Realtime!');
                    toast.error('Délai dépassé pour la connexion temps réel.');
                }
            });

        return () => {
            console.log('🔕 Unsubscribe des courses');
            supabase.removeChannel(channel);
        };
    }, [driverId, isOnline, hasAccess]);

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
        console.log('🚀 Démarrage du suivi GPS...');
        
        if (!navigator.geolocation) {
            console.error('❌ Géolocalisation non disponible');
            toast.error('GPS non disponible sur cet appareil');
            return;
        }

        // Utiliser directement navigator.geolocation.watchPosition
const watchId = navigator.geolocation.watchPosition(
            (position) => {
                console.log('📍 Position mise à jour:', {
                    lat: position.coords.latitude,
                    lng: position.coords.longitude,
                    accuracy: position.coords.accuracy
                });
                
                // Mettre à jour l'état local de position pour l'UI
                setActiveLocation({
                    latitude: position.coords.latitude,
                    longitude: position.coords.longitude
                });
                
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
                            if (error) {
                                console.error('❌ Erreur mise à jour position:', error);
                            } else {
                                console.log('✅ Position sauvegardée en DB');
                            }
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
                        ).catch(err => console.error('❌ Erreur tracking course:', err));
                    }
                }
            },
            (error) => {
                console.error('❌ Erreur suivi GPS:', error);
                let errorMessage = 'Erreur suivi GPS';
                
                switch (error.code) {
                    case error.PERMISSION_DENIED:
                        errorMessage = 'Permission GPS refusée. Autorisez l\'accès dans les paramètres.';
                        break;
                    case error.POSITION_UNAVAILABLE:
                        errorMessage = 'Position GPS indisponible. Vérifiez que le GPS est activé.';
                        break;
                    case error.TIMEOUT:
                        errorMessage = 'Délai GPS dépassé. Vérifiez votre connexion.';
                        break;
                }
                
                toast.error(errorMessage, { duration: 5000 });
            },
            {
                enableHighAccuracy: true,
                timeout: 15000,
                maximumAge: 5000
            }
        );
        
        setLocationWatchId(watchId);
        console.log('✅ Suivi GPS activé avec watchId:', watchId);
    };

    /**
     * Bascule le statut en ligne/hors ligne avec gestion GPS améliorée
     */
    const toggleOnlineStatus = async () => {
        const next = !isOnline;
        
        if (!driverId) {
            toast.error('Profil conducteur non trouvé');
            return;
        }

        // Vérifier l'abonnement avant de passer en ligne
        if (next && !hasAccess) {
            toast.error('⚠️ Abonnement requis', {
                description: 'Vous devez avoir un abonnement actif pour recevoir des courses'
            });
            return;
        }

        // Si on veut passer en ligne, vérifier/obtenir la position GPS
        if (next) {
            toast.loading('📍 Activation GPS en cours...', { id: 'gps-loading' });
            
            try {
                // Demander explicitement la permission GPS
                if (!('geolocation' in navigator)) {
                    toast.dismiss('gps-loading');
                    toast.error('❌ GPS non disponible sur cet appareil');
                    return;
                }

                console.log('📍 Demande permission GPS...');
                
                // Fonction pour obtenir la position avec retry
                const getPosition = (highAccuracy: boolean, timeout: number): Promise<GeolocationPosition> => {
                    return new Promise((resolve, reject) => {
                        navigator.geolocation.getCurrentPosition(
                            resolve,
                            reject,
                            {
                                enableHighAccuracy: highAccuracy,
                                timeout: timeout,
                                maximumAge: 10000 // Accepter position jusqu'à 10s
                            }
                        );
                    });
                };

                let position: GeolocationPosition;
                
                try {
                    // Essayer d'abord avec haute précision et timeout court
                    position = await getPosition(true, 15000);
                } catch (firstError: any) {
                    console.log('⚠️ Haute précision échouée, essai basse précision...', firstError.code);
                    toast.loading('📍 Recherche position alternative...', { id: 'gps-loading' });
                    
                    try {
                        // Fallback: basse précision avec timeout plus long
                        position = await getPosition(false, 30000);
                    } catch (secondError: any) {
                        // Dernier recours: IP geolocation pour les ordinateurs de bureau
                        console.log('⚠️ GPS hardware échoué, essai géolocalisation IP...');
                        toast.loading('📍 Localisation par IP...', { id: 'gps-loading' });
                        
                        try {
                            const ipResponse = await fetch('https://ipapi.co/json/');
                            const ipData = await ipResponse.json();
                            
                            if (ipData.latitude && ipData.longitude) {
                                console.log('✅ Position obtenue via IP:', ipData);
                                position = {
                                    coords: {
                                        latitude: ipData.latitude,
                                        longitude: ipData.longitude,
                                        accuracy: 5000, // Précision estimée IP ~5km
                                        altitude: null,
                                        altitudeAccuracy: null,
                                        heading: null,
                                        speed: null
                                    },
                                    timestamp: Date.now()
                                } as GeolocationPosition;
                                
                                toast.info('📍 Localisation approximative (IP)', {
                                    description: 'Pour une meilleure précision, utilisez un appareil mobile avec GPS'
                                });
                            } else {
                                throw secondError;
                            }
                        } catch (ipError) {
                            console.error('❌ IP geolocation échouée:', ipError);
                            throw secondError;
                        }
                    }
                }
                
                console.log('✅ Position GPS obtenue:', {
                    lat: position.coords.latitude,
                    lng: position.coords.longitude,
                    accuracy: position.coords.accuracy
                });
                
                toast.dismiss('gps-loading');
                toast.success('✅ GPS activé avec succès');
                
                // Stocker la position dans l'état local pour afficher "GPS Actif"
                setActiveLocation({
                    latitude: position.coords.latitude,
                    longitude: position.coords.longitude
                });
                
                // Mettre le chauffeur en ligne avec la position
                await TaxiMotoService.updateDriverStatus(
                    driverId,
                    true,
                    true,
                    position.coords.latitude,
                    position.coords.longitude
                );

                setIsOnline(true);
                setOnlineSince(new Date()); // Démarrer le chronomètre
                toast.success('🟢 Vous êtes maintenant en ligne');
                
                // Démarrer le suivi de position
                startLocationTracking();
                
                // Charger les courses en attente
                await loadPendingRides();
                
            } catch (error: any) {
                capture('gps', 'Erreur GPS lors de la mise en ligne', error);
                toast.dismiss('gps-loading');
                
                // Message d'erreur détaillé selon le type d'erreur
                let errorTitle = '⚠️ Erreur GPS';
                let errorMessage = 'Impossible d\'obtenir votre position';
                
                if (error?.code === 1) {
                    errorTitle = '🚫 Permission refusée';
                    errorMessage = 'Autorisez l\'accès GPS dans les paramètres de votre navigateur';
                } else if (error?.code === 2) {
                    errorTitle = '📍 Position indisponible';
                    errorMessage = 'Activez le GPS et vérifiez votre connexion internet';
                } else if (error?.code === 3) {
                    errorTitle = '⏱️ Délai dépassé';
                    errorMessage = 'La recherche GPS a pris trop de temps. Réessayez à l\'extérieur.';
                }
                
                toast.error(
                    <div className="space-y-2">
                        <p className="font-semibold">{errorTitle}</p>
                        <p className="text-sm">{errorMessage}</p>
                        <div className="text-xs opacity-80 mt-2">
                            <p>💡 Conseils:</p>
                            <p>• Allez à l'extérieur pour un meilleur signal</p>
                            <p>• Activez le WiFi pour une localisation plus rapide</p>
                            <p>• Rechargez la page et réessayez</p>
                        </div>
                    </div>,
                    { duration: 8000 }
                );
                return;
            }
        } else {
            // Passer hors ligne
            try {
                console.log('🛑 Arrêt du suivi GPS...');
                
                // Arrêter le suivi de position
                if (locationWatchId !== null) {
                    console.log('🛑 Arrêt watchId:', locationWatchId);
                    navigator.geolocation.clearWatch(locationWatchId);
                    setLocationWatchId(null);
                }
                
                await TaxiMotoService.updateDriverStatus(
                    driverId,
                    false,
                    false,
                    location?.latitude,
                    location?.longitude
                );

                setIsOnline(false);
                setOnlineSince(null); // Réinitialiser le chronomètre
                setActiveLocation(null); // Réinitialiser la position GPS
                toast.info('🔴 Vous êtes maintenant hors ligne');
                
                // Vider les demandes de courses
                setRideRequests([]);
            } catch (error) {
                capture('network', 'Erreur lors du changement de statut', error);
                toast.error('Erreur lors du changement de statut');
            }
        }
    };

    /**
     * Charge le profil conducteur
     */
    const loadDriverProfile = async () => {
        if (!user) {
            console.log('⚠️ [loadDriverProfile] Pas d\'utilisateur connecté');
            setDriverLoading(false);
            return;
        }
        
        setDriverLoading(true);
        console.log('🔄 [loadDriverProfile] Chargement profil pour user:', user.id);
        
        try {
            const { data, error } = await supabase
                .from('taxi_drivers')
                .select('*')
                .eq('user_id', user.id)
                .single();

            if (error) {
                console.error('❌ [loadDriverProfile] Erreur:', error);
                // Si pas de profil existant, essayer de créer
                if (error.code === 'PGRST116') {
                    console.log('📝 [loadDriverProfile] Création profil conducteur...');
                    const { data: newDriver, error: createError } = await supabase
                        .from('taxi_drivers')
                        .insert({
                            user_id: user.id,
                            is_online: false,
                            status: 'offline',
                            rating: 5.0,
                            total_rides: 0
                        })
                        .select()
                        .single();
                    
                    if (createError) {
                        console.error('❌ [loadDriverProfile] Erreur création:', createError);
                        toast.error('Impossible de créer le profil conducteur');
                    } else if (newDriver) {
                        console.log('✅ [loadDriverProfile] Profil conducteur créé:', newDriver.id);
                        setDriverId(newDriver.id);
                        setIsOnline(false);
                    }
                } else {
                    toast.error('Erreur de chargement du profil conducteur');
                }
                setDriverLoading(false);
                return;
            }

            if (data) {
                console.log('✅ [loadDriverProfile] Profil conducteur chargé:', data.id);
                setDriverId(data.id);
                setIsOnline(data.is_online || false);
            } else {
                console.warn('⚠️ [loadDriverProfile] Aucun profil conducteur trouvé');
                toast.error('Profil conducteur introuvable. Contactez le support.');
            }
        } catch (error) {
            console.error('❌ [loadDriverProfile] Exception:', error);
            toast.error('Erreur lors du chargement du profil');
        } finally {
            setDriverLoading(false);
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
                    .select('stars')
                    .eq('customer_id', ride.customer_id);
                
                if (ratings && ratings.length > 0) {
                    customerRating = ratings.reduce((sum, r) => sum + r.stars, 0) / ratings.length;
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
        if (!driverId || !location || !hasAccess) return;

        try {
            // Charger toutes les courses "requested" à proximité (5km)
            const { data: rides, error } = await supabase
                .from('taxi_trips')
                .select('*')
                .eq('status', 'requested')
                .is('driver_id', null);

            if (error) throw error;
            if (!rides || rides.length === 0) return;

            // Filtrer les courses déjà refusées par ce conducteur
            const availableRides = rides.filter(ride => {
                // Vérifier si le conducteur a déjà refusé cette course
                const declinedDrivers = ride.declined_drivers || [];
                return !declinedDrivers.includes(driverId);
            });

            // Filtrer par distance et ajouter à la liste
            const nearbyRides = availableRides.filter(ride => {
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

            // Charger la note du client depuis taxi_ratings
            const { data: ratings } = await supabase
                .from('taxi_ratings')
                .select('stars')
                .eq('customer_id', ride.customer_id);
            
            if (ratings && ratings.length > 0) {
                customerRating = ratings.reduce((sum, r) => sum + r.stars, 0) / ratings.length;
            }
        } catch (error) {
            console.error('Error loading customer:', error);
        }

        const request: RideRequest = {
            id: ride.id,
            customerId: ride.customer_id,
            customerName,
            customerPhone,
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
        
        // Vérifier si une acceptation est déjà en cours
        if (acceptingRideId) {
            console.log('⏳ Une acceptation est déjà en cours:', acceptingRideId);
            toast.info('Veuillez patienter, une course est en cours d\'acceptation...');
            return;
        }
        
        if (!driverId) {
            console.error('❌ Pas de driverId disponible');
            toast.error('Profil conducteur non trouvé');
            return;
        }

        console.log('✅ DriverId trouvé:', driverId);
        
        // Définir l'état d'acceptation en cours
        setAcceptingRideId(request.id);

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
        } catch (error: any) {
            console.error('❌ Erreur acceptation course:', error);
            
            // Gestion spécifique de l'erreur de verrouillage
            if (error.message?.includes('LOCKED') || error.message?.includes('déjà en cours')) {
                toast.warning('⏳ Cette course est déjà en cours d\'attribution par un autre conducteur. Veuillez en sélectionner une autre.');
            } else if (error.message?.includes('ALREADY_ASSIGNED') || error.message?.includes('déjà attribuée')) {
                toast.info('ℹ️ Cette course a déjà été attribuée à un autre conducteur.');
            } else {
                toast.error(`Erreur: ${error.message || 'Impossible d\'accepter la course'}`);
            }
        } finally {
            // Réinitialiser l'état d'acceptation
            setAcceptingRideId(null);
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
     * Annule la course en cours
     */
    const cancelActiveRide = async () => {
        if (!activeRide || !driverId) return;

        // Demander confirmation
        const confirmed = window.confirm(
            '⚠️ Êtes-vous sûr de vouloir annuler cette course ?\n\n' +
            'Le client sera notifié et vous pourriez recevoir une pénalité.'
        );

        if (!confirmed) return;

        try {
            console.log('❌ Annulation de la course:', activeRide.id);
            
            // Annuler la course avec statut spécifique conducteur
            await TaxiMotoService.updateRideStatus(activeRide.id, 'cancelled', {
                cancel_reason: 'Annulée par le conducteur',
                cancelled_at: new Date().toISOString()
            });
            
            // Réinitialiser l'état
            setActiveRide(null);
            setNavigationActive(false);
            
            toast.success('✅ Course annulée avec succès');
            
            // Recharger les stats
            loadDriverStats();
            loadRideHistory();
        } catch (error) {
            console.error('❌ Erreur lors de l\'annulation:', error);
            toast.error('Impossible d\'annuler la course');
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

    const navigate = useNavigate();

    return (
        <div className="min-h-screen bg-gray-950">
            {/* Header conducteur - Uber/Bolt Style */}
            <DriverHeader
                firstName={profile?.first_name || ''}
                isOnline={isOnline}
                hasLocation={!!location}
                unreadCount={unreadCount}
                driverId={driverId}
                driverName={`${profile?.first_name || ''} ${profile?.last_name || ''}`.trim() || 'Conducteur'}
                driverPhone={profile?.phone || ''}
                onSignOut={handleSignOut}
            />

            {/* Contenu principal selon l'onglet */}
            {activeTab === 'dashboard' && (
                <DriverMainDashboard
                    isOnline={isOnline}
                    isLoading={driverLoading}
                    hasSubscription={hasAccess}
                    driverId={driverId}
                    userId={user?.id}
                    location={location}
                    stats={driverStats}
                    rideRequests={rideRequests}
                    acceptingRideId={acceptingRideId}
                    error={error}
                    hasAccess={hasAccess}
                    onToggleOnline={toggleOnlineStatus}
                    onAcceptRide={acceptRideRequest}
                    onDeclineRide={declineRideRequest}
                    onClearError={clear}
                    onExpandMap={() => setActiveTab('gps-navigation')}
                    onStatClick={(statId) => {
                        if (statId === 'earnings') setActiveTab('earnings');
                        else if (statId === 'history') setActiveTab('history');
                        else if (statId === 'rating') setActiveTab('rating');
                    }}
                />
            )}

            {activeTab === 'navigation' && (
                <div className="min-h-screen bg-gray-950 pb-20">
                    {activeRide ? (
                        <ActiveRideNavigationPanel
                            activeRide={{
                                id: activeRide.id,
                                customerName: activeRide.customer.name,
                                customerPhone: activeRide.customer.phone,
                                pickup: activeRide.pickup,
                                destination: activeRide.destination,
                                status: activeRide.status,
                                estimatedPrice: activeRide.estimatedEarnings / 0.85,
                                estimatedEarnings: activeRide.estimatedEarnings
                            }}
                            currentLocation={location}
                            onContactCustomer={contactCustomer}
                            onUpdateStatus={async (status) => {
                                try {
                                    await supabase
                                        .from('taxi_trips')
                                        .update({ status, updated_at: new Date().toISOString() })
                                        .eq('id', activeRide.id);
                                    toast.success('Statut mis à jour');
                                    // Recharger la course active
                                    loadActiveRide();
                                } catch (err) {
                                    toast.error('Erreur de mise à jour');
                                }
                            }}
                            onCancelRide={async () => {
                                const confirmed = window.confirm('Annuler cette course ?');
                                if (!confirmed) return;
                                try {
                                    await supabase
                                        .from('taxi_trips')
                                        .update({ 
                                            status: 'cancelled', 
                                            cancel_reason: 'Annulée par le conducteur',
                                            cancelled_at: new Date().toISOString()
                                        })
                                        .eq('id', activeRide.id);
                                    toast.success('Course annulée');
                                    setActiveRide(null);
                                    setActiveTab('dashboard');
                                } catch (err) {
                                    toast.error('Erreur lors de l\'annulation');
                                }
                            }}
                        />
                    ) : (
                        <DriverNavigation
                            driverId={driverId || ''}
                            location={location}
                            onContactCustomer={contactCustomer}
                        />
                    )}
                </div>
            )}

            {activeTab === 'gps-navigation' && (
                <div className="min-h-screen bg-gray-950 pb-20">
                    {!location ? (
                        <GPSPermissionHelper
                            onLocationGranted={async () => {
                                toast.loading('Récupération de la position...', { id: 'gps-load' });
                                try {
                                    await getCurrentLocation();
                                    toast.dismiss('gps-load');
                                    toast.success('Position obtenue !');
                                } catch (err) {
                                    console.error('[TaxiMotoDriver] GPS error:', err);
                                    toast.dismiss('gps-load');
                                    toast.error('Erreur GPS - Veuillez réessayer');
                                }
                            }}
                            currentError={null}
                        />
                    ) : (
                        <GoogleMapsNavigation
                            activeRide={activeRide}
                            currentLocation={location}
                            onContactCustomer={contactCustomer}
                        />
                    )}
                </div>
            )}

            {activeTab === 'earnings' && (
                <div className="min-h-screen bg-gray-950 pb-20">
                    <DriverEarnings driverId={driverId || ''} />
                </div>
            )}

            {activeTab === 'history' && (
                <div className="min-h-screen bg-gray-950 pb-20 pt-4 px-4">
                    <div className="space-y-4">
                        <h2 className="text-white font-bold text-lg">Historique des courses</h2>
                        {rideHistory.length === 0 ? (
                            <div className="text-center py-12">
                                <Car className="w-12 h-12 text-gray-600 mx-auto mb-3" />
                                <p className="text-gray-500">Aucune course complétée</p>
                            </div>
                        ) : (
                            <div className="space-y-3">
                                {rideHistory.map((ride: any) => (
                                    <div key={ride.id} className="bg-gray-800/50 rounded-xl p-4 border border-gray-700">
                                        <div className="flex justify-between items-start mb-2">
                                            <span className={`text-xs px-2 py-1 rounded-full ${
                                                ride.status === 'completed' ? 'bg-emerald-500/20 text-emerald-400' :
                                                ride.status === 'cancelled' ? 'bg-red-500/20 text-red-400' :
                                                'bg-blue-500/20 text-blue-400'
                                            }`}>
                                                {ride.status === 'completed' ? 'Terminée' : 
                                                 ride.status === 'cancelled' ? 'Annulée' : ride.status}
                                            </span>
                                            <span className="text-gray-400 text-xs">
                                                {new Date(ride.created_at).toLocaleDateString('fr-FR')}
                                            </span>
                                        </div>
                                        <p className="text-white text-sm mb-1 truncate">{ride.pickup_address || 'Adresse départ'}</p>
                                        <p className="text-gray-400 text-xs truncate">→ {ride.destination_address || 'Destination'}</p>
                                        {ride.price && (
                                            <p className="text-emerald-400 font-bold mt-2">{ride.price.toLocaleString()} GNF</p>
                                        )}
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            )}

            {activeTab === 'rating' && (
                <div className="min-h-screen bg-gray-950 pb-20 pt-4 px-4">
                    <div className="space-y-6">
                        <h2 className="text-white font-bold text-lg">Votre note</h2>
                        
                        <div className="bg-gradient-to-br from-amber-500/20 to-amber-600/10 rounded-2xl p-6 border border-amber-500/30 text-center">
                            <div className="text-5xl font-bold text-amber-400 mb-2">
                                {driverStats.rating > 0 ? driverStats.rating.toFixed(1) : '—'}
                            </div>
                            <div className="flex justify-center gap-1 mb-3">
                                {[1, 2, 3, 4, 5].map((star) => (
                                    <Star 
                                        key={star}
                                        className={`w-6 h-6 ${
                                            star <= Math.round(driverStats.rating) 
                                                ? 'text-amber-400 fill-amber-400' 
                                                : 'text-gray-600'
                                        }`}
                                    />
                                ))}
                            </div>
                            <p className="text-gray-400 text-sm">Basé sur {driverStats.totalRides || 0} courses</p>
                        </div>

                        <div className="bg-gray-800/50 rounded-xl p-4 border border-gray-700">
                            <h3 className="text-white font-medium mb-3">Comment améliorer votre note</h3>
                            <ul className="space-y-2 text-gray-400 text-sm">
                                <li className="flex items-start gap-2">
                                    <span className="text-emerald-400">✓</span>
                                    Soyez ponctuel aux rendez-vous
                                </li>
                                <li className="flex items-start gap-2">
                                    <span className="text-emerald-400">✓</span>
                                    Conduisez prudemment et respectez le code
                                </li>
                                <li className="flex items-start gap-2">
                                    <span className="text-emerald-400">✓</span>
                                    Soyez courtois avec les clients
                                </li>
                                <li className="flex items-start gap-2">
                                    <span className="text-emerald-400">✓</span>
                                    Maintenez votre véhicule propre
                                </li>
                            </ul>
                        </div>
                    </div>
                </div>
            )}

            {activeTab === 'settings' && (
                <div className="min-h-screen bg-gray-950 pb-20 pt-4">
                    {driverId && <DriverSettings driverId={driverId} />}
                </div>
            )}

            {/* Navigation inférieure - Uber/Bolt Style */}
            <BottomNavigation
                activeTab={activeTab}
                onTabChange={setActiveTab}
                hasActiveRide={!!activeRide}
            />

            {/* Bannière d'installation PWA */}
            <InstallPromptBanner />
            
            {/* Widget de communication flottant */}
            <CommunicationWidget position="bottom-right" showNotifications={true} />
        </div>
    );
}
