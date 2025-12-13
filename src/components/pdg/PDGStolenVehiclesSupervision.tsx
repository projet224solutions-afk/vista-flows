/**
 * PDG - SUPERVISION DES MOTOS VOLÉES
 * Vue centralisée de toutes les alertes de vol de tous les bureaux
 * 224Solutions - Sécurité Institutionnelle
 */

import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
    AlertTriangle,
    Shield,
    ShieldAlert,
    ShieldCheck,
    MapPin,
    Clock,
    Eye,
    RefreshCw,
    Search,
    Navigation,
    Activity,
    History,
    AlertCircle,
    Building2
} from "lucide-react";
import { toast } from "sonner";
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

interface StolenVehicle {
    id: string;
    serial_number: string;
    license_plate: string;
    brand: string;
    model: string;
    color: string;
    stolen_status: 'clean' | 'stolen' | 'recovered' | 'blocked';
    stolen_declared_at: string | null;
    stolen_reason: string | null;
    stolen_location: string | null;
    last_known_latitude: number | null;
    last_known_longitude: number | null;
    bureau_id: string;
    bureau_name?: string;
    owner_name?: string;
}

interface FraudAlert {
    id: string;
    vehicle_id: string;
    alert_type: string;
    severity: string;
    description: string;
    is_resolved: boolean;
    created_at: string;
    vehicle?: StolenVehicle;
}

interface SecurityLog {
    id: string;
    vehicle_id: string;
    bureau_id: string;
    action: string;
    description: string;
    created_at: string;
    bureau_name?: string;
}

