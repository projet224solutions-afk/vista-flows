import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Users, UserPlus, Shield, Settings } from 'lucide-react';
import { useAgentManagement } from '@/hooks/useAgentManagement';
import { useToast } from '@/hooks/use-toast';

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
        title: "Agent créé",
        description: "L'agent a été ajouté avec succès"
      });
      setIsCreateDialogOpen(false);
      setNewAgent({ user_id: '', role_id: '' });
    } catch (error) {
      toast({
        title: "Erreur",
        description: "Impossible de créer l'agent",
        variant: "destructive"
      });
    }
  };

  const handleStatusUpdate = async (agentId: string, status: 'active' | 'inactive') => {
    try {
      await updateAgentStatus(agentId, status);
      toast({
        title: "Statut mis à jour",
        description: `L'agent a été ${status === 'active' ? 'activé' : 'désactivé'}`
      });
    } catch (error) {
      toast({
        title: "Erreur",
        description: "Impossible de mettre à jour le statut",
        variant: "destructive"
      });
    }
  };

  const handleDeleteAgent = async (agentId: string) => {
    if (!window.confirm('Êtes-vous sûr de vouloir supprimer cet agent ?')) return;

    try {
      await deleteAgent(agentId);
      toast({
        title: "Agent supprimé",
        description: "L'agent a été supprimé avec succès"
      });
    } catch (error) {
      toast({
        title: "Erreur",
        description: "Impossible de supprimer l'agent",
        variant: "destructive"
      });
    }
  };

  if (loading) {
    return <div className="flex justify-center p-8">Chargement...</div>;
  }

  return (
    <div className="space-y-6">
      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Users className="h-6 w-6" />
            Gestion des Agents
          </h1>
          <p className="text-muted-foreground">
            Gérez les agents et leurs permissions dans votre équipe
          </p>
        </div>
        
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <UserPlus className="h-4 w-4 mr-2" />
              Nouvel Agent
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Créer un nouvel agent</DialogTitle>
              <DialogDescription>
                Ajoutez un nouveau membre à votre équipe avec un rôle spécifique
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleCreateAgent}>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="user_id">ID Utilisateur</Label>
                  <Input
                    id="user_id"
                    placeholder="UUID de l'utilisateur"
                    value={newAgent.user_id}
                    onChange={(e) => setNewAgent(prev => ({ ...prev, user_id: e.target.value }))}
                    required
                  />
                </div>
                
                <div>
                  <Label htmlFor="role_id">Rôle</Label>
                  <Select 
                    value={newAgent.role_id} 
                    onValueChange={(value) => setNewAgent(prev => ({ ...prev, role_id: value }))}
                    required
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Choisir un rôle" />
                    </SelectTrigger>
                    <SelectContent>
                      {roles.map((role) => (
                        <SelectItem key={role.id} value={role.id}>
                          {role.name} - {role.description}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              
              <DialogFooter className="mt-4">
                <Button type="button" variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                  Annuler
                </Button>
                <Button type="submit">Créer</Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Agents List */}
      <Card>
        <CardHeader>
          <CardTitle>Liste des Agents</CardTitle>
          <CardDescription>
            {agents.length} agent(s) dans votre équipe
          </CardDescription>
        </CardHeader>
        <CardContent>
          {agents.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>Aucun agent trouvé</p>
              <p className="text-sm">Commencez par ajouter votre premier agent</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>ID Utilisateur</TableHead>
                  <TableHead>Rôle</TableHead>
                  <TableHead>Statut</TableHead>
                  <TableHead>Créé le</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {agents.map((agent) => (
                  <TableRow key={agent.id}>
                    <TableCell className="font-mono text-sm">
                      {agent.user_id.substring(0, 8)}...
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary">
                        {agent.role?.name}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge 
                        variant={agent.status === 'active' ? 'default' : 'secondary'}
                      >
                        {agent.status === 'active' ? 'Actif' : 'Inactif'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {new Date(agent.created_at).toLocaleDateString()}
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleStatusUpdate(
                            agent.id, 
                            agent.status === 'active' ? 'inactive' : 'active'
                          )}
                        >
                          {agent.status === 'active' ? 'Désactiver' : 'Activer'}
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => handleDeleteAgent(agent.id)}
                        >
                          Supprimer
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Roles and Permissions */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5" />
              Rôles Disponibles
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {roles.map((role) => (
                <div 
                  key={role.id} 
                  className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                    selectedRole === role.id ? 'bg-primary/10 border-primary' : 'hover:bg-muted'
                  }`}
                  onClick={() => setSelectedRole(selectedRole === role.id ? null : role.id)}
                >
                  <div className="font-medium">{role.name}</div>
                  <div className="text-sm text-muted-foreground">{role.description}</div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {selectedRole && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="h-5 w-5" />
                Permissions
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {getRolePermissions(selectedRole).map((permission) => (
                  <div 
                    key={permission.id}
                    className="flex justify-between items-center p-2 border rounded"
                  >
                    <span className="text-sm">{permission.action}</span>
                    <Badge variant={permission.allowed ? 'default' : 'secondary'}>
                      {permission.allowed ? 'Autorisé' : 'Interdit'}
                    </Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}