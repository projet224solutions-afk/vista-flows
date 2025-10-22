/**
 * CONDUCTEUR TAXI MOTO TEMPS RÉEL
 * Interface complète pour les conducteurs avec Firestore et Supabase
 * 224Solutions - Taxi-Moto System
 */

import { useState, useEffect, useCallback } from 'react';
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
    User,
    Route,
    Zap,
    Bell,
    Wifi,
    Battery,
    TrendingUp,
    Settings
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import useCurrentLocation from "@/hooks/useGeolocation";
import { firestoreService, Driver, Ride } from "@/services/firestoreService";
import { firebaseMessagingService } from "@/services/firebaseMessagingService";
import { toast } from "sonner";

interface DriverStats {
    todayEarnings: number;
    todayRides: number;
    rating: number;
    totalRides: number;
    totalEarnings: number;
    onlineTime: string;
}

interface RideRequest extends Ride {
    distance?: number;
    estimatedEarnings?: number;
}

export default function TaxiMotoRealtimeDriver() {
    const { user, profile } = useAuth();
    const { location, getCurrentLocation } = useCurrentLocation();

    const [isOnline, setIsOnline] = useState(false);
    const [activeTab, setActiveTab] = useState('dashboard');
    const [driverStats, setDriverStats] = useState<DriverStats>({
        todayEarnings: 0,
        todayRides: 0,
        rating: 5.0,
        totalRides: 0,
        totalEarnings: 0,
        onlineTime: '0h 0m'
    });
    const [rideRequests, setRideRequests] = useState<RideRequest[]>([]);
    const [activeRide, setActiveRide] = useState<Ride | null>(null);
    const [isConnected, setIsConnected] = useState(false);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        initializeServices();
        return () => cleanup();
    }, []);

    useEffect(() => {
        if (isOnline && isConnected) {
            startLocationTracking();
            startListeningToRequests();
        }
    }, [isOnline, isConnected]);

    /**
     * Initialise les services
     */
    const initializeServices = async () => {
        try {
            setLoading(true);

            // Initialiser la géolocalisation
            await getCurrentLocation();

            // Initialiser Firebase Messaging
            const fcmToken = await firebaseMessagingService.initialize();
            if (fcmToken) {
                console.log('🔔 FCM Token:', fcmToken);
                await saveFCMToken(fcmToken);
            }

            // Charger les statistiques
            await loadDriverStats();

            setIsConnected(true);
            toast.success('Services initialisés');
        } catch (error) {
            console.error('Erreur initialisation services:', error);
            toast.error('Erreur d\'initialisation');
        } finally {
            setLoading(false);
        }
    };

    /**
     * Sauvegarde le token FCM
     */
    const saveFCMToken = async (token: string) => {
        try {
            await fetch('/api/driver/fcm-token', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('access_token')}`
                },
                body: JSON.stringify({ fcmToken: token })
            });
        } catch (error) {
            console.error('Erreur sauvegarde token FCM:', error);
        }
    };

    /**
     * Démarre le suivi de position
     */
    const startLocationTracking = () => {
        if (!navigator.geolocation) {
            toast.error('Géolocalisation non disponible');
            return;
        }

        const watchId = navigator.geolocation.watchPosition(
            async (position) => {
                try {
                    await updateDriverLocation({
                        latitude: position.coords.latitude,
                        longitude: position.coords.longitude,
                        accuracy: position.coords.accuracy,
                        heading: position.coords.heading,
                        speed: position.coords.speed
                    });
                } catch (error) {
                    console.error('Erreur mise à jour position:', error);
                }
            },
            (error) => {
                console.error('Erreur géolocalisation:', error);
                setIsConnected(false);
            },
            {
                enableHighAccuracy: true,
                timeout: 10000,
                maximumAge: 30000
            }
        );

        return watchId;
    };

    /**
     * Met à jour la position du conducteur
     */
    const updateDriverLocation = async (locationData: {
        latitude: number;
        longitude: number;
        accuracy?: number;
        heading?: number;
        speed?: number;
    }) => {
        try {
            await fetch('/api/driver/location', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('access_token')}`
                },
                body: JSON.stringify(locationData)
            });
        } catch (error) {
            console.error('Erreur mise à jour position:', error);
        }
    };

    /**
     * Écoute les demandes de course
     */
    const startListeningToRequests = () => {
        if (!user?.id) return;

        const unsubscribe = firestoreService.listenToRideRequests(user.id, (requests) => {
            setRideRequests(requests);
            console.log(`📋 ${requests.length} demandes disponibles`);
        });

        return unsubscribe;
    };

    /**
     * Charge les statistiques du conducteur
     */
    const loadDriverStats = async () => {
        try {
            const response = await fetch('/api/driver/stats', {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('access_token')}`
                }
            });

            if (response.ok) {
                const data = await response.json();
                setDriverStats(data.stats);
            }
        } catch (error) {
            console.error('Erreur chargement stats:', error);
        }
    };

    /**
     * Bascule le statut en ligne/hors ligne
     */
    const toggleOnlineStatus = async () => {
        const newStatus = !isOnline;
        setIsOnline(newStatus);

        try {
            const response = await fetch('/api/driver/status', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('access_token')}`
                },
                body: JSON.stringify({
                    isOnline: newStatus,
                    location: location ? {
                        latitude: location.latitude,
                        longitude: location.longitude
                    } : null
                })
            });

            if (response.ok) {
                toast.success(newStatus ? 'Vous êtes en ligne' : 'Vous êtes hors ligne');
            } else {
                throw new Error('Erreur API');
            }
        } catch (error) {
            console.error('Erreur changement statut:', error);
            toast.error('Erreur changement de statut');
            setIsOnline(!newStatus); // Revenir au statut précédent
        }
    };

    /**
     * Accepte une demande de course
     */
    const acceptRideRequest = async (rideId: string) => {
        try {
            setLoading(true);

            const response = await fetch('/api/ride/accept', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('access_token')}`
                },
                body: JSON.stringify({ rideId })
            });

            const result = await response.json();

            if (result.success) {
                toast.success('Course acceptée');

                // Écouter les mises à jour de cette course
                startListeningToRide(rideId);

                setActiveTab('tracking');
            } else {
                throw new Error(result.message);
            }
        } catch (error) {
            console.error('Erreur acceptation course:', error);
            toast.error('Erreur lors de l\'acceptation');
        } finally {
            setLoading(false);
        }
    };

    /**
     * Écoute une course spécifique
     */
    const startListeningToRide = (rideId: string) => {
        const unsubscribe = firestoreService.listenToRide(rideId, (ride) => {
            if (ride) {
                setActiveRide(ride);

                // Si la course est terminée, recharger les stats
                if (ride.status === 'completed') {
                    loadDriverStats();
                    setActiveRide(null);
                    setActiveTab('dashboard');
                }
            }
        });

        return unsubscribe;
    };

    /**
     * Termine une course
     */
    const completeRide = async (rideId: string, actualDistance?: number, actualDuration?: number) => {
        try {
            setLoading(true);

            const response = await fetch('/api/ride/complete', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('access_token')}`
                },
                body: JSON.stringify({
                    rideId,
                    actualDistance,
                    actualDuration
                })
            });

            const result = await response.json();

            if (result.success) {
                toast.success('Course terminée avec succès');
                setActiveRide(null);
                setActiveTab('dashboard');
                loadDriverStats();
            } else {
                throw new Error(result.message);
            }
        } catch (error) {
            console.error('Erreur finalisation course:', error);
            toast.error('Erreur lors de la finalisation');
        } finally {
            setLoading(false);
        }
    };

    /**
     * Nettoie les ressources
     */
    const cleanup = () => {
        firestoreService.cleanup();
    };

    /**
     * Obtient le statut formaté
     */
    const getStatusInfo = (status: string) => {
        const statusMap = {
            requested: {
                label: 'Demande reçue',
                color: 'bg-yellow-100 text-yellow-800',
                icon: Clock,
                description: 'Nouvelle demande de course'
            },
            accepted: {
                label: 'Course acceptée',
                color: 'bg-blue-100 text-blue-800',
                icon: CheckCircle,
                description: 'Course confirmée'
            },
            driver_arriving: {
                label: 'En route vers le client',
                color: 'bg-orange-100 text-orange-800',
                icon: Navigation,
                description: 'Direction point de prise en charge'
            },
            picked_up: {
                label: 'Client pris en charge',
                color: 'bg-green-100 text-green-800',
                icon: Car,
                description: 'En route vers la destination'
            },
            in_progress: {
                label: 'Course en cours',
                color: 'bg-green-100 text-green-800',
                icon: Route,
                description: 'Trajet en cours'
            },
            completed: {
                label: 'Course terminée',
                color: 'bg-gray-100 text-gray-800',
                icon: CheckCircle,
                description: 'Course finalisée'
            }
        };

        return statusMap[status as keyof typeof statusMap] || statusMap.requested;
    };

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-green-50">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
                    <p className="text-gray-600">Initialisation des services...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-blue-50 to-green-50">
            {/* Header */}
            <div className="bg-white shadow-sm border-b sticky top-0 z-40">
                <div className="px-4 py-4">
                    <div className="flex items-center justify-between">
                        <div>
                            <h1 className="text-2xl font-bold text-gray-900">
                                Taxi Moto Driver
                            </h1>
                            <div className="flex items-center gap-2 mt-1">
                                <User className="w-4 h-4 text-gray-600" />
                                <span className="text-sm text-gray-600">
                                    {profile?.first_name || 'Conducteur'}
                                </span>
                                <div className="flex items-center gap-1">
                                    <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'
                                        }`}></div>
                                    <span className="text-xs text-gray-500">
                                        {isConnected ? 'Connecté' : 'Déconnecté'}
                                    </span>
                                </div>
                            </div>
                        </div>

                        <div className="flex items-center gap-4">
                            <Button
                                onClick={toggleOnlineStatus}
                                variant={isOnline ? "destructive" : "default"}
                                className={isOnline ? "bg-red-600 hover:bg-red-700" : "bg-green-600 hover:bg-green-700"}
                            >
                                {isOnline ? 'Hors ligne' : 'En ligne'}
                            </Button>
                            <div className="flex items-center gap-1 text-sm text-gray-600">
                                <Wifi className="w-4 h-4" />
                                <span>GPS</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Navigation par onglets */}
            <div className="px-4 py-4">
                <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                    <TabsList className="grid w-full grid-cols-4 bg-white/80 backdrop-blur-sm">
                        <TabsTrigger value="dashboard">
                            <TrendingUp className="w-4 h-4 mr-1" />
                            Dashboard
                        </TabsTrigger>
                        <TabsTrigger value="requests">
                            <Bell className="w-4 h-4 mr-1" />
                            Demandes
                            {rideRequests.length > 0 && (
                                <Badge className="ml-1 bg-red-500 text-white text-xs">
                                    {rideRequests.length}
                                </Badge>
                            )}
                        </TabsTrigger>
                        <TabsTrigger value="tracking" disabled={!activeRide}>
                            <Navigation className="w-4 h-4 mr-1" />
                            Course
                            {activeRide && (
                                <span className="ml-1 w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
                            )}
                        </TabsTrigger>
                        <TabsTrigger value="settings">
                            <Settings className="w-4 h-4 mr-1" />
                            Paramètres
                        </TabsTrigger>
                    </TabsList>

                    {/* Dashboard */}
                    <TabsContent value="dashboard" className="mt-4">
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                            <Card>
                                <CardContent className="p-4">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                                            <DollarSign className="w-5 h-5 text-green-600" />
                                        </div>
                                        <div>
                                            <p className="text-sm text-gray-600">Aujourd'hui</p>
                                            <p className="text-lg font-bold">{driverStats.todayEarnings.toLocaleString()} GNF</p>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>

                            <Card>
                                <CardContent className="p-4">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                                            <Route className="w-5 h-5 text-blue-600" />
                                        </div>
                                        <div>
                                            <p className="text-sm text-gray-600">Courses</p>
                                            <p className="text-lg font-bold">{driverStats.todayRides}</p>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>

                            <Card>
                                <CardContent className="p-4">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 bg-yellow-100 rounded-full flex items-center justify-center">
                                            <Star className="w-5 h-5 text-yellow-600" />
                                        </div>
                                        <div>
                                            <p className="text-sm text-gray-600">Note</p>
                                            <p className="text-lg font-bold">{driverStats.rating}</p>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>

                            <Card>
                                <CardContent className="p-4">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center">
                                            <Clock className="w-5 h-5 text-purple-600" />
                                        </div>
                                        <div>
                                            <p className="text-sm text-gray-600">En ligne</p>
                                            <p className="text-lg font-bold">{driverStats.onlineTime}</p>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        </div>

                        {/* Statut de connexion */}
                        <Card className="mb-4">
                            <CardContent className="p-4">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <div className={`w-3 h-3 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'
                                            }`}></div>
                                        <span className="font-medium">
                                            {isConnected ? 'Services connectés' : 'Services déconnectés'}
                                        </span>
                                    </div>

                                    <div className="flex items-center gap-4 text-sm text-gray-600">
                                        <div className="flex items-center gap-1">
                                            <Wifi className="w-4 h-4" />
                                            <span>GPS</span>
                                        </div>
                                        <div className="flex items-center gap-1">
                                            <Battery className="w-4 h-4" />
                                            <span>85%</span>
                                        </div>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>

                        {/* Message d'état */}
                        {!isOnline && (
                            <Card className="bg-yellow-50 border-yellow-200">
                                <CardContent className="p-4">
                                    <div className="flex items-center gap-3">
                                        <AlertTriangle className="w-5 h-5 text-yellow-600" />
                                        <div>
                                            <p className="font-medium text-yellow-800">Vous êtes hors ligne</p>
                                            <p className="text-sm text-yellow-600">
                                                Connectez-vous pour recevoir des demandes de course
                                            </p>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        )}
                    </TabsContent>

                    {/* Demandes */}
                    <TabsContent value="requests" className="mt-4">
                        <Card>
                            <CardHeader>
                                <CardTitle>Demandes de course</CardTitle>
                            </CardHeader>
                            <CardContent>
                                {rideRequests.length === 0 ? (
                                    <div className="text-center py-8">
                                        <Bell className="w-12 h-12 mx-auto text-gray-400 mb-4" />
                                        <p className="text-gray-600">Aucune demande disponible</p>
                                        <p className="text-sm text-gray-500 mt-1">
                                            {isOnline ? 'En attente de nouvelles demandes...' : 'Connectez-vous pour recevoir des demandes'}
                                        </p>
                                    </div>
                                ) : (
                                    <div className="space-y-3">
                                        {rideRequests.map((request) => (
                                            <div key={request.id} className="p-4 border rounded-lg">
                                                <div className="flex items-center justify-between mb-2">
                                                    <Badge className="bg-yellow-100 text-yellow-800">
                                                        Nouvelle demande
                                                    </Badge>
                                                    <span className="text-sm text-gray-600">
                                                        {new Date(request.requestedAt?.toDate?.() || request.requestedAt).toLocaleTimeString()}
                                                    </span>
                                                </div>

                                                <div className="space-y-1 text-sm mb-3">
                                                    <div className="flex items-center gap-2">
                                                        <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                                                        <span>{request.pickup.address}</span>
                                                    </div>
                                                    <div className="flex items-center gap-2">
                                                        <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                                                        <span>{request.dropoff.address}</span>
                                                    </div>
                                                </div>

                                                <div className="flex items-center justify-between">
                                                    <div className="text-lg font-bold text-green-600">
                                                        {request.pricing?.totalPrice?.toLocaleString()} GNF
                                                    </div>
                                                    <Button
                                                        onClick={() => acceptRideRequest(request.id)}
                                                        disabled={loading}
                                                        className="bg-green-600 hover:bg-green-700"
                                                    >
                                                        {loading ? (
                                                            <>
                                                                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                                                                Acceptation...
                                                            </>
                                                        ) : (
                                                            'Accepter'
                                                        )}
                                                    </Button>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    </TabsContent>

                    {/* Suivi de course */}
                    <TabsContent value="tracking" className="mt-4">
                        {activeRide ? (
                            <Card>
                                <CardContent className="p-6">
                                    <div className="flex items-center justify-between mb-4">
                                        <Badge className={`${getStatusInfo(activeRide.status).color} px-3 py-1`}>
                                            {getStatusInfo(activeRide.status).label}
                                        </Badge>
                                        <span className="text-sm text-gray-600">#{activeRide.id}</span>
                                    </div>

                                    <p className="text-gray-700 mb-4">
                                        {getStatusInfo(activeRide.status).description}
                                    </p>

                                    {/* Détails du trajet */}
                                    <div className="space-y-2 mb-4">
                                        <div className="flex items-center gap-2 text-sm">
                                            <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                                            <span>{activeRide.pickup.address}</span>
                                        </div>
                                        <div className="flex items-center gap-2 text-sm">
                                            <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                                            <span>{activeRide.dropoff.address}</span>
                                        </div>
                                    </div>

                                    <div className="flex items-center justify-between pt-4 border-t">
                                        <span className="font-medium">Gains estimés</span>
                                        <span className="text-lg font-bold text-green-600">
                                            {activeRide.pricing?.driverShare?.toLocaleString()} GNF
                                        </span>
                                    </div>

                                    {/* Actions */}
                                    <div className="flex gap-3 mt-4">
                                        <Button
                                            onClick={() => completeRide(activeRide.id)}
                                            className="flex-1 bg-green-600 hover:bg-green-700"
                                        >
                                            <CheckCircle className="w-4 h-4 mr-2" />
                                            Terminer la course
                                        </Button>
                                    </div>
                                </CardContent>
                            </Card>
                        ) : (
                            <Card>
                                <CardContent className="p-8 text-center">
                                    <Car className="w-12 h-12 mx-auto text-gray-400 mb-4" />
                                    <h3 className="text-lg font-semibold text-gray-700 mb-2">
                                        Aucune course active
                                    </h3>
                                    <p className="text-gray-600">
                                        Acceptez une demande pour commencer une course
                                    </p>
                                </CardContent>
                            </Card>
                        )}
                    </TabsContent>

                    {/* Paramètres */}
                    <TabsContent value="settings" className="mt-4">
                        <Card>
                            <CardHeader>
                                <CardTitle>Paramètres du conducteur</CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <div className="font-medium">Notifications</div>
                                        <div className="text-sm text-gray-600">Recevoir les notifications de course</div>
                                    </div>
                                    <Button variant="outline" size="sm">Configurer</Button>
                                </div>

                                <div className="flex items-center justify-between">
                                    <div>
                                        <div className="font-medium">Mode de travail</div>
                                        <div className="text-sm text-gray-600">Horaires et zones de travail</div>
                                    </div>
                                    <Button variant="outline" size="sm">Modifier</Button>
                                </div>

                                <div className="flex items-center justify-between">
                                    <div>
                                        <div className="font-medium">Véhicule</div>
                                        <div className="text-sm text-gray-600">Informations du véhicule</div>
                                    </div>
                                    <Button variant="outline" size="sm">Mettre à jour</Button>
                                </div>
                            </CardContent>
                        </Card>
                    </TabsContent>
                </Tabs>
            </div>
        </div>
    );
}
