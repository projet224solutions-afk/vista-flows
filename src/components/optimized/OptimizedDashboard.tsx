/**
 * DASHBOARD OPTIMISÉ AVEC LAZY LOADING
 * Chargement intelligent des composants lourds
 * 224Solutions - Optimized Dashboard System
 */

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  BarChart3, 
  Users, 
  DollarSign, 
  TrendingUp,
  Activity,
  Loader2
} from 'lucide-react';
import { usePerformanceOptimization } from '@/hooks/usePerformanceOptimization';
import { LazyComponent } from './LazyComponent';

// Composants lazy pour les sections lourdes
const LazyFinanceChart = LazyComponent(() => 
  import('../charts/FinanceChart').then(m => ({ default: m.FinanceChart }))
);

const LazyUserManagement = LazyComponent(() => 
  import('../admin/UserManagement').then(m => ({ default: m.UserManagement }))
);

const LazyTransactionHistory = LazyComponent(() => 
  import('../finance/TransactionHistory').then(m => ({ default: m.TransactionHistory }))
);

const LazyAnalytics = LazyComponent(() => 
  import('../analytics/AnalyticsDashboard').then(m => ({ default: m.AnalyticsDashboard }))
);

interface DashboardStats {
  totalUsers: number;
  totalRevenue: number;
  totalTransactions: number;
  activeUsers: number;
  monthlyGrowth: number;
}

interface OptimizedDashboardProps {
  initialTab?: string;
  enableLazyLoading?: boolean;
  enableVirtualization?: boolean;
}

