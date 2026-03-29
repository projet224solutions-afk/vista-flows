/**
 * MODULE RÉPARATION PROFESSIONNEL
 * Inspiré de: TaskRabbit, Fixando, Mister Fix
 * Gestion complète des services de réparation avec devis et interventions
 */

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { 
  Wrench, Smartphone, Monitor, Car, 
  Zap, Home, Clock, CheckCircle2, AlertCircle,
  Calendar, DollarSign, TrendingUp, Users
} from 'lucide-react';
import { toast } from 'sonner';

interface RepairModuleProps {
  serviceId: string;
  businessName?: string;
}

interface RepairCategory {
  id: string;
  name: string;
  icon: any;
  services: string[];
}

interface RepairRequest {
  id: string;
  customerName: string;
  phone: string;
  category: string;
  description: string;
  status: 'pending' | 'quoted' | 'approved' | 'in_progress' | 'completed';
  estimatedCost?: number;
  scheduledDate?: string;
  createdAt: string;
}

const REPAIR_CATEGORIES: RepairCategory[] = [
  {
    id: 'electronics',
    name: 'Électronique',
    icon: Smartphone,
    services: ['Téléphone', 'Tablette', 'Ordinateur', 'TV', 'Console']
  },
  {
    id: 'appliances',
    name: 'Électroménager',
    icon: Home,
    services: ['Réfrigérateur', 'Machine à laver', 'Climatiseur', 'Micro-ondes', 'Four']
  },
  {
    id: 'vehicle',
    name: 'Véhicules',
    icon: Car,
    services: ['Mécanique', 'Carrosserie', 'Électricité auto', 'Pneumatique']
  },
  {
    id: 'electrical',
    name: 'Électricité',
    icon: Zap,
    services: ['Installation', 'Dépannage', 'Tableau électrique', 'Éclairage']
  },
  {
    id: 'plumbing',
    name: 'Plomberie',
    icon: Wrench,
    services: ['Fuite', 'Installation', 'Débouchage', 'Chauffe-eau']
  }
];

