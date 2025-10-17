// @ts-nocheck
/**
 * COMPOSANT DE RÉSERVATION TAXI-MOTO ULTRA PROFESSIONNEL
 * Interface de réservation avec géolocalisation et calcul de tarifs en temps réel
 * 224Solutions - Taxi-Moto System
 */

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
    MapPin,
    Navigation,
    Clock,
    CreditCard,
    Star,
    Loader2,
    Calendar,
    Users,
    Zap,
    DollarSign,
    Route
} from "lucide-react";
import { toast } from "sonner";
import { mapService } from "@/services/mapService";
import { pricingService, getVehicleTypeInfo } from "@/services/pricingService";
import { useAuth } from "@/hooks/useAuth";

const API_BASE = (import.meta as unknown).env?.VITE_API_BASE_URL || "";

interface LocationCoordinates {
    latitude: number;
    longitude: number;
}

interface Driver {
    id: string;
    name: string;
    rating: number;
    distance: number;
    vehicleType: string;
    eta: string;
    rides: number;
}

interface TaxiMotoBookingProps {
    userLocation: LocationCoordinates | null;
    nearbyDrivers: Driver[];
    onRideCreated: (ride: unknown) => void;
}

export default function TaxiMotoBooking({
    userLocation,
    nearbyDrivers,
    onRideCreated
}: TaxiMotoBookingProps) {
    const { user } = useAuth();

    // États du formulaire
    const [pickupAddress, setPickupAddress] = useState('');
    const [destinationAddress, setDestinationAddress] = useState('');
    const [selectedVehicleType, setSelectedVehicleType] = useState<'moto_economique' | 'moto_rapide' | 'moto_premium'>('moto_rapide');
    const [scheduledTime, setScheduledTime] = useState('');
    const [isScheduled, setIsScheduled] = useState(false);

    // États de calcul
    const [routeInfo, setRouteInfo] = useState<unknown>(null);
    const [priceEstimate, setPriceEstimate] = useState<unknown>(null);
    const [priceComparison, setPriceComparison] = useState<unknown[]>([]);

    // États de chargement
    const [loadingRoute, setLoadingRoute] = useState(false);
    const [loadingPrice, setLoadingPrice] = useState(false);
    const [bookingInProgress, setBookingInProgress] = useState(false);

    // États de géocodage
    const [pickupSuggestions, setPickupSuggestions] = useState<unknown[]>([]);
    const [destinationSuggestions, setDestinationSuggestions] = useState<unknown[]>([]);
    const [showPickupSuggestions, setShowPickupSuggestions] = useState(false);
    const [showDestinationSuggestions, setShowDestinationSuggestions] = useState(false);

    // Coordonnées sélectionnées
    const [pickupCoords, setPickupCoords] = useState<LocationCoordinates | null>(null);
    const [destinationCoords, setDestinationCoords] = useState<LocationCoordinates | null>(null);

    /**
     * Utilise la position actuelle comme point de départ
     */
    const useCurrentLocation = () => {
        if (userLocation) {
            setPickupCoords(userLocation);
            setPickupAddress('Position actuelle');
            toast.success('Position actuelle utilisée comme point de départ');
        } else {
            toast.error('Position non disponible. Activez votre GPS.');
        }
    };

    /**
     * Géocode une adresse
     */
    const geocodeAddress = useCallback(async (address: string, isPickup: boolean) => {
        if (address.length < 3) return;

        try {
            const results = await mapService.geocodeAddress(address);

            if (isPickup) {
                setPickupSuggestions(results);
                setShowPickupSuggestions(true);
            } else {
                setDestinationSuggestions(results);
                setShowDestinationSuggestions(true);
            }
        } catch (error) {
            console.error('Erreur géocodage:', error);
        }
    }, []);

    /**
     * Sélectionne une suggestion d'adresse
     */
    const selectAddressSuggestion = (suggestion: unknown, isPickup: boolean) => {
        if (isPickup) {
            setPickupAddress(suggestion.address);
            setPickupCoords(suggestion.coordinates);
            setShowPickupSuggestions(false);
        } else {
            setDestinationAddress(suggestion.address);
            setDestinationCoords(suggestion.coordinates);
            setShowDestinationSuggestions(false);
        }
    };

    /**
     * Calcule l'itinéraire et le prix
     */
    const calculateRouteAndPrice = useCallback(async () => {
        if (!pickupCoords || !destinationCoords) return;

        setLoadingRoute(true);
        setLoadingPrice(true);

        try {
            // Obtenir l'itinéraire
            const route = await mapService.getRoute(pickupCoords, destinationCoords);
            setRouteInfo(route);

            // Calculer le prix pour le type sélectionné
            const price = pricingService.calculatePrice(route.distance, route.duration);
            setPriceEstimate(price);

            // Réinitialiser la comparaison
            setPriceComparison([]);

        } catch (error) {
            console.error('Erreur calcul itinéraire/prix:', error);
            toast.error('Impossible de calculer l\'itinéraire');
        } finally {
            setLoadingRoute(false);
            setLoadingPrice(false);
        }
    }, [pickupCoords, destinationCoords, selectedVehicleType, isScheduled, scheduledTime]);

    /**
     * Effectue la réservation
     */
    const handleBooking = async () => {
        if (!user) {
            toast.error('Veuillez vous connecter pour réserver');
            return;
        }

        if (!pickupCoords || !destinationCoords || !priceEstimate) {
            toast.error('Veuillez compléter tous les champs');
            return;
        }

        setBookingInProgress(true);

        try {
            const response = await fetch(`${API_BASE}/taxiMotoDriver/createRide`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    pickup: {
                        lat: pickupCoords.latitude,
                        lng: pickupCoords.longitude,
                        address: pickupAddress || 'Point de départ'
                    },
                    dropoff: {
                        lat: destinationCoords.latitude,
                        lng: destinationCoords.longitude,
                        address: destinationAddress || 'Destination'
                    },
                    estimated_price: priceEstimate.totalPrice
                })
            });

            const data = await response.json();
            if (!response.ok || !data?.success) {
                throw new Error(data?.message || 'Erreur de réservation');
            }

            onRideCreated(data.ride);
            toast.success('🚀 Réservation confirmée ! Recherche d\'un conducteur...');

            // Réinitialiser le formulaire
            setPickupAddress('');
            setDestinationAddress('');
            setPickupCoords(null);
            setDestinationCoords(null);
            setRouteInfo(null);
            setPriceEstimate(null);

        } catch (error) {
            console.error('Erreur réservation:', error);
            toast.error('Erreur lors de la réservation');
        } finally {
            setBookingInProgress(false);
        }
    };

    // Effet pour calculer automatiquement quand les coordonnées changent
    useEffect(() => {
        if (pickupCoords && destinationCoords) {
            const timer = setTimeout(calculateRouteAndPrice, 500);
            return () => clearTimeout(timer);
        }
    }, [pickupCoords, destinationCoords, selectedVehicleType, calculateRouteAndPrice]);

    return (
        <div className="space-y-4">
            {/* Formulaire de réservation */}
            <Card className="bg-white/90 backdrop-blur-sm border-0 shadow-lg">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Navigation className="w-5 h-5 text-blue-600" />
                        Nouvelle réservation
                    </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    {/* Point de départ */}
                    <div className="relative">
                        <label className="text-sm font-medium text-gray-700 mb-2 block">
                            Point de départ
                        </label>
                        <div className="flex gap-2">
                            <div className="flex-1 relative">
                                <Input
                                    placeholder="Saisissez votre adresse de départ"
                                    value={pickupAddress}
                                    onChange={(e) => {
                                        setPickupAddress(e.target.value);
                                        geocodeAddress(e.target.value, true);
                                    }}
                                    className="pl-10"
                                />
                                <MapPin className="w-4 h-4 text-gray-400 absolute left-3 top-3" />

                                {/* Suggestions de départ */}
                                {showPickupSuggestions && pickupSuggestions.length > 0 && (
                                    <div className="absolute top-full left-0 right-0 bg-white border rounded-md shadow-lg z-10 max-h-40 overflow-y-auto">
                                        {pickupSuggestions.map((suggestion, index) => (
                                            <button
                                                key={index}
                                                onClick={() => selectAddressSuggestion(suggestion, true)}
                                                className="w-full text-left px-3 py-2 hover:bg-gray-50 text-sm"
                                            >
                                                {suggestion.address}
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>
                            <Button
                                onClick={useCurrentLocation}
                                variant="outline"
                                size="sm"
                                disabled={!userLocation}
                            >
                                <Navigation className="w-4 h-4" />
                            </Button>
                        </div>
                    </div>

                    {/* Destination */}
                    <div className="relative">
                        <label className="text-sm font-medium text-gray-700 mb-2 block">
                            Destination
                        </label>
                        <div className="relative">
                            <Input
                                placeholder="Où voulez-vous aller ?"
                                value={destinationAddress}
                                onChange={(e) => {
                                    setDestinationAddress(e.target.value);
                                    geocodeAddress(e.target.value, false);
                                }}
                                className="pl-10"
                            />
                            <MapPin className="w-4 h-4 text-red-400 absolute left-3 top-3" />

                            {/* Suggestions de destination */}
                            {showDestinationSuggestions && destinationSuggestions.length > 0 && (
                                <div className="absolute top-full left-0 right-0 bg-white border rounded-md shadow-lg z-10 max-h-40 overflow-y-auto">
                                    {destinationSuggestions.map((suggestion, index) => (
                                        <button
                                            key={index}
                                            onClick={() => selectAddressSuggestion(suggestion, false)}
                                            className="w-full text-left px-3 py-2 hover:bg-gray-50 text-sm"
                                        >
                                            {suggestion.address}
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Options de réservation */}
                    <div className="flex items-center gap-4">
                        <label className="flex items-center gap-2">
                            <input
                                type="checkbox"
                                checked={isScheduled}
                                onChange={(e) => setIsScheduled(e.target.checked)}
                                className="rounded"
                            />
                            <span className="text-sm">Réservation planifiée</span>
                        </label>

                        {isScheduled && (
                            <Input
                                type="datetime-local"
                                value={scheduledTime}
                                onChange={(e) => setScheduledTime(e.target.value)}
                                min={new Date().toISOString().slice(0, 16)}
                                className="flex-1"
                            />
                        )}
                    </div>
                </CardContent>
            </Card>

            {/* Informations d'itinéraire */}
            {routeInfo && (
                <Card className="bg-white/90 backdrop-blur-sm border-0 shadow-lg">
                    <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-4">
                                <div className="text-center">
                                    <div className="text-lg font-bold text-blue-600">
                                        {routeInfo.distance}km
                                    </div>
                                    <div className="text-xs text-gray-600">Distance</div>
                                </div>
                                <div className="text-center">
                                    <div className="text-lg font-bold text-green-600">
                                        {routeInfo.duration}min
                                    </div>
                                    <div className="text-xs text-gray-600">Durée</div>
                                </div>
                            </div>

                            {loadingRoute && (
                                <Loader2 className="w-5 h-5 animate-spin text-blue-600" />
                            )}
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* Comparaison des prix */}
            {priceComparison.length > 0 && (
                <Card className="bg-white/90 backdrop-blur-sm border-0 shadow-lg">
                    <CardHeader>
                        <CardTitle className="text-lg">Choisissez votre moto</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                        {priceComparison.map((option) => {
                            const vehicleInfo = getVehicleTypeInfo(option.vehicleType);
                            const isSelected = selectedVehicleType === option.vehicleType;

                            return (
                                <button
                                    key={option.vehicleType}
                                    onClick={() => setSelectedVehicleType(option.vehicleType as unknown)}
                                    className={`w-full p-4 rounded-lg border-2 transition-all ${isSelected
                                        ? 'border-blue-500 bg-blue-50'
                                        : 'border-gray-200 hover:border-gray-300'
                                        }`}
                                >
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-3">
                                            <div className="text-2xl">{vehicleInfo.icon}</div>
                                            <div className="text-left">
                                                <div className="font-semibold">{vehicleInfo.name}</div>
                                                <div className="text-sm text-gray-600">{option.estimatedArrival}</div>
                                                <div className="text-xs text-gray-500">
                                                    {vehicleInfo.features.slice(0, 2).join(' • ')}
                                                </div>
                                            </div>
                                        </div>

                                        <div className="text-right">
                                            <div className="text-lg font-bold text-green-600">
                                                {option.price.totalPrice.toLocaleString()} GNF
                                            </div>
                                            {option.price.appliedMultipliers.length > 0 && (
                                                <Badge variant="secondary" className="text-xs">
                                                    +{Math.round((option.price.surgeMultiplier - 1) * 100)}%
                                                </Badge>
                                            )}
                                        </div>
                                    </div>
                                </button>
                            );
                        })}
                    </CardContent>
                </Card>
            )}

            {/* Détail du prix sélectionné */}
            {priceEstimate && (
                <Card className="bg-white/90 backdrop-blur-sm border-0 shadow-lg">
                    <CardHeader>
                        <CardTitle className="text-lg flex items-center gap-2">
                            <DollarSign className="w-5 h-5 text-green-600" />
                            Détail du prix
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                        <div className="flex justify-between">
                            <span>Prix de base</span>
                            <span>{priceEstimate.basePrice.toLocaleString()} GNF</span>
                        </div>
                        <div className="flex justify-between">
                            <span>Distance ({routeInfo?.distance}km)</span>
                            <span>{priceEstimate.distancePrice.toLocaleString()} GNF</span>
                        </div>
                        <div className="flex justify-between">
                            <span>Temps ({routeInfo?.duration}min)</span>
                            <span>{priceEstimate.timePrice.toLocaleString()} GNF</span>
                        </div>

                        {priceEstimate.appliedMultipliers.length > 0 && (
                            <>
                                <Separator />
                                {priceEstimate.appliedMultipliers.map((multiplier, index) => (
                                    <div key={index} className="flex justify-between text-sm">
                                        <span className="text-orange-600">{multiplier.reason}</span>
                                        <span className="text-orange-600">
                                            +{Math.round((multiplier.multiplier - 1) * 100)}%
                                        </span>
                                    </div>
                                ))}
                                <div className="flex justify-between text-sm">
                                    <span>Majoration</span>
                                    <span>+{priceEstimate.surgeAmount.toLocaleString()} GNF</span>
                                </div>
                            </>
                        )}

                        <div className="flex justify-between text-sm">
                            <span>TVA (18%)</span>
                            <span>{priceEstimate.taxes.toLocaleString()} GNF</span>
                        </div>

                        <Separator />
                        <div className="flex justify-between text-lg font-bold">
                            <span>Total</span>
                            <span className="text-green-600">
                                {priceEstimate.totalPrice.toLocaleString()} GNF
                            </span>
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* Bouton de réservation */}
            <Button
                onClick={handleBooking}
                disabled={!pickupCoords || !destinationCoords || !priceEstimate || bookingInProgress}
                className="w-full h-12 text-lg font-semibold bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
            >
                {bookingInProgress ? (
                    <>
                        <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                        Réservation en cours...
                    </>
                ) : (
                    <>
                        <Zap className="w-5 h-5 mr-2" />
                        Réserver maintenant
                    </>
                )}
            </Button>

            {/* Conducteurs proches */}
            {nearbyDrivers.length > 0 && (
                <Card className="bg-white/90 backdrop-blur-sm border-0 shadow-lg">
                    <CardHeader>
                        <CardTitle className="text-lg">Conducteurs proches</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                        {nearbyDrivers.slice(0, 3).map((driver) => (
                            <div key={driver.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                                        <Users className="w-5 h-5 text-blue-600" />
                                    </div>
                                    <div>
                                        <div className="font-medium">{driver.name}</div>
                                        <div className="text-sm text-gray-600 flex items-center gap-2">
                                            <Star className="w-3 h-3 fill-yellow-400 text-yellow-400" />
                                            {driver.rating} • {driver.rides} courses
                                        </div>
                                    </div>
                                </div>

                                <div className="text-right">
                                    <div className="text-sm font-medium">{driver.distance}km</div>
                                    <div className="text-xs text-gray-600">{driver.eta}</div>
                                </div>
                            </div>
                        ))}
                    </CardContent>
                </Card>
            )}
        </div>
    );
}
