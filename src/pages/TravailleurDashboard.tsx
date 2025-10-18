/**
 * 👷 DASHBOARD TRAVAILLEUR - 224SOLUTIONS
 * Interface pour les travailleurs des bureaux syndicaux
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
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { 
  User,
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
  TrendingUp,
  Shield,
  Clock,
  CheckCircle
} from 'lucide-react';

interface Moto {
  id: string;
  numero_serie: string;
  marque: string;
  modele: string;
  annee: number;
  couleur: string;
  statut: string;
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

interface TravailleurStats {
  total_motos: number;
  motos_actives: number;
  alertes_critiques: number;
  notifications_non_lues: number;
}

export default function TravailleurDashboard() {
  const [motos, setMotos] = useState<Moto[]>([]);
  const [alertes, setAlertes] = useState<Alerte[]>([]);
  const [stats, setStats] = useState<TravailleurStats>({
    total_motos: 0,
    motos_actives: 0,
    alertes_critiques: 0,
    notifications_non_lues: 0
  });
  const [loading, setLoading] = useState(true);
  const [showCreateMoto, setShowCreateMoto] = useState(false);
  const [showContactTechnique, setShowContactTechnique] = useState(false);
  const { toast } = useToast();

  // Formulaire de création de moto
  const [newMoto, setNewMoto] = useState({
    numero_serie: '',
    marque: '',
    modele: '',
    annee: new Date().getFullYear(),
    couleur: ''
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
      
      // Récupérer l'ID du travailleur actuel
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Charger les motos du travailleur
      const { data: motosData, error: motosError } = await supabase
        .from('motos')
        .select('*')
        .eq('travailleur_id', user.id)
        .order('created_at', { ascending: false });

      if (motosError) throw motosError;

      // Charger les alertes du travailleur
      const { data: alertesData, error: alertesError } = await supabase
        .from('alertes')
        .select('*')
        .eq('travailleur_id', user.id)
        .order('created_at', { ascending: false })
        .limit(10);

      if (alertesError) throw alertesError;

      // Calculer les statistiques
      const totalMotos = motosData?.length || 0;
      const motosActives = motosData?.filter(m => m.statut === 'actif').length || 0;
      const alertesCritiques = alertesData?.filter(a => a.level === 'critical' && !a.is_resolved).length || 0;
      const notificationsNonLues = 0; // À implémenter avec la table notifications

      setMotos(motosData || []);
      setAlertes(alertesData || []);
      setStats({
        total_motos: totalMotos,
        motos_actives: motosActives,
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

  const createMoto = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('motos')
        .insert({
          travailleur_id: user.id,
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
        couleur: '' 
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

  const contactEquipeTechnique = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { error } = await supabase
        .from('communications_technique')
        .insert({
          travailleur_id: user.id,
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
                <Motorcycle className="w-6 h-6 text-blue-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.total_motos}</p>
                <p className="text-sm text-muted-foreground">Motos Total</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/40 bg-card/50 backdrop-blur-sm">
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-green-500/10 flex items-center justify-center">
                <CheckCircle className="w-6 h-6 text-green-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.motos_actives}</p>
                <p className="text-sm text-muted-foreground">Motos Actives</p>
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
      <Tabs defaultValue="motos" className="space-y-6">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="motos">Mes Motos</TabsTrigger>
          <TabsTrigger value="alertes">Alertes</TabsTrigger>
          <TabsTrigger value="support">Support</TabsTrigger>
        </TabsList>

        {/* Onglet Motos */}
        <TabsContent value="motos" className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-semibold">Mes Motos Enregistrées</h3>
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
                  <TableHead>Statut</TableHead>
                  <TableHead>Date d'Enregistrement</TableHead>
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
                    <TableCell>
                      <Badge variant={moto.statut === 'actif' ? "default" : "secondary"}>
                        {moto.statut}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {new Date(moto.created_at).toLocaleDateString()}
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
            <h3 className="text-lg font-semibold">Mes Alertes et Notifications</h3>
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
                      <select
                        id="contact-type"
                        className="w-full p-3 border rounded-md"
                        value={contactTechnique.type}
                        onChange={(e) => setContactTechnique(prev => ({ ...prev, type: e.target.value }))}
                      >
                        <option value="sms">SMS</option>
                        <option value="appel">Appel</option>
                        <option value="email">Email</option>
                      </select>
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
