import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Checkbox } from '@/components/ui/checkbox';
import { UserCheck, Search, Ban, Trash2, Plus, Mail, Edit, Users, TrendingUp } from 'lucide-react';
import { toast } from 'sonner';
import { useAgentSubAgentsData, type SubAgent } from '@/hooks/useAgentSubAgentsData';
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

export default function AgentSubAgentsManagement() {
  const { subAgents, agentProfile, loading, stats, createSubAgent, updateSubAgent, deleteSubAgent, toggleSubAgentStatus } = useAgentSubAgentsData();
  const [searchTerm, setSearchTerm] = useState('');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editingSubAgent, setEditingSubAgent] = useState<SubAgent | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    commission_rate: 5,
    permissions: {
      create_users: true,
      view_reports: false,
      manage_commissions: false,
      manage_users: false,
      manage_products: false
    }
  });

  const handleCreateSubAgent = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!agentProfile) {
      toast.error('Profil agent manquant');
      return;
    }

    // Validation des données
    const validationResult = subAgentSchema.safeParse({
      name: formData.name,
      email: formData.email,
      phone: formData.phone,
      commission_rate: formData.commission_rate
    });

    if (!validationResult.success) {
      const firstError = validationResult.error.issues[0];
      toast.error(firstError.message);
      return;
    }

    try {
      setIsSubmitting(true);
      
      const permissions = Object.entries(formData.permissions)
        .filter(([_, value]) => value)
        .map(([key]) => key);

      if (editingSubAgent) {
        // Mode édition
        await updateSubAgent(editingSubAgent.id, {
          name: formData.name.trim(),
          email: formData.email.trim().toLowerCase(),
          phone: formData.phone.trim(),
          permissions,
          commission_rate: formData.commission_rate,
        });
      } else {
        // Mode création
        await createSubAgent({
          name: formData.name,
          email: formData.email,
          phone: formData.phone,
          permissions,
          commission_rate: formData.commission_rate,
        });
      }

      // Réinitialiser le formulaire
      setFormData({
        name: '',
        email: '',
        phone: '',
        commission_rate: 5,
        permissions: {
          create_users: true,
          view_reports: false,
          manage_commissions: false,
          manage_users: false,
          manage_products: false
        }
      });
      setEditingSubAgent(null);
      setIsDialogOpen(false);
    } catch (error: any) {
      console.error('Erreur:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEditSubAgent = (subAgent: SubAgent) => {
    setEditingSubAgent(subAgent);
    setFormData({
      name: subAgent.name,
      email: subAgent.email,
      phone: subAgent.phone || '',
      commission_rate: subAgent.commission_rate,
      permissions: {
        create_users: subAgent.permissions.includes('create_users'),
        view_reports: subAgent.permissions.includes('view_reports'),
        manage_commissions: subAgent.permissions.includes('manage_commissions'),
        manage_users: subAgent.permissions.includes('manage_users'),
        manage_products: subAgent.permissions.includes('manage_products')
      }
    });
    setIsDialogOpen(true);
  };

  const handleSubAgentAction = async (subAgentId: string, action: 'activate' | 'suspend' | 'delete') => {
    if (action === 'delete') {
      if (!confirm('Êtes-vous sûr de vouloir désactiver ce sous-agent ?')) return;
      await deleteSubAgent(subAgentId);
    } else if (action === 'suspend') {
      await toggleSubAgentStatus(subAgentId, false);
    } else if (action === 'activate') {
      await toggleSubAgentStatus(subAgentId, true);
    }
  };

  const filteredSubAgents = subAgents.filter(subAgent =>
    subAgent.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    subAgent.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    subAgent.agent_code.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!agentProfile?.can_create_sub_agent) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <Users className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
          <p className="text-muted-foreground">
            Vous n'avez pas la permission de gérer des sous-agents
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* En-tête */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Gestion des Sous-Agents</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Créez et gérez vos sous-agents
          </p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={(open) => {
          setIsDialogOpen(open);
          if (!open) {
            setEditingSubAgent(null);
            setFormData({
              name: '',
              email: '',
              phone: '',
              commission_rate: 5,
              permissions: {
                create_users: true,
                view_reports: false,
                manage_commissions: false,
                manage_users: false,
                manage_products: false
              }
            });
          }
        }}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="w-4 h-4 mr-2" />
              Créer un Sous-Agent
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {editingSubAgent ? 'Modifier le Sous-Agent' : 'Créer un Sous-Agent'}
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={handleCreateSubAgent} className="space-y-4">
              
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
                <Label htmlFor="email">Email *</Label>
                <Input
                  id="email"
                  type="email"
                  required
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder="agent@exemple.com"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="phone">Téléphone *</Label>
                <Input
                  id="phone"
                  required
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
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
                      id="view_reports"
                      checked={formData.permissions.view_reports}
                      onCheckedChange={(checked) => setFormData({
                        ...formData,
                        permissions: { ...formData.permissions, view_reports: checked as boolean }
                      })}
                    />
                    <label htmlFor="view_reports" className="text-sm">Voir les rapports</label>
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
                      {editingSubAgent ? 'Modification...' : 'Création...'}
                    </>
                  ) : editingSubAgent ? (
                    <>
                      <Edit className="w-4 h-4 mr-2" />
                      Modifier
                    </>
                  ) : (
                    <>
                      <Plus className="w-4 h-4 mr-2" />
                      Créer
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
              Total Sous-Agents
            </CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalSubAgents}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {stats.activeSubAgents} actifs
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Sous-Agents Actifs
            </CardTitle>
            <UserCheck className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{stats.activeSubAgents}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {stats.inactiveSubAgents} inactifs
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
      </div>

      {/* Barre de recherche */}
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
          <Input
            placeholder="Rechercher un sous-agent..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      {/* Liste des sous-agents */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredSubAgents.map((subAgent) => (
          <Card key={subAgent.id}>
            <CardContent className="p-6">
              <div className="space-y-4">
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <h3 className="font-semibold">{subAgent.name}</h3>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Mail className="w-3.5 h-3.5" />
                      {subAgent.email}
                    </div>
                    <p className="text-sm font-mono text-muted-foreground">
                      {subAgent.agent_code}
                    </p>
                  </div>
                  <Badge variant={subAgent.is_active ? 'default' : 'secondary'}>
                    {subAgent.is_active ? 'Actif' : 'Inactif'}
                  </Badge>
                </div>

                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Commission:</span>
                    <span className="font-medium">{subAgent.commission_rate}%</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Utilisateurs créés:</span>
                    <span className="font-medium">{subAgent.total_users_created || 0}</span>
                  </div>
                </div>

                <div className="pt-3 flex gap-2 border-t">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleEditSubAgent(subAgent)}
                    className="flex-1"
                  >
                    <Edit className="w-4 h-4 mr-1" />
                    Modifier
                  </Button>
                  {subAgent.is_active ? (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleSubAgentAction(subAgent.id, 'suspend')}
                      className="flex-1"
                    >
                      <Ban className="w-4 h-4 mr-1" />
                      Suspendre
                    </Button>
                  ) : (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleSubAgentAction(subAgent.id, 'activate')}
                      className="flex-1"
                    >
                      <UserCheck className="w-4 h-4 mr-1" />
                      Activer
                    </Button>
                  )}
                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={() => handleSubAgentAction(subAgent.id, 'delete')}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {filteredSubAgents.length === 0 && (
        <Card>
          <CardContent className="py-12 text-center">
            <Users className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">
              {searchTerm ? 'Aucun sous-agent trouvé' : 'Aucun sous-agent pour le moment'}
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
