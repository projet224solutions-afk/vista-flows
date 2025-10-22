import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Building2, Users, Bike, Plus, AlertCircle, Phone, MessageSquare, RefreshCw, Download } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import MotoRegistrationForm from '@/components/syndicat/MotoRegistrationForm';
import MotoManagementDashboard from '@/components/syndicat/MotoManagementDashboard';
import MotoSecurityAlerts from '@/components/syndicat/MotoSecurityAlerts';
import MotoSecurityNotifications from '@/components/syndicat/MotoSecurityNotifications';
import BureauOfflineSyncPanel from '@/components/syndicat/BureauOfflineSyncPanel';
import BureauNetworkIndicator from '@/components/syndicat/BureauNetworkIndicator';
import SyndicatePWAIntegration from '@/components/syndicate/SyndicatePWAIntegration';
import UniversalCommunicationHub from '@/components/communication/UniversalCommunicationHub';

export default function BureauDashboard() {
  const { token } = useParams();
  const navigate = useNavigate();
  const [bureau, setBureau] = useState<any>(null);
  const [workers, setWorkers] = useState<any[]>([]);
  const [members, setMembers] = useState<any[]>([]);
  const [motos, setMotos] = useState<any[]>([]);
  const [alerts, setAlerts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isWorkerDialogOpen, setIsWorkerDialogOpen] = useState(false);
  const [isSubmittingWorker, setIsSubmittingWorker] = useState(false);
  const [workerForm, setWorkerForm] = useState({
    nom: '',
    email: '',
    telephone: '',
    access_level: 'standard' as string,
    permissions: {
      view_members: true,
      add_members: true,
      edit_members: true,
      view_vehicles: true,
      add_vehicles: true,
      view_reports: false
    }
  });

  useEffect(() => {
    if (token) {
      loadBureauData();
    }
  }, [token]);

  const loadBureauData = async () => {
    try {
      setLoading(true);

      // Charger les données du bureau
      const { data: bureauData, error: bureauError } = await supabase
        .from('bureaus')
        .select('*')
        .eq('access_token', token)
        .single();

      if (bureauError) throw bureauError;
      if (!bureauData) {
        toast.error('Bureau non trouvé');
        navigate('/');
        return;
      }

      setBureau(bureauData);

      // Charger les travailleurs, membres, motos et alertes
      const [workersRes, membersRes, motosRes, alertsRes] = await Promise.all([
        supabase.from('syndicate_workers').select('*').eq('bureau_id', bureauData.id),
        supabase.from('members').select('*').eq('bureau_id', bureauData.id),
        supabase.from('registered_motos').select('*').eq('bureau_id', bureauData.id),
        supabase.from('syndicate_alerts').select('*').eq('bureau_id', bureauData.id).order('created_at', { ascending: false })
      ]);

      setWorkers(workersRes.data || []);
      setMembers(membersRes.data || []);
      setMotos(motosRes.data || []);
      setAlerts(alertsRes.data || []);
    } catch (error) {
      console.error('Erreur chargement bureau:', error);
      toast.error('Erreur lors du chargement des données');
    } finally {
      setLoading(false);
    }
  };

  const handleAddWorker = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validation des données
    if (!workerForm.nom.trim()) {
      toast.error('Le nom complet est requis');
      return;
    }
    
    if (!workerForm.email.trim()) {
      toast.error('L\'email est requis');
      return;
    }
    
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(workerForm.email)) {
      toast.error('Format d\'email invalide');
      return;
    }
    
    try {
      setIsSubmittingWorker(true);
      const access_token = crypto.randomUUID();
      const interface_url = `${window.location.origin}/worker/${access_token}`;

      console.log('📝 Création travailleur:', { nom: workerForm.nom, email: workerForm.email });

      const { data, error } = await supabase
        .from('syndicate_workers')
        .insert([{
          bureau_id: bureau.id,
          nom: workerForm.nom.trim(),
          email: workerForm.email.trim().toLowerCase(),
          telephone: workerForm.telephone?.trim() || null,
          access_level: workerForm.access_level,
          permissions: workerForm.permissions,
          access_token: access_token,
          interface_url: interface_url,
          is_active: true
        }])
        .select()
        .single();

      if (error) {
        console.error('❌ Erreur insertion:', error);
        throw error;
      }

      console.log('✅ Membre du bureau créé:', data);

      // Envoyer l'email (ne pas bloquer si ça échoue)
      try {
        await supabase.functions.invoke('send-bureau-access-email', {
          body: {
            type: 'worker',
            email: workerForm.email,
            name: workerForm.nom,
            access_token: access_token,
            interface_url: interface_url,
            bureau_code: bureau.bureau_code,
            permissions: workerForm.permissions
          }
        });
        toast.success('✅ Membre du bureau ajouté et email envoyé');
      } catch (emailError) {
        console.error('⚠️ Erreur email:', emailError);
        toast.success('✅ Membre du bureau ajouté (email non envoyé)');
      }

      // Réinitialiser le formulaire
      setWorkerForm({
        nom: '',
        email: '',
        telephone: '',
        access_level: 'standard',
        permissions: {
          view_members: true,
          add_members: true,
          edit_members: true,
          view_vehicles: true,
          add_vehicles: true,
          view_reports: false
        }
      });
      
      setIsWorkerDialogOpen(false);
      await loadBureauData();
    } catch (error: any) {
      console.error('❌ Erreur ajout membre du bureau:', error);
      toast.error(error.message || 'Erreur lors de l\'ajout du membre du bureau');
    } finally {
      setIsSubmittingWorker(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!bureau) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Card className="max-w-md">
          <CardHeader>
            <CardTitle>Bureau non trouvé</CardTitle>
          </CardHeader>
          <CardContent>
            <p>Le lien d'accès est invalide ou a expiré.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* PWA Integration */}
      <SyndicatePWAIntegration
        bureauId={bureau.id}
        bureauName={`${bureau.prefecture} - ${bureau.commune}`}
        presidentName={bureau.president_name || 'Président'}
        isOnline={navigator.onLine}
      />

      {/* En-tête */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">{bureau.bureau_code}</h1>
          <p className="text-muted-foreground">{bureau.prefecture} - {bureau.commune}</p>
        </div>
        <div className="flex gap-2 items-center">
          <BureauNetworkIndicator bureauId={bureau.id} />
          <Button variant="outline">
            <Phone className="w-4 h-4 mr-2" />
            Support Technique
          </Button>
          <Button variant="outline">
            <MessageSquare className="w-4 h-4 mr-2" />
            Messages
          </Button>
        </div>
      </div>

      {/* Statistiques */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="hover:shadow-lg transition-shadow">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Users className="w-4 h-4 text-muted-foreground" />
              Membres du Bureau
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{workers.length}</div>
            <p className="text-xs text-muted-foreground mt-1">Membres actifs</p>
          </CardContent>
        </Card>
        <Card className="hover:shadow-lg transition-shadow">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Users className="w-4 h-4 text-muted-foreground" />
              Adhérents
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{members.length}</div>
            <p className="text-xs text-muted-foreground mt-1">Total membres</p>
          </CardContent>
        </Card>
        <Card className="hover:shadow-lg transition-shadow">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Bike className="w-4 h-4 text-muted-foreground" />
              Véhicules
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-primary">{motos.length}</div>
            <p className="text-xs text-muted-foreground mt-1">Enregistrés</p>
          </CardContent>
        </Card>
        <Card className="hover:shadow-lg transition-shadow">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-muted-foreground" />
              Alertes
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-destructive">{alerts.filter(a => !a.is_read).length}</div>
            <p className="text-xs text-muted-foreground mt-1">Non lues</p>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="motos" className="space-y-6">
        <TabsList className="grid w-full grid-cols-5 h-auto">
          <TabsTrigger value="motos" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
            <Bike className="w-4 h-4 mr-2" />
            Véhicules
          </TabsTrigger>
          <TabsTrigger value="workers" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
            <Users className="w-4 h-4 mr-2" />
            Bureau
          </TabsTrigger>
          <TabsTrigger value="sync" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
            <RefreshCw className="w-4 h-4 mr-2" />
            Sync
          </TabsTrigger>
          <TabsTrigger value="alerts" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
            <AlertCircle className="w-4 h-4 mr-2" />
            Alertes {alerts.filter(a => !a.is_read).length > 0 && (
              <Badge variant="destructive" className="ml-2">{alerts.filter(a => !a.is_read).length}</Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="communication" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
            <MessageSquare className="w-4 h-4 mr-2" />
            Communication
          </TabsTrigger>
        </TabsList>

        <TabsContent value="workers" className="space-y-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Gestion des Membres du Bureau</CardTitle>
              <Dialog open={isWorkerDialogOpen} onOpenChange={setIsWorkerDialogOpen}>
                <DialogTrigger asChild>
                  <Button>
                    <Plus className="w-4 h-4 mr-2" />
                    Ajouter un Membre
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-2xl">
                  <DialogHeader>
                    <DialogTitle>Ajouter un membre du bureau</DialogTitle>
                  </DialogHeader>
                  <form onSubmit={handleAddWorker} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="nom">Nom complet *</Label>
                      <Input
                        id="nom"
                        required
                        value={workerForm.nom}
                        onChange={(e) => setWorkerForm({ ...workerForm, nom: e.target.value })}
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="email">Email *</Label>
                        <Input
                          id="email"
                          type="email"
                          required
                          value={workerForm.email}
                          onChange={(e) => setWorkerForm({ ...workerForm, email: e.target.value })}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="telephone">Téléphone</Label>
                        <Input
                          id="telephone"
                          type="tel"
                          value={workerForm.telephone}
                          onChange={(e) => setWorkerForm({ ...workerForm, telephone: e.target.value })}
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="access_level">Niveau d'accès</Label>
                      <Select value={workerForm.access_level} onValueChange={(val) => setWorkerForm({ ...workerForm, access_level: val })}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="limited">Limité</SelectItem>
                          <SelectItem value="standard">Standard</SelectItem>
                          <SelectItem value="advanced">Avancé</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-3 border-t pt-4">
                      <Label>Permissions</Label>
                      <div className="space-y-2">
                        <div className="flex items-center space-x-2">
                          <Checkbox 
                            id="view_members"
                            checked={workerForm.permissions.view_members}
                            onCheckedChange={(checked) => setWorkerForm({
                              ...workerForm,
                              permissions: { ...workerForm.permissions, view_members: checked as boolean }
                            })}
                          />
                          <label htmlFor="view_members" className="text-sm">Voir les membres</label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Checkbox 
                            id="add_members"
                            checked={workerForm.permissions.add_members}
                            onCheckedChange={(checked) => setWorkerForm({
                              ...workerForm,
                              permissions: { ...workerForm.permissions, add_members: checked as boolean }
                            })}
                          />
                          <label htmlFor="add_members" className="text-sm">Ajouter des membres</label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Checkbox 
                            id="edit_members"
                            checked={workerForm.permissions.edit_members}
                            onCheckedChange={(checked) => setWorkerForm({
                              ...workerForm,
                              permissions: { ...workerForm.permissions, edit_members: checked as boolean }
                            })}
                          />
                          <label htmlFor="edit_members" className="text-sm">Modifier les membres</label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Checkbox 
                            id="view_vehicles"
                            checked={workerForm.permissions.view_vehicles}
                            onCheckedChange={(checked) => setWorkerForm({
                              ...workerForm,
                              permissions: { ...workerForm.permissions, view_vehicles: checked as boolean }
                            })}
                          />
                          <label htmlFor="view_vehicles" className="text-sm">Voir les véhicules</label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Checkbox 
                            id="add_vehicles"
                            checked={workerForm.permissions.add_vehicles}
                            onCheckedChange={(checked) => setWorkerForm({
                              ...workerForm,
                              permissions: { ...workerForm.permissions, add_vehicles: checked as boolean }
                            })}
                          />
                          <label htmlFor="add_vehicles" className="text-sm">Ajouter des véhicules</label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Checkbox 
                            id="view_reports"
                            checked={workerForm.permissions.view_reports}
                            onCheckedChange={(checked) => setWorkerForm({
                              ...workerForm,
                              permissions: { ...workerForm.permissions, view_reports: checked as boolean }
                            })}
                          />
                          <label htmlFor="view_reports" className="text-sm">Voir les rapports</label>
                        </div>
                      </div>
                    </div>
                    <div className="flex justify-end gap-2 pt-4">
                      <Button 
                        type="button" 
                        variant="outline" 
                        onClick={() => setIsWorkerDialogOpen(false)}
                        disabled={isSubmittingWorker}
                      >
                        Annuler
                      </Button>
                      <Button type="submit" disabled={isSubmittingWorker}>
                        {isSubmittingWorker ? (
                          <>
                            <div className="w-4 h-4 mr-2 animate-spin rounded-full border-2 border-white border-t-transparent" />
                            Ajout en cours...
                          </>
                        ) : (
                          <>
                            <Plus className="w-4 h-4 mr-2" />
                            Ajouter
                          </>
                        )}
                      </Button>
                    </div>
                  </form>
                </DialogContent>
              </Dialog>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {workers.map((worker) => (
                  <div key={worker.id} className="flex items-center justify-between p-4 rounded-lg border">
                    <div>
                      <h3 className="font-medium">{worker.nom}</h3>
                      <p className="text-sm text-muted-foreground">{worker.email}</p>
                      <p className="text-xs text-muted-foreground">Accès: {worker.access_level}</p>
                    </div>
                    {worker.is_active ? (
                      <Badge className="bg-green-500">Actif</Badge>
                    ) : (
                      <Badge>Inactif</Badge>
                    )}
                  </div>
                ))}
                {workers.length === 0 && (
                  <div className="text-center py-12 text-muted-foreground">
                    Aucun membre du bureau ajouté
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="motos" className="space-y-6">
          {bureau && (
            <>
              <div className="grid grid-cols-1 xl:grid-cols-4 gap-4">
                <Card className="xl:col-span-3">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Bike className="w-5 h-5" />
                      Enregistrement de Véhicule
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <MotoRegistrationForm bureauId={bureau.id} onSuccess={loadBureauData} />
                  </CardContent>
                </Card>
                <div className="space-y-4">
                  <MotoSecurityNotifications bureauId={bureau.id} />
                </div>
              </div>
              
              <div className="grid grid-cols-1 xl:grid-cols-4 gap-4">
                <Card className="xl:col-span-3">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Bike className="w-5 h-5" />
                      Gestion des Véhicules
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <MotoManagementDashboard 
                      bureauId={bureau.id} 
                      bureauName={`${bureau.prefecture || ''} - ${bureau.commune || ''}`}
                    />
                  </CardContent>
                </Card>
                <div className="space-y-4">
                  <MotoSecurityAlerts bureauId={bureau.id} />
                </div>
              </div>
            </>
          )}
        </TabsContent>

        <TabsContent value="sync" className="space-y-6">
          {bureau && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <RefreshCw className="w-5 h-5" />
                  Synchronisation Hors-ligne
                </CardTitle>
              </CardHeader>
              <CardContent>
                <BureauOfflineSyncPanel bureauId={bureau.id} />
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="alerts" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Alertes et Notifications</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {alerts.map((alert) => (
                  <div 
                    key={alert.id} 
                    className={`flex items-start gap-4 p-4 rounded-lg border ${
                      alert.is_critical ? 'border-red-200 bg-red-50' : 'border-yellow-200 bg-yellow-50'
                    }`}
                  >
                    <AlertCircle className={`w-5 h-5 ${alert.is_critical ? 'text-red-500' : 'text-yellow-500'} flex-shrink-0 mt-0.5`} />
                    <div className="flex-1">
                      <h3 className={`font-medium ${alert.is_critical ? 'text-red-900' : 'text-yellow-900'}`}>
                        {alert.title}
                      </h3>
                      <p className={`text-sm mt-1 ${alert.is_critical ? 'text-red-700' : 'text-yellow-700'}`}>
                        {alert.message}
                      </p>
                      <p className="text-xs text-muted-foreground mt-2">
                        {new Date(alert.created_at).toLocaleDateString('fr-FR')}
                      </p>
                    </div>
                    <Badge className={alert.is_critical ? 'bg-red-500' : 'bg-yellow-500'}>
                      {alert.severity}
                    </Badge>
                  </div>
                ))}
                {alerts.length === 0 && (
                  <div className="text-center py-12 text-muted-foreground">
                    Aucune alerte
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="communication" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MessageSquare className="w-5 h-5" />
                Hub de Communication
              </CardTitle>
            </CardHeader>
            <CardContent>
              <UniversalCommunicationHub />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
