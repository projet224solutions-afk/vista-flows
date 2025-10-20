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
import { Building2, Users, Bike, Plus, AlertCircle, Phone, MessageSquare } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';

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
  const [isMotoDialogOpen, setIsMotoDialogOpen] = useState(false);
  const [workerForm, setWorkerForm] = useState({
    nom: '',
    email: '',
    telephone: '',
    access_level: 'limited' as string,
    permissions: {
      view_members: false,
      add_members: false,
      edit_members: false,
      view_vehicles: true,
      add_vehicles: false,
      view_reports: false
    }
  });
  const [motoForm, setMotoForm] = useState({
    serial_number: '',
    brand: '',
    model: '',
    year: new Date().getFullYear(),
    color: ''
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
    
    try {
      const access_token = crypto.randomUUID();

      const { error } = await supabase
        .from('syndicate_workers')
        .insert([{
          bureau_id: bureau.id,
          nom: workerForm.nom,
          email: workerForm.email,
          telephone: workerForm.telephone,
          access_level: workerForm.access_level,
          permissions: workerForm.permissions,
          access_token: access_token,
          interface_url: `${window.location.origin}/worker/${access_token}`
        }]);

      if (error) throw error;

      // Envoyer l'email
      await supabase.functions.invoke('send-bureau-access-email', {
        body: {
          type: 'worker',
          email: workerForm.email,
          name: workerForm.nom,
          access_token: access_token,
          permissions: workerForm.permissions
        }
      });

      toast.success('Travailleur ajouté et email envoyé');
      setIsWorkerDialogOpen(false);
      setWorkerForm({
        nom: '',
        email: '',
        telephone: '',
        access_level: 'limited',
        permissions: {
          view_members: false,
          add_members: false,
          edit_members: false,
          view_vehicles: true,
          add_vehicles: false,
          view_reports: false
        }
      });
      await loadBureauData();
    } catch (error) {
      console.error('Erreur ajout travailleur:', error);
      toast.error('Erreur lors de l\'ajout du travailleur');
    }
  };

  const handleAddMoto = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      const { error } = await supabase
        .from('registered_motos')
        .insert([{
          bureau_id: bureau.id,
          serial_number: motoForm.serial_number,
          brand: motoForm.brand,
          model: motoForm.model,
          year: motoForm.year,
          color: motoForm.color,
          status: 'active'
        }]);

      if (error) throw error;

      toast.success('Moto enregistrée avec succès');
      setIsMotoDialogOpen(false);
      setMotoForm({
        serial_number: '',
        brand: '',
        model: '',
        year: new Date().getFullYear(),
        color: ''
      });
      await loadBureauData();
    } catch (error) {
      console.error('Erreur enregistrement moto:', error);
      toast.error('Erreur lors de l\'enregistrement de la moto');
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
      {/* En-tête */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">{bureau.bureau_code}</h1>
          <p className="text-muted-foreground">{bureau.prefecture} - {bureau.commune}</p>
        </div>
        <div className="flex gap-2">
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
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Travailleurs</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{workers.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Membres</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{members.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Véhicules</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{motos.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Alertes</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-500">{alerts.filter(a => !a.is_read).length}</div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="workers">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="workers">Travailleurs</TabsTrigger>
          <TabsTrigger value="members">Membres</TabsTrigger>
          <TabsTrigger value="motos">Véhicules</TabsTrigger>
          <TabsTrigger value="alerts">Alertes</TabsTrigger>
        </TabsList>

        <TabsContent value="workers" className="space-y-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Gestion des Travailleurs</CardTitle>
              <Dialog open={isWorkerDialogOpen} onOpenChange={setIsWorkerDialogOpen}>
                <DialogTrigger asChild>
                  <Button>
                    <Plus className="w-4 h-4 mr-2" />
                    Ajouter Travailleur
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-2xl">
                  <DialogHeader>
                    <DialogTitle>Ajouter un travailleur</DialogTitle>
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
                      <Button type="button" variant="outline" onClick={() => setIsWorkerDialogOpen(false)}>
                        Annuler
                      </Button>
                      <Button type="submit">
                        <Plus className="w-4 h-4 mr-2" />
                        Ajouter
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
                    Aucun travailleur ajouté
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="members" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Membres du Bureau</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {members.map((member) => (
                  <div key={member.id} className="flex items-center justify-between p-4 rounded-lg border">
                    <div>
                      <h3 className="font-medium">{member.name}</h3>
                      <p className="text-sm text-muted-foreground">{member.email}</p>
                    </div>
                    <Badge>{member.status}</Badge>
                  </div>
                ))}
                {members.length === 0 && (
                  <div className="text-center py-12 text-muted-foreground">
                    Aucun membre enregistré
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="motos" className="space-y-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Véhicules Enregistrés</CardTitle>
              <Dialog open={isMotoDialogOpen} onOpenChange={setIsMotoDialogOpen}>
                <DialogTrigger asChild>
                  <Button>
                    <Plus className="w-4 h-4 mr-2" />
                    Enregistrer Moto
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Enregistrer une moto</DialogTitle>
                  </DialogHeader>
                  <form onSubmit={handleAddMoto} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="serial_number">Numéro de série *</Label>
                      <Input
                        id="serial_number"
                        required
                        value={motoForm.serial_number}
                        onChange={(e) => setMotoForm({ ...motoForm, serial_number: e.target.value })}
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="brand">Marque</Label>
                        <Input
                          id="brand"
                          value={motoForm.brand}
                          onChange={(e) => setMotoForm({ ...motoForm, brand: e.target.value })}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="model">Modèle</Label>
                        <Input
                          id="model"
                          value={motoForm.model}
                          onChange={(e) => setMotoForm({ ...motoForm, model: e.target.value })}
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="year">Année</Label>
                        <Input
                          id="year"
                          type="number"
                          value={motoForm.year}
                          onChange={(e) => setMotoForm({ ...motoForm, year: parseInt(e.target.value) })}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="color">Couleur</Label>
                        <Input
                          id="color"
                          value={motoForm.color}
                          onChange={(e) => setMotoForm({ ...motoForm, color: e.target.value })}
                        />
                      </div>
                    </div>
                    <div className="flex justify-end gap-2 pt-4">
                      <Button type="button" variant="outline" onClick={() => setIsMotoDialogOpen(false)}>
                        Annuler
                      </Button>
                      <Button type="submit">
                        <Bike className="w-4 h-4 mr-2" />
                        Enregistrer
                      </Button>
                    </div>
                  </form>
                </DialogContent>
              </Dialog>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {motos.map((moto) => (
                  <div key={moto.id} className="flex items-center justify-between p-4 rounded-lg border">
                    <div>
                      <h3 className="font-medium">{moto.serial_number}</h3>
                      <p className="text-sm text-muted-foreground">
                        {moto.brand} {moto.model} • {moto.year} • {moto.color}
                      </p>
                    </div>
                    <Badge>{moto.status}</Badge>
                  </div>
                ))}
                {motos.length === 0 && (
                  <div className="text-center py-12 text-muted-foreground">
                    Aucun véhicule enregistré
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
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
      </Tabs>
    </div>
  );
}
