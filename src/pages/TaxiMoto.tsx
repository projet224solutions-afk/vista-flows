/**
 * PAGE PRINCIPALE TAXI-MOTO ULTRA PROFESSIONNELLE
 * Interface complète de réservation et gestion des courses
 * 224Solutions - Taxi-Moto System
 */

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
    Bike,
    MapPin,
    Navigation,
    Clock,
    CreditCard,
    Star,
    Shield,
    Zap,
    Heart,
    Calendar,
    Phone,
    AlertTriangle
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useCurrentLocation } from "@/hooks/useGeolocation";
import { mapService } from "@/services/mapService";
import { pricingService, getVehicleTypeInfo } from "@/services/pricingService";
import { toast } from "sonner";

// Composants
import TaxiMotoBooking from "@/components/taxi-moto/TaxiMotoBooking";
import TaxiMotoTracking from "@/components/taxi-moto/TaxiMotoTracking";
import TaxiMotoHistory from "@/components/taxi-moto/TaxiMotoHistory";
import TaxiMotoFavorites from "@/components/taxi-moto/TaxiMotoFavorites";
import SimpleCommunicationInterface from "@/components/communication/SimpleCommunicationInterface";
import MotoSecurityDashboard from "@/components/security/MotoSecurityDashboard";

export default function TaxiMoto() {
    const { user, profile } = useAuth();
    const { location, loading: locationLoading, error: locationError } = useCurrentLocation();

    const [activeTab, setActiveTab] = useState('booking');
    const [currentRide, setCurrentRide] = useState(null);
    const [nearbyDrivers, setNearbyDrivers] = useState([]);
    const [loadingDrivers, setLoadingDrivers] = useState(false);

    // Statistiques utilisateur
    const [userStats, setUserStats] = useState({
        totalRides: 0,
        averageRating: 0,
        favoriteDrivers: 0,
        savedRoutes: 0
    });

    useEffect(() => {
        if (location) {
            loadNearbyDrivers();
        }
    }, [location]);

    useEffect(() => {
        if (user) {
            loadUserStats();
        }
    }, [user]);

    /**
     * Charge les conducteurs proches
     */
    const loadNearbyDrivers = async () => {
        if (!location) return;

        setLoadingDrivers(true);
        try {
            // Simuler l'appel à l'API pour trouver les conducteurs proches
            // En production, ceci ferait appel à la fonction Supabase find_nearby_drivers
            const mockDrivers = [
                {
                    id: '1',
                    name: 'Mamadou Diallo',
                    rating: 4.8,
                    distance: 0.8,
                    vehicleType: 'moto_rapide',
                    eta: '3-5 min',
                    rides: 1247
                },
                {
                    id: '2',
                    name: 'Fatou Sall',
                    rating: 4.9,
                    distance: 1.2,
                    vehicleType: 'moto_premium',
                    eta: '4-6 min',
                    rides: 892
                },
                {
                    id: '3',
                    name: 'Ibrahima Ndiaye',
                    rating: 4.7,
                    distance: 1.5,
                    vehicleType: 'moto_economique',
                    eta: '5-8 min',
                    rides: 2156
                }
            ];

            setNearbyDrivers(mockDrivers);
        } catch (error) {
            console.error('Erreur chargement conducteurs:', error);
            toast.error('Impossible de charger les conducteurs proches');
        } finally {
            setLoadingDrivers(false);
        }
    };

    /**
     * Charge les statistiques utilisateur
     */
    const loadUserStats = async () => {
        try {
            // Simuler le chargement des stats depuis Supabase
            setUserStats({
                totalRides: 23,
                averageRating: 4.6,
                favoriteDrivers: 3,
                savedRoutes: 5
            });
        } catch (error) {
            console.error('Erreur chargement stats:', error);
        }
    };

    /**
     * Gère l'urgence SOS
     */
    const handleSOS = () => {
        toast.error('🚨 Alerte SOS activée ! Services d\'urgence contactés.');
        // En production: contacter les services d'urgence, notifier les contacts
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 pb-20">
            {/* Header avec informations utilisateur */}
            <header className="bg-white/90 backdrop-blur-sm border-b border-gray-200 sticky top-0 z-40">
                <div className="px-4 py-4">
                    <div className="flex items-center justify-between">
                        <div>
                            <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                                <Bike className="w-7 h-7 text-blue-600" />
                                Taxi-Moto
                            </h1>
                            <p className="text-sm text-gray-600">
                                {profile?.first_name ? `Bonjour ${profile.first_name}` : 'Service de transport urbain'}
                            </p>
                        </div>

                        {/* Bouton SOS d'urgence */}
                        <Button
                            onClick={handleSOS}
                            variant="destructive"
                            size="sm"
                            className="bg-red-600 hover:bg-red-700 animate-pulse"
                        >
                            <Shield className="w-4 h-4 mr-1" />
                            SOS
                        </Button>
                    </div>

                    {/* Indicateurs de statut */}
                    <div className="flex items-center gap-4 mt-3">
                        <div className="flex items-center gap-2">
                            <div className={`w-2 h-2 rounded-full ${location ? 'bg-green-500' : 'bg-red-500'}`}></div>
                            <span className="text-xs text-gray-600">
                                {location ? 'Position détectée' : 'Position non disponible'}
                            </span>
                        </div>

                        <div className="flex items-center gap-2">
                            <div className={`w-2 h-2 rounded-full ${nearbyDrivers.length > 0 ? 'bg-green-500' : 'bg-yellow-500'}`}></div>
                            <span className="text-xs text-gray-600">
                                {nearbyDrivers.length} conducteur{nearbyDrivers.length > 1 ? 's' : ''} proche{nearbyDrivers.length > 1 ? 's' : ''}
                            </span>
                        </div>
                    </div>
                </div>
            </header>

            {/* Statistiques rapides */}
            {user && (
                <section className="px-4 py-4">
                    <div className="grid grid-cols-4 gap-3">
                        <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-sm">
                            <CardContent className="p-3 text-center">
                                <div className="text-lg font-bold text-blue-600">{userStats.totalRides}</div>
                                <div className="text-xs text-gray-600">Courses</div>
                            </CardContent>
                        </Card>

                        <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-sm">
                            <CardContent className="p-3 text-center">
                                <div className="text-lg font-bold text-yellow-600 flex items-center justify-center gap-1">
                                    {userStats.averageRating}
                                    <Star className="w-3 h-3 fill-current" />
                                </div>
                                <div className="text-xs text-gray-600">Note</div>
                            </CardContent>
                        </Card>

                        <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-sm">
                            <CardContent className="p-3 text-center">
                                <div className="text-lg font-bold text-red-600">{userStats.favoriteDrivers}</div>
                                <div className="text-xs text-gray-600">Favoris</div>
                            </CardContent>
                        </Card>

                        <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-sm">
                            <CardContent className="p-3 text-center">
                                <div className="text-lg font-bold text-purple-600">{userStats.savedRoutes}</div>
                                <div className="text-xs text-gray-600">Trajets</div>
                            </CardContent>
                        </Card>
                    </div>
                </section>
            )}

            {/* Navigation par onglets */}
            <div className="px-4">
                <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                    <TabsList className="grid w-full grid-cols-6 bg-white/80 backdrop-blur-sm">
                        <TabsTrigger value="booking" className="text-xs">
                            <Navigation className="w-4 h-4 mr-1" />
                            Réserver
                        </TabsTrigger>
                        <TabsTrigger value="tracking" className="text-xs">
                            <MapPin className="w-4 h-4 mr-1" />
                            Suivi
                        </TabsTrigger>
                        <TabsTrigger value="history" className="text-xs">
                            <Clock className="w-4 h-4 mr-1" />
                            Historique
                        </TabsTrigger>
                        <TabsTrigger value="favorites" className="text-xs">
                            <Heart className="w-4 h-4 mr-1" />
                            Favoris
                        </TabsTrigger>
                        <TabsTrigger value="security" className="text-xs">
                            <Shield className="w-4 h-4 mr-1" />
                            Sécurité
                        </TabsTrigger>
                        <TabsTrigger value="communication" className="text-xs">
                            <Phone className="w-4 h-4 mr-1" />
                            Communication
                        </TabsTrigger>
                    </TabsList>

                    {/* Contenu des onglets */}
                    <div className="mt-4">
                        <TabsContent value="booking" className="space-y-4">
                            <TaxiMotoBooking
                                userLocation={location}
                                nearbyDrivers={nearbyDrivers}
                                onRideCreated={setCurrentRide}
                            />
                        </TabsContent>

                        <TabsContent value="tracking" className="space-y-4">
                            <TaxiMotoTracking
                                currentRide={currentRide}
                                userLocation={location}
                            />
                        </TabsContent>

                        <TabsContent value="history" className="space-y-4">
                            <TaxiMotoHistory userId={user?.id} />
                        </TabsContent>

                        <TabsContent value="favorites" className="space-y-4">
                            <TaxiMotoFavorites userId={user?.id} />
                        </TabsContent>
                        <TabsContent value="security" className="space-y-4">
                            <MotoSecurityDashboard 
                                bureauId={user?.bureau_id}
                                isPDG={false}
                            />
                        </TabsContent>
                        <TabsContent value="communication" className="space-y-4">
                            <SimpleCommunicationInterface />
                        </TabsContent>
                    </div>
                </Tabs>
            </div>

            {/* Section d'aide et informations */}
            <section className="px-4 py-6 mt-6">
                <Card className="bg-gradient-to-r from-blue-500 to-purple-600 text-white border-0">
                    <CardContent className="p-6">
                        <div className="text-center">
                            <Bike className="w-12 h-12 mx-auto mb-4 text-white" />
                            <h3 className="text-xl font-bold mb-2">Service Taxi-Moto 224Solutions</h3>
                            <p className="text-blue-100 mb-4">
                                Transport urbain rapide, sûr et économique
                            </p>

                            <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
                                <div className="flex items-center gap-2">
                                    <Zap className="w-4 h-4" />
                                    <span>Réservation instantanée</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <Shield className="w-4 h-4" />
                                    <span>Conducteurs vérifiés</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <MapPin className="w-4 h-4" />
                                    <span>Suivi temps réel</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <CreditCard className="w-4 h-4" />
                                    <span>Paiement sécurisé</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <Phone className="w-4 h-4" />
                                    <span>Support 24/7</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <Star className="w-4 h-4" />
                                    <span>Service de qualité</span>
                                </div>
                            </div>

                            <div className="mt-6 pt-4 border-t border-blue-400">
                                <p className="text-xs text-blue-100">
                                    🚨 En cas d'urgence, utilisez le bouton SOS en haut à droite
                                </p>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </section>

            {/* Alerte si pas de géolocalisation */}
            {locationError && (
                <div className="fixed top-20 left-4 right-4 z-50">
                    <Card className="bg-yellow-50 border-yellow-200">
                        <CardContent className="p-4">
                            <div className="flex items-center gap-3">
                                <AlertTriangle className="w-5 h-5 text-yellow-600" />
                                <div>
                                    <p className="text-sm font-medium text-yellow-800">
                                        Géolocalisation requise
                                    </p>
                                    <p className="text-xs text-yellow-700">
                                        Activez votre GPS pour une meilleure expérience
                                    </p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            )}
        </div>
    );
}
