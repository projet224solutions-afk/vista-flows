/**
 * STATISTIQUES DU JOUR - UBER/BOLT STYLE
 * Affichage horizontal des statistiques clés
 */

import { DollarSign, Car, Star, Clock } from "lucide-react";

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
      value: `${todayEarnings.toLocaleString()} GNF`,
      color: "text-emerald-400",
      bgColor: "bg-emerald-500/10"
    },
    {
      icon: Car,
      label: "Courses",
      value: todayRides.toString(),
      color: "text-blue-400",
      bgColor: "bg-blue-500/10"
    },
    {
      icon: Star,
      label: "Note",
      value: rating > 0 ? rating.toFixed(1) : "—",
      color: "text-amber-400",
      bgColor: "bg-amber-500/10"
    },
    {
      icon: Clock,
      label: "En ligne",
      value: onlineTime || "0h",
      color: "text-purple-400",
      bgColor: "bg-purple-500/10"
    }
  ];

  return (
    <div className="grid grid-cols-4 gap-2 px-4 py-3 bg-gray-900/50 backdrop-blur-sm border-b border-gray-800">
      {stats.map((stat) => (
        <div 
          key={stat.label}
          className="flex flex-col items-center text-center"
        >
          <div className={`w-8 h-8 rounded-full ${stat.bgColor} flex items-center justify-center mb-1`}>
            <stat.icon className={`w-4 h-4 ${stat.color}`} />
          </div>
          <span className="text-white font-semibold text-xs truncate w-full">
            {stat.value}
          </span>
          <span className="text-gray-500 text-[10px]">
            {stat.label}
          </span>
        </div>
      ))}
    </div>
  );
}
