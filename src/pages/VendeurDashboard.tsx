import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import {
  Package, TrendingUp, ShoppingCart, Star, Users,
  BarChart3, CreditCard, Truck, MessageSquare, Megaphone,
  FileText, Settings, AlertTriangle, DollarSign, Target,
  Activity, LogOut
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useRoleRedirect } from "@/hooks/useRoleRedirect";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { useUserInfo } from "@/hooks/useUserInfo";

export default function VendeurDashboard() {
  const { user, profile, signOut } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  useRoleRedirect();
  const { userInfo } = useUserInfo();
  const [activeTab, setActiveTab] = useState("dashboard");

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

  const mainStats = [
    {
      label: "Chiffre d'affaires",
      value: "2.4M GNF",
      change: "+12%",
      icon: DollarSign,
      color: "text-green-600"
    },
    {
      label: "Commandes ce mois",
      value: "156",
      change: "+8%",
      icon: ShoppingCart,
      color: "text-blue-600"
    },
    {
      label: "Clients actifs",
      value: "89",
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

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50">
      {/* Header */}
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
            </div>
            <div className="flex items-center gap-4">
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

      {/* Statistiques */}
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
                    <div className={`w-16 h-16 bg-gradient-to-br ${colors[index]} rounded-2xl flex items-center justify-center shadow-xl group-hover:scale-110 transition-transform duration-300`}>
                      <Icon className="w-8 h-8 text-white" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </section>

      {/* Contenu principal */}
      <section className="px-8 py-4">
        <Card className="bg-white shadow-2xl">
          <CardHeader>
            <CardTitle className="text-2xl">Gestion de l'activité</CardTitle>
            <CardDescription>Gérez vos produits, commandes et clients</CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="grid w-full grid-cols-5">
                <TabsTrigger value="dashboard">
                  <BarChart3 className="w-4 h-4 mr-2" />
                  Dashboard
                </TabsTrigger>
                <TabsTrigger value="products">
                  <Package className="w-4 h-4 mr-2" />
                  Produits
                </TabsTrigger>
                <TabsTrigger value="orders">
                  <ShoppingCart className="w-4 h-4 mr-2" />
                  Commandes
                </TabsTrigger>
                <TabsTrigger value="clients">
                  <Users className="w-4 h-4 mr-2" />
                  Clients
                </TabsTrigger>
                <TabsTrigger value="settings">
                  <Settings className="w-4 h-4 mr-2" />
                  Paramètres
                </TabsTrigger>
              </TabsList>

              <TabsContent value="dashboard" className="space-y-4 pt-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Aperçu des performances</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-muted-foreground">
                      Bienvenue dans votre espace vendeur. Votre tableau de bord affiche vos principales métriques.
                    </p>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="products" className="space-y-4 pt-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Gestion des produits</CardTitle>
                    <CardDescription>Ajoutez et gérez votre catalogue de produits</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Button className="w-full">
                      <Package className="w-4 h-4 mr-2" />
                      Ajouter un nouveau produit
                    </Button>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="orders" className="space-y-4 pt-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Gestion des commandes</CardTitle>
                    <CardDescription>Suivez et traitez vos commandes</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <p className="text-muted-foreground">Aucune commande récente</p>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="clients" className="space-y-4 pt-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Gestion des clients</CardTitle>
                    <CardDescription>Gérez votre base de clients</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <p className="text-muted-foreground">Aucun client enregistré</p>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="settings" className="space-y-4 pt-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Paramètres du compte</CardTitle>
                    <CardDescription>Configurez votre espace vendeur</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div>
                        <h3 className="font-semibold mb-2">Informations du compte</h3>
                        <p className="text-sm text-muted-foreground">Email: {user?.email}</p>
                        <p className="text-sm text-muted-foreground">Nom: {profile?.first_name} {profile?.last_name}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
