/**
 * 📝 FORMULAIRE DE DEMANDE DE LIVRAISON - 224SOLUTIONS
 * Interface pour créer une demande de livraison
 */

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { MapPin, Package, Clock, DollarSign, Navigation } from 'lucide-react';
import useGeolocation from '../../hooks/useGeolocation';
import DeliveryMap from './DeliveryMap';
import { Position } from '../../services/geolocation/GeolocationService';
import GeolocationService from '../../services/geolocation/GeolocationService';
import { DeliveryService } from '../../services/delivery/DeliveryService';

interface DeliveryRequestFormProps {
    onRequestCreated?: (requestId: string) => void;
    onCancel?: () => void;
}

const DeliveryRequestForm: React.FC<DeliveryRequestFormProps> = ({
    onRequestCreated,
    onCancel
}) => {
    const [pickupAddress, setPickupAddress] = useState('');
    const [deliveryAddress, setDeliveryAddress] = useState('');
    const [notes, setNotes] = useState('');
    const [pickupPosition, setPickupPosition] = useState<Position | null>(null);
    const [deliveryPosition, setDeliveryPosition] = useState<Position | null>(null);
    const [isCalculating, setIsCalculating] = useState(false);
    const [estimatedPrice, setEstimatedPrice] = useState(0);
    const [estimatedDistance, setEstimatedDistance] = useState(0);
    const [estimatedTime, setEstimatedTime] = useState(0);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const geolocation = useGeolocation();
    const deliveryService = DeliveryService.getInstance();

    // Obtenir la position actuelle au chargement
    useEffect(() => {
        geolocation.getCurrentLocation().then((loc) => {
            const pos = { latitude: loc.latitude, longitude: loc.longitude, timestamp: loc.timestamp };
            setPickupPosition(pos);
        }).catch((error) => {
            console.error('Erreur géolocalisation:', error);
        });
    }, []);

    // Calculer distance et prix
    const calculatePriceAndTime = () => {
        if (pickupPosition && deliveryPosition) {
            const distance = GeolocationService.getInstance().calculateDistance(pickupPosition, deliveryPosition);
            const distanceKm = distance / 1000;
            
            const basePrice = 5000;
            const pricePerKm = 1000;
            const price = Math.round(basePrice + (distanceKm * pricePerKm));
            
            const time = Math.ceil(distanceKm * 3);
            
            setEstimatedPrice(price);
            setEstimatedTime(time);
        }
    };

    // Calculer les estimations quand les positions changent
    useEffect(() => {
        if (pickupPosition && deliveryPosition) {
            calculateEstimations();
        }
    }, [pickupPosition, deliveryPosition]);

    // Calculer les estimations
    const calculateEstimations = async () => {
        if (!pickupPosition || !deliveryPosition) return;

        setIsCalculating(true);
        try {
            const distance = calculateDistance(pickupPosition, deliveryPosition);
            const distanceKm = distance / 1000;

            // Calculer le prix (500 GNF de base + 100 GNF par km)
            const basePrice = 500 + (distanceKm * 100);
            const fees = Math.round(basePrice * 0.01); // 1% de frais
            const totalPrice = basePrice + fees;

            // Calculer le temps estimé (2 minutes par km)
            const estimatedTimeMinutes = Math.ceil(distanceKm * 2);

            setEstimatedDistance(distance);
            setEstimatedPrice(totalPrice);
            setEstimatedTime(estimatedTimeMinutes);
        } catch (error) {
            console.error('Erreur calcul estimations:', error);
        } finally {
            setIsCalculating(false);
        }
    };

    // Utiliser la position actuelle comme point de départ
    const useCurrentLocation = async () => {
        try {
            const position = await getCurrentPosition();
            setPickupPosition(position);

            const address = await getAddressFromCoordinates(position);
            setPickupAddress(address);
        } catch (error) {
            console.error('Erreur position actuelle:', error);
        }
    };

    // Rechercher l'adresse de départ
    const searchPickupAddress = async () => {
        if (!pickupAddress.trim()) return;

        try {
            const position = await getCoordinatesFromAddress(pickupAddress);
            if (position) {
                setPickupPosition(position);
            }
        } catch (error) {
            console.error('Erreur recherche adresse départ:', error);
        }
    };

    // Rechercher l'adresse de destination
    const searchDeliveryAddress = async () => {
        if (!deliveryAddress.trim()) return;

        try {
            const position = await getCoordinatesFromAddress(deliveryAddress);
            if (position) {
                setDeliveryPosition(position);
            }
        } catch (error) {
            console.error('Erreur recherche adresse destination:', error);
        }
    };

    // Soumettre la demande
    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!pickupPosition || !deliveryPosition) {
            alert('Veuillez sélectionner les adresses de départ et de destination');
            return;
        }

        setIsSubmitting(true);
        try {
            const request = await deliveryService.createDeliveryRequest(
                'current_user', // À remplacer par l'ID utilisateur réel
                pickupAddress,
                deliveryAddress,
                pickupPosition,
                deliveryPosition,
                notes
            );

            console.log('🚚 Demande de livraison créée:', request.id);

            if (onRequestCreated) {
                onRequestCreated(request.id);
            }
        } catch (error) {
            console.error('Erreur création demande:', error);
            alert('Erreur lors de la création de la demande');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="max-w-4xl mx-auto p-6 space-y-6">
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Package className="w-5 h-5 text-blue-600" />
                        Nouvelle demande de livraison
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <form onSubmit={handleSubmit} className="space-y-6">
                        {/* Point de départ */}
                        <div className="space-y-2">
                            <Label htmlFor="pickup-address" className="flex items-center gap-2">
                                <MapPin className="w-4 h-4 text-blue-600" />
                                Point de départ *
                            </Label>
                            <div className="flex gap-2">
                                <Input
                                    id="pickup-address"
                                    value={pickupAddress}
                                    onChange={(e) => setPickupAddress(e.target.value)}
                                    placeholder="Adresse de départ"
                                    className="flex-1"
                                    required
                                />
                                <Button
                                    type="button"
                                    variant="outline"
                                    onClick={searchPickupAddress}
                                    disabled={!pickupAddress.trim()}
                                >
                                    <Navigation className="w-4 h-4" />
                                </Button>
                                <Button
                                    type="button"
                                    variant="outline"
                                    onClick={useCurrentLocation}
                                    disabled={!currentPosition}
                                >
                                    Ma position
                                </Button>
                            </div>
                        </div>

                        {/* Point de destination */}
                        <div className="space-y-2">
                            <Label htmlFor="delivery-address" className="flex items-center gap-2">
                                <MapPin className="w-4 h-4 text-green-600" />
                                Destination *
                            </Label>
                            <div className="flex gap-2">
                                <Input
                                    id="delivery-address"
                                    value={deliveryAddress}
                                    onChange={(e) => setDeliveryAddress(e.target.value)}
                                    placeholder="Adresse de destination"
                                    className="flex-1"
                                    required
                                />
                                <Button
                                    type="button"
                                    variant="outline"
                                    onClick={searchDeliveryAddress}
                                    disabled={!deliveryAddress.trim()}
                                >
                                    <Navigation className="w-4 h-4" />
                                </Button>
                            </div>
                        </div>

                        {/* Notes */}
                        <div className="space-y-2">
                            <Label htmlFor="notes">Notes (optionnel)</Label>
                            <Textarea
                                id="notes"
                                value={notes}
                                onChange={(e) => setNotes(e.target.value)}
                                placeholder="Instructions spéciales pour le livreur..."
                                rows={3}
                            />
                        </div>

                        {/* Carte */}
                        {(pickupPosition || deliveryPosition) && (
                            <div className="space-y-2">
                                <Label>Carte</Label>
                                <DeliveryMap
                                    center={pickupPosition || deliveryPosition!}
                                    deliveryRequest={
                                        pickupPosition && deliveryPosition
                                            ? {
                                                id: 'temp',
                                                clientId: 'current_user',
                                                clientName: 'Client',
                                                clientPhone: '+224 XXX XX XX XX',
                                                pickupAddress,
                                                deliveryAddress,
                                                pickupPosition,
                                                deliveryPosition,
                                                distance: estimatedDistance,
                                                estimatedTime,
                                                price: estimatedPrice - Math.round(estimatedPrice * 0.01),
                                                fees: Math.round(estimatedPrice * 0.01),
                                                totalPrice: estimatedPrice,
                                                status: 'pending',
                                                createdAt: Date.now()
                                            }
                                            : undefined
                                    }
                                    showRoute={!!(pickupPosition && deliveryPosition)}
                                    height="300px"
                                    className="border rounded-lg"
                                />
                            </div>
                        )}

                        {/* Estimations */}
                        {isCalculating ? (
                            <div className="flex items-center justify-center p-4">
                                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-500 mr-2"></div>
                                <span className="text-sm text-gray-600">Calcul en cours...</span>
                            </div>
                        ) : estimatedPrice > 0 && (
                            <Card className="bg-gray-50">
                                <CardContent className="p-4">
                                    <div className="grid grid-cols-3 gap-4 text-center">
                                        <div>
                                            <div className="flex items-center justify-center mb-1">
                                                <Navigation className="w-4 h-4 text-blue-600 mr-1" />
                                                <span className="text-sm font-medium text-gray-600">Distance</span>
                                            </div>
                                            <p className="text-lg font-semibold text-gray-800">
                                                {Math.round(estimatedDistance / 1000 * 10) / 10} km
                                            </p>
                                        </div>
                                        <div>
                                            <div className="flex items-center justify-center mb-1">
                                                <Clock className="w-4 h-4 text-orange-600 mr-1" />
                                                <span className="text-sm font-medium text-gray-600">Temps</span>
                                            </div>
                                            <p className="text-lg font-semibold text-gray-800">
                                                {estimatedTime} min
                                            </p>
                                        </div>
                                        <div>
                                            <div className="flex items-center justify-center mb-1">
                                                <DollarSign className="w-4 h-4 text-green-600 mr-1" />
                                                <span className="text-sm font-medium text-gray-600">Prix total</span>
                                            </div>
                                            <p className="text-lg font-semibold text-gray-800">
                                                {estimatedPrice} GNF
                                            </p>
                                            <p className="text-xs text-gray-500">
                                                (inclut 1% de frais)
                                            </p>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        )}

                        {/* Erreurs */}
                        {geolocationError && (
                            <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                                <p className="text-sm text-red-600">
                                    Erreur géolocalisation: {geolocationError}
                                </p>
                            </div>
                        )}

                        {/* Boutons d'action */}
                        <div className="flex gap-3 pt-4">
                            <Button
                                type="button"
                                variant="outline"
                                onClick={onCancel}
                                disabled={isSubmitting}
                                className="flex-1"
                            >
                                Annuler
                            </Button>
                            <Button
                                type="submit"
                                disabled={!pickupPosition || !deliveryPosition || isSubmitting}
                                className="flex-1 bg-blue-600 hover:bg-blue-700"
                            >
                                {isSubmitting ? (
                                    <>
                                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                                        Création...
                                    </>
                                ) : (
                                    <>
                                        <Package className="w-4 h-4 mr-2" />
                                        Créer la demande
                                    </>
                                )}
                            </Button>
                        </div>
                    </form>
                </CardContent>
            </Card>
        </div>
    );
};

export default DeliveryRequestForm;
