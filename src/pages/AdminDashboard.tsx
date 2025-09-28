import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Users, TrendingUp, ShoppingCart, Package, Star, Activity } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useRoleRedirect } from "@/hooks/useRoleRedirect";
import { useNavigate } from "react-router-dom";
import NavigationFooter from "@/components/NavigationFooter";

export default function AdminDashboard() {
  const { user, profile, signOut } = useAuth();
  const navigate = useNavigate();
  useRoleRedirect(); // S'assurer que seuls les admins accèdent à cette page

  const handleSignOut = async () => {
    await signOut();
    navigate('/');
  };

  const stats = [
    { label: "Utilisateurs totaux", value: "12,534", icon: Users, color: "text-blue-500", change: "+12%" },
    { label: "Revenus mensuels", value: "45.2M FCFA", icon: TrendingUp, color: "text-green-500", change: "+8%" },
    { label: "Transactions", value: "2,847", icon: ShoppingCart, color: "text-purple-500", change: "+15%" },
    { label: "Produits actifs", value: "8,923", icon: Package, color: "text-orange-500", change: "+5%" }
  ];

  const platformStats = [
    { category: 'Clients', count: 8420, percentage: 67 },
    { category: 'Vendeurs', count: 2156, percentage: 17 },
    { category: 'Livreurs', count: 1234, percentage: 10 },
    { category: 'Taxi-Motos', count: 567, percentage: 5 },
    { category: 'Transitaires', count: 157, percentage: 1 }
  ];

  const recentActivity = [
    {
      type: 'user_signup',
      description: 'Nouvel utilisateur vendeur inscrit',
      user: 'Fatou Commerce',
      time: '2 min',
      status: 'success'
    },
    {
      type: 'transaction',
      description: 'Transaction importante',
      user: 'Amadou Tech Store',
      amount: '125,000 FCFA',
      time: '5 min',
      status: 'info'
    },
    {
      type: 'alert',
      description: 'Alerte sécurité résolue',
      user: 'Système',
      time: '12 min',
      status: 'warning'
    }
  ];

  return (
    <div className="min-h-screen bg-background pb-20">
      {/* Header */}
      <header className="bg-card border-b border-border">
        <div className="px-4 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-foreground">Dashboard Administrateur</h1>
              <p className="text-muted-foreground">
                Vue d'ensemble de la plateforme - {profile?.first_name || user?.email}
              </p>
            </div>
            <Button variant="outline" onClick={handleSignOut}>
              Se déconnecter
            </Button>
          </div>
        </div>
      </header>

      {/* Main Stats */}
      <section className="px-4 py-6">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {stats.map((stat, index) => {
            const Icon = stat.icon;
            return (
              <Card key={index} className="hover:shadow-md transition-shadow cursor-pointer">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">{stat.label}</p>
                      <p className="text-2xl font-bold">{stat.value}</p>
                      <p className="text-xs text-green-600 font-medium">{stat.change}</p>
                    </div>
                    <Icon className={`w-8 h-8 ${stat.color}`} />
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </section>

      {/* Platform Distribution */}
      <section className="px-4 py-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="w-5 h-5" />
              Répartition des utilisateurs
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {platformStats.map((stat, index) => (
                <div key={index} className="flex items-center justify-between p-4 bg-accent rounded-lg">
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="font-medium">{stat.category}</h4>
                      <span className="text-sm text-muted-foreground">{stat.percentage}%</span>
                    </div>
                    <div className="w-full bg-muted rounded-full h-2">
                      <div 
                        className="bg-primary h-2 rounded-full transition-all duration-300" 
                        style={{ width: `${stat.percentage}%` }}
                      ></div>
                    </div>
                  </div>
                  <div className="text-right ml-4">
                    <p className="text-2xl font-bold">{stat.count.toLocaleString()}</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </section>

      {/* Recent Activity */}
      <section className="px-4 py-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="w-5 h-5" />
              Activité récente
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {recentActivity.map((activity, index) => (
                <div key={index} className="flex items-center gap-4 p-4 border rounded-lg">
                  <div className={`w-3 h-3 rounded-full ${
                    activity.status === 'success' ? 'bg-green-500' :
                    activity.status === 'info' ? 'bg-blue-500' : 'bg-orange-500'
                  }`}></div>
                  
                  <div className="flex-1">
                    <p className="font-medium">{activity.description}</p>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <span>{activity.user}</span>
                      {activity.amount && <span>• {activity.amount}</span>}
                    </div>
                  </div>
                  
                  <span className="text-sm text-muted-foreground">{activity.time}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </section>

      {/* Management Platform Overview */}
      <section className="px-4 py-2 mb-6">
        <Card className="bg-gradient-to-r from-indigo-50 to-blue-50 border-0">
          <CardContent className="p-6">
            <div className="text-center">
              <Star className="w-12 h-12 mx-auto mb-4 text-indigo-500" />
              <h3 className="text-xl font-bold mb-2">Plateforme de Gestion Globale</h3>
              <p className="text-muted-foreground mb-4">
                Analytics avancées et contrôle total pour CEO/Administrateur
              </p>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-indigo-500 rounded-full"></div>
                  <span>Tableau de bord exécutif</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-indigo-500 rounded-full"></div>
                  <span>Analytics en temps réel</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-indigo-500 rounded-full"></div>
                  <span>Gestion des utilisateurs</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-indigo-500 rounded-full"></div>
                  <span>Rapports financiers</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-indigo-500 rounded-full"></div>
                  <span>Contrôle qualité</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-indigo-500 rounded-full"></div>
                  <span>Sécurité avancée</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </section>

      <NavigationFooter />
    </div>
  );
}