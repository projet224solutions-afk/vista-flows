/**
 * INTERFACE CONDUCTEUR TAXI-MOTO ULTRA PROFESSIONNELLE
 * Dashboard complet pour les conducteurs avec navigation temps réel
 * 224Solutions - Taxi-Moto System
 */

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
    Navigation,
    MapPin,
    Clock,
    DollarSign,
    Star,
    Phone,
    MessageCircle,
    AlertTriangle,
    CheckCircle,
    Car,
    TrendingUp,
    Battery,
    Wifi,
    Settings,
    LogOut
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useLocationWatcher } from "@/hooks/useGeolocation";
import { toast } from "sonner";

interface RideRequest {
    id: string;
    customerId: string;
    customerName: string;
    customerRating: number;
    pickupAddress: string;
    destinationAddress: string;
    distance: number;
    estimatedEarnings: number;
    estimatedDuration: number;
    pickupCoords: { latitude: number; longitude: number };
    destinationCoords: { latitude: number; longitude: number };
    requestTime: string;
}

interface ActiveRide {
    id: string;
    customer: {
        name: string;
        phone: string;
        rating: number;
    };
    pickup: {
        address: string;
        coords: { latitude: number; longitude: number };
    };
    destination: {
        address: string;
        coords: { latitude: number; longitude: number };
    };
    status: 'accepted' | 'arriving' | 'picked_up' | 'in_progress';
    startTime: string;
    estimatedEarnings: number;
}

