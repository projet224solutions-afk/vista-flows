/**
 * MODULE LIVRAISON EXPRESS
 * Gestion des courses, livreurs et suivi en temps réel
 */

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { 
  Package, 
  Truck, 
  Users, 
  MapPin,
  Clock,
  Phone,
  Plus,
  CheckCircle,
  AlertCircle,
  TrendingUp,
  DollarSign,
  Navigation
} from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';

interface DeliveryModuleProps {
  serviceId: string;
  businessName?: string;
}

interface Delivery {
  id: string;
  trackingNumber: string;
  senderName: string;
  senderPhone: string;
  senderAddress: string;
  receiverName: string;
  receiverPhone: string;
  receiverAddress: string;
  packageType: 'document' | 'colis_petit' | 'colis_moyen' | 'colis_grand';
  weight?: number;
  price: number;
  status: 'en_attente' | 'collecte' | 'en_transit' | 'livree' | 'echec';
  courier?: string;
  createdAt: string;
  estimatedDelivery?: string;
}

interface Courier {
  id: string;
  name: string;
  phone: string;
  vehicle: 'moto' | 'voiture' | 'camionnette';
  status: 'disponible' | 'en_course' | 'hors_ligne';
  currentLocation?: string;
  deliveriesCompleted: number;
  rating: number;
}

