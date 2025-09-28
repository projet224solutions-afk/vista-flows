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
  Bell, Menu, MoreHorizontal, Activity, PieChart, LineChart
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useRoleRedirect } from "@/hooks/useRoleRedirect";
import { useNavigate } from "react-router-dom";
import NavigationFooter from "@/components/NavigationFooter";
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

export default function VendeurDashboard() {
  const { user, profile, signOut } = useAuth();
  const navigate = useNavigate();
  useRoleRedirect(); // S'assurer que seuls les vendeurs/admins accèdent à cette page
  const { stats, loading: statsLoading, error: statsError } = useVendorStats();

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
    <div className="min-h-screen bg-gradient-to-br from-vendeur-accent via-background to-accent pb-20">
      {/* Header Professionnel Style Odoo */}
      <header className="bg-card/95 backdrop-blur-sm border-b border-border sticky top-0 z-50 shadow-elegant">
        <div className="px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <div className="w-10 h-10 bg-vendeur-gradient rounded-lg flex items-center justify-center">
                  <Activity className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h1 className="text-2xl font-bold bg-vendeur-gradient bg-clip-text text-transparent">
                    Commerce Pro
                  </h1>
                  <p className="text-sm text-muted-foreground">
                    {profile?.first_name || user?.email?.split('@')[0]} • Dashboard Vendeur
                  </p>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Button size="sm" variant="outline" className="hidden md:flex">
                <Search className="w-4 h-4 mr-2" />
                Recherche rapide
              </Button>
              <Button size="sm" variant="outline" className="relative">
                <Bell className="w-4 h-4" />
                {urgentAlerts.length > 0 && (
                  <span className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full text-xs" />
                )}
              </Button>
              <Button size="sm" className="bg-vendeur-gradient hover:opacity-90">
                <Plus className="w-4 h-4 mr-2" />
                Nouveau
              </Button>
              <Button size="sm" variant="ghost" onClick={handleSignOut}>
                <MoreHorizontal className="w-4 h-4" />
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

      {/* Statistiques principales - Style Odoo */}
      <section className="px-6 py-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {mainStats.map((stat, index) => {
            const Icon = stat.icon;
            return (
              <Card key={index} className="relative overflow-hidden border-0 shadow-elegant hover:shadow-glow transition-all duration-300">
                <div className="absolute top-0 right-0 w-20 h-20 bg-gradient-to-br from-transparent to-accent opacity-50" />
                <CardContent className="p-6 relative z-10">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <p className="text-sm font-medium text-muted-foreground mb-1">{stat.label}</p>
                      <p className="text-3xl font-bold text-foreground mb-2">{stat.value}</p>
                      <div className="flex items-center gap-2">
                        <div className={`flex items-center text-sm font-medium ${
                          stat.change.startsWith('+') ? 'text-green-600' : 'text-red-600'
                        }`}>
                          <TrendingUp className="w-4 h-4 mr-1" />
                          {stat.change}
                        </div>
                        <span className="text-xs text-muted-foreground">vs mois dernier</span>
                      </div>
                    </div>
                    <div className={`p-3 rounded-xl bg-gradient-to-br from-accent to-secondary`}>
                      <Icon className={`w-6 h-6 ${stat.color}`} />
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
          <div className="flex overflow-x-auto scrollbar-hide mb-6">
            <TabsList className="flex-shrink-0 bg-card/50 backdrop-blur-sm p-1 rounded-xl border">
              <TabsTrigger value="pos" className="data-[state=active]:bg-vendeur-primary data-[state=active]:text-white">
                <CreditCard className="w-4 h-4 mr-2" />
                POS Caisse
              </TabsTrigger>
              <TabsTrigger value="dashboard" className="data-[state=active]:bg-vendeur-primary data-[state=active]:text-white">
                <BarChart3 className="w-4 h-4 mr-2" />
                Vue d'ensemble
              </TabsTrigger>
              <TabsTrigger value="products" className="data-[state=active]:bg-vendeur-primary data-[state=active]:text-white">
                <Package className="w-4 h-4 mr-2" />
                Produits
              </TabsTrigger>
              <TabsTrigger value="orders" className="data-[state=active]:bg-vendeur-primary data-[state=active]:text-white">
                <ShoppingCart className="w-4 h-4 mr-2" />
                Commandes
              </TabsTrigger>
              <TabsTrigger value="clients" className="data-[state=active]:bg-vendeur-primary data-[state=active]:text-white">
                <Users className="w-4 h-4 mr-2" />
                Clients
              </TabsTrigger>
              <TabsTrigger value="payments" className="data-[state=active]:bg-vendeur-primary data-[state=active]:text-white">
                <CreditCard className="w-4 h-4 mr-2" />
                Paiements
              </TabsTrigger>
              <TabsTrigger value="stock" className="data-[state=active]:bg-vendeur-primary data-[state=active]:text-white">
                <Package className="w-4 h-4 mr-2" />
                Stock
              </TabsTrigger>
              <TabsTrigger value="marketing" className="data-[state=active]:bg-vendeur-primary data-[state=active]:text-white">
                <Megaphone className="w-4 h-4 mr-2" />
                Marketing
              </TabsTrigger>
              <TabsTrigger value="analytics" className="data-[state=active]:bg-vendeur-primary data-[state=active]:text-white">
                <PieChart className="w-4 h-4 mr-2" />
                Analyses
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
        </Tabs>
      </div>

      <NavigationFooter />
    </div>
  );
}