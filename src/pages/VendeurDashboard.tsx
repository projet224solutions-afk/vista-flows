import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import {
  Package, TrendingUp, ShoppingCart, Star, Eye, Plus, Users,
  BarChart3, CreditCard, Truck, MessageSquare, Megaphone,
  FileText, Settings, AlertTriangle, DollarSign, Target,
  Calendar, Phone, Mail, Filter, Search, Download, Upload,
  Bell, Menu, MoreHorizontal, Activity, PieChart, LineChart,
  Warehouse, UserCheck, ArrowRightLeft, Send, RefreshCw, LogOut,
  Receipt, Bot
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useRoleRedirect } from "@/hooks/useRoleRedirect";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { useVendorStats } from "@/hooks/useVendorData";
import { useVendorOptimized } from "@/hooks/useVendorOptimized";
import ProspectManagement from "@/components/vendor/ProspectManagement";
import PaymentManagement from "@/components/vendor/PaymentManagement";
import InventoryManagement from "@/components/vendor/InventoryManagement";
import MarketingManagement from "@/components/vendor/MarketingManagement";
import SupportTickets from "@/components/vendor/SupportTickets";
import ProductManagement from "@/components/vendor/ProductManagement";
import OrderManagement from "@/components/vendor/OrderManagement";
import ClientManagement from "@/components/vendor/ClientManagement";
import VendorAnalytics from "@/components/vendor/VendorAnalytics";
import PaymentProcessor from "@/components/vendor/PaymentProcessor";
import POSSystemWrapper from "@/components/vendor/POSSystemWrapper";
import VendorDiagnostic from "@/components/vendor/VendorDiagnostic";
import AgentManagement from "@/components/vendor/AgentManagement";
import WarehouseManagement from "@/components/vendor/WarehouseManagement";
import ExpenseManagementDashboard from "@/components/vendor/ExpenseManagementDashboard";
import SimpleCommunicationInterface from "@/components/communication/SimpleCommunicationInterface";
import CopiloteChat from "@/components/copilot/CopiloteChat";
import WalletDashboard from "@/components/vendor/WalletDashboard";
import { useUserInfo } from "@/hooks/useUserInfo";
import { useWallet } from "@/hooks/useWallet";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";

