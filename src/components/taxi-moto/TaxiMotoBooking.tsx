// @ts-nocheck
/**
 * COMPOSANT DE RÃ‰SERVATION TAXI-MOTO ULTRA PROFESSIONNEL
 * Interface de rÃ©servation avec gÃ©olocalisation et calcul de tarifs en temps rÃ©el
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
    Route,
    Search
} from "lucide-react";
import { toast } from "sonner";
import { mapService } from "@/services/mapService";
import { getVehicleTypeInfo } from "@/services/pricingService";
import { useAuth } from "@/hooks/useAuth";
import { TaxiMotoService } from "@/services/taxi/TaxiMotoService";
import { supabase } from "@/integrations/supabase/client";
import PaymentMethodStep from "./PaymentMethodStep";
import { PaymentMethod } from "@/services/taxi/paymentsService";
import AddressSuggestionItem from "./AddressSuggestionItem";
import DestinationPreview from "./DestinationPreview";

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

    // Ã‰tats du formulaire
    const [pickupAddress, setPickupAddress] = useState('');
    const [destinationAddress, setDestinationAddress] = useState('');
    const [selectedVehicleType, setSelectedVehicleType] = useState<'moto_economique' | 'moto_rapide' | 'moto_premium'>('moto_rapide');
    const [scheduledTime, setScheduledTime] = useState('');
    const [isScheduled, setIsScheduled] = useState(false);

    // Ã‰tats de calcul
    const [routeInfo, setRouteInfo] = useState<unknown>(null);
    const [priceEstimate, setPriceEstimate] = useState<unknown>(null);
    const [priceComparison, setPriceComparison] = useState<unknown[]>([]);

    // Ã‰tats de chargement
    const [loadingRoute, setLoadingRoute] = useState(false);
    const [loadingPrice, setLoadingPrice] = useState(false);
    const [bookingInProgress, setBookingInProgress] = useState(false);

    // Ã‰tats de gÃ©ocodage
    const [pickupSuggestions, setPickupSuggestions] = useState<unknown[]>([]);
    const [destinationSuggestions, setDestinationSuggestions] = useState<unknown[]>([]);
    const [showPickupSuggestions, setShowPickupSuggestions] = useState(false);
    const [showDestinationSuggestions, setShowDestinationSuggestions] = useState(false);
    const [pickupSearchQuery, setPickupSearchQuery] = useState('');
    const [destinationSearchQuery, setDestinationSearchQuery] = useState('');

    // CoordonnÃ©es sÃ©lectionnÃ©es
    const [pickupCoords, setPickupCoords] = useState<LocationCoordinates | null>(null);
    const [destinationCoords, setDestinationCoords] = useState<LocationCoordinates | null>(null);

    // Ã‰tat pour l'Ã©tape de paiement
    const [showPaymentStep, setShowPaymentStep] = useState(false);
    const [walletBalance, setWalletBalance] = useState(0);

    // Charger le solde du wallet
    useEffect(() => {
        const loadWalletBalance = async () => {
            if (!user) return;
            const { data } = await supabase
                .from('wallets')
                .select('balance')
                .eq('user_id', user.id)
                .eq('currency', 'GNF')
                .maybeSingle();
            if (data) {
                setWalletBalance(data.balance || 0);
            }
        };
        loadWalletBalance();
    }, [user]);

    /**
     * Utilise la position actuelle comme point de dÃ©part
     */
    const useCurrentLocation = async () => {
        console.log('[TaxiMotoBooking] Demande de position actuelle...');
        
        if (userLocation) {
            setPickupCoords(userLocation);
            setPickupAddress('Position actuelle');
            toast.success('Position actuelle utilisÃ©e comme point de dÃ©part');
            console.log('[TaxiMotoBooking] Position utilisÃ©e:', userLocation);
            return;
        }

        // Si pas de position, demander l'accÃ¨s GPS
        toast.info('Demande d\'accÃ¨s Ã  votre position GPS...');
        
        if (!navigator.geolocation) {
            toast.error('La gÃ©olocalisation n\'est pas supportÃ©e par votre navigateur');
            return;
        }

        try {
            const position = await new Promise<GeolocationPosition>((resolve, reject) => {
                navigator.geolocation.getCurrentPosition(resolve, reject, {
                    enableHighAccuracy: true,
                    timeout: 10000,
                    maximumAge: 0
                });
            });

            const newLocation = {
                latitude: position.coords.latitude,
                longitude: position.coords.longitude,
                timestamp: Date.now()
            };

            setPickupCoords(newLocation);
            setPickupAddress('Position actuelle');
            toast.success('âœ… Position GPS obtenue avec succÃ¨s !');
            console.log('[TaxiMotoBooking] Position GPS obtenue:', newLocation);
            
        } catch (error) {
            console.error('[TaxiMotoBooking] Erreur GPS:', error);
            
            if (error instanceof GeolocationPositionError) {
                switch (error.code) {
                    case error.PERMISSION_DENIED:
                        toast.error('AccÃ¨s GPS refusÃ©. Veuillez autoriser l\'accÃ¨s Ã  votre position dans les paramÃ¨tres du navigateur.');
                        break;
                    case error.POSITION_UNAVAILABLE:
                        toast.error('Position GPS non disponible. VÃ©rifiez que le GPS est activÃ©.');
                        break;
                    case error.TIMEOUT:
                        toast.error('DÃ©lai d\'attente GPS dÃ©passÃ©. RÃ©essayez.');
                        break;
                    default:
                        toast.error('Erreur lors de l\'obtention de la position GPS.');
                }
            } else {
                toast.error('Impossible d\'obtenir votre position. Activez votre GPS.');
            }
        }
    };

    /**
     * GÃ©ocode une adresse avec debouncing
     */
    const geocodeAddress = useCallback(async (address: string, isPickup: boolean) => {
        // Longueur minimale de 3 caractÃ¨res pour une recherche plus prÃ©cise
        if (address.length < 3) {
            // Masquer les suggestions si trop court
            if (isPickup) {
                setShowPickupSuggestions(false);
            } else {
                setShowDestinationSuggestions(false);
            }
            return;
        }

        try {
            const results = await mapService.geocodeAddress(address);

            if (results && results.length > 0) {
                if (isPickup) {
                    setPickupSuggestions(results);
                    setShowPickupSuggestions(true);
                } else {
                    setDestinationSuggestions(results);
                    setShowDestinationSuggestions(true);
                }
            } else {
                // Pas de rÃ©sultats, masquer les suggestions
                if (isPickup) {
                    setShowPickupSuggestions(false);
                } else {
                    setShowDestinationSuggestions(false);
                }
            }
        } catch (error) {
            console.warn('[TaxiMotoBooking] Geocoding error:', error);
            // Ne pas afficher d'erreur Ã  l'utilisateur pour Ã©viter le spam
            // Masquer simplement les suggestions
            if (isPickup) {
                setShowPickupSuggestions(false);
            } else {
                setShowDestinationSuggestions(false);
            }
        }
    }, []);

    /**
     * SÃ©lectionne une suggestion d'adresse
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
     * Calcule l'itinÃ©raire et le prix
     */
    const calculateRouteAndPrice = useCallback(async () => {
        if (!pickupCoords || !destinationCoords) return;

        setLoadingRoute(true);
        setLoadingPrice(true);

        try {
            // Obtenir l'itinÃ©raire
            const route = await mapService.getRoute(pickupCoords, destinationCoords);
            console.log('[TaxiMotoBooking] Route calculated:', route);
            setRouteInfo(route);

            // Calculer le prix via le service backend
            const fareCalculation = await TaxiMotoService.calculateFare(
                route.distance,
                route.duration,
                1.0 // surge multiplier
            );
            
            console.log('[TaxiMotoBooking] Fare calculated:', fareCalculation);
            
            // Formater le prix pour l'affichage
            const totalPrice = fareCalculation.total_fare || fareCalculation.total;
            const basePrice = fareCalculation.base_fare || 0;
            
            if (fareCalculation && typeof totalPrice === 'number') {
                setPriceEstimate({
                    totalPrice: Math.round(totalPrice),
                    distance: route.distance,
                    duration: route.duration,
                    basePrice: Math.round(basePrice),
                    currency: 'GNF'
                });
            } else {
                console.error('[TaxiMotoBooking] Prix invalide retournÃ©:', fareCalculation);
                setPriceEstimate(null);
                toast.error('Erreur lors du calcul du prix');
            }

            // RÃ©initialiser la comparaison
            setPriceComparison([]);

        } catch (error) {
            console.error('Erreur calcul itinÃ©raire/prix:', error);
            toast.error('Impossible de calculer l\'itinÃ©raire');
            setPriceEstimate(null);
        } finally {
            setLoadingRoute(false);
            setLoadingPrice(false);
        }
    }, [pickupCoords, destinationCoords, selectedVehicleType, isScheduled, scheduledTime]);

    /**
     * Ouvre l'Ã©tape de sÃ©lection du mode de paiement
     */
    const handleProceedToPayment = () => {
        if (!user) {
            toast.error('Veuillez vous connecter pour rÃ©server');
            return;
        }

        if (!pickupCoords || !destinationCoords || !priceEstimate) {
            toast.error('Veuillez complÃ©ter tous les champs');
            return;
        }

        setShowPaymentStep(true);
    };

    /**
     * Effectue la rÃ©servation aprÃ¨s sÃ©lection du mode de paiement
     */
    const handleConfirmBooking = async (paymentMethod: PaymentMethod, phoneNumber?: string) => {
        if (!pickupCoords || !destinationCoords || !priceEstimate) return;

        console.log('[TaxiMotoBooking] Starting booking with:', {
            pickupCoords,
            destinationCoords,
            priceEstimate,
            routeInfo,
            paymentMethod,
            phoneNumber
        });

        setBookingInProgress(true);

        try {
            const ride = await TaxiMotoService.createRide({
                pickupLat: pickupCoords.latitude,
                pickupLng: pickupCoords.longitude,
                dropoffLat: destinationCoords.latitude,
                dropoffLng: destinationCoords.longitude,
                pickupAddress: pickupAddress || 'Point de dÃ©part',
                dropoffAddress: destinationAddress || 'Destination',
                distanceKm: routeInfo?.distance || 0,
                durationMin: routeInfo?.duration || 0,
                estimatedPrice: priceEstimate.totalPrice,
                paymentMethod,
                phoneNumber
            });

            console.log('[TaxiMotoBooking] Ride created successfully:', ride);
            onRideCreated(ride);
            toast.success('ðŸš€ RÃ©servation confirmÃ©e ! Recherche d\'un conducteur...');

            // RÃ©initialiser le formulaire
            setPickupAddress('');
            setDestinationAddress('');
            setPickupCoords(null);
            setDestinationCoords(null);
            setRouteInfo(null);
            setPriceEstimate(null);
            setShowPaymentStep(false);

        } catch (error) {
            console.error('[TaxiMotoBooking] Booking error:', error);
            toast.error('Erreur lors de la rÃ©servation');
        } finally {
            setBookingInProgress(false);
        }
    };

    // Effet pour calculer automatiquement quand les coordonnÃ©es changent
    useEffect(() => {
        if (pickupCoords && destinationCoords) {
            const timer = setTimeout(calculateRouteAndPrice, 500);
            return () => clearTimeout(timer);
        }
    }, [pickupCoords, destinationCoords, selectedVehicleType, calculateRouteAndPrice]);

    // Debouncing pour le geocoding du pickup
    useEffect(() => {
        if (pickupSearchQuery.length >= 5) {
            const timer = setTimeout(() => {
                geocodeAddress(pickupSearchQuery, true);
            }, 800);
            return () => clearTimeout(timer);
        } else if (pickupSearchQuery.length > 0 && pickupSearchQuery.length < 5) {
            setShowPickupSuggestions(false);
        }
    }, [pickupSearchQuery, geocodeAddress]);

    // Debouncing pour le geocoding de la destination - recherche plus rapide
    useEffect(() => {
        if (destinationSearchQuery.length >= 3) {
            const timer = setTimeout(() => {
                geocodeAddress(destinationSearchQuery, false);
            }, 500); // RÃ©duit Ã  500ms pour une rÃ©ponse plus rapide
            return () => clearTimeout(timer);
        } else if (destinationSearchQuery.length > 0 && destinationSearchQuery.length < 3) {
            setShowDestinationSuggestions(false);
        }
    }, [destinationSearchQuery, geocodeAddress]);

    // Si l'Ã©tape de paiement est active, afficher le composant de sÃ©lection
    if (showPaymentStep && priceEstimate) {
        return (
            <PaymentMethodStep
                amount={priceEstimate.totalPrice}
                walletBalance={walletBalance}
                onConfirm={handleConfirmBooking}
                onBack={() => setShowPaymentStep(false)}
                isLoading={bookingInProgress}
            />
        );
    }

    return (
        <div className="space-y-4">
            {/* Formulaire de rÃ©servation */}
            <Card className="bg-white/90 backdrop-blur-sm border-0 shadow-lg">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Navigation className="w-5 h-5 text-blue-600" />
                        Nouvelle rÃ©servation
                    </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    {/* Point de dÃ©part */}
                    <div className="relative">
                        <label className="text-sm font-medium text-gray-700 mb-2 block">
                            Point de dÃ©part
                        </label>
                        <div className="flex gap-2">
                            <div className="flex-1 relative">
                                <Input
                                    placeholder="Saisissez votre adresse de dÃ©part (min. 5 caractÃ¨res)"
                                    value={pickupAddress}
                                    onChange={(e) => {
                                        const value = e.target.value;
                                        setPickupAddress(value);
                                        setPickupSearchQuery(value);
                                    }}
                                    className="pl-10"
                                />
                                <MapPin className="w-4 h-4 text-gray-400 absolute left-3 top-3" />

                                {/* Suggestions de dÃ©part */}
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
                                size="icon"
                                className="shrink-0 hover:bg-blue-50 hover:border-blue-500 hover:text-blue-600 transition-all active:scale-95"
                                title="Utiliser ma position actuelle"
                            >
                                <Navigation className="w-4 h-4" />
                            </Button>
                        </div>
                    </div>

                    {/* Destination avec recherche amÃ©liorÃ©e */}
                    <div className="relative">
                        <label className="text-sm font-medium text-gray-700 mb-2 block flex items-center gap-2">
                            <MapPin className="w-4 h-4 text-red-500" />
                            Destination
                        </label>
                        <div className="flex gap-2">
                            <div className="relative flex-1">
                                <Input
                                    placeholder="Tapez une adresse ou un lieu..."
                                    value={destinationAddress}
                                    onChange={(e) => {
                                        const value = e.target.value;
                                        setDestinationAddress(value);
                                        setDestinationSearchQuery(value);
                                    }}
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter' && destinationAddress.length >= 3) {
                                            e.preventDefault();
                                            geocodeAddress(destinationAddress, false);
                                        }
                                    }}
                                    className="pl-10 pr-4"
                                />
                                <Search className="w-4 h-4 text-gray-400 absolute left-3 top-3" />
                                
                                {/* Indicateur de recherche en cours */}
                                {destinationSearchQuery.length >= 3 && destinationSearchQuery.length < 5 && (
                                    <div className="absolute right-3 top-3">
                                        <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                                    </div>
                                )}
                            </div>
                            
                            {/* Bouton de recherche explicite */}
                            <Button
                                onClick={() => {
                                    if (destinationAddress.length >= 3) {
                                        geocodeAddress(destinationAddress, false);
                                    }
                                }}
                                variant="default"
                                size="icon"
                                disabled={destinationAddress.length < 3}
                                className="shrink-0 bg-red-500 hover:bg-red-600 text-white transition-all active:scale-95 disabled:opacity-50"
                                title="Rechercher cette adresse"
                            >
                                <Search className="w-4 h-4" />
                            </Button>
                        </div>
                        
                        {/* Message d'aide contextuel */}
                        {destinationAddress.length > 0 && destinationAddress.length < 3 && (
                            <p className="text-xs text-amber-600 mt-1 flex items-center gap-1">
                                <span>âš¡</span> Tapez au moins 3 caractÃ¨res pour rechercher
                            </p>
                        )}

                        {/* Suggestions de destination amÃ©liorÃ©es */}
                        {showDestinationSuggestions && destinationSuggestions.length > 0 && (
                            <div className="absolute top-full left-0 right-0 bg-white border rounded-xl shadow-2xl z-20 max-h-72 overflow-y-auto mt-1">
                                <div className="sticky top-0 bg-gradient-to-r from-red-50 to-orange-50 px-4 py-2.5 border-b flex items-center justify-between">
                                    <span className="text-xs text-gray-600 font-medium">
                                        ðŸŽ¯ {destinationSuggestions.length} rÃ©sultat(s) trouvÃ©(s)
                                    </span>
                                    <span className="text-xs text-gray-400">
                                        SÃ©lectionnez une adresse
                                    </span>
                                </div>
                                {destinationSuggestions.map((suggestion, index) => (
                                    <AddressSuggestionItem
                                        key={index}
                                        suggestion={suggestion}
                                        onClick={() => selectAddressSuggestion(suggestion, false)}
                                    />
                                ))}
                            </div>
                        )}
                        
                        {/* Message quand aucun rÃ©sultat */}
                        {showDestinationSuggestions && destinationSuggestions.length === 0 && destinationSearchQuery.length >= 5 && (
                            <div className="absolute top-full left-0 right-0 bg-white border rounded-xl shadow-xl z-20 mt-1 p-4 text-center">
                                <p className="text-sm text-gray-500">Aucun rÃ©sultat trouvÃ©</p>
                                <p className="text-xs text-gray-400 mt-1">Essayez avec une adresse plus prÃ©cise</p>
                            </div>
                        )}
                    </div>

                    {/* Options de rÃ©servation */}
                    <div className="flex items-center gap-4">
                        <label className="flex items-center gap-2">
                            <input
                                type="checkbox"
                                checked={isScheduled}
                                onChange={(e) => setIsScheduled(e.target.checked)}
                                className="rounded"
                            />
                            <span className="text-sm">RÃ©servation planifiÃ©e</span>
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

            {/* AperÃ§u dÃ©taillÃ© de la destination */}
            {destinationCoords && destinationAddress && (
                <DestinationPreview
                    pickupAddress={pickupAddress}
                    pickupCoords={pickupCoords}
                    destinationAddress={destinationAddress}
                    destinationCoords={destinationCoords}
                    routeInfo={routeInfo}
                    onClear={() => {
                        setDestinationAddress('');
                        setDestinationCoords(null);
                        setRouteInfo(null);
                    }}
                />
            )}

            {/* Informations d'itinÃ©raire compactes */}
            {routeInfo && !destinationCoords && (
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
                                    <div className="text-lg font-bold text-primary-orange-600">
                                        {routeInfo.duration}min
                                    </div>
                                    <div className="text-xs text-gray-600">DurÃ©e</div>
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
                                                    {vehicleInfo.features.slice(0, 2).join(' â€¢ ')}
                                                </div>
                                            </div>
                                        </div>

                                        <div className="text-right">
                                            <div className="text-lg font-bold text-primary-orange-600">
                                                {(option.price?.totalPrice || 0).toLocaleString()} GNF
                                            </div>
                                            {option.price?.appliedMultipliers?.length > 0 && (
                                                <Badge variant="secondary" className="text-xs">
                                                    +{Math.round(((option.price?.surgeMultiplier || 1) - 1) * 100)}%
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

            {/* DÃ©tail du prix sÃ©lectionnÃ© */}
            {priceEstimate && (
                <Card className="bg-white/90 backdrop-blur-sm border-0 shadow-lg">
                    <CardHeader>
                        <CardTitle className="text-lg flex items-center gap-2">
                            <DollarSign className="w-5 h-5 text-primary-orange-600" />
                            DÃ©tail du prix
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                        <div className="flex justify-between">
                            <span>Prix de base</span>
                            <span>{(priceEstimate?.basePrice || 0).toLocaleString()} GNF</span>
                        </div>
                        <div className="flex justify-between">
                            <span>Distance ({routeInfo?.distance}km)</span>
                            <span>{(priceEstimate?.distancePrice || 0).toLocaleString()} GNF</span>
                        </div>
                        <div className="flex justify-between">
                            <span>Temps ({routeInfo?.duration}min)</span>
                            <span>{(priceEstimate?.timePrice || 0).toLocaleString()} GNF</span>
                        </div>

                        {priceEstimate?.appliedMultipliers?.length > 0 && (
                            <>
                                <Separator />
                                {priceEstimate.appliedMultipliers.map((multiplier, index) => (
                                    <div key={index} className="flex justify-between text-sm">
                                        <span className="text-orange-600">{multiplier?.reason || 'Majoration'}</span>
                                        <span className="text-orange-600">
                                            +{Math.round(((multiplier?.multiplier || 1) - 1) * 100)}%
                                        </span>
                                    </div>
                                ))}
                                <div className="flex justify-between text-sm">
                                    <span>Majoration</span>
                                    <span>+{(priceEstimate?.surgeAmount || 0).toLocaleString()} GNF</span>
                                </div>
                            </>
                        )}

                        <div className="flex justify-between text-sm">
                            <span>TVA (18%)</span>
                            <span>{(priceEstimate?.taxes || 0).toLocaleString()} GNF</span>
                        </div>

                        <Separator />
                        <div className="flex justify-between text-lg font-bold">
                            <span>Total</span>
                            <span className="text-primary-orange-600">
                                {(priceEstimate?.totalPrice || 0).toLocaleString()} GNF
                            </span>
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* Bouton de rÃ©servation - ouvre l'Ã©tape de paiement */}
            <Button
                onClick={handleProceedToPayment}
                disabled={!pickupCoords || !destinationCoords || !priceEstimate || bookingInProgress}
                className="w-full h-12 text-lg font-semibold bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
            >
                {bookingInProgress ? (
                    <>
                        <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                        RÃ©servation en cours...
                    </>
                ) : (
                    <>
                        <CreditCard className="w-5 h-5 mr-2" />
                        Choisir le mode de paiement
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
                                            {driver.rating} â€¢ {driver.rides} courses
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
