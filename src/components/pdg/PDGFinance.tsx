import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { supabase } from '@/integrations/supabase/client';
import { DollarSign, TrendingUp, Wallet, Download, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
} from 'recharts';

interface FinanceStats {
  total_revenue: number;
  total_commissions: number;
  pending_payments: number;
  active_wallets: number;
}

export default function PDGFinance() {
  const [stats, setStats] = useState<FinanceStats>({
    total_revenue: 0,
    total_commissions: 0,
    pending_payments: 0,
    active_wallets: 0
  });
  const [transactions, setTransactions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState({ from: '', to: '' });

  useEffect(() => {
    loadFinanceData();
  }, []);

  const loadFinanceData = async () => {
    setLoading(true);
    try {
      // Charger les transactions
      const { data: trans } = await supabase
        .from('wallet_transactions')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(100);

      setTransactions(trans || []);

      // Calculer les statistiques
      const revenue = trans?.reduce((sum, t) => sum + Number(t.amount || 0), 0) || 0;
      const commissions = trans?.reduce((sum, t) => sum + Number(t.fee || 0), 0) || 0;
      const pending = trans?.filter(t => t.status === 'pending').reduce((sum, t) => sum + Number(t.amount || 0), 0) || 0;

      const { count: walletCount } = await supabase
        .from('wallets')
        .select('*', { count: 'exact', head: true });

      setStats({
        total_revenue: revenue,
        total_commissions: commissions,
        pending_payments: pending,
        active_wallets: walletCount || 0
      });
    } catch (error) {
      console.error('Erreur chargement finances:', error);
      toast.error('Erreur lors du chargement des données financières');
    } finally {
      setLoading(false);
    }
  };

  const exportData = async () => {
    try {
      const csvContent = transactions.map(t => 
        `${t.transaction_id},${t.amount},${t.fee},${t.status},${t.created_at}`
      ).join('\n');
      
      const blob = new Blob([`Transaction ID,Amount,Fee,Status,Date\n${csvContent}`], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `transactions_${new Date().toISOString().split('T')[0]}.csv`;
      a.click();
      
      toast.success('Export réussi');
    } catch (error) {
      toast.error('Erreur lors de l\'export');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  const chartData = transactions.slice(0, 10).reverse().map(t => ({
    date: new Date(t.created_at).toLocaleDateString(),
    montant: Number(t.amount),
    commission: Number(t.fee)
  }));

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-gradient-to-br from-green-500/10 to-green-600/10 border-green-500/20">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-green-100">
              Revenu Total
            </CardTitle>
            <DollarSign className="h-4 w-4 text-green-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white">
              {stats.total_revenue.toLocaleString()} GNF
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-blue-500/10 to-blue-600/10 border-blue-500/20">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-blue-100">
              Commissions
            </CardTitle>
            <TrendingUp className="h-4 w-4 text-blue-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white">
              {stats.total_commissions.toLocaleString()} GNF
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-orange-500/10 to-orange-600/10 border-orange-500/20">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-orange-100">
              En Attente
            </CardTitle>
            <RefreshCw className="h-4 w-4 text-orange-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white">
              {stats.pending_payments.toLocaleString()} GNF
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-purple-500/10 to-purple-600/10 border-purple-500/20">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-purple-100">
              Wallets Actifs
            </CardTitle>
            <Wallet className="h-4 w-4 text-purple-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white">
              {stats.active_wallets}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="bg-slate-800/50 border-slate-700">
          <CardHeader>
            <CardTitle className="text-white">Évolution des Transactions</CardTitle>
            <CardDescription>10 dernières transactions</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                <XAxis dataKey="date" stroke="#9CA3AF" />
                <YAxis stroke="#9CA3AF" />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#1F2937', border: '1px solid #374151' }}
                  labelStyle={{ color: '#F3F4F6' }}
                />
                <Legend />
                <Line type="monotone" dataKey="montant" stroke="#10B981" strokeWidth={2} />
                <Line type="monotone" dataKey="commission" stroke="#3B82F6" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="bg-slate-800/50 border-slate-700">
          <CardHeader>
            <CardTitle className="text-white">Commissions par Transaction</CardTitle>
            <CardDescription>Vue détaillée</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                <XAxis dataKey="date" stroke="#9CA3AF" />
                <YAxis stroke="#9CA3AF" />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#1F2937', border: '1px solid #374151' }}
                  labelStyle={{ color: '#F3F4F6' }}
                />
                <Legend />
                <Bar dataKey="commission" fill="#8B5CF6" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Export Section */}
      <Card className="bg-slate-800/50 border-slate-700">
        <CardHeader>
          <CardTitle className="text-white">Export des Données</CardTitle>
          <CardDescription>Télécharger les rapports financiers</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-4">
            <Input
              type="date"
              value={dateRange.from}
              onChange={(e) => setDateRange({ ...dateRange, from: e.target.value })}
              className="bg-slate-700 border-slate-600 text-white"
            />
            <Input
              type="date"
              value={dateRange.to}
              onChange={(e) => setDateRange({ ...dateRange, to: e.target.value })}
              className="bg-slate-700 border-slate-600 text-white"
            />
            <Button onClick={exportData} className="gap-2">
              <Download className="w-4 h-4" />
              Exporter CSV
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Recent Transactions */}
      <Card className="bg-slate-800/50 border-slate-700">
        <CardHeader>
          <CardTitle className="text-white">Transactions Récentes</CardTitle>
          <CardDescription>Les 10 dernières transactions</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {transactions.slice(0, 10).map((trans) => (
              <div
                key={trans.id}
                className="flex items-center justify-between p-3 bg-slate-700/50 rounded-lg"
              >
                <div>
                  <p className="text-white font-medium">{trans.transaction_id}</p>
                  <p className="text-sm text-slate-400">
                    {new Date(trans.created_at).toLocaleString()}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-white font-bold">{Number(trans.amount).toLocaleString()} GNF</p>
                  <p className="text-sm text-slate-400">
                    Commission: {Number(trans.fee).toLocaleString()} GNF
                  </p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
