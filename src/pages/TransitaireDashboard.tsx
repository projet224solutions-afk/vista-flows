import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { 
  Ship, 
  Globe, 
  Package, 
  FileText, 
  Clock,
  DollarSign,
  Truck,
  AlertCircle
} from "lucide-react";

export default function TransitaireDashboard() {
  const stats = [
    { label: "Expéditions actives", value: "47", change: "+8", icon: Ship },
    { label: "En douane", value: "12", change: "-2", icon: FileText },
    { label: "Délai moyen", value: "18 jours", change: "-3j", icon: Clock },
    { label: "Volume mensuel", value: "245 T", change: "+15%", icon: Package },
  ];

  return (
    <div className="min-h-screen bg-background">
      <div className="bg-transitaire-gradient p-8 text-white">
        <div className="container mx-auto">
          <h1 className="text-4xl font-bold mb-2">Transitaire International</h1>
          <p className="text-white/80 text-lg">Gestion des expéditions et formalités douanières</p>
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
                  <p className="text-sm text-transitaire-primary font-medium">{stat.change}</p>
                </div>
                <div className="p-3 rounded-xl bg-transitaire-accent">
                  <stat.icon className="h-6 w-6 text-transitaire-primary" />
                </div>
              </div>
            </Card>
          ))}
        </div>

        <Card className="p-6 border-l-4 border-l-transitaire-primary bg-transitaire-accent/50">
          <div className="flex items-center gap-4">
            <Globe className="h-6 w-6 text-transitaire-primary" />
            <div>
              <h4 className="font-semibold text-foreground">Logistique internationale complète</h4>
              <p className="text-sm text-muted-foreground mt-1">
                Suivi en temps réel, gestion douanière, documentation automatisée, partenaires mondiaux.
              </p>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}