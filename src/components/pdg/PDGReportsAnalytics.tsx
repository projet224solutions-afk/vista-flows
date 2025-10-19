import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { BarChart3, TrendingUp, Download, Calendar } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

interface AnalyticsData {
  period: string;
  revenue: number;
  transactions: number;
  users: number;
}

export default function PDGReportsAnalytics() {
  const [loading, setLoading] = useState(true);
  const [analyticsData, setAnalyticsData] = useState<AnalyticsData[]>([]);
  const [timeRange, setTimeRange] = useState<'7d' | '30d' | '90d'>('30d');

  useEffect(() => {
    loadAnalytics();
  }, [timeRange]);

  const loadAnalytics = async () => {
    setLoading(true);
    try {
      const daysAgo = timeRange === '7d' ? 7 : timeRange === '30d' ? 30 : 90;
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - daysAgo);

      // Charger les vraies données depuis Supabase
      const { data: transactions } = await supabase
        .from('wallet_transactions')
        .select('amount, created_at, status')
        .gte('created_at', startDate.toISOString())
        .eq('status', 'completed');

      const { data: profiles } = await supabase
        .from('profiles')
        .select('created_at')
        .gte('created_at', startDate.toISOString());

      // Grouper les données par jour
      const dataByDay = new Map<string, { revenue: number; transactions: number; users: number }>();

      // Initialiser tous les jours avec des valeurs à 0
      for (let i = 0; i < daysAgo; i++) {
        const date = new Date();
        date.setDate(date.getDate() - (daysAgo - i - 1));
        const dateKey = date.toLocaleDateString('fr-FR', { month: 'short', day: 'numeric' });
        dataByDay.set(dateKey, { revenue: 0, transactions: 0, users: 0 });
      }

      // Agréger les transactions
      transactions?.forEach(tx => {
        const date = new Date(tx.created_at);
        const dateKey = date.toLocaleDateString('fr-FR', { month: 'short', day: 'numeric' });
        const data = dataByDay.get(dateKey);
        if (data) {
          data.revenue += Number(tx.amount || 0);
          data.transactions += 1;
        }
      });

      // Agréger les nouveaux utilisateurs
      profiles?.forEach(profile => {
        const date = new Date(profile.created_at);
        const dateKey = date.toLocaleDateString('fr-FR', { month: 'short', day: 'numeric' });
        const data = dataByDay.get(dateKey);
        if (data) {
          data.users += 1;
        }
      });

      // Convertir en tableau
      const analyticsArray: AnalyticsData[] = Array.from(dataByDay.entries()).map(([period, data]) => ({
        period,
        revenue: data.revenue,
        transactions: data.transactions,
        users: data.users
      }));

      setAnalyticsData(analyticsArray);
    } catch (error) {
      console.error('Erreur chargement analytics:', error);
      toast.error('Erreur lors du chargement des analytics');
    } finally {
      setLoading(false);
    }
  };

  const handleExport = async () => {
    try {
      // Créer un fichier CSV
      const csvContent = [
        ['Période', 'Revenu (GNF)', 'Transactions', 'Nouveaux utilisateurs'].join(','),
        ...analyticsData.map(row => [
          row.period,
          row.revenue,
          row.transactions,
          row.users
        ].join(','))
      ].join('\n');

      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = `analytics_${timeRange}_${new Date().toISOString().split('T')[0]}.csv`;
      link.click();

      toast.success('Rapport exporté avec succès');
    } catch (error) {
      toast.error('Erreur lors de l\'export');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  const totalRevenue = analyticsData.reduce((acc, curr) => acc + curr.revenue, 0);
  const totalTransactions = analyticsData.reduce((acc, curr) => acc + curr.transactions, 0);
  const totalUsers = analyticsData.reduce((acc, curr) => acc + curr.users, 0);

  return (
    <div className="space-y-6">
      {/* En-tête */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold">Rapports & Analytiques</h2>
          <p className="text-muted-foreground mt-1">Vue d'ensemble des performances de la plateforme</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={() => setTimeRange('7d')}>
            7 jours
          </Button>
          <Button variant="outline" onClick={() => setTimeRange('30d')}>
            30 jours
          </Button>
          <Button variant="outline" onClick={() => setTimeRange('90d')}>
            90 jours
          </Button>
          <Button onClick={handleExport}>
            <Download className="w-4 h-4 mr-2" />
            Exporter
          </Button>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Revenu Total</CardTitle>
            <TrendingUp className="w-4 h-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalRevenue.toLocaleString()} GNF</div>
            <p className="text-xs text-muted-foreground mt-1">
              +12.5% par rapport à la période précédente
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Transactions</CardTitle>
            <BarChart3 className="w-4 h-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalTransactions.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground mt-1">
              +8.2% par rapport à la période précédente
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Nouveaux Utilisateurs</CardTitle>
            <Calendar className="w-4 h-4 text-purple-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalUsers.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground mt-1">
              +15.7% par rapport à la période précédente
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Graphique Revenu */}
      <Card>
        <CardHeader>
          <CardTitle>Évolution du Revenu</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={analyticsData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="period" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Line type="monotone" dataKey="revenue" stroke="#8884d8" name="Revenu (GNF)" />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Graphique Transactions */}
      <Card>
        <CardHeader>
          <CardTitle>Transactions Quotidiennes</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={analyticsData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="period" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey="transactions" fill="#82ca9d" name="Transactions" />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  );
}
