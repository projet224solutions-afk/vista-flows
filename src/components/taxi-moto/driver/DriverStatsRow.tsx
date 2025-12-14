/**
 * STATISTIQUES DU JOUR - UBER/BOLT STYLE
 * Affichage horizontal des statistiques clés
 */

import { DollarSign, Car, Star, Clock, TrendingUp } from "lucide-react";
import { cn } from "@/lib/utils";

interface DriverStatsRowProps {
  todayEarnings: number;
  todayRides: number;
  rating: number;
  onlineTime: string;
}

export function DriverStatsRow({ 
  todayEarnings, 
  todayRides, 
  rating,
  onlineTime 
}: DriverStatsRowProps) {
  const stats = [
    {
      icon: DollarSign,
      label: "Gains",
      value: `${todayEarnings.toLocaleString()}`,
      unit: "GNF",
      color: "text-emerald-400",
      bgColor: "bg-emerald-500/20",
      borderColor: "border-emerald-500/30"
    },
    {
      icon: Car,
      label: "Courses",
      value: todayRides.toString(),
      unit: "aujourd'hui",
      color: "text-blue-400",
      bgColor: "bg-blue-500/20",
      borderColor: "border-blue-500/30"
    },
    {
      icon: Star,
      label: "Note",
      value: rating > 0 ? rating.toFixed(1) : "—",
      unit: "/5.0",
      color: "text-amber-400",
      bgColor: "bg-amber-500/20",
      borderColor: "border-amber-500/30"
    },
    {
      icon: Clock,
      label: "En ligne",
      value: onlineTime || "0",
      unit: "heures",
      color: "text-purple-400",
      bgColor: "bg-purple-500/20",
      borderColor: "border-purple-500/30"
    }
  ];

  return (
    <div className="px-3 py-4 bg-gradient-to-b from-gray-900 to-gray-950 border-b border-gray-800/50">
      <div className="flex items-center gap-2 mb-3 px-1">
        <TrendingUp className="w-4 h-4 text-emerald-400" />
        <span className="text-xs font-medium text-gray-400 uppercase tracking-wider">Statistiques du jour</span>
      </div>
      
      <div className="grid grid-cols-4 gap-2">
        {stats.map((stat, index) => (
          <div 
            key={stat.label}
            className={cn(
              "relative flex flex-col items-center p-2.5 rounded-xl border backdrop-blur-sm",
              "bg-gray-800/40 transition-all duration-300",
              stat.borderColor,
              "hover:scale-[1.02] hover:bg-gray-800/60"
            )}
            style={{ animationDelay: `${index * 100}ms` }}
          >
            <div className={cn(
              "w-9 h-9 rounded-xl flex items-center justify-center mb-2",
              stat.bgColor
            )}>
              <stat.icon className={cn("w-4.5 h-4.5", stat.color)} />
            </div>
            <span className={cn("font-bold text-sm", stat.color)}>
              {stat.value}
            </span>
            <span className="text-gray-500 text-[9px] mt-0.5 text-center leading-tight">
              {stat.label}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
