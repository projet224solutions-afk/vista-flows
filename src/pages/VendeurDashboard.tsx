import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { 
  TrendingUp, 
  Package, 
  Users, 
  DollarSign, 
  ShoppingCart, 
  BarChart3,
  AlertCircle,
  Plus
} from "lucide-react";

export default function VendeurDashboard() {
  const stats = [
    { label: "Chiffre d'affaires", value: "125,430 €", change: "+12.5%", icon: DollarSign },
    { label: "Commandes", value: "1,247", change: "+8.2%", icon: ShoppingCart },
    { label: "Produits", value: "89", change: "+3", icon: Package },
    { label: "Clients actifs", value: "2,156", change: "+15.3%", icon: Users },
  ];

  return (
    <div className="min-h-screen bg-background">
      <div className="bg-vendeur-gradient p-8 text-white">
        <div className="container mx-auto">
          <h1 className="text-4xl font-bold mb-2">Dashboard Vendeur</h1>
          <p className="text-white/80 text-lg">Gérez votre activité commerciale en temps réel</p>
        </div>
      </div>

      <div className="container mx-auto px-6 py-8">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {stats.map((stat, index) => (
            <Card key={index} className="p-6 border-0 shadow-elegant hover:shadow-glow transition-all duration-300">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground mb-1">{stat.label}</p>
                  <p className="text-2xl font-bold text-foreground">{stat.value}</p>
                  <p className="text-sm text-vendeur-secondary font-medium">{stat.change}</p>
                </div>
                <div className="p-3 rounded-xl bg-vendeur-accent">
                  <stat.icon className="h-6 w-6 text-vendeur-primary" />
                </div>
              </div>
            </Card>
          ))}
        </div>

        {/* Action Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
          <Card className="p-6 border-0 shadow-elegant">
            <div className="flex items-center gap-4 mb-4">
              <Package className="h-8 w-8 text-vendeur-primary" />
              <div>
                <h3 className="text-lg font-semibold">Gestion Produits</h3>
                <p className="text-sm text-muted-foreground">Catalogue & Stock</p>
              </div>
            </div>
            <Button className="w-full bg-vendeur-primary hover:bg-vendeur-primary/90 text-white">
              <Plus className="h-4 w-4 mr-2" />
              Ajouter un produit
            </Button>
          </Card>

          <Card className="p-6 border-0 shadow-elegant">
            <div className="flex items-center gap-4 mb-4">
              <Users className="h-8 w-8 text-vendeur-primary" />
              <div>
                <h3 className="text-lg font-semibold">CRM Client</h3>
                <p className="text-sm text-muted-foreground">Relations Client</p>
              </div>
            </div>
            <Button className="w-full bg-vendeur-primary hover:bg-vendeur-primary/90 text-white">
              <Plus className="h-4 w-4 mr-2" />
              Nouveau prospect
            </Button>
          </Card>

          <Card className="p-6 border-0 shadow-elegant">
            <div className="flex items-center gap-4 mb-4">
              <BarChart3 className="h-8 w-8 text-vendeur-primary" />
              <div>
                <h3 className="text-lg font-semibold">Rapports</h3>
                <p className="text-sm text-muted-foreground">Analytics & KPIs</p>
              </div>
            </div>
            <Button className="w-full bg-vendeur-primary hover:bg-vendeur-primary/90 text-white">
              Voir les rapports
            </Button>
          </Card>
        </div>

        {/* Alert */}
        <Card className="p-6 border-l-4 border-l-vendeur-secondary bg-vendeur-accent/50">
          <div className="flex items-center gap-4">
            <AlertCircle className="h-6 w-6 text-vendeur-secondary" />
            <div>
              <h4 className="font-semibold text-foreground">Fonctionnalités complètes disponibles</h4>
              <p className="text-sm text-muted-foreground mt-1">
                Connectez votre projet à Supabase pour débloquer toutes les fonctionnalités : CRM, gestion des stocks, 
                paiements intégrés, analytics en temps réel et bien plus.
              </p>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}