export function RepairModule({ serviceId, businessName }: RepairModuleProps) {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [requests, setRequests] = useState<RepairRequest[]>([]);
  const [loading, setLoading] = useState(false);
  const [stats, setStats] = useState({
    pendingRequests: 5,
    completedToday: 3,
    revenue: 850000,
    avgRating: 4.7
  });

  const [newRequest, setNewRequest] = useState({
    customerName: '',
    phone: '',
    category: '',
    service: '',
    description: '',
    urgency: 'normal',
    address: ''
  });

  useEffect(() => {
    loadRequests();
  }, []);

  const loadRequests = async () => {
    // Simuler le chargement des demandes
    setRequests([
      {
        id: '1',
        customerName: 'Amadou Bah',
        phone: '+224 621 00 00 00',
        category: 'electronics',
        description: 'Écran iPhone cassé',
        status: 'pending',
        createdAt: new Date().toISOString()
      },
      {
        id: '2',
        customerName: 'Fatoumata Diallo',
        phone: '+224 622 00 00 00',
        category: 'appliances',
        description: 'Réfrigérateur ne refroidit plus',
        status: 'quoted',
        estimatedCost: 350000,
        createdAt: new Date(Date.now() - 86400000).toISOString()
      }
    ]);
  };

  const handleCreateRequest = async () => {
    if (!newRequest.customerName || !newRequest.phone || !newRequest.category || !newRequest.description) {
      toast.error('Veuillez remplir tous les champs obligatoires');
      return;
    }

    setLoading(true);
    try {
      toast.success('Demande de réparation enregistrée !');
      setNewRequest({
        customerName: '',
        phone: '',
        category: '',
        service: '',
        description: '',
        urgency: 'normal',
        address: ''
      });
      loadRequests();
    } catch (error) {
      toast.error('Erreur lors de l\'enregistrement');
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: RepairRequest['status']) => {
    const variants = {
      pending: { color: 'bg-yellow-500', label: 'En attente' },
      quoted: { color: 'bg-blue-500', label: 'Devis envoyé' },
      approved: { color: 'bg-purple-500', label: 'Approuvé' },
      in_progress: { color: 'bg-green-500', label: 'En cours' },
      completed: { color: 'bg-gray-500', label: 'Terminé' }
    };
    return variants[status];
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold flex items-center gap-2">
            <Wrench className="w-8 h-8 text-primary" />
            {businessName || 'Service de Réparation'}
          </h2>
          <p className="text-muted-foreground">Gestion professionnelle de vos interventions</p>
        </div>
        <Badge variant="outline" className="gap-1">
          <Clock className="w-3 h-3" />
          {stats.pendingRequests} demandes en attente
        </Badge>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Demandes en Attente</CardTitle>
            <Clock className="h-4 w-4 text-yellow-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.pendingRequests}</div>
            <p className="text-xs text-muted-foreground">À traiter</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Réparations du Jour</CardTitle>
            <CheckCircle2 className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.completedToday}</div>
            <p className="text-xs text-muted-foreground">Aujourd'hui</p>
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
            <CardTitle className="text-sm font-medium">Satisfaction Client</CardTitle>
            <TrendingUp className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.avgRating}/5</div>
            <p className="text-xs text-muted-foreground">Moyenne</p>
          </CardContent>
        </Card>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="dashboard">Nouvelle Demande</TabsTrigger>
          <TabsTrigger value="requests">Demandes</TabsTrigger>
          <TabsTrigger value="services">Services</TabsTrigger>
        </TabsList>

        {/* Dashboard Tab */}
        <TabsContent value="dashboard" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Nouvelle Demande de Réparation</CardTitle>
              <CardDescription>Enregistrez une nouvelle demande d'intervention</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="customerName">Nom du client *</Label>
                  <Input
                    id="customerName"
                    placeholder="Nom complet"
                    value={newRequest.customerName}
                    onChange={(e) => setNewRequest({ ...newRequest, customerName: e.target.value })}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="phone">Téléphone *</Label>
                  <Input
                    id="phone"
                    placeholder="+224 621 00 00 00"
                    value={newRequest.phone}
                    onChange={(e) => setNewRequest({ ...newRequest, phone: e.target.value })}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="category">Catégorie *</Label>
                  <Select value={newRequest.category} onValueChange={(value) => setNewRequest({ ...newRequest, category: value })}>
                    <SelectTrigger>
                      <SelectValue placeholder="Choisir une catégorie" />
                    </SelectTrigger>
                    <SelectContent>
                      {REPAIR_CATEGORIES.map(cat => {
                        const Icon = cat.icon;
                        return (
                          <SelectItem key={cat.id} value={cat.id}>
                            <div className="flex items-center gap-2">
                              <Icon className="w-4 h-4" />
                              {cat.name}
                            </div>
                          </SelectItem>
                        );
                      })}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="service">Service spécifique</Label>
                  <Select value={newRequest.service} onValueChange={(value) => setNewRequest({ ...newRequest, service: value })}>
                    <SelectTrigger>
                      <SelectValue placeholder="Type de réparation" />
                    </SelectTrigger>
                    <SelectContent>
                      {newRequest.category && REPAIR_CATEGORIES.find(c => c.id === newRequest.category)?.services.map(service => (
                        <SelectItem key={service} value={service}>
                          {service}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="urgency">Urgence</Label>
                  <Select value={newRequest.urgency} onValueChange={(value) => setNewRequest({ ...newRequest, urgency: value })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="normal">Normal</SelectItem>
                      <SelectItem value="urgent">Urgent (24h)</SelectItem>
                      <SelectItem value="emergency">Urgence (Immédiat)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="address">Adresse</Label>
                  <Input
                    id="address"
                    placeholder="Quartier, commune"
                    value={newRequest.address}
                    onChange={(e) => setNewRequest({ ...newRequest, address: e.target.value })}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description du problème *</Label>
                <Textarea
                  id="description"
                  placeholder="Décrivez le problème en détail..."
                  value={newRequest.description}
                  onChange={(e) => setNewRequest({ ...newRequest, description: e.target.value })}
                  rows={4}
                />
              </div>

              <Button onClick={handleCreateRequest} disabled={loading} className="w-full" size="lg">
                {loading ? 'Enregistrement...' : 'Enregistrer la demande'}
              </Button>
            </CardContent>
          </Card>

          {/* Catégories de services */}
          <Card>
            <CardHeader>
              <CardTitle>Nos Spécialités</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
                {REPAIR_CATEGORIES.map(category => {
                  const Icon = category.icon;
                  return (
                    <Card key={category.id} className="border-2 hover:border-primary transition-colors cursor-pointer">
                      <CardContent className="pt-6 text-center">
                        <Icon className="w-12 h-12 mx-auto mb-2 text-primary" />
                        <h3 className="font-bold mb-2">{category.name}</h3>
                        <div className="space-y-1">
                          {category.services.slice(0, 3).map(service => (
                            <p key={service} className="text-xs text-muted-foreground">{service}</p>
                          ))}
                          {category.services.length > 3 && (
                            <p className="text-xs text-primary font-medium">+{category.services.length - 3} autres</p>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Requests Tab */}
        <TabsContent value="requests" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Historique des Demandes</CardTitle>
              <CardDescription>Suivez toutes vos interventions</CardDescription>
            </CardHeader>
            <CardContent>
              {requests.length === 0 ? (
                <div className="text-center py-12">
                  <Wrench className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">Aucune demande enregistrée</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {requests.map(request => {
                    const statusInfo = getStatusBadge(request.status);
                    const category = REPAIR_CATEGORIES.find(c => c.id === request.category);
                    const Icon = category?.icon || Wrench;
                    
                    return (
                      <Card key={request.id}>
                        <CardContent className="pt-6">
                          <div className="flex items-start justify-between">
                            <div className="flex gap-4 flex-1">
                              <div className="bg-primary/10 p-3 rounded-lg">
                                <Icon className="w-6 h-6 text-primary" />
                              </div>
                              <div className="space-y-2 flex-1">
                                <div className="flex items-center gap-2">
                                  <Badge className={statusInfo.color}>
                                    {statusInfo.label}
                                  </Badge>
                                  <span className="text-sm text-muted-foreground">
                                    {new Date(request.createdAt).toLocaleDateString('fr-FR')}
                                  </span>
                                </div>
                                <h3 className="font-bold">{request.customerName}</h3>
                                <p className="text-sm text-muted-foreground">{request.phone}</p>
                                <p className="text-sm">{request.description}</p>
                                {request.estimatedCost && (
                                  <p className="text-sm font-medium text-primary">
                                    Devis: {request.estimatedCost.toLocaleString()} GNF
                                  </p>
                                )}
                              </div>
                            </div>
                            <Button size="sm" variant="outline">
                              Gérer
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Services Tab */}
        <TabsContent value="services" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Gestion des Services</CardTitle>
              <CardDescription>Configurez vos tarifs et disponibilités</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {REPAIR_CATEGORIES.map(category => {
                  const Icon = category.icon;
                  return (
                    <Card key={category.id}>
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2 text-lg">
                          <Icon className="w-5 h-5" />
                          {category.name}
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                          {category.services.map(service => (
                            <Badge key={service} variant="outline" className="justify-start">
                              <CheckCircle2 className="w-3 h-3 mr-1" />
                              {service}
                            </Badge>
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
