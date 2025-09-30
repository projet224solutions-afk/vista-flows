/**
 * 🤝 Dashboard Agent - Gestion des Sous-Agents et Utilisateurs
 * 
 * Interface pour les agents permettant de créer des sous-agents (si autorisé),
 * créer des utilisateurs et visualiser leurs commissions
 */

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
    Dialog, DialogContent, DialogHeader, DialogTitle,
    DialogTrigger, DialogFooter
} from '@/components/ui/dialog';
import {
    Table, TableBody, TableCell, TableHead,
    TableHeader, TableRow
} from '@/components/ui/table';
import {
    Users, UserPlus, Shield, DollarSign, TrendingUp,
    Mail, Phone, Calendar, Activity, Copy, CheckCircle,
    AlertCircle, Eye, MoreVertical, ExternalLink
} from 'lucide-react';
import { toast } from 'sonner';
import {
    agentService,
    Agent,
    SubAgent,
    AgentUser,
    Commission
} from '@/services/agentManagementService';

interface AgentDashboardProps {
    agentId: string;
    agentData?: Agent;
}

interface AgentStats {
    totalSubAgents: number;
    totalUsers: number;
    totalCommissions: number;
    monthlyCommissions: number;
    pendingInvitations: number;
}

export const AgentDashboard: React.FC<AgentDashboardProps> = ({
    agentId,
    agentData
}) => {
    // États
    const [stats, setStats] = useState<AgentStats>({
        totalSubAgents: 0,
        totalUsers: 0,
        totalCommissions: 0,
        monthlyCommissions: 0,
        pendingInvitations: 0
    });

    const [subAgents, setSubAgents] = useState<SubAgent[]>([]);
    const [users, setUsers] = useState<AgentUser[]>([]);
    const [commissions, setCommissions] = useState<Commission[]>([]);
    const [loading, setLoading] = useState(false);
    const [activeTab, setActiveTab] = useState('overview');

    // Formulaires
    const [newSubAgent, setNewSubAgent] = useState({
        name: '',
        email: '',
        phone: ''
    });

    const [newUser, setNewUser] = useState({
        name: '',
        email: '',
        phone: '',
        notificationMethod: 'email' as 'email' | 'sms' | 'both'
    });

    const [showCreateSubAgentDialog, setShowCreateSubAgentDialog] = useState(false);
    const [showCreateUserDialog, setShowCreateUserDialog] = useState(false);
    const [inviteLink, setInviteLink] = useState('');

    // =====================================================
    // EFFECTS
    // =====================================================

    useEffect(() => {
        loadAgentData();
    }, [agentId]);

    // =====================================================
    // CHARGEMENT DES DONNÉES
    // =====================================================

    const loadAgentData = async () => {
        setLoading(true);
        try {
            const [subAgentsData, usersData, commissionsData] = await Promise.all([
                agentService.getSubAgents(agentId),
                agentService.getUsers(agentId, 'agent'),
                agentService.getCommissions(agentId, 'agent')
            ]);

            setSubAgents(subAgentsData);
            setUsers(usersData);
            setCommissions(commissionsData);

            // Calculer les statistiques
            const totalCommissionsAmount = commissionsData.reduce((sum, c) => sum + c.amount, 0);
            const monthlyCommissions = commissionsData
                .filter(c => {
                    const commissionDate = new Date(c.calculated_at);
                    const now = new Date();
                    return commissionDate.getMonth() === now.getMonth() &&
                        commissionDate.getFullYear() === now.getFullYear();
                })
                .reduce((sum, c) => sum + c.amount, 0);

            setStats({
                totalSubAgents: subAgentsData.length,
                totalUsers: usersData.length,
                totalCommissions: totalCommissionsAmount,
                monthlyCommissions,
                pendingInvitations: usersData.filter(u => u.status === 'invited').length
            });

        } catch (error) {
            console.error('Erreur chargement données agent:', error);
            toast.error('Erreur lors du chargement des données');
        } finally {
            setLoading(false);
        }
    };

    // =====================================================
    // GESTION DES SOUS-AGENTS
    // =====================================================

    const handleCreateSubAgent = async () => {
        if (!newSubAgent.name || !newSubAgent.email || !newSubAgent.phone) {
            toast.error('Veuillez remplir tous les champs obligatoires');
            return;
        }

        if (!agentData?.can_create_sub_agent) {
            toast.error('Vous n\'avez pas la permission de créer des sous-agents');
            return;
        }

        setLoading(true);
        try {
            const result = await agentService.createSubAgent(agentId, newSubAgent);

            if (result.success) {
                setShowCreateSubAgentDialog(false);
                setNewSubAgent({ name: '', email: '', phone: '' });
                await loadAgentData();
                toast.success('Sous-agent créé avec succès');
            } else {
                toast.error(result.error || 'Erreur lors de la création du sous-agent');
            }
        } catch (error) {
            toast.error('Erreur interne');
        } finally {
            setLoading(false);
        }
    };

    // =====================================================
    // GESTION DES UTILISATEURS
    // =====================================================

    const handleCreateUser = async () => {
        if (!newUser.name) {
            toast.error('Le nom est obligatoire');
            return;
        }

        if (!newUser.email && !newUser.phone) {
            toast.error('Email ou téléphone requis');
            return;
        }

        setLoading(true);
        try {
            const result = await agentService.createUser(agentId, 'agent', newUser);

            if (result.success && result.inviteLink) {
                setInviteLink(result.inviteLink);
                setNewUser({
                    name: '',
                    email: '',
                    phone: '',
                    notificationMethod: 'email'
                });
                await loadAgentData();
            } else {
                toast.error(result.error || 'Erreur lors de la création de l\'utilisateur');
                setShowCreateUserDialog(false);
            }
        } catch (error) {
            toast.error('Erreur interne');
            setShowCreateUserDialog(false);
        } finally {
            setLoading(false);
        }
    };

    const copyInviteLink = () => {
        navigator.clipboard.writeText(inviteLink);
        toast.success('Lien d\'invitation copié !');
    };

    const closeUserDialog = () => {
        setShowCreateUserDialog(false);
        setInviteLink('');
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
                            <Shield className="h-8 w-8 text-blue-500" />
                            Dashboard Agent
                        </h1>
                        <p className="text-gray-600 mt-2">
                            Gestion de vos sous-agents et utilisateurs
                        </p>
                    </div>

                    <div className="flex gap-3">
                        {agentData?.can_create_sub_agent && (
                            <Dialog open={showCreateSubAgentDialog} onOpenChange={setShowCreateSubAgentDialog}>
                                <DialogTrigger asChild>
                                    <Button variant="outline">
                                        <Users className="h-4 w-4 mr-2" />
                                        Créer Sous-Agent
                                    </Button>
                                </DialogTrigger>
                                <DialogContent>
                                    <DialogHeader>
                                        <DialogTitle>Créer un Nouveau Sous-Agent</DialogTitle>
                                    </DialogHeader>
                                    <div className="space-y-4">
                                        <div>
                                            <Label htmlFor="sub-agent-name">Nom complet *</Label>
                                            <Input
                                                id="sub-agent-name"
                                                value={newSubAgent.name}
                                                onChange={(e) => setNewSubAgent(prev => ({ ...prev, name: e.target.value }))}
                                                placeholder="Ex: Marie Martin"
                                            />
                                        </div>
                                        <div>
                                            <Label htmlFor="sub-agent-email">Email *</Label>
                                            <Input
                                                id="sub-agent-email"
                                                type="email"
                                                value={newSubAgent.email}
                                                onChange={(e) => setNewSubAgent(prev => ({ ...prev, email: e.target.value }))}
                                                placeholder="Ex: marie.martin@email.com"
                                            />
                                        </div>
                                        <div>
                                            <Label htmlFor="sub-agent-phone">Téléphone *</Label>
                                            <Input
                                                id="sub-agent-phone"
                                                value={newSubAgent.phone}
                                                onChange={(e) => setNewSubAgent(prev => ({ ...prev, phone: e.target.value }))}
                                                placeholder="Ex: +221 77 987 65 43"
                                            />
                                        </div>
                                    </div>
                                    <DialogFooter>
                                        <Button
                                            variant="outline"
                                            onClick={() => setShowCreateSubAgentDialog(false)}
                                        >
                                            Annuler
                                        </Button>
                                        <Button
                                            onClick={handleCreateSubAgent}
                                            disabled={loading}
                                        >
                                            {loading ? 'Création...' : 'Créer le Sous-Agent'}
                                        </Button>
                                    </DialogFooter>
                                </DialogContent>
                            </Dialog>
                        )}

                        <Dialog open={showCreateUserDialog} onOpenChange={setShowCreateUserDialog}>
                            <DialogTrigger asChild>
                                <Button className="bg-blue-600 hover:bg-blue-700">
                                    <UserPlus className="h-4 w-4 mr-2" />
                                    Créer Utilisateur
                                </Button>
                            </DialogTrigger>
                            <DialogContent>
                                <DialogHeader>
                                    <DialogTitle>
                                        {inviteLink ? 'Lien d\'Invitation Généré' : 'Créer un Nouvel Utilisateur'}
                                    </DialogTitle>
                                </DialogHeader>

                                {inviteLink ? (
                                    <div className="space-y-4">
                                        <Alert>
                                            <CheckCircle className="h-4 w-4" />
                                            <AlertDescription>
                                                Utilisateur créé avec succès ! Le lien d'invitation a été envoyé.
                                            </AlertDescription>
                                        </Alert>

                                        <div>
                                            <Label>Lien d'invitation :</Label>
                                            <div className="flex items-center space-x-2 mt-1">
                                                <Input
                                                    value={inviteLink}
                                                    readOnly
                                                    className="text-sm"
                                                />
                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    onClick={copyInviteLink}
                                                >
                                                    <Copy className="h-4 w-4" />
                                                </Button>
                                            </div>
                                        </div>

                                        <div className="bg-blue-50 p-4 rounded-lg">
                                            <p className="text-sm text-blue-800">
                                                💡 Ce lien permet à l'utilisateur d'activer son compte.
                                                Il expire dans 7 jours.
                                            </p>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="space-y-4">
                                        <div>
                                            <Label htmlFor="user-name">Nom complet *</Label>
                                            <Input
                                                id="user-name"
                                                value={newUser.name}
                                                onChange={(e) => setNewUser(prev => ({ ...prev, name: e.target.value }))}
                                                placeholder="Ex: Ahmed Diallo"
                                            />
                                        </div>

                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            <div>
                                                <Label htmlFor="user-email">Email</Label>
                                                <Input
                                                    id="user-email"
                                                    type="email"
                                                    value={newUser.email}
                                                    onChange={(e) => setNewUser(prev => ({ ...prev, email: e.target.value }))}
                                                    placeholder="Ex: ahmed@email.com"
                                                />
                                            </div>
                                            <div>
                                                <Label htmlFor="user-phone">Téléphone</Label>
                                                <Input
                                                    id="user-phone"
                                                    value={newUser.phone}
                                                    onChange={(e) => setNewUser(prev => ({ ...prev, phone: e.target.value }))}
                                                    placeholder="Ex: +221 77 555 44 33"
                                                />
                                            </div>
                                        </div>

                                        <div>
                                            <Label htmlFor="notification-method">Méthode de notification</Label>
                                            <Select
                                                value={newUser.notificationMethod}
                                                onValueChange={(value: 'email' | 'sms' | 'both') =>
                                                    setNewUser(prev => ({ ...prev, notificationMethod: value }))
                                                }
                                            >
                                                <SelectTrigger>
                                                    <SelectValue />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="email">Email uniquement</SelectItem>
                                                    <SelectItem value="sms">SMS uniquement</SelectItem>
                                                    <SelectItem value="both">Email + SMS</SelectItem>
                                                </SelectContent>
                                            </Select>
                                        </div>

                                        <Alert>
                                            <AlertCircle className="h-4 w-4" />
                                            <AlertDescription>
                                                L'utilisateur recevra automatiquement un lien d'activation par la méthode choisie.
                                            </AlertDescription>
                                        </Alert>
                                    </div>
                                )}

                                <DialogFooter>
                                    <Button
                                        variant="outline"
                                        onClick={closeUserDialog}
                                    >
                                        {inviteLink ? 'Fermer' : 'Annuler'}
                                    </Button>
                                    {!inviteLink && (
                                        <Button
                                            onClick={handleCreateUser}
                                            disabled={loading}
                                            className="bg-blue-600 hover:bg-blue-700"
                                        >
                                            {loading ? 'Création...' : 'Créer l\'Utilisateur'}
                                        </Button>
                                    )}
                                </DialogFooter>
                            </DialogContent>
                        </Dialog>
                    </div>
                </div>
            </div>

            {/* Statistiques */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6 mb-8">
                <Card>
                    <CardContent className="p-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm font-medium text-gray-600">Sous-Agents</p>
                                <p className="text-2xl font-bold text-gray-900">{stats.totalSubAgents}</p>
                            </div>
                            <Users className="h-8 w-8 text-blue-600" />
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
                            <Activity className="h-8 w-8 text-green-600" />
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardContent className="p-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm font-medium text-gray-600">Invitations</p>
                                <p className="text-2xl font-bold text-gray-900">{stats.pendingInvitations}</p>
                            </div>
                            <Mail className="h-8 w-8 text-orange-600" />
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardContent className="p-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm font-medium text-gray-600">Commissions Totales</p>
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
                                <p className="text-sm font-medium text-gray-600">Ce Mois</p>
                                <p className="text-2xl font-bold text-gray-900">{formatCurrency(stats.monthlyCommissions)}</p>
                            </div>
                            <TrendingUp className="h-8 w-8 text-indigo-600" />
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Onglets */}
            <Tabs value={activeTab} onValueChange={setActiveTab}>
                <TabsList className="grid w-full grid-cols-4">
                    <TabsTrigger value="overview">Vue d'ensemble</TabsTrigger>
                    <TabsTrigger value="sub-agents">Sous-Agents</TabsTrigger>
                    <TabsTrigger value="users">Utilisateurs</TabsTrigger>
                    <TabsTrigger value="commissions">Commissions</TabsTrigger>
                </TabsList>

                {/* Vue d'ensemble */}
                <TabsContent value="overview" className="space-y-6">
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
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
                                    {users.slice(0, 5).map((user) => (
                                        <div key={user.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                                            <div>
                                                <p className="font-medium">{user.name}</p>
                                                <p className="text-sm text-gray-600">
                                                    {user.email || user.phone}
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

                        {/* Commissions récentes */}
                        <Card>
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <DollarSign className="h-5 w-5" />
                                    Commissions Récentes
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="space-y-3">
                                    {commissions.slice(0, 5).map((commission) => (
                                        <div key={commission.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                                            <div>
                                                <p className="font-medium">{formatCurrency(commission.amount)}</p>
                                                <p className="text-sm text-gray-600">
                                                    {new Date(commission.calculated_at).toLocaleDateString('fr-FR')}
                                                </p>
                                            </div>
                                            <Badge variant={commission.status === 'paid' ? "default" : "secondary"}>
                                                {commission.status === 'paid' ? 'Payée' : 'En attente'}
                                            </Badge>
                                        </div>
                                    ))}
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                </TabsContent>

                {/* Sous-Agents */}
                <TabsContent value="sub-agents" className="space-y-6">
                    <Card>
                        <CardHeader>
                            <CardTitle>Mes Sous-Agents</CardTitle>
                        </CardHeader>
                        <CardContent>
                            {agentData?.can_create_sub_agent ? (
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>Nom</TableHead>
                                            <TableHead>Email</TableHead>
                                            <TableHead>Téléphone</TableHead>
                                            <TableHead>Statut</TableHead>
                                            <TableHead>Date création</TableHead>
                                            <TableHead>Actions</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {subAgents.map((subAgent) => (
                                            <TableRow key={subAgent.id}>
                                                <TableCell className="font-medium">{subAgent.name}</TableCell>
                                                <TableCell>{subAgent.email}</TableCell>
                                                <TableCell>{subAgent.phone}</TableCell>
                                                <TableCell>
                                                    <Badge variant={subAgent.is_active ? "default" : "destructive"}>
                                                        {subAgent.is_active ? 'Actif' : 'Inactif'}
                                                    </Badge>
                                                </TableCell>
                                                <TableCell>
                                                    {new Date(subAgent.created_at).toLocaleDateString('fr-FR')}
                                                </TableCell>
                                                <TableCell>
                                                    <Button variant="ghost" size="sm">
                                                        <Eye className="h-4 w-4" />
                                                    </Button>
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            ) : (
                                <Alert>
                                    <AlertCircle className="h-4 w-4" />
                                    <AlertDescription>
                                        Vous n'avez pas la permission de créer des sous-agents.
                                        Contactez votre PDG pour obtenir cette autorisation.
                                    </AlertDescription>
                                </Alert>
                            )}
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* Utilisateurs */}
                <TabsContent value="users" className="space-y-6">
                    <Card>
                        <CardHeader>
                            <CardTitle>Mes Utilisateurs</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Nom</TableHead>
                                        <TableHead>Contact</TableHead>
                                        <TableHead>Statut</TableHead>
                                        <TableHead>Device</TableHead>
                                        <TableHead>Date création</TableHead>
                                        <TableHead>Dernière connexion</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {users.map((user) => (
                                        <TableRow key={user.id}>
                                            <TableCell className="font-medium">{user.name}</TableCell>
                                            <TableCell>
                                                {user.email && <div className="text-sm">{user.email}</div>}
                                                {user.phone && <div className="text-sm text-gray-600">{user.phone}</div>}
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
                                            <TableCell>
                                                {user.last_login ?
                                                    new Date(user.last_login).toLocaleDateString('fr-FR') :
                                                    'Jamais'
                                                }
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* Commissions */}
                <TabsContent value="commissions" className="space-y-6">
                    <Card>
                        <CardHeader>
                            <CardTitle>Historique des Commissions</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Montant</TableHead>
                                        <TableHead>Source</TableHead>
                                        <TableHead>Taux</TableHead>
                                        <TableHead>Statut</TableHead>
                                        <TableHead>Date calcul</TableHead>
                                        <TableHead>Date paiement</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {commissions.map((commission) => (
                                        <TableRow key={commission.id}>
                                            <TableCell className="font-medium">
                                                {formatCurrency(commission.amount)}
                                            </TableCell>
                                            <TableCell>
                                                <Badge variant="outline">
                                                    {commission.source_type === 'user' ? 'Utilisateur direct' : 'Via sous-agent'}
                                                </Badge>
                                            </TableCell>
                                            <TableCell>
                                                {(commission.commission_rate * 100).toFixed(1)}%
                                            </TableCell>
                                            <TableCell>
                                                <Badge
                                                    variant={
                                                        commission.status === 'paid' ? "default" :
                                                            commission.status === 'pending' ? "secondary" : "destructive"
                                                    }
                                                >
                                                    {commission.status === 'paid' ? 'Payée' :
                                                        commission.status === 'pending' ? 'En attente' : 'Annulée'}
                                                </Badge>
                                            </TableCell>
                                            <TableCell>
                                                {new Date(commission.calculated_at).toLocaleDateString('fr-FR')}
                                            </TableCell>
                                            <TableCell>
                                                {commission.paid_at ?
                                                    new Date(commission.paid_at).toLocaleDateString('fr-FR') :
                                                    '-'
                                                }
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>
        </div>
    );
};

export default AgentDashboard;
