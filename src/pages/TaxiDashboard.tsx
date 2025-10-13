import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Bike, MapPin, Clock, TrendingUp, Star, Navigation, MessageSquare } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useRoleRedirect } from "@/hooks/useRoleRedirect";
import { useCallback, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import SimpleCommunicationInterface from "@/components/communication/SimpleCommunicationInterface";

export default function TaxiDashboard() {
  const { user, profile, signOut } = useAuth();
  const navigate = useNavigate();
  useRoleRedirect(); // S'assurer que seuls les taxis/admins accèdent à cette page

  // ✅ Correction : stabiliser le callback pour éviter re-renders inutiles
  const handleSignOut = useCallback(async () => {
    await signOut();
    navigate('/');
  }, [signOut, navigate]);

  // ✅ Correction : mémoïser les données statiques
  const stats = useMemo(() => [
    { label: "Courses aujourd'hui", value: "12", icon: Navigation, color: "text-blue-500" },
    { label: "Gains du jour", value: "45,000 FCFA", icon: TrendingUp, color: "text-green-500" },
    { label: "Note moyenne", value: "4.8", icon: Star, color: "text-yellow-500" },
    { label: "Temps en ligne", value: "8h 30m", icon: Clock, color: "text-purple-500" }
  ], []);

  const recentRides = useMemo(() => [
    {
      id: 'RIDE-2024-156',
      pickup: 'Plateau, Conakry',
      destination: 'Almadies',
      distance: '12 km',
      fare: '3,500 FCFA',
      time: '14:30',
      rating: 5
    },
    {
      id: 'RIDE-2024-155',
      pickup: 'Médina',
      destination: 'Yoff',
      distance: '8 km',
      fare: '2,800 FCFA',
      time: '12:15',
      rating: 4
    }
  ], []);

  const todayEarnings = useMemo(() => [
    { time: '08:00', amount: 4500, rides: 2 },
    { time: '12:00', amount: 8200, rides: 3 },
    { time: '16:00', amount: 12800, rides: 4 },
    { time: '20:00', amount: 15600, rides: 3 }
  ], []);

  return (
    <div className="min-h-screen bg-background pb-20">
      {/* Header */}
      <header className="bg-card border-b border-border">
        <div className="px-4 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-foreground">Dashboard Taxi/Moto</h1>
              <p className="text-muted-foreground">
                En ligne - {profile?.first_name || user?.email}
              </p>
            </div>
            <div className="flex gap-2">
              <Button className="bg-green-500 hover:bg-green-600">
                <MapPin className="w-4 h-4 mr-2" />
                En ligne
              </Button>
              <Button variant="outline" onClick={handleSignOut}>
                Se déconnecter
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Navigation par onglets */}
      <Tabs defaultValue="dashboard" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="dashboard">Dashboard</TabsTrigger>
          <TabsTrigger value="communication">Communication</TabsTrigger>
        </TabsList>

        <TabsContent value="dashboard" className="space-y-6">
          {/* Stats Cards */}
          <section className="px-4 py-6">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {stats.map((stat, index) => {
                const Icon = stat.icon;
                return (
                  <Card key={index}>
                    <CardContent className="p-6">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium text-muted-foreground">{stat.label}</p>
                          <p className="text-2xl font-bold">{stat.value}</p>
                        </div>
                        <Icon className={`w-8 h-8 ${stat.color}`} />
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </section>

          {/* Recent Rides */}
          <section className="px-4 py-2">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Navigation className="w-5 h-5" />
                  Courses récentes
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {recentRides.map((ride) => (
                    <div key={ride.id} className="border rounded-lg p-4">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                          <h4 className="font-medium">{ride.id}</h4>
                          <span className="text-sm text-muted-foreground">{ride.time}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                          <span className="text-sm font-medium">{ride.rating}</span>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-sm">
                        <div>
                          <p className="text-muted-foreground">Départ</p>
                          <p className="font-medium">{ride.pickup}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Arrivée</p>
                          <p className="font-medium">{ride.destination}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Distance</p>
                          <p className="font-medium">{ride.distance}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Tarif</p>
                          <p className="font-medium text-green-600">{ride.fare}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </section>

          {/* Earnings Today */}
          <section className="px-4 py-2">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="w-5 h-5" />
                  Gains d'aujourd'hui
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {todayEarnings.map((earning, index) => (
                    <div key={index} className="flex items-center justify-between p-4 bg-accent rounded-lg">
                      <div className="flex-1">
                        <h4 className="font-medium mb-1">{earning.time}</h4>
                        <p className="text-sm text-muted-foreground">{earning.rides} courses</p>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold text-green-600">+{earning.amount.toLocaleString()} GNF</p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </section>

          {/* Features Overview */}
          <section className="px-4 py-2 mb-6">
            <Card className="bg-gradient-to-r from-yellow-50 to-orange-50 border-0">
              <CardContent className="p-6">
                <div className="text-center">
                  <Bike className="w-12 h-12 mx-auto mb-4 text-yellow-500" />
                  <h3 className="text-xl font-bold mb-2">Interface Taxi/Moto-Taxi</h3>
                  <p className="text-muted-foreground mb-4">
                    Plateforme de transport urbain en cours de développement
                  </p>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 bg-yellow-500 rounded-full"></div>
                      <span>GPS temps réel</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 bg-yellow-500 rounded-full"></div>
                      <span>Tarification dynamique</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 bg-yellow-500 rounded-full"></div>
                      <span>Paiement mobile</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 bg-yellow-500 rounded-full"></div>
                      <span>Système de notation</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 bg-yellow-500 rounded-full"></div>
                      <span>Historique des courses</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 bg-yellow-500 rounded-full"></div>
                      <span>Support 24/7</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </section>
        </TabsContent>

        <TabsContent value="communication" className="space-y-6">
          <div className="px-4 py-6">
            <SimpleCommunicationInterface />
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}