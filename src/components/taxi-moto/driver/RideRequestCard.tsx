/**
 * CARTE DEMANDE DE COURSE - UBER/BOLT STYLE
 * Design compact et professionnel
 */

import { MapPin, Navigation, Phone, DollarSign, Clock, User, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

interface RideRequestCardProps {
  request: {
    id: string;
    customerName: string;
    pickupAddress: string;
    destinationAddress: string;
    distance: number;
    estimatedEarnings: number;
    estimatedDuration: number;
    requestTime: string;
  };
  onAccept: () => void;
  onDecline: () => void;
  isAccepting: boolean;
}

export function RideRequestCard({
  request,
  onAccept,
  onDecline,
  isAccepting
}: RideRequestCardProps) {
  // Calculate time since request
  const getTimeSince = () => {
    try {
      const requestDate = new Date(request.requestTime);
      const now = new Date();
      const diffMs = now.getTime() - requestDate.getTime();
      const diffMins = Math.floor(diffMs / 60000);
      if (diffMins < 1) return 'À l\'instant';
      if (diffMins === 1) return 'Il y a 1 min';
      return `Il y a ${diffMins} min`;
    } catch {
      return '';
    }
  };

  return (
    <div className="bg-gray-800 border border-gray-700 rounded-2xl overflow-hidden shadow-xl animate-in slide-in-from-top duration-300">
      {/* Header with customer info */}
      <div className="bg-gradient-to-r from-emerald-600 to-emerald-500 px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center">
            <User className="w-5 h-5 text-white" />
          </div>
          <div>
            <h3 className="font-semibold text-white text-sm">
              {request.customerName || 'Client'}
            </h3>
            <span className="text-emerald-100 text-xs">{getTimeSince()}</span>
          </div>
        </div>
        <Badge className="bg-white text-emerald-600 font-bold text-sm px-3">
          {request.estimatedEarnings?.toLocaleString() || 0} GNF
        </Badge>
      </div>

      {/* Route info */}
      <div className="p-4 space-y-3">
        {/* Pickup */}
        <div className="flex items-start gap-3">
          <div className="flex-shrink-0 mt-0.5">
            <div className="w-3 h-3 rounded-full bg-emerald-500 border-2 border-emerald-300" />
          </div>
          <div className="flex-1 min-w-0">
            <span className="text-[10px] text-gray-500 uppercase tracking-wide">Départ</span>
            <p className="text-white text-sm font-medium truncate">
              {request.pickupAddress || 'Adresse de départ'}
            </p>
          </div>
        </div>

        {/* Line connector */}
        <div className="ml-[5px] w-0.5 h-4 bg-gray-700" />

        {/* Destination */}
        <div className="flex items-start gap-3">
          <div className="flex-shrink-0 mt-0.5">
            <div className="w-3 h-3 rounded-full bg-red-500 border-2 border-red-300" />
          </div>
          <div className="flex-1 min-w-0">
            <span className="text-[10px] text-gray-500 uppercase tracking-wide">Arrivée</span>
            <p className="text-white text-sm font-medium truncate">
              {request.destinationAddress || 'Destination'}
            </p>
          </div>
        </div>

        {/* Stats row */}
        <div className="flex items-center justify-between pt-2 border-t border-gray-700">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1.5 text-gray-400">
              <Navigation className="w-4 h-4" />
              <span className="text-xs">{request.distance?.toFixed(1) || 0} km</span>
            </div>
            <div className="flex items-center gap-1.5 text-gray-400">
              <Clock className="w-4 h-4" />
              <span className="text-xs">{request.estimatedDuration || 0} min</span>
            </div>
          </div>
        </div>
      </div>

      {/* Action buttons */}
      <div className="grid grid-cols-2 gap-0 border-t border-gray-700">
        <Button
          onClick={onDecline}
          disabled={isAccepting}
          variant="ghost"
          className="h-14 rounded-none text-red-400 hover:text-red-300 hover:bg-red-500/10 font-semibold"
        >
          Refuser
        </Button>
        <Button
          onClick={onAccept}
          disabled={isAccepting}
          className="h-14 rounded-none bg-emerald-600 hover:bg-emerald-500 text-white font-semibold border-l border-gray-700"
        >
          {isAccepting ? (
            <Loader2 className="w-5 h-5 animate-spin" />
          ) : (
            'Accepter'
          )}
        </Button>
      </div>
    </div>
  );
}
