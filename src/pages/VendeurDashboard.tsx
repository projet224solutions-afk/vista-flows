import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Package, TrendingUp, ShoppingCart, Star, Eye, Plus } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useNavigate } from "react-router-dom";
import NavigationFooter from "@/components/NavigationFooter";

export default function VendeurDashboard() {
  const { user, profile, signOut } = useAuth();
  const navigate = useNavigate();

  const handleSignOut = async () => {
    await signOut();
    navigate('/');
  };

  const stats = [
    { label: "Produits actifs", value: "24", icon: Package, color: "text-blue-500" },
    { label: "Ventes ce mois", value: "156", icon: ShoppingCart, color: "text-green-500" },
    { label: "Revenus", value: "2.4M FCFA", icon: TrendingUp, color: "text-purple-500" },
    { label: "Note moyenne", value: "4.8", icon: Star, color: "text-yellow-500" }
  ];

  const recentOrders = [
    {
      id: 'CMD-2024-156',
      customer: 'Marie Diallo',
      product: 'Casque Bluetooth',
      amount: '45,000 FCFA',
      status: 'À préparer',
      date: '15 Jan 2024'
    },
    {
      id: 'CMD-2024-155',
      customer: 'Amadou Ba',
      product: 'Montre connectée',
      amount: '85,000 FCFA',
      status: 'Expédiée',
      date: '14 Jan 2024'
    }
  ];

  const topProducts = [
    { name: 'Smartphone Galaxy A54', views: 234, sales: 12 },
    { name: 'Casque Sony WH-1000XM5', views: 189, sales: 8 },
    { name: 'Laptop HP Pavilion', views: 156, sales: 5 }
  ];

  return (
    <div className="min-h-screen bg-background pb-20">
      {/* Header */}
      <header className="bg-card border-b border-border">
        <div className="px-4 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-foreground">Dashboard Vendeur</h1>
              <p className="text-muted-foreground">
                Bienvenue {profile?.first_name || user?.email} !
              </p>
            </div>
            <div className="flex gap-2">
              <Button className="bg-green-500 hover:bg-green-600">
                <Plus className="w-4 h-4 mr-2" />
                Nouveau produit
              </Button>
              <Button variant="outline" onClick={handleSignOut}>
                Se déconnecter
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Stats Cards */}
      <section className="px-4 py-6">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {stats.map((stat, index) => {
            const Icon = stat.icon;
            return (
              <Card key={index}>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">{stat.label}</p>
                      <p className="text-2xl font-bold">{stat.value}</p>
                    </div>
                    <Icon className={`w-8 h-8 ${stat.color}`} />
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </section>

      {/* Recent Orders */}
      <section className="px-4 py-2">
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
                      <span className={`px-2 py-1 rounded-full text-xs ${
                        order.status === 'Expédiée' 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-orange-100 text-orange-800'
                      }`}>
                        {order.status}
                      </span>
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
      </section>

      {/* Top Products */}
      <section className="px-4 py-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5" />
              Produits les plus populaires
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
                        {product.views} vues
                      </span>
                      <span className="flex items-center gap-1">
                        <ShoppingCart className="w-4 h-4" />
                        {product.sales} ventes
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </section>

      <NavigationFooter />
    </div>
  );
}