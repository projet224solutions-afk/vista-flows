/**
 * CARTE STATISTIQUES CHAUFFEUR
 * Affiche les statistiques en temps réel
 */

import { Card, CardContent } from '@/components/ui/card';
import { DollarSign, TrendingUp, Star, Clock } from 'lucide-react';

interface DriverStatsCardProps {
  stats: {
    todayEarnings: number;
    todayRides: number;
    rating: number;
    onlineTime: string;
    totalRides: number;
  };
}

export function DriverStatsCard({ stats }: DriverStatsCardProps) {
  return (
    <div className="grid grid-cols-2 gap-4">
      <Card className="bg-gradient-to-br from-green-50 to-emerald-50 border-0 shadow-lg hover:shadow-xl transition-shadow">
        <CardContent className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-green-600 rounded-lg">
              <DollarSign className="w-6 h-6 text-white" />
            </div>
            <div className="flex-1">
              <p className="text-xs text-gray-600 font-medium">Aujourd'hui</p>
              <p className="text-2xl font-bold text-green-700">
                {stats.todayEarnings.toLocaleString()}
              </p>
              <p className="text-xs text-gray-500">GNF</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="bg-gradient-to-br from-blue-50 to-indigo-50 border-0 shadow-lg hover:shadow-xl transition-shadow">
        <CardContent className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-blue-600 rounded-lg">
              <TrendingUp className="w-6 h-6 text-white" />
            </div>
            <div className="flex-1">
              <p className="text-xs text-gray-600 font-medium">Courses</p>
              <p className="text-2xl font-bold text-blue-700">{stats.todayRides}</p>
              <p className="text-xs text-gray-500">aujourd'hui</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="bg-gradient-to-br from-yellow-50 to-orange-50 border-0 shadow-lg hover:shadow-xl transition-shadow">
        <CardContent className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-yellow-600 rounded-lg">
              <Star className="w-6 h-6 text-white" />
            </div>
            <div className="flex-1">
              <p className="text-xs text-gray-600 font-medium">Note</p>
              <p className="text-2xl font-bold text-yellow-700 flex items-center gap-1">
                {stats.rating}
                <Star className="w-4 h-4 fill-current" />
              </p>
              <p className="text-xs text-gray-500">{stats.totalRides} courses</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="bg-gradient-to-br from-purple-50 to-pink-50 border-0 shadow-lg hover:shadow-xl transition-shadow">
        <CardContent className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-purple-600 rounded-lg">
              <Clock className="w-6 h-6 text-white" />
            </div>
            <div className="flex-1">
              <p className="text-xs text-gray-600 font-medium">En ligne</p>
              <p className="text-2xl font-bold text-purple-700">{stats.onlineTime}</p>
              <p className="text-xs text-gray-500">aujourd'hui</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
