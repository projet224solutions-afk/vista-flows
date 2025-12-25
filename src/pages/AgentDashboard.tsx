import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Key, Mail, Lock, AlertTriangle } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useTranslation } from "@/hooks/useTranslation";
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { AgentLayoutProfessional } from '@/components/agent/AgentLayoutProfessional';
import { AgentOverviewProfessional } from '@/components/agent/AgentOverviewProfessional';
import { CreateUserForm } from '@/components/agent/CreateUserForm';
import AgentWalletManagement from '@/components/agent/AgentWalletManagement';
import AgentSubAgentsManagement from '@/components/agent/AgentSubAgentsManagement';
import { ViewReportsSection } from '@/components/agent/ViewReportsSection';
import CommunicationWidget from '@/components/communication/CommunicationWidget';
import { useAgentStats } from '@/hooks/useAgentStats';

export default function AgentDashboard() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [agent, setAgent] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');
  const [pdgUserId, setPdgUserId] = useState<string | null>(null);
  const [walletBalance, setWalletBalance] = useState(0);
  const { stats, refetch: refetchStats } = useAgentStats(agent?.id);
  
  // Password change state
  const [isPasswordDialogOpen, setIsPasswordDialogOpen] = useState(false);
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  const [isChangingPassword, setIsChangingPassword] = useState(false);

  // Email change state
  const [isEmailDialogOpen, setIsEmailDialogOpen] = useState(false);
  const [emailData, setEmailData] = useState({
    newEmail: '',
    currentPassword: ''
  });
  const [isChangingEmail, setIsChangingEmail] = useState(false);

  useEffect(() => {
    if (!user) {
      navigate('/auth');
      return;
    }
    loadAgentData();
  }, [user]);

  useEffect(() => {
    if (agent?.id) {
      loadWalletBalance();
      
      // Abonnement temps réel pour les changements de wallet
      const channel = supabase
        .channel(`agent-wallet-dashboard-${agent.id}`)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'agent_wallets',
            filter: `agent_id=eq.${agent.id}`,
          },
          (payload) => {
            console.log('💰 Wallet agent mis à jour (dashboard):', payload);
            if (payload.new && typeof (payload.new as any).balance === 'number') {
              setWalletBalance((payload.new as any).balance);
            } else {
              loadWalletBalance();
            }
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [agent?.id]);

  // Écouter l'événement personnalisé de mise à jour wallet
  useEffect(() => {
    const handleWalletUpdate = () => {
      console.log('📢 Event wallet-updated reçu (dashboard)');
      loadWalletBalance();
    };

    window.addEventListener('wallet-updated', handleWalletUpdate);
    return () => window.removeEventListener('wallet-updated', handleWalletUpdate);
  }, [agent?.id]);

  const loadAgentData = async () => {
    try {
      const { data, error } = await supabase
        .from('agents_management')
        .select('*')
        .eq('user_id', user?.id)
        .single();

      if (error) throw error;
      setAgent(data);
      setPdgUserId(user?.id || null);
    } catch (error: any) {
      console.error('Erreur chargement agent:', error);
      toast.error('Erreur lors du chargement des données');
    } finally {
      setLoading(false);
    }
  };

  const loadWalletBalance = async () => {
    if (!agent?.id) return;
    
    try {
      console.log('🔄 Chargement solde wallet dashboard pour agent:', agent.id);
      const { data, error } = await supabase
        .from('agent_wallets')
        .select('balance')
        .eq('agent_id', agent.id)
        .single();
      
      if (!error && data) {
        console.log('✅ Solde wallet dashboard:', data.balance);
        setWalletBalance(data.balance || 0);
      }
    } catch (error) {
      console.error('Erreur chargement wallet:', error);
    }
  };

  const handleSignOut = async () => {
    await signOut();
    navigate('/');
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!agent) {
      toast.error('Agent non trouvé');
      return;
    }

    if (passwordData.newPassword !== passwordData.confirmPassword) {
      toast.error('Les mots de passe ne correspondent pas');
      return;
    }

    if (passwordData.newPassword.length < 8) {
      toast.error('Le nouveau mot de passe doit contenir au moins 8 caractères');
      return;
    }

    setIsChangingPassword(true);

    try {
      const { data, error } = await supabase.functions.invoke('change-agent-password', {
        body: {
          agent_id: agent.id,
          current_password: passwordData.currentPassword,
          new_password: passwordData.newPassword
        }
      });

      if (error) throw error;

      if (data?.success) {
        toast.success('Mot de passe modifié avec succès');
        setIsPasswordDialogOpen(false);
        setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' });
      } else {
        toast.error(data?.error || 'Erreur lors du changement de mot de passe');
      }
    } catch (error) {
      console.error('Erreur changement mot de passe:', error);
      toast.error('Erreur lors du changement de mot de passe');
    } finally {
      setIsChangingPassword(false);
    }
  };

  const handleChangeEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!agent) {
      toast.error('Agent non trouvé');
      return;
    }

    if (!emailData.newEmail || !emailData.currentPassword) {
      toast.error('Veuillez remplir tous les champs');
      return;
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(emailData.newEmail)) {
      toast.error('Format d\'email invalide');
      return;
    }

    setIsChangingEmail(true);

    try {
      const { data, error } = await supabase.functions.invoke('change-agent-email', {
        body: {
          agent_id: agent.id,
          new_email: emailData.newEmail,
          current_password: emailData.currentPassword
        }
      });

      if (error) throw error;

      if (data?.success) {
        toast.success('Email modifié avec succès');
        setIsEmailDialogOpen(false);
        setEmailData({ newEmail: '', currentPassword: '' });
        // Reload agent data to reflect new email
        loadAgentData();
      } else {
        toast.error(data?.error || 'Erreur lors du changement d\'email');
      }
    } catch (error) {
      console.error('Erreur changement email:', error);
      toast.error('Erreur lors du changement d\'email');
    } finally {
      setIsChangingEmail(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-slate-600">{t('agent.loadingInterface')}</p>
        </div>
      </div>
    );
  }

  if (!agent) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
        <Card className="w-full max-w-md border-0 shadow-xl">
          <CardContent className="pt-6">
            <div className="text-center">
              <AlertTriangle className="w-12 h-12 text-amber-500 mx-auto mb-4" />
              <h2 className="text-xl font-bold text-slate-800 mb-2">{t('agent.profileNotFound')}</h2>
              <p className="text-slate-600 mb-4">
                {t('agent.noProfileAssociated')}
              </p>
              <Button onClick={handleSignOut} className="w-full">
                {t('common.signOut')}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const renderContent = () => {
    switch (activeTab) {
      case 'overview':
        return (
          <AgentOverviewProfessional
            agent={agent}
            stats={stats}
            walletBalance={walletBalance}
            onNavigate={setActiveTab}
          />
        );
      
      case 'wallet':
        return (
          <AgentWalletManagement 
            agentId={agent.id} 
            agentCode={agent.agent_code}
            showTransactions={true}
          />
        );
      
      case 'create-user':
        return (
          <Card className="border-0 shadow-lg">
            <CardHeader className="bg-gradient-to-r from-blue-50 to-indigo-50 border-b">
              <CardTitle className="text-slate-800">{t('agent.createNewUser')}</CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              <CreateUserForm 
                agentId={agent.id} 
                agentCode={agent.agent_code}
                onUserCreated={() => {
                  loadAgentData();
                  refetchStats();
                  toast.success(t('agent.userCreatedSuccess'));
                }}
              />
            </CardContent>
          </Card>
        );
      
      case 'sub-agents':
        return <AgentSubAgentsManagement agentId={agent.id} />;
      
      case 'reports':
        return (
          <ViewReportsSection 
            agentId={agent.id}
            agentData={{
              total_users_created: stats.totalUsersCreated,
              total_commissions_earned: 0,
              commission_rate: agent.commission_rate
            }}
          />
        );
      
      case 'settings':
        return (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Email Settings */}
            <Card className="border-0 shadow-lg">
              <CardHeader className="bg-gradient-to-r from-slate-50 to-slate-100 border-b">
                <CardTitle className="flex items-center gap-2 text-slate-800">
                  <Mail className="w-5 h-5 text-blue-600" />
                  Email
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6 space-y-4">
                <div>
                  <p className="text-sm text-slate-500 mb-1">Email actuel</p>
                  <p className="font-medium text-slate-800">{agent.email}</p>
                </div>
                <Dialog open={isEmailDialogOpen} onOpenChange={setIsEmailDialogOpen}>
                  <DialogTrigger asChild>
                    <Button className="w-full" variant="outline">
                      <Mail className="w-4 h-4 mr-2" />
                      Modifier l'email
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle className="flex items-center gap-2">
                        <Mail className="w-5 h-5 text-blue-600" />
                        Modifier l'email
                      </DialogTitle>
                    </DialogHeader>
                    <form onSubmit={handleChangeEmail} className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="newEmail">Nouvel email</Label>
                        <Input
                          id="newEmail"
                          type="email"
                          required
                          value={emailData.newEmail}
                          onChange={(e) => setEmailData({ ...emailData, newEmail: e.target.value })}
                          placeholder="nouveau@email.com"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="emailCurrentPassword">Mot de passe actuel</Label>
                        <Input
                          id="emailCurrentPassword"
                          type="password"
                          required
                          value={emailData.currentPassword}
                          onChange={(e) => setEmailData({ ...emailData, currentPassword: e.target.value })}
                          placeholder="Pour confirmer votre identité"
                        />
                      </div>
                      <div className="flex gap-3 pt-2">
                        <Button
                          type="button"
                          variant="outline"
                          className="flex-1"
                          onClick={() => setIsEmailDialogOpen(false)}
                        >
                          Annuler
                        </Button>
                        <Button
                          type="submit"
                          className="flex-1 bg-gradient-to-r from-blue-600 to-indigo-600"
                          disabled={isChangingEmail}
                        >
                          {isChangingEmail ? 'Modification...' : 'Modifier'}
                        </Button>
                      </div>
                    </form>
                  </DialogContent>
                </Dialog>
              </CardContent>
            </Card>

            {/* Password Settings */}
            <Card className="border-0 shadow-lg">
              <CardHeader className="bg-gradient-to-r from-slate-50 to-slate-100 border-b">
                <CardTitle className="flex items-center gap-2 text-slate-800">
                  <Lock className="w-5 h-5 text-green-600" />
                  Mot de passe
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6 space-y-4">
                <p className="text-sm text-slate-500">
                  Changez votre mot de passe pour sécuriser votre compte agent.
                </p>
                <Dialog open={isPasswordDialogOpen} onOpenChange={setIsPasswordDialogOpen}>
                  <DialogTrigger asChild>
                    <Button className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700">
                      <Key className="w-4 h-4 mr-2" />
                      Changer le mot de passe
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle className="flex items-center gap-2">
                        <Key className="w-5 h-5 text-blue-600" />
                        Changer le mot de passe
                      </DialogTitle>
                    </DialogHeader>
                    <form onSubmit={handleChangePassword} className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="currentPassword">Mot de passe actuel</Label>
                        <Input
                          id="currentPassword"
                          type="password"
                          required
                          value={passwordData.currentPassword}
                          onChange={(e) => setPasswordData({ ...passwordData, currentPassword: e.target.value })}
                          placeholder="Entrez votre mot de passe actuel"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="newPassword">Nouveau mot de passe</Label>
                        <Input
                          id="newPassword"
                          type="password"
                          required
                          minLength={8}
                          value={passwordData.newPassword}
                          onChange={(e) => setPasswordData({ ...passwordData, newPassword: e.target.value })}
                          placeholder="Minimum 8 caractères"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="confirmPassword">Confirmer le mot de passe</Label>
                        <Input
                          id="confirmPassword"
                          type="password"
                          required
                          value={passwordData.confirmPassword}
                          onChange={(e) => setPasswordData({ ...passwordData, confirmPassword: e.target.value })}
                          placeholder="Confirmez le nouveau mot de passe"
                        />
                      </div>
                      <div className="flex gap-3 pt-2">
                        <Button
                          type="button"
                          variant="outline"
                          className="flex-1"
                          onClick={() => setIsPasswordDialogOpen(false)}
                        >
                          Annuler
                        </Button>
                        <Button
                          type="submit"
                          className="flex-1 bg-gradient-to-r from-blue-600 to-indigo-600"
                          disabled={isChangingPassword}
                        >
                          {isChangingPassword ? 'Modification...' : 'Modifier'}
                        </Button>
                      </div>
                    </form>
                  </DialogContent>
                </Dialog>
              </CardContent>
            </Card>
          </div>
        );
      
      default:
        return null;
    }
  };

  return (
    <>
      <AgentLayoutProfessional
        agent={agent}
        activeTab={activeTab}
        onTabChange={setActiveTab}
        walletBalance={walletBalance}
        stats={stats}
        onSignOut={handleSignOut}
      >
        {renderContent()}
      </AgentLayoutProfessional>
      
      <CommunicationWidget position="bottom-right" showNotifications={true} />
    </>
  );
}
