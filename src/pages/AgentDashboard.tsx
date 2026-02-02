import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Key, Mail, Lock, AlertTriangle, Shield, Users, DollarSign, Settings as SettingsIcon, Brain, Zap } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useTranslation } from "@/hooks/useTranslation";
import { AVAILABLE_PERMISSIONS, PermissionKey } from '@/hooks/useAgentPermissions';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { AgentLayoutProfessional } from '@/components/agent/AgentLayoutProfessional';
import { AgentOverviewProfessional } from '@/components/agent/AgentOverviewProfessional';
import { useAgentPermissionsUnified } from '@/hooks/useAgentPermissionsUnified';
import { CreateUserForm } from '@/components/agent/CreateUserForm';
import AgentWalletManagement from '@/components/agent/AgentWalletManagement';
import AgentSubAgentsManagement from '@/components/agent/AgentSubAgentsManagement';
import { ViewReportsSection } from '@/components/agent/ViewReportsSection';
import { AgentAffiliateLinksSection } from '@/components/agent/AgentAffiliateLinksSection';
import CommunicationWidget from '@/components/communication/CommunicationWidget';
import { useAgentStats } from '@/hooks/useAgentStats';
import { AgentCreatedUsersList } from '@/components/agent/AgentCreatedUsersList';
import { AgentOrdersTracking } from '@/components/agent/AgentOrdersTracking';
import MyPurchasesOrdersList from '@/components/shared/MyPurchasesOrdersList';
// Modules opérationnels complets
import { AgentKYCManagement } from '@/components/agent/AgentKYCManagement';
import { AgentFullFinanceModule } from '@/components/agent/modules/AgentFullFinanceModule';
import { AgentWalletTransactionsManagement } from '@/components/agent/AgentWalletTransactionsManagement';
import { AgentBankingModule } from '@/components/agent/modules/AgentBankingModule';
import { AgentUsersModule } from '@/components/agent/modules/AgentUsersModule';
import { AgentVendorsModule } from '@/components/agent/modules/AgentVendorsModule';
import { AgentOrdersModule } from '@/components/agent/modules/AgentOrdersModule';

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
  
  // Hook pour les permissions unifiées (table agent_permissions + legacy JSON)
  const { permissions: unifiedPermissions, loading: permissionsLoading } = useAgentPermissionsUnified(agent?.id);
  
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
      
      // --- Modules opérationnels complets ---
      case 'finance':
        return <AgentFullFinanceModule agentId={agent.id} canManage={unifiedPermissions.manage_finance === true} />;
      
      case 'banking':
        return <AgentBankingModule agentId={agent.id} canManage={unifiedPermissions.manage_banking === true} />;
      
      case 'kyc-management':
        return <AgentKYCManagement agentId={agent.id} canManage={unifiedPermissions.manage_kyc === true} />;
      
      case 'wallet-transactions':
        return <AgentWalletTransactionsManagement agentId={agent.id} />;
      
      case 'users-management':
        return <AgentUsersModule agentId={agent.id} canManage={unifiedPermissions.manage_users === true} />;
      
      case 'vendors-management':
        return <AgentVendorsModule agentId={agent.id} canManage={unifiedPermissions.manage_vendors === true} />;
      
      case 'orders-management':
        return <AgentOrdersModule agentId={agent.id} canManage={unifiedPermissions.manage_orders === true} />;
      // --- Fin modules opérationnels ---
      
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
                accessToken={agent.access_token}
                onUserCreated={() => {
                  loadAgentData();
                  refetchStats();
                  setActiveTab('my-users'); // Aller vers la liste après création
                  toast.success(t('agent.userCreatedSuccess'));
                }}
              />
            </CardContent>
          </Card>
        );
      
      case 'my-users':
        return <AgentCreatedUsersList agentId={agent.id} />;
      
      case 'orders':
        return <AgentOrdersTracking agentId={agent.id} />;
      
      case 'my-purchases':
        return <MyPurchasesOrdersList title="Mes Achats Personnels" emptyMessage="Vous n'avez pas encore effectué d'achats sur le marketplace" />;
      
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
      
      case 'affiliate':
        return <AgentAffiliateLinksSection agentId={agent.id} agentToken={agent.access_token} />;
      
      case 'settings':
        return (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Permissions accordées - affichage par catégorie */}
            <Card className="border-0 shadow-lg md:col-span-2">
              <CardHeader className="bg-gradient-to-r from-primary/10 to-primary/5 border-b">
                <CardTitle className="flex items-center gap-2 text-foreground">
                  <Shield className="w-5 h-5 text-primary" />
                  Mes permissions ({Object.values(unifiedPermissions).filter(Boolean).length} actives)
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                {permissionsLoading ? (
                  <p className="text-sm text-muted-foreground">Chargement des permissions…</p>
                ) : Object.values(unifiedPermissions).filter(Boolean).length === 0 ? (
                  <p className="text-sm text-muted-foreground">Aucune permission active.</p>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {/* Finance */}
                    {['view_finance', 'manage_finance', 'view_banking', 'manage_banking', 'manage_wallet_transactions', 'access_pdg_wallet', 'view_financial_module', 'manage_commissions', 'view_payments', 'manage_payments'].some(k => unifiedPermissions[k]) && (
                      <div className="space-y-2">
                        <div className="flex items-center gap-2 text-sm font-semibold text-amber-600">
                          <DollarSign className="w-4 h-4" />
                          Finance
                        </div>
                        <div className="flex flex-wrap gap-1.5">
                          {['view_finance', 'manage_finance', 'view_banking', 'manage_banking', 'manage_wallet_transactions', 'access_pdg_wallet', 'view_financial_module', 'manage_commissions', 'view_payments', 'manage_payments']
                            .filter(k => unifiedPermissions[k])
                            .map(perm => (
                              <Badge key={perm} variant="outline" className="text-xs bg-amber-50 text-amber-700 border-amber-200">
                                {AVAILABLE_PERMISSIONS[perm as PermissionKey] || perm}
                              </Badge>
                            ))}
                        </div>
                      </div>
                    )}

                    {/* Gestion */}
                    {['view_users', 'manage_users', 'create_users', 'view_products', 'manage_products', 'view_transfer_fees', 'manage_transfer_fees', 'view_kyc', 'manage_kyc', 'view_service_subscriptions', 'manage_service_subscriptions'].some(k => unifiedPermissions[k]) && (
                      <div className="space-y-2">
                        <div className="flex items-center gap-2 text-sm font-semibold text-blue-600">
                          <Users className="w-4 h-4" />
                          Gestion
                        </div>
                        <div className="flex flex-wrap gap-1.5">
                          {['view_users', 'manage_users', 'create_users', 'view_products', 'manage_products', 'view_transfer_fees', 'manage_transfer_fees', 'view_kyc', 'manage_kyc', 'view_service_subscriptions', 'manage_service_subscriptions']
                            .filter(k => unifiedPermissions[k])
                            .map(perm => (
                              <Badge key={perm} variant="outline" className="text-xs bg-blue-50 text-blue-700 border-blue-200">
                                {AVAILABLE_PERMISSIONS[perm as PermissionKey] || perm}
                              </Badge>
                            ))}
                        </div>
                      </div>
                    )}

                    {/* Opérations */}
                    {['view_agents', 'manage_agents', 'create_sub_agents', 'view_syndicat', 'manage_syndicat', 'view_orders', 'manage_orders', 'view_vendors', 'manage_vendors', 'view_drivers', 'manage_drivers', 'manage_deliveries'].some(k => unifiedPermissions[k]) && (
                      <div className="space-y-2">
                        <div className="flex items-center gap-2 text-sm font-semibold text-green-600">
                          <Zap className="w-4 h-4" />
                          Opérations
                        </div>
                        <div className="flex flex-wrap gap-1.5">
                          {['view_agents', 'manage_agents', 'create_sub_agents', 'view_syndicat', 'manage_syndicat', 'view_orders', 'manage_orders', 'view_vendors', 'manage_vendors', 'view_drivers', 'manage_drivers', 'manage_deliveries']
                            .filter(k => unifiedPermissions[k])
                            .map(perm => (
                              <Badge key={perm} variant="outline" className="text-xs bg-green-50 text-green-700 border-green-200">
                                {AVAILABLE_PERMISSIONS[perm as PermissionKey] || perm}
                              </Badge>
                            ))}
                        </div>
                      </div>
                    )}

                    {/* Système */}
                    {['view_security', 'manage_security', 'view_config', 'manage_config', 'view_maintenance', 'manage_maintenance', 'view_api', 'manage_api', 'view_debug', 'manage_debug'].some(k => unifiedPermissions[k]) && (
                      <div className="space-y-2">
                        <div className="flex items-center gap-2 text-sm font-semibold text-purple-600">
                          <SettingsIcon className="w-4 h-4" />
                          Système
                        </div>
                        <div className="flex flex-wrap gap-1.5">
                          {['view_security', 'manage_security', 'view_config', 'manage_config', 'view_maintenance', 'manage_maintenance', 'view_api', 'manage_api', 'view_debug', 'manage_debug']
                            .filter(k => unifiedPermissions[k])
                            .map(perm => (
                              <Badge key={perm} variant="outline" className="text-xs bg-purple-50 text-purple-700 border-purple-200">
                                {AVAILABLE_PERMISSIONS[perm as PermissionKey] || perm}
                              </Badge>
                            ))}
                        </div>
                      </div>
                    )}

                    {/* Intelligence */}
                    {['access_ai_assistant', 'access_copilot', 'access_copilot_dashboard', 'view_copilot_audit', 'view_reports', 'manage_reports', 'view_statistics'].some(k => unifiedPermissions[k]) && (
                      <div className="space-y-2">
                        <div className="flex items-center gap-2 text-sm font-semibold text-pink-600">
                          <Brain className="w-4 h-4" />
                          Intelligence
                        </div>
                        <div className="flex flex-wrap gap-1.5">
                          {['access_ai_assistant', 'access_copilot', 'access_copilot_dashboard', 'view_copilot_audit', 'view_reports', 'manage_reports', 'view_statistics']
                            .filter(k => unifiedPermissions[k])
                            .map(perm => (
                              <Badge key={perm} variant="outline" className="text-xs bg-pink-50 text-pink-700 border-pink-200">
                                {AVAILABLE_PERMISSIONS[perm as PermissionKey] || perm}
                              </Badge>
                            ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>

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
        unifiedPermissions={unifiedPermissions}
      >
        {renderContent()}
      </AgentLayoutProfessional>
      
      <CommunicationWidget position="bottom-right" showNotifications={true} />
    </>
  );
}
