import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Checkbox } from '@/components/ui/checkbox';
import { UserCheck, Search, Ban, Trash2, Plus, Mail, Edit, Users, TrendingUp, Activity, ExternalLink, Copy } from 'lucide-react';
import { toast } from 'sonner';
import { usePDGAgentsData, type Agent } from '@/hooks/usePDGAgentsData';

export default function PDGAgentsManagement() {
  const { agents, pdgProfile, loading, stats, createAgent, updateAgent, deleteAgent, toggleAgentStatus } = usePDGAgentsData();
  const [searchTerm, setSearchTerm] = useState('');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editingAgent, setEditingAgent] = useState<Agent | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    commission_rate: 10,
    permissions: {
      create_users: true,
      create_sub_agents: false,
      view_reports: true,
      manage_commissions: false
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

    try {
      setIsSubmitting(true);
      
      const permissions = Object.entries(formData.permissions)
        .filter(([_, value]) => value)
        .map(([key]) => key);

      if (editingAgent) {
        // Mode édition
        await updateAgent(editingAgent.id, {
          name: formData.name,
          email: formData.email,
          phone: formData.phone,
          permissions,
          commission_rate: formData.commission_rate,
          can_create_sub_agent: formData.permissions.create_sub_agents,
        });
      } else {
        // Mode création
        await createAgent({
          name: formData.name,
          email: formData.email,
          phone: formData.phone,
          permissions,
          commission_rate: formData.commission_rate,
          can_create_sub_agent: formData.permissions.create_sub_agents,
        });
      }

      // Réinitialiser le formulaire
      setFormData({
        name: '',
        email: '',
        phone: '',
        commission_rate: 10,
        permissions: {
          create_users: true,
          create_sub_agents: false,
          view_reports: true,
          manage_commissions: false
        }
      });
      
      setEditingAgent(null);
      setIsDialogOpen(false);
    } catch (error) {
      console.error('Erreur gestion agent:', error);
      toast.error('Erreur lors de la gestion de l\'agent');
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
      commission_rate: agent.commission_rate,
      permissions: {
        create_users: agent.permissions.includes('create_users'),
        create_sub_agents: agent.can_create_sub_agent,
        view_reports: agent.permissions.includes('view_reports'),
        manage_commissions: agent.permissions.includes('manage_commissions')
      }
    });
    setIsDialogOpen(true);
  };

  const handleAgentAction = async (agentId: string, action: 'activate' | 'suspend' | 'delete') => {
    try {
      switch (action) {
        case 'activate':
          await toggleAgentStatus(agentId, true);
          break;
        case 'suspend':
          await toggleAgentStatus(agentId, false);
          break;
        case 'delete':
          await deleteAgent(agentId);
          break;
      }
    } catch (error) {
      toast.error('Erreur lors de l\'action');
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
                commission_rate: 10,
                permissions: {
                  create_users: true,
                  create_sub_agents: false,
                  view_reports: true,
                  manage_commissions: false
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
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Utilisateurs créés:</span>
                  <span className="font-medium">{agent.total_users_created || 0}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
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
                
                <div className="pt-3 flex gap-2 border-t">
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
    </div>
  );
}
