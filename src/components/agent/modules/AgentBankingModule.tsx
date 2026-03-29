/**
 * AGENT BANKING MODULE
 * Module SystÃ¨me Bancaire Intelligent - miroir de BankingDashboard
 */

import { useState, useEffect } from 'react';
import { useFormatCurrency } from '@/hooks/useFormatCurrency';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  AlertTriangle, Shield, TrendingUp, Wallet, 
  CheckCircle, XCircle, RefreshCw, Activity,
  DollarSign, FileText, Eye, Clock
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

interface AgentBankingModuleProps {
  agentId: string;
  canManage?: boolean;
}

interface DashboardData {
  panic_mode_active: boolean;
  total_balance: {
    wallets: number;
    agent_wallets: number;
    bureau_wallets: number;
    total: number;
  };
  pending_quarantine: number;
  unread_alerts: number;
  today_stats: {
    transactions: number;
    volume: number;
    successful: number;
    failed: number;
    quarantined: number;
  };
}

interface FinancialAlert {
  id: string;
  alert_type: string;
  severity: string;
  title: string;
  message: string;
  is_read: boolean;
  is_resolved: boolean;
  created_at: string;
}

interface LedgerEntry {
  id: string;
  transaction_id: string;
  actor_type: string;
  amount: number;
  transaction_type: string;
  balance_before_debit: number | null;
  balance_after_debit: number | null;
  balance_before_credit: number | null;
  balance_after_credit: number | null;
  validation_status: string;
  created_at: string;
  ledger_hash: string;
}

