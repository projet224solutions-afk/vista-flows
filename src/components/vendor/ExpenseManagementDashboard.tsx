// @ts-nocheck
/**
 * ðŸ’° DASHBOARD DE GESTION DES DÃ‰PENSES - 224SOLUTIONS
 * Interface complÃ¨te pour la gestion des dÃ©penses vendeurs
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
  MoreHorizontal, Edit, Trash2, Check, X, FileText, Camera, ShoppingCart, Calculator
} from 'lucide-react';
import { useExpenseManagement } from '@/hooks/useExpenseManagement';
import { useCurrentVendor } from '@/hooks/useCurrentVendor';
import WalletDashboard from '@/components/vendor/WalletDashboard';
import { PurchaseExpensesSection } from './PurchaseExpensesSection';
import { MonthlyProfitAnalysis } from './MonthlyProfitAnalysis';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

// Couleurs pour les graphiques
const CHART_COLORS = [
  '#ff4000', '#3B82F6', '#8B5CF6', '#F59E0B', '#EF4444',
  '#04439e', '#ff4000', '#F97316', '#EC4899', '#6B7280'
];

interface ExpenseManagementDashboardProps {
  className?: string;
}

export default function ExpenseManagementDashboard({ className }: ExpenseManagementDashboardProps) {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState('profit');
  const [selectedPeriod, setSelectedPeriod] = useState('30d');
  
  // RÃ©cupÃ©rer le vendorId et userId via le hook
  const { vendorId, userId, loading: vendorLoading } = useCurrentVendor();

  // Hook principal de gestion des dÃ©penses - utiliser userId pour vendor_expenses
  const expenseData = useExpenseManagement(userId);

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

  // Valeurs par dÃ©faut pour Ã©viter les erreurs de null
  const safeStats = stats || {
    total_expenses: 0,
    expense_count: 0,
    average_expense: 0
  };

  // Calculs pour les mÃ©triques
  const metrics = useMemo(() => {
    const currentMonth = new Date().getMonth();
    const currentYear = new Date().getFullYear();

    // DÃ©penses du mois actuel
    const currentMonthExpenses = expenses.filter(expense => {
      const expenseDate = new Date(expense.created_at);
      return expenseDate.getMonth() === currentMonth &&
        expenseDate.getFullYear() === currentYear;
    });

    // DÃ©penses du mois prÃ©cÃ©dent
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

  // DonnÃ©es pour les graphiques
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
          Erreur lors du chargement des donnÃ©es de dÃ©penses.
          <Button variant="link" onClick={refetch} className="ml-2">
            RÃ©essayer
          </Button>
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className={`space-y-4 sm:space-y-6 ${className}`}>
      {/* En-tÃªte avec alertes - Mobile optimized */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <h2 className="text-lg sm:text-2xl font-bold text-gray-900">Gestion des DÃ©penses</h2>
          <p className="text-xs sm:text-sm text-gray-600 line-clamp-1">Suivez vos dÃ©penses professionnelles</p>
        </div>

        <div className="flex items-center gap-2">
          {alerts.length > 0 && (
            <Badge variant="destructive" className="animate-pulse text-xs">
              <Bell className="w-3 h-3 mr-1" />
              {alerts.length}
            </Badge>
          )}

          <Button size="sm" variant="outline" onClick={refetch} className="text-xs sm:text-sm">
            <Activity className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2" />
            <span className="hidden xs:inline">Actualiser</span>
          </Button>
        </div>
      </div>

      {/* MÃ©triques principales - Grid 2x2 on mobile */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-4">
        {/* Total des dÃ©penses */}
        <Card>
          <CardContent className="p-3 sm:p-6">
            <div className="flex items-center justify-between">
              <div className="min-w-0 flex-1">
                <p className="text-xs sm:text-sm font-medium text-gray-600 truncate">Total DÃ©penses</p>
                <p className="text-base sm:text-2xl font-bold text-gray-900 truncate">
                  {safeStats.total_expenses?.toLocaleString() || 0}
                </p>
                <div className="flex items-center mt-1">
                  {metrics.monthlyChange >= 0 ? (
                    <TrendingUp className="w-3 h-3 text-red-500 mr-1" />
                  ) : (
                    <TrendingDown className="w-3 h-3 text-primary-orange-500 mr-1" />
                  )}
                  <span className={`text-xs ${metrics.monthlyChange >= 0 ? 'text-red-600' : 'text-primary-orange-600'}`}>
                    {Math.abs(metrics.monthlyChange).toFixed(0)}%
                  </span>
                </div>
              </div>
              <div className="p-2 sm:p-3 bg-red-50 rounded-full shrink-0">
                <DollarSign className="w-4 h-4 sm:w-6 sm:h-6 text-red-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Nombre de dÃ©penses */}
        <Card>
          <CardContent className="p-3 sm:p-6">
            <div className="flex items-center justify-between">
              <div className="min-w-0 flex-1">
                <p className="text-xs sm:text-sm font-medium text-gray-600 truncate">Nb. DÃ©penses</p>
                <p className="text-base sm:text-2xl font-bold text-gray-900">{expenses.length}</p>
                <p className="text-xs text-gray-500 mt-1 truncate">
                  {metrics.currentMonthCount} ce mois
                </p>
              </div>
              <div className="p-2 sm:p-3 bg-blue-50 rounded-full shrink-0">
                <Receipt className="w-4 h-4 sm:w-6 sm:h-6 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* DÃ©pense moyenne */}
        <Card>
          <CardContent className="p-3 sm:p-6">
            <div className="flex items-center justify-between">
              <div className="min-w-0 flex-1">
                <p className="text-xs sm:text-sm font-medium text-gray-600 truncate">DÃ©p. Moyenne</p>
                <p className="text-base sm:text-2xl font-bold text-gray-900 truncate">
                  {(expenses.length > 0 ? (safeStats.total_expenses || 0) / expenses.length : 0).toLocaleString()}
                </p>
                <p className="text-xs text-gray-500 mt-1 truncate">
                  {metrics.averageExpense.toLocaleString()} ce mois
                </p>
              </div>
              <div className="p-2 sm:p-3 bg-primary-blue-50 rounded-full shrink-0">
                <Target className="w-4 h-4 sm:w-6 sm:h-6 text-primary-orange-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* CatÃ©gories actives */}
        <Card>
          <CardContent className="p-3 sm:p-6">
            <div className="flex items-center justify-between">
              <div className="min-w-0 flex-1">
                <p className="text-xs sm:text-sm font-medium text-gray-600 truncate">CatÃ©gories</p>
                <p className="text-base sm:text-2xl font-bold text-gray-900">{categories?.length || 0}</p>
                <p className="text-xs text-gray-500 mt-1 truncate">
                  {categories.filter(c => expenses.some(e => e.category_id === c.id)).length} utilisÃ©es
                </p>
              </div>
              <div className="p-2 sm:p-3 bg-purple-50 rounded-full shrink-0">
                <Package className="w-4 h-4 sm:w-6 sm:h-6 text-purple-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Onglets principaux - Scrollable on mobile */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4 sm:space-y-6">
        <div className="overflow-x-auto -mx-3 px-3 sm:mx-0 sm:px-0">
          <TabsList className="inline-flex w-max sm:w-full sm:grid sm:grid-cols-7 h-auto p-1 gap-1">
            <TabsTrigger value="profit" className="text-xs sm:text-sm px-2 sm:px-3 py-2 whitespace-nowrap">
              <Calculator className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2" />
              Profit
            </TabsTrigger>
            <TabsTrigger value="dashboard" className="text-xs sm:text-sm px-2 sm:px-3 py-2 whitespace-nowrap">
              <BarChart className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2" />
              Dashboard
            </TabsTrigger>
            <TabsTrigger value="purchases" className="text-xs sm:text-sm px-2 sm:px-3 py-2 whitespace-nowrap">
              <ShoppingCart className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2" />
              Achats
            </TabsTrigger>
            <TabsTrigger value="expenses" className="text-xs sm:text-sm px-2 sm:px-3 py-2 whitespace-nowrap">
              <Receipt className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2" />
              DÃ©penses
            </TabsTrigger>
            <TabsTrigger value="categories" className="text-xs sm:text-sm px-2 sm:px-3 py-2 whitespace-nowrap">
              <Package className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2" />
              CatÃ©gories
            </TabsTrigger>
            <TabsTrigger value="analytics" className="text-xs sm:text-sm px-2 sm:px-3 py-2 whitespace-nowrap">
              <Brain className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2" />
              IA
            </TabsTrigger>
            <TabsTrigger value="wallet" className="text-xs sm:text-sm px-2 sm:px-3 py-2 whitespace-nowrap">
              <Wallet className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2" />
              Wallet
            </TabsTrigger>
          </TabsList>
        </div>

        {/* Analyse de Profit Mensuel */}
        <TabsContent value="profit" className="space-y-6">
          {vendorId && userId ? (
            <MonthlyProfitAnalysis vendorId={vendorId} userId={userId} />
          ) : (
            <Card>
              <CardContent className="p-6 text-center text-muted-foreground">
                Chargement des donnÃ©es vendeur...
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Dashboard - Graphiques et analyses */}
        <TabsContent value="dashboard" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Graphique en barres par catÃ©gorie */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart className="w-5 h-5" />
                  DÃ©penses par CatÃ©gorie
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
                  RÃ©partition des DÃ©penses
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
                Ã‰volution Mensuelle des DÃ©penses
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

          {/* Alertes rÃ©centes */}
          {alerts.length > 0 && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-orange-600">
                    <Bell className="w-5 h-5" />
                    Alertes RÃ©centes ({alerts.length})
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

        {/* Achats - DÃ©penses liÃ©es aux achats de stock */}
        <TabsContent value="purchases" className="space-y-6">
          {userId ? (
            <PurchaseExpensesSection vendorId={userId} />
          ) : (
            <Card>
              <CardContent className="p-6 text-center text-muted-foreground">
                Chargement des donnÃ©es vendeur...
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* DÃ©penses - OpÃ©rationnel */}
        <TabsContent value="expenses" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Nouvelle DÃ©pense</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div>
                  <Label>LibellÃ©</Label>
                  <Input placeholder="Ex: Achat fournitures" id="expense-label" />
                </div>
                <div>
                  <Label>Montant</Label>
                  <Input type="number" placeholder="0" id="expense-amount" />
                </div>
                <div>
                  <Label>CatÃ©gorie</Label>
                  <select id="expense-category" className="w-full h-10 px-3 border rounded-md bg-white">
                    <option value="">SÃ©lectionner</option>
                    {categories?.map((c: any) => (
                      <option key={c?.id} value={c?.id}>{c?.name || c?.label || `CatÃ©gorie #${c?.id}`}</option>
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
                        toast({ title: 'Champs requis', description: 'LibellÃ©, montant et catÃ©gorie sont requis', variant: 'destructive' });
                        return;
                      }
                      try {
                        await createExpense({ label, amount, category_id });
                        toast({ title: 'DÃ©pense ajoutÃ©e' });
                        await refetch();
                        if (labelEl) labelEl.value = '';
                        if (amountEl) amountEl.value = '';
                        if (catEl) catEl.value = '';
                      } catch (e) {
                        toast({ title: 'Erreur', description: 'Impossible d\'ajouter la dÃ©pense', variant: 'destructive' });
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
              <CardTitle>Liste des DÃ©penses</CardTitle>
            </CardHeader>
            <CardContent>
              {expenses.length === 0 ? (
                <p className="text-gray-500">Aucune dÃ©pense enregistrÃ©e</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-left border-b">
                        <th className="py-2 pr-4">LibellÃ©</th>
                        <th className="py-2 pr-4">CatÃ©gorie</th>
                        <th className="py-2 pr-4">Montant</th>
                        <th className="py-2 pr-4">Date</th>
                        <th className="py-2 pr-4 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {expenses.map((e: any) => (
                        <tr key={e?.id} className="border-b last:border-0">
                          <td className="py-2 pr-4">{e?.label || e?.name || 'â€”'}</td>
                          <td className="py-2 pr-4">{categories?.find((c: any) => c?.id === (e?.category_id || e?.category))?.name || 'â€”'}</td>
                          <td className="py-2 pr-4">{Number(e?.amount || 0).toLocaleString()} GNF</td>
                          <td className="py-2 pr-4">{e?.created_at ? new Date(e.created_at).toLocaleString('fr-FR') : 'â€”'}</td>
                          <td className="py-2 pr-0 text-right">
                            <Button variant="ghost" size="sm" onClick={async () => {
                              try {
                                await deleteExpense(e?.id);
                                toast({ title: 'DÃ©pense supprimÃ©e' });
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

        {/* CatÃ©gories - OpÃ©rationnel */}
        <TabsContent value="categories" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>CrÃ©er une CatÃ©gorie</CardTitle>
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
                      toast({ title: 'CatÃ©gorie crÃ©Ã©e' });
                      await refetch();
                      if (nameEl) nameEl.value = '';
                      if (budgetEl) budgetEl.value = '';
                    } catch (e) {
                      toast({ title: 'Erreur', description: 'Impossible de crÃ©er la catÃ©gorie', variant: 'destructive' });
                    }
                  }}>CrÃ©er</Button>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Liste des CatÃ©gories</CardTitle>
            </CardHeader>
            <CardContent>
              {(!categories || categories.length === 0) ? (
                <p className="text-gray-500">Aucune catÃ©gorie</p>
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
                          <td className="py-2 pr-4">{c?.name || 'â€”'}</td>
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
                      <div className="font-medium mb-2">Top catÃ©gories du mois</div>
                      <div className="space-y-2">
                        {ranked.length === 0 ? (
                          <p className="text-gray-500">Aucune dÃ©pense ce mois.</p>
                        ) : ranked.map((r) => {
                          const cat = categories?.find((c: any) => String(c?.id) === String(r.id));
                          return (
                            <div key={r.id} className="flex items-center justify-between p-2 rounded border">
                              <span>{cat?.name || `CatÃ©gorie #${r.id}`}</span>
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
              <CardTitle>DÃ©tection de DÃ©passement de Budget</CardTitle>
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
                      <p className="text-primary-orange-700 bg-primary-blue-50 p-2 rounded">Aucun dÃ©passement dÃ©tectÃ© ce mois.</p>
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
                if (metrics.monthlyChange > 10) recs.push('Les dÃ©penses ont augmentÃ© de plus de 10% vs le mois dernier. Envisagez un audit des catÃ©gories principales.');
                if ((categories?.length || 0) === 0) recs.push('Aucune catÃ©gorie configurÃ©e. CrÃ©ez des catÃ©gories avec un budget mensuel pour un meilleur contrÃ´le.');
                if ((expenses?.length || 0) === 0) recs.push('Aucune dÃ©pense saisie. Ajoutez vos premiÃ¨res dÃ©penses pour dÃ©marrer le suivi.');
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
          <WalletDashboard />
        </TabsContent>
      </Tabs>
    </div>
  );
}
