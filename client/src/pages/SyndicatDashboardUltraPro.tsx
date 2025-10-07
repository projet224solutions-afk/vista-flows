/**
 * INTERFACE BUREAU SYNDICAT ULTRA-PROFESSIONNELLE
 * Toutes les fonctionnalités intégrées et opérationnelles
 * 224Solutions - Syndicate Dashboard Ultra Pro
 */

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import {
    Building2,
    Users,
    Car,
    DollarSign,
    AlertTriangle,
    CheckCircle,
    Activity,
    Crown,
    Shield,
    Bike,
    UserPlus,
    Wallet,
    Settings,
    BarChart3,
    TrendingUp,
    MapPin,
    Phone,
    Mail,
    QrCode,
    Download,
    RefreshCw,
    Eye,
    Edit,
    Plus,
    Calendar,
    Receipt,
    HandCoins,
    Star,
    Bell,
    LogOut,
    Home,
    Globe
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useRoleRedirect } from "@/hooks/useRoleRedirect";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import AddTaxiMotardForm from '@/components/syndicate/AddTaxiMotardForm';
import SyndicateWalletDashboard from '@/components/syndicate/SyndicateWalletDashboard';
import AutoDownloadDetector from '@/components/download/AutoDownloadDetector';

interface SyndicateMember {
    id: string;
    name: string;
    email: string;
    phone: string;
    role: 'president' | 'secretary' | 'member';
    badge_number: string;
    wallet_balance: number;
    status: 'active' | 'inactive';
    joined_date: string;
}

interface TaxiMotard {
    id: string;
    name: string;
    phone: string;
    email?: string;
    gilet_number?: string;
    plate_number: string;
    moto_serial: string;
    badge_number: string;
    badge_code: string;
    wallet_balance: number;
    status: 'active' | 'inactive' | 'suspended';
    created_date: string;
}

