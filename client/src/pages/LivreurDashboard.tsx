import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from "@/hooks/useAuth";
import { useDeliveries } from "@/hooks/useSupabaseQuery";
import { 
  MapPin, 
  Package, 
  Clock, 
  DollarSign, 
  Truck, 
  AlertTriangle,
  CheckCircle,
  Navigation,
  Star,
  MessageSquare
} from "lucide-react";
import SimpleCommunicationInterface from "@/components/communication/SimpleCommunicationInterface";

export default function LivreurDashboard() {
  const { profile, signOut } = useAuth();
  const { data: deliveries, loading } = useDeliveries(profile?.id);

  // Calculate stats from deliveries
  const todayDeliveries = deliveries?.filter(delivery => {
    const today = new Date();
    const deliveryDate = new Date(delivery.created_at);
    return deliveryDate.toDateString() === today.toDateString();
  }).length || 0;

  const completedDeliveries = deliveries?.filter(d => d.status === 'delivered').length || 0;
  const pendingDeliveries = deliveries?.filter(d => ['pending', 'assigned', 'picked_up', 'in_transit'].includes(d.status)).length || 0;
  
  const todayEarnings = deliveries?.filter(delivery => {
    const today = new Date();
    const deliveryDate = new Date(delivery.created_at);
    return deliveryDate.toDateString() === today.toDateString() && delivery.status === 'delivered';
  }).reduce((sum, delivery) => sum + (delivery.delivery_fee || 0), 0) || 0;

  const avgRating = 4.8; // This would come from reviews in a real implementation

  const stats = [
    { label: "Livraisons aujourd'hui", value: todayDeliveries.toString(), change: "+3", icon: Package },
    { label: "Gains du jour", value: `${todayEarnings} €`, change: "+18%", icon: DollarSign },
    { label: "Temps de livraison moy.", value: "28 min", change: "-5%", icon: Clock },
    { label: "Note satisfaction", value: `${avgRating}/5`, change: "+0.2", icon: CheckCircle },
  ];

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'delivered': return 'bg-green-500';
      case 'in_transit': return 'bg-livreur-primary';
      case 'picked_up': return 'bg-yellow-500';
      case 'assigned': return 'bg-orange-500';
      default: return 'bg-muted';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'pending': return 'En attente';
      case 'assigned': return 'Assignée';
      case 'picked_up': return 'Récupérée';
      case 'in_transit': return 'En cours';
      case 'delivered': return 'Livrée';
      case 'cancelled': return 'Annulée';
      default: return status;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <Truck className="h-12 w-12 animate-bounce mx-auto mb-4 text-livreur-primary" />
          <p>Chargement des données...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-20">
      <div className="bg-livreur-gradient p-8 text-white">
        <div className="container mx-auto flex justify-between items-center">
          <div>
            <h1 className="text-4xl font-bold mb-2">Dashboard Livreur</h1>
            <p className="text-white/80 text-lg">
              Bienvenue {profile?.first_name || 'Livreur'} - Optimisez vos tournées et maximisez vos gains
            </p>
          </div>
          <Button variant="outline" onClick={signOut} className="bg-white/10 border-white/20 text-white hover:bg-white/20">
            Déconnexion
          </Button>
        </div>
      </div>

      <div className="container mx-auto px-6 py-8">
        {/* Navigation par onglets */}
        <Tabs defaultValue="dashboard" className="w-full">
          <TabsList className="grid w-full grid-cols-2 mb-8">
            <TabsTrigger value="dashboard">Dashboard</TabsTrigger>
            <TabsTrigger value="communication">Communication</TabsTrigger>
          </TabsList>

          <TabsContent value="dashboard" className="space-y-6">
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
                  Optimisation automatique des tournées
                </p>
              </div>
            </div>
          </Card>

          <Card className="p-6 border-0 shadow-elegant">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-semibold">Livraisons en attente</h3>
              <Badge variant="outline" className="text-livreur-primary border-livreur-primary">
                {pendingDeliveries} livraisons
              </Badge>
            </div>
            <div className="space-y-4">
              {deliveries?.filter(d => ['pending', 'assigned', 'picked_up', 'in_transit'].includes(d.status)).slice(0, 3).map((delivery) => (
                <div key={delivery.id} className="flex items-center justify-between p-4 bg-background border rounded-lg">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="font-semibold text-sm">
                        #{delivery.order?.order_number || 'N/A'}
                      </span>
                      <span className={`px-2 py-1 text-xs rounded-full text-white ${getStatusColor(delivery.status)}`}>
                        {getStatusText(delivery.status)}
                      </span>
                    </div>
                    <p className="text-sm text-muted-foreground mb-1">
                      {delivery.order?.customer?.profiles?.first_name} {delivery.order?.customer?.profiles?.last_name}
                    </p>
                    <p className="text-sm font-medium text-foreground">
                      {delivery.delivery_fee ? `${delivery.delivery_fee} €` : 'Tarif à définir'}
                    </p>
                  </div>
                  <Button size="sm" variant="outline" className="border-livreur-primary text-livreur-primary hover:bg-livreur-primary hover:text-white">
                    <Truck className="h-4 w-4" />
                  </Button>
                </div>
              ))}

              {pendingDeliveries === 0 && (
                <div className="text-center py-8 text-muted-foreground">
                  <CheckCircle className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>Aucune livraison en attente</p>
                  <p className="text-sm">Parfait ! Toutes vos livraisons sont à jour</p>
                </div>
              )}
            </div>
          </Card>
        </div>

        {/* Alert */}
        <Card className="p-6 border-l-4 border-l-livreur-primary bg-livreur-accent/50">
          <div className="flex items-center gap-4">
            <AlertTriangle className="h-6 w-6 text-livreur-primary" />
            <div>
              <h4 className="font-semibold text-foreground">Système connecté - Fonctionnalités actives</h4>
              <p className="text-sm text-muted-foreground mt-1">
                Géolocalisation GPS, paiements intégrés Mobile Money, 
                optimisation automatique des tournées, communication client temps réel.
              </p>
            </div>
          </div>
        </Card>
          </TabsContent>

          <TabsContent value="communication" className="space-y-6">
            <SimpleCommunicationInterface />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}