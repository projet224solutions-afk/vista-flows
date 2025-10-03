import { useState } from "react";
import { User, Settings, ShoppingBag, History, LogOut, Edit, Camera } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/hooks/useAuth";
import { useNavigate } from "react-router-dom";
import QuickFooter from "@/components/QuickFooter";

const userTypes = {
  client: {
    label: "Client",
    description: "Acheteur sur la plateforme",
    color: "bg-client-primary"
  },
  vendeur: {
    label: "Vendeur",
    description: "Vendeur de produits",
    color: "bg-vendeur-primary"
  },
  livreur: {
    label: "Livreur",
    description: "Livreur de commandes",
    color: "bg-livreur-primary"
  },
  taxi: {
    label: "Taxi-Moto",
    description: "Conducteur de taxi-moto",
    color: "bg-taxi-primary"
  },
  transitaire: {
    label: "Transitaire",
    description: "Transitaire international",
    color: "bg-transitaire-primary"
  }
};

const menuItems = [
  {
    id: 'orders',
    title: 'Mes commandes',
    description: 'Voir toutes mes commandes',
    icon: ShoppingBag,
    badge: '5'
  },
  {
    id: 'history',
    title: 'Historique',
    description: 'Activité récente',
    icon: History
  },
  {
    id: 'settings',
    title: 'Paramètres',
    description: 'Gérer mon compte',
    icon: Settings
  }
];

const recentActivity = [
  {
    id: 1,
    type: 'order',
    title: 'Commande #ORD-2024-000123',
    description: 'Casque Audio Bluetooth - 45 000 FCFA',
    timestamp: '2024-01-15 14:30',
    status: 'En livraison'
  },
  {
    id: 2,
    type: 'review',
    title: 'Avis laissé',
    description: 'TechStore Dakar - 5 étoiles',
    timestamp: '2024-01-14 09:15',
    status: 'Publié'
  },
  {
    id: 3,
    type: 'favorite',
    title: 'Ajouté aux favoris',
    description: 'Montre Connectée Samsung',
    timestamp: '2024-01-13 16:45',
    status: 'Sauvegardé'
  }
];

export default function Profil() {
  const { user, profile, signOut } = useAuth();
  const navigate = useNavigate();
  const [isEditing, setIsEditing] = useState(false);

  // Authentication check
  if (!user) {
    return (
      <div className="min-h-screen bg-background pb-20">
        <header className="bg-card border-b border-border">
          <div className="px-4 py-6">
            <h1 className="text-2xl font-bold text-foreground">Profil</h1>
          </div>
        </header>

        <section className="px-4 py-8">
          <Card>
            <CardContent className="text-center py-12">
              <User className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
              <h2 className="text-xl font-semibold mb-2">Connectez-vous</h2>
              <p className="text-muted-foreground mb-6">
                Vous devez vous connecter pour accéder à votre profil
              </p>
              <Button 
                onClick={() => navigate('/auth')}
                className="bg-vendeur-primary hover:bg-vendeur-primary/90"
              >
                Se connecter
              </Button>
            </CardContent>
          </Card>
        </section>
      </div>
    );
  }

  const userTypeInfo = profile?.role ? userTypes[profile.role as keyof typeof userTypes] : userTypes.client;

  const handleSignOut = async () => {
    await signOut();
    navigate('/');
  };

  return (
    <div className="min-h-screen bg-background pb-20">
      {/* Header */}
      <header className="bg-card border-b border-border">
        <div className="px-4 py-6">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-bold text-foreground">Mon Profil</h1>
            <div className="flex items-center gap-2">
              {profile?.role === 'vendeur' && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => navigate('/vendeur')}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-2"><path d="m12 19-7-7 7-7"/><path d="M19 12H5"/></svg>
                  Retour
                </Button>
              )}
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setIsEditing(!isEditing)}
              >
                <Edit className="w-5 h-5" />
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Profile Info */}
      <section className="px-4 py-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-start gap-4">
              <div className="relative">
                <Avatar className="w-20 h-20">
                  <AvatarImage src={profile?.avatar_url || ""} />
                  <AvatarFallback className="text-xl">
                    {profile?.first_name?.[0] || user.email?.[0]?.toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                {isEditing && (
                  <Button
                    size="icon"
                    variant="secondary"
                    className="absolute -bottom-2 -right-2 h-8 w-8 rounded-full"
                  >
                    <Camera className="w-4 h-4" />
                  </Button>
                )}
              </div>
              
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <h2 className="text-xl font-bold">
                    {profile?.first_name && profile?.last_name 
                      ? `${profile.first_name} ${profile.last_name}`
                      : user.email
                    }
                  </h2>
                  <Badge className={`${userTypeInfo.color} text-white text-xs`}>
                    {userTypeInfo.label}
                  </Badge>
                </div>
                
                <p className="text-muted-foreground mb-2">{user.email}</p>
                
                {profile?.phone && (
                  <p className="text-sm text-muted-foreground mb-2">{profile.phone}</p>
                )}
                
                <p className="text-sm text-muted-foreground">
                  {userTypeInfo.description}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </section>

      {/* Menu Items */}
      <section className="px-4 py-2">
        <div className="space-y-2">
          {menuItems.map((item) => {
            const Icon = item.icon;
            return (
              <Card key={item.id} className="cursor-pointer hover:shadow-elegant transition-all">
                <CardContent className="p-4">
                  <div className="flex items-center gap-4">
                    <div className="p-2 bg-accent rounded-lg">
                      <Icon className="w-5 h-5" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <h3 className="font-medium">{item.title}</h3>
                        {item.badge && (
                          <Badge variant="secondary" className="text-xs">
                            {item.badge}
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground">{item.description}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </section>

      {/* Recent Activity */}
      <section className="px-4 py-6">
        <Card>
          <CardHeader>
            <CardTitle>Activité récente</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {recentActivity.map((activity) => (
                <div key={activity.id} className="flex items-start gap-3 p-3 bg-accent rounded-lg">
                  <div className="w-2 h-2 bg-vendeur-primary rounded-full mt-2"></div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-1">
                      <h4 className="font-medium text-sm">{activity.title}</h4>
                      <Badge variant="outline" className="text-xs">
                        {activity.status}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground mb-1">{activity.description}</p>
                    <p className="text-xs text-muted-foreground">{activity.timestamp}</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </section>

      {/* Sign Out */}
      <section className="px-4 pb-6">
        <Button
          variant="outline"
          className="w-full text-destructive hover:text-destructive hover:bg-destructive/10"
          onClick={handleSignOut}
        >
          <LogOut className="w-4 h-4 mr-2" />
          Se déconnecter
        </Button>
      </section>

      {/* Footer de navigation */}
      <QuickFooter />
    </div>
  );
}