/**
 * NOTIFICATION DE NOUVELLE COURSE
 * Notification animÃ©e avec son pour les demandes de course
 */

import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Star, MapPin, Clock } from "lucide-react";
import { useEffect, useRef } from "react";

interface RideRequest {
  id: string;
  customerId: string;
  customerName: string;
  customerRating: number;
  pickupAddress: string;
  destinationAddress: string;
  distance: number;
  estimatedEarnings: number;
  estimatedDuration: number;
  requestTime: string;
}

interface RideRequestNotificationProps {
  request: RideRequest;
  onAccept: () => void;
  onDecline: () => void;
  index: number;
  isAccepting?: boolean;
}

export function RideRequestNotification({ 
  request, 
  onAccept, 
  onDecline,
  index,
  isAccepting = false
}: RideRequestNotificationProps) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  
  useEffect(() => {
    // Jouer le son uniquement pour la premiÃ¨re notification
    if (index === 0) {
      try {
        audioRef.current = new Audio('/notification.mp3');
        audioRef.current.play().catch(() => {});
      } catch (e) {
        console.error('Audio playback failed:', e);
      }
    }

    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
    };
  }, [index]);

  // Calculer le temps Ã©coulÃ© depuis la demande
  const timeAgo = Math.floor((Date.now() - new Date(request.requestTime).getTime()) / 1000);
  const timeDisplay = timeAgo < 60 ? `${timeAgo}s` : `${Math.floor(timeAgo / 60)}min`;

  return (
    <Card className="bg-gradient-to-br from-yellow-50 to-orange-50 border-yellow-300 shadow-xl animate-in slide-in-from-top duration-300">
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-3">
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-bold text-lg">ðŸš— Nouvelle course!</h3>
              <Badge variant="destructive" className="animate-pulse">
                {timeDisplay}
              </Badge>
            </div>
            <p className="text-sm text-gray-700 font-medium">{request.customerName}</p>
          </div>
          <div className="text-right">
            <div className="text-2xl font-bold text-primary-orange-600">
              +{request.estimatedEarnings.toLocaleString()}
            </div>
            <div className="text-xs font-medium text-gray-600">GNF</div>
          </div>
        </div>

        <div className="space-y-2 mb-3">
          <div className="flex items-start gap-2 bg-white/70 p-2 rounded">
            <MapPin className="w-4 h-4 text-primary-orange-600 flex-shrink-0 mt-0.5" />
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium text-gray-700">DÃ©part</p>
              <p className="text-sm font-semibold truncate">{request.pickupAddress}</p>
            </div>
          </div>
          <div className="flex items-start gap-2 bg-white/70 p-2 rounded">
            <MapPin className="w-4 h-4 text-red-600 flex-shrink-0 mt-0.5" />
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium text-gray-700">ArrivÃ©e</p>
              <p className="text-sm font-semibold truncate">{request.destinationAddress}</p>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between bg-white/70 p-2 rounded mb-3">
          <div className="flex items-center gap-3 text-sm font-medium text-gray-700">
            <span>{request.distance.toFixed(1)} km</span>
            <span>â€¢</span>
            <div className="flex items-center gap-1">
              <Clock className="w-3 h-3" />
              <span>{request.estimatedDuration} min</span>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
            <span className="font-bold">{request.customerRating}</span>
          </div>
        </div>

        <div className="flex gap-3">
          <Button
            onClick={() => {
              console.log('ðŸš« Bouton REFUSER cliquÃ© pour la course:', request.id);
              onDecline();
            }}
            variant="outline"
            size="lg"
            disabled={isAccepting}
            className="flex-1 border-2 border-red-500 text-red-600 hover:bg-red-50 hover:border-red-600 font-bold text-base transition-all duration-200 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <span className="text-xl mr-1">âŒ</span> Refuser
          </Button>
          <Button
            onClick={() => {
              console.log('âœ… Bouton ACCEPTER cliquÃ© pour la course:', request.id);
              onAccept();
            }}
            size="lg"
            disabled={isAccepting}
            className="flex-1 bg-primary-blue-600 hover:bg-primary-blue-700 text-white shadow-lg font-bold text-base animate-pulse hover:animate-none transition-all duration-200 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isAccepting ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent mr-2" />
                Acceptation...
              </>
            ) : (
              <>
                <span className="text-xl mr-1">âœ…</span> Accepter
              </>
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
