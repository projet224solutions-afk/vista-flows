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
  Calendar, Phone, Mail, Filter, Search, Download, Upload
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useNavigate } from "react-router-dom";
import NavigationFooter from "@/components/NavigationFooter";
import { useVendorStats } from "@/hooks/useVendorData";
import ProspectManagement from "@/components/vendor/ProspectManagement";
import PaymentManagement from "@/components/vendor/PaymentManagement";
import InventoryManagement from "@/components/vendor/InventoryManagement";
import MarketingManagement from "@/components/vendor/MarketingManagement";
import SupportTickets from "@/components/vendor/SupportTickets";

export default function VendeurDashboard() {
  const { user, profile, signOut } = useAuth();
  const navigate = useNavigate();
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
    <div className="min-h-screen bg-background pb-20">
      {/* Header */}
      <header className="bg-card border-b border-border sticky top-0 z-40">
        <div className="px-4 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-foreground">Dashboard Vendeur Pro</h1>
              <p className="text-muted-foreground">
                Bienvenue {profile?.first_name || user?.email} !
              </p>
            </div>
            <div className="flex gap-2">
              <Button size="sm" variant="outline">
                <Download className="w-4 h-4 mr-2" />
                Export
              </Button>
              <Button size="sm">
                <Plus className="w-4 h-4 mr-2" />
                Nouveau
              </Button>
              <Button variant="outline" onClick={handleSignOut}>
                Se déconnecter
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

      {/* Statistiques principales */}
      <section className="px-4 py-2">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {mainStats.map((stat, index) => {
            const Icon = stat.icon;
            return (
              <Card key={index}>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">{stat.label}</p>
                      <p className="text-2xl font-bold">{stat.value}</p>
                      <p className={`text-xs ${stat.change.startsWith('+') ? 'text-green-600' : 'text-red-600'}`}>
                        {stat.change} vs mois dernier
                      </p>
                    </div>
                    <Icon className={`w-8 h-8 ${stat.color}`} />
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </section>

      {/* Interface à onglets */}
      <section className="px-4 py-4">
        <Tabs defaultValue="dashboard" className="w-full">
          <TabsList className="grid w-full grid-cols-4 md:grid-cols-8 lg:grid-cols-10">
            <TabsTrigger value="dashboard">Vue d'ensemble</TabsTrigger>
            <TabsTrigger value="clients">Clients</TabsTrigger>
            <TabsTrigger value="pipeline">Pipeline</TabsTrigger>
            <TabsTrigger value="products">Produits</TabsTrigger>
            <TabsTrigger value="orders">Commandes</TabsTrigger>
            <TabsTrigger value="payments">Paiements</TabsTrigger>
            <TabsTrigger value="stock">Stock</TabsTrigger>
            <TabsTrigger value="communication">Messages</TabsTrigger>
            <TabsTrigger value="marketing">Marketing</TabsTrigger>
            <TabsTrigger value="analytics">Analyses</TabsTrigger>
          </TabsList>

          {/* Vue d'ensemble */}
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

          {/* Gestion des clients */}
          <TabsContent value="clients" className="space-y-6">
            <ProspectManagement />
          </TabsContent>

          {/* Pipeline commercial */}
          <TabsContent value="pipeline" className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-semibold">Pipeline commercial</h2>
              <Button>
                <Plus className="w-4 h-4 mr-2" />
                Nouvelle opportunité
              </Button>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Opportunités en cours</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-center py-8">
                  <Target className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-semibold mb-2">Pipeline commercial</h3>
                  <p className="text-muted-foreground">
                    Gérez vos opportunités commerciales dans l'onglet "Clients".
                  </p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Gestion des produits */}
          <TabsContent value="products">
            <Card>
              <CardHeader>
                <CardTitle>Gestion des produits</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">Interface de gestion complète des produits, variantes, et catalogue.</p>
                <div className="mt-4">
                  <Button>
                    <Plus className="w-4 h-4 mr-2" />
                    Ajouter un produit
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Gestion des commandes */}
          <TabsContent value="orders">
            <Card>
              <CardHeader>
                <CardTitle>Gestion des commandes</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">Suivi complet des commandes, devis, et facturation.</p>
                <div className="mt-4">
                  <Button variant="outline">
                    <FileText className="w-4 h-4 mr-2" />
                    Voir toutes les commandes
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Gestion des paiements */}
          <TabsContent value="payments">
            <PaymentManagement />
          </TabsContent>

          {/* Gestion des stocks */}
          <TabsContent value="stock">
            <InventoryManagement />
          </TabsContent>

          {/* Communication client */}
          <TabsContent value="communication">
            <SupportTickets />
          </TabsContent>

          {/* Marketing & Promotions */}
          <TabsContent value="marketing">
            <MarketingManagement />
          </TabsContent>

          {/* Analyses & Rapports */}
          <TabsContent value="analytics">
            <Card>
              <CardHeader>
                <CardTitle>Analyses & Rapports</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">Statistiques détaillées, rapports, et analyses prédictives.</p>
                <div className="mt-4 flex gap-2">
                  <Button variant="outline">
                    <Download className="w-4 h-4 mr-2" />
                    Exporter données
                  </Button>
                  <Button variant="outline">
                    <BarChart3 className="w-4 h-4 mr-2" />
                    Voir graphiques
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </section>

      <NavigationFooter />
    </div>
  );
}