/**
 * INTERFACE AGENT PUBLIQUE - 224SOLUTIONS
 * Accessible via token d'accès unique (sans authentification)
 */

import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { UserCheck, Users, TrendingUp, DollarSign, Mail, Phone, Shield, AlertCircle, BarChart3, Package, UserCog, Plus, Edit, Copy, Check, ExternalLink, Wallet } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { z } from 'zod';

// Schéma de validation pour le sous-agent
const subAgentSchema = z.object({
  name: z.string()
    .trim()
    .min(2, { message: "Le nom doit contenir au moins 2 caractères" })
    .max(100, { message: "Le nom ne peut pas dépasser 100 caractères" }),
  email: z.string()
    .trim()
    .email({ message: "Email invalide" })
    .max(255, { message: "L'email ne peut pas dépasser 255 caractères" }),
  phone: z.string()
    .trim()
    .min(8, { message: "Le téléphone doit contenir au moins 8 chiffres" })
    .max(15, { message: "Le téléphone ne peut pas dépasser 15 chiffres" })
    .regex(/^[0-9]+$/, { message: "Le téléphone ne doit contenir que des chiffres" }),
  commission_rate: z.number()
    .min(0, { message: "Le taux de commission doit être positif" })
    .max(100, { message: "Le taux de commission ne peut pas dépasser 100%" })
});
import { UserIdDisplay } from '@/components/UserIdDisplay';
import { WalletBalanceDisplay } from '@/components/wallet/WalletBalanceDisplay';
import { AgentIdDisplay } from '@/components/agent/AgentIdDisplay';
import { AgentWalletDisplay } from '@/components/agent/AgentWalletDisplay';
import { CreateUserForm } from '@/components/agent/CreateUserForm';
import AgentSubAgentsManagement from '@/components/agent/AgentSubAgentsManagement';
import { ManageUsersSection } from '@/components/agent/ManageUsersSection';
import ManageProductsSection from '@/components/agent/ManageProductsSection';
import { ViewReportsSection } from '@/components/agent/ViewReportsSection';
import { ManageCommissionsSection } from '@/components/agent/ManageCommissionsSection';
import UniversalWalletDashboard from '@/components/wallet/UniversalWalletDashboard';

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
  total_sub_agents?: number;
  can_create_sub_agent?: boolean;
  created_at: string;
  access_token?: string;
}

interface SubAgent extends Agent {
  parent_agent_id: string;
}

