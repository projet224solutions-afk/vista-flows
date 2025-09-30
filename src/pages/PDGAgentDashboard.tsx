/**
 * 🏢 Dashboard PDG - Gestion Complète des Agents
 * 
 * Interface pour le PDG permettant de gérer agents, sous-agents, 
 * utilisateurs et paramètres de commission
 */

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
    Dialog, DialogContent, DialogHeader, DialogTitle,
    DialogTrigger, DialogFooter
} from '@/components/ui/dialog';
import {
    Table, TableBody, TableCell, TableHead,
    TableHeader, TableRow
} from '@/components/ui/table';
import {
    Users, UserPlus, Settings, TrendingUp, DollarSign,
    Crown, Shield, Activity, Phone, Mail, Calendar,
    BarChart3, PieChart, AlertCircle, CheckCircle,
    Eye, Edit, Trash2, MoreVertical
} from 'lucide-react';
import { toast } from 'sonner';
import {
    agentService,
    Agent,
    SubAgent,
    AgentUser,
    Commission,
    CommissionSettings
} from '@/services/agentManagementService';

interface DashboardStats {
    totalAgents: number;
    totalSubAgents: number;
    totalUsers: number;
    totalCommissions: number;
    monthlyRevenue: number;
    activeInvitations: number;
}

