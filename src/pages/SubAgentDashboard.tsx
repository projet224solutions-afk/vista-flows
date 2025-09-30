/**
 * 👥 Dashboard Sous-Agent - Gestion des Utilisateurs
 * 
 * Interface limitée pour les sous-agents permettant uniquement
 * de créer des utilisateurs et voir leurs commissions
 */

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
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
    UserPlus, DollarSign, TrendingUp, Mail, Activity,
    Copy, CheckCircle, AlertCircle, Users, Shield,
    Clock, Calendar, Phone
} from 'lucide-react';
import { toast } from 'sonner';
import {
    agentService,
    SubAgent,
    AgentUser,
    Commission
} from '@/services/agentManagementService';

interface SubAgentDashboardProps {
    subAgentId: string;
    subAgentData?: SubAgent;
}

interface SubAgentStats {
    totalUsers: number;
    activeUsers: number;
    totalCommissions: number;
    monthlyCommissions: number;
    pendingInvitations: number;
}

export const SubAgentDashboard: React.FC<SubAgentDashboardProps> = ({
    subAgentId,
    subAgentData
}) => {
    // États
    const [stats, setStats] = useState<SubAgentStats>({
        totalUsers: 0,
        activeUsers: 0,
        totalCommissions: 0,
        monthlyCommissions: 0,
        pendingInvitations: 0
    });

    const [users, setUsers] = useState<AgentUser[]>([]);
    const [commissions, setCommissions] = useState<Commission[]>([]);
    const [loading, setLoading] = useState(false);
    const [activeTab, setActiveTab] = useState('overview');

    // Formulaire utilisateur
    const [newUser, setNewUser] = useState({
        name: '',
        email: '',
        phone: '',
        notificationMethod: 'email' as 'email' | 'sms' | 'both'
    });

    const [showCreateUserDialog, setShowCreateUserDialog] = useState(false);
    const [inviteLink, setInviteLink] = useState('');

    // =====================================================
    // EFFECTS
    // =====================================================

    useEffect(() => {
        loadSubAgentData();
    }, [subAgentId]);

    // =====================================================
    // CHARGEMENT DES DONNÉES
    // =====================================================

    const loadSubAgentData = async () => {
        setLoading(true);
        try {
            const [usersData, commissionsData] = await Promise.all([
                agentService.getUsers(subAgentId, 'sub_agent'),
                agentService.getCommissions(subAgentId, 'sub_agent')
            ]);

            setUsers(usersData);
            setCommissions(commissionsData);

            // Calculer les statistiques
            const activeUsers = usersData.filter(u => u.status === 'active').length;
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
                totalUsers: usersData.length,
                activeUsers,
                totalCommissions: totalCommissionsAmount,
                monthlyCommissions,
                pendingInvitations: usersData.filter(u => u.status === 'invited').length
            });

        } catch (error) {
            console.error('Erreur chargement données sous-agent:', error);
            toast.error('Erreur lors du chargement des données');
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
            const result = await agentService.createUser(subAgentId, 'sub_agent', newUser);

            if (result.success && result.inviteLink) {
                setInviteLink(result.inviteLink);
                setNewUser({
                    name: '',
                    email: '',
                    phone: '',
                    notificationMethod: 'email'
                });
                await loadSubAgentData();
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
                            <Users className="h-8 w-8 text-green-500" />
                            Dashboard Sous-Agent
                        </h1>
                        <p className="text-gray-600 mt-2">
                            Gestion de vos utilisateurs et commissions
                        </p>
                        {subAgentData && (
                            <div className="mt-3 flex items-center gap-4 text-sm text-gray-600">
                                <span className="flex items-center gap-1">
                                    <Mail className="h-4 w-4" />
                                    {subAgentData.email}
                                </span>
                                <span className="flex items-center gap-1">
                                    <Phone className="h-4 w-4" />
                                    {subAgentData.phone}
                                </span>
                            </div>
                        )}
                    </div>

                    <Dialog open={showCreateUserDialog} onOpenChange={setShowCreateUserDialog}>
                        <DialogTrigger asChild>
                            <Button className="bg-green-600 hover:bg-green-700">
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

                                    <div className="bg-green-50 p-4 rounded-lg">
                                        <p className="text-sm text-green-800">
                                            💡 Ce lien permet à l'utilisateur d'activer son compte.
                                            Il expire dans 7 jours.
                                        </p>
                                    </div>

                                    <Alert>
                                        <DollarSign className="h-4 w-4" />
                                        <AlertDescription>
                                            <strong>Commission :</strong> Vous recevrez une commission sur les activités de cet utilisateur.
                                            Une partie sera également reversée à votre agent parent selon les paramètres configurés.
                                        </AlertDescription>
                                    </Alert>
                                </div>
                            ) : (
                                <div className="space-y-4">
                                    <div>
                                        <Label htmlFor="user-name">Nom complet *</Label>
                                        <Input
                                            id="user-name"
                                            value={newUser.name}
                                            onChange={(e) => setNewUser(prev => ({ ...prev, name: e.target.value }))}
                                            placeholder="Ex: Fatou Sall"
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
                                                placeholder="Ex: fatou@email.com"
                                            />
                                        </div>
                                        <div>
                                            <Label htmlFor="user-phone">Téléphone</Label>
                                            <Input
                                                id="user-phone"
                                                value={newUser.phone}
                                                onChange={(e) => setNewUser(prev => ({ ...prev, phone: e.target.value }))}
                                                placeholder="Ex: +221 77 666 55 44"
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
                                        className="bg-green-600 hover:bg-green-700"
                                    >
                                        {loading ? 'Création...' : 'Créer l\'Utilisateur'}
                                    </Button>
                                )}
                            </DialogFooter>
                        </DialogContent>
                    </Dialog>
                </div>
            </div>

            {/* Statistiques */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6 mb-8">
                <Card>
                    <CardContent className="p-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm font-medium text-gray-600">Utilisateurs</p>
                                <p className="text-2xl font-bold text-gray-900">{stats.totalUsers}</p>
                            </div>
                            <Users className="h-8 w-8 text-blue-600" />
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardContent className="p-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm font-medium text-gray-600">Actifs</p>
                                <p className="text-2xl font-bold text-gray-900">{stats.activeUsers}</p>
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
                <TabsList className="grid w-full grid-cols-3">
                    <TabsTrigger value="overview">Vue d'ensemble</TabsTrigger>
                    <TabsTrigger value="users">Mes Utilisateurs</TabsTrigger>
                    <TabsTrigger value="commissions">Mes Commissions</TabsTrigger>
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
                                            <div className="text-right">
                                                <Badge variant={user.status === 'active' ? "default" : "secondary"}>
                                                    {user.status === 'active' ? 'Actif' : 'Invité'}
                                                </Badge>
                                                <p className="text-xs text-gray-500 mt-1">
                                                    {new Date(user.created_at).toLocaleDateString('fr-FR')}
                                                </p>
                                            </div>
                                        </div>
                                    ))}
                                    {users.length === 0 && (
                                        <div className="text-center py-8 text-gray-500">
                                            <Users className="h-12 w-12 mx-auto mb-3 opacity-50" />
                                            <p>Aucun utilisateur créé</p>
                                            <p className="text-sm">Commencez par créer votre premier utilisateur</p>
                                        </div>
                                    )}
                                </div>
                            </CardContent>
                        </Card>

                        {/* Informations de commission */}
                        <Card>
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <DollarSign className="h-5 w-5" />
                                    Système de Commission
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="space-y-4">
                                    <Alert>
                                        <Shield className="h-4 w-4" />
                                        <AlertDescription>
                                            <strong>Comment ça marche :</strong>
                                        </AlertDescription>
                                    </Alert>

                                    <div className="space-y-3 text-sm">
                                        <div className="bg-green-50 p-3 rounded-lg">
                                            <p className="font-medium text-green-800">✅ Vous créez un utilisateur</p>
                                            <p className="text-green-700">→ Lien d'invitation envoyé automatiquement</p>
                                        </div>

                                        <div className="bg-blue-50 p-3 rounded-lg">
                                            <p className="font-medium text-blue-800">✅ L'utilisateur active son compte</p>
                                            <p className="text-blue-700">→ Il peut utiliser l'application 224Solutions</p>
                                        </div>

                                        <div className="bg-purple-50 p-3 rounded-lg">
                                            <p className="font-medium text-purple-800">💰 L'utilisateur génère des revenus</p>
                                            <p className="text-purple-700">→ Commission calculée automatiquement</p>
                                            <p className="text-purple-700">→ Partagée entre vous et votre agent parent</p>
                                        </div>
                                    </div>

                                    <div className="bg-yellow-50 p-3 rounded-lg">
                                        <p className="text-sm text-yellow-800">
                                            <strong>💡 Astuce :</strong> Plus vous créez d'utilisateurs actifs,
                                            plus vos commissions augmentent !
                                        </p>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                </TabsContent>

                {/* Utilisateurs */}
                <TabsContent value="users" className="space-y-6">
                    <Card>
                        <CardHeader>
                            <CardTitle>Mes Utilisateurs ({stats.totalUsers})</CardTitle>
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
                                                <div className="flex items-center gap-1">
                                                    <Calendar className="h-3 w-3 text-gray-400" />
                                                    {new Date(user.created_at).toLocaleDateString('fr-FR')}
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                <div className="flex items-center gap-1">
                                                    <Clock className="h-3 w-3 text-gray-400" />
                                                    {user.last_login ?
                                                        new Date(user.last_login).toLocaleDateString('fr-FR') :
                                                        'Jamais'
                                                    }
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>

                            {users.length === 0 && (
                                <div className="text-center py-12">
                                    <Users className="h-16 w-16 mx-auto text-gray-300 mb-4" />
                                    <h3 className="text-lg font-medium text-gray-900 mb-2">
                                        Aucun utilisateur créé
                                    </h3>
                                    <p className="text-gray-600 mb-6">
                                        Créez votre premier utilisateur pour commencer à générer des commissions
                                    </p>
                                    <Button
                                        onClick={() => setShowCreateUserDialog(true)}
                                        className="bg-green-600 hover:bg-green-700"
                                    >
                                        <UserPlus className="h-4 w-4 mr-2" />
                                        Créer mon Premier Utilisateur
                                    </Button>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* Commissions */}
                <TabsContent value="commissions" className="space-y-6">
                    <Card>
                        <CardHeader>
                            <CardTitle>Historique de mes Commissions</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Montant</TableHead>
                                        <TableHead>Utilisateur Source</TableHead>
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
                                                <div className="text-sm">
                                                    ID: {commission.source_user_id?.substring(0, 8)}...
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                <Badge variant="outline">
                                                    {(commission.commission_rate * 100).toFixed(1)}%
                                                </Badge>
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
                                                <div className="flex items-center gap-1">
                                                    <Calendar className="h-3 w-3 text-gray-400" />
                                                    {new Date(commission.calculated_at).toLocaleDateString('fr-FR')}
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                <div className="flex items-center gap-1">
                                                    <Clock className="h-3 w-3 text-gray-400" />
                                                    {commission.paid_at ?
                                                        new Date(commission.paid_at).toLocaleDateString('fr-FR') :
                                                        '-'
                                                    }
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>

                            {commissions.length === 0 && (
                                <div className="text-center py-12">
                                    <DollarSign className="h-16 w-16 mx-auto text-gray-300 mb-4" />
                                    <h3 className="text-lg font-medium text-gray-900 mb-2">
                                        Aucune commission générée
                                    </h3>
                                    <p className="text-gray-600 mb-6">
                                        Les commissions apparaîtront ici quand vos utilisateurs utiliseront l'application
                                    </p>
                                    <Alert className="max-w-md mx-auto">
                                        <AlertCircle className="h-4 w-4" />
                                        <AlertDescription>
                                            Créez des utilisateurs et encouragez-les à utiliser 224Solutions
                                            pour commencer à générer des commissions.
                                        </AlertDescription>
                                    </Alert>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>
        </div>
    );
};

export default SubAgentDashboard;
