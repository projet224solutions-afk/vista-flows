import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Checkbox } from '@/components/ui/checkbox';
import { UserCheck, Search, Ban, Trash2, Plus, Mail, Edit, Users, TrendingUp, Activity, ExternalLink, Copy, Eye, UserCog, Shield } from 'lucide-react';
import { toast } from 'sonner';
import { usePDGAgentsData, type Agent } from '@/hooks/usePDGAgentsData';
import { usePDGActions } from '@/hooks/usePDGActions';
import { supabase } from '@/integrations/supabase/client';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { AgentPermissionsDialog } from './AgentPermissionsDialog';

interface AgentUser {
  id: string;
  email: string;
  first_name?: string;
  last_name?: string;
  phone?: string;
  role: string;
  created_at: string;
  is_active?: boolean;
  country?: string;
  city?: string;
  public_id?: string;
  user_role: string;
}

interface SubAgent {
  id: string;
  name: string;
  email: string;
  phone?: string;
  agent_code: string;
  commission_rate: number;
  is_active: boolean;
  permissions: string[];
  access_token?: string;
  total_users_created?: number;
  created_at: string;
}

export default function PDGAgentsManagement() {
  const { agents, pdgProfile, loading, stats, refetch } = usePDGAgentsData();
  const { 
    createAgent: createAgentAction, 
    updateAgent: updateAgentAction, 
    deleteAgent: deleteAgentAction, 
    toggleAgentStatus 
  } = usePDGActions({
    onAgentCreated: refetch,
    onAgentUpdated: refetch,
    onAgentDeleted: refetch,
  });
  
  const [searchTerm, setSearchTerm] = useState('');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editingAgent, setEditingAgent] = useState<Agent | null>(null);
  const [expandedAgents, setExpandedAgents] = useState<Set<string>>(new Set());
  const [expandedSubAgents, setExpandedSubAgents] = useState<Set<string>>(new Set());
  const [agentUsersMap, setAgentUsersMap] = useState<Record<string, AgentUser[]>>({});
  const [agentSubAgentsMap, setAgentSubAgentsMap] = useState<Record<string, SubAgent[]>>({});
  const [loadingUsersMap, setLoadingUsersMap] = useState<Record<string, boolean>>({});
  const [loadingSubAgentsMap, setLoadingSubAgentsMap] = useState<Record<string, boolean>>({});
  const [permissionsDialogAgent, setPermissionsDialogAgent] = useState<Agent | null>(null);
  const [isPermissionsDialogOpen, setIsPermissionsDialogOpen] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    password: '',
    commission_rate: 10,
    permissions: {
      create_users: true,
      create_sub_agents: false,
      view_reports: true,
      manage_commissions: false,
      manage_users: false,
      manage_products: false
    }
  });

  const handleCreateAgent = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!pdgProfile) {
      toast.error('PDG ID manquant');
      return;
    }

    if (!formData.name || !formData.email || !formData.phone) {
      toast.error('Veuillez remplir tous les champs obligatoires');
      return;
    }

    if (!editingAgent && (!formData.password || formData.password.length < 8)) {
      toast.error('Le mot de passe doit contenir au moins 8 caractères');
      return;
    }

    try {
      setIsSubmitting(true);
      
      const permissions = Object.entries(formData.permissions)
        .filter(([_, value]) => value)
        .map(([key]) => key);

      if (editingAgent) {
        // Mode édition
        await updateAgentAction(editingAgent.id, {
          name: formData.name,
          email: formData.email,
          phone: formData.phone,
          permissions,
          commission_rate: formData.commission_rate,
          can_create_sub_agent: formData.permissions.create_sub_agents,
        });
      } else {
        // Mode création
        await createAgentAction({
          name: formData.name,
          email: formData.email,
          phone: formData.phone,
          password: formData.password,
          permissions,
          commission_rate: formData.commission_rate,
          can_create_sub_agent: formData.permissions.create_sub_agents,
        }, pdgProfile.id);
      }

      // Réinitialiser le formulaire
      setFormData({
        name: '',
        email: '',
        phone: '',
        password: '',
        commission_rate: 10,
        permissions: {
          create_users: true,
          create_sub_agents: false,
          view_reports: true,
          manage_commissions: false,
          manage_users: false,
          manage_products: false
        }
      });
      
      setEditingAgent(null);
      setIsDialogOpen(false);
    } catch (error) {
      console.error('Erreur gestion agent:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEditAgent = (agent: Agent) => {
    setEditingAgent(agent);
    setFormData({
      name: agent.name,
      email: agent.email,
      phone: agent.phone || '',
      password: '',
      commission_rate: agent.commission_rate,
      permissions: {
        create_users: agent.permissions.includes('create_users'),
        create_sub_agents: agent.can_create_sub_agent,
        view_reports: agent.permissions.includes('view_reports'),
        manage_commissions: agent.permissions.includes('manage_commissions'),
        manage_users: agent.permissions.includes('manage_users'),
        manage_products: agent.permissions.includes('manage_products')
      }
    });
    setIsDialogOpen(true);
  };

  const handleManagePermissions = (agent: Agent) => {
    setPermissionsDialogAgent(agent);
    setIsPermissionsDialogOpen(true);
  };

  const handleAgentAction = async (agentId: string, action: 'activate' | 'suspend' | 'delete') => {
    try {
      let confirmMessage = '';
      let actionName = '';
      
      switch (action) {
        case 'activate':
          confirmMessage = 'Êtes-vous sûr de vouloir activer cet agent ?';
          actionName = 'Activation';
          break;
        case 'suspend':
          confirmMessage = 'Êtes-vous sûr de vouloir suspendre cet agent ?';
          actionName = 'Suspension';
          break;
        case 'delete':
          confirmMessage = 'Êtes-vous sûr de vouloir supprimer cet agent ? Cette action est irréversible.';
          actionName = 'Suppression';
          break;
      }

      if (!confirm(confirmMessage)) {
        return;
      }

      switch (action) {
        case 'activate':
          await toggleAgentStatus(agentId, true);
          break;
        case 'suspend':
          await toggleAgentStatus(agentId, false);
          break;
        case 'delete':
          await deleteAgentAction(agentId);
          break;
      }
    } catch (error: any) {
      console.error(`Erreur lors de l'action:`, error);
    }
  };

  const handleToggleAgentUsers = async (agent: Agent) => {
    const isExpanded = expandedAgents.has(agent.id);
    
    if (isExpanded) {
      // Réduire
      const newExpanded = new Set(expandedAgents);
      newExpanded.delete(agent.id);
      setExpandedAgents(newExpanded);
    } else {
      // Étendre et charger les utilisateurs si pas déjà chargés
      const newExpanded = new Set(expandedAgents);
      newExpanded.add(agent.id);
      setExpandedAgents(newExpanded);

      if (!agentUsersMap[agent.id]) {
        setLoadingUsersMap({ ...loadingUsersMap, [agent.id]: true });

        try {
          const { data, error } = await supabase.functions.invoke('get-agent-users', {
            body: { agent_access_token: agent.access_token }
          });

          if (error) throw error;

          if (data?.users) {
            setAgentUsersMap({ ...agentUsersMap, [agent.id]: data.users });
          }
        } catch (error: any) {
          console.error('Erreur chargement utilisateurs:', error);
          toast.error('Erreur lors du chargement des utilisateurs');
        } finally {
          setLoadingUsersMap({ ...loadingUsersMap, [agent.id]: false });
        }
      }
    }
  };

  const handleToggleSubAgents = async (agent: Agent) => {
    const isExpanded = expandedSubAgents.has(agent.id);
    
    if (isExpanded) {
      // Réduire
      const newExpanded = new Set(expandedSubAgents);
      newExpanded.delete(agent.id);
      setExpandedSubAgents(newExpanded);
    } else {
      // Étendre et charger les sous-agents si pas déjà chargés
      const newExpanded = new Set(expandedSubAgents);
      newExpanded.add(agent.id);
      setExpandedSubAgents(newExpanded);

      if (!agentSubAgentsMap[agent.id]) {
        setLoadingSubAgentsMap({ ...loadingSubAgentsMap, [agent.id]: true });

        try {
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
              } as SubAgent;
            })
          );

          setAgentSubAgentsMap({ ...agentSubAgentsMap, [agent.id]: subAgentsWithCounts });
        } catch (error: any) {
          console.error('Erreur chargement sous-agents:', error);
          toast.error('Erreur lors du chargement des sous-agents');
        } finally {
          setLoadingSubAgentsMap({ ...loadingSubAgentsMap, [agent.id]: false });
        }
      }
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Chargement des agents...</p>
        </div>
      </div>
    );
  }

  const filteredAgents = agents.filter(agent =>
    agent.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    agent.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* En-tête */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Gestion des Agents</h2>
          <p className="text-muted-foreground mt-1">
            Gérez votre réseau d'agents - {pdgProfile?.name || 'PDG'}
          </p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => {
              setEditingAgent(null);
              setFormData({
                name: '',
                email: '',
                phone: '',
                password: '',
                commission_rate: 10,
                permissions: {
                  create_users: true,
                  create_sub_agents: false,
                  view_reports: true,
                  manage_commissions: false,
                  manage_users: false,
                  manage_products: false
                }
              });
            }}>
              <Plus className="w-4 h-4 mr-2" />
              Nouvel Agent
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>
                {editingAgent ? 'Modifier l\'Agent' : 'Créer un Nouvel Agent'}
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={handleCreateAgent} className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Nom Complet *</Label>
                  <Input
                    id="name"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="Ex: Jean Dupont"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phone">Téléphone *</Label>
                  <Input
                    id="phone"
                    required
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    placeholder="Ex: 622123456"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">Email *</Label>
                <Input
                  id="email"
                  type="email"
                  required
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder="Ex: agent@224solutions.com"
                />
              </div>

              {!editingAgent && (
                <div className="space-y-2">
                  <Label htmlFor="password">Mot de passe * (min. 8 caractères)</Label>
                  <Input
                    id="password"
                    type="password"
                    required
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    placeholder="••••••••"
                  />
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="commission">Taux Commission (%)</Label>
                <Input
                  id="commission"
                  type="number"
                  min="0"
                  max="100"
                  value={formData.commission_rate}
                  onChange={(e) => setFormData({ ...formData, commission_rate: Number(e.target.value) })}
                />
              </div>

              <div className="space-y-3 border-t pt-4">
                <Label>Permissions</Label>
                <div className="space-y-2">
                  <div className="flex items-center space-x-2">
                    <Checkbox 
                      id="create_users"
                      checked={formData.permissions.create_users}
                      onCheckedChange={(checked) => setFormData({
                        ...formData,
                        permissions: { ...formData.permissions, create_users: checked as boolean }
                      })}
                    />
                    <label htmlFor="create_users" className="text-sm">Créer des utilisateurs</label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox 
                      id="create_sub_agents"
                      checked={formData.permissions.create_sub_agents}
                      onCheckedChange={(checked) => setFormData({
                        ...formData,
                        permissions: { ...formData.permissions, create_sub_agents: checked as boolean }
                      })}
                    />
                    <label htmlFor="create_sub_agents" className="text-sm">Créer des sous-agents</label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox 
                      id="view_reports"
                      checked={formData.permissions.view_reports}
                      onCheckedChange={(checked) => setFormData({
                        ...formData,
                        permissions: { ...formData.permissions, view_reports: checked as boolean }
                      })}
                    />
                    <label htmlFor="view_reports" className="text-sm">Voir les rapports</label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox 
                      id="manage_commissions"
                      checked={formData.permissions.manage_commissions}
                      onCheckedChange={(checked) => setFormData({
                        ...formData,
                        permissions: { ...formData.permissions, manage_commissions: checked as boolean }
                      })}
                    />
                    <label htmlFor="manage_commissions" className="text-sm">Gérer les commissions</label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox 
                      id="manage_users"
                      checked={formData.permissions.manage_users}
                      onCheckedChange={(checked) => setFormData({
                        ...formData,
                        permissions: { ...formData.permissions, manage_users: checked as boolean }
                      })}
                    />
                    <label htmlFor="manage_users" className="text-sm">Gérer les utilisateurs</label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox 
                      id="manage_products"
                      checked={formData.permissions.manage_products}
                      onCheckedChange={(checked) => setFormData({
                        ...formData,
                        permissions: { ...formData.permissions, manage_products: checked as boolean }
                      })}
                    />
                    <label htmlFor="manage_products" className="text-sm">Gérer les produits</label>
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-4">
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => setIsDialogOpen(false)}
                  disabled={isSubmitting}
                >
                  Annuler
                </Button>
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting ? (
                    <>
                      <div className="w-4 h-4 mr-2 animate-spin rounded-full border-2 border-white border-t-transparent" />
                      {editingAgent ? 'Modification...' : 'Création...'}
                    </>
                  ) : editingAgent ? (
                    <>
                      <Edit className="w-4 h-4 mr-2" />
                      Modifier l'Agent
                    </>
                  ) : (
                    <>
                      <Plus className="w-4 h-4 mr-2" />
                      Créer l'Agent
                    </>
                  )}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Statistiques */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Agents
            </CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalAgents}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {stats.activeAgents} actifs
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Agents Actifs
            </CardTitle>
            <UserCheck className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{stats.activeAgents}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {stats.inactiveAgents} inactifs
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Commission Moyenne
            </CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.averageCommission.toFixed(1)}%</div>
            <p className="text-xs text-muted-foreground mt-1">
              Taux moyen
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Commissions Totales
            </CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalCommissionsEarned.toLocaleString()} GNF</div>
            <p className="text-xs text-muted-foreground mt-1">
              Gagnées à ce jour
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Barre de recherche */}
      <Card>
        <CardContent className="pt-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
            <Input
              placeholder="Rechercher un agent par nom ou email..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </CardContent>
      </Card>

      {/* Liste des agents */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {filteredAgents.map((agent) => (
          <Card key={agent.id} className="hover:shadow-lg transition-shadow">
            <CardHeader>
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <CardTitle className="text-lg">{agent.name}</CardTitle>
                    <Badge variant={agent.is_active ? 'default' : 'secondary'}>
                      {agent.is_active ? 'Actif' : 'Inactif'}
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">{agent.email}</p>
                  <p className="text-sm text-muted-foreground">{agent.phone}</p>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Code Agent:</span>
                  <span className="font-mono font-medium">{agent.agent_code}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Commission:</span>
                  <span className="font-medium">{agent.commission_rate}%</span>
                </div>
                <div className="border-t pt-3 mt-3">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleToggleAgentUsers(agent)}
                    className="w-full justify-between"
                  >
                    <span className="text-sm font-medium">Utilisateurs créés: {agentUsersMap[agent.id]?.length ?? agent.total_users_created ?? 0}</span>
                    <Eye className={`w-4 h-4 transition-transform ${expandedAgents.has(agent.id) ? 'rotate-180' : ''}`} />
                  </Button>

                  {expandedAgents.has(agent.id) && (
                    <div className="mt-3 space-y-2">
                      {loadingUsersMap[agent.id] ? (
                        <div className="flex items-center justify-center py-4">
                          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary" />
                        </div>
                      ) : agentUsersMap[agent.id]?.length > 0 ? (
                        <div className="space-y-2 max-h-64 overflow-y-auto">
                          {agentUsersMap[agent.id].map((user) => (
                            <div 
                              key={user.id} 
                              className="p-3 bg-muted/50 rounded-lg border text-xs space-y-1"
                            >
                              <div className="flex items-center justify-between">
                                <span className="font-medium">
                                  {user.first_name && user.last_name 
                                    ? `${user.first_name} ${user.last_name}`
                                    : user.email}
                                </span>
                                <Badge variant={user.is_active !== false ? 'default' : 'secondary'} className="text-xs">
                                  {user.is_active !== false ? 'Actif' : 'Inactif'}
                                </Badge>
                              </div>
                              <div className="text-muted-foreground">
                                <div>📧 {user.email}</div>
                                {user.phone && <div>📱 {user.phone}</div>}
                                {(user.city || user.country) && (
                                  <div>📍 {[user.city, user.country].filter(Boolean).join(', ')}</div>
                                )}
                                <div className="flex items-center justify-between mt-1">
                                  <span>Rôle: {user.user_role || user.role}</span>
                                  <span>{new Date(user.created_at).toLocaleDateString('fr-FR')}</span>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="text-center py-4 text-sm text-muted-foreground">
                          Aucun utilisateur créé
                        </div>
                      )}
                    </div>
                  )}
                </div>
                
                {/* Section Sous-Agents */}
                {(agent.can_create_sub_agent || agent.permissions.includes('create_sub_agents')) && (
                  <div className="border-t pt-3 mt-3">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleToggleSubAgents(agent)}
                      className="w-full justify-between"
                    >
                      <span className="text-sm font-medium">
                        Sous-agents créés: {agentSubAgentsMap[agent.id]?.length ?? 0}
                      </span>
                      <Eye className={`w-4 h-4 transition-transform ${expandedSubAgents.has(agent.id) ? 'rotate-180' : ''}`} />
                    </Button>

                    {expandedSubAgents.has(agent.id) && (
                      <div className="mt-3 space-y-2">
                        {loadingSubAgentsMap[agent.id] ? (
                          <div className="flex items-center justify-center py-4">
                            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary" />
                          </div>
                        ) : agentSubAgentsMap[agent.id]?.length > 0 ? (
                          <div className="space-y-2 max-h-64 overflow-y-auto">
                            {agentSubAgentsMap[agent.id].map((subAgent) => (
                              <div 
                                key={subAgent.id} 
                                className="p-3 bg-purple-50 dark:bg-purple-950/20 rounded-lg border border-purple-200 dark:border-purple-800 text-xs space-y-1"
                              >
                                <div className="flex items-center justify-between">
                                  <span className="font-medium flex items-center gap-2">
                                    <UserCog className="w-3.5 h-3.5 text-purple-600" />
                                    {subAgent.name}
                                  </span>
                                  <Badge variant={subAgent.is_active ? 'default' : 'secondary'} className="text-xs">
                                    {subAgent.is_active ? 'Actif' : 'Inactif'}
                                  </Badge>
                                </div>
                                <div className="text-muted-foreground">
                                  <div>📧 {subAgent.email}</div>
                                  {subAgent.phone && <div>📱 {subAgent.phone}</div>}
                                  <div className="flex items-center justify-between mt-1">
                                    <span>Code: {subAgent.agent_code}</span>
                                    <span>Commission: {subAgent.commission_rate}%</span>
                                  </div>
                                  <div className="flex items-center justify-between mt-1">
                                    <span>Utilisateurs: {subAgent.total_users_created || 0}</span>
                                    <span>{new Date(subAgent.created_at).toLocaleDateString('fr-FR')}</span>
                                  </div>
                                </div>
                                {subAgent.permissions && subAgent.permissions.length > 0 && (
                                  <div className="flex flex-wrap gap-1 mt-2">
                                    {subAgent.permissions.map((perm) => (
                                      <Badge key={perm} variant="outline" className="text-xs">
                                        {perm.replace(/_/g, ' ')}
                                      </Badge>
                                    ))}
                                  </div>
                                )}
                                {subAgent.access_token && (
                                  <div className="mt-2 p-2 bg-blue-50 dark:bg-blue-950/20 rounded border border-blue-200 dark:border-blue-800">
                                    <div className="flex items-center justify-between gap-2">
                                      <p className="text-xs font-mono text-blue-600 truncate flex-1">
                                        {window.location.origin}/agent/{subAgent.access_token}
                                      </p>
                                      <Button
                                        size="sm"
                                        variant="ghost"
                                        className="h-6 w-6 p-0"
                                        onClick={() => {
                                          navigator.clipboard.writeText(`${window.location.origin}/agent/${subAgent.access_token}`);
                                          toast.success('Lien copié!');
                                        }}
                                      >
                                        <Copy className="w-3 h-3" />
                                      </Button>
                                    </div>
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div className="text-center py-4 text-sm text-muted-foreground">
                            Aucun sous-agent créé
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}
                
                <div className="flex items-center justify-between text-sm pb-3">
                  <span className="text-muted-foreground">Commissions gagnées:</span>
                  <span className="font-medium">{(agent.total_commissions_earned || 0).toLocaleString()} GNF</span>
                </div>
                
                {/* Lien d'accès à l'interface Agent */}
                {agent.access_token && (
                  <div className="p-3 bg-blue-50 dark:bg-blue-950/20 rounded-lg border border-blue-200 dark:border-blue-800">
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex-1 min-w-0 space-y-1">
                        <p className="text-xs font-semibold text-foreground flex items-center gap-2">
                          <span className="text-blue-600">🔗</span> Lien d'accès à l'interface
                        </p>
                        <p className="text-xs font-mono text-blue-600 bg-white dark:bg-gray-900 p-2 rounded border truncate">
                          {window.location.origin}/agent/{agent.access_token}
                        </p>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            navigator.clipboard.writeText(`${window.location.origin}/agent/${agent.access_token}`);
                            toast.success('Lien copié!');
                          }}
                        >
                          <Copy className="w-3.5 h-3.5" />
                        </Button>
                        <Button
                          size="sm"
                          variant="default"
                          className="bg-blue-600 hover:bg-blue-700"
                          onClick={() => window.open(`/agent/${agent.access_token}`, '_blank')}
                        >
                          <ExternalLink className="w-3.5 h-3.5 mr-1.5" />
                          Ouvrir
                        </Button>
                      </div>
                    </div>
                  </div>
                )}
                
                <div className="pt-3 flex flex-wrap gap-2 border-t">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleManagePermissions(agent)}
                    className="flex-1"
                  >
                    <Shield className="w-4 h-4 mr-1" />
                    Permissions
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleEditAgent(agent)}
                    className="flex-1"
                  >
                    <Edit className="w-4 h-4 mr-1" />
                    Modifier
                  </Button>
                  {agent.is_active ? (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleAgentAction(agent.id, 'suspend')}
                      className="flex-1"
                    >
                      <Ban className="w-4 h-4 mr-1" />
                      Suspendre
                    </Button>
                  ) : (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleAgentAction(agent.id, 'activate')}
                      className="flex-1"
                    >
                      <UserCheck className="w-4 h-4 mr-1" />
                      Activer
                    </Button>
                  )}
                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={() => handleAgentAction(agent.id, 'delete')}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {filteredAgents.length === 0 && (
        <Card>
          <CardContent className="py-12 text-center">
            <UserCheck className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">
              {searchTerm ? 'Aucun agent trouvé' : 'Aucun agent pour le moment'}
            </p>
          </CardContent>
        </Card>
      )}

      {/* Dialogue de gestion des permissions */}
      <AgentPermissionsDialog
        agent={permissionsDialogAgent}
        open={isPermissionsDialogOpen}
        onOpenChange={setIsPermissionsDialogOpen}
      />
    </div>
  );
}
