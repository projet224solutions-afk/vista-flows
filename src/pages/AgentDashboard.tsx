import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Users, TrendingUp, DollarSign, UserPlus, LogOut, Wallet, Settings } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { UserIdDisplay } from '@/components/UserIdDisplay';
import { AgentIdDisplay } from '@/components/agent/AgentIdDisplay';
import { CreateUserForm } from '@/components/agent/CreateUserForm';
import { WalletBalanceDisplay } from '@/components/wallet/WalletBalanceDisplay';
import AgentWalletManagement from '@/components/agent/AgentWalletManagement';
import AgentSubAgentsManagement from '@/components/agent/AgentSubAgentsManagement';
import CommunicationWidget from '@/components/communication/CommunicationWidget';
import { ErrorBanner } from '@/components/ui/ErrorBanner';
import { useAgentErrorBoundary } from '@/hooks/useAgentErrorBoundary';
import { AgentWalletDiagnostic } from '@/components/agent/AgentWalletDiagnostic';
import { useAgentStats } from '@/hooks/useAgentStats';

export default function AgentDashboard() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const { error, captureError, clearError } = useAgentErrorBoundary();
  const [agent, setAgent] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [pdgUserId, setPdgUserId] = useState<string | null>(null);
  const { stats, refetch: refetchStats } = useAgentStats(agent?.id);

  // Version: 2025-12-01 avec onglet Paramètres
  console.log('[AgentDashboard] Version: 2025-12-01 - Paramètres disponible');

  useEffect(() => {
    if (!user) {
      navigate('/auth');
      return;
    }
    loadAgentData();
  }, [user]);

  const loadAgentData = async () => {
    try {
      const { data, error } = await supabase
        .from('agents_management')
        .select('*')
        .eq('user_id', user?.id)
        .single();

      if (error) throw error;
      setAgent(data);
      
      // Les agents utilisent leur propre wallet pour faire des transactions
      setPdgUserId(user?.id || null);
    } catch (error: any) {
      console.error('Erreur chargement agent:', error);
      captureError('network', 'Erreur lors du chargement des données agent', error);
      toast.error('Erreur lors du chargement des données');
    } finally {
      setLoading(false);
    }
  };

  const handleSignOut = async () => {
    await signOut();
    navigate('/');
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!agent) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6">
            <p className="text-center text-muted-foreground">
              Aucun profil agent trouvé. Veuillez contacter votre PDG.
            </p>
            <Button onClick={handleSignOut} className="w-full mt-4">
              Se déconnecter
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-blue-50">
      {/* Header */}
      <div className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-2">
                <h1 className="text-2xl font-bold">Dashboard Agent</h1>
                <UserIdDisplay layout="horizontal" showBadge={true} />
              </div>
              <p className="text-sm text-muted-foreground mb-2">
                Bienvenue, {agent.name}
              </p>
              <div className="flex items-center gap-3">
                {pdgUserId && (
                  <WalletBalanceDisplay userId={pdgUserId} compact={true} className="max-w-xs" />
                )}
              </div>
            </div>
            <Button onClick={handleSignOut} variant="outline">
              <LogOut className="w-4 h-4 mr-2" />
              Déconnexion
            </Button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {error && (
          <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-800 mb-4">
            <p className="font-medium">{error.message}</p>
            <button onClick={clearError} className="text-sm underline mt-2">Fermer</button>
          </div>
        )}
        <Tabs defaultValue="overview" className="space-y-6">
          <TabsList>
            <TabsTrigger value="overview">Vue d'ensemble</TabsTrigger>
            <TabsTrigger value="wallet">
              <Wallet className="w-4 h-4 mr-2" />
              Wallet
            </TabsTrigger>
            <TabsTrigger value="sub-agents">Sous-Agents</TabsTrigger>
            <TabsTrigger value="settings">
              <Settings className="w-4 h-4 mr-2" />
              Paramètres
            </TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            {/* Diagnostic Wallet */}
            <AgentWalletDiagnostic agentId={agent.id} agentCode={agent.agent_code} />
            
            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium">
                    Utilisateurs Créés
                  </CardTitle>
                  <Users className="w-4 h-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stats.totalUsersCreated}</div>
                  <p className="text-xs text-muted-foreground">
                    +{stats.usersThisMonth} ce mois-ci
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium">
                    Commissions
                  </CardTitle>
                  <DollarSign className="w-4 h-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">0 GNF</div>
                  <p className="text-xs text-muted-foreground">
                    Taux: {agent.commission_rate}%
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium">
                    Performance
                  </CardTitle>
                  <TrendingUp className="w-4 h-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">100%</div>
                  <p className="text-xs text-muted-foreground">
                    Objectif atteint
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium">
                    Sous-Agents
                  </CardTitle>
                  <UserPlus className="w-4 h-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stats.subAgentsCount}</div>
                  <p className="text-xs text-muted-foreground">
                    {stats.activeSubAgentsCount} actif(s) | {agent.can_create_sub_agent ? 'Autorisé' : 'Non autorisé'}
                  </p>
                </CardContent>
              </Card>
            </div>

            {/* Agent Info */}
            <Card>
              <CardHeader>
                <CardTitle>Informations Agent</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Email</p>
                    <p className="text-base">{agent.email}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Téléphone</p>
                    <p className="text-base">{agent.phone || 'Non renseigné'}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground mb-2">Code Agent</p>
                    <AgentIdDisplay agentCode={agent.agent_code} />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Permissions</p>
                    <div className="flex flex-wrap gap-2 mt-1">
                      {agent.permissions?.map((perm: string) => (
                        <span 
                          key={perm}
                          className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded"
                        >
                          {perm}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Quick Actions */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <CreateUserForm 
                agentId={agent.id} 
                agentCode={agent.agent_code}
                onUserCreated={() => {
                  loadAgentData();
                  refetchStats();
                }}
              />
              {agent.permissions?.includes('manage_users') && (
                <Button 
                  className="h-20" 
                  variant="outline"
                  onClick={() => {
                    toast.info('Utilisez l\'interface publique de l\'agent pour voir la liste complète des utilisateurs');
                  }}
                >
                  <Users className="w-6 h-6 mr-2" />
                  Voir les Utilisateurs
                </Button>
              )}
            </div>
          </TabsContent>

          <TabsContent value="wallet" className="space-y-6">
            {agent?.id ? (
              <>
                {console.log('🔍 AgentDashboard - Wallet Tab:', { agentId: agent.id, agentCode: agent.agent_code })}
                <AgentWalletManagement 
                  agentId={agent.id} 
                  agentCode={agent.agent_code}
                  showTransactions={true}
                />
              </>
            ) : (
              <Card>
                <CardContent className="py-6">
                  <div className="text-center text-muted-foreground">
                    <Wallet className="w-12 h-12 mx-auto mb-2 opacity-50" />
                    <p>Impossible de charger le wallet</p>
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="sub-agents">
            <AgentSubAgentsManagement agentId={agent.id} />
          </TabsContent>

          <TabsContent value="settings" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Modifier Email */}
              <Card>
                <CardHeader>
                  <CardTitle>Modifier l'email</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div>
                      <p className="text-sm text-muted-foreground mb-2">Email actuel</p>
                      <p className="text-base font-medium">{agent.email}</p>
                    </div>
                    <Button 
                      className="w-full"
                      onClick={() => {
                        toast.info('Fonctionnalité de modification d\'email en cours de développement');
                      }}
                    >
                      Modifier l'email
                    </Button>
                  </div>
                </CardContent>
              </Card>

              {/* Modifier Mot de Passe */}
              <Card>
                <CardHeader>
                  <CardTitle>Modifier le mot de passe</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <p className="text-sm text-muted-foreground">
                      Changez votre mot de passe pour sécuriser votre compte
                    </p>
                    <Button 
                      className="w-full"
                      onClick={() => navigate('/agent/change-password')}
                    >
                      Changer le mot de passe
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>
      
      {/* Widget de communication flottant */}
      <CommunicationWidget position="bottom-right" showNotifications={true} />
    </div>
  );
}
