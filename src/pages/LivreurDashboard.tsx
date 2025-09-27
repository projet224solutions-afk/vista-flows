import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { 
  MapPin, 
  Package, 
  Clock, 
  DollarSign, 
  Truck, 
  AlertTriangle,
  CheckCircle,
  Navigation
} from "lucide-react";

export default function LivreurDashboard() {
  const stats = [
    { label: "Livraisons aujourd'hui", value: "12", change: "+3", icon: Package },
    { label: "Gains du jour", value: "245 €", change: "+18%", icon: DollarSign },
    { label: "Temps de livraison moy.", value: "28 min", change: "-5%", icon: Clock },
    { label: "Note satisfaction", value: "4.8/5", change: "+0.2", icon: CheckCircle },
  ];

  const deliveries = [
    { id: "LIV-001", address: "15 Rue de la Paix, 75001 Paris", time: "14:30", status: "en_cours", amount: "25 €" },
    { id: "LIV-002", address: "89 Avenue Foch, 75016 Paris", time: "15:15", status: "attente", amount: "42 €" },
    { id: "LIV-003", address: "32 Boulevard Saint-Germain, 75005 Paris", time: "16:00", status: "attente", amount: "18 €" },
  ];

  return (
    <div className="min-h-screen bg-background">
      <div className="bg-livreur-gradient p-8 text-white">
        <div className="container mx-auto">
          <h1 className="text-4xl font-bold mb-2">Dashboard Livreur</h1>
          <p className="text-white/80 text-lg">Optimisez vos tournées et maximisez vos gains</p>
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
                  <p className="text-sm text-livreur-primary font-medium">{stat.change}</p>
                </div>
                <div className="p-3 rounded-xl bg-livreur-accent">
                  <stat.icon className="h-6 w-6 text-livreur-primary" />
                </div>
              </div>
            </Card>
          ))}
        </div>

        {/* Map and Deliveries */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          <Card className="p-6 border-0 shadow-elegant">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-semibold">Carte des livraisons</h3>
              <Button size="sm" className="bg-livreur-primary hover:bg-livreur-primary/90 text-white">
                <Navigation className="h-4 w-4 mr-2" />
                GPS
              </Button>
            </div>
            <div className="h-64 bg-livreur-accent rounded-lg flex items-center justify-center">
              <div className="text-center">
                <MapPin className="h-12 w-12 text-livreur-primary mx-auto mb-4" />
                <p className="text-muted-foreground">Carte interactive GPS</p>
                <p className="text-sm text-muted-foreground mt-2">
                  Fonctionnalité disponible avec Supabase
                </p>
              </div>
            </div>
          </Card>

          <Card className="p-6 border-0 shadow-elegant">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-semibold">Livraisons en attente</h3>
              <span className="px-3 py-1 bg-livreur-accent text-livreur-primary text-sm rounded-full font-medium">
                {deliveries.length} livraisons
              </span>
            </div>
            <div className="space-y-4">
              {deliveries.map((delivery) => (
                <div key={delivery.id} className="flex items-center justify-between p-4 bg-background border rounded-lg">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="font-semibold text-sm">{delivery.id}</span>
                      <span className={`px-2 py-1 text-xs rounded-full ${
                        delivery.status === 'en_cours' 
                          ? 'bg-livreur-primary text-white' 
                          : 'bg-muted text-muted-foreground'
                      }`}>
                        {delivery.status === 'en_cours' ? 'En cours' : 'En attente'}
                      </span>
                    </div>
                    <p className="text-sm text-muted-foreground mb-1">{delivery.address}</p>
                    <p className="text-sm font-medium text-foreground">{delivery.time} • {delivery.amount}</p>
                  </div>
                  <Button size="sm" variant="outline" className="border-livreur-primary text-livreur-primary hover:bg-livreur-primary hover:text-white">
                    <Truck className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          </Card>
        </div>

        {/* Alert */}
        <Card className="p-6 border-l-4 border-l-livreur-primary bg-livreur-accent/50">
          <div className="flex items-center gap-4">
            <AlertTriangle className="h-6 w-6 text-livreur-primary" />
            <div>
              <h4 className="font-semibold text-foreground">Fonctionnalités temps réel disponibles</h4>
              <p className="text-sm text-muted-foreground mt-1">
                Activez Supabase pour débloquer : géolocalisation GPS, paiements intégrés Mobile Money, 
                optimisation automatique des tournées, communication client temps réel.
              </p>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}