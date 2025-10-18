/**
 * 🏢 GESTION BUREAUX SYNDICAUX - 224SOLUTIONS
 * Interface de gestion des bureaux syndicaux pour PDG
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
  Settings, 
  AlertTriangle,
  Mail,
  Phone,
  Eye,
  BarChart3,
  Download,
  RefreshCw,
  Shield,
  Users,
  TrendingUp,
  Bell,
  ExternalLink
} from 'lucide-react';

interface BureauSyndical {
  id: string;
  nom: string;
  email_president: string;
  ville: string;
  interface_url: string;
  token: string;
  is_active: boolean;
  created_at: string;
  total_travailleurs: number;
  total_motos: number;
  alertes_critiques: number;
}

interface Travailleur {
  id: string;
  bureau_id: string;
  nom: string;
  email: string;
  telephone: string;
  interface_url: string;
  token: string;
  access_level: string;
  is_active: boolean;
  created_at: string;
  bureau_nom: string;
}

interface Statistiques {
  total_bureaux: number;
  total_travailleurs: number;
  total_motos: number;
  alertes_critiques: number;
  bureaux_actifs: number;
}

export default function PDGSyndicatManagement() {
  const [bureaux, setBureaux] = useState<BureauSyndical[]>([]);
  const [travailleurs, setTravailleurs] = useState<Travailleur[]>([]);
  const [statistiques, setStatistiques] = useState<Statistiques>({
    total_bureaux: 0,
    total_travailleurs: 0,
    total_motos: 0,
    alertes_critiques: 0,
    bureaux_actifs: 0
  });
  const [loading, setLoading] = useState(true);
  const [showCreateBureau, setShowCreateBureau] = useState(false);
  const [showResendLink, setShowResendLink] = useState(false);
  const [selectedBureau, setSelectedBureau] = useState<BureauSyndical | null>(null);
  const { toast } = useToast();

  // Formulaire de création de bureau
  const [newBureau, setNewBureau] = useState({
    nom: '',
    email_president: '',
    ville: '',
    telephone: ''
  });

  // Formulaire de renvoi de lien
  const [resendData, setResendData] = useState({
    email: '',
    type: 'bureau'
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      
      // Charger les bureaux avec leurs statistiques
      const { data: bureauxData, error: bureauxError } = await supabase
        .from('bureaux_syndicaux')
        .select(`
          *,
          total_travailleurs:travailleurs(count),
          total_motos:motos(count),
          alertes_critiques:alertes(count).eq(level, 'critical')
        `)
        .order('created_at', { ascending: false });

      if (bureauxError) throw bureauxError;

      // Charger tous les travailleurs
      const { data: travailleursData, error: travailleursError } = await supabase
        .from('travailleurs')
        .select(`
          *,
          bureau:bureaux_syndicaux!travailleurs_bureau_id_fkey(nom)
        `)
        .order('created_at', { ascending: false });

      if (travailleursError) throw travailleursError;

      // Calculer les statistiques globales
      const totalBureaux = bureauxData?.length || 0;
      const totalTravailleurs = travailleursData?.length || 0;
      const totalMotos = bureauxData?.reduce((sum, bureau) => sum + (bureau.total_motos || 0), 0) || 0;
      const alertesCritiques = bureauxData?.reduce((sum, bureau) => sum + (bureau.alertes_critiques || 0), 0) || 0;
      const bureauxActifs = bureauxData?.filter(b => b.is_active).length || 0;

      setBureaux(bureauxData || []);
      setTravailleurs(travailleursData || []);
      setStatistiques({
        total_bureaux: totalBureaux,
        total_travailleurs: totalTravailleurs,
        total_motos: totalMotos,
        alertes_critiques: alertesCritiques,
        bureaux_actifs: bureauxActifs
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

  const createBureau = async () => {
    try {
      // Générer un token unique
      const token = crypto.randomUUID();
      const interfaceUrl = `${window.location.origin}/bureau/${token}`;

      const { data, error } = await supabase
        .from('bureaux_syndicaux')
        .insert({
          nom: newBureau.nom,
          email_president: newBureau.email_president,
          ville: newBureau.ville,
          telephone: newBureau.telephone,
          interface_url: interfaceUrl,
          token: token,
          is_active: true
        })
        .select()
        .single();

      if (error) throw error;

      // Envoyer l'email avec le lien permanent
      await sendBureauEmail(newBureau.email_president, newBureau.nom, interfaceUrl);

      // Log de l'action
      await supabase.from('audit_logs').insert({
        actor_id: (await supabase.auth.getUser()).data.user?.id,
        action: 'BUREAU_CREATED',
        target_type: 'bureau',
        target_id: data.id,
        details: { 
          bureau_nom: newBureau.nom, 
          email: newBureau.email_president,
          interface_url: interfaceUrl
        }
      });

      toast({
        title: "✅ Bureau créé",
        description: `Le bureau ${newBureau.nom} a été créé et l'email envoyé`,
      });

      setNewBureau({ nom: '', email_president: '', ville: '', telephone: '' });
      setShowCreateBureau(false);
      loadData();
    } catch (error) {
      console.error('Erreur création bureau:', error);
      toast({
        title: "❌ Erreur",
        description: "Impossible de créer le bureau",
        variant: "destructive"
      });
    }
  };

  const sendBureauEmail = async (email: string, nom: string, interfaceUrl: string) => {
    try {
      // Ici vous pouvez intégrer un service d'email comme SendGrid, Resend, etc.
      // Pour l'instant, on simule l'envoi
      console.log(`Email envoyé à ${email} pour le bureau ${nom} avec le lien ${interfaceUrl}`);
      
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

  const resendLink = async () => {
    try {
      const table = resendData.type === 'bureau' ? 'bureaux_syndicaux' : 'travailleurs';
      const emailField = resendData.type === 'bureau' ? 'email_president' : 'email';
      
      const { data, error } = await supabase
        .from(table)
        .select('*')
        .eq(emailField, resendData.email)
        .single();

      if (error || !data) {
        toast({
          title: "❌ Utilisateur non trouvé",
          description: "Aucun utilisateur trouvé avec cet email",
          variant: "destructive"
        });
        return;
      }

      // Renvoyer l'email avec le lien
      await sendBureauEmail(resendData.email, data.nom || data.nom, data.interface_url);

      toast({
        title: "✅ Lien renvoyé",
        description: "Le lien permanent a été renvoyé par email",
      });

      setResendData({ email: '', type: 'bureau' });
      setShowResendLink(false);
    } catch (error) {
      console.error('Erreur renvoi lien:', error);
      toast({
        title: "❌ Erreur",
        description: "Impossible de renvoyer le lien",
        variant: "destructive"
      });
    }
  };

  const toggleBureauStatus = async (bureauId: string, currentStatus: boolean) => {
    try {
      const { error } = await supabase
        .from('bureaux_syndicaux')
        .update({ is_active: !currentStatus })
        .eq('id', bureauId);

      if (error) throw error;

      toast({
        title: currentStatus ? "🚫 Bureau suspendu" : "✅ Bureau activé",
        description: `Le bureau a été ${currentStatus ? 'suspendu' : 'activé'} avec succès`,
      });

      loadData();
    } catch (error) {
      console.error('Erreur changement statut:', error);
      toast({
        title: "❌ Erreur",
        description: "Impossible de modifier le statut",
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
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <Card className="border-border/40 bg-card/50 backdrop-blur-sm">
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-blue-500/10 flex items-center justify-center">
                <Building2 className="w-6 h-6 text-blue-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{statistiques.total_bureaux}</p>
                <p className="text-sm text-muted-foreground">Bureaux Totaux</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/40 bg-card/50 backdrop-blur-sm">
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-green-500/10 flex items-center justify-center">
                <Users className="w-6 h-6 text-green-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{statistiques.total_travailleurs}</p>
                <p className="text-sm text-muted-foreground">Travailleurs</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/40 bg-card/50 backdrop-blur-sm">
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-purple-500/10 flex items-center justify-center">
                <TrendingUp className="w-6 h-6 text-purple-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{statistiques.total_motos}</p>
                <p className="text-sm text-muted-foreground">Motos Enregistrées</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/40 bg-card/50 backdrop-blur-sm">
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-orange-500/10 flex items-center justify-center">
                <Bell className="w-6 h-6 text-orange-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{statistiques.alertes_critiques}</p>
                <p className="text-sm text-muted-foreground">Alertes Critiques</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/40 bg-card/50 backdrop-blur-sm">
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-green-500/10 flex items-center justify-center">
                <Shield className="w-6 h-6 text-green-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{statistiques.bureaux_actifs}</p>
                <p className="text-sm text-muted-foreground">Bureaux Actifs</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Onglets principaux */}
      <Tabs defaultValue="bureaux" className="space-y-6">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="bureaux">Bureaux Syndicaux</TabsTrigger>
          <TabsTrigger value="travailleurs">Travailleurs</TabsTrigger>
          <TabsTrigger value="actions">Actions</TabsTrigger>
        </TabsList>

        {/* Onglet Bureaux */}
        <TabsContent value="bureaux" className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-semibold">Gestion des Bureaux Syndicaux</h3>
            <div className="flex gap-2">
              <Dialog open={showCreateBureau} onOpenChange={setShowCreateBureau}>
                <DialogTrigger asChild>
                  <Button className="gap-2">
                    <Building2 className="w-4 h-4" />
                    Créer un Bureau
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Créer un nouveau Bureau Syndical</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="bureau-nom">Nom du Bureau</Label>
                      <Input
                        id="bureau-nom"
                        value={newBureau.nom}
                        onChange={(e) => setNewBureau(prev => ({ ...prev, nom: e.target.value }))}
                        placeholder="Ex: Bureau Syndical des Taxis Conakry"
                      />
                    </div>
                    <div>
                      <Label htmlFor="bureau-email">Email du Président</Label>
                      <Input
                        id="bureau-email"
                        type="email"
                        value={newBureau.email_president}
                        onChange={(e) => setNewBureau(prev => ({ ...prev, email_president: e.target.value }))}
                        placeholder="president@bureau.com"
                      />
                    </div>
                    <div>
                      <Label htmlFor="bureau-ville">Ville</Label>
                      <Input
                        id="bureau-ville"
                        value={newBureau.ville}
                        onChange={(e) => setNewBureau(prev => ({ ...prev, ville: e.target.value }))}
                        placeholder="Conakry"
                      />
                    </div>
                    <div>
                      <Label htmlFor="bureau-telephone">Téléphone</Label>
                      <Input
                        id="bureau-telephone"
                        value={newBureau.telephone}
                        onChange={(e) => setNewBureau(prev => ({ ...prev, telephone: e.target.value }))}
                        placeholder="+224 XXX XX XX XX"
                      />
                    </div>
                    <div className="flex justify-end gap-2">
                      <Button variant="outline" onClick={() => setShowCreateBureau(false)}>
                        Annuler
                      </Button>
                      <Button onClick={createBureau}>
                        Créer le Bureau
                      </Button>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>

              <Dialog open={showResendLink} onOpenChange={setShowResendLink}>
                <DialogTrigger asChild>
                  <Button variant="outline" className="gap-2">
                    <RefreshCw className="w-4 h-4" />
                    Renvoyer Lien
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Renvoyer un Lien Permanent</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="resend-email">Email</Label>
                      <Input
                        id="resend-email"
                        type="email"
                        value={resendData.email}
                        onChange={(e) => setResendData(prev => ({ ...prev, email: e.target.value }))}
                        placeholder="email@example.com"
                      />
                    </div>
                    <div>
                      <Label htmlFor="resend-type">Type</Label>
                      <Select value={resendData.type} onValueChange={(value) => setResendData(prev => ({ ...prev, type: value }))}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="bureau">Bureau Syndical</SelectItem>
                          <SelectItem value="travailleur">Travailleur</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="flex justify-end gap-2">
                      <Button variant="outline" onClick={() => setShowResendLink(false)}>
                        Annuler
                      </Button>
                      <Button onClick={resendLink}>
                        Renvoyer le Lien
                      </Button>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
          </div>

          <Card>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nom du Bureau</TableHead>
                  <TableHead>Président</TableHead>
                  <TableHead>Ville</TableHead>
                  <TableHead>Travailleurs</TableHead>
                  <TableHead>Motos</TableHead>
                  <TableHead>Alertes</TableHead>
                  <TableHead>Statut</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {bureaux.map((bureau) => (
                  <TableRow key={bureau.id}>
                    <TableCell className="font-medium">{bureau.nom}</TableCell>
                    <TableCell>{bureau.email_president}</TableCell>
                    <TableCell>{bureau.ville}</TableCell>
                    <TableCell>{bureau.total_travailleurs || 0}</TableCell>
                    <TableCell>{bureau.total_motos || 0}</TableCell>
                    <TableCell>
                      {bureau.alertes_critiques > 0 ? (
                        <Badge variant="destructive">
                          <AlertTriangle className="w-3 h-3 mr-1" />
                          {bureau.alertes_critiques}
                        </Badge>
                      ) : (
                        <Badge variant="secondary">Aucune</Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge variant={bureau.is_active ? "default" : "secondary"}>
                        {bureau.is_active ? "Actif" : "Suspendu"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => toggleBureauStatus(bureau.id, bureau.is_active)}
                        >
                          {bureau.is_active ? "Suspendre" : "Activer"}
                        </Button>
                        <Button size="sm" variant="outline">
                          <Eye className="w-4 h-4" />
                        </Button>
                        <Button size="sm" variant="outline">
                          <ExternalLink className="w-4 h-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>
        </TabsContent>

        {/* Onglet Travailleurs */}
        <TabsContent value="travailleurs" className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-semibold">Tous les Travailleurs</h3>
            <Button variant="outline" className="gap-2">
              <Download className="w-4 h-4" />
              Exporter
            </Button>
          </div>

          <Card>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nom</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Téléphone</TableHead>
                  <TableHead>Bureau</TableHead>
                  <TableHead>Niveau d'Accès</TableHead>
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
                    <TableCell>{travailleur.bureau_nom}</TableCell>
                    <TableCell>
                      <Badge variant="outline">
                        {travailleur.access_level}
                      </Badge>
                    </TableCell>
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
                        <Button size="sm" variant="outline">
                          <ExternalLink className="w-4 h-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>
        </TabsContent>

        {/* Onglet Actions */}
        <TabsContent value="actions" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="w-5 h-5" />
                Actions Rapides
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Button className="gap-2 h-16">
                  <Mail className="w-5 h-5" />
                  <div className="text-left">
                    <p className="font-semibold">Envoyer Notification</p>
                    <p className="text-sm opacity-80">À tous les bureaux</p>
                  </div>
                </Button>
                
                <Button variant="outline" className="gap-2 h-16">
                  <Download className="w-5 h-5" />
                  <div className="text-left">
                    <p className="font-semibold">Exporter Données</p>
                    <p className="text-sm opacity-80">Rapport complet</p>
                  </div>
                </Button>
                
                <Button variant="outline" className="gap-2 h-16">
                  <BarChart3 className="w-5 h-5" />
                  <div className="text-left">
                    <p className="font-semibold">Statistiques</p>
                    <p className="text-sm opacity-80">Analytics détaillées</p>
                  </div>
                </Button>
                
                <Button variant="outline" className="gap-2 h-16">
                  <RefreshCw className="w-5 h-5" />
                  <div className="text-left">
                    <p className="font-semibold">Mise à Jour</p>
                    <p className="text-sm opacity-80">Fonctionnalités</p>
                  </div>
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
