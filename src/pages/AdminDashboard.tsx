import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { 
  BarChart3, 
  Users, 
  DollarSign, 
  Package, 
  TrendingUp,
  Shield,
  Settings,
  Database
} from "lucide-react";

export default function AdminDashboard() {
  const stats = [
    { label: "Utilisateurs totaux", value: "12,456", change: "+18%", icon: Users },
    { label: "Revenus mensuels", value: "€ 2.4M", change: "+22%", icon: DollarSign },
    { label: "Transactions", value: "45,678", change: "+12%", icon: TrendingUp },
    { label: "Produits actifs", value: "8,934", change: "+5%", icon: Package },
  ];

  return (
    <div className="min-h-screen bg-background">
      <div className="bg-admin-gradient p-8 text-white">
        <div className="container mx-auto">
          <h1 className="text-4xl font-bold mb-2">Dashboard Admin/PDG</h1>
          <p className="text-white/80 text-lg">Vue d'ensemble et pilotage stratégique</p>
        </div>
      </div>

      <div className="container mx-auto px-6 py-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {stats.map((stat, index) => (
            <Card key={index} className="p-6 border-0 shadow-elegant hover:shadow-glow transition-all duration-300">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground mb-1">{stat.label}</p>
                  <p className="text-2xl font-bold text-foreground">{stat.value}</p>
                  <p className="text-sm text-admin-secondary font-medium">{stat.change}</p>
                </div>
                <div className="p-3 rounded-xl bg-admin-accent">
                  <stat.icon className="h-6 w-6 text-admin-primary" />
                </div>
              </div>
            </Card>
          ))}
        </div>

        <Card className="p-6 border-l-4 border-l-admin-secondary bg-admin-accent/50">
          <div className="flex items-center gap-4">
            <Database className="h-6 w-6 text-admin-secondary" />
            <div>
              <h4 className="font-semibold text-foreground">Plateforme de gestion globale</h4>
              <p className="text-sm text-muted-foreground mt-1">
                Analytics avancés, gestion utilisateurs, contrôle financier, supervision opérationnelle.
              </p>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}