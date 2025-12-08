import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { MapPin, Navigation, Phone, ExternalLink, Clock, ArrowRight, Package } from "lucide-react";
import { toast } from "sonner";
import { TaxiMotoGeolocationService } from "@/services/taxi/TaxiMotoGeolocationService";

interface Coordinates {
  latitude: number;
  longitude: number;
}

interface DeliveryAddress {
  lat?: number;
  lng?: number;
  latitude?: number;
  longitude?: number;
  address?: string;
}

interface ActiveDelivery {
  id: string;
  order_id: string;
  customer_name?: string;
  customer_phone?: string;
  vendor_name?: string;
  vendor_phone?: string;
  pickup_address: DeliveryAddress | string;
  delivery_address: DeliveryAddress | string;
  status: string;
  delivery_fee?: number;
  driver_earning?: number;
  payment_method?: string;
  package_type?: string;
}

interface DeliveryGPSNavigationProps {
  activeDelivery: ActiveDelivery | null;
  currentLocation: Coordinates | null;
  onContactCustomer?: (phone: string) => void;
}

export function DeliveryGPSNavigation({ activeDelivery, currentLocation, onContactCustomer }: DeliveryGPSNavigationProps) {
  const [distance, setDistance] = useState<number | null>(null);
  const [duration, setDuration] = useState<number | null>(null);

  // Parse les coordonnées d'une adresse
  const parseCoords = (addr: DeliveryAddress | string | null): Coordinates | null => {
    if (!addr) return null;
    if (typeof addr === 'string') {
      try {
        const parsed = JSON.parse(addr);
        return {
          latitude: parsed.lat || parsed.latitude || 0,
          longitude: parsed.lng || parsed.longitude || 0
        };
      } catch {
        return null;
      }
    }
    if (addr.lat && addr.lng) {
      return { latitude: addr.lat, longitude: addr.lng };
    }
    if (addr.latitude && addr.longitude) {
      return { latitude: addr.latitude, longitude: addr.longitude };
    }
    return null;
  };

  // Parse l'adresse texte
  const parseAddress = (addr: DeliveryAddress | string | null): string => {
    if (!addr) return 'Adresse non disponible';
    if (typeof addr === 'string') {
      try {
        const parsed = JSON.parse(addr);
        return parsed.address || addr;
      } catch {
        return addr;
      }
    }
    return addr.address || 'Adresse non disponible';
  };

  useEffect(() => {
    if (!activeDelivery || !currentLocation) {
      setDistance(null);
      setDuration(null);
      return;
    }

    // Déterminer la destination selon le statut
    const isPickingUp = ['assigned', 'accepted', 'picked_up'].includes(activeDelivery.status);
    const targetAddr = isPickingUp ? activeDelivery.pickup_address : activeDelivery.delivery_address;
    const target = parseCoords(targetAddr);

    if (!target || (target.latitude === 0 && target.longitude === 0)) {
      setDistance(null);
      setDuration(null);
      return;
    }

    // Utiliser Mapbox pour obtenir la route réelle
    TaxiMotoGeolocationService.getRoute(
      { latitude: currentLocation.latitude, longitude: currentLocation.longitude },
      { latitude: target.latitude, longitude: target.longitude }
    ).then(routeInfo => {
      setDistance(routeInfo.distance);
      setDuration(routeInfo.duration);
    }).catch(() => {
      // Fallback: calcul simple avec Haversine
      const dist = TaxiMotoGeolocationService.calculateDistance(
        currentLocation.latitude,
        currentLocation.longitude,
        target.latitude,
        target.longitude
      );
      setDistance(dist);
      setDuration(Math.ceil(dist * 3)); // Estimation: 3 min/km
    });
  }, [activeDelivery, currentLocation]);

  const openGoogleMaps = () => {
    if (!activeDelivery || !currentLocation) {
      toast.error("Impossible d'ouvrir la navigation");
      return;
    }

    const isPickingUp = ['assigned', 'accepted', 'picked_up'].includes(activeDelivery.status);
    const targetAddr = isPickingUp ? activeDelivery.pickup_address : activeDelivery.delivery_address;
    const target = parseCoords(targetAddr);

    if (!target || (target.latitude === 0 && target.longitude === 0)) {
      toast.error("Coordonnées GPS non disponibles");
      return;
    }

    const origin = `${currentLocation.latitude},${currentLocation.longitude}`;
    const destination = `${target.latitude},${target.longitude}`;
    const mapsUrl = `https://www.google.com/maps/dir/?api=1&origin=${origin}&destination=${destination}&travelmode=driving`;
    
    window.open(mapsUrl, '_blank');
    toast.success("Navigation ouverte dans Google Maps");
  };

  if (!activeDelivery) {
    return (
      <Card className="bg-card/95 backdrop-blur-sm shadow-lg">
        <CardContent className="pt-12 pb-12 text-center">
          <Package className="w-16 h-16 mx-auto mb-4 text-muted-foreground/30" />
          <h3 className="text-lg font-semibold text-muted-foreground mb-2">
            Aucune livraison active
          </h3>
          <p className="text-sm text-muted-foreground/70">
            Acceptez une livraison pour démarrer la navigation
          </p>
        </CardContent>
      </Card>
    );
  }

  const isPickingUp = ['assigned', 'accepted', 'picked_up'].includes(activeDelivery.status);
  const statusLabel = isPickingUp ? "Récupération du colis" : "En route vers le client";

  const pickupCoords = parseCoords(activeDelivery.pickup_address);
  const deliveryCoords = parseCoords(activeDelivery.delivery_address);

  return (
    <div className="space-y-4">
      {/* Carte de navigation active */}
      <Card className="bg-gradient-to-r from-orange-50 to-green-50 dark:from-orange-950/30 dark:to-green-950/30 border-orange-200 dark:border-orange-800">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Navigation className="w-5 h-5 text-orange-600 animate-pulse" />
              <span className="text-lg">Navigation active</span>
            </div>
            <Badge className="bg-orange-600 text-white">
              {statusLabel}
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Informations vendeur/client */}
          <div className="bg-card rounded-lg p-3 border border-orange-200 dark:border-orange-800">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-semibold text-muted-foreground">
                {isPickingUp ? 'Vendeur' : 'Client'}
              </span>
              {((isPickingUp && activeDelivery.vendor_phone) || (!isPickingUp && activeDelivery.customer_phone)) && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    const phone = isPickingUp ? activeDelivery.vendor_phone : activeDelivery.customer_phone;
                    if (phone) {
                      window.open(`tel:${phone}`, '_self');
                    }
                  }}
                  className="gap-2"
                >
                  <Phone className="w-4 h-4" />
                  Appeler
                </Button>
              )}
            </div>
            <p className="font-medium text-foreground">
              {isPickingUp ? (activeDelivery.vendor_name || 'Vendeur') : (activeDelivery.customer_name || 'Client')}
            </p>
            <p className="text-sm text-muted-foreground">
              {isPickingUp ? activeDelivery.vendor_phone : activeDelivery.customer_phone}
            </p>
          </div>

          {/* Itinéraire */}
          <div className="space-y-3">
            <div className="bg-green-50 dark:bg-green-950/30 rounded-lg p-3 border border-green-200 dark:border-green-800">
              <div className="flex items-start gap-2">
                <MapPin className="w-5 h-5 text-green-600 mt-0.5" />
                <div className="flex-1">
                  <p className="text-xs font-semibold text-green-800 dark:text-green-400 uppercase mb-1">
                    📦 Point de récupération
                  </p>
                  <p className="text-sm text-foreground">
                    {parseAddress(activeDelivery.pickup_address)}
                  </p>
                  {pickupCoords && (
                    <p className="text-xs text-muted-foreground mt-1 font-mono">
                      {pickupCoords.latitude.toFixed(5)}, {pickupCoords.longitude.toFixed(5)}
                    </p>
                  )}
                </div>
              </div>
            </div>

            <div className="flex justify-center">
              <ArrowRight className="w-6 h-6 text-orange-500" />
            </div>

            <div className="bg-red-50 dark:bg-red-950/30 rounded-lg p-3 border border-red-200 dark:border-red-800">
              <div className="flex items-start gap-2">
                <MapPin className="w-5 h-5 text-red-600 mt-0.5" />
                <div className="flex-1">
                  <p className="text-xs font-semibold text-red-800 dark:text-red-400 uppercase mb-1">
                    🏠 Destination finale
                  </p>
                  <p className="text-sm text-foreground">
                    {parseAddress(activeDelivery.delivery_address)}
                  </p>
                  {deliveryCoords && (
                    <p className="text-xs text-muted-foreground mt-1 font-mono">
                      {deliveryCoords.latitude.toFixed(5)}, {deliveryCoords.longitude.toFixed(5)}
                    </p>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Distance et temps estimé */}
          {distance !== null && duration !== null && (
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-card rounded-lg p-3 border border-orange-200 dark:border-orange-800 text-center">
                <p className="text-xs text-muted-foreground mb-1">Distance</p>
                <p className="text-2xl font-bold text-orange-600">
                  {distance.toFixed(1)} <span className="text-sm">km</span>
                </p>
              </div>
              <div className="bg-card rounded-lg p-3 border border-orange-200 dark:border-orange-800 text-center">
                <div className="flex items-center justify-center gap-1 mb-1">
                  <Clock className="w-3 h-3 text-muted-foreground" />
                  <p className="text-xs text-muted-foreground">Temps estimé</p>
                </div>
                <p className="text-2xl font-bold text-orange-600">
                  {Math.round(duration)} <span className="text-sm">min</span>
                </p>
              </div>
            </div>
          )}

          {/* Position actuelle */}
          {currentLocation && (
            <div className="bg-card rounded-lg p-3 border border-border">
              <p className="text-xs text-muted-foreground mb-1">📍 Ma position actuelle</p>
              <p className="text-xs font-mono text-foreground">
                {currentLocation.latitude.toFixed(6)}, {currentLocation.longitude.toFixed(6)}
              </p>
            </div>
          )}

          {/* Bouton navigation Google Maps */}
          <Button 
            onClick={openGoogleMaps}
            className="w-full text-white gap-2"
            size="lg"
            style={{ background: 'linear-gradient(135deg, hsl(25 98% 55%), hsl(145 65% 35%))' }}
          >
            <ExternalLink className="w-5 h-5" />
            🗺️ Ouvrir dans Google Maps
          </Button>
        </CardContent>
      </Card>

      {/* Informations supplémentaires */}
      <Card className="bg-card/95 backdrop-blur-sm">
        <CardContent className="pt-4">
          <div className="grid grid-cols-2 gap-3 text-center">
            <div>
              <p className="text-xs text-muted-foreground mb-1">💰 Rémunération</p>
              <p className="text-lg font-bold text-green-600">
                {(activeDelivery.delivery_fee || activeDelivery.driver_earning || 0).toLocaleString()} GNF
              </p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground mb-1">💳 Paiement</p>
              <p className="text-lg font-bold text-orange-600 capitalize">
                {activeDelivery.payment_method || 'Non défini'}
              </p>
            </div>
          </div>
          {activeDelivery.package_type && (
            <div className="mt-3 text-center">
              <p className="text-xs text-muted-foreground mb-1">📦 Type de colis</p>
              <Badge variant="outline" className="capitalize">
                {activeDelivery.package_type}
              </Badge>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
