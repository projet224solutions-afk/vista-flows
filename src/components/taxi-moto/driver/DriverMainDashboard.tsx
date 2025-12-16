/**
 * DASHBOARD PRINCIPAL CONDUCTEUR - ULTRA PROFESSIONNEL
 * Interface moderne avec glassmorphism et animations
 */

import { DriverSubscriptionBanner } from '@/components/driver/DriverSubscriptionBanner';
import { ErrorBanner } from '@/components/ui/ErrorBanner';
import { GoOnlineButton } from './GoOnlineButton';
import { DriverStatsRow } from './DriverStatsRow';
import { MiniMap } from './MiniMap';
import { RideRequestCard } from './RideRequestCard';
import { Car, Sparkles, Zap, AlertCircle } from 'lucide-react';
import { DriverTutorial } from '@/components/taxi-moto/DriverTutorial';
import { DriverDiagnostic } from '@/components/taxi-moto/DriverDiagnostic';
import { cn } from '@/lib/utils';

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
    <div className="min-h-screen bg-gray-950 pb-24">
      {/* Background gradient */}
      <div className="fixed inset-0 bg-gradient-to-br from-gray-950 via-gray-900 to-gray-950 pointer-events-none">
        {/* Subtle pattern overlay */}
        <div className="absolute inset-0 opacity-[0.02]"
          style={{
            backgroundImage: `radial-gradient(circle at 1px 1px, white 1px, transparent 0)`,
            backgroundSize: '24px 24px'
          }}
        />
        
        {/* Accent glow when online */}
        {isOnline && (
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl" />
        )}
      </div>
      
      {/* Content */}
      <div className="relative z-10">
        {/* Subscription Banner */}
        <DriverSubscriptionBanner />
        
        {/* Error Banner */}
        {error && (
          <div className="px-4 pt-2">
            <div className="flex items-center gap-3 p-3 rounded-xl bg-red-500/10 border border-red-500/20">
              <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0" />
              <div className="flex-1">
                <p className="text-red-400 text-sm font-medium">
                  {error.type === 'gps' ? 'GPS inactif' :
                   error.type === 'permission' ? 'Permission requise' :
                   error.type === 'payment' ? 'Problème de paiement' :
                   'Erreur'}
                </p>
                <p className="text-red-400/70 text-xs">{error.message}</p>
              </div>
              <button 
                onClick={onClearError}
                className="text-red-400/70 hover:text-red-400 text-xs underline"
              >
                Masquer
              </button>
            </div>
          </div>
        )}
        
        {/* Stats Row */}
        <DriverStatsRow 
          todayEarnings={stats.todayEarnings || 0}
          todayRides={stats.todayRides || 0}
          rating={stats.rating || 5.0}
          onlineTime={stats.onlineTime || '0m'}
          onStatClick={onStatClick}
        />

        {/* Main Content */}
        <div className="px-4 space-y-4">
          {/* Ride Requests - Priority Display */}
          {rideRequests.length > 0 ? (
            <div className="space-y-4">
              {/* Header with count */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-emerald-500/20 flex items-center justify-center">
                    <Car className="w-4 h-4 text-emerald-400" />
                  </div>
                  <div>
                    <h2 className="text-white font-semibold text-sm">
                      {rideRequests.length} course{rideRequests.length > 1 ? 's' : ''} disponible{rideRequests.length > 1 ? 's' : ''}
                    </h2>
                    <p className="text-gray-500 text-xs">Nouvelles demandes</p>
                  </div>
                </div>
                <div className="flex items-center gap-1 px-2 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20">
                  <Sparkles className="w-3 h-3 text-emerald-400" />
                  <span className="text-emerald-400 text-xs font-medium">En direct</span>
                </div>
              </div>
              
              {/* Request cards */}
              <div className="space-y-3">
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
                <div className={cn(
                  "relative overflow-hidden",
                  "bg-gradient-to-br from-gray-800/50 to-gray-900/50",
                  "backdrop-blur-sm",
                  "rounded-2xl p-4",
                  "border border-gray-700/50"
                )}>
                  {/* Subtle animated gradient */}
                  <div className="absolute inset-0 bg-gradient-to-r from-emerald-500/5 via-transparent to-emerald-500/5 animate-pulse" />
                  
                  <div className="relative flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-xl bg-emerald-500/20 flex items-center justify-center">
                        <Zap className="w-6 h-6 text-emerald-400 animate-pulse" />
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
                  <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-gray-800/50 border border-gray-700/50">
                    <div className="w-2 h-2 rounded-full bg-gray-500" />
                    <p className="text-gray-500 text-sm">
                      Passez en ligne pour recevoir des courses
                    </p>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
