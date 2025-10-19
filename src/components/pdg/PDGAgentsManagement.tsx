import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { UserCheck, Search, Eye, Ban, Trash2, Plus } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';

interface Agent {
  id: string;
  name: string;
  email: string;
  phone?: string;
  role: string;
  commission_rate: number;
  is_active: boolean;
  created_at: string;
}

export default function PDGAgentsManagement() {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    loadAgents();
  }, []);

  const loadAgents = async () => {
    try {
      const { data, error } = await supabase
        .from('agents_management')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setAgents(data || []);
    } catch (error) {
      console.error('Erreur chargement agents:', error);
      toast.error('Erreur lors du chargement des agents');
    } finally {
      setLoading(false);
    }
  };

  const handleAgentAction = async (agentId: string, action: 'activate' | 'suspend' | 'delete') => {
    try {
      if (action === 'delete') {
        const { error } = await supabase
          .from('agents_management')
          .delete()
          .eq('id', agentId);
        if (error) throw error;
        toast.success('Agent supprimé');
      } else {
        const { error } = await supabase
          .from('agents_management')
          .update({ is_active: action === 'activate' })
          .eq('id', agentId);
        if (error) throw error;
        toast.success(`Agent ${action === 'activate' ? 'activé' : 'suspendu'}`);
      }
      await loadAgents();
    } catch (error) {
      console.error('Erreur action agent:', error);
      toast.error('Erreur lors de l\'action sur l\'agent');
    }
  };

  const filteredAgents = agents.filter(agent =>
    agent.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    agent.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* En-tête */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold">Gestion des Agents</h2>
          <p className="text-muted-foreground mt-1">Administration du réseau d'agents</p>
        </div>
        <Button>
          <Plus className="w-4 h-4 mr-2" />
          Nouvel Agent
        </Button>
      </div>

      {/* Statistiques */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total Agents</CardTitle>
            <UserCheck className="w-4 h-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{agents.length}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Actifs</CardTitle>
            <UserCheck className="w-4 h-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-500">
              {agents.filter(a => a.is_active).length}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Suspendus</CardTitle>
            <UserCheck className="w-4 h-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-500">
              {agents.filter(a => !a.is_active).length}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Commission Moy.</CardTitle>
            <UserCheck className="w-4 h-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-500">
              {(agents.reduce((acc, a) => acc + a.commission_rate, 0) / agents.length).toFixed(1)}%
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recherche */}
      <Card>
        <CardHeader>
          <CardTitle>Rechercher un agent</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="relative">
            <Search className="absolute left-3 top-3 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Rechercher par nom ou email..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </CardContent>
      </Card>

      {/* Liste des agents */}
      <Card>
        <CardHeader>
          <CardTitle>Liste des Agents ({filteredAgents.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {filteredAgents.map((agent) => (
              <div
                key={agent.id}
                className="flex items-center justify-between p-4 rounded-lg border bg-card"
              >
                <div className="flex items-center gap-4 flex-1">
                  <UserCheck className="w-10 h-10 text-muted-foreground" />
                  <div className="flex-1">
                    <h3 className="font-medium">{agent.name}</h3>
                    <p className="text-sm text-muted-foreground">
                      {agent.email} • {agent.role} • Commission: {agent.commission_rate}%
                    </p>
                  </div>
                  {agent.is_active ? (
                    <Badge className="bg-green-500">Actif</Badge>
                  ) : (
                    <Badge className="bg-red-500">Suspendu</Badge>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <Button variant="ghost" size="sm">
                    <Eye className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleAgentAction(agent.id, agent.is_active ? 'suspend' : 'activate')}
                  >
                    <Ban className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleAgentAction(agent.id, 'delete')}
                  >
                    <Trash2 className="w-4 h-4 text-red-500" />
                  </Button>
                </div>
              </div>
            ))}
            {filteredAgents.length === 0 && (
              <div className="text-center py-12 text-muted-foreground">
                Aucun agent trouvé
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
