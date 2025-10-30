import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Users, TrendingUp, DollarSign, UserPlus, LogOut } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { UserIdDisplay } from '@/components/UserIdDisplay';
import { CreateUserForm } from '@/components/agent/CreateUserForm';
import { WalletBalanceDisplay } from '@/components/wallet/WalletBalanceDisplay';
import AgentSubAgentsManagement from '@/components/agent/AgentSubAgentsManagement';

export default function AgentDashboard() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const [agent, setAgent] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalUsersCreated: 0,
    usersThisMonth: 0,
  });

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

      // Charger les statistiques des utilisateurs créés
      await loadUserStats(data.id);
    } catch (error) {
      console.error('Erreur chargement agent:', error);
      toast.error('Erreur lors du chargement des données');
    } finally {
      setLoading(false);
    }
  };

  const loadUserStats = async (agentId: string) => {
    try {
      // Compter le total d'utilisateurs créés
      const { count: totalCount, error: totalError } = await supabase
        .from('agent_created_users')
        .select('*', { count: 'exact', head: true })
        .eq('agent_id', agentId);

      if (totalError) throw totalError;

      // Compter les utilisateurs créés ce mois
      const startOfMonth = new Date();
      startOfMonth.setDate(1);
      startOfMonth.setHours(0, 0, 0, 0);

      const { count: monthCount, error: monthError } = await supabase
        .from('agent_created_users')
        .select('*', { count: 'exact', head: true })
        .eq('agent_id', agentId)
        .gte('created_at', startOfMonth.toISOString());

      if (monthError) throw monthError;

      setStats({
        totalUsersCreated: totalCount || 0,
        usersThisMonth: monthCount || 0,
      });
    } catch (error) {
      console.error('Erreur chargement stats:', error);
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
              <WalletBalanceDisplay userId={user?.id} compact={true} className="max-w-xs" />
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
        <Tabs defaultValue="overview" className="space-y-6">
          <TabsList>
            <TabsTrigger value="overview">Vue d'ensemble</TabsTrigger>
            <TabsTrigger value="sub-agents">Sous-Agents</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
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
                  <div className="text-2xl font-bold">0</div>
                  <p className="text-xs text-muted-foreground">
                    {agent.can_create_sub_agent ? 'Autorisé' : 'Non autorisé'}
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
                    <p className="text-sm font-medium text-muted-foreground">Code Agent</p>
                    <p className="text-base font-mono">{agent.agent_code}</p>
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

          <TabsContent value="sub-agents">
            <AgentSubAgentsManagement />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
