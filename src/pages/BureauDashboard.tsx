import { useState, useEffect } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Building2, Users, Bike, Plus, AlertCircle, Phone, MessageSquare, RefreshCw, Download, Wallet, Settings } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { ErrorBanner } from '@/components/ui/ErrorBanner';
import { useBureauErrorBoundary } from '@/hooks/useBureauErrorBoundary';
import { useBureauActions } from '@/hooks/useBureauActions';
import MotoRegistrationForm from '@/components/syndicat/MotoRegistrationForm';
import MotoManagementDashboard from '@/components/syndicat/MotoManagementDashboard';
import MotoSecurityAlerts from '@/components/syndicat/MotoSecurityAlerts';
import MotoSecurityNotifications from '@/components/syndicat/MotoSecurityNotifications';
import SyndicateVehicleManagement from '@/components/syndicate/SyndicateVehicleManagement';
import BureauOfflineSyncPanel from '@/components/syndicat/BureauOfflineSyncPanel';
import BureauNetworkIndicator from '@/components/syndicat/BureauNetworkIndicator';
// import SyndicatePWAIntegration from '@/components/syndicate/SyndicatePWAIntegration'; // PWA désactivée
import UniversalCommunicationHub from '@/components/communication/UniversalCommunicationHub';
// import PWAInstallButton from '@/components/pwa/PWAInstallButton'; // PWA désactivée
import { UserIdDisplay } from '@/components/UserIdDisplay';
import { BureauWalletDisplay } from '@/components/wallet/BureauWalletDisplay';
import { BureauIdDisplay } from '@/components/syndicat/BureauIdDisplay';
import BureauWalletManagement from '@/components/wallet/BureauWalletManagement';
import CommunicationWidget from '@/components/communication/CommunicationWidget';

