import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { 
  Wallet, 
  TrendingUp, 
  ShoppingCart, 
  Users, 
  Truck, 
  ArrowDownToLine,
  RefreshCw,
  DollarSign,
  CreditCard
} from "lucide-react";

interface RevenueStats {
  revenue_type: string;
  total_amount: number;
  transaction_count: number;
}

interface PDGWalletInfo {
  balance: number;
  currency: string;
}

export default function PlatformRevenueOverview() {
  const [revenueStats, setRevenueStats] = useState<RevenueStats[]>([]);
  const [pdgWallet, setPdgWallet] = useState<PDGWalletInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchRevenueData = async () => {
    try {
      setLoading(true);

      // Récupérer les statistiques des revenus
      const { data: stats, error: statsError } = await supabase
        .rpc('get_platform_revenue_stats');

      if (statsError) throw statsError;

      setRevenueStats(stats || []);

      // Récupérer le wallet PDG
      const { data: settingsData, error: settingsError } = await supabase
        .from('system_settings')
        .select('setting_value')
        .eq('setting_key', 'pdg_wallet_id')
        .single();

      if (settingsError) throw settingsError;

      const pdgWalletId = settingsData.setting_value;

      // Récupérer les infos du wallet PDG
      const { data: walletData, error: walletError } = await supabase
        .from('wallets')
        .select('balance, currency')
        .eq('id', pdgWalletId)
        .single();

      if (walletError) {
        console.warn('Wallet PDG non trouvé, création nécessaire');
        setPdgWallet({ balance: 0, currency: 'GNF' });
      } else {
        setPdgWallet(walletData);
      }
    } catch (error: any) {
      console.error('Erreur chargement revenus:', error);
      toast.error('Erreur lors du chargement des revenus');
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchRevenueData();
    setRefreshing(false);
    toast.success('Données actualisées');
  };

  useEffect(() => {
    fetchRevenueData();
  }, []);

  const getRevenueIcon = (type: string) => {
    switch (type) {
      case 'transfer_fee':
        return <CreditCard className="w-5 h-5" />;
      case 'order_commission':
        return <ShoppingCart className="w-5 h-5" />;
      case 'vendor_subscription':
        return <Users className="w-5 h-5" />;
      case 'driver_subscription':
        return <Truck className="w-5 h-5" />;
      case 'withdrawal_fee':
        return <ArrowDownToLine className="w-5 h-5" />;
      default:
        return <DollarSign className="w-5 h-5" />;
    }
  };

  const getRevenueName = (type: string) => {
    switch (type) {
      case 'transfer_fee':
        return 'Frais de Transfert Wallet';
      case 'order_commission':
        return 'Commission Achats Clients';
      case 'vendor_subscription':
        return 'Abonnements Vendeurs';
      case 'driver_subscription':
        return 'Abonnements Livreurs/Taxi';
      case 'withdrawal_fee':
        return 'Frais de Retrait';
      default:
        return type;
    }
  };

  const getRevenueColor = (type: string) => {
    switch (type) {
      case 'transfer_fee':
        return 'from-blue-500/20 to-blue-600/20 border-blue-500/30';
      case 'order_commission':
        return 'from-green-500/20 to-green-600/20 border-green-500/30';
      case 'vendor_subscription':
        return 'from-purple-500/20 to-purple-600/20 border-purple-500/30';
      case 'driver_subscription':
        return 'from-orange-500/20 to-orange-600/20 border-orange-500/30';
      case 'withdrawal_fee':
        return 'from-red-500/20 to-red-600/20 border-red-500/30';
      default:
        return 'from-gray-500/20 to-gray-600/20 border-gray-500/30';
    }
  };

  const formatAmount = (amount: number) => {
    return new Intl.NumberFormat('fr-FR').format(amount) + ' GNF';
  };

  const totalRevenue = revenueStats.reduce((sum, stat) => sum + Number(stat.total_amount), 0);
  const totalTransactions = revenueStats.reduce((sum, stat) => sum + Number(stat.transaction_count), 0);

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Wallet PDG - Carte principale */}
      <Card className="relative overflow-hidden border-border/40 bg-gradient-to-br from-primary/10 via-background to-background">
        <div className="absolute inset-0 bg-grid-white/[0.02] bg-[size:30px_30px]" />
        <CardHeader className="relative">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                <Wallet className="w-6 h-6 text-primary" />
              </div>
              <div>
                <CardTitle className="text-2xl">Wallet PDG</CardTitle>
                <CardDescription>Revenus totaux de la plateforme</CardDescription>
              </div>
            </div>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={handleRefresh}
              disabled={refreshing}
              className="gap-2"
            >
              <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
              Actualiser
            </Button>
          </div>
        </CardHeader>
        <CardContent className="relative space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-6 rounded-xl bg-gradient-to-br from-green-500/10 to-green-600/10 border border-green-500/20">
              <p className="text-sm text-muted-foreground mb-2">Solde Wallet PDG</p>
              <p className="text-3xl font-bold text-green-600">
                {formatAmount(pdgWallet?.balance || 0)}
              </p>
              <Badge variant="outline" className="mt-2 border-green-500/30 text-green-600">
                {pdgWallet?.currency || 'GNF'}
              </Badge>
            </div>

            <div className="p-6 rounded-xl bg-gradient-to-br from-blue-500/10 to-blue-600/10 border border-blue-500/20">
              <p className="text-sm text-muted-foreground mb-2">Revenus Totaux</p>
              <p className="text-3xl font-bold text-blue-600">
                {formatAmount(totalRevenue)}
              </p>
              <p className="text-xs text-muted-foreground mt-2">
                Depuis le début
              </p>
            </div>

            <div className="p-6 rounded-xl bg-gradient-to-br from-purple-500/10 to-purple-600/10 border border-purple-500/20">
              <p className="text-sm text-muted-foreground mb-2">Transactions</p>
              <p className="text-3xl font-bold text-purple-600">
                {totalTransactions}
              </p>
              <p className="text-xs text-muted-foreground mt-2">
                Total enregistrées
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Détails des revenus par type */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-primary" />
            Revenus par Type
          </CardTitle>
          <CardDescription>
            Répartition détaillée des sources de revenus
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {revenueStats.length === 0 ? (
              <div className="col-span-full text-center py-8 text-muted-foreground">
                Aucun revenu enregistré
              </div>
            ) : (
              revenueStats.map((stat) => (
                <div
                  key={stat.revenue_type}
                  className={`p-6 rounded-xl bg-gradient-to-br border transition-all duration-300 hover:shadow-lg hover:scale-105 ${getRevenueColor(stat.revenue_type)}`}
                >
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-10 h-10 rounded-lg bg-background/50 flex items-center justify-center">
                      {getRevenueIcon(stat.revenue_type)}
                    </div>
                    <div className="flex-1">
                      <h3 className="font-semibold text-sm">
                        {getRevenueName(stat.revenue_type)}
                      </h3>
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">Montant Total</p>
                      <p className="text-2xl font-bold">
                        {formatAmount(Number(stat.total_amount))}
                      </p>
                    </div>
                    
                    <div className="flex items-center justify-between pt-2 border-t border-border/30">
                      <p className="text-xs text-muted-foreground">Transactions</p>
                      <Badge variant="secondary" className="text-xs">
                        {stat.transaction_count}
                      </Badge>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>

      {/* Information */}
      <Card className="border-blue-500/30 bg-blue-500/5">
        <CardContent className="p-6">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-lg bg-blue-500/10 flex items-center justify-center flex-shrink-0">
              <DollarSign className="w-5 h-5 text-blue-500" />
            </div>
            <div className="space-y-2">
              <h4 className="font-semibold text-blue-900 dark:text-blue-100">
                💡 Fonctionnement des Revenus
              </h4>
              <ul className="text-sm space-y-1 text-blue-800 dark:text-blue-200 list-disc list-inside">
                <li>Les frais sont automatiquement collectés lors des transactions</li>
                <li>Le wallet PDG est crédité en temps réel</li>
                <li>Les statistiques sont mises à jour instantanément</li>
                <li>Toutes les transactions sont enregistrées et auditables</li>
                <li>Les revenus sont calculés par type pour un suivi précis</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}