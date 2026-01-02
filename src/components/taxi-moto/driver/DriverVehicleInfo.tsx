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
  return (
    <div className={cn(
      "relative overflow-hidden",
      "bg-gradient-to-br from-gray-800/50 to-gray-900/50",
      "backdrop-blur-sm",
      "rounded-2xl p-4",
      "border border-gray-700/50",
      className
    )}>
      {/* Subtle gradient overlay */}
      <div className="absolute inset-0 bg-gradient-to-r from-blue-500/5 via-transparent to-purple-500/5" />
      
      <div className="relative space-y-3">
        {/* Header */}
        <div className="flex items-center gap-2 mb-3">
          <div className="w-8 h-8 rounded-lg bg-blue-500/20 flex items-center justify-center">
            <Car className="w-4 h-4 text-blue-400" />
          </div>
          <h3 className="text-white font-semibold text-sm">Informations du véhicule</h3>
        </div>

        {/* Vehicle Info Grid */}
        <div className="grid grid-cols-1 gap-3">
          {/* Plaque d'immatriculation */}
          <div className="flex items-center justify-between py-2 px-3 rounded-xl bg-gray-800/30 border border-gray-700/30">
            <div className="flex items-center gap-2">
              <CreditCard className="w-4 h-4 text-blue-400" />
              <span className="text-gray-300 text-sm font-medium">Plaque</span>
            </div>
            <Badge 
              variant="outline" 
              className="font-mono text-xs bg-gray-900/50 border-gray-700 text-white"
            >
              {vehiclePlate || 'Non renseignée'}
            </Badge>
          </div>

          {/* Numéro de gilet */}
          <div className="flex items-center justify-between py-2 px-3 rounded-xl bg-gray-800/30 border border-gray-700/30">
            <div className="flex items-center gap-2">
              <CreditCard className="w-4 h-4 text-green-400" />
              <span className="text-gray-300 text-sm font-medium">N° Gilet</span>
            </div>
            <Badge 
              variant="outline" 
              className="font-mono text-xs bg-gray-900/50 border-gray-700 text-white"
            >
              {giletNumber || 'Non renseigné'}
            </Badge>
          </div>

          {/* Numéro de série moto */}
          <div className="flex items-center justify-between py-2 px-3 rounded-xl bg-gray-800/30 border border-gray-700/30">
            <div className="flex items-center gap-2">
              <Hash className="w-4 h-4 text-purple-400" />
              <span className="text-gray-300 text-sm font-medium">N° Série</span>
            </div>
            <Badge 
              variant="outline" 
              className="font-mono text-xs bg-gray-900/50 border-gray-700 text-white truncate max-w-[140px]"
              title={serialNumber}
            >
              {serialNumber || 'Non renseigné'}
            </Badge>
          </div>
        </div>

        {/* Footer note */}
        {(!vehiclePlate || !giletNumber || !serialNumber) && (
          <p className="text-xs text-gray-500 text-center mt-2">
            Complétez vos informations dans Paramètres
          </p>
        )}
      </div>
    </div>
  );
}
