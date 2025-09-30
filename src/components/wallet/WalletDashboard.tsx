/**
 * Tableau de bord Wallet - Interface PDG
 * 
 * Fonctionnalités:
 * - Vue d'ensemble des revenus et transactions
 * - Statistiques en temps réel
 * - Gestion des commissions
 * - Détection anti-fraude
 * - Alertes et notifications
 * 
 * @author 224SOLUTIONS
 * @version 1.0.0
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  Card, CardContent, CardHeader, CardTitle, CardDescription
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Wallet, DollarSign, TrendingUp, AlertTriangle, Shield,
  Users, Activity, RefreshCw, Download
} from "lucide-react";
import { toast } from "sonner";
import WalletTransactionService from '@/services/walletTransactionService';
import WalletOverview from './WalletOverview';
import WalletTransactions from './WalletTransactions';
import WalletCommissions from './WalletCommissions';
import WalletFraud from './WalletFraud';
import WalletReports from './WalletReports';

// ===================================================
// TYPES ET INTERFACES
// ===================================================

interface WalletStats {
  total_users: number;
  total_wallets: number;
  total_volume: number;
  total_commissions: number;
  active_transactions: number;
}

interface RevenueAlert {
  id: string;
  type: string;
  severity: 'info' | 'warning' | 'error' | 'critical';
  title: string;
  message: string;
  created_at: string;
  is_read: boolean;
}

// ===================================================
// COMPOSANT PRINCIPAL
// ===================================================

const WalletDashboard: React.FC = () => {
  // États
  const [stats, setStats] = useState<WalletStats>({
    total_users: 0,
    total_wallets: 0,
    total_volume: 0,
    total_commissions: 0,
    active_transactions: 0
  });
  const [alerts, setAlerts] = useState<RevenueAlert[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // ===================================================
  // CHARGEMENT DES DONNÉES
  // ===================================================

  const loadData = useCallback(async () => {
    try {
      setLoading(true);

      // Charger les statistiques globales
      const globalStats = await WalletTransactionService.getGlobalStats();
      setStats(globalStats);

      // Simuler des alertes (à remplacer par une vraie API)
      setAlerts([
        {
          id: '1',
          type: 'high_volume',
          severity: 'warning',
          title: 'Volume élevé détecté',
          message: 'Le volume de transactions a augmenté de 45% depuis hier',
          created_at: new Date().toISOString(),
          is_read: false
        },
        {
          id: '2',
          type: 'fraud_spike',
          severity: 'error',
          title: 'Pic de fraude',
          message: '16 tentatives de fraude bloquées dans la dernière heure',
          created_at: new Date(Date.now() - 3600000).toISOString(),
          is_read: false
        }
      ]);

    } catch (error) {
      console.error('Erreur chargement données:', error);
      toast.error('Erreur lors du chargement des données');
    } finally {
      setLoading(false);
    }
  }, []);

  const refreshData = useCallback(async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
    toast.success('Données actualisées');
  }, [loadData]);

  useEffect(() => {
    loadData();

    // Actualiser toutes les 30 secondes
    const interval = setInterval(() => {
      loadData();
    }, 30000);

    return () => clearInterval(interval);
  }, [loadData]);

  // ===================================================
  // UTILITAIRES
  // ===================================================

  const formatCurrency = (amount: number) => WalletTransactionService.formatAmount(amount);

  // ===================================================
  // RENDU DES COMPOSANTS
  // ===================================================

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="flex items-center space-x-2">
          <RefreshCw className="animate-spin h-6 w-6" />
          <span>Chargement du tableau de bord wallet...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-7xl mx-auto space-y-6">

        {/* En-tête */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Tableau de bord Wallet</h1>
            <p className="text-muted-foreground">Gestion des transactions et revenus 224SOLUTIONS</p>
          </div>
          <div className="flex items-center space-x-2">
            <Button
              variant="outline"
              size="sm"
              onClick={refreshData}
              disabled={refreshing}
            >
              <RefreshCw className={`w-4 h-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
              Actualiser
            </Button>
            <Button variant="outline" size="sm">
              <Download className="w-4 h-4 mr-2" />
              Exporter
            </Button>
          </div>
        </div>

        {/* Alertes */}
        {alerts.filter(a => !a.is_read).length > 0 && (
          <div className="space-y-2">
            {alerts.filter(a => !a.is_read).map(alert => (
              <Alert key={alert.id} className={
                alert.severity === 'critical' ? 'border-red-500 bg-red-50' :
                  alert.severity === 'error' ? 'border-orange-500 bg-orange-50' :
                    alert.severity === 'warning' ? 'border-yellow-500 bg-yellow-50' :
                      'border-blue-500 bg-blue-50'
              }>
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  <strong>{alert.title}</strong> - {alert.message}
                </AlertDescription>
              </Alert>
            ))}
          </div>
        )}

        {/* KPIs Principaux */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Utilisateurs Actifs</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.total_users.toLocaleString()}</div>
              <p className="text-xs text-green-600">+12% depuis hier</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Volume Total</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatCurrency(stats.total_volume)}</div>
              <p className="text-xs text-green-600">+8.2% cette semaine</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Commissions</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatCurrency(stats.total_commissions)}</div>
              <p className="text-xs text-green-600">+15.3% ce mois</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Transactions</CardTitle>
              <Activity className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.active_transactions.toLocaleString()}</div>
              <p className="text-xs text-green-600">+5.4% aujourd'hui</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Sécurité</CardTitle>
              <Shield className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">98.7%</div>
              <p className="text-xs text-muted-foreground">Taux de protection</p>
            </CardContent>
          </Card>
        </div>

        {/* Contenu Principal */}
        <Tabs defaultValue="overview" className="space-y-6">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="overview">Vue d'ensemble</TabsTrigger>
            <TabsTrigger value="transactions">Transactions</TabsTrigger>
            <TabsTrigger value="commissions">Commissions</TabsTrigger>
            <TabsTrigger value="fraud">Anti-fraude</TabsTrigger>
            <TabsTrigger value="reports">Rapports</TabsTrigger>
          </TabsList>

          <TabsContent value="overview">
            <WalletOverview stats={stats} />
          </TabsContent>

          <TabsContent value="transactions">
            <WalletTransactions />
          </TabsContent>

          <TabsContent value="commissions">
            <WalletCommissions />
          </TabsContent>

          <TabsContent value="fraud">
            <WalletFraud />
          </TabsContent>

          <TabsContent value="reports">
            <WalletReports />
          </TabsContent>

        </Tabs>
      </div>
    </div>
  );
};

export default WalletDashboard;