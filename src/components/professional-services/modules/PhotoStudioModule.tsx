/**
 * MODULE STUDIO PHOTO
 * Gestion du portfolio, réservations et galeries photos
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
  Camera, 
  Calendar,
  Image,
  Users,
  Clock,
  Plus,
  Eye,
  Heart,
  DollarSign,
  FolderOpen,
  Star
} from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';

interface PhotoStudioModuleProps {
  serviceId: string;
  businessName?: string;
}

interface PhotoSession {
  id: string;
  clientName: string;
  clientPhone: string;
  sessionType: 'portrait' | 'mariage' | 'evenement' | 'produit' | 'mode';
  date: string;
  time: string;
  duration: number;
  location: string;
  price: number;
  status: 'confirmee' | 'en_attente' | 'terminee' | 'annulee';
  notes?: string;
}

interface Gallery {
  id: string;
  name: string;
  category: string;
  photoCount: number;
  views: number;
  likes: number;
  createdAt: string;
  isPublic: boolean;
  coverImage?: string;
}

interface Service {
  id: string;
  name: string;
  description: string;
  duration: number;
  price: number;
  includes: string[];
  isPopular: boolean;
}

export function PhotoStudioModule({ serviceId, businessName }: PhotoStudioModuleProps) {
  const [activeTab, setActiveTab] = useState('reservations');
  const [showNewSessionDialog, setShowNewSessionDialog] = useState(false);
  const [showNewGalleryDialog, setShowNewGalleryDialog] = useState(false);

  // Données simulées
  const [sessions] = useState<PhotoSession[]>([
    {
      id: '1',
      clientName: 'Mamadou & Fatoumata',
      clientPhone: '+224 620 00 00 00',
      sessionType: 'mariage',
      date: new Date().toISOString().split('T')[0],
      time: '09:00',
      duration: 480,
      location: 'Hôtel Noom, Conakry',
      price: 5000000,
      status: 'confirmee',
      notes: 'Mariage traditionnel + moderne'
    },
    {
      id: '2',
      clientName: 'Entreprise Alpha',
      clientPhone: '+224 621 00 00 00',
      sessionType: 'produit',
      date: new Date(Date.now() + 86400000).toISOString().split('T')[0],
      time: '14:00',
      duration: 180,
      location: 'Studio',
      price: 800000,
      status: 'confirmee'
    },
    {
      id: '3',
      clientName: 'Aissatou Diallo',
      clientPhone: '+224 622 00 00 00',
      sessionType: 'portrait',
      date: new Date(Date.now() + 86400000 * 2).toISOString().split('T')[0],
      time: '10:00',
      duration: 120,
      location: 'Studio',
      price: 300000,
      status: 'en_attente'
    }
  ]);

  const [galleries] = useState<Gallery[]>([
    {
      id: '1',
      name: 'Mariage Diallo-Barry',
      category: 'Mariages',
      photoCount: 450,
      views: 1250,
      likes: 89,
      createdAt: '2024-02-15',
      isPublic: true
    },
    {
      id: '2',
      name: 'Collection Mode Été 2024',
      category: 'Mode',
      photoCount: 85,
      views: 890,
      likes: 156,
      createdAt: '2024-01-20',
      isPublic: true
    },
    {
      id: '3',
      name: 'Portraits Corporate - Banque XYZ',
      category: 'Corporate',
      photoCount: 45,
      views: 234,
      likes: 23,
      createdAt: '2024-03-01',
      isPublic: false
    }
  ]);

  const [services] = useState<Service[]>([
    {
      id: '1',
      name: 'Portrait Studio',
      description: 'Séance photo portrait professionnelle en studio',
      duration: 60,
      price: 200000,
      includes: ['20 photos retouchées', 'Maquillage', '3 tenues'],
      isPopular: true
    },
    {
      id: '2',
      name: 'Mariage Complet',
      description: 'Couverture complète de votre journée de mariage',
      duration: 480,
      price: 5000000,
      includes: ['500+ photos', 'Album premium', 'Vidéo highlights', '2 photographes'],
      isPopular: true
    },
    {
      id: '3',
      name: 'Photo Produit',
      description: 'Photos professionnelles pour e-commerce et catalogue',
      duration: 180,
      price: 50000,
      includes: ['10 produits', 'Fond blanc', 'Retouches'],
      isPopular: false
    },
    {
      id: '4',
      name: 'Événement',
      description: 'Couverture photo d\'événements et cérémonies',
      duration: 240,
      price: 800000,
      includes: ['200+ photos', 'Retouches', 'Livraison rapide'],
      isPopular: false
    }
  ]);

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('fr-GN', { style: 'decimal' }).format(price) + ' GNF';
  };

  const getStatusBadge = (status: PhotoSession['status']) => {
    const styles = {
      confirmee: 'bg-green-100 text-green-800',
      en_attente: 'bg-yellow-100 text-yellow-800',
      terminee: 'bg-blue-100 text-blue-800',
      annulee: 'bg-red-100 text-red-800'
    };
    const labels = {
      confirmee: 'Confirmée',
      en_attente: 'En attente',
      terminee: 'Terminée',
      annulee: 'Annulée'
    };
    return <Badge className={styles[status]}>{labels[status]}</Badge>;
  };

  const getSessionTypeLabel = (type: PhotoSession['sessionType']) => {
    const labels = {
      portrait: '📷 Portrait',
      mariage: '💒 Mariage',
      evenement: '🎉 Événement',
      produit: '📦 Produit',
      mode: '👗 Mode'
    };
    return labels[type];
  };

  const handleAddSession = () => {
    toast.success('Réservation créée avec succès');
    setShowNewSessionDialog(false);
  };

  const handleAddGallery = () => {
    toast.success('Galerie créée avec succès');
    setShowNewGalleryDialog(false);
  };

  // Statistiques
  const upcomingSessions = sessions.filter(s => s.status === 'confirmee' || s.status === 'en_attente').length;
  const totalGalleries = galleries.length;
  const totalViews = galleries.reduce((acc, g) => acc + g.views, 0);
  const monthlyRevenue = sessions.filter(s => s.status !== 'annulee').reduce((acc, s) => acc + s.price, 0);

  return (
    <div className="space-y-6">
      {/* En-tête */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-primary/10 rounded-xl">
            <Camera className="w-8 h-8 text-primary" />
          </div>
          <div>
            <h2 className="text-2xl font-bold">{businessName || 'Studio Photo'}</h2>
            <p className="text-muted-foreground">Gestion du studio</p>
          </div>
        </div>
      </div>

      {/* Statistiques */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-blue-500" />
              <span className="text-sm text-muted-foreground">Réservations</span>
            </div>
            <p className="text-2xl font-bold mt-1">{upcomingSessions}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <FolderOpen className="h-4 w-4 text-purple-500" />
              <span className="text-sm text-muted-foreground">Galeries</span>
            </div>
            <p className="text-2xl font-bold mt-1">{totalGalleries}</p>
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
              <DollarSign className="h-4 w-4 text-green-500" />
              <span className="text-sm text-muted-foreground">Revenus</span>
            </div>
            <p className="text-lg font-bold mt-1">{formatPrice(monthlyRevenue)}</p>
          </CardContent>
        </Card>
      </div>

      {/* Onglets */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="reservations">Réservations</TabsTrigger>
          <TabsTrigger value="galeries">Galeries</TabsTrigger>
          <TabsTrigger value="services">Services</TabsTrigger>
        </TabsList>

        {/* Onglet Réservations */}
        <TabsContent value="reservations" className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold">Séances à venir</h3>
            <Dialog open={showNewSessionDialog} onOpenChange={setShowNewSessionDialog}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  Nouvelle réservation
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Créer une réservation</DialogTitle>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                  <div className="space-y-2">
                    <Label>Nom du client</Label>
                    <Input placeholder="Nom complet" />
                  </div>
                  <div className="space-y-2">
                    <Label>Téléphone</Label>
                    <Input placeholder="+224 6XX XX XX XX" />
                  </div>
                  <div className="space-y-2">
                    <Label>Type de séance</Label>
                    <Select>
                      <SelectTrigger>
                        <SelectValue placeholder="Sélectionner" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="portrait">Portrait</SelectItem>
                        <SelectItem value="mariage">Mariage</SelectItem>
                        <SelectItem value="evenement">Événement</SelectItem>
                        <SelectItem value="produit">Produit</SelectItem>
                        <SelectItem value="mode">Mode</SelectItem>
                      </SelectContent>
                    </Select>
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
                    <Label>Lieu</Label>
                    <Input placeholder="Studio ou lieu externe" />
                  </div>
                  <div className="space-y-2">
                    <Label>Prix (GNF)</Label>
                    <Input type="number" placeholder="0" />
                  </div>
                  <div className="space-y-2">
                    <Label>Notes</Label>
                    <Textarea placeholder="Notes supplémentaires..." />
                  </div>
                </div>
                <div className="flex justify-end gap-2">
                  <Button variant="outline" onClick={() => setShowNewSessionDialog(false)}>
                    Annuler
                  </Button>
                  <Button onClick={handleAddSession}>
                    Réserver
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>

          <div className="space-y-3">
            {sessions.map((session) => (
              <Card key={session.id}>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <h4 className="font-semibold">{session.clientName}</h4>
                        {getStatusBadge(session.status)}
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {getSessionTypeLabel(session.sessionType)}
                      </p>
                      <div className="flex items-center gap-4 text-sm text-muted-foreground mt-1">
                        <span className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          {session.date}
                        </span>
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {session.time} ({session.duration / 60}h)
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">
                        📍 {session.location}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-primary text-lg">{formatPrice(session.price)}</p>
                      {session.notes && (
                        <p className="text-xs text-muted-foreground max-w-[150px] truncate">
                          {session.notes}
                        </p>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* Onglet Galeries */}
        <TabsContent value="galeries" className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold">Mes galeries</h3>
            <Dialog open={showNewGalleryDialog} onOpenChange={setShowNewGalleryDialog}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  Nouvelle galerie
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Créer une galerie</DialogTitle>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                  <div className="space-y-2">
                    <Label>Nom de la galerie</Label>
                    <Input placeholder="Ex: Mariage Diallo-Barry" />
                  </div>
                  <div className="space-y-2">
                    <Label>Catégorie</Label>
                    <Select>
                      <SelectTrigger>
                        <SelectValue placeholder="Sélectionner" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="mariages">Mariages</SelectItem>
                        <SelectItem value="portraits">Portraits</SelectItem>
                        <SelectItem value="evenements">Événements</SelectItem>
                        <SelectItem value="mode">Mode</SelectItem>
                        <SelectItem value="corporate">Corporate</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex items-center gap-2">
                    <input type="checkbox" id="public" className="rounded" />
                    <Label htmlFor="public">Galerie publique</Label>
                  </div>
                </div>
                <div className="flex justify-end gap-2">
                  <Button variant="outline" onClick={() => setShowNewGalleryDialog(false)}>
                    Annuler
                  </Button>
                  <Button onClick={handleAddGallery}>
                    Créer
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>

          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {galleries.map((gallery) => (
              <Card key={gallery.id} className="overflow-hidden">
                <div className="h-32 bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center">
                  <Image className="h-12 w-12 text-primary/50" />
                </div>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="font-semibold truncate">{gallery.name}</h4>
                    <Badge variant={gallery.isPublic ? 'default' : 'secondary'}>
                      {gallery.isPublic ? 'Public' : 'Privé'}
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground mb-2">{gallery.category}</p>
                  <div className="flex items-center justify-between text-sm text-muted-foreground">
                    <span>{gallery.photoCount} photos</span>
                    <div className="flex items-center gap-3">
                      <span className="flex items-center gap-1">
                        <Eye className="h-3 w-3" />
                        {gallery.views}
                      </span>
                      <span className="flex items-center gap-1">
                        <Heart className="h-3 w-3" />
                        {gallery.likes}
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* Onglet Services */}
        <TabsContent value="services" className="space-y-4">
          <h3 className="font-semibold">Tarifs et services</h3>
          <div className="grid gap-4 md:grid-cols-2">
            {services.map((service) => (
              <Card key={service.id}>
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg">{service.name}</CardTitle>
                    {service.isPopular && (
                      <Badge className="bg-yellow-100 text-yellow-800">
                        <Star className="h-3 w-3 mr-1" />
                        Populaire
                      </Badge>
                    )}
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground mb-3">{service.description}</p>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground mb-3">
                    <Clock className="h-4 w-4" />
                    <span>{service.duration} minutes</span>
                  </div>
                  <ul className="text-sm space-y-1 mb-4">
                    {service.includes.map((item, i) => (
                      <li key={i} className="flex items-center gap-2">
                        <span className="text-green-500">✓</span>
                        {item}
                      </li>
                    ))}
                  </ul>
                  <div className="flex items-center justify-between pt-3 border-t">
                    <p className="text-xl font-bold text-primary">{formatPrice(service.price)}</p>
                    <Button size="sm">Réserver</Button>
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

export default PhotoStudioModule;
