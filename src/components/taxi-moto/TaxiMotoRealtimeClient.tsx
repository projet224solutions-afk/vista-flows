/**
 * CLIENT TAXI MOTO TEMPS RÉEL
 * Interface complète avec Firestore et Supabase synchronisés
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
    Battery
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import useCurrentLocation from "@/hooks/useGeolocation";
import { firestoreService, Driver, Ride } from "@/services/firestoreService";
import { firebaseMessagingService } from "@/services/firebaseMessagingService";
import { toast } from "sonner";

interface CurrentRide extends Ride {
    driver?: Driver;
}

export default function TaxiMotoRealtimeClient() {
    const { user, profile } = useAuth();
    const { location, getCurrentLocation } = useCurrentLocation();

    const [activeTab, setActiveTab] = useState('booking');
    const [nearbyDrivers, setNearbyDrivers] = useState<Driver[]>([]);
    const [currentRide, setCurrentRide] = useState<CurrentRide | null>(null);
    const [rideHistory, setRideHistory] = useState<Ride[]>([]);
    const [isConnected, setIsConnected] = useState(false);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        initializeServices();
        return () => cleanup();
    }, []);

    useEffect(() => {
        if (location && isConnected) {
            startListeningToDrivers();
        }
    }, [location, isConnected]);

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
                // Sauvegarder le token FCM
                await saveFCMToken(fcmToken);
            }

            // Charger l'historique
            await loadRideHistory();

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
            await fetch('/api/user/fcm-token', {
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
     * Écoute les conducteurs à proximité
     */
    const startListeningToDrivers = useCallback(() => {
        if (!location) return;

        const unsubscribe = firestoreService.listenToNearbyDrivers(
            location.latitude,
            location.longitude,
            5, // 5km de rayon
            (drivers) => {
                setNearbyDrivers(drivers);
                console.log(`📍 ${drivers.length} conducteurs à proximité`);
            }
        );

        return unsubscribe;
    }, [location]);

    /**
     * Charge l'historique des courses
     */
    const loadRideHistory = async () => {
        if (!user?.id) return;

        try {
            const history = await firestoreService.getUserRideHistory(user.id, 20);
            setRideHistory(history);
        } catch (error) {
            console.error('Erreur chargement historique:', error);
        }
    };

    /**
     * Crée une nouvelle course
     */
    const createRide = async (rideData: {
        pickup: { address: string; latitude: number; longitude: number };
        dropoff: { address: string; latitude: number; longitude: number };
        vehicleType: string;
        paymentMethod: string;
    }) => {
        try {
            setLoading(true);

            const response = await fetch('/api/ride/request', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('access_token')}`
                },
                body: JSON.stringify(rideData)
            });

            const result = await response.json();

            if (result.success) {
                toast.success('Demande de course envoyée');

                // Écouter les mises à jour de cette course
                startListeningToRide(result.rideId);

                setActiveTab('tracking');
            } else {
                throw new Error(result.message);
            }
        } catch (error) {
            console.error('Erreur création course:', error);
            toast.error('Erreur lors de la création de la course');
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
                setCurrentRide(ride);

                // Si la course est terminée, recharger l'historique
                if (ride.status === 'completed') {
                    loadRideHistory();
                }
            }
        });

        return unsubscribe;
    };

    /**
     * Annule une course
     */
    const cancelRide = async (rideId: string) => {
        try {
            const response = await fetch('/api/ride/cancel', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('access_token')}`
                },
                body: JSON.stringify({ rideId })
            });

            const result = await response.json();

            if (result.success) {
                toast.success('Course annulée');
                setCurrentRide(null);
                setActiveTab('booking');
            } else {
                throw new Error(result.message);
            }
        } catch (error) {
            console.error('Erreur annulation course:', error);
            toast.error('Erreur lors de l\'annulation');
        }
    };

    /**
     * Contacte le conducteur
     */
    const contactDriver = () => {
        if (currentRide?.driver?.phone) {
            window.open(`tel:${currentRide.driver.phone}`);
        } else {
            toast.error('Numéro du conducteur non disponible');
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
                label: 'Recherche de conducteur',
                color: 'bg-yellow-100 text-yellow-800',
                icon: Clock,
                description: 'Nous recherchons un conducteur proche de vous'
            },
            accepted: {
                label: 'Conducteur assigné',
                color: 'bg-blue-100 text-blue-800',
                icon: CheckCircle,
                description: 'Un conducteur a accepté votre course'
            },
            driver_arriving: {
                label: 'Conducteur en route',
                color: 'bg-orange-100 text-orange-800',
                icon: Navigation,
                description: 'Le conducteur se dirige vers vous'
            },
            picked_up: {
                label: 'Client pris en charge',
                color: 'bg-green-100 text-green-800',
                icon: Car,
                description: 'Vous êtes en route vers votre destination'
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
                description: 'Vous êtes arrivé à destination'
            },
            cancelled: {
                label: 'Course annulée',
                color: 'bg-red-100 text-red-800',
                icon: AlertTriangle,
                description: 'Cette course a été annulée'
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
                                Taxi Moto 224Solutions
                            </h1>
                            <div className="flex items-center gap-2 mt-1">
                                <User className="w-4 h-4 text-gray-600" />
                                <span className="text-sm text-gray-600">
                                    {profile?.first_name || 'Client'}
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

                        <div className="flex items-center gap-2">
                            {currentRide && (
                                <Badge variant="default" className="bg-green-500">
                                    Course active
                                </Badge>
                            )}
                            <div className="flex items-center gap-1 text-sm text-gray-600">
                                <Wifi className="w-4 h-4" />
                                <span>GPS</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Conducteurs à proximité */}
            {location && nearbyDrivers.length > 0 && activeTab === 'booking' && (
                <Card className="mx-4 mt-4 bg-white/90 backdrop-blur-sm border-0 shadow-lg">
                    <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm font-medium text-gray-900">
                                    {nearbyDrivers.length} conducteurs disponibles
                                </p>
                                <p className="text-xs text-gray-600">
                                    Le plus proche à {nearbyDrivers[0]?.distance?.toFixed(1) || 0}km
                                </p>
                            </div>
                            <div className="flex -space-x-2">
                                {nearbyDrivers.slice(0, 3).map((driver) => (
                                    <div
                                        key={driver.id}
                                        className="w-8 h-8 rounded-full bg-blue-100 border-2 border-white flex items-center justify-center"
                                    >
                                        <User className="w-4 h-4 text-blue-600" />
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
                    <TabsList className="grid w-full grid-cols-3 bg-white/80 backdrop-blur-sm">
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
                            <Route className="w-4 h-4 mr-1" />
                            Historique
                        </TabsTrigger>
                    </TabsList>

                    {/* Réservation */}
                    <TabsContent value="booking" className="mt-4">
                        <Card className="bg-white/90 backdrop-blur-sm border-0 shadow-lg">
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <Navigation className="w-5 h-5 text-blue-600" />
                                    Nouvelle réservation
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="space-y-4">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div>
                                            <label className="text-sm font-medium text-gray-700 mb-2 block">
                                                Point de départ
                                            </label>
                                            <div className="p-3 bg-gray-50 rounded-lg">
                                                <div className="flex items-center gap-2">
                                                    <MapPin className="w-4 h-4 text-green-500" />
                                                    <span className="text-sm">
                                                        {location ? 'Position actuelle' : 'Position non disponible'}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>

                                        <div>
                                            <label className="text-sm font-medium text-gray-700 mb-2 block">
                                                Destination
                                            </label>
                                            <input
                                                type="text"
                                                placeholder="Où voulez-vous aller ?"
                                                className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                            />
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-3 gap-2">
                                        {['moto_economique', 'moto_rapide', 'moto_premium'].map((type) => (
                                            <button
                                                key={type}
                                                className="p-3 border rounded-lg text-center hover:bg-blue-50 transition-colors"
                                            >
                                                <div className="text-2xl mb-1">🏍️</div>
                                                <div className="text-xs font-medium capitalize">
                                                    {type.replace('moto_', '')}
                                                </div>
                                            </button>
                                        ))}
                                    </div>

                                    <Button
                                        onClick={() => createRide({
                                            pickup: {
                                                address: 'Position actuelle',
                                                latitude: location?.latitude || 0,
                                                longitude: location?.longitude || 0
                                            },
                                            dropoff: {
                                                address: 'Destination test',
                                                latitude: 14.7167,
                                                longitude: -17.4667
                                            },
                                            vehicleType: 'moto_rapide',
                                            paymentMethod: 'wallet_224'
                                        })}
                                        disabled={!location || loading}
                                        className="w-full h-12 text-lg font-semibold bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
                                    >
                                        {loading ? (
                                            <>
                                                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                                                Recherche...
                                            </>
                                        ) : (
                                            <>
                                                <Zap className="w-5 h-5 mr-2" />
                                                Réserver maintenant
                                            </>
                                        )}
                                    </Button>
                                </div>
                            </CardContent>
                        </Card>
                    </TabsContent>

                    {/* Suivi en temps réel */}
                    <TabsContent value="tracking" className="mt-4">
                        {currentRide ? (
                            <Card className="bg-white/90 backdrop-blur-sm border-0 shadow-lg">
                                <CardContent className="p-6">
                                    <div className="flex items-center justify-between mb-4">
                                        <Badge className={`${getStatusInfo(currentRide.status).color} px-3 py-1`}>
                                            {getStatusInfo(currentRide.status).label}
                                        </Badge>
                                        <span className="text-sm text-gray-600">#{currentRide.id}</span>
                                    </div>

                                    <p className="text-gray-700 mb-4">
                                        {getStatusInfo(currentRide.status).description}
                                    </p>

                                    {/* Informations du conducteur */}
                                    {currentRide.driver && (
                                        <div className="bg-gray-50 rounded-lg p-4 mb-4">
                                            <div className="flex items-center gap-4">
                                                <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                                                    <User className="w-6 h-6 text-blue-600" />
                                                </div>
                                                <div className="flex-1">
                                                    <h3 className="font-semibold">{currentRide.driver.name}</h3>
                                                    <div className="flex items-center gap-2 text-sm text-gray-600">
                                                        <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                                                        <span>{currentRide.driver.rating}</span>
                                                        <span>•</span>
                                                        <span>{currentRide.driver.vehicle?.type}</span>
                                                    </div>
                                                </div>
                                                <div className="flex gap-2">
                                                    <Button onClick={contactDriver} variant="outline" size="sm">
                                                        <Phone className="w-4 h-4 mr-1" />
                                                        Appeler
                                                    </Button>
                                                    <Button variant="outline" size="sm">
                                                        <MessageCircle className="w-4 h-4 mr-1" />
                                                        Message
                                                    </Button>
                                                </div>
                                            </div>
                                        </div>
                                    )}

                                    {/* Détails du trajet */}
                                    <div className="space-y-2 mb-4">
                                        <div className="flex items-center gap-2 text-sm">
                                            <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                                            <span>{currentRide.pickup.address}</span>
                                        </div>
                                        <div className="flex items-center gap-2 text-sm">
                                            <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                                            <span>{currentRide.dropoff.address}</span>
                                        </div>
                                    </div>

                                    <div className="flex items-center justify-between pt-4 border-t">
                                        <span className="font-medium">Prix estimé</span>
                                        <span className="text-lg font-bold text-green-600">
                                            {currentRide.pricing?.totalPrice?.toLocaleString()} GNF
                                        </span>
                                    </div>

                                    {/* Actions */}
                                    <div className="flex gap-3 mt-4">
                                        <Button
                                            onClick={() => cancelRide(currentRide.id)}
                                            variant="destructive"
                                            className="flex-1"
                                        >
                                            <AlertTriangle className="w-4 h-4 mr-2" />
                                            Annuler
                                        </Button>
                                    </div>
                                </CardContent>
                            </Card>
                        ) : (
                            <Card className="bg-white/90 backdrop-blur-sm border-0 shadow-lg">
                                <CardContent className="p-8 text-center">
                                    <Clock className="w-12 h-12 mx-auto mb-4 text-gray-400" />
                                    <h3 className="text-lg font-semibold text-gray-700 mb-2">
                                        Aucune course active
                                    </h3>
                                    <p className="text-gray-600">
                                        Réservez une course pour voir le suivi en temps réel
                                    </p>
                                </CardContent>
                            </Card>
                        )}
                    </TabsContent>

                    {/* Historique */}
                    <TabsContent value="history" className="mt-4">
                        <Card className="bg-white/90 backdrop-blur-sm border-0 shadow-lg">
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <Route className="w-5 h-5 text-blue-600" />
                                    Historique des courses
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                {rideHistory.length === 0 ? (
                                    <div className="text-center py-8">
                                        <Route className="w-12 h-12 mx-auto text-gray-400 mb-4" />
                                        <p className="text-gray-600">Aucune course dans l'historique</p>
                                    </div>
                                ) : (
                                    <div className="space-y-3">
                                        {rideHistory.map((ride) => (
                                            <div key={ride.id} className="p-4 border rounded-lg">
                                                <div className="flex items-center justify-between mb-2">
                                                    <Badge className={`${ride.status === 'completed' ? 'bg-green-100 text-green-800' :
                                                            ride.status === 'cancelled' ? 'bg-red-100 text-red-800' :
                                                                'bg-yellow-100 text-yellow-800'
                                                        }`}>
                                                        {ride.status === 'completed' ? 'Terminée' :
                                                            ride.status === 'cancelled' ? 'Annulée' : 'En cours'}
                                                    </Badge>
                                                    <span className="text-sm text-gray-600">
                                                        {new Date(ride.requestedAt?.toDate?.() || ride.requestedAt).toLocaleDateString()}
                                                    </span>
                                                </div>

                                                <div className="space-y-1 text-sm">
                                                    <div className="flex items-center gap-2">
                                                        <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                                                        <span>{ride.pickup.address}</span>
                                                    </div>
                                                    <div className="flex items-center gap-2">
                                                        <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                                                        <span>{ride.dropoff.address}</span>
                                                    </div>
                                                </div>

                                                <div className="flex items-center justify-between mt-3">
                                                    <span className="font-medium">
                                                        {ride.pricing?.totalPrice?.toLocaleString()} GNF
                                                    </span>
                                                    <div className="flex items-center gap-1 text-sm text-gray-600">
                                                        <Clock className="w-3 h-3" />
                                                        <span>{ride.estimatedDuration}min</span>
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    </TabsContent>
                </Tabs>
            </div>
        </div>
    );
}
