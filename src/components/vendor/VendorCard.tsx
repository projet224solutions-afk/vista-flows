import { memo, useCallback } from "react";
import { MapPin, Star, Store } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { formatDistance } from "@/hooks/useGeoDistance";

interface VendorCardProps {
  vendor: {
    id: string;
    business_name: string;
    description?: string | null;
    address?: string | null;
    logo_url?: string | null;
    rating?: number | null;
    city?: string | null;
    neighborhood?: string | null;
    is_verified?: boolean | null;
    distance?: number | null;
  };
  index: number;
  onNavigate: (vendorId: string) => void;
}

/**
 * Carte vendeur optimisée avec React.memo pour éviter les re-renders inutiles
 */
function VendorCardComponent({ vendor, index, onNavigate }: VendorCardProps) {
  // Handler optimisé: décale la navigation avec requestAnimationFrame
  const handleClick = useCallback(() => {
    // Évite les calculs synchrones lourds dans le clic
    requestAnimationFrame(() => {
      onNavigate(vendor.id);
    });
  }, [vendor.id, onNavigate]);

  return (
    <button
      key={vendor.id}
      onClick={handleClick}
      className={cn(
        "group relative flex flex-col p-4 rounded-2xl text-left",
        "bg-card border border-border/50",
        "hover:border-primary/30 hover:shadow-lg transition-all duration-300",
        "hover:-translate-y-1"
      )}
      style={{ animationDelay: `${index * 30}ms` }}
    >
      {vendor.distance !== null ? (
        <div className="absolute -top-2 -right-2 px-2.5 py-1 rounded-full bg-primary text-primary-foreground text-xs font-semibold shadow-md flex items-center gap-1">
          <MapPin className="w-3 h-3" />
          {formatDistance(vendor.distance)}
        </div>
      ) : (
        <div className="absolute -top-2 -right-2 px-2.5 py-1 rounded-full bg-muted text-muted-foreground text-[10px] font-medium shadow-sm">
          Pas de GPS
        </div>
      )}

      <div className="w-14 h-14 rounded-xl bg-muted/40 flex items-center justify-center overflow-hidden mb-3 group-hover:scale-105 transition-transform">
        {vendor.logo_url ? (
          <img
            src={vendor.logo_url}
            alt={`Logo boutique ${vendor.business_name}`}
            className="w-full h-full object-cover"
            loading="lazy"
          />
        ) : (
          <Store className="w-7 h-7 text-primary" />
        )}
      </div>

      <div className="flex-1 space-y-2">
        <h2 className="font-semibold text-sm text-foreground line-clamp-2 group-hover:text-primary transition-colors">
          {vendor.business_name}
        </h2>

        {(vendor.city || vendor.neighborhood || vendor.address) && (
          <p className="text-xs text-muted-foreground flex items-center gap-1">
            <MapPin className="w-3 h-3" />
            <span className="line-clamp-1">
              {[vendor.neighborhood, vendor.city, !vendor.city && !vendor.neighborhood ? vendor.address : null]
                .filter(Boolean)
                .join(", ")}
            </span>
          </p>
        )}

        {vendor.description && (
          <p className="text-xs text-muted-foreground line-clamp-2">{vendor.description}</p>
        )}

        <div className="flex items-center gap-2 pt-1">
          <div className="flex items-center gap-1">
            <Star className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />
            <span className="text-xs font-semibold text-foreground">{vendor.rating?.toFixed(1) || "4.5"}</span>
          </div>
          {vendor.is_verified && (
            <Badge variant="secondary" className="text-[10px]">Vérifié</Badge>
          )}
        </div>
      </div>
    </button>
  );
}

// Mémorise le composant pour éviter les re-renders quand les props n'ont pas changé
export const VendorCard = memo(VendorCardComponent, (prevProps, nextProps) => {
  // Re-render uniquement si les données essentielles changent
  return (
    prevProps.vendor.id === nextProps.vendor.id &&
    prevProps.vendor.distance === nextProps.vendor.distance &&
    prevProps.vendor.rating === nextProps.vendor.rating &&
    prevProps.index === nextProps.index
  );
});

export default VendorCard;
