import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  DollarSign, TrendingUp, TrendingDown, Wallet, 
  ArrowUpRight, ArrowDownLeft, RefreshCw, Calendar,
  PiggyBank, CreditCard, BarChart3, Activity
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { format, subDays, startOfMonth, endOfMonth } from 'date-fns';
import { fr } from 'date-fns/locale';

interface AgentFinanceOverviewProps {
  agentId: string;
}

interface FinancialStats {
  totalCommissions: number;
  pendingCommissions: number;
  paidCommissions: number;
  walletBalance: number;
  totalTransactions: number;
  transactionsThisMonth: number;
}

interface Transaction {
  id: string;
  amount: number;
  type: string;
  status: string;
  description: string;
  created_at: string;
}

export function AgentFinanceOverview({ agentId }: AgentFinanceOverviewProps) {
  const [stats, setStats] = useState<FinancialStats>({
    totalCommissions: 0,
    pendingCommissions: 0,
    paidCommissions: 0,
    walletBalance: 0,
    totalTransactions: 0,
    transactionsThisMonth: 0
  });
  const [recentTransactions, setRecentTransactions] = useState<Transaction[]>([]);
  const [commissions, setCommissions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');

  useEffect(() => {
    loadFinancialData();
  }, [agentId]);

  const loadFinancialData = async () => {
    try {
      setLoading(true);

      // Charger les commissions de l'agent
      const { data: commissionsData, error: commError } = await supabase
        .from('agent_affiliate_commissions')
        .select('*')
        .eq('agent_id', agentId)
        .order('created_at', { ascending: false })
        .limit(50);

      if (commError) console.error('Erreur commissions:', commError);

      // Charger le solde du wallet
      const { data: walletData, error: walletError } = await supabase
        .from('agent_wallets')
        .select('balance, currency')
        .eq('agent_id', agentId)
        .single();

      if (walletError && walletError.code !== 'PGRST116') {
        console.error('Erreur wallet:', walletError);
      }

      // Charger les logs de commissions
      const { data: commLogsData, error: logsError } = await supabase
        .from('agent_commissions_log')
        .select('*')
        .eq('agent_id', agentId)
        .order('created_at', { ascending: false })
        .limit(20);

      if (logsError) console.error('Erreur logs:', logsError);

      // Calculer les stats
      const commissionsList = commissionsData || [];
      const totalCommissions = commissionsList.reduce((sum, c) => sum + (c.commission_amount || 0), 0);
      const pendingCommissions = commissionsList
        .filter(c => c.status === 'pending')
        .reduce((sum, c) => sum + (c.commission_amount || 0), 0);
      const paidCommissions = commissionsList
        .filter(c => c.status === 'paid')
        .reduce((sum, c) => sum + (c.commission_amount || 0), 0);

      const startOfCurrentMonth = startOfMonth(new Date());
      const commissionsThisMonth = commissionsList.filter(
        c => new Date(c.created_at) >= startOfCurrentMonth
      ).length;

      setStats({
        totalCommissions,
        pendingCommissions,
        paidCommissions,
        walletBalance: walletData?.balance || 0,
        totalTransactions: commissionsList.length,
        transactionsThisMonth: commissionsThisMonth
      });

      setCommissions(commissionsList);

      // Transformer les logs en transactions
      const transactions = (commLogsData || []).map((log: any) => ({
        id: log.id,
        amount: log.amount,
        type: log.source_type,
        status: 'completed',
        description: log.description || 'Commission',
        created_at: log.created_at
      }));

      setRecentTransactions(transactions);

    } catch (error: any) {
      console.error('Erreur chargement données financières:', error);
      toast.error('Erreur lors du chargement des données');
    } finally {
      setLoading(false);
    }
  };

  const formatAmount = (amount: number) => {
    return new Intl.NumberFormat('fr-GN', { 
      style: 'decimal',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
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

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card className="border-0 shadow-lg">
        <CardHeader className="bg-gradient-to-r from-amber-50 to-orange-50 border-b">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-foreground">
              <DollarSign className="w-6 h-6 text-amber-600" />
              Finance & Revenus
            </CardTitle>
            <Button variant="outline" size="sm" onClick={loadFinancialData}>
              <RefreshCw className="w-4 h-4 mr-2" />
              Actualiser
            </Button>
          </div>
        </CardHeader>
        <CardContent className="p-6">
          {/* Stats Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <div className="bg-gradient-to-br from-emerald-500 to-teal-600 rounded-xl p-4 text-white">
              <div className="flex items-center gap-2 mb-2">
                <Wallet className="w-5 h-5" />
                <span className="text-sm opacity-90">Solde Wallet</span>
              </div>
              <p className="text-2xl font-bold">{formatAmount(stats.walletBalance)}</p>
              <p className="text-xs opacity-75">GNF</p>
            </div>

            <div className="bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl p-4 text-white">
              <div className="flex items-center gap-2 mb-2">
                <TrendingUp className="w-5 h-5" />
                <span className="text-sm opacity-90">Total Commissions</span>
              </div>
              <p className="text-2xl font-bold">{formatAmount(stats.totalCommissions)}</p>
              <p className="text-xs opacity-75">GNF</p>
            </div>

            <div className="bg-gradient-to-br from-amber-500 to-orange-600 rounded-xl p-4 text-white">
              <div className="flex items-center gap-2 mb-2">
                <PiggyBank className="w-5 h-5" />
                <span className="text-sm opacity-90">En Attente</span>
              </div>
              <p className="text-2xl font-bold">{formatAmount(stats.pendingCommissions)}</p>
              <p className="text-xs opacity-75">GNF</p>
            </div>

            <div className="bg-gradient-to-br from-green-500 to-emerald-600 rounded-xl p-4 text-white">
              <div className="flex items-center gap-2 mb-2">
                <CreditCard className="w-5 h-5" />
                <span className="text-sm opacity-90">Payées</span>
              </div>
              <p className="text-2xl font-bold">{formatAmount(stats.paidCommissions)}</p>
              <p className="text-xs opacity-75">GNF</p>
            </div>
          </div>

          {/* Activity Stats */}
          <div className="grid grid-cols-2 gap-4 mb-6">
            <div className="bg-muted/30 rounded-lg p-4 flex items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                <Activity className="w-6 h-6 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">{stats.totalTransactions}</p>
                <p className="text-sm text-muted-foreground">Transactions totales</p>
              </div>
            </div>
            <div className="bg-muted/30 rounded-lg p-4 flex items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center">
                <Calendar className="w-6 h-6 text-green-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">{stats.transactionsThisMonth}</p>
                <p className="text-sm text-muted-foreground">Ce mois-ci</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tabs for details */}
      <Card className="border-0 shadow-lg">
        <CardContent className="p-0">
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="w-full rounded-none border-b bg-muted/30">
              <TabsTrigger value="overview" className="flex-1">Historique</TabsTrigger>
              <TabsTrigger value="commissions" className="flex-1">Commissions</TabsTrigger>
            </TabsList>

            <TabsContent value="overview" className="p-6">
              <h3 className="font-semibold mb-4 flex items-center gap-2">
                <BarChart3 className="w-5 h-5 text-primary" />
                Dernières Transactions
              </h3>
              
              {recentTransactions.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <DollarSign className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>Aucune transaction récente</p>
                </div>
              ) : (
                <ScrollArea className="h-[300px]">
                  <div className="space-y-3">
                    {recentTransactions.map((tx) => (
                      <div
                        key={tx.id}
                        className="flex items-center justify-between p-3 bg-muted/20 rounded-lg"
                      >
                        <div className="flex items-center gap-3">
                          <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                            tx.amount >= 0 ? 'bg-green-100' : 'bg-red-100'
                          }`}>
                            {tx.amount >= 0 ? (
                              <ArrowDownLeft className="w-5 h-5 text-green-600" />
                            ) : (
                              <ArrowUpRight className="w-5 h-5 text-red-600" />
                            )}
                          </div>
                          <div>
                            <p className="font-medium text-foreground">{tx.description}</p>
                            <p className="text-xs text-muted-foreground">
                              {format(new Date(tx.created_at), 'dd MMM yyyy à HH:mm', { locale: fr })}
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className={`font-bold ${tx.amount >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                            {tx.amount >= 0 ? '+' : ''}{formatAmount(tx.amount)} GNF
                          </p>
                          <Badge variant="secondary" className="text-xs">{tx.type}</Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              )}
            </TabsContent>

            <TabsContent value="commissions" className="p-6">
              <h3 className="font-semibold mb-4 flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-primary" />
                Détail des Commissions
              </h3>
              
              {commissions.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <TrendingUp className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>Aucune commission enregistrée</p>
                </div>
              ) : (
                <ScrollArea className="h-[300px]">
                  <div className="space-y-3">
                    {commissions.map((comm) => (
                      <div
                        key={comm.id}
                        className="flex items-center justify-between p-3 bg-muted/20 rounded-lg"
                      >
                        <div>
                          <p className="font-medium text-foreground">
                            Commission {comm.transaction_type}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            Taux: {comm.commission_rate}% sur {formatAmount(comm.transaction_amount)} GNF
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {format(new Date(comm.created_at), 'dd MMM yyyy', { locale: fr })}
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
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
