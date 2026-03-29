/**
 * TAXI DRIVERS LIST COMPONENT
 * Composant mÃ©moÃ¯sÃ© pour l'affichage de la liste des taxi-motos
 * 224Solutions - Production Ready
 */

import { memo } from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Bike,
  MapPin,
  Star,
  RefreshCw,
  Phone,
  Clock,
  User,
  AlertCircle
} from "lucide-react";
import {
  type TaxiDriver,
  formatDriverDistance,
  getVehiclePlateDisplay,
} from '@/lib/drivers';

// ============================================================================
// Props interfaces
// ============================================================================

interface TaxiDriverCardProps {
  driver: TaxiDriver;
  onBook: (driverId: string) => void;
}

interface TaxiDriversListProps {
  loading: boolean;
  error: string | null;
  drivers: TaxiDriver[];
  onRetry: () => void;
  onBook: (driverId: string) => void;
}

// ============================================================================
// TaxiDriverCard - Carte individuelle mÃ©moÃ¯sÃ©e
// ============================================================================

const TaxiDriverCard = memo(function TaxiDriverCard({ driver, onBook }: TaxiDriverCardProps) {
  const displayName = driver.profile?.first_name
    ? `${driver.profile.first_name}${driver.profile.last_name ? ` ${driver.profile.last_name.charAt(0)}.` : ''}`
    : 'Conducteur';
  const vehiclePlate = getVehiclePlateDisplay(driver);
  const isAvailable = driver.status === 'available';

  return (
    <Card className="border-border/50 hover:border-primary-orange-500/50 transition-colors">
      <CardContent className="p-4">
        <div className="flex items-center gap-4">
          {/* Avatar */}
          <div className="relative">
            <div className="w-14 h-14 rounded-full bg-primary-blue-100 flex items-center justify-center">
              {driver.profile?.avatar_url ? (
                <img
                  src={driver.profile.avatar_url}
                  alt=""
                  className="w-14 h-14 rounded-full object-cover"
                  loading="lazy"
                />
              ) : (
                <User className="w-6 h-6 text-primary-blue-600" />
              )}
            </div>
            <div className={`absolute -bottom-1 -right-1 w-4 h-4 rounded-full border-2 border-white ${
              isAvailable ? 'bg-primary-blue-600' : 'bg-yellow-500'
            }`} />
          </div>

          {/* Info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <h3 className="font-semibold text-foreground truncate">
                {displayName}
              </h3>
              <Badge variant={isAvailable ? 'default' : 'secondary'} className="text-xs">
                {isAvailable ? 'Disponible' : 'En course'}
              </Badge>
            </div>

            <div className="flex items-center gap-3 text-xs text-muted-foreground">
              {driver.rating !== null && driver.rating > 0 && (
                <span className="flex items-center gap-1">
                  <Star className="w-3 h-3 text-yellow-500 fill-yellow-500" />
                  {driver.rating.toFixed(1)}
                </span>
              )}
              <span className="flex items-center gap-1">
                <Clock className="w-3 h-3" />
                {driver.total_rides ?? 0} courses
              </span>
              {driver.distance !== undefined && (
                <span className="flex items-center gap-1">
                  <MapPin className="w-3 h-3" />
                  {formatDriverDistance(driver.distance)}
                </span>
              )}
            </div>

            <p className="text-xs text-muted-foreground mt-1">
              {vehiclePlate}
            </p>
          </div>

          {/* Action */}
          <Button
            size="sm"
            onClick={() => onBook(driver.id)}
            disabled={!isAvailable}
            title={!isAvailable ? 'Conducteur en course' : undefined}
            className="bg-primary-blue-500 hover:bg-primary-blue-600"
          >
            <Phone className="w-4 h-4 mr-1" />
            Appeler
          </Button>
        </div>
      </CardContent>
    </Card>
  );
});

// ============================================================================
// Skeleton de chargement
// ============================================================================

const LoadingSkeleton = memo(function LoadingSkeleton() {
  return (
    <div className="space-y-3">
      {[1, 2, 3].map((i) => (
        <Card key={i} className="border-border/50">
          <CardContent className="p-4">
            <div className="flex items-center gap-4">
              <Skeleton className="w-14 h-14 rounded-full" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-3 w-24" />
              </div>
              <Skeleton className="h-9 w-24" />
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
});

// ============================================================================
// Ã‰tat d'erreur
// ============================================================================

interface ErrorStateProps {
  error: string;
  onRetry: () => void;
}

const ErrorState = memo(function ErrorState({ error, onRetry }: ErrorStateProps) {
  return (
    <Card className="border-border/50">
      <CardContent className="p-8 text-center">
        <AlertCircle className="w-12 h-12 text-destructive mx-auto mb-4" />
        <h3 className="font-semibold text-foreground mb-2">Erreur de chargement</h3>
        <p className="text-sm text-muted-foreground mb-4">{error}</p>
        <Button variant="outline" onClick={onRetry}>
          <RefreshCw className="w-4 h-4 mr-2" />
          RÃ©essayer
        </Button>
      </CardContent>
    </Card>
  );
});

// ============================================================================
// Ã‰tat vide
// ============================================================================

interface EmptyStateProps {
  onRetry: () => void;
}

const EmptyState = memo(function EmptyState({ onRetry }: EmptyStateProps) {
  return (
    <Card className="border-border/50">
      <CardContent className="p-8 text-center">
        <Bike className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
        <h3 className="font-semibold text-foreground mb-2">Aucun conducteur en ligne</h3>
        <p className="text-sm text-muted-foreground mb-4">
          RÃ©essayez dans quelques instants
        </p>
        <Button variant="outline" onClick={onRetry}>
          <RefreshCw className="w-4 h-4 mr-2" />
          Actualiser
        </Button>
      </CardContent>
    </Card>
  );
});

// ============================================================================
// Composant principal TaxiDriversList
// ============================================================================

const TaxiDriversList = memo(function TaxiDriversList({
  loading,
  error,
  drivers,
  onRetry,
  onBook,
}: TaxiDriversListProps) {
  // Chargement initial uniquement
  if (loading && drivers.length === 0) {
    return <LoadingSkeleton />;
  }

  // Erreur
  if (error && drivers.length === 0) {
    return <ErrorState error={error} onRetry={onRetry} />;
  }

  // Liste vide
  if (drivers.length === 0) {
    return <EmptyState onRetry={onRetry} />;
  }

  // Liste des conducteurs
  return (
    <div className="space-y-3">
      {drivers.map((driver) => (
        <TaxiDriverCard
          key={driver.id}
          driver={driver}
          onBook={onBook}
        />
      ))}
    </div>
  );
});

export { TaxiDriversList, TaxiDriverCard };
export type { TaxiDriversListProps, TaxiDriverCardProps };