export default function PDGStolenVehiclesSupervision() {
    const [stolenVehicles, setStolenVehicles] = useState<StolenVehicle[]>([]);
    const [fraudAlerts, setFraudAlerts] = useState<FraudAlert[]>([]);
    const [securityLogs, setSecurityLogs] = useState<SecurityLog[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');

    const [stats, setStats] = useState({
        totalStolen: 0,
        totalRecovered: 0,
        pendingAlerts: 0,
        totalBureaus: 0
    });

    const loadData = useCallback(async () => {
        setLoading(true);
        try {
            // Charger tous les véhicules avec stolen_status non null
            const { data: vehicles, error: vehiclesError } = await supabase
                .from('vehicles')
                .select('*')
                .not('stolen_status', 'eq', 'clean');

            // Si erreur, on essaie sans filtre
            let formattedVehicles: StolenVehicle[] = [];
            if (!vehiclesError && vehicles) {
                // Charger les bureaux séparément
                const bureauIds = [...new Set(vehicles.map((v: any) => v.bureau_id).filter(Boolean))];
                const { data: bureausData } = await supabase
                    .from('bureaus')
                    .select('id, commune, prefecture')
                    .in('id', bureauIds.length > 0 ? bureauIds : ['none']);

                const bureauMap = new Map((bureausData || []).map((b: any) => [b.id, b]));

                formattedVehicles = vehicles.map((v: any) => {
                    const bureau = bureauMap.get(v.bureau_id);
                    return {
                        ...v,
                        owner_name: 'Propriétaire',
                        bureau_name: bureau ? `${bureau.commune} - ${bureau.prefecture}` : 'Bureau inconnu'
                    };
                });
            }

            setStolenVehicles(formattedVehicles.filter((v: any) => v.stolen_status === 'stolen'));

            // Stats globales - requête simplifiée
            const { data: allVehicles } = await supabase
                .from('vehicles')
                .select('stolen_status');

            const { count: bureauCount } = await supabase
                .from('bureaus')
                .select('id', { count: 'exact', head: true });

            setStats({
                totalStolen: (allVehicles || []).filter((v: any) => v.stolen_status === 'stolen').length,
                totalRecovered: (allVehicles || []).filter((v: any) => v.stolen_status === 'recovered').length,
                pendingAlerts: 0,
                totalBureaus: bureauCount || 0
            });

            // Charger les alertes de fraude non résolues
            const { data: alerts } = await supabase
                .from('vehicle_fraud_alerts')
                .select('*')
                .eq('is_resolved', false)
                .order('created_at', { ascending: false })
                .limit(100);

            if (alerts) {
                setFraudAlerts(alerts as FraudAlert[]);
                setStats(prev => ({ ...prev, pendingAlerts: alerts.length }));
            }

            // Charger le journal de sécurité global - sans jointure
            const { data: logs } = await supabase
                .from('vehicle_security_log')
                .select('*')
                .order('created_at', { ascending: false })
                .limit(200);

            if (logs && logs.length > 0) {
                // Charger les bureaux pour les logs
                const logBureauIds = [...new Set(logs.map((l: any) => l.bureau_id).filter(Boolean))];
                const { data: logBureaus } = await supabase
                    .from('bureaus')
                    .select('id, commune')
                    .in('id', logBureauIds.length > 0 ? logBureauIds : ['none']);

                const logBureauMap = new Map((logBureaus || []).map((b: any) => [b.id, b]));

                const formattedLogs = logs.map((l: any) => {
                    const bureau = logBureauMap.get(l.bureau_id);
                    return {
                        ...l,
                        bureau_name: bureau ? bureau.commune : 'Inconnu'
                    };
                });
                setSecurityLogs(formattedLogs);
            } else {
                setSecurityLogs([]);
            }

        } catch (error) {
            console.error('Erreur chargement données:', error);
            toast.error('Erreur lors du chargement des données');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        loadData();

        // Real-time subscription pour les alertes
        const channel = supabase
            .channel('pdg-stolen-vehicle-alerts')
            .on('postgres_changes', {
                event: '*',
                schema: 'public',
                table: 'vehicles',
                filter: 'stolen_status=eq.stolen'
            }, (payload) => {
                console.log('🚨 Changement véhicule volé:', payload);
                loadData();
                if (payload.eventType === 'UPDATE' && (payload.new as any).stolen_status === 'stolen') {
                    toast.error('🚨 Nouvelle moto déclarée volée!', {
                        description: 'Un bureau a signalé un vol de moto',
                        duration: 10000
                    });
                }
            })
            .on('postgres_changes', {
                event: 'INSERT',
                schema: 'public',
                table: 'vehicle_fraud_alerts'
            }, (payload) => {
                toast.error('⚠️ Alerte de fraude détectée!', {
                    description: 'Activité suspecte sur un véhicule volé',
                    duration: 10000
                });
                loadData();
            })
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [loadData]);

    const openGoogleMaps = (lat: number, lng: number) => {
        window.open(`https://www.google.com/maps?q=${lat},${lng}`, '_blank');
    };

    const filteredVehicles = stolenVehicles.filter(v =>
        v.serial_number?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        v.license_plate?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        v.brand?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        v.bureau_name?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const getStatusBadge = (status: string) => {
        switch (status) {
            case 'stolen':
                return <Badge className="bg-red-600 text-white">🚨 VOLÉE</Badge>;
            case 'recovered':
                return <Badge className="bg-green-600 text-white">✅ Retrouvée</Badge>;
            case 'blocked':
                return <Badge className="bg-orange-600 text-white">🔒 Bloquée</Badge>;
            default:
                return <Badge className="bg-gray-500 text-white">Normal</Badge>;
        }
    };

    const getSeverityBadge = (severity: string) => {
        switch (severity) {
            case 'critical':
                return <Badge className="bg-red-600 text-white">Critique</Badge>;
            case 'high':
                return <Badge className="bg-orange-600 text-white">Élevée</Badge>;
            case 'medium':
                return <Badge className="bg-yellow-600 text-white">Moyenne</Badge>;
            default:
                return <Badge className="bg-blue-600 text-white">Basse</Badge>;
        }
    };

    const getActionIcon = (action: string) => {
        switch (action) {
            case 'THEFT_DECLARED': return <ShieldAlert className="w-4 h-4 text-red-600" />;
            case 'RECOVERY_DECLARED': return <ShieldCheck className="w-4 h-4 text-green-600" />;
            case 'GPS_TRACKED': return <MapPin className="w-4 h-4 text-blue-600" />;
            case 'FRAUD_ATTEMPT': return <AlertTriangle className="w-4 h-4 text-orange-600" />;
            default: return <Activity className="w-4 h-4 text-gray-600" />;
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <RefreshCw className="w-8 h-8 animate-spin text-primary" />
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* En-tête */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <ShieldAlert className="w-8 h-8 text-red-600" />
                    <div>
                        <h2 className="text-2xl font-bold">Supervision Motos Volées</h2>
                        <p className="text-muted-foreground">Vue centralisée de tous les bureaux</p>
                    </div>
                </div>
                <Button variant="outline" onClick={loadData}>
                    <RefreshCw className="w-4 h-4 mr-2" />
                    Actualiser
                </Button>
            </div>

            {/* Statistiques globales */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <Card className="border-red-200 bg-red-50">
                    <CardContent className="p-4">
                        <div className="flex items-center gap-3">
                            <ShieldAlert className="w-8 h-8 text-red-600" />
                            <div>
                                <p className="text-2xl font-bold text-red-700">{stats.totalStolen}</p>
                                <p className="text-sm text-red-600">Motos volées</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <Card className="border-green-200 bg-green-50">
                    <CardContent className="p-4">
                        <div className="flex items-center gap-3">
                            <ShieldCheck className="w-8 h-8 text-green-600" />
                            <div>
                                <p className="text-2xl font-bold text-green-700">{stats.totalRecovered}</p>
                                <p className="text-sm text-green-600">Retrouvées</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <Card className="border-orange-200 bg-orange-50">
                    <CardContent className="p-4">
                        <div className="flex items-center gap-3">
                            <AlertCircle className="w-8 h-8 text-orange-600" />
                            <div>
                                <p className="text-2xl font-bold text-orange-700">{stats.pendingAlerts}</p>
                                <p className="text-sm text-orange-600">Alertes actives</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <Card className="border-blue-200 bg-blue-50">
                    <CardContent className="p-4">
                        <div className="flex items-center gap-3">
                            <Building2 className="w-8 h-8 text-blue-600" />
                            <div>
                                <p className="text-2xl font-bold text-blue-700">{stats.totalBureaus}</p>
                                <p className="text-sm text-blue-600">Bureaux syndicats</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Alertes critiques */}
            {fraudAlerts.length > 0 && (
                <Alert className="border-red-500 bg-red-50">
                    <AlertTriangle className="w-5 h-5 text-red-600" />
                    <AlertDescription className="text-red-800">
                        <strong>🚨 {fraudAlerts.length} alerte(s) de fraude non résolue(s)</strong>
                        <p className="text-sm mt-1">
                            Des activités suspectes ont été détectées sur des véhicules volés.
                        </p>
                    </AlertDescription>
                </Alert>
            )}

            {/* Onglets */}
            <Tabs defaultValue="stolen" className="space-y-4">
                <TabsList className="grid grid-cols-3 w-full max-w-md">
                    <TabsTrigger value="stolen" className="flex items-center gap-2">
                        <ShieldAlert className="w-4 h-4" />
                        Volées ({stats.totalStolen})
                    </TabsTrigger>
                    <TabsTrigger value="alerts" className="flex items-center gap-2">
                        <AlertTriangle className="w-4 h-4" />
                        Alertes ({fraudAlerts.length})
                    </TabsTrigger>
                    <TabsTrigger value="logs" className="flex items-center gap-2">
                        <History className="w-4 h-4" />
                        Journal
                    </TabsTrigger>
                </TabsList>

                {/* Tab: Motos volées */}
                <TabsContent value="stolen">
                    <Card className="border-red-200">
                        <CardHeader className="bg-red-50">
                            <div className="flex items-center justify-between">
                                <CardTitle className="flex items-center gap-2 text-red-800">
                                    <ShieldAlert className="w-5 h-5" />
                                    Motos déclarées volées - Tous bureaux
                                </CardTitle>
                                <div className="relative">
                                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                                    <Input
                                        placeholder="Rechercher..."
                                        value={searchTerm}
                                        onChange={(e) => setSearchTerm(e.target.value)}
                                        className="pl-9 w-64"
                                    />
                                </div>
                            </div>
                        </CardHeader>
                        <CardContent className="p-0">
                            {filteredVehicles.length === 0 ? (
                                <div className="p-8 text-center text-muted-foreground">
                                    <ShieldCheck className="w-12 h-12 mx-auto mb-4 text-green-500" />
                                    <p>Aucune moto déclarée volée</p>
                                </div>
                            ) : (
                                <ScrollArea className="h-[500px]">
                                    <Table>
                                        <TableHeader>
                                            <TableRow>
                                                <TableHead>Bureau</TableHead>
                                                <TableHead>Plaque</TableHead>
                                                <TableHead>Châssis</TableHead>
                                                <TableHead>Véhicule</TableHead>
                                                <TableHead>Propriétaire</TableHead>
                                                <TableHead>Date déclaration</TableHead>
                                                <TableHead>Localisation</TableHead>
                                                <TableHead>Actions</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {filteredVehicles.map((vehicle) => (
                                                <TableRow key={vehicle.id} className="bg-red-50/50">
                                                    <TableCell>
                                                        <Badge variant="outline" className="flex items-center gap-1 w-fit">
                                                            <Building2 className="w-3 h-3" />
                                                            {vehicle.bureau_name}
                                                        </Badge>
                                                    </TableCell>
                                                    <TableCell className="font-mono font-bold">{vehicle.license_plate}</TableCell>
                                                    <TableCell className="font-mono text-sm">{vehicle.serial_number}</TableCell>
                                                    <TableCell>
                                                        {vehicle.brand} {vehicle.model}
                                                        {vehicle.color && <span className="text-muted-foreground ml-1">({vehicle.color})</span>}
                                                    </TableCell>
                                                    <TableCell>{vehicle.owner_name}</TableCell>
                                                    <TableCell>
                                                        {vehicle.stolen_declared_at && (
                                                            <div className="flex items-center gap-1 text-sm text-red-700">
                                                                <Clock className="w-3 h-3" />
                                                                {format(new Date(vehicle.stolen_declared_at), 'dd/MM/yyyy HH:mm', { locale: fr })}
                                                            </div>
                                                        )}
                                                    </TableCell>
                                                    <TableCell>
                                                        {vehicle.stolen_location && (
                                                            <span className="text-sm">{vehicle.stolen_location}</span>
                                                        )}
                                                    </TableCell>
                                                    <TableCell>
                                                        <div className="flex gap-1">
                                                            {vehicle.last_known_latitude && vehicle.last_known_longitude && (
                                                                <Button
                                                                    size="sm"
                                                                    variant="outline"
                                                                    onClick={() => openGoogleMaps(vehicle.last_known_latitude!, vehicle.last_known_longitude!)}
                                                                >
                                                                    <Navigation className="w-3 h-3 mr-1" />
                                                                    Voir
                                                                </Button>
                                                            )}
                                                            <Button size="sm" variant="ghost">
                                                                <Eye className="w-3 h-3" />
                                                            </Button>
                                                        </div>
                                                    </TableCell>
                                                </TableRow>
                                            ))}
                                        </TableBody>
                                    </Table>
                                </ScrollArea>
                            )}
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* Tab: Alertes de fraude */}
                <TabsContent value="alerts">
                    <Card className="border-orange-200">
                        <CardHeader className="bg-orange-50">
                            <CardTitle className="flex items-center gap-2 text-orange-800">
                                <AlertTriangle className="w-5 h-5" />
                                Alertes de fraude actives
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="p-0">
                            {fraudAlerts.length === 0 ? (
                                <div className="p-8 text-center text-muted-foreground">
                                    <ShieldCheck className="w-12 h-12 mx-auto mb-4 text-green-500" />
                                    <p>Aucune alerte de fraude active</p>
                                </div>
                            ) : (
                                <ScrollArea className="h-[400px]">
                                    <div className="space-y-3 p-4">
                                        {fraudAlerts.map((alert) => (
                                            <Card key={alert.id} className="border-orange-300 bg-orange-50">
                                                <CardContent className="p-4">
                                                    <div className="flex items-start justify-between">
                                                        <div className="space-y-2">
                                                            <div className="flex items-center gap-2">
                                                                {getSeverityBadge(alert.severity)}
                                                                <span className="font-medium">{alert.alert_type}</span>
                                                            </div>
                                                            <p className="text-sm">{alert.description}</p>
                                                            <p className="text-xs text-muted-foreground">
                                                                <Clock className="w-3 h-3 inline mr-1" />
                                                                {format(new Date(alert.created_at), 'dd/MM/yyyy HH:mm', { locale: fr })}
                                                            </p>
                                                        </div>
                                                    </div>
                                                </CardContent>
                                            </Card>
                                        ))}
                                    </div>
                                </ScrollArea>
                            )}
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* Tab: Journal de sécurité */}
                <TabsContent value="logs">
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <History className="w-5 h-5" />
                                Journal de sécurité global
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="p-0">
                            <ScrollArea className="h-[400px]">
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>Date</TableHead>
                                            <TableHead>Bureau</TableHead>
                                            <TableHead>Action</TableHead>
                                            <TableHead>Description</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {securityLogs.map((log) => (
                                            <TableRow key={log.id}>
                                                <TableCell className="text-sm">
                                                    {format(new Date(log.created_at), 'dd/MM/yyyy HH:mm', { locale: fr })}
                                                </TableCell>
                                                <TableCell>
                                                    <Badge variant="outline">{log.bureau_name}</Badge>
                                                </TableCell>
                                                <TableCell>
                                                    <div className="flex items-center gap-2">
                                                        {getActionIcon(log.action)}
                                                        <span className="text-sm">{log.action}</span>
                                                    </div>
                                                </TableCell>
                                                <TableCell className="text-sm max-w-md truncate">
                                                    {log.description}
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </ScrollArea>
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>
        </div>
    );
}
