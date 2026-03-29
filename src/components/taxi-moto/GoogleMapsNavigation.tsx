import { useEffect, useRef, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Navigation, Phone, Clock, MapPin, ArrowRight, Maximize2, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

declare global {
  interface Window {
    google: any;
    initMap: () => void;
  }
}

interface Coordinates {
  latitude: number;
  longitude: number;
}

interface Location {
  address: string;
  coords: Coordinates;
}

interface ActiveRide {
  id: string;
  customerId: string;
  customerName: string;
  customerPhone: string;
  pickup: Location;
  destination: Location;
  status: 'accepted' | 'arriving' | 'arrived' | 'picked_up' | 'in_progress' | 'completed';
  estimatedPrice: number;
  estimatedEarnings: number;
  requestedAt: string;
}

interface GoogleMapsNavigationProps {
  activeRide: ActiveRide | null;
  currentLocation: Coordinates | null;
  onContactCustomer?: (phone: string) => void;
}

export function GoogleMapsNavigation({ 
  activeRide, 
  currentLocation, 
  onContactCustomer 
}: GoogleMapsNavigationProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstance = useRef<any>(null);
  const directionsService = useRef<any>(null);
  const directionsRenderer = useRef<any>(null);
  const driverMarker = useRef<any>(null);
  const [routeInfo, setRouteInfo] = useState<{
    distance: number;
    duration: number;
  } | null>(null);
  const [mapLoaded, setMapLoaded] = useState(false);
  const [apiKey, setApiKey] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const mapInitialized = useRef(false);
  const lastCleanupLog = useRef(0);

  // RÃ©cupÃ©rer la clÃ© API Google Maps depuis le backend
  useEffect(() => {
    const fetchApiKey = async () => {
      try {
        const { data, error } = await supabase.functions.invoke('google-maps-config');
        
        if (error) throw error;
        
        if (data?.apiKey) {
          setApiKey(data.apiKey);
        } else {
          toast.error('ClÃ© Google Maps non configurÃ©e');
        }
      } catch (error) {
        console.error('Erreur rÃ©cupÃ©ration clÃ© API:', error);
        toast.error('Impossible de charger Google Maps');
      } finally {
        setLoading(false);
      }
    };

    fetchApiKey();
  }, []);

  // Charger Google Maps API avec la vraie clÃ©
  useEffect(() => {
    if (!apiKey) return;

    if (window.google && window.google.maps) {
      setMapLoaded(true);
      return;
    }

    const script = document.createElement('script');
    script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places`;
    script.async = true;
    script.defer = true;
    script.onload = () => {
      setMapLoaded(true);
      toast.success('Google Maps chargÃ©');
    };
    script.onerror = () => {
      toast.error('Erreur de chargement de Google Maps');
    };
    document.head.appendChild(script);

    return () => {
      const existingScript = document.querySelector(`script[src*="maps.googleapis.com"]`);
      if (existingScript) {
        existingScript.remove();
      }
    };
  }, [apiKey]);

  // Initialiser la carte (une seule fois)
  useEffect(() => {
    if (!mapLoaded || !mapRef.current || !window.google || mapInitialized.current) return;

    const center = currentLocation 
      ? { lat: currentLocation.latitude, lng: currentLocation.longitude }
      : { lat: 9.5, lng: -13.7 }; // Conakry par dÃ©faut

    mapInstance.current = new window.google.maps.Map(mapRef.current, {
      center,
      zoom: 14,
      mapTypeControl: true,
      fullscreenControl: true,
      streetViewControl: false,
      styles: [
        {
          featureType: 'poi',
          elementType: 'labels',
          stylers: [{ visibility: 'off' }]
        }
      ]
    });

    directionsService.current = new window.google.maps.DirectionsService();
    directionsRenderer.current = new window.google.maps.DirectionsRenderer({
      map: mapInstance.current,
      suppressMarkers: false,
      polylineOptions: {
        strokeColor: '#3B82F6',
        strokeWeight: 5,
        strokeOpacity: 0.8
      }
    });

    // Ajouter le marqueur du chauffeur immÃ©diatement
    if (currentLocation) {
      driverMarker.current = new window.google.maps.Marker({
        position: center,
        map: mapInstance.current,
        title: 'Ma position',
        icon: {
          path: window.google.maps.SymbolPath.CIRCLE,
          scale: 12,
          fillColor: '#3B82F6',
          fillOpacity: 1,
          strokeColor: '#FFFFFF',
          strokeWeight: 3
        },
        animation: window.google.maps.Animation.DROP
      });
    }

    mapInitialized.current = true;
    toast.success('Carte initialisÃ©e');
  }, [mapLoaded, currentLocation]);

  // Mettre Ã  jour la position du chauffeur
  useEffect(() => {
    if (!mapLoaded || !mapInstance.current || !currentLocation || !window.google) return;

    const position = {
      lat: currentLocation.latitude,
      lng: currentLocation.longitude
    };

    if (!driverMarker.current) {
      driverMarker.current = new window.google.maps.Marker({
        position,
        map: mapInstance.current,
        title: 'Ma position',
        icon: {
          path: window.google.maps.SymbolPath.CIRCLE,
          scale: 12,
          fillColor: '#3B82F6',
          fillOpacity: 1,
          strokeColor: '#FFFFFF',
          strokeWeight: 3
        },
        animation: window.google.maps.Animation.DROP
      });
    } else {
      driverMarker.current.setPosition(position);
    }

    // Centrer la carte sur la position du chauffeur
    mapInstance.current.setCenter(position);
  }, [mapLoaded, currentLocation]);

  // Tracer la route quand il y a une course active
  useEffect(() => {
    if (!mapLoaded || !directionsRenderer.current) return;

    // Si pas de course active, nettoyer la carte (log limitÃ©)
    if (!activeRide) {
      const now = Date.now();
      if (now - lastCleanupLog.current > 30000) { // Log max toutes les 30 secondes
        console.log('ðŸ§¹ Nettoyage de la carte - pas de course active');
        lastCleanupLog.current = now;
      }
      directionsRenderer.current.setDirections({ routes: [] });
      setRouteInfo(null);
      return;
    }

    // Si pas de position ou de service, ne rien faire
    if (!directionsService.current || !currentLocation) return;

    const target = activeRide.status === 'accepted' || activeRide.status === 'arriving'
      ? activeRide.pickup.coords
      : activeRide.destination.coords;

    const origin = {
      lat: currentLocation.latitude,
      lng: currentLocation.longitude
    };

    const destination = {
      lat: target.latitude,
      lng: target.longitude
    };

    const request = {
      origin,
      destination,
      travelMode: window.google.maps.TravelMode.DRIVING,
      optimizeWaypoints: true
    };

    console.log('ðŸ—ºï¸ Calcul de la route:', { origin, destination });

    directionsService.current.route(request, (result: any, status: any) => {
      if (status === window.google.maps.DirectionsStatus.OK) {
        directionsRenderer.current.setDirections(result);

        const route = result.routes[0];
        const leg = route.legs[0];

        const distanceKm = leg.distance.value / 1000;
        const durationMin = Math.ceil(leg.duration.value / 60);

        setRouteInfo({
          distance: distanceKm,
          duration: durationMin
        });

        console.log('âœ… Route calculÃ©e:', { distanceKm, durationMin });
      } else {
        console.error('âŒ Erreur calcul route:', status);
        toast.error('Impossible de calculer la route');
      }
    });
  }, [mapLoaded, activeRide, currentLocation]);

  // Sauvegarder la position en temps rÃ©el dans la base de donnÃ©es
  useEffect(() => {
    if (!activeRide || !currentLocation) return;

    const saveLocation = async () => {
      try {
        const { error } = await supabase
          .from('taxi_ride_tracking')
          .insert({
            ride_id: activeRide.id,
            latitude: currentLocation.latitude,
            longitude: currentLocation.longitude
          });

        if (error) {
          console.error('Erreur sauvegarde position:', error);
        }
      } catch (err) {
        console.error('Erreur:', err);
      }
    };

    // Sauvegarder toutes les 10 secondes
    const interval = setInterval(saveLocation, 10000);
    return () => clearInterval(interval);
  }, [activeRide, currentLocation]);

  const toggleFullscreen = () => {
    if (mapRef.current) {
      if (document.fullscreenElement) {
        document.exitFullscreen();
      } else {
        mapRef.current.requestFullscreen?.();
      }
    }
  };

  const openGoogleMapsExternal = () => {
    if (!currentLocation) {
      toast.error("Position GPS non disponible");
      return;
    }

    // Si course active, naviguer vers la destination appropriÃ©e
    if (activeRide) {
      const target = activeRide.status === 'accepted' || activeRide.status === 'arriving'
        ? activeRide.pickup.coords
        : activeRide.destination.coords;

      const origin = `${currentLocation.latitude},${currentLocation.longitude}`;
      const destination = `${target.latitude},${target.longitude}`;
      const mapsUrl = `https://www.google.com/maps/dir/?api=1&origin=${origin}&destination=${destination}&travelmode=driving`;
      
      window.open(mapsUrl, '_blank', 'noopener,noreferrer');
      toast.success("Navigation ouverte dans Google Maps");
    } else {
      // Sans course active, ouvrir Google Maps centrÃ© sur la position actuelle
      const mapsUrl = `https://www.google.com/maps/@${currentLocation.latitude},${currentLocation.longitude},15z`;
      window.open(mapsUrl, '_blank', 'noopener,noreferrer');
      toast.success("Google Maps ouvert sur votre position");
    }
  };

  if (loading) {
    return (
      <Card className="bg-white/95 backdrop-blur-sm shadow-lg">
        <CardContent className="pt-12 pb-12 text-center">
          <Loader2 className="w-16 h-16 mx-auto mb-4 text-blue-500 animate-spin" />
          <h3 className="text-lg font-semibold text-gray-600 mb-2">
            Chargement de la carte...
          </h3>
        </CardContent>
      </Card>
    );
  }

  const showMap = mapLoaded && currentLocation;
  const hasActiveRide = !!activeRide;

  return (
    <div className="space-y-4">
      {/* Carte Google Maps - AffichÃ©e toujours */}
      <Card className="overflow-hidden">
        <CardHeader className="pb-3 bg-gradient-to-r from-blue-50 to-indigo-50">
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Navigation className="w-5 h-5 text-blue-600" />
              <span className="text-lg">Navigation GPS</span>
            </div>
            <div className="flex items-center gap-2">
              {hasActiveRide && (
                <Badge className="bg-blue-600 text-white">
                  {activeRide!.status === 'accepted' || activeRide!.status === 'arriving' 
                    ? "RÃ©cupÃ©ration du client" 
                    : "En direction de la destination"}
                </Badge>
              )}
              <Button
                variant="ghost"
                size="sm"
                onClick={toggleFullscreen}
                className="p-2"
              >
                <Maximize2 className="w-4 h-4" />
              </Button>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0 relative">
          {!showMap ? (
            <div className="w-full h-[400px] flex items-center justify-center bg-gray-100">
              <div className="text-center">
                <Loader2 className="w-12 h-12 mx-auto mb-4 text-blue-500 animate-spin" />
                <p className="text-gray-600">Chargement de la carte...</p>
              </div>
            </div>
          ) : (
            <div 
              ref={mapRef} 
              className="w-full h-[400px]"
              style={{ minHeight: '400px' }}
            />
          )}
          
          {/* Badge de statut sur la carte */}
          {showMap && !hasActiveRide && (
            <div className="absolute top-4 left-1/2 transform -translate-x-1/2 z-10">
              <Badge className="bg-gray-700 text-white px-4 py-2">
                En attente d'une course
              </Badge>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Informations de position actuelle + Bouton navigation */}
      {currentLocation && (
        <Card className="bg-gradient-to-r from-primary-blue-50 to-primary-orange-50">
          <CardContent className="pt-4 space-y-3">
            <div className="flex items-center gap-3">
              <MapPin className="w-8 h-8 text-primary-orange-600" />
              <div className="flex-1">
                <p className="text-sm font-semibold text-gray-700">Ma position actuelle</p>
                <p className="text-xs font-mono text-gray-600">
                  ðŸ“ {currentLocation.latitude.toFixed(6)}, {currentLocation.longitude.toFixed(6)}
                </p>
              </div>
            </div>
            
            {/* Bouton Google Maps toujours visible */}
            {!hasActiveRide && (
              <Button 
                onClick={openGoogleMapsExternal}
                className="w-full bg-gradient-to-r from-primary-blue-600 to-primary-orange-600 hover:from-primary-blue-700 hover:to-primary-orange-700 text-white"
              >
                <Navigation className="w-4 h-4 mr-2" />
                Ouvrir Google Maps
              </Button>
            )}
          </CardContent>
        </Card>
      )}

      {/* Informations de route - Uniquement si course active */}
      {hasActiveRide && routeInfo && (
        <Card className="bg-gradient-to-r from-blue-50 to-indigo-50">
          <CardContent className="pt-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-white rounded-lg p-3 text-center">
                <p className="text-xs text-gray-600 mb-1">Distance</p>
                <p className="text-2xl font-bold text-blue-600">
                  {routeInfo.distance.toFixed(1)} <span className="text-sm">km</span>
                </p>
              </div>
              <div className="bg-white rounded-lg p-3 text-center">
                <div className="flex items-center justify-center gap-1 mb-1">
                  <Clock className="w-3 h-3 text-gray-600" />
                  <p className="text-xs text-gray-600">DurÃ©e</p>
                </div>
                <p className="text-2xl font-bold text-blue-600">
                  {routeInfo.duration} <span className="text-sm">min</span>
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Informations client et itinÃ©raire - Uniquement si course active */}
      {hasActiveRide && activeRide && (
        <Card>
        <CardContent className="pt-4 space-y-3">
          {/* Client */}
          <div className="bg-gray-50 rounded-lg p-3">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-semibold text-gray-700">Client</span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => onContactCustomer?.(activeRide.customerPhone)}
                className="gap-2"
              >
                <Phone className="w-4 h-4" />
                Appeler
              </Button>
            </div>
            <p className="font-medium text-gray-900">{activeRide.customerName}</p>
            <p className="text-sm text-gray-600">{activeRide.customerPhone}</p>
          </div>

          {/* ItinÃ©raire */}
          <div className="space-y-2">
            <div className="bg-gradient-to-br from-primary-blue-50 to-primary-orange-50 rounded-lg p-3 border border-primary-orange-200">
              <div className="flex items-start gap-2">
                <MapPin className="w-5 h-5 text-primary-orange-600 mt-0.5" />
                <div>
                  <p className="text-xs font-semibold text-primary-orange-800 uppercase">DÃ©part</p>
                  <p className="text-sm text-gray-900">{activeRide.pickup.address}</p>
                </div>
              </div>
            </div>

            <div className="flex justify-center">
              <ArrowRight className="w-6 h-6 text-blue-500" />
            </div>

            <div className="bg-red-50 rounded-lg p-3 border border-red-200">
              <div className="flex items-start gap-2">
                <MapPin className="w-5 h-5 text-red-600 mt-0.5" />
                <div>
                  <p className="text-xs font-semibold text-red-800 uppercase">ArrivÃ©e</p>
                  <p className="text-sm text-gray-900">{activeRide.destination.address}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Bouton navigation externe */}
          <Button 
            onClick={openGoogleMapsExternal}
            className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white"
          >
            <Navigation className="w-4 h-4 mr-2" />
            Ouvrir dans Google Maps
          </Button>

          {/* Bouton d'annulation */}
          <Button
            onClick={async () => {
              const confirmed = window.confirm(
                'âš ï¸ ÃŠtes-vous sÃ»r de vouloir annuler cette course ?\n\n' +
                'Le client sera notifiÃ© et vous pourriez recevoir une pÃ©nalitÃ©.'
              );
              
              if (confirmed) {
                try {
                  console.log('ðŸš« Annulation de la course:', activeRide.id);
                  
                  const { error } = await supabase
                    .from('taxi_trips')
                    .update({ 
                      status: 'cancelled',
                      cancel_reason: 'AnnulÃ©e par le conducteur',
                      cancelled_at: new Date().toISOString(),
                      updated_at: new Date().toISOString()
                    })
                    .eq('id', activeRide.id);

                  if (error) {
                    console.error('âŒ Erreur DB:', error);
                    throw error;
                  }

                  console.log('âœ… Course annulÃ©e dans la DB');
                  
                  toast.success('âœ… Course annulÃ©e avec succÃ¨s');
                  
                  // Nettoyer immÃ©diatement la carte
                  if (directionsRenderer.current) {
                    directionsRenderer.current.setDirections({ routes: [] });
                  }
                  setRouteInfo(null);
                  
                  // Recharger la page pour mettre Ã  jour tous les composants
                  setTimeout(() => {
                    window.location.reload();
                  }, 1000);
                } catch (error) {
                  console.error('âŒ Erreur annulation:', error);
                  toast.error('Impossible d\'annuler la course');
                }
              }
            }}
            variant="outline"
            className="w-full border-red-300 text-red-700 hover:bg-red-50"
          >
            âŒ Annuler la course
          </Button>

          {/* Revenus */}
          <div className="grid grid-cols-2 gap-3 pt-2 border-t">
            <div className="text-center">
              <p className="text-xs text-gray-600 mb-1">Prix course</p>
              <p className="text-lg font-bold text-primary-orange-600">
                {(activeRide.estimatedPrice || 0).toLocaleString()} GNF
              </p>
            </div>
            <div className="text-center">
              <p className="text-xs text-gray-600 mb-1">Mes gains</p>
              <p className="text-lg font-bold text-blue-600">
                {(activeRide.estimatedEarnings || 0).toLocaleString()} GNF
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
      )}

      {/* Message si pas de course active */}
      {!hasActiveRide && (
        <Card className="bg-white/95 backdrop-blur-sm">
          <CardContent className="pt-8 pb-8 text-center">
            <MapPin className="w-16 h-16 mx-auto mb-4 text-gray-300" />
            <h3 className="text-lg font-semibold text-gray-600 mb-2">
              Aucune course active
            </h3>
            <p className="text-sm text-gray-500">
              Acceptez une course pour dÃ©marrer la navigation guidÃ©e
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
