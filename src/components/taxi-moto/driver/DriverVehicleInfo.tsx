/**
 * INFORMATIONS VÉHICULE CONDUCTEUR - MOBILE OPTIMISÉ
 * Affiche: Plaque d'immatriculation, Numéro de gilet, Numéro de série
 */

import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Car, CreditCard, Hash } from "lucide-react";
import { cn } from "@/lib/utils";

interface DriverVehicleInfoProps {
  vehiclePlate?: string;
  giletNumber?: string;
  serialNumber?: string;
  className?: string;
}

export function DriverVehicleInfo({
  vehiclePlate,
  giletNumber,
  serialNumber,
  className
}: DriverVehicleInfoProps) {
  // Ne pas afficher si aucune information
  const hasInfo = vehiclePlate || giletNumber || serialNumber;
  
  if (!hasInfo) {
    return null;
  }

  return (
    <div className={cn(
      "relative overflow-hidden",
      "bg-gradient-to-br from-gray-800/50 to-gray-900/50",
      "backdrop-blur-sm",
      "rounded-xl p-3",
      "border border-gray-700/50",
      className
    )}>
      {/* Subtle gradient overlay */}
      <div className="absolute inset-0 bg-gradient-to-r from-blue-500/5 via-transparent to-purple-500/5" />
      
      <div className="relative">
        {/* Header compact */}
        <div className="flex items-center gap-2 mb-2">
          <div className="w-6 h-6 rounded-md bg-blue-500/20 flex items-center justify-center">
            <Car className="w-3 h-3 text-blue-400" />
          </div>
          <h3 className="text-white font-semibold text-xs">Véhicule</h3>
        </div>

        {/* Vehicle Info - Horizontal compact layout */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* Plaque d'immatriculation */}
          {vehiclePlate && (
            <div className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-gray-800/30 border border-gray-700/30">
              <CreditCard className="w-3 h-3 text-blue-400" />
              <span className="text-gray-400 text-[10px]">Plaque:</span>
              <span className="text-white text-[10px] font-mono font-medium">{vehiclePlate}</span>
            </div>
          )}

          {/* Numéro de gilet */}
          {giletNumber && (
            <div className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-gray-800/30 border border-gray-700/30">
              <CreditCard className="w-3 h-3 text-green-400" />
              <span className="text-gray-400 text-[10px]">Gilet:</span>
              <span className="text-white text-[10px] font-mono font-medium">{giletNumber}</span>
            </div>
          )}

          {/* Numéro de série moto */}
          {serialNumber && (
            <div className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-gray-800/30 border border-gray-700/30">
              <Hash className="w-3 h-3 text-purple-400" />
              <span className="text-gray-400 text-[10px]">Série:</span>
              <span className="text-white text-[10px] font-mono font-medium truncate max-w-[80px]" title={serialNumber}>
                {serialNumber}
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
