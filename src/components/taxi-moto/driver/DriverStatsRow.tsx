/**
 * STATISTIQUES CONDUCTEUR - ULTRA PROFESSIONNEL
 * Cards élégantes avec animations et gradients
 */

import { Wallet, Car, Star, Clock, TrendingUp } from "lucide-react";
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
      label: "Gains",
      value: `${(todayEarnings || 0).toLocaleString()}`,
      suffix: "GNF",
      icon: Wallet,
      color: "emerald",
      gradient: "from-emerald-500/20 to-emerald-600/10",
      iconBg: "bg-emerald-500/20",
      iconColor: "text-emerald-400"
    },
    {
      id: 'rides',
      label: "Courses",
      value: (todayRides || 0).toString(),
      suffix: "aujourd'hui",
      icon: Car,
      color: "blue",
      gradient: "from-blue-500/20 to-blue-600/10",
      iconBg: "bg-blue-500/20",
      iconColor: "text-blue-400"
    },
    {
      id: 'rating',
      label: "Note",
      value: (rating || 5.0).toFixed(1),
      suffix: "/5.0",
      icon: Star,
      color: "amber",
      gradient: "from-amber-500/20 to-amber-600/10",
      iconBg: "bg-amber-500/20",
      iconColor: "text-amber-400"
    },
    {
      id: 'time',
      label: "Temps",
      value: onlineTime || '0m',
      suffix: "en ligne",
      icon: Clock,
      color: "purple",
      gradient: "from-purple-500/20 to-purple-600/10",
      iconBg: "bg-purple-500/20",
      iconColor: "text-purple-400"
    }
  ];

  return (
    <div className="px-3 py-4">
      <div className="grid grid-cols-4 gap-2">
        {stats.map((stat) => (
          <button
            key={stat.id}
            onClick={() => onStatClick?.(stat.id)}
            className={cn(
              "relative overflow-hidden",
              "bg-gradient-to-br from-gray-800/80 to-gray-900/80",
              "backdrop-blur-sm",
              "rounded-2xl p-3",
              "border border-gray-700/50",
              "transition-all duration-300",
              "hover:border-gray-600/50 hover:scale-[1.02]",
              "active:scale-[0.98]",
              "group"
            )}
          >
            {/* Gradient overlay on hover */}
            <div className={cn(
              "absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300",
              `bg-gradient-to-br ${stat.gradient}`
            )} />
            
            {/* Content */}
            <div className="relative z-10 flex flex-col items-center text-center gap-1.5">
              {/* Icon */}
              <div className={cn(
                "w-8 h-8 rounded-xl flex items-center justify-center",
                stat.iconBg
              )}>
                <stat.icon className={cn("w-4 h-4", stat.iconColor)} />
              </div>
              
              {/* Value */}
              <div className="flex flex-col">
                <span className="text-white font-bold text-sm leading-tight">
                  {stat.value}
                </span>
                <span className="text-gray-500 text-[9px] font-medium uppercase tracking-wide">
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
