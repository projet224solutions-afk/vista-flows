/**
 * HEADER CONDUCTEUR TAXI-MOTO - ULTRA PROFESSIONNEL
 * Design élégant, moderne avec glassmorphism
 */

import { Bell, LogOut, Wifi, WifiOff, MapPin, Shield } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DriverSubscriptionButton } from "@/components/driver/DriverSubscriptionButton";
import { TaxiMotoSOSButton } from "@/components/taxi-moto/TaxiMotoSOSButton";
import { UserIdDisplay } from "@/components/UserIdDisplay";
import { QuickTransferButton } from "@/components/wallet/QuickTransferButton";
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
  return (
    <header className="relative bg-gradient-to-r from-gray-900 via-gray-900 to-gray-800 text-white sticky top-0 z-40">
      {/* Subtle gradient overlay */}
      <div className="absolute inset-0 bg-gradient-to-b from-emerald-500/5 to-transparent pointer-events-none" />
      
      <div className="relative px-4 py-3 safe-area-inset-top">
        <div className="flex items-center justify-between">
          {/* Left: Driver Info */}
          <div className="flex items-center gap-3">
            {/* Avatar with status ring */}
            <div className="relative">
              <div className={cn(
                "w-12 h-12 rounded-full flex items-center justify-center text-lg font-bold",
                "bg-gradient-to-br from-emerald-400 via-emerald-500 to-teal-600",
                "shadow-lg shadow-emerald-500/30",
                "ring-2 ring-offset-2 ring-offset-gray-900",
                isOnline ? "ring-emerald-400" : "ring-gray-600"
              )}>
                {firstName?.charAt(0)?.toUpperCase() || 'C'}
              </div>
              {/* Online indicator dot */}
              <span className={cn(
                "absolute -bottom-0.5 -right-0.5 w-4 h-4 rounded-full border-2 border-gray-900",
                isOnline ? "bg-emerald-400 animate-pulse" : "bg-gray-500"
              )} />
            </div>
            
            <div className="space-y-0.5">
              <div className="flex items-center gap-2">
                <h1 className="font-bold text-base tracking-tight">
                  {firstName || 'Conducteur'}
                </h1>
              </div>
              
              {/* Status badges */}
              <div className="flex items-center gap-2">
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
              
              <UserIdDisplay layout="horizontal" showBadge={false} className="text-[10px] text-gray-500" />
            </div>
          </div>

          {/* Right: Actions */}
          <div className="flex items-center gap-1.5">
            <DriverSubscriptionButton />
            
            {isOnline && driverId && (
              <TaxiMotoSOSButton
                taxiId={driverId}
                driverName={driverName}
                driverPhone={driverPhone}
                variant="compact"
              />
            )}
            
            <QuickTransferButton 
              variant="ghost" 
              size="icon" 
              showText={false}
              className="text-gray-300 hover:text-white hover:bg-white/10 h-9 w-9 rounded-xl"
            />
            
            <Button 
              variant="ghost" 
              size="icon"
              className="relative text-gray-300 hover:text-white hover:bg-white/10 h-9 w-9 rounded-xl"
            >
              <Bell className="w-5 h-5" />
              {unreadCount > 0 && (
                <span className="absolute -top-0.5 -right-0.5 bg-red-500 text-white text-[10px] rounded-full min-w-[18px] h-[18px] flex items-center justify-center font-bold px-1 shadow-lg shadow-red-500/50">
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </Button>
            
            <Button
              onClick={onSignOut}
              variant="ghost"
              size="icon"
              className="text-gray-300 hover:text-white hover:bg-white/10 h-9 w-9 rounded-xl"
            >
              <LogOut className="w-5 h-5" />
            </Button>
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
