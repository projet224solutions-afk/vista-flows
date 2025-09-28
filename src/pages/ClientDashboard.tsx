import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ShoppingBag, Heart, MapPin, User, Star, Package } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useRoleRedirect } from "@/hooks/useRoleRedirect";
import { useNavigate } from "react-router-dom";
import NavigationFooter from "@/components/NavigationFooter";

export default function ClientDashboard() {
  const { user, profile, signOut } = useAuth();
  const navigate = useNavigate();
  useRoleRedirect(); // S'assurer que seuls les clients/admins accèdent à cette page

  const handleSignOut = async () => {
    await signOut();
    navigate('/');
  };

  const recentOrders = [
    {
      id: 'ORD-2024-001',
      status: 'En livraison',
      total: '45,000 FCFA',
      items: 'Casque Audio, Chargeur',
      date: '15 Jan 2024'
    },
    {
      id: 'ORD-2024-002',
      status: 'Livré',
      total: '23,500 FCFA',
      items: 'T-shirt, Pantalon',
      date: '12 Jan 2024'
    }
  ];

  const favoriteStores = [
    { name: 'TechStore Dakar', rating: 4.8, category: 'Électronique' },
    { name: 'Fashion Plus', rating: 4.6, category: 'Vêtements' },
    { name: 'Home & Garden', rating: 4.7, category: 'Maison' }
  ];

  return (
    <div className="min-h-screen bg-background pb-20">
      {/* Header */}
      <header className="bg-card border-b border-border">
        <div className="px-4 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-foreground">Tableau de bord Client</h1>
              <p className="text-muted-foreground">
                Bonjour {profile?.first_name || user?.email} !
              </p>
            </div>
            <Button variant="outline" onClick={handleSignOut}>
              Se déconnecter
            </Button>
          </div>
        </div>
      </header>

      {/* Quick Actions */}
      <section className="px-4 py-6">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => navigate('/marketplace')}>
            <CardContent className="p-4 text-center">
              <ShoppingBag className="w-8 h-8 mx-auto mb-2 text-primary" />
              <p className="text-sm font-medium">Marketplace</p>
            </CardContent>
          </Card>
          
          <Card className="cursor-pointer hover:shadow-md transition-shadow">
            <CardContent className="p-4 text-center">
              <Heart className="w-8 h-8 mx-auto mb-2 text-red-500" />
              <p className="text-sm font-medium">Favoris</p>
            </CardContent>
          </Card>
          
          <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => navigate('/tracking')}>
            <CardContent className="p-4 text-center">
              <MapPin className="w-8 h-8 mx-auto mb-2 text-blue-500" />
              <p className="text-sm font-medium">Suivi</p>
            </CardContent>
          </Card>
          
          <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => navigate('/profil')}>
            <CardContent className="p-4 text-center">
              <User className="w-8 h-8 mx-auto mb-2 text-purple-500" />
              <p className="text-sm font-medium">Profil</p>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Recent Orders */}
      <section className="px-4 py-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Package className="w-5 h-5" />
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
                        order.status === 'Livré' 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-blue-100 text-blue-800'
                      }`}>
                        {order.status}
                      </span>
                    </div>
                    <p className="text-sm text-muted-foreground">{order.items}</p>
                    <p className="text-xs text-muted-foreground">{order.date}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold">{order.total}</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </section>

      {/* Favorite Stores */}
      <section className="px-4 py-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Heart className="w-5 h-5" />
              Boutiques favorites
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {favoriteStores.map((store, index) => (
                <div key={index} className="flex items-center justify-between p-4 bg-accent rounded-lg">
                  <div className="flex-1">
                    <h4 className="font-medium mb-1">{store.name}</h4>
                    <p className="text-sm text-muted-foreground">{store.category}</p>
                  </div>
                  <div className="flex items-center gap-1">
                    <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                    <span className="text-sm font-medium">{store.rating}</span>
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