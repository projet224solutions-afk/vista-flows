/**
 * COMPOSANT DE SUIVI EN TEMPS RÉEL TAXI MOTO
 * Interface avancée pour le suivi des courses avec données réelles
 * 224Solutions - Taxi-Moto System
 */

import { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
    Navigation,
    MapPin,
    Clock,
    Phone,
    MessageCircle,
    AlertTriangle,
    CheckCircle,
    Car,
    User,
    Star,
    Route,
    Zap,
    Battery,
    Wifi
} from "lucide-react";
import { toast } from "sonner";
import { taxiNotificationService, TaxiNotification } from "@/services/taxiMotoNotificationService";

interface RealTimeLocation {
    latitude: number;
    longitude: number;
    accuracy?: number;
    heading?: number;
    speed?: number;
    timestamp: string;
}

interface TripDetails {
    id: string;
    status: string;
    customer: {
        name: string;
        phone: string;
        rating: number;
        photo?: string;
    };
    pickup: {
        address: string;
        coordinates: { lat: number; lng: number };
    };
    dropoff: {
        address: string;
        coordinates: { lat: number; lng: number };
    };
    pricing: {
        total: number;
        driverShare: number;
        distance: number;
        duration: number;
    };
    timing: {
        requestedAt: string;
        acceptedAt?: string;
        pickedUpAt?: string;
        completedAt?: string;
    };
}

interface TaxiMotoRealTimeTrackingProps {
    tripId: string;
    driverLocation: RealTimeLocation | null;
    onTripUpdate: (trip: TripDetails) => void;
}

