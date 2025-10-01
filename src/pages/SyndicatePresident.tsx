/**
 * INTERFACE PRÉSIDENT SYNDICAT ULTRA PROFESSIONNELLE
 * Dashboard complet pour la gestion du bureau syndical
 * 224Solutions - Bureau Syndicat System
 */

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
    Crown,
    Users,
    Car,
    DollarSign,
    MessageSquare,
    Vote,
    AlertTriangle,
    Shield,
    FileText,
    Calendar,
    TrendingUp,
    Settings,
    LogOut,
    Plus,
    Eye,
    Edit,
    Trash2,
    Send,
    Download,
    Upload,
    Bell,
    Activity
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

// Composants spécialisés
import SyndicateMemberManagement from "@/components/syndicate/SyndicateMemberManagement";
import SyndicateVehicleManagement from "@/components/syndicate/SyndicateVehicleManagement";
import SyndicateTreasuryManagement from "@/components/syndicate/SyndicateTreasuryManagement";
import SyndicateRoadTickets from "@/components/syndicate/SyndicateRoadTickets";
import SyndicateCommunication from "@/components/syndicate/SyndicateCommunication";
import SyndicateElections from "@/components/syndicate/SyndicateElections";
import SyndicateSOSManagement from "@/components/syndicate/SyndicateSOSManagement";

interface BureauInfo {
    id: string;
    bureau_code: string;
    prefecture: string;
    commune: string;
    president_name: string;
    president_email: string;
    status: string;
    total_members: number;
    active_members: number;
    total_vehicles: number;
    total_cotisations: number;
    treasury_balance: number;
    created_at: string;
}

interface BureauStats {
    totalMembers: number;
    activeMembers: number;
    pendingMembers: number;
    totalVehicles: number;
    verifiedVehicles: number;
    monthlyRevenue: number;
    treasuryBalance: number;
    activeElections: number;
    pendingClaims: number;
    sosAlertsToday: number;
}

