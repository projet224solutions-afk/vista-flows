/**
 * BOUTON GO EN LIGNE - UBER/BOLT STYLE
 * Grand bouton central animé pour passer en ligne
 */

import { Power, Loader2, Wifi, WifiOff } from "lucide-react";
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
    <div className="flex flex-col items-center justify-center py-8 relative">
      {/* Background glow effect */}
      {isOnline && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="w-48 h-48 bg-emerald-500/10 rounded-full blur-3xl animate-pulse" />
        </div>
      )}
      
      {/* Main button container */}
      <div className="relative">
        {/* Animated outer rings when online */}
        {isOnline && (
          <>
            <div 
              className="absolute inset-0 -m-6 rounded-full border-2 border-emerald-400/30 animate-ping" 
              style={{ animationDuration: '3s' }} 
            />
            <div 
              className="absolute inset-0 -m-4 rounded-full border border-emerald-400/40" 
              style={{ animation: 'pulse 2s ease-in-out infinite' }} 
            />
            <div 
              className="absolute inset-0 -m-2 rounded-full bg-emerald-500/20" 
              style={{ animation: 'pulse 1.5s ease-in-out infinite' }} 
            />
          </>
        )}
        
        {/* Static outer ring */}
        <div className={cn(
          "absolute inset-0 -m-1 rounded-full transition-all duration-500",
          isOnline 
            ? "bg-gradient-to-br from-emerald-400/30 to-emerald-600/30" 
            : "bg-gradient-to-br from-gray-600/20 to-gray-800/20"
        )} />
        
        {/* Main button */}
        <button
          onClick={onToggle}
          disabled={isLoading || !hasSubscription}
          className={cn(
            "relative w-36 h-36 rounded-full flex flex-col items-center justify-center transition-all duration-500",
            "active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed",
            "border-2",
            isOnline 
              ? "bg-gradient-to-br from-emerald-400 via-emerald-500 to-emerald-700 text-white border-emerald-300/50 shadow-[0_0_60px_rgba(16,185,129,0.4)]" 
              : "bg-gradient-to-br from-gray-700 via-gray-800 to-gray-950 text-gray-300 border-gray-600/50 shadow-[0_0_40px_rgba(0,0,0,0.5)]",
            !isLoading && "hover:scale-105 hover:shadow-2xl"
          )}
        >
          {/* Inner glow */}
          <div className={cn(
            "absolute inset-2 rounded-full opacity-50",
            isOnline 
              ? "bg-gradient-to-t from-transparent to-white/20" 
              : "bg-gradient-to-t from-transparent to-white/5"
          )} />
          
          {isLoading ? (
            <Loader2 className="w-14 h-14 animate-spin relative z-10" />
          ) : (
            <div className="relative z-10 flex flex-col items-center">
              <Power className={cn(
                "w-12 h-12 mb-2 transition-all duration-500",
                isOnline ? "drop-shadow-[0_0_10px_rgba(255,255,255,0.5)]" : ""
              )} />
              <span className={cn(
                "text-base font-black tracking-widest",
                isOnline ? "text-white" : "text-gray-300"
              )}>
                {isOnline ? 'EN LIGNE' : 'GO'}
              </span>
            </div>
          )}
        </button>
      </div>
      
      {/* Status indicator with icon */}
      <div className={cn(
        "mt-6 flex items-center gap-2 px-4 py-2 rounded-full transition-all duration-300",
        isOnline 
          ? "bg-emerald-500/10 border border-emerald-500/20" 
          : "bg-gray-800/50 border border-gray-700/30"
      )}>
        {isOnline ? (
          <Wifi className="w-4 h-4 text-emerald-400" />
        ) : (
          <WifiOff className="w-4 h-4 text-gray-500" />
        )}
        <p className={cn(
          "text-sm font-medium",
          isOnline ? "text-emerald-400" : "text-gray-500"
        )}>
          {isLoading 
            ? "Connexion en cours..." 
            : isOnline 
              ? "Vous recevez des courses" 
              : "Appuyez pour commencer"
          }
        </p>
      </div>
      
      {!hasSubscription && (
        <div className="mt-4 flex items-center gap-2 px-4 py-2 bg-amber-500/10 border border-amber-500/20 rounded-xl">
          <span className="text-amber-400 text-xs font-medium">
            ⚠️ Abonnement requis pour recevoir des courses
          </span>
        </div>
      )}
    </div>
  );
}
