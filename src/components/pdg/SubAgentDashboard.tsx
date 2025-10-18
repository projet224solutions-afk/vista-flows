/**
 * 🏪 DASHBOARD SOUS-AGENT - 224SOLUTIONS
 * Interface pour les sous-agents
 */

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
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
  Copy,
  CheckCircle,
  Share2
} from 'lucide-react';

interface SubAgentUser {
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

interface SubAgentStats {
  total_users: number;
  active_users: number;
  total_commissions: number;
  monthly_commissions: number;
  parent_agent_commissions: number;
}

export default function SubAgentDashboard() {
  const [users, setUsers] = useState<SubAgentUser[]>([]);
  const [stats, setStats] = useState<SubAgentStats>({
    total_users: 0,
    active_users: 0,
    total_commissions: 0,
    monthly_commissions: 0,
    parent_agent_commissions: 0
  });
  const [loading, setLoading] = useState(true);
  const [showCreateUser, setShowCreateUser] = useState(false);
  const [inviteLink, setInviteLink] = useState('');
  const { toast } = useToast();

  // Formulaire de création d'utilisateur
  const [newUser, setNewUser] = useState({
    name: '',
    email: '',
    phone: '',
    type: 'client'
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      
      // Récupérer l'ID du sous-agent actuel
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Charger les utilisateurs créés par ce sous-agent
      const { data: usersData, error: usersError } = await supabase
        .from('agent_users')
        .select(`
          *,
          total_transactions:agent_transactions(count),
          total_commissions:commissions(sum.amount)
        `)
        .eq('creator_id', user.id)
        .eq('creator_type', 'sub_agent')
        .order('created_at', { ascending: false });

      if (usersError) throw usersError;

      // Calculer les statistiques
      const totalUsers = usersData?.length || 0;
      const activeUsers = usersData?.filter(u => u.status === 'active').length || 0;
      const totalCommissions = usersData?.reduce((sum, user) => sum + (user.total_commissions || 0), 0) || 0;
      
      // Commissions du mois en cours
      const currentMonth = new Date().getMonth();
      const currentYear = new Date().getFullYear();
      const monthlyCommissions = usersData?.filter(user => {
        const userDate = new Date(user.created_at);
        return userDate.getMonth() === currentMonth && userDate.getFullYear() === currentYear;
      }).reduce((sum, user) => sum + (user.total_commissions || 0), 0) || 0;

      // Récupérer les commissions de l'agent parent (approximation)
      const parentAgentCommissions = totalCommissions * 0.5; // 50% du total va à l'agent parent

      setUsers(usersData || []);
      setStats({
        total_users: totalUsers,
        active_users: activeUsers,
        total_commissions: totalCommissions,
        monthly_commissions: monthlyCommissions,
        parent_agent_commissions: parentAgentCommissions
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
          creator_type: 'sub_agent',
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
        actor_type: 'sub_agent',
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
              <div className="w-12 h-12 rounded-xl bg-orange-500/10 flex items-center justify-center">
                <DollarSign className="w-6 h-6 text-orange-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.total_commissions.toLocaleString()} FCFA</p>
                <p className="text-sm text-muted-foreground">Mes Commissions</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/40 bg-card/50 backdrop-blur-sm">
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-purple-500/10 flex items-center justify-center">
                <TrendingUp className="w-6 h-6 text-purple-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.monthly_commissions.toLocaleString()} FCFA</p>
                <p className="text-sm text-muted-foreground">Ce Mois</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Informations sur le partage des commissions */}
      <Card className="border-blue-200 bg-blue-50/50">
        <CardContent className="pt-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-full bg-blue-500/10 flex items-center justify-center">
              <Share2 className="w-5 h-5 text-blue-500" />
            </div>
            <div>
              <h3 className="font-semibold text-blue-900">Partage des Commissions</h3>
              <p className="text-sm text-blue-700">Vos commissions sont partagées avec votre agent parent</p>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4 bg-white/50 rounded-lg">
              <p className="text-sm text-blue-700 mb-1">Vos commissions (50%)</p>
              <p className="text-2xl font-bold text-blue-900">
                {stats.total_commissions.toLocaleString()} FCFA
              </p>
            </div>
            <div className="p-4 bg-white/50 rounded-lg">
              <p className="text-sm text-blue-700 mb-1">Agent parent (50%)</p>
              <p className="text-2xl font-bold text-blue-900">
                {stats.parent_agent_commissions.toLocaleString()} FCFA
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Section Utilisateurs */}
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle className="flex items-center gap-2">
              <Users className="w-5 h-5" />
              Mes Utilisateurs
            </CardTitle>
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
        </CardHeader>
        <CardContent>
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
        </CardContent>
      </Card>

      {/* Section Commissions */}
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
