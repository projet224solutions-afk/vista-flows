import { useState, useEffect } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Bike, Users, Plus, AlertCircle, RefreshCw, MessageSquare, Settings, Lock, Mail, Copy } from 'lucide-react';
import { toast } from 'sonner';
import { useTranslation } from "@/hooks/useTranslation";
import { supabase } from '@/integrations/supabase/client';
import { useBureauErrorBoundary } from '@/hooks/useBureauErrorBoundary';
import { useBureauActions } from '@/hooks/useBureauActions';
import MotoSecurityAlerts from '@/components/syndicat/MotoSecurityAlerts';
import MotoSecurityNotifications from '@/components/syndicat/MotoSecurityNotifications';
import SyndicateVehicleManagement from '@/components/syndicate/SyndicateVehicleManagement';
import StolenVehicleManagement from '@/components/syndicate/StolenVehicleManagement';
import BureauOfflineSyncPanel from '@/components/syndicat/BureauOfflineSyncPanel';
import UniversalCommunicationHub from '@/components/communication/UniversalCommunicationHub';
import BureauWalletManagement from '@/components/wallet/BureauWalletManagement';
import CommunicationWidget from '@/components/communication/CommunicationWidget';
import { useBureauAuth } from '@/hooks/useBureauAuth';
import { BureauLayout } from '@/components/bureau/BureauLayout';
import { BureauOverviewContent } from '@/components/bureau/BureauOverviewContent';
import { BureauSyndicatSOSDashboard } from '@/components/bureau-syndicat/BureauSyndicatSOSDashboard';

