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
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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
  const expenseData = useExpenseManagement();

  const {
    categories,
    expenses,
    stats,
    alerts,
    createExpense,
    updateExpense,
    deleteExpense,
    loading,
    error,
    refetch,
    createCategory
  } = expenseData;

  // Valeurs par défaut pour éviter les erreurs de null
  const safeStats = stats || {
    total_expenses: 0,
    expense_count: 0,
    average_expense: 0
  };

  // Calculs pour les métriques
  const metrics = useMemo(() => {
    const currentMonth = new Date().getMonth();
    const currentYear = new Date().getFullYear();

    // Dépenses du mois actuel
    const currentMonthExpenses = expenses.filter(expense => {
      const expenseDate = new Date(expense.created_at);
      return expenseDate.getMonth() === currentMonth &&
        expenseDate.getFullYear() === currentYear;
    });

    // Dépenses du mois précédent
    const lastMonth = currentMonth === 0 ? 11 : currentMonth - 1;
    const lastMonthYear = currentMonth === 0 ? currentYear - 1 : currentYear;
    const lastMonthExpenses = expenses.filter(expense => {
      const expenseDate = new Date(expense.created_at);
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
    return { categoryData: [], pieData: [], trendData: [] };
  }, []);

  if (loading) {
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
          <div>
            <p className="text-gray-600">Suivez et analysez vos dépenses professionnelles</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* Alertes non lues */}
          {alerts.length > 0 && (
            <Badge variant="destructive" className="animate-pulse">
              <Bell className="w-3 h-3 mr-1" />
              {alerts.length} alertes
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
                  {safeStats.total_expenses?.toLocaleString() || 0} GNF
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
                <p className="text-2xl font-bold text-gray-900">{expenses.length}</p>
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
                  {(expenses.length > 0 ? (safeStats.total_expenses || 0) / expenses.length : 0).toLocaleString()} GNF
                </p>
                <p className="text-sm text-gray-500 mt-2">
                  {metrics.averageExpense.toLocaleString()} GNF ce mois
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
                <p className="text-2xl font-bold text-gray-900">{categories?.length || 0}</p>
                <p className="text-sm text-gray-500 mt-2">
                  {categories.filter(c => expenses.some(e => e.category_id === c.id)).length} utilisées
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
                      formatter={(value: number) => [`${value.toLocaleString()} GNF`, 'Montant']}
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
                      formatter={(value: number) => [`${value.toLocaleString()} GNF`, 'Montant']}
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
                    formatter={(value: number) => [`${value.toLocaleString()} GNF`, 'Montant']}
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

          {/* Alertes récentes */}
          {alerts.length > 0 && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-orange-600">
                    <Bell className="w-5 h-5" />
                    Alertes Récentes ({alerts.length})
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {alerts.slice(0, 3).map((alert) => (
                      <div key={alert.id} className="flex items-start gap-3 p-3 bg-orange-50 rounded-lg">
                        <AlertTriangle className="w-4 h-4 text-orange-500 mt-0.5" />
                        <div className="flex-1">
                          <p className="font-medium text-orange-800">{alert.message}</p>
                          <p className="text-sm text-orange-600">{alert.severity}</p>
                          <p className="text-xs text-orange-500 mt-1">
                            {format(new Date(alert.created_at), 'dd/MM/yyyy HH:mm', { locale: fr })}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </TabsContent>

        {/* Dépenses - Opérationnel */}
        <TabsContent value="expenses" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Nouvelle Dépense</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div>
                  <Label>Libellé</Label>
                  <Input placeholder="Ex: Achat fournitures" id="expense-label" />
                </div>
                <div>
                  <Label>Montant</Label>
                  <Input type="number" placeholder="0" id="expense-amount" />
                </div>
                <div>
                  <Label>Catégorie</Label>
                  <select id="expense-category" className="w-full h-10 px-3 border rounded-md bg-white">
                    <option value="">Sélectionner</option>
                    {categories?.map((c: any) => (
                      <option key={c?.id} value={c?.id}>{c?.name || c?.label || `Catégorie #${c?.id}`}</option>
                    ))}
                  </select>
                </div>
                <div className="flex items-end">
                  <Button
                    disabled={loading}
                    onClick={async () => {
                      const labelEl = document.getElementById('expense-label') as HTMLInputElement | null;
                      const amountEl = document.getElementById('expense-amount') as HTMLInputElement | null;
                      const catEl = document.getElementById('expense-category') as HTMLSelectElement | null;
                      const label = labelEl?.value?.trim() || '';
                      const amount = Number(amountEl?.value || 0);
                      const category_id = catEl?.value || '';
                      if (!label || !amount || !category_id) {
                        toast({ title: 'Champs requis', description: 'Libellé, montant et catégorie sont requis', variant: 'destructive' });
                        return;
                      }
                      try {
                        await createExpense({ label, amount, category_id });
                        toast({ title: 'Dépense ajoutée' });
                        await refetch();
                        if (labelEl) labelEl.value = '';
                        if (amountEl) amountEl.value = '';
                        if (catEl) catEl.value = '';
                      } catch (e) {
                        toast({ title: 'Erreur', description: 'Impossible d\'ajouter la dépense', variant: 'destructive' });
                      }
                    }}
                  >
                    Ajouter
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Liste des Dépenses</CardTitle>
            </CardHeader>
            <CardContent>
              {expenses.length === 0 ? (
                <p className="text-gray-500">Aucune dépense enregistrée</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-left border-b">
                        <th className="py-2 pr-4">Libellé</th>
                        <th className="py-2 pr-4">Catégorie</th>
                        <th className="py-2 pr-4">Montant</th>
                        <th className="py-2 pr-4">Date</th>
                        <th className="py-2 pr-4 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {expenses.map((e: any) => (
                        <tr key={e?.id} className="border-b last:border-0">
                          <td className="py-2 pr-4">{e?.label || e?.name || '—'}</td>
                          <td className="py-2 pr-4">{categories?.find((c: any) => c?.id === (e?.category_id || e?.category))?.name || '—'}</td>
                          <td className="py-2 pr-4">{Number(e?.amount || 0).toLocaleString()} GNF</td>
                          <td className="py-2 pr-4">{e?.created_at ? new Date(e.created_at).toLocaleString('fr-FR') : '—'}</td>
                          <td className="py-2 pr-0 text-right">
                            <Button variant="ghost" size="sm" onClick={async () => {
                              try {
                                await deleteExpense(e?.id);
                                toast({ title: 'Dépense supprimée' });
                                await refetch();
                              } catch (err) {
                                toast({ title: 'Erreur suppression', variant: 'destructive' });
                              }
                            }}>
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Catégories - Opérationnel */}
        <TabsContent value="categories" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Créer une Catégorie</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <Label>Nom</Label>
                  <Input id="cat-name" placeholder="Ex: Logistique" />
                </div>
                <div>
                  <Label>Budget Mensuel (GNF)</Label>
                  <Input id="cat-budget" type="number" placeholder="0" />
                </div>
                <div className="flex items-end">
                  <Button onClick={async () => {
                    const nameEl = document.getElementById('cat-name') as HTMLInputElement | null;
                    const budgetEl = document.getElementById('cat-budget') as HTMLInputElement | null;
                    const name = nameEl?.value?.trim() || '';
                    const budget = Number(budgetEl?.value || 0);
                    if (!name) { toast({ title: 'Nom requis', variant: 'destructive' }); return; }
                    try {
                      await createCategory({ name, monthly_budget: budget } as any);
                      toast({ title: 'Catégorie créée' });
                      await refetch();
                      if (nameEl) nameEl.value = '';
                      if (budgetEl) budgetEl.value = '';
                    } catch (e) {
                      toast({ title: 'Erreur', description: 'Impossible de créer la catégorie', variant: 'destructive' });
                    }
                  }}>Créer</Button>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Liste des Catégories</CardTitle>
            </CardHeader>
            <CardContent>
              {(!categories || categories.length === 0) ? (
                <p className="text-gray-500">Aucune catégorie</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-left border-b">
                        <th className="py-2 pr-4">Nom</th>
                        <th className="py-2 pr-4">Budget Mensuel</th>
                      </tr>
                    </thead>
                    <tbody>
                      {categories.map((c: any) => (
                        <tr key={c?.id} className="border-b last:border-0">
                          <td className="py-2 pr-4">{c?.name || '—'}</td>
                          <td className="py-2 pr-4">{Number(c?.monthly_budget || 0).toLocaleString()} GNF</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Analyses IA - Insights et recommandations */}
        <TabsContent value="analytics" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Insights Automatiques</CardTitle>
            </CardHeader>
            <CardContent>
              {(() => {
                const now = new Date();
                const month = now.getMonth();
                const year = now.getFullYear();
                const currentMonthExpenses = expenses.filter((e: any) => {
                  const d = new Date(e?.created_at);
                  return d.getMonth() === month && d.getFullYear() === year;
                });
                const total = currentMonthExpenses.reduce((s: number, e: any) => s + Number(e?.amount || 0), 0);
                const byCategory = new Map<string, number>();
                currentMonthExpenses.forEach((e: any) => {
                  const key = String(e?.category_id ?? e?.category ?? 'unknown');
                  byCategory.set(key, (byCategory.get(key) || 0) + Number(e?.amount || 0));
                });

                const ranked = Array.from(byCategory.entries())
                  .map(([id, sum]) => ({ id, sum }))
                  .sort((a, b) => b.sum - a.sum)
                  .slice(0, 5);

                return (
                  <div className="space-y-3">
                    <div className="text-sm text-gray-700">
                      <strong>Total du mois:</strong> {total.toLocaleString()} GNF
                    </div>
                    <div>
                      <div className="font-medium mb-2">Top catégories du mois</div>
                      <div className="space-y-2">
                        {ranked.length === 0 ? (
                          <p className="text-gray-500">Aucune dépense ce mois.</p>
                        ) : ranked.map((r) => {
                          const cat = categories?.find((c: any) => String(c?.id) === String(r.id));
                          return (
                            <div key={r.id} className="flex items-center justify-between p-2 rounded border">
                              <span>{cat?.name || `Catégorie #${r.id}`}</span>
                              <span className="font-semibold">{r.sum.toLocaleString()} GNF</span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                );
              })()}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Détection de Dépassement de Budget</CardTitle>
            </CardHeader>
            <CardContent>
              {(() => {
                const now = new Date();
                const month = now.getMonth();
                const year = now.getFullYear();
                const currentMonthExpenses = expenses.filter((e: any) => {
                  const d = new Date(e?.created_at);
                  return d.getMonth() === month && d.getFullYear() === year;
                });
                const byCategory = new Map<string, number>();
                currentMonthExpenses.forEach((e: any) => {
                  const key = String(e?.category_id ?? e?.category ?? 'unknown');
                  byCategory.set(key, (byCategory.get(key) || 0) + Number(e?.amount || 0));
                });
                const over = categories
                  ?.map((c: any) => {
                    const spent = byCategory.get(String(c?.id)) || 0;
                    const budget = Number(c?.monthly_budget || 0);
                    return { id: c?.id, name: c?.name, spent, budget, over: budget > 0 && spent > budget };
                  })
                  .filter((x: any) => x?.over) || [];

                return (
                  <div className="space-y-2">
                    {over.length === 0 ? (
                      <p className="text-green-700 bg-green-50 p-2 rounded">Aucun dépassement détecté ce mois.</p>
                    ) : (
                      over.map((o: any) => (
                        <div key={o.id} className="p-2 rounded border border-red-200 bg-red-50">
                          <div className="flex items-center justify-between">
                            <span className="font-medium text-red-800">{o.name}</span>
                            <span className="text-red-700">{o.spent.toLocaleString()} / {o.budget.toLocaleString()} GNF</span>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                );
              })()}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Recommandations</CardTitle>
            </CardHeader>
            <CardContent>
              {(() => {
                const recs: string[] = [];
                if (metrics.monthlyChange > 10) recs.push('Les dépenses ont augmenté de plus de 10% vs le mois dernier. Envisagez un audit des catégories principales.');
                if ((categories?.length || 0) === 0) recs.push('Aucune catégorie configurée. Créez des catégories avec un budget mensuel pour un meilleur contrôle.');
                if ((expenses?.length || 0) === 0) recs.push('Aucune dépense saisie. Ajoutez vos premières dépenses pour démarrer le suivi.');
                return (
                  <ul className="list-disc pl-5 space-y-1 text-gray-700">
                    {recs.length === 0 ? (
                      <li>Tendance stable. Continuez le suivi mensuel.</li>
                    ) : recs.map((r, idx) => <li key={idx}>{r}</li>)}
                  </ul>
                );
              })()}
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
