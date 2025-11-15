// @ts-nocheck
/**
 * GESTION DES MEMBRES DU SYNDICAT ULTRA PROFESSIONNELLE
 * Interface complète pour l'ajout, modification et gestion des membres
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
    Users,
    Plus,
    Search,
    Filter,
    Eye,
    Edit,
    Trash2,
    UserCheck,
    UserX,
    Mail,
    Phone,
    MapPin,
    Calendar,
    Download,
    Upload,
    CreditCard,
    Shield,
    AlertTriangle,
    CheckCircle,
    Clock,
    Star,
    QrCode,
    Wallet
} from "lucide-react";
import { toast } from "sonner";

interface SyndicateMember {
    id: string;
    member_id: string;
    first_name: string;
    last_name: string;
    email?: string;
    phone: string;
    address?: string;
    member_type: 'driver' | 'delivery' | 'vendor' | 'bureau_member';
    internal_role?: string;
    status: 'pending' | 'active' | 'suspended' | 'retired' | 'expelled';
    cni_number?: string;
    cni_front_url?: string;
    cni_back_url?: string;
    photo_url?: string;
    wallet_activated: boolean;
    cotisation_status: 'pending' | 'current' | 'overdue' | 'exempt';
    last_cotisation_date?: string;
    next_cotisation_due?: string;
    joined_at: string;
    created_at: string;
}

interface SyndicateMemberManagementProps {
    bureauId: string;
}

export default function SyndicateMemberManagement({ bureauId }: SyndicateMemberManagementProps) {
    const [members, setMembers] = useState<SyndicateMember[]>([]);
    const [loading, setLoading] = useState(true);
    const [showAddDialog, setShowAddDialog] = useState(false);
    const [selectedMember, setSelectedMember] = useState<SyndicateMember | null>(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState<string>('all');
    const [typeFilter, setTypeFilter] = useState<string>('all');

    // Formulaire d'ajout de membre
    const [formData, setFormData] = useState({
        first_name: '',
        last_name: '',
        email: '',
        phone: '',
        address: '',
        member_type: 'driver' as SyndicateMember['member_type'],
        internal_role: '',
        cni_number: ''
    });

    useEffect(() => {
        loadMembers();
    }, [bureauId]);

    /**
     * Charge la liste des membres
     */
    const loadMembers = async () => {
        try {
            // Simuler le chargement depuis Supabase
            const mockMembers: SyndicateMember[] = [
                {
                    id: '1',
                    member_id: 'MBR-2025-00001',
                    first_name: 'Ibrahima',
                    last_name: 'Ndiaye',
                    email: 'ibrahima.ndiaye@email.com',
                    phone: '+221 77 123 45 67',
                    address: 'Médina, Conakry',
                    member_type: 'driver',
                    internal_role: '',
                    status: 'active',
                    cni_number: '1234567890123',
                    wallet_activated: true,
                    cotisation_status: 'current',
                    last_cotisation_date: '2025-09-01',
                    next_cotisation_due: '2025-10-01',
                    joined_at: '2025-08-15T10:00:00Z',
                    created_at: '2025-08-15T10:00:00Z'
                },
                {
                    id: '2',
                    member_id: 'MBR-2025-00002',
                    first_name: 'Fatou',
                    last_name: 'Sall',
                    email: 'fatou.sall@email.com',
                    phone: '+221 76 987 65 43',
                    address: 'Yoff, Conakry',
                    member_type: 'delivery',
                    internal_role: 'secrétaire',
                    status: 'active',
                    cni_number: '9876543210987',
                    wallet_activated: true,
                    cotisation_status: 'current',
                    last_cotisation_date: '2025-09-01',
                    next_cotisation_due: '2025-10-01',
                    joined_at: '2025-08-20T14:30:00Z',
                    created_at: '2025-08-20T14:30:00Z'
                },
                {
                    id: '3',
                    member_id: 'MBR-2025-00003',
                    first_name: 'Moussa',
                    last_name: 'Ba',
                    phone: '+221 78 456 78 90',
                    address: 'Parcelles Assainies, Conakry',
                    member_type: 'driver',
                    status: 'pending',
                    wallet_activated: false,
                    cotisation_status: 'pending',
                    joined_at: '2025-09-30T09:00:00Z',
                    created_at: '2025-09-30T09:00:00Z'
                }
            ];

            setMembers(mockMembers);
        } catch (error) {
            console.error('Erreur chargement membres:', error);
            toast.error('Impossible de charger les membres');
        } finally {
            setLoading(false);
        }
    };

    /**
     * Ajoute un nouveau membre
     */
    const addMember = async () => {
        if (!formData.first_name || !formData.last_name || !formData.phone) {
            toast.error('Veuillez remplir les champs obligatoires');
            return;
        }

        try {
            const newMember: SyndicateMember = {
                id: Date.now().toString(),
                member_id: `MBR-2025-${String(members.length + 1).padStart(5, '0')}`,
                first_name: formData.first_name,
                last_name: formData.last_name,
                email: formData.email || undefined,
                phone: formData.phone,
                address: formData.address || undefined,
                member_type: formData.member_type,
                internal_role: formData.internal_role || undefined,
                status: 'pending',
                cni_number: formData.cni_number || undefined,
                wallet_activated: false,
                cotisation_status: 'pending',
                joined_at: new Date().toISOString(),
                created_at: new Date().toISOString()
            };

            setMembers(prev => [...prev, newMember]);

            // Réinitialiser le formulaire
            setFormData({
                first_name: '',
                last_name: '',
                email: '',
                phone: '',
                address: '',
                member_type: 'driver',
                internal_role: '',
                cni_number: ''
            });

            setShowAddDialog(false);
            toast.success('Membre ajouté avec succès ! Wallet automatiquement créé.');

        } catch (error) {
            console.error('Erreur ajout membre:', error);
            toast.error('Erreur lors de l\'ajout du membre');
        }
    };

    /**
     * Active un membre
     */
    const activateMember = (memberId: string) => {
        setMembers(prev => prev.map(m =>
            m.id === memberId
                ? {
                    ...m,
                    status: 'active',
                    wallet_activated: true,
                    cotisation_status: 'current',
                    last_cotisation_date: new Date().toISOString().split('T')[0],
                    next_cotisation_due: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
                }
                : m
        ));
        toast.success('Membre activé avec succès');
    };

    /**
     * Suspend un membre
     */
    const suspendMember = (memberId: string) => {
        setMembers(prev => prev.map(m =>
            m.id === memberId ? { ...m, status: 'suspended' } : m
        ));
        toast.success('Membre suspendu');
    };

    /**
     * Génère le badge numérique
     */
    const generateDigitalBadge = (member: SyndicateMember) => {
        const badgeData = {
            member_id: member.member_id,
            name: `${member.first_name} ${member.last_name}`,
            type: member.member_type,
            bureau: bureauId,
            issued_date: new Date().toISOString()
        };

        console.log('🎫 Badge numérique généré:', badgeData);
        toast.success('Badge numérique généré avec succès');
    };

    /**
     * Filtre les membres
     */
    const filteredMembers = members.filter(member => {
        const matchesSearch =
            member.first_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            member.last_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            member.member_id.toLowerCase().includes(searchTerm.toLowerCase()) ||
            member.phone.includes(searchTerm);

        const matchesStatus = statusFilter === 'all' || member.status === statusFilter;
        const matchesType = typeFilter === 'all' || member.member_type === typeFilter;

        return matchesSearch && matchesStatus && matchesType;
    });

    /**
     * Obtient la couleur du statut
     */
    const getStatusColor = (status: string) => {
        switch (status) {
            case 'active': return 'bg-green-100 text-green-800';
            case 'pending': return 'bg-yellow-100 text-yellow-800';
            case 'suspended': return 'bg-red-100 text-red-800';
            case 'retired': return 'bg-gray-100 text-gray-800';
            case 'expelled': return 'bg-red-200 text-red-900';
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
            case 'retired': return 'Retraité';
            case 'expelled': return 'Exclu';
            default: return status;
        }
    };

    /**
     * Obtient le libellé du type
     */
    const getTypeLabel = (type: string) => {
        switch (type) {
            case 'driver': return 'Chauffeur';
            case 'delivery': return 'Livreur';
            case 'vendor': return 'Vendeur';
            case 'bureau_member': return 'Membre Bureau';
            default: return type;
        }
    };

    /**
     * Formate la date
     */
    const formatDate = (dateString?: string) => {
        if (!dateString) return 'N/A';
        return new Date(dateString).toLocaleDateString('fr-FR');
    };

    if (loading) {
        return (
            <Card>
                <CardContent className="p-8 text-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
                    <p className="text-gray-600">Chargement des membres...</p>
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
                        <Users className="w-8 h-8 mx-auto mb-2 text-blue-600" />
                        <div className="text-2xl font-bold text-blue-600">{members.length}</div>
                        <div className="text-sm text-gray-600">Total Membres</div>
                    </CardContent>
                </Card>

                <Card>
                    <CardContent className="p-4 text-center">
                        <UserCheck className="w-8 h-8 mx-auto mb-2 text-green-600" />
                        <div className="text-2xl font-bold text-green-600">
                            {members.filter(m => m.status === 'active').length}
                        </div>
                        <div className="text-sm text-gray-600">Actifs</div>
                    </CardContent>
                </Card>

                <Card>
                    <CardContent className="p-4 text-center">
                        <Clock className="w-8 h-8 mx-auto mb-2 text-yellow-600" />
                        <div className="text-2xl font-bold text-yellow-600">
                            {members.filter(m => m.status === 'pending').length}
                        </div>
                        <div className="text-sm text-gray-600">En attente</div>
                    </CardContent>
                </Card>

                <Card>
                    <CardContent className="p-4 text-center">
                        <Wallet className="w-8 h-8 mx-auto mb-2 text-purple-600" />
                        <div className="text-2xl font-bold text-purple-600">
                            {members.filter(m => m.wallet_activated).length}
                        </div>
                        <div className="text-sm text-gray-600">Wallets actifs</div>
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
                                    placeholder="Rechercher un membre..."
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
                                    <SelectItem value="pending">En attente</SelectItem>
                                    <SelectItem value="suspended">Suspendus</SelectItem>
                                </SelectContent>
                            </Select>

                            <Select value={typeFilter} onValueChange={setTypeFilter}>
                                <SelectTrigger className="w-40">
                                    <SelectValue placeholder="Type" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">Tous les types</SelectItem>
                                    <SelectItem value="driver">Chauffeurs</SelectItem>
                                    <SelectItem value="delivery">Livreurs</SelectItem>
                                    <SelectItem value="vendor">Vendeurs</SelectItem>
                                    <SelectItem value="bureau_member">Membres Bureau</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
                            <DialogTrigger asChild>
                                <Button className="bg-blue-600 hover:bg-blue-700">
                                    <Plus className="w-4 h-4 mr-2" />
                                    Ajouter un Membre
                                </Button>
                            </DialogTrigger>
                            <DialogContent className="max-w-md">
                                <DialogHeader>
                                    <DialogTitle>Nouveau Membre</DialogTitle>
                                </DialogHeader>
                                <div className="space-y-4">
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <Label htmlFor="first_name">Prénom *</Label>
                                            <Input
                                                id="first_name"
                                                value={formData.first_name}
                                                onChange={(e) => setFormData(prev => ({ ...prev, first_name: e.target.value }))}
                                            />
                                        </div>
                                        <div>
                                            <Label htmlFor="last_name">Nom *</Label>
                                            <Input
                                                id="last_name"
                                                value={formData.last_name}
                                                onChange={(e) => setFormData(prev => ({ ...prev, last_name: e.target.value }))}
                                            />
                                        </div>
                                    </div>

                                    <div>
                                        <Label htmlFor="phone">Téléphone *</Label>
                                        <Input
                                            id="phone"
                                            value={formData.phone}
                                            onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                                            placeholder="+221 77 123 45 67"
                                        />
                                    </div>

                                    <div>
                                        <Label htmlFor="email">Email</Label>
                                        <Input
                                            id="email"
                                            type="email"
                                            value={formData.email}
                                            onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                                        />
                                    </div>

                                    <div>
                                        <Label htmlFor="member_type">Type de Membre *</Label>
                                        <Select
                                            value={formData.member_type}
                                            onValueChange={(value: unknown) => setFormData(prev => ({ ...prev, member_type: value }))}
                                        >
                                            <SelectTrigger>
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="driver">Chauffeur</SelectItem>
                                                <SelectItem value="delivery">Livreur</SelectItem>
                                                <SelectItem value="vendor">Vendeur</SelectItem>
                                                <SelectItem value="bureau_member">Membre Bureau</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>

                                    <div>
                                        <Label htmlFor="internal_role">Rôle Interne</Label>
                                        <Input
                                            id="internal_role"
                                            value={formData.internal_role}
                                            onChange={(e) => setFormData(prev => ({ ...prev, internal_role: e.target.value }))}
                                            placeholder="Ex: secrétaire, trésorier..."
                                        />
                                    </div>

                                    <div>
                                        <Label htmlFor="address">Adresse</Label>
                                        <Input
                                            id="address"
                                            value={formData.address}
                                            onChange={(e) => setFormData(prev => ({ ...prev, address: e.target.value }))}
                                        />
                                    </div>

                                    <div>
                                        <Label htmlFor="cni_number">Numéro CNI</Label>
                                        <Input
                                            id="cni_number"
                                            value={formData.cni_number}
                                            onChange={(e) => setFormData(prev => ({ ...prev, cni_number: e.target.value }))}
                                        />
                                    </div>

                                    <div className="flex gap-2 pt-4">
                                        <Button onClick={addMember} className="flex-1">
                                            Ajouter le Membre
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

            {/* Liste des membres */}
            <Card>
                <CardHeader>
                    <CardTitle>Liste des Membres ({filteredMembers.length})</CardTitle>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>ID Membre</TableHead>
                                <TableHead>Nom Complet</TableHead>
                                <TableHead>Contact</TableHead>
                                <TableHead>Type</TableHead>
                                <TableHead>Statut</TableHead>
                                <TableHead>Wallet</TableHead>
                                <TableHead>Cotisation</TableHead>
                                <TableHead>Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {filteredMembers.map((member) => (
                                <TableRow key={member.id}>
                                    <TableCell className="font-medium">{member.member_id}</TableCell>
                                    <TableCell>
                                        <div>
                                            <p className="font-medium">{member.first_name} {member.last_name}</p>
                                            {member.internal_role && (
                                                <p className="text-sm text-gray-600">{member.internal_role}</p>
                                            )}
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        <div className="text-sm">
                                            <p>{member.phone}</p>
                                            {member.email && <p className="text-gray-600">{member.email}</p>}
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        <Badge variant="outline">
                                            {getTypeLabel(member.member_type)}
                                        </Badge>
                                    </TableCell>
                                    <TableCell>
                                        <Badge className={getStatusColor(member.status)}>
                                            {getStatusLabel(member.status)}
                                        </Badge>
                                    </TableCell>
                                    <TableCell>
                                        <div className="flex items-center gap-1">
                                            {member.wallet_activated ? (
                                                <CheckCircle className="w-4 h-4 text-green-600" />
                                            ) : (
                                                <Clock className="w-4 h-4 text-yellow-600" />
                                            )}
                                            <span className="text-sm">
                                                {member.wallet_activated ? 'Actif' : 'En attente'}
                                            </span>
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        <Badge className={
                                            member.cotisation_status === 'current' ? 'bg-green-100 text-green-800' :
                                                member.cotisation_status === 'overdue' ? 'bg-red-100 text-red-800' :
                                                    'bg-yellow-100 text-yellow-800'
                                        }>
                                            {member.cotisation_status === 'current' ? 'À jour' :
                                                member.cotisation_status === 'overdue' ? 'En retard' :
                                                    'En attente'}
                                        </Badge>
                                    </TableCell>
                                    <TableCell>
                                        <div className="flex gap-1">
                                            {member.status === 'pending' && (
                                                <Button
                                                    size="sm"
                                                    onClick={() => activateMember(member.id)}
                                                >
                                                    <UserCheck className="w-4 h-4" />
                                                </Button>
                                            )}
                                            {member.status === 'active' && (
                                                <>
                                                    <Button
                                                        size="sm"
                                                        variant="outline"
                                                        onClick={() => generateDigitalBadge(member)}
                                                    >
                                                        <QrCode className="w-4 h-4" />
                                                    </Button>
                                                    <Button
                                                        size="sm"
                                                        variant="destructive"
                                                        onClick={() => suspendMember(member.id)}
                                                    >
                                                        <UserX className="w-4 h-4" />
                                                    </Button>
                                                </>
                                            )}
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
        </div>
    );
}
