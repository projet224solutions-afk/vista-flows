// @ts-nocheck
/**
 * GESTION DES VÉHICULES ET BADGES NUMÉRIQUES ULTRA PROFESSIONNELLE
 * Interface complète pour l'enregistrement et gestion des véhicules avec QR codes
 * 224Solutions - Bureau Syndicat System
 */

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
    Car,
    Plus,
    Search,
    QrCode,
    Download,
    Upload,
    Eye,
    Edit,
    Trash2,
    CheckCircle,
    XCircle,
    AlertTriangle,
    Shield,
    FileText,
    Calendar,
    MapPin,
    Settings,
    Printer,
    Share2
} from "lucide-react";
import { toast } from "sonner";

interface SyndicateVehicle {
    id: string;
    member_id: string;
    member_name: string;
    serial_number: string;
    license_plate: string;
    vehicle_type: 'motorcycle' | 'tricycle' | 'car';
    brand?: string;
    model?: string;
    year?: number;
    color?: string;
    registration_document_url?: string;
    insurance_document_url?: string;
    technical_control_url?: string;
    digital_badge_id: string;
    qr_code_data: string;
    status: 'active' | 'suspended' | 'maintenance' | 'retired';
    verified: boolean;
    verified_at?: string;
    badge_generated_at: string;
    created_at: string;
}

interface SyndicateVehicleManagementProps {
    bureauId: string;
}

