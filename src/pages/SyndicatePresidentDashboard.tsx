/**
 * INTERFACE OPÉRATIONNELLE BUREAU SYNDICAT DE TAXI MOTO
 * Architecture complète Frontend/Backend/Supabase
 * 224Solutions - Interface Président Bureau Syndical
 */

import React, { useState, useEffect } from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
    Users,
    Car,
    DollarSign,
    AlertTriangle,
    Home,
    ShoppingBag,
    Bike,
    TrendingUp,
    User,
    MessageSquare,
    Crown,
    Download,
    LogOut,
    Settings,
    Receipt,
    MapPin
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useSyndicateData } from "@/hooks/useSyndicateData";
import { useNavigate, useParams } from "react-router-dom";
import { toast } from "sonner";
import { supabase } from '@/lib/supabase';
import SyndicateMemberManagement from '@/components/syndicate/SyndicateMemberManagement';
import SyndicateVehicleManagement from '@/components/syndicate/SyndicateVehicleManagement';
import SyndicateTreasuryManagement from '@/components/syndicate/SyndicateTreasuryManagement';
import SyndicateSOSManagement from '@/components/syndicate/SyndicateSOSManagement';
import RealCommunicationInterface from '@/components/communication/RealCommunicationInterface';
import SyndicateRoadTickets from '@/components/syndicate/SyndicateRoadTickets';

