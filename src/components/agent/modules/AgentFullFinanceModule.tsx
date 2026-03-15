/**
 * AGENT FULL FINANCE MODULE
 * Module Finance complet pour l'agent - miroir de PDGFinance
 * Intègre: Revenus, Transactions, Analytics, Abonnements, Escrow, Driver Subscriptions
 */

import { useState, useEffect, lazy, Suspense } from 'react';
import { useFormatCurrency } from '@/hooks/useFormatCurrency';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  DollarSign, TrendingUp, Wallet, Download, Clock, 
  BarChart3, RefreshCw, Sparkles, Shield, Bike, Building2,
  ArrowUpRight, ArrowDownLeft, Activity, PiggyBank,
  CreditCard, Calendar
} from 'lucide-react';
import { toast } from 'sonner';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  ResponsiveContainer
} from 'recharts';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import { useFinanceData } from '@/hooks/useFinanceData';
import { format, startOfMonth } from 'date-fns';
import { fr } from 'date-fns/locale';
import { supabase } from '@/integrations/supabase/client';

// Lazy load des composants lourds
const PlatformRevenueOverview = lazy(() => import('@/components/pdg/PlatformRevenueOverview'));
const PDGRevenueAnalytics = lazy(() => import('@/components/pdg/PDGRevenueAnalytics'));
const SubscriptionManagement = lazy(() => import('@/components/pdg/SubscriptionManagement'));
const PDGEscrowManagement = lazy(() => import('@/components/pdg/PDGEscrowManagement'));
const DriverSubscriptionManagement = lazy(() => import('@/components/pdg/DriverSubscriptionManagement'));
const PDGServiceSubscriptions = lazy(() => import('@/components/pdg/PDGServiceSubscriptions'));

interface AgentFullFinanceModuleProps {
  agentId: string;
  canManage?: boolean;
}

interface AgentFinancialStats {
  totalCommissions: number;
  pendingCommissions: number;
  paidCommissions: number;
  walletBalance: number;
  totalTransactions: number;
  transactionsThisMonth: number;
}

const LoadingSpinner = () => (
  <div className="flex items-center justify-center p-12">
    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
  </div>
);