export default function SyndicateVehicleManagement({ bureauId }: SyndicateVehicleManagementProps) {
    const [vehicles, setVehicles] = useState<SyndicateVehicle[]>([]);
    const [loading, setLoading] = useState(true);
    const [showAddDialog, setShowAddDialog] = useState(false);
    const [selectedVehicle, setSelectedVehicle] = useState<SyndicateVehicle | null>(null);
    const [showBadgeDialog, setShowBadgeDialog] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState<string>('all');
    const [typeFilter, setTypeFilter] = useState<string>('all');

    // Formulaire d'ajout de véhicule
    const [formData, setFormData] = useState({
        member_id: '',
        serial_number: '',
        license_plate: '',
        vehicle_type: 'motorcycle' as SyndicateVehicle['vehicle_type'],
        brand: '',
        model: '',
        year: '',
        color: ''
    });

    // Liste des membres (simulée)
    const [members] = useState([
        { id: '1', name: 'Ibrahima Ndiaye', member_id: 'MBR-2025-00001' },
        { id: '2', name: 'Fatou Sall', member_id: 'MBR-2025-00002' },
        { id: '3', name: 'Moussa Ba', member_id: 'MBR-2025-00003' }
    ]);

    useEffect(() => {
        loadVehicles();
    }, [bureauId]);

    /**
     * Charge la liste des véhicules
     */
    const loadVehicles = async () => {
        try {
            // Simuler le chargement depuis Supabase
            const mockVehicles: SyndicateVehicle[] = [
                {
                    id: '1',
                    member_id: '1',
                    member_name: 'Ibrahima Ndiaye',
                    serial_number: 'MT-2024-001234',
                    license_plate: 'DK-1234-AB',
                    vehicle_type: 'motorcycle',
                    brand: 'Yamaha',
                    model: 'XTZ 125',
                    year: 2023,
                    color: 'Rouge',
                    digital_badge_id: 'BDG-20250930-ABC12345',
                    qr_code_data: JSON.stringify({
                        vehicle_id: '1',
                        serial_number: 'MT-2024-001234',
                        owner: 'Ibrahima Ndiaye',
                        bureau: bureauId,
                        issued_date: '2025-09-30'
                    }),
                    status: 'active',
                    verified: true,
                    verified_at: '2025-09-25T14:00:00Z',
                    badge_generated_at: '2025-09-25T14:30:00Z',
                    created_at: '2025-09-25T10:00:00Z'
                },
                {
                    id: '2',
                    member_id: '2',
                    member_name: 'Fatou Sall',
                    serial_number: 'MT-2024-005678',
                    license_plate: 'DK-5678-CD',
                    vehicle_type: 'motorcycle',
                    brand: 'Honda',
                    model: 'CB 125',
                    year: 2024,
                    color: 'Bleu',
                    digital_badge_id: 'BDG-20250930-DEF67890',
                    qr_code_data: JSON.stringify({
                        vehicle_id: '2',
                        serial_number: 'MT-2024-005678',
                        owner: 'Fatou Sall',
                        bureau: bureauId,
                        issued_date: '2025-09-30'
                    }),
                    status: 'active',
                    verified: true,
                    verified_at: '2025-09-26T10:00:00Z',
                    badge_generated_at: '2025-09-26T10:30:00Z',
                    created_at: '2025-09-26T09:00:00Z'
                }
            ];

            setVehicles(mockVehicles);
        } catch (error) {
            console.error('Erreur chargement véhicules:', error);
            toast.error('Impossible de charger les véhicules');
        } finally {
            setLoading(false);
        }
    };

    /**
     * Ajoute un nouveau véhicule
     */
    const addVehicle = async () => {
        if (!formData.member_id || !formData.serial_number || !formData.license_plate) {
            toast.error('Veuillez remplir les champs obligatoires');
            return;
        }

        // Vérifier l'unicité du numéro de série
        if (vehicles.some(v => v.serial_number === formData.serial_number)) {
            toast.error('Ce numéro de série existe déjà');
            return;
        }

        try {
            const selectedMember = members.find(m => m.id === formData.member_id);
            const badgeId = generateBadgeId();

            const qrCodeData = JSON.stringify({
                vehicle_id: Date.now().toString(),
                serial_number: formData.serial_number,
                owner: selectedMember?.name,
                bureau: bureauId,
                issued_date: new Date().toISOString().split('T')[0]
            });

            const newVehicle: SyndicateVehicle = {
                id: Date.now().toString(),
                member_id: formData.member_id,
                member_name: selectedMember?.name || '',
                serial_number: formData.serial_number,
                license_plate: formData.license_plate,
                vehicle_type: formData.vehicle_type,
                brand: formData.brand || undefined,
                model: formData.model || undefined,
                year: formData.year ? parseInt(formData.year) : undefined,
                color: formData.color || undefined,
                digital_badge_id: badgeId,
                qr_code_data: qrCodeData,
                status: 'active',
                verified: false,
                badge_generated_at: new Date().toISOString(),
                created_at: new Date().toISOString()
            };

            setVehicles(prev => [...prev, newVehicle]);

            // Réinitialiser le formulaire
            setFormData({
                member_id: '',
                serial_number: '',
                license_plate: '',
                vehicle_type: 'motorcycle',
                brand: '',
                model: '',
                year: '',
                color: ''
            });

            setShowAddDialog(false);
            toast.success('Véhicule ajouté avec succès ! Badge numérique généré.');

        } catch (error) {
            console.error('Erreur ajout véhicule:', error);
            toast.error('Erreur lors de l\'ajout du véhicule');
        }
    };

    /**
     * Génère un ID de badge unique
     */
    const generateBadgeId = (): string => {
        const date = new Date().toISOString().split('T')[0].replace(/-/g, '');
        const random = Math.random().toString(36).substring(2, 10).toUpperCase();
        return `BDG-${date}-${random}`;
    };

    /**
     * Vérifie un véhicule
     */
    const verifyVehicle = (vehicleId: string) => {
        setVehicles(prev => prev.map(v =>
            v.id === vehicleId
                ? {
                    ...v,
                    verified: true,
                    verified_at: new Date().toISOString()
                }
                : v
        ));
        toast.success('Véhicule vérifié avec succès');
    };

    /**
     * Suspend un véhicule
     */
    const suspendVehicle = (vehicleId: string) => {
        setVehicles(prev => prev.map(v =>
            v.id === vehicleId ? { ...v, status: 'suspended' } : v
        ));
        toast.success('Véhicule suspendu');
    };

    /**
     * Génère un nouveau badge
     */
    const regenerateBadge = (vehicleId: string) => {
        const newBadgeId = generateBadgeId();

        setVehicles(prev => prev.map(v =>
            v.id === vehicleId
                ? {
                    ...v,
                    digital_badge_id: newBadgeId,
                    badge_generated_at: new Date().toISOString()
                }
                : v
        ));

        toast.success('Nouveau badge généré avec succès');
    };

    /**
     * Télécharge le badge
     */
    const downloadBadge = (vehicle: SyndicateVehicle) => {
        // Simuler le téléchargement du badge
        const badgeData = {
            badge_id: vehicle.digital_badge_id,
            vehicle_info: {
                serial_number: vehicle.serial_number,
                license_plate: vehicle.license_plate,
                owner: vehicle.member_name,
                type: vehicle.vehicle_type
            },
            qr_code: vehicle.qr_code_data,
            bureau: bureauId,
            generated_at: vehicle.badge_generated_at
        };

        console.log('📱 Badge téléchargé:', badgeData);
        toast.success('Badge téléchargé avec succès');
    };

    /**
     * Imprime le badge
     */
    const printBadge = (vehicle: SyndicateVehicle) => {
        // Simuler l'impression du badge
        console.log('🖨️ Badge envoyé à l\'imprimante:', vehicle.digital_badge_id);
        toast.success('Badge envoyé à l\'imprimante');
    };

    /**
     * Filtre les véhicules
     */
    const filteredVehicles = vehicles.filter(vehicle => {
        const matchesSearch =
            vehicle.serial_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
            vehicle.license_plate.toLowerCase().includes(searchTerm.toLowerCase()) ||
            vehicle.member_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            vehicle.brand?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            vehicle.model?.toLowerCase().includes(searchTerm.toLowerCase());

        const matchesStatus = statusFilter === 'all' || vehicle.status === statusFilter;
        const matchesType = typeFilter === 'all' || vehicle.vehicle_type === typeFilter;

        return matchesSearch && matchesStatus && matchesType;
    });

    /**
     * Obtient la couleur du statut
     */
    const getStatusColor = (status: string) => {
        switch (status) {
            case 'active': return 'bg-green-100 text-green-800';
            case 'suspended': return 'bg-red-100 text-red-800';
            case 'maintenance': return 'bg-yellow-100 text-yellow-800';
            case 'retired': return 'bg-gray-100 text-gray-800';
            default: return 'bg-gray-100 text-gray-800';
        }
    };

    /**
     * Obtient le libellé du statut
     */
    const getStatusLabel = (status: string) => {
        switch (status) {
            case 'active': return 'Actif';
            case 'suspended': return 'Suspendu';
            case 'maintenance': return 'Maintenance';
            case 'retired': return 'Retiré';
            default: return status;
        }
    };

    /**
     * Obtient le libellé du type
     */
    const getTypeLabel = (type: string) => {
        switch (type) {
            case 'motorcycle': return 'Moto';
            case 'tricycle': return 'Tricycle';
            case 'car': return 'Voiture';
            default: return type;
        }
    };

    /**
     * Formate la date
     */
    const formatDate = (dateString?: string) => {
        if (!dateString) return 'N/A';
        return new Date(dateString).toLocaleDateString('fr-FR', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric'
        });
    };

    if (loading) {
        return (
            <Card>
                <CardContent className="p-8 text-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
                    <p className="text-gray-600">Chargement des véhicules...</p>
                </CardContent>
            </Card>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header avec statistiques */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <Card>
                    <CardContent className="p-4 text-center">
                        <Car className="w-8 h-8 mx-auto mb-2 text-blue-600" />
                        <div className="text-2xl font-bold text-blue-600">{vehicles.length}</div>
                        <div className="text-sm text-gray-600">Total Véhicules</div>
                    </CardContent>
                </Card>

                <Card>
                    <CardContent className="p-4 text-center">
                        <CheckCircle className="w-8 h-8 mx-auto mb-2 text-green-600" />
                        <div className="text-2xl font-bold text-green-600">
                            {vehicles.filter(v => v.verified).length}
                        </div>
                        <div className="text-sm text-gray-600">Vérifiés</div>
                    </CardContent>
                </Card>

                <Card>
                    <CardContent className="p-4 text-center">
                        <QrCode className="w-8 h-8 mx-auto mb-2 text-purple-600" />
                        <div className="text-2xl font-bold text-purple-600">
                            {vehicles.filter(v => v.digital_badge_id).length}
                        </div>
                        <div className="text-sm text-gray-600">Badges Générés</div>
                    </CardContent>
                </Card>

                <Card>
                    <CardContent className="p-4 text-center">
                        <AlertTriangle className="w-8 h-8 mx-auto mb-2 text-orange-600" />
                        <div className="text-2xl font-bold text-orange-600">
                            {vehicles.filter(v => v.status === 'maintenance').length}
                        </div>
                        <div className="text-sm text-gray-600">En Maintenance</div>
                    </CardContent>
                </Card>
            </div>

            {/* Actions et filtres */}
            <Card>
                <CardContent className="p-6">
                    <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
                        <div className="flex gap-4 items-center flex-1">
                            <div className="relative flex-1 max-w-md">
                                <Search className="w-4 h-4 absolute left-3 top-3 text-gray-400" />
                                <Input
                                    placeholder="Rechercher un véhicule..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    className="pl-10"
                                />
                            </div>

                            <Select value={statusFilter} onValueChange={setStatusFilter}>
                                <SelectTrigger className="w-40">
                                    <SelectValue placeholder="Statut" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">Tous les statuts</SelectItem>
                                    <SelectItem value="active">Actifs</SelectItem>
                                    <SelectItem value="suspended">Suspendus</SelectItem>
                                    <SelectItem value="maintenance">Maintenance</SelectItem>
                                </SelectContent>
                            </Select>

                            <Select value={typeFilter} onValueChange={setTypeFilter}>
                                <SelectTrigger className="w-40">
                                    <SelectValue placeholder="Type" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">Tous les types</SelectItem>
                                    <SelectItem value="motorcycle">Motos</SelectItem>
                                    <SelectItem value="tricycle">Tricycles</SelectItem>
                                    <SelectItem value="car">Voitures</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
                            <DialogTrigger asChild>
                                <Button className="bg-blue-600 hover:bg-blue-700">
                                    <Plus className="w-4 h-4 mr-2" />
                                    Ajouter un Véhicule
                                </Button>
                            </DialogTrigger>
                            <DialogContent className="max-w-md">
                                <DialogHeader>
                                    <DialogTitle>Nouveau Véhicule</DialogTitle>
                                </DialogHeader>
                                <div className="space-y-4">
                                    <div>
                                        <Label htmlFor="member_id">Propriétaire *</Label>
                                        <Select
                                            value={formData.member_id}
                                            onValueChange={(value) => setFormData(prev => ({ ...prev, member_id: value }))}
                                        >
                                            <SelectTrigger>
                                                <SelectValue placeholder="Sélectionner un membre" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {members.map(member => (
                                                    <SelectItem key={member.id} value={member.id}>
                                                        {member.name} ({member.member_id})
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>

                                    <div>
                                        <Label htmlFor="serial_number">Numéro de Série *</Label>
                                        <Input
                                            id="serial_number"
                                            value={formData.serial_number}
                                            onChange={(e) => setFormData(prev => ({ ...prev, serial_number: e.target.value }))}
                                            placeholder="MT-2024-001234"
                                        />
                                    </div>

                                    <div>
                                        <Label htmlFor="license_plate">Plaque d'Immatriculation *</Label>
                                        <Input
                                            id="license_plate"
                                            value={formData.license_plate}
                                            onChange={(e) => setFormData(prev => ({ ...prev, license_plate: e.target.value }))}
                                            placeholder="DK-1234-AB"
                                        />
                                    </div>

                                    <div>
                                        <Label htmlFor="vehicle_type">Type de Véhicule *</Label>
                                        <Select
                                            value={formData.vehicle_type}
                                            onValueChange={(value: unknown) => setFormData(prev => ({ ...prev, vehicle_type: value }))}
                                        >
                                            <SelectTrigger>
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="motorcycle">Moto</SelectItem>
                                                <SelectItem value="tricycle">Tricycle</SelectItem>
                                                <SelectItem value="car">Voiture</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>

                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <Label htmlFor="brand">Marque</Label>
                                            <Input
                                                id="brand"
                                                value={formData.brand}
                                                onChange={(e) => setFormData(prev => ({ ...prev, brand: e.target.value }))}
                                                placeholder="Yamaha"
                                            />
                                        </div>
                                        <div>
                                            <Label htmlFor="model">Modèle</Label>
                                            <Input
                                                id="model"
                                                value={formData.model}
                                                onChange={(e) => setFormData(prev => ({ ...prev, model: e.target.value }))}
                                                placeholder="XTZ 125"
                                            />
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <Label htmlFor="year">Année</Label>
                                            <Input
                                                id="year"
                                                type="number"
                                                value={formData.year}
                                                onChange={(e) => setFormData(prev => ({ ...prev, year: e.target.value }))}
                                                placeholder="2024"
                                            />
                                        </div>
                                        <div>
                                            <Label htmlFor="color">Couleur</Label>
                                            <Input
                                                id="color"
                                                value={formData.color}
                                                onChange={(e) => setFormData(prev => ({ ...prev, color: e.target.value }))}
                                                placeholder="Rouge"
                                            />
                                        </div>
                                    </div>

                                    <div className="flex gap-2 pt-4">
                                        <Button onClick={addVehicle} className="flex-1">
                                            Ajouter le Véhicule
                                        </Button>
                                        <Button
                                            variant="outline"
                                            onClick={() => setShowAddDialog(false)}
                                            className="flex-1"
                                        >
                                            Annuler
                                        </Button>
                                    </div>
                                </div>
                            </DialogContent>
                        </Dialog>
                    </div>
                </CardContent>
            </Card>

            {/* Liste des véhicules */}
            <Card>
                <CardHeader>
                    <CardTitle>Liste des Véhicules ({filteredVehicles.length})</CardTitle>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Numéro de Série</TableHead>
                                <TableHead>Plaque</TableHead>
                                <TableHead>Propriétaire</TableHead>
                                <TableHead>Véhicule</TableHead>
                                <TableHead>Badge</TableHead>
                                <TableHead>Statut</TableHead>
                                <TableHead>Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {filteredVehicles.map((vehicle) => (
                                <TableRow key={vehicle.id}>
                                    <TableCell className="font-medium">{vehicle.serial_number}</TableCell>
                                    <TableCell>{vehicle.license_plate}</TableCell>
                                    <TableCell>{vehicle.member_name}</TableCell>
                                    <TableCell>
                                        <div>
                                            <p className="font-medium">{getTypeLabel(vehicle.vehicle_type)}</p>
                                            {vehicle.brand && vehicle.model && (
                                                <p className="text-sm text-gray-600">
                                                    {vehicle.brand} {vehicle.model} {vehicle.year}
                                                </p>
                                            )}
                                            {vehicle.color && (
                                                <p className="text-xs text-gray-500">{vehicle.color}</p>
                                            )}
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        <div className="flex items-center gap-2">
                                            <QrCode className="w-4 h-4 text-purple-600" />
                                            <div className="text-sm">
                                                <p className="font-mono">{vehicle.digital_badge_id}</p>
                                                <p className="text-xs text-gray-600">
                                                    {formatDate(vehicle.badge_generated_at)}
                                                </p>
                                            </div>
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        <div className="space-y-1">
                                            <Badge className={getStatusColor(vehicle.status)}>
                                                {getStatusLabel(vehicle.status)}
                                            </Badge>
                                            {vehicle.verified && (
                                                <div className="flex items-center gap-1">
                                                    <CheckCircle className="w-3 h-3 text-green-600" />
                                                    <span className="text-xs text-green-600">Vérifié</span>
                                                </div>
                                            )}
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        <div className="flex gap-1">
                                            <Button
                                                size="sm"
                                                variant="outline"
                                                onClick={() => downloadBadge(vehicle)}
                                            >
                                                <Download className="w-4 h-4" />
                                            </Button>
                                            <Button
                                                size="sm"
                                                variant="outline"
                                                onClick={() => printBadge(vehicle)}
                                            >
                                                <Printer className="w-4 h-4" />
                                            </Button>
                                            {!vehicle.verified && (
                                                <Button
                                                    size="sm"
                                                    onClick={() => verifyVehicle(vehicle.id)}
                                                >
                                                    <CheckCircle className="w-4 h-4" />
                                                </Button>
                                            )}
                                            {vehicle.status === 'active' && (
                                                <Button
                                                    size="sm"
                                                    variant="destructive"
                                                    onClick={() => suspendVehicle(vehicle.id)}
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

            {/* Dialog pour afficher le badge */}
            <Dialog open={showBadgeDialog} onOpenChange={setShowBadgeDialog}>
                <DialogContent className="max-w-md">
                    <DialogHeader>
                        <DialogTitle>Badge Numérique</DialogTitle>
                    </DialogHeader>
                    {selectedVehicle && (
                        <div className="space-y-4">
                            <div className="text-center p-6 border-2 border-dashed border-gray-300 rounded-lg">
                                <QrCode className="w-24 h-24 mx-auto mb-4 text-gray-600" />
                                <p className="text-sm text-gray-600 mb-2">QR Code du Badge</p>
                                <p className="font-mono text-xs bg-gray-100 p-2 rounded">
                                    {selectedVehicle.digital_badge_id}
                                </p>
                            </div>

                            <div className="space-y-2 text-sm">
                                <div className="flex justify-between">
                                    <span className="text-gray-600">Véhicule:</span>
                                    <span className="font-medium">{selectedVehicle.serial_number}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-gray-600">Plaque:</span>
                                    <span className="font-medium">{selectedVehicle.license_plate}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-gray-600">Propriétaire:</span>
                                    <span className="font-medium">{selectedVehicle.member_name}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-gray-600">Généré le:</span>
                                    <span className="font-medium">{formatDate(selectedVehicle.badge_generated_at)}</span>
                                </div>
                            </div>

                            <div className="flex gap-2">
                                <Button onClick={() => downloadBadge(selectedVehicle)} className="flex-1">
                                    <Download className="w-4 h-4 mr-2" />
                                    Télécharger
                                </Button>
                                <Button onClick={() => printBadge(selectedVehicle)} variant="outline" className="flex-1">
                                    <Printer className="w-4 h-4 mr-2" />
                                    Imprimer
                                </Button>
                            </div>
                        </div>
                    )}
                </DialogContent>
            </Dialog>
        </div>
    );
}