export default function TaxiMotoRealTimeTracking({
    tripId,
    driverLocation,
    onTripUpdate
}: TaxiMotoRealTimeTrackingProps) {
    const [trip, setTrip] = useState<TripDetails | null>(null);
    const [customerLocation, setCustomerLocation] = useState<RealTimeLocation | null>(null);
    const [notifications, setNotifications] = useState<TaxiNotification[]>([]);
    const [isTracking, setIsTracking] = useState(false);
    const [connectionStatus, setConnectionStatus] = useState<'connected' | 'disconnected' | 'reconnecting'>('disconnected');

    const trackingInterval = useRef<NodeJS.Timeout | null>(null);
    const notificationSubscription = useRef<{ unsubscribe: () => void } | null>(null);

    useEffect(() => {
        initializeTracking();
        return () => cleanup();
    }, [tripId]);

    /**
     * Initialise le suivi en temps réel
     */
    const initializeTracking = async () => {
        try {
            // Initialiser le service de notifications
            await taxiNotificationService.initialize();

            // Charger les détails de la course
            await loadTripDetails();

            // Démarrer le suivi
            startRealTimeTracking();

            setConnectionStatus('connected');
            toast.success('Suivi en temps réel activé');
        } catch (error) {
            console.error('Erreur initialisation suivi:', error);
            setConnectionStatus('disconnected');
            toast.error('Impossible d\'activer le suivi en temps réel');
        }
    };

    /**
     * Charge les détails de la course
     */
    const loadTripDetails = async () => {
        try {
            const response = await fetch(`/api/taxiMoto/trip/${tripId}`, {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('access_token')}`
                }
            });

            if (response.ok) {
                const data = await response.json();
                setTrip(data.trip);
                onTripUpdate(data.trip);
            }
        } catch (error) {
            console.error('Erreur chargement course:', error);
        }
    };

    /**
     * Démarre le suivi en temps réel
     */
    const startRealTimeTracking = () => {
        if (isTracking) return;

        setIsTracking(true);

        // S'abonner aux notifications
        notificationSubscription.current = taxiNotificationService.subscribeToNotifications(
            'current-user', // À remplacer par l'ID utilisateur réel
            (notification) => {
                setNotifications(prev => [notification, ...prev.slice(0, 9)]);
            }
        );

        // S'abonner aux mises à jour de course
        const tripSubscription = taxiNotificationService.subscribeToTripUpdates(
            tripId,
            (updatedTrip) => {
                setTrip(updatedTrip);
                onTripUpdate(updatedTrip);
            }
        );

        // Démarrer le polling de position
        trackingInterval.current = setInterval(updateLocation, 5000);
    };

    /**
     * Arrête le suivi
     */
    const stopTracking = () => {
        setIsTracking(false);

        if (trackingInterval.current) {
            clearInterval(trackingInterval.current);
            trackingInterval.current = null;
        }

        if (notificationSubscription.current) {
            notificationSubscription.current.unsubscribe();
            notificationSubscription.current = null;
        }
    };

    /**
     * Met à jour la position
     */
    const updateLocation = async () => {
        if (!navigator.geolocation) return;

        navigator.geolocation.getCurrentPosition(
            async (position) => {
                const location: RealTimeLocation = {
                    latitude: position.coords.latitude,
                    longitude: position.coords.longitude,
                    accuracy: position.coords.accuracy,
                    heading: position.coords.heading,
                    speed: position.coords.speed,
                    timestamp: new Date().toISOString()
                };

                // Envoyer la position au serveur
                try {
                    await fetch('/api/taxiMoto/tracking/update', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            'Authorization': `Bearer ${localStorage.getItem('access_token')}`
                        },
                        body: JSON.stringify({
                            tripId,
                            latitude: location.latitude,
                            longitude: location.longitude,
                            accuracy: location.accuracy,
                            heading: location.heading,
                            speed: location.speed
                        })
                    });
                } catch (error) {
                    console.error('Erreur envoi position:', error);
                    setConnectionStatus('reconnecting');
                }
            },
            (error) => {
                console.error('Erreur géolocalisation:', error);
                setConnectionStatus('disconnected');
            },
            {
                enableHighAccuracy: true,
                timeout: 10000,
                maximumAge: 30000
            }
        );
    };

    /**
     * Nettoie les ressources
     */
    const cleanup = () => {
        stopTracking();
        taxiNotificationService.cleanup();
    };

    /**
     * Contacte le client
     */
    const contactCustomer = () => {
        if (trip?.customer.phone) {
            window.open(`tel:${trip.customer.phone}`);
        } else {
            toast.error('Numéro du client non disponible');
        }
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
                description: 'En attente d\'acceptation'
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

    /**
     * Calcule la distance et l'ETA
     */
    const calculateDistanceAndETA = () => {
        if (!driverLocation || !trip) return { distance: 0, eta: '0 min' };

        // Calcul basique de distance (formule de Haversine)
        const R = 6371; // Rayon de la Terre en km
        const dLat = (trip.pickup.coordinates.lat - driverLocation.latitude) * Math.PI / 180;
        const dLng = (trip.pickup.coordinates.lng - driverLocation.longitude) * Math.PI / 180;
        const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(driverLocation.latitude * Math.PI / 180) * Math.cos(trip.pickup.coordinates.lat * Math.PI / 180) *
            Math.sin(dLng / 2) * Math.sin(dLng / 2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        const distance = R * c;

        // Estimation ETA basique (vitesse moyenne 30 km/h en ville)
        const etaMinutes = Math.round((distance / 30) * 60);

        return {
            distance: Math.round(distance * 100) / 100,
            eta: `${etaMinutes} min`
        };
    };

    if (!trip) {
        return (
            <Card className="bg-white/90 backdrop-blur-sm border-0 shadow-lg">
                <CardContent className="p-8 text-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
                    <p className="text-gray-600">Chargement des détails de la course...</p>
                </CardContent>
            </Card>
        );
    }

    const statusInfo = getStatusInfo(trip.status);
    const StatusIcon = statusInfo.icon;
    const { distance, eta } = calculateDistanceAndETA();

    return (
        <div className="space-y-4">
            {/* Statut de connexion */}
            <Card className="bg-white/90 backdrop-blur-sm border-0 shadow-lg">
                <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <div className={`w-3 h-3 rounded-full ${connectionStatus === 'connected' ? 'bg-green-500' :
                                    connectionStatus === 'reconnecting' ? 'bg-yellow-500' : 'bg-red-500'
                                }`}></div>
                            <span className="text-sm font-medium">
                                {connectionStatus === 'connected' ? 'Connecté' :
                                    connectionStatus === 'reconnecting' ? 'Reconnexion...' : 'Déconnecté'}
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

            {/* Statut de la course */}
            <Card className="bg-white/90 backdrop-blur-sm border-0 shadow-lg">
                <CardContent className="p-6">
                    <div className="flex items-center justify-between mb-4">
                        <Badge className={`${statusInfo.color} px-3 py-1`}>
                            <StatusIcon className="w-4 h-4 mr-1" />
                            {statusInfo.label}
                        </Badge>
                        <span className="text-sm text-gray-600">#{trip.id}</span>
                    </div>

                    <p className="text-gray-700 mb-4">{statusInfo.description}</p>

                    {/* Informations de distance et ETA */}
                    {trip.status !== 'completed' && (
                        <div className="grid grid-cols-2 gap-4 mb-4">
                            <div className="text-center p-3 bg-blue-50 rounded-lg">
                                <div className="text-lg font-bold text-blue-600">{distance}km</div>
                                <div className="text-xs text-gray-600">Distance</div>
                            </div>
                            <div className="text-center p-3 bg-green-50 rounded-lg">
                                <div className="text-lg font-bold text-green-600">{eta}</div>
                                <div className="text-xs text-gray-600">Temps estimé</div>
                            </div>
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Informations du client */}
            <Card className="bg-white/90 backdrop-blur-sm border-0 shadow-lg">
                <CardHeader>
                    <CardTitle className="text-lg">Client</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="flex items-center gap-4 mb-4">
                        <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center">
                            {trip.customer.photo ? (
                                <img
                                    src={trip.customer.photo}
                                    alt={trip.customer.name}
                                    className="w-16 h-16 rounded-full object-cover"
                                />
                            ) : (
                                <User className="w-8 h-8 text-blue-600" />
                            )}
                        </div>

                        <div className="flex-1">
                            <h3 className="font-semibold text-lg">{trip.customer.name}</h3>
                            <div className="flex items-center gap-2 text-sm text-gray-600">
                                <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                                <span>{trip.customer.rating}</span>
                            </div>
                        </div>
                    </div>

                    <div className="flex gap-2">
                        <Button
                            onClick={contactCustomer}
                            variant="outline"
                            className="flex-1"
                        >
                            <Phone className="w-4 h-4 mr-2" />
                            Appeler
                        </Button>
                        <Button
                            onClick={() => toast.info('Fonctionnalité de chat bientôt disponible')}
                            variant="outline"
                            className="flex-1"
                        >
                            <MessageCircle className="w-4 h-4 mr-2" />
                            Message
                        </Button>
                    </div>
                </CardContent>
            </Card>

            {/* Détails du trajet */}
            <Card className="bg-white/90 backdrop-blur-sm border-0 shadow-lg">
                <CardHeader>
                    <CardTitle className="text-lg">Détails du trajet</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="flex items-start gap-3">
                        <div className="w-3 h-3 bg-green-500 rounded-full mt-2"></div>
                        <div>
                            <p className="font-medium">Prise en charge</p>
                            <p className="text-sm text-gray-600">{trip.pickup.address}</p>
                        </div>
                    </div>

                    <div className="flex items-start gap-3">
                        <div className="w-3 h-3 bg-red-500 rounded-full mt-2"></div>
                        <div>
                            <p className="font-medium">Destination</p>
                            <p className="text-sm text-gray-600">{trip.dropoff.address}</p>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4 pt-4 border-t">
                        <div>
                            <div className="text-sm text-gray-600">Distance</div>
                            <div className="font-semibold">{trip.pricing.distance}km</div>
                        </div>
                        <div>
                            <div className="text-sm text-gray-600">Durée estimée</div>
                            <div className="font-semibold">{trip.pricing.duration}min</div>
                        </div>
                    </div>

                    <div className="flex items-center justify-between pt-4 border-t">
                        <span className="font-medium">Gains estimés</span>
                        <span className="text-lg font-bold text-green-600">
                            {trip.pricing.driverShare.toLocaleString()} GNF
                        </span>
                    </div>
                </CardContent>
            </Card>

            {/* Notifications récentes */}
            {notifications.length > 0 && (
                <Card className="bg-white/90 backdrop-blur-sm border-0 shadow-lg">
                    <CardHeader>
                        <CardTitle className="text-lg">Notifications récentes</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2">
                        {notifications.slice(0, 3).map((notification) => (
                            <div key={notification.id} className="p-3 bg-gray-50 rounded-lg">
                                <div className="font-medium text-sm">{notification.title}</div>
                                <div className="text-xs text-gray-600">{notification.message}</div>
                            </div>
                        ))}
                    </CardContent>
                </Card>
            )}

            {/* Actions de contrôle */}
            <div className="flex gap-3">
                <Button
                    onClick={isTracking ? stopTracking : startRealTimeTracking}
                    variant={isTracking ? "destructive" : "default"}
                    className="flex-1"
                >
                    {isTracking ? (
                        <>
                            <AlertTriangle className="w-4 h-4 mr-2" />
                            Arrêter le suivi
                        </>
                    ) : (
                        <>
                            <Zap className="w-4 h-4 mr-2" />
                            Démarrer le suivi
                        </>
                    )}
                </Button>
            </div>
        </div>
    );
}
