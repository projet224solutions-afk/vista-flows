/**
 * DASHBOARD ADMIN TAXI MOTO
 * Interface d'administration en temps réel
 * 224Solutions - Taxi-Moto System
 */

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
    TrendingUp,
    Users,
    Car,
    DollarSign,
    Clock,
    AlertTriangle,
    CheckCircle,
    Ban,
    Unlock,
    Eye,
    Settings,
    Bell,
    MapPin,
    Star,
    Phone,
    MessageCircle
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

interface DashboardStats {
    activeDrivers: number;
    activeRides: number;
    todayEarnings: number;
    totalUsers: number;
}

interface Ride {
    id: string;
    status: string;
    customerId: string;
    driverId?: string;
    pickup: {
        address: string;
        location: { latitude: number; longitude: number };
    };
    dropoff: {
        address: string;
        location: { latitude: number; longitude: number };
    };
    pricing: {
        totalPrice: number;
        driverShare: number;
        platformFee: number;
    };
    requestedAt: any;
    completedAt?: any;
}

interface Driver {
    id: string;
    userId: string;
    name: string;
    phone: string;
    status: string;
    rating: number;
    totalRides: number;
    totalEarnings: number;
    isActive: boolean;
    lastSeen: any;
    location?: {
        latitude: number;
        longitude: number;
    };
}

