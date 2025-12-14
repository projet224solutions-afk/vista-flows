/**
 * MINI CARTE GPS - UBER/BOLT STYLE
 * Affichage compact de la position du conducteur
 */

import { MapPin, Navigation, Maximize2 } from "lucide-react";
import { Button } from "@/components/ui/button";

interface MiniMapProps {
  latitude: number | null;
  longitude: number | null;
  isOnline: boolean;
  onExpand?: () => void;
}

export function MiniMap({ 
  latitude, 
  longitude, 
  isOnline,
  onExpand 
}: MiniMapProps) {
  const hasLocation = latitude !== null && longitude !== null;

  return (
    <div className="relative mx-4 rounded-2xl overflow-hidden bg-gray-800 border border-gray-700 shadow-xl">
      {/* Map placeholder with gradient */}
      <div className="h-44 bg-gradient-to-br from-gray-800 via-gray-900 to-gray-800 relative">
        {/* Grid pattern overlay */}
        <div 
          className="absolute inset-0 opacity-10"
          style={{
            backgroundImage: `
              linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px),
              linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)
            `,
            backgroundSize: '40px 40px'
          }}
        />
        
        {/* Center marker */}
        <div className="absolute inset-0 flex items-center justify-center">
          {hasLocation ? (
            <div className="relative">
              {/* Pulse effect */}
              {isOnline && (
                <div className="absolute inset-0 -m-6 rounded-full bg-emerald-500/20 animate-ping" />
              )}
              {/* Marker */}
              <div className={`
                w-12 h-12 rounded-full flex items-center justify-center
                ${isOnline 
                  ? 'bg-gradient-to-br from-emerald-400 to-emerald-600 shadow-lg shadow-emerald-500/30' 
                  : 'bg-gray-600'
                }
              `}>
                <Navigation className="w-6 h-6 text-white" />
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center text-gray-500">
              <MapPin className="w-10 h-10 mb-2 opacity-50" />
              <span className="text-xs">GPS en attente...</span>
            </div>
          )}
        </div>
        
        {/* Coordinates overlay */}
        {hasLocation && (
          <div className="absolute bottom-2 left-2 bg-black/60 backdrop-blur-sm rounded-lg px-2 py-1">
            <span className="text-[10px] text-gray-300 font-mono">
              {latitude?.toFixed(4)}, {longitude?.toFixed(4)}
            </span>
          </div>
        )}
        
        {/* Expand button */}
        {onExpand && (
          <Button
            onClick={onExpand}
            variant="ghost"
            size="icon"
            className="absolute top-2 right-2 bg-black/40 backdrop-blur-sm hover:bg-black/60 text-white h-8 w-8"
          >
            <Maximize2 className="w-4 h-4" />
          </Button>
        )}
      </div>
      
      {/* Bottom info bar */}
      <div className="px-3 py-2 bg-gray-800/80 backdrop-blur-sm border-t border-gray-700 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className={`w-2 h-2 rounded-full ${isOnline ? 'bg-emerald-500 animate-pulse' : 'bg-gray-500'}`} />
          <span className="text-xs text-gray-400">
            {isOnline ? 'Position active' : 'Position inactive'}
          </span>
        </div>
        {hasLocation && (
          <span className="text-xs text-emerald-400 font-medium">
            Précision GPS OK
          </span>
        )}
      </div>
    </div>
  );
}
