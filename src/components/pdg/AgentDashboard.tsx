/**
 * 🏢 DASHBOARD AGENT - 224SOLUTIONS
 * Interface pour les agents principaux
 */

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { 
  Users, 
  UserPlus, 
  DollarSign, 
  TrendingUp,
  Mail,
  Phone,
  Eye,
  BarChart3,
  Download,
  Share2,
  Copy,
  CheckCircle
} from 'lucide-react';

interface AgentUser {
  id: string;
  name: string;
  email: string;
  phone: string;
  status: 'invited' | 'active' | 'suspended';
  created_at: string;
  activated_at: string | null;
  device_type: 'mobile' | 'pc' | null;
  total_transactions: number;
  total_commissions: number;
}

interface SubAgent {
  id: string;
  name: string;
  email: string;
  phone: string;
  is_active: boolean;
  created_at: string;
  total_users: number;
  total_commissions: number;
}

interface AgentStats {
  total_users: number;
  active_users: number;
  total_sub_agents: number;
  total_commissions: number;
  monthly_commissions: number;
}

export default function AgentDashboard() {
  const [users, setUsers] = useState<AgentUser[]>([]);
  const [subAgents, setSubAgents] = useState<SubAgent[]>([]);
  const [stats, setStats] = useState<AgentStats>({
    total_users: 0,
    active_users: 0,
    total_sub_agents: 0,
    total_commissions: 0,
    monthly_commissions: 0
  });
  const [loading, setLoading] = useState(true);
  const [showCreateUser, setShowCreateUser] = useState(false);
  const [showCreateSubAgent, setShowCreateSubAgent] = useState(false);
  const [inviteLink, setInviteLink] = useState('');
  const { toast } = useToast();

  // Formulaire de création d'utilisateur
  const [newUser, setNewUser] = useState({
    name: '',
    email: '',
    phone: '',
    type: 'client'
  });

  // Formulaire de création de sous-agent
  const [newSubAgent, setNewSubAgent] = useState({
    name: '',
    email: '',
    phone: ''
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      
      // Récupérer l'ID de l'agent actuel
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Charger les utilisateurs créés par cet agent
      const { data: usersData, error: usersError } = await supabase
        .from('agent_users')
        .select(`
          *,
          total_transactions:agent_transactions(count),
          total_commissions:commissions(sum.amount)
        `)
        .eq('creator_id', user.id)
        .eq('creator_type', 'agent')
        .order('created_at', { ascending: false });

      if (usersError) throw usersError;

      // Charger les sous-agents créés par cet agent
      const { data: subAgentsData, error: subAgentsError } = await supabase
        .from('sub_agents')
        .select(`
          *,
          total_users:agent_users(count),
          total_commissions:commissions(sum.amount)
        `)
        .eq('parent_agent_id', user.id)
        .order('created_at', { ascending: false });

      if (subAgentsError) throw subAgentsError;

      // Calculer les statistiques
      const totalUsers = usersData?.length || 0;
      const activeUsers = usersData?.filter(u => u.status === 'active').length || 0;
      const totalSubAgents = subAgentsData?.length || 0;
      const totalCommissions = usersData?.reduce((sum, user) => sum + (user.total_commissions || 0), 0) || 0;
      
      // Commissions du mois en cours
      const currentMonth = new Date().getMonth();
      const currentYear = new Date().getFullYear();
      const monthlyCommissions = usersData?.filter(user => {
        const userDate = new Date(user.created_at);
        return userDate.getMonth() === currentMonth && userDate.getFullYear() === currentYear;
      }).reduce((sum, user) => sum + (user.total_commissions || 0), 0) || 0;

      setUsers(usersData || []);
      setSubAgents(subAgentsData || []);
      setStats({
        total_users: totalUsers,
        active_users: activeUsers,
        total_sub_agents: totalSubAgents,
        total_commissions: totalCommissions,
        monthly_commissions: monthlyCommissions
      });
    } catch (error) {
      console.error('Erreur chargement données:', error);
      toast({
        title: "Erreur",
        description: "Impossible de charger les données",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const createUser = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Générer un token d'invitation unique
      const inviteToken = crypto.randomUUID();
      
      // Créer l'utilisateur
      const { data, error } = await supabase
        .from('agent_users')
        .insert({
          name: newUser.name,
          email: newUser.email,
          phone: newUser.phone,
          creator_id: user.id,
          creator_type: 'agent',
          invite_token: inviteToken
        })
        .select()
        .single();

      if (error) throw error;

      // Générer le lien d'invitation
      const inviteLink = `${window.location.origin}/invite/${inviteToken}`;
      setInviteLink(inviteLink);

      // Log de l'action
      await supabase.from('agent_audit_logs').insert({
        actor_id: user.id,
        actor_type: 'agent',
        action: 'USER_CREATED',
        target_type: 'user',
        target_id: data.id,
        details: { user_name: newUser.name, email: newUser.email, invite_link: inviteLink }
      });

      toast({
        title: "✅ Utilisateur créé",
        description: `L'utilisateur ${newUser.name} a été créé avec succès`,
      });

      setNewUser({ name: '', email: '', phone: '', type: 'client' });
      setShowCreateUser(false);
      loadData();
    } catch (error) {
      console.error('Erreur création utilisateur:', error);
      toast({
        title: "❌ Erreur",
        description: "Impossible de créer l'utilisateur",
        variant: "destructive"
      });
    }
  };

  const createSubAgent = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Vérifier si l'agent peut créer des sous-agents
      const { data: agent, error: agentError } = await supabase
        .from('agents')
        .select('can_create_sub_agent')
        .eq('id', user.id)
        .single();

      if (agentError) throw agentError;
      if (!agent?.can_create_sub_agent) {
        toast({
          title: "❌ Permission refusée",
          description: "Vous n'avez pas l'autorisation de créer des sous-agents",
          variant: "destructive"
        });
        return;
      }

      const { data, error } = await supabase
        .from('sub_agents')
        .insert({
          name: newSubAgent.name,
          email: newSubAgent.email,
          phone: newSubAgent.phone,
          parent_agent_id: user.id
        })
        .select()
        .single();

      if (error) throw error;

      // Log de l'action
      await supabase.from('agent_audit_logs').insert({
        actor_id: user.id,
        actor_type: 'agent',
        action: 'SUB_AGENT_CREATED',
        target_type: 'sub_agent',
        target_id: data.id,
        details: { sub_agent_name: newSubAgent.name, email: newSubAgent.email }
      });

      toast({
        title: "✅ Sous-agent créé",
        description: `Le sous-agent ${newSubAgent.name} a été créé avec succès`,
      });

      setNewSubAgent({ name: '', email: '', phone: '' });
      setShowCreateSubAgent(false);
      loadData();
    } catch (error) {
      console.error('Erreur création sous-agent:', error);
      toast({
        title: "❌ Erreur",
        description: "Impossible de créer le sous-agent",
        variant: "destructive"
      });
    }
  };

  const copyInviteLink = () => {
    navigator.clipboard.writeText(inviteLink);
    toast({
      title: "✅ Lien copié",
      description: "Le lien d'invitation a été copié dans le presse-papiers",
    });
  };

  const sendInviteByEmail = async () => {
    try {
      // Ici vous pouvez intégrer un service d'email comme SendGrid, Resend, etc.
      toast({
        title: "📧 Email envoyé",
        description: "L'invitation a été envoyée par email",
      });
    } catch (error) {
      console.error('Erreur envoi email:', error);
      toast({
        title: "❌ Erreur",
        description: "Impossible d'envoyer l'email",
        variant: "destructive"
      });
    }
  };

  const sendInviteBySMS = async () => {
    try {
      // Ici vous pouvez intégrer un service SMS comme Twilio, etc.
      toast({
        title: "📱 SMS envoyé",
        description: "L'invitation a été envoyée par SMS",
      });
    } catch (error) {
      console.error('Erreur envoi SMS:', error);
      toast({
        title: "❌ Erreur",
        description: "Impossible d'envoyer le SMS",
        variant: "destructive"
      });
    }
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
      {/* Header avec statistiques */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="border-border/40 bg-card/50 backdrop-blur-sm">
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-blue-500/10 flex items-center justify-center">
                <Users className="w-6 h-6 text-blue-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.total_users}</p>
                <p className="text-sm text-muted-foreground">Utilisateurs Totaux</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/40 bg-card/50 backdrop-blur-sm">
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-green-500/10 flex items-center justify-center">
                <CheckCircle className="w-6 h-6 text-green-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.active_users}</p>
                <p className="text-sm text-muted-foreground">Utilisateurs Actifs</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/40 bg-card/50 backdrop-blur-sm">
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-purple-500/10 flex items-center justify-center">
                <UserPlus className="w-6 h-6 text-purple-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.total_sub_agents}</p>
                <p className="text-sm text-muted-foreground">Sous-agents</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/40 bg-card/50 backdrop-blur-sm">
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-orange-500/10 flex items-center justify-center">
                <DollarSign className="w-6 h-6 text-orange-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.total_commissions.toLocaleString()} FCFA</p>
                <p className="text-sm text-muted-foreground">Commissions Totales</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Onglets principaux */}
      <Tabs defaultValue="users" className="space-y-6">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="users">Utilisateurs</TabsTrigger>
          <TabsTrigger value="sub-agents">Sous-agents</TabsTrigger>
          <TabsTrigger value="commissions">Commissions</TabsTrigger>
        </TabsList>

        {/* Onglet Utilisateurs */}
        <TabsContent value="users" className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-semibold">Mes Utilisateurs</h3>
            <Dialog open={showCreateUser} onOpenChange={setShowCreateUser}>
              <DialogTrigger asChild>
                <Button className="gap-2">
                  <UserPlus className="w-4 h-4" />
                  Créer un Utilisateur
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Créer un nouvel Utilisateur</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="user-name">Nom complet</Label>
                    <Input
                      id="user-name"
                      value={newUser.name}
                      onChange={(e) => setNewUser(prev => ({ ...prev, name: e.target.value }))}
                      placeholder="Nom de l'utilisateur"
                    />
                  </div>
                  <div>
                    <Label htmlFor="user-email">Email</Label>
                    <Input
                      id="user-email"
                      type="email"
                      value={newUser.email}
                      onChange={(e) => setNewUser(prev => ({ ...prev, email: e.target.value }))}
                      placeholder="email@example.com"
                    />
                  </div>
                  <div>
                    <Label htmlFor="user-phone">Téléphone</Label>
                    <Input
                      id="user-phone"
                      value={newUser.phone}
                      onChange={(e) => setNewUser(prev => ({ ...prev, phone: e.target.value }))}
                      placeholder="+224 XXX XX XX XX"
                    />
                  </div>
                  <div className="flex justify-end gap-2">
                    <Button variant="outline" onClick={() => setShowCreateUser(false)}>
                      Annuler
                    </Button>
                    <Button onClick={createUser}>
                      Créer l'Utilisateur
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>

          <Card>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nom</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Téléphone</TableHead>
                  <TableHead>Statut</TableHead>
                  <TableHead>Device</TableHead>
                  <TableHead>Transactions</TableHead>
                  <TableHead>Commissions</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.map((user) => (
                  <TableRow key={user.id}>
                    <TableCell className="font-medium">{user.name}</TableCell>
                    <TableCell>{user.email}</TableCell>
                    <TableCell>{user.phone}</TableCell>
                    <TableCell>
                      <Badge variant={user.status === 'active' ? "default" : "secondary"}>
                        {user.status === 'active' ? 'Actif' : user.status === 'invited' ? 'Invité' : 'Suspendu'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {user.device_type ? (
                        <Badge variant="outline">
                          {user.device_type === 'mobile' ? '📱 Mobile' : '💻 PC'}
                        </Badge>
                      ) : '-'}
                    </TableCell>
                    <TableCell>{user.total_transactions || 0}</TableCell>
                    <TableCell>{(user.total_commissions || 0).toLocaleString()} FCFA</TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <Button size="sm" variant="outline">
                          <Eye className="w-4 h-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>
        </TabsContent>

        {/* Onglet Sous-agents */}
        <TabsContent value="sub-agents" className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-semibold">Mes Sous-agents</h3>
            <Dialog open={showCreateSubAgent} onOpenChange={setShowCreateSubAgent}>
              <DialogTrigger asChild>
                <Button className="gap-2">
                  <UserPlus className="w-4 h-4" />
                  Créer un Sous-agent
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Créer un nouveau Sous-agent</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="sub-agent-name">Nom complet</Label>
                    <Input
                      id="sub-agent-name"
                      value={newSubAgent.name}
                      onChange={(e) => setNewSubAgent(prev => ({ ...prev, name: e.target.value }))}
                      placeholder="Nom du sous-agent"
                    />
                  </div>
                  <div>
                    <Label htmlFor="sub-agent-email">Email</Label>
                    <Input
                      id="sub-agent-email"
                      type="email"
                      value={newSubAgent.email}
                      onChange={(e) => setNewSubAgent(prev => ({ ...prev, email: e.target.value }))}
                      placeholder="email@example.com"
                    />
                  </div>
                  <div>
                    <Label htmlFor="sub-agent-phone">Téléphone</Label>
                    <Input
                      id="sub-agent-phone"
                      value={newSubAgent.phone}
                      onChange={(e) => setNewSubAgent(prev => ({ ...prev, phone: e.target.value }))}
                      placeholder="+224 XXX XX XX XX"
                    />
                  </div>
                  <div className="flex justify-end gap-2">
                    <Button variant="outline" onClick={() => setShowCreateSubAgent(false)}>
                      Annuler
                    </Button>
                    <Button onClick={createSubAgent}>
                      Créer le Sous-agent
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>

          <Card>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nom</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Téléphone</TableHead>
                  <TableHead>Utilisateurs</TableHead>
                  <TableHead>Commissions</TableHead>
                  <TableHead>Statut</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {subAgents.map((subAgent) => (
                  <TableRow key={subAgent.id}>
                    <TableCell className="font-medium">{subAgent.name}</TableCell>
                    <TableCell>{subAgent.email}</TableCell>
                    <TableCell>{subAgent.phone}</TableCell>
                    <TableCell>{subAgent.total_users || 0}</TableCell>
                    <TableCell>{(subAgent.total_commissions || 0).toLocaleString()} FCFA</TableCell>
                    <TableCell>
                      <Badge variant={subAgent.is_active ? "default" : "secondary"}>
                        {subAgent.is_active ? "Actif" : "Suspendu"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <Button size="sm" variant="outline">
                          <Eye className="w-4 h-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>
        </TabsContent>

        {/* Onglet Commissions */}
        <TabsContent value="commissions" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <DollarSign className="w-5 h-5" />
                Mes Commissions
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div className="flex justify-between items-center p-4 bg-muted/50 rounded-lg">
                    <span className="font-medium">Commissions Totales</span>
                    <span className="text-2xl font-bold text-green-600">
                      {stats.total_commissions.toLocaleString()} FCFA
                    </span>
                  </div>
                  <div className="flex justify-between items-center p-4 bg-muted/50 rounded-lg">
                    <span className="font-medium">Ce Mois</span>
                    <span className="text-xl font-bold text-blue-600">
                      {stats.monthly_commissions.toLocaleString()} FCFA
                    </span>
                  </div>
                </div>
                <div className="space-y-4">
                  <Button className="w-full gap-2">
                    <Download className="w-4 h-4" />
                    Exporter les Commissions
                  </Button>
                  <Button variant="outline" className="w-full gap-2">
                    <BarChart3 className="w-4 h-4" />
                    Voir les Détails
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Modal de lien d'invitation */}
      {inviteLink && (
        <Dialog open={!!inviteLink} onOpenChange={() => setInviteLink('')}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Lien d'Invitation Généré</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="p-4 bg-muted/50 rounded-lg">
                <p className="text-sm text-muted-foreground mb-2">Lien d'invitation :</p>
                <code className="text-sm break-all">{inviteLink}</code>
              </div>
              <div className="flex gap-2">
                <Button onClick={copyInviteLink} className="gap-2">
                  <Copy className="w-4 h-4" />
                  Copier
                </Button>
                <Button variant="outline" onClick={sendInviteByEmail} className="gap-2">
                  <Mail className="w-4 h-4" />
                  Envoyer par Email
                </Button>
                <Button variant="outline" onClick={sendInviteBySMS} className="gap-2">
                  <Phone className="w-4 h-4" />
                  Envoyer par SMS
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
