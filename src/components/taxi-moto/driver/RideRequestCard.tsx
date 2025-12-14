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
    <div className="bg-gradient-to-b from-gray-800 to-gray-850 border border-gray-700/50 rounded-2xl overflow-hidden shadow-2xl animate-in slide-in-from-top duration-300 ring-1 ring-emerald-500/20">
      {/* Header with customer info */}
      <div className="bg-gradient-to-r from-emerald-600 via-emerald-500 to-teal-500 px-4 py-4 flex items-center justify-between relative overflow-hidden">
        {/* Decorative pattern */}
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-0 right-0 w-32 h-32 bg-white rounded-full -translate-y-1/2 translate-x-1/2" />
          <div className="absolute bottom-0 left-0 w-20 h-20 bg-white rounded-full translate-y-1/2 -translate-x-1/2" />
        </div>
        
        <div className="flex items-center gap-3 relative z-10">
          <div className="w-12 h-12 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center border border-white/30">
            <User className="w-6 h-6 text-white" />
          </div>
          <div>
            <h3 className="font-bold text-white text-base">
              {request.customerName || 'Client'}
            </h3>
            <span className="text-emerald-100/80 text-xs font-medium">{getTimeSince()}</span>
          </div>
        </div>
        <div className="relative z-10 flex flex-col items-end">
          <Badge className="bg-white text-emerald-600 font-black text-base px-4 py-1 shadow-lg">
            {request.estimatedEarnings?.toLocaleString() || 0}
          </Badge>
          <span className="text-white/80 text-[10px] mt-0.5 font-medium">GNF</span>
        </div>
      </div>

      {/* Route info */}
      <div className="p-4 space-y-2">
        {/* Pickup */}
        <div className="flex items-start gap-3 bg-gray-700/20 rounded-xl p-3">
          <div className="flex-shrink-0 mt-1">
            <div className="w-4 h-4 rounded-full bg-emerald-500 border-2 border-emerald-300 shadow-lg shadow-emerald-500/30" />
          </div>
          <div className="flex-1 min-w-0">
            <span className="text-[10px] text-emerald-400 uppercase tracking-wider font-bold">Point de départ</span>
            <p className="text-white text-sm font-semibold mt-0.5 line-clamp-2">
              {request.pickupAddress || 'Adresse de départ'}
            </p>
          </div>
        </div>

        {/* Line connector with animated dots */}
        <div className="flex items-center gap-1 ml-5">
          <div className="w-1 h-1 rounded-full bg-gray-600" />
          <div className="w-1 h-1 rounded-full bg-gray-600" />
          <div className="w-1 h-1 rounded-full bg-gray-600" />
        </div>

        {/* Destination */}
        <div className="flex items-start gap-3 bg-gray-700/20 rounded-xl p-3">
          <div className="flex-shrink-0 mt-1">
            <div className="w-4 h-4 rounded-full bg-red-500 border-2 border-red-300 shadow-lg shadow-red-500/30" />
          </div>
          <div className="flex-1 min-w-0">
            <span className="text-[10px] text-red-400 uppercase tracking-wider font-bold">Destination</span>
            <p className="text-white text-sm font-semibold mt-0.5 line-clamp-2">
              {request.destinationAddress || 'Destination'}
            </p>
          </div>
        </div>

        {/* Stats row */}
        <div className="flex items-center justify-between pt-3 mt-2 border-t border-gray-700/50">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 bg-blue-500/10 px-3 py-1.5 rounded-lg border border-blue-500/20">
              <Navigation className="w-4 h-4 text-blue-400" />
              <span className="text-sm font-bold text-blue-400">{request.distance?.toFixed(1) || 0} km</span>
            </div>
            <div className="flex items-center gap-2 bg-purple-500/10 px-3 py-1.5 rounded-lg border border-purple-500/20">
              <Clock className="w-4 h-4 text-purple-400" />
              <span className="text-sm font-bold text-purple-400">{request.estimatedDuration || 0} min</span>
            </div>
          </div>
        </div>
      </div>

      {/* Action buttons */}
      <div className="grid grid-cols-2 gap-2 p-3 bg-gray-900/50">
        <Button
          onClick={onDecline}
          disabled={isAccepting}
          variant="outline"
          className="h-14 rounded-xl text-red-400 border-red-500/30 hover:text-red-300 hover:bg-red-500/10 hover:border-red-500/50 font-bold text-base"
        >
          Refuser
        </Button>
        <Button
          onClick={onAccept}
          disabled={isAccepting}
          className="h-14 rounded-xl bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-500 hover:to-emerald-400 text-white font-bold text-base shadow-lg shadow-emerald-500/30"
        >
          {isAccepting ? (
            <Loader2 className="w-6 h-6 animate-spin" />
          ) : (
            'Accepter'
          )}
        </Button>
      </div>
    </div>
  );
}
