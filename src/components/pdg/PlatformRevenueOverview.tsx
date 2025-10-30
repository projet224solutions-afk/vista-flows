import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { CommissionService } from '@/services/commissionService';
import { 
  Wallet, 
  TrendingUp, 
  ShoppingCart, 
  Users, 
  Truck, 
  Package,
  RefreshCw,
  DollarSign,
  Car
} from "lucide-react";

interface ServiceRevenue {
  service_name: string;
  total_revenue: number;
  total_commission: number;
  transaction_count: number;
}

export default function PlatformRevenueOverview() {
  const [revenues, setRevenues] = useState<{
    services: ServiceRevenue[];
    total_revenue: number;
    total_commission: number;
    total_transactions: number;
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchRevenueData = async () => {
    try {
      setLoading(true);
      const data = await CommissionService.getAllServicesRevenue();
      setRevenues(data);
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

  const getServiceIcon = (serviceName: string) => {
    switch (serviceName) {
      case 'wallet_transfer':
        return <Wallet className="w-5 h-5" />;
      case 'subscription':
        return <Users className="w-5 h-5" />;
      case 'marketplace':
        return <Package className="w-5 h-5" />;
      case 'taxi':
        return <Car className="w-5 h-5" />;
      case 'delivery':
      case 'livreur':
        return <Truck className="w-5 h-5" />;
      default:
        return <DollarSign className="w-5 h-5" />;
    }
  };

  const getServiceLabel = (serviceName: string) => {
    switch (serviceName) {
      case 'wallet_transfer':
        return 'Transferts Wallet';
      case 'subscription':
        return 'Abonnements';
      case 'marketplace':
        return 'E-Commerce';
      case 'taxi':
        return 'Taxi-Moto';
      case 'delivery':
        return 'Livraison';
      case 'livreur':
        return 'Livreur';
      default:
        return serviceName;
    }
  };

  const getServiceColor = (serviceName: string) => {
    switch (serviceName) {
      case 'wallet_transfer':
        return 'from-cyan-500/20 to-cyan-600/20 border-cyan-500/30';
      case 'subscription':
        return 'from-pink-500/20 to-pink-600/20 border-pink-500/30';
      case 'marketplace':
        return 'from-green-500/20 to-green-600/20 border-green-500/30';
      case 'taxi':
        return 'from-blue-500/20 to-blue-600/20 border-blue-500/30';
      case 'delivery':
        return 'from-orange-500/20 to-orange-600/20 border-orange-500/30';
      case 'livreur':
        return 'from-purple-500/20 to-purple-600/20 border-purple-500/30';
      default:
        return 'from-gray-500/20 to-gray-600/20 border-gray-500/30';
    }
  };

  const formatAmount = (amount: number) => {
    return new Intl.NumberFormat('fr-FR').format(amount) + ' GNF';
  };

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
      {/* Résumé Global */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="relative overflow-hidden border-border/40 bg-card/50 backdrop-blur-sm hover:shadow-xl transition-all duration-300 group">
          <div className="absolute inset-0 bg-gradient-to-br from-green-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-green-500/10 flex items-center justify-center">
                <DollarSign className="w-4 h-4 text-green-500" />
              </div>
              Revenus Totaux Plateforme
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <p className="text-3xl font-bold bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-transparent">
                {formatAmount(revenues?.total_revenue || 0)}
              </p>
              <p className="text-xs text-green-500 flex items-center gap-1">
                <TrendingUp className="w-3 h-3" />
                Tous services confondus
              </p>
            </div>
          </CardContent>
        </Card>

        <Card className="relative overflow-hidden border-border/40 bg-card/50 backdrop-blur-sm hover:shadow-xl transition-all duration-300 group">
          <div className="absolute inset-0 bg-gradient-to-br from-blue-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-blue-500/10 flex items-center justify-center">
                <TrendingUp className="w-4 h-4 text-blue-500" />
              </div>
              Commissions Totales
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <p className="text-3xl font-bold bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-transparent">
                {formatAmount(revenues?.total_commission || 0)}
              </p>
              <p className="text-xs text-muted-foreground">
                {revenues?.total_transactions || 0} transactions
              </p>
            </div>
          </CardContent>
        </Card>

        <Card className="relative overflow-hidden border-border/40 bg-card/50 backdrop-blur-sm hover:shadow-xl transition-all duration-300 group">
          <div className="absolute inset-0 bg-gradient-to-br from-purple-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-purple-500/10 flex items-center justify-center">
                <TrendingUp className="w-4 h-4 text-purple-500" />
              </div>
              Taux de Commission Moyen
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <p className="text-3xl font-bold bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-transparent">
                {revenues?.total_revenue && revenues?.total_commission
                  ? ((revenues.total_commission / revenues.total_revenue) * 100).toFixed(2)
                  : 0}%
              </p>
              <p className="text-xs text-muted-foreground">
                Calculé sur tous les services
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Détail par Service */}
      <Card className="border-border/40 bg-card/50 backdrop-blur-sm">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-primary" />
                Revenus par Service
              </CardTitle>
              <CardDescription>Détail des revenus et commissions par type de service</CardDescription>
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
        <CardContent>
          <div className="space-y-4">
            {!revenues?.services || revenues.services.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                Aucune transaction enregistrée pour le moment
              </div>
            ) : (
              revenues.services
                .filter(service => service.transaction_count > 0) // Afficher seulement les services avec transactions
                .map((service, index) => (
                <div
                  key={service.service_name}
                  className={`p-6 rounded-xl bg-gradient-to-br border transition-all duration-300 hover:shadow-lg animate-fade-in ${getServiceColor(service.service_name)}`}
                  style={{ animationDelay: `${index * 50}ms` }}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-xl bg-background/50 flex items-center justify-center">
                        {getServiceIcon(service.service_name)}
                      </div>
                      <div>
                        <h4 className="font-semibold text-lg">{getServiceLabel(service.service_name)}</h4>
                        <p className="text-sm text-muted-foreground">
                          {service.transaction_count} transaction{service.transaction_count > 1 ? 's' : ''}
                        </p>
                      </div>
                    </div>
                    <div className="text-right space-y-1">
                      <p className="text-2xl font-bold">
                        {formatAmount(service.total_revenue)}
                      </p>
                      {service.total_commission > 0 && (
                        <Badge variant="outline" className="bg-blue-500/10 text-blue-500 border-blue-500/20">
                          +{formatAmount(service.total_commission)} commission
                        </Badge>
                      )}
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
                💡 Fonctionnement des Commissions
              </h4>
              <ul className="text-sm space-y-1 text-blue-800 dark:text-blue-200 list-disc list-inside">
                <li>Les commissions sont calculées selon les configurations actives</li>
                <li>Chaque service (E-Commerce, Taxi, Livraison) a sa propre configuration</li>
                <li>Les frais sont automatiquement appliqués lors des transactions</li>
                <li>Les revenus sont trackés en temps réel par service</li>
                <li>Les configurations peuvent être modifiées dans l'onglet "Configuration"</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}