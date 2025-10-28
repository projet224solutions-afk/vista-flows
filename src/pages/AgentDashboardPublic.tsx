/**
 * INTERFACE AGENT PUBLIQUE - 224SOLUTIONS
 * Accessible via token d'accès unique (sans authentification)
 */

import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { UserCheck, Users, TrendingUp, DollarSign, Mail, Phone, Shield, AlertCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { UserIdDisplay } from '@/components/UserIdDisplay';
import { CreateUserForm } from '@/components/agent/CreateUserForm';
import { CreateSubAgentForm } from '@/components/agent/CreateSubAgentForm';

interface Agent {
  id: string;
  pdg_id: string;
  name: string;
  email: string;
  phone?: string;
  agent_code: string;
  commission_rate: number;
  is_active: boolean;
  permissions: string[];
  total_users_created?: number;
  total_commissions_earned?: number;
  can_create_sub_agent?: boolean;
  created_at: string;
}

export default function AgentDashboardPublic() {
  const { token } = useParams();
  const navigate = useNavigate();
  const [agent, setAgent] = useState<Agent | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (token) {
      loadAgentData();
    } else {
      toast.error('Token d\'accès manquant');
      navigate('/');
    }
  }, [token]);

  // Écouter les mises à jour en temps réel
  useEffect(() => {
    if (!token) return;

    const channel = supabase
      .channel('agent-updates')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'agents_management',
          filter: `access_token=eq.${token}`
        },
        (payload) => {
          console.log('Agent mis à jour:', payload);
          setAgent(payload.new as Agent);
          toast.success('Vos informations ont été mises à jour');
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [token]);

  const loadAgentData = async () => {
    try {
      setLoading(true);

      // Charger les données de l'agent via le token
      const { data: agentData, error: agentError } = await supabase
        .from('agents_management')
        .select('*')
        .eq('access_token', token)
        .single();

      if (agentError) throw agentError;
      if (!agentData) {
        toast.error('Agent non trouvé');
        navigate('/');
        return;
      }

      setAgent(agentData as Agent);
      toast.success(`Bienvenue ${agentData.name}!`);
    } catch (error) {
      console.error('Erreur chargement agent:', error);
      toast.error('Erreur lors du chargement des données');
      navigate('/');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Chargement de votre interface...</p>
        </div>
      </div>
    );
  }

  if (!agent) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-red-50 to-orange-50">
        <Card className="max-w-md">
          <CardContent className="pt-6 text-center">
            <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
            <h2 className="text-xl font-bold mb-2">Accès non autorisé</h2>
            <p className="text-muted-foreground">Token d'accès invalide ou expiré</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50">
      {/* Header */}
      <header className="bg-white/90 backdrop-blur-sm border-b border-gray-200 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-3 mb-1">
                <div className="p-2 bg-blue-600 rounded-lg">
                  <Shield className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h1 className="text-2xl font-bold text-gray-900">Interface Agent</h1>
                  <p className="text-sm text-gray-600">224Solutions - Dashboard Agent</p>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Badge variant={agent.is_active ? "default" : "secondary"} className="text-sm">
                {agent.is_active ? '✅ Actif' : '⏸️ Inactif'}
              </Badge>
              <UserIdDisplay layout="horizontal" showBadge={true} />
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 py-8">
        <div className="space-y-6">
          {/* Informations de l'agent */}
          <Card className="border-2 border-blue-200 shadow-lg">
            <CardHeader className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white">
              <CardTitle className="text-xl flex items-center gap-2">
                <UserCheck className="w-6 h-6" />
                Informations de l'Agent
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-6 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">Nom complet</p>
                  <p className="text-lg font-semibold">{agent.name}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">Code Agent</p>
                  <p className="text-lg font-mono font-semibold text-blue-600">{agent.agent_code}</p>
                </div>
                <div className="space-y-1 flex items-center gap-2">
                  <Mail className="w-4 h-4 text-gray-500" />
                  <div>
                    <p className="text-sm text-muted-foreground">Email</p>
                    <p className="text-base">{agent.email}</p>
                  </div>
                </div>
                {agent.phone && (
                  <div className="space-y-1 flex items-center gap-2">
                    <Phone className="w-4 h-4 text-gray-500" />
                    <div>
                      <p className="text-sm text-muted-foreground">Téléphone</p>
                      <p className="text-base">{agent.phone}</p>
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Statistiques */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">Taux de Commission</CardTitle>
                <TrendingUp className="w-4 h-4 text-blue-500" />
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-blue-600">{agent.commission_rate}%</div>
                <p className="text-xs text-muted-foreground mt-1">Taux appliqué</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">Utilisateurs Créés</CardTitle>
                <Users className="w-4 h-4 text-green-500" />
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-green-600">{agent.total_users_created || 0}</div>
                <p className="text-xs text-muted-foreground mt-1">Total créés</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">Commissions Gagnées</CardTitle>
                <DollarSign className="w-4 h-4 text-purple-500" />
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-purple-600">
                  {(agent.total_commissions_earned || 0).toLocaleString()} GNF
                </div>
                <p className="text-xs text-muted-foreground mt-1">Total gagné</p>
              </CardContent>
            </Card>
          </div>

          {/* Actions Rapides */}
          <Card className="border-2 border-green-200 shadow-lg">
            <CardHeader className="bg-gradient-to-r from-green-600 to-teal-600 text-white">
              <CardTitle className="text-xl">Actions Rapides</CardTitle>
            </CardHeader>
            <CardContent className="pt-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Bouton Créer Utilisateur */}
                {agent.permissions.includes('create_users') && (
                  <CreateUserForm 
                    agentId={agent.id} 
                    agentCode={agent.agent_code}
                  />
                )}

                {/* Bouton Créer Sous-Agent */}
                {(agent.can_create_sub_agent || agent.permissions.includes('create_sub_agents')) && (
                  <CreateSubAgentForm 
                    parentAgentId={agent.id}
                    pdgId={agent.pdg_id}
                  />
                )}
              </div>
            </CardContent>
          </Card>

          {/* Permissions */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="w-5 h-5 text-blue-600" />
                Permissions et Accès
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {agent.permissions.map((permission) => (
                  <div key={permission} className="flex items-center gap-2 p-3 bg-blue-50 rounded-lg border border-blue-200">
                    <div className="w-2 h-2 bg-blue-600 rounded-full"></div>
                    <span className="text-sm font-medium text-blue-900">
                      {permission === 'create_users' && '✅ Créer des utilisateurs'}
                      {permission === 'view_reports' && '📊 Voir les rapports'}
                      {permission === 'manage_commissions' && '💰 Gérer les commissions'}
                      {permission === 'create_sub_agents' && '👥 Créer des sous-agents'}
                      {permission === 'manage_users' && '👤 Gérer les utilisateurs'}
                      {permission === 'manage_products' && '📦 Gérer les produits'}
                    </span>
                  </div>
                ))}
                {agent.can_create_sub_agent && (
                  <div className="flex items-center gap-2 p-3 bg-green-50 rounded-lg border border-green-200">
                    <div className="w-2 h-2 bg-green-600 rounded-full"></div>
                    <span className="text-sm font-medium text-green-900">👥 Peut créer des sous-agents</span>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Informations système */}
          <Card className="bg-gray-50 border-gray-200">
            <CardHeader>
              <CardTitle className="text-sm">Informations Système</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-xs text-muted-foreground">
              <p>🆔 ID Agent: <span className="font-mono">{agent.id}</span></p>
              <p>📅 Créé le: {new Date(agent.created_at).toLocaleDateString('fr-FR')}</p>
              <p>🔐 Accès sécurisé via token unique</p>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}
