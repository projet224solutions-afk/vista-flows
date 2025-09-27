import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { 
  Shield, 
  Users, 
  AlertTriangle, 
  CheckCircle, 
  MapPin,
  Radio,
  Badge,
  FileText
} from "lucide-react";

export default function SyndicatDashboard() {
  const stats = [
    { label: "Mototaxis actifs", value: "156", change: "+12", icon: Users },
    { label: "En mission", value: "89", change: "+5", icon: MapPin },
    { label: "Alertes sécurité", value: "2", change: "-3", icon: AlertTriangle },
    { label: "Badges valides", value: "98%", change: "+2%", icon: Badge },
  ];

  return (
    <div className="min-h-screen bg-background">
      <div className="bg-syndicat-gradient p-8 text-white">
        <div className="container mx-auto">
          <h1 className="text-4xl font-bold mb-2">Bureau Syndicat</h1>
          <p className="text-white/80 text-lg">Supervision et sécurité des mototaxis</p>
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
                  <p className="text-sm text-syndicat-primary font-medium">{stat.change}</p>
                </div>
                <div className="p-3 rounded-xl bg-syndicat-accent">
                  <stat.icon className="h-6 w-6 text-syndicat-primary" />
                </div>
              </div>
            </Card>
          ))}
        </div>

        <Card className="p-6 border-l-4 border-l-syndicat-primary bg-syndicat-accent/50">
          <div className="flex items-center gap-4">
            <Shield className="h-6 w-6 text-syndicat-primary" />
            <div>
              <h4 className="font-semibold text-foreground">Système de supervision avancé</h4>
              <p className="text-sm text-muted-foreground mt-1">
                Gestion des badges, détection des doublons, alertes SOS, communication inter-syndicats.
              </p>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}