export default function VendeurDashboard() {
  const { user, profile, signOut } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  useRoleRedirect(); // S'assurer que seuls les vendeurs/admins accèdent à cette page
  const { stats, loading: statsLoading, error: statsError } = useVendorStats();
  const { userInfo, loading: userInfoLoading } = useUserInfo();

  // Hook optimisé pour les données vendeur
  const {
    stats: optimizedStats,
    profile: vendorProfile,
    loading: optimizedLoading,
    error: optimizedError,
    runDiagnostic,
    autoFix
  } = useVendorOptimized();

  // Hooks wallet intégrés
  const { wallet, loading: walletLoading, transactions } = useWallet();

  const handleSignOut = async () => {
    try {
      await signOut();
      toast({
        title: "Déconnexion réussie",
        description: "Vous avez été déconnecté avec succès",
      });
      navigate('/');
    } catch (error) {
      console.error('Erreur lors de la déconnexion:', error);
      toast({
        title: "Erreur de déconnexion",
        description: "Une erreur est survenue lors de la déconnexion",
        variant: "destructive"
      });
    }
  };

  // Données du tableau de bord - utilise les données optimisées si disponibles
  const mainStats = [
    {
      label: "Chiffre d'affaires",
      value: optimizedStats ? `${optimizedStats.revenue.toLocaleString()} FCFA` : stats ? `${stats.revenue.toLocaleString()} FCFA` : "2.4M FCFA",
      change: "+12%",
      icon: DollarSign,
      color: "text-green-600"
    },
    {
      label: "Commandes ce mois",
      value: optimizedStats ? optimizedStats.orders_count.toString() : stats ? stats.orders_count.toString() : "156",
      change: "+8%",
      icon: ShoppingCart,
      color: "text-blue-600"
    },
    {
      label: "Clients actifs",
      value: optimizedStats ? optimizedStats.customers_count.toString() : stats ? stats.customers_count.toString() : "89",
      change: "+15%",
      icon: Users,
      color: "text-purple-600"
    },
    {
      label: "Taux conversion",
      value: "3.2%",
      change: "+0.5%",
      icon: Target,
      color: "text-orange-600"
    }
  ];

  const urgentAlerts = [];
  if (stats) {
    if (stats.low_stock_count > 0) {
      urgentAlerts.push({
        type: "stock",
        message: `${stats.low_stock_count} produits en rupture de stock`,
        priority: "high" as const
      });
    }
    if (stats.overdue_payments > 0) {
      urgentAlerts.push({
        type: "payment",
        message: `${stats.overdue_payments} paiements en retard`,
        priority: "medium" as const
      });
    }
    if (stats.orders_pending > 0) {
      urgentAlerts.push({
        type: "order",
        message: `${stats.orders_pending} commandes à préparer`,
        priority: "high" as const
      });
    }
  }

  const recentOrders = [
    {
      id: 'CMD-2024-156',
      customer: 'Marie Diallo',
      product: 'Casque Bluetooth',
      amount: '45,000 FCFA',
      status: 'À préparer',
      date: '15 Jan 2024',
      priority: 'urgent'
    },
    {
      id: 'CMD-2024-155',
      customer: 'Amadou Ba',
      product: 'Montre connectée',
      amount: '85,000 FCFA',
      status: 'Expédiée',
      date: '14 Jan 2024',
      priority: 'normal'
    },
    {
      id: 'CMD-2024-154',
      customer: 'Fatou Sall',
      product: 'Tablette iPad',
      amount: '125,000 FCFA',
      status: 'En cours',
      date: '14 Jan 2024',
      priority: 'normal'
    }
  ];

  const prospects = [
    { name: "Entreprise XYZ", contact: "contact@xyz.com", status: "négociation", value: "500K FCFA", probability: 75 },
    { name: "Boutique ABC", contact: "abc@boutique.com", status: "proposition", value: "200K FCFA", probability: 60 },
    { name: "Restaurant DEF", contact: "def@restaurant.com", status: "prospection", value: "150K FCFA", probability: 30 }
  ];

  const topProducts = [
    { name: 'Smartphone Galaxy A54', views: 234, sales: 12, stock: 5, revenue: "540K FCFA" },
    { name: 'Casque Sony WH-1000XM5', views: 189, sales: 8, stock: 12, revenue: "320K FCFA" },
    { name: 'Laptop HP Pavilion', views: 156, sales: 5, stock: 2, revenue: "750K FCFA" }
  ];

  const lowStockProducts = [
    { name: "iPhone 15 Pro", stock: 2, threshold: 10 },
    { name: "MacBook Air M2", stock: 1, threshold: 5 },
    { name: "AirPods Pro", stock: 3, threshold: 15 }
  ];

  const clientsVIP = [
    { name: "Marie Diallo", orders: 15, total: "2.5M FCFA", lastOrder: "2 jours", status: "VIP" },
    { name: "Amadou Ba", orders: 12, total: "1.8M FCFA", lastOrder: "1 semaine", status: "Fidèle" },
    { name: "Fatou Sall", orders: 8, total: "1.2M FCFA", lastOrder: "3 jours", status: "Régulier" }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50">
      {/* Header Ultra-Professionnel */}
      <header className="bg-white/95 backdrop-blur-lg border-b border-gray-200/50 sticky top-0 z-50 shadow-lg">
        <div className="px-8 py-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-6">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 bg-gradient-to-br from-blue-600 to-indigo-700 rounded-2xl flex items-center justify-center shadow-xl">
                  <Activity className="w-8 h-8 text-white" />
                </div>
                <div>
                  <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-indigo-700 bg-clip-text text-transparent">
                    224SOLUTIONS
                  </h1>
                  <p className="text-base text-gray-600 flex items-center gap-3 font-medium">
                    <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
                    {profile?.first_name || user?.email?.split('@')[0]} • Espace Vendeur Pro
                    {userInfo && (
                      <span className="text-xs bg-blue-100 text-blue-700 px-3 py-1 rounded-full font-mono font-bold">
                        ID: {userInfo.custom_id}
                      </span>
                    )}
                  </p>
                </div>
              </div>
              {/* Informations Wallet Ultra-Professionnelles */}
              {wallet && (
                <div className="hidden lg:flex items-center gap-4 ml-8">
                  {/* Solde Wallet Premium */}
                  <div className="px-6 py-3 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl border border-blue-200/50 shadow-sm">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-lg flex items-center justify-center">
                        <CreditCard className="w-5 h-5 text-white" />
                      </div>
                      <div>
                        <div className="text-lg font-bold text-blue-700">{wallet.balance.toLocaleString()} {wallet.currency}</div>
                        <div className="text-xs text-blue-600 font-medium">Solde Disponible</div>
                      </div>
                    </div>
                  </div>

                  {/* Statut Wallet */}
                  <div className="px-4 py-3 bg-gradient-to-r from-emerald-50 to-green-50 rounded-xl border border-emerald-200/50 shadow-sm">
                    <div className="flex items-center gap-3">
                      <div className="w-3 h-3 bg-emerald-500 rounded-full animate-pulse shadow-lg"></div>
                      <div>
                        <div className="text-sm font-bold text-emerald-800">Wallet Actif</div>
                        <div className="text-xs text-emerald-600 font-mono">{wallet.id?.slice(-8) || 'N/A'}</div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Message Premium si pas de wallet */}
              {!wallet && !walletLoading && (
                <div className="hidden lg:flex items-center gap-3 ml-8 px-5 py-3 bg-gradient-to-r from-amber-50 to-orange-50 rounded-xl border border-amber-200/50 shadow-sm">
                  <div className="w-10 h-10 bg-gradient-to-br from-amber-500 to-orange-600 rounded-lg flex items-center justify-center">
                    <AlertTriangle className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <div className="text-sm font-bold text-amber-800">Configuration Requise</div>
                    <div className="text-xs text-amber-600">Wallet en cours de création...</div>
                  </div>
                </div>
              )}
            </div>
            <div className="flex items-center gap-4">
              <Button size="lg" variant="outline" className="hidden xl:flex bg-white/80 hover:bg-white border-gray-200 hover:border-blue-300 hover:shadow-lg transition-all duration-300" onClick={() => {
                const activeSearchInput = document.querySelector('input[placeholder*="Rechercher"]') as HTMLInputElement;
                activeSearchInput?.focus();
              }}>
                <Search className="w-4 h-4 mr-2 text-gray-600" />
                <span className="text-gray-700 font-medium">Recherche globale</span>
              </Button>

              <Button size="lg" variant="outline" className="relative bg-white/80 hover:bg-white border-gray-200 hover:border-blue-300 hover:shadow-lg transition-all duration-300" onClick={() => {
                if (urgentAlerts.length > 0) {
                  urgentAlerts.forEach(alert => {
                    toast({
                      title: "Alerte Système",
                      description: alert.message,
                      variant: alert.priority === 'high' ? 'destructive' : 'default'
                    });
                  });
                }
              }}>
                <Bell className="w-4 h-4 text-gray-600" />
                {urgentAlerts.length > 0 && (
                  <span className="absolute -top-2 -right-2 w-5 h-5 bg-gradient-to-r from-red-500 to-red-600 rounded-full text-xs flex items-center justify-center text-white font-bold animate-bounce shadow-lg">
                    {urgentAlerts.length}
                  </span>
                )}
              </Button>

              <Button size="lg" className="bg-gradient-to-r from-blue-600 to-indigo-700 hover:from-blue-700 hover:to-indigo-800 text-white font-semibold px-6 shadow-lg hover:shadow-xl transition-all duration-300" onClick={() => {
                const productsTab = document.querySelector('[value="products"]') as HTMLElement;
                productsTab?.click();
                setTimeout(() => {
                  const addProductButton = document.querySelector('[data-testid="add-product-button"]') as HTMLElement;
                  addProductButton?.click();
                }, 100);
              }}>
                <Plus className="w-4 h-4 mr-2" />
                Nouveau Produit
              </Button>

              <Button
                size="lg"
                variant="ghost"
                onClick={handleSignOut}
                className="hover:bg-red-50 hover:text-red-600 text-gray-600 transition-all duration-300"
                title="Se déconnecter"
              >
                <LogOut className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Alertes urgentes */}
      {urgentAlerts.length > 0 && (
        <section className="px-4 py-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {urgentAlerts.map((alert, index) => (
              <Card key={index} className={`border-l-4 ${alert.priority === 'high' ? 'border-l-red-500' : 'border-l-orange-500'
                }`}>
                <CardContent className="p-4">
                  <div className="flex items-center gap-2">
                    <AlertTriangle className={`w-5 h-5 ${alert.priority === 'high' ? 'text-red-500' : 'text-orange-500'
                      }`} />
                    <p className="text-sm font-medium">{alert.message}</p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>
      )}

      {/* Statistiques Ultra-Professionnelles */}
      <section className="px-8 py-8">
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-gray-800 mb-2">Tableau de Bord Exécutif</h2>
          <p className="text-gray-600 text-lg">Indicateurs clés de performance en temps réel</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {mainStats.map((stat, index) => {
            const Icon = stat.icon;
            const colors = [
              'from-blue-500 to-blue-600',
              'from-emerald-500 to-emerald-600',
              'from-purple-500 to-purple-600',
              'from-orange-500 to-orange-600'
            ];
            const bgColors = [
              'from-blue-50 to-blue-100',
              'from-emerald-50 to-emerald-100',
              'from-purple-50 to-purple-100',
              'from-orange-50 to-orange-100'
            ];
            return (
              <Card key={index} className="relative overflow-hidden border-0 bg-white shadow-xl hover:shadow-2xl transition-all duration-500 group cursor-pointer transform hover:-translate-y-1">
                <div className={`absolute top-0 right-0 w-32 h-32 bg-gradient-to-br ${bgColors[index]} opacity-20 rounded-full -translate-y-8 translate-x-8 group-hover:opacity-30 transition-opacity duration-300`} />
                <CardContent className="p-8 relative z-10">
                  <div className="flex items-start justify-between mb-6">
                    <div className="flex-1">
                      <p className="text-sm font-bold text-gray-500 mb-3 uppercase tracking-wider">{stat.label}</p>
                      <p className="text-4xl font-bold text-gray-800 mb-4 group-hover:scale-105 transition-transform duration-300">{stat.value}</p>
                      <div className="flex items-center gap-3">
                        <div className={`flex items-center text-sm font-bold px-3 py-2 rounded-full ${stat.change.startsWith('+')
                          ? 'text-emerald-700 bg-emerald-100'
                          : 'text-red-700 bg-red-100'
                          }`}>
                          <TrendingUp className="w-4 h-4 mr-2" />
                          {stat.change}
                        </div>
                      </div>
                      <p className="text-xs text-gray-500 mt-2 font-medium">vs période précédente</p>
                    </div>
                    <div className={`p-5 rounded-2xl bg-gradient-to-br ${colors[index]} shadow-lg group-hover:shadow-xl transition-all duration-300 transform group-hover:scale-110`}>
                      <Icon className="w-8 h-8 text-white" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </section>

      {/* Interface à onglets Ultra-Moderne */}
      <div className="px-8 py-6">
        <Tabs defaultValue="pos" className="w-full">
          <div className="mb-8 bg-white/90 backdrop-blur-lg p-3 rounded-2xl border border-gray-200/50 shadow-xl">
            <TabsList className="bg-transparent p-0 h-auto w-full flex flex-col gap-3">
              {/* Première ligne - 7 boutons */}
              <div className="flex gap-3">
                <TabsTrigger
                  value="pos"
                  className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-blue-600 data-[state=active]:to-indigo-700 data-[state=active]:text-white data-[state=active]:shadow-xl hover:bg-gray-100 transition-all duration-300 px-6 py-4 rounded-xl border-0 font-semibold text-gray-700 hover:text-gray-900 flex-1"
                >
                  <CreditCard className="w-5 h-5 mr-3" />
                  POS Caisse
                </TabsTrigger>
                <TabsTrigger
                  value="dashboard"
                  className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-emerald-500 data-[state=active]:to-emerald-600 data-[state=active]:text-white data-[state=active]:shadow-xl hover:bg-gray-100 transition-all duration-300 px-6 py-4 rounded-xl border-0 font-semibold text-gray-700 hover:text-gray-900 flex-1"
                >
                  <BarChart3 className="w-5 h-5 mr-3" />
                  Vue d'ensemble
                </TabsTrigger>
                <TabsTrigger
                  value="products"
                  className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-purple-500 data-[state=active]:to-purple-600 data-[state=active]:text-white data-[state=active]:shadow-xl hover:bg-gray-100 transition-all duration-300 px-6 py-4 rounded-xl border-0 font-semibold text-gray-700 hover:text-gray-900 flex-1"
                >
                  <Package className="w-5 h-5 mr-3" />
                  Produits
                </TabsTrigger>
                <TabsTrigger
                  value="orders"
                  className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-orange-500 data-[state=active]:to-orange-600 data-[state=active]:text-white data-[state=active]:shadow-xl hover:bg-gray-100 transition-all duration-300 px-6 py-4 rounded-xl border-0 font-semibold text-gray-700 hover:text-gray-900 flex-1"
                >
                  <ShoppingCart className="w-5 h-5 mr-3" />
                  Commandes
                </TabsTrigger>
                <TabsTrigger
                  value="clients"
                  className="data-[state=active]:bg-vendeur-gradient data-[state=active]:text-white data-[state=active]:shadow-lg hover:bg-muted/50 transition-all duration-200 px-4 py-3 rounded-lg border-0 flex-1"
                >
                  <Users className="w-4 h-4 mr-2" />
                  Clients
                </TabsTrigger>
                <TabsTrigger
                  value="agents"
                  className="data-[state=active]:bg-vendeur-gradient data-[state=active]:text-white data-[state=active]:shadow-lg hover:bg-muted/50 transition-all duration-200 px-4 py-3 rounded-lg border-0 flex-1"
                >
                  <UserCheck className="w-4 h-4 mr-2" />
                  Agents
                </TabsTrigger>
                <TabsTrigger
                  value="warehouses"
                  className="data-[state=active]:bg-vendeur-gradient data-[state=active]:text-white data-[state=active]:shadow-lg hover:bg-muted/50 transition-all duration-200 px-4 py-3 rounded-lg border-0 flex-1"
                >
                  <Warehouse className="w-4 h-4 mr-2" />
                  Entrepôts
                </TabsTrigger>
              </div>

              {/* Deuxième ligne - 7 boutons */}
              <div className="flex gap-3">
                <TabsTrigger
                  value="expenses"
                  className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-red-500 data-[state=active]:to-red-600 data-[state=active]:text-white data-[state=active]:shadow-xl hover:bg-gray-100 transition-all duration-300 px-6 py-4 rounded-xl border-0 font-semibold text-gray-700 hover:text-gray-900 flex-1"
                >
                  <Receipt className="w-5 h-5 mr-3" />
                  Dépenses
                </TabsTrigger>
                <TabsTrigger
                  value="payments"
                  className="data-[state=active]:bg-vendeur-gradient data-[state=active]:text-white data-[state=active]:shadow-lg hover:bg-muted/50 transition-all duration-200 px-4 py-3 rounded-lg border-0 flex-1"
                >
                  <CreditCard className="w-4 h-4 mr-2" />
                  Paiements
                </TabsTrigger>
                <TabsTrigger
                  value="stock"
                  className="data-[state=active]:bg-vendeur-gradient data-[state=active]:text-white data-[state=active]:shadow-lg hover:bg-muted/50 transition-all duration-200 px-4 py-3 rounded-lg border-0 flex-1"
                >
                  <Package className="w-4 h-4 mr-2" />
                  Stock
                </TabsTrigger>
                <TabsTrigger
                  value="marketing"
                  className="data-[state=active]:bg-vendeur-gradient data-[state=active]:text-white data-[state=active]:shadow-lg hover:bg-muted/50 transition-all duration-200 px-4 py-3 rounded-lg border-0 flex-1"
                >
                  <Megaphone className="w-4 h-4 mr-2" />
                  Marketing
                </TabsTrigger>
                <TabsTrigger
                  value="analytics"
                  className="data-[state=active]:bg-vendeur-gradient data-[state=active]:text-white data-[state=active]:shadow-lg hover:bg-muted/50 transition-all duration-200 px-4 py-3 rounded-lg border-0 flex-1"
                >
                  <PieChart className="w-4 h-4 mr-2" />
                  Analyses
                </TabsTrigger>
                <TabsTrigger
                  value="wallet"
                  className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-cyan-500 data-[state=active]:to-cyan-600 data-[state=active]:text-white data-[state=active]:shadow-xl hover:bg-gray-100 transition-all duration-300 px-6 py-4 rounded-xl border-0 font-semibold text-gray-700 hover:text-gray-900 flex-1"
                >
                  <CreditCard className="w-5 h-5 mr-3" />
                  Wallet
                </TabsTrigger>
                <TabsTrigger
                  value="transactions"
                  className="data-[state=active]:bg-vendeur-gradient data-[state=active]:text-white data-[state=active]:shadow-lg hover:bg-muted/50 transition-all duration-200 px-4 py-3 rounded-lg border-0 flex-1"
                >
                  <ArrowRightLeft className="w-4 h-4 mr-2" />
                  Transactions
                </TabsTrigger>
                <TabsTrigger
                  value="communication"
                  className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-blue-500 data-[state=active]:to-blue-600 data-[state=active]:text-white data-[state=active]:shadow-xl hover:bg-gray-100 transition-all duration-300 px-6 py-4 rounded-xl border-0 font-semibold text-gray-700 hover:text-gray-900 flex-1"
                >
                  <MessageSquare className="w-5 h-5 mr-3" />
                  Communication
                </TabsTrigger>
                <TabsTrigger
                  value="copilote"
                  className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-purple-500 data-[state=active]:to-purple-600 data-[state=active]:text-white data-[state=active]:shadow-xl hover:bg-gray-100 transition-all duration-300 px-6 py-4 rounded-xl border-0 font-semibold text-gray-700 hover:text-gray-900 flex-1"
                >
                  <Bot className="w-5 h-5 mr-3" />
                  Copilote IA
                </TabsTrigger>

                {/* Bouton de déconnexion visible */}
                <Button
                  onClick={handleSignOut}
                  variant="outline"
                  className="bg-red-50 hover:bg-red-100 text-red-600 hover:text-red-700 border-red-200 hover:border-red-300 px-4 py-3 rounded-lg font-semibold transition-all duration-200"
                >
                  <LogOut className="w-4 h-4 mr-2" />
                  Déconnexion
                </Button>
              </div>
            </TabsList>
          </div>

          {/* POS - Point de Vente */}
          <TabsContent value="pos" className="space-y-6">
            <div className="w-full h-full">
              <div className="mt-4">
                <POSSystemWrapper />
              </div>
            </div>
          </TabsContent>

          <TabsContent value="dashboard" className="space-y-6">
            {/* Diagnostic et réparation vendeur */}
            <VendorDiagnostic />
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Commandes récentes */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <ShoppingCart className="w-5 h-5" />
                    Commandes récentes
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {recentOrders.map((order) => (
                      <div key={order.id} className="flex items-center justify-between p-4 bg-accent rounded-lg">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <h4 className="font-medium">{order.id}</h4>
                            <Badge variant={order.priority === 'urgent' ? 'destructive' : 'secondary'}>
                              {order.status}
                            </Badge>
                          </div>
                          <p className="text-sm text-muted-foreground">{order.customer} • {order.product}</p>
                          <p className="text-xs text-muted-foreground">{order.date}</p>
                        </div>
                        <div className="text-right">
                          <p className="font-semibold">{order.amount}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Produits top performance */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <TrendingUp className="w-5 h-5" />
                    Top produits
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {topProducts.map((product, index) => (
                      <div key={index} className="flex items-center justify-between p-4 bg-accent rounded-lg">
                        <div className="flex-1">
                          <h4 className="font-medium mb-1">{product.name}</h4>
                          <div className="flex items-center gap-4 text-sm text-muted-foreground">
                            <span className="flex items-center gap-1">
                              <Eye className="w-4 h-4" />
                              {product.views}
                            </span>
                            <span className="flex items-center gap-1">
                              <ShoppingCart className="w-4 h-4" />
                              {product.sales}
                            </span>
                            <span className="flex items-center gap-1">
                              <Package className="w-4 h-4" />
                              Stock: {product.stock}
                            </span>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="font-semibold text-green-600">{product.revenue}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Stock faible */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <AlertTriangle className="w-5 h-5 text-orange-500" />
                  Alertes stock faible
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {lowStockProducts.map((product, index) => (
                    <div key={index} className="p-4 border border-orange-200 rounded-lg bg-orange-50">
                      <h4 className="font-medium mb-2">{product.name}</h4>
                      <div className="flex items-center justify-between text-sm">
                        <span>Stock actuel: <strong>{product.stock}</strong></span>
                        <span className="text-orange-600">Seuil: {product.threshold}</span>
                      </div>
                      <Progress value={(product.stock / product.threshold) * 100} className="mt-2" />
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Gestion des produits */}
          <TabsContent value="products">
            <ProductManagement />
          </TabsContent>

          {/* Gestion des commandes */}
          <TabsContent value="orders">
            <OrderManagement />
          </TabsContent>

          {/* Gestion des clients */}
          <TabsContent value="clients" className="space-y-6">
            <ClientManagement />
          </TabsContent>

          {/* Agents & Permissions */}
          <TabsContent value="agents" className="space-y-6">
            <AgentManagement />
          </TabsContent>

          {/* Entrepôts & Stocks */}
          <TabsContent value="warehouses" className="space-y-6">
            <WarehouseManagement />
          </TabsContent>

          {/* 💰 Gestion des Dépenses - NOUVELLE FONCTIONNALITÉ */}
          <TabsContent value="expenses" className="space-y-6">
            <ExpenseManagementDashboard />
          </TabsContent>

          {/* Communication */}
          <TabsContent value="communication" className="space-y-6">
            <SimpleCommunicationInterface />
          </TabsContent>

          {/* Copilote IA */}
          <TabsContent value="copilote" className="space-y-6">
            <CopiloteChat height="600px" />
          </TabsContent>

          {/* Gestion des paiements */}
          <TabsContent value="payments">
            <div className="space-y-6">
              <PaymentManagement />
              <PaymentProcessor />
            </div>
          </TabsContent>

          {/* Gestion des stocks */}
          <TabsContent value="stock">
            <InventoryManagement />
          </TabsContent>

          {/* Marketing & Promotions */}
          <TabsContent value="marketing">
            <MarketingManagement />
          </TabsContent>

          {/* Analyses & Rapports */}
          <TabsContent value="analytics">
            <VendorAnalytics />
          </TabsContent>

          {/* Wallet & Transactions */}
          <TabsContent value="wallet" className="space-y-6">
            <WalletDashboard />
          </TabsContent>

          {/* Transactions P2P */}
          <TabsContent value="transactions" className="space-y-6">
            {wallet ? (
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Envoi rapide */}
                <Card className="lg:col-span-2">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Send className="w-5 h-5" />
                      Transfert d'argent
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <Label htmlFor="recipient">Email du destinataire</Label>
                      <Input
                        id="recipient"
                        type="email"
                        placeholder="destinataire@exemple.com"
                        className="mt-1"
                      />
                    </div>
                    <div>
                      <Label htmlFor="amount">Montant ({wallet.currency})</Label>
                      <Input
                        id="amount"
                        type="number"
                        placeholder="0"
                        className="mt-1"
                      />
                    </div>
                    <div>
                      <Label htmlFor="message">Message (optionnel)</Label>
                      <Input
                        id="message"
                        placeholder="Paiement pour..."
                        className="mt-1"
                      />
                    </div>
                    <Button className="w-full bg-vendeur-gradient">
                      <Send className="w-4 h-4 mr-2" />
                      Envoyer maintenant
                    </Button>
                  </CardContent>
                </Card>

                {/* Solde et infos */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Mon Solde</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-center space-y-4">
                      <div className="text-3xl font-bold text-vendeur">
                        {wallet.balance.toLocaleString()} {wallet.currency}
                      </div>
                      <div className="space-y-2">
                        <Button variant="outline" className="w-full">
                          <Download className="w-4 h-4 mr-2" />
                          Recharger
                        </Button>
                        <Button variant="outline" className="w-full">
                          <Upload className="w-4 h-4 mr-2" />
                          Retirer
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            ) : (
              <Card className="border-green-200 bg-green-50">
                <CardContent className="p-8 text-center">
                  <CreditCard className="w-12 h-12 mx-auto text-green-600 mb-4" />
                  <h3 className="text-lg font-semibold text-green-800 mb-2">Wallet en cours de création</h3>
                  <p className="text-green-600 mb-4">
                    Votre portefeuille 224Solutions est en cours de création automatique.
                    Une fois activé, vous pourrez effectuer des transactions.
                  </p>
                  <Button
                    onClick={() => window.location.reload()}
                    className="bg-green-600 hover:bg-green-700"
                  >
                    <RefreshCw className="w-4 h-4 mr-2" />
                    Vérifier le statut
                  </Button>
                </CardContent>
              </Card>
            )}
          </TabsContent>
        </Tabs>
      </div>

    </div>
  );
}