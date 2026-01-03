/**
 * BOUTON GO EN LIGNE - ULTRA PROFESSIONNEL
 * Design moderne avec animations fluides
 */

import { Power, Loader2, Wifi, WifiOff, Zap, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";

interface GoOnlineButtonProps {
  isOnline: boolean;
  isLoading: boolean;
  hasSubscription: boolean;
  onToggle: () => void;
}

export function GoOnlineButton({ 
  isOnline, 
  isLoading, 
  hasSubscription,
  onToggle 
}: GoOnlineButtonProps) {
  return (
    <div className="flex flex-col items-center justify-center py-4 space-y-4">
      {/* Main Button Container - plus compact */}
      <div className="relative">
        {/* Outer pulsing ring when online */}
        {isOnline && !isLoading && (
          <>
            <div className="absolute inset-0 rounded-full bg-emerald-500/20 animate-ping" style={{ animationDuration: '2s' }} />
            <div className="absolute -inset-2 rounded-full bg-emerald-500/10 animate-pulse" />
          </>
        )}
        
        {/* Glow effect */}
        <div className={cn(
          "absolute -inset-2 rounded-full blur-xl transition-all duration-500",
          isOnline 
            ? "bg-emerald-500/30 opacity-100" 
            : "bg-gray-500/20 opacity-50"
        )} />
        
        {/* Main Button - taille réduite pour mobile */}
        <button
          onClick={onToggle}
          disabled={isLoading || !hasSubscription}
          className={cn(
            "relative w-28 h-28 sm:w-32 sm:h-32 rounded-full",
            "flex flex-col items-center justify-center gap-1.5",
            "font-bold text-base uppercase tracking-wider",
            "transition-all duration-300 transform",
            "shadow-2xl",
            "disabled:opacity-60 disabled:cursor-not-allowed",
            isLoading && "animate-pulse",
            !isLoading && !isOnline && hasSubscription && "hover:scale-105 active:scale-95",
            isOnline 
              ? "bg-gradient-to-br from-emerald-400 via-emerald-500 to-teal-600 text-white shadow-emerald-500/50" 
              : "bg-gradient-to-br from-gray-700 via-gray-800 to-gray-900 text-gray-300 shadow-black/50 border border-gray-600"
          )}
        >
          {/* Inner gradient overlay */}
          <div className={cn(
            "absolute inset-1 rounded-full transition-opacity duration-300",
            isOnline 
              ? "bg-gradient-to-t from-black/20 to-transparent" 
              : "bg-gradient-to-t from-black/30 to-white/5"
          )} />
          
          {/* Icon */}
          <div className="relative z-10">
            {isLoading ? (
              <Loader2 className="w-10 h-10 animate-spin" />
            ) : isOnline ? (
              <Zap className="w-10 h-10 drop-shadow-lg" />
            ) : (
              <Power className="w-10 h-10" />
            )}
          </div>
          
          {/* Text */}
          <span className="relative z-10 text-xs font-black tracking-widest">
            {isLoading ? '...' : isOnline ? 'EN LIGNE' : 'GO'}
          </span>
        </button>
      </div>

      {/* Status indicator - plus compact */}
      <div className={cn(
        "flex items-center gap-2 px-3 py-1.5 rounded-full",
        "text-xs font-medium transition-all duration-300",
        isOnline 
          ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20" 
          : "bg-gray-800/50 text-gray-400 border border-gray-700/50"
      )}>
        {isOnline ? (
          <>
            <Wifi className="w-3.5 h-3.5 animate-pulse" />
            <span>Prêt à recevoir des courses</span>
          </>
        ) : (
          <>
            <WifiOff className="w-3.5 h-3.5" />
            <span>Appuyez pour commencer</span>
          </>
        )}
      </div>

      {/* Subscription warning - plus compact */}
      {!hasSubscription && (
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-400 text-[11px]">
          <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0" />
          <span>Abonnement requis</span>
        </div>
      )}
    </div>
  );
}
