import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Checkbox } from '@/components/ui/checkbox';
import { Users, UserPlus, Settings, MessageSquare, Copy, ExternalLink, Edit, TrendingUp, Activity } from 'lucide-react';
import { useVendorAgentsData, type VendorAgent } from '@/hooks/useVendorAgentsData';
import { useToast } from '@/hooks/use-toast';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import RealCommunicationInterface from '@/components/communication/RealCommunicationInterface';

export default function AgentManagement() {
  const { 
    agents, 
    loading, 
    stats,
    createAgent, 
    updateAgent,
    deleteAgent,
    toggleAgentStatus 
  } = useVendorAgentsData();
  const { toast } = useToast();

  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [editingAgent, setEditingAgent] = useState<VendorAgent | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
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
    
    if (!formData.name || !formData.email || !formData.phone) {
      toast({
        title: "❌ Champs manquants",
        description: "Veuillez remplir tous les champs obligatoires",
        variant: "destructive"
      });
      return;
    }

    const permissions = Object.entries(formData.permissions)
      .filter(([_, value]) => value)
      .map(([key]) => key);

    if (editingAgent) {
      await updateAgent(editingAgent.id, {
        name: formData.name,
        email: formData.email,
        phone: formData.phone,
        permissions,
        commission_rate: formData.commission_rate,
        can_create_sub_agent: formData.permissions.create_sub_agents,
      });
    } else {
      await createAgent({
        name: formData.name,
        email: formData.email,
        phone: formData.phone,
        commission_rate: formData.commission_rate,
        permissions,
        can_create_sub_agent: formData.permissions.create_sub_agents,
      });
    }

    setFormData({
      name: '',
      email: '',
      phone: '',
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
    setIsCreateDialogOpen(false);
  };

  const handleEditAgent = (agent: VendorAgent) => {
    setEditingAgent(agent);
    setFormData({
      name: agent.name,
      email: agent.email,
      phone: agent.phone,
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
    setIsCreateDialogOpen(true);
  };

  const handleCopyLink = (accessToken: string) => {
    const agentLink = `${window.location.origin}/agent?token=${accessToken}`;
    navigator.clipboard.writeText(agentLink);
    toast({
      title: "✅ Lien copié",
      description: "Le lien d'accès de l'agent a été copié dans le presse-papiers"
    });
  };

  const handleOpenAgentInterface = (accessToken: string) => {
    const agentLink = `${window.location.origin}/agent?token=${accessToken}`;
    window.open(agentLink, '_blank');
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center p-12 space-y-4">
        <div className="w-8 h-8 border-4 border-vendeur-primary border-t-transparent rounded-full animate-spin"></div>
        <p className="text-muted-foreground">Chargement de la gestion des agents...</p>
      </div>
    );
  }

  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      {/* Navigation par onglets */}
      <Tabs defaultValue="agents" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="agents">Gestion Agents</TabsTrigger>
          <TabsTrigger value="communication">Communication</TabsTrigger>
        </TabsList>

        <TabsContent value="agents" className="space-y-8">
          {/* Header Moderne */}
          <div className="flex justify-between items-start">
            <div className="space-y-1">
              <div className="flex items-center gap-3">
                <div className="p-3 rounded-xl bg-vendeur-gradient shadow-glow">
                  <Users className="h-6 w-6 text-white" />
                </div>
                <div>
                  <h1 className="text-3xl font-bold text-foreground">Gestion des Agents</h1>
                  <p className="text-muted-foreground text-lg">
                    Gérez votre équipe et leurs permissions • {stats.activeAgents} agent(s) actif(s)
                  </p>
                </div>
              </div>
            </div>
            
            <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
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
                      manage_commissions: false,
                      manage_users: false,
                      manage_products: false
                    }
                  });
                }}>
                  <UserPlus className="h-4 w-4 mr-2" />
                  Nouvel Agent
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl">
                <DialogHeader>
                  <DialogTitle>
                    {editingAgent ? 'Modifier l\'Agent' : 'Créer un Nouvel Agent'}
                  </DialogTitle>
                  <DialogDescription>
                    {editingAgent ? 'Modifiez les informations de l\'agent' : 'Ajoutez un membre à votre équipe avec des permissions spécifiques'}
                  </DialogDescription>
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

                  <DialogFooter className="mt-6">
                    <Button type="button" variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                      Annuler
                    </Button>
                    <Button type="submit" className="bg-vendeur-gradient">
                      {editingAgent ? (
                        <>
                          <Edit className="h-4 w-4 mr-2" />
                          Modifier l'Agent
                        </>
                      ) : (
                        <>
                          <UserPlus className="h-4 w-4 mr-2" />
                          Créer l'Agent
                        </>
                      )}
                    </Button>
                  </DialogFooter>
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
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Agents Actifs
                </CardTitle>
                <Activity className="h-4 w-4 text-green-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">{stats.activeAgents}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Utilisateurs Créés
                </CardTitle>
                <UserPlus className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.totalUsers}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Commissions Totales
                </CardTitle>
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.totalCommissions.toFixed(2)} GNF</div>
              </CardContent>
            </Card>
          </div>

          {/* Liste des Agents - Style Professionnel */}
          <Card className="border-0 shadow-elegant">
            <CardHeader className="bg-vendeur-accent/30 border-b border-border">
              <CardTitle className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Users className="h-5 w-5 text-vendeur-primary" />
                  Équipe Active
                </div>
                <Badge variant="secondary" className="px-3 py-1">
                  {agents.length} membre(s)
                </Badge>
              </CardTitle>
              <CardDescription className="text-base">
                Gérez les membres de votre équipe et leurs permissions d'accès
              </CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              {agents.length === 0 ? (
                <div className="text-center py-16 px-6">
                  <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-vendeur-accent/50 flex items-center justify-center">
                    <Users className="h-8 w-8 text-vendeur-primary opacity-50" />
                  </div>
                  <h3 className="text-lg font-semibold mb-2">Aucun agent dans l'équipe</h3>
                  <p className="text-muted-foreground mb-6">
                    Commencez par ajouter votre premier agent pour déléguer des responsabilités
                  </p>
                  <Button 
                    onClick={() => setIsCreateDialogOpen(true)}
                    className="bg-vendeur-gradient"
                  >
                    <UserPlus className="h-4 w-4 mr-2" />
                    Ajouter le Premier Agent
                  </Button>
                </div>
              ) : (
                <div className="overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-muted/30">
                        <TableHead className="font-semibold">Agent</TableHead>
                        <TableHead className="font-semibold">Contact</TableHead>
                        <TableHead className="font-semibold">Commission</TableHead>
                        <TableHead className="font-semibold">Statut</TableHead>
                        <TableHead className="font-semibold">Lien d'accès</TableHead>
                        <TableHead className="font-semibold text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {agents.map((agent) => (
                        <TableRow key={agent.id} className="hover:bg-vendeur-accent/20 transition-colors duration-200">
                          <TableCell>
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 rounded-full bg-vendeur-gradient flex items-center justify-center text-white font-semibold">
                                {agent.name.substring(0, 2).toUpperCase()}
                              </div>
                              <div>
                                <p className="font-medium">{agent.name}</p>
                                <p className="text-sm text-muted-foreground font-mono">
                                  {agent.agent_code}
                                </p>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="space-y-1">
                              <p className="text-sm">{agent.email}</p>
                              <p className="text-sm text-muted-foreground">{agent.phone}</p>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline" className="font-medium">
                              {agent.commission_rate}%
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Badge 
                              variant={agent.is_active ? 'default' : 'secondary'}
                              className={agent.is_active 
                                ? 'bg-vendeur-secondary/10 text-vendeur-secondary border-vendeur-secondary/20' 
                                : ''
                              }
                            >
                              {agent.is_active ? '🟢 Actif' : '🔴 Inactif'}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <div className="flex gap-2">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleCopyLink(agent.access_token)}
                                className="hover:shadow-glow transition-all duration-300"
                              >
                                <Copy className="h-3 w-3" />
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleOpenAgentInterface(agent.access_token)}
                                className="hover:shadow-glow transition-all duration-300"
                              >
                                <ExternalLink className="h-3 w-3" />
                              </Button>
                            </div>
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex gap-2 justify-end">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleEditAgent(agent)}
                                className="hover:shadow-glow transition-all duration-300"
                              >
                                <Edit className="h-3 w-3" />
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => toggleAgentStatus(agent.id, !agent.is_active)}
                                className="hover:shadow-glow transition-all duration-300"
                              >
                                {agent.is_active ? 'Désactiver' : 'Activer'}
                              </Button>
                              <Button
                                size="sm"
                                variant="destructive"
                                onClick={() => {
                                  if (window.confirm('⚠️ Êtes-vous sûr de vouloir désactiver cet agent ?')) {
                                    deleteAgent(agent.id);
                                  }
                                }}
                                className="hover:shadow-glow transition-all duration-300"
                              >
                                Supprimer
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="communication" className="space-y-6">
          <Card className="border-0 shadow-elegant">
            <CardHeader className="bg-vendeur-accent/30 border-b border-border">
              <CardTitle className="flex items-center gap-2">
                <MessageSquare className="h-5 w-5 text-vendeur-primary" />
                Interface de Communication
              </CardTitle>
              <CardDescription className="text-base">
                Communiquez avec vos agents en temps réel
              </CardDescription>
            </CardHeader>
            <CardContent className="p-6">
              <RealCommunicationInterface />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
