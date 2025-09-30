import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { Search, UserCheck, UserX, Lock, Unlock, Shield } from 'lucide-react';
import { toast } from 'sonner';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

export default function PDGUsers() {
  const [users, setUsers] = useState<any[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');

  useEffect(() => {
    loadUsers();
  }, []);

  useEffect(() => {
    filterUsers();
  }, [searchTerm, roleFilter, users]);

  const loadUsers = async () => {
    setLoading(true);
    try {
      const { data: profiles } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false });

      setUsers(profiles || []);
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

  const getRoleBadge = (role: string) => {
    const colors = {
      admin: 'bg-red-500/20 text-red-300 border-red-500/30',
      vendeur: 'bg-blue-500/20 text-blue-300 border-blue-500/30',
      client: 'bg-green-500/20 text-green-300 border-green-500/30',
      livreur: 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30',
      taxi: 'bg-purple-500/20 text-purple-300 border-purple-500/30',
      transitaire: 'bg-orange-500/20 text-orange-300 border-orange-500/30',
      syndicat: 'bg-pink-500/20 text-pink-300 border-pink-500/30'
    };
    return colors[role as keyof typeof colors] || 'bg-slate-500/20 text-slate-300';
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
      {/* Filters */}
      <Card className="bg-slate-800/50 border-slate-700">
        <CardHeader>
          <CardTitle className="text-white">Gestion des Utilisateurs</CardTitle>
          <CardDescription>Total: {filteredUsers.length} utilisateurs</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
                <Input
                  placeholder="Rechercher par email, nom..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 bg-slate-700 border-slate-600 text-white"
                />
              </div>
            </div>
            <Select value={roleFilter} onValueChange={setRoleFilter}>
              <SelectTrigger className="w-48 bg-slate-700 border-slate-600 text-white">
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
        {filteredUsers.map((user) => (
          <Card key={user.id} className="bg-slate-800/50 border-slate-700">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-full bg-gradient-to-br from-primary to-primary/50 flex items-center justify-center">
                    <Shield className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h3 className="text-white font-semibold">
                      {user.first_name} {user.last_name}
                    </h3>
                    <p className="text-sm text-slate-400">{user.email}</p>
                    <div className="flex gap-2 mt-2">
                      <Badge className={getRoleBadge(user.role)}>
                        {user.role}
                      </Badge>
                      <Badge className={user.is_active ? 'bg-green-500/20 text-green-300' : 'bg-red-500/20 text-red-300'}>
                        {user.is_active ? 'Actif' : 'Suspendu'}
                      </Badge>
                    </div>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => toggleUserStatus(user.id, user.is_active)}
                    className={user.is_active ? 'border-red-500/50 hover:bg-red-500/10' : 'border-green-500/50 hover:bg-green-500/10'}
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
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {filteredUsers.length === 0 && (
        <Card className="bg-slate-800/50 border-slate-700">
          <CardContent className="p-12 text-center">
            <p className="text-slate-400">Aucun utilisateur trouvé</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
