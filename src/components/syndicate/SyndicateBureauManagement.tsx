/**
 * GESTION DES BUREAUX SYNDICAUX - INTERFACE PDG ULTRA PROFESSIONNELLE
 * Module complet de création et gestion des bureaux syndicaux
 * 224Solutions - Bureau Syndicat System
 */

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
    Building2,
    Plus,
    Mail,
    MapPin,
    Users,
    DollarSign,
    AlertTriangle,
    CheckCircle,
    XCircle,
    Eye,
    Send,
    Download,
    Trash2,
    Edit,
    Shield,
    Crown,
    Activity,
    Calendar,
    Phone,
    Link,
    Copy,
    ExternalLink
} from "lucide-react";
import { toast } from "sonner";
import { supabase } from '@/integrations/supabase/client';

interface SyndicateBureau {
    id: string;
    bureau_code: string;
    prefecture: string;
    commune: string;
    full_location: string;
    president_name: string;
    president_email: string;
    president_phone?: string;
    permanent_link: string;
    access_token: string;
    status: 'pending' | 'active' | 'suspended' | 'dissolved';
    total_members: number;
    active_members: number;
    total_vehicles: number;
    total_cotisations: number;
    link_sent_at?: string;
    link_accessed_at?: string;
    created_at: string;
    validated_at?: string;
}

interface SOSAlert {
    id: string;
    bureau_name: string;
    member_name: string;
    vehicle_serial: string;
    alert_type: string;
    severity: string;
    latitude: number;
    longitude: number;
    address?: string;
    description?: string;
    status: string;
    created_at: string;
}