export default function SyndicatePresident() {
    const { user, profile, signOut } = useAuth();
    const [activeTab, setActiveTab] = useState('dashboard');
    const [bureauInfo, setBureauInfo] = useState<BureauInfo | null>(null);
    const [stats, setStats] = useState<BureauStats>({
        totalMembers: 0,
        activeMembers: 0,
        pendingMembers: 0,
        totalVehicles: 0,
        verifiedVehicles: 0,
        monthlyRevenue: 0,
        treasuryBalance: 0,
        activeElections: 0,
        pendingClaims: 0,
        sosAlertsToday: 0
    });
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadBureauInfo();
        loadStats();
    }, []);

    /**
     * Charge les informations du bureau
     */
    const loadBureauInfo = async () => {
        try {
            // Simuler le chargement depuis Supabase
            const mockBureau: BureauInfo = {
                id: '1',
                bureau_code: 'SYN-2025-00001',
                prefecture: 'Dakar',
                commune: 'Plateau',
                president_name: 'Mamadou Diallo',
                president_email: 'mamadou.diallo@email.com',
                status: 'active',
                total_members: 45,
                active_members: 42,
                total_vehicles: 38,
                total_cotisations: 2250000,
                treasury_balance: 1850000,
                created_at: '2025-09-25T10:00:00Z'
            };

            setBureauInfo(mockBureau);
        } catch (error) {
            console.error('Erreur chargement bureau:', error);
            toast.error('Impossible de charger les informations du bureau');
        } finally {
            setLoading(false);
        }
    };

    /**
     * Charge les statistiques
     */
    const loadStats = async () => {
        try {
            const mockStats: BureauStats = {
                totalMembers: 45,
                activeMembers: 42,
                pendingMembers: 3,
                totalVehicles: 38,
                verifiedVehicles: 35,
                monthlyRevenue: 225000,
                treasuryBalance: 1850000,
                activeElections: 1,
                pendingClaims: 2,
                sosAlertsToday: 0
            };

            setStats(mockStats);
        } catch (error) {
            console.error('Erreur chargement statistiques:', error);
        }
    };

    /**
     * Déconnexion
     */
    const handleSignOut = async () => {
        await signOut();
        toast.success('Déconnexion réussie');
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 flex items-center justify-center">
                <Card className="w-96">
                    <CardContent className="p-8 text-center">
                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
                        <h3 className="text-lg font-semibold mb-2">Chargement...</h3>
                        <p className="text-gray-600">Accès à votre bureau syndical</p>
                    </CardContent>
                </Card>
            </div>
        );
    }

    if (!bureauInfo) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-red-50 to-orange-50 flex items-center justify-center">
                <Card className="w-96">
                    <CardContent className="p-8 text-center">
                        <AlertTriangle className="w-12 h-12 mx-auto mb-4 text-red-600" />
                        <h3 className="text-lg font-semibold mb-2 text-red-800">Accès non autorisé</h3>
                        <p className="text-gray-600 mb-4">
                            Vous n'avez pas accès à cette interface ou votre bureau n'est pas encore validé.
                        </p>
                        <Button onClick={() => window.location.href = '/'}>
                            Retour à l'accueil
                        </Button>
                    </CardContent>
                </Card>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 pb-6">
            {/* Header Président */}
            <header className="bg-white/90 backdrop-blur-sm border-b border-gray-200 sticky top-0 z-40">
                <div className="px-4 py-4">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <div className="w-12 h-12 bg-gradient-to-r from-blue-600 to-purple-600 rounded-full flex items-center justify-center">
                                <Crown className="w-6 h-6 text-white" />
                            </div>
                            <div>
                                <h1 className="text-xl font-bold text-gray-900">
                                    Bureau Syndical {bureauInfo.bureau_code}
                                </h1>
                                <p className="text-sm text-gray-600">
                                    {bureauInfo.prefecture} - {bureauInfo.commune} • Président: {bureauInfo.president_name}
                                </p>
                            </div>
                        </div>

                        <div className="flex items-center gap-3">
                            <Badge className="bg-green-100 text-green-800">
                                {bureauInfo.status === 'active' ? 'Actif' : bureauInfo.status}
                            </Badge>
                            <Button
                                onClick={handleSignOut}
                                variant="outline"
                                size="sm"
                            >
                                <LogOut className="w-4 h-4 mr-2" />
                                Déconnexion
                            </Button>
                        </div>
                    </div>
                </div>
            </header>

            <div className="px-4 py-6">
                {/* Statistiques principales */}
                <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
                    <Card>
                        <CardContent className="p-4 text-center">
                            <Users className="w-8 h-8 mx-auto mb-2 text-blue-600" />
                            <div className="text-2xl font-bold text-blue-600">{stats.activeMembers}</div>
                            <div className="text-xs text-gray-600">Membres actifs</div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardContent className="p-4 text-center">
                            <Car className="w-8 h-8 mx-auto mb-2 text-green-600" />
                            <div className="text-2xl font-bold text-green-600">{stats.verifiedVehicles}</div>
                            <div className="text-xs text-gray-600">Véhicules vérifiés</div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardContent className="p-4 text-center">
                            <DollarSign className="w-8 h-8 mx-auto mb-2 text-purple-600" />
                            <div className="text-2xl font-bold text-purple-600">
                                {Math.round(stats.treasuryBalance / 1000)}K
                            </div>
                            <div className="text-xs text-gray-600">Caisse (FCFA)</div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardContent className="p-4 text-center">
                            <Vote className="w-8 h-8 mx-auto mb-2 text-orange-600" />
                            <div className="text-2xl font-bold text-orange-600">{stats.activeElections}</div>
                            <div className="text-xs text-gray-600">Élections actives</div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardContent className="p-4 text-center">
                            <AlertTriangle className="w-8 h-8 mx-auto mb-2 text-red-600" />
                            <div className="text-2xl font-bold text-red-600">{stats.sosAlertsToday}</div>
                            <div className="text-xs text-gray-600">Alertes SOS</div>
                        </CardContent>
                    </Card>
                </div>

                {/* Navigation par onglets */}
                <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                    <TabsList className="grid w-full grid-cols-8 bg-white/80 backdrop-blur-sm">
                        <TabsTrigger value="dashboard" className="text-xs">
                            <Activity className="w-4 h-4 mr-1" />
                            Dashboard
                        </TabsTrigger>
                        <TabsTrigger value="members" className="text-xs">
                            <Users className="w-4 h-4 mr-1" />
                            Membres
                        </TabsTrigger>
                        <TabsTrigger value="vehicles" className="text-xs">
                            <Car className="w-4 h-4 mr-1" />
                            Véhicules
                        </TabsTrigger>
                        <TabsTrigger value="treasury" className="text-xs">
                            <DollarSign className="w-4 h-4 mr-1" />
                            Caisse
                        </TabsTrigger>
                        <TabsTrigger value="tickets" className="text-xs">
                            <FileText className="w-4 h-4 mr-1" />
                            Tickets
                        </TabsTrigger>
                        <TabsTrigger value="communication" className="text-xs">
                            <MessageSquare className="w-4 h-4 mr-1" />
                            Communication
                        </TabsTrigger>
                        <TabsTrigger value="elections" className="text-xs">
                            <Vote className="w-4 h-4 mr-1" />
                            Élections
                        </TabsTrigger>
                        <TabsTrigger value="sos" className="text-xs">
                            <Shield className="w-4 h-4 mr-1" />
                            SOS
                        </TabsTrigger>
                    </TabsList>

                    {/* Contenu des onglets */}
                    <div className="mt-6">
                        {/* Dashboard */}
                        <TabsContent value="dashboard" className="space-y-6">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                {/* Activité récente */}
                                <Card>
                                    <CardHeader>
                                        <CardTitle className="flex items-center gap-2">
                                            <Activity className="w-5 h-5" />
                                            Activité Récente
                                        </CardTitle>
                                    </CardHeader>
                                    <CardContent>
                                        <div className="space-y-4">
                                            <div className="flex items-center gap-3 p-3 bg-blue-50 rounded-lg">
                                                <Users className="w-5 h-5 text-blue-600" />
                                                <div>
                                                    <p className="font-medium">Nouveau membre ajouté</p>
                                                    <p className="text-sm text-gray-600">Ibrahima Ndiaye - Chauffeur</p>
                                                    <p className="text-xs text-gray-500">Il y a 2 heures</p>
                                                </div>
                                            </div>

                                            <div className="flex items-center gap-3 p-3 bg-green-50 rounded-lg">
                                                <DollarSign className="w-5 h-5 text-green-600" />
                                                <div>
                                                    <p className="font-medium">Cotisation reçue</p>
                                                    <p className="text-sm text-gray-600">5,000 FCFA - Fatou Sall</p>
                                                    <p className="text-xs text-gray-500">Il y a 4 heures</p>
                                                </div>
                                            </div>

                                            <div className="flex items-center gap-3 p-3 bg-purple-50 rounded-lg">
                                                <FileText className="w-5 h-5 text-purple-600" />
                                                <div>
                                                    <p className="font-medium">Ticket routier généré</p>
                                                    <p className="text-sm text-gray-600">TKT-2025-0001234</p>
                                                    <p className="text-xs text-gray-500">Il y a 6 heures</p>
                                                </div>
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>

                                {/* Résumé financier */}
                                <Card>
                                    <CardHeader>
                                        <CardTitle className="flex items-center gap-2">
                                            <TrendingUp className="w-5 h-5" />
                                            Résumé Financier
                                        </CardTitle>
                                    </CardHeader>
                                    <CardContent>
                                        <div className="space-y-4">
                                            <div className="flex justify-between items-center">
                                                <span className="text-gray-600">Solde de caisse</span>
                                                <span className="text-2xl font-bold text-green-600">
                                                    {stats.treasuryBalance.toLocaleString()} FCFA
                                                </span>
                                            </div>

                                            <div className="flex justify-between items-center">
                                                <span className="text-gray-600">Revenus ce mois</span>
                                                <span className="text-lg font-semibold text-blue-600">
                                                    {stats.monthlyRevenue.toLocaleString()} FCFA
                                                </span>
                                            </div>

                                            <div className="flex justify-between items-center">
                                                <span className="text-gray-600">Cotisations en attente</span>
                                                <span className="text-lg font-semibold text-orange-600">
                                                    {stats.pendingMembers * 5000} FCFA
                                                </span>
                                            </div>

                                            <Button className="w-full mt-4">
                                                <Eye className="w-4 h-4 mr-2" />
                                                Voir le détail
                                            </Button>
                                        </div>
                                    </CardContent>
                                </Card>
                            </div>

                            {/* Actions rapides */}
                            <Card>
                                <CardHeader>
                                    <CardTitle>Actions Rapides</CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                        <Button
                                            onClick={() => setActiveTab('members')}
                                            className="h-20 flex flex-col gap-2"
                                        >
                                            <Plus className="w-6 h-6" />
                                            <span className="text-sm">Ajouter Membre</span>
                                        </Button>

                                        <Button
                                            onClick={() => setActiveTab('communication')}
                                            variant="outline"
                                            className="h-20 flex flex-col gap-2"
                                        >
                                            <Send className="w-6 h-6" />
                                            <span className="text-sm">Envoyer Annonce</span>
                                        </Button>

                                        <Button
                                            onClick={() => setActiveTab('tickets')}
                                            variant="outline"
                                            className="h-20 flex flex-col gap-2"
                                        >
                                            <FileText className="w-6 h-6" />
                                            <span className="text-sm">Générer Ticket</span>
                                        </Button>

                                        <Button
                                            onClick={() => setActiveTab('elections')}
                                            variant="outline"
                                            className="h-20 flex flex-col gap-2"
                                        >
                                            <Vote className="w-6 h-6" />
                                            <span className="text-sm">Nouvelle Élection</span>
                                        </Button>
                                    </div>
                                </CardContent>
                            </Card>
                        </TabsContent>

                        {/* Autres onglets avec composants spécialisés */}
                        <TabsContent value="members">
                            <SyndicateMemberManagement bureauId={bureauInfo.id} />
                        </TabsContent>

                        <TabsContent value="vehicles">
                            <SyndicateVehicleManagement bureauId={bureauInfo.id} />
                        </TabsContent>

                        <TabsContent value="treasury">
                            <SyndicateTreasuryManagement bureauId={bureauInfo.id} />
                        </TabsContent>

                        <TabsContent value="tickets">
                            <SyndicateRoadTickets bureauId={bureauInfo.id} />
                        </TabsContent>

                        <TabsContent value="communication">
                            <SyndicateCommunication bureauId={bureauInfo.id} />
                        </TabsContent>

                        <TabsContent value="elections">
                            <SyndicateElections bureauId={bureauInfo.id} />
                        </TabsContent>

                        <TabsContent value="sos">
                            <SyndicateSOSManagement bureauId={bureauInfo.id} />
                        </TabsContent>
                    </div>
                </Tabs>
            </div>
        </div>
    );
}
