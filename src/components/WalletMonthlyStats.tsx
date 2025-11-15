import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { TrendingUp, TrendingDown, Activity, Calendar } from 'lucide-react';

interface MonthlyStats {
  totalReceived: number;
  totalSent: number;
  transactionCount: number;
  netChange: number;
}

export default function WalletMonthlyStats() {
  const { user } = useAuth();
  const [stats, setStats] = useState<MonthlyStats>({
    totalReceived: 0,
    totalSent: 0,
    transactionCount: 0,
    netChange: 0
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user?.id) {
      loadMonthlyStats();
    }
  }, [user]);

  const loadMonthlyStats = async () => {
    if (!user?.id) return;

    try {
      setLoading(true);
      
      // Obtenir le premier et dernier jour du mois actuel
      const now = new Date();
      const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
      const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);

      // Récupérer toutes les transactions du mois
      const { data: transactions, error } = await supabase
        .from('enhanced_transactions')
        .select('amount, sender_id, receiver_id, status')
        .or(`sender_id.eq.${user.id},receiver_id.eq.${user.id}`)
        .eq('status', 'completed')
        .gte('created_at', firstDay.toISOString())
        .lte('created_at', lastDay.toISOString());

      if (error) throw error;

      let totalReceived = 0;
      let totalSent = 0;
      let transactionCount = transactions?.length || 0;

      transactions?.forEach((tx) => {
        if (tx.receiver_id === user.id) {
          totalReceived += tx.amount;
        } else if (tx.sender_id === user.id) {
          totalSent += tx.amount;
        }
      });

      const netChange = totalReceived - totalSent;

      setStats({
        totalReceived,
        totalSent,
        transactionCount,
        netChange
      });
    } catch (error) {
      console.error('Erreur chargement statistiques:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('fr-GN', {
      style: 'decimal',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount) + ' GNF';
  };

  const getMonthName = () => {
    return new Date().toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' });
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="animate-pulse space-y-4">
            <div className="h-4 bg-muted rounded w-3/4"></div>
            <div className="h-4 bg-muted rounded w-1/2"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Calendar className="h-5 w-5" />
          Statistiques du mois
        </CardTitle>
        <CardDescription>
          {getMonthName()}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Revenus */}
          <div className="bg-green-50 dark:bg-green-950 rounded-lg p-4 border border-green-200">
            <div className="flex items-center gap-2 mb-2">
              <TrendingUp className="h-4 w-4 text-green-600" />
              <span className="text-sm font-medium text-green-700 dark:text-green-400">Reçu</span>
            </div>
            <p className="text-2xl font-bold text-green-600">
              {formatCurrency(stats.totalReceived)}
            </p>
          </div>

          {/* Dépenses */}
          <div className="bg-red-50 dark:bg-red-950 rounded-lg p-4 border border-red-200">
            <div className="flex items-center gap-2 mb-2">
              <TrendingDown className="h-4 w-4 text-red-600" />
              <span className="text-sm font-medium text-red-700 dark:text-red-400">Envoyé</span>
            </div>
            <p className="text-2xl font-bold text-red-600">
              {formatCurrency(stats.totalSent)}
            </p>
          </div>

          {/* Transactions */}
          <div className="bg-blue-50 dark:bg-blue-950 rounded-lg p-4 border border-blue-200">
            <div className="flex items-center gap-2 mb-2">
              <Activity className="h-4 w-4 text-blue-600" />
              <span className="text-sm font-medium text-blue-700 dark:text-blue-400">Transactions</span>
            </div>
            <p className="text-2xl font-bold text-blue-600">
              {stats.transactionCount}
            </p>
          </div>
        </div>

        {/* Bilan du mois */}
        <div className={`mt-4 rounded-lg p-4 border ${
          stats.netChange >= 0 
            ? 'bg-green-50 dark:bg-green-950 border-green-200' 
            : 'bg-red-50 dark:bg-red-950 border-red-200'
        }`}>
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">Bilan du mois</span>
            <div className="flex items-center gap-2">
              {stats.netChange >= 0 ? (
                <TrendingUp className="h-5 w-5 text-green-600" />
              ) : (
                <TrendingDown className="h-5 w-5 text-red-600" />
              )}
              <span className={`text-xl font-bold ${
                stats.netChange >= 0 ? 'text-green-600' : 'text-red-600'
              }`}>
                {stats.netChange >= 0 ? '+' : ''}{formatCurrency(stats.netChange)}
              </span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
