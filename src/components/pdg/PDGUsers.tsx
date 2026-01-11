// @ts-nocheck
import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { Search, UserCheck, UserX, Lock, Unlock, Shield, Trash2, Store, Package, Eye, ChevronDown, ChevronUp } from 'lucide-react';
import { toast } from 'sonner';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
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

export default function PDGUsers() {
  const [users, setUsers] = useState<unknown[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<unknown[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [userServices, setUserServices] = useState<Record<string, any[]>>({});
  const [expandedUsers, setExpandedUsers] = useState<Set<string>>(new Set());

  useEffect(() => {
    loadUsers();
  }, []);

  useEffect(() => {
    filterUsers();
  }, [searchTerm, roleFilter, users]);

  const loadUsers = async () => {
    setLoading(true);
    try {
      // Charger les profils avec leur public_id standardisé
      const { data: profiles, error } = await supabase
        .from('profiles')
        .select('id, first_name, last_name, email, role, is_active, status, public_id, created_at')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setUsers(profiles || []);

      // Charger les services professionnels pour chaque vendeur
      const vendorIds = profiles?.filter(p => p.role === 'vendeur').map(p => p.id) || [];
      if (vendorIds.length > 0) {
        const { data: services } = await supabase
          .from('professional_services')
          .select(`
            id,
            user_id,
            business_name,
            status,
            created_at,
            rating,
            total_reviews,
            address,
            phone,
            service_types(name, code)
          `)
          .in('user_id', vendorIds);

        // Grouper les services par user_id
        const servicesMap: Record<string, any[]> = {};
        services?.forEach(service => {
          if (!servicesMap[service.user_id]) {
            servicesMap[service.user_id] = [];
          }
          servicesMap[service.user_id].push(service);
        });
        setUserServices(servicesMap);
      }
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
      const search = searchTerm.toLowerCase();
      filtered = filtered.filter(u => 
        u.email?.toLowerCase().includes(search) ||
        u.first_name?.toLowerCase().includes(search) ||
        u.last_name?.toLowerCase().includes(search) ||
        u.public_id?.toLowerCase().includes(search)
      );
    }

    if (roleFilter !== 'all') {
      filtered = filtered.filter(u => u.role === roleFilter);
    }

    setFilteredUsers(filtered);
  };

  const toggleUserStatus = async (userId: string, currentStatus: boolean) => {
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ is_active: !currentStatus })
        .eq('id', userId);

      if (error) throw error;

      // Log action
      await supabase.from('audit_logs').insert({
        actor_id: (await supabase.auth.getUser()).data.user?.id,
        action: currentStatus ? 'USER_SUSPENDED' : 'USER_ACTIVATED',
        target_type: 'user',
        target_id: userId
      });

      toast.success(currentStatus ? 'Utilisateur suspendu' : 'Utilisateur activé');
      loadUsers();
    } catch (error) {
      toast.error('Erreur lors de la modification du statut');
    }
  };

  const deleteUser = async (userId: string, userEmail: string) => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        toast.error('Session expirée, veuillez vous reconnecter');
        return;
      }

      const { data, error } = await supabase.functions.invoke('delete-user', {
        body: { userId },
        headers: {
          Authorization: `Bearer ${session.access_token}`
        }
      });

      if (error) {
        console.error('Erreur suppression:', error);
        throw error;
      }

      if (!data?.success) {
        throw new Error(data?.error || 'Échec de la suppression');
      }

      toast.success(`Utilisateur ${userEmail} supprimé avec succès`);
      loadUsers();
    } catch (error: any) {
      console.error('Erreur suppression utilisateur:', error);
      toast.error(error.message || 'Erreur lors de la suppression de l\'utilisateur');
    }
  };

  const toggleUserExpanded = (userId: string) => {
    const newExpanded = new Set(expandedUsers);
    if (newExpanded.has(userId)) {
      newExpanded.delete(userId);
    } else {
      newExpanded.add(userId);
    }
    setExpandedUsers(newExpanded);
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
      <div className="flex items-center justify-center p-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
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
                <p className="text-2xl font-bold">{users.filter(u => u.is_active).length}</p>
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
                <p className="text-2xl font-bold">{users.filter(u => !u.is_active).length}</p>
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
                <div className="flex items-center gap-4 flex-1">
                  <div className="relative">
                    <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-primary to-primary/60 flex items-center justify-center shadow-lg">
                      <Shield className="w-7 h-7 text-primary-foreground" />
                    </div>
                    {user.is_active && (
                      <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-green-500 rounded-full border-2 border-card" />
                    )}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <h3 className="text-lg font-semibold">
                        {user.first_name} {user.last_name}
                      </h3>
                      {user.role === 'vendeur' && userServices[user.id] && (
                        <Badge variant="outline" className="bg-blue-500/10 text-blue-500 border-blue-500/30">
                          <Store className="w-3 h-3 mr-1" />
                          {userServices[user.id].length} service(s)
                        </Badge>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground">{user.email}</p>
                    <div className="flex flex-wrap gap-2 mt-2">
                      {user.public_id && (
                        <Badge variant="outline" className="font-mono bg-primary/10 text-primary border-primary/30">
                          {user.public_id}
                        </Badge>
                      )}
                      <Badge variant="outline" className={getRoleBadge(user.role)}>
                        {user.role}
                      </Badge>
                      <Badge variant="outline" className={user.is_active ? 'border-green-500/50 bg-green-500/10 text-green-500' : 'border-red-500/50 bg-red-500/10 text-red-500'}>
                        {user.is_active ? 'Actif' : 'Suspendu'}
                      </Badge>
                    </div>
                  </div>
                </div>
                <div className="flex gap-2">
                  {user.role === 'vendeur' && userServices[user.id] && userServices[user.id].length > 0 && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => toggleUserExpanded(user.id)}
                      className="border-blue-500/50 hover:bg-blue-500/10 hover:text-blue-500"
                    >
                      {expandedUsers.has(user.id) ? (
                        <>
                          <ChevronUp className="w-4 h-4 mr-2" />
                          Masquer
                        </>
                      ) : (
                        <>
                          <Eye className="w-4 h-4 mr-2" />
                          Services
                        </>
                      )}
                    </Button>
                  )}
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => toggleUserStatus(user.id, user.is_active)}
                    className={user.is_active ? 'border-red-500/50 hover:bg-red-500/10 hover:text-red-500' : 'border-green-500/50 hover:bg-green-500/10 hover:text-green-500'}
                  >
                    {user.is_active ? (
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

              {/* Section des services (affichée si étendue) */}
              {user.role === 'vendeur' && expandedUsers.has(user.id) && userServices[user.id] && (
                <div className="mt-4 pt-4 border-t border-border/40">
                  <h4 className="text-sm font-semibold mb-3 flex items-center gap-2">
                    <Store className="w-4 h-4" />
                    Services professionnels ({userServices[user.id].length})
                  </h4>
                  <div className="grid gap-3">
                    {userServices[user.id].map((service) => (
                      <div 
                        key={service.id}
                        className="p-4 rounded-lg border border-border/40 bg-muted/30 hover:bg-muted/50 transition-colors"
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              <h5 className="font-semibold text-sm">{service.business_name}</h5>
                              <Badge 
                                variant="outline" 
                                className={
                                  service.status === 'active' 
                                    ? 'border-green-500/50 bg-green-500/10 text-green-500 text-xs' 
                                    : service.status === 'pending'
                                    ? 'border-yellow-500/50 bg-yellow-500/10 text-yellow-500 text-xs'
                                    : 'border-red-500/50 bg-red-500/10 text-red-500 text-xs'
                                }
                              >
                                {service.status}
                              </Badge>
                              {service.service_types && (
                                <Badge variant="outline" className="text-xs bg-blue-500/10 text-blue-500 border-blue-500/30">
                                  {service.service_types.name}
                                </Badge>
                              )}
                            </div>
                            
                            <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground">
                              <div className="flex items-center gap-1">
                                <Package className="w-3 h-3" />
                                <span>ID: {service.id.substring(0, 8)}...</span>
                              </div>
                              {service.phone && (
                                <div className="flex items-center gap-1">
                                  <span>📞 {service.phone}</span>
                                </div>
                              )}
                              {service.address && (
                                <div className="col-span-2 flex items-center gap-1">
                                  <span>📍 {service.address}</span>
                                </div>
                              )}
                              {service.rating > 0 && (
                                <div className="flex items-center gap-1">
                                  <span>⭐ {service.rating.toFixed(1)} ({service.total_reviews || 0} avis)</span>
                                </div>
                              )}
                              <div className="flex items-center gap-1">
                                <span>📅 Créé le {new Date(service.created_at).toLocaleDateString('fr-FR')}</span>
                              </div>
                            </div>
                          </div>
                          
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              // Copier l'ID du service
                              navigator.clipboard.writeText(service.id);
                              toast.success('ID du service copié');
                            }}
                            className="ml-2"
                          >
                            <Eye className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
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
