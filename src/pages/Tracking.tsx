import { useState } from "react";
import { Search, Package, Clock, CheckCircle, Truck, MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import NavigationFooter from "@/components/NavigationFooter";

const trackingStatuses = {
  pending: {
    label: "En attente",
    color: "bg-yellow-500",
    icon: Clock
  },
  processing: {
    label: "En cours de traitement",
    color: "bg-blue-500",
    icon: Package
  },
  shipping: {
    label: "En livraison",
    color: "bg-orange-500",
    icon: Truck
  },
  delivered: {
    label: "Livré",
    color: "bg-green-500",
    icon: CheckCircle
  }
};

const mockTrackingData = {
  "ORD-2024-000123": {
    id: "ORD-2024-000123",
    status: "shipping",
    orderDate: "2024-01-15",
    estimatedDelivery: "2024-01-17",
    items: [
      { name: "Casque Audio Bluetooth", quantity: 1, price: 45000 },
      { name: "Câble USB-C", quantity: 2, price: 3500 }
    ],
    vendor: "TechStore Dakar",
    customer: "Amadou Diallo",
    deliveryAddress: "Dakar, Plateau, Rue 12 x 13",
    timeline: [
      {
        status: "pending",
        title: "Commande reçue",
        description: "Votre commande a été reçue et confirmée",
        timestamp: "15/01/2024 14:30",
        completed: true
      },
      {
        status: "processing",
        title: "Préparation en cours",
        description: "Votre commande est en cours de préparation",
        timestamp: "15/01/2024 16:45",
        completed: true
      },
      {
        status: "shipping",
        title: "En livraison",
        description: "Votre commande a été confiée au livreur",
        timestamp: "16/01/2024 09:15",
        completed: true
      },
      {
        status: "delivered",
        title: "Livraison",
        description: "Votre commande sera livrée aujourd'hui",
        timestamp: "17/01/2024 (estimé)",
        completed: false
      }
    ]
  }
};

export default function Tracking() {
  const [trackingId, setTrackingId] = useState("");
  const [trackingResult, setTrackingResult] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleTrack = async () => {
    if (!trackingId.trim()) return;
    
    setIsLoading(true);
    
    // Simulate API call
    setTimeout(() => {
      const result = mockTrackingData[trackingId as keyof typeof mockTrackingData];
      setTrackingResult(result || null);
      setIsLoading(false);
    }, 1000);
  };

  const StatusIcon = trackingResult ? trackingStatuses[trackingResult.status as keyof typeof trackingStatuses].icon : Package;
  const statusInfo = trackingResult ? trackingStatuses[trackingResult.status as keyof typeof trackingStatuses] : null;

  return (
    <div className="min-h-screen bg-background pb-20">
      {/* Header */}
      <header className="bg-card border-b border-border">
        <div className="px-4 py-6">
          <h1 className="text-2xl font-bold text-foreground mb-2">Suivi de commande</h1>
          <p className="text-muted-foreground">Entrez votre numéro de suivi pour voir l'état de votre commande</p>
        </div>
      </header>

      {/* Tracking Input */}
      <section className="px-4 py-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Search className="w-5 h-5" />
              Rechercher une commande
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex gap-2">
              <Input
                value={trackingId}
                onChange={(e) => setTrackingId(e.target.value)}
                placeholder="Ex: ORD-2024-000123"
                className="flex-1"
                onKeyPress={(e) => e.key === 'Enter' && handleTrack()}
              />
              <Button 
                onClick={handleTrack}
                disabled={!trackingId.trim() || isLoading}
                className="bg-vendeur-primary hover:bg-vendeur-primary/90"
              >
                {isLoading ? "Recherche..." : "Suivre"}
              </Button>
            </div>
            
            <div className="mt-4">
              <p className="text-sm text-muted-foreground mb-2">Exemples de numéros de suivi :</p>
              <div className="flex flex-wrap gap-2">
                <Badge 
                  variant="outline" 
                  className="cursor-pointer hover:bg-accent"
                  onClick={() => setTrackingId("ORD-2024-000123")}
                >
                  ORD-2024-000123
                </Badge>
                <Badge 
                  variant="outline" 
                  className="cursor-pointer hover:bg-accent"
                  onClick={() => setTrackingId("DEL-2024-000456")}
                >
                  DEL-2024-000456
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>
      </section>

      {/* Tracking Results */}
      {trackingResult && (
        <section className="px-4 pb-6">
          <Card className="mb-6">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-3">
                  <StatusIcon className="w-6 h-6" />
                  Commande {trackingResult.id}
                </CardTitle>
                {statusInfo && (
                  <Badge className={`${statusInfo.color} text-white`}>
                    {statusInfo.label}
                  </Badge>
                )}
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Date de commande</p>
                  <p className="font-medium">{trackingResult.orderDate}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Livraison estimée</p>
                  <p className="font-medium">{trackingResult.estimatedDelivery}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Vendeur</p>
                  <p className="font-medium">{trackingResult.vendor}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Adresse de livraison</p>
                  <p className="font-medium flex items-start">
                    <MapPin className="w-4 h-4 mr-1 mt-0.5 shrink-0" />
                    {trackingResult.deliveryAddress}
                  </p>
                </div>
              </div>

              {/* Order Items */}
              <div className="mb-6">
                <h3 className="font-semibold mb-3">Articles commandés</h3>
                <div className="space-y-2">
                  {trackingResult.items.map((item: any, index: number) => (
                    <div key={index} className="flex justify-between items-center p-3 bg-accent rounded-lg">
                      <div>
                        <p className="font-medium">{item.name}</p>
                        <p className="text-sm text-muted-foreground">Quantité: {item.quantity}</p>
                      </div>
                      <p className="font-semibold">{item.price.toLocaleString()} FCFA</p>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Timeline */}
          <Card>
            <CardHeader>
              <CardTitle>Historique de livraison</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {trackingResult.timeline.map((step: any, index: number) => {
                  const StepIcon = trackingStatuses[step.status as keyof typeof trackingStatuses].icon;
                  return (
                    <div key={index} className="flex items-start gap-4">
                      <div className={`p-2 rounded-full ${
                        step.completed ? 'bg-green-100 text-green-600' : 'bg-gray-100 text-gray-400'
                      }`}>
                        <StepIcon className="w-4 h-4" />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center justify-between">
                          <h4 className={`font-medium ${
                            step.completed ? 'text-foreground' : 'text-muted-foreground'
                          }`}>
                            {step.title}
                          </h4>
                          <span className="text-xs text-muted-foreground">
                            {step.timestamp}
                          </span>
                        </div>
                        <p className="text-sm text-muted-foreground mt-1">
                          {step.description}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </section>
      )}

      {trackingResult === null && trackingId && !isLoading && (
        <section className="px-4 pb-6">
          <Card>
            <CardContent className="text-center py-8">
              <Package className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">Commande introuvable</h3>
              <p className="text-muted-foreground">
                Aucune commande trouvée avec ce numéro de suivi.
                Vérifiez votre numéro et réessayez.
              </p>
            </CardContent>
          </Card>
        </section>
      )}

      <NavigationFooter />
    </div>
  );
}