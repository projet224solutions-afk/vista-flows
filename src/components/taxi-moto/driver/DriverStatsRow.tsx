/**
 * STATISTIQUES CONDUCTEUR - ULTRA PROFESSIONNEL
 * Cards élégantes optimisées pour mobile
 */

import { Wallet, Car, Star, Clock } from "lucide-react";
import { cn } from "@/lib/utils";

interface DriverStatsRowProps {
  todayEarnings: number;
  todayRides: number;
  rating: number;
  onlineTime: string;
  onStatClick?: (statId: string) => void;
}

export function DriverStatsRow({
  todayEarnings,
  todayRides,
  rating,
  onlineTime,
  onStatClick
}: DriverStatsRowProps) {
  const stats = [
    {
      id: 'earnings',
      value: `${(todayEarnings || 0).toLocaleString()}`,
      suffix: "GNF",
      icon: Wallet,
      iconBg: "bg-emerald-500/20",
      iconColor: "text-emerald-400",
      clickable: true
    },
    {
      id: 'rides',
      value: (todayRides || 0).toString(),
      suffix: "COURSES",
      icon: Car,
      iconBg: "bg-blue-500/20",
      iconColor: "text-blue-400",
      clickable: false
    },
    {
      id: 'rating',
      value: rating > 0 ? rating.toFixed(1) : '—',
      suffix: "NOTE",
      icon: Star,
      iconBg: "bg-amber-500/20",
      iconColor: "text-amber-400",
      clickable: true
    },
    {
      id: 'time',
      value: onlineTime || '0m',
      suffix: "EN LIGNE",
      icon: Clock,
      iconBg: "bg-purple-500/20",
      iconColor: "text-purple-400",
      clickable: false
    }
  ];

  return (
    <div className="px-2 py-3 w-full overflow-x-auto scrollbar-hide">
      <div className="grid grid-cols-4 gap-1.5 min-w-[300px]">
        {stats.map((stat) => (
          <button
            key={stat.id}
            onClick={() => stat.clickable && onStatClick?.(stat.id)}
            disabled={!stat.clickable}
            className={cn(
              "relative overflow-hidden",
              "bg-gradient-to-br from-gray-800/80 to-gray-900/80",
              "backdrop-blur-sm",
              "rounded-xl p-2",
              "border border-gray-700/50",
              "transition-all duration-200",
              stat.clickable && "active:scale-[0.97] cursor-pointer hover:border-gray-600/50",
              !stat.clickable && "cursor-default",
              "group"
            )}
          >
            {/* Content */}
            <div className="flex flex-col items-center text-center gap-1">
              {/* Icon - plus petit */}
              <div className={cn(
                "w-7 h-7 rounded-lg flex items-center justify-center",
                stat.iconBg
              )}>
                <stat.icon className={cn("w-3.5 h-3.5", stat.iconColor)} />
              </div>
              
              {/* Value - optimisé */}
              <div className="flex flex-col w-full">
                <span className="text-white font-bold text-xs leading-tight truncate">
                  {stat.value}
                </span>
                <span className="text-gray-500 text-[8px] font-medium uppercase tracking-wide truncate">
                  {stat.suffix}
                </span>
              </div>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
