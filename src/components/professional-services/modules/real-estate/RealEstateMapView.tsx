/**
 * Vue carte des biens immobiliers avec Google Maps
 */
import { useState, useEffect, useRef, useCallback } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { MapPin, Loader2, AlertCircle, Maximize } from 'lucide-react';
import { useFormatCurrency } from '@/hooks/useFormatCurrency';
import { supabase } from '@/integrations/supabase/client';
import type { Property } from '@/hooks/useRealEstateData';

interface RealEstateMapViewProps {
  properties: Property[];
  onPropertyClick?: (property: Property) => void;
}

export function RealEstateMapView({ properties, onPropertyClick }: RealEstateMapViewProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const [mapInstance, setMapInstance] = useState<google.maps.Map | null>(null);
  const [apiKey, setApiKey] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const markersRef = useRef<google.maps.marker.AdvancedMarkerElement[]>([]);
  const formatPrice = useFormatCurrency();

  // Fetch Google Maps API key
  useEffect(() => {
    const fetchKey = async () => {
      try {
        const { data, error } = await supabase.functions.invoke('google-maps-config');
        if (error || !data?.success) {
          setError('Clé Google Maps non configurée');
          setLoading(false);
          return;
        }
        setApiKey(data.apiKey);
      } catch {
        setError('Impossible de charger la configuration de la carte');
        setLoading(false);
      }
    };
    fetchKey();
  }, []);

  // Load Google Maps script
  useEffect(() => {
    if (!apiKey) return;

    if (window.google?.maps) {
      initMap();
      return;
    }

    const script = document.createElement('script');
    script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=marker`;
    script.async = true;
    script.onload = () => initMap();
    script.onerror = () => {
      setError('Erreur de chargement Google Maps');
      setLoading(false);
    };
    document.head.appendChild(script);
  }, [apiKey]);

  const initMap = useCallback(() => {
    if (!mapRef.current) return;

    // Center on Guinea by default, or first property
    const geoProps = properties.filter(p => p.latitude && p.longitude);
    const center = geoProps.length > 0
      ? { lat: geoProps[0].latitude!, lng: geoProps[0].longitude! }
      : { lat: 9.5370, lng: -13.6785 }; // Conakry

    const map = new google.maps.Map(mapRef.current, {
      center,
      zoom: geoProps.length > 0 ? 13 : 8,
      mapId: 'real-estate-map',
      disableDefaultUI: false,
      zoomControl: true,
      mapTypeControl: false,
      streetViewControl: false,
    });

    setMapInstance(map);
    setLoading(false);
  }, [properties]);

  // Add markers
  useEffect(() => {
    if (!mapInstance) return;

    // Clear old markers
    markersRef.current.forEach(m => (m.map = null));
    markersRef.current = [];

    const geoProps = properties.filter(p => p.latitude && p.longitude);

    geoProps.forEach(property => {
      const priceTag = document.createElement('div');
      priceTag.className = 'bg-primary text-primary-foreground text-xs font-bold px-2 py-1 rounded-full shadow-lg whitespace-nowrap';
      priceTag.textContent = `${(property.price / 1000000).toFixed(0)}M`;

      try {
        const marker = new google.maps.marker.AdvancedMarkerElement({
          map: mapInstance,
          position: { lat: property.latitude!, lng: property.longitude! },
          content: priceTag,
          title: property.title,
        });

        marker.addListener('click', () => onPropertyClick?.(property));
        markersRef.current.push(marker);
      } catch {
        // Fallback: use regular marker if AdvancedMarkerElement not available
      }
    });

    // Fit bounds
    if (geoProps.length > 1) {
      const bounds = new google.maps.LatLngBounds();
      geoProps.forEach(p => bounds.extend({ lat: p.latitude!, lng: p.longitude! }));
      mapInstance.fitBounds(bounds, 50);
    }
  }, [mapInstance, properties, onPropertyClick]);

  if (error) {
    return (
      <Card className="border-dashed">
        <CardContent className="py-12 text-center">
          <AlertCircle className="h-10 w-10 text-muted-foreground/30 mx-auto mb-3" />
          <h3 className="font-medium">{error}</h3>
          <p className="text-sm text-muted-foreground mt-1">
            Configurez la clé GOOGLE_CLOUD_API_KEY dans les secrets Supabase
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="relative rounded-xl overflow-hidden border border-border">
      {loading && (
        <div className="absolute inset-0 bg-card/80 backdrop-blur-sm z-10 flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      )}
      <div ref={mapRef} className="w-full h-[400px] sm:h-[500px]" />
      <div className="absolute bottom-3 left-3">
        <Badge variant="secondary" className="bg-card/80 backdrop-blur-sm gap-1">
          <MapPin className="h-3 w-3" />
          {properties.filter(p => p.latitude && p.longitude).length} biens géolocalisés
        </Badge>
      </div>
    </div>
  );
}
