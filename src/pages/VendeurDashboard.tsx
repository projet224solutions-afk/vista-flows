import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
  Warehouse, UserCheck, ArrowRightLeft, Send
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useRoleRedirect } from "@/hooks/useRoleRedirect";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { useVendorStats } from "@/hooks/useVendorData";
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
import { POSSystem } from "@/components/vendor/POSSystem";
import AgentManagement from "@/components/vendor/AgentManagement";
import WarehouseManagement from "@/components/vendor/WarehouseManagement";
import { WalletDashboard } from "@/components/wallet/WalletDashboard";
import { TransactionSystem } from "@/components/wallet/TransactionSystem";
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
  const { wallet, loading: walletLoading } = useWallet();

  const handleSignOut = async () => {
    await signOut();
    navigate('/');
  };

  // Données du tableau de bord - utilise les données réelles si disponibles
  const mainStats = [
    { 
      label: "Chiffre d'affaires", 
      value: stats ? `${stats.revenue.toLocaleString()} FCFA` : "2.4M FCFA", 
      change: "+12%", 
      icon: DollarSign, 
      color: "text-green-600" 
    },
    { 
      label: "Commandes ce mois", 
      value: stats ? stats.orders_count.toString() : "156", 
      change: "+8%", 
      icon: ShoppingCart, 
      color: "text-blue-600" 
    },
    { 
      label: "Clients actifs", 
      value: stats ? stats.customers_count.toString() : "89", 
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
      <div className="min-h-screen bg-gradient-to-br from-vendeur-accent via-background to-accent">
        {/* Header Professionnel Style Odoo */}
        <header className="bg-card/95 backdrop-blur-sm border-b border-border sticky top-0 z-50 shadow-elegant">
          <div className="px-6 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-vendeur-gradient rounded-xl flex items-center justify-center shadow-glow">
                    <Activity className="w-7 h-7 text-white" />
                  </div>
                  <div>
                    <h1 className="text-2xl font-bold bg-vendeur-gradient bg-clip-text text-transparent">
                      224SOLUTIONS Commerce Pro
                    </h1>
                    <p className="text-sm text-muted-foreground flex items-center gap-2">
                      <span className="w-2 h-2 bg-vendeur-secondary rounded-full"></span>
                      {profile?.first_name || user?.email?.split('@')[0]} • Dashboard Vendeur
                      {userInfo && (
                        <span className="text-xs bg-primary/10 px-2 py-1 rounded-full font-mono">
                          ID: {userInfo.custom_id}
                        </span>
                      )}
                    </p>
                  </div>
                </div>
              {/* Informations Wallet dans l'en-tête */}
              {wallet && !walletLoading && (
                <div className="hidden md:flex items-center gap-4 ml-6 px-4 py-2 bg-vendeur/10 rounded-lg border">
                  <div className="flex items-center gap-2">
                    <CreditCard className="w-4 h-4 text-vendeur" />
                    <div className="text-sm">
                      <div className="font-medium">{wallet.balance.toLocaleString()} {wallet.currency}</div>
                      <div className="text-xs text-muted-foreground">Solde disponible</div>
                    </div>
                  </div>
                </div>
              )}
              </div>
            <div className="flex items-center gap-3">
              <Button size="sm" variant="outline" className="hidden lg:flex hover:shadow-glow transition-all duration-300" onClick={() => {
                // Focus on search inputs in active tab
                const activeSearchInput = document.querySelector('input[placeholder*="Rechercher"]') as HTMLInputElement;
                activeSearchInput?.focus();
              }}>
                <Search className="w-4 h-4 mr-2" />
                Recherche globale
              </Button>
              <Button size="sm" variant="outline" className="relative hover:shadow-glow transition-all duration-300" onClick={() => {
                // Show notifications/alerts
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
                <Bell className="w-4 h-4" />
                {urgentAlerts.length > 0 && (
                  <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full text-xs flex items-center justify-center text-white font-bold animate-pulse">
                    {urgentAlerts.length}
                  </span>
                )}
              </Button>
              <Button size="sm" className="bg-vendeur-gradient hover:shadow-glow transition-all duration-300" onClick={() => {
                // Switch to products tab and trigger new product dialog
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
              <Button size="sm" variant="ghost" onClick={handleSignOut} className="hover:bg-destructive/10 hover:text-destructive">
                <Settings className="w-4 h-4" />
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
              <Card key={index} className={`border-l-4 ${
                alert.priority === 'high' ? 'border-l-red-500' : 'border-l-orange-500'
              }`}>
                <CardContent className="p-4">
                  <div className="flex items-center gap-2">
                    <AlertTriangle className={`w-5 h-5 ${
                      alert.priority === 'high' ? 'text-red-500' : 'text-orange-500'
                    }`} />
                    <p className="text-sm font-medium">{alert.message}</p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>
      )}

      {/* Statistiques principales - Style Odoo Professionnel */}
      <section className="px-6 py-6">
        <div className="mb-4">
          <h2 className="text-lg font-semibold text-foreground mb-1">Performance en Temps Réel</h2>
          <p className="text-sm text-muted-foreground">Indicateurs clés de performance de votre entreprise</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {mainStats.map((stat, index) => {
            const Icon = stat.icon;
            return (
              <Card key={index} className="relative overflow-hidden border-0 shadow-elegant hover:shadow-glow transition-all duration-500 group cursor-pointer">
                <div className="absolute top-0 right-0 w-24 h-24 bg-vendeur-gradient opacity-5 rounded-full -translate-y-6 translate-x-6 group-hover:opacity-10 transition-opacity duration-300" />
                <CardContent className="p-6 relative z-10">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <p className="text-sm font-medium text-muted-foreground mb-2 uppercase tracking-wider">{stat.label}</p>
                      <p className="text-3xl font-bold text-foreground mb-3 group-hover:scale-105 transition-transform duration-300">{stat.value}</p>
                      <div className="flex items-center gap-2">
                        <div className={`flex items-center text-sm font-semibold px-2 py-1 rounded-full ${
                          stat.change.startsWith('+') 
                            ? 'text-vendeur-secondary bg-vendeur-secondary/10' 
                            : 'text-red-600 bg-red-50'
                        }`}>
                          <TrendingUp className="w-3 h-3 mr-1" />
                          {stat.change}
                        </div>
                        <span className="text-xs text-muted-foreground">vs période précédente</span>
                      </div>
                    </div>
                    <div className="p-4 rounded-2xl bg-vendeur-gradient shadow-elegant group-hover:shadow-glow transition-all duration-300">
                      <Icon className="w-6 h-6 text-white" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </section>

      {/* Interface à onglets - Style Odoo Professionnel */}
      <div className="px-6 py-4">
        <Tabs defaultValue="pos" className="w-full">
          <div className="flex overflow-x-auto scrollbar-hide mb-6 bg-gradient-to-r from-card via-card/95 to-card/80 p-3 rounded-2xl border shadow-lg backdrop-blur-sm">
            <TabsList className="flex-shrink-0 bg-transparent p-0 h-auto -space-x-2 w-full">
              <TabsTrigger 
                value="pos" 
                className="data-[state=active]:bg-vendeur-gradient data-[state=active]:text-white data-[state=active]:shadow-xl data-[state=active]:scale-105 data-[state=active]:z-10 hover:bg-muted/50 hover:scale-102 hover:z-20 transition-all duration-300 px-5 py-3 rounded-xl border border-border/50 bg-background/80 backdrop-blur-sm shadow-md relative"
              >
                <CreditCard className="w-4 h-4 mr-2" />
                POS Caisse
              </TabsTrigger>
              <TabsTrigger 
                value="dashboard" 
                className="data-[state=active]:bg-vendeur-gradient data-[state=active]:text-white data-[state=active]:shadow-xl data-[state=active]:scale-105 data-[state=active]:z-10 hover:bg-muted/50 hover:scale-102 hover:z-20 transition-all duration-300 px-5 py-3 rounded-xl border border-border/50 bg-background/80 backdrop-blur-sm shadow-md relative"
              >
                <BarChart3 className="w-4 h-4 mr-2" />
                Vue d'ensemble
              </TabsTrigger>
              <TabsTrigger 
                value="products" 
                className="data-[state=active]:bg-vendeur-gradient data-[state=active]:text-white data-[state=active]:shadow-xl data-[state=active]:scale-105 data-[state=active]:z-10 hover:bg-muted/50 hover:scale-102 hover:z-20 transition-all duration-300 px-5 py-3 rounded-xl border border-border/50 bg-background/80 backdrop-blur-sm shadow-md relative"
              >
                <Package className="w-4 h-4 mr-2" />
                Produits
              </TabsTrigger>
              <TabsTrigger 
                value="orders" 
                className="data-[state=active]:bg-vendeur-gradient data-[state=active]:text-white data-[state=active]:shadow-xl data-[state=active]:scale-105 data-[state=active]:z-10 hover:bg-muted/50 hover:scale-102 hover:z-20 transition-all duration-300 px-5 py-3 rounded-xl border border-border/50 bg-background/80 backdrop-blur-sm shadow-md relative"
              >
                <ShoppingCart className="w-4 h-4 mr-2" />
                Commandes
              </TabsTrigger>
              <TabsTrigger 
                value="clients" 
                className="data-[state=active]:bg-vendeur-gradient data-[state=active]:text-white data-[state=active]:shadow-xl data-[state=active]:scale-105 data-[state=active]:z-10 hover:bg-muted/50 hover:scale-102 hover:z-20 transition-all duration-300 px-5 py-3 rounded-xl border border-border/50 bg-background/80 backdrop-blur-sm shadow-md relative"
              >
                <Users className="w-4 h-4 mr-2" />
                Clients
              </TabsTrigger>
              <TabsTrigger 
                value="agents" 
                className="data-[state=active]:bg-vendeur-gradient data-[state=active]:text-white data-[state=active]:shadow-xl data-[state=active]:scale-105 data-[state=active]:z-10 hover:bg-muted/50 hover:scale-102 hover:z-20 transition-all duration-300 px-5 py-3 rounded-xl border border-border/50 bg-background/80 backdrop-blur-sm shadow-md relative"
              >
                <UserCheck className="w-4 h-4 mr-2" />
                Agents & Permissions
              </TabsTrigger>
              <TabsTrigger 
                value="warehouses" 
                className="data-[state=active]:bg-vendeur-gradient data-[state=active]:text-white data-[state=active]:shadow-xl data-[state=active]:scale-105 data-[state=active]:z-10 hover:bg-muted/50 hover:scale-102 hover:z-20 transition-all duration-300 px-5 py-3 rounded-xl border border-border/50 bg-background/80 backdrop-blur-sm shadow-md relative"
              >
                <Warehouse className="w-4 h-4 mr-2" />
                Entrepôts & Stocks
              </TabsTrigger>
              <TabsTrigger 
                value="payments" 
                className="data-[state=active]:bg-vendeur-gradient data-[state=active]:text-white data-[state=active]:shadow-xl data-[state=active]:scale-105 data-[state=active]:z-10 hover:bg-muted/50 hover:scale-102 hover:z-20 transition-all duration-300 px-5 py-3 rounded-xl border border-border/50 bg-background/80 backdrop-blur-sm shadow-md relative"
              >
                <CreditCard className="w-4 h-4 mr-2" />
                Paiements
              </TabsTrigger>
              <TabsTrigger 
                value="stock" 
                className="data-[state=active]:bg-vendeur-gradient data-[state=active]:text-white data-[state=active]:shadow-xl data-[state=active]:scale-105 data-[state=active]:z-10 hover:bg-muted/50 hover:scale-102 hover:z-20 transition-all duration-300 px-5 py-3 rounded-xl border border-border/50 bg-background/80 backdrop-blur-sm shadow-md relative"
              >
                <Package className="w-4 h-4 mr-2" />
                Stock
              </TabsTrigger>
              <TabsTrigger 
                value="marketing" 
                className="data-[state=active]:bg-vendeur-gradient data-[state=active]:text-white data-[state=active]:shadow-xl data-[state=active]:scale-105 data-[state=active]:z-10 hover:bg-muted/50 hover:scale-102 hover:z-20 transition-all duration-300 px-5 py-3 rounded-xl border border-border/50 bg-background/80 backdrop-blur-sm shadow-md relative"
              >
                <Megaphone className="w-4 h-4 mr-2" />
                Marketing
              </TabsTrigger>
              <TabsTrigger 
                value="analytics" 
                className="data-[state=active]:bg-vendeur-gradient data-[state=active]:text-white data-[state=active]:shadow-xl data-[state=active]:scale-105 data-[state=active]:z-10 hover:bg-muted/50 hover:scale-102 hover:z-20 transition-all duration-300 px-5 py-3 rounded-xl border border-border/50 bg-background/80 backdrop-blur-sm shadow-md relative"
              >
                <PieChart className="w-4 h-4 mr-2" />
                Analyses
              </TabsTrigger>
              <TabsTrigger 
                value="wallet" 
                className="data-[state=active]:bg-vendeur-gradient data-[state=active]:text-white data-[state=active]:shadow-xl data-[state=active]:scale-105 data-[state=active]:z-10 hover:bg-muted/50 hover:scale-102 hover:z-20 transition-all duration-300 px-5 py-3 rounded-xl border border-border/50 bg-background/80 backdrop-blur-sm shadow-md relative"
              >
                <CreditCard className="w-4 h-4 mr-2" />
                Wallet & Cartes
              </TabsTrigger>
              <TabsTrigger 
                value="transactions" 
                className="data-[state=active]:bg-vendeur-gradient data-[state=active]:text-white data-[state=active]:shadow-xl data-[state=active]:scale-105 data-[state=active]:z-10 hover:bg-muted/50 hover:scale-102 hover:z-20 transition-all duration-300 px-5 py-3 rounded-xl border border-border/50 bg-background/80 backdrop-blur-sm shadow-md relative"
              >
                <ArrowRightLeft className="w-4 h-4 mr-2" />
                Transactions P2P
              </TabsTrigger>
            </TabsList>
          </div>

          {/* POS - Point de Vente */}
          <TabsContent value="pos" className="space-y-6">
            <POSSystem />
          </TabsContent>
          
          <TabsContent value="dashboard" className="space-y-6">
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

          {/* Wallet & Cartes Virtuelles */}
          <TabsContent value="wallet">
            <WalletDashboard />
          </TabsContent>

          {/* Transactions P2P */}
          <TabsContent value="transactions">
            <TransactionSystem />
          </TabsContent>
        </Tabs>
      </div>

      {/* Bouton de transaction flottant - repositionné en bas et plus grand */}
      <div className="fixed bottom-24 right-6 z-40">
        <Dialog>
          <DialogTrigger asChild>
            <Button 
              size="lg" 
              className="bg-vendeur-gradient hover:shadow-glow text-white px-12 py-8 text-xl font-bold rounded-full shadow-2xl hover:scale-105 transition-all duration-300 min-w-[280px] min-h-[80px]"
            >
              <Send className="h-8 w-8 mr-4" />
              ENVOYER ARGENT
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="text-xl font-bold text-vendeur">Transaction Rapide</DialogTitle>
              <DialogDescription className="text-base">
                Envoyez de l'argent instantanément à un autre utilisateur
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-6">
              <div>
                <Label htmlFor="quick-receiver" className="text-sm font-semibold">Email du destinataire</Label>
                <Input
                  id="quick-receiver"
                  type="email"
                  placeholder="email@exemple.com"
                  className="mt-2 h-12 text-base"
                />
              </div>
              <div>
                <Label htmlFor="quick-amount" className="text-sm font-semibold">Montant ({wallet?.currency || 'GNF'})</Label>
                <Input
                  id="quick-amount"
                  type="number"
                  placeholder="0"
                  className="mt-2 h-12 text-base font-mono text-lg"
                />
              </div>
              <Button className="w-full bg-vendeur-gradient h-14 text-lg font-semibold rounded-lg shadow-lg">
                <Send className="h-6 w-6 mr-3" />
                Envoyer Maintenant
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}