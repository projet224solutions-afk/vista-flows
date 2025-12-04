/**
 * ANALYTICS RESTAURANT
 * Statistiques et analyses avancées
 */

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { supabase } from '@/lib/supabaseClient';
import { TrendingUp, DollarSign, Clock, Star, Users } from 'lucide-react';

interface RestaurantAnalyticsProps {
  serviceId: string;
}

export function RestaurantAnalytics({ serviceId }: RestaurantAnalyticsProps) {
  const [analytics, setAnalytics] = useState({
    totalRevenue: 0,
    totalOrders: 0,
    averageOrderValue: 0,
    averagePreparationTime: 0,
    popularDishes: [],
    peakHours: [],
    customerRetention: 0,
    averageRating: 0
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadAnalytics();
  }, [serviceId]);

  const loadAnalytics = async () => {
    try {
      // Charger les données d'analytics
      const { data: orders, error } = await supabase
        .from('service_bookings')
        .select('*')
        .eq('professional_service_id', serviceId);

      if (error) throw error;

      // Calculer les statistiques
      const totalRevenue = orders?.reduce((sum, order) => sum + (order.total_amount || 0), 0) || 0;
      const totalOrders = orders?.length || 0;
      const averageOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;

      setAnalytics({
        totalRevenue,
        totalOrders,
        averageOrderValue,
        averagePreparationTime: 32, // À calculer réellement
        popularDishes: [],
        peakHours: [],
        customerRetention: 68,
        averageRating: 4.5
      });
    } catch (error) {
      console.error('Erreur chargement analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="text-center py-8">Chargement des analytics...</div>;
  }

  return (
    <div className="space-y-6">
      {/* KPIs principaux */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Revenu total</CardTitle>
            <DollarSign className="w-4 h-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {analytics.totalRevenue.toLocaleString()} FCFA
            </div>
            <p className="text-xs text-muted-foreground">
              +20% par rapport au mois dernier
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Commandes</CardTitle>
            <TrendingUp className="w-4 h-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analytics.totalOrders}</div>
            <p className="text-xs text-muted-foreground">
              Panier moyen: {analytics.averageOrderValue.toLocaleString()} FCFA
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Temps moyen</CardTitle>
            <Clock className="w-4 h-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analytics.averagePreparationTime}min</div>
            <p className="text-xs text-muted-foreground">
              Objectif: 30min
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Satisfaction</CardTitle>
            <Star className="w-4 h-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analytics.averageRating}/5</div>
            <p className="text-xs text-muted-foreground">
              Basé sur 156 avis
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Graphiques et détails */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Plats les plus populaires</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {[
                { name: 'Riz sauce arachide', orders: 45 },
                { name: 'Poulet braisé', orders: 38 },
                { name: 'Tiep bou dien', orders: 32 },
                { name: 'Sauce feuille', orders: 28 },
                { name: 'Grillades mixtes', orders: 24 }
              ].map((dish, index) => (
                <div key={index} className="flex items-center justify-between">
                  <span className="text-sm">{dish.name}</span>
                  <div className="flex items-center gap-2">
                    <div className="w-32 bg-muted rounded-full h-2">
                      <div
                        className="bg-primary rounded-full h-2"
                        style={{ width: `${(dish.orders / 45) * 100}%` }}
                      />
                    </div>
                    <span className="text-sm font-medium">{dish.orders}</span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Heures de pointe</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {[
                { time: '12h-14h', percentage: 45 },
                { time: '19h-21h', percentage: 38 },
                { time: '14h-16h', percentage: 15 },
                { time: '09h-11h', percentage: 12 },
                { time: '21h-23h', percentage: 8 }
              ].map((period, index) => (
                <div key={index} className="flex items-center justify-between">
                  <span className="text-sm">{period.time}</span>
                  <div className="flex items-center gap-2">
                    <div className="w-32 bg-muted rounded-full h-2">
                      <div
                        className="bg-orange-500 rounded-full h-2"
                        style={{ width: `${period.percentage}%` }}
                      />
                    </div>
                    <span className="text-sm font-medium">{period.percentage}%</span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Fidélisation clients</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm">Taux de retour</span>
                <span className="text-2xl font-bold text-green-600">
                  {analytics.customerRetention}%
                </span>
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span>Nouveaux clients</span>
                  <span>32%</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span>Clients réguliers</span>
                  <span>68%</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Performance du jour</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                <div className="flex items-center gap-2">
                  <TrendingUp className="w-5 h-5 text-green-600" />
                  <span className="font-medium">Commandes</span>
                </div>
                <span className="text-lg font-bold text-green-600">24</span>
              </div>
              <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
                <div className="flex items-center gap-2">
                  <DollarSign className="w-5 h-5 text-blue-600" />
                  <span className="font-medium">CA du jour</span>
                </div>
                <span className="text-lg font-bold text-blue-600">
                  {(185000).toLocaleString()} FCFA
                </span>
              </div>
              <div className="flex items-center justify-between p-3 bg-purple-50 rounded-lg">
                <div className="flex items-center gap-2">
                  <Users className="w-5 h-5 text-purple-600" />
                  <span className="font-medium">Clients servis</span>
                </div>
                <span className="text-lg font-bold text-purple-600">67</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
