// @ts-nocheck
/**
 * COMPOSANT HISTORIQUE DES COURSES TAXI-MOTO
 * Affichage de l'historique avec filtres et détails
 * 224Solutions - Taxi-Moto System
 */

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
    Clock,
    MapPin,
    Star,
    Download,
    Filter,
    Search,
    Calendar,
    DollarSign,
    Navigation,
    User,
    MoreVertical
} from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

interface RideHistory {
    id: string;
    date: string;
    pickupAddress: string;
    destinationAddress: string;
    distance: number;
    duration: number;
    price: number;
    status: 'completed' | 'cancelled';
    driver: {
        name: string;
        rating: number;
        vehicleType: string;
    };
    rating?: number;
    paymentMethod: string;
}

interface TaxiMotoHistoryProps {
    userId?: string;
}

export default function TaxiMotoHistory({ userId }: TaxiMotoHistoryProps) {
    const [rides, setRides] = useState<RideHistory[]>([]);
    const [filteredRides, setFilteredRides] = useState<RideHistory[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState<'all' | 'completed' | 'cancelled'>('all');
    const [dateFilter, setDateFilter] = useState<'all' | 'week' | 'month' | 'year'>('all');

    // Charger l'historique des courses
    useEffect(() => {
        loadRideHistory();
    }, [userId]);

    // Filtrer les courses
    useEffect(() => {
        filterRides();
    }, [rides, searchTerm, statusFilter, dateFilter]);

    /**
     * Charge l'historique des courses
     */
    const loadRideHistory = async () => {
        setLoading(true);
        try {
            if (!userId) return;

            console.log('[TaxiMotoHistory] Loading ride history for user:', userId);

            const { data: trips, error } = await supabase
                .from('taxi_trips')
                .select('*')
                .eq('customer_id', userId)
                .in('status', ['completed', 'cancelled'])
                .order('created_at', { ascending: false })
                .limit(50);

            if (error) {
                console.error('[TaxiMotoHistory] Error loading history:', error);
                throw error;
            }

            console.log('[TaxiMotoHistory] Loaded trips:', trips?.length || 0);

            const formattedRides: RideHistory[] = (trips || []).map(trip => ({
                id: trip.id,
                date: trip.requested_at || trip.created_at,
                pickupAddress: trip.pickup_address || 'Adresse non disponible',
                destinationAddress: trip.dropoff_address || 'Adresse non disponible',
                distance: trip.distance_km || 0,
                duration: trip.duration_min || 0,
                price: trip.price_total || 0,
                status: trip.status as 'completed' | 'cancelled',
                driver: {
                    name: 'Conducteur',
                    rating: 4.5,
                    vehicleType: 'Moto-Taxi'
                },
                rating: trip.customer_rating || undefined,
                paymentMethod: trip.payment_method || 'wallet_224'
            }));

            console.log('[TaxiMotoHistory] Formatted rides:', formattedRides.length);
            setRides(formattedRides);
        } catch (error) {
            console.error('[TaxiMotoHistory] Error loading history:', error);
            toast.error('Impossible de charger l\'historique');
        } finally {
            setLoading(false);
        }
    };

    /**
     * Filtre les courses selon les critères
     */
    const filterRides = () => {
        let filtered = [...rides];

        // Filtre par terme de recherche
        if (searchTerm) {
            filtered = filtered.filter(ride =>
                ride.pickupAddress.toLowerCase().includes(searchTerm.toLowerCase()) ||
                ride.destinationAddress.toLowerCase().includes(searchTerm.toLowerCase()) ||
                ride.driver.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                ride.id.toLowerCase().includes(searchTerm.toLowerCase())
            );
        }

        // Filtre par statut
        if (statusFilter !== 'all') {
            filtered = filtered.filter(ride => ride.status === statusFilter);
        }

        // Filtre par date
        if (dateFilter !== 'all') {
            const now = new Date();
            const filterDate = new Date();

            switch (dateFilter) {
                case 'week':
                    filterDate.setDate(now.getDate() - 7);
                    break;
                case 'month':
                    filterDate.setMonth(now.getMonth() - 1);
                    break;
                case 'year':
                    filterDate.setFullYear(now.getFullYear() - 1);
                    break;
            }

            filtered = filtered.filter(ride => new Date(ride.date) >= filterDate);
        }

        setFilteredRides(filtered);
    };

    /**
     * Formate la date
     */
    const formatDate = (dateString: string) => {
        const date = new Date(dateString);
        return date.toLocaleDateString('fr-FR', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    /**
     * Obtient la couleur du statut
     */
    const getStatusColor = (status: string) => {
        switch (status) {
            case 'completed':
                return 'bg-green-100 text-green-800';
            case 'cancelled':
                return 'bg-red-100 text-red-800';
            default:
                return 'bg-gray-100 text-gray-800';
        }
    };

    /**
     * Obtient le libellé du statut
     */
    const getStatusLabel = (status: string) => {
        switch (status) {
            case 'completed':
                return 'Terminée';
            case 'cancelled':
                return 'Annulée';
            default:
                return status;
        }
    };

    /**
     * Exporte l'historique
     */
    const exportHistory = () => {
        const csvContent = [
            ['Date', 'ID Course', 'Départ', 'Arrivée', 'Distance', 'Durée', 'Prix', 'Statut', 'Conducteur', 'Note'],
            ...filteredRides.map(ride => [
                formatDate(ride.date),
                ride.id,
                ride.pickupAddress,
                ride.destinationAddress,
                `${ride.distance}km`,
                `${ride.duration}min`,
                `${ride.price} GNF`,
                getStatusLabel(ride.status),
                ride.driver.name,
                ride.rating || 'N/A'
            ])
        ].map(row => row.join(',')).join('\n');

        const blob = new Blob([csvContent], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `historique-courses-${new Date().toISOString().split('T')[0]}.csv`;
        a.click();
        URL.revokeObjectURL(url);

        toast.success('Historique exporté avec succès');
    };

    /**
     * Refait une course
     */
    const rebookRide = (ride: RideHistory) => {
        toast.info(`Redirection vers la réservation: ${ride.pickupAddress} → ${ride.destinationAddress}`);
        // En production: rediriger vers l'onglet réservation avec les données pré-remplies
    };

    if (loading) {
        return (
            <Card className="bg-white/90 backdrop-blur-sm border-0 shadow-lg">
                <CardContent className="p-8 text-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
                    <p className="text-gray-600">Chargement de l'historique...</p>
                </CardContent>
            </Card>
        );
    }

    return (
        <div className="space-y-4">
            {/* Filtres et recherche */}
            <Card className="bg-white/90 backdrop-blur-sm border-0 shadow-lg">
                <CardHeader>
                    <div className="flex items-center justify-between">
                        <CardTitle className="text-lg">Historique des courses</CardTitle>
                        <Button onClick={exportHistory} variant="outline" size="sm">
                            <Download className="w-4 h-4 mr-2" />
                            Exporter
                        </Button>
                    </div>
                </CardHeader>
                <CardContent className="space-y-4">
                    {/* Barre de recherche */}
                    <div className="relative">
                        <Search className="w-4 h-4 absolute left-3 top-3 text-gray-400" />
                        <Input
                            placeholder="Rechercher par adresse, conducteur ou ID..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="pl-10"
                        />
                    </div>

                    {/* Filtres */}
                    <div className="flex gap-2 flex-wrap">
                        <select
                            value={statusFilter}
                            onChange={(e) => setStatusFilter(e.target.value as unknown)}
                            className="px-3 py-2 border rounded-md text-sm"
                        >
                            <option value="all">Tous les statuts</option>
                            <option value="completed">Terminées</option>
                            <option value="cancelled">Annulées</option>
                        </select>

                        <select
                            value={dateFilter}
                            onChange={(e) => setDateFilter(e.target.value as unknown)}
                            className="px-3 py-2 border rounded-md text-sm"
                        >
                            <option value="all">Toutes les dates</option>
                            <option value="week">7 derniers jours</option>
                            <option value="month">30 derniers jours</option>
                            <option value="year">Cette année</option>
                        </select>
                    </div>

                    {/* Statistiques rapides */}
                    <div className="grid grid-cols-3 gap-4 pt-4 border-t">
                        <div className="text-center">
                            <div className="text-lg font-bold text-blue-600">
                                {filteredRides.filter(r => r.status === 'completed').length}
                            </div>
                            <div className="text-xs text-gray-600">Terminées</div>
                        </div>
                        <div className="text-center">
                            <div className="text-lg font-bold text-green-600">
                                {filteredRides
                                    .filter(r => r.status === 'completed')
                                    .reduce((sum, r) => sum + r.price, 0)
                                    .toLocaleString()} GNF
                            </div>
                            <div className="text-xs text-gray-600">Total dépensé</div>
                        </div>
                        <div className="text-center">
                            <div className="text-lg font-bold text-yellow-600">
                                {(filteredRides
                                    .filter(r => r.rating)
                                    .reduce((sum, r) => sum + (r.rating || 0), 0) /
                                    filteredRides.filter(r => r.rating).length || 0
                                ).toFixed(1)}
                            </div>
                            <div className="text-xs text-gray-600">Note moyenne</div>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Liste des courses */}
            {filteredRides.length === 0 ? (
                <Card className="bg-white/90 backdrop-blur-sm border-0 shadow-lg">
                    <CardContent className="p-8 text-center">
                        <Clock className="w-12 h-12 mx-auto mb-4 text-gray-400" />
                        <h3 className="text-lg font-semibold text-gray-700 mb-2">
                            Aucune course trouvée
                        </h3>
                        <p className="text-gray-600">
                            {searchTerm || statusFilter !== 'all' || dateFilter !== 'all'
                                ? 'Aucune course ne correspond à vos critères de recherche'
                                : 'Vous n\'avez pas encore effectué de course'
                            }
                        </p>
                    </CardContent>
                </Card>
            ) : (
                <div className="space-y-3">
                    {filteredRides.map((ride) => (
                        <Card key={ride.id} className="bg-white/90 backdrop-blur-sm border-0 shadow-lg">
                            <CardContent className="p-4">
                                <div className="flex items-start justify-between mb-3">
                                    <div>
                                        <div className="flex items-center gap-2 mb-1">
                                            <Badge className={`${getStatusColor(ride.status)} px-2 py-1 text-xs`}>
                                                {getStatusLabel(ride.status)}
                                            </Badge>
                                            <span className="text-xs text-gray-500">#{ride.id}</span>
                                        </div>
                                        <p className="text-xs text-gray-600">{formatDate(ride.date)}</p>
                                    </div>

                                    <div className="text-right">
                                        <p className="text-lg font-bold text-green-600">
                                            {ride.price.toLocaleString()} GNF
                                        </p>
                                        {ride.rating && (
                                            <div className="flex items-center gap-1 text-xs text-gray-600">
                                                <Star className="w-3 h-3 fill-yellow-400 text-yellow-400" />
                                                <span>{ride.rating}</span>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {/* Trajet */}
                                <div className="space-y-2 mb-3">
                                    <div className="flex items-center gap-2 text-sm">
                                        <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                                        <span className="text-gray-700">{ride.pickupAddress}</span>
                                    </div>
                                    <div className="flex items-center gap-2 text-sm">
                                        <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                                        <span className="text-gray-700">{ride.destinationAddress}</span>
                                    </div>
                                </div>

                                {/* Détails */}
                                <div className="flex items-center justify-between text-xs text-gray-600 mb-3">
                                    <span>{ride.distance}km • {ride.duration}min</span>
                                    <span>{ride.driver.name} • {ride.driver.vehicleType}</span>
                                </div>

                                {/* Actions */}
                                {ride.status === 'completed' && (
                                    <div className="flex gap-2">
                                        <Button
                                            onClick={() => rebookRide(ride)}
                                            variant="outline"
                                            size="sm"
                                            className="flex-1 text-xs"
                                        >
                                            <Navigation className="w-3 h-3 mr-1" />
                                            Refaire
                                        </Button>
                                        <Button
                                            onClick={() => toast.info('Fonctionnalité de reçu bientôt disponible')}
                                            variant="outline"
                                            size="sm"
                                            className="flex-1 text-xs"
                                        >
                                            <Download className="w-3 h-3 mr-1" />
                                            Reçu
                                        </Button>
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    ))}
                </div>
            )}
        </div>
    );
}