export function AgentBankingModule({ agentId, canManage = false }: AgentBankingModuleProps) {
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
  const [alerts, setAlerts] = useState<FinancialAlert[]>([]);
  const [ledger, setLedger] = useState<LedgerEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDashboard();
    const interval = setInterval(loadDashboard, 30000);
    return () => clearInterval(interval);
  }, []);

  const loadDashboard = async () => {
    try {
      setLoading(true);
      
      // Load dashboard stats via RPC
      const { data: statsData, error: statsError } = await supabase
        .rpc('get_pdg_financial_dashboard');
      
      if (!statsError && statsData) {
        setDashboardData(statsData as unknown as DashboardData);
      }

      // Load alerts
      const { data: alertsData } = await supabase
        .from('pdg_financial_alerts')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50);
      
      if (alertsData) {
        setAlerts(alertsData as FinancialAlert[]);
      }

      // Load recent ledger entries
      const { data: ledgerData } = await supabase
        .from('financial_ledger')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(100);
      
      if (ledgerData) {
        setLedger(ledgerData as LedgerEntry[]);
      }

    } catch (error: any) {
      console.error('Error loading banking dashboard:', error);
      toast.error('Erreur de chargement du tableau de bord');
    } finally {
      setLoading(false);
    }
  };

  const formatAmount = useFormatCurrency();

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'emergency': return 'bg-red-500';
      case 'critical': return 'bg-orange-500';
      case 'warning': return 'bg-yellow-500';
      default: return 'bg-blue-500';
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'confirmed': return <Badge className="bg-gradient-to-br from-primary-blue-500 to-primary-orange-500">ConfirmÃ©</Badge>;
      case 'pending': return <Badge className="bg-yellow-500">En attente</Badge>;
      case 'quarantined': return <Badge className="bg-orange-500">Quarantaine</Badge>;
      case 'rejected': return <Badge variant="destructive">RejetÃ©</Badge>;
      default: return <Badge>{status}</Badge>;
    }
  };

  if (loading && !dashboardData) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Shield className="h-6 w-6" />
            SystÃ¨me Bancaire Intelligent
          </h1>
          <p className="text-muted-foreground">Supervision financiÃ¨re en temps rÃ©el</p>
        </div>
        <Button variant="outline" size="sm" onClick={loadDashboard}>
          <RefreshCw className="h-4 w-4 mr-2" />
          Actualiser
        </Button>
      </div>

      {/* Panic Mode Alert */}
      {dashboardData?.panic_mode_active && (
        <Card className="border-red-500 bg-red-50 dark:bg-red-950">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <AlertTriangle className="h-8 w-8 text-red-500" />
              <div>
                <p className="font-bold text-red-500">SYSTÃˆME EN MODE PANIC</p>
                <p className="text-sm text-red-600">Toutes les transactions financiÃ¨res sont actuellement gelÃ©es</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Wallet className="h-4 w-4 text-primary" />
              Solde Total Plateforme
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatAmount(dashboardData?.total_balance?.total || 0)}
            </div>
            <div className="text-xs text-muted-foreground mt-1">
              <div>Wallets: {formatAmount(dashboardData?.total_balance?.wallets || 0)}</div>
              <div>Agents: {formatAmount(dashboardData?.total_balance?.agent_wallets || 0)}</div>
              <div>Bureaux: {formatAmount(dashboardData?.total_balance?.bureau_wallets || 0)}</div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Activity className="h-4 w-4 text-primary-orange-500" />
              Transactions Aujourd'hui
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {dashboardData?.today_stats?.transactions || 0}
            </div>
            <div className="text-xs text-muted-foreground mt-1">
              <div className="flex items-center gap-1">
                <CheckCircle className="h-3 w-3 text-primary-orange-500" />
                {dashboardData?.today_stats?.successful || 0} rÃ©ussies
              </div>
              <div className="flex items-center gap-1">
                <XCircle className="h-3 w-3 text-red-500" />
                {dashboardData?.today_stats?.failed || 0} Ã©chouÃ©es
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <DollarSign className="h-4 w-4 text-blue-500" />
              Volume Aujourd'hui
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatAmount(dashboardData?.today_stats?.volume || 0)}
            </div>
          </CardContent>
        </Card>

        <Card className={dashboardData?.pending_quarantine ? 'border-orange-500' : ''}>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-orange-500" />
              En Quarantaine
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {dashboardData?.pending_quarantine || 0}
            </div>
            <div className="text-xs text-muted-foreground">
              {dashboardData?.unread_alerts || 0} alertes non lues
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="alerts" className="w-full">
        <TabsList>
          <TabsTrigger value="alerts" className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4" />
            Alertes
            {(dashboardData?.unread_alerts || 0) > 0 && (
              <Badge variant="destructive" className="ml-1">{dashboardData?.unread_alerts}</Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="ledger" className="flex items-center gap-2">
            <FileText className="h-4 w-4" />
            Ledger Immutable
          </TabsTrigger>
        </TabsList>

        <TabsContent value="alerts" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Alertes FinanciÃ¨res</CardTitle>
              <CardDescription>Notifications de sÃ©curitÃ© et anomalies dÃ©tectÃ©es</CardDescription>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[400px]">
                {alerts.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">Aucune alerte</p>
                ) : (
                  <div className="space-y-3">
                    {alerts.map((alert) => (
                      <div 
                        key={alert.id} 
                        className={`p-4 rounded-lg border ${!alert.is_read ? 'bg-muted/50' : ''}`}
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex items-start gap-3">
                            <div className={`w-2 h-2 rounded-full mt-2 ${getSeverityColor(alert.severity)}`} />
                            <div>
                              <p className="font-medium">{alert.title}</p>
                              <p className="text-sm text-muted-foreground">{alert.message}</p>
                              <p className="text-xs text-muted-foreground mt-1">
                                {format(new Date(alert.created_at), 'dd MMM yyyy HH:mm', { locale: fr })}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            {alert.is_resolved ? (
                              <Badge className="bg-gradient-to-br from-primary-blue-500 to-primary-orange-500">RÃ©solu</Badge>
                            ) : (
                              <Badge variant="outline">Non rÃ©solu</Badge>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="ledger" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Ledger Immutable</CardTitle>
              <CardDescription>Historique des transactions avec hash de vÃ©rification</CardDescription>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[400px]">
                {ledger.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">Aucune entrÃ©e dans le ledger</p>
                ) : (
                  <div className="space-y-2">
                    {ledger.map((entry) => (
                      <div 
                        key={entry.id} 
                        className="p-3 rounded-lg border bg-muted/20 hover:bg-muted/40 transition-colors"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                              <FileText className="w-5 h-5 text-primary" />
                            </div>
                            <div>
                              <p className="font-medium text-sm">
                                {entry.transaction_type} - {entry.actor_type}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                {format(new Date(entry.created_at), 'dd/MM/yyyy HH:mm', { locale: fr })}
                              </p>
                              <p className="text-xs font-mono text-muted-foreground/70 truncate max-w-[200px]">
                                Hash: {entry.ledger_hash?.substring(0, 20)}...
                              </p>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className={`font-bold ${entry.amount >= 0 ? 'text-primary-orange-600' : 'text-red-600'}`}>
                              {entry.amount >= 0 ? '+' : ''}{formatAmount(entry.amount)}
                            </p>
                            {getStatusBadge(entry.validation_status)}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

export default AgentBankingModule;