export default function AgentDashboardPublic() {
  const { token } = useParams();
  const navigate = useNavigate();
  const [agent, setAgent] = useState<Agent | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');
  const [isSubAgentDialogOpen, setIsSubAgentDialogOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [subAgents, setSubAgents] = useState<SubAgent[]>([]);
  const [loadingSubAgents, setLoadingSubAgents] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [pdgUserId, setPdgUserId] = useState<string | null>(null);
  const [subAgentFormData, setSubAgentFormData] = useState({
    name: '',
    email: '',
    phone: '',
    commission_rate: 5,
    permissions: {
      create_users: true,
      view_reports: false,
      manage_commissions: false,
      manage_users: false,
      manage_products: false,
      create_sub_agents: false
    }
  });

  useEffect(() => {
    if (token) {
      loadAgentData();
    } else {
      toast.error('Token d\'accès manquant');
      navigate('/');
    }
  }, [token]);

  useEffect(() => {
    if (agent && activeTab === 'users') {
      loadSubAgents();
    }
  }, [agent?.id, activeTab]);

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

  const handleCreateSubAgent = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!agent) {
      toast.error('Agent non trouvé');
      console.error('Agent manquant:', agent);
      return;
    }

    console.log('🔍 Données agent:', {
      id: agent.id,
      pdg_id: agent.pdg_id,
      agent_code: agent.agent_code,
      token: token
    });

    const validationResult = subAgentSchema.safeParse({
      name: subAgentFormData.name,
      email: subAgentFormData.email,
      phone: subAgentFormData.phone,
      commission_rate: subAgentFormData.commission_rate
    });

    if (!validationResult.success) {
      toast.error(validationResult.error.issues[0].message);
      return;
    }

    try {
      setIsSubmitting(true);
      
      const permissions = Object.entries(subAgentFormData.permissions)
        .filter(([_, value]) => value)
        .map(([key]) => key);

      const agentCode = `SAG-${Date.now().toString(36).toUpperCase()}`;

      const requestBody = {
        pdg_id: agent.pdg_id,
        parent_agent_id: agent.id,
        agent_code: agentCode,
        name: subAgentFormData.name.trim(),
        email: subAgentFormData.email.trim().toLowerCase(),
        phone: subAgentFormData.phone.trim(),
        permissions,
        commission_rate: subAgentFormData.commission_rate,
        access_token: token, // Envoyer le token pour l'authentification
      };

      console.log('📤 Envoi requête création sous-agent:', requestBody);

      const { data, error } = await supabase.functions.invoke('create-sub-agent', {
        body: requestBody
      });

      console.log('📥 Réponse fonction edge:', { data, error });

      if (error) {
        console.error('❌ Erreur edge function:', error);
        throw error;
      }
      if (data?.error) {
        console.error('❌ Erreur dans data:', data.error);
        throw new Error(data.error);
      }

      toast.success('Sous-agent créé avec succès');
      setIsSubAgentDialogOpen(false);
      setSubAgentFormData({
        name: '',
        email: '',
        phone: '',
        commission_rate: 5,
        permissions: {
          create_users: true,
          view_reports: false,
          manage_commissions: false,
          manage_users: false,
          manage_products: false,
          create_sub_agents: false
        }
      });
      await loadAgentData();
      await loadSubAgents();
    } catch (error: any) {
      console.error('❌ Erreur création sous-agent:', error);
      toast.error(error.message || 'Erreur lors de la création');
    } finally {
      setIsSubmitting(false);
    }
  };

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

      // Compter les utilisateurs créés par cet agent
      const { count: usersCount, error: usersError } = await supabase
        .from('agent_created_users')
        .select('*', { count: 'exact', head: true })
        .eq('agent_id', agentData.id);

      // Créer un nouvel objet agent avec les statistiques
      const enrichedAgent = {
        ...agentData,
        total_users_created: usersCount || 0
      };

      setAgent(enrichedAgent as Agent);
      
      // Utiliser l'ID de l'agent pour le wallet (chaque agent a son propre wallet)
      setPdgUserId(agentData.id);
      
      toast.success(`Bienvenue ${agentData.name}! ${usersCount || 0} utilisateurs créés`);
    } catch (error) {
      console.error('Erreur chargement agent:', error);
      toast.error('Erreur lors du chargement des données');
      navigate('/');
    } finally {
      setLoading(false);
    }
  };

  const loadSubAgents = async () => {
    if (!agent) return;
    
    try {
      setLoadingSubAgents(true);
      const { data, error } = await supabase
        .from('agents_management')
        .select('*')
        .eq('parent_agent_id', agent.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      // Compter les utilisateurs créés par chaque sous-agent
      const subAgentsWithCounts = await Promise.all(
        (data || []).map(async (subAgent) => {
          const { count } = await supabase
            .from('agent_created_users')
            .select('*', { count: 'exact', head: true })
            .eq('agent_id', subAgent.id);
          
          return {
            ...subAgent,
            total_users_created: count || 0
          };
        })
      );
      
      setSubAgents(subAgentsWithCounts as SubAgent[]);
    } catch (error) {
      console.error('Erreur chargement sous-agents:', error);
      toast.error('Erreur lors du chargement des sous-agents');
    } finally {
      setLoadingSubAgents(false);
    }
  };

  const copySubAgentLink = async (subAgent: SubAgent) => {
    if (!subAgent.access_token) {
      toast.error('Token d\'accès non disponible');
      return;
    }

    const link = `${window.location.origin}/agent/${subAgent.access_token}`;
    
    try {
      await navigator.clipboard.writeText(link);
      setCopiedId(subAgent.id);
      toast.success('Lien copié! Envoyez-le au sous-agent');
      
      setTimeout(() => {
        setCopiedId(null);
      }, 3000);
    } catch (error) {
      console.error('Erreur copie:', error);
      toast.error('Erreur lors de la copie du lien');
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
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2 bg-blue-600 rounded-lg">
                  <Shield className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h1 className="text-2xl font-bold text-gray-900">Interface Agent</h1>
                  <p className="text-sm text-gray-600">224Solutions - Dashboard Agent</p>
                </div>
              </div>
              <div className="flex items-center gap-3 flex-wrap">
                <AgentIdDisplay agentCode={agent.agent_code} />
                <AgentWalletDisplay agentId={agent.id} agentCode={agent.agent_code} compact={true} className="max-w-xs" />
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Badge variant={agent.is_active ? "default" : "secondary"} className="text-sm">
                {agent.is_active ? '✅ Actif' : '⏸️ Inactif'}
              </Badge>
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

            <Card 
              className="hover:shadow-lg transition-all cursor-pointer border-2 hover:border-green-500/50"
              onClick={() => {
                setActiveTab('users');
                toast.success('Navigation vers la liste des utilisateurs créés');
              }}
            >
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">Utilisateurs Créés</CardTitle>
                <Users className="w-4 h-4 text-green-500" />
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-green-600">{agent.total_users_created || 0}</div>
                <p className="text-xs text-muted-foreground mt-1">
                  Cliquez pour voir la liste
                </p>
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

          {/* Tabs pour les différentes sections */}
          <Tabs value={activeTab} onValueChange={setActiveTab} defaultValue="overview" className="space-y-6">
            <TabsList className="grid w-full grid-cols-2 lg:grid-cols-7">
              <TabsTrigger value="overview">Aperçu</TabsTrigger>
               <TabsTrigger value="wallet">
                <Wallet className="w-4 h-4 mr-2" />
                Wallet
              </TabsTrigger>
              <TabsTrigger value="users">
                <Users className="w-4 h-4 mr-2" />
                Utilisateurs
              </TabsTrigger>
              {agent.permissions.includes('manage_products') && (
                <TabsTrigger value="products">
                  <Package className="w-4 h-4 mr-2" />
                  Produits
                </TabsTrigger>
              )}
              {agent.permissions.includes('view_reports') && (
                <TabsTrigger value="reports">
                  <BarChart3 className="w-4 h-4 mr-2" />
                  Rapports
                </TabsTrigger>
              )}
              {agent.permissions.includes('manage_commissions') && (
                <TabsTrigger value="commissions">
                  <DollarSign className="w-4 h-4 mr-2" />
                  Commissions
                </TabsTrigger>
              )}
            </TabsList>

            <TabsContent value="overview" className="space-y-6">
              {/* Actions Rapides */}
              <Card className="border-2 border-green-200 shadow-lg">
                <CardHeader className="bg-gradient-to-r from-green-600 to-teal-600 text-white">
                  <CardTitle className="text-xl">Actions Rapides</CardTitle>
                </CardHeader>
                <CardContent className="pt-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {agent.permissions.includes('create_users') && (
                       <div>
                        <CreateUserForm 
                          agentId={agent.id} 
                          agentCode={agent.agent_code}
                          accessToken={token}
                          onUserCreated={() => {
                            loadAgentData();
                          }}
                        />
                      </div>
                    )}

                    {(agent.can_create_sub_agent || agent.permissions.includes('create_sub_agents')) && (
                      <Dialog open={isSubAgentDialogOpen} onOpenChange={setIsSubAgentDialogOpen}>
                        <DialogTrigger asChild>
                          <Button className="w-full h-20" variant="outline">
                            <Plus className="w-6 h-6 mr-2" />
                            Créer un Sous-Agent
                          </Button>
                        </DialogTrigger>
                        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
                          <DialogHeader>
                            <DialogTitle>Créer un Sous-Agent</DialogTitle>
                          </DialogHeader>
                          <form onSubmit={handleCreateSubAgent} className="space-y-4">
                            <div className="space-y-2">
                              <Label htmlFor="name">Nom Complet *</Label>
                              <Input
                                id="name"
                                required
                                value={subAgentFormData.name}
                                onChange={(e) => setSubAgentFormData({ ...subAgentFormData, name: e.target.value })}
                                placeholder="Ex: Jean Dupont"
                              />
                            </div>
                            <div className="space-y-2">
                              <Label htmlFor="email">Email *</Label>
                              <Input
                                id="email"
                                type="email"
                                required
                                value={subAgentFormData.email}
                                onChange={(e) => setSubAgentFormData({ ...subAgentFormData, email: e.target.value })}
                                placeholder="agent@exemple.com"
                              />
                            </div>
                            <div className="space-y-2">
                              <Label htmlFor="phone">Téléphone *</Label>
                              <Input
                                id="phone"
                                required
                                value={subAgentFormData.phone}
                                onChange={(e) => setSubAgentFormData({ ...subAgentFormData, phone: e.target.value })}
                                placeholder="622123456"
                              />
                            </div>
                            <div className="space-y-2">
                              <Label htmlFor="commission">Taux Commission (%)</Label>
                              <Input
                                id="commission"
                                type="number"
                                min="0"
                                max="100"
                                value={subAgentFormData.commission_rate}
                                onChange={(e) => setSubAgentFormData({ ...subAgentFormData, commission_rate: Number(e.target.value) })}
                              />
                            </div>
                            <div className="space-y-3 border-t pt-4">
                              <Label className="text-base font-semibold">Permissions</Label>
                              <div className="space-y-3 max-h-60 overflow-y-auto pr-2">
                                <div className="flex items-center space-x-2 p-2 hover:bg-accent rounded">
                                  <Checkbox 
                                    id="create_users"
                                    checked={subAgentFormData.permissions.create_users}
                                    onCheckedChange={(checked) => setSubAgentFormData({
                                      ...subAgentFormData,
                                      permissions: { ...subAgentFormData.permissions, create_users: checked as boolean }
                                    })}
                                  />
                                  <label htmlFor="create_users" className="text-sm font-medium cursor-pointer flex-1">
                                    ✅ Créer des utilisateurs
                                  </label>
                                </div>
                                
                                <div className="flex items-center space-x-2 p-2 hover:bg-accent rounded">
                                  <Checkbox 
                                    id="view_reports"
                                    checked={subAgentFormData.permissions.view_reports}
                                    onCheckedChange={(checked) => setSubAgentFormData({
                                      ...subAgentFormData,
                                      permissions: { ...subAgentFormData.permissions, view_reports: checked as boolean }
                                    })}
                                  />
                                  <label htmlFor="view_reports" className="text-sm font-medium cursor-pointer flex-1">
                                    📊 Voir les rapports
                                  </label>
                                </div>

                                <div className="flex items-center space-x-2 p-2 hover:bg-accent rounded">
                                  <Checkbox 
                                    id="manage_commissions"
                                    checked={subAgentFormData.permissions.manage_commissions}
                                    onCheckedChange={(checked) => setSubAgentFormData({
                                      ...subAgentFormData,
                                      permissions: { ...subAgentFormData.permissions, manage_commissions: checked as boolean }
                                    })}
                                  />
                                  <label htmlFor="manage_commissions" className="text-sm font-medium cursor-pointer flex-1">
                                    💰 Gérer les commissions
                                  </label>
                                </div>

                                <div className="flex items-center space-x-2 p-2 hover:bg-accent rounded">
                                  <Checkbox 
                                    id="manage_users"
                                    checked={subAgentFormData.permissions.manage_users}
                                    onCheckedChange={(checked) => setSubAgentFormData({
                                      ...subAgentFormData,
                                      permissions: { ...subAgentFormData.permissions, manage_users: checked as boolean }
                                    })}
                                  />
                                  <label htmlFor="manage_users" className="text-sm font-medium cursor-pointer flex-1">
                                    👤 Gérer les utilisateurs
                                  </label>
                                </div>

                                <div className="flex items-center space-x-2 p-2 hover:bg-accent rounded">
                                  <Checkbox 
                                    id="manage_products"
                                    checked={subAgentFormData.permissions.manage_products}
                                    onCheckedChange={(checked) => setSubAgentFormData({
                                      ...subAgentFormData,
                                      permissions: { ...subAgentFormData.permissions, manage_products: checked as boolean }
                                    })}
                                  />
                                  <label htmlFor="manage_products" className="text-sm font-medium cursor-pointer flex-1">
                                    📦 Gérer les produits
                                  </label>
                                </div>

                                <div className="flex items-center space-x-2 p-2 hover:bg-accent rounded">
                                  <Checkbox 
                                    id="create_sub_agents"
                                    checked={subAgentFormData.permissions.create_sub_agents}
                                    onCheckedChange={(checked) => setSubAgentFormData({
                                      ...subAgentFormData,
                                      permissions: { ...subAgentFormData.permissions, create_sub_agents: checked as boolean }
                                    })}
                                  />
                                  <label htmlFor="create_sub_agents" className="text-sm font-medium cursor-pointer flex-1">
                                    👥 Créer des sous-agents
                                  </label>
                                </div>
                              </div>
                              <p className="text-xs text-muted-foreground mt-2">
                                Sélectionnez les permissions que vous souhaitez accorder au sous-agent
                              </p>
                            </div>
                            <div className="flex justify-end gap-2 pt-4">
                              <Button 
                                type="button" 
                                variant="outline" 
                                onClick={() => setIsSubAgentDialogOpen(false)}
                                disabled={isSubmitting}
                              >
                                Annuler
                              </Button>
                              <Button type="submit" disabled={isSubmitting}>
                                {isSubmitting ? 'Création...' : 'Créer'}
                              </Button>
                            </div>
                          </form>
                        </DialogContent>
                      </Dialog>
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
                    {agent.permissions.map((permission) => {
                      const permissionConfig: Record<string, { 
                        label: string; 
                        description: string;
                        tabValue: string;
                        available: boolean;
                      }> = {
                        'create_users': { 
                          label: '✅ Créer des utilisateurs', 
                          description: 'Accès au formulaire de création',
                          tabValue: 'overview',
                          available: true
                        },
                        'view_reports': { 
                          label: '📊 Voir les rapports', 
                          description: 'Consultez vos statistiques',
                          tabValue: 'reports',
                          available: agent.permissions.includes('view_reports')
                        },
                        'manage_commissions': { 
                          label: '💰 Gérer les commissions', 
                          description: 'Gérez vos gains',
                          tabValue: 'commissions',
                          available: agent.permissions.includes('manage_commissions')
                        },
                        'create_sub_agents': { 
                          label: '👥 Créer des sous-agents', 
                          description: 'Créer des agents secondaires',
                          tabValue: 'overview',
                          available: true
                        },
                        'manage_users': { 
                          label: '👤 Gérer les utilisateurs', 
                          description: 'Administrez les utilisateurs',
                          tabValue: 'users',
                          available: agent.permissions.includes('manage_users')
                        },
                        'manage_products': { 
                          label: '📦 Gérer les produits', 
                          description: 'Gérez le catalogue',
                          tabValue: 'products',
                          available: agent.permissions.includes('manage_products')
                        }
                      };

                      const config = permissionConfig[permission];
                      if (!config) return null;

                      const handleClick = () => {
                        if (!config.available) {
                          toast.error('Cette fonctionnalité n\'est pas disponible pour vous');
                          return;
                        }
                        setActiveTab(config.tabValue);
                        toast.success(`Navigation vers ${config.label}`);
                      };

                      return (
                        <button
                          key={permission}
                          onClick={handleClick}
                          className="flex flex-col gap-1 p-3 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-lg border-2 border-blue-200 hover:border-blue-400 hover:shadow-md transition-all shadow-sm cursor-pointer text-left"
                        >
                          <div className="flex items-center gap-2">
                            <div className="w-2 h-2 bg-blue-600 rounded-full animate-pulse"></div>
                            <span className="text-sm font-semibold text-blue-900">
                              {config.label}
                            </span>
                          </div>
                          <span className="text-xs text-blue-600 ml-4">
                            {config.description}
                          </span>
                        </button>
                      );
                    })}
                    {agent.can_create_sub_agent && (
                      <button
                        onClick={() => {
                          setActiveTab('overview');
                          toast.success('Navigation vers création de sous-agents');
                        }}
                        className="flex flex-col gap-1 p-3 bg-gradient-to-br from-green-50 to-emerald-50 rounded-lg border-2 border-green-200 hover:border-green-400 hover:shadow-md transition-all shadow-sm cursor-pointer text-left"
                      >
                        <div className="flex items-center gap-2">
                          <div className="w-2 h-2 bg-green-600 rounded-full animate-pulse"></div>
                          <span className="text-sm font-semibold text-green-900">🌟 Peut créer des sous-agents</span>
                        </div>
                        <span className="text-xs text-green-600 ml-4">
                          Créez et gérez votre réseau
                        </span>
                      </button>
                    )}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Onglet Wallet */}
            <TabsContent value="wallet">
              <UniversalWalletDashboard 
                userId={pdgUserId || agent.id} 
                userCode={agent.agent_code}
                showTransactions={true}
              />
            </TabsContent>

            {/* Onglet Utilisateurs Créés - Accessible à tous les agents */}
            <TabsContent value="users" className="space-y-6">
              {/* Section Sous-Agents */}
              {(agent.can_create_sub_agent || agent.permissions.includes('create_sub_agents')) && (
                <Card className="border-2 border-purple-200">
                  <CardHeader className="bg-gradient-to-r from-purple-600 to-pink-600 text-white">
                    <CardTitle className="flex items-center gap-2">
                      <UserCog className="w-6 h-6" />
                      Mes Sous-Agents ({subAgents.length})
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="pt-6">
                    {loadingSubAgents ? (
                      <div className="text-center py-8">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
                        <p className="text-sm text-muted-foreground mt-2">Chargement des sous-agents...</p>
                      </div>
                    ) : subAgents.length === 0 ? (
                      <div className="text-center py-12">
                        <UserCog className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                        <p className="text-muted-foreground mb-4">Aucun sous-agent créé</p>
                        <Button onClick={() => {
                          setActiveTab('overview');
                          setIsSubAgentDialogOpen(true);
                        }}>
                          <Plus className="w-4 h-4 mr-2" />
                          Créer votre premier sous-agent
                        </Button>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        {subAgents.map((subAgent) => (
                          <Card key={subAgent.id} className="border-2 hover:border-purple-300 transition-all">
                            <CardContent className="pt-6">
                              <div className="flex items-start justify-between gap-4">
                                <div className="flex-1 space-y-3">
                                  <div className="flex items-center gap-3">
                                    <div className="p-2 bg-purple-100 rounded-lg">
                                      <UserCog className="w-5 h-5 text-purple-600" />
                                    </div>
                                    <div>
                                      <h3 className="font-semibold text-lg">{subAgent.name}</h3>
                                      <p className="text-sm text-muted-foreground">{subAgent.agent_code}</p>
                                    </div>
                                    <Badge variant={subAgent.is_active ? "default" : "secondary"}>
                                      {subAgent.is_active ? 'Actif' : 'Inactif'}
                                    </Badge>
                                  </div>

                                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                                    <div className="flex items-center gap-2">
                                      <Mail className="w-4 h-4 text-gray-400" />
                                      <span>{subAgent.email}</span>
                                    </div>
                                    {subAgent.phone && (
                                      <div className="flex items-center gap-2">
                                        <Phone className="w-4 h-4 text-gray-400" />
                                        <span>{subAgent.phone}</span>
                                      </div>
                                    )}
                                    <div className="flex items-center gap-2">
                                      <TrendingUp className="w-4 h-4 text-gray-400" />
                                      <span>Commission: {subAgent.commission_rate}%</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                      <Users className="w-4 h-4 text-gray-400" />
                                      <span>{subAgent.total_users_created || 0} utilisateurs</span>
                                    </div>
                                  </div>

                                  {subAgent.permissions && subAgent.permissions.length > 0 && (
                                    <div className="flex flex-wrap gap-2">
                                      {subAgent.permissions.map((perm) => (
                                        <Badge key={perm} variant="outline" className="text-xs">
                                          {perm.replace(/_/g, ' ')}
                                        </Badge>
                                      ))}
                                    </div>
                                  )}

                                  {/* Lien d'accès copiable */}
                                  <div className="bg-gradient-to-br from-blue-50 to-indigo-50 p-4 rounded-lg border-2 border-blue-200">
                                    <div className="flex items-center justify-between gap-2">
                                      <div className="flex-1 min-w-0">
                                        <p className="text-xs font-semibold text-blue-900 mb-1">
                                          🔗 Lien d'accès pour le sous-agent
                                        </p>
                                        <p className="text-xs text-blue-600 truncate font-mono">
                                          {window.location.origin}/agent/{subAgent.access_token || '...'}
                                        </p>
                                      </div>
                                      <Button
                                        size="sm"
                                        onClick={() => copySubAgentLink(subAgent)}
                                        className="flex-shrink-0"
                                        variant={copiedId === subAgent.id ? "default" : "outline"}
                                      >
                                        {copiedId === subAgent.id ? (
                                          <>
                                            <Check className="w-4 h-4 mr-1" />
                                            Copié!
                                          </>
                                        ) : (
                                          <>
                                            <Copy className="w-4 h-4 mr-1" />
                                            Copier
                                          </>
                                        )}
                                      </Button>
                                    </div>
                                    <p className="text-xs text-blue-500 mt-2">
                                      💡 Copiez et envoyez ce lien au sous-agent pour qu'il accède à son interface
                                    </p>
                                  </div>
                                </div>
                              </div>
                            </CardContent>
                          </Card>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}

              {/* Section Utilisateurs Créés */}
              <ManageUsersSection key={activeTab} agentId={agent.id} />
            </TabsContent>

            {agent.permissions.includes('manage_products') && (
              <TabsContent value="products">
                <ManageProductsSection agentId={agent.id} />
              </TabsContent>
            )}

            {agent.permissions.includes('view_reports') && (
              <TabsContent value="reports">
                <ViewReportsSection 
                  agentId={agent.id}
                  agentData={{
                    total_users_created: agent.total_users_created,
                    total_commissions_earned: agent.total_commissions_earned,
                    commission_rate: agent.commission_rate
                  }}
                />
              </TabsContent>
            )}

            {agent.permissions.includes('manage_commissions') && (
              <TabsContent value="commissions">
                <ManageCommissionsSection 
                  agentId={agent.id}
                  totalCommissions={agent.total_commissions_earned || 0}
                  commissionRate={agent.commission_rate}
                />
              </TabsContent>
            )}
          </Tabs>

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
