/**
 * INTERFACE CLIENT TAXI MOTO
 * Interface complète pour les clients
 */

import { useState, useEffect } from 'react';
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { MapPin, Navigation, Clock, DollarSign } from 'lucide-react';
import { useTaxiMoto } from '@/hooks/useTaxiMoto';
import { TaxiMotoService } from '@/services/taxi/TaxiMotoService';
import TaxiMotoPaymentModal from './TaxiMotoPaymentModal';
import { toast } from 'sonner';
import { useAuth } from '@/hooks/useAuth';

export function TaxiMotoClientInterface() {
  const { user } = useAuth();
  const {
    currentRide,
    nearbyDrivers,
    loading,
    findNearbyDrivers,
    createRide,
    cancelRide,
    processPayment
  } = useTaxiMoto();

  const [pickupAddress, setPickupAddress] = useState('');
  const [dropoffAddress, setDropoffAddress] = useState('');
  const [estimatedFare, setEstimatedFare] = useState<any>(null);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [currentLocation, setCurrentLocation] = useState<GeolocationPosition | null>(null);

  // Obtenir la position actuelle
  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setCurrentLocation(position);
          // Charger les chauffeurs à proximité
          findNearbyDrivers(
            position.coords.latitude,
            position.coords.longitude,
            5
          );
        },
        (error) => {
          console.error('Geolocation error:', error);
          toast.error('Impossible d\'obtenir votre position');
        }
      );
    }
  }, [findNearbyDrivers]);

  // Calculer le tarif estimé
  const handleCalculateFare = async () => {
    if (!pickupAddress || !dropoffAddress) {
      toast.error('Veuillez renseigner les adresses');
      return;
    }

    try {
      // Simulation : calculer distance (en réalité utiliser une API de routing)
      const distanceKm = 5; // À remplacer par vraie distance
      const durationMin = 15; // À remplacer par vraie durée

      const fare = await TaxiMotoService.calculateFare(distanceKm, durationMin);
      setEstimatedFare(fare);
      toast.success('Tarif calculé');
    } catch (error) {
      console.error('Error calculating fare:', error);
      toast.error('Erreur lors du calcul du tarif');
    }
  };

  // Créer une demande de course
  const handleRequestRide = async () => {
    if (!currentLocation || !estimatedFare) {
      toast.error('Veuillez d\'abord calculer le tarif');
      return;
    }

    try {
      // Simulation coordonnées (en réalité utiliser geocoding)
      const pickupLat = currentLocation.coords.latitude;
      const pickupLng = currentLocation.coords.longitude;
      const dropoffLat = pickupLat + 0.05; // Simulation
      const dropoffLng = pickupLng + 0.05; // Simulation

      await createRide({
        pickupLat,
        pickupLng,
        pickupAddress,
        dropoffLat,
        dropoffLng,
        dropoffAddress,
        distanceKm: 5, // À remplacer
        durationMin: 15, // À remplacer
        estimatedPrice: estimatedFare.total
      });

      toast.success('Course demandée avec succès!');
    } catch (error) {
      console.error('Error requesting ride:', error);
    }
  };

  // Annuler la course
  const handleCancelRide = async () => {
    if (!currentRide) return;

    const confirmed = window.confirm('Voulez-vous vraiment annuler cette course?');
    if (!confirmed) return;

    try {
      await cancelRide(currentRide.id, 'Annulation client');
    } catch (error) {
      console.error('Error cancelling ride:', error);
    }
  };

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">🏍️ Taxi Moto</h1>
        <div className="flex items-center gap-2 text-sm">
          <Navigation className="w-4 h-4" />
          <span>{nearbyDrivers.length} chauffeurs disponibles</span>
        </div>
      </div>

      {/* Course en cours */}
      {currentRide && (
        <Card className="p-6 bg-primary/10 border-primary">
          <h2 className="text-xl font-semibold mb-4">Course en cours</h2>
          <div className="space-y-3">
            <div className="flex justify-between">
              <span className="font-medium">Code:</span>
              <span className="font-mono">{(currentRide as any).ride_code || currentRide.id.slice(0, 8)}</span>
            </div>
            <div className="flex justify-between">
              <span className="font-medium">Statut:</span>
              <span className="px-3 py-1 bg-primary text-primary-foreground rounded-full text-sm">
                {currentRide.status}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="font-medium">Montant:</span>
              <span className="text-lg font-bold">{(currentRide as any).estimated_price || (currentRide as any).price_total || 0} GNF</span>
            </div>
            
            <div className="flex gap-2 mt-4">
              {currentRide.status === 'requested' && (
                <Button onClick={handleCancelRide} variant="destructive" className="flex-1">
                  Annuler
                </Button>
              )}
              {currentRide.status === 'completed' && currentRide.payment_status === 'pending' && (
                <Button onClick={() => setShowPaymentModal(true)} className="flex-1">
                  Payer maintenant
                </Button>
              )}
            </div>
          </div>
        </Card>
      )}

      {/* Demande de course */}
      {!currentRide && (
        <Card className="p-6">
          <h2 className="text-xl font-semibold mb-4">Nouvelle course</h2>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium mb-2 flex items-center gap-2">
                <MapPin className="w-4 h-4" />
                Point de départ
              </label>
              <Input
                value={pickupAddress}
                onChange={(e) => setPickupAddress(e.target.value)}
                placeholder="Adresse de départ"
              />
            </div>

            <div>
              <label className="text-sm font-medium mb-2 flex items-center gap-2">
                <MapPin className="w-4 h-4 text-destructive" />
                Destination
              </label>
              <Input
                value={dropoffAddress}
                onChange={(e) => setDropoffAddress(e.target.value)}
                placeholder="Adresse d'arrivée"
              />
            </div>

            {estimatedFare && (
              <Card className="p-4 bg-muted">
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span>Distance estimée:</span>
                    <span className="font-semibold">5 km</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Durée estimée:</span>
                    <span className="font-semibold">15 min</span>
                  </div>
                  <div className="flex justify-between text-lg font-bold pt-2 border-t">
                    <span>Total:</span>
                    <span>{estimatedFare.total} GNF</span>
                  </div>
                </div>
              </Card>
            )}

            <div className="flex gap-2">
              <Button onClick={handleCalculateFare} variant="outline" className="flex-1">
                <DollarSign className="w-4 h-4 mr-2" />
                Calculer le tarif
              </Button>
              {estimatedFare && (
                <Button onClick={handleRequestRide} disabled={loading} className="flex-1">
                  {loading ? 'Recherche...' : 'Demander une course'}
                </Button>
              )}
            </div>
          </div>
        </Card>
      )}

      {/* Chauffeurs à proximité */}
      {nearbyDrivers.length > 0 && (
        <Card className="p-6">
          <h2 className="text-xl font-semibold mb-4">Chauffeurs à proximité</h2>
          <div className="space-y-3">
            {nearbyDrivers.slice(0, 5).map((driver) => (
              <div
                key={driver.id}
                className="flex justify-between items-center p-3 rounded-lg bg-muted"
              >
                <div>
                  <p className="font-medium">{driver.full_name}</p>
                  <p className="text-sm text-muted-foreground">
                    {driver.vehicle_brand} {driver.vehicle_model}
                  </p>
                </div>
                <div className="text-right">
                  <p className="font-semibold">{driver.distance_km.toFixed(1)} km</p>
                  <p className="text-sm text-muted-foreground">
                    ⭐ {driver.rating.toFixed(1)} ({driver.total_trips} courses)
                  </p>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Modal de paiement */}
      {currentRide && user && (
        <TaxiMotoPaymentModal
          open={showPaymentModal}
          onClose={() => setShowPaymentModal(false)}
          rideId={currentRide.id}
          customerId={user.id}
          driverId={(currentRide as any).driver_id || ''}
          amount={(currentRide as any).estimated_price || (currentRide as any).price_total || 0}
          onPaymentSuccess={() => {
            setShowPaymentModal(false);
            toast.success('Paiement effectué!');
          }}
        />
      )}
    </div>
  );
}
