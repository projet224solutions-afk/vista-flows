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
    permissions: {
      // Vue d'ensemble
      view_dashboard: true,
      view_analytics: true,
      // Ventes & Commerce
      access_pos: true,
      manage_products: true,
      manage_orders: true,
      manage_inventory: true,
      manage_warehouse: true,
      manage_suppliers: true,
      // Clients & Marketing
      manage_agents: false,
      manage_clients: true,
      manage_prospects: true,
      manage_marketing: true,
      // Finances
      access_wallet: true,
      manage_payments: true,
      manage_payment_links: true,
      manage_expenses: true,
      manage_debts: true,
      access_affiliate: false,
      // Support & Outils
      manage_delivery: true,
      access_support: true,
      access_communication: true,
      view_reports: true,
      // Configuration
      access_settings: false
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
        can_create_sub_agent: formData.permissions.manage_agents,
      });
    } else {
      await createAgent({
        name: formData.name,
        email: formData.email,
        phone: formData.phone,
        permissions,
        can_create_sub_agent: formData.permissions.manage_agents,
      });
    }

    setFormData({
      name: '',
      email: '',
      phone: '',
      permissions: {
        view_dashboard: true,
        view_analytics: true,
        access_pos: true,
        manage_products: true,
        manage_orders: true,
        manage_inventory: true,
        manage_warehouse: true,
        manage_suppliers: true,
        manage_agents: false,
        manage_clients: true,
        manage_prospects: true,
        manage_marketing: true,
        access_wallet: true,
        manage_payments: true,
        manage_payment_links: true,
        manage_expenses: true,
        manage_debts: true,
        access_affiliate: false,
        manage_delivery: true,
        access_support: true,
        access_communication: true,
        view_reports: true,
        access_settings: false
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
      permissions: {
        view_dashboard: agent.permissions.includes('view_dashboard'),
        view_analytics: agent.permissions.includes('view_analytics'),
        access_pos: agent.permissions.includes('access_pos'),
        manage_products: agent.permissions.includes('manage_products'),
        manage_orders: agent.permissions.includes('manage_orders'),
        manage_inventory: agent.permissions.includes('manage_inventory'),
        manage_warehouse: agent.permissions.includes('manage_warehouse'),
        manage_suppliers: agent.permissions.includes('manage_suppliers'),
        manage_agents: agent.permissions.includes('manage_agents'),
        manage_clients: agent.permissions.includes('manage_clients'),
        manage_prospects: agent.permissions.includes('manage_prospects'),
        manage_marketing: agent.permissions.includes('manage_marketing'),
        access_wallet: agent.permissions.includes('access_wallet'),
        manage_payments: agent.permissions.includes('manage_payments'),
        manage_payment_links: agent.permissions.includes('manage_payment_links'),
        manage_expenses: agent.permissions.includes('manage_expenses'),
        manage_debts: agent.permissions.includes('manage_debts'),
        access_affiliate: agent.permissions.includes('access_affiliate'),
        manage_delivery: agent.permissions.includes('manage_delivery'),
        access_support: agent.permissions.includes('access_support'),
        access_communication: agent.permissions.includes('access_communication'),
        view_reports: agent.permissions.includes('view_reports'),
        access_settings: agent.permissions.includes('access_settings')
      }
    });
    setIsCreateDialogOpen(true);
  };

  const handleCopyLink = (accessToken: string) => {
    const agentLink = `${window.location.origin}/vendor-agent/${accessToken}`;
    navigator.clipboard.writeText(agentLink);
    toast({
      title: "✅ Lien copié",
      description: "Le lien d'accès de l'agent a été copié dans le presse-papiers"
    });
  };

  const handleOpenAgentInterface = (accessToken: string) => {
    const agentLink = `${window.location.origin}/vendor-agent/${accessToken}`;
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
                    permissions: {
                      view_dashboard: true,
                      view_analytics: true,
                      access_pos: true,
                      manage_products: true,
                      manage_orders: true,
                      manage_inventory: true,
                      manage_warehouse: true,
                      manage_suppliers: true,
                      manage_agents: false,
                      manage_clients: true,
                      manage_prospects: true,
                      manage_marketing: true,
                      access_wallet: true,
                      manage_payments: true,
                      manage_payment_links: true,
                      manage_expenses: true,
                      manage_debts: true,
                      access_affiliate: false,
                      manage_delivery: true,
                      access_support: true,
                      access_communication: true,
                      view_reports: true,
                      access_settings: false
                    }
                  });
                }}>
                  <UserPlus className="h-4 w-4 mr-2" />
                  Nouvel Agent
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto scrollbar-thin scrollbar-thumb-gray-400 scrollbar-track-gray-100 hover:scrollbar-thumb-gray-500">
                <DialogHeader className="sticky top-0 bg-background z-10 pb-4 border-b">
                  <DialogTitle>
                    {editingAgent ? 'Modifier l\'Agent' : 'Créer un Nouvel Agent'}
                  </DialogTitle>
                  <DialogDescription>
                    {editingAgent ? 'Modifiez les informations de l\'agent' : 'Ajoutez un membre à votre équipe avec des permissions spécifiques'}
                  </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleCreateAgent} className="space-y-6 py-4">
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

                  <div className="space-y-3 border-t pt-4">
                    <Label className="text-base font-semibold">Permissions</Label>
                    
                    {/* Vue d'ensemble */}
                    <div className="space-y-2">
                      <Label className="text-sm font-medium text-muted-foreground">Vue d'ensemble</Label>
                      <div className="grid grid-cols-2 gap-2 pl-2">
                        <div className="flex items-center space-x-2">
                          <Checkbox 
                            id="view_dashboard"
                            checked={formData.permissions.view_dashboard}
                            onCheckedChange={(checked) => setFormData({
                              ...formData,
                              permissions: { ...formData.permissions, view_dashboard: checked as boolean }
                            })}
                          />
                          <label htmlFor="view_dashboard" className="text-sm">Dashboard</label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Checkbox 
                            id="view_analytics"
                            checked={formData.permissions.view_analytics}
                            onCheckedChange={(checked) => setFormData({
                              ...formData,
                              permissions: { ...formData.permissions, view_analytics: checked as boolean }
                            })}
                          />
                          <label htmlFor="view_analytics" className="text-sm">Analytiques</label>
                        </div>
                      </div>
                    </div>

                    {/* Ventes & Commerce */}
                    <div className="space-y-2">
                      <Label className="text-sm font-medium text-muted-foreground">Ventes & Commerce</Label>
                      <div className="grid grid-cols-2 gap-2 pl-2">
                        <div className="flex items-center space-x-2">
                          <Checkbox 
                            id="access_pos"
                            checked={formData.permissions.access_pos}
                            onCheckedChange={(checked) => setFormData({
                              ...formData,
                              permissions: { ...formData.permissions, access_pos: checked as boolean }
                            })}
                          />
                          <label htmlFor="access_pos" className="text-sm">Point de vente</label>
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
                          <label htmlFor="manage_products" className="text-sm">Produits</label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Checkbox 
                            id="manage_orders"
                            checked={formData.permissions.manage_orders}
                            onCheckedChange={(checked) => setFormData({
                              ...formData,
                              permissions: { ...formData.permissions, manage_orders: checked as boolean }
                            })}
                          />
                          <label htmlFor="manage_orders" className="text-sm">Commandes</label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Checkbox 
                            id="manage_inventory"
                            checked={formData.permissions.manage_inventory}
                            onCheckedChange={(checked) => setFormData({
                              ...formData,
                              permissions: { ...formData.permissions, manage_inventory: checked as boolean }
                            })}
                          />
                          <label htmlFor="manage_inventory" className="text-sm">Inventaire</label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Checkbox 
                            id="manage_warehouse"
                            checked={formData.permissions.manage_warehouse}
                            onCheckedChange={(checked) => setFormData({
                              ...formData,
                              permissions: { ...formData.permissions, manage_warehouse: checked as boolean }
                            })}
                          />
                          <label htmlFor="manage_warehouse" className="text-sm">Entrepôts</label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Checkbox 
                            id="manage_suppliers"
                            checked={formData.permissions.manage_suppliers}
                            onCheckedChange={(checked) => setFormData({
                              ...formData,
                              permissions: { ...formData.permissions, manage_suppliers: checked as boolean }
                            })}
                          />
                          <label htmlFor="manage_suppliers" className="text-sm">Fournisseurs</label>
                        </div>
                      </div>
                    </div>

                    {/* Clients & Marketing */}
                    <div className="space-y-2">
                      <Label className="text-sm font-medium text-muted-foreground">Clients & Marketing</Label>
                      <div className="grid grid-cols-2 gap-2 pl-2">
                        <div className="flex items-center space-x-2">
                          <Checkbox 
                            id="manage_agents"
                            checked={formData.permissions.manage_agents}
                            onCheckedChange={(checked) => setFormData({
                              ...formData,
                              permissions: { ...formData.permissions, manage_agents: checked as boolean }
                            })}
                          />
                          <label htmlFor="manage_agents" className="text-sm">Agents</label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Checkbox 
                            id="manage_clients"
                            checked={formData.permissions.manage_clients}
                            onCheckedChange={(checked) => setFormData({
                              ...formData,
                              permissions: { ...formData.permissions, manage_clients: checked as boolean }
                            })}
                          />
                          <label htmlFor="manage_clients" className="text-sm">Clients</label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Checkbox 
                            id="manage_prospects"
                            checked={formData.permissions.manage_prospects}
                            onCheckedChange={(checked) => setFormData({
                              ...formData,
                              permissions: { ...formData.permissions, manage_prospects: checked as boolean }
                            })}
                          />
                          <label htmlFor="manage_prospects" className="text-sm">Prospects</label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Checkbox 
                            id="manage_marketing"
                            checked={formData.permissions.manage_marketing}
                            onCheckedChange={(checked) => setFormData({
                              ...formData,
                              permissions: { ...formData.permissions, manage_marketing: checked as boolean }
                            })}
                          />
                          <label htmlFor="manage_marketing" className="text-sm">Marketing</label>
                        </div>
                      </div>
                    </div>

                    {/* Finances */}
                    <div className="space-y-2">
                      <Label className="text-sm font-medium text-muted-foreground">Finances</Label>
                      <div className="grid grid-cols-2 gap-2 pl-2">
                        <div className="flex items-center space-x-2">
                          <Checkbox 
                            id="access_wallet"
                            checked={formData.permissions.access_wallet}
                            onCheckedChange={(checked) => setFormData({
                              ...formData,
                              permissions: { ...formData.permissions, access_wallet: checked as boolean }
                            })}
                          />
                          <label htmlFor="access_wallet" className="text-sm">Wallet</label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Checkbox 
                            id="manage_payments"
                            checked={formData.permissions.manage_payments}
                            onCheckedChange={(checked) => setFormData({
                              ...formData,
                              permissions: { ...formData.permissions, manage_payments: checked as boolean }
                            })}
                          />
                          <label htmlFor="manage_payments" className="text-sm">Paiements</label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Checkbox 
                            id="manage_payment_links"
                            checked={formData.permissions.manage_payment_links}
                            onCheckedChange={(checked) => setFormData({
                              ...formData,
                              permissions: { ...formData.permissions, manage_payment_links: checked as boolean }
                            })}
                          />
                          <label htmlFor="manage_payment_links" className="text-sm">Liens de paiement</label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Checkbox 
                            id="manage_expenses"
                            checked={formData.permissions.manage_expenses}
                            onCheckedChange={(checked) => setFormData({
                              ...formData,
                              permissions: { ...formData.permissions, manage_expenses: checked as boolean }
                            })}
                          />
                          <label htmlFor="manage_expenses" className="text-sm">Dépenses</label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Checkbox 
                            id="manage_debts"
                            checked={formData.permissions.manage_debts}
                            onCheckedChange={(checked) => setFormData({
                              ...formData,
                              permissions: { ...formData.permissions, manage_debts: checked as boolean }
                            })}
                          />
                          <label htmlFor="manage_debts" className="text-sm">Dettes</label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Checkbox 
                            id="access_affiliate"
                            checked={formData.permissions.access_affiliate}
                            onCheckedChange={(checked) => setFormData({
                              ...formData,
                              permissions: { ...formData.permissions, access_affiliate: checked as boolean }
                            })}
                          />
                          <label htmlFor="access_affiliate" className="text-sm">Affiliation</label>
                        </div>
                      </div>
                    </div>

                    {/* Support & Outils */}
                    <div className="space-y-2">
                      <Label className="text-sm font-medium text-muted-foreground">Support & Outils</Label>
                      <div className="grid grid-cols-2 gap-2 pl-2">
                        <div className="flex items-center space-x-2">
                          <Checkbox 
                            id="manage_delivery"
                            checked={formData.permissions.manage_delivery}
                            onCheckedChange={(checked) => setFormData({
                              ...formData,
                              permissions: { ...formData.permissions, manage_delivery: checked as boolean }
                            })}
                          />
                          <label htmlFor="manage_delivery" className="text-sm">Livraisons</label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Checkbox 
                            id="access_support"
                            checked={formData.permissions.access_support}
                            onCheckedChange={(checked) => setFormData({
                              ...formData,
                              permissions: { ...formData.permissions, access_support: checked as boolean }
                            })}
                          />
                          <label htmlFor="access_support" className="text-sm">Support Tickets</label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Checkbox 
                            id="access_communication"
                            checked={formData.permissions.access_communication}
                            onCheckedChange={(checked) => setFormData({
                              ...formData,
                              permissions: { ...formData.permissions, access_communication: checked as boolean }
                            })}
                          />
                          <label htmlFor="access_communication" className="text-sm">Communication</label>
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
                          <label htmlFor="view_reports" className="text-sm">Rapports</label>
                        </div>
                      </div>
                    </div>

                    {/* Configuration */}
                    <div className="space-y-2">
                      <Label className="text-sm font-medium text-muted-foreground">Configuration</Label>
                      <div className="grid grid-cols-2 gap-2 pl-2">
                        <div className="flex items-center space-x-2">
                          <Checkbox 
                            id="access_settings"
                            checked={formData.permissions.access_settings}
                            onCheckedChange={(checked) => setFormData({
                              ...formData,
                              permissions: { ...formData.permissions, access_settings: checked as boolean }
                            })}
                          />
                          <label htmlFor="access_settings" className="text-sm">Paramètres</label>
                        </div>
                      </div>
                    </div>
                  </div>

                  <DialogFooter className="sticky bottom-0 bg-background pt-4 border-t mt-6">
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
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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
