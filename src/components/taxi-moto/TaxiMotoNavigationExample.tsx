/**
 * 🚕 NAVIGATION TAXI-MOTO AVEC GPS INTELLIGENT - 224SOLUTIONS
 * Composant d'exemple intégrant le système de navigation complet
 */

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { 
  Navigation, 
  MapPin, 
  Search, 
  Loader2, 
  CheckCircle,
  AlertCircle,
  Clock,
  Route as RouteIcon
} from 'lucide-react';
import { NavigationMap } from '@/components/navigation/NavigationMap';
import { useNavigation } from '@/hooks/useNavigation';
import { toast } from 'sonner';

interface TaxiMotoNavigationExampleProps {
  initialPickup?: string;
  initialDestination?: string;
}

export const TaxiMotoNavigationExample: React.FC<TaxiMotoNavigationExampleProps> = ({
  initialPickup,
  initialDestination
}) => {
  // États du formulaire
  const [pickupAddress, setPickupAddress] = useState(initialPickup || '');
  const [destinationAddress, setDestinationAddress] = useState(initialDestination || '');
  const [useGPS, setUseGPS] = useState(true);

  // Hook navigation
  const {
    isNavigating,
    isLoading,
    error,
    currentPosition,
    navigationState,
    route,
    startNavigation,
    stopNavigation,
    getCurrentLocation,
    searchLocation,
    formatDistance,
    formatDuration
  } = useNavigation({
    enableVoice: true,
    onNavigationEnd: () => {
      toast.success('🎉 Navigation terminée!');
    },
    onOffRoute: () => {
      toast.warning('⚠️ Vous êtes hors de la route');
    },
    onStepChange: (stepIndex) => {
      console.log(`Étape ${stepIndex + 1}`);
    }
  });

  /**
   * 📍 Détecter position GPS automatiquement au chargement
   */
  useEffect(() => {
    if (useGPS && !currentPosition) {
      detectCurrentPosition();
    }
  }, [useGPS]);

  /**
   * 📍 Détecter position actuelle
   */
  const detectCurrentPosition = async () => {
    try {
      const position = await getCurrentLocation();
      toast.success(`📍 Position détectée: ${position.latitude.toFixed(6)}, ${position.longitude.toFixed(6)}`);
      setPickupAddress('Position actuelle (GPS)');
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  /**
   * 🗺️ Rechercher un lieu
   */
  const handleSearchLocation = async (address: string, isPickup: boolean) => {
    if (!address.trim()) return;

    try {
      const results = await searchLocation(address);
      
      if (results.length > 0) {
        const pos = results[0];
        console.log(`✅ Lieu trouvé: ${address} → ${pos.latitude.toFixed(6)}, ${pos.longitude.toFixed(6)}`);
      }
    } catch (err) {
      console.error('Erreur recherche:', err);
    }
  };

  /**
   * 🚀 Lancer la navigation
   */
  const handleStartNavigation = async () => {
    if (!destinationAddress.trim()) {
      toast.error('Veuillez entrer une destination');
      return;
    }

    try {
      // Si useGPS est activé, on utilise la position GPS actuelle
      // Sinon on utilise l'adresse de départ saisie
      await startNavigation(
        useGPS ? undefined : pickupAddress,
        destinationAddress
      );
    } catch (err) {
      console.error('Erreur démarrage navigation:', err);
    }
  };

  return (
    <div className="space-y-6">
      {/* Formulaire de navigation */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Navigation className="h-5 w-5 text-primary" />
            Navigation GPS Intelligente
          </CardTitle>
          <CardDescription>
            Système de navigation avec détection automatique et guidage étape par étape
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Position GPS actuelle */}
          <div className="p-4 bg-primary/5 border border-primary/20 rounded-lg space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <MapPin className="h-4 w-4 text-primary" />
                <span className="font-medium">Position GPS</span>
              </div>
              {currentPosition && (
                <Badge variant="outline" className="text-xs">
                  ±{currentPosition.accuracy.toFixed(0)}m
                </Badge>
              )}
            </div>

            {currentPosition ? (
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">
                  📍 {currentPosition.latitude.toFixed(6)}, {currentPosition.longitude.toFixed(6)}
                </p>
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <CheckCircle className="h-3 w-3 text-green-500" />
                  Position détectée avec succès
                </div>
              </div>
            ) : (
              <Button
                onClick={detectCurrentPosition}
                variant="outline"
                size="sm"
                disabled={isLoading}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Détection...
                  </>
                ) : (
                  <>
                    <MapPin className="h-4 w-4 mr-2" />
                    Détecter ma position
                  </>
                )}
              </Button>
            )}
          </div>

          {/* Point de départ */}
          <div className="space-y-2">
            <Label htmlFor="pickup">Point de départ</Label>
            <div className="flex gap-2">
              <div className="flex-1 relative">
                <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="pickup"
                  placeholder="Ex: Coyah Centre, Kipé, Manéah..."
                  value={pickupAddress}
                  onChange={(e) => setPickupAddress(e.target.value)}
                  onBlur={() => pickupAddress && handleSearchLocation(pickupAddress, true)}
                  disabled={useGPS}
                  className="pl-10"
                />
              </div>
              <Button
                variant={useGPS ? 'default' : 'outline'}
                size="icon"
                onClick={() => setUseGPS(!useGPS)}
                title={useGPS ? 'Utiliser position GPS' : 'Saisir adresse'}
              >
                {useGPS ? <Navigation className="h-4 w-4" /> : <Search className="h-4 w-4" />}
              </Button>
            </div>
            {useGPS && (
              <p className="text-xs text-muted-foreground">
                🧭 Position GPS actuelle utilisée automatiquement
              </p>
            )}
          </div>

          {/* Destination */}
          <div className="space-y-2">
            <Label htmlFor="destination">Destination *</Label>
            <div className="relative">
              <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-destructive" />
              <Input
                id="destination"
                placeholder="Ex: Manéah, Taouyah, Kipé, Aéroport Conakry..."
                value={destinationAddress}
                onChange={(e) => setDestinationAddress(e.target.value)}
                onBlur={() => destinationAddress && handleSearchLocation(destinationAddress, false)}
                className="pl-10"
              />
            </div>
          </div>

          {/* Suggestions lieux populaires */}
          <div className="space-y-2">
            <Label className="text-xs text-muted-foreground">Destinations populaires</Label>
            <div className="flex flex-wrap gap-2">
              {[
                'Manéah',
                'Kipé',
                'Taouyah',
                'Coyah',
                'Matoto',
                'Hamdallaye',
                'Aéroport Conakry',
                'Bambeto'
              ].map((place) => (
                <Button
                  key={place}
                  variant="outline"
                  size="sm"
                  onClick={() => setDestinationAddress(place)}
                  className="text-xs"
                >
                  {place}
                </Button>
              ))}
            </div>
          </div>

          {/* Informations itinéraire */}
          {route && (
            <div className="p-4 bg-muted/50 rounded-lg space-y-3">
              <div className="flex items-center gap-2 font-medium">
                <RouteIcon className="h-4 w-4 text-primary" />
                Itinéraire calculé
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground">Distance</p>
                  <p className="font-semibold">{formatDistance(route.distance * 1000)}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground">Durée estimée</p>
                  <p className="font-semibold">{formatDuration(route.duration * 60)}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground">Étapes</p>
                  <p className="font-semibold">{route.steps.length}</p>
                </div>
              </div>
            </div>
          )}

          {/* Erreur */}
          {error && (
            <div className="p-4 bg-destructive/10 border border-destructive/20 rounded-lg flex items-start gap-3">
              <AlertCircle className="h-5 w-5 text-destructive flex-shrink-0 mt-0.5" />
              <div className="space-y-1 flex-1">
                <p className="font-medium text-destructive">Erreur</p>
                <p className="text-sm text-destructive/80">{error}</p>
              </div>
            </div>
          )}

          {/* Boutons d'action */}
          <div className="flex gap-3 pt-4">
            {!isNavigating ? (
              <Button
                onClick={handleStartNavigation}
                disabled={!destinationAddress || isLoading}
                className="flex-1"
                size="lg"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                    Initialisation...
                  </>
                ) : (
                  <>
                    <Navigation className="h-5 w-5 mr-2" />
                    Démarrer la navigation
                  </>
                )}
              </Button>
            ) : (
              <Button
                onClick={stopNavigation}
                variant="destructive"
                className="flex-1"
                size="lg"
              >
                Arrêter la navigation
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Carte de navigation */}
      {isNavigating && (
        <NavigationMap
          startAddress={useGPS ? undefined : pickupAddress}
          endAddress={destinationAddress}
          onNavigationEnd={() => {
            stopNavigation();
            toast.success('Navigation terminée');
          }}
        />
      )}

      {/* État actuel de navigation */}
      {navigationState && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">État de navigation</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Prochaine instruction */}
            <div className="p-4 bg-primary/5 border border-primary/20 rounded-lg">
              <p className="text-sm text-muted-foreground mb-2">
                Dans {formatDistance(navigationState.distanceToNextStep)}
              </p>
              <p className="font-semibold text-lg">
                {navigationState.nextInstruction}
              </p>
            </div>

            {/* Statistiques */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground">Distance restante</p>
                <p className="font-semibold">{formatDistance(navigationState.distanceRemaining)}</p>
              </div>
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground">Temps restant</p>
                <p className="font-semibold">{formatDuration(navigationState.timeRemaining)}</p>
              </div>
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground">Étape actuelle</p>
                <p className="font-semibold">
                  {navigationState.currentStep + 1} / {route?.steps.length || 0}
                </p>
              </div>
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground">Précision GPS</p>
                <p className="font-semibold">±{navigationState.currentPosition.accuracy.toFixed(0)}m</p>
              </div>
            </div>

            {/* Alerte hors route */}
            {navigationState.isOffRoute && (
              <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-lg flex items-center gap-2">
                <AlertCircle className="h-4 w-4 text-destructive" />
                <span className="text-sm font-medium text-destructive">
                  Hors route - Recalcul automatique...
                </span>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default TaxiMotoNavigationExample;