export default function BureauDashboard() {
  const { token } = useParams();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { error, captureError, clearError } = useBureauErrorBoundary();
  const { logout } = useBureauAuth();
  const { t } = useTranslation();
  
  const [bureau, setBureau] = useState<any>(null);
  const [workers, setWorkers] = useState<any[]>([]);
  const [members, setMembers] = useState<any[]>([]);
  const [motos, setMotos] = useState<any[]>([]);
  const [alerts, setAlerts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');
  const [walletBalance, setWalletBalance] = useState(0);
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

  const loadBureauData = async () => {
    try {
      setLoading(true);

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

      const [workersRes, membersRes, motosRes, alertsRes, walletRes] = await Promise.all([
        supabase.from('syndicate_workers').select('*').eq('bureau_id', bureauData.id),
        supabase.from('members').select('*').eq('bureau_id', bureauData.id),
        supabase.from('registered_motos').select('*').eq('bureau_id', bureauData.id),
        supabase.from('syndicate_alerts').select('*').eq('bureau_id', bureauData.id).order('created_at', { ascending: false }),
        supabase.from('bureau_wallets').select('balance').eq('bureau_id', bureauData.id).single()
      ]);

      setWorkers(workersRes.data || []);
      setMembers(membersRes.data || []);
      setMotos(motosRes.data || []);
      setAlerts(alertsRes.data || []);
      setWalletBalance(walletRes.data?.balance || 0);
    } catch (error: any) {
      console.error('Erreur chargement bureau:', error);
      captureError('member_error', error.message || 'Erreur lors du chargement des données', error);
      toast.error('Erreur lors du chargement des données');
    } finally {
      setLoading(false);
    }
  };

  const { addWorker } = useBureauActions({
    bureauId: bureau?.id,
    onWorkerCreated: loadBureauData
  });

  useEffect(() => {
    if (token) {
      loadBureauData();
    }
  }, [token]);

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

      const result = await addWorker({
        ...workerForm,
        access_level: workerForm.access_level as 'standard' | 'advanced' | 'limited'
      }, bureau.id);

      if (!result.success) {
        captureError('worker_error', result.error || 'Erreur lors de l\'ajout du membre');
        toast.error(result.error);
        return;
      }

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

  const unreadAlerts = alerts.filter(a => !a.is_read).length;

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 via-emerald-50 to-teal-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600 mx-auto mb-4"></div>
          <p className="text-slate-600">{t('bureau.loadingInterface')}</p>
        </div>
      </div>
    );
  }

  if (!bureau) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 via-emerald-50 to-teal-50">
        <Card className="max-w-md border-0 shadow-xl">
          <CardHeader>
            <CardTitle className="text-center">{t('bureau.notFound')}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-center text-slate-600">{t('bureau.invalidLink')}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const renderContent = () => {
    switch (activeTab) {
      case 'overview':
        return (
          <BureauOverviewContent 
            bureau={bureau}
            stats={{
              workersCount: workers.length,
              membersCount: members.length,
              motosCount: motos.length,
              alertsCount: unreadAlerts
            }}
            walletBalance={walletBalance}
          />
        );

      case 'sos':
        return (
          <BureauSyndicatSOSDashboard 
            bureauId={bureau.id}
          />
        );

      case 'motos':
        return (
          <div className="space-y-6">
            <div className="grid grid-cols-1 xl:grid-cols-4 gap-4">
              <div className="xl:col-span-3">
                <SyndicateVehicleManagement bureauId={bureau.id} />
              </div>
              <div className="space-y-4">
                <MotoSecurityNotifications bureauId={bureau.id} />
                <MotoSecurityAlerts bureauId={bureau.id} />
              </div>
            </div>
          </div>
        );

      case 'security':
        return (
          <StolenVehicleManagement bureauId={bureau.id} />
        );

      case 'wallet':
        return (
          <BureauWalletManagement 
            bureauId={bureau.id}
            bureauCode={bureau.bureau_code}
            showTransactions={true}
          />
        );

      case 'workers':
        return (
          <Card className="border-0 shadow-lg">
            <CardHeader className="flex flex-row items-center justify-between bg-gradient-to-r from-emerald-50 to-teal-50 border-b">
              <CardTitle className="flex items-center gap-2">
                <Users className="w-5 h-5 text-emerald-600" />
                Gestion des Membres du Bureau
              </CardTitle>
              <Dialog open={isWorkerDialogOpen} onOpenChange={setIsWorkerDialogOpen}>
                <DialogTrigger asChild>
                  <Button className="bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700">
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
                      <div className="grid grid-cols-2 gap-2">
                        {Object.entries(workerForm.permissions).map(([key, value]) => (
                          <div key={key} className="flex items-center space-x-2">
                            <Checkbox 
                              id={key}
                              checked={value}
                              onCheckedChange={(checked) => setWorkerForm({
                                ...workerForm,
                                permissions: { ...workerForm.permissions, [key]: checked as boolean }
                              })}
                            />
                            <label htmlFor={key} className="text-sm capitalize">
                              {key.replace(/_/g, ' ')}
                            </label>
                          </div>
                        ))}
                      </div>
                    </div>
                    <div className="flex justify-end gap-2 pt-4">
                      <Button type="button" variant="outline" onClick={() => setIsWorkerDialogOpen(false)} disabled={isSubmittingWorker}>
                        Annuler
                      </Button>
                      <Button type="submit" disabled={isSubmittingWorker} className="bg-gradient-to-r from-emerald-600 to-teal-600">
                        {isSubmittingWorker ? 'Ajout en cours...' : 'Ajouter'}
                      </Button>
                    </div>
                  </form>
                </DialogContent>
              </Dialog>
            </CardHeader>
            <CardContent className="p-6">
              <div className="space-y-4">
                {workers.map((worker) => (
                  <div key={worker.id} className="flex items-center justify-between p-4 rounded-xl border bg-slate-50 hover:bg-slate-100 transition-colors">
                    <div>
                      <h3 className="font-medium text-slate-800">{worker.nom}</h3>
                      <p className="text-sm text-slate-500">{worker.email}</p>
                      <p className="text-xs text-slate-400">Accès: {worker.access_level}</p>
                    </div>
                    <Badge className={worker.is_active ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-600"}>
                      {worker.is_active ? '● Actif' : '○ Inactif'}
                    </Badge>
                  </div>
                ))}
                {workers.length === 0 && (
                  <div className="text-center py-12 text-slate-500">
                    Aucun membre du bureau ajouté
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        );

      case 'sync':
        return (
          <Card className="border-0 shadow-lg">
            <CardHeader className="bg-gradient-to-r from-slate-50 to-slate-100 border-b">
              <CardTitle className="flex items-center gap-2">
                <RefreshCw className="w-5 h-5 text-blue-600" />
                Synchronisation Hors-ligne
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              <BureauOfflineSyncPanel bureauId={bureau.id} />
            </CardContent>
          </Card>
        );

      case 'alerts':
        return (
          <Card className="border-0 shadow-lg">
            <CardHeader className="bg-gradient-to-r from-red-50 to-orange-50 border-b">
              <CardTitle className="flex items-center gap-2">
                <AlertCircle className="w-5 h-5 text-red-600" />
                Alertes et Notifications
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              <div className="space-y-4">
                {alerts.map((alert) => (
                  <div 
                    key={alert.id} 
                    className={`flex items-start gap-4 p-4 rounded-xl border ${
                      alert.is_critical ? 'border-red-200 bg-red-50' : 'border-amber-200 bg-amber-50'
                    }`}
                  >
                    <AlertCircle className={`w-5 h-5 ${alert.is_critical ? 'text-red-500' : 'text-amber-500'} flex-shrink-0 mt-0.5`} />
                    <div className="flex-1">
                      <h3 className={`font-medium ${alert.is_critical ? 'text-red-900' : 'text-amber-900'}`}>
                        {alert.title}
                      </h3>
                      <p className={`text-sm mt-1 ${alert.is_critical ? 'text-red-700' : 'text-amber-700'}`}>
                        {alert.message}
                      </p>
                      <p className="text-xs text-slate-500 mt-2">
                        {new Date(alert.created_at).toLocaleDateString('fr-FR')}
                      </p>
                    </div>
                    <Badge className={alert.is_critical ? 'bg-red-500' : 'bg-amber-500'}>
                      {alert.severity}
                    </Badge>
                  </div>
                ))}
                {alerts.length === 0 && (
                  <div className="text-center py-12 text-slate-500">
                    Aucune alerte
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        );

      case 'communication':
        return (
          <Card className="border-0 shadow-lg">
            <CardHeader className="bg-gradient-to-r from-blue-50 to-indigo-50 border-b">
              <CardTitle className="flex items-center gap-2">
                <MessageSquare className="w-5 h-5 text-blue-600" />
                Hub de Communication
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              <UniversalCommunicationHub />
            </CardContent>
          </Card>
        );

      case 'settings':
        return (
          <div className="space-y-6">
            {/* Informations du Bureau */}
            <Card className="border-0 shadow-lg">
              <CardHeader className="bg-gradient-to-r from-slate-50 to-slate-100 border-b">
                <CardTitle className="flex items-center gap-2">
                  <Settings className="w-5 h-5 text-slate-600" />
                  Informations du Bureau
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  <div className="space-y-1">
                    <p className="text-xs text-slate-500 uppercase">Code Bureau</p>
                    <p className="font-semibold text-slate-800">{bureau?.bureau_code}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-xs text-slate-500 uppercase">Statut</p>
                    <Badge className="bg-emerald-100 text-emerald-700">{bureau?.status}</Badge>
                  </div>
                  <div className="space-y-1">
                    <p className="text-xs text-slate-500 uppercase">Préfecture</p>
                    <p className="font-semibold text-slate-800">{bureau?.prefecture}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-xs text-slate-500 uppercase">Commune</p>
                    <p className="font-semibold text-slate-800">{bureau?.commune}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-xs text-slate-500 uppercase">Président</p>
                    <p className="font-semibold text-slate-800">{bureau?.president_name}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-xs text-slate-500 uppercase">Email</p>
                    <p className="font-semibold text-slate-800">{bureau?.president_email}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Token d'accès */}
            <Card className="border-0 shadow-lg">
              <CardHeader className="bg-gradient-to-r from-amber-50 to-orange-50 border-b">
                <CardTitle className="flex items-center gap-2">
                  <Lock className="w-5 h-5 text-amber-600" />
                  Accès & Sécurité
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6 space-y-4">
                <div>
                  <Label className="text-sm text-slate-500">Token d'accès permanent</Label>
                  <div className="flex gap-2 mt-2">
                    <Input value={bureau?.access_token || ''} readOnly className="font-mono text-xs" />
                    <Button 
                      variant="outline" 
                      onClick={() => {
                        navigator.clipboard.writeText(bureau?.access_token || '');
                        toast.success('Token copié !');
                      }}
                    >
                      <Copy className="w-4 h-4" />
                    </Button>
                  </div>
                  <p className="text-xs text-slate-500 mt-2">
                    Utilisez ce token pour accéder à votre bureau depuis n'importe quel appareil
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Gestion du compte */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card className="border-0 shadow-lg">
                <CardHeader className="bg-gradient-to-r from-blue-50 to-indigo-50 border-b">
                  <CardTitle className="flex items-center gap-2 text-base">
                    <Mail className="w-5 h-5 text-blue-600" />
                    Modifier l'email
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-6 space-y-4">
                  <div>
                    <p className="text-sm text-slate-500">Email actuel</p>
                    <p className="font-medium text-slate-800">{bureau?.president_email}</p>
                  </div>
                  <Button className="w-full" variant="outline" onClick={() => toast.info('Fonctionnalité en cours de développement')}>
                    Modifier l'email
                  </Button>
                </CardContent>
              </Card>

              <Card className="border-0 shadow-lg">
                <CardHeader className="bg-gradient-to-r from-green-50 to-emerald-50 border-b">
                  <CardTitle className="flex items-center gap-2 text-base">
                    <Lock className="w-5 h-5 text-green-600" />
                    Modifier le mot de passe
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-6 space-y-4">
                  <p className="text-sm text-slate-500">
                    Changez votre mot de passe pour sécuriser votre compte
                  </p>
                  <Button 
                    className="w-full bg-gradient-to-r from-emerald-600 to-teal-600"
                    onClick={() => {
                      if (bureau?.access_token) {
                        localStorage.setItem('bureau_return_token', bureau.access_token);
                      }
                      navigate('/bureau/change-password');
                    }}
                  >
                    Changer le mot de passe
                  </Button>
                </CardContent>
              </Card>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <>
      <BureauLayout
        bureau={bureau}
        activeTab={activeTab}
        onTabChange={setActiveTab}
        alertsCount={unreadAlerts}
        onLogout={logout}
      >
        {error && (
          <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-800 mb-6">
            <p className="font-medium">{typeof error === 'string' ? error : error.message}</p>
            <button onClick={clearError} className="text-sm underline mt-2">Fermer</button>
          </div>
        )}
        {renderContent()}
      </BureauLayout>
      
      <CommunicationWidget position="bottom-right" showNotifications={true} />
    </>
  );
}
