import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { 
  MapPin, 
  Clock, 
  DollarSign, 
  Car, 
  Users, 
  Star,
  Navigation,
  Phone
} from "lucide-react";

export default function TaxiDashboard() {
  const stats = [
    { label: "Courses aujourd'hui", value: "8", change: "+2", icon: Car },
    { label: "Gains du jour", value: "180 €", change: "+25%", icon: DollarSign },
    { label: "Temps d'attente moy.", value: "5 min", change: "-2 min", icon: Clock },
    { label: "Note moyenne", value: "4.9/5", change: "+0.1", icon: Star },
  ];

  return (
    <div className="min-h-screen bg-background">
      <div className="bg-taxi-gradient p-8 text-black">
        <div className="container mx-auto">
          <h1 className="text-4xl font-bold mb-2">Dashboard Taxi/Moto</h1>
          <p className="text-black/70 text-lg">Transport urbain intelligent et sécurisé</p>
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
                  <p className="text-sm text-taxi-primary font-medium">{stat.change}</p>
                </div>
                <div className="p-3 rounded-xl bg-taxi-accent">
                  <stat.icon className="h-6 w-6 text-taxi-primary" />
                </div>
              </div>
            </Card>
          ))}
        </div>

        <Card className="p-6 border-l-4 border-l-taxi-primary bg-taxi-accent/50">
          <div className="flex items-center gap-4">
            <Navigation className="h-6 w-6 text-taxi-primary" />
            <div>
              <h4 className="font-semibold text-foreground">Interface taxi en développement</h4>
              <p className="text-sm text-muted-foreground mt-1">
                Fonctionnalités complètes : GPS temps réel, tarification dynamique, sécurité avancée.
              </p>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}