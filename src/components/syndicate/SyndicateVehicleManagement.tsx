// @ts-nocheck
/**
 * GESTION DES VÉHICULES ET BADGES NUMÉRIQUES ULTRA PROFESSIONNELLE
 * Interface complète pour l'enregistrement et gestion des véhicules avec QR codes
 * 224Solutions - Bureau Syndicat System
 */

import { useState, useEffect } from 'react';
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import BadgeGeneratorDialog from './BadgeGeneratorDialog';
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
    Share2,
    IdCard
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
    const [showProfessionalBadgeDialog, setShowProfessionalBadgeDialog] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState<string>('all');
    const [typeFilter, setTypeFilter] = useState<string>('all');

    // Formulaire d'ajout de véhicule
    const [formData, setFormData] = useState({
        member_id: '',
        owner_name: '',
        serial_number: '',
        license_plate: '',
        vehicle_type: 'motorcycle' as SyndicateVehicle['vehicle_type'],
        brand: '',
        model: '',
        year: '',
        color: ''
    });

    // États pour les fichiers uploadés
    const [uploadedFiles, setUploadedFiles] = useState({
        registration_document: null as File | null,
        insurance_document: null as File | null,
        technical_control: null as File | null,
        vehicle_photo: null as File | null
    });

    // Liste des membres (chargée depuis Supabase)
    const [members, setMembers] = useState<{ id: string; name: string; member_id: string }[]>([]);

    useEffect(() => {
        loadVehicles();
        loadMembers();
    }, [bureauId]);

    /**
     * Charge la liste des membres
     */
    /**
     * Charge la liste des membres
     */
    const loadMembers = async () => {
        try {
            const { data, error } = await supabase
                .from('syndicate_workers')
                .select('id, nom')
                .eq('bureau_id', bureauId)
                .eq('is_active', true);

            if (error) throw error;

            setMembers(data?.map(m => ({
                id: m.id,
                name: m.nom,
                member_id: m.id
            })) || []);
        } catch (error) {
            console.error('Erreur chargement membres:', error);
        }
    };

    /**
     * Charge la liste des véhicules depuis Supabase
     */
    /**
     * Charge la liste des véhicules depuis Supabase
     */
    const loadVehicles = async () => {
        try {
            setLoading(true);
            
            const { data, error } = await supabase
                .from('vehicles')
                .select('*')
                .eq('bureau_id', bureauId)
                .order('created_at', { ascending: false });

            if (error) throw error;

            // Récupérer les noms des membres
            const memberIds = [...new Set(data?.map(v => v.owner_member_id).filter(Boolean))];
            let memberNames: Record<string, string> = {};
            
            if (memberIds.length > 0) {
                const { data: workersData } = await supabase
                    .from('syndicate_workers')
                    .select('id, nom')
                    .in('id', memberIds);
                
                memberNames = workersData?.reduce((acc, w) => {
                    acc[w.id] = w.nom;
                    return acc;
                }, {} as Record<string, string>) || {};
            }

            const formattedVehicles: SyndicateVehicle[] = (data || []).map(v => ({
                id: v.id,
                member_id: v.owner_member_id || '',
                member_name: memberNames[v.owner_member_id] || 'N/A',
                serial_number: v.serial_number || '',
                license_plate: v.license_plate || v.serial_number || '',
                vehicle_type: (v.type?.toLowerCase() || 'motorcycle') as SyndicateVehicle['vehicle_type'],
                brand: v.brand || undefined,
                model: v.model || undefined,
                year: v.year || undefined,
                color: v.color || undefined,
                registration_document_url: v.registration_document_url || undefined,
                insurance_document_url: v.insurance_document_url || undefined,
                technical_control_url: v.technical_control_url || undefined,
                digital_badge_id: v.digital_badge_id || `BDG-${v.id?.substring(0, 8)}`,
                qr_code_data: v.qr_code_data || JSON.stringify({
                    vehicle_id: v.id,
                    serial_number: v.serial_number,
                    owner: memberNames[v.owner_member_id] || 'N/A',
                    bureau: bureauId,
                    issued_date: v.created_at
                }),
                status: (v.status || 'active') as SyndicateVehicle['status'],
                verified: v.verified || false,
                verified_at: v.verified_at,
                badge_generated_at: v.badge_generated_at || v.created_at,
                created_at: v.created_at
            }));

            setVehicles(formattedVehicles);
        } catch (error) {
            console.error('Erreur chargement véhicules:', error);
            toast.error('Impossible de charger les véhicules');
        } finally {
            setLoading(false);
        }
    };

    /**
     * Ajoute un nouveau véhicule dans Supabase
     */
    const addVehicle = async () => {
        console.log('[VehicleAdd] Début ajout véhicule:', formData);
        
        if (!formData.serial_number || !formData.license_plate) {
            toast.error('Veuillez remplir le numéro de série et la plaque d\'immatriculation');
            return;
        }

        // Vérifier qu'un membre existe ou qu'un nouveau nom est fourni
        if (!formData.member_id && !formData.owner_name) {
            toast.error('Veuillez sélectionner un membre existant ou saisir le nom d\'un nouveau propriétaire');
            return;
        }

        try {
            // Chercher ou créer le membre
            let memberId = formData.member_id;
            let memberName = formData.owner_name;
            
            if (!memberId && formData.owner_name) {
                console.log('[VehicleAdd] Création nouveau membre:', formData.owner_name);
                
                // Créer un nouveau membre dans syndicate_workers
                const { data: newMember, error: memberError } = await supabase
                    .from('syndicate_workers')
                    .insert({
                        bureau_id: bureauId,
                        nom: formData.owner_name,
                        email: `temp_${Date.now()}@bureau.local`,
                        telephone: '',
                        access_token: `temp_${Date.now()}`,
                        interface_url: '',
                        access_level: 'member',
                        is_active: true
                    })
                    .select()
                    .single();
                
                if (memberError) {
                    console.error('[VehicleAdd] Erreur création membre:', memberError);
                    throw new Error(`Erreur création membre: ${memberError.message}`);
                }
                
                memberId = newMember.id;
                memberName = newMember.nom;
                console.log('[VehicleAdd] Membre créé:', memberId);
            } else if (memberId) {
                // Récupérer le nom du membre existant
                const member = members.find(m => m.id === memberId);
                memberName = member?.name || formData.owner_name;
                console.log('[VehicleAdd] Membre existant:', memberId, memberName);
            }
            
            if (!memberId) {
                console.error('[VehicleAdd] Aucun membre valide');
                toast.error('Erreur: Aucun membre valide');
                return;
            }

            // Générer un badge ID unique
            const badgeId = generateBadgeId();
            const currentDate = new Date().toISOString();
            
            // Générer les données QR code
            const qrCodeData = JSON.stringify({
                vehicle_id: `TMP-${Date.now()}`,
                serial_number: formData.serial_number,
                license_plate: formData.license_plate,
                owner: memberName,
                bureau: bureauId,
                type: formData.vehicle_type,
                issued_date: currentDate
            });

            console.log('[VehicleAdd] Insertion véhicule dans Supabase:', {
                bureau_id: bureauId,
                owner_member_id: memberId,
                serial_number: formData.serial_number,
                license_plate: formData.license_plate,
                digital_badge_id: badgeId
            });

            // Insérer le véhicule dans vehicles
            const { data, error } = await supabase
                .from('vehicles')
                .insert({
                    bureau_id: bureauId,
                    owner_member_id: memberId,
                    serial_number: formData.serial_number,
                    license_plate: formData.license_plate,
                    type: formData.vehicle_type,
                    brand: formData.brand || null,
                    model: formData.model || null,
                    year: formData.year ? parseInt(formData.year) : null,
                    color: formData.color || null,
                    digital_badge_id: badgeId,
                    qr_code_data: qrCodeData,
                    badge_generated_at: currentDate,
                    status: 'active',
                    verified: false
                })
                .select()
                .single();

            if (error) {
                console.error('[VehicleAdd] Erreur insertion Supabase:', error);
                throw new Error(`Erreur BD: ${error.message}`);
            }
            
            console.log('[VehicleAdd] Véhicule créé avec succès:', data);

            // Réinitialiser le formulaire
            setFormData({
                member_id: '',
                owner_name: '',
                serial_number: '',
                license_plate: '',
                vehicle_type: 'motorcycle',
                brand: '',
                model: '',
                year: '',
                color: ''
            });

            // Réinitialiser les fichiers
            setUploadedFiles({
                registration_document: null,
                insurance_document: null,
                technical_control: null,
                vehicle_photo: null
            });

            // Recharger la liste
            await loadVehicles();

            setShowAddDialog(false);
            
            // Message de succès avec détails des documents uploadés
            const uploadedDocs = [];
            if (uploadedFiles.registration_document) uploadedDocs.push('Immatriculation');
            if (uploadedFiles.insurance_document) uploadedDocs.push('Assurance');
            if (uploadedFiles.technical_control) uploadedDocs.push('Contrôle technique');
            if (uploadedFiles.vehicle_photo) uploadedDocs.push('Photo');
            
            if (uploadedDocs.length > 0) {
                toast.success(`Véhicule ajouté avec succès ! Documents: ${uploadedDocs.join(', ')}`);
            } else {
                toast.success('Véhicule ajouté avec succès ! Badge numérique généré.');
            }

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
     * Vérifie un véhicule dans Supabase
     */
    /**
     * Vérifie un véhicule dans Supabase
     */
    const verifyVehicle = async (vehicleId: string) => {
        try {
            const { error } = await supabase
                .from('vehicles')
                .update({ 
                    verified: true,
                    verified_at: new Date().toISOString(),
                    status: 'active' 
                })
                .eq('id', vehicleId);

            if (error) throw error;

            await loadVehicles();
            toast.success('Véhicule vérifié avec succès');
        } catch (error) {
            console.error('Erreur vérification véhicule:', error);
            toast.error('Erreur lors de la vérification');
        }
    };

    /**
     * Suspend un véhicule dans Supabase
     */
    /**
     * Suspend un véhicule dans Supabase
     */
    const suspendVehicle = async (vehicleId: string) => {
        try {
            const { error } = await supabase
                .from('vehicles')
                .update({ status: 'suspended' })
                .eq('id', vehicleId);

            if (error) throw error;

            await loadVehicles();
            toast.success('Véhicule suspendu');
        } catch (error) {
            console.error('Erreur suspension véhicule:', error);
            toast.error('Erreur lors de la suspension');
        }
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
     * Ouvre le dialog de génération de badge professionnel
     */
    const openProfessionalBadge = (vehicle: SyndicateVehicle) => {
        setSelectedVehicle(vehicle);
        setShowProfessionalBadgeDialog(true);
    };

    /**
     * Télécharge le badge (legacy - ouvre maintenant le badge professionnel)
     */
    const downloadBadge = (vehicle: SyndicateVehicle) => {
        openProfessionalBadge(vehicle);
    };

    /**
     * Imprime le badge (legacy - ouvre maintenant le badge professionnel)
     */
    const printBadge = (vehicle: SyndicateVehicle) => {
        openProfessionalBadge(vehicle);
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
                            <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
                                <DialogHeader>
                                    <DialogTitle>Enregistrement de Véhicule</DialogTitle>
                                </DialogHeader>
                                <div className="space-y-6 pb-4">
                                    <div>
                                        <Label htmlFor="member_select">Propriétaire *</Label>
                                        <Select
                                            value={formData.member_id || 'new'}
                                            onValueChange={(value) => {
                                                if (value === 'new') {
                                                    setFormData(prev => ({ ...prev, member_id: '', owner_name: '' }));
                                                } else {
                                                    const member = members.find(m => m.id === value);
                                                    setFormData(prev => ({ 
                                                        ...prev, 
                                                        member_id: value,
                                                        owner_name: member?.name || ''
                                                    }));
                                                }
                                            }}
                                        >
                                            <SelectTrigger>
                                                <SelectValue placeholder="Sélectionner un membre existant ou créer nouveau" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="new">➕ Nouveau propriétaire</SelectItem>
                                                {members.map(member => (
                                                    <SelectItem key={member.id} value={member.id}>
                                                        {member.name}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>

                                    {(!formData.member_id || formData.member_id === '') && (
                                        <div>
                                            <Label htmlFor="owner_name">Nom du Nouveau Propriétaire *</Label>
                                            <Input
                                                id="owner_name"
                                                value={formData.owner_name}
                                                onChange={(e) => setFormData(prev => ({ ...prev, owner_name: e.target.value }))}
                                                placeholder="Nom complet du propriétaire"
                                            />
                                        </div>
                                    )}

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

                                    {/* Section de téléchargement de documents et photos */}
                                    <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 mt-6 bg-gray-50">
                                        <h3 className="text-base font-semibold mb-4 flex items-center gap-2 text-blue-600">
                                            <Upload className="w-5 h-5" />
                                            Téléchargement de Documents et Photos
                                        </h3>
                                        <p className="text-sm text-gray-600 mb-4">Formats acceptés: PDF, JPG, PNG. Taille max: 5MB par fichier</p>
                                        
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            {/* Document d'immatriculation */}
                                            <div className="bg-white p-4 rounded-lg border border-gray-200 hover:border-blue-400 transition-colors">
                                                <Label htmlFor="registration_document" className="flex items-center gap-2 text-sm font-semibold mb-2 text-gray-700">
                                                    <FileText className="w-4 h-4 text-blue-600" />
                                                    Document d'Immatriculation
                                                </Label>
                                                <Input
                                                    id="registration_document"
                                                    type="file"
                                                    accept=".pdf,.jpg,.jpeg,.png"
                                                    onChange={(e) => {
                                                        const file = e.target.files?.[0];
                                                        if (file) {
                                                            if (file.size > 5 * 1024 * 1024) {
                                                                toast.error('Le fichier ne doit pas dépasser 5MB');
                                                                e.target.value = '';
                                                                return;
                                                            }
                                                            setUploadedFiles(prev => ({ ...prev, registration_document: file }));
                                                            toast.success('Document d\'immatriculation ajouté');
                                                        }
                                                    }}
                                                    className="cursor-pointer file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                                                />
                                                {uploadedFiles.registration_document && (
                                                    <div className="mt-2 p-2 bg-green-50 rounded-md">
                                                        <p className="text-xs text-green-700 flex items-center gap-1 font-medium">
                                                            <CheckCircle className="w-4 h-4" />
                                                            {uploadedFiles.registration_document.name} ({(uploadedFiles.registration_document.size / 1024).toFixed(2)} KB)
                                                        </p>
                                                    </div>
                                                )}
                                            </div>

                                            {/* Assurance */}
                                            <div className="bg-white p-4 rounded-lg border border-gray-200 hover:border-blue-400 transition-colors">
                                                <Label htmlFor="insurance_document" className="flex items-center gap-2 text-sm font-semibold mb-2 text-gray-700">
                                                    <Shield className="w-4 h-4 text-blue-600" />
                                                    Document d'Assurance
                                                </Label>
                                                <Input
                                                    id="insurance_document"
                                                    type="file"
                                                    accept=".pdf,.jpg,.jpeg,.png"
                                                    onChange={(e) => {
                                                        const file = e.target.files?.[0];
                                                        if (file) {
                                                            if (file.size > 5 * 1024 * 1024) {
                                                                toast.error('Le fichier ne doit pas dépasser 5MB');
                                                                e.target.value = '';
                                                                return;
                                                            }
                                                            setUploadedFiles(prev => ({ ...prev, insurance_document: file }));
                                                            toast.success('Document d\'assurance ajouté');
                                                        }
                                                    }}
                                                    className="cursor-pointer file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                                                />
                                                {uploadedFiles.insurance_document && (
                                                    <div className="mt-2 p-2 bg-green-50 rounded-md">
                                                        <p className="text-xs text-green-700 flex items-center gap-1 font-medium">
                                                            <CheckCircle className="w-4 h-4" />
                                                            {uploadedFiles.insurance_document.name} ({(uploadedFiles.insurance_document.size / 1024).toFixed(2)} KB)
                                                        </p>
                                                    </div>
                                                )}
                                            </div>

                                            {/* Contrôle technique */}
                                            <div className="bg-white p-4 rounded-lg border border-gray-200 hover:border-blue-400 transition-colors">
                                                <Label htmlFor="technical_control" className="flex items-center gap-2 text-sm font-semibold mb-2 text-gray-700">
                                                    <Settings className="w-4 h-4 text-blue-600" />
                                                    Contrôle Technique
                                                </Label>
                                                <Input
                                                    id="technical_control"
                                                    type="file"
                                                    accept=".pdf,.jpg,.jpeg,.png"
                                                    onChange={(e) => {
                                                        const file = e.target.files?.[0];
                                                        if (file) {
                                                            if (file.size > 5 * 1024 * 1024) {
                                                                toast.error('Le fichier ne doit pas dépasser 5MB');
                                                                e.target.value = '';
                                                                return;
                                                            }
                                                            setUploadedFiles(prev => ({ ...prev, technical_control: file }));
                                                            toast.success('Document de contrôle technique ajouté');
                                                        }
                                                    }}
                                                    className="cursor-pointer file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                                                />
                                                {uploadedFiles.technical_control && (
                                                    <div className="mt-2 p-2 bg-green-50 rounded-md">
                                                        <p className="text-xs text-green-700 flex items-center gap-1 font-medium">
                                                            <CheckCircle className="w-4 h-4" />
                                                            {uploadedFiles.technical_control.name} ({(uploadedFiles.technical_control.size / 1024).toFixed(2)} KB)
                                                        </p>
                                                    </div>
                                                )}
                                            </div>

                                            {/* Photo du véhicule */}
                                            <div className="bg-white p-4 rounded-lg border border-gray-200 hover:border-blue-400 transition-colors">
                                                <Label htmlFor="vehicle_photo" className="flex items-center gap-2 text-sm font-semibold mb-2 text-gray-700">
                                                    <Car className="w-4 h-4 text-blue-600" />
                                                    Photo du Véhicule
                                                </Label>
                                                <Input
                                                    id="vehicle_photo"
                                                    type="file"
                                                    accept=".jpg,.jpeg,.png,.webp"
                                                    onChange={(e) => {
                                                        const file = e.target.files?.[0];
                                                        if (file) {
                                                            if (file.size > 5 * 1024 * 1024) {
                                                                toast.error('La photo ne doit pas dépasser 5MB');
                                                                e.target.value = '';
                                                                return;
                                                            }
                                                            setUploadedFiles(prev => ({ ...prev, vehicle_photo: file }));
                                                            toast.success('Photo du véhicule ajoutée');
                                                        }
                                                    }}
                                                    className="cursor-pointer file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                                                />
                                                {uploadedFiles.vehicle_photo && (
                                                    <div className="mt-2 p-2 bg-green-50 rounded-md">
                                                        <p className="text-xs text-green-700 flex items-center gap-1 font-medium">
                                                            <CheckCircle className="w-4 h-4" />
                                                            {uploadedFiles.vehicle_photo.name} ({(uploadedFiles.vehicle_photo.size / 1024).toFixed(2)} KB)
                                                        </p>
                                                    </div>
                                                )}
                                            </div>
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
                                                onClick={() => openProfessionalBadge(vehicle)}
                                                title="Générer badge professionnel"
                                            >
                                                <IdCard className="w-4 h-4" />
                                            </Button>
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

            {/* Dialog de génération de badge professionnel */}
            {selectedVehicle && (
                <BadgeGeneratorDialog
                    open={showProfessionalBadgeDialog}
                    onOpenChange={setShowProfessionalBadgeDialog}
                    vehicleData={{
                        id: selectedVehicle.id,
                        member_name: selectedVehicle.member_name,
                        member_id: selectedVehicle.member_id,
                        license_plate: selectedVehicle.license_plate,
                        vehicle_type: selectedVehicle.vehicle_type,
                        badge_generated_at: selectedVehicle.badge_generated_at,
                        digital_badge_id: selectedVehicle.digital_badge_id
                    }}
                    bureauName="224SOLUTIONS TAXI-MOTO"
                />
            )}
        </div>
    );
}
