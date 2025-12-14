/**
 * NAVIGATION INFÉRIEURE - UBER/BOLT STYLE
 * Design sombre avec indicateurs actifs
 */

import { Home, MapPin, History, Settings, Wallet, Navigation } from "lucide-react";
import { cn } from "@/lib/utils";

interface BottomNavigationProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
  hasActiveRide?: boolean;
  onMarketplace?: () => void;
}

export function BottomNavigation({ 
  activeTab, 
  onTabChange,
  hasActiveRide,
  onMarketplace
}: BottomNavigationProps) {
  const navItems = [
    { id: 'dashboard', label: 'Accueil', icon: Home },
    { 
      id: 'navigation', 
      label: hasActiveRide ? 'Navigation' : 'Course', 
      icon: hasActiveRide ? Navigation : MapPin, 
      badge: hasActiveRide,
      highlight: hasActiveRide
    },
    { id: 'earnings', label: 'Gains', icon: Wallet },
    { id: 'settings', label: 'Profil', icon: Settings },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-gray-900 border-t border-gray-800 z-50 safe-area-inset-bottom">
      <div className="grid grid-cols-4 h-16">
        {navItems.map((item) => (
          <button
            key={item.id}
            onClick={() => onTabChange(item.id)}
            className={cn(
              "flex flex-col items-center justify-center gap-1 relative transition-all duration-200",
              item.highlight && activeTab !== item.id
                ? "text-emerald-400"
                : activeTab === item.id 
                  ? "text-emerald-400" 
                  : "text-gray-500 hover:text-gray-300"
            )}
          >
            {/* Active indicator */}
            {activeTab === item.id && (
              <div className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-0.5 bg-emerald-400 rounded-full" />
            )}
            
            {/* Highlight glow for active ride */}
            {item.highlight && activeTab !== item.id && (
              <div className="absolute inset-0 bg-emerald-500/10 rounded-lg" />
            )}
            
            <div className="relative">
              <item.icon className={cn(
                "w-5 h-5 transition-transform",
                activeTab === item.id && "scale-110",
                item.highlight && "animate-pulse"
              )} />
              
              {/* Badge for active ride */}
              {item.badge && (
                <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-emerald-500 rounded-full animate-pulse border border-gray-900" />
              )}
            </div>
            
            <span className={cn(
              "text-[10px] font-medium",
              activeTab === item.id && "font-semibold",
              item.highlight && activeTab !== item.id && "text-emerald-400"
            )}>
              {item.label}
            </span>
          </button>
        ))}
      </div>
    </nav>
  );
}
