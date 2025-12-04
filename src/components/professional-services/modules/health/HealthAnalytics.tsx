/**
 * STATISTIQUES SANTÉ
 * Analyses et métriques du service de santé
 */

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { supabase } from '@/lib/supabaseClient';
import { TrendingUp, Users, DollarSign, Calendar, Stethoscope } from 'lucide-react';

interface HealthAnalyticsProps {
  serviceId: string;
}

export function HealthAnalytics({ serviceId }: HealthAnalyticsProps) {
  const [stats, setStats] = useState({
    totalRevenue: 0,
    completedConsultations: 0,
    scheduledConsultations: 0,
    totalPatients: 0,
    popularConsultationTypes: [] as Array<{ type: string; count: number; revenue: number }>,
    averagePrice: 0
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadAnalytics();
  }, [serviceId]);

  const loadAnalytics = async () => {
    try {
      // Récupérer les consultations
      const { data: consultations, error: consultError } = await supabase
        .from('health_consultations')
        .select('*')
        .eq('service_id', serviceId);

      if (consultError && consultError.code !== 'PGRST116') throw consultError;

      // Récupérer les dossiers patients
      const { data: patients, error: patientsError } = await supabase
        .from('health_patient_records')
        .select('*')
        .eq('service_id', serviceId);

      if (patientsError && patientsError.code !== 'PGRST116') throw patientsError;

      // Calculer les statistiques
      const completedConsultations = consultations?.filter(c => c.status === 'completed') || [];
      const totalRevenue = completedConsultations.reduce((sum, c) => sum + c.price, 0);

      // Types de consultations populaires
      const typeStats = new Map<string, { count: number; revenue: number }>();
      completedConsultations.forEach(consultation => {
        const current = typeStats.get(consultation.consultation_type) || { count: 0, revenue: 0 };
        typeStats.set(consultation.consultation_type, {
          count: current.count + 1,
          revenue: current.revenue + consultation.price
        });
      });

      const popularConsultationTypes = Array.from(typeStats.entries())
        .map(([type, data]) => ({ type, ...data }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 5);

      setStats({
        totalRevenue,
        completedConsultations: completedConsultations.length,
        scheduledConsultations: consultations?.filter(c => c.status === 'scheduled').length || 0,
        totalPatients: patients?.length || 0,
        popularConsultationTypes,
        averagePrice: completedConsultations.length ? totalRevenue / completedConsultations.length : 0
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
              {stats.completedConsultations} consultations terminées
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
            <p className="text-xs text-muted-foreground">Par consultation</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Consultations planifiées</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{stats.scheduledConsultations}</div>
            <p className="text-xs text-muted-foreground">À venir</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Patients</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalPatients}</div>
            <p className="text-xs text-muted-foreground">Dossiers actifs</p>
          </CardContent>
        </Card>
      </div>

      {/* Types de consultations populaires */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Stethoscope className="w-5 h-5" />
            Types de consultations les plus fréquents
          </CardTitle>
        </CardHeader>
        <CardContent>
          {stats.popularConsultationTypes.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">
              Aucune donnée disponible
            </p>
          ) : (
            <div className="space-y-4">
              {stats.popularConsultationTypes.map((type, index) => (
                <div key={type.type} className="flex items-center gap-4">
                  <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary text-primary-foreground font-bold">
                    {index + 1}
                  </div>
                  <div className="flex-1">
                    <div className="font-medium">{type.type}</div>
                    <div className="text-sm text-muted-foreground">
                      {type.count} consultation{type.count > 1 ? 's' : ''} • {type.revenue.toLocaleString()} FCFA
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-bold text-primary">
                      {Math.round((type.revenue / stats.totalRevenue) * 100)}%
                    </div>
                    <div className="text-xs text-muted-foreground">du CA</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Taux de réussite */}
      <Card>
        <CardHeader>
          <CardTitle>Activité</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium">Consultations terminées</span>
                <span className="text-sm font-bold">
                  {stats.completedConsultations + stats.scheduledConsultations > 0
                    ? Math.round((stats.completedConsultations / (stats.completedConsultations + stats.scheduledConsultations)) * 100)
                    : 0}%
                </span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className="bg-green-600 h-2 rounded-full"
                  style={{
                    width: `${stats.completedConsultations + stats.scheduledConsultations > 0
                      ? (stats.completedConsultations / (stats.completedConsultations + stats.scheduledConsultations)) * 100
                      : 0}%`
                  }}
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium">Consultations planifiées</span>
                <span className="text-sm font-bold text-blue-600">
                  {stats.completedConsultations + stats.scheduledConsultations > 0
                    ? Math.round((stats.scheduledConsultations / (stats.completedConsultations + stats.scheduledConsultations)) * 100)
                    : 0}%
                </span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className="bg-blue-600 h-2 rounded-full"
                  style={{
                    width: `${stats.completedConsultations + stats.scheduledConsultations > 0
                      ? (stats.scheduledConsultations / (stats.completedConsultations + stats.scheduledConsultations)) * 100
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
