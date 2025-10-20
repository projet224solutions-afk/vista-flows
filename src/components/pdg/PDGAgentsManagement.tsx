import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { UserCheck, Search, Eye, Ban, Trash2, Plus } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { agentService } from '@/services/agentService';
import { useAuth } from '@/hooks/useAuth';

interface Agent {
  id: string;
  name: string;
  email: string;
  phone?: string;
  role: string;
  commission_rate: number;
  is_active: boolean;
  created_at: string;
}

export default function PDGAgentsManagement() {
  const { user } = useAuth();
  const [agents, setAgents] = useState<Agent[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [pdgId, setPdgId] = useState<string | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    role: 'agent',
    commission_rate: 10,
    permissions: {
      create_users: true,
      create_sub_agents: false,
      view_reports: true,
      manage_commissions: false
    }
  });

  useEffect(() => {
    if (user) {
      loadPDGAndAgents();
    }
  }, [user]);

  const loadPDGAndAgents = async () => {
    try {
      setLoading(true);
      
      // Récupérer le PDG de l'utilisateur connecté
      let pdgData = await agentService.getPDGByUserId(user!.id);
      
      // Si pas de profil PDG, en créer un automatiquement
      if (!pdgData) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('email, first_name, last_name, phone')
          .eq('id', user!.id)
          .single();
        
        if (profile) {
          pdgData = await agentService.createPDG({
            user_id: user!.id,
            name: `${profile.first_name || ''} ${profile.last_name || ''}`.trim() || profile.email,
            email: profile.email,
            phone: profile.phone || undefined,
            permissions: ['all']
          });
          toast.success('Profil PDG créé automatiquement');
        } else {
          toast.error('Impossible de créer le profil PDG');
          return;
        }
      }
      
      setPdgId(pdgData.id);
      
      // Charger les agents du PDG
      const agentsData = await agentService.getAgentsByPDG(pdgData.id);
      setAgents(agentsData as Agent[]);
    } catch (error) {
      console.error('Erreur chargement:', error);
      toast.error('Erreur lors du chargement');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateAgent = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!pdgId) {
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

      await agentService.createAgent({
        pdg_id: pdgId,
        name: formData.name,
        email: formData.email,
        phone: formData.phone,
        permissions
      });

      // Réinitialiser le formulaire
      setFormData({
        name: '',
        email: '',
        phone: '',
        role: 'agent',
        commission_rate: 10,
        permissions: {
          create_users: true,
          create_sub_agents: false,
          view_reports: true,
          manage_commissions: false
        }
      });
      
      setIsDialogOpen(false);
      await loadPDGAndAgents();
    } catch (error) {
      console.error('Erreur création agent:', error);
      toast.error('Erreur lors de la création de l\'agent');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAgentAction = async (agentId: string, action: 'activate' | 'suspend' | 'delete') => {
    try {
      if (action === 'delete') {
        const { error } = await supabase
          .from('agents_management')
          .delete()
          .eq('id', agentId);
        if (error) throw error;
        toast.success('Agent supprimé');
      } else {
        const { error } = await supabase
          .from('agents_management')
          .update({ is_active: action === 'activate' })
          .eq('id', agentId);
        if (error) throw error;
        toast.success(`Agent ${action === 'activate' ? 'activé' : 'suspendu'}`);
      }
      await loadPDGAndAgents();
    } catch (error) {
      console.error('Erreur action agent:', error);
      toast.error('Erreur lors de l\'action sur l\'agent');
    }
  };

  const filteredAgents = agents.filter(agent =>
    agent.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    agent.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* En-tête */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold">Gestion des Agents</h2>
          <p className="text-muted-foreground mt-1">Administration du réseau d'agents</p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="w-4 h-4 mr-2" />
              Nouvel Agent
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Créer un Nouvel Agent</DialogTitle>
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

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="role">Rôle</Label>
                  <Select value={formData.role} onValueChange={(val) => setFormData({ ...formData, role: val })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="agent">Agent Principal</SelectItem>
                      <SelectItem value="sub_agent">Sous-Agent</SelectItem>
                    </SelectContent>
                  </Select>
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
                      Création...
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
            <CardTitle className="text-sm font-medium">Total Agents</CardTitle>
            <UserCheck className="w-4 h-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{agents.length}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Actifs</CardTitle>
            <UserCheck className="w-4 h-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-500">
              {agents.filter(a => a.is_active).length}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Suspendus</CardTitle>
            <UserCheck className="w-4 h-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-500">
              {agents.filter(a => !a.is_active).length}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Commission Moy.</CardTitle>
            <UserCheck className="w-4 h-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-500">
              {(agents.reduce((acc, a) => acc + a.commission_rate, 0) / agents.length).toFixed(1)}%
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recherche */}
      <Card>
        <CardHeader>
          <CardTitle>Rechercher un agent</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="relative">
            <Search className="absolute left-3 top-3 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Rechercher par nom ou email..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </CardContent>
      </Card>

      {/* Liste des agents */}
      <Card>
        <CardHeader>
          <CardTitle>Liste des Agents ({filteredAgents.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {filteredAgents.map((agent) => (
              <div
                key={agent.id}
                className="flex items-center justify-between p-4 rounded-lg border bg-card"
              >
                <div className="flex items-center gap-4 flex-1">
                  <UserCheck className="w-10 h-10 text-muted-foreground" />
                  <div className="flex-1">
                    <h3 className="font-medium">{agent.name}</h3>
                    <p className="text-sm text-muted-foreground">
                      {agent.email} • {agent.role} • Commission: {agent.commission_rate}%
                    </p>
                  </div>
                  {agent.is_active ? (
                    <Badge className="bg-green-500">Actif</Badge>
                  ) : (
                    <Badge className="bg-red-500">Suspendu</Badge>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <Button variant="ghost" size="sm">
                    <Eye className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleAgentAction(agent.id, agent.is_active ? 'suspend' : 'activate')}
                  >
                    <Ban className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleAgentAction(agent.id, 'delete')}
                  >
                    <Trash2 className="w-4 h-4 text-red-500" />
                  </Button>
                </div>
              </div>
            ))}
            {filteredAgents.length === 0 && (
              <div className="text-center py-12 text-muted-foreground">
                Aucun agent trouvé
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