export function AgentFullFinanceModule({ agentId, canManage = false }: AgentFullFinanceModuleProps) {
  const { stats: platformStats, transactions, loading: platformLoading, refetch } = useFinanceData(true);
  const [agentStats, setAgentStats] = useState<AgentFinancialStats>({
    totalCommissions: 0,
    pendingCommissions: 0,
    paidCommissions: 0,
    walletBalance: 0,
    totalTransactions: 0,
    transactionsThisMonth: 0
  });
  const [commissions, setCommissions] = useState<any[]>([]);
  const [agentTransactions, setAgentTransactions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState({ from: '', to: '' });
  const [activeTab, setActiveTab] = useState('overview');

  const chartConfig = {
    amount: { label: "Montant", color: "hsl(var(--primary))" },
    commission: { label: "Commission", color: "hsl(var(--chart-2))" }
  };

  useEffect(() => {
    loadAgentFinancialData();
  }, [agentId]);

  const loadAgentFinancialData = async () => {
    try {
      setLoading(true);

      // Charger les commissions de l'agent
      const { data: commissionsData } = await supabase
        .from('agent_affiliate_commissions')
        .select('*')
        .eq('agent_id', agentId)
        .order('created_at', { ascending: false })
        .limit(100);

      // Charger le solde du wallet agent
      const { data: walletData } = await supabase
        .from('agent_wallets')
        .select('balance')
        .eq('agent_id', agentId)
        .single();

      // Charger les logs de commissions
      const { data: logsData } = await supabase
        .from('agent_commissions_log')
        .select('*')
        .eq('agent_id', agentId)
        .order('created_at', { ascending: false })
        .limit(50);

      const commissionsList = commissionsData || [];
      const totalCommissions = commissionsList.reduce((sum, c) => sum + (c.commission_amount || 0), 0);
      const pendingCommissions = commissionsList
        .filter(c => c.status === 'pending')
        .reduce((sum, c) => sum + (c.commission_amount || 0), 0);
      const paidCommissions = commissionsList
        .filter(c => c.status === 'paid')
        .reduce((sum, c) => sum + (c.commission_amount || 0), 0);

      const startOfCurrentMonth = startOfMonth(new Date());
      const transactionsThisMonth = commissionsList.filter(
        c => new Date(c.created_at) >= startOfCurrentMonth
      ).length;

      setAgentStats({
        totalCommissions,
        pendingCommissions,
        paidCommissions,
        walletBalance: walletData?.balance || 0,
        totalTransactions: commissionsList.length,
        transactionsThisMonth
      });

      setCommissions(commissionsList);
      setAgentTransactions((logsData || []).map((log: any) => ({
        id: log.id,
        amount: log.amount,
        type: log.source_type,
        status: 'completed',
        description: log.description || 'Commission',
        created_at: log.created_at
      })));

    } catch (error) {
      console.error('Erreur chargement finances agent:', error);
      toast.error('Erreur lors du chargement des données');
    } finally {
      setLoading(false);
    }
  };

  const formatAmount = useFormatCurrency();

  const exportData = async () => {
    try {
      const csvData = commissions.map(c => ({
        'ID': c.id,
        'Type': c.transaction_type || 'N/A',
        'Montant Transaction': c.transaction_amount,
        'Commission': c.commission_amount,
        'Taux': `${c.commission_rate}%`,
        'Statut': c.status,
        'Date': new Date(c.created_at).toLocaleDateString('fr-FR'),
      }));

      const csvContent = [
        Object.keys(csvData[0] || {}).join(','),
        ...csvData.map(row => Object.values(row).join(','))
      ].join('\n');
      
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `commissions_agent_${new Date().toISOString().split('T')[0]}.csv`;
      a.click();
      window.URL.revokeObjectURL(url);
      
      toast.success('Export réussi');
    } catch (error) {
      toast.error('Erreur lors de l\'export');
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'paid':
        return <Badge className="bg-green-100 text-green-700">Payé</Badge>;
      case 'pending':
        return <Badge className="bg-amber-100 text-amber-700">En attente</Badge>;
      case 'cancelled':
        return <Badge className="bg-red-100 text-red-700">Annulé</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  if (loading || platformLoading) {
    return <LoadingSpinner />;
  }

  const chartData = commissions.slice(0, 10).reverse().map(c => ({
    date: new Date(c.created_at).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' }),
    amount: Number(c.transaction_amount),
    commission: Number(c.commission_amount)
  }));

  return (
    <div className="space-y-6">
      {/* Header avec stats agent */}
      <Card className="border-0 shadow-lg overflow-hidden">
        <CardHeader className="bg-gradient-to-r from-amber-500/10 via-orange-500/10 to-red-500/10 border-b">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 shadow-lg">
                <DollarSign className="w-6 h-6 text-white" />
              </div>
              <div>
                <CardTitle className="text-xl">Finance & Revenus</CardTitle>
                <CardDescription>Tableau de bord financier complet</CardDescription>
              </div>
            </div>
            <Button variant="outline" size="sm" onClick={() => { loadAgentFinancialData(); refetch(); }}>
              <RefreshCw className="w-4 h-4 mr-2" />
              Actualiser
            </Button>
          </div>
        </CardHeader>
        <CardContent className="p-6">
          {/* Stats Cards Agent */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <div className="bg-gradient-to-br from-emerald-500 to-teal-600 rounded-xl p-4 text-white shadow-lg">
              <div className="flex items-center gap-2 mb-2">
                <Wallet className="w-5 h-5" />
                <span className="text-sm opacity-90">Mon Solde</span>
              </div>
              <p className="text-2xl font-bold">{formatAmount(agentStats.walletBalance)}</p>
              <p className="text-xs opacity-75">GNF</p>
            </div>

            <div className="bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl p-4 text-white shadow-lg">
              <div className="flex items-center gap-2 mb-2">
                <TrendingUp className="w-5 h-5" />
                <span className="text-sm opacity-90">Total Commissions</span>
              </div>
              <p className="text-2xl font-bold">{formatAmount(agentStats.totalCommissions)}</p>
              <p className="text-xs opacity-75">GNF</p>
            </div>

            <div className="bg-gradient-to-br from-amber-500 to-orange-600 rounded-xl p-4 text-white shadow-lg">
              <div className="flex items-center gap-2 mb-2">
                <PiggyBank className="w-5 h-5" />
                <span className="text-sm opacity-90">En Attente</span>
              </div>
              <p className="text-2xl font-bold">{formatAmount(agentStats.pendingCommissions)}</p>
              <p className="text-xs opacity-75">GNF</p>
            </div>

            <div className="bg-gradient-to-br from-green-500 to-emerald-600 rounded-xl p-4 text-white shadow-lg">
              <div className="flex items-center gap-2 mb-2">
                <CreditCard className="w-5 h-5" />
                <span className="text-sm opacity-90">Payées</span>
              </div>
              <p className="text-2xl font-bold">{formatAmount(agentStats.paidCommissions)}</p>
              <p className="text-xs opacity-75">GNF</p>
            </div>
          </div>

          {/* Activity quick stats */}
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-muted/30 rounded-lg p-4 flex items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                <Activity className="w-6 h-6 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">{agentStats.totalTransactions}</p>
                <p className="text-sm text-muted-foreground">Transactions totales</p>
              </div>
            </div>
            <div className="bg-muted/30 rounded-lg p-4 flex items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center">
                <Calendar className="w-6 h-6 text-green-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">{agentStats.transactionsThisMonth}</p>
                <p className="text-sm text-muted-foreground">Ce mois-ci</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Main Tabs - Miroir de PDGFinance */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <div className="overflow-x-auto scrollbar-none -mx-3 px-3 sm:mx-0 sm:px-0">
          <TabsList className="inline-flex w-max sm:w-full sm:grid sm:grid-cols-7 gap-1 bg-muted/50 p-1 rounded-xl">
            <TabsTrigger value="overview" className="flex items-center gap-1.5 px-3 py-2 text-xs sm:text-sm whitespace-nowrap">
              <DollarSign className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              <span>Revenus</span>
            </TabsTrigger>
            <TabsTrigger value="my-commissions" className="flex items-center gap-1.5 px-3 py-2 text-xs sm:text-sm whitespace-nowrap">
              <TrendingUp className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              <span>Commissions</span>
            </TabsTrigger>
            <TabsTrigger value="transactions" className="flex items-center gap-1.5 px-3 py-2 text-xs sm:text-sm whitespace-nowrap">
              <Wallet className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              <span>Transactions</span>
            </TabsTrigger>
            <TabsTrigger value="subscriptions" className="flex items-center gap-1.5 px-3 py-2 text-xs sm:text-sm whitespace-nowrap">
              <Sparkles className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              <span>Abonnements</span>
            </TabsTrigger>
            <TabsTrigger value="service-subs" className="flex items-center gap-1.5 px-3 py-2 text-xs sm:text-sm whitespace-nowrap">
              <Building2 className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              <span>Services</span>
            </TabsTrigger>
            <TabsTrigger value="escrow" className="flex items-center gap-1.5 px-3 py-2 text-xs sm:text-sm whitespace-nowrap">
              <Shield className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              <span>Escrow</span>
            </TabsTrigger>
            <TabsTrigger value="driver-subs" className="flex items-center gap-1.5 px-3 py-2 text-xs sm:text-sm whitespace-nowrap">
              <Bike className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              <span>Drivers</span>
            </TabsTrigger>
          </TabsList>
        </div>

        {/* Revenus Plateforme */}
        <TabsContent value="overview" className="space-y-6">
          <Suspense fallback={<LoadingSpinner />}>
            <PlatformRevenueOverview />
          </Suspense>
        </TabsContent>

        {/* Mes Commissions */}
        <TabsContent value="my-commissions" className="space-y-6">
          <Card className="border-0 shadow-lg">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="w-5 h-5 text-primary" />
                  Mes Commissions
                </CardTitle>
                <Button variant="outline" size="sm" onClick={exportData}>
                  <Download className="w-4 h-4 mr-2" />
                  Exporter
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {commissions.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <TrendingUp className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>Aucune commission enregistrée</p>
                </div>
              ) : (
                <ScrollArea className="h-[400px]">
                  <div className="space-y-3">
                    {commissions.map((comm) => (
                      <div
                        key={comm.id}
                        className="flex items-center justify-between p-4 bg-muted/20 rounded-lg hover:bg-muted/30 transition-colors"
                      >
                        <div>
                          <p className="font-medium text-foreground">
                            Commission {comm.transaction_type}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            Taux: {comm.commission_rate}% sur {formatAmount(comm.transaction_amount)} GNF
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {format(new Date(comm.created_at), 'dd MMM yyyy HH:mm', { locale: fr })}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="font-bold text-green-600">
                            +{formatAmount(comm.commission_amount)} GNF
                          </p>
                          {getStatusBadge(comm.status)}
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Transactions Plateforme */}
        <TabsContent value="transactions" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <Card className="relative overflow-hidden border-border/40 bg-card/50 backdrop-blur-sm">
              <div className="absolute inset-0 bg-gradient-to-br from-green-500/10 to-transparent" />
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-green-500/10 flex items-center justify-center">
                    <DollarSign className="w-4 h-4 text-green-500" />
                  </div>
                  Revenus Totaux Plateforme
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold">{formatAmount(platformStats.total_revenue || 0)} GNF</p>
              </CardContent>
            </Card>

            <Card className="relative overflow-hidden border-border/40 bg-card/50 backdrop-blur-sm">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-blue-500/10 flex items-center justify-center">
                    <TrendingUp className="w-4 h-4 text-blue-500" />
                  </div>
                  Commissions Plateforme
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold">{formatAmount(platformStats.total_commission || 0)} GNF</p>
                <p className="text-xs text-muted-foreground">Sur {transactions?.length || 0} transactions</p>
              </CardContent>
            </Card>

            <Card className="relative overflow-hidden border-border/40 bg-card/50 backdrop-blur-sm">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-orange-500/10 flex items-center justify-center">
                    <Clock className="w-4 h-4 text-orange-500" />
                  </div>
                  Paiements en Attente
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold">{formatAmount(platformStats.pending_payments || 0)} GNF</p>
              </CardContent>
            </Card>

            <Card className="relative overflow-hidden border-border/40 bg-card/50 backdrop-blur-sm">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-purple-500/10 flex items-center justify-center">
                    <Wallet className="w-4 h-4 text-purple-500" />
                  </div>
                  Wallets Actifs
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold">{platformStats.active_wallets || 0}</p>
              </CardContent>
            </Card>
          </div>

          {/* Charts */}
          {chartData.length > 0 && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card className="border-border/40 bg-card/50 backdrop-blur-sm">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <BarChart3 className="w-5 h-5 text-primary" />
                    Évolution des Commissions
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ChartContainer config={chartConfig} className="h-[250px]">
                    <LineChart data={chartData}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-border/20" />
                      <XAxis dataKey="date" className="text-xs" />
                      <YAxis className="text-xs" />
                      <ChartTooltip content={<ChartTooltipContent />} />
                      <Line 
                        type="monotone" 
                        dataKey="commission" 
                        stroke="hsl(var(--primary))" 
                        strokeWidth={3}
                        dot={{ fill: 'hsl(var(--primary))', r: 4 }}
                      />
                    </LineChart>
                  </ChartContainer>
                </CardContent>
              </Card>

              <Card className="border-border/40 bg-card/50 backdrop-blur-sm">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <DollarSign className="w-5 h-5 text-primary" />
                    Volume des Transactions
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ChartContainer config={chartConfig} className="h-[250px]">
                    <BarChart data={chartData}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-border/20" />
                      <XAxis dataKey="date" className="text-xs" />
                      <YAxis className="text-xs" />
                      <ChartTooltip content={<ChartTooltipContent />} />
                      <Bar dataKey="amount" fill="hsl(var(--primary))" radius={[8, 8, 0, 0]} />
                    </BarChart>
                  </ChartContainer>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Recent Transactions */}
          <Card className="border-border/40 bg-card/50 backdrop-blur-sm">
            <CardHeader>
              <CardTitle>Transactions Récentes Plateforme</CardTitle>
              <CardDescription>Les 10 dernières opérations financières</CardDescription>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[300px]">
                <div className="space-y-3">
                  {(transactions || []).slice(0, 10).map((trans, index) => (
                    <div
                      key={trans.id}
                      className="group p-4 rounded-xl border border-border/40 bg-muted/30 hover:bg-muted/50 transition-all duration-200"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                            trans.status === 'completed' ? 'bg-green-100' : 
                            trans.status === 'pending' ? 'bg-orange-100' : 'bg-red-100'
                          }`}>
                            <DollarSign className={`w-5 h-5 ${
                              trans.status === 'completed' ? 'text-green-600' : 
                              trans.status === 'pending' ? 'text-orange-600' : 'text-red-600'
                            }`} />
                          </div>
                          <div>
                            <p className="text-sm font-semibold">
                              {trans.transaction_type?.toUpperCase() || 'TRANSACTION'}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {new Date(trans.created_at).toLocaleDateString('fr-FR')}
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="font-bold">{formatAmount(trans.amount || 0)} GNF</p>
                          <Badge variant={trans.status === 'completed' ? 'default' : 'secondary'}>
                            {trans.status}
                          </Badge>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Abonnements */}
        <TabsContent value="subscriptions" className="space-y-6">
          <Suspense fallback={<LoadingSpinner />}>
            <SubscriptionManagement />
          </Suspense>
        </TabsContent>

        {/* Service Subscriptions */}
        <TabsContent value="service-subs" className="space-y-6">
          <Suspense fallback={<LoadingSpinner />}>
            <PDGServiceSubscriptions />
          </Suspense>
        </TabsContent>

        {/* Escrow */}
        <TabsContent value="escrow" className="space-y-6">
          <Suspense fallback={<LoadingSpinner />}>
            <PDGEscrowManagement />
          </Suspense>
        </TabsContent>

        {/* Driver Subscriptions */}
        <TabsContent value="driver-subs" className="space-y-6">
          <Suspense fallback={<LoadingSpinner />}>
            <DriverSubscriptionManagement />
          </Suspense>
        </TabsContent>
      </Tabs>
    </div>
  );
}

export default AgentFullFinanceModule;
