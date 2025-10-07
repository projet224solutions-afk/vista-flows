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

export default function TaxiMotoTracking({
    currentRide,
    userLocation
}: TaxiMotoTrackingProps) {
    const [driverLocation, setDriverLocation] = useState<LocationCoordinates | null>(null);
    const [estimatedArrival, setEstimatedArrival] = useState<string>('');
    const [rideProgress, setRideProgress] = useState(0);

    // Simuler la mise à jour de la position du conducteur
    useEffect(() => {
        if (currentRide && currentRide.status !== 'pending') {
            const interval = setInterval(() => {
                // Simuler le mouvement du conducteur
                setDriverLocation({
                    latitude: 14.6937 + (Math.random() - 0.5) * 0.01,
                    longitude: -17.4441 + (Math.random() - 0.5) * 0.01
                });

                // Mettre à jour l'estimation d'arrivée
                const minutes = Math.max(1, Math.floor(Math.random() * 15));
                setEstimatedArrival(`${minutes} min`);

                // Simuler la progression
                setRideProgress(prev => Math.min(100, prev + Math.random() * 5));
            }, 3000);

            return () => clearInterval(interval);
        }
    }, [currentRide]);

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
    const cancelRide = () => {
        if (!currentRide) return;

        // Confirmation avant annulation
        if (window.confirm('Êtes-vous sûr de vouloir annuler cette course ?')) {
            toast.success('Course annulée');
            // En production: appel API pour annuler
        }
    };

    /**
     * Obtient le statut formaté
     */
    const getStatusInfo = (status: string) => {
        const statusMap = {
            pending: {
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
            <Card className="bg-white/90 backdrop-blur-sm border-0 shadow-lg">
                <CardContent className="p-8 text-center">
                    <MapPin className="w-12 h-12 mx-auto mb-4 text-gray-400" />
                    <h3 className="text-lg font-semibold text-gray-700 mb-2">
                        Aucune course active
                    </h3>
                    <p className="text-gray-600">
                        Réservez une course pour voir le suivi en temps réel
                    </p>
                </CardContent>
            </Card>
        );
    }

    const statusInfo = getStatusInfo(currentRide.status);
    const StatusIcon = statusInfo.icon;

    return (
        <div className="space-y-4">
            {/* Statut de la course */}
            <Card className="bg-white/90 backdrop-blur-sm border-0 shadow-lg">
                <CardContent className="p-6">
                    <div className="flex items-center justify-between mb-4">
                        <Badge className={`${statusInfo.color} px-3 py-1`}>
                            <StatusIcon className="w-4 h-4 mr-1" />
                            {statusInfo.label}
                        </Badge>
                        <span className="text-sm text-gray-600">#{currentRide.id}</span>
                    </div>

                    <p className="text-gray-700 mb-4">{statusInfo.description}</p>

                    {/* Barre de progression */}
                    <div className="w-full bg-gray-200 rounded-full h-2 mb-4">
                        <div
                            className="bg-gradient-to-r from-blue-500 to-green-500 h-2 rounded-full transition-all duration-500"
                            style={{ width: `${rideProgress}%` }}
                        ></div>
                    </div>

                    {estimatedArrival && (
                        <div className="flex items-center gap-2 text-sm text-gray-600">
                            <Clock className="w-4 h-4" />
                            <span>Arrivée estimée dans {estimatedArrival}</span>
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Informations du conducteur */}
            {currentRide.driver && (
                <Card className="bg-white/90 backdrop-blur-sm border-0 shadow-lg">
                    <CardHeader>
                        <CardTitle className="text-lg">Votre conducteur</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="flex items-center gap-4 mb-4">
                            <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center">
                                {currentRide.driver.photo ? (
                                    <img
                                        src={currentRide.driver.photo}
                                        alt={currentRide.driver.name}
                                        className="w-16 h-16 rounded-full object-cover"
                                    />
                                ) : (
                                    <User className="w-8 h-8 text-blue-600" />
                                )}
                            </div>

                            <div className="flex-1">
                                <h3 className="font-semibold text-lg">{currentRide.driver.name}</h3>
                                <div className="flex items-center gap-2 text-sm text-gray-600">
                                    <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                                    <span>{currentRide.driver.rating}</span>
                                    <span>•</span>
                                    <span>{currentRide.driver.vehicleType}</span>
                                </div>
                                <p className="text-sm text-gray-600">
                                    Plaque: {currentRide.driver.vehicleNumber}
                                </p>
                            </div>
                        </div>

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
            <Card className="bg-white/90 backdrop-blur-sm border-0 shadow-lg">
                <CardHeader>
                    <CardTitle className="text-lg">Détails du trajet</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="flex items-start gap-3">
                        <div className="w-3 h-3 bg-green-500 rounded-full mt-2"></div>
                        <div>
                            <p className="font-medium">Départ</p>
                            <p className="text-sm text-gray-600">{currentRide.pickupAddress}</p>
                        </div>
                    </div>

                    <div className="flex items-start gap-3">
                        <div className="w-3 h-3 bg-red-500 rounded-full mt-2"></div>
                        <div>
                            <p className="font-medium">Destination</p>
                            <p className="text-sm text-gray-600">{currentRide.destinationAddress}</p>
                        </div>
                    </div>

                    <div className="flex items-center justify-between pt-4 border-t">
                        <span className="font-medium">Prix estimé</span>
                        <span className="text-lg font-bold text-green-600">
                            {currentRide.estimatedPrice.toLocaleString()} FCFA
                        </span>
                    </div>
                </CardContent>
            </Card>

            {/* Carte interactive (placeholder) */}
            <Card className="bg-white/90 backdrop-blur-sm border-0 shadow-lg">
                <CardHeader>
                    <CardTitle className="text-lg">Suivi en temps réel</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="h-64 bg-gradient-to-br from-blue-100 to-green-100 rounded-lg flex items-center justify-center">
                        <div className="text-center">
                            <MapPin className="w-12 h-12 mx-auto mb-2 text-blue-600" />
                            <p className="text-gray-700 font-medium">Carte interactive</p>
                            <p className="text-sm text-gray-600">
                                Position en temps réel du conducteur
                            </p>
                        </div>
                    </div>

                    {driverLocation && (
                        <div className="mt-4 p-3 bg-blue-50 rounded-lg">
                            <p className="text-sm text-blue-800">
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

                {currentRide.status === 'pending' && (
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
            <Card className="bg-red-50 border-red-200">
                <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="font-medium text-red-800">Urgence ?</p>
                            <p className="text-sm text-red-600">
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
