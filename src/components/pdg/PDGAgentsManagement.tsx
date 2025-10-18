/**
 * 👥 GESTION AGENTS & SOUS-AGENTS - 224SOLUTIONS
 * Interface de gestion des agents et sous-agents pour PDG
 */

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { 
  Users, 
  UserPlus, 
  Settings, 
  DollarSign, 
  TrendingUp,
  Shield,
  Mail,
  Phone,
  Edit,
  Trash2,
  Eye,
  BarChart3
} from 'lucide-react';

interface Agent {
  id: string;
  name: string;
  email: string;
  phone: string;
  pgd_id: string;
  can_create_sub_agent: boolean;
  is_active: boolean;
  created_at: string;
  total_users: number;
  total_commissions: number;
}

interface SubAgent {
  id: string;
  name: string;
  email: string;
  phone: string;
  parent_agent_id: string;
  is_active: boolean;
  created_at: string;
  total_users: number;
  total_commissions: number;
  parent_agent_name: string;
}

interface CommissionSettings {
  base_user_commission: number;
  parent_share_ratio: number;
}

export default function PDGAgentsManagement() {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [subAgents, setSubAgents] = useState<SubAgent[]>([]);
  const [loading, setLoading] = useState(true);
  const [commissionSettings, setCommissionSettings] = useState<CommissionSettings>({
    base_user_commission: 0.20,
    parent_share_ratio: 0.50
  });
  const [showCreateAgent, setShowCreateAgent] = useState(false);
  const [showCreateSubAgent, setShowCreateSubAgent] = useState(false);
  const [selectedAgent, setSelectedAgent] = useState<Agent | null>(null);
  const { toast } = useToast();

  // Formulaire de création d'agent
  const [newAgent, setNewAgent] = useState({
    name: '',
    email: '',
    phone: '',
    can_create_sub_agent: false
  });

  // Formulaire de création de sous-agent
  const [newSubAgent, setNewSubAgent] = useState({
    name: '',
    email: '',
    phone: '',
    parent_agent_id: ''
  });

  useEffect(() => {
    loadData();
    loadCommissionSettings();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      
      // Charger les agents avec leurs statistiques
      const { data: agentsData, error: agentsError } = await supabase
        .from('agents')
        .select(`
          *,
          total_users:agent_users(count),
          total_commissions:commissions(sum.amount)
        `)
        .order('created_at', { ascending: false });

      if (agentsError) throw agentsError;

      // Charger les sous-agents avec leurs statistiques
      const { data: subAgentsData, error: subAgentsError } = await supabase
        .from('sub_agents')
        .select(`
          *,
          parent_agent:agents!sub_agents_parent_agent_id_fkey(name),
          total_users:agent_users(count),
          total_commissions:commissions(sum.amount)
        `)
        .order('created_at', { ascending: false });

      if (subAgentsError) throw subAgentsError;

      setAgents(agentsData || []);
      setSubAgents(subAgentsData || []);
    } catch (error) {
      console.error('Erreur chargement données:', error);
      toast({
        title: "Erreur",
        description: "Impossible de charger les données",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const loadCommissionSettings = async () => {
    try {
      const { data: settings, error } = await supabase
        .from('commission_settings')
        .select('*')
        .in('key', ['base_user_commission', 'parent_share_ratio']);

      if (error) throw error;

      const newSettings = {
        base_user_commission: 0.20,
        parent_share_ratio: 0.50
      };

      settings?.forEach(setting => {
        if (setting.key === 'base_user_commission') {
          newSettings.base_user_commission = setting.value.value || 0.20;
        } else if (setting.key === 'parent_share_ratio') {
          newSettings.parent_share_ratio = setting.value.value || 0.50;
        }
      });

      setCommissionSettings(newSettings);
    } catch (error) {
      console.error('Erreur chargement paramètres:', error);
    }
  };

  const createAgent = async () => {
    try {
      const { data, error } = await supabase
        .from('agents')
        .insert({
          name: newAgent.name,
          email: newAgent.email,
          phone: newAgent.phone,
          can_create_sub_agent: newAgent.can_create_sub_agent,
          pgd_id: (await supabase.auth.getUser()).data.user?.id
        })
        .select()
        .single();

      if (error) throw error;

      // Log de l'action
      await supabase.from('agent_audit_logs').insert({
        actor_id: (await supabase.auth.getUser()).data.user?.id,
        actor_type: 'pgd',
        action: 'AGENT_CREATED',
        target_type: 'agent',
        target_id: data.id,
        details: { agent_name: newAgent.name, email: newAgent.email }
      });

      toast({
        title: "✅ Agent créé",
        description: `L'agent ${newAgent.name} a été créé avec succès`,
      });

      setNewAgent({ name: '', email: '', phone: '', can_create_sub_agent: false });
      setShowCreateAgent(false);
      loadData();
    } catch (error) {
      console.error('Erreur création agent:', error);
      toast({
        title: "❌ Erreur",
        description: "Impossible de créer l'agent",
        variant: "destructive"
      });
    }
  };

  const createSubAgent = async () => {
    try {
      const { data, error } = await supabase
        .from('sub_agents')
        .insert({
          name: newSubAgent.name,
          email: newSubAgent.email,
          phone: newSubAgent.phone,
          parent_agent_id: newSubAgent.parent_agent_id
        })
        .select()
        .single();

      if (error) throw error;

      // Log de l'action
      await supabase.from('agent_audit_logs').insert({
        actor_id: (await supabase.auth.getUser()).data.user?.id,
        actor_type: 'pgd',
        action: 'SUB_AGENT_CREATED',
        target_type: 'sub_agent',
        target_id: data.id,
        details: { sub_agent_name: newSubAgent.name, email: newSubAgent.email }
      });

      toast({
        title: "✅ Sous-agent créé",
        description: `Le sous-agent ${newSubAgent.name} a été créé avec succès`,
      });

      setNewSubAgent({ name: '', email: '', phone: '', parent_agent_id: '' });
      setShowCreateSubAgent(false);
      loadData();
    } catch (error) {
      console.error('Erreur création sous-agent:', error);
      toast({
        title: "❌ Erreur",
        description: "Impossible de créer le sous-agent",
        variant: "destructive"
      });
    }
  };

  const updateCommissionSettings = async () => {
    try {
      // Mettre à jour les paramètres de commission
      await supabase.from('commission_settings').upsert([
        {
          key: 'base_user_commission',
          value: { value: commissionSettings.base_user_commission },
          description: 'Commission de base pour les utilisateurs'
        },
        {
          key: 'parent_share_ratio',
          value: { value: commissionSettings.parent_share_ratio },
          description: 'Ratio de partage entre sous-agent et agent parent'
        }
      ]);

      toast({
        title: "✅ Paramètres mis à jour",
        description: "Les paramètres de commission ont été mis à jour",
      });
    } catch (error) {
      console.error('Erreur mise à jour paramètres:', error);
      toast({
        title: "❌ Erreur",
        description: "Impossible de mettre à jour les paramètres",
        variant: "destructive"
      });
    }
  };

  const toggleAgentStatus = async (agentId: string, currentStatus: boolean) => {
    try {
      const { error } = await supabase
        .from('agents')
        .update({ is_active: !currentStatus })
        .eq('id', agentId);

      if (error) throw error;

      toast({
        title: currentStatus ? "🚫 Agent suspendu" : "✅ Agent activé",
        description: `L'agent a été ${currentStatus ? 'suspendu' : 'activé'} avec succès`,
      });

      loadData();
    } catch (error) {
      console.error('Erreur changement statut:', error);
      toast({
        title: "❌ Erreur",
        description: "Impossible de modifier le statut",
        variant: "destructive"
      });
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header avec statistiques */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="border-border/40 bg-card/50 backdrop-blur-sm">
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-blue-500/10 flex items-center justify-center">
                <Users className="w-6 h-6 text-blue-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{agents.length}</p>
                <p className="text-sm text-muted-foreground">Agents Actifs</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/40 bg-card/50 backdrop-blur-sm">
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-green-500/10 flex items-center justify-center">
                <UserPlus className="w-6 h-6 text-green-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{subAgents.length}</p>
                <p className="text-sm text-muted-foreground">Sous-agents</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/40 bg-card/50 backdrop-blur-sm">
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-purple-500/10 flex items-center justify-center">
                <DollarSign className="w-6 h-6 text-purple-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">
                  {agents.reduce((sum, agent) => sum + (agent.total_commissions || 0), 0).toLocaleString()} FCFA
                </p>
                <p className="text-sm text-muted-foreground">Commissions Totales</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/40 bg-card/50 backdrop-blur-sm">
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-orange-500/10 flex items-center justify-center">
                <TrendingUp className="w-6 h-6 text-orange-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">
                  {(commissionSettings.base_user_commission * 100).toFixed(1)}%
                </p>
                <p className="text-sm text-muted-foreground">Commission de Base</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Onglets principaux */}
      <Tabs defaultValue="agents" className="space-y-6">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="agents">Agents</TabsTrigger>
          <TabsTrigger value="sub-agents">Sous-agents</TabsTrigger>
          <TabsTrigger value="settings">Paramètres</TabsTrigger>
        </TabsList>

        {/* Onglet Agents */}
        <TabsContent value="agents" className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-semibold">Gestion des Agents</h3>
            <Dialog open={showCreateAgent} onOpenChange={setShowCreateAgent}>
              <DialogTrigger asChild>
                <Button className="gap-2">
                  <UserPlus className="w-4 h-4" />
                  Créer un Agent
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Créer un nouvel Agent</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="agent-name">Nom complet</Label>
                    <Input
                      id="agent-name"
                      value={newAgent.name}
                      onChange={(e) => setNewAgent(prev => ({ ...prev, name: e.target.value }))}
                      placeholder="Nom de l'agent"
                    />
                  </div>
                  <div>
                    <Label htmlFor="agent-email">Email</Label>
                    <Input
                      id="agent-email"
                      type="email"
                      value={newAgent.email}
                      onChange={(e) => setNewAgent(prev => ({ ...prev, email: e.target.value }))}
                      placeholder="email@example.com"
                    />
                  </div>
                  <div>
                    <Label htmlFor="agent-phone">Téléphone</Label>
                    <Input
                      id="agent-phone"
                      value={newAgent.phone}
                      onChange={(e) => setNewAgent(prev => ({ ...prev, phone: e.target.value }))}
                      placeholder="+224 XXX XX XX XX"
                    />
                  </div>
                  <div className="flex items-center space-x-2">
                    <Switch
                      id="can-create-sub-agent"
                      checked={newAgent.can_create_sub_agent}
                      onCheckedChange={(checked) => setNewAgent(prev => ({ ...prev, can_create_sub_agent: checked }))}
                    />
                    <Label htmlFor="can-create-sub-agent">Peut créer des sous-agents</Label>
                  </div>
                  <div className="flex justify-end gap-2">
                    <Button variant="outline" onClick={() => setShowCreateAgent(false)}>
                      Annuler
                    </Button>
                    <Button onClick={createAgent}>
                      Créer l'Agent
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>

          <Card>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nom</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Téléphone</TableHead>
                  <TableHead>Utilisateurs</TableHead>
                  <TableHead>Commissions</TableHead>
                  <TableHead>Statut</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {agents.map((agent) => (
                  <TableRow key={agent.id}>
                    <TableCell className="font-medium">{agent.name}</TableCell>
                    <TableCell>{agent.email}</TableCell>
                    <TableCell>{agent.phone}</TableCell>
                    <TableCell>{agent.total_users || 0}</TableCell>
                    <TableCell>{(agent.total_commissions || 0).toLocaleString()} FCFA</TableCell>
                    <TableCell>
                      <Badge variant={agent.is_active ? "default" : "secondary"}>
                        {agent.is_active ? "Actif" : "Suspendu"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => toggleAgentStatus(agent.id, agent.is_active)}
                        >
                          {agent.is_active ? "Suspendre" : "Activer"}
                        </Button>
                        <Button size="sm" variant="outline">
                          <Eye className="w-4 h-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>
        </TabsContent>

        {/* Onglet Sous-agents */}
        <TabsContent value="sub-agents" className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-semibold">Gestion des Sous-agents</h3>
            <Dialog open={showCreateSubAgent} onOpenChange={setShowCreateSubAgent}>
              <DialogTrigger asChild>
                <Button className="gap-2">
                  <UserPlus className="w-4 h-4" />
                  Créer un Sous-agent
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Créer un nouveau Sous-agent</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="sub-agent-name">Nom complet</Label>
                    <Input
                      id="sub-agent-name"
                      value={newSubAgent.name}
                      onChange={(e) => setNewSubAgent(prev => ({ ...prev, name: e.target.value }))}
                      placeholder="Nom du sous-agent"
                    />
                  </div>
                  <div>
                    <Label htmlFor="sub-agent-email">Email</Label>
                    <Input
                      id="sub-agent-email"
                      type="email"
                      value={newSubAgent.email}
                      onChange={(e) => setNewSubAgent(prev => ({ ...prev, email: e.target.value }))}
                      placeholder="email@example.com"
                    />
                  </div>
                  <div>
                    <Label htmlFor="sub-agent-phone">Téléphone</Label>
                    <Input
                      id="sub-agent-phone"
                      value={newSubAgent.phone}
                      onChange={(e) => setNewSubAgent(prev => ({ ...prev, phone: e.target.value }))}
                      placeholder="+224 XXX XX XX XX"
                    />
                  </div>
                  <div>
                    <Label htmlFor="parent-agent">Agent Parent</Label>
                    <select
                      id="parent-agent"
                      value={newSubAgent.parent_agent_id}
                      onChange={(e) => setNewSubAgent(prev => ({ ...prev, parent_agent_id: e.target.value }))}
                      className="w-full p-2 border rounded-md"
                    >
                      <option value="">Sélectionner un agent</option>
                      {agents.filter(agent => agent.is_active).map(agent => (
                        <option key={agent.id} value={agent.id}>{agent.name}</option>
                      ))}
                    </select>
                  </div>
                  <div className="flex justify-end gap-2">
                    <Button variant="outline" onClick={() => setShowCreateSubAgent(false)}>
                      Annuler
                    </Button>
                    <Button onClick={createSubAgent}>
                      Créer le Sous-agent
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>

          <Card>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nom</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Agent Parent</TableHead>
                  <TableHead>Utilisateurs</TableHead>
                  <TableHead>Commissions</TableHead>
                  <TableHead>Statut</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {subAgents.map((subAgent) => (
                  <TableRow key={subAgent.id}>
                    <TableCell className="font-medium">{subAgent.name}</TableCell>
                    <TableCell>{subAgent.email}</TableCell>
                    <TableCell>{subAgent.parent_agent_name}</TableCell>
                    <TableCell>{subAgent.total_users || 0}</TableCell>
                    <TableCell>{(subAgent.total_commissions || 0).toLocaleString()} FCFA</TableCell>
                    <TableCell>
                      <Badge variant={subAgent.is_active ? "default" : "secondary"}>
                        {subAgent.is_active ? "Actif" : "Suspendu"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <Button size="sm" variant="outline">
                          <Eye className="w-4 h-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>
        </TabsContent>

        {/* Onglet Paramètres */}
        <TabsContent value="settings" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="w-5 h-5" />
                Paramètres de Commission
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <Label htmlFor="base-commission">Commission de Base (%)</Label>
                  <Input
                    id="base-commission"
                    type="number"
                    min="0"
                    max="100"
                    step="0.1"
                    value={commissionSettings.base_user_commission * 100}
                    onChange={(e) => setCommissionSettings(prev => ({
                      ...prev,
                      base_user_commission: Number(e.target.value) / 100
                    }))}
                  />
                  <p className="text-sm text-muted-foreground mt-1">
                    Pourcentage de commission sur le revenu net (défaut: 20%)
                  </p>
                </div>

                <div>
                  <Label htmlFor="parent-share">Ratio de Partage (%)</Label>
                  <Input
                    id="parent-share"
                    type="number"
                    min="0"
                    max="100"
                    step="0.1"
                    value={commissionSettings.parent_share_ratio * 100}
                    onChange={(e) => setCommissionSettings(prev => ({
                      ...prev,
                      parent_share_ratio: Number(e.target.value) / 100
                    }))}
                  />
                  <p className="text-sm text-muted-foreground mt-1">
                    Pourcentage pour l'agent parent (défaut: 50%)
                  </p>
                </div>
              </div>

              <div className="bg-muted/50 p-4 rounded-lg">
                <h4 className="font-semibold mb-2">Exemple de Calcul</h4>
                <p className="text-sm text-muted-foreground">
                  Si un utilisateur génère 100,000 FCFA de revenu net :
                </p>
                <ul className="text-sm text-muted-foreground mt-2 space-y-1">
                  <li>• <strong>Agent direct :</strong> {((commissionSettings.base_user_commission * 100000).toLocaleString())} FCFA ({(commissionSettings.base_user_commission * 100).toFixed(1)}%)</li>
                  <li>• <strong>Sous-agent :</strong> {((commissionSettings.base_user_commission * (1 - commissionSettings.parent_share_ratio) * 100000).toLocaleString())} FCFA ({(commissionSettings.base_user_commission * (1 - commissionSettings.parent_share_ratio) * 100).toFixed(1)}%)</li>
                  <li>• <strong>Agent parent :</strong> {((commissionSettings.base_user_commission * commissionSettings.parent_share_ratio * 100000).toLocaleString())} FCFA ({(commissionSettings.base_user_commission * commissionSettings.parent_share_ratio * 100).toFixed(1)}%)</li>
                </ul>
              </div>

              <Button onClick={updateCommissionSettings} className="gap-2">
                <Settings className="w-4 h-4" />
                Sauvegarder les Paramètres
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