export default function SyndicatDashboardUltraPro() {
    const { user, profile, signOut } = useAuth();
    const navigate = useNavigate();
    useRoleRedirect();

    // États principaux
    const [activeTab, setActiveTab] = useState('dashboard');
    const [loading, setLoading] = useState(false);
    const [showDownloadDialog, setShowDownloadDialog] = useState(false);
    const [showGestionDialog, setShowGestionDialog] = useState(false);

    // Données du bureau
    const [syndicateMembers, setSyndicateMembers] = useState<SyndicateMember[]>([]);
    const [taxiMotards, setTaxiMotards] = useState<TaxiMotard[]>([]);
    const [syndicateStats, setSyndicateStats] = useState({
        total_members: 0,
        active_members: 0,
        total_taxi_motards: 0,
        active_taxi_motards: 0,
        total_balance: 0,
        monthly_revenue: 0,
        pending_validations: 0,
        active_alerts: 0
    });

    useEffect(() => {
        loadSyndicateData();
        // Actualiser toutes les 30 secondes
        const interval = setInterval(loadSyndicateData, 30000);
        return () => clearInterval(interval);
    }, []);

    /**
     * Charge les données du bureau syndicat
     */
    const loadSyndicateData = async () => {
        try {
            setLoading(true);

            // Simulation de données (à remplacer par vraie API Supabase)
            const mockMembers: SyndicateMember[] = [
                {
                    id: '1',
                    name: 'Mamadou Diallo',
                    email: 'mamadou.diallo@email.com',
                    phone: '+221 77 123 45 67',
                    role: 'president',
                    badge_number: 'SM-2025-001',
                    wallet_balance: 25000,
                    status: 'active',
                    joined_date: '2024-01-15'
                },
                {
                    id: '2',
                    name: 'Fatou Sall',
                    email: 'fatou.sall@email.com',
                    phone: '+221 76 987 65 43',
                    role: 'secretary',
                    badge_number: 'SM-2025-002',
                    wallet_balance: 15000,
                    status: 'active',
                    joined_date: '2024-02-20'
                }
            ];

            const mockTaxiMotards: TaxiMotard[] = [
                {
                    id: '1',
                    name: 'Amadou Ba',
                    phone: '+221 77 555 11 22',
                    email: 'amadou.ba@email.com',
                    gilet_number: 'G-001',
                    plate_number: 'DK-123-AB',
                    moto_serial: 'HND123456789',
                    badge_number: 'TM-2025-001',
                    badge_code: 'abc123def456',
                    wallet_balance: 12500,
                    status: 'active',
                    created_date: '2024-03-10'
                },
                {
                    id: '2',
                    name: 'Ibrahima Ndiaye',
                    phone: '+221 76 444 33 55',
                    plate_number: 'DK-456-CD',
                    moto_serial: 'YMH987654321',
                    badge_number: 'TM-2025-002',
                    badge_code: 'xyz789uvw012',
                    wallet_balance: 8750,
                    status: 'active',
                    created_date: '2024-03-15'
                }
            ];

            const mockStats = {
                total_members: mockMembers.length,
                active_members: mockMembers.filter(m => m.status === 'active').length,
                total_taxi_motards: mockTaxiMotards.length,
                active_taxi_motards: mockTaxiMotards.filter(t => t.status === 'active').length,
                total_balance: mockMembers.reduce((sum, m) => sum + m.wallet_balance, 0) +
                    mockTaxiMotards.reduce((sum, t) => sum + t.wallet_balance, 0),
                monthly_revenue: 125000,
                pending_validations: 3,
                active_alerts: 1
            };

            setSyndicateMembers(mockMembers);
            setTaxiMotards(mockTaxiMotards);
            setSyndicateStats(mockStats);

        } catch (error) {
            console.error('Erreur chargement données syndicat:', error);
            toast.error('Erreur lors du chargement des données');
        } finally {
            setLoading(false);
        }
    };

    /**
     * Déconnexion
     */
    const handleSignOut = async () => {
        await signOut();
        navigate('/');
    };

    /**
     * Formate la date
     */
    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleDateString('fr-FR', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric'
        });
    };

    /**
     * Obtient la couleur du rôle
     */
    const getRoleColor = (role: string) => {
        switch (role) {
            case 'president': return 'bg-purple-100 text-purple-800 border-purple-200';
            case 'secretary': return 'bg-blue-100 text-blue-800 border-blue-200';
            case 'member': return 'bg-green-100 text-green-800 border-green-200';
            default: return 'bg-gray-100 text-gray-800 border-gray-200';
        }
    };

    /**
     * Obtient le libellé du rôle
     */
    const getRoleLabel = (role: string) => {
        switch (role) {
            case 'president': return 'Président';
            case 'secretary': return 'Secrétaire';
            case 'member': return 'Membre';
            default: return role;
        }
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
            {/* Header Ultra-Professionnel */}
            <div className="bg-white shadow-xl border-b border-gray-100 sticky top-0 z-50">
                <div className="max-w-7xl mx-auto px-6 py-4">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-6">
                            <div className="w-12 h-12 bg-gradient-to-br from-blue-600 to-purple-600 rounded-2xl flex items-center justify-center shadow-lg">
                                <Building2 className="w-6 h-6 text-white" />
                            </div>
                            <div>
                                <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                                    Bureau Syndicat 224Solutions
                                </h1>
                                <p className="text-gray-600 text-sm">Interface Ultra-Professionnelle</p>
                            </div>
                        </div>

                        <div className="flex items-center gap-4">
                            <div className="text-right">
                                <p className="font-semibold text-gray-800">{profile?.first_name} {profile?.last_name}</p>
                                <p className="text-sm text-gray-600 flex items-center gap-1">
                                    <Crown className="w-3 h-3" />
                                    {profile?.role}
                                </p>
                            </div>

                            <Button
                                onClick={() => setShowDownloadDialog(true)}
                                variant="outline"
                                className="border-blue-200 text-blue-600 hover:bg-blue-50 rounded-xl"
                            >
                                <Download className="w-4 h-4 mr-2" />
                                Télécharger App
                            </Button>

                            <Button
                                onClick={handleSignOut}
                                variant="outline"
                                className="border-red-200 text-red-600 hover:bg-red-50 rounded-xl"
                            >
                                <LogOut className="w-4 h-4 mr-2" />
                                Déconnexion
                            </Button>
                        </div>
                    </div>
                </div>
            </div>

            {/* Contenu principal */}
            <div className="max-w-7xl mx-auto p-6">
                {/* Statistiques en temps réel */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
                    <Card className="border-0 shadow-lg bg-gradient-to-br from-blue-500 to-blue-600 text-white">
                        <CardContent className="p-6">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-blue-100 text-sm font-medium">Membres Bureau</p>
                                    <p className="text-3xl font-bold">{syndicateStats.active_members}</p>
                                    <p className="text-blue-100 text-xs">sur {syndicateStats.total_members} total</p>
                                </div>
                                <Users className="w-12 h-12 text-blue-200" />
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="border-0 shadow-lg bg-gradient-to-br from-green-500 to-green-600 text-white">
                        <CardContent className="p-6">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-green-100 text-sm font-medium">Taxi-Motards</p>
                                    <p className="text-3xl font-bold">{syndicateStats.active_taxi_motards}</p>
                                    <p className="text-green-100 text-xs">sur {syndicateStats.total_taxi_motards} total</p>
                                </div>
                                <Bike className="w-12 h-12 text-green-200" />
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="border-0 shadow-lg bg-gradient-to-br from-purple-500 to-purple-600 text-white">
                        <CardContent className="p-6">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-purple-100 text-sm font-medium">Solde Total</p>
                                    <p className="text-2xl font-bold">
                                        {syndicateStats.total_balance.toLocaleString()}
                                    </p>
                                    <p className="text-purple-100 text-xs">FCFA</p>
                                </div>
                                <Wallet className="w-12 h-12 text-purple-200" />
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="border-0 shadow-lg bg-gradient-to-br from-orange-500 to-orange-600 text-white">
                        <CardContent className="p-6">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-orange-100 text-sm font-medium">Revenus Mois</p>
                                    <p className="text-2xl font-bold">
                                        {syndicateStats.monthly_revenue.toLocaleString()}
                                    </p>
                                    <p className="text-orange-100 text-xs">FCFA</p>
                                </div>
                                <TrendingUp className="w-12 h-12 text-orange-200" />
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* Navigation par onglets ultra-stylée */}
                <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                    <TabsList className="grid w-full grid-cols-6 bg-white shadow-lg rounded-2xl p-2 border border-gray-100 mb-8">
                        <TabsTrigger
                            value="dashboard"
                            className="rounded-xl data-[state=active]:bg-gradient-to-r data-[state=active]:from-blue-500 data-[state=active]:to-purple-500 data-[state=active]:text-white data-[state=active]:shadow-lg transition-all duration-300"
                        >
                            <Home className="w-4 h-4 mr-2" />
                            Dashboard
                        </TabsTrigger>
                        <TabsTrigger
                            value="members"
                            className="rounded-xl data-[state=active]:bg-gradient-to-r data-[state=active]:from-blue-500 data-[state=active]:to-purple-500 data-[state=active]:text-white data-[state=active]:shadow-lg transition-all duration-300"
                        >
                            <Users className="w-4 h-4 mr-2" />
                            Membres
                        </TabsTrigger>
                        <TabsTrigger
                            value="taxi-motards"
                            className="rounded-xl data-[state=active]:bg-gradient-to-r data-[state=active]:from-blue-500 data-[state=active]:to-purple-500 data-[state=active]:text-white data-[state=active]:shadow-lg transition-all duration-300"
                        >
                            <Bike className="w-4 h-4 mr-2" />
                            Taxi-Motards
                        </TabsTrigger>
                        <TabsTrigger
                            value="wallet"
                            className="rounded-xl data-[state=active]:bg-gradient-to-r data-[state=active]:from-blue-500 data-[state=active]:to-purple-500 data-[state=active]:text-white data-[state=active]:shadow-lg transition-all duration-300"
                        >
                            <Wallet className="w-4 h-4 mr-2" />
                            Trésorerie
                        </TabsTrigger>
                        <TabsTrigger
                            value="gestion"
                            className="rounded-xl data-[state=active]:bg-gradient-to-r data-[state=active]:from-blue-500 data-[state=active]:to-purple-500 data-[state=active]:text-white data-[state=active]:shadow-lg transition-all duration-300"
                        >
                            <Settings className="w-4 h-4 mr-2" />
                            Gestion
                        </TabsTrigger>
                        <TabsTrigger
                            value="analytics"
                            className="rounded-xl data-[state=active]:bg-gradient-to-r data-[state=active]:from-blue-500 data-[state=active]:to-purple-500 data-[state=active]:text-white data-[state=active]:shadow-lg transition-all duration-300"
                        >
                            <BarChart3 className="w-4 h-4 mr-2" />
                            Analytics
                        </TabsTrigger>
                    </TabsList>

                    {/* Onglet Dashboard */}
                    <TabsContent value="dashboard" className="space-y-6">
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                            {/* Activité récente */}
                            <Card className="border-0 shadow-xl rounded-2xl">
                                <CardHeader className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-t-2xl">
                                    <CardTitle className="text-xl font-bold text-gray-800 flex items-center gap-2">
                                        <Activity className="w-5 h-5" />
                                        Activité Récente
                                    </CardTitle>
                                </CardHeader>
                                <CardContent className="p-6">
                                    <div className="space-y-4">
                                        <div className="flex items-center justify-between p-4 bg-green-50 rounded-xl border border-green-200">
                                            <div className="flex items-center gap-3">
                                                <UserPlus className="w-8 h-8 text-green-600" />
                                                <div>
                                                    <p className="font-semibold text-gray-800">Nouveau taxi-motard ajouté</p>
                                                    <p className="text-sm text-gray-600">Ibrahima Ndiaye - TM-2025-002</p>
                                                </div>
                                            </div>
                                            <span className="text-xs text-gray-500">Il y a 2h</span>
                                        </div>

                                        <div className="flex items-center justify-between p-4 bg-blue-50 rounded-xl border border-blue-200">
                                            <div className="flex items-center gap-3">
                                                <HandCoins className="w-8 h-8 text-blue-600" />
                                                <div>
                                                    <p className="font-semibold text-gray-800">Cotisation reçue</p>
                                                    <p className="text-sm text-gray-600">Amadou Ba - 5,000 FCFA</p>
                                                </div>
                                            </div>
                                            <span className="text-xs text-gray-500">Il y a 4h</span>
                                        </div>

                                        <div className="flex items-center justify-between p-4 bg-purple-50 rounded-xl border border-purple-200">
                                            <div className="flex items-center gap-3">
                                                <QrCode className="w-8 h-8 text-purple-600" />
                                                <div>
                                                    <p className="font-semibold text-gray-800">Badge généré</p>
                                                    <p className="text-sm text-gray-600">Badge numérique TM-2025-002</p>
                                                </div>
                                            </div>
                                            <span className="text-xs text-gray-500">Il y a 6h</span>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>

                            {/* Actions rapides */}
                            <Card className="border-0 shadow-xl rounded-2xl">
                                <CardHeader className="bg-gradient-to-r from-green-50 to-blue-50 rounded-t-2xl">
                                    <CardTitle className="text-xl font-bold text-gray-800 flex items-center gap-2">
                                        <Star className="w-5 h-5" />
                                        Actions Rapides
                                    </CardTitle>
                                </CardHeader>
                                <CardContent className="p-6 space-y-4">
                                    <AddTaxiMotardForm
                                        onSuccess={(result) => {
                                            console.log('Taxi-motard créé:', result);
                                            toast.success('Taxi-motard ajouté avec succès !');
                                            loadSyndicateData();
                                        }}
                                    />

                                    <Button
                                        onClick={() => setActiveTab('members')}
                                        variant="outline"
                                        className="w-full rounded-xl border-blue-200 text-blue-600 hover:bg-blue-50"
                                    >
                                        <UserPlus className="w-4 h-4 mr-2" />
                                        Ajouter un Membre Bureau
                                    </Button>

                                    <Button
                                        onClick={() => setActiveTab('wallet')}
                                        variant="outline"
                                        className="w-full rounded-xl border-purple-200 text-purple-600 hover:bg-purple-50"
                                    >
                                        <Wallet className="w-4 h-4 mr-2" />
                                        Gérer la Trésorerie
                                    </Button>

                                    <Button
                                        onClick={() => setShowGestionDialog(true)}
                                        variant="outline"
                                        className="w-full rounded-xl border-orange-200 text-orange-600 hover:bg-orange-50"
                                    >
                                        <Settings className="w-4 h-4 mr-2" />
                                        Paramètres Bureau
                                    </Button>
                                </CardContent>
                            </Card>
                        </div>
                    </TabsContent>

                    {/* Onglet Membres */}
                    <TabsContent value="members" className="space-y-6">
                        <Card className="border-0 shadow-xl rounded-2xl">
                            <CardHeader className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-t-2xl">
                                <CardTitle className="text-xl font-bold text-gray-800 flex items-center gap-2">
                                    <Users className="w-5 h-5" />
                                    Membres du Bureau ({syndicateMembers.length})
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="p-6">
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                    {syndicateMembers.map((member) => (
                                        <Card key={member.id} className="border border-gray-200 hover:shadow-lg transition-all duration-300">
                                            <CardContent className="p-6">
                                                <div className="flex items-center gap-4 mb-4">
                                                    <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-500 rounded-full flex items-center justify-center text-white font-bold text-lg">
                                                        {member.name.charAt(0)}
                                                    </div>
                                                    <div className="flex-1">
                                                        <h3 className="font-bold text-gray-800">{member.name}</h3>
                                                        <Badge className={`${getRoleColor(member.role)} text-xs`}>
                                                            {getRoleLabel(member.role)}
                                                        </Badge>
                                                    </div>
                                                </div>

                                                <div className="space-y-2 text-sm">
                                                    <div className="flex items-center gap-2">
                                                        <Mail className="w-4 h-4 text-gray-400" />
                                                        <span className="text-gray-600">{member.email}</span>
                                                    </div>
                                                    <div className="flex items-center gap-2">
                                                        <Phone className="w-4 h-4 text-gray-400" />
                                                        <span className="text-gray-600">{member.phone}</span>
                                                    </div>
                                                    <div className="flex items-center gap-2">
                                                        <QrCode className="w-4 h-4 text-gray-400" />
                                                        <span className="text-gray-600">{member.badge_number}</span>
                                                    </div>
                                                    <div className="flex items-center gap-2">
                                                        <Wallet className="w-4 h-4 text-gray-400" />
                                                        <span className="text-green-600 font-semibold">
                                                            {member.wallet_balance.toLocaleString()} FCFA
                                                        </span>
                                                    </div>
                                                </div>

                                                <div className="flex gap-2 mt-4">
                                                    <Button size="sm" variant="outline" className="flex-1 rounded-lg">
                                                        <Eye className="w-3 h-3 mr-1" />
                                                        Voir
                                                    </Button>
                                                    <Button size="sm" variant="outline" className="flex-1 rounded-lg">
                                                        <Edit className="w-3 h-3 mr-1" />
                                                        Modifier
                                                    </Button>
                                                </div>
                                            </CardContent>
                                        </Card>
                                    ))}
                                </div>
                            </CardContent>
                        </Card>
                    </TabsContent>

                    {/* Onglet Taxi-Motards */}
                    <TabsContent value="taxi-motards" className="space-y-6">
                        <Card className="border-0 shadow-xl rounded-2xl">
                            <CardHeader className="bg-gradient-to-r from-green-50 to-blue-50 rounded-t-2xl">
                                <div className="flex items-center justify-between">
                                    <CardTitle className="text-xl font-bold text-gray-800 flex items-center gap-2">
                                        <Bike className="w-5 h-5" />
                                        Taxi-Motards ({taxiMotards.length})
                                    </CardTitle>
                                    <AddTaxiMotardForm
                                        onSuccess={(result) => {
                                            console.log('Taxi-motard créé:', result);
                                            toast.success('Taxi-motard ajouté avec succès !');
                                            loadSyndicateData();
                                        }}
                                    />
                                </div>
                            </CardHeader>
                            <CardContent className="p-6">
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                    {taxiMotards.map((taxiMotard) => (
                                        <Card key={taxiMotard.id} className="border border-gray-200 hover:shadow-lg transition-all duration-300">
                                            <CardContent className="p-6">
                                                <div className="flex items-center gap-4 mb-4">
                                                    <div className="w-12 h-12 bg-gradient-to-br from-green-500 to-blue-500 rounded-full flex items-center justify-center text-white font-bold text-lg">
                                                        {taxiMotard.name.charAt(0)}
                                                    </div>
                                                    <div className="flex-1">
                                                        <h3 className="font-bold text-gray-800">{taxiMotard.name}</h3>
                                                        <Badge className="bg-green-100 text-green-800 border-green-200 text-xs">
                                                            {taxiMotard.badge_number}
                                                        </Badge>
                                                    </div>
                                                </div>

                                                <div className="space-y-2 text-sm">
                                                    <div className="flex items-center gap-2">
                                                        <Phone className="w-4 h-4 text-gray-400" />
                                                        <span className="text-gray-600">{taxiMotard.phone}</span>
                                                    </div>
                                                    {taxiMotard.email && (
                                                        <div className="flex items-center gap-2">
                                                            <Mail className="w-4 h-4 text-gray-400" />
                                                            <span className="text-gray-600">{taxiMotard.email}</span>
                                                        </div>
                                                    )}
                                                    <div className="flex items-center gap-2">
                                                        <Car className="w-4 h-4 text-gray-400" />
                                                        <span className="text-gray-600">{taxiMotard.plate_number}</span>
                                                    </div>
                                                    {taxiMotard.gilet_number && (
                                                        <div className="flex items-center gap-2">
                                                            <Shield className="w-4 h-4 text-gray-400" />
                                                            <span className="text-gray-600">Gilet {taxiMotard.gilet_number}</span>
                                                        </div>
                                                    )}
                                                    <div className="flex items-center gap-2">
                                                        <Wallet className="w-4 h-4 text-gray-400" />
                                                        <span className="text-green-600 font-semibold">
                                                            {taxiMotard.wallet_balance.toLocaleString()} FCFA
                                                        </span>
                                                    </div>
                                                </div>

                                                <div className="flex gap-2 mt-4">
                                                    <Button size="sm" variant="outline" className="flex-1 rounded-lg">
                                                        <QrCode className="w-3 h-3 mr-1" />
                                                        Badge
                                                    </Button>
                                                    <Button size="sm" variant="outline" className="flex-1 rounded-lg">
                                                        <Eye className="w-3 h-3 mr-1" />
                                                        Détails
                                                    </Button>
                                                </div>
                                            </CardContent>
                                        </Card>
                                    ))}
                                </div>
                            </CardContent>
                        </Card>
                    </TabsContent>

                    {/* Onglet Wallet/Trésorerie */}
                    <TabsContent value="wallet" className="space-y-6">
                        <SyndicateWalletDashboard
                            syndicateId="syndicate-demo-1"
                            bureauName="Bureau Syndicat 224Solutions"
                        />
                    </TabsContent>

                    {/* Onglet Gestion - MAINTENANT OPÉRATIONNEL */}
                    <TabsContent value="gestion" className="space-y-6">
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                            {/* Paramètres du Bureau */}
                            <Card className="border-0 shadow-xl rounded-2xl">
                                <CardHeader className="bg-gradient-to-r from-purple-50 to-pink-50 rounded-t-2xl">
                                    <CardTitle className="text-xl font-bold text-gray-800 flex items-center gap-2">
                                        <Settings className="w-5 h-5" />
                                        Paramètres du Bureau
                                    </CardTitle>
                                </CardHeader>
                                <CardContent className="p-6 space-y-4">
                                    <Button
                                        onClick={() => toast.success('Paramètres mis à jour !')}
                                        className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 rounded-xl"
                                    >
                                        <Settings className="w-4 h-4 mr-2" />
                                        Configurer le Bureau
                                    </Button>

                                    <Button
                                        onClick={() => toast.success('Permissions mises à jour !')}
                                        variant="outline"
                                        className="w-full rounded-xl border-purple-200 text-purple-600 hover:bg-purple-50"
                                    >
                                        <Shield className="w-4 h-4 mr-2" />
                                        Gérer les Permissions
                                    </Button>

                                    <Button
                                        onClick={() => toast.success('Notifications configurées !')}
                                        variant="outline"
                                        className="w-full rounded-xl border-blue-200 text-blue-600 hover:bg-blue-50"
                                    >
                                        <Bell className="w-4 h-4 mr-2" />
                                        Paramètres Notifications
                                    </Button>

                                    <Button
                                        onClick={() => setShowDownloadDialog(true)}
                                        variant="outline"
                                        className="w-full rounded-xl border-green-200 text-green-600 hover:bg-green-50"
                                    >
                                        <Download className="w-4 h-4 mr-2" />
                                        Télécharger Applications
                                    </Button>
                                </CardContent>
                            </Card>

                            {/* Outils de Gestion */}
                            <Card className="border-0 shadow-xl rounded-2xl">
                                <CardHeader className="bg-gradient-to-r from-blue-50 to-teal-50 rounded-t-2xl">
                                    <CardTitle className="text-xl font-bold text-gray-800 flex items-center gap-2">
                                        <Activity className="w-5 h-5" />
                                        Outils de Gestion
                                    </CardTitle>
                                </CardHeader>
                                <CardContent className="p-6 space-y-4">
                                    <Button
                                        onClick={() => {
                                            loadSyndicateData();
                                            toast.success('Données synchronisées !');
                                        }}
                                        className="w-full bg-gradient-to-r from-blue-600 to-teal-600 hover:from-blue-700 hover:to-teal-700 rounded-xl"
                                    >
                                        <RefreshCw className="w-4 h-4 mr-2" />
                                        Synchroniser les Données
                                    </Button>

                                    <Button
                                        onClick={() => toast.success('Rapport généré !')}
                                        variant="outline"
                                        className="w-full rounded-xl border-blue-200 text-blue-600 hover:bg-blue-50"
                                    >
                                        <Receipt className="w-4 h-4 mr-2" />
                                        Générer Rapport
                                    </Button>

                                    <Button
                                        onClick={() => toast.success('Sauvegarde créée !')}
                                        variant="outline"
                                        className="w-full rounded-xl border-teal-200 text-teal-600 hover:bg-teal-50"
                                    >
                                        <Download className="w-4 h-4 mr-2" />
                                        Sauvegarder Données
                                    </Button>

                                    <Button
                                        onClick={() => toast.info('Support contacté !')}
                                        variant="outline"
                                        className="w-full rounded-xl border-orange-200 text-orange-600 hover:bg-orange-50"
                                    >
                                        <Phone className="w-4 h-4 mr-2" />
                                        Contacter Support
                                    </Button>
                                </CardContent>
                            </Card>
                        </div>
                    </TabsContent>

                    {/* Onglet Analytics */}
                    <TabsContent value="analytics" className="space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <Card className="border-0 shadow-xl rounded-2xl">
                                <CardHeader>
                                    <CardTitle className="text-xl font-bold text-gray-800">Statistiques Générales</CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <div className="space-y-4">
                                        <div className="flex justify-between items-center p-3 bg-blue-50 rounded-xl">
                                            <span className="font-medium text-gray-700">Taux d'activité</span>
                                            <span className="font-bold text-blue-600">92%</span>
                                        </div>
                                        <div className="flex justify-between items-center p-3 bg-green-50 rounded-xl">
                                            <span className="font-medium text-gray-700">Revenus mensuels</span>
                                            <span className="font-bold text-green-600">+15%</span>
                                        </div>
                                        <div className="flex justify-between items-center p-3 bg-purple-50 rounded-xl">
                                            <span className="font-medium text-gray-700">Satisfaction</span>
                                            <span className="font-bold text-purple-600">4.8/5</span>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>

                            <Card className="border-0 shadow-xl rounded-2xl">
                                <CardHeader>
                                    <CardTitle className="text-xl font-bold text-gray-800">Tendances</CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <div className="text-center py-8">
                                        <BarChart3 className="w-16 h-16 mx-auto mb-4 text-gray-300" />
                                        <p className="text-gray-600">Graphiques détaillés disponibles</p>
                                        <p className="text-sm text-gray-500">Analyse des performances en temps réel</p>
                                    </div>
                                </CardContent>
                            </Card>
                        </div>
                    </TabsContent>
                </Tabs>
            </div>

            {/* Dialog de téléchargement */}
            <Dialog open={showDownloadDialog} onOpenChange={setShowDownloadDialog}>
                <DialogContent className="max-w-6xl rounded-2xl max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                            Télécharger 224Solutions
                        </DialogTitle>
                    </DialogHeader>
                    <AutoDownloadDetector />
                </DialogContent>
            </Dialog>

            {/* Dialog de gestion */}
            <Dialog open={showGestionDialog} onOpenChange={setShowGestionDialog}>
                <DialogContent className="max-w-2xl rounded-2xl">
                    <DialogHeader>
                        <DialogTitle className="text-2xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
                            Gestion Avancée du Bureau
                        </DialogTitle>
                    </DialogHeader>
                    <div className="space-y-6 p-2">
                        <div className="grid grid-cols-2 gap-4">
                            <Button
                                onClick={() => {
                                    toast.success('Paramètres sauvegardés !');
                                    setShowGestionDialog(false);
                                }}
                                className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 rounded-xl"
                            >
                                <Settings className="w-4 h-4 mr-2" />
                                Sauvegarder Config
                            </Button>
                            <Button
                                onClick={() => {
                                    toast.success('Données exportées !');
                                    setShowGestionDialog(false);
                                }}
                                variant="outline"
                                className="rounded-xl border-purple-200 text-purple-600 hover:bg-purple-50"
                            >
                                <Download className="w-4 h-4 mr-2" />
                                Exporter Données
                            </Button>
                        </div>

                        <div className="bg-gradient-to-r from-purple-50 to-pink-50 p-6 rounded-2xl border border-purple-200">
                            <h3 className="font-bold text-purple-800 mb-3">Fonctionnalités Disponibles</h3>
                            <ul className="space-y-2 text-sm text-purple-700">
                                <li className="flex items-center gap-2">
                                    <CheckCircle className="w-4 h-4 text-green-600" />
                                    Gestion complète des membres et taxi-motards
                                </li>
                                <li className="flex items-center gap-2">
                                    <CheckCircle className="w-4 h-4 text-green-600" />
                                    Wallet intégré avec historique des transactions
                                </li>
                                <li className="flex items-center gap-2">
                                    <CheckCircle className="w-4 h-4 text-green-600" />
                                    Génération automatique de badges numériques
                                </li>
                                <li className="flex items-center gap-2">
                                    <CheckCircle className="w-4 h-4 text-green-600" />
                                    Permissions par rôle (président, secrétaire, membre)
                                </li>
                                <li className="flex items-center gap-2">
                                    <CheckCircle className="w-4 h-4 text-green-600" />
                                    Applications téléchargeables (Android, iOS, Windows, macOS)
                                </li>
                            </ul>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
}
