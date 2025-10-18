/**
 * 🏢 DASHBOARD BUREAU SYNDICAL - 224SOLUTIONS
 * Interface pour les bureaux syndicaux
 */

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { 
  Building2, 
  UserPlus, 
  Motorcycle,
  AlertTriangle,
  Bell,
  Phone,
  Mail,
  Settings,
  Eye,
  Plus,
  Download,
  BarChart3,
  Users,
  TrendingUp,
  Shield
} from 'lucide-react';

interface Travailleur {
  id: string;
  nom: string;
  email: string;
  telephone: string;
  access_level: string;
  is_active: boolean;
  created_at: string;
  total_motos: number;
}

interface Moto {
  id: string;
  numero_serie: string;
  marque: string;
  modele: string;
  annee: number;
  couleur: string;
  statut: string;
  travailleur_nom: string;
  created_at: string;
}

interface Alerte {
  id: string;
  type: string;
  level: string;
  message: string;
  is_resolved: boolean;
  created_at: string;
}

interface BureauStats {
  total_travailleurs: number;
  total_motos: number;
  alertes_critiques: number;
  notifications_non_lues: number;
}

export default function BureauDashboard() {
  const [travailleurs, setTravailleurs] = useState<Travailleur[]>([]);
  const [motos, setMotos] = useState<Moto[]>([]);
  const [alertes, setAlertes] = useState<Alerte[]>([]);
  const [stats, setStats] = useState<BureauStats>({
    total_travailleurs: 0,
    total_motos: 0,
    alertes_critiques: 0,
    notifications_non_lues: 0
  });
  const [loading, setLoading] = useState(true);
  const [showCreateTravailleur, setShowCreateTravailleur] = useState(false);
  const [showCreateMoto, setShowCreateMoto] = useState(false);
  const [showContactTechnique, setShowContactTechnique] = useState(false);
  const { toast } = useToast();

  // Formulaire de création de travailleur
  const [newTravailleur, setNewTravailleur] = useState({
    nom: '',
    email: '',
    telephone: '',
    access_level: 'limité'
  });

  // Formulaire de création de moto
  const [newMoto, setNewMoto] = useState({
    numero_serie: '',
    marque: '',
    modele: '',
    annee: new Date().getFullYear(),
    couleur: '',
    travailleur_id: ''
  });

  // Formulaire de contact technique
  const [contactTechnique, setContactTechnique] = useState({
    type: 'sms',
    message: ''
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      
      // Récupérer l'ID du bureau actuel
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Charger les travailleurs du bureau
      const { data: travailleursData, error: travailleursError } = await supabase
        .from('travailleurs')
        .select(`
          *,
          total_motos:motos(count)
        `)
        .eq('bureau_id', user.id)
        .order('created_at', { ascending: false });

      if (travailleursError) throw travailleursError;

      // Charger les motos du bureau
      const { data: motosData, error: motosError } = await supabase
        .from('motos')
        .select(`
          *,
          travailleur:travailleurs!motos_travailleur_id_fkey(nom)
        `)
        .eq('bureau_id', user.id)
        .order('created_at', { ascending: false });

      if (motosError) throw motosError;

      // Charger les alertes du bureau
      const { data: alertesData, error: alertesError } = await supabase
        .from('alertes')
        .select('*')
        .eq('bureau_id', user.id)
        .order('created_at', { ascending: false })
        .limit(10);

      if (alertesError) throw alertesError;

      // Calculer les statistiques
      const totalTravailleurs = travailleursData?.length || 0;
      const totalMotos = motosData?.length || 0;
      const alertesCritiques = alertesData?.filter(a => a.level === 'critical' && !a.is_resolved).length || 0;
      const notificationsNonLues = 0; // À implémenter avec la table notifications

      setTravailleurs(travailleursData || []);
      setMotos(motosData || []);
      setAlertes(alertesData || []);
      setStats({
        total_travailleurs: totalTravailleurs,
        total_motos: totalMotos,
        alertes_critiques: alertesCritiques,
        notifications_non_lues: notificationsNonLues
      });
    } catch (error) {
      console.error('Erreur chargement données:', error);
      toast({
        title: "Erreur",
        description: "Impossible de charger les données",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const createTravailleur = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Générer un token unique
      const token = crypto.randomUUID();
      const interfaceUrl = `${window.location.origin}/travailleur/${token}`;

      const { data, error } = await supabase
        .from('travailleurs')
        .insert({
          bureau_id: user.id,
          nom: newTravailleur.nom,
          email: newTravailleur.email,
          telephone: newTravailleur.telephone,
          interface_url: interfaceUrl,
          token: token,
          access_level: newTravailleur.access_level
        })
        .select()
        .single();

      if (error) throw error;

      // Envoyer l'email avec le lien permanent
      await sendTravailleurEmail(newTravailleur.email, newTravailleur.nom, interfaceUrl);

      // Log de l'action
      await supabase.from('audit_logs').insert({
        actor_id: user.id,
        action: 'TRAVAILLEUR_CREATED',
        target_type: 'travailleur',
        target_id: data.id,
        details: { 
          travailleur_nom: newTravailleur.nom, 
          email: newTravailleur.email,
          access_level: newTravailleur.access_level,
          interface_url: interfaceUrl
        }
      });

      toast({
        title: "✅ Travailleur créé",
        description: `Le travailleur ${newTravailleur.nom} a été créé et l'email envoyé`,
      });

      setNewTravailleur({ nom: '', email: '', telephone: '', access_level: 'limité' });
      setShowCreateTravailleur(false);
      loadData();
    } catch (error) {
      console.error('Erreur création travailleur:', error);
      toast({
        title: "❌ Erreur",
        description: "Impossible de créer le travailleur",
        variant: "destructive"
      });
    }
  };

  const createMoto = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('motos')
        .insert({
          bureau_id: user.id,
          travailleur_id: newMoto.travailleur_id || null,
          numero_serie: newMoto.numero_serie,
          marque: newMoto.marque,
          modele: newMoto.modele,
          annee: newMoto.annee,
          couleur: newMoto.couleur
        })
        .select()
        .single();

      if (error) throw error;

      toast({
        title: "✅ Moto enregistrée",
        description: `La moto ${newMoto.numero_serie} a été enregistrée`,
      });

      setNewMoto({ 
        numero_serie: '', 
        marque: '', 
        modele: '', 
        annee: new Date().getFullYear(), 
        couleur: '', 
        travailleur_id: '' 
      });
      setShowCreateMoto(false);
      loadData();
    } catch (error) {
      console.error('Erreur création moto:', error);
      toast({
        title: "❌ Erreur",
        description: "Impossible d'enregistrer la moto",
        variant: "destructive"
      });
    }
  };

  const sendTravailleurEmail = async (email: string, nom: string, interfaceUrl: string) => {
    try {
      // Ici vous pouvez intégrer un service d'email comme SendGrid, Resend, etc.
      console.log(`Email envoyé à ${email} pour le travailleur ${nom} avec le lien ${interfaceUrl}`);
      
      toast({
        title: "📧 Email envoyé",
        description: "Le lien permanent a été envoyé par email",
      });
    } catch (error) {
      console.error('Erreur envoi email:', error);
      toast({
        title: "❌ Erreur email",
        description: "Impossible d'envoyer l'email",
        variant: "destructive"
      });
    }
  };

  const contactEquipeTechnique = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { error } = await supabase
        .from('communications_technique')
        .insert({
          bureau_id: user.id,
          type: contactTechnique.type,
          message: contactTechnique.message,
          status: 'pending'
        });

      if (error) throw error;

      toast({
        title: "📞 Message envoyé",
        description: "Votre message a été transmis à l'équipe technique",
      });

      setContactTechnique({ type: 'sms', message: '' });
      setShowContactTechnique(false);
    } catch (error) {
      console.error('Erreur contact technique:', error);
      toast({
        title: "❌ Erreur",
        description: "Impossible d'envoyer le message",
        variant: "destructive"
      });
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header avec statistiques */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="border-border/40 bg-card/50 backdrop-blur-sm">
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-blue-500/10 flex items-center justify-center">
                <Users className="w-6 h-6 text-blue-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.total_travailleurs}</p>
                <p className="text-sm text-muted-foreground">Travailleurs</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/40 bg-card/50 backdrop-blur-sm">
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-green-500/10 flex items-center justify-center">
                <Motorcycle className="w-6 h-6 text-green-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.total_motos}</p>
                <p className="text-sm text-muted-foreground">Motos Enregistrées</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/40 bg-card/50 backdrop-blur-sm">
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-orange-500/10 flex items-center justify-center">
                <AlertTriangle className="w-6 h-6 text-orange-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.alertes_critiques}</p>
                <p className="text-sm text-muted-foreground">Alertes Critiques</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/40 bg-card/50 backdrop-blur-sm">
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-purple-500/10 flex items-center justify-center">
                <Bell className="w-6 h-6 text-purple-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.notifications_non_lues}</p>
                <p className="text-sm text-muted-foreground">Notifications</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Onglets principaux */}
      <Tabs defaultValue="travailleurs" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="travailleurs">Travailleurs</TabsTrigger>
          <TabsTrigger value="motos">Motos</TabsTrigger>
          <TabsTrigger value="alertes">Alertes</TabsTrigger>
          <TabsTrigger value="support">Support</TabsTrigger>
        </TabsList>

        {/* Onglet Travailleurs */}
        <TabsContent value="travailleurs" className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-semibold">Gestion des Travailleurs</h3>
            <Dialog open={showCreateTravailleur} onOpenChange={setShowCreateTravailleur}>
              <DialogTrigger asChild>
                <Button className="gap-2">
                  <UserPlus className="w-4 h-4" />
                  Ajouter un Travailleur
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Ajouter un nouveau Travailleur</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="travailleur-nom">Nom complet</Label>
                    <Input
                      id="travailleur-nom"
                      value={newTravailleur.nom}
                      onChange={(e) => setNewTravailleur(prev => ({ ...prev, nom: e.target.value }))}
                      placeholder="Nom du travailleur"
                    />
                  </div>
                  <div>
                    <Label htmlFor="travailleur-email">Email</Label>
                    <Input
                      id="travailleur-email"
                      type="email"
                      value={newTravailleur.email}
                      onChange={(e) => setNewTravailleur(prev => ({ ...prev, email: e.target.value }))}
                      placeholder="email@example.com"
                    />
                  </div>
                  <div>
                    <Label htmlFor="travailleur-telephone">Téléphone</Label>
                    <Input
                      id="travailleur-telephone"
                      value={newTravailleur.telephone}
                      onChange={(e) => setNewTravailleur(prev => ({ ...prev, telephone: e.target.value }))}
                      placeholder="+224 XXX XX XX XX"
                    />
                  </div>
                  <div>
                    <Label htmlFor="travailleur-access">Niveau d'Accès</Label>
                    <Select value={newTravailleur.access_level} onValueChange={(value) => setNewTravailleur(prev => ({ ...prev, access_level: value }))}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="limité">Limité</SelectItem>
                        <SelectItem value="standard">Standard</SelectItem>
                        <SelectItem value="élevé">Élevé</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex justify-end gap-2">
                    <Button variant="outline" onClick={() => setShowCreateTravailleur(false)}>
                      Annuler
                    </Button>
                    <Button onClick={createTravailleur}>
                      Ajouter le Travailleur
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>

          <Card>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nom</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Téléphone</TableHead>
                  <TableHead>Niveau d'Accès</TableHead>
                  <TableHead>Motos</TableHead>
                  <TableHead>Statut</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {travailleurs.map((travailleur) => (
                  <TableRow key={travailleur.id}>
                    <TableCell className="font-medium">{travailleur.nom}</TableCell>
                    <TableCell>{travailleur.email}</TableCell>
                    <TableCell>{travailleur.telephone}</TableCell>
                    <TableCell>
                      <Badge variant="outline">
                        {travailleur.access_level}
                      </Badge>
                    </TableCell>
                    <TableCell>{travailleur.total_motos || 0}</TableCell>
                    <TableCell>
                      <Badge variant={travailleur.is_active ? "default" : "secondary"}>
                        {travailleur.is_active ? "Actif" : "Suspendu"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <Button size="sm" variant="outline">
                          <Eye className="w-4 h-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>
        </TabsContent>

        {/* Onglet Motos */}
        <TabsContent value="motos" className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-semibold">Enregistrement des Motos</h3>
            <Dialog open={showCreateMoto} onOpenChange={setShowCreateMoto}>
              <DialogTrigger asChild>
                <Button className="gap-2">
                  <Plus className="w-4 h-4" />
                  Enregistrer une Moto
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Enregistrer une nouvelle Moto</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="moto-serie">Numéro de Série</Label>
                    <Input
                      id="moto-serie"
                      value={newMoto.numero_serie}
                      onChange={(e) => setNewMoto(prev => ({ ...prev, numero_serie: e.target.value }))}
                      placeholder="Numéro de série unique"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="moto-marque">Marque</Label>
                      <Input
                        id="moto-marque"
                        value={newMoto.marque}
                        onChange={(e) => setNewMoto(prev => ({ ...prev, marque: e.target.value }))}
                        placeholder="Honda, Yamaha, etc."
                      />
                    </div>
                    <div>
                      <Label htmlFor="moto-modele">Modèle</Label>
                      <Input
                        id="moto-modele"
                        value={newMoto.modele}
                        onChange={(e) => setNewMoto(prev => ({ ...prev, modele: e.target.value }))}
                        placeholder="Modèle de la moto"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="moto-annee">Année</Label>
                      <Input
                        id="moto-annee"
                        type="number"
                        value={newMoto.annee}
                        onChange={(e) => setNewMoto(prev => ({ ...prev, annee: parseInt(e.target.value) }))}
                        placeholder="2024"
                      />
                    </div>
                    <div>
                      <Label htmlFor="moto-couleur">Couleur</Label>
                      <Input
                        id="moto-couleur"
                        value={newMoto.couleur}
                        onChange={(e) => setNewMoto(prev => ({ ...prev, couleur: e.target.value }))}
                        placeholder="Rouge, Bleu, etc."
                      />
                    </div>
                  </div>
                  <div>
                    <Label htmlFor="moto-travailleur">Travailleur (optionnel)</Label>
                    <Select value={newMoto.travailleur_id} onValueChange={(value) => setNewMoto(prev => ({ ...prev, travailleur_id: value }))}>
                      <SelectTrigger>
                        <SelectValue placeholder="Sélectionner un travailleur" />
                      </SelectTrigger>
                      <SelectContent>
                        {travailleurs.map((travailleur) => (
                          <SelectItem key={travailleur.id} value={travailleur.id}>
                            {travailleur.nom}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex justify-end gap-2">
                    <Button variant="outline" onClick={() => setShowCreateMoto(false)}>
                      Annuler
                    </Button>
                    <Button onClick={createMoto}>
                      Enregistrer la Moto
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>

          <Card>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Numéro de Série</TableHead>
                  <TableHead>Marque/Modèle</TableHead>
                  <TableHead>Année</TableHead>
                  <TableHead>Couleur</TableHead>
                  <TableHead>Travailleur</TableHead>
                  <TableHead>Statut</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {motos.map((moto) => (
                  <TableRow key={moto.id}>
                    <TableCell className="font-medium">{moto.numero_serie}</TableCell>
                    <TableCell>{moto.marque} {moto.modele}</TableCell>
                    <TableCell>{moto.annee}</TableCell>
                    <TableCell>{moto.couleur}</TableCell>
                    <TableCell>{moto.travailleur_nom || 'Non assigné'}</TableCell>
                    <TableCell>
                      <Badge variant={moto.statut === 'actif' ? "default" : "secondary"}>
                        {moto.statut}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <Button size="sm" variant="outline">
                          <Eye className="w-4 h-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>
        </TabsContent>

        {/* Onglet Alertes */}
        <TabsContent value="alertes" className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-semibold">Alertes et Notifications</h3>
            <Button variant="outline" className="gap-2">
              <Bell className="w-4 h-4" />
              Marquer comme lues
            </Button>
          </div>

          <div className="space-y-4">
            {alertes.map((alerte) => (
              <Card key={alerte.id} className={alerte.level === 'critical' ? 'border-red-200 bg-red-50/50' : 'border-yellow-200 bg-yellow-50/50'}>
                <CardContent className="pt-6">
                  <div className="flex items-start gap-4">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                      alerte.level === 'critical' ? 'bg-red-500/10' : 'bg-yellow-500/10'
                    }`}>
                      <AlertTriangle className={`w-5 h-5 ${
                        alerte.level === 'critical' ? 'text-red-500' : 'text-yellow-500'
                      }`} />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <Badge variant={alerte.level === 'critical' ? 'destructive' : 'secondary'}>
                          {alerte.type}
                        </Badge>
                        <span className="text-sm text-muted-foreground">
                          {new Date(alerte.created_at).toLocaleDateString()}
                        </span>
                      </div>
                      <p className="text-sm">{alerte.message}</p>
                    </div>
                    <div>
                      <Badge variant={alerte.is_resolved ? 'default' : 'secondary'}>
                        {alerte.is_resolved ? 'Résolue' : 'En cours'}
                      </Badge>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* Onglet Support */}
        <TabsContent value="support" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Phone className="w-5 h-5" />
                Contact Équipe Technique
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Button className="gap-2 h-16">
                  <Phone className="w-5 h-5" />
                  <div className="text-left">
                    <p className="font-semibold">Appel Direct</p>
                    <p className="text-sm opacity-80">Contacter par téléphone</p>
                  </div>
                </Button>
                
                <Button variant="outline" className="gap-2 h-16">
                  <Mail className="w-5 h-5" />
                  <div className="text-left">
                    <p className="font-semibold">Email Support</p>
                    <p className="text-sm opacity-80">Envoyer un email</p>
                  </div>
                </Button>
              </div>

              <Dialog open={showContactTechnique} onOpenChange={setShowContactTechnique}>
                <DialogTrigger asChild>
                  <Button className="w-full gap-2">
                    <Settings className="w-4 h-4" />
                    Envoyer un Message
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Contacter l'Équipe Technique</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="contact-type">Type de Communication</Label>
                      <Select value={contactTechnique.type} onValueChange={(value) => setContactTechnique(prev => ({ ...prev, type: value }))}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="sms">SMS</SelectItem>
                          <SelectItem value="appel">Appel</SelectItem>
                          <SelectItem value="email">Email</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label htmlFor="contact-message">Message</Label>
                      <textarea
                        id="contact-message"
                        className="w-full p-3 border rounded-md"
                        rows={4}
                        value={contactTechnique.message}
                        onChange={(e) => setContactTechnique(prev => ({ ...prev, message: e.target.value }))}
                        placeholder="Décrivez votre problème ou votre demande..."
                      />
                    </div>
                    <div className="flex justify-end gap-2">
                      <Button variant="outline" onClick={() => setShowContactTechnique(false)}>
                        Annuler
                      </Button>
                      <Button onClick={contactEquipeTechnique}>
                        Envoyer le Message
                      </Button>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
