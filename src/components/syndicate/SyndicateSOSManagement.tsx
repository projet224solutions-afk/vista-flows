/**
 * GESTION DES ALERTES SOS ULTRA PROFESSIONNELLE
 * Interface complète pour la gestion des urgences et sécurité
 * 224Solutions - Bureau Syndicat System
 */

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
    AlertTriangle,
    Shield,
    MapPin,
    Phone,
    Clock,
    CheckCircle,
    XCircle,
    Navigation,
    Users,
    Activity
} from "lucide-react";
import { toast } from "sonner";

interface SOSAlert {
    id: string;
    member_name: string;
    member_phone: string;
    vehicle_serial: string;
    alert_type: 'emergency' | 'accident' | 'theft' | 'harassment' | 'breakdown';
    severity: 'low' | 'medium' | 'high' | 'critical';
    latitude: number;
    longitude: number;
    address?: string;
    description?: string;
    status: 'active' | 'acknowledged' | 'responding' | 'resolved' | 'false_alarm';
    created_at: string;
    acknowledged_at?: string;
}

interface SyndicateSOSManagementProps {
    bureauId: string;
}

export default function SyndicateSOSManagement({ bureauId }: SyndicateSOSManagementProps) {
    const [alerts, setAlerts] = useState<SOSAlert[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadSOSAlerts();
    }, [bureauId]);

    /**
     * Charge les alertes SOS
     */
    const loadSOSAlerts = async () => {
        try {
            // Simuler le chargement depuis Supabase
            const mockAlerts: SOSAlert[] = [
                {
                    id: '1',
                    member_name: 'Ibrahima Ndiaye',
                    member_phone: '+221 77 123 45 67',
                    vehicle_serial: 'MT-2024-001234',
                    alert_type: 'emergency',
                    severity: 'critical',
                    latitude: 14.6937,
                    longitude: -17.4441,
                    address: 'Avenue Bourguiba, Dakar',
                    description: 'Accident de circulation grave',
                    status: 'active',
                    created_at: '2025-09-30T15:30:00Z'
                },
                {
                    id: '2',
                    member_name: 'Fatou Sall',
                    member_phone: '+221 76 987 65 43',
                    vehicle_serial: 'MT-2024-005678',
                    alert_type: 'breakdown',
                    severity: 'medium',
                    latitude: 14.7167,
                    longitude: -17.4677,
                    address: 'Yoff, Dakar',
                    description: 'Panne mécanique',
                    status: 'acknowledged',
                    created_at: '2025-09-30T14:15:00Z',
                    acknowledged_at: '2025-09-30T14:20:00Z'
                }
            ];

            setAlerts(mockAlerts);
        } catch (error) {
            console.error('Erreur chargement alertes SOS:', error);
            toast.error('Impossible de charger les alertes SOS');
        } finally {
            setLoading(false);
        }
    };

    /**
     * Accuse réception d'une alerte
     */
    const acknowledgeAlert = (alertId: string) => {
        setAlerts(prev => prev.map(alert =>
            alert.id === alertId
                ? {
                    ...alert,
                    status: 'acknowledged',
                    acknowledged_at: new Date().toISOString()
                }
                : alert
        ));
        toast.success('Alerte prise en compte');
    };

    /**
     * Marque une alerte comme résolue
     */
    const resolveAlert = (alertId: string) => {
        setAlerts(prev => prev.map(alert =>
            alert.id === alertId ? { ...alert, status: 'resolved' } : alert
        ));
        toast.success('Alerte résolue');
    };

    /**
     * Contacte le membre en urgence
     */
    const contactMember = (phone: string) => {
        window.open(`tel:${phone}`);
    };

    /**
     * Localise le membre
     */
    const locateMember = (alert: SOSAlert) => {
        // Simuler l'ouverture de la carte
        const mapsUrl = `https://www.google.com/maps?q=${alert.latitude},${alert.longitude}`;
        window.open(mapsUrl, '_blank');
        toast.info('Localisation ouverte dans Google Maps');
    };

    /**
     * Obtient la couleur de la sévérité
     */
    const getSeverityColor = (severity: string) => {
        switch (severity) {
            case 'critical': return 'bg-red-100 text-red-800 border-red-200';
            case 'high': return 'bg-orange-100 text-orange-800 border-orange-200';
            case 'medium': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
            case 'low': return 'bg-blue-100 text-blue-800 border-blue-200';
            default: return 'bg-gray-100 text-gray-800 border-gray-200';
        }
    };

    /**
     * Obtient la couleur du statut
     */
    const getStatusColor = (status: string) => {
        switch (status) {
            case 'active': return 'bg-red-100 text-red-800';
            case 'acknowledged': return 'bg-yellow-100 text-yellow-800';
            case 'responding': return 'bg-blue-100 text-blue-800';
            case 'resolved': return 'bg-green-100 text-green-800';
            case 'false_alarm': return 'bg-gray-100 text-gray-800';
            default: return 'bg-gray-100 text-gray-800';
        }
    };

    /**
     * Obtient le libellé du type d'alerte
     */
    const getAlertTypeLabel = (type: string) => {
        switch (type) {
            case 'emergency': return 'Urgence';
            case 'accident': return 'Accident';
            case 'theft': return 'Vol';
            case 'harassment': return 'Harcèlement';
            case 'breakdown': return 'Panne';
            default: return type;
        }
    };

    /**
     * Obtient le libellé du statut
     */
    const getStatusLabel = (status: string) => {
        switch (status) {
            case 'active': return 'Active';
            case 'acknowledged': return 'Prise en compte';
            case 'responding': return 'Intervention';
            case 'resolved': return 'Résolue';
            case 'false_alarm': return 'Fausse alerte';
            default: return status;
        }
    };

    /**
     * Formate la date
     */
    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleDateString('fr-FR', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    /**
     * Calcule le temps écoulé
     */
    const getTimeElapsed = (dateString: string) => {
        const now = new Date();
        const alertTime = new Date(dateString);
        const diffMinutes = Math.floor((now.getTime() - alertTime.getTime()) / (1000 * 60));

        if (diffMinutes < 60) {
            return `${diffMinutes} min`;
        } else if (diffMinutes < 1440) {
            return `${Math.floor(diffMinutes / 60)}h ${diffMinutes % 60}min`;
        } else {
            return `${Math.floor(diffMinutes / 1440)} jour(s)`;
        }
    };

    if (loading) {
        return (
            <Card>
                <CardContent className="p-8 text-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-600 mx-auto mb-4"></div>
                    <p className="text-gray-600">Chargement des alertes SOS...</p>
                </CardContent>
            </Card>
        );
    }

    const activeAlerts = alerts.filter(a => a.status === 'active');
    const acknowledgedAlerts = alerts.filter(a => a.status === 'acknowledged');
    const resolvedAlerts = alerts.filter(a => a.status === 'resolved');

    return (
        <div className="space-y-6">
            {/* Statistiques des alertes */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <Card>
                    <CardContent className="p-6 text-center">
                        <AlertTriangle className="w-8 h-8 mx-auto mb-2 text-red-600" />
                        <div className="text-2xl font-bold text-red-600">{activeAlerts.length}</div>
                        <div className="text-sm text-gray-600">Alertes Actives</div>
                    </CardContent>
                </Card>

                <Card>
                    <CardContent className="p-6 text-center">
                        <Clock className="w-8 h-8 mx-auto mb-2 text-yellow-600" />
                        <div className="text-2xl font-bold text-yellow-600">{acknowledgedAlerts.length}</div>
                        <div className="text-sm text-gray-600">En Traitement</div>
                    </CardContent>
                </Card>

                <Card>
                    <CardContent className="p-6 text-center">
                        <CheckCircle className="w-8 h-8 mx-auto mb-2 text-green-600" />
                        <div className="text-2xl font-bold text-green-600">{resolvedAlerts.length}</div>
                        <div className="text-sm text-gray-600">Résolues</div>
                    </CardContent>
                </Card>

                <Card>
                    <CardContent className="p-6 text-center">
                        <Activity className="w-8 h-8 mx-auto mb-2 text-blue-600" />
                        <div className="text-2xl font-bold text-blue-600">{alerts.length}</div>
                        <div className="text-sm text-gray-600">Total</div>
                    </CardContent>
                </Card>
            </div>

            {/* Alertes actives */}
            {activeAlerts.length > 0 && (
                <Card className="border-red-200">
                    <CardHeader className="bg-red-50">
                        <CardTitle className="flex items-center gap-2 text-red-800">
                            <AlertTriangle className="w-5 h-5" />
                            Alertes SOS Actives ({activeAlerts.length})
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="p-6">
                        <div className="space-y-4">
                            {activeAlerts.map((alert) => (
                                <div
                                    key={alert.id}
                                    className={`border-l-4 p-4 rounded-r-lg ${getSeverityColor(alert.severity)}`}
                                >
                                    <div className="flex items-start justify-between">
                                        <div className="flex-1">
                                            <div className="flex items-center gap-2 mb-2">
                                                <h3 className="font-semibold text-lg">
                                                    {alert.member_name}
                                                </h3>
                                                <Badge className={getStatusColor(alert.status)}>
                                                    {getStatusLabel(alert.status)}
                                                </Badge>
                                                <Badge variant="outline">
                                                    {getAlertTypeLabel(alert.alert_type)}
                                                </Badge>
                                            </div>

                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                                                <div>
                                                    <p className="text-gray-600">Véhicule:</p>
                                                    <p className="font-medium">{alert.vehicle_serial}</p>
                                                </div>
                                                <div>
                                                    <p className="text-gray-600">Localisation:</p>
                                                    <p className="font-medium">{alert.address || 'Position GPS disponible'}</p>
                                                </div>
                                                <div>
                                                    <p className="text-gray-600">Description:</p>
                                                    <p className="font-medium">{alert.description || 'Aucune description'}</p>
                                                </div>
                                                <div>
                                                    <p className="text-gray-600">Temps écoulé:</p>
                                                    <p className="font-medium text-red-600">
                                                        {getTimeElapsed(alert.created_at)}
                                                    </p>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="flex flex-col gap-2 ml-4">
                                            <Button
                                                size="sm"
                                                onClick={() => contactMember(alert.member_phone)}
                                                className="bg-red-600 hover:bg-red-700"
                                            >
                                                <Phone className="w-4 h-4 mr-1" />
                                                Appeler
                                            </Button>
                                            <Button
                                                size="sm"
                                                variant="outline"
                                                onClick={() => locateMember(alert)}
                                            >
                                                <MapPin className="w-4 h-4 mr-1" />
                                                Localiser
                                            </Button>
                                            <Button
                                                size="sm"
                                                variant="outline"
                                                onClick={() => acknowledgeAlert(alert.id)}
                                            >
                                                <CheckCircle className="w-4 h-4 mr-1" />
                                                Prendre en charge
                                            </Button>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* Alertes en traitement */}
            {acknowledgedAlerts.length > 0 && (
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Clock className="w-5 h-5 text-yellow-600" />
                            Alertes en Traitement ({acknowledgedAlerts.length})
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-3">
                            {acknowledgedAlerts.map((alert) => (
                                <div key={alert.id} className="flex items-center justify-between p-3 bg-yellow-50 rounded-lg border border-yellow-200">
                                    <div>
                                        <h4 className="font-medium">{alert.member_name}</h4>
                                        <p className="text-sm text-gray-600">
                                            {getAlertTypeLabel(alert.alert_type)} • {alert.address}
                                        </p>
                                        <p className="text-xs text-gray-500">
                                            Prise en charge: {alert.acknowledged_at ? formatDate(alert.acknowledged_at) : 'N/A'}
                                        </p>
                                    </div>
                                    <div className="flex gap-2">
                                        <Button
                                            size="sm"
                                            onClick={() => resolveAlert(alert.id)}
                                        >
                                            <CheckCircle className="w-4 h-4 mr-1" />
                                            Résoudre
                                        </Button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* Message si aucune alerte */}
            {alerts.length === 0 && (
                <Card>
                    <CardContent className="p-8 text-center">
                        <Shield className="w-16 h-16 mx-auto mb-4 text-gray-400" />
                        <h3 className="text-lg font-semibold text-gray-700 mb-2">
                            Aucune Alerte SOS
                        </h3>
                        <p className="text-gray-600 mb-4">
                            Tous vos membres sont en sécurité
                        </p>
                        <div className="space-y-2">
                            <Badge variant="outline">Surveillance 24/7</Badge>
                            <Badge variant="outline">Géolocalisation temps réel</Badge>
                            <Badge variant="outline">Notification automatique PDG</Badge>
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* Instructions d'urgence */}
            <Card className="bg-blue-50 border-blue-200">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-blue-800">
                        <Shield className="w-5 h-5" />
                        Procédure d'Urgence
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                        <div className="text-center">
                            <Phone className="w-8 h-8 mx-auto mb-2 text-blue-600" />
                            <h4 className="font-semibold mb-1">1. Contact Immédiat</h4>
                            <p className="text-gray-600">Appelez le membre en détresse</p>
                        </div>
                        <div className="text-center">
                            <MapPin className="w-8 h-8 mx-auto mb-2 text-blue-600" />
                            <h4 className="font-semibold mb-1">2. Localisation</h4>
                            <p className="text-gray-600">Vérifiez la position GPS</p>
                        </div>
                        <div className="text-center">
                            <Users className="w-8 h-8 mx-auto mb-2 text-blue-600" />
                            <h4 className="font-semibold mb-1">3. Assistance</h4>
                            <p className="text-gray-600">Coordonnez l'aide nécessaire</p>
                        </div>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
