/**
 * MINI CARTE - ULTRA PROFESSIONNEL
 * Affichage élégant de la position GPS
 */

import { MapPin, Navigation2, Maximize2, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface MiniMapProps {
  latitude: number | null;
  longitude: number | null;
  isOnline: boolean;
  onExpand?: () => void;
}

export function MiniMap({ latitude, longitude, isOnline, onExpand }: MiniMapProps) {
  const hasLocation = latitude !== null && longitude !== null;

  return (
    <div className="relative">
      {/* Map Container */}
      <div className={cn(
        "relative h-48 rounded-2xl overflow-hidden",
        "bg-gradient-to-br from-gray-800 to-gray-900",
        "border border-gray-700/50",
        "shadow-xl shadow-black/20"
      )}>
        {/* Map placeholder with grid pattern */}
        <div className="absolute inset-0">
          <div className="w-full h-full" 
            style={{
              backgroundImage: `
                linear-gradient(rgba(16, 185, 129, 0.03) 1px, transparent 1px),
                linear-gradient(90deg, rgba(16, 185, 129, 0.03) 1px, transparent 1px)
              `,
              backgroundSize: '20px 20px'
            }} 
          />
          
          {/* Radial gradient overlay */}
          <div className="absolute inset-0 bg-gradient-to-b from-transparent via-gray-900/50 to-gray-900/80" />
        </div>

        {/* Center marker */}
        {hasLocation ? (
          <div className="absolute inset-0 flex items-center justify-center">
            {/* Pulse rings */}
            {isOnline && (
              <>
                <div className="absolute w-24 h-24 rounded-full bg-emerald-500/10 animate-ping" style={{ animationDuration: '2s' }} />
                <div className="absolute w-16 h-16 rounded-full bg-emerald-500/20 animate-pulse" />
              </>
            )}
            
            {/* Marker */}
            <div className={cn(
              "relative z-10 w-12 h-12 rounded-full flex items-center justify-center",
              "shadow-xl",
              isOnline 
                ? "bg-gradient-to-br from-emerald-400 to-emerald-600 shadow-emerald-500/30" 
                : "bg-gradient-to-br from-gray-600 to-gray-700 shadow-black/30"
            )}>
              <Navigation2 className={cn(
                "w-6 h-6",
                isOnline ? "text-white" : "text-gray-400"
              )} />
            </div>
          </div>
        ) : (
          <div className="absolute inset-0 flex flex-col items-center justify-center text-gray-500">
            <Loader2 className="w-8 h-8 animate-spin mb-2" />
            <span className="text-sm">Recherche GPS...</span>
          </div>
        )}

        {/* Coordinates display */}
        {hasLocation && (
          <div className="absolute bottom-3 left-3 right-3">
            <div className="bg-gray-900/80 backdrop-blur-sm rounded-xl px-3 py-2 border border-gray-700/50">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <MapPin className={cn(
                    "w-4 h-4",
                    isOnline ? "text-emerald-400" : "text-gray-400"
                  )} />
                  <span className="text-gray-300 text-xs font-mono">
                    {latitude?.toFixed(4)}, {longitude?.toFixed(4)}
                  </span>
                </div>
                <div className={cn(
                  "w-2 h-2 rounded-full",
                  isOnline ? "bg-emerald-400 animate-pulse" : "bg-gray-500"
                )} />
              </div>
            </div>
          </div>
        )}

        {/* Expand button */}
        {onExpand && (
          <Button
            variant="ghost"
            size="icon"
            onClick={onExpand}
            className="absolute top-3 right-3 h-8 w-8 bg-gray-900/80 backdrop-blur-sm border border-gray-700/50 text-gray-300 hover:text-white hover:bg-gray-800/80 rounded-lg"
          >
            <Maximize2 className="w-4 h-4" />
          </Button>
        )}
      </div>
    </div>
  );
}
