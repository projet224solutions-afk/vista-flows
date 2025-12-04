/**
 * STATISTIQUES TRANSPORT/VTC
 * Analyses et métriques du service de transport
 */

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { supabase } from '@/lib/supabaseClient';
import { TrendingUp, Car, DollarSign, MapPin, Clock } from 'lucide-react';
import { format, startOfMonth, endOfMonth } from 'date-fns';
import { fr } from 'date-fns/locale';

interface TransportAnalyticsProps {
  serviceId: string;
}

export function TransportAnalytics({ serviceId }: TransportAnalyticsProps) {
  const [stats, setStats] = useState({
    totalRevenue: 0,
    completedRides: 0,
    activeVehicles: 0,
    averagePrice: 0,
    totalDistance: 0,
    cancelledRides: 0,
    popularRoutes: [] as Array<{ route: string; count: number; revenue: number }>,
    monthlyRevenue: [] as Array<{ month: string; revenue: number; rides: number }>
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadAnalytics();
  }, [serviceId]);

  const loadAnalytics = async () => {
    try {
      // Récupérer les courses
      const { data: rides, error: ridesError } = await supabase
        .from('transport_rides')
        .select('*')
        .eq('service_id', serviceId);

      if (ridesError && ridesError.code !== 'PGRST116') throw ridesError;

      // Récupérer les véhicules
      const { data: vehicles, error: vehiclesError } = await supabase
        .from('transport_vehicles')
        .select('*')
        .eq('service_id', serviceId);

      if (vehiclesError && vehiclesError.code !== 'PGRST116') throw vehiclesError;

      // Calculer les statistiques
      const completedRides = rides?.filter(r => r.status === 'completed') || [];
      const totalRevenue = completedRides.reduce((sum, r) => sum + r.price, 0);
      const totalDistance = completedRides.reduce((sum, r) => sum + (r.distance_km || 0), 0);

      // Routes populaires
      const routeStats = new Map<string, { count: number; revenue: number }>();
      completedRides.forEach(ride => {
        const route = `${ride.pickup_location} → ${ride.dropoff_location}`;
        const current = routeStats.get(route) || { count: 0, revenue: 0 };
        routeStats.set(route, {
          count: current.count + 1,
          revenue: current.revenue + ride.price
        });
      });

      const popularRoutes = Array.from(routeStats.entries())
        .map(([route, data]) => ({ route, ...data }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 5);

      // Revenu mensuel (3 derniers mois)
      const monthlyRevenue: Array<{ month: string; revenue: number; rides: number }> = [];
      for (let i = 2; i >= 0; i--) {
        const date = new Date();
        date.setMonth(date.getMonth() - i);
        const monthStart = startOfMonth(date);
        const monthEnd = endOfMonth(date);

        const monthRides = completedRides.filter(r => {
          const rideDate = new Date(r.pickup_time);
          return rideDate >= monthStart && rideDate <= monthEnd;
        });

        monthlyRevenue.push({
          month: format(date, 'MMMM yyyy', { locale: fr }),
          revenue: monthRides.reduce((sum, r) => sum + r.price, 0),
          rides: monthRides.length
        });
      }

      setStats({
        totalRevenue,
        completedRides: completedRides.length,
        activeVehicles: vehicles?.filter(v => v.status === 'available' || v.status === 'in_use').length || 0,
        averagePrice: completedRides.length ? totalRevenue / completedRides.length : 0,
        totalDistance,
        cancelledRides: rides?.filter(r => r.status === 'cancelled').length || 0,
        popularRoutes,
        monthlyRevenue
      });
    } catch (error) {
      console.error('Erreur chargement analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="text-center py-8">Chargement des statistiques...</div>;
  }

  return (
    <div className="space-y-6">
      {/* KPIs principaux */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Chiffre d'affaires</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalRevenue.toLocaleString()} FCFA</div>
            <p className="text-xs text-muted-foreground">
              {stats.completedRides} courses terminées
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Prix moyen</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{Math.round(stats.averagePrice).toLocaleString()} FCFA</div>
            <p className="text-xs text-muted-foreground">
              {stats.cancelledRides} courses annulées
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Distance totale</CardTitle>
            <MapPin className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalDistance.toFixed(1)} km</div>
            <p className="text-xs text-muted-foreground">
              Moyenne: {stats.completedRides ? (stats.totalDistance / stats.completedRides).toFixed(1) : 0} km/course
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Flotte active</CardTitle>
            <Car className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.activeVehicles}</div>
            <p className="text-xs text-muted-foreground">Véhicules disponibles</p>
          </CardContent>
        </Card>
      </div>

      {/* Routes populaires */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="w-5 h-5" />
            Routes les plus fréquentes
          </CardTitle>
        </CardHeader>
        <CardContent>
          {stats.popularRoutes.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">
              Aucune donnée disponible
            </p>
          ) : (
            <div className="space-y-4">
              {stats.popularRoutes.map((route, index) => (
                <div key={route.route} className="flex items-center gap-4">
                  <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary text-primary-foreground font-bold">
                    {index + 1}
                  </div>
                  <div className="flex-1">
                    <div className="font-medium">{route.route}</div>
                    <div className="text-sm text-muted-foreground">
                      {route.count} course{route.count > 1 ? 's' : ''} • {route.revenue.toLocaleString()} FCFA
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-bold text-primary">
                      {Math.round((route.revenue / stats.totalRevenue) * 100)}%
                    </div>
                    <div className="text-xs text-muted-foreground">du CA</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Évolution mensuelle */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="w-5 h-5" />
            Évolution sur 3 mois
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {stats.monthlyRevenue.map((month) => (
              <div key={month.month}>
                <div className="flex items-center justify-between mb-2">
                  <span className="font-medium capitalize">{month.month}</span>
                  <div className="text-right">
                    <div className="font-bold text-primary">{month.revenue.toLocaleString()} FCFA</div>
                    <div className="text-xs text-muted-foreground">{month.rides} courses</div>
                  </div>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className="bg-primary h-2 rounded-full"
                    style={{
                      width: `${stats.totalRevenue > 0 ? (month.revenue / stats.totalRevenue) * 100 : 0}%`
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Performance */}
      <Card>
        <CardHeader>
          <CardTitle>Taux de réussite</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium">Courses terminées</span>
                <span className="text-sm font-bold">
                  {stats.completedRides + stats.cancelledRides > 0
                    ? Math.round((stats.completedRides / (stats.completedRides + stats.cancelledRides)) * 100)
                    : 0}%
                </span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className="bg-green-600 h-2 rounded-full"
                  style={{
                    width: `${stats.completedRides + stats.cancelledRides > 0
                      ? (stats.completedRides / (stats.completedRides + stats.cancelledRides)) * 100
                      : 0}%`
                  }}
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium">Courses annulées</span>
                <span className="text-sm font-bold text-red-600">
                  {stats.completedRides + stats.cancelledRides > 0
                    ? Math.round((stats.cancelledRides / (stats.completedRides + stats.cancelledRides)) * 100)
                    : 0}%
                </span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className="bg-red-600 h-2 rounded-full"
                  style={{
                    width: `${stats.completedRides + stats.cancelledRides > 0
                      ? (stats.cancelledRides / (stats.completedRides + stats.cancelledRides)) * 100
                      : 0}%`
                  }}
                />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
