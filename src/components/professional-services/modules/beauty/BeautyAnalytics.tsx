/**
 * STATISTIQUES BEAUTÉ
 * Analyses et métriques du salon de beauté
 */

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { supabase } from '@/lib/supabaseClient';
import { TrendingUp, Calendar, DollarSign, Users, Clock } from 'lucide-react';

interface BeautyAnalyticsProps {
  serviceId: string;
}

export function BeautyAnalytics({ serviceId }: BeautyAnalyticsProps) {
  const [stats, setStats] = useState({
    totalRevenue: 0,
    completedAppointments: 0,
    pendingAppointments: 0,
    cancelledAppointments: 0,
    averageServicePrice: 0,
    activeServices: 0,
    activeStaff: 0,
    popularServices: [] as Array<{ service_name: string; count: number; revenue: number }>
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadAnalytics();
  }, [serviceId]);

  const loadAnalytics = async () => {
    try {
      // Récupérer les rendez-vous
      const { data: appointments, error: aptError } = await supabase
        .from('beauty_appointments')
        .select('*')
        .eq('service_id', serviceId);

      if (aptError && aptError.code !== 'PGRST116') throw aptError;

      // Récupérer les services
      const { data: services, error: servError } = await supabase
        .from('beauty_services')
        .select('*')
        .eq('service_id', serviceId);

      if (servError && servError.code !== 'PGRST116') throw servError;

      // Récupérer le personnel
      const { data: staff, error: staffError } = await supabase
        .from('beauty_staff')
        .select('*')
        .eq('service_id', serviceId);

      if (staffError && staffError.code !== 'PGRST116') throw staffError;

      // Calculer les statistiques
      const completedApts = appointments?.filter(a => a.status === 'completed') || [];
      const totalRevenue = completedApts.reduce((sum, apt) => sum + apt.price, 0);

      // Services populaires
      const serviceStats = new Map<string, { count: number; revenue: number }>();
      completedApts.forEach(apt => {
        const current = serviceStats.get(apt.service_name) || { count: 0, revenue: 0 };
        serviceStats.set(apt.service_name, {
          count: current.count + 1,
          revenue: current.revenue + apt.price
        });
      });

      const popularServices = Array.from(serviceStats.entries())
        .map(([service_name, data]) => ({ service_name, ...data }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 5);

      setStats({
        totalRevenue,
        completedAppointments: completedApts.length,
        pendingAppointments: appointments?.filter(a => a.status === 'pending').length || 0,
        cancelledAppointments: appointments?.filter(a => a.status === 'cancelled').length || 0,
        averageServicePrice: services?.length ? services.reduce((sum, s) => sum + s.price, 0) / services.length : 0,
        activeServices: services?.filter(s => s.is_active).length || 0,
        activeStaff: staff?.filter(s => s.is_active).length || 0,
        popularServices
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
              {stats.completedAppointments} rendez-vous terminés
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Rendez-vous en attente</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">{stats.pendingAppointments}</div>
            <p className="text-xs text-muted-foreground">
              {stats.cancelledAppointments} annulés
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Services actifs</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.activeServices}</div>
            <p className="text-xs text-muted-foreground">
              Prix moyen: {Math.round(stats.averageServicePrice).toLocaleString()} FCFA
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Personnel</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.activeStaff}</div>
            <p className="text-xs text-muted-foreground">Membres actifs</p>
          </CardContent>
        </Card>
      </div>

      {/* Services populaires */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="w-5 h-5" />
            Services les plus demandés
          </CardTitle>
        </CardHeader>
        <CardContent>
          {stats.popularServices.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">
              Aucune donnée disponible
            </p>
          ) : (
            <div className="space-y-4">
              {stats.popularServices.map((service, index) => (
                <div key={service.service_name} className="flex items-center gap-4">
                  <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary text-primary-foreground font-bold">
                    {index + 1}
                  </div>
                  <div className="flex-1">
                    <div className="font-medium">{service.service_name}</div>
                    <div className="text-sm text-muted-foreground">
                      {service.count} rendez-vous • {service.revenue.toLocaleString()} FCFA
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-bold text-primary">
                      {Math.round((service.revenue / stats.totalRevenue) * 100)}%
                    </div>
                    <div className="text-xs text-muted-foreground">du CA</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Taux de conversion */}
      <Card>
        <CardHeader>
          <CardTitle>Performance</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium">Taux de réussite</span>
                <span className="text-sm font-bold">
                  {stats.completedAppointments + stats.cancelledAppointments > 0
                    ? Math.round((stats.completedAppointments / (stats.completedAppointments + stats.cancelledAppointments)) * 100)
                    : 0}%
                </span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className="bg-green-600 h-2 rounded-full"
                  style={{
                    width: `${stats.completedAppointments + stats.cancelledAppointments > 0
                      ? (stats.completedAppointments / (stats.completedAppointments + stats.cancelledAppointments)) * 100
                      : 0}%`
                  }}
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium">Taux d'annulation</span>
                <span className="text-sm font-bold text-red-600">
                  {stats.completedAppointments + stats.cancelledAppointments > 0
                    ? Math.round((stats.cancelledAppointments / (stats.completedAppointments + stats.cancelledAppointments)) * 100)
                    : 0}%
                </span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className="bg-red-600 h-2 rounded-full"
                  style={{
                    width: `${stats.completedAppointments + stats.cancelledAppointments > 0
                      ? (stats.cancelledAppointments / (stats.completedAppointments + stats.cancelledAppointments)) * 100
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
