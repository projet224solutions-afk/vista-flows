/**
 * DASHBOARD CONDUCTEUR TAXI MOTO AVANCÉ
 * Interface complète pour la gestion des courses et des gains
 * 224Solutions - Taxi-Moto System
 */

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
    Navigation,
    MapPin,
    Clock,
    DollarSign,
    Star,
    TrendingUp,
    Battery,
    Wifi,
    Settings,
    Bell,
    User,
    Car,
    Route,
    AlertTriangle,
    CheckCircle,
    Zap,
    Phone,
    MessageCircle
} from "lucide-react";
import { toast } from "sonner";
import { taxiPaymentService, PaymentMethod, WalletBalance } from "@/services/taxiMotoPaymentService";
import { taxiNotificationService, TaxiNotification } from "@/services/taxiMotoNotificationService";
import TaxiMotoRealTimeTracking from "./TaxiMotoRealTimeTracking";

interface DriverStats {
    todayEarnings: number;
    todayRides: number;
    rating: number;
    totalRides: number;
    totalEarnings: number;
    onlineTime: string;
    weeklyEarnings: number;
    monthlyEarnings: number;
}

interface ActiveTrip {
    id: string;
    status: string;
    customer: {
        name: string;
        phone: string;
        rating: number;
    };
    pickup: {
        address: string;
        coordinates: { lat: number; lng: number };
    };
    dropoff: {
        address: string;
        coordinates: { lat: number; lng: number };
    };
    pricing: {
        total: number;
        driverShare: number;
        distance: number;
        duration: number;
    };
}

interface TripRequest {
    id: string;
    customerName: string;
    customerRating: number;
    pickupAddress: string;
    destinationAddress: string;
    distance: number;
    estimatedEarnings: number;
    estimatedDuration: number;
    requestTime: string;
}

