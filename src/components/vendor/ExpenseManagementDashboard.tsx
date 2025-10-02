/**
 * 💰 DASHBOARD DE GESTION DES DÉPENSES - 224SOLUTIONS
 * Interface complète pour la gestion des dépenses vendeurs
 */

import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, LineChart, Line, Area, AreaChart
} from 'recharts';
import {
  TrendingUp, TrendingDown, DollarSign, Package, AlertTriangle,
  Plus, Filter, Download, Upload, Eye, Calendar, CreditCard,
  Wallet, Receipt, Target, Activity, Brain, Bell, Search,
  MoreHorizontal, Edit, Trash2, Check, X, FileText, Camera
} from 'lucide-react';
import { useExpenseManagement } from '@/hooks/useExpenseManagement';
import { useMockExpenseManagement } from '@/hooks/useMockExpenseManagement';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

// Couleurs pour les graphiques
const CHART_COLORS = [
  '#10B981', '#3B82F6', '#8B5CF6', '#F59E0B', '#EF4444',
  '#06B6D4', '#84CC16', '#F97316', '#EC4899', '#6B7280'
];

interface ExpenseManagementDashboardProps {
  className?: string;
}

export default function ExpenseManagementDashboard({ className }: ExpenseManagementDashboardProps) {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState('dashboard');
  const [selectedPeriod, setSelectedPeriod] = useState('30d');

  // Hook principal de gestion des dépenses (avec fallback vers données simulées)
  const realExpenseData = useExpenseManagement();
  const mockExpenseData = useMockExpenseManagement();

  // Utiliser les données simulées si les vraies données ne sont pas disponibles
  const expenseData = realExpenseData.error ? mockExpenseData : realExpenseData;

  const {
    quickStats,
    analytics,
    anomalies,
    alerts,
    categories,
    expenses,
    isLoading,
    error,
    refetch
  } = expenseData;

  // Calculs pour les métriques
  const metrics = useMemo(() => {
    const currentMonth = new Date().getMonth();
    const currentYear = new Date().getFullYear();

    // Dépenses du mois actuel
    const currentMonthExpenses = expenses.filter(expense => {
      const expenseDate = new Date(expense.expense_date);
      return expenseDate.getMonth() === currentMonth &&
        expenseDate.getFullYear() === currentYear;
    });

    // Dépenses du mois précédent
    const lastMonth = currentMonth === 0 ? 11 : currentMonth - 1;
    const lastMonthYear = currentMonth === 0 ? currentYear - 1 : currentYear;
    const lastMonthExpenses = expenses.filter(expense => {
      const expenseDate = new Date(expense.expense_date);
      return expenseDate.getMonth() === lastMonth &&
        expenseDate.getFullYear() === lastMonthYear;
    });

    const currentMonthTotal = currentMonthExpenses.reduce((sum, exp) => sum + Number(exp.amount), 0);
    const lastMonthTotal = lastMonthExpenses.reduce((sum, exp) => sum + Number(exp.amount), 0);

    const monthlyChange = lastMonthTotal > 0
      ? ((currentMonthTotal - lastMonthTotal) / lastMonthTotal) * 100
      : 0;

    return {
      currentMonthTotal,
      lastMonthTotal,
      monthlyChange,
      currentMonthCount: currentMonthExpenses.length,
      averageExpense: currentMonthExpenses.length > 0
        ? currentMonthTotal / currentMonthExpenses.length
        : 0
    };
  }, [expenses]);

  // Données pour les graphiques
  const chartData = useMemo(() => {
    // Données par catégorie pour le graphique en barres
    const categoryData = analytics.categories.map((cat, index) => ({
      name: cat.name,
      montant: cat.total,
      count: cat.count,
      color: cat.color || CHART_COLORS[index % CHART_COLORS.length]
    }));

    // Données pour le graphique en secteurs
    const pieData = analytics.categories.map((cat, index) => ({
      name: cat.name,
      value: cat.total,
      color: cat.color || CHART_COLORS[index % CHART_COLORS.length]
    }));

    // Tendance mensuelle
    const trendData = analytics.monthly_trend.map(item => ({
      month: format(new Date(item.month + '-01'), 'MMM yyyy', { locale: fr }),
      montant: item.total
    }));

    return { categoryData, pieData, trendData };
  }, [analytics]);

  if (isLoading) {
    return (
      <div className={`space-y-6 ${className}`}>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <Card key={i}>
              <CardContent className="p-6">
                <div className="animate-pulse space-y-3">
                  <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                  <div className="h-8 bg-gray-200 rounded w-1/2"></div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <Alert className="m-4">
        <AlertTriangle className="h-4 w-4" />
        <AlertDescription>
          Erreur lors du chargement des données de dépenses.
          <Button variant="link" onClick={refetch} className="ml-2">
            Réessayer
          </Button>
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {/* En-tête avec alertes */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Gestion des Dépenses</h2>
          <div className="flex items-center gap-3">
            <p className="text-gray-600">Suivez et analysez vos dépenses professionnelles</p>
            {realExpenseData.error && (
              <Badge variant="outline" className="border-blue-500 text-blue-600 bg-blue-50">
                <Activity className="w-3 h-3 mr-1" />
                Mode Démonstration
              </Badge>
            )}
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* Alertes non lues */}
          {quickStats.unreadAlerts > 0 && (
            <Badge variant="destructive" className="animate-pulse">
              <Bell className="w-3 h-3 mr-1" />
              {quickStats.unreadAlerts} alertes
            </Badge>
          )}

          {/* Anomalies détectées */}
          {quickStats.hasAnomalies && (
            <Badge variant="outline" className="border-orange-500 text-orange-600">
              <Brain className="w-3 h-3 mr-1" />
              Anomalies détectées
            </Badge>
          )}

          <Button size="sm" variant="outline" onClick={refetch}>
            <Activity className="w-4 h-4 mr-2" />
            Actualiser
          </Button>
        </div>
      </div>

      {/* Métriques principales */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total des dépenses */}
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Dépenses</p>
                <p className="text-2xl font-bold text-gray-900">
                  {quickStats.totalExpenses.toLocaleString()} XAF
                </p>
                <div className="flex items-center mt-2">
                  {metrics.monthlyChange >= 0 ? (
                    <TrendingUp className="w-4 h-4 text-red-500 mr-1" />
                  ) : (
                    <TrendingDown className="w-4 h-4 text-green-500 mr-1" />
                  )}
                  <span className={`text-sm ${metrics.monthlyChange >= 0 ? 'text-red-600' : 'text-green-600'}`}>
                    {Math.abs(metrics.monthlyChange).toFixed(1)}% vs mois dernier
                  </span>
                </div>
              </div>
              <div className="p-3 bg-red-50 rounded-full">
                <DollarSign className="w-6 h-6 text-red-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Nombre de dépenses */}
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Nombre de Dépenses</p>
                <p className="text-2xl font-bold text-gray-900">{quickStats.expenseCount}</p>
                <p className="text-sm text-gray-500 mt-2">
                  {metrics.currentMonthCount} ce mois
                </p>
              </div>
              <div className="p-3 bg-blue-50 rounded-full">
                <Receipt className="w-6 h-6 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Dépense moyenne */}
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Dépense Moyenne</p>
                <p className="text-2xl font-bold text-gray-900">
                  {quickStats.averageExpense.toLocaleString()} XAF
                </p>
                <p className="text-sm text-gray-500 mt-2">
                  {metrics.averageExpense.toLocaleString()} XAF ce mois
                </p>
              </div>
              <div className="p-3 bg-green-50 rounded-full">
                <Target className="w-6 h-6 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Catégories actives */}
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Catégories</p>
                <p className="text-2xl font-bold text-gray-900">{categories.length}</p>
                <p className="text-sm text-gray-500 mt-2">
                  {analytics.categories.length} utilisées
                </p>
              </div>
              <div className="p-3 bg-purple-50 rounded-full">
                <Package className="w-6 h-6 text-purple-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Onglets principaux */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="dashboard">
            <BarChart className="w-4 h-4 mr-2" />
            Dashboard
          </TabsTrigger>
          <TabsTrigger value="expenses">
            <Receipt className="w-4 h-4 mr-2" />
            Dépenses
          </TabsTrigger>
          <TabsTrigger value="categories">
            <Package className="w-4 h-4 mr-2" />
            Catégories
          </TabsTrigger>
          <TabsTrigger value="analytics">
            <Brain className="w-4 h-4 mr-2" />
            Analyses IA
          </TabsTrigger>
          <TabsTrigger value="wallet">
            <Wallet className="w-4 h-4 mr-2" />
            Wallet
          </TabsTrigger>
        </TabsList>

        {/* Dashboard - Graphiques et analyses */}
        <TabsContent value="dashboard" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Graphique en barres par catégorie */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart className="w-5 h-5" />
                  Dépenses par Catégorie
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={chartData.categoryData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis
                      dataKey="name"
                      angle={-45}
                      textAnchor="end"
                      height={80}
                      fontSize={12}
                    />
                    <YAxis
                      tickFormatter={(value) => `${(value / 1000).toFixed(0)}K`}
                    />
                    <Tooltip
                      formatter={(value: number) => [`${value.toLocaleString()} XAF`, 'Montant']}
                      labelStyle={{ color: '#374151' }}
                    />
                    <Bar
                      dataKey="montant"
                      fill="#3B82F6"
                      radius={[4, 4, 0, 0]}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Graphique en secteurs */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <PieChart className="w-5 h-5" />
                  Répartition des Dépenses
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={chartData.pieData}
                      cx="50%"
                      cy="50%"
                      outerRadius={100}
                      dataKey="value"
                      label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                      labelLine={false}
                    >
                      {chartData.pieData.map((entry, index) => (
                        <Cell
                          key={`cell-${index}`}
                          fill={entry.color || CHART_COLORS[index % CHART_COLORS.length]}
                        />
                      ))}
                    </Pie>
                    <Tooltip
                      formatter={(value: number) => [`${value.toLocaleString()} XAF`, 'Montant']}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>

          {/* Tendance mensuelle */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="w-5 h-5" />
                Évolution Mensuelle des Dépenses
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <AreaChart data={chartData.trendData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis tickFormatter={(value) => `${(value / 1000).toFixed(0)}K`} />
                  <Tooltip
                    formatter={(value: number) => [`${value.toLocaleString()} XAF`, 'Montant']}
                    labelStyle={{ color: '#374151' }}
                  />
                  <Area
                    type="monotone"
                    dataKey="montant"
                    stroke="#3B82F6"
                    fill="#3B82F6"
                    fillOpacity={0.1}
                    strokeWidth={2}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Alertes et anomalies */}
          {(quickStats.unreadAlerts > 0 || quickStats.hasAnomalies) && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Alertes récentes */}
              {quickStats.unreadAlerts > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-orange-600">
                      <Bell className="w-5 h-5" />
                      Alertes Récentes ({quickStats.unreadAlerts})
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {alerts.slice(0, 3).map((alert) => (
                        <div key={alert.id} className="flex items-start gap-3 p-3 bg-orange-50 rounded-lg">
                          <AlertTriangle className="w-4 h-4 text-orange-500 mt-0.5" />
                          <div className="flex-1">
                            <p className="font-medium text-orange-800">{alert.title}</p>
                            <p className="text-sm text-orange-600">{alert.message}</p>
                            <p className="text-xs text-orange-500 mt-1">
                              {format(new Date(alert.created_at), 'dd/MM/yyyy HH:mm', { locale: fr })}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Anomalies détectées */}
              {quickStats.hasAnomalies && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-red-600">
                      <Brain className="w-5 h-5" />
                      Anomalies Détectées ({anomalies.length})
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {anomalies.slice(0, 3).map((anomaly, index) => (
                        <div key={index} className="flex items-start gap-3 p-3 bg-red-50 rounded-lg">
                          <AlertTriangle className="w-4 h-4 text-red-500 mt-0.5" />
                          <div className="flex-1">
                            <p className="font-medium text-red-800">{anomaly.title}</p>
                            <p className="text-sm text-red-600">{anomaly.description}</p>
                            <div className="flex items-center gap-2 mt-2">
                              <Badge variant="outline" className="text-xs">
                                {anomaly.amount?.toLocaleString()} XAF
                              </Badge>
                              <Badge
                                variant={anomaly.severity === 'critical' ? 'destructive' : 'secondary'}
                                className="text-xs"
                              >
                                {anomaly.severity}
                              </Badge>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          )}
        </TabsContent>

        {/* Autres onglets - Placeholders pour l'instant */}
        <TabsContent value="expenses">
          <Card>
            <CardHeader>
              <CardTitle>Liste des Dépenses</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-500">Interface de gestion des dépenses en cours de développement...</p>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="categories">
          <Card>
            <CardHeader>
              <CardTitle>Gestion des Catégories</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-500">Interface de gestion des catégories en cours de développement...</p>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="analytics">
          <Card>
            <CardHeader>
              <CardTitle>Analyses IA Avancées</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-500">Analyses IA et recommandations en cours de développement...</p>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="wallet">
          <Card>
            <CardHeader>
              <CardTitle>Intégration Wallet</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-500">Interface d'intégration wallet en cours de développement...</p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
