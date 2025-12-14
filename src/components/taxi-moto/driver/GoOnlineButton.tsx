/**
 * BOUTON GO EN LIGNE - UBER/BOLT STYLE
 * Grand bouton central animé pour passer en ligne
 */

import { Power, Loader2 } from "lucide-react";
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
    <div className="flex flex-col items-center justify-center py-6">
      {/* Outer ring animation */}
      <div className={cn(
        "relative",
        isOnline && "animate-pulse"
      )}>
        {/* Pulsing rings when online */}
        {isOnline && (
          <>
            <div className="absolute inset-0 -m-4 rounded-full bg-emerald-500/20 animate-ping" style={{ animationDuration: '2s' }} />
            <div className="absolute inset-0 -m-2 rounded-full bg-emerald-500/30 animate-ping" style={{ animationDuration: '1.5s' }} />
          </>
        )}
        
        {/* Main button */}
        <button
          onClick={onToggle}
          disabled={isLoading || !hasSubscription}
          className={cn(
            "relative w-32 h-32 rounded-full flex flex-col items-center justify-center transition-all duration-500 shadow-2xl",
            "active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed",
            isOnline 
              ? "bg-gradient-to-br from-emerald-400 to-emerald-600 text-white shadow-emerald-500/50" 
              : "bg-gradient-to-br from-gray-700 to-gray-900 text-gray-300 shadow-gray-900/50",
            !isLoading && "hover:scale-105"
          )}
        >
          {isLoading ? (
            <Loader2 className="w-12 h-12 animate-spin" />
          ) : (
            <>
              <Power className={cn(
                "w-10 h-10 mb-1 transition-transform duration-300",
                isOnline && "rotate-180"
              )} />
              <span className="text-sm font-bold tracking-wide">
                {isOnline ? 'EN LIGNE' : 'GO'}
              </span>
            </>
          )}
        </button>
      </div>
      
      {/* Status text */}
      <p className={cn(
        "mt-4 text-sm font-medium transition-colors",
        isOnline ? "text-emerald-400" : "text-gray-500"
      )}>
        {isLoading 
          ? "Connexion..." 
          : isOnline 
            ? "Appuyez pour vous déconnecter" 
            : "Appuyez pour recevoir des courses"
        }
      </p>
      
      {!hasSubscription && (
        <p className="mt-2 text-xs text-amber-400 text-center px-8">
          ⚠️ Abonnement requis pour recevoir des courses
        </p>
      )}
    </div>
  );
}