export function OptimizedDashboard({
  initialTab = 'overview',
  enableLazyLoading = true,
  enableVirtualization = true
}: OptimizedDashboardProps) {
  const [activeTab, setActiveTab] = useState(initialTab);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);

  // Hook d'optimisation des performances
  const {
    data: optimizedStats,
    loading: statsLoading,
    metrics,
    fetch: fetchStats
  } = usePerformanceOptimization(
    'dashboard-stats',
    async () => {
      // Simulation d'une requête lourde
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      return {
        totalUsers: 15847,
        totalRevenue: 125600000,
        totalTransactions: 8934,
        activeUsers: 1234,
        monthlyGrowth: 18.5
      } as DashboardStats;
    },
    {
      enableLazyLoading,
      enableVirtualization,
      cacheTimeout: 5 * 60 * 1000, // 5 minutes
      maxCacheSize: 50
    }
  );

  // Chargement initial
  useEffect(() => {
    const loadDashboard = async () => {
      setLoading(true);
      try {
        await fetchStats();
      } catch (error) {
        console.error('❌ Erreur chargement dashboard:', error);
      } finally {
        setLoading(false);
      }
    };

    loadDashboard();
  }, [fetchStats]);

  // Mise à jour des stats
  useEffect(() => {
    if (optimizedStats) {
      setStats(optimizedStats);
    }
  }, [optimizedStats]);

  // Composants de fallback optimisés
  const StatsCardSkeleton = () => (
    <Card>
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <div className="space-y-2">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-8 w-16" />
          </div>
          <Skeleton className="h-8 w-8 rounded" />
        </div>
      </CardContent>
    </Card>
  );

  const ChartSkeleton = () => (
    <Card>
      <CardHeader>
        <Skeleton className="h-6 w-32" />
      </CardHeader>
      <CardContent>
        <Skeleton className="h-64 w-full" />
      </CardContent>
    </Card>
  );

  // Rendu des cartes de statistiques
  const renderStatsCards = () => {
    if (loading || statsLoading) {
      return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {Array.from({ length: 4 }).map((_, i) => (
            <StatsCardSkeleton key={i} />
          ))}
        </div>
      );
    }

    if (!stats) return null;

    const statsData = [
      {
        title: 'Utilisateurs Totaux',
        value: stats.totalUsers.toLocaleString(),
        icon: Users,
        color: 'text-blue-600',
        bgColor: 'bg-blue-100'
      },
      {
        title: 'Revenus Totaux',
        value: `${(stats.totalRevenue / 1000000).toFixed(1)}M FCFA`,
        icon: DollarSign,
        color: 'text-green-600',
        bgColor: 'bg-green-100'
      },
      {
        title: 'Transactions',
        value: stats.totalTransactions.toLocaleString(),
        icon: BarChart3,
        color: 'text-purple-600',
        bgColor: 'bg-purple-100'
      },
      {
        title: 'Croissance Mensuelle',
        value: `${stats.monthlyGrowth}%`,
        icon: TrendingUp,
        color: 'text-orange-600',
        bgColor: 'bg-orange-100'
      }
    ];

    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {statsData.map((stat, index) => (
          <Card key={index} className="hover:shadow-lg transition-shadow">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">{stat.title}</p>
                  <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
                </div>
                <div className={`p-3 rounded-full ${stat.bgColor}`}>
                  <stat.icon className={`h-6 w-6 ${stat.color}`} />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  };

  // Rendu du contenu des onglets
  const renderTabContent = () => {
    switch (activeTab) {
      case 'overview':
        return (
          <div className="space-y-6">
            {renderStatsCards()}
            
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Activity className="h-5 w-5" />
                    Activité Récente
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <div key={i} className="flex items-center space-x-4">
                        <div className="w-2 h-2 bg-blue-600 rounded-full"></div>
                        <div className="flex-1">
                          <Skeleton className="h-4 w-3/4 mb-1" />
                          <Skeleton className="h-3 w-1/2" />
                        </div>
                        <Skeleton className="h-4 w-16" />
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader>
                  <CardTitle>Métriques de Performance</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">Temps de chargement</span>
                      <span className="text-sm font-medium">{metrics.loadTime.toFixed(0)}ms</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">Taux de cache</span>
                      <span className="text-sm font-medium">{metrics.cacheHitRate}%</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">Mémoire utilisée</span>
                      <span className="text-sm font-medium">{metrics.memoryUsage.toFixed(1)}%</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        );

      case 'finance':
        return enableLazyLoading ? (
          <LazyFinanceChart fallback={<ChartSkeleton />} />
        ) : (
          <ChartSkeleton />
        );

      case 'users':
        return enableLazyLoading ? (
          <LazyUserManagement fallback={<div>Chargement de la gestion des utilisateurs...</div>} />
        ) : (
          <div>Gestion des utilisateurs</div>
        );

      case 'transactions':
        return enableLazyLoading ? (
          <LazyTransactionHistory fallback={<div>Chargement de l'historique...</div>} />
        ) : (
          <div>Historique des transactions</div>
        );

      case 'analytics':
        return enableLazyLoading ? (
          <LazyAnalytics fallback={<ChartSkeleton />} />
        ) : (
          <ChartSkeleton />
        );

      default:
        return <div>Onglet non trouvé</div>;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Dashboard Optimisé
          </h1>
          <p className="text-gray-600">
            Interface optimisée avec lazy loading et virtualisation
          </p>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="overview">Vue d'ensemble</TabsTrigger>
            <TabsTrigger value="finance">Finance</TabsTrigger>
            <TabsTrigger value="users">Utilisateurs</TabsTrigger>
            <TabsTrigger value="transactions">Transactions</TabsTrigger>
            <TabsTrigger value="analytics">Analytics</TabsTrigger>
          </TabsList>

          <TabsContent value={activeTab} className="space-y-6">
            {renderTabContent()}
          </TabsContent>
        </Tabs>

        {/* Indicateur de performance */}
        <div className="fixed bottom-4 right-4 bg-white rounded-lg shadow-lg p-4 border">
          <div className="text-xs text-gray-600 space-y-1">
            <div>⚡ {metrics.loadTime.toFixed(0)}ms</div>
            <div>💾 {metrics.cacheHitRate}% cache</div>
            <div>🧠 {metrics.memoryUsage.toFixed(1)}% RAM</div>
          </div>
        </div>
      </div>
    </div>
  );
}