export default function SyndicateBureauManagement() {
    const [bureaus, setBureaus] = useState<SyndicateBureau[]>([]);
    const [sosAlerts, setSOSAlerts] = useState<SOSAlert[]>([]);
    const [loading, setLoading] = useState(true);
    const [showCreateDialog, setShowCreateDialog] = useState(false);
    const [selectedBureau, setSelectedBureau] = useState<SyndicateBureau | null>(null);
    const [activeTab, setActiveTab] = useState('overview');

    // Formulaire de création
    const [formData, setFormData] = useState({
        prefecture: '',
        commune: '',
        president_name: '',
        president_email: '',
        president_phone: ''
    });

    useEffect(() => {
        loadBureaus();
        loadSOSAlerts();
    }, []);

    /**
     * Charge la liste des bureaux syndicaux
     */
    const loadBureaus = async () => {
        try {
            // Simuler le chargement depuis Supabase
            const mockBureaus: SyndicateBureau[] = [
                {
                    id: '1',
                    bureau_code: 'SYN-2025-00001',
                    prefecture: 'Dakar',
                    commune: 'Plateau',
                    full_location: 'Dakar - Plateau',
                    president_name: 'Mamadou Diallo',
                    president_email: 'mamadou.diallo@email.com',
                    president_phone: '+221 77 123 45 67',
                    permanent_link: 'https://224solutions.com/syndicat/access/abc123def456',
                    access_token: 'abc123def456',
                    status: 'active',
                    total_members: 45,
                    active_members: 42,
                    total_vehicles: 38,
                    total_cotisations: 2250000,
                    link_sent_at: '2025-09-25T10:30:00Z',
                    link_accessed_at: '2025-09-25T14:20:00Z',
                    created_at: '2025-09-25T10:00:00Z',
                    validated_at: '2025-09-25T16:00:00Z'
                },
                {
                    id: '2',
                    bureau_code: 'SYN-2025-00002',
                    prefecture: 'Thiès',
                    commune: 'Thiès Nord',
                    full_location: 'Thiès - Thiès Nord',
                    president_name: 'Fatou Sall',
                    president_email: 'fatou.sall@email.com',
                    president_phone: '+221 76 987 65 43',
                    permanent_link: 'https://224solutions.com/syndicat/access/xyz789uvw012',
                    access_token: 'xyz789uvw012',
                    status: 'pending',
                    total_members: 0,
                    active_members: 0,
                    total_vehicles: 0,
                    total_cotisations: 0,
                    link_sent_at: '2025-09-30T09:15:00Z',
                    created_at: '2025-09-30T09:00:00Z'
                }
            ];

            setBureaus(mockBureaus);
        } catch (error) {
            console.error('Erreur chargement bureaux:', error);
            toast.error('Impossible de charger les bureaux syndicaux');
        } finally {
            setLoading(false);
        }
    };

    /**
     * Charge les alertes SOS actives
     */
    const loadSOSAlerts = async () => {
        try {
            const mockAlerts: SOSAlert[] = [
                {
                    id: '1',
                    bureau_name: 'SYN-2025-00001 (Dakar - Plateau)',
                    member_name: 'Ibrahima Ndiaye',
                    vehicle_serial: 'MT-2024-001234',
                    alert_type: 'emergency',
                    severity: 'critical',
                    latitude: 14.6937,
                    longitude: -17.4441,
                    address: 'Avenue Bourguiba, Dakar',
                    description: 'Accident de circulation',
                    status: 'active',
                    created_at: '2025-09-30T15:30:00Z'
                }
            ];

            setSOSAlerts(mockAlerts);
        } catch (error) {
            console.error('Erreur chargement alertes SOS:', error);
        }
    };

    /**
     * Crée un nouveau bureau syndical
     */
    const createBureau = async () => {
        if (!formData.prefecture || !formData.commune || !formData.president_name || !formData.president_email) {
            toast.error('Veuillez remplir tous les champs obligatoires');
            return;
        }

        try {
            // Générer le lien permanent et le token d'accès
            const accessToken = generateAccessToken();
            const permanentLink = `https://224solutions.com/syndicat/access/${accessToken}`;

            const newBureau: SyndicateBureau = {
                id: Date.now().toString(),
                bureau_code: `SYN-2025-${String(bureaus.length + 1).padStart(5, '0')}`,
                prefecture: formData.prefecture,
                commune: formData.commune,
                full_location: `${formData.prefecture} - ${formData.commune}`,
                president_name: formData.president_name,
                president_email: formData.president_email,
                president_phone: formData.president_phone,
                permanent_link: permanentLink,
                access_token: accessToken,
                status: 'pending',
                total_members: 0,
                active_members: 0,
                total_vehicles: 0,
                total_cotisations: 0,
                created_at: new Date().toISOString()
            };

            setBureaus(prev => [...prev, newBureau]);

            // Simuler l'envoi d'email
            await sendPresidentEmail(newBureau);

            // Réinitialiser le formulaire
            setFormData({
                prefecture: '',
                commune: '',
                president_name: '',
                president_email: '',
                president_phone: ''
            });

            setShowCreateDialog(false);
            toast.success('Bureau syndical créé avec succès ! Email envoyé au président.');

        } catch (error) {
            console.error('Erreur création bureau:', error);
            toast.error('Erreur lors de la création du bureau');
        }
    };

    /**
     * Génère un token d'accès unique
     */
    const generateAccessToken = (): string => {
        return Array.from({ length: 32 }, () =>
            Math.random().toString(36).charAt(2)
        ).join('');
    };

    /**
     * Envoie l'email au président avec le lien permanent
     */
    const sendPresidentEmail = async (bureau: SyndicateBureau) => {
        // Simuler l'envoi d'email
        console.log('📧 Email envoyé à:', bureau.president_email);
        console.log('🔗 Lien permanent:', bureau.permanent_link);

        // Mettre à jour la date d'envoi
        setBureaus(prev => prev.map(b =>
            b.id === bureau.id
                ? { ...b, link_sent_at: new Date().toISOString() }
                : b
        ));
    };

    /**
     * Renvoie le lien permanent
     */
    const resendLink = async (bureau: SyndicateBureau) => {
        await sendPresidentEmail(bureau);
        toast.success('Lien renvoyé avec succès');
    };

    /**
     * Copie le lien permanent
     */
    const copyLink = (link: string) => {
        navigator.clipboard.writeText(link);
        toast.success('Lien copié dans le presse-papier');
    };

    /**
     * Change le statut d'un bureau
     */
    const changeBureauStatus = (bureauId: string, newStatus: SyndicateBureau['status']) => {
        setBureaus(prev => prev.map(b =>
            b.id === bureauId
                ? {
                    ...b,
                    status: newStatus,
                    validated_at: newStatus === 'active' ? new Date().toISOString() : b.validated_at
                }
                : b
        ));

        const statusLabels = {
            pending: 'en attente',
            active: 'actif',
            suspended: 'suspendu',
            dissolved: 'dissous'
        };

        toast.success(`Bureau ${statusLabels[newStatus]}`);
    };

    /**
     * Formate la date
     */
    const formatDate = (dateString?: string) => {
        if (!dateString) return 'N/A';
        return new Date(dateString).toLocaleDateString('fr-FR', {
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
            case 'active': return 'bg-green-100 text-green-800';
            case 'pending': return 'bg-yellow-100 text-yellow-800';
            case 'suspended': return 'bg-red-100 text-red-800';
            case 'dissolved': return 'bg-gray-100 text-gray-800';
            default: return 'bg-gray-100 text-gray-800';
        }
    };

    /**
     * Obtient le libellé du statut
     */
    const getStatusLabel = (status: string) => {
        switch (status) {
            case 'active': return 'Actif';
            case 'pending': return 'En attente';
            case 'suspended': return 'Suspendu';
            case 'dissolved': return 'Dissous';
            default: return status;
        }
    };

    if (loading) {
        return (
            <Card>
                <CardContent className="p-8 text-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
                    <p className="text-gray-600">Chargement des bureaux syndicaux...</p>
                </CardContent>
            </Card>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header avec statistiques */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <Card>
                    <CardContent className="p-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm font-medium text-gray-600">Total Bureaux</p>
                                <p className="text-2xl font-bold text-blue-600">{bureaus.length}</p>
                            </div>
                            <Building2 className="w-8 h-8 text-blue-600" />
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardContent className="p-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm font-medium text-gray-600">Bureaux Actifs</p>
                                <p className="text-2xl font-bold text-green-600">
                                    {bureaus.filter(b => b.status === 'active').length}
                                </p>
                            </div>
                            <CheckCircle className="w-8 h-8 text-green-600" />
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardContent className="p-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm font-medium text-gray-600">Total Membres</p>
                                <p className="text-2xl font-bold text-purple-600">
                                    {bureaus.reduce((sum, b) => sum + b.total_members, 0)}
                                </p>
                            </div>
                            <Users className="w-8 h-8 text-purple-600" />
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardContent className="p-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm font-medium text-gray-600">Alertes SOS</p>
                                <p className="text-2xl font-bold text-red-600">{sosAlerts.length}</p>
                            </div>
                            <AlertTriangle className="w-8 h-8 text-red-600" />
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Navigation par onglets */}
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                <TabsList className="grid w-full grid-cols-4">
                    <TabsTrigger value="overview">Vue d'ensemble</TabsTrigger>
                    <TabsTrigger value="bureaus">Bureaux</TabsTrigger>
                    <TabsTrigger value="sos">Alertes SOS</TabsTrigger>
                    <TabsTrigger value="statistics">Statistiques</TabsTrigger>
                </TabsList>

                {/* Onglet Vue d'ensemble */}
                <TabsContent value="overview" className="space-y-4">
                    <div className="flex justify-between items-center">
                        <h2 className="text-2xl font-bold">Gestion des Bureaux Syndicaux</h2>
                        <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
                            <DialogTrigger asChild>
                                <Button className="bg-blue-600 hover:bg-blue-700">
                                    <Plus className="w-4 h-4 mr-2" />
                                    Créer un Bureau Syndical
                                </Button>
                            </DialogTrigger>
                            <DialogContent className="max-w-md">
                                <DialogHeader>
                                    <DialogTitle>Nouveau Bureau Syndical</DialogTitle>
                                </DialogHeader>
                                <div className="space-y-4">
                                    <div>
                                        <Label htmlFor="prefecture">Préfecture *</Label>
                                        <Input
                                            id="prefecture"
                                            value={formData.prefecture}
                                            onChange={(e) => setFormData(prev => ({ ...prev, prefecture: e.target.value }))}
                                            placeholder="Ex: Dakar"
                                        />
                                    </div>
                                    <div>
                                        <Label htmlFor="commune">Commune *</Label>
                                        <Input
                                            id="commune"
                                            value={formData.commune}
                                            onChange={(e) => setFormData(prev => ({ ...prev, commune: e.target.value }))}
                                            placeholder="Ex: Plateau"
                                        />
                                    </div>
                                    <div>
                                        <Label htmlFor="president_name">Nom du Président *</Label>
                                        <Input
                                            id="president_name"
                                            value={formData.president_name}
                                            onChange={(e) => setFormData(prev => ({ ...prev, president_name: e.target.value }))}
                                            placeholder="Nom complet"
                                        />
                                    </div>
                                    <div>
                                        <Label htmlFor="president_email">Email du Président *</Label>
                                        <Input
                                            id="president_email"
                                            type="email"
                                            value={formData.president_email}
                                            onChange={(e) => setFormData(prev => ({ ...prev, president_email: e.target.value }))}
                                            placeholder="email@example.com"
                                        />
                                    </div>
                                    <div>
                                        <Label htmlFor="president_phone">Téléphone (optionnel)</Label>
                                        <Input
                                            id="president_phone"
                                            value={formData.president_phone}
                                            onChange={(e) => setFormData(prev => ({ ...prev, president_phone: e.target.value }))}
                                            placeholder="+221 77 123 45 67"
                                        />
                                    </div>
                                    <div className="flex gap-2 pt-4">
                                        <Button onClick={createBureau} className="flex-1">
                                            Créer le Bureau
                                        </Button>
                                        <Button
                                            variant="outline"
                                            onClick={() => setShowCreateDialog(false)}
                                            className="flex-1"
                                        >
                                            Annuler
                                        </Button>
                                    </div>
                                </div>
                            </DialogContent>
                        </Dialog>
                    </div>

                    {/* Liste récente des bureaux */}
                    <Card>
                        <CardHeader>
                            <CardTitle>Bureaux Récents</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-4">
                                {bureaus.slice(0, 3).map((bureau) => (
                                    <div key={bureau.id} className="flex items-center justify-between p-4 border rounded-lg">
                                        <div className="flex items-center gap-4">
                                            <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                                                <Building2 className="w-6 h-6 text-blue-600" />
                                            </div>
                                            <div>
                                                <h3 className="font-semibold">{bureau.bureau_code}</h3>
                                                <p className="text-sm text-gray-600">{bureau.full_location}</p>
                                                <p className="text-sm text-gray-600">Président: {bureau.president_name}</p>
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            <Badge className={getStatusColor(bureau.status)}>
                                                {getStatusLabel(bureau.status)}
                                            </Badge>
                                            <p className="text-sm text-gray-600 mt-1">
                                                {bureau.total_members} membres
                                            </p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* Onglet Bureaux */}
                <TabsContent value="bureaus" className="space-y-4">
                    <Card>
                        <CardHeader>
                            <CardTitle>Liste des Bureaux Syndicaux</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Code Bureau</TableHead>
                                        <TableHead>Localisation</TableHead>
                                        <TableHead>Président</TableHead>
                                        <TableHead>Membres</TableHead>
                                        <TableHead>Statut</TableHead>
                                        <TableHead>Actions</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {bureaus.map((bureau) => (
                                        <TableRow key={bureau.id}>
                                            <TableCell className="font-medium">{bureau.bureau_code}</TableCell>
                                            <TableCell>{bureau.full_location}</TableCell>
                                            <TableCell>
                                                <div>
                                                    <p className="font-medium">{bureau.president_name}</p>
                                                    <p className="text-sm text-gray-600">{bureau.president_email}</p>
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                <div className="text-center">
                                                    <p className="font-bold">{bureau.active_members}</p>
                                                    <p className="text-xs text-gray-600">sur {bureau.total_members}</p>
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                <Badge className={getStatusColor(bureau.status)}>
                                                    {getStatusLabel(bureau.status)}
                                                </Badge>
                                            </TableCell>
                                            <TableCell>
                                                <div className="flex gap-2">
                                                    <Button
                                                        size="sm"
                                                        variant="outline"
                                                        onClick={() => copyLink(bureau.permanent_link)}
                                                    >
                                                        <Copy className="w-4 h-4" />
                                                    </Button>
                                                    <Button
                                                        size="sm"
                                                        variant="outline"
                                                        onClick={() => resendLink(bureau)}
                                                    >
                                                        <Send className="w-4 h-4" />
                                                    </Button>
                                                    {bureau.status === 'pending' && (
                                                        <Button
                                                            size="sm"
                                                            onClick={() => changeBureauStatus(bureau.id, 'active')}
                                                        >
                                                            <CheckCircle className="w-4 h-4" />
                                                        </Button>
                                                    )}
                                                    {bureau.status === 'active' && (
                                                        <Button
                                                            size="sm"
                                                            variant="destructive"
                                                            onClick={() => changeBureauStatus(bureau.id, 'suspended')}
                                                        >
                                                            <XCircle className="w-4 h-4" />
                                                        </Button>
                                                    )}
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* Onglet Alertes SOS */}
                <TabsContent value="sos" className="space-y-4">
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <AlertTriangle className="w-5 h-5 text-red-600" />
                                Alertes SOS Actives
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            {sosAlerts.length === 0 ? (
                                <div className="text-center py-8">
                                    <Shield className="w-12 h-12 mx-auto mb-4 text-gray-400" />
                                    <p className="text-gray-600">Aucune alerte SOS active</p>
                                </div>
                            ) : (
                                <div className="space-y-4">
                                    {sosAlerts.map((alert) => (
                                        <div key={alert.id} className="border-l-4 border-red-500 bg-red-50 p-4 rounded-r-lg">
                                            <div className="flex items-start justify-between">
                                                <div>
                                                    <h3 className="font-semibold text-red-800">
                                                        {alert.member_name} - {alert.vehicle_serial}
                                                    </h3>
                                                    <p className="text-sm text-red-700">{alert.bureau_name}</p>
                                                    <p className="text-sm text-gray-600 mt-1">{alert.description}</p>
                                                    <div className="flex items-center gap-4 mt-2 text-xs text-gray-600">
                                                        <span>📍 {alert.address}</span>
                                                        <span>🕒 {formatDate(alert.created_at)}</span>
                                                    </div>
                                                </div>
                                                <div className="flex gap-2">
                                                    <Button size="sm" variant="outline">
                                                        <MapPin className="w-4 h-4 mr-1" />
                                                        Localiser
                                                    </Button>
                                                    <Button size="sm">
                                                        <Phone className="w-4 h-4 mr-1" />
                                                        Contacter
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

                {/* Onglet Statistiques */}
                <TabsContent value="statistics" className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <Card>
                            <CardHeader>
                                <CardTitle>Répartition par Statut</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="space-y-3">
                                    {['active', 'pending', 'suspended', 'dissolved'].map((status) => {
                                        const count = bureaus.filter(b => b.status === status).length;
                                        const percentage = bureaus.length > 0 ? (count / bureaus.length) * 100 : 0;

                                        return (
                                            <div key={status} className="flex items-center justify-between">
                                                <div className="flex items-center gap-2">
                                                    <div className={`w-3 h-3 rounded-full ${status === 'active' ? 'bg-green-500' :
                                                            status === 'pending' ? 'bg-yellow-500' :
                                                                status === 'suspended' ? 'bg-red-500' :
                                                                    'bg-gray-500'
                                                        }`}></div>
                                                    <span className="capitalize">{getStatusLabel(status)}</span>
                                                </div>
                                                <div className="text-right">
                                                    <span className="font-bold">{count}</span>
                                                    <span className="text-sm text-gray-600 ml-2">
                                                        ({percentage.toFixed(1)}%)
                                                    </span>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </CardContent>
                        </Card>

                        <Card>
                            <CardHeader>
                                <CardTitle>Cotisations Totales</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="text-center">
                                    <p className="text-3xl font-bold text-green-600">
                                        {bureaus.reduce((sum, b) => sum + b.total_cotisations, 0).toLocaleString()} FCFA
                                    </p>
                                    <p className="text-sm text-gray-600 mt-2">
                                        Collectées par tous les bureaux
                                    </p>
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                </TabsContent>
            </Tabs>
        </div>
    );
}
