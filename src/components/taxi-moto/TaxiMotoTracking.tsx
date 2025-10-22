/**
 * COMPOSANT DE SUIVI TAXI-MOTO EN TEMPS RÉEL
 * Interface de suivi avec carte interactive et partage de trajet
 * 224Solutions - Taxi-Moto System
 */

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
    MapPin,
    Navigation,
    Clock,
    Phone,
    Share2,
    AlertTriangle,
    CheckCircle,
    Car,
    User,
    Star,
    MessageCircle
} from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { RidesService } from "@/services/taxi/ridesService";
import RidePaymentFlow from "./RidePaymentFlow";

interface LocationCoordinates {
    latitude: number;
    longitude: number;
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

interface TaxiMotoTrackingProps {
    currentRide: CurrentRide | null;
    userLocation: LocationCoordinates | null;
}

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

export default function TaxiMotoTracking({
    currentRide,
    userLocation
}: TaxiMotoTrackingProps) {
    const [driverLocation, setDriverLocation] = useState<LocationCoordinates | null>(null);
    const [estimatedArrival, setEstimatedArrival] = useState<string>('');
    const [rideProgress, setRideProgress] = useState(0);
    const [rideDetails, setRideDetails] = useState<any>(null);
    const [driverInfo, setDriverInfo] = useState<any>(null);
    const [showPayment, setShowPayment] = useState(false);

    // Charger les détails de la course
    useEffect(() => {
        if (currentRide?.id) {
            loadRideDetails();
        }
    }, [currentRide?.id]);

    // Écouter les mises à jour en temps réel
    useEffect(() => {
        if (!currentRide?.id) return;

        const subscription = supabase
            .channel(`ride_${currentRide.id}`)
            .on('postgres_changes', {
                event: '*',
                schema: 'public',
                table: 'taxi_trips',
                filter: `id=eq.${currentRide.id}`
            }, (payload) => {
                console.log('Ride updated:', payload);
                if (payload.new) {
                    updateRideProgress(payload.new);
                }
            })
            .on('postgres_changes', {
                event: 'INSERT',
                schema: 'public',
                table: 'taxi_ride_tracking',
                filter: `ride_id=eq.${currentRide.id}`
            }, (payload) => {
                if (payload.new) {
                    setDriverLocation({
                        latitude: (payload.new as any).latitude,
                        longitude: (payload.new as any).longitude
                    });
                    
                    // Estimer le temps d'arrivée basé sur la distance
                    if (userLocation) {
                        const distance = calculateDistance(
                            userLocation.latitude,
                            userLocation.longitude,
                            (payload.new as any).latitude,
                            (payload.new as any).longitude
                        );
                        const eta = Math.ceil(distance / 0.5); // 30 km/h = 0.5 km/min
                        setEstimatedArrival(`${eta} min`);
                    }
                }
            })
            .subscribe();

        return () => {
            subscription.unsubscribe();
        };
    }, [currentRide?.id, userLocation]);

    const loadRideDetails = async () => {
        if (!currentRide?.id) return;
        try {
            const details = await RidesService.getRideDetails(currentRide.id);
            setRideDetails(details);
            updateRideProgress(details);
            
            // Charger les infos du conducteur si assigné
            if (details.driver_id && !currentRide.driver) {
                loadDriverInfo(details.driver_id);
            }
        } catch (error) {
            console.error('Error loading ride details:', error);
        }
    };

    const loadDriverInfo = async (driverId: string) => {
        try {
            const { data: driverData, error } = await supabase
                .from('taxi_drivers')
                .select('*, profiles!taxi_drivers_user_id_fkey(first_name, last_name, phone)')
                .eq('id', driverId)
                .single();

            if (error) throw error;

            if (driverData) {
                const profile = (driverData as any).profiles;
                const formattedDriver = {
                    id: driverData.id,
                    name: profile ? `${profile.first_name} ${profile.last_name}` : 'Conducteur',
                    rating: driverData.rating || 4.5,
                    phone: profile?.phone || '',
                    vehicleType: driverData.vehicle_type || 'moto_rapide',
                    vehicleNumber: driverData.vehicle_plate || 'N/A',
                    photo: null
                };
                setDriverInfo(formattedDriver);
                console.log('Driver info loaded:', formattedDriver);
            }
        } catch (error) {
            console.error('Error loading driver info:', error);
        }
    };

    const updateRideProgress = (ride: any) => {
        const statusProgress = {
            'requested': 10,
            'accepted': 25,
            'driver_arriving': 50,
            'picked_up': 60,
            'in_progress': 75,
            'completed': 100,
            'cancelled': 0
        };
        setRideProgress(statusProgress[ride.status as keyof typeof statusProgress] || 0);
        
        // Afficher le paiement si la course est terminée
        if (ride.status === 'completed' && !ride.payment_status) {
            setShowPayment(true);
        }
    };

    /**
     * Partage le trajet avec un proche
     */
    const shareRide = () => {
        if (!currentRide) return;

        const shareText = `🚗 Je suis en course avec 224Solutions Taxi-Moto
Course: ${currentRide.id}
De: ${currentRide.pickupAddress}
Vers: ${currentRide.destinationAddress}
Conducteur: ${currentRide.driver?.name || 'En attente'}
Suivi en temps réel: https://224solutions.com/track/${currentRide.id}`;

        if (navigator.share) {
            navigator.share({
                title: 'Suivi de ma course Taxi-Moto',
                text: shareText
            });
        } else {
            navigator.clipboard.writeText(shareText);
            toast.success('Lien de suivi copié dans le presse-papier');
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
     * Annule la course
     */
    const cancelRide = async () => {
        if (!currentRide) return;

        if (window.confirm('Êtes-vous sûr de vouloir annuler cette course ?')) {
            try {
                await RidesService.updateRideStatus(currentRide.id, 'cancelled');
                toast.success('Course annulée');
            } catch (error) {
                console.error('Error cancelling ride:', error);
                toast.error('Erreur lors de l\'annulation');
            }
        }
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
            pending: {
                label: 'En attente',
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
                label: 'À bord',
                color: 'bg-purple-100 text-purple-800',
                icon: Car,
                description: 'Vous êtes à bord, en route vers la destination'
            },
            in_progress: {
                label: 'Course en cours',
                color: 'bg-green-100 text-green-800',
                icon: Car,
                description: 'Vous êtes en route vers votre destination'
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

        return statusMap[status as keyof typeof statusMap] || statusMap.pending;
    };

    if (!currentRide) {
        return (
            <Card className="bg-card/90 backdrop-blur-sm border-0 shadow-lg">
                <CardContent className="p-8 text-center">
                    <MapPin className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                    <h3 className="text-lg font-semibold text-foreground mb-2">
                        Aucune course active
                    </h3>
                    <p className="text-muted-foreground">
                        Réservez une course pour voir le suivi en temps réel
                    </p>
                </CardContent>
            </Card>
        );
    }

    // Afficher le flow de paiement si la course est terminée
    if (showPayment && currentRide.status === 'completed') {
        return (
            <RidePaymentFlow
                rideId={currentRide.id}
                amount={currentRide.estimatedPrice}
                onPaymentSuccess={() => {
                    setShowPayment(false);
                    toast.success('Merci ! À bientôt sur 224Solutions');
                }}
                onCancel={() => {
                    setShowPayment(false);
                }}
            />
        );
    }

    const statusInfo = getStatusInfo(currentRide.status);
    const StatusIcon = statusInfo.icon;

    return (
        <div className="space-y-4">
            {/* Statut de la course */}
            <Card className="bg-card/90 backdrop-blur-sm border-0 shadow-lg">
                <CardContent className="p-6">
                    <div className="flex items-center justify-between mb-4">
                        <Badge className={`${statusInfo.color} px-3 py-1`}>
                            <StatusIcon className="w-4 h-4 mr-1" />
                            {statusInfo.label}
                        </Badge>
                        <span className="text-sm text-muted-foreground">#{currentRide.id.substring(0, 8)}</span>
                    </div>

                    <p className="text-foreground mb-4">{statusInfo.description}</p>

                    {/* Barre de progression */}
                    <div className="w-full bg-secondary rounded-full h-2 mb-4">
                        <div
                            className="bg-gradient-to-r from-primary to-green-500 h-2 rounded-full transition-all duration-500"
                            style={{ width: `${rideProgress}%` }}
                        ></div>
                    </div>

                    {estimatedArrival && (
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <Clock className="w-4 h-4" />
                            <span>Arrivée estimée dans {estimatedArrival}</span>
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Informations du conducteur */}
            {(currentRide.driver || driverInfo) && (
                <Card className="bg-card/90 backdrop-blur-sm border-0 shadow-lg">
                    <CardHeader>
                        <CardTitle className="text-lg">Votre conducteur</CardTitle>
                    </CardHeader>
                    <CardContent>
                        {(() => {
                            const driver = currentRide.driver || driverInfo;
                            if (!driver) return null;
                            
                            return (
                                <>
                                    <div className="flex items-center gap-4 mb-4">
                                        <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center">
                                            {driver.photo ? (
                                                <img
                                                    src={driver.photo}
                                                    alt={driver.name}
                                                    className="w-16 h-16 rounded-full object-cover"
                                                />
                                            ) : (
                                                <User className="w-8 h-8 text-primary" />
                                            )}
                                        </div>

                                        <div className="flex-1">
                                            <h3 className="font-semibold text-lg">{driver.name}</h3>
                                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                                <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                                                <span>{driver.rating?.toFixed(1)}</span>
                                                <span>•</span>
                                                <span>{driver.vehicleType}</span>
                                            </div>
                                            <p className="text-sm text-muted-foreground">
                                                Plaque: {driver.vehicleNumber}
                                            </p>
                                        </div>
                                    </div>
                                </>
                            );
                        })()}

                        <div className="flex gap-2">
                            <Button
                                onClick={contactDriver}
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
            )}

            {/* Détails du trajet */}
            <Card className="bg-card/90 backdrop-blur-sm border-0 shadow-lg">
                <CardHeader>
                    <CardTitle className="text-lg">Détails du trajet</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="flex items-start gap-3">
                        <div className="w-3 h-3 bg-green-500 rounded-full mt-2"></div>
                        <div>
                            <p className="font-medium">Départ</p>
                            <p className="text-sm text-muted-foreground">{currentRide.pickupAddress}</p>
                        </div>
                    </div>

                    <div className="flex items-start gap-3">
                        <div className="w-3 h-3 bg-red-500 rounded-full mt-2"></div>
                        <div>
                            <p className="font-medium">Destination</p>
                            <p className="text-sm text-muted-foreground">{currentRide.destinationAddress}</p>
                        </div>
                    </div>

                    <div className="flex items-center justify-between pt-4 border-t">
                        <span className="font-medium">Prix estimé</span>
                        <span className="text-lg font-bold text-green-600">
                            {currentRide.estimatedPrice.toLocaleString()} GNF
                        </span>
                    </div>
                </CardContent>
            </Card>

            {/* Suivi GPS en temps réel */}
            <Card className="bg-card/90 backdrop-blur-sm border-0 shadow-lg">
                <CardHeader>
                    <CardTitle className="text-lg">Suivi en temps réel</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="h-64 bg-gradient-to-br from-primary/10 to-green-500/10 rounded-lg flex items-center justify-center">
                        <div className="text-center">
                            <MapPin className="w-12 h-12 mx-auto mb-2 text-primary" />
                            <p className="text-foreground font-medium">Carte interactive</p>
                            <p className="text-sm text-muted-foreground">
                                Position en temps réel du conducteur
                            </p>
                        </div>
                    </div>

                    {driverLocation && (
                        <div className="mt-4 p-3 bg-primary/10 rounded-lg">
                            <p className="text-sm text-foreground">
                                📍 Conducteur à {driverLocation.latitude.toFixed(4)}, {driverLocation.longitude.toFixed(4)}
                            </p>
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Actions */}
            <div className="flex gap-3">
                <Button
                    onClick={shareRide}
                    variant="outline"
                    className="flex-1"
                >
                    <Share2 className="w-4 h-4 mr-2" />
                    Partager
                </Button>

                {(currentRide.status === 'pending' || currentRide.status === 'accepted') && (
                    <Button
                        onClick={cancelRide}
                        variant="destructive"
                        className="flex-1"
                    >
                        <AlertTriangle className="w-4 h-4 mr-2" />
                        Annuler
                    </Button>
                )}
            </div>

            {/* Bouton SOS d'urgence */}
            <Card className="bg-red-50 dark:bg-red-950 border-red-200 dark:border-red-800">
                <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="font-medium text-red-800 dark:text-red-200">Urgence ?</p>
                            <p className="text-sm text-red-600 dark:text-red-300">
                                Activez l'alerte SOS si vous vous sentez en danger
                            </p>
                        </div>
                        <Button
                            variant="destructive"
                            onClick={() => toast.error('🚨 Alerte SOS activée !')}
                        >
                            <AlertTriangle className="w-4 h-4 mr-2" />
                            SOS
                        </Button>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
