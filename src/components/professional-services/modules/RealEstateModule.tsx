/**
 * MODULE AGENCE IMMOBILIÈRE
 * Gestion d'annonces immobilières, visites et contacts
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
  Home, 
  Building2, 
  Users, 
  Calendar,
  MapPin,
  Phone,
  Mail,
  Plus,
  Search,
  Eye,
  Heart,
  DollarSign,
  Bed,
  Bath,
  Maximize,
  TrendingUp
} from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';

interface RealEstateModuleProps {
  serviceId: string;
  businessName?: string;
}

interface Property {
  id: string;
  title: string;
  type: 'vente' | 'location';
  propertyType: 'appartement' | 'maison' | 'terrain' | 'bureau' | 'commerce';
  price: number;
  surface: number;
  rooms: number;
  bathrooms: number;
  address: string;
  description: string;
  images: string[];
  status: 'disponible' | 'sous_option' | 'vendu' | 'loué';
  views: number;
  favorites: number;
  createdAt: string;
}

interface Visit {
  id: string;
  propertyId: string;
  propertyTitle: string;
  clientName: string;
  clientPhone: string;
  clientEmail: string;
  date: string;
  time: string;
  status: 'planifiée' | 'effectuée' | 'annulée';
  notes?: string;
}

interface Contact {
  id: string;
  name: string;
  phone: string;
  email: string;
  type: 'acheteur' | 'vendeur' | 'locataire' | 'bailleur';
  interestedIn: string[];
  budget?: number;
  notes?: string;
  createdAt: string;
}

export function RealEstateModule({ serviceId, businessName }: RealEstateModuleProps) {
  const [activeTab, setActiveTab] = useState('annonces');
  const [showNewPropertyDialog, setShowNewPropertyDialog] = useState(false);
  const [showNewVisitDialog, setShowNewVisitDialog] = useState(false);
  const [showNewContactDialog, setShowNewContactDialog] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Données simulées
  const [properties] = useState<Property[]>([
    {
      id: '1',
      title: 'Appartement 3 pièces - Centre ville',
      type: 'vente',
      propertyType: 'appartement',
      price: 250000000,
      surface: 85,
      rooms: 3,
      bathrooms: 1,
      address: 'Kaloum, Conakry',
      description: 'Bel appartement lumineux avec vue sur mer',
      images: [],
      status: 'disponible',
      views: 145,
      favorites: 23,
      createdAt: new Date().toISOString()
    },
    {
      id: '2',
      title: 'Villa avec piscine - Kipé',
      type: 'location',
      propertyType: 'maison',
      price: 15000000,
      surface: 300,
      rooms: 5,
      bathrooms: 3,
      address: 'Kipé, Conakry',
      description: 'Magnifique villa avec jardin et piscine',
      images: [],
      status: 'disponible',
      views: 89,
      favorites: 15,
      createdAt: new Date().toISOString()
    },
    {
      id: '3',
      title: 'Bureau moderne - Almamya',
      type: 'location',
      propertyType: 'bureau',
      price: 8000000,
      surface: 120,
      rooms: 4,
      bathrooms: 2,
      address: 'Almamya, Conakry',
      description: 'Espace de bureau moderne avec parking',
      images: [],
      status: 'sous_option',
      views: 56,
      favorites: 8,
      createdAt: new Date().toISOString()
    }
  ]);

  const [visits] = useState<Visit[]>([
    {
      id: '1',
      propertyId: '1',
      propertyTitle: 'Appartement 3 pièces - Centre ville',
      clientName: 'Mamadou Diallo',
      clientPhone: '+224 620 00 00 00',
      clientEmail: 'mamadou@email.com',
      date: new Date().toISOString().split('T')[0],
      time: '10:00',
      status: 'planifiée',
      notes: 'Client très intéressé'
    },
    {
      id: '2',
      propertyId: '2',
      propertyTitle: 'Villa avec piscine - Kipé',
      clientName: 'Fatou Bah',
      clientPhone: '+224 621 00 00 00',
      clientEmail: 'fatou@email.com',
      date: new Date().toISOString().split('T')[0],
      time: '14:00',
      status: 'planifiée'
    }
  ]);

  const [contacts] = useState<Contact[]>([
    {
      id: '1',
      name: 'Ibrahim Camara',
      phone: '+224 622 00 00 00',
      email: 'ibrahim@email.com',
      type: 'acheteur',
      interestedIn: ['appartement', 'maison'],
      budget: 300000000,
      notes: 'Recherche bien dans Kaloum',
      createdAt: new Date().toISOString()
    },
    {
      id: '2',
      name: 'Aissatou Sow',
      phone: '+224 623 00 00 00',
      email: 'aissatou@email.com',
      type: 'vendeur',
      interestedIn: ['terrain'],
      notes: 'Souhaite vendre terrain à Ratoma',
      createdAt: new Date().toISOString()
    }
  ]);

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('fr-GN', { style: 'decimal' }).format(price) + ' GNF';
  };

  const getStatusBadge = (status: Property['status']) => {
    const styles = {
      disponible: 'bg-green-100 text-green-800',
      sous_option: 'bg-yellow-100 text-yellow-800',
      vendu: 'bg-red-100 text-red-800',
      loué: 'bg-blue-100 text-blue-800'
    };
    const labels = {
      disponible: 'Disponible',
      sous_option: 'Sous option',
      vendu: 'Vendu',
      loué: 'Loué'
    };
    return <Badge className={styles[status]}>{labels[status]}</Badge>;
  };

  const getVisitStatusBadge = (status: Visit['status']) => {
    const styles = {
      planifiée: 'bg-blue-100 text-blue-800',
      effectuée: 'bg-green-100 text-green-800',
      annulée: 'bg-red-100 text-red-800'
    };
    return <Badge className={styles[status]}>{status.charAt(0).toUpperCase() + status.slice(1)}</Badge>;
  };

  const handleAddProperty = () => {
    toast.success('Annonce ajoutée avec succès');
    setShowNewPropertyDialog(false);
  };

  const handleAddVisit = () => {
    toast.success('Visite planifiée avec succès');
    setShowNewVisitDialog(false);
  };

  const handleAddContact = () => {
    toast.success('Contact ajouté avec succès');
    setShowNewContactDialog(false);
  };

  // Statistiques
  const totalProperties = properties.length;
  const propertiesForSale = properties.filter(p => p.type === 'vente').length;
  const propertiesForRent = properties.filter(p => p.type === 'location').length;
  const totalViews = properties.reduce((acc, p) => acc + p.views, 0);
  const todayVisits = visits.filter(v => v.date === new Date().toISOString().split('T')[0]).length;
  const totalContacts = contacts.length;

  return (
    <div className="space-y-6">
      {/* En-tête */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-primary/10 rounded-xl">
            <Home className="w-8 h-8 text-primary" />
          </div>
          <div>
            <h2 className="text-2xl font-bold">{businessName || 'Agence Immobilière'}</h2>
            <p className="text-muted-foreground">Gestion des biens et clients</p>
          </div>
        </div>
      </div>

      {/* Statistiques */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Building2 className="h-4 w-4 text-blue-500" />
              <span className="text-sm text-muted-foreground">Total biens</span>
            </div>
            <p className="text-2xl font-bold mt-1">{totalProperties}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <DollarSign className="h-4 w-4 text-green-500" />
              <span className="text-sm text-muted-foreground">À vendre</span>
            </div>
            <p className="text-2xl font-bold mt-1">{propertiesForSale}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Home className="h-4 w-4 text-purple-500" />
              <span className="text-sm text-muted-foreground">À louer</span>
            </div>
            <p className="text-2xl font-bold mt-1">{propertiesForRent}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Eye className="h-4 w-4 text-orange-500" />
              <span className="text-sm text-muted-foreground">Vues totales</span>
            </div>
            <p className="text-2xl font-bold mt-1">{totalViews}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-yellow-500" />
              <span className="text-sm text-muted-foreground">Visites aujourd'hui</span>
            </div>
            <p className="text-2xl font-bold mt-1">{todayVisits}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 text-cyan-500" />
              <span className="text-sm text-muted-foreground">Contacts</span>
            </div>
            <p className="text-2xl font-bold mt-1">{totalContacts}</p>
          </CardContent>
        </Card>
      </div>

      {/* Onglets */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="annonces">Annonces</TabsTrigger>
          <TabsTrigger value="visites">Visites</TabsTrigger>
          <TabsTrigger value="contacts">Contacts</TabsTrigger>
        </TabsList>

        {/* Onglet Annonces */}
        <TabsContent value="annonces" className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input 
                placeholder="Rechercher un bien..." 
                className="pl-10"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <Dialog open={showNewPropertyDialog} onOpenChange={setShowNewPropertyDialog}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  Nouvelle annonce
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl">
                <DialogHeader>
                  <DialogTitle>Ajouter une annonce</DialogTitle>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Type d'offre</Label>
                      <Select>
                        <SelectTrigger>
                          <SelectValue placeholder="Sélectionner" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="vente">Vente</SelectItem>
                          <SelectItem value="location">Location</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Type de bien</Label>
                      <Select>
                        <SelectTrigger>
                          <SelectValue placeholder="Sélectionner" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="appartement">Appartement</SelectItem>
                          <SelectItem value="maison">Maison</SelectItem>
                          <SelectItem value="terrain">Terrain</SelectItem>
                          <SelectItem value="bureau">Bureau</SelectItem>
                          <SelectItem value="commerce">Commerce</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Titre de l'annonce</Label>
                    <Input placeholder="Ex: Appartement 3 pièces vue mer" />
                  </div>
                  <div className="grid grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <Label>Prix (GNF)</Label>
                      <Input type="number" placeholder="0" />
                    </div>
                    <div className="space-y-2">
                      <Label>Surface (m²)</Label>
                      <Input type="number" placeholder="0" />
                    </div>
                    <div className="space-y-2">
                      <Label>Nombre de pièces</Label>
                      <Input type="number" placeholder="0" />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Adresse</Label>
                    <Input placeholder="Adresse complète du bien" />
                  </div>
                  <div className="space-y-2">
                    <Label>Description</Label>
                    <Textarea placeholder="Décrivez le bien en détail..." rows={4} />
                  </div>
                </div>
                <div className="flex justify-end gap-2">
                  <Button variant="outline" onClick={() => setShowNewPropertyDialog(false)}>
                    Annuler
                  </Button>
                  <Button onClick={handleAddProperty}>
                    Publier l'annonce
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>

          <div className="grid gap-4">
            {properties.map((property) => (
              <Card key={property.id} className="overflow-hidden">
                <div className="flex">
                  <div className="w-48 h-32 bg-muted flex items-center justify-center flex-shrink-0">
                    <Building2 className="h-12 w-12 text-muted-foreground" />
                  </div>
                  <CardContent className="flex-1 p-4">
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="font-semibold">{property.title}</h3>
                          {getStatusBadge(property.status)}
                        </div>
                        <p className="text-primary font-bold text-lg">
                          {formatPrice(property.price)}
                          {property.type === 'location' && <span className="text-sm font-normal">/mois</span>}
                        </p>
                        <div className="flex items-center gap-4 text-sm text-muted-foreground mt-2">
                          <span className="flex items-center gap-1">
                            <Maximize className="h-3 w-3" />
                            {property.surface} m²
                          </span>
                          <span className="flex items-center gap-1">
                            <Bed className="h-3 w-3" />
                            {property.rooms} pièces
                          </span>
                          <span className="flex items-center gap-1">
                            <Bath className="h-3 w-3" />
                            {property.bathrooms} sdb
                          </span>
                        </div>
                        <p className="text-sm text-muted-foreground flex items-center gap-1 mt-1">
                          <MapPin className="h-3 w-3" />
                          {property.address}
                        </p>
                      </div>
                      <div className="text-right text-sm text-muted-foreground">
                        <div className="flex items-center gap-1">
                          <Eye className="h-3 w-3" />
                          {property.views} vues
                        </div>
                        <div className="flex items-center gap-1">
                          <Heart className="h-3 w-3" />
                          {property.favorites} favoris
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </div>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* Onglet Visites */}
        <TabsContent value="visites" className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold">Visites planifiées</h3>
            <Dialog open={showNewVisitDialog} onOpenChange={setShowNewVisitDialog}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  Planifier une visite
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Planifier une visite</DialogTitle>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                  <div className="space-y-2">
                    <Label>Bien à visiter</Label>
                    <Select>
                      <SelectTrigger>
                        <SelectValue placeholder="Sélectionner un bien" />
                      </SelectTrigger>
                      <SelectContent>
                        {properties.map((p) => (
                          <SelectItem key={p.id} value={p.id}>{p.title}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Nom du client</Label>
                    <Input placeholder="Nom complet" />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Téléphone</Label>
                      <Input placeholder="+224 6XX XX XX XX" />
                    </div>
                    <div className="space-y-2">
                      <Label>Email</Label>
                      <Input type="email" placeholder="email@exemple.com" />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Date</Label>
                      <Input type="date" />
                    </div>
                    <div className="space-y-2">
                      <Label>Heure</Label>
                      <Input type="time" />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Notes</Label>
                    <Textarea placeholder="Notes sur la visite..." />
                  </div>
                </div>
                <div className="flex justify-end gap-2">
                  <Button variant="outline" onClick={() => setShowNewVisitDialog(false)}>
                    Annuler
                  </Button>
                  <Button onClick={handleAddVisit}>
                    Planifier
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>

          <div className="space-y-3">
            {visits.map((visit) => (
              <Card key={visit.id}>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="font-medium">{visit.propertyTitle}</h4>
                        {getVisitStatusBadge(visit.status)}
                      </div>
                      <p className="text-sm text-muted-foreground mt-1">
                        Client: {visit.clientName}
                      </p>
                      <div className="flex items-center gap-4 text-sm text-muted-foreground mt-1">
                        <span className="flex items-center gap-1">
                          <Phone className="h-3 w-3" />
                          {visit.clientPhone}
                        </span>
                        <span className="flex items-center gap-1">
                          <Mail className="h-3 w-3" />
                          {visit.clientEmail}
                        </span>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-medium">{visit.date}</p>
                      <p className="text-sm text-muted-foreground">{visit.time}</p>
                    </div>
                  </div>
                  {visit.notes && (
                    <p className="text-sm text-muted-foreground mt-2 pt-2 border-t">
                      {visit.notes}
                    </p>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* Onglet Contacts */}
        <TabsContent value="contacts" className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold">Carnet de contacts</h3>
            <Dialog open={showNewContactDialog} onOpenChange={setShowNewContactDialog}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  Nouveau contact
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Ajouter un contact</DialogTitle>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                  <div className="space-y-2">
                    <Label>Nom complet</Label>
                    <Input placeholder="Nom et prénom" />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Téléphone</Label>
                      <Input placeholder="+224 6XX XX XX XX" />
                    </div>
                    <div className="space-y-2">
                      <Label>Email</Label>
                      <Input type="email" placeholder="email@exemple.com" />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Type de contact</Label>
                      <Select>
                        <SelectTrigger>
                          <SelectValue placeholder="Sélectionner" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="acheteur">Acheteur</SelectItem>
                          <SelectItem value="vendeur">Vendeur</SelectItem>
                          <SelectItem value="locataire">Locataire</SelectItem>
                          <SelectItem value="bailleur">Bailleur</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Budget (GNF)</Label>
                      <Input type="number" placeholder="0" />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Notes</Label>
                    <Textarea placeholder="Informations supplémentaires..." />
                  </div>
                </div>
                <div className="flex justify-end gap-2">
                  <Button variant="outline" onClick={() => setShowNewContactDialog(false)}>
                    Annuler
                  </Button>
                  <Button onClick={handleAddContact}>
                    Ajouter
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>

          <div className="grid gap-3">
            {contacts.map((contact) => (
              <Card key={contact.id}>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                        <Users className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="font-medium">{contact.name}</h4>
                          <Badge variant="outline">{contact.type}</Badge>
                        </div>
                        <div className="flex items-center gap-4 text-sm text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <Phone className="h-3 w-3" />
                            {contact.phone}
                          </span>
                          <span className="flex items-center gap-1">
                            <Mail className="h-3 w-3" />
                            {contact.email}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      {contact.budget && (
                        <p className="font-medium text-primary">{formatPrice(contact.budget)}</p>
                      )}
                    </div>
                  </div>
                  {contact.notes && (
                    <p className="text-sm text-muted-foreground mt-2 pt-2 border-t">
                      {contact.notes}
                    </p>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}

export default RealEstateModule;
