/**
 * DASHBOARD SÉCURITÉ MOTOS
 * Interface complète de gestion de la sécurité des motos
 * 224Solutions - Module de sécurité intelligent
 */

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
    Shield, 
    AlertTriangle, 
    CheckCircle, 
    Activity,
    Bell,
    Settings,
    Eye,
    RefreshCw,
    TrendingUp,
    TrendingDown,
    MapPin,
    Clock
} from 'lucide-react';
import { useMotoSecurity } from '@/hooks/useMotoSecurity';
import ReportStolenMoto from './ReportStolenMoto';
import MotoSecurityAlerts from './MotoSecurityAlerts';
import { toast } from 'sonner';

interface MotoSecurityDashboardProps {
    bureauId?: string;
    isPDG?: boolean;
    className?: string;
}

export default function MotoSecurityDashboard({ 
    bureauId, 
    isPDG = false,
    className 
}: MotoSecurityDashboardProps) {
    const [activeTab, setActiveTab] = useState('overview');
    const { 
        notifications, 
        stats, 
        isConnected, 
        unreadCount, 
        markAsRead, 
        markAllAsRead, 
        forceSync 
    } = useMotoSecurity(bureauId, isPDG);

    const handleForceSync = async () => {
        await forceSync();
        toast.success('🔄 Synchronisation forcée effectuée');
    };

    const handleMarkAllRead = async () => {
        await markAllAsRead();
        toast.success('✅ Toutes les notifications marquées comme lues');
    };

    return (
        <div className={`space-y-6 ${className}`}>
            {/* Header avec statut */}
            <Card className="border-blue-200 bg-blue-50">
                <CardHeader>
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <Shield className="w-8 h-8 text-blue-600" />
                            <div>
                                <CardTitle className="text-xl text-blue-800">
                                    Sécurité Motos - 224Solutions
                                </CardTitle>
                                <p className="text-blue-600 text-sm">
                                    Système de détection et d'alerte inter-bureaux
                                </p>
                            </div>
                        </div>
                        
                        <div className="flex items-center gap-3">
                            <Badge 
                                variant={isConnected ? "default" : "destructive"}
                                className="text-sm"
                            >
                                <Activity className="w-4 h-4 mr-1" />
                                {isConnected ? "Connecté" : "Déconnecté"}
                            </Badge>
                            
                            {unreadCount > 0 && (
                                <Badge variant="destructive" className="text-sm">
                                    <Bell className="w-4 h-4 mr-1" />
                                    {unreadCount} non lues
                                </Badge>
                            )}
                            
                            <Button
                                onClick={handleForceSync}
                                variant="outline"
                                size="sm"
                                className="border-blue-300 text-blue-700 hover:bg-blue-100"
                            >
                                <RefreshCw className="w-4 h-4 mr-2" />
                                Actualiser
                            </Button>
                        </div>
                    </div>
                </CardHeader>
            </Card>

            {/* Statistiques rapides */}
            {stats && (
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <Card className="border-red-200">
                        <CardContent className="p-4">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm font-medium text-red-600">Alertes actives</p>
                                    <p className="text-2xl font-bold text-red-800">{stats.alertes_en_cours}</p>
                                </div>
                                <AlertTriangle className="w-8 h-8 text-red-600" />
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="border-green-200">
                        <CardContent className="p-4">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm font-medium text-green-600">Résolues</p>
                                    <p className="text-2xl font-bold text-green-800">{stats.alertes_resolues}</p>
                                </div>
                                <CheckCircle className="w-8 h-8 text-green-600" />
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="border-blue-200">
                        <CardContent className="p-4">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm font-medium text-blue-600">Total alertes</p>
                                    <p className="text-2xl font-bold text-blue-800">{stats.total_alertes}</p>
                                </div>
                                <Shield className="w-8 h-8 text-blue-600" />
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="border-purple-200">
                        <CardContent className="p-4">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm font-medium text-purple-600">Motos uniques</p>
                                    <p className="text-2xl font-bold text-purple-800">{stats.motos_uniques_signalées}</p>
                                </div>
                                <Activity className="w-8 h-8 text-purple-600" />
                            </div>
                        </CardContent>
                    </Card>
                </div>
            )}

            {/* Interface principale */}
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                <TabsList className="grid w-full grid-cols-4">
                    <TabsTrigger value="overview">Vue d'ensemble</TabsTrigger>
                    <TabsTrigger value="report">Déclarer vol</TabsTrigger>
                    <TabsTrigger value="alerts">Alertes</TabsTrigger>
                    <TabsTrigger value="notifications">Notifications</TabsTrigger>
                </TabsList>

                {/* Vue d'ensemble */}
                <TabsContent value="overview" className="space-y-6">
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        {/* Résumé des alertes */}
                        <Card>
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <AlertTriangle className="w-5 h-5 text-red-600" />
                                    Alertes récentes
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="space-y-3">
                                    {stats && stats.alertes_en_cours > 0 ? (
                                        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                                            <div className="flex items-center gap-2 mb-2">
                                                <AlertTriangle className="w-5 h-5 text-red-600" />
                                                <span className="font-medium text-red-800">
                                                    {stats.alertes_en_cours} alertes en cours
                                                </span>
                                            </div>
                                            <p className="text-sm text-red-700">
                                                Des motos signalées volées nécessitent votre attention
                                            </p>
                                        </div>
                                    ) : (
                                        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                                            <div className="flex items-center gap-2 mb-2">
                                                <CheckCircle className="w-5 h-5 text-green-600" />
                                                <span className="font-medium text-green-800">
                                                    Aucune alerte active
                                                </span>
                                            </div>
                                            <p className="text-sm text-green-700">
                                                Toutes les alertes sont résolues
                                            </p>
                                        </div>
                                    )}
                                </div>
                            </CardContent>
                        </Card>

                        {/* Notifications récentes */}
                        <Card>
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <Bell className="w-5 h-5 text-blue-600" />
                                    Notifications récentes
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="space-y-3">
                                    {notifications.slice(0, 3).map((notification) => (
                                        <div 
                                            key={notification.id}
                                            className={`p-3 rounded-lg border ${
                                                notification.read_at 
                                                    ? 'bg-gray-50 border-gray-200' 
                                                    : 'bg-blue-50 border-blue-200'
                                            }`}
                                        >
                                            <div className="flex items-start justify-between">
                                                <div className="flex-1">
                                                    <p className="font-medium text-sm">
                                                        {notification.title}
                                                    </p>
                                                    <p className="text-xs text-gray-600 mt-1">
                                                        {notification.body}
                                                    </p>
                                                </div>
                                                {!notification.read_at && (
                                                    <div className="w-2 h-2 bg-blue-600 rounded-full"></div>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                    
                                    {notifications.length === 0 && (
                                        <p className="text-gray-500 text-sm text-center py-4">
                                            Aucune notification récente
                                        </p>
                                    )}
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                </TabsContent>

                {/* Déclaration de vol */}
                <TabsContent value="report" className="space-y-6">
                    <ReportStolenMoto 
                        onSuccess={() => {
                            setActiveTab('alerts');
                            toast.success('✅ Déclaration enregistrée - Vérifiez les alertes');
                        }}
                    />
                </TabsContent>

                {/* Gestion des alertes */}
                <TabsContent value="alerts" className="space-y-6">
                    <MotoSecurityAlerts 
                        bureauId={bureauId}
                        isPDG={isPDG}
                    />
                </TabsContent>

                {/* Notifications */}
                <TabsContent value="notifications" className="space-y-6">
                    <Card>
                        <CardHeader>
                            <div className="flex items-center justify-between">
                                <CardTitle className="flex items-center gap-2">
                                    <Bell className="w-5 h-5 text-blue-600" />
                                    Notifications de sécurité
                                </CardTitle>
                                {unreadCount > 0 && (
                                    <Button
                                        onClick={handleMarkAllRead}
                                        variant="outline"
                                        size="sm"
                                    >
                                        Marquer toutes comme lues
                                    </Button>
                                )}
                            </div>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-3">
                                {notifications.map((notification) => (
                                    <div 
                                        key={notification.id}
                                        className={`p-4 rounded-lg border cursor-pointer transition-colors ${
                                            notification.read_at 
                                                ? 'bg-gray-50 border-gray-200 hover:bg-gray-100' 
                                                : 'bg-blue-50 border-blue-200 hover:bg-blue-100'
                                        }`}
                                        onClick={() => markAsRead(notification.id)}
                                    >
                                        <div className="flex items-start justify-between">
                                            <div className="flex-1">
                                                <div className="flex items-center gap-2 mb-1">
                                                    <span className="font-medium">
                                                        {notification.title}
                                                    </span>
                                                    {!notification.read_at && (
                                                        <Badge variant="destructive" className="text-xs">
                                                            Nouveau
                                                        </Badge>
                                                    )}
                                                </div>
                                                <p className="text-sm text-gray-600 mb-2">
                                                    {notification.body}
                                                </p>
                                                <div className="flex items-center gap-4 text-xs text-gray-500">
                                                    <span className="flex items-center gap-1">
                                                        <Clock className="w-3 h-3" />
                                                        {new Date(notification.created_at).toLocaleString()}
                                                    </span>
                                                    <span className="flex items-center gap-1">
                                                        <Shield className="w-3 h-3" />
                                                        {notification.type}
                                                    </span>
                                                </div>
                                            </div>
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                            >
                                                <Eye className="w-4 h-4" />
                                            </Button>
                                        </div>
                                    </div>
                                ))}
                                
                                {notifications.length === 0 && (
                                    <div className="text-center py-8">
                                        <Bell className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                                        <p className="text-gray-600">Aucune notification</p>
                                    </div>
                                )}
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>
        </div>
    );
}