export default function TaxiMotoDriverDashboard() {
    const [isOnline, setIsOnline] = useState(false);
    const [activeTab, setActiveTab] = useState('dashboard');
    const [driverStats, setDriverStats] = useState<DriverStats>({
        todayEarnings: 0,
        todayRides: 0,
        rating: 5.0,
        totalRides: 0,
        totalEarnings: 0,
        onlineTime: '0h 0m',
        weeklyEarnings: 0,
        monthlyEarnings: 0
    });
    const [activeTrip, setActiveTrip] = useState<ActiveTrip | null>(null);
    const [tripRequests, setTripRequests] = useState<TripRequest[]>([]);
    const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
    const [walletBalance, setWalletBalance] = useState<WalletBalance | null>(null);
    const [notifications, setNotifications] = useState<TaxiNotification[]>([]);
    const [connectionStatus, setConnectionStatus] = useState<'connected' | 'disconnected'>('disconnected');

    useEffect(() => {
        initializeDashboard();
        return () => cleanup();
    }, []);

    useEffect(() => {
        if (isOnline) {
            startLocationTracking();
            loadTripRequests();
            startNotificationPolling();
        }
    }, [isOnline]);

    /**
     * Initialise le dashboard
     */
    const initializeDashboard = async () => {
        try {
            // Initialiser les services
            await taxiPaymentService.initialize();
            await taxiNotificationService.initialize();

            // Charger les données initiales
            await loadDriverStats();
            await loadPaymentMethods();
            await loadWalletBalance();
            await loadNotifications();

            setConnectionStatus('connected');
            toast.success('Dashboard initialisé');
        } catch (error) {
            console.error('Erreur initialisation dashboard:', error);
            toast.error('Erreur d\'initialisation');
        }
    };

    /**
     * Charge les statistiques du conducteur
     */
    const loadDriverStats = async () => {
        try {
            const response = await fetch('/api/taxiMoto/driver/stats', {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('access_token')}`
                }
            });

            if (response.ok) {
                const data = await response.json();
                setDriverStats(data.stats);
            }
        } catch (error) {
            console.error('Erreur chargement stats:', error);
        }
    };

    /**
     * Charge les méthodes de paiement
     */
    const loadPaymentMethods = async () => {
        try {
            const methods = await taxiPaymentService.getPaymentMethods('current-user-id');
            setPaymentMethods(methods);
        } catch (error) {
            console.error('Erreur chargement méthodes paiement:', error);
        }
    };

    /**
     * Charge le solde du wallet
     */
    const loadWalletBalance = async () => {
        try {
            const balance = await taxiPaymentService.getWalletBalance('current-user-id');
            setWalletBalance(balance);
        } catch (error) {
            console.error('Erreur chargement solde:', error);
        }
    };

    /**
     * Charge les notifications
     */
    const loadNotifications = async () => {
        try {
            const notifs = await taxiNotificationService.getAllNotifications('current-user-id', 10);
            setNotifications(notifs);
        } catch (error) {
            console.error('Erreur chargement notifications:', error);
        }
    };

    /**
     * Charge les demandes de course
     */
    const loadTripRequests = async () => {
        try {
            const response = await fetch('/api/taxiMoto/driver/nearbyRequests', {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('access_token')}`
                }
            });

            if (response.ok) {
                const data = await response.json();
                setTripRequests(data.requests || []);
            }
        } catch (error) {
            console.error('Erreur chargement demandes:', error);
        }
    };

    /**
     * Démarre le polling des notifications
     */
    const startNotificationPolling = () => {
        const interval = setInterval(loadNotifications, 30000); // Toutes les 30 secondes
        return () => clearInterval(interval);
    };

    /**
     * Démarre le suivi de position
     */
    const startLocationTracking = () => {
        if (!navigator.geolocation) {
            toast.error('Géolocalisation non disponible');
            return;
        }

        const watchId = navigator.geolocation.watchPosition(
            async (position) => {
                try {
                    await fetch('/api/taxiMoto/driver/updateLocation', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            'Authorization': `Bearer ${localStorage.getItem('access_token')}`
                        },
                        body: JSON.stringify({
                            latitude: position.coords.latitude,
                            longitude: position.coords.longitude,
                            accuracy: position.coords.accuracy,
                            heading: position.coords.heading,
                            speed: position.coords.speed
                        })
                    });
                } catch (error) {
                    console.error('Erreur mise à jour position:', error);
                }
            },
            (error) => {
                console.error('Erreur géolocalisation:', error);
                setConnectionStatus('disconnected');
            },
            {
                enableHighAccuracy: true,
                timeout: 10000,
                maximumAge: 30000
            }
        );

        return watchId;
    };

    /**
     * Bascule le statut en ligne/hors ligne
     */
    const toggleOnlineStatus = async () => {
        const newStatus = !isOnline;
        setIsOnline(newStatus);

        try {
            const response = await fetch('/api/taxiMoto/driver/status', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('access_token')}`
                },
                body: JSON.stringify({
                    isOnline: newStatus
                })
            });

            if (response.ok) {
                toast.success(newStatus ? 'Vous êtes en ligne' : 'Vous êtes hors ligne');
                if (newStatus) {
                    startLocationTracking();
                }
            }
        } catch (error) {
            console.error('Erreur changement statut:', error);
            toast.error('Erreur changement de statut');
        }
    };

    /**
     * Accepte une demande de course
     */
    const acceptTripRequest = async (requestId: string) => {
        try {
            const response = await fetch('/api/taxiMoto/driver/acceptTrip', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('access_token')}`
                },
                body: JSON.stringify({ tripId: requestId })
            });

            if (response.ok) {
                toast.success('Course acceptée');
                loadTripRequests();
            }
        } catch (error) {
            console.error('Erreur acceptation course:', error);
            toast.error('Erreur acceptation course');
        }
    };

    /**
     * Nettoie les ressources
     */
    const cleanup = () => {
        taxiNotificationService.cleanup();
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-blue-50 to-green-50">
            {/* Header */}
            <div className="bg-white shadow-sm border-b">
                <div className="max-w-7xl mx-auto px-4 py-4">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <div className="w-12 h-12 bg-blue-600 rounded-full flex items-center justify-center">
                                <Car className="w-6 h-6 text-white" />
                            </div>
                            <div>
                                <h1 className="text-2xl font-bold text-gray-900">Taxi Moto Driver</h1>
                                <p className="text-sm text-gray-600">Dashboard conducteur</p>
                            </div>
                        </div>

                        <div className="flex items-center gap-4">
                            <div className="flex items-center gap-2">
                                <div className={`w-3 h-3 rounded-full ${connectionStatus === 'connected' ? 'bg-green-500' : 'bg-red-500'
                                    }`}></div>
                                <span className="text-sm font-medium">
                                    {connectionStatus === 'connected' ? 'Connecté' : 'Déconnecté'}
                                </span>
                            </div>

                            <Button
                                onClick={toggleOnlineStatus}
                                variant={isOnline ? "destructive" : "default"}
                                className={isOnline ? "bg-red-600 hover:bg-red-700" : "bg-green-600 hover:bg-green-700"}
                            >
                                {isOnline ? 'Hors ligne' : 'En ligne'}
                            </Button>
                        </div>
                    </div>
                </div>
            </div>

            {/* Main Content */}
            <div className="max-w-7xl mx-auto px-4 py-6">
                <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
                    <TabsList className="grid w-full grid-cols-4">
                        <TabsTrigger value="dashboard">Dashboard</TabsTrigger>
                        <TabsTrigger value="requests">Demandes</TabsTrigger>
                        <TabsTrigger value="earnings">Gains</TabsTrigger>
                        <TabsTrigger value="settings">Paramètres</TabsTrigger>
                    </TabsList>

                    {/* Dashboard Tab */}
                    <TabsContent value="dashboard" className="space-y-6">
                        {/* Statistiques rapides */}
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                            <Card>
                                <CardContent className="p-4">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                                            <DollarSign className="w-5 h-5 text-green-600" />
                                        </div>
                                        <div>
                                            <p className="text-sm text-gray-600">Aujourd'hui</p>
                                            <p className="text-lg font-bold">{driverStats.todayEarnings.toLocaleString()} GNF</p>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>

                            <Card>
                                <CardContent className="p-4">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                                            <Route className="w-5 h-5 text-blue-600" />
                                        </div>
                                        <div>
                                            <p className="text-sm text-gray-600">Courses</p>
                                            <p className="text-lg font-bold">{driverStats.todayRides}</p>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>

                            <Card>
                                <CardContent className="p-4">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 bg-yellow-100 rounded-full flex items-center justify-center">
                                            <Star className="w-5 h-5 text-yellow-600" />
                                        </div>
                                        <div>
                                            <p className="text-sm text-gray-600">Note</p>
                                            <p className="text-lg font-bold">{driverStats.rating}</p>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>

                            <Card>
                                <CardContent className="p-4">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center">
                                            <Clock className="w-5 h-5 text-purple-600" />
                                        </div>
                                        <div>
                                            <p className="text-sm text-gray-600">En ligne</p>
                                            <p className="text-lg font-bold">{driverStats.onlineTime}</p>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        </div>

                        {/* Course active */}
                        {activeTrip ? (
                            <Card>
                                <CardHeader>
                                    <CardTitle className="flex items-center gap-2">
                                        <Navigation className="w-5 h-5" />
                                        Course active
                                    </CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <TaxiMotoRealTimeTracking
                                        tripId={activeTrip.id}
                                        driverLocation={null}
                                        onTripUpdate={(trip) => setActiveTrip(trip)}
                                    />
                                </CardContent>
                            </Card>
                        ) : (
                            <Card>
                                <CardContent className="p-8 text-center">
                                    <Car className="w-12 h-12 mx-auto mb-4 text-gray-400 mb-4" />
                                    <h3 className="text-lg font-semibold text-gray-700 mb-2">
                                        Aucune course active
                                    </h3>
                                    <p className="text-gray-600">
                                        {isOnline ? 'En attente de nouvelles demandes...' : 'Connectez-vous pour recevoir des demandes'}
                                    </p>
                                </CardContent>
                            </Card>
                        )}

                        {/* Notifications récentes */}
                        {notifications.length > 0 && (
                            <Card>
                                <CardHeader>
                                    <CardTitle className="flex items-center gap-2">
                                        <Bell className="w-5 h-5" />
                                        Notifications récentes
                                    </CardTitle>
                                </CardHeader>
                                <CardContent className="space-y-2">
                                    {notifications.slice(0, 3).map((notification) => (
                                        <div key={notification.id} className="p-3 bg-gray-50 rounded-lg">
                                            <div className="font-medium text-sm">{notification.title}</div>
                                            <div className="text-xs text-gray-600">{notification.message}</div>
                                        </div>
                                    ))}
                                </CardContent>
                            </Card>
                        )}
                    </TabsContent>

                    {/* Demandes Tab */}
                    <TabsContent value="requests" className="space-y-4">
                        <Card>
                            <CardHeader>
                                <CardTitle>Demandes de course à proximité</CardTitle>
                            </CardHeader>
                            <CardContent>
                                {tripRequests.length === 0 ? (
                                    <div className="text-center py-8">
                                        <MapPin className="w-12 h-12 mx-auto text-gray-400 mb-4" />
                                        <p className="text-gray-600">Aucune demande à proximité</p>
                                    </div>
                                ) : (
                                    <div className="space-y-3">
                                        {tripRequests.map((request) => (
                                            <div key={request.id} className="p-4 border rounded-lg">
                                                <div className="flex items-center justify-between mb-2">
                                                    <div className="flex items-center gap-2">
                                                        <User className="w-4 h-4 text-gray-600" />
                                                        <span className="font-medium">{request.customerName}</span>
                                                        <div className="flex items-center gap-1">
                                                            <Star className="w-3 h-3 fill-yellow-400 text-yellow-400" />
                                                            <span className="text-sm text-gray-600">{request.customerRating}</span>
                                                        </div>
                                                    </div>
                                                    <Badge variant="outline">{request.distance}km</Badge>
                                                </div>

                                                <div className="space-y-1 text-sm text-gray-600 mb-3">
                                                    <div className="flex items-center gap-2">
                                                        <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                                                        <span>{request.pickupAddress}</span>
                                                    </div>
                                                    <div className="flex items-center gap-2">
                                                        <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                                                        <span>{request.destinationAddress}</span>
                                                    </div>
                                                </div>

                                                <div className="flex items-center justify-between">
                                                    <div className="text-lg font-bold text-green-600">
                                                        {request.estimatedEarnings.toLocaleString()} GNF
                                                    </div>
                                                    <Button
                                                        onClick={() => acceptTripRequest(request.id)}
                                                        size="sm"
                                                        className="bg-green-600 hover:bg-green-700"
                                                    >
                                                        Accepter
                                                    </Button>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    </TabsContent>

                    {/* Gains Tab */}
                    <TabsContent value="earnings" className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <Card>
                                <CardContent className="p-4">
                                    <div className="text-center">
                                        <div className="text-2xl font-bold text-green-600">
                                            {walletBalance?.balance.toLocaleString() || 0} GNF
                                        </div>
                                        <div className="text-sm text-gray-600">Solde actuel</div>
                                    </div>
                                </CardContent>
                            </Card>

                            <Card>
                                <CardContent className="p-4">
                                    <div className="text-center">
                                        <div className="text-2xl font-bold text-blue-600">
                                            {driverStats.weeklyEarnings.toLocaleString()} GNF
                                        </div>
                                        <div className="text-sm text-gray-600">Cette semaine</div>
                                    </div>
                                </CardContent>
                            </Card>

                            <Card>
                                <CardContent className="p-4">
                                    <div className="text-center">
                                        <div className="text-2xl font-bold text-purple-600">
                                            {driverStats.monthlyEarnings.toLocaleString()} GNF
                                        </div>
                                        <div className="text-sm text-gray-600">Ce mois</div>
                                    </div>
                                </CardContent>
                            </Card>
                        </div>

                        <Card>
                            <CardHeader>
                                <CardTitle>Méthodes de paiement</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="space-y-2">
                                    {paymentMethods.map((method) => (
                                        <div key={method.id} className="flex items-center justify-between p-3 border rounded-lg">
                                            <div className="flex items-center gap-3">
                                                <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                                                    <DollarSign className="w-4 h-4 text-blue-600" />
                                                </div>
                                                <div>
                                                    <div className="font-medium">{method.name}</div>
                                                    <div className="text-sm text-gray-600">{method.type}</div>
                                                </div>
                                            </div>
                                            <Badge variant={method.isActive ? "default" : "secondary"}>
                                                {method.isActive ? "Actif" : "Inactif"}
                                            </Badge>
                                        </div>
                                    ))}
                                </div>
                            </CardContent>
                        </Card>
                    </TabsContent>

                    {/* Paramètres Tab */}
                    <TabsContent value="settings" className="space-y-4">
                        <Card>
                            <CardHeader>
                                <CardTitle>Paramètres du conducteur</CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <div className="font-medium">Notifications</div>
                                        <div className="text-sm text-gray-600">Recevoir les notifications de course</div>
                                    </div>
                                    <Button variant="outline" size="sm">Configurer</Button>
                                </div>

                                <div className="flex items-center justify-between">
                                    <div>
                                        <div className="font-medium">Mode de travail</div>
                                        <div className="text-sm text-gray-600">Horaires et zones de travail</div>
                                    </div>
                                    <Button variant="outline" size="sm">Modifier</Button>
                                </div>

                                <div className="flex items-center justify-between">
                                    <div>
                                        <div className="font-medium">Véhicule</div>
                                        <div className="text-sm text-gray-600">Informations du véhicule</div>
                                    </div>
                                    <Button variant="outline" size="sm">Mettre à jour</Button>
                                </div>
                            </CardContent>
                        </Card>
                    </TabsContent>
                </Tabs>
            </div>
        </div>
    );
}