export default function TaxiMotoAdminDashboard() {
    const { user, profile } = useAuth();
    const [activeTab, setActiveTab] = useState('dashboard');
    const [stats, setStats] = useState<DashboardStats>({
        activeDrivers: 0,
        activeRides: 0,
        todayEarnings: 0,
        totalUsers: 0
    });
    const [rides, setRides] = useState<Ride[]>([]);
    const [drivers, setDrivers] = useState<Driver[]>([]);
    const [loading, setLoading] = useState(false);
    const [isConnected, setIsConnected] = useState(false);

    useEffect(() => {
        initializeDashboard();
        startRealTimeUpdates();
    }, []);

    /**
     * Initialise le dashboard admin
     */
    const initializeDashboard = async () => {
        try {
            setLoading(true);

            // Vérifier les permissions admin
            if (profile?.role !== 'admin') {
                toast.error('Accès refusé - Réservé aux administrateurs');
                return;
            }

            // Charger les données initiales
            await Promise.all([
                loadDashboardStats(),
                loadRecentRides(),
                loadDrivers()
            ]);

            setIsConnected(true);
            toast.success('Dashboard admin initialisé');
        } catch (error) {
            console.error('Erreur initialisation dashboard:', error);
            toast.error('Erreur d\'initialisation');
        } finally {
            setLoading(false);
        }
    };

    /**
     * Démarre les mises à jour en temps réel
     */
    const startRealTimeUpdates = () => {
        // Mettre à jour les données toutes les 30 secondes
        const interval = setInterval(async () => {
            await loadDashboardStats();
            await loadRecentRides();
        }, 30000);

        return () => clearInterval(interval);
    };

    /**
     * Charge les statistiques du dashboard
     */
    const loadDashboardStats = async () => {
        try {
            const response = await fetch('/api/admin/dashboard', {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('access_token')}`
                }
            });

            if (response.ok) {
                const data = await response.json();
                setStats(data.dashboard.stats);
            }
        } catch (error) {
            console.error('Erreur chargement stats:', error);
        }
    };

    /**
     * Charge les courses récentes
     */
    const loadRecentRides = async () => {
        try {
            const response = await fetch('/api/admin/rides?limit=20', {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('access_token')}`
                }
            });

            if (response.ok) {
                const data = await response.json();
                setRides(data.rides);
            }
        } catch (error) {
            console.error('Erreur chargement courses:', error);
        }
    };

    /**
     * Charge les conducteurs
     */
    const loadDrivers = async () => {
        try {
            const response = await fetch('/api/admin/drivers?limit=50', {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('access_token')}`
                }
            });

            if (response.ok) {
                const data = await response.json();
                setDrivers(data.drivers);
            }
        } catch (error) {
            console.error('Erreur chargement conducteurs:', error);
        }
    };

    /**
     * Bloque un conducteur
     */
    const blockDriver = async (driverId: string, reason?: string) => {
        try {
            const response = await fetch('/api/admin/driver/block', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('access_token')}`
                },
                body: JSON.stringify({ driverId, reason })
            });

            const result = await response.json();

            if (result.success) {
                toast.success('Conducteur bloqué');
                loadDrivers();
            } else {
                throw new Error(result.message);
            }
        } catch (error) {
            console.error('Erreur blocage conducteur:', error);
            toast.error('Erreur lors du blocage');
        }
    };

    /**
     * Débloque un conducteur
     */
    const unblockDriver = async (driverId: string) => {
        try {
            const response = await fetch('/api/admin/driver/unblock', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('access_token')}`
                },
                body: JSON.stringify({ driverId })
            });

            const result = await response.json();

            if (result.success) {
                toast.success('Conducteur débloqué');
                loadDrivers();
            } else {
                throw new Error(result.message);
            }
        } catch (error) {
            console.error('Erreur déblocage conducteur:', error);
            toast.error('Erreur lors du déblocage');
        }
    };

    /**
     * Annule une course
     */
    const cancelRide = async (rideId: string, reason?: string) => {
        try {
            const response = await fetch('/api/admin/ride/cancel', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('access_token')}`
                },
                body: JSON.stringify({ rideId, reason })
            });

            const result = await response.json();

            if (result.success) {
                toast.success('Course annulée');
                loadRecentRides();
            } else {
                throw new Error(result.message);
            }
        } catch (error) {
            console.error('Erreur annulation course:', error);
            toast.error('Erreur lors de l\'annulation');
        }
    };

    /**
     * Obtient le statut formaté
     */
    const getStatusInfo = (status: string) => {
        const statusMap = {
            online: { label: 'En ligne', color: 'bg-green-100 text-green-800' },
            offline: { label: 'Hors ligne', color: 'bg-gray-100 text-gray-800' },
            busy: { label: 'En course', color: 'bg-blue-100 text-blue-800' },
            blocked: { label: 'Bloqué', color: 'bg-red-100 text-red-800' }
        };

        return statusMap[status as keyof typeof statusMap] || statusMap.offline;
    };

    /**
     * Obtient le statut de course formaté
     */
    const getRideStatusInfo = (status: string) => {
        const statusMap = {
            requested: { label: 'Demandée', color: 'bg-yellow-100 text-yellow-800' },
            accepted: { label: 'Acceptée', color: 'bg-blue-100 text-blue-800' },
            driver_arriving: { label: 'Conducteur en route', color: 'bg-orange-100 text-orange-800' },
            picked_up: { label: 'Client pris en charge', color: 'bg-green-100 text-green-800' },
            in_progress: { label: 'En cours', color: 'bg-green-100 text-green-800' },
            completed: { label: 'Terminée', color: 'bg-gray-100 text-gray-800' },
            cancelled: { label: 'Annulée', color: 'bg-red-100 text-red-800' }
        };

        return statusMap[status as keyof typeof statusMap] || statusMap.requested;
    };

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-green-50">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
                    <p className="text-gray-600">Chargement du dashboard admin...</p>
                </div>
            </div>
        );
    }

    if (profile?.role !== 'admin') {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-green-50">
                <Card className="max-w-md mx-auto">
                    <CardContent className="p-8 text-center">
                        <AlertTriangle className="w-12 h-12 mx-auto text-red-500 mb-4" />
                        <h2 className="text-xl font-bold text-gray-900 mb-2">Accès refusé</h2>
                        <p className="text-gray-600">
                            Cette interface est réservée aux administrateurs
                        </p>
                    </CardContent>
                </Card>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-blue-50 to-green-50">
            {/* Header */}
            <div className="bg-white shadow-sm border-b sticky top-0 z-40">
                <div className="px-4 py-4">
                    <div className="flex items-center justify-between">
                        <div>
                            <h1 className="text-2xl font-bold text-gray-900">
                                Admin Taxi Moto
                            </h1>
                            <div className="flex items-center gap-2 mt-1">
                                <Settings className="w-4 h-4 text-gray-600" />
                                <span className="text-sm text-gray-600">
                                    {profile?.first_name || 'Administrateur'}
                                </span>
                                <div className="flex items-center gap-1">
                                    <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'
                                        }`}></div>
                                    <span className="text-xs text-gray-500">
                                        {isConnected ? 'Connecté' : 'Déconnecté'}
                                    </span>
                                </div>
                            </div>
                        </div>

                        <div className="flex items-center gap-2">
                            <Badge variant="default" className="bg-red-500">
                                Admin
                            </Badge>
                        </div>
                    </div>
                </div>
            </div>

            {/* Navigation par onglets */}
            <div className="px-4 py-4">
                <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                    <TabsList className="grid w-full grid-cols-4 bg-white/80 backdrop-blur-sm">
                        <TabsTrigger value="dashboard">
                            <TrendingUp className="w-4 h-4 mr-1" />
                            Dashboard
                        </TabsTrigger>
                        <TabsTrigger value="rides">
                            <Car className="w-4 h-4 mr-1" />
                            Courses
                        </TabsTrigger>
                        <TabsTrigger value="drivers">
                            <Users className="w-4 h-4 mr-1" />
                            Conducteurs
                        </TabsTrigger>
                        <TabsTrigger value="settings">
                            <Settings className="w-4 h-4 mr-1" />
                            Paramètres
                        </TabsTrigger>
                    </TabsList>

                    {/* Dashboard */}
                    <TabsContent value="dashboard" className="mt-4">
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                            <Card>
                                <CardContent className="p-4">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                                            <Users className="w-5 h-5 text-green-600" />
                                        </div>
                                        <div>
                                            <p className="text-sm text-gray-600">Conducteurs actifs</p>
                                            <p className="text-lg font-bold">{stats.activeDrivers}</p>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>

                            <Card>
                                <CardContent className="p-4">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                                            <Car className="w-5 h-5 text-blue-600" />
                                        </div>
                                        <div>
                                            <p className="text-sm text-gray-600">Courses actives</p>
                                            <p className="text-lg font-bold">{stats.activeRides}</p>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>

                            <Card>
                                <CardContent className="p-4">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 bg-yellow-100 rounded-full flex items-center justify-center">
                                            <DollarSign className="w-5 h-5 text-yellow-600" />
                                        </div>
                                        <div>
                                            <p className="text-sm text-gray-600">Revenus aujourd'hui</p>
                                            <p className="text-lg font-bold">{stats.todayEarnings.toLocaleString()} GNF</p>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>

                            <Card>
                                <CardContent className="p-4">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center">
                                            <Users className="w-5 h-5 text-purple-600" />
                                        </div>
                                        <div>
                                            <p className="text-sm text-gray-600">Total utilisateurs</p>
                                            <p className="text-lg font-bold">{stats.totalUsers}</p>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        </div>

                        {/* Courses récentes */}
                        <Card className="mb-4">
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <Clock className="w-5 h-5 text-blue-600" />
                                    Courses récentes
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                {rides.length === 0 ? (
                                    <div className="text-center py-8">
                                        <Car className="w-12 h-12 mx-auto text-gray-400 mb-4" />
                                        <p className="text-gray-600">Aucune course récente</p>
                                    </div>
                                ) : (
                                    <div className="space-y-3">
                                        {rides.slice(0, 5).map((ride) => (
                                            <div key={ride.id} className="p-3 border rounded-lg">
                                                <div className="flex items-center justify-between mb-2">
                                                    <Badge className={`${getRideStatusInfo(ride.status).color} px-2 py-1`}>
                                                        {getRideStatusInfo(ride.status).label}
                                                    </Badge>
                                                    <span className="text-sm text-gray-600">
                                                        #{ride.id.slice(-8)}
                                                    </span>
                                                </div>
                                                <div className="text-sm text-gray-600">
                                                    <div className="flex items-center gap-2">
                                                        <MapPin className="w-3 h-3" />
                                                        <span>{ride.pickup.address}</span>
                                                    </div>
                                                    <div className="flex items-center gap-2 mt-1">
                                                        <MapPin className="w-3 h-3" />
                                                        <span>{ride.dropoff.address}</span>
                                                    </div>
                                                </div>
                                                <div className="flex items-center justify-between mt-2">
                                                    <span className="font-medium">
                                                        {ride.pricing?.totalPrice?.toLocaleString()} GNF
                                                    </span>
                                                    <div className="flex gap-1">
                                                        <Button
                                                            onClick={() => cancelRide(ride.id)}
                                                            variant="outline"
                                                            size="sm"
                                                        >
                                                            <AlertTriangle className="w-3 h-3 mr-1" />
                                                            Annuler
                                                        </Button>
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    </TabsContent>

                    {/* Courses */}
                    <TabsContent value="rides" className="mt-4">
                        <Card>
                            <CardHeader>
                                <CardTitle>Gestion des courses</CardTitle>
                            </CardHeader>
                            <CardContent>
                                {rides.length === 0 ? (
                                    <div className="text-center py-8">
                                        <Car className="w-12 h-12 mx-auto text-gray-400 mb-4" />
                                        <p className="text-gray-600">Aucune course trouvée</p>
                                    </div>
                                ) : (
                                    <div className="space-y-3">
                                        {rides.map((ride) => (
                                            <div key={ride.id} className="p-4 border rounded-lg">
                                                <div className="flex items-center justify-between mb-3">
                                                    <div className="flex items-center gap-2">
                                                        <Badge className={`${getRideStatusInfo(ride.status).color} px-2 py-1`}>
                                                            {getRideStatusInfo(ride.status).label}
                                                        </Badge>
                                                        <span className="text-sm text-gray-600">#{ride.id.slice(-8)}</span>
                                                    </div>
                                                    <span className="text-sm text-gray-600">
                                                        {new Date(ride.requestedAt?.toDate?.() || ride.requestedAt).toLocaleString()}
                                                    </span>
                                                </div>

                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-3">
                                                    <div>
                                                        <div className="text-sm text-gray-600 mb-1">Départ</div>
                                                        <div className="flex items-center gap-2">
                                                            <MapPin className="w-3 h-3 text-green-500" />
                                                            <span className="text-sm">{ride.pickup.address}</span>
                                                        </div>
                                                    </div>
                                                    <div>
                                                        <div className="text-sm text-gray-600 mb-1">Destination</div>
                                                        <div className="flex items-center gap-2">
                                                            <MapPin className="w-3 h-3 text-red-500" />
                                                            <span className="text-sm">{ride.dropoff.address}</span>
                                                        </div>
                                                    </div>
                                                </div>

                                                <div className="flex items-center justify-between">
                                                    <div className="text-lg font-bold text-green-600">
                                                        {ride.pricing?.totalPrice?.toLocaleString()} GNF
                                                    </div>
                                                    <div className="flex gap-2">
                                                        <Button
                                                            onClick={() => cancelRide(ride.id)}
                                                            variant="destructive"
                                                            size="sm"
                                                        >
                                                            <AlertTriangle className="w-3 h-3 mr-1" />
                                                            Annuler
                                                        </Button>
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    </TabsContent>

                    {/* Conducteurs */}
                    <TabsContent value="drivers" className="mt-4">
                        <Card>
                            <CardHeader>
                                <CardTitle>Gestion des conducteurs</CardTitle>
                            </CardHeader>
                            <CardContent>
                                {drivers.length === 0 ? (
                                    <div className="text-center py-8">
                                        <Users className="w-12 h-12 mx-auto text-gray-400 mb-4" />
                                        <p className="text-gray-600">Aucun conducteur trouvé</p>
                                    </div>
                                ) : (
                                    <div className="space-y-3">
                                        {drivers.map((driver) => (
                                            <div key={driver.id} className="p-4 border rounded-lg">
                                                <div className="flex items-center justify-between mb-3">
                                                    <div className="flex items-center gap-3">
                                                        <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                                                            <Users className="w-5 h-5 text-blue-600" />
                                                        </div>
                                                        <div>
                                                            <div className="font-medium">{driver.name}</div>
                                                            <div className="text-sm text-gray-600">{driver.phone}</div>
                                                        </div>
                                                    </div>
                                                    <div className="flex items-center gap-2">
                                                        <Badge className={`${getStatusInfo(driver.status).color} px-2 py-1`}>
                                                            {getStatusInfo(driver.status).label}
                                                        </Badge>
                                                        {!driver.isActive && (
                                                            <Badge className="bg-red-100 text-red-800 px-2 py-1">
                                                                Bloqué
                                                            </Badge>
                                                        )}
                                                    </div>
                                                </div>

                                                <div className="grid grid-cols-3 gap-4 mb-3">
                                                    <div className="text-center">
                                                        <div className="text-lg font-bold text-yellow-600">{driver.rating}</div>
                                                        <div className="text-xs text-gray-600">Note</div>
                                                    </div>
                                                    <div className="text-center">
                                                        <div className="text-lg font-bold text-blue-600">{driver.totalRides}</div>
                                                        <div className="text-xs text-gray-600">Courses</div>
                                                    </div>
                                                    <div className="text-center">
                                                        <div className="text-lg font-bold text-green-600">
                                                            {driver.totalEarnings.toLocaleString()} GNF
                                                        </div>
                                                        <div className="text-xs text-gray-600">Gains</div>
                                                    </div>
                                                </div>

                                                <div className="flex gap-2">
                                                    {driver.isActive ? (
                                                        <Button
                                                            onClick={() => blockDriver(driver.id, 'Bloqué par l\'administrateur')}
                                                            variant="destructive"
                                                            size="sm"
                                                        >
                                                            <Ban className="w-3 h-3 mr-1" />
                                                            Bloquer
                                                        </Button>
                                                    ) : (
                                                        <Button
                                                            onClick={() => unblockDriver(driver.id)}
                                                            variant="default"
                                                            size="sm"
                                                        >
                                                            <Unlock className="w-3 h-3 mr-1" />
                                                            Débloquer
                                                        </Button>
                                                    )}
                                                    <Button variant="outline" size="sm">
                                                        <Eye className="w-3 h-3 mr-1" />
                                                        Voir détails
                                                    </Button>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    </TabsContent>

                    {/* Paramètres */}
                    <TabsContent value="settings" className="mt-4">
                        <Card>
                            <CardHeader>
                                <CardTitle>Paramètres système</CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <div className="font-medium">Notifications système</div>
                                        <div className="text-sm text-gray-600">Gestion des alertes automatiques</div>
                                    </div>
                                    <Button variant="outline" size="sm">Configurer</Button>
                                </div>

                                <div className="flex items-center justify-between">
                                    <div>
                                        <div className="font-medium">Tarification</div>
                                        <div className="text-sm text-gray-600">Modifier les tarifs de base</div>
                                    </div>
                                    <Button variant="outline" size="sm">Modifier</Button>
                                </div>

                                <div className="flex items-center justify-between">
                                    <div>
                                        <div className="font-medium">Zones de service</div>
                                        <div className="text-sm text-gray-600">Définir les zones couvertes</div>
                                    </div>
                                    <Button variant="outline" size="sm">Gérer</Button>
                                </div>

                                <div className="flex items-center justify-between">
                                    <div>
                                        <div className="font-medium">Sécurité</div>
                                        <div className="text-sm text-gray-600">Paramètres de sécurité et fraude</div>
                                    </div>
                                    <Button variant="outline" size="sm">Configurer</Button>
                                </div>
                            </CardContent>
                        </Card>
                    </TabsContent>
                </Tabs>
            </div>
        </div>
    );
}