export default function SyndicatePresidentDashboard() {
    const { user, signOut } = useAuth();
    const navigate = useNavigate();
    const { token } = useParams<{ token: string }>();
    
    const [activeTab, setActiveTab] = useState('dashboard');
    const [bureauId, setBureauId] = useState<string | null>(null);
    const [bureauInfo, setBureauInfo] = useState<any>(null);
    
    // Charger les données réelles du bureau
    const {
        bureauInfo: syndicateInfo,
        members,
        vehicles,
        transactions,
        sosAlerts,
        loading,
        error,
        refetch
    } = useSyndicateData(bureauId || undefined);

    // Authentifier via token d'accès
    useEffect(() => {
        if (token) {
            authenticateWithToken(token);
        } else if (user) {
            loadUserBureau();
        }
    }, [token, user]);

    const authenticateWithToken = async (accessToken: string) => {
        try {
            const { data, error } = await supabase
                .from('syndicate_bureaus')
                .select('*')
                .eq('access_token', accessToken)
                .single();

            if (error || !data) {
                toast.error('Lien d\'accès invalide');
                navigate('/');
                return;
            }

            setBureauId(data.id);
            setBureauInfo(data);
            
            // Mettre à jour l'accès
            await supabase
                .from('syndicate_bureaus')
                .update({ 
                    link_accessed_at: new Date().toISOString(),
                    last_activity: new Date().toISOString()
                })
                .eq('id', data.id);

            toast.success(`Bienvenue ${data.president_name} !`, {
                description: `Bureau: ${data.bureau_code}`
            });
        } catch (error) {
            console.error('Erreur authentification:', error);
            toast.error('Erreur de connexion');
        }
    };

    const loadUserBureau = async () => {
        if (!user?.id) return;

        try {
            const { data, error } = await supabase
                .from('syndicate_bureaus')
                .select('*')
                .eq('president_email', user.email)
                .single();

            if (data && !error) {
                setBureauId(data.id);
                setBureauInfo(data);
            }
        } catch (error) {
            console.error('Erreur chargement bureau:', error);
        }
    };

    const handleSignOut = async () => {
        await signOut();
        navigate('/');
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-background flex items-center justify-center">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
                    <p className="text-muted-foreground">Chargement des données...</p>
                </div>
            </div>
        );
    }

    if (error || !bureauInfo) {
        return (
            <div className="min-h-screen bg-background flex items-center justify-center p-4">
                <Card className="max-w-md">
                    <CardContent className="p-6 text-center">
                        <AlertTriangle className="w-12 h-12 text-destructive mx-auto mb-4" />
                        <h2 className="text-xl font-bold mb-2">Accès non autorisé</h2>
                        <p className="text-muted-foreground mb-4">
                            {error || 'Impossible de charger les informations du bureau'}
                        </p>
                        <Button onClick={() => navigate('/')}>
                            Retour à l'accueil
                        </Button>
                    </CardContent>
                </Card>
            </div>
        );
    }

    const stats = [
        {
            label: "Membres Actifs",
            sublabel: "sur total",
            value: syndicateInfo?.active_members || 0,
            total: syndicateInfo?.total_members || 0,
            icon: Users,
            gradient: "from-blue-500 to-blue-600"
        },
        {
            label: "Véhicules",
            sublabel: "en service",
            value: syndicateInfo?.total_vehicles || 0,
            icon: Car,
            gradient: "from-green-500 to-green-600"
        },
        {
            label: "Cotisations",
            sublabel: "FCFA collectées",
            value: syndicateInfo?.total_cotisations || 0,
            icon: DollarSign,
            gradient: "from-purple-500 to-purple-600"
        },
        {
            label: "Alertes SOS",
            sublabel: "actives",
            value: sosAlerts.filter(a => a.status === 'active').length,
            icon: AlertTriangle,
            gradient: "from-orange-500 to-orange-600"
        }
    ];

    return (
        <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
            {/* Header */}
            <header className="bg-white shadow-md sticky top-0 z-50 border-b">
                <div className="max-w-7xl mx-auto px-4 py-4">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <div className="w-12 h-12 bg-gradient-to-br from-blue-600 to-purple-600 rounded-xl flex items-center justify-center">
                                <Bike className="w-6 h-6 text-white" />
                            </div>
                            <div>
                                <h1 className="text-xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                                    Syndicat de Taxi Moto de {bureauInfo.commune}
                                </h1>
                                <p className="text-sm text-muted-foreground">
                                    {bureauInfo.bureau_code} • {bureauInfo.prefecture}
                                </p>
                            </div>
                        </div>

                        <div className="flex items-center gap-2">
                            <Button
                                variant="outline"
                                size="sm"
                                className="hidden md:flex gap-2"
                            >
                                <Crown className="w-4 h-4" />
                                Président
                            </Button>
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => window.open('https://224solutions.com/app', '_blank')}
                            >
                                <Download className="w-4 h-4 mr-2" />
                                Télécharger
                            </Button>
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={handleSignOut}
                                className="text-destructive hover:text-destructive"
                            >
                                <LogOut className="w-4 h-4 mr-2" />
                                Déconnexion
                            </Button>
                        </div>
                    </div>
                </div>
            </header>

            {/* Stats Cards */}
            <div className="max-w-7xl mx-auto px-4 py-6">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                    {stats.map((stat, index) => {
                        const Icon = stat.icon;
                        return (
                            <Card key={index} className={`overflow-hidden border-0 shadow-lg bg-gradient-to-br ${stat.gradient} text-white`}>
                                <CardContent className="p-6">
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <p className="text-sm font-medium opacity-90">{stat.label}</p>
                                            <div className="flex items-baseline gap-2">
                                                <p className="text-3xl font-bold">{stat.value}</p>
                                                {stat.total && (
                                                    <p className="text-sm opacity-75">/{stat.total}</p>
                                                )}
                                            </div>
                                            <p className="text-xs opacity-75">{stat.sublabel}</p>
                                        </div>
                                        <Icon className="w-12 h-12 opacity-50" />
                                    </div>
                                </CardContent>
                            </Card>
                        );
                    })}
                </div>

                {/* Navigation Tabs */}
                <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                    <TabsList className="grid w-full grid-cols-3 lg:grid-cols-7 bg-white shadow-md p-1 rounded-xl border">
                        <TabsTrigger value="dashboard" className="flex items-center gap-2">
                            <Home className="w-4 h-4" />
                            <span className="hidden lg:inline">Dashboard</span>
                        </TabsTrigger>
                        <TabsTrigger value="members" className="flex items-center gap-2">
                            <Users className="w-4 h-4" />
                            <span className="hidden lg:inline">Membres</span>
                        </TabsTrigger>
                        <TabsTrigger value="vehicles" className="flex items-center gap-2">
                            <Car className="w-4 h-4" />
                            <span className="hidden lg:inline">Véhicules</span>
                        </TabsTrigger>
                        <TabsTrigger value="treasury" className="flex items-center gap-2">
                            <Receipt className="w-4 h-4" />
                            <span className="hidden lg:inline">Trésorerie</span>
                        </TabsTrigger>
                        <TabsTrigger value="tickets" className="flex items-center gap-2">
                            <MapPin className="w-4 h-4" />
                            <span className="hidden lg:inline">Tickets Route</span>
                        </TabsTrigger>
                        <TabsTrigger value="communication" className="flex items-center gap-2">
                            <MessageSquare className="w-4 h-4" />
                            <span className="hidden lg:inline">Communication</span>
                        </TabsTrigger>
                        <TabsTrigger value="sos" className="flex items-center gap-2">
                            <AlertTriangle className="w-4 h-4" />
                            <span className="hidden lg:inline">SOS</span>
                        </TabsTrigger>
                    </TabsList>

                    <TabsContent value="dashboard" className="mt-6 space-y-6">
                        <Card>
                            <CardContent className="p-6">
                                <h2 className="text-xl font-bold mb-4">Aperçu Général</h2>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div>
                                        <h3 className="font-semibold mb-2 flex items-center gap-2">
                                            <Users className="w-4 h-4" />
                                            Membres Récents
                                        </h3>
                                        <div className="space-y-2">
                                            {members.slice(0, 5).map(member => (
                                                <div key={member.id} className="flex items-center justify-between p-3 bg-muted rounded-lg">
                                                    <div>
                                                        <p className="font-medium">{member.name}</p>
                                                        <p className="text-sm text-muted-foreground">{member.phone}</p>
                                                    </div>
                                                    <Badge variant={member.status === 'active' ? 'default' : 'secondary'}>
                                                        {member.status}
                                                    </Badge>
                                                </div>
                                            ))}
                                        </div>
                                    </div>

                                    <div>
                                        <h3 className="font-semibold mb-2 flex items-center gap-2">
                                            <Car className="w-4 h-4" />
                                            Véhicules Actifs
                                        </h3>
                                        <div className="space-y-2">
                                            {vehicles.slice(0, 5).map(vehicle => (
                                                <div key={vehicle.id} className="flex items-center justify-between p-3 bg-muted rounded-lg">
                                                    <div>
                                                        <p className="font-medium">{vehicle.serialNumber}</p>
                                                        <p className="text-sm text-muted-foreground">{vehicle.driverName}</p>
                                                    </div>
                                                    <Badge variant={vehicle.status === 'active' ? 'default' : 'secondary'}>
                                                        {vehicle.status}
                                                    </Badge>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    </TabsContent>

                    <TabsContent value="members" className="mt-6">
                        <SyndicateMemberManagement bureauId={bureauId || ''} />
                    </TabsContent>

                    <TabsContent value="vehicles" className="mt-6">
                        <SyndicateVehicleManagement bureauId={bureauId || ''} />
                    </TabsContent>

                    <TabsContent value="treasury" className="mt-6">
                        <SyndicateTreasuryManagement bureauId={bureauId || ''} />
                    </TabsContent>

                    <TabsContent value="tickets" className="mt-6">
                        <SyndicateRoadTickets bureauId={bureauId || ''} />
                    </TabsContent>

                    <TabsContent value="communication" className="mt-6">
                        <Card>
                            <CardContent className="p-6">
                                <RealCommunicationInterface />
                            </CardContent>
                        </Card>
                    </TabsContent>

                    <TabsContent value="sos" className="mt-6">
                        <SyndicateSOSManagement bureauId={bureauId || ''} />
                    </TabsContent>
                </Tabs>
            </div>

            {/* Bottom Navigation - Mobile */}
            <div className="fixed bottom-0 left-0 right-0 bg-white border-t shadow-lg lg:hidden z-40">
                <div className="grid grid-cols-5 gap-1 p-2">
                    <Button
                        variant={activeTab === 'dashboard' ? 'default' : 'ghost'}
                        size="sm"
                        onClick={() => setActiveTab('dashboard')}
                        className="flex flex-col items-center gap-1 h-auto py-2"
                    >
                        <Home className="w-5 h-5" />
                        <span className="text-xs">Accueil</span>
                    </Button>
                    <Button
                        variant={activeTab === 'members' ? 'default' : 'ghost'}
                        size="sm"
                        onClick={() => setActiveTab('members')}
                        className="flex flex-col items-center gap-1 h-auto py-2"
                    >
                        <ShoppingBag className="w-5 h-5" />
                        <span className="text-xs">Marketplace</span>
                    </Button>
                    <Button
                        variant={activeTab === 'vehicles' ? 'default' : 'ghost'}
                        size="sm"
                        onClick={() => setActiveTab('vehicles')}
                        className="flex flex-col items-center gap-1 h-auto py-2"
                    >
                        <Bike className="w-5 h-5" />
                        <span className="text-xs">Taxi-Moto</span>
                    </Button>
                    <Button
                        variant={activeTab === 'sos' ? 'default' : 'ghost'}
                        size="sm"
                        onClick={() => setActiveTab('sos')}
                        className="flex flex-col items-center gap-1 h-auto py-2"
                    >
                        <TrendingUp className="w-5 h-5" />
                        <span className="text-xs">Suivi</span>
                    </Button>
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => navigate('/profil')}
                        className="flex flex-col items-center gap-1 h-auto py-2"
                    >
                        <User className="w-5 h-5" />
                        <span className="text-xs">Profil</span>
                    </Button>
                </div>
            </div>
        </div>
    );
}
