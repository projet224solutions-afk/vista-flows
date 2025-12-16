/**
 * DASHBOARD PRINCIPAL CONDUCTEUR - UBER/BOLT STYLE
 * Vue principale avec bouton GO et statistiques
 */

import { DriverSubscriptionBanner } from '@/components/driver/DriverSubscriptionBanner';
import { ErrorBanner } from '@/components/ui/ErrorBanner';
import { GoOnlineButton } from './GoOnlineButton';
import { DriverStatsRow } from './DriverStatsRow';
import { MiniMap } from './MiniMap';
import { RideRequestCard } from './RideRequestCard';
import { Car, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { DriverTutorial } from '@/components/taxi-moto/DriverTutorial';
import { DriverDiagnostic } from '@/components/taxi-moto/DriverDiagnostic';

interface RideRequest {
  id: string;
  customerName: string;
  pickupAddress: string;
  destinationAddress: string;
  distance: number;
  estimatedEarnings: number;
  estimatedDuration: number;
  requestTime: string;
}

interface DriverMainDashboardProps {
  isOnline: boolean;
  isLoading: boolean;
  hasSubscription: boolean;
  driverId: string | null;
  userId: string | undefined;
  location: { latitude: number; longitude: number } | null;
  stats: {
    todayEarnings: number;
    todayRides: number;
    rating: number;
    onlineTime: string;
  };
  rideRequests: RideRequest[];
  acceptingRideId: string | null;
  error: { type: string; message: string } | null;
  hasAccess: boolean;
  onToggleOnline: () => void;
  onAcceptRide: (request: RideRequest) => void;
  onDeclineRide: (requestId: string) => void;
  onClearError: () => void;
  onExpandMap: () => void;
  onStatClick?: (statId: string) => void;
}

export function DriverMainDashboard({
  isOnline,
  isLoading,
  hasSubscription,
  driverId,
  userId,
  location,
  stats,
  rideRequests,
  acceptingRideId,
  error,
  hasAccess,
  onToggleOnline,
  onAcceptRide,
  onDeclineRide,
  onClearError,
  onExpandMap,
  onStatClick
}: DriverMainDashboardProps) {
  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-950 via-gray-900 to-gray-950 pb-20">
      {/* Subscription Banner */}
      <DriverSubscriptionBanner />
      
      {/* Error Banner */}
      {error && (
        <ErrorBanner
          title={
            error.type === 'gps' ? 'GPS inactif' :
            error.type === 'permission' ? 'Permission requise' :
            error.type === 'payment' ? 'Problème de paiement' :
            error.type === 'env' ? 'Configuration manquante' :
            'Erreur'
          }
          message={error.message}
          actionLabel="Masquer"
          onAction={onClearError}
        />
      )}
      
      {/* Stats Row */}
      <DriverStatsRow 
        todayEarnings={stats.todayEarnings}
        todayRides={stats.todayRides}
        rating={stats.rating}
        onlineTime={stats.onlineTime}
        onStatClick={onStatClick}
      />

      {/* Main Content */}
      <div className="px-4 pt-4 space-y-4">
        {/* Ride Requests - Priority Display */}
        {rideRequests.length > 0 ? (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-white font-semibold text-sm flex items-center gap-2">
                <Car className="w-4 h-4 text-emerald-400" />
                {rideRequests.length} course{rideRequests.length > 1 ? 's' : ''} disponible{rideRequests.length > 1 ? 's' : ''}
              </h2>
            </div>
            
            {rideRequests.map((request) => (
              <RideRequestCard
                key={request.id}
                request={request}
                onAccept={() => onAcceptRide(request)}
                onDecline={() => onDeclineRide(request.id)}
                isAccepting={acceptingRideId === request.id}
              />
            ))}
          </div>
        ) : (
          <>
            {/* GO Button */}
            <GoOnlineButton
              isOnline={isOnline}
              isLoading={isLoading}
              hasSubscription={hasSubscription}
              onToggle={onToggleOnline}
            />

            {/* Mini Map */}
            <MiniMap
              latitude={location?.latitude || null}
              longitude={location?.longitude || null}
              isOnline={isOnline}
              onExpand={onExpandMap}
            />

            {/* Status Message when Online */}
            {isOnline && (
              <div className="bg-gray-800/50 border border-gray-700 rounded-xl p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-emerald-500/20 flex items-center justify-center">
                      <Car className="w-5 h-5 text-emerald-400 animate-pulse" />
                    </div>
                    <div>
                      <p className="text-white font-medium text-sm">En attente de courses</p>
                      <p className="text-gray-500 text-xs">Vous recevrez une notification</p>
                    </div>
                  </div>
                  <DriverTutorial />
                </div>
              </div>
            )}

            {/* Diagnostic when online but no rides */}
            {isOnline && (
              <DriverDiagnostic 
                driverId={driverId}
                isOnline={isOnline}
                hasAccess={hasAccess}
                userId={userId}
              />
            )}

            {/* Offline Message */}
            {!isOnline && (
              <div className="text-center py-8">
                <p className="text-gray-500 text-sm">
                  Passez en ligne pour recevoir des courses
                </p>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
