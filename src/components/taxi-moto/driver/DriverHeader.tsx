/**
 * HEADER CONDUCTEUR TAXI-MOTO - UBER/BOLT STYLE
 * Design épuré, sombre avec accents verts
 */

import { Bell, LogOut, Menu } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { WalletBalanceWidget } from "@/components/wallet/WalletBalanceWidget";
import { QuickTransferButton } from "@/components/wallet/QuickTransferButton";
import { DriverSubscriptionButton } from "@/components/driver/DriverSubscriptionButton";
import { TaxiMotoSOSButton } from "@/components/taxi-moto/TaxiMotoSOSButton";
import { UserIdDisplay } from "@/components/UserIdDisplay";

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
    <header className="bg-gray-900 text-white sticky top-0 z-40 shadow-xl">
      <div className="px-4 py-3 safe-area-inset-top">
        <div className="flex items-center justify-between">
          {/* Left: Driver Info */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-emerald-400 to-emerald-600 flex items-center justify-center text-lg font-bold shadow-lg">
              {firstName?.charAt(0)?.toUpperCase() || 'C'}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="font-semibold text-sm">
                  {firstName || 'Conducteur'}
                </h1>
                <Badge 
                  variant="outline" 
                  className={`text-[10px] px-1.5 py-0 border ${
                    isOnline 
                      ? 'bg-emerald-500/20 border-emerald-500 text-emerald-400' 
                      : 'bg-gray-700 border-gray-600 text-gray-400'
                  }`}
                >
                  {isOnline ? '● EN LIGNE' : '○ HORS LIGNE'}
                </Badge>
              </div>
              <div className="flex items-center gap-2 text-xs text-gray-400">
                <UserIdDisplay layout="horizontal" showBadge={false} className="text-[10px]" />
                {hasLocation && (
                  <>
                    <span className="text-emerald-400">•</span>
                    <span className="text-emerald-400 text-[10px]">GPS</span>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Right: Actions */}
          <div className="flex items-center gap-2">
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
              className="text-white hover:bg-white/10 h-9 w-9"
            />
            
            <Button 
              variant="ghost" 
              size="icon"
              className="relative text-white hover:bg-white/10 h-9 w-9"
            >
              <Bell className="w-5 h-5" />
              {unreadCount > 0 && (
                <span className="absolute -top-0.5 -right-0.5 bg-red-500 text-white text-[10px] rounded-full w-4 h-4 flex items-center justify-center font-bold">
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </Button>
            
            <Button
              onClick={onSignOut}
              variant="ghost"
              size="icon"
              className="text-white hover:bg-white/10 h-9 w-9"
            >
              <LogOut className="w-5 h-5" />
            </Button>
          </div>
        </div>
      </div>
    </header>
  );
}
