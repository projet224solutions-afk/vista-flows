/**
 * MODULE AGENCE IMMOBILIÈRE - v2
 * Dashboard moderne avec données Supabase
 */

import { useState } from 'react';
import { useFormatCurrency } from '@/hooks/useFormatCurrency';
import { useRealEstateData } from '@/hooks/useRealEstateData';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { 
  Home, Building2, Users, Calendar, MapPin, Phone, Mail,
  Plus, Search, Eye, Heart, DollarSign, TrendingUp,
  Loader2, CheckCircle, XCircle, Clock
} from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { PropertyCard } from './real-estate/PropertyCard';
import { NewPropertyDialog } from './real-estate/NewPropertyDialog';

interface RealEstateModuleProps {
  serviceId: string;
  businessName?: string;
}

export function RealEstateModule({ serviceId, businessName }: RealEstateModuleProps) {
  const {
    properties, visits, contacts, stats, loading, saving,
    createProperty, updatePropertyStatus, deleteProperty,
    createVisit, updateVisitStatus, createContact,
  } = useRealEstateData(serviceId);

  const [activeTab, setActiveTab] = useState('annonces');
  const [showNewProperty, setShowNewProperty] = useState(false);
  const [showNewVisit, setShowNewVisit] = useState(false);
  const [showNewContact, setShowNewContact] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<string>('all');

  // Visit form state
  const [visitForm, setVisitForm] = useState({
    property_id: '', client_name: '', client_phone: '', client_email: '',
    visit_date: '', visit_time: '', notes: ''
  });

  // Contact form state
  const [contactForm, setContactForm] = useState({
    name: '', phone: '', email: '', contact_type: 'acheteur',
    budget: '', notes: ''
  });

  const formatPrice = useFormatCurrency();

  // Filter properties
  const filteredProperties = properties.filter(p => {
    const matchesSearch = p.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.address?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.city?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesFilter = filterType === 'all' || p.offer_type === filterType || p.status === filterType;
    return matchesSearch && matchesFilter;
  });

  const handleAddVisit = async () => {
    if (!visitForm.client_name || !visitForm.visit_date) {
      toast.error('Nom et date requis');
      return;
    }
    const ok = await createVisit(visitForm);
    if (ok) {
      setVisitForm({ property_id: '', client_name: '', client_phone: '', client_email: '', visit_date: '', visit_time: '', notes: '' });
      setShowNewVisit(false);
    }
  };

  const handleAddContact = async () => {
    if (!contactForm.name) {
      toast.error('Nom requis');
      return;
    }
    const ok = await createContact({
      ...contactForm,
      budget: contactForm.budget ? parseFloat(contactForm.budget) : undefined,
    });
    if (ok) {
      setContactForm({ name: '', phone: '', email: '', contact_type: 'acheteur', budget: '', notes: '' });
      setShowNewContact(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="text-center space-y-3">
          <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />
          <p className="text-muted-foreground">Chargement du module immobilier...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-primary/10 rounded-xl">
            <Home className="w-7 h-7 text-primary" />
          </div>
          <div>
            <h2 className="text-xl sm:text-2xl font-bold">{businessName || 'Agence Immobilière'}</h2>
            <p className="text-sm text-muted-foreground">Gestion de vos biens et clients</p>
          </div>
        </div>
        <Button onClick={() => setShowNewProperty(true)} className="gap-2">
          <Plus className="h-4 w-4" />
          Publier un bien
        </Button>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Card className="border-l-4 border-l-primary">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground font-medium">Total biens</p>
                <p className="text-2xl font-bold">{stats.totalProperties}</p>
              </div>
              <Building2 className="h-8 w-8 text-primary/20" />
            </div>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-emerald-500">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground font-medium">Disponibles</p>
                <p className="text-2xl font-bold">{stats.available}</p>
              </div>
              <CheckCircle className="h-8 w-8 text-emerald-500/20" />
            </div>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-amber-500">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground font-medium">Visites à venir</p>
                <p className="text-2xl font-bold">{stats.pendingVisits}</p>
              </div>
              <Calendar className="h-8 w-8 text-amber-500/20" />
            </div>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-blue-500">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground font-medium">Contacts</p>
                <p className="text-2xl font-bold">{stats.totalContacts}</p>
              </div>
              <Users className="h-8 w-8 text-blue-500/20" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Quick stats bar */}
      <div className="flex flex-wrap gap-2">
        <Badge variant="outline" className="gap-1">
          <DollarSign className="h-3 w-3" /> {stats.forSale} à vendre
        </Badge>
        <Badge variant="outline" className="gap-1">
          <Home className="h-3 w-3" /> {stats.forRent} à louer
        </Badge>
        <Badge variant="outline" className="gap-1">
          <Eye className="h-3 w-3" /> {stats.totalViews} vues totales
        </Badge>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="annonces" className="gap-1">
            <Building2 className="h-3.5 w-3.5" /> Biens
          </TabsTrigger>
          <TabsTrigger value="visites" className="gap-1">
            <Calendar className="h-3.5 w-3.5" /> Visites
          </TabsTrigger>
          <TabsTrigger value="contacts" className="gap-1">
            <Users className="h-3.5 w-3.5" /> Contacts
          </TabsTrigger>
        </TabsList>

        {/* === BIENS === */}
        <TabsContent value="annonces" className="space-y-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
            <div className="relative flex-1 w-full max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input 
                placeholder="Rechercher un bien..."
                className="pl-10"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
              />
            </div>
            <div className="flex gap-2 flex-wrap">
              {['all', 'vente', 'location', 'disponible', 'vendu', 'loue'].map(f => (
                <button
                  key={f}
                  onClick={() => setFilterType(f)}
                  className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                    filterType === f ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground hover:bg-accent'
                  }`}
                >
                  {f === 'all' ? 'Tous' : f === 'vente' ? 'Vente' : f === 'location' ? 'Location' : f === 'loue' ? 'Loué' : f.charAt(0).toUpperCase() + f.slice(1)}
                </button>
              ))}
            </div>
          </div>

          {filteredProperties.length === 0 ? (
            <Card className="border-dashed">
              <CardContent className="py-12 text-center">
                <Building2 className="h-12 w-12 text-muted-foreground/30 mx-auto mb-3" />
                <h3 className="font-semibold text-lg">Aucun bien immobilier</h3>
                <p className="text-muted-foreground text-sm mt-1">
                  {searchQuery ? 'Aucun résultat pour votre recherche' : 'Commencez par publier votre premier bien'}
                </p>
                {!searchQuery && (
                  <Button onClick={() => setShowNewProperty(true)} className="mt-4 gap-2">
                    <Plus className="h-4 w-4" /> Publier un bien
                  </Button>
                )}
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4">
              {filteredProperties.map(property => (
                <PropertyCard
                  key={property.id}
                  property={property}
                  onStatusChange={updatePropertyStatus}
                  onDelete={deleteProperty}
                />
              ))}
            </div>
          )}
        </TabsContent>

        {/* === VISITES === */}
        <TabsContent value="visites" className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold">Visites planifiées ({visits.length})</h3>
            <Dialog open={showNewVisit} onOpenChange={setShowNewVisit}>
              <DialogTrigger asChild>
                <Button size="sm"><Plus className="h-4 w-4 mr-2" /> Planifier</Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Planifier une visite</DialogTitle>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                  {properties.length > 0 && (
                    <div className="space-y-2">
                      <Label>Bien concerné</Label>
                      <Select value={visitForm.property_id} onValueChange={v => setVisitForm(prev => ({...prev, property_id: v}))}>
                        <SelectTrigger><SelectValue placeholder="Sélectionner un bien" /></SelectTrigger>
                        <SelectContent>
                          {properties.map(p => (
                            <SelectItem key={p.id} value={p.id}>{p.title}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                  <div className="space-y-2">
                    <Label>Nom du client *</Label>
                    <Input value={visitForm.client_name} onChange={e => setVisitForm(prev => ({...prev, client_name: e.target.value}))} />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Téléphone</Label>
                      <Input value={visitForm.client_phone} onChange={e => setVisitForm(prev => ({...prev, client_phone: e.target.value}))} />
                    </div>
                    <div className="space-y-2">
                      <Label>Email</Label>
                      <Input value={visitForm.client_email} onChange={e => setVisitForm(prev => ({...prev, client_email: e.target.value}))} />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Date *</Label>
                      <Input type="date" value={visitForm.visit_date} onChange={e => setVisitForm(prev => ({...prev, visit_date: e.target.value}))} />
                    </div>
                    <div className="space-y-2">
                      <Label>Heure</Label>
                      <Input type="time" value={visitForm.visit_time} onChange={e => setVisitForm(prev => ({...prev, visit_time: e.target.value}))} />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Notes</Label>
                    <Textarea value={visitForm.notes} onChange={e => setVisitForm(prev => ({...prev, notes: e.target.value}))} />
                  </div>
                </div>
                <div className="flex justify-end gap-2">
                  <Button variant="outline" onClick={() => setShowNewVisit(false)}>Annuler</Button>
                  <Button onClick={handleAddVisit}>Planifier</Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>

          {visits.length === 0 ? (
            <Card className="border-dashed">
              <CardContent className="py-8 text-center">
                <Calendar className="h-10 w-10 text-muted-foreground/30 mx-auto mb-2" />
                <p className="text-muted-foreground text-sm">Aucune visite planifiée</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-3">
              {visits.map(visit => (
                <Card key={visit.id}>
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <h4 className="font-medium">{visit.client_name}</h4>
                          <Badge variant={
                            visit.status === 'planifiee' ? 'default' :
                            visit.status === 'effectuee' ? 'secondary' : 'destructive'
                          }>
                            {visit.status === 'planifiee' ? '📅 Planifiée' :
                             visit.status === 'effectuee' ? '✅ Effectuée' : '❌ Annulée'}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-4 text-sm text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            {visit.visit_date} {visit.visit_time && `à ${visit.visit_time}`}
                          </span>
                          {visit.client_phone && (
                            <span className="flex items-center gap-1">
                              <Phone className="h-3 w-3" /> {visit.client_phone}
                            </span>
                          )}
                        </div>
                        {visit.notes && <p className="text-xs text-muted-foreground mt-1">{visit.notes}</p>}
                      </div>
                      {visit.status === 'planifiee' && (
                        <div className="flex gap-1">
                          <Button size="sm" variant="ghost" onClick={() => updateVisitStatus(visit.id, 'effectuee')}>
                            <CheckCircle className="h-4 w-4 text-emerald-500" />
                          </Button>
                          <Button size="sm" variant="ghost" onClick={() => updateVisitStatus(visit.id, 'annulee')}>
                            <XCircle className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* === CONTACTS === */}
        <TabsContent value="contacts" className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold">Contacts ({contacts.length})</h3>
            <Dialog open={showNewContact} onOpenChange={setShowNewContact}>
              <DialogTrigger asChild>
                <Button size="sm"><Plus className="h-4 w-4 mr-2" /> Ajouter</Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Ajouter un contact</DialogTitle>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                  <div className="space-y-2">
                    <Label>Nom *</Label>
                    <Input value={contactForm.name} onChange={e => setContactForm(prev => ({...prev, name: e.target.value}))} />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Téléphone</Label>
                      <Input value={contactForm.phone} onChange={e => setContactForm(prev => ({...prev, phone: e.target.value}))} />
                    </div>
                    <div className="space-y-2">
                      <Label>Email</Label>
                      <Input value={contactForm.email} onChange={e => setContactForm(prev => ({...prev, email: e.target.value}))} />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Type</Label>
                      <Select value={contactForm.contact_type} onValueChange={v => setContactForm(prev => ({...prev, contact_type: v}))}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
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
                      <Input type="number" value={contactForm.budget} onChange={e => setContactForm(prev => ({...prev, budget: e.target.value}))} />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Notes</Label>
                    <Textarea value={contactForm.notes} onChange={e => setContactForm(prev => ({...prev, notes: e.target.value}))} />
                  </div>
                </div>
                <div className="flex justify-end gap-2">
                  <Button variant="outline" onClick={() => setShowNewContact(false)}>Annuler</Button>
                  <Button onClick={handleAddContact}>Ajouter</Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>

          {contacts.length === 0 ? (
            <Card className="border-dashed">
              <CardContent className="py-8 text-center">
                <Users className="h-10 w-10 text-muted-foreground/30 mx-auto mb-2" />
                <p className="text-muted-foreground text-sm">Aucun contact enregistré</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2">
              {contacts.map(contact => (
                <Card key={contact.id}>
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between mb-2">
                      <h4 className="font-medium">{contact.name}</h4>
                      <Badge variant="outline" className="text-xs">
                        {contact.contact_type === 'acheteur' ? '🔑 Acheteur' :
                         contact.contact_type === 'vendeur' ? '💰 Vendeur' :
                         contact.contact_type === 'locataire' ? '📋 Locataire' : '🏠 Bailleur'}
                      </Badge>
                    </div>
                    <div className="space-y-1 text-sm text-muted-foreground">
                      {contact.phone && (
                        <p className="flex items-center gap-1"><Phone className="h-3 w-3" /> {contact.phone}</p>
                      )}
                      {contact.email && (
                        <p className="flex items-center gap-1"><Mail className="h-3 w-3" /> {contact.email}</p>
                      )}
                      {contact.budget && (
                        <p className="flex items-center gap-1"><DollarSign className="h-3 w-3" /> Budget: {formatPrice(contact.budget)}</p>
                      )}
                    </div>
                    {contact.notes && <p className="text-xs text-muted-foreground mt-2 italic">{contact.notes}</p>}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* New Property Dialog */}
      <NewPropertyDialog
        open={showNewProperty}
        onClose={() => setShowNewProperty(false)}
        onSubmit={createProperty}
        saving={saving}
      />
    </div>
  );
}