export default function TaxiMotoDriver() {
    const { user, profile, signOut } = useAuth();
    const { location, isWatching, startWatching, stopWatching } = useLocationWatcher();

    const [isOnline, setIsOnline] = useState(false);
    const [activeTab, setActiveTab] = useState('dashboard');
    const [rideRequests, setRideRequests] = useState<RideRequest[]>([]);
    const [activeRide, setActiveRide] = useState<ActiveRide | null>(null);
    const [driverStats, setDriverStats] = useState({
        todayEarnings: 0,
        todayRides: 0,
        rating: 0,
        totalRides: 0,
        onlineTime: '0h 0m'
    });

    // États de navigation
    const [navigationActive, setNavigationActive] = useState(false);
    const [currentStep, setCurrentStep] = useState('');
    const [nextInstruction, setNextInstruction] = useState('');
    const [distanceToDestination, setDistanceToDestination] = useState(0);
    const [timeToDestination, setTimeToDestination] = useState(0);

    useEffect(() => {
        loadDriverStats();
        if (isOnline) {
            startLocationTracking();
            simulateRideRequests();
        } else {
            stopLocationTracking();
        }
    }, [isOnline]);

    /**
     * Démarre le suivi de position
     */
    const startLocationTracking = () => {
        startWatching();
        // En production: envoyer la position au serveur en temps réel
        console.log('📍 Suivi de position activé');
    };

    /**
     * Arrête le suivi de position
     */
    const stopLocationTracking = () => {
        stopWatching();
        console.log('📍 Suivi de position désactivé');
    };

    /**
     * Bascule le statut en ligne/hors ligne
     */
    const toggleOnlineStatus = () => {
        setIsOnline(!isOnline);
        if (!isOnline) {
            toast.success('🟢 Vous êtes maintenant en ligne');
        } else {
            toast.info('🔴 Vous êtes maintenant hors ligne');
        }
    };

    /**
     * Charge les statistiques du conducteur
     */
    const loadDriverStats = async () => {
        // Simuler le chargement depuis Supabase
        setDriverStats({
            todayEarnings: 25600,
            todayRides: 8,
            rating: 4.8,
            totalRides: 247,
            onlineTime: '6h 30m'
        });
    };

    /**
     * Simule l'arrivée de demandes de course
     */
    const simulateRideRequests = () => {
        if (!isOnline) return;

        const mockRequests: RideRequest[] = [
            {
                id: 'REQ-001',
                customerId: 'user-1',
                customerName: 'Aminata Ba',
                customerRating: 4.6,
                pickupAddress: 'Plateau, Conakry',
                destinationAddress: 'Almadies, Conakry',
                distance: 12.5,
                estimatedEarnings: 3200,
                estimatedDuration: 25,
                pickupCoords: { latitude: 14.6937, longitude: -17.4441 },
                destinationCoords: { latitude: 14.7167, longitude: -17.4677 },
                requestTime: new Date().toISOString()
            }
        ];

        setTimeout(() => {
            if (isOnline && !activeRide) {
                setRideRequests(mockRequests);
                toast.info('🚗 Nouvelle demande de course !');
            }
        }, 5000);
    };

    /**
     * Accepte une demande de course
     */
    const acceptRideRequest = (request: RideRequest) => {
        const newActiveRide: ActiveRide = {
            id: request.id,
            customer: {
                name: request.customerName,
                phone: '+221 77 123 45 67', // Simulé
                rating: request.customerRating
            },
            pickup: {
                address: request.pickupAddress,
                coords: request.pickupCoords
            },
            destination: {
                address: request.destinationAddress,
                coords: request.destinationCoords
            },
            status: 'accepted',
            startTime: new Date().toISOString(),
            estimatedEarnings: request.estimatedEarnings
        };

        setActiveRide(newActiveRide);
        setRideRequests([]);
        setNavigationActive(true);
        setActiveTab('navigation');

        toast.success('Course acceptée ! Navigation vers le client...');

        // Simuler la navigation
        simulateNavigation(request.pickupCoords);
    };

    /**
     * Refuse une demande de course
     */
    const declineRideRequest = (requestId: string) => {
        setRideRequests(prev => prev.filter(req => req.id !== requestId));
        toast.info('Demande refusée');
    };

    /**
     * Simule la navigation GPS
     */
    const simulateNavigation = (destination: { latitude: number; longitude: number }) => {
        const instructions = [
            'Continuez tout droit sur 500m',
            'Tournez à droite dans 200m',
            'Au rond-point, prenez la 2ème sortie',
            'Tournez à gauche sur Avenue Bourguiba',
            'Destination atteinte'
        ];

        let stepIndex = 0;
        const interval = setInterval(() => {
            if (stepIndex < instructions.length) {
                setNextInstruction(instructions[stepIndex]);
                setDistanceToDestination(Math.max(0, 2000 - (stepIndex * 400)));
                setTimeToDestination(Math.max(0, 8 - (stepIndex * 2)));
                stepIndex++;
            } else {
                clearInterval(interval);
                if (activeRide?.status === 'accepted') {
                    updateRideStatus('arriving');
                } else if (activeRide?.status === 'picked_up') {
                    updateRideStatus('in_progress');
                }
            }
        }, 3000);
    };

    /**
     * Met à jour le statut de la course
     */
    const updateRideStatus = (newStatus: ActiveRide['status']) => {
        if (!activeRide) return;

        setActiveRide(prev => prev ? { ...prev, status: newStatus } : null);

        switch (newStatus) {
            case 'arriving':
                toast.success('🎯 Vous êtes arrivé au point de rendez-vous');
                break;
            case 'picked_up':
                toast.success('🚗 Client à bord, navigation vers la destination...');
                if (activeRide) {
                    simulateNavigation(activeRide.destination.coords);
                }
                break;
            case 'in_progress':
                toast.success('🏁 Course terminée !');
                completeRide();
                break;
        }
    };

    /**
     * Termine la course
     */
    const completeRide = () => {
        if (!activeRide) return;

        // Mettre à jour les statistiques
        setDriverStats(prev => ({
            ...prev,
            todayEarnings: prev.todayEarnings + activeRide.estimatedEarnings,
            todayRides: prev.todayRides + 1
        }));

        setActiveRide(null);
        setNavigationActive(false);
        setActiveTab('dashboard');

        toast.success(`💰 Course terminée ! +${activeRide.estimatedEarnings.toLocaleString()} FCFA`);
    };

    /**
     * Contacte le client
     */
    const contactCustomer = (phone: string) => {
        window.open(`tel:${phone}`);
    };

    /**
     * Déconnexion
     */
    const handleSignOut = async () => {
        setIsOnline(false);
        await signOut();
        toast.success('Déconnexion réussie');
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-blue-50 to-green-50 pb-20">
            {/* Header conducteur */}
            <header className="bg-white/90 backdrop-blur-sm border-b border-gray-200 sticky top-0 z-40">
                <div className="px-4 py-4">
                    <div className="flex items-center justify-between">
                        <div>
                            <h1 className="text-xl font-bold text-gray-900">
                                Conducteur {profile?.first_name || 'Taxi-Moto'}
                            </h1>
                            <div className="flex items-center gap-2">
                                <div className={`w-2 h-2 rounded-full ${isOnline ? 'bg-green-500' : 'bg-red-500'}`}></div>
                                <span className="text-sm text-gray-600">
                                    {isOnline ? 'En ligne' : 'Hors ligne'}
                                </span>
                                {location && (
                                    <>
                                        <span className="text-gray-400">•</span>
                                        <span className="text-xs text-gray-500">GPS actif</span>
                                    </>
                                )}
                            </div>
                        </div>

                        <div className="flex items-center gap-2">
                            <Button
                                onClick={toggleOnlineStatus}
                                variant={isOnline ? "destructive" : "default"}
                                size="sm"
                            >
                                {isOnline ? 'Se déconnecter' : 'Se connecter'}
                            </Button>
                            <Button
                                onClick={handleSignOut}
                                variant="outline"
                                size="sm"
                            >
                                <LogOut className="w-4 h-4" />
                            </Button>
                        </div>
                    </div>
                </div>
            </header>

            {/* Demandes de course en attente */}
            {rideRequests.length > 0 && (
                <div className="fixed top-20 left-4 right-4 z-50">
                    {rideRequests.map((request) => (
                        <Card key={request.id} className="bg-yellow-50 border-yellow-200 mb-2">
                            <CardContent className="p-4">
                                <div className="flex items-center justify-between mb-3">
                                    <div>
                                        <h3 className="font-semibold">Nouvelle course</h3>
                                        <p className="text-sm text-gray-600">{request.customerName}</p>
                                    </div>
                                    <Badge className="bg-green-100 text-green-800">
                                        +{request.estimatedEarnings.toLocaleString()} FCFA
                                    </Badge>
                                </div>

                                <div className="space-y-1 mb-3 text-sm">
                                    <div className="flex items-center gap-2">
                                        <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                                        <span>{request.pickupAddress}</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                                        <span>{request.destinationAddress}</span>
                                    </div>
                                </div>

                                <div className="flex items-center justify-between text-xs text-gray-600 mb-3">
                                    <span>{request.distance}km • {request.estimatedDuration}min</span>
                                    <div className="flex items-center gap-1">
                                        <Star className="w-3 h-3 fill-yellow-400 text-yellow-400" />
                                        <span>{request.customerRating}</span>
                                    </div>
                                </div>

                                <div className="flex gap-2">
                                    <Button
                                        onClick={() => declineRideRequest(request.id)}
                                        variant="outline"
                                        size="sm"
                                        className="flex-1"
                                    >
                                        Refuser
                                    </Button>
                                    <Button
                                        onClick={() => acceptRideRequest(request)}
                                        size="sm"
                                        className="flex-1 bg-green-600 hover:bg-green-700"
                                    >
                                        Accepter
                                    </Button>
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            )}

            {/* Navigation par onglets */}
            <div className="px-4 mt-4">
                <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                    <TabsList className="grid w-full grid-cols-3 bg-white/80 backdrop-blur-sm">
                        <TabsTrigger value="dashboard">
                            <TrendingUp className="w-4 h-4 mr-1" />
                            Dashboard
                        </TabsTrigger>
                        <TabsTrigger value="navigation" disabled={!activeRide}>
                            <Navigation className="w-4 h-4 mr-1" />
                            Navigation
                        </TabsTrigger>
                        <TabsTrigger value="earnings">
                            <DollarSign className="w-4 h-4 mr-1" />
                            Gains
                        </TabsTrigger>
                    </TabsList>

                    {/* Dashboard */}
                    <TabsContent value="dashboard" className="space-y-4 mt-4">
                        {/* Statistiques du jour */}
                        <div className="grid grid-cols-2 gap-4">
                            <Card className="bg-white/90 backdrop-blur-sm border-0 shadow-lg">
                                <CardContent className="p-4 text-center">
                                    <div className="text-2xl font-bold text-green-600">
                                        {driverStats.todayEarnings.toLocaleString()}
                                    </div>
                                    <div className="text-sm text-gray-600">FCFA aujourd'hui</div>
                                </CardContent>
                            </Card>

                            <Card className="bg-white/90 backdrop-blur-sm border-0 shadow-lg">
                                <CardContent className="p-4 text-center">
                                    <div className="text-2xl font-bold text-blue-600">
                                        {driverStats.todayRides}
                                    </div>
                                    <div className="text-sm text-gray-600">Courses</div>
                                </CardContent>
                            </Card>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <Card className="bg-white/90 backdrop-blur-sm border-0 shadow-lg">
                                <CardContent className="p-4 text-center">
                                    <div className="text-2xl font-bold text-yellow-600 flex items-center justify-center gap-1">
                                        {driverStats.rating}
                                        <Star className="w-5 h-5 fill-current" />
                                    </div>
                                    <div className="text-sm text-gray-600">Note moyenne</div>
                                </CardContent>
                            </Card>

                            <Card className="bg-white/90 backdrop-blur-sm border-0 shadow-lg">
                                <CardContent className="p-4 text-center">
                                    <div className="text-2xl font-bold text-purple-600">
                                        {driverStats.onlineTime}
                                    </div>
                                    <div className="text-sm text-gray-600">En ligne</div>
                                </CardContent>
                            </Card>
                        </div>

                        {/* Course active */}
                        {activeRide && (
                            <Card className="bg-white/90 backdrop-blur-sm border-0 shadow-lg">
                                <CardHeader>
                                    <CardTitle className="flex items-center gap-2">
                                        <Car className="w-5 h-5 text-blue-600" />
                                        Course en cours
                                    </CardTitle>
                                </CardHeader>
                                <CardContent className="space-y-4">
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <h3 className="font-semibold">{activeRide.customer.name}</h3>
                                            <div className="flex items-center gap-2 text-sm text-gray-600">
                                                <Star className="w-3 h-3 fill-yellow-400 text-yellow-400" />
                                                <span>{activeRide.customer.rating}</span>
                                            </div>
                                        </div>
                                        <Badge className={`${activeRide.status === 'accepted' ? 'bg-yellow-100 text-yellow-800' :
                                                activeRide.status === 'arriving' ? 'bg-blue-100 text-blue-800' :
                                                    activeRide.status === 'picked_up' ? 'bg-green-100 text-green-800' :
                                                        'bg-purple-100 text-purple-800'
                                            }`}>
                                            {activeRide.status === 'accepted' ? 'Acceptée' :
                                                activeRide.status === 'arriving' ? 'En route' :
                                                    activeRide.status === 'picked_up' ? 'Client à bord' :
                                                        'En cours'}
                                        </Badge>
                                    </div>

                                    <div className="space-y-2">
                                        <div className="flex items-center gap-2 text-sm">
                                            <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                                            <span>{activeRide.pickup.address}</span>
                                        </div>
                                        <div className="flex items-center gap-2 text-sm">
                                            <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                                            <span>{activeRide.destination.address}</span>
                                        </div>
                                    </div>

                                    <div className="flex gap-2">
                                        <Button
                                            onClick={() => contactCustomer(activeRide.customer.phone)}
                                            variant="outline"
                                            size="sm"
                                            className="flex-1"
                                        >
                                            <Phone className="w-4 h-4 mr-1" />
                                            Appeler
                                        </Button>
                                        <Button
                                            onClick={() => setActiveTab('navigation')}
                                            size="sm"
                                            className="flex-1"
                                        >
                                            <Navigation className="w-4 h-4 mr-1" />
                                            Navigation
                                        </Button>
                                    </div>
                                </CardContent>
                            </Card>
                        )}

                        {/* État du système */}
                        <Card className="bg-white/90 backdrop-blur-sm border-0 shadow-lg">
                            <CardHeader>
                                <CardTitle className="text-lg">État du système</CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-3">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <MapPin className="w-4 h-4 text-green-600" />
                                        <span className="text-sm">GPS</span>
                                    </div>
                                    <Badge className="bg-green-100 text-green-800">Actif</Badge>
                                </div>

                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <Wifi className="w-4 h-4 text-green-600" />
                                        <span className="text-sm">Connexion</span>
                                    </div>
                                    <Badge className="bg-green-100 text-green-800">Excellente</Badge>
                                </div>

                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <Battery className="w-4 h-4 text-yellow-600" />
                                        <span className="text-sm">Batterie</span>
                                    </div>
                                    <Badge className="bg-yellow-100 text-yellow-800">75%</Badge>
                                </div>
                            </CardContent>
                        </Card>
                    </TabsContent>

                    {/* Navigation */}
                    <TabsContent value="navigation" className="space-y-4 mt-4">
                        {activeRide && navigationActive ? (
                            <>
                                {/* Instruction de navigation */}
                                <Card className="bg-blue-50 border-blue-200">
                                    <CardContent className="p-6 text-center">
                                        <Navigation className="w-12 h-12 mx-auto mb-4 text-blue-600" />
                                        <h3 className="text-lg font-semibold mb-2">{nextInstruction}</h3>
                                        <div className="flex items-center justify-center gap-4 text-sm text-gray-600">
                                            <span>{distanceToDestination}m</span>
                                            <span>•</span>
                                            <span>{timeToDestination} min</span>
                                        </div>
                                    </CardContent>
                                </Card>

                                {/* Actions de course */}
                                <Card className="bg-white/90 backdrop-blur-sm border-0 shadow-lg">
                                    <CardContent className="p-4 space-y-3">
                                        {activeRide.status === 'accepted' && (
                                            <Button
                                                onClick={() => updateRideStatus('arriving')}
                                                className="w-full"
                                            >
                                                <CheckCircle className="w-4 h-4 mr-2" />
                                                Je suis arrivé
                                            </Button>
                                        )}

                                        {activeRide.status === 'arriving' && (
                                            <Button
                                                onClick={() => updateRideStatus('picked_up')}
                                                className="w-full"
                                            >
                                                <Car className="w-4 h-4 mr-2" />
                                                Client à bord
                                            </Button>
                                        )}

                                        {activeRide.status === 'picked_up' && (
                                            <Button
                                                onClick={() => updateRideStatus('in_progress')}
                                                className="w-full bg-green-600 hover:bg-green-700"
                                            >
                                                <CheckCircle className="w-4 h-4 mr-2" />
                                                Terminer la course
                                            </Button>
                                        )}
                                    </CardContent>
                                </Card>
                            </>
                        ) : (
                            <Card className="bg-white/90 backdrop-blur-sm border-0 shadow-lg">
                                <CardContent className="p-8 text-center">
                                    <Navigation className="w-12 h-12 mx-auto mb-4 text-gray-400" />
                                    <h3 className="text-lg font-semibold text-gray-700 mb-2">
                                        Aucune navigation active
                                    </h3>
                                    <p className="text-gray-600">
                                        Acceptez une course pour commencer la navigation
                                    </p>
                                </CardContent>
                            </Card>
                        )}
                    </TabsContent>

                    {/* Gains */}
                    <TabsContent value="earnings" className="space-y-4 mt-4">
                        <Card className="bg-white/90 backdrop-blur-sm border-0 shadow-lg">
                            <CardHeader>
                                <CardTitle>Résumé des gains</CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="text-center">
                                    <div className="text-3xl font-bold text-green-600 mb-2">
                                        {driverStats.todayEarnings.toLocaleString()} FCFA
                                    </div>
                                    <p className="text-gray-600">Gains d'aujourd'hui</p>
                                </div>

                                <div className="grid grid-cols-2 gap-4 pt-4 border-t">
                                    <div className="text-center">
                                        <div className="text-lg font-bold text-blue-600">
                                            {driverStats.todayRides}
                                        </div>
                                        <div className="text-sm text-gray-600">Courses</div>
                                    </div>
                                    <div className="text-center">
                                        <div className="text-lg font-bold text-purple-600">
                                            {driverStats.todayRides > 0 ? Math.round(driverStats.todayEarnings / driverStats.todayRides) : 0}
                                        </div>
                                        <div className="text-sm text-gray-600">FCFA/course</div>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    </TabsContent>
                </Tabs>
            </div>
        </div>
    );
}
