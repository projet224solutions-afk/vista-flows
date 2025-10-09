import React, { useState } from 'react';
import { getErrorMessage, logError } from '@/lib/errors';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Users, UserPlus, Shield, Settings, AlertTriangle, MessageSquare } from 'lucide-react';
import { useAgentManagement } from '@/hooks/useAgentManagement';
import { useToast } from '@/hooks/use-toast';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import SimpleCommunicationInterface from '@/components/communication/SimpleCommunicationInterface';

export default function AgentManagement() {
  const { 
    agents, 
    roles, 
    loading, 
    error, 
    createAgent, 
    updateAgentStatus, 
    deleteAgent,
    getRolePermissions 
  } = useAgentManagement();
  const { toast } = useToast();

  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [newAgent, setNewAgent] = useState({
    user_id: '',
    role_id: ''
  });
  const [selectedRole, setSelectedRole] = useState<string | null>(null);

  const handleCreateAgent = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      await createAgent(newAgent);
      toast({
        title: "✅ Agent créé avec succès",
        description: "Le nouvel agent a été ajouté à votre équipe"
      });
      setIsCreateDialogOpen(false);
      setNewAgent({ user_id: '', role_id: '' });
    } catch (error) {
      toast({
        title: "❌ Erreur de création",
        description: "Impossible de créer l'agent. Vérifiez les informations saisies.",
        variant: "destructive"
      });
    }
  };

  const handleStatusUpdate = async (agentId: string, status: 'active' | 'inactive') => {
    try {
      await updateAgentStatus(agentId, status);
      toast({
        title: "✅ Statut mis à jour",
        description: `L'agent a été ${status === 'active' ? 'activé' : 'désactivé'} avec succès`
      });
    } catch (error) {
      toast({
        title: "❌ Erreur de mise à jour",
        description: "Impossible de modifier le statut de l'agent",
        variant: "destructive"
      });
    }
  };

  const handleDeleteAgent = async (agentId: string) => {
    if (!window.confirm('⚠️ Êtes-vous sûr de vouloir supprimer cet agent ? Cette action est irréversible.')) return;

    try {
      await deleteAgent(agentId);
      toast({
        title: "✅ Agent supprimé",
        description: "L'agent a été retiré de votre équipe"
      });
    } catch (error) {
      toast({
        title: "❌ Erreur de suppression",
        description: "Impossible de supprimer l'agent",
        variant: "destructive"
      });
    }
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
      {error && (
        <Alert variant="destructive" className="border-red-200 bg-red-50">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription className="font-medium">{error}</AlertDescription>
        </Alert>
      )}

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
                Gérez votre équipe et leurs permissions • {agents.length} agent(s) actif(s)
              </p>
            </div>
          </div>
        </div>
        
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button className="bg-vendeur-gradient hover:shadow-glow transition-all duration-300">
              <UserPlus className="h-4 w-4 mr-2" />
              Nouvel Agent
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <UserPlus className="h-5 w-5" />
                Créer un nouvel agent
              </DialogTitle>
              <DialogDescription>
                Ajoutez un membre à votre équipe avec un rôle et des permissions spécifiques
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleCreateAgent} className="space-y-4">
              <div className="space-y-4">
                <div>
                  <Label htmlFor="user_id" className="text-sm font-medium">ID Utilisateur *</Label>
                  <Input
                    id="user_id"
                    placeholder="UUID de l'utilisateur à ajouter"
                    value={newAgent.user_id}
                    onChange={(e) => setNewAgent(prev => ({ ...prev, user_id: e.target.value }))}
                    className="mt-1"
                    required
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    L'identifiant unique de l'utilisateur dans le système
                  </p>
                </div>
                
                <div>
                  <Label htmlFor="role_id" className="text-sm font-medium">Rôle *</Label>
                  <Select 
                    value={newAgent.role_id} 
                    onValueChange={(value) => setNewAgent(prev => ({ ...prev, role_id: value }))}
                    required
                  >
                    <SelectTrigger className="mt-1">
                      <SelectValue placeholder="Sélectionner un rôle" />
                    </SelectTrigger>
                    <SelectContent>
                      {roles.map((role) => (
                        <SelectItem key={role.id} value={role.id}>
                          <div className="flex flex-col">
                            <span className="font-medium">{role.name}</span>
                            <span className="text-xs text-muted-foreground">{role.description}</span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              
              <DialogFooter className="mt-6">
                <Button type="button" variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                  Annuler
                </Button>
                <Button type="submit" className="bg-vendeur-gradient">
                  Créer l'Agent
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
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
                    <TableHead className="font-semibold">Rôle & Permissions</TableHead>
                    <TableHead className="font-semibold">Statut</TableHead>
                    <TableHead className="font-semibold">Membre depuis</TableHead>
                    <TableHead className="font-semibold text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {agents.map((agent) => (
                    <TableRow key={agent.id} className="hover:bg-vendeur-accent/20 transition-colors duration-200">
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-vendeur-gradient flex items-center justify-center text-white font-semibold">
                            {agent.user_id.substring(0, 2).toUpperCase()}
                          </div>
                          <div>
                            <p className="font-medium">Agent ID</p>
                            <p className="text-sm text-muted-foreground font-mono">
                              {agent.user_id.substring(0, 8)}...
                            </p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="space-y-1">
                          <Badge variant="outline" className="font-medium">
                            {agent.role?.name}
                          </Badge>
                          <p className="text-sm text-muted-foreground">
                            {agent.role?.description}
                          </p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge 
                          variant={agent.status === 'active' ? 'default' : 'secondary'}
                          className={agent.status === 'active' 
                            ? 'bg-vendeur-secondary/10 text-vendeur-secondary border-vendeur-secondary/20' 
                            : ''
                          }
                        >
                          {agent.status === 'active' ? '🟢 Actif' : '🔴 Inactif'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {new Date(agent.created_at).toLocaleDateString('fr-FR', {
                          day: 'numeric',
                          month: 'long',
                          year: 'numeric'
                        })}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex gap-2 justify-end">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleStatusUpdate(
                              agent.id, 
                              agent.status === 'active' ? 'inactive' : 'active'
                            )}
                            className="hover:shadow-glow transition-all duration-300"
                          >
                            {agent.status === 'active' ? 'Désactiver' : 'Activer'}
                          </Button>
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => handleDeleteAgent(agent.id)}
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

      {/* Rôles et Permissions - Style Moderne */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Rôles Disponibles */}
        <Card className="border-0 shadow-elegant">
          <CardHeader className="bg-vendeur-accent/30 border-b border-border">
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5 text-vendeur-primary" />
              Rôles Disponibles
            </CardTitle>
            <CardDescription>
              Cliquez sur un rôle pour voir ses permissions
            </CardDescription>
          </CardHeader>
          <CardContent className="p-6">
            <div className="space-y-3">
              {roles.map((role) => (
                <div 
                  key={role.id} 
                  className={`p-4 border-2 rounded-xl cursor-pointer transition-all duration-300 hover:shadow-glow ${
                    selectedRole === role.id 
                      ? 'border-vendeur-primary bg-vendeur-accent shadow-glow' 
                      : 'border-border hover:border-vendeur-primary/50 hover:bg-vendeur-accent/50'
                  }`}
                  onClick={() => setSelectedRole(selectedRole === role.id ? null : role.id)}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="font-semibold text-lg text-foreground">{role.name}</div>
                      <div className="text-sm text-muted-foreground mt-1">{role.description}</div>
                    </div>
                    <div className={`p-2 rounded-lg transition-colors duration-300 ${
                      selectedRole === role.id 
                        ? 'bg-vendeur-primary text-white' 
                        : 'bg-muted'
                    }`}>
                      <Settings className="h-4 w-4" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Permissions du Rôle Sélectionné */}
        {selectedRole && (
          <Card className="border-0 shadow-elegant">
            <CardHeader className="bg-vendeur-accent/30 border-b border-border">
              <CardTitle className="flex items-center gap-2">
                <Settings className="h-5 w-5 text-vendeur-primary" />
                Permissions du Rôle
              </CardTitle>
              <CardDescription>
                {roles.find(r => r.id === selectedRole)?.name} - Détails des autorisations
              </CardDescription>
            </CardHeader>
            <CardContent className="p-6">
              <div className="space-y-3">
                {getRolePermissions(selectedRole).length === 0 ? (
                  <div className="text-center py-8">
                    <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-muted flex items-center justify-center">
                      <Settings className="h-6 w-6 text-muted-foreground" />
                    </div>
                    <p className="text-muted-foreground">Aucune permission définie pour ce rôle</p>
                  </div>
                ) : (
                  getRolePermissions(selectedRole).map((permission) => (
                    <div 
                      key={permission.id}
                      className={`flex justify-between items-center p-4 rounded-xl border-2 transition-colors duration-300 ${
                        permission.allowed 
                          ? 'border-vendeur-secondary/20 bg-vendeur-secondary/5' 
                          : 'border-red-200 bg-red-50/50'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-lg ${
                          permission.allowed 
                            ? 'bg-vendeur-secondary/10' 
                            : 'bg-red-100'
                        }`}>
                          {permission.allowed ? (
                            <Shield className="h-4 w-4 text-vendeur-secondary" />
                          ) : (
                            <AlertTriangle className="h-4 w-4 text-red-600" />
                          )}
                        </div>
                        <span className="font-medium text-foreground">{permission.action}</span>
                      </div>
                      <Badge 
                        variant={permission.allowed ? 'default' : 'destructive'}
                        className={permission.allowed 
                          ? 'bg-vendeur-secondary/10 text-vendeur-secondary border-vendeur-secondary/20' 
                          : ''
                        }
                      >
                        {permission.allowed ? '✅ Autorisé' : '🚫 Interdit'}
                      </Badge>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
        </TabsContent>

        <TabsContent value="communication" className="space-y-6">
          <SimpleCommunicationInterface />
        </TabsContent>
      </Tabs>
    </div>
  );
}