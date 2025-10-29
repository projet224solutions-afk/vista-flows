import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Search, UserCheck, UserX, Shield, Lock, Unlock, Trash2, Mail, Phone, Calendar } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';

interface User {
  id: string;
  email: string;
  first_name?: string;
  last_name?: string;
  phone?: string;
  role: string;
  created_at: string;
  is_active?: boolean;
}

interface ManageUsersSectionProps {
  agentId: string;
}

export function ManageUsersSection({ agentId }: ManageUsersSectionProps) {
  const [users, setUsers] = useState<User[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');

  // Écouter les changements dans agent_created_users pour recharger en temps réel
  useEffect(() => {
    if (!agentId) return;

    // Charger les utilisateurs au montage
    loadUsers();

    const channel = supabase
      .channel('agent-users-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'agent_created_users',
          filter: `agent_id=eq.${agentId}`
        },
        (payload) => {
          console.log('Changement détecté dans agent_created_users:', payload);
          // Recharger les utilisateurs après un court délai pour laisser le profil se créer
          setTimeout(() => {
            loadUsers();
          }, 500);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [agentId]);

  useEffect(() => {
    filterUsers();
  }, [searchTerm, roleFilter, users]);

  const loadUsers = async () => {
    try {
      setLoading(true);

      // Extraire le token de l'URL
      const currentPath = window.location.pathname;
      const tokenMatch = currentPath.match(/\/agent\/([^\/]+)/);
      const agentToken = tokenMatch ? tokenMatch[1] : null;

      if (!agentToken) {
        toast.error('Token agent introuvable');
        return;
      }

      // Appeler la Edge Function pour récupérer les utilisateurs
      const { data, error } = await supabase.functions.invoke('get-agent-users', {
        body: { agentToken }
      });

      if (error) throw error;

      setUsers(data.users || []);
      toast.success(`${data.users?.length || 0} utilisateurs chargés`);
    } catch (error) {
      console.error('Erreur chargement utilisateurs:', error);
      toast.error('Erreur lors du chargement des utilisateurs');
    } finally {
      setLoading(false);
    }
  };

  const filterUsers = () => {
    let filtered = users;

    if (searchTerm) {
      filtered = filtered.filter(u => 
        u.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        u.first_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        u.last_name?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    if (roleFilter !== 'all') {
      filtered = filtered.filter(u => u.role === roleFilter);
    }

    setFilteredUsers(filtered);
  };

  const getAgentToken = () => {
    const currentPath = window.location.pathname;
    const tokenMatch = currentPath.match(/\/agent\/([^\/]+)/);
    return tokenMatch ? tokenMatch[1] : null;
  };

  const toggleUserStatus = async (userId: string, currentStatus: boolean) => {
    try {
      const agentToken = getAgentToken();
      if (!agentToken) {
        toast.error('Token agent introuvable');
        return;
      }

      const { data, error } = await supabase.functions.invoke('agent-toggle-user-status', {
        body: { agentToken, userId, currentStatus }
      });

      if (error) throw error;

      toast.success(currentStatus ? 'Utilisateur suspendu' : 'Utilisateur activé');
      loadUsers();
    } catch (error) {
      console.error('Erreur:', error);
      toast.error('Erreur lors de la modification du statut');
    }
  };

  const deleteUser = async (userId: string, userEmail: string) => {
    try {
      const agentToken = getAgentToken();
      if (!agentToken) {
        toast.error('Token agent introuvable');
        return;
      }

      const { data, error } = await supabase.functions.invoke('agent-delete-user', {
        body: { agentToken, userId }
      });

      if (error) throw error;

      toast.success(`Utilisateur ${userEmail} supprimé avec succès`);
      loadUsers();
    } catch (error) {
      console.error('Erreur:', error);
      toast.error('Erreur lors de la suppression de l\'utilisateur');
    }
  };

  const getRoleBadge = (role: string) => {
    const colors = {
      admin: 'bg-red-500/10 text-red-500 border-red-500/20',
      vendeur: 'bg-blue-500/10 text-blue-500 border-blue-500/20',
      client: 'bg-green-500/10 text-green-500 border-green-500/20',
      livreur: 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20',
      taxi: 'bg-purple-500/10 text-purple-500 border-purple-500/20',
      transitaire: 'bg-orange-500/10 text-orange-500 border-orange-500/20',
      syndicat: 'bg-pink-500/10 text-pink-500 border-pink-500/20'
    };
    return colors[role as keyof typeof colors] || 'bg-muted text-muted-foreground';
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
            <p className="text-sm text-muted-foreground mt-2">Chargement...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="border-border/40 bg-card/50 backdrop-blur-sm">
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                <UserCheck className="w-6 h-6 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold">{users.filter(u => u.is_active !== false).length}</p>
                <p className="text-sm text-muted-foreground">Utilisateurs Actifs</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/40 bg-card/50 backdrop-blur-sm">
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-orange-500/10 flex items-center justify-center">
                <UserX className="w-6 h-6 text-orange-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{users.filter(u => u.is_active === false).length}</p>
                <p className="text-sm text-muted-foreground">Utilisateurs Suspendus</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/40 bg-card/50 backdrop-blur-sm">
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-blue-500/10 flex items-center justify-center">
                <Shield className="w-6 h-6 text-blue-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{users.length}</p>
                <p className="text-sm text-muted-foreground">Total Utilisateurs</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card className="border-border/40 bg-card/50 backdrop-blur-sm">
        <CardHeader>
          <CardTitle>Gestion des Utilisateurs</CardTitle>
          <CardDescription>Recherche et filtrage</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Rechercher par email, nom..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 bg-background"
                />
              </div>
            </div>
            <Select value={roleFilter} onValueChange={setRoleFilter}>
              <SelectTrigger className="w-48 bg-background">
                <SelectValue placeholder="Filtrer par rôle" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tous les rôles</SelectItem>
                <SelectItem value="admin">Admin</SelectItem>
                <SelectItem value="vendeur">Vendeur</SelectItem>
                <SelectItem value="client">Client</SelectItem>
                <SelectItem value="livreur">Livreur</SelectItem>
                <SelectItem value="taxi">Taxi</SelectItem>
                <SelectItem value="transitaire">Transitaire</SelectItem>
                <SelectItem value="syndicat">Syndicat</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Users List */}
      <div className="grid gap-4">
        {filteredUsers.map((user, index) => (
          <Card 
            key={user.id} 
            className="border-border/40 bg-card/50 backdrop-blur-sm hover:shadow-xl transition-all duration-200 animate-fade-in"
            style={{ animationDelay: `${index * 30}ms` }}
          >
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="relative">
                    <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-primary to-primary/60 flex items-center justify-center shadow-lg">
                      <Shield className="w-7 h-7 text-primary-foreground" />
                    </div>
                    {user.is_active !== false && (
                      <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-green-500 rounded-full border-2 border-card" />
                    )}
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold">
                      {user.first_name || user.last_name 
                        ? `${user.first_name || ''} ${user.last_name || ''}`.trim()
                        : 'Sans nom'}
                    </h3>
                    <p className="text-sm text-muted-foreground">{user.email}</p>
                    <div className="flex gap-2 mt-2">
                      <Badge variant="outline" className={getRoleBadge(user.role)}>
                        {user.role || 'client'}
                      </Badge>
                      <Badge variant="outline" className={user.is_active !== false ? 'border-green-500/50 bg-green-500/10 text-green-500' : 'border-red-500/50 bg-red-500/10 text-red-500'}>
                        {user.is_active !== false ? 'Actif' : 'Suspendu'}
                      </Badge>
                    </div>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => toggleUserStatus(user.id, user.is_active !== false)}
                    className={user.is_active !== false ? 'border-red-500/50 hover:bg-red-500/10 hover:text-red-500' : 'border-green-500/50 hover:bg-green-500/10 hover:text-green-500'}
                  >
                    {user.is_active !== false ? (
                      <>
                        <Lock className="w-4 h-4 mr-2" />
                        Suspendre
                      </>
                    ) : (
                      <>
                        <Unlock className="w-4 h-4 mr-2" />
                        Activer
                      </>
                    )}
                  </Button>
                  
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button
                        variant="outline"
                        size="sm"
                        className="border-red-500/50 hover:bg-red-500/10 hover:text-red-500"
                      >
                        <Trash2 className="w-4 h-4 mr-2" />
                        Supprimer
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Confirmer la suppression</AlertDialogTitle>
                        <AlertDialogDescription>
                          Êtes-vous sûr de vouloir supprimer l'utilisateur <strong>{user.email}</strong> ?
                          Cette action est irréversible et supprimera toutes les données associées.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Annuler</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={() => deleteUser(user.id, user.email)}
                          className="bg-red-500 hover:bg-red-600"
                        >
                          Supprimer définitivement
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {filteredUsers.length === 0 && (
        <Card className="border-border/40 bg-card/50 backdrop-blur-sm">
          <CardContent className="p-12 text-center">
            <p className="text-muted-foreground">Aucun utilisateur trouvé</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
