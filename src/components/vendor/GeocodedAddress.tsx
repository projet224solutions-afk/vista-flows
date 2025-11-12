import { MapPin, Loader2 } from 'lucide-react';
import { useReverseGeocode } from '@/hooks/useReverseGeocode';

interface GeocodedAddressProps {
  address: any;
  className?: string;
}

/**
 * Composant pour afficher une adresse géolocalisée via Google API
 */
export function GeocodedAddress({ address, className = '' }: GeocodedAddressProps) {
  const { formatted, loading, error } = useReverseGeocode(address);

  return (
    <div className={`flex items-start gap-2 ${className}`}>
      <MapPin className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
      <div>
        <span className="text-muted-foreground text-xs">Adresse de livraison:</span>
        {loading ? (
          <div className="flex items-center gap-2 mt-1">
            <Loader2 className="w-3 h-3 animate-spin" />
            <span className="text-xs text-muted-foreground">Géolocalisation...</span>
          </div>
        ) : (
          <p className="font-medium text-sm mt-1">
            {formatted}
          </p>
        )}
        {error && (
          <p className="text-xs text-destructive mt-1">
            {error}
          </p>
        )}
      </div>
    </div>
  );
}
