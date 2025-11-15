import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { Users, Search, RefreshCw } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';

interface UserProfile {
  id: string;
  email: string;
  first_name: string | null;
  last_name: string | null;
  role: string;
  phone: string | null;
  created_at: string;
}

export default function PDGUsersManagement() {
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [stats, setStats] = useState({
    total: 0,
    admins: 0,
    vendeurs: 0,
    clients: 0,
    livreurs: 0,
  });

  const loadUsers = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, email, first_name, last_name, role, phone, created_at')
        .order('created_at', { ascending: false });

      if (error) throw error;

      const userList = data || [];
      setUsers(userList);
      setFilteredUsers(userList);

      // Calculate stats
      setStats({
        total: userList.length,
        admins: userList.filter(u => u.role === 'admin').length,
        vendeurs: userList.filter(u => u.role === 'vendeur').length,
        clients: userList.filter(u => u.role === 'client').length,
        livreurs: userList.filter(u => u.role === 'livreur').length,
      });
    } catch (error: any) {
      console.error('Erreur chargement utilisateurs:', error);
      toast.error('Impossible de charger les utilisateurs');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadUsers();
  }, []);

  useEffect(() => {
    if (searchQuery) {
      const filtered = users.filter(user => 
        user.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        user.first_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        user.last_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        user.phone?.includes(searchQuery)
      );
      setFilteredUsers(filtered);
    } else {
      setFilteredUsers(users);
    }
  }, [searchQuery, users]);

  const getRoleBadge = (role: string) => {
    switch (role) {
      case 'admin':
        return <Badge variant="destructive">Admin</Badge>;
      case 'vendeur':
        return <Badge className="bg-blue-500">Vendeur</Badge>;
      case 'client':
        return <Badge className="bg-green-500">Client</Badge>;
      case 'livreur':
        return <Badge className="bg-purple-500">Livreur</Badge>;
      default:
        return <Badge variant="outline">{role}</Badge>;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="flex items-center gap-3">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
          <span className="text-muted-foreground">Chargement des utilisateurs...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Users className="w-6 h-6" />
            Gestion des Utilisateurs
          </h2>
          <p className="text-muted-foreground mt-1">
            {stats.total} utilisateurs • {stats.vendeurs} vendeurs • {stats.clients} clients
          </p>
        </div>
        <Button onClick={loadUsers} variant="outline" size="sm">
          <RefreshCw className="w-4 h-4 mr-2" />
          Actualiser
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Admins</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{stats.admins}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Vendeurs</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{stats.vendeurs}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Clients</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{stats.clients}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Livreurs</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-600">{stats.livreurs}</div>
          </CardContent>
        </Card>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="Rechercher par email, nom, téléphone..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Users List */}
      <ScrollArea className="h-[500px]">
        <div className="space-y-3">
          {filteredUsers.map((user) => (
            <Card key={user.id}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base">
                    {user.first_name || user.last_name 
                      ? `${user.first_name || ''} ${user.last_name || ''}`.trim()
                      : user.email
                    }
                  </CardTitle>
                  {getRoleBadge(user.role)}
                </div>
                <CardDescription>
                  ID: {user.id.slice(0, 8)}...
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-1 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Email:</span>
                    <span className="font-mono text-xs">{user.email}</span>
                  </div>
                  {user.phone && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Téléphone:</span>
                      <span>{user.phone}</span>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Inscrit le:</span>
                    <span>{new Date(user.created_at).toLocaleDateString('fr-FR')}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}

          {filteredUsers.length === 0 && (
            <Card>
              <CardContent className="pt-6 text-center text-muted-foreground">
                Aucun utilisateur trouvé
              </CardContent>
            </Card>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
