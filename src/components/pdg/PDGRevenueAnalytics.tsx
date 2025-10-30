import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { PdgRevenueService, type RevenueStats, type PdgRevenue, type PdgSetting } from '@/services/pdgRevenueService';
import { supabase } from '@/lib/supabaseClient';
import { TrendingUp, DollarSign, Wallet, ShoppingBag, RefreshCw, Settings, Download, Calendar } from 'lucide-react';
import { LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { format, subDays } from 'date-fns';
import { fr } from 'date-fns/locale';

export default function PDGRevenueAnalytics() {
  const [stats, setStats] = useState<RevenueStats | null>(null);
  const [revenues, setRevenues] = useState<PdgRevenue[]>([]);
  const [settings, setSettings] = useState<PdgSetting[]>([]);
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState<{ start: Date; end: Date }>({
    start: subDays(new Date(), 30),
    end: new Date(),
  });
  const { toast } = useToast();

  // Charger les données
  const loadData = async () => {
    setLoading(true);
    console.log('🔄 [PDGRevenueAnalytics] Chargement des données...');

    const [statsData, revenuesData, settingsData] = await Promise.all([
      PdgRevenueService.getRevenueStats(dateRange.start, dateRange.end),
      PdgRevenueService.getRevenueHistory(200),
      PdgRevenueService.getAllSettings(),
    ]);

    setStats(statsData);
    setRevenues(revenuesData);
    setSettings(settingsData);
    setLoading(false);

    console.log('✅ [PDGRevenueAnalytics] Données chargées:', {
      stats: statsData,
      revenues: revenuesData.length,
      settings: settingsData.length,
    });
  };

  useEffect(() => {
    loadData();

    // Écouter les changements en temps réel
    const revenueChannel = supabase
      .channel('pdg_revenue_changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'revenus_pdg' }, () => {
        console.log('🔔 [PDGRevenueAnalytics] Nouveau revenu détecté, rechargement...');
        loadData();
      })
      .subscribe();

    return () => {
      revenueChannel.unsubscribe();
    };
  }, [dateRange]);

  // Calculer les données pour les graphiques
  const pieData = [
    { name: 'Frais Wallet', value: Number(stats?.wallet_fees_revenue || 0), color: '#8B5CF6' },
    { name: 'Commissions Achats', value: Number(stats?.purchase_fees_revenue || 0), color: '#EC4899' },
  ];

  // Données temporelles (groupées par jour)
  const timelineData = revenues.reduce((acc: any[], rev) => {
    const date = format(new Date(rev.created_at), 'dd MMM', { locale: fr });
    const existing = acc.find(item => item.date === date);
    
    if (existing) {
      existing.wallet += rev.source_type === 'frais_transaction_wallet' ? Number(rev.amount) : 0;
      existing.purchase += rev.source_type === 'frais_achat_commande' ? Number(rev.amount) : 0;
      existing.total += Number(rev.amount);
    } else {
      acc.push({
        date,
        wallet: rev.source_type === 'frais_transaction_wallet' ? Number(rev.amount) : 0,
        purchase: rev.source_type === 'frais_achat_commande' ? Number(rev.amount) : 0,
        total: Number(rev.amount),
      });
    }
    
    return acc;
  }, []).slice(-30).reverse();

  // Calculer la croissance
  const calculateGrowth = () => {
    if (timelineData.length < 2) return 0;
    const lastWeek = timelineData.slice(-7).reduce((sum, d) => sum + d.total, 0);
    const previousWeek = timelineData.slice(-14, -7).reduce((sum, d) => sum + d.total, 0);
    if (previousWeek === 0) return 100;
    return ((lastWeek - previousWeek) / previousWeek) * 100;
  };

  // Mettre à jour un paramètre
  const handleUpdateSetting = async (key: string, newValue: number) => {
    const user = await supabase.auth.getUser();
    if (!user.data.user) return;

    const success = await PdgRevenueService.updateSetting(
      key,
      { value: newValue },
      user.data.user.id
    );

    if (success) {
      toast({ title: '✅ Paramètre mis à jour', description: 'Les nouveaux taux ont été enregistrés.' });
      loadData();
    } else {
      toast({ title: '❌ Erreur', description: 'Impossible de mettre à jour le paramètre.', variant: 'destructive' });
    }
  };

  // Exporter en CSV
  const exportToCSV = () => {
    const csvContent = [
      ['Date', 'Type', 'Montant', 'Pourcentage', 'Transaction ID'].join(','),
      ...revenues.map(rev => [
        format(new Date(rev.created_at), 'dd/MM/yyyy HH:mm'),
        rev.source_type,
        rev.amount,
        rev.percentage_applied,
        rev.transaction_id || 'N/A',
      ].join(',')),
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `revenus_pdg_${format(new Date(), 'yyyy-MM-dd')}.csv`;
    a.click();
  };

  if (loading) {
    return (
      <Card className="w-full">
        <CardContent className="p-12 text-center">
          <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-4 text-primary" />
          <p className="text-muted-foreground">Chargement des revenus...</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* En-tête avec actions */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">💼 Analyse des Revenus PDG</h2>
          <p className="text-muted-foreground mt-1">
            Suivi et différenciation des sources de revenus de la plateforme
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={loadData}>
            <RefreshCw className="mr-2 h-4 w-4" />
            Actualiser
          </Button>
          <Button variant="outline" onClick={exportToCSV}>
            <Download className="mr-2 h-4 w-4" />
            Exporter CSV
          </Button>
        </div>
      </div>

      {/* Cartes KPI */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Revenu Total</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {PdgRevenueService.formatAmount(Number(stats?.total_revenue || 0))}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {stats?.transaction_count || 0} transactions
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Frais Wallet</CardTitle>
            <Wallet className="h-4 w-4 text-purple-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {PdgRevenueService.formatAmount(Number(stats?.wallet_fees_revenue || 0))}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {stats?.wallet_transaction_count || 0} transactions
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Commissions Achats</CardTitle>
            <ShoppingBag className="h-4 w-4 text-pink-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {PdgRevenueService.formatAmount(Number(stats?.purchase_fees_revenue || 0))}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {stats?.purchase_transaction_count || 0} transactions
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Croissance</CardTitle>
            <TrendingUp className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {calculateGrowth().toFixed(1)}%
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              7 derniers jours
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Graphiques et données */}
      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Vue d'ensemble</TabsTrigger>
          <TabsTrigger value="details">Historique détaillé</TabsTrigger>
          <TabsTrigger value="settings">Configuration</TabsTrigger>
        </TabsList>

        {/* Vue d'ensemble */}
        <TabsContent value="overview" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            {/* Graphique en camembert */}
            <Card>
              <CardHeader>
                <CardTitle>Répartition des Revenus</CardTitle>
                <CardDescription>Distribution par source de revenu</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={pieData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, value }) => `${name}: ${PdgRevenueService.formatAmount(value)}`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {pieData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value: any) => PdgRevenueService.formatAmount(value)} />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Graphique temporel */}
            <Card>
              <CardHeader>
                <CardTitle>Évolution Temporelle</CardTitle>
                <CardDescription>Revenus sur les 30 derniers jours</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={timelineData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis />
                    <Tooltip formatter={(value: any) => PdgRevenueService.formatAmount(value)} />
                    <Legend />
                    <Line type="monotone" dataKey="wallet" stroke="#8B5CF6" name="Frais Wallet" />
                    <Line type="monotone" dataKey="purchase" stroke="#EC4899" name="Commissions" />
                    <Line type="monotone" dataKey="total" stroke="#10B981" name="Total" strokeWidth={2} />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>

          {/* Informations supplémentaires */}
          <Card>
            <CardHeader>
              <CardTitle>💡 Mécanismes de Commission</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="flex items-center justify-between p-3 bg-purple-50 dark:bg-purple-950 rounded-lg">
                <div>
                  <p className="font-medium">🔹 Frais Wallet</p>
                  <p className="text-sm text-muted-foreground">
                    Prélevés sur les transferts, retraits et recharges entre wallets
                  </p>
                </div>
                <span className="text-xl font-bold text-purple-600">
                  {settings.find(s => s.setting_key === 'wallet_transaction_fee_percentage')?.setting_value?.value || 1.5}%
                </span>
              </div>
              <div className="flex items-center justify-between p-3 bg-pink-50 dark:bg-pink-950 rounded-lg">
                <div>
                  <p className="font-medium">🔹 Commissions Achats</p>
                  <p className="text-sm text-muted-foreground">
                    Prélevées sur les paiements d'achats de produits ou services
                  </p>
                </div>
                <span className="text-xl font-bold text-pink-600">
                  {settings.find(s => s.setting_key === 'purchase_commission_percentage')?.setting_value?.value || 10}%
                </span>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Historique détaillé */}
        <TabsContent value="details">
          <Card>
            <CardHeader>
              <CardTitle>Historique des Transactions Génératrices</CardTitle>
              <CardDescription>Liste complète des revenus enregistrés</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {revenues.slice(0, 50).map((rev) => (
                  <div
                    key={rev.id}
                    className="flex items-center justify-between p-3 border rounded-lg hover:bg-accent/50 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      {rev.source_type === 'frais_transaction_wallet' ? (
                        <Wallet className="h-5 w-5 text-purple-500" />
                      ) : (
                        <ShoppingBag className="h-5 w-5 text-pink-500" />
                      )}
                      <div>
                        <p className="font-medium">
                          {rev.source_type === 'frais_transaction_wallet'
                            ? 'Frais Transaction Wallet'
                            : 'Commission Achat'}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {format(new Date(rev.created_at), 'dd MMM yyyy à HH:mm', { locale: fr })}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-green-600">
                        {PdgRevenueService.formatAmount(Number(rev.amount))}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Taux: {rev.percentage_applied}%
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Configuration */}
        <TabsContent value="settings">
          <Card>
            <CardHeader>
              <CardTitle>⚙️ Configuration des Taux</CardTitle>
              <CardDescription>
                Modifier les pourcentages de commission appliqués sur la plateforme
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {settings.map((setting) => (
                <div key={setting.id} className="space-y-2">
                  <Label>{setting.description}</Label>
                  <div className="flex gap-2">
                    <Input
                      type="number"
                      step="0.1"
                      defaultValue={setting.setting_value?.value || 0}
                      id={`setting-${setting.setting_key}`}
                      className="max-w-xs"
                    />
                    <Button
                      onClick={() => {
                        const input = document.getElementById(`setting-${setting.setting_key}`) as HTMLInputElement;
                        handleUpdateSetting(setting.setting_key, parseFloat(input.value));
                      }}
                    >
                      Enregistrer
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Dernière mise à jour: {format(new Date(setting.updated_at), 'dd MMM yyyy à HH:mm', { locale: fr })}
                  </p>
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
