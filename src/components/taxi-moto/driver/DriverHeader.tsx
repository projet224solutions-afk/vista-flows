/**
 * HEADER CONDUCTEUR TAXI-MOTO - ULTRA PROFESSIONNEL
 * Design élégant, moderne avec glassmorphism
 * Optimisé pour mobile
 */

import { Bell, LogOut, Wifi, WifiOff, MapPin, Home } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { TaxiMotoSOSButton } from "@/components/taxi-moto/TaxiMotoSOSButton";
import { cn } from "@/lib/utils";

interface DriverHeaderProps {
  firstName: string;
  isOnline: boolean;
  hasLocation: boolean;
  unreadCount: number;
  driverId: string | null;
  driverName: string;
  driverPhone: string;
  onSignOut: () => void;
}

export function DriverHeader({
  firstName,
  isOnline,
  hasLocation,
  unreadCount,
  driverId,
  driverName,
  driverPhone,
  onSignOut
}: DriverHeaderProps) {
  const navigate = useNavigate();

  const handleBackToDashboard = () => {
    navigate('/');
  };

  return (
    <header className="relative bg-gradient-to-r from-gray-900 via-gray-900 to-gray-800 text-white sticky top-0 z-40 w-full overflow-hidden">
      {/* Subtle gradient overlay */}
      <div className="absolute inset-0 bg-gradient-to-b from-emerald-500/5 to-transparent pointer-events-none" />
      
      <div className="relative px-3 py-2.5 safe-area-inset-top w-full">
        <div className="flex items-center justify-between gap-2 w-full">
          {/* Left: Home + Avatar + Status */}
          <div className="flex items-center gap-2 min-w-0 flex-1">
            {/* Home Button */}
            <Button
              onClick={handleBackToDashboard}
              variant="ghost"
              size="icon"
              className="text-gray-300 hover:text-white hover:bg-white/10 h-8 w-8 rounded-lg shrink-0"
              title="Retour"
            >
              <Home className="w-4 h-4" />
            </Button>
            
            {/* Avatar compact avec status */}
            <div className="relative shrink-0">
              <div className={cn(
                "w-10 h-10 rounded-full flex items-center justify-center text-base font-bold",
                "bg-gradient-to-br from-emerald-400 via-emerald-500 to-teal-600",
                "shadow-lg shadow-emerald-500/30",
                "ring-2 ring-offset-1 ring-offset-gray-900",
                isOnline ? "ring-emerald-400" : "ring-gray-600"
              )}>
                {firstName?.charAt(0)?.toUpperCase() || 'C'}
              </div>
              {/* Online indicator */}
              <span className={cn(
                "absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-gray-900",
                isOnline ? "bg-emerald-400 animate-pulse" : "bg-gray-500"
              )} />
            </div>
          </div>

          {/* Center: SOS Button (priority) */}
          {isOnline && driverId && (
            <TaxiMotoSOSButton
              taxiId={driverId}
              driverName={driverName}
              driverPhone={driverPhone}
              variant="compact"
              className="shrink-0"
            />
          )}

          {/* Right: Actions compactes */}
          <div className="flex items-center gap-1 shrink-0">
            {/* Quick Transfer removed for mobile space */}
            
            {/* Notifications */}
            <Button 
              variant="ghost" 
              size="icon"
              className="relative text-gray-300 hover:text-white hover:bg-white/10 h-8 w-8 rounded-lg"
            >
              <Bell className="w-4 h-4" />
              {unreadCount > 0 && (
                <span className="absolute -top-0.5 -right-0.5 bg-red-500 text-white text-[9px] rounded-full min-w-[16px] h-[16px] flex items-center justify-center font-bold px-0.5 shadow-lg">
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </Button>
            
            {/* Logout */}
            <Button
              onClick={onSignOut}
              variant="ghost"
              size="icon"
              className="text-gray-300 hover:text-white hover:bg-white/10 h-8 w-8 rounded-lg"
            >
              <LogOut className="w-4 h-4" />
            </Button>
          </div>
        </div>
        
        {/* Ligne de statut sous le header - plus compact */}
        <div className="flex items-center justify-between mt-2 gap-2">
          {/* Status badges à gauche */}
          <div className="flex items-center gap-1.5 flex-wrap">
            <div className={cn(
              "flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium",
              isOnline 
                ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30" 
                : "bg-gray-800 text-gray-400 border border-gray-700"
            )}>
              {isOnline ? <Wifi className="w-3 h-3" /> : <WifiOff className="w-3 h-3" />}
              {isOnline ? 'EN LIGNE' : 'HORS LIGNE'}
            </div>
            
            {hasLocation && (
              <div className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-blue-500/20 text-blue-400 border border-blue-500/30">
                <MapPin className="w-3 h-3" />
                GPS
              </div>
            )}
          </div>
        </div>
      </div>
      
      {/* Bottom border glow when online */}
      {isOnline && (
        <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-emerald-500/50 to-transparent" />
      )}
    </header>
  );
}
