/**
 * COMPOSANT FAVORIS TAXI-MOTO
 * Gestion des trajets et conducteurs favoris
 * 224Solutions - Taxi-Moto System
 */

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
    Heart,
    MapPin,
    Star,
    Plus,
    Trash2,
    Navigation,
    User,
    Clock,
    Edit
} from "lucide-react";
import { toast } from "sonner";

interface FavoriteRoute {
    id: string;
    name: string;
    pickupAddress: string;
    destinationAddress: string;
    estimatedDistance: number;
    estimatedDuration: number;
    usageCount: number;
    lastUsed: string;
}

interface FavoriteDriver {
    id: string;
    name: string;
    rating: number;
    totalRides: number;
    vehicleType: string;
    vehicleNumber: string;
    lastRide: string;
    averagePrice: number;
}

interface TaxiMotoFavoritesProps {
    userId?: string;
}

export default function TaxiMotoFavorites({ userId }: TaxiMotoFavoritesProps) {
    const [activeTab, setActiveTab] = useState<'routes' | 'drivers'>('routes');
    const [favoriteRoutes, setFavoriteRoutes] = useState<FavoriteRoute[]>([]);
    const [favoriteDrivers, setFavoriteDrivers] = useState<FavoriteDriver[]>([]);
    const [loading, setLoading] = useState(true);

    // États pour l'ajout de nouveau trajet favori
    const [showAddRoute, setShowAddRoute] = useState(false);
    const [newRouteName, setNewRouteName] = useState('');
    const [newRoutePickup, setNewRoutePickup] = useState('');
    const [newRouteDestination, setNewRouteDestination] = useState('');

    useEffect(() => {
        loadFavorites();
    }, [userId]);

    /**
     * Charge les favoris
     */
    const loadFavorites = async () => {
        setLoading(true);
        try {
            // Simuler le chargement depuis Supabase
            const mockRoutes: FavoriteRoute[] = [
                {
                    id: '1',
                    name: 'Maison → Bureau',
                    pickupAddress: 'Liberté 6, Conakry',
                    destinationAddress: 'Plateau, Conakry',
                    estimatedDistance: 8.5,
                    estimatedDuration: 18,
                    usageCount: 23,
                    lastUsed: '2025-09-30T08:30:00Z'
                },
                {
                    id: '2',
                    name: 'Bureau → Marché',
                    pickupAddress: 'Plateau, Conakry',
                    destinationAddress: 'Marché Sandaga, Conakry',
                    estimatedDistance: 3.2,
                    estimatedDuration: 12,
                    usageCount: 8,
                    lastUsed: '2025-09-28T17:45:00Z'
                },
                {
                    id: '3',
                    name: 'Aéroport → Hôtel',
                    pickupAddress: 'Aéroport LSS, Conakry',
                    destinationAddress: 'Almadies, Conakry',
                    estimatedDistance: 15.7,
                    estimatedDuration: 35,
                    usageCount: 3,
                    lastUsed: '2025-09-25T14:20:00Z'
                }
            ];

            const mockDrivers: FavoriteDriver[] = [
                {
                    id: '1',
                    name: 'Mamadou Diallo',
                    rating: 4.9,
                    totalRides: 12,
                    vehicleType: 'moto_rapide',
                    vehicleNumber: 'DK-1234-AB',
                    lastRide: '2025-09-30T14:30:00Z',
                    averagePrice: 2800
                },
                {
                    id: '2',
                    name: 'Fatou Sall',
                    rating: 4.8,
                    totalRides: 8,
                    vehicleType: 'moto_premium',
                    vehicleNumber: 'DK-5678-CD',
                    lastRide: '2025-09-29T09:15:00Z',
                    averagePrice: 3200
                },
                {
                    id: '3',
                    name: 'Ibrahima Ndiaye',
                    rating: 4.7,
                    totalRides: 15,
                    vehicleType: 'moto_economique',
                    vehicleNumber: 'DK-9012-EF',
                    lastRide: '2025-09-27T16:45:00Z',
                    averagePrice: 2400
                }
            ];

            setFavoriteRoutes(mockRoutes);
            setFavoriteDrivers(mockDrivers);
        } catch (error) {
            console.error('Erreur chargement favoris:', error);
            toast.error('Impossible de charger les favoris');
        } finally {
            setLoading(false);
        }
    };

    /**
     * Ajoute un nouveau trajet favori
     */
    const addFavoriteRoute = async () => {
        if (!newRouteName || !newRoutePickup || !newRouteDestination) {
            toast.error('Veuillez remplir tous les champs');
            return;
        }

        const newRoute: FavoriteRoute = {
            id: Date.now().toString(),
            name: newRouteName,
            pickupAddress: newRoutePickup,
            destinationAddress: newRouteDestination,
            estimatedDistance: 0,
            estimatedDuration: 0,
            usageCount: 0,
            lastUsed: new Date().toISOString()
        };

        setFavoriteRoutes(prev => [...prev, newRoute]);
        setNewRouteName('');
        setNewRoutePickup('');
        setNewRouteDestination('');
        setShowAddRoute(false);

        toast.success('Trajet ajouté aux favoris');
    };

    /**
     * Supprime un trajet favori
     */
    const removeFavoriteRoute = (routeId: string) => {
        setFavoriteRoutes(prev => prev.filter(route => route.id !== routeId));
        toast.success('Trajet supprimé des favoris');
    };

    /**
     * Supprime un conducteur favori
     */
    const removeFavoriteDriver = (driverId: string) => {
        setFavoriteDrivers(prev => prev.filter(driver => driver.id !== driverId));
        toast.success('Conducteur supprimé des favoris');
    };

    /**
     * Utilise un trajet favori pour une nouvelle réservation
     */
    const useRoute = (route: FavoriteRoute) => {
        toast.info(`Redirection vers réservation: ${route.name}`);
        // En production: rediriger vers l'onglet réservation avec les données pré-remplies
    };

    /**
     * Demande un conducteur favori
     */
    const requestDriver = (driver: FavoriteDriver) => {
        toast.info(`Recherche de ${driver.name} pour votre course...`);
        // En production: logique pour demander spécifiquement ce conducteur
    };

    /**
     * Formate la date
     */
    const formatDate = (dateString: string) => {
        const date = new Date(dateString);
        const now = new Date();
        const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));

        if (diffDays === 0) return 'Aujourd\'hui';
        if (diffDays === 1) return 'Hier';
        if (diffDays < 7) return `Il y a ${diffDays} jours`;
        return date.toLocaleDateString('fr-FR');
    };

    if (loading) {
        return (
            <Card className="bg-white/90 backdrop-blur-sm border-0 shadow-lg">
                <CardContent className="p-8 text-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
                    <p className="text-gray-600">Chargement des favoris...</p>
                </CardContent>
            </Card>
        );
    }

    return (
        <div className="space-y-4">
            {/* Navigation des onglets */}
            <Card className="bg-white/90 backdrop-blur-sm border-0 shadow-lg">
                <CardContent className="p-4">
                    <div className="flex gap-2">
                        <Button
                            onClick={() => setActiveTab('routes')}
                            variant={activeTab === 'routes' ? 'default' : 'outline'}
                            className="flex-1"
                        >
                            <MapPin className="w-4 h-4 mr-2" />
                            Trajets ({favoriteRoutes.length})
                        </Button>
                        <Button
                            onClick={() => setActiveTab('drivers')}
                            variant={activeTab === 'drivers' ? 'default' : 'outline'}
                            className="flex-1"
                        >
                            <User className="w-4 h-4 mr-2" />
                            Conducteurs ({favoriteDrivers.length})
                        </Button>
                    </div>
                </CardContent>
            </Card>

            {/* Onglet Trajets favoris */}
            {activeTab === 'routes' && (
                <div className="space-y-4">
                    {/* Bouton d'ajout */}
                    <Card className="bg-white/90 backdrop-blur-sm border-0 shadow-lg">
                        <CardContent className="p-4">
                            {!showAddRoute ? (
                                <Button
                                    onClick={() => setShowAddRoute(true)}
                                    variant="outline"
                                    className="w-full"
                                >
                                    <Plus className="w-4 h-4 mr-2" />
                                    Ajouter un trajet favori
                                </Button>
                            ) : (
                                <div className="space-y-3">
                                    <Input
                                        placeholder="Nom du trajet (ex: Maison → Bureau)"
                                        value={newRouteName}
                                        onChange={(e) => setNewRouteName(e.target.value)}
                                    />
                                    <Input
                                        placeholder="Adresse de départ"
                                        value={newRoutePickup}
                                        onChange={(e) => setNewRoutePickup(e.target.value)}
                                    />
                                    <Input
                                        placeholder="Adresse de destination"
                                        value={newRouteDestination}
                                        onChange={(e) => setNewRouteDestination(e.target.value)}
                                    />
                                    <div className="flex gap-2">
                                        <Button onClick={addFavoriteRoute} className="flex-1">
                                            Ajouter
                                        </Button>
                                        <Button
                                            onClick={() => setShowAddRoute(false)}
                                            variant="outline"
                                            className="flex-1"
                                        >
                                            Annuler
                                        </Button>
                                    </div>
                                </div>
                            )}
                        </CardContent>
                    </Card>

                    {/* Liste des trajets favoris */}
                    {favoriteRoutes.length === 0 ? (
                        <Card className="bg-white/90 backdrop-blur-sm border-0 shadow-lg">
                            <CardContent className="p-8 text-center">
                                <Heart className="w-12 h-12 mx-auto mb-4 text-gray-400" />
                                <h3 className="text-lg font-semibold text-gray-700 mb-2">
                                    Aucun trajet favori
                                </h3>
                                <p className="text-gray-600">
                                    Ajoutez vos trajets fréquents pour réserver plus rapidement
                                </p>
                            </CardContent>
                        </Card>
                    ) : (
                        favoriteRoutes.map((route) => (
                            <Card key={route.id} className="bg-white/90 backdrop-blur-sm border-0 shadow-lg">
                                <CardContent className="p-4">
                                    <div className="flex items-start justify-between mb-3">
                                        <div className="flex-1">
                                            <h3 className="font-semibold text-lg mb-1">{route.name}</h3>
                                            <div className="space-y-1">
                                                <div className="flex items-center gap-2 text-sm text-gray-600">
                                                    <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                                                    <span>{route.pickupAddress}</span>
                                                </div>
                                                <div className="flex items-center gap-2 text-sm text-gray-600">
                                                    <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                                                    <span>{route.destinationAddress}</span>
                                                </div>
                                            </div>
                                        </div>

                                        <Button
                                            onClick={() => removeFavoriteRoute(route.id)}
                                            variant="ghost"
                                            size="sm"
                                            className="text-red-500 hover:text-red-700"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </Button>
                                    </div>

                                    <div className="flex items-center justify-between text-xs text-gray-600 mb-3">
                                        <span>{route.usageCount} utilisations</span>
                                        <span>Dernière fois: {formatDate(route.lastUsed)}</span>
                                    </div>

                                    <Button
                                        onClick={() => useRoute(route)}
                                        className="w-full"
                                    >
                                        <Navigation className="w-4 h-4 mr-2" />
                                        Utiliser ce trajet
                                    </Button>
                                </CardContent>
                            </Card>
                        ))
                    )}
                </div>
            )}

            {/* Onglet Conducteurs favoris */}
            {activeTab === 'drivers' && (
                <div className="space-y-4">
                    {favoriteDrivers.length === 0 ? (
                        <Card className="bg-white/90 backdrop-blur-sm border-0 shadow-lg">
                            <CardContent className="p-8 text-center">
                                <User className="w-12 h-12 mx-auto mb-4 text-gray-400" />
                                <h3 className="text-lg font-semibold text-gray-700 mb-2">
                                    Aucun conducteur favori
                                </h3>
                                <p className="text-gray-600">
                                    Vos conducteurs préférés apparaîtront ici après vos courses
                                </p>
                            </CardContent>
                        </Card>
                    ) : (
                        favoriteDrivers.map((driver) => (
                            <Card key={driver.id} className="bg-white/90 backdrop-blur-sm border-0 shadow-lg">
                                <CardContent className="p-4">
                                    <div className="flex items-start justify-between mb-3">
                                        <div className="flex items-center gap-3">
                                            <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                                                <User className="w-6 h-6 text-blue-600" />
                                            </div>
                                            <div>
                                                <h3 className="font-semibold text-lg">{driver.name}</h3>
                                                <div className="flex items-center gap-2 text-sm text-gray-600">
                                                    <Star className="w-3 h-3 fill-yellow-400 text-yellow-400" />
                                                    <span>{driver.rating}</span>
                                                    <span>•</span>
                                                    <span>{driver.totalRides} courses ensemble</span>
                                                </div>
                                                <p className="text-xs text-gray-600">
                                                    {driver.vehicleType} • {driver.vehicleNumber}
                                                </p>
                                            </div>
                                        </div>

                                        <Button
                                            onClick={() => removeFavoriteDriver(driver.id)}
                                            variant="ghost"
                                            size="sm"
                                            className="text-red-500 hover:text-red-700"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </Button>
                                    </div>

                                    <div className="flex items-center justify-between text-xs text-gray-600 mb-3">
                                        <span>Prix moyen: {driver.averagePrice.toLocaleString()} GNF</span>
                                        <span>Dernière course: {formatDate(driver.lastRide)}</span>
                                    </div>

                                    <Button
                                        onClick={() => requestDriver(driver)}
                                        className="w-full"
                                        variant="outline"
                                    >
                                        <Heart className="w-4 h-4 mr-2 text-red-500" />
                                        Demander ce conducteur
                                    </Button>
                                </CardContent>
                            </Card>
                        ))
                    )}
                </div>
            )}
        </div>
    );
}
