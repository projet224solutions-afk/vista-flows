import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Shield, LogOut, Users, DollarSign, Package, AlertTriangle, TrendingUp, Activity } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { toast } from 'sonner';

interface Stats {
  users: {
    total: number;
    admins: number;
    vendeurs: number;
    livreurs: number;
    clients: number;
  };
  transactions: {
    total: number;
    totalAmount: number;
    avgAmount: number;
  };
  orders: {
    total: number;
    pending: number;
    completed: number;
    cancelled: number;
  };
  errors: {
    total: number;
    critical: number;
    fixed: number;
  };
  wallets: {
    total: number;
    totalBalance: number;
    avgBalance: number;
  };
}

export default function AdminDashboard() {
  const { user, profile, signOut } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Vérifier l'accès admin
    if (profile && profile.role !== 'admin') {
      toast.error('Accès refusé - Réservé aux administrateurs');
      navigate('/');
      return;
    }

    loadStats();

    // Actualiser toutes les 30 secondes
    const interval = setInterval(loadStats, 30000);
    return () => clearInterval(interval);
  }, [profile, navigate]);

  const loadStats = async () => {
    try {
      // Stats utilisateurs
      const { data: profiles } = await supabase.from('profiles').select('role');
      
      const userStats = {
        total: profiles?.length || 0,
        admins: profiles?.filter(p => p.role === 'admin').length || 0,
        vendeurs: profiles?.filter(p => p.role === 'vendeur').length || 0,
        livreurs: profiles?.filter(p => p.role === 'livreur').length || 0,
        clients: profiles?.filter(p => p.role === 'client').length || 0,
      };

      // Stats transactions (30 derniers jours)
      const { data: transactions } = await supabase
        .from('wallet_transactions')
        .select('amount, currency')
        .gte('created_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString());

      const transactionStats = {
        total: transactions?.length || 0,
        totalAmount: transactions?.reduce((sum, t) => sum + (t.amount || 0), 0) || 0,
        avgAmount: transactions?.length ? transactions.reduce((sum, t) => sum + (t.amount || 0), 0) / transactions.length : 0,
      };

      // Stats commandes
      const { data: orders } = await supabase.from('orders').select('status');

      const orderStats = {
        total: orders?.length || 0,
        pending: orders?.filter(o => o.status === 'pending').length || 0,
        completed: orders?.filter(o => o.status === 'completed').length || 0,
        cancelled: orders?.filter(o => o.status === 'cancelled').length || 0,
      };

      // Stats erreurs
      const { data: errors } = await supabase
        .from('system_errors')
        .select('severity, fix_applied')
        .order('created_at', { ascending: false })
        .limit(100);

      const errorStats = {
        total: errors?.length || 0,
        critical: errors?.filter(e => e.severity === 'critique').length || 0,
        fixed: errors?.filter(e => e.fix_applied === true).length || 0,
      };

      // Stats portefeuilles
      const { data: wallets } = await supabase.from('wallets').select('balance');

      const walletStats = {
        total: wallets?.length || 0,
        totalBalance: wallets?.reduce((sum, w) => sum + (w.balance || 0), 0) || 0,
        avgBalance: wallets?.length ? wallets.reduce((sum, w) => sum + (w.balance || 0), 0) / wallets.length : 0,
      };

      setStats({
        users: userStats,
        transactions: transactionStats,
        orders: orderStats,
        errors: errorStats,
        wallets: walletStats,
      });
    } catch (error) {
      console.error('Erreur chargement stats:', error);
      toast.error('Impossible de charger les statistiques');
    } finally {
      setLoading(false);
    }
  };

  if (loading || !stats) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 to-slate-800">
        <div className="flex flex-col items-center gap-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
          <p className="text-muted-foreground">Chargement des données...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-muted/20 to-background">
      {/* Animated Background */}
      <div className="fixed inset-0 opacity-10 pointer-events-none">
        <div className="absolute inset-0 bg-grid-white/[0.02] bg-[size:50px_50px]" />
      </div>

      <div className="relative z-10">
        {/* Header */}
        <div className="border-b border-border/40 bg-card/30 backdrop-blur-xl">
          <div className="max-w-7xl mx-auto px-6 py-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-6">
                <div className="relative">
                  <div className="absolute inset-0 bg-gradient-to-r from-primary to-primary/60 blur-xl opacity-50" />
                  <div className="relative bg-gradient-to-br from-primary to-primary/80 p-3 rounded-2xl shadow-2xl">
                    <Shield className="w-8 h-8 text-primary-foreground" />
                  </div>
                </div>
                <div>
                  <h1 className="text-3xl font-bold bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-transparent">
                    Dashboard Admin 224SOLUTIONS
                  </h1>
                  <p className="text-sm text-muted-foreground mt-1">
                    Vue d'ensemble du système en temps réel
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Badge className="bg-green-500/10 text-green-600 border-green-500/20 gap-1.5">
                  <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                  Données en direct
                </Badge>
                <Button variant="outline" size="sm" onClick={signOut} className="gap-2">
                  <LogOut className="w-4 h-4" />
                  Déconnexion
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="max-w-7xl mx-auto px-6 py-8">
          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <Card className="hover:shadow-lg transition-shadow">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <Users className="w-4 h-4 text-blue-500" />
                  Utilisateurs
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-blue-600">{stats.users.total}</div>
                <div className="grid grid-cols-2 gap-2 mt-3 text-xs">
                  <div>
                    <span className="text-muted-foreground">Admins:</span>
                    <span className="ml-1 font-semibold">{stats.users.admins}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Vendeurs:</span>
                    <span className="ml-1 font-semibold">{stats.users.vendeurs}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Livreurs:</span>
                    <span className="ml-1 font-semibold">{stats.users.livreurs}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Clients:</span>
                    <span className="ml-1 font-semibold">{stats.users.clients}</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="hover:shadow-lg transition-shadow">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <DollarSign className="w-4 h-4 text-green-500" />
                  Transactions (30j)
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-green-600">{stats.transactions.total}</div>
                <div className="mt-3 space-y-1 text-xs">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Total:</span>
                    <span className="font-semibold">{(stats.transactions.totalAmount / 1000).toFixed(0)}k GNF</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Moyenne:</span>
                    <span className="font-semibold">{stats.transactions.avgAmount.toFixed(0)} GNF</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="hover:shadow-lg transition-shadow">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <Package className="w-4 h-4 text-purple-500" />
                  Commandes
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-purple-600">{stats.orders.total}</div>
                <div className="grid grid-cols-3 gap-2 mt-3 text-xs">
                  <div>
                    <span className="text-muted-foreground">Attente:</span>
                    <div className="font-semibold text-yellow-600">{stats.orders.pending}</div>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Complété:</span>
                    <div className="font-semibold text-green-600">{stats.orders.completed}</div>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Annulé:</span>
                    <div className="font-semibold text-red-600">{stats.orders.cancelled}</div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="hover:shadow-lg transition-shadow">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-orange-500" />
                  Système
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-orange-600">{stats.errors.total}</div>
                <div className="grid grid-cols-2 gap-2 mt-3 text-xs">
                  <div>
                    <span className="text-muted-foreground">Critiques:</span>
                    <span className="ml-1 font-semibold text-red-600">{stats.errors.critical}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Corrigées:</span>
                    <span className="ml-1 font-semibold text-green-600">{stats.errors.fixed}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Additional Info */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Activity className="w-5 h-5" />
                  Portefeuilles
                </CardTitle>
                <CardDescription>État des comptes utilisateurs</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex justify-between items-center p-3 bg-muted rounded-lg">
                    <span className="text-sm text-muted-foreground">Total portefeuilles</span>
                    <span className="font-bold text-lg">{stats.wallets.total}</span>
                  </div>
                  <div className="flex justify-between items-center p-3 bg-muted rounded-lg">
                    <span className="text-sm text-muted-foreground">Solde total</span>
                    <span className="font-bold text-lg">{(stats.wallets.totalBalance / 1000).toFixed(0)}k GNF</span>
                  </div>
                  <div className="flex justify-between items-center p-3 bg-muted rounded-lg">
                    <span className="text-sm text-muted-foreground">Moyenne par portefeuille</span>
                    <span className="font-bold text-lg">{stats.wallets.avgBalance.toFixed(0)} GNF</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="w-5 h-5" />
                  Performance
                </CardTitle>
                <CardDescription>Indicateurs clés de performance</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex justify-between items-center p-3 bg-muted rounded-lg">
                    <span className="text-sm text-muted-foreground">Taux de complétion</span>
                    <Badge variant="outline">
                      {stats.orders.total > 0 
                        ? ((stats.orders.completed / stats.orders.total) * 100).toFixed(1) 
                        : 0}%
                    </Badge>
                  </div>
                  <div className="flex justify-between items-center p-3 bg-muted rounded-lg">
                    <span className="text-sm text-muted-foreground">Erreurs critiques</span>
                    <Badge variant={stats.errors.critical > 0 ? 'destructive' : 'default'}>
                      {stats.errors.critical}
                    </Badge>
                  </div>
                  <div className="flex justify-between items-center p-3 bg-muted rounded-lg">
                    <span className="text-sm text-muted-foreground">Taux de correction</span>
                    <Badge variant="outline">
                      {stats.errors.total > 0 
                        ? ((stats.errors.fixed / stats.errors.total) * 100).toFixed(1) 
                        : 100}%
                    </Badge>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
