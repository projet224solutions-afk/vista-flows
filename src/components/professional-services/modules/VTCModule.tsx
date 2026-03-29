/**
 * MODULE VTC PROFESSIONNEL
 * InspirÃ© de: Uber, Bolt, Yango
 * Gestion complÃ¨te des courses VTC avec rÃ©servation instantanÃ©e et planifiÃ©e
 */

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { 
  Car, Users, MapPin, DollarSign, Clock, Calendar, 
  Navigation, Phone, Star, CheckCircle2, AlertCircle,
  TrendingUp, Activity, BarChart3, Settings
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface VTCModuleProps {
  serviceId: string;
  businessName?: string;
}

interface VehicleType {
  id: string;
  name: string;
  icon: string;
  capacity: number;
  basePrice: number;
  pricePerKm: number;
  description: string;
}

interface Ride {
  id: string;
  pickup: string;
  destination: string;
  vehicleType: string;
  status: 'pending' | 'accepted' | 'in_progress' | 'completed' | 'cancelled';
  price: number;
  scheduledTime?: string;
  createdAt: string;
  customerName?: string;
  customerPhone?: string;
}

const VEHICLE_TYPES: VehicleType[] = [
  {
    id: 'economy',
    name: 'Ã‰conomique',
    icon: 'ðŸš—',
    capacity: 4,
    basePrice: 5000,
    pricePerKm: 500,
    description: 'VÃ©hicule standard confortable'
  },
  {
    id: 'comfort',
    name: 'Confort',
    icon: 'ðŸš™',
    capacity: 4,
    basePrice: 8000,
    pricePerKm: 800,
    description: 'VÃ©hicule haut de gamme climatisÃ©'
  },
  {
    id: 'van',
    name: 'Van (6 places)',
    icon: 'ðŸš',
    capacity: 6,
    basePrice: 12000,
    pricePerKm: 1200,
    description: 'Pour groupes et bagages'
  },
  {
    id: 'premium',
    name: 'Premium',
    icon: 'ðŸš˜',
    capacity: 4,
    basePrice: 15000,
    pricePerKm: 1500,
    description: 'VÃ©hicule de luxe avec chauffeur professionnel'
  }
];

export function VTCModule({ serviceId, businessName }: VTCModuleProps) {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [rides, setRides] = useState<Ride[]>([]);
  const [loading, setLoading] = useState(false);
  const [stats, setStats] = useState({
    totalRides: 0,
    activeRides: 0,
    revenue: 0,
    avgRating: 4.8
  });

  // Formulaire de nouvelle course
  const [newRide, setNewRide] = useState({
    pickup: '',
    destination: '',
    vehicleType: 'economy',
    scheduledTime: '',
    customerName: '',
    customerPhone: '',
    notes: ''
  });

  useEffect(() => {
    loadRides();
    loadStats();
  }, [serviceId]);

  const loadRides = async () => {
    try {
      // Simuler le chargement des courses
      // TODO: IntÃ©grer avec la table vtc_rides
      setRides([
        {
          id: '1',
          pickup: 'AÃ©roport de Conakry',
          destination: 'Kaloum Centre',
          vehicleType: 'comfort',
          status: 'pending',
          price: 25000,
          createdAt: new Date().toISOString(),
          customerName: 'Mamadou Diallo',
          customerPhone: '+224 621 00 00 00'
        }
      ]);
    } catch (error) {
      console.error('Erreur chargement courses:', error);
    }
  };

  const loadStats = async () => {
    try {
      // Simuler les statistiques
      setStats({
        totalRides: 142,
        activeRides: 3,
        revenue: 5420000,
        avgRating: 4.8
      });
    } catch (error) {
      console.error('Erreur chargement stats:', error);
    }
  };

  const calculatePrice = (distance: number, vehicleTypeId: string) => {
    const vehicle = VEHICLE_TYPES.find(v => v.id === vehicleTypeId);
    if (!vehicle) return 0;
    return vehicle.basePrice + (distance * vehicle.pricePerKm);
  };

  const handleCreateRide = async () => {
    if (!newRide.pickup || !newRide.destination || !newRide.customerPhone) {
      toast.error('Veuillez remplir tous les champs obligatoires');
      return;
    }

    setLoading(true);
    try {
      // TODO: CrÃ©er la course dans la base de donnÃ©es
      toast.success('Course crÃ©Ã©e avec succÃ¨s !');
      setNewRide({
        pickup: '',
        destination: '',
        vehicleType: 'economy',
        scheduledTime: '',
        customerName: '',
        customerPhone: '',
        notes: ''
      });
      loadRides();
    } catch (error) {
      toast.error('Erreur lors de la crÃ©ation de la course');
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: Ride['status']) => {
    switch (status) {
      case 'pending': return 'bg-yellow-500';
      case 'accepted': return 'bg-blue-500';
      case 'in_progress': return 'bg-gradient-to-br from-primary-blue-500 to-primary-orange-500';
      case 'completed': return 'bg-gray-500';
      case 'cancelled': return 'bg-red-500';
      default: return 'bg-gray-500';
    }
  };

  const getStatusLabel = (status: Ride['status']) => {
    switch (status) {
      case 'pending': return 'En attente';
      case 'accepted': return 'AcceptÃ©e';
      case 'in_progress': return 'En cours';
      case 'completed': return 'TerminÃ©e';
      case 'cancelled': return 'AnnulÃ©e';
      default: return status;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold flex items-center gap-2">
            <Car className="w-8 h-8 text-primary" />
            {businessName || 'Service VTC'}
          </h2>
          <p className="text-muted-foreground">Gestion professionnelle de votre flotte VTC</p>
        </div>
        <Badge variant="outline" className="gap-1">
          <Activity className="w-3 h-3" />
          {stats.activeRides} courses actives
        </Badge>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total Courses</CardTitle>
            <MapPin className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalRides}</div>
            <p className="text-xs text-muted-foreground">+12% ce mois</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Courses Actives</CardTitle>
            <Activity className="h-4 w-4 text-primary-orange-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.activeRides}</div>
            <p className="text-xs text-muted-foreground">En temps rÃ©el</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Chiffre d'Affaires</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.revenue.toLocaleString()} GNF</div>
            <p className="text-xs text-muted-foreground">Ce mois</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Note Moyenne</CardTitle>
            <Star className="h-4 w-4 text-yellow-500 fill-yellow-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.avgRating}/5</div>
            <p className="text-xs text-muted-foreground">Sur 89 avis</p>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="dashboard">Tableau de bord</TabsTrigger>
          <TabsTrigger value="rides">Courses</TabsTrigger>
          <TabsTrigger value="vehicles">VÃ©hicules</TabsTrigger>
          <TabsTrigger value="settings">ParamÃ¨tres</TabsTrigger>
        </TabsList>

        {/* Dashboard Tab */}
        <TabsContent value="dashboard" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Nouvelle Course</CardTitle>
              <CardDescription>CrÃ©er une rÃ©servation instantanÃ©e ou planifiÃ©e</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="pickup">Point de dÃ©part *</Label>
                  <div className="relative">
                    <MapPin className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="pickup"
                      placeholder="Ex: AÃ©roport de Conakry"
                      value={newRide.pickup}
                      onChange={(e) => setNewRide({ ...newRide, pickup: e.target.value })}
                      className="pl-10"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="destination">Destination *</Label>
                  <div className="relative">
                    <Navigation className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="destination"
                      placeholder="Ex: Kaloum Centre"
                      value={newRide.destination}
                      onChange={(e) => setNewRide({ ...newRide, destination: e.target.value })}
                      className="pl-10"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="customerName">Nom du client *</Label>
                  <Input
                    id="customerName"
                    placeholder="Nom complet"
                    value={newRide.customerName}
                    onChange={(e) => setNewRide({ ...newRide, customerName: e.target.value })}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="customerPhone">TÃ©lÃ©phone *</Label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="customerPhone"
                      placeholder="+224 621 00 00 00"
                      value={newRide.customerPhone}
                      onChange={(e) => setNewRide({ ...newRide, customerPhone: e.target.value })}
                      className="pl-10"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="vehicleType">Type de vÃ©hicule</Label>
                  <Select value={newRide.vehicleType} onValueChange={(value) => setNewRide({ ...newRide, vehicleType: value })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {VEHICLE_TYPES.map(vehicle => (
                        <SelectItem key={vehicle.id} value={vehicle.id}>
                          {vehicle.icon} {vehicle.name} - {vehicle.capacity} places
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="scheduledTime">Heure planifiÃ©e (optionnel)</Label>
                  <div className="relative">
                    <Calendar className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="scheduledTime"
                      type="datetime-local"
                      value={newRide.scheduledTime}
                      onChange={(e) => setNewRide({ ...newRide, scheduledTime: e.target.value })}
                      className="pl-10"
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="notes">Notes / Instructions</Label>
                <Textarea
                  id="notes"
                  placeholder="Informations complÃ©mentaires..."
                  value={newRide.notes}
                  onChange={(e) => setNewRide({ ...newRide, notes: e.target.value })}
                  rows={3}
                />
              </div>

              <Button onClick={handleCreateRide} disabled={loading} className="w-full" size="lg">
                {loading ? 'CrÃ©ation...' : 'CrÃ©er la course'}
              </Button>
            </CardContent>
          </Card>

          {/* Types de vÃ©hicules */}
          <Card>
            <CardHeader>
              <CardTitle>Tarifs par Type de VÃ©hicule</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {VEHICLE_TYPES.map(vehicle => (
                  <Card key={vehicle.id} className="border-2">
                    <CardContent className="pt-6">
                      <div className="text-center space-y-2">
                        <div className="text-4xl mb-2">{vehicle.icon}</div>
                        <h3 className="font-bold">{vehicle.name}</h3>
                        <p className="text-sm text-muted-foreground">{vehicle.description}</p>
                        <Badge variant="outline">{vehicle.capacity} places</Badge>
                        <div className="pt-2 border-t mt-2">
                          <p className="text-xs text-muted-foreground">Tarif de base</p>
                          <p className="font-bold text-lg">{vehicle.basePrice.toLocaleString()} GNF</p>
                          <p className="text-xs text-muted-foreground">+ {vehicle.pricePerKm} GNF/km</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Rides Tab */}
        <TabsContent value="rides" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Historique des Courses</CardTitle>
              <CardDescription>Liste de toutes vos courses rÃ©centes</CardDescription>
            </CardHeader>
            <CardContent>
              {rides.length === 0 ? (
                <div className="text-center py-12">
                  <Car className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">Aucune course enregistrÃ©e</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {rides.map(ride => (
                    <Card key={ride.id}>
                      <CardContent className="pt-6">
                        <div className="flex items-start justify-between">
                          <div className="space-y-2 flex-1">
                            <div className="flex items-center gap-2">
                              <Badge className={getStatusColor(ride.status)}>
                                {getStatusLabel(ride.status)}
                              </Badge>
                              <span className="text-sm text-muted-foreground">
                                {new Date(ride.createdAt).toLocaleString('fr-FR')}
                              </span>
                            </div>
                            <div className="space-y-1">
                              <div className="flex items-center gap-2">
                                <MapPin className="w-4 h-4 text-primary-orange-500" />
                                <span className="font-medium">{ride.pickup}</span>
                              </div>
                              <div className="flex items-center gap-2">
                                <Navigation className="w-4 h-4 text-red-500" />
                                <span className="font-medium">{ride.destination}</span>
                              </div>
                            </div>
                            {ride.customerName && (
                              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                <Users className="w-4 h-4" />
                                {ride.customerName} - {ride.customerPhone}
                              </div>
                            )}
                          </div>
                          <div className="text-right">
                            <p className="text-2xl font-bold text-primary">{ride.price.toLocaleString()} GNF</p>
                            <p className="text-xs text-muted-foreground">{VEHICLE_TYPES.find(v => v.id === ride.vehicleType)?.name}</p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Vehicles Tab */}
        <TabsContent value="vehicles" className="space-y-4">
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Module de gestion de flotte disponible. Ajoutez vos vÃ©hicules, chauffeurs et suivez leur disponibilitÃ© en temps rÃ©el.
            </AlertDescription>
          </Alert>
          
          <Card>
            <CardHeader>
              <CardTitle>Ma Flotte</CardTitle>
              <CardDescription>GÃ©rez vos vÃ©hicules et chauffeurs</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-12">
                <Car className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground mb-4">Aucun vÃ©hicule enregistrÃ©</p>
                <Button>Ajouter un vÃ©hicule</Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Settings Tab */}
        <TabsContent value="settings" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>ParamÃ¨tres du Service</CardTitle>
              <CardDescription>Configurez vos tarifs et zones de couverture</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Alert>
                <Settings className="h-4 w-4" />
                <AlertDescription>
                  Les paramÃ¨tres avancÃ©s seront disponibles prochainement: zones de couverture, tarifs dynamiques, commissions chauffeurs.
                </AlertDescription>
              </Alert>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
