/**
 * DASHBOARD DE SÉCURITÉ ULTRA-PROFESSIONNEL - 224SOLUTIONS
 * Interface centralisée pour le monitoring et la gestion de la sécurité
 */

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
    Shield,
    AlertTriangle,
    Activity,
    Lock,
    Eye,
    Ban,
    Zap,
    TrendingUp,
    TrendingDown,
    Clock,
    Globe,
    Server,
    Database,
    Wifi,
    WifiOff,
    CheckCircle2,
    XCircle,
    AlertCircle,
    Info,
    Download,
    RefreshCw,
    Settings,
    Filter,
    Search,
    MoreVertical,
    Play,
    Pause,
    Square
} from "lucide-react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, BarChart, Bar, PieChart, Pie, Cell, AreaChart, Area } from 'recharts';
import {
    useSecurity,
    useSecurityAlerts,
    useSecurityIncidents,
    useRealTimeMonitoring,
    useSecurityAnalysis,
    useRealTimeProtection,
    useSecurityAudit
} from '@/hooks/useSecurity';
import { toast } from 'sonner';

// =====================================================
// COMPOSANT PRINCIPAL DU DASHBOARD
// =====================================================

export default function SecurityDashboard() {
    const [activeTab, setActiveTab] = useState('overview');
    const [isRealTime, setIsRealTime] = useState(true);

    return (
        <div className="space-y-6">
            {/* Header avec contrôles */}
            <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                    <div className="flex items-center space-x-2">
                        <Shield className="w-8 h-8 text-blue-600" />
                        <div>
                            <h1 className="text-2xl font-bold text-gray-900">Centre de Sécurité</h1>
                            <p className="text-sm text-gray-600">Monitoring et protection en temps réel</p>
                        </div>
                    </div>
                </div>

                <div className="flex items-center space-x-3">
                    <Button
                        variant={isRealTime ? "default" : "outline"}
                        size="sm"
                        onClick={() => setIsRealTime(!isRealTime)}
                        className="flex items-center space-x-2"
                    >
                        {isRealTime ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                        <span>{isRealTime ? 'Temps Réel' : 'Pausé'}</span>
                    </Button>

                    <Button variant="outline" size="sm">
                        <RefreshCw className="w-4 h-4 mr-2" />
                        Actualiser
                    </Button>

                    <Button variant="outline" size="sm">
                        <Settings className="w-4 h-4 mr-2" />
                        Configuration
                    </Button>
                </div>
            </div>

            {/* Tabs de navigation */}
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                <TabsList className="grid w-full grid-cols-7">
                    <TabsTrigger value="overview">Vue d'ensemble</TabsTrigger>
                    <TabsTrigger value="monitoring">Monitoring</TabsTrigger>
                    <TabsTrigger value="threats">Menaces</TabsTrigger>
                    <TabsTrigger value="incidents">Incidents</TabsTrigger>
                    <TabsTrigger value="protection">Protection</TabsTrigger>
                    <TabsTrigger value="audit">Audit</TabsTrigger>
                    <TabsTrigger value="reports">Rapports</TabsTrigger>
                </TabsList>

                {/* Vue d'ensemble */}
                <TabsContent value="overview">
                    <SecurityOverview isRealTime={isRealTime} />
                </TabsContent>

                {/* Monitoring temps réel */}
                <TabsContent value="monitoring">
                    <RealTimeMonitoring isRealTime={isRealTime} />
                </TabsContent>

                {/* Gestion des menaces */}
                <TabsContent value="threats">
                    <ThreatManagement />
                </TabsContent>

                {/* Gestion des incidents */}
                <TabsContent value="incidents">
                    <IncidentManagement />
                </TabsContent>

                {/* Protection active */}
                <TabsContent value="protection">
                    <ActiveProtection />
                </TabsContent>

                {/* Logs d'audit */}
                <TabsContent value="audit">
                    <SecurityAudit />
                </TabsContent>

                {/* Rapports et analyses */}
                <TabsContent value="reports">
                    <SecurityReports />
                </TabsContent>
            </Tabs>
        </div>
    );
}

// =====================================================
// COMPOSANT VUE D'ENSEMBLE
// =====================================================

function SecurityOverview({ isRealTime }: { isRealTime: boolean }) {
    const { stats, loading } = useSecurity();
    const { alerts, unreadCount } = useSecurityAlerts();
    const { incidents } = useSecurityIncidents();

    if (loading) {
        return <div className="flex items-center justify-center h-64">Chargement...</div>;
    }

    const getHealthColor = (health: string) => {
        switch (health) {
            case 'excellent': return 'text-green-600 bg-green-100';
            case 'good': return 'text-blue-600 bg-blue-100';
            case 'warning': return 'text-yellow-600 bg-yellow-100';
            case 'critical': return 'text-red-600 bg-red-100';
            default: return 'text-gray-600 bg-gray-100';
        }
    };

    const getHealthIcon = (health: string) => {
        switch (health) {
            case 'excellent': return <CheckCircle2 className="w-5 h-5" />;
            case 'good': return <CheckCircle2 className="w-5 h-5" />;
            case 'warning': return <AlertTriangle className="w-5 h-5" />;
            case 'critical': return <XCircle className="w-5 h-5" />;
            default: return <Info className="w-5 h-5" />;
        }
    };

    return (
        <div className="space-y-6">
            {/* Statut global du système */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center space-x-2">
                        <Activity className="w-5 h-5" />
                        <span>Statut Global du Système</span>
                        {isRealTime && <Badge variant="outline" className="ml-auto">Temps Réel</Badge>}
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="flex items-center justify-between">
                        <div className={`flex items-center space-x-3 px-4 py-2 rounded-lg ${getHealthColor(stats?.systemHealth || 'good')}`}>
                            {getHealthIcon(stats?.systemHealth || 'good')}
                            <div>
                                <div className="font-semibold capitalize">{stats?.systemHealth || 'Bon'}</div>
                                <div className="text-sm opacity-80">Santé du système</div>
                            </div>
                        </div>

                        <div className="text-right">
                            <div className="text-2xl font-bold">{stats?.threatScore || 0}/10</div>
                            <div className="text-sm text-gray-600">Score de menace</div>
                        </div>
                    </div>

                    <div className="mt-4">
                        <Progress value={(stats?.threatScore || 0) * 10} className="h-2" />
                    </div>
                </CardContent>
            </Card>

            {/* Métriques clés */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <Card>
                    <CardContent className="p-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm font-medium text-gray-600">Événements Totaux</p>
                                <p className="text-2xl font-bold">{stats?.totalEvents || 0}</p>
                            </div>
                            <Activity className="w-8 h-8 text-blue-600" />
                        </div>
                        <div className="mt-2 flex items-center text-sm">
                            <TrendingUp className="w-4 h-4 text-green-600 mr-1" />
                            <span className="text-green-600">+12% cette semaine</span>
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardContent className="p-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm font-medium text-gray-600">Événements Critiques</p>
                                <p className="text-2xl font-bold text-red-600">{stats?.criticalEvents || 0}</p>
                            </div>
                            <AlertTriangle className="w-8 h-8 text-red-600" />
                        </div>
                        <div className="mt-2 flex items-center text-sm">
                            <TrendingDown className="w-4 h-4 text-green-600 mr-1" />
                            <span className="text-green-600">-5% cette semaine</span>
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardContent className="p-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm font-medium text-gray-600">IPs Bloquées</p>
                                <p className="text-2xl font-bold">{stats?.blockedIPs || 0}</p>
                            </div>
                            <Ban className="w-8 h-8 text-orange-600" />
                        </div>
                        <div className="mt-2 flex items-center text-sm">
                            <TrendingUp className="w-4 h-4 text-orange-600 mr-1" />
                            <span className="text-orange-600">+3 aujourd'hui</span>
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardContent className="p-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm font-medium text-gray-600">Incidents Actifs</p>
                                <p className="text-2xl font-bold text-yellow-600">{stats?.activeIncidents || 0}</p>
                            </div>
                            <AlertCircle className="w-8 h-8 text-yellow-600" />
                        </div>
                        <div className="mt-2 flex items-center text-sm">
                            <Clock className="w-4 h-4 text-gray-600 mr-1" />
                            <span className="text-gray-600">Temps moyen: 2h</span>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Alertes récentes et graphiques */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Alertes récentes */}
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center justify-between">
                            <span>Alertes Récentes</span>
                            <Badge variant="destructive">{unreadCount}</Badge>
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <ScrollArea className="h-64">
                            <div className="space-y-3">
                                {alerts.slice(0, 5).map((alert) => (
                                    <div key={alert.id} className="flex items-start space-x-3 p-3 border rounded-lg">
                                        <AlertTriangle className={`w-5 h-5 mt-0.5 ${alert.priority === 'urgent' ? 'text-red-600' :
                                                alert.priority === 'high' ? 'text-orange-600' :
                                                    'text-yellow-600'
                                            }`} />
                                        <div className="flex-1 min-w-0">
                                            <p className="text-sm font-medium truncate">{alert.title}</p>
                                            <p className="text-xs text-gray-600 mt-1">{alert.message}</p>
                                            <div className="flex items-center space-x-2 mt-2">
                                                <Badge variant="outline" className="text-xs">
                                                    {alert.alert_type}
                                                </Badge>
                                                <span className="text-xs text-gray-500">
                                                    {new Date(alert.created_at || '').toLocaleTimeString()}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </ScrollArea>
                    </CardContent>
                </Card>

                {/* Graphique des menaces */}
                <Card>
                    <CardHeader>
                        <CardTitle>Tendances des Menaces (7 jours)</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <ResponsiveContainer width="100%" height={250}>
                            <AreaChart data={[
                                { date: 'Lun', threats: 12, blocked: 3 },
                                { date: 'Mar', threats: 8, blocked: 2 },
                                { date: 'Mer', threats: 15, blocked: 5 },
                                { date: 'Jeu', threats: 6, blocked: 1 },
                                { date: 'Ven', threats: 10, blocked: 3 },
                                { date: 'Sam', threats: 4, blocked: 1 },
                                { date: 'Dim', threats: 7, blocked: 2 }
                            ]}>
                                <CartesianGrid strokeDasharray="3 3" />
                                <XAxis dataKey="date" />
                                <YAxis />
                                <Tooltip />
                                <Legend />
                                <Area type="monotone" dataKey="threats" stackId="1" stroke="#ef4444" fill="#fecaca" name="Menaces détectées" />
                                <Area type="monotone" dataKey="blocked" stackId="1" stroke="#f97316" fill="#fed7aa" name="Menaces bloquées" />
                            </AreaChart>
                        </ResponsiveContainer>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}

// =====================================================
// COMPOSANT MONITORING TEMPS RÉEL
// =====================================================

function RealTimeMonitoring({ isRealTime }: { isRealTime: boolean }) {
    const { events, isConnected } = useRealTimeMonitoring();
    const [filter, setFilter] = useState('all');

    const filteredEvents = events.filter(event =>
        filter === 'all' || event.severity_level === filter
    );

    const getSeverityColor = (severity: string) => {
        switch (severity) {
            case 'critical': return 'text-red-600 bg-red-100';
            case 'warning': return 'text-yellow-600 bg-yellow-100';
            case 'info': return 'text-blue-600 bg-blue-100';
            default: return 'text-gray-600 bg-gray-100';
        }
    };

    const getSeverityIcon = (severity: string) => {
        switch (severity) {
            case 'critical': return <XCircle className="w-4 h-4" />;
            case 'warning': return <AlertTriangle className="w-4 h-4" />;
            case 'info': return <Info className="w-4 h-4" />;
            default: return <Info className="w-4 h-4" />;
        }
    };

    return (
        <div className="space-y-6">
            {/* Statut de connexion */}
            <Card>
                <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                            {isConnected && isRealTime ? (
                                <>
                                    <Wifi className="w-5 h-5 text-green-600" />
                                    <span className="text-green-600 font-medium">Connecté - Monitoring actif</span>
                                </>
                            ) : (
                                <>
                                    <WifiOff className="w-5 h-5 text-red-600" />
                                    <span className="text-red-600 font-medium">Déconnecté - Monitoring en pause</span>
                                </>
                            )}
                        </div>

                        <div className="flex items-center space-x-4">
                            <div className="text-sm text-gray-600">
                                Événements: <span className="font-medium">{events.length}</span>
                            </div>

                            <select
                                value={filter}
                                onChange={(e) => setFilter(e.target.value)}
                                className="text-sm border rounded px-2 py-1"
                            >
                                <option value="all">Tous</option>
                                <option value="critical">Critique</option>
                                <option value="warning">Avertissement</option>
                                <option value="info">Information</option>
                            </select>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Flux d'événements temps réel */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center space-x-2">
                        <Activity className="w-5 h-5" />
                        <span>Flux d'Événements Temps Réel</span>
                        {isRealTime && (
                            <div className="flex items-center space-x-1 ml-auto">
                                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                                <span className="text-sm text-green-600">Live</span>
                            </div>
                        )}
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <ScrollArea className="h-96">
                        <div className="space-y-2">
                            {filteredEvents.length === 0 ? (
                                <div className="text-center py-8 text-gray-500">
                                    Aucun événement à afficher
                                </div>
                            ) : (
                                filteredEvents.map((event, index) => (
                                    <div key={`${event.id}-${index}`} className="flex items-start space-x-3 p-3 border rounded-lg hover:bg-gray-50">
                                        <div className={`flex items-center justify-center w-6 h-6 rounded-full ${getSeverityColor(event.severity_level)}`}>
                                            {getSeverityIcon(event.severity_level)}
                                        </div>

                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center justify-between">
                                                <p className="text-sm font-medium">{event.event_type.replace('_', ' ')}</p>
                                                <span className="text-xs text-gray-500">
                                                    {new Date(event.created_at || '').toLocaleTimeString()}
                                                </span>
                                            </div>

                                            <p className="text-xs text-gray-600 mt-1">
                                                Module: {event.source_module} | IP: {event.ip_address || 'N/A'}
                                            </p>

                                            {event.threat_level && (
                                                <div className="flex items-center space-x-2 mt-2">
                                                    <Badge variant="outline" className="text-xs">
                                                        Menace: {event.threat_level}/10
                                                    </Badge>
                                                    {event.auto_response_taken && (
                                                        <Badge variant="secondary" className="text-xs">
                                                            Réponse auto
                                                        </Badge>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </ScrollArea>
                </CardContent>
            </Card>
        </div>
    );
}

// =====================================================
// COMPOSANT GESTION DES MENACES
// =====================================================

function ThreatManagement() {
    const { blockIP, analyzeThreat } = useSecurity();
    const [ipToAnalyze, setIpToAnalyze] = useState('');
    const [analysisResult, setAnalysisResult] = useState<any>(null);
    const [loading, setLoading] = useState(false);

    const handleAnalyze = async () => {
        if (!ipToAnalyze) return;

        setLoading(true);
        try {
            const result = await analyzeThreat(ipToAnalyze);
            setAnalysisResult(result);
        } catch (error) {
            toast.error('Erreur lors de l\'analyse');
        } finally {
            setLoading(false);
        }
    };

    const handleBlock = async (ip: string, reason: string) => {
        const success = await blockIP(ip, reason);
        if (success) {
            setAnalysisResult(null);
            setIpToAnalyze('');
        }
    };

    return (
        <div className="space-y-6">
            {/* Analyse d'IP */}
            <Card>
                <CardHeader>
                    <CardTitle>Analyse de Menaces IP</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="flex space-x-3">
                        <input
                            type="text"
                            placeholder="Adresse IP à analyser (ex: 192.168.1.1)"
                            value={ipToAnalyze}
                            onChange={(e) => setIpToAnalyze(e.target.value)}
                            className="flex-1 px-3 py-2 border rounded-lg"
                        />
                        <Button onClick={handleAnalyze} disabled={loading || !ipToAnalyze}>
                            {loading ? 'Analyse...' : 'Analyser'}
                        </Button>
                    </div>

                    {analysisResult && (
                        <div className="border rounded-lg p-4 space-y-4">
                            <div className="flex items-center justify-between">
                                <h3 className="font-semibold">Résultats pour {analysisResult.ip_address}</h3>
                                <Badge variant={
                                    analysisResult.recommendation === 'block' ? 'destructive' :
                                        analysisResult.recommendation === 'investigate' ? 'secondary' :
                                            analysisResult.recommendation === 'monitor' ? 'outline' : 'default'
                                }>
                                    {analysisResult.recommendation}
                                </Badge>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <p className="text-sm text-gray-600">Score de menace</p>
                                    <div className="flex items-center space-x-2">
                                        <Progress value={analysisResult.threat_score * 10} className="flex-1" />
                                        <span className="text-sm font-medium">{analysisResult.threat_score}/10</span>
                                    </div>
                                </div>

                                <div>
                                    <p className="text-sm text-gray-600">Activité récente</p>
                                    <p className="font-medium">{analysisResult.recent_activity.length} événements</p>
                                </div>
                            </div>

                            {analysisResult.risk_factors.length > 0 && (
                                <div>
                                    <p className="text-sm text-gray-600 mb-2">Facteurs de risque:</p>
                                    <div className="space-y-1">
                                        {analysisResult.risk_factors.map((factor: string, index: number) => (
                                            <div key={index} className="flex items-center space-x-2">
                                                <AlertTriangle className="w-4 h-4 text-yellow-600" />
                                                <span className="text-sm">{factor}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {analysisResult.recommendation === 'block' && (
                                <div className="flex space-x-2">
                                    <Button
                                        variant="destructive"
                                        size="sm"
                                        onClick={() => handleBlock(analysisResult.ip_address, 'Menace détectée par analyse')}
                                    >
                                        Bloquer cette IP
                                    </Button>
                                </div>
                            )}
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Top des menaces */}
            <Card>
                <CardHeader>
                    <CardTitle>Top des Menaces Détectées</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="space-y-3">
                        {[
                            { type: 'Tentatives de connexion échouées', count: 45, severity: 'high' },
                            { type: 'Appels API suspects', count: 23, severity: 'medium' },
                            { type: 'Patterns de transaction inhabituels', count: 12, severity: 'low' },
                            { type: 'Tentatives d\'accès IP bloquées', count: 8, severity: 'high' }
                        ].map((threat, index) => (
                            <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                                <div className="flex items-center space-x-3">
                                    <AlertTriangle className={`w-5 h-5 ${threat.severity === 'high' ? 'text-red-600' :
                                            threat.severity === 'medium' ? 'text-yellow-600' :
                                                'text-blue-600'
                                        }`} />
                                    <div>
                                        <p className="font-medium">{threat.type}</p>
                                        <p className="text-sm text-gray-600">{threat.count} occurrences</p>
                                    </div>
                                </div>
                                <Badge variant={
                                    threat.severity === 'high' ? 'destructive' :
                                        threat.severity === 'medium' ? 'secondary' : 'outline'
                                }>
                                    {threat.severity}
                                </Badge>
                            </div>
                        ))}
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}

// =====================================================
// COMPOSANT GESTION DES INCIDENTS
// =====================================================

function IncidentManagement() {
    const { incidents, createIncident } = useSecurityIncidents();
    const [showCreateForm, setShowCreateForm] = useState(false);

    return (
        <div className="space-y-6">
            {/* Header avec bouton de création */}
            <div className="flex items-center justify-between">
                <h2 className="text-xl font-semibold">Gestion des Incidents</h2>
                <Button onClick={() => setShowCreateForm(true)}>
                    Créer un Incident
                </Button>
            </div>

            {/* Liste des incidents */}
            <div className="space-y-4">
                {incidents.map((incident) => (
                    <Card key={incident.id}>
                        <CardContent className="p-4">
                            <div className="flex items-start justify-between">
                                <div className="space-y-2">
                                    <div className="flex items-center space-x-3">
                                        <Badge variant={
                                            incident.severity === 'critical' ? 'destructive' :
                                                incident.severity === 'high' ? 'secondary' :
                                                    incident.severity === 'medium' ? 'outline' : 'default'
                                        }>
                                            {incident.severity}
                                        </Badge>
                                        <h3 className="font-semibold">{incident.title}</h3>
                                    </div>

                                    <p className="text-sm text-gray-600">{incident.description}</p>

                                    <div className="flex items-center space-x-4 text-xs text-gray-500">
                                        <span>ID: {incident.incident_id}</span>
                                        <span>Type: {incident.incident_type}</span>
                                        <span>Modules: {incident.affected_modules.join(', ')}</span>
                                    </div>
                                </div>

                                <Badge variant={
                                    incident.status === 'open' ? 'destructive' :
                                        incident.status === 'investigating' ? 'secondary' :
                                            'default'
                                }>
                                    {incident.status}
                                </Badge>
                            </div>
                        </CardContent>
                    </Card>
                ))}
            </div>
        </div>
    );
}

// =====================================================
// COMPOSANT PROTECTION ACTIVE
// =====================================================

function ActiveProtection() {
    const { protectionStatus, threatLevel, toggleProtection } = useRealTimeProtection();

    const getThreatLevelColor = (level: string) => {
        switch (level) {
            case 'critical': return 'text-red-600 bg-red-100';
            case 'high': return 'text-orange-600 bg-orange-100';
            case 'medium': return 'text-yellow-600 bg-yellow-100';
            case 'low': return 'text-green-600 bg-green-100';
            default: return 'text-gray-600 bg-gray-100';
        }
    };

    return (
        <div className="space-y-6">
            {/* Niveau de menace global */}
            <Card>
                <CardHeader>
                    <CardTitle>Niveau de Menace Global</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className={`flex items-center justify-center p-6 rounded-lg ${getThreatLevelColor(threatLevel)}`}>
                        <div className="text-center">
                            <div className="text-3xl font-bold capitalize">{threatLevel}</div>
                            <div className="text-sm opacity-80">Niveau de menace actuel</div>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Services de protection */}
            <Card>
                <CardHeader>
                    <CardTitle>Services de Protection</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {Object.entries(protectionStatus).map(([service, isActive]) => (
                            <div key={service} className="flex items-center justify-between p-4 border rounded-lg">
                                <div className="flex items-center space-x-3">
                                    <div className={`w-3 h-3 rounded-full ${isActive ? 'bg-green-500' : 'bg-red-500'}`}></div>
                                    <div>
                                        <p className="font-medium capitalize">{service.replace(/([A-Z])/g, ' $1')}</p>
                                        <p className="text-sm text-gray-600">
                                            {isActive ? 'Actif' : 'Inactif'}
                                        </p>
                                    </div>
                                </div>
                                <Button
                                    variant={isActive ? "destructive" : "default"}
                                    size="sm"
                                    onClick={() => toggleProtection(service as keyof typeof protectionStatus)}
                                >
                                    {isActive ? 'Désactiver' : 'Activer'}
                                </Button>
                            </div>
                        ))}
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}

// =====================================================
// COMPOSANT AUDIT DE SÉCURITÉ
// =====================================================

function SecurityAudit() {
    const { auditLogs, loading, filters, updateFilters, exportLogs } = useSecurityAudit();

    return (
        <div className="space-y-6">
            {/* Contrôles et filtres */}
            <Card>
                <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-4">
                            <select
                                value={filters.dateRange}
                                onChange={(e) => updateFilters({ dateRange: e.target.value })}
                                className="text-sm border rounded px-2 py-1"
                            >
                                <option value="24h">Dernières 24h</option>
                                <option value="7d">7 derniers jours</option>
                                <option value="30d">30 derniers jours</option>
                            </select>

                            <select
                                value={filters.severity}
                                onChange={(e) => updateFilters({ severity: e.target.value })}
                                className="text-sm border rounded px-2 py-1"
                            >
                                <option value="all">Toutes les sévérités</option>
                                <option value="low">Faible</option>
                                <option value="medium">Moyen</option>
                                <option value="high">Élevé</option>
                            </select>
                        </div>

                        <div className="flex items-center space-x-2">
                            <Button variant="outline" size="sm" onClick={() => exportLogs('csv')}>
                                <Download className="w-4 h-4 mr-2" />
                                CSV
                            </Button>
                            <Button variant="outline" size="sm" onClick={() => exportLogs('json')}>
                                <Download className="w-4 h-4 mr-2" />
                                JSON
                            </Button>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Logs d'audit */}
            <Card>
                <CardHeader>
                    <CardTitle>Logs d'Audit</CardTitle>
                </CardHeader>
                <CardContent>
                    {loading ? (
                        <div className="text-center py-8">Chargement des logs...</div>
                    ) : (
                        <ScrollArea className="h-96">
                            <div className="space-y-2">
                                {auditLogs.map((log) => (
                                    <div key={log.id} className="flex items-center space-x-4 p-3 border rounded-lg text-sm">
                                        <div className="w-20 text-gray-500">
                                            {new Date(log.timestamp).toLocaleTimeString()}
                                        </div>
                                        <div className="w-24 font-mono text-xs">
                                            {log.user}
                                        </div>
                                        <div className="w-32">
                                            {log.action}
                                        </div>
                                        <div className="w-24">
                                            {log.resource}
                                        </div>
                                        <div className="w-32 font-mono text-xs">
                                            {log.ip_address}
                                        </div>
                                        <Badge variant={
                                            log.severity === 'high' ? 'destructive' :
                                                log.severity === 'medium' ? 'secondary' : 'outline'
                                        }>
                                            {log.severity}
                                        </Badge>
                                        <div className="flex-1 text-gray-600">
                                            {log.details}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </ScrollArea>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}

// =====================================================
// COMPOSANT RAPPORTS DE SÉCURITÉ
// =====================================================

function SecurityReports() {
    const { analysisData, loading, runAnalysis } = useSecurityAnalysis();

    return (
        <div className="space-y-6">
            {/* Contrôles de génération */}
            <Card>
                <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                        <h3 className="font-semibold">Analyse de Sécurité Avancée</h3>
                        <Button onClick={runAnalysis} disabled={loading}>
                            {loading ? 'Analyse en cours...' : 'Lancer l\'Analyse'}
                        </Button>
                    </div>
                </CardContent>
            </Card>

            {analysisData && (
                <>
                    {/* Score de sécurité */}
                    <Card>
                        <CardHeader>
                            <CardTitle>Score de Sécurité Global</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="flex items-center justify-center">
                                <div className="relative w-32 h-32">
                                    <svg className="w-32 h-32 transform -rotate-90">
                                        <circle
                                            cx="64"
                                            cy="64"
                                            r="56"
                                            stroke="currentColor"
                                            strokeWidth="8"
                                            fill="transparent"
                                            className="text-gray-200"
                                        />
                                        <circle
                                            cx="64"
                                            cy="64"
                                            r="56"
                                            stroke="currentColor"
                                            strokeWidth="8"
                                            fill="transparent"
                                            strokeDasharray={`${2 * Math.PI * 56}`}
                                            strokeDashoffset={`${2 * Math.PI * 56 * (1 - analysisData.securityScore / 100)}`}
                                            className={`${analysisData.securityScore >= 80 ? 'text-green-500' :
                                                    analysisData.securityScore >= 60 ? 'text-yellow-500' :
                                                        'text-red-500'
                                                }`}
                                        />
                                    </svg>
                                    <div className="absolute inset-0 flex items-center justify-center">
                                        <div className="text-center">
                                            <div className="text-2xl font-bold">{analysisData.securityScore}</div>
                                            <div className="text-sm text-gray-600">/ 100</div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Graphiques d'analyse */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        <Card>
                            <CardHeader>
                                <CardTitle>Tendances des Menaces</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <ResponsiveContainer width="100%" height={200}>
                                    <LineChart data={analysisData.threatTrends}>
                                        <CartesianGrid strokeDasharray="3 3" />
                                        <XAxis dataKey="date" />
                                        <YAxis />
                                        <Tooltip />
                                        <Line type="monotone" dataKey="threats" stroke="#ef4444" />
                                    </LineChart>
                                </ResponsiveContainer>
                            </CardContent>
                        </Card>

                        <Card>
                            <CardHeader>
                                <CardTitle>Top des Menaces</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="space-y-3">
                                    {analysisData.topThreats.map((threat: any, index: number) => (
                                        <div key={index} className="flex items-center justify-between">
                                            <div>
                                                <p className="font-medium">{threat.type}</p>
                                                <p className="text-sm text-gray-600">{threat.count} occurrences</p>
                                            </div>
                                            <Badge variant={
                                                threat.severity === 'high' ? 'destructive' :
                                                    threat.severity === 'medium' ? 'secondary' : 'outline'
                                            }>
                                                {threat.severity}
                                            </Badge>
                                        </div>
                                    ))}
                                </div>
                            </CardContent>
                        </Card>
                    </div>

                    {/* Recommandations */}
                    <Card>
                        <CardHeader>
                            <CardTitle>Recommandations de Sécurité</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-3">
                                {analysisData.recommendations.map((recommendation: string, index: number) => (
                                    <div key={index} className="flex items-start space-x-3 p-3 border rounded-lg">
                                        <CheckCircle2 className="w-5 h-5 text-blue-600 mt-0.5" />
                                        <p className="text-sm">{recommendation}</p>
                                    </div>
                                ))}
                            </div>
                        </CardContent>
                    </Card>
                </>
            )}
        </div>
    );
}