export default function BureauDashboard() {
  const { token } = useParams();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { error, captureError, clearError } = useBureauErrorBoundary();
  
  // États déclarés AVANT leur utilisation
  const [bureau, setBureau] = useState<any>(null);
  const [workers, setWorkers] = useState<any[]>([]);
  const [members, setMembers] = useState<any[]>([]);
  const [motos, setMotos] = useState<any[]>([]);
  const [alerts, setAlerts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('motos');
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

  // Hook useBureauActions APRÈS la déclaration de bureau et loadBureauData
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
    } catch (error: any) {
      console.error('Erreur chargement bureau:', error);
      captureError('member_error', error.message || 'Erreur lors du chargement des données', error);
      toast.error('Erreur lors du chargement des données');
    } finally {
      setLoading(false);
    }
  };

  // Hook useBureauActions maintenant que loadBureauData est défini
  const { addWorker } = useBureauActions({
    bureauId: bureau?.id,
    onWorkerCreated: loadBureauData
  });

  useEffect(() => {
    if (token) {
      loadBureauData();
    }
  }, [token]);

  // Gérer l'onglet depuis l'URL (ex: ?tab=kyc)
  useEffect(() => {
    const tab = searchParams.get('tab');
    if (tab === 'kyc') {
      setActiveTab('settings');
    }
  }, [searchParams]);

  const handleAddWorker = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      setIsSubmittingWorker(true);

      const result = await addWorker(workerForm, bureau.id);

      if (!result.success) {
        captureError('worker_error', result.error || 'Erreur lors de l\'ajout du membre');
        toast.error(result.error);
        return;
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
    } catch (error: any) {
      console.error('❌ Erreur ajout membre du bureau:', error);
      captureError('worker_error', error.message || 'Erreur lors de l\'ajout du membre du bureau', error);
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
      {/* PWA Integration désactivée */}

      {/* En-tête */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="flex-1 min-w-[300px]">
          <h1 className="text-3xl font-bold">Interface Bureau Syndicat</h1>
          <p className="text-muted-foreground">224Solutions - Dashboard Bureau Syndicat</p>
          <div className="flex items-center gap-3 mt-2">
            <p className="text-sm text-muted-foreground">{bureau.bureau_code} - {bureau.prefecture} - {bureau.commune}</p>
          </div>
          <div className="mt-3 flex flex-col gap-2">
            <div className="flex items-center gap-2 flex-wrap">
              <BureauIdDisplay bureauCode={bureau.bureau_code} />
              {bureau.president_email && (
                <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-blue-50 rounded-lg">
                  <span className="text-xs text-muted-foreground">Contact:</span>
                  <span className="text-xs font-medium">{bureau.president_email}</span>
                </div>
              )}
            </div>
            <BureauWalletDisplay bureauId={bureau.id} bureauCode={bureau.bureau_code} compact={true} className="max-w-md" />
          </div>
        </div>
        <div className="flex gap-2 items-center flex-wrap">
          <BureauNetworkIndicator bureauId={bureau.id} />
          {/* PWAInstallButton désactivé */}
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

      {/* Error Banner */}
      {error && (
        <ErrorBanner
          error={error.message}
          type={error.type}
          onDismiss={clearError}
        />
      )}

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
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-7 h-auto">
          <TabsTrigger value="motos" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
            <Bike className="w-4 h-4 mr-2" />
            Véhicules
          </TabsTrigger>
          <TabsTrigger value="wallet" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
            <Wallet className="w-4 h-4 mr-2" />
            Wallet
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
          <TabsTrigger value="settings" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
            <Settings className="w-4 h-4 mr-2" />
            Paramètres
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
                <div className="xl:col-span-3">
                  <SyndicateVehicleManagement bureauId={bureau.id} />
                </div>
                <div className="space-y-4">
                  <MotoSecurityNotifications bureauId={bureau.id} />
                </div>
              </div>
              
              <div className="grid grid-cols-1 xl:grid-cols-4 gap-4">
                <Card className="xl:col-span-3">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Bike className="w-5 h-5" />
                      Ancienne Interface (Backup)
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

        <TabsContent value="wallet" className="space-y-4">
          {bureau && (
            <BureauWalletManagement 
              bureauId={bureau.id}
              bureauCode={bureau.bureau_code}
              showTransactions={true}
            />
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

        <TabsContent value="settings" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="w-5 h-5" />
                Paramètres du Bureau
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Informations du Bureau */}
              <div className="space-y-4">
                <h3 className="font-semibold text-lg">Informations du Bureau</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label className="text-sm text-muted-foreground">Code Bureau</Label>
                    <p className="font-medium">{bureau?.bureau_code}</p>
                  </div>
                  <div>
                    <Label className="text-sm text-muted-foreground">Statut</Label>
                    <p className="font-medium">{bureau?.status}</p>
                  </div>
                  <div>
                    <Label className="text-sm text-muted-foreground">Préfecture</Label>
                    <p className="font-medium">{bureau?.prefecture}</p>
                  </div>
                  <div>
                    <Label className="text-sm text-muted-foreground">Commune</Label>
                    <p className="font-medium">{bureau?.commune}</p>
                  </div>
                  <div>
                    <Label className="text-sm text-muted-foreground">Président</Label>
                    <p className="font-medium">{bureau?.president_name}</p>
                  </div>
                  <div>
                    <Label className="text-sm text-muted-foreground">Email</Label>
                    <p className="font-medium">{bureau?.president_email}</p>
                  </div>
                </div>
              </div>

              {/* Token d'accès */}
              <div className="space-y-4 pt-6 border-t">
                <h3 className="font-semibold text-lg">Accès & Sécurité</h3>
                <div className="space-y-3">
                  <Label className="text-sm text-muted-foreground">Token d'accès permanent</Label>
                  <div className="flex gap-2">
                    <Input 
                      value={bureau?.access_token || ''} 
                      readOnly 
                      className="font-mono text-xs"
                    />
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => {
                        navigator.clipboard.writeText(bureau?.access_token || '');
                        toast.success('Token copié !');
                      }}
                    >
                      Copier
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Utilisez ce token pour accéder à votre bureau depuis n'importe quel appareil
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
      
      {/* Widget de communication flottant */}
      <CommunicationWidget position="bottom-right" showNotifications={true} />
    </div>
  );
}