export const PDGAgentDashboard: React.FC = () => {
    // États
    const [stats, setStats] = useState<DashboardStats>({
        totalAgents: 0,
        totalSubAgents: 0,
        totalUsers: 0,
        totalCommissions: 0,
        monthlyRevenue: 0,
        activeInvitations: 0
    });

    const [agents, setAgents] = useState<Agent[]>([]);
    const [allUsers, setAllUsers] = useState<AgentUser[]>([]);
    const [commissionSettings, setCommissionSettings] = useState<CommissionSettings>({
        base_user_commission: 0.2,
        parent_share_ratio: 0.5
    });

    const [loading, setLoading] = useState(false);
    const [activeTab, setActiveTab] = useState('overview');

    // Formulaires
    const [newAgent, setNewAgent] = useState({
        name: '',
        email: '',
        phone: '',
        canCreateSubAgent: false,
        permissions: [] as string[]
    });

    const [showCreateAgentDialog, setShowCreateAgentDialog] = useState(false);

    // Données simulées du PDG (en réalité récupérées de l'auth)
    const pdgId = '550e8400-e29b-41d4-a716-446655440000'; // TODO: Récupérer de useAuth

    // =====================================================
    // EFFECTS
    // =====================================================

    useEffect(() => {
        loadDashboardData();
    }, []);

    // =====================================================
    // CHARGEMENT DES DONNÉES
    // =====================================================

    const loadDashboardData = async () => {
        setLoading(true);
        try {
            const [agentsData, usersData, settingsData] = await Promise.all([
                agentService.getAgents(pdgId),
                agentService.getUsers(),
                agentService.getCommissionSettings()
            ]);

            setAgents(agentsData);
            setAllUsers(usersData);
            setCommissionSettings(settingsData);

            // Calculer les statistiques
            const subAgentsCount = await Promise.all(
                agentsData.map(agent => agentService.getSubAgents(agent.id))
            );
            const totalSubAgents = subAgentsCount.reduce((sum, subAgents) => sum + subAgents.length, 0);

            setStats({
                totalAgents: agentsData.length,
                totalSubAgents,
                totalUsers: usersData.length,
                totalCommissions: 0, // TODO: Calculer depuis les commissions
                monthlyRevenue: 0, // TODO: Calculer depuis les transactions
                activeInvitations: usersData.filter(u => u.status === 'invited').length
            });

        } catch (error) {
            console.error('Erreur chargement dashboard:', error);
            toast.error('Erreur lors du chargement des données');
        } finally {
            setLoading(false);
        }
    };

    // =====================================================
    // GESTION DES AGENTS
    // =====================================================

    const handleCreateAgent = async () => {
        if (!newAgent.name || !newAgent.email || !newAgent.phone) {
            toast.error('Veuillez remplir tous les champs obligatoires');
            return;
        }

        setLoading(true);
        try {
            const result = await agentService.createAgent(pdgId, newAgent);

            if (result.success) {
                setShowCreateAgentDialog(false);
                setNewAgent({
                    name: '',
                    email: '',
                    phone: '',
                    canCreateSubAgent: false,
                    permissions: []
                });
                await loadDashboardData();
            } else {
                toast.error(result.error || 'Erreur lors de la création de l\'agent');
            }
        } catch (error) {
            toast.error('Erreur interne');
        } finally {
            setLoading(false);
        }
    };

    // =====================================================
    // GESTION DES PARAMÈTRES DE COMMISSION
    // =====================================================

    const handleUpdateCommissionSettings = async (newSettings: Partial<CommissionSettings>) => {
        setLoading(true);
        try {
            const result = await agentService.updateCommissionSettings(pdgId, newSettings);

            if (result.success) {
                setCommissionSettings(prev => ({ ...prev, ...newSettings }));
                toast.success('Paramètres de commission mis à jour');
            } else {
                toast.error(result.error || 'Erreur lors de la mise à jour');
            }
        } catch (error) {
            toast.error('Erreur interne');
        } finally {
            setLoading(false);
        }
    };

    // =====================================================
    // FORMATAGE DES DONNÉES
    // =====================================================

    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('fr-FR', {
            style: 'currency',
            currency: 'XOF',
            minimumFractionDigits: 0
        }).format(amount);
    };

    const formatPercentage = (value: number) => {
        return `${(value * 100).toFixed(1)}%`;
    };

    // =====================================================
    // RENDER
    // =====================================================

    return (
        <div className="min-h-screen bg-gray-50 p-6">
            {/* Header */}
            <div className="mb-8">
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
                            <Crown className="h-8 w-8 text-yellow-500" />
                            Dashboard PDG - Gestion Agents
                        </h1>
                        <p className="text-gray-600 mt-2">
                            Gestion complète des agents, sous-agents et commissions
                        </p>
                    </div>

                    <Dialog open={showCreateAgentDialog} onOpenChange={setShowCreateAgentDialog}>
                        <DialogTrigger asChild>
                            <Button className="bg-blue-600 hover:bg-blue-700">
                                <UserPlus className="h-4 w-4 mr-2" />
                                Créer un Agent
                            </Button>
                        </DialogTrigger>
                        <DialogContent>
                            <DialogHeader>
                                <DialogTitle>Créer un Nouvel Agent</DialogTitle>
                            </DialogHeader>
                            <div className="space-y-4">
                                <div>
                                    <Label htmlFor="agent-name">Nom complet *</Label>
                                    <Input
                                        id="agent-name"
                                        value={newAgent.name}
                                        onChange={(e) => setNewAgent(prev => ({ ...prev, name: e.target.value }))}
                                        placeholder="Ex: Jean Dupont"
                                    />
                                </div>
                                <div>
                                    <Label htmlFor="agent-email">Email *</Label>
                                    <Input
                                        id="agent-email"
                                        type="email"
                                        value={newAgent.email}
                                        onChange={(e) => setNewAgent(prev => ({ ...prev, email: e.target.value }))}
                                        placeholder="Ex: jean.dupont@email.com"
                                    />
                                </div>
                                <div>
                                    <Label htmlFor="agent-phone">Téléphone *</Label>
                                    <Input
                                        id="agent-phone"
                                        value={newAgent.phone}
                                        onChange={(e) => setNewAgent(prev => ({ ...prev, phone: e.target.value }))}
                                        placeholder="Ex: +221 77 123 45 67"
                                    />
                                </div>
                                <div className="flex items-center space-x-2">
                                    <Switch
                                        id="can-create-sub-agent"
                                        checked={newAgent.canCreateSubAgent}
                                        onCheckedChange={(checked) =>
                                            setNewAgent(prev => ({ ...prev, canCreateSubAgent: checked }))
                                        }
                                    />
                                    <Label htmlFor="can-create-sub-agent">
                                        Peut créer des sous-agents
                                    </Label>
                                </div>
                            </div>
                            <DialogFooter>
                                <Button
                                    variant="outline"
                                    onClick={() => setShowCreateAgentDialog(false)}
                                >
                                    Annuler
                                </Button>
                                <Button
                                    onClick={handleCreateAgent}
                                    disabled={loading}
                                    className="bg-blue-600 hover:bg-blue-700"
                                >
                                    {loading ? 'Création...' : 'Créer l\'Agent'}
                                </Button>
                            </DialogFooter>
                        </DialogContent>
                    </Dialog>
                </div>
            </div>

            {/* Statistiques */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-6 mb-8">
                <Card>
                    <CardContent className="p-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm font-medium text-gray-600">Agents</p>
                                <p className="text-2xl font-bold text-gray-900">{stats.totalAgents}</p>
                            </div>
                            <Users className="h-8 w-8 text-blue-600" />
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardContent className="p-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm font-medium text-gray-600">Sous-Agents</p>
                                <p className="text-2xl font-bold text-gray-900">{stats.totalSubAgents}</p>
                            </div>
                            <Shield className="h-8 w-8 text-green-600" />
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardContent className="p-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm font-medium text-gray-600">Utilisateurs</p>
                                <p className="text-2xl font-bold text-gray-900">{stats.totalUsers}</p>
                            </div>
                            <Activity className="h-8 w-8 text-purple-600" />
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardContent className="p-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm font-medium text-gray-600">Invitations</p>
                                <p className="text-2xl font-bold text-gray-900">{stats.activeInvitations}</p>
                            </div>
                            <Mail className="h-8 w-8 text-orange-600" />
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardContent className="p-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm font-medium text-gray-600">Commissions</p>
                                <p className="text-2xl font-bold text-gray-900">{formatCurrency(stats.totalCommissions)}</p>
                            </div>
                            <DollarSign className="h-8 w-8 text-emerald-600" />
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardContent className="p-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm font-medium text-gray-600">Revenus</p>
                                <p className="text-2xl font-bold text-gray-900">{formatCurrency(stats.monthlyRevenue)}</p>
                            </div>
                            <TrendingUp className="h-8 w-8 text-indigo-600" />
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Onglets principaux */}
            <Tabs value={activeTab} onValueChange={setActiveTab}>
                <TabsList className="grid w-full grid-cols-4">
                    <TabsTrigger value="overview">Vue d'ensemble</TabsTrigger>
                    <TabsTrigger value="agents">Gestion Agents</TabsTrigger>
                    <TabsTrigger value="users">Tous les Utilisateurs</TabsTrigger>
                    <TabsTrigger value="settings">Paramètres Commission</TabsTrigger>
                </TabsList>

                {/* Vue d'ensemble */}
                <TabsContent value="overview" className="space-y-6">
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        {/* Agents récents */}
                        <Card>
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <Users className="h-5 w-5" />
                                    Agents Récents
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="space-y-3">
                                    {agents.slice(0, 5).map((agent) => (
                                        <div key={agent.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                                            <div>
                                                <p className="font-medium">{agent.name}</p>
                                                <p className="text-sm text-gray-600">{agent.email}</p>
                                            </div>
                                            <Badge variant={agent.can_create_sub_agent ? "default" : "secondary"}>
                                                {agent.can_create_sub_agent ? 'Admin' : 'Standard'}
                                            </Badge>
                                        </div>
                                    ))}
                                </div>
                            </CardContent>
                        </Card>

                        {/* Activité récente */}
                        <Card>
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <Activity className="h-5 w-5" />
                                    Activité Récente
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="space-y-3">
                                    {allUsers.slice(0, 5).map((user) => (
                                        <div key={user.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                                            <div>
                                                <p className="font-medium">{user.name}</p>
                                                <p className="text-sm text-gray-600">
                                                    Créé par {user.creator_type === 'agent' ? 'Agent' : 'Sous-Agent'}
                                                </p>
                                            </div>
                                            <Badge variant={user.status === 'active' ? "default" : "secondary"}>
                                                {user.status === 'active' ? 'Actif' : 'Invité'}
                                            </Badge>
                                        </div>
                                    ))}
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                </TabsContent>

                {/* Gestion des Agents */}
                <TabsContent value="agents" className="space-y-6">
                    <Card>
                        <CardHeader>
                            <CardTitle>Liste des Agents</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Nom</TableHead>
                                        <TableHead>Email</TableHead>
                                        <TableHead>Téléphone</TableHead>
                                        <TableHead>Sous-Agents</TableHead>
                                        <TableHead>Statut</TableHead>
                                        <TableHead>Date création</TableHead>
                                        <TableHead>Actions</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {agents.map((agent) => (
                                        <TableRow key={agent.id}>
                                            <TableCell className="font-medium">{agent.name}</TableCell>
                                            <TableCell>{agent.email}</TableCell>
                                            <TableCell>{agent.phone}</TableCell>
                                            <TableCell>
                                                <Badge variant={agent.can_create_sub_agent ? "default" : "secondary"}>
                                                    {agent.can_create_sub_agent ? 'Autorisé' : 'Non autorisé'}
                                                </Badge>
                                            </TableCell>
                                            <TableCell>
                                                <Badge variant={agent.is_active ? "default" : "destructive"}>
                                                    {agent.is_active ? 'Actif' : 'Inactif'}
                                                </Badge>
                                            </TableCell>
                                            <TableCell>
                                                {new Date(agent.created_at).toLocaleDateString('fr-FR')}
                                            </TableCell>
                                            <TableCell>
                                                <div className="flex items-center gap-2">
                                                    <Button variant="ghost" size="sm">
                                                        <Eye className="h-4 w-4" />
                                                    </Button>
                                                    <Button variant="ghost" size="sm">
                                                        <Edit className="h-4 w-4" />
                                                    </Button>
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* Tous les utilisateurs */}
                <TabsContent value="users" className="space-y-6">
                    <Card>
                        <CardHeader>
                            <CardTitle>Tous les Utilisateurs</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Nom</TableHead>
                                        <TableHead>Contact</TableHead>
                                        <TableHead>Créé par</TableHead>
                                        <TableHead>Type Créateur</TableHead>
                                        <TableHead>Statut</TableHead>
                                        <TableHead>Device</TableHead>
                                        <TableHead>Date création</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {allUsers.map((user) => (
                                        <TableRow key={user.id}>
                                            <TableCell className="font-medium">{user.name}</TableCell>
                                            <TableCell>
                                                {user.email && <div className="text-sm">{user.email}</div>}
                                                {user.phone && <div className="text-sm text-gray-600">{user.phone}</div>}
                                            </TableCell>
                                            <TableCell>{user.creator_id.substring(0, 8)}...</TableCell>
                                            <TableCell>
                                                <Badge variant={user.creator_type === 'agent' ? "default" : "secondary"}>
                                                    {user.creator_type === 'agent' ? 'Agent' : 'Sous-Agent'}
                                                </Badge>
                                            </TableCell>
                                            <TableCell>
                                                <Badge
                                                    variant={
                                                        user.status === 'active' ? "default" :
                                                            user.status === 'invited' ? "secondary" : "destructive"
                                                    }
                                                >
                                                    {user.status === 'active' ? 'Actif' :
                                                        user.status === 'invited' ? 'Invité' : 'Suspendu'}
                                                </Badge>
                                            </TableCell>
                                            <TableCell>
                                                {user.device_type && (
                                                    <Badge variant="outline">{user.device_type}</Badge>
                                                )}
                                            </TableCell>
                                            <TableCell>
                                                {new Date(user.created_at).toLocaleDateString('fr-FR')}
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* Paramètres Commission */}
                <TabsContent value="settings" className="space-y-6">
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <Settings className="h-5 w-5" />
                                Paramètres de Commission
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            <Alert>
                                <AlertCircle className="h-4 w-4" />
                                <AlertDescription>
                                    Ces paramètres affectent le calcul automatique des commissions pour tous les nouveaux utilisateurs.
                                </AlertDescription>
                            </Alert>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="space-y-4">
                                    <Label htmlFor="base-commission">
                                        Commission de base par utilisateur
                                    </Label>
                                    <div className="flex items-center space-x-2">
                                        <Input
                                            id="base-commission"
                                            type="number"
                                            min="0"
                                            max="1"
                                            step="0.01"
                                            value={commissionSettings.base_user_commission}
                                            onChange={(e) =>
                                                setCommissionSettings(prev => ({
                                                    ...prev,
                                                    base_user_commission: parseFloat(e.target.value) || 0
                                                }))
                                            }
                                        />
                                        <span className="text-sm text-gray-600">
                                            ({formatPercentage(commissionSettings.base_user_commission)})
                                        </span>
                                    </div>
                                    <p className="text-sm text-gray-600">
                                        Pourcentage du revenu net versé en commission
                                    </p>
                                </div>

                                <div className="space-y-4">
                                    <Label htmlFor="parent-share">
                                        Répartition Agent Parent (sous-agents)
                                    </Label>
                                    <div className="flex items-center space-x-2">
                                        <Input
                                            id="parent-share"
                                            type="number"
                                            min="0"
                                            max="1"
                                            step="0.01"
                                            value={commissionSettings.parent_share_ratio}
                                            onChange={(e) =>
                                                setCommissionSettings(prev => ({
                                                    ...prev,
                                                    parent_share_ratio: parseFloat(e.target.value) || 0
                                                }))
                                            }
                                        />
                                        <span className="text-sm text-gray-600">
                                            ({formatPercentage(commissionSettings.parent_share_ratio)})
                                        </span>
                                    </div>
                                    <p className="text-sm text-gray-600">
                                        Part de l'agent parent quand un sous-agent crée un utilisateur
                                    </p>
                                </div>
                            </div>

                            <Separator />

                            <div className="bg-gray-50 p-4 rounded-lg">
                                <h4 className="font-medium mb-2">Simulation des commissions :</h4>
                                <div className="space-y-2 text-sm">
                                    <p>
                                        • <strong>Utilisateur créé par Agent :</strong> Agent reçoit {formatPercentage(commissionSettings.base_user_commission)}
                                    </p>
                                    <p>
                                        • <strong>Utilisateur créé par Sous-Agent :</strong>
                                    </p>
                                    <div className="ml-4 space-y-1">
                                        <p>- Sous-Agent : {formatPercentage(commissionSettings.base_user_commission * (1 - commissionSettings.parent_share_ratio))}</p>
                                        <p>- Agent Parent : {formatPercentage(commissionSettings.base_user_commission * commissionSettings.parent_share_ratio)}</p>
                                    </div>
                                </div>
                            </div>

                            <Button
                                onClick={() => handleUpdateCommissionSettings(commissionSettings)}
                                disabled={loading}
                                className="w-full"
                            >
                                {loading ? 'Mise à jour...' : 'Mettre à jour les paramètres'}
                            </Button>
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>
        </div>
    );
};

export default PDGAgentDashboard;