export function DeliveryModule({ serviceId, businessName }: DeliveryModuleProps) {
  const [activeTab, setActiveTab] = useState('livraisons');
  const [showNewDeliveryDialog, setShowNewDeliveryDialog] = useState(false);
  const [showNewCourierDialog, setShowNewCourierDialog] = useState(false);

  // Données simulées
  const [deliveries] = useState<Delivery[]>([
    {
      id: '1',
      trackingNumber: 'LIV-001234',
      senderName: 'Boutique Alpha',
      senderPhone: '+224 620 00 00 00',
      senderAddress: 'Kaloum, Conakry',
      receiverName: 'Mamadou Diallo',
      receiverPhone: '+224 621 00 00 00',
      receiverAddress: 'Kipé, Conakry',
      packageType: 'colis_moyen',
      weight: 5,
      price: 50000,
      status: 'en_transit',
      courier: 'Ibrahima Sow',
      createdAt: new Date().toISOString(),
      estimatedDelivery: '14:30'
    },
    {
      id: '2',
      trackingNumber: 'LIV-001235',
      senderName: 'Restaurant Le Jardin',
      senderPhone: '+224 622 00 00 00',
      senderAddress: 'Almamya, Conakry',
      receiverName: 'Fatou Bah',
      receiverPhone: '+224 623 00 00 00',
      receiverAddress: 'Ratoma, Conakry',
      packageType: 'colis_petit',
      price: 25000,
      status: 'en_attente',
      createdAt: new Date().toISOString()
    },
    {
      id: '3',
      trackingNumber: 'LIV-001236',
      senderName: 'Pharmacie Centrale',
      senderPhone: '+224 624 00 00 00',
      senderAddress: 'Madina, Conakry',
      receiverName: 'Aissatou Camara',
      receiverPhone: '+224 625 00 00 00',
      receiverAddress: 'Dixinn, Conakry',
      packageType: 'document',
      price: 15000,
      status: 'collecte',
      courier: 'Oumar Barry',
      createdAt: new Date().toISOString()
    }
  ]);

  const [couriers] = useState<Courier[]>([
    {
      id: '1',
      name: 'Ibrahima Sow',
      phone: '+224 626 00 00 00',
      vehicle: 'moto',
      status: 'en_course',
      currentLocation: 'Kipé',
      deliveriesCompleted: 156,
      rating: 4.8
    },
    {
      id: '2',
      name: 'Oumar Barry',
      phone: '+224 627 00 00 00',
      vehicle: 'moto',
      status: 'en_course',
      currentLocation: 'Madina',
      deliveriesCompleted: 89,
      rating: 4.6
    },
    {
      id: '3',
      name: 'Moussa Diallo',
      phone: '+224 628 00 00 00',
      vehicle: 'voiture',
      status: 'disponible',
      deliveriesCompleted: 234,
      rating: 4.9
    },
    {
      id: '4',
      name: 'Amadou Balde',
      phone: '+224 629 00 00 00',
      vehicle: 'camionnette',
      status: 'hors_ligne',
      deliveriesCompleted: 67,
      rating: 4.5
    }
  ]);

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('fr-GN', { style: 'decimal' }).format(price) + ' GNF';
  };

  const getStatusBadge = (status: Delivery['status']) => {
    const styles = {
      en_attente: 'bg-yellow-100 text-yellow-800',
      collecte: 'bg-blue-100 text-blue-800',
      en_transit: 'bg-purple-100 text-purple-800',
      livree: 'bg-green-100 text-green-800',
      echec: 'bg-red-100 text-red-800'
    };
    const labels = {
      en_attente: 'En attente',
      collecte: 'Collecte',
      en_transit: 'En transit',
      livree: 'Livrée',
      echec: 'Échec'
    };
    return <Badge className={styles[status]}>{labels[status]}</Badge>;
  };

  const getCourierStatusBadge = (status: Courier['status']) => {
    const styles = {
      disponible: 'bg-green-100 text-green-800',
      en_course: 'bg-blue-100 text-blue-800',
      hors_ligne: 'bg-gray-100 text-gray-800'
    };
    const labels = {
      disponible: 'Disponible',
      en_course: 'En course',
      hors_ligne: 'Hors ligne'
    };
    return <Badge className={styles[status]}>{labels[status]}</Badge>;
  };

  const getVehicleIcon = (vehicle: Courier['vehicle']) => {
    switch (vehicle) {
      case 'moto': return '🏍️';
      case 'voiture': return '🚗';
      case 'camionnette': return '🚐';
    }
  };

  const handleAddDelivery = () => {
    toast.success('Livraison créée avec succès');
    setShowNewDeliveryDialog(false);
  };

  const handleAddCourier = () => {
    toast.success('Livreur ajouté avec succès');
    setShowNewCourierDialog(false);
  };

  // Statistiques
  const pendingDeliveries = deliveries.filter(d => d.status === 'en_attente').length;
  const inTransitDeliveries = deliveries.filter(d => d.status === 'en_transit' || d.status === 'collecte').length;
  const completedToday = deliveries.filter(d => d.status === 'livree').length;
  const availableCouriers = couriers.filter(c => c.status === 'disponible').length;
  const totalRevenue = deliveries.reduce((acc, d) => acc + d.price, 0);

  return (
    <div className="space-y-6">
      {/* En-tête */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-primary/10 rounded-xl">
            <Package className="w-8 h-8 text-primary" />
          </div>
          <div>
            <h2 className="text-2xl font-bold">{businessName || 'Livraison Express'}</h2>
            <p className="text-muted-foreground">Gestion des livraisons</p>
          </div>
        </div>
      </div>

      {/* Statistiques */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <AlertCircle className="h-4 w-4 text-yellow-500" />
              <span className="text-sm text-muted-foreground">En attente</span>
            </div>
            <p className="text-2xl font-bold mt-1">{pendingDeliveries}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Navigation className="h-4 w-4 text-blue-500" />
              <span className="text-sm text-muted-foreground">En cours</span>
            </div>
            <p className="text-2xl font-bold mt-1">{inTransitDeliveries}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-green-500" />
              <span className="text-sm text-muted-foreground">Livrées</span>
            </div>
            <p className="text-2xl font-bold mt-1">{completedToday}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Truck className="h-4 w-4 text-purple-500" />
              <span className="text-sm text-muted-foreground">Livreurs dispo</span>
            </div>
            <p className="text-2xl font-bold mt-1">{availableCouriers}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <DollarSign className="h-4 w-4 text-green-500" />
              <span className="text-sm text-muted-foreground">Revenus</span>
            </div>
            <p className="text-xl font-bold mt-1">{formatPrice(totalRevenue)}</p>
          </CardContent>
        </Card>
      </div>

      {/* Onglets */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="livraisons">Livraisons</TabsTrigger>
          <TabsTrigger value="livreurs">Livreurs</TabsTrigger>
        </TabsList>

        {/* Onglet Livraisons */}
        <TabsContent value="livraisons" className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold">Courses du jour</h3>
            <Dialog open={showNewDeliveryDialog} onOpenChange={setShowNewDeliveryDialog}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  Nouvelle livraison
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl">
                <DialogHeader>
                  <DialogTitle>Créer une livraison</DialogTitle>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-4">
                      <h4 className="font-medium">Expéditeur</h4>
                      <div className="space-y-2">
                        <Label>Nom</Label>
                        <Input placeholder="Nom de l'expéditeur" />
                      </div>
                      <div className="space-y-2">
                        <Label>Téléphone</Label>
                        <Input placeholder="+224 6XX XX XX XX" />
                      </div>
                      <div className="space-y-2">
                        <Label>Adresse</Label>
                        <Textarea placeholder="Adresse de collecte" rows={2} />
                      </div>
                    </div>
                    <div className="space-y-4">
                      <h4 className="font-medium">Destinataire</h4>
                      <div className="space-y-2">
                        <Label>Nom</Label>
                        <Input placeholder="Nom du destinataire" />
                      </div>
                      <div className="space-y-2">
                        <Label>Téléphone</Label>
                        <Input placeholder="+224 6XX XX XX XX" />
                      </div>
                      <div className="space-y-2">
                        <Label>Adresse</Label>
                        <Textarea placeholder="Adresse de livraison" rows={2} />
                      </div>
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <Label>Type de colis</Label>
                      <Select>
                        <SelectTrigger>
                          <SelectValue placeholder="Sélectionner" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="document">Document</SelectItem>
                          <SelectItem value="colis_petit">Petit colis</SelectItem>
                          <SelectItem value="colis_moyen">Colis moyen</SelectItem>
                          <SelectItem value="colis_grand">Grand colis</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Poids (kg)</Label>
                      <Input type="number" placeholder="0" />
                    </div>
                    <div className="space-y-2">
                      <Label>Prix (GNF)</Label>
                      <Input type="number" placeholder="0" />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Assigner un livreur</Label>
                    <Select>
                      <SelectTrigger>
                        <SelectValue placeholder="Sélectionner un livreur" />
                      </SelectTrigger>
                      <SelectContent>
                        {couriers.filter(c => c.status === 'disponible').map((c) => (
                          <SelectItem key={c.id} value={c.id}>
                            {getVehicleIcon(c.vehicle)} {c.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="flex justify-end gap-2">
                  <Button variant="outline" onClick={() => setShowNewDeliveryDialog(false)}>
                    Annuler
                  </Button>
                  <Button onClick={handleAddDelivery}>
                    Créer
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>

          <div className="space-y-3">
            {deliveries.map((delivery) => (
              <Card key={delivery.id}>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="font-mono text-sm bg-muted px-2 py-0.5 rounded">
                          {delivery.trackingNumber}
                        </span>
                        {getStatusBadge(delivery.status)}
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <p className="text-xs text-muted-foreground">De:</p>
                          <p className="font-medium text-sm">{delivery.senderName}</p>
                          <p className="text-xs text-muted-foreground flex items-center gap-1">
                            <MapPin className="h-3 w-3" />
                            {delivery.senderAddress}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground">À:</p>
                          <p className="font-medium text-sm">{delivery.receiverName}</p>
                          <p className="text-xs text-muted-foreground flex items-center gap-1">
                            <MapPin className="h-3 w-3" />
                            {delivery.receiverAddress}
                          </p>
                        </div>
                      </div>
                      {delivery.courier && (
                        <p className="text-sm text-primary mt-2 flex items-center gap-1">
                          <Truck className="h-3 w-3" />
                          Livreur: {delivery.courier}
                        </p>
                      )}
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-primary">{formatPrice(delivery.price)}</p>
                      {delivery.estimatedDelivery && (
                        <p className="text-xs text-muted-foreground flex items-center gap-1 justify-end">
                          <Clock className="h-3 w-3" />
                          ETA: {delivery.estimatedDelivery}
                        </p>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* Onglet Livreurs */}
        <TabsContent value="livreurs" className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold">Équipe de livreurs</h3>
            <Dialog open={showNewCourierDialog} onOpenChange={setShowNewCourierDialog}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  Ajouter un livreur
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Ajouter un livreur</DialogTitle>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                  <div className="space-y-2">
                    <Label>Nom complet</Label>
                    <Input placeholder="Nom et prénom" />
                  </div>
                  <div className="space-y-2">
                    <Label>Téléphone</Label>
                    <Input placeholder="+224 6XX XX XX XX" />
                  </div>
                  <div className="space-y-2">
                    <Label>Type de véhicule</Label>
                    <Select>
                      <SelectTrigger>
                        <SelectValue placeholder="Sélectionner" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="moto">🏍️ Moto</SelectItem>
                        <SelectItem value="voiture">🚗 Voiture</SelectItem>
                        <SelectItem value="camionnette">🚐 Camionnette</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="flex justify-end gap-2">
                  <Button variant="outline" onClick={() => setShowNewCourierDialog(false)}>
                    Annuler
                  </Button>
                  <Button onClick={handleAddCourier}>
                    Ajouter
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            {couriers.map((courier) => (
              <Card key={courier.id}>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center text-2xl">
                        {getVehicleIcon(courier.vehicle)}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="font-semibold">{courier.name}</h4>
                          {getCourierStatusBadge(courier.status)}
                        </div>
                        <p className="text-sm text-muted-foreground flex items-center gap-1">
                          <Phone className="h-3 w-3" />
                          {courier.phone}
                        </p>
                        {courier.currentLocation && (
                          <p className="text-xs text-primary flex items-center gap-1">
                            <MapPin className="h-3 w-3" />
                            {courier.currentLocation}
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="flex items-center gap-1 text-yellow-500">
                        <span>⭐</span>
                        <span className="font-medium">{courier.rating}</span>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {courier.deliveriesCompleted} livraisons
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}

export default DeliveryModule;
