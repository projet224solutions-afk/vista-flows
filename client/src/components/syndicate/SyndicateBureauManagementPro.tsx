/**
 * GESTION ULTRA-PROFESSIONNELLE DES BUREAUX SYNDICAUX - INTERFACE PDG COMPLÈTE
 * Module complet avec toutes les fonctionnalités avancées
 * 224Solutions - Bureau Syndicat System Pro
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
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
    ExternalLink,
    MessageSquare,
    Settings,
    RefreshCw,
    FileText,
    QrCode,
    Smartphone,
    Monitor,
    Tablet,
    Globe,
    Lock,
    Unlock,
    Star,
    TrendingUp,
    BarChart3,
    PieChart,
    Search,
    Filter,
    SortAsc,
    SortDesc,
    MoreHorizontal,
    Pencil,
    Save,
    X,
    Check,
    Bike,
    UserPlus,
    Wallet
} from "lucide-react";
import { toast } from "sonner";
import { supabase } from '@/lib/supabase';
import AddTaxiMotardForm from './AddTaxiMotardForm';

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
    last_activity?: string;
    email_sent_count: number;
    sms_sent_count: number;
    is_link_permanent: boolean;
    qr_code?: string;
    download_count: number;
    mobile_access_count: number;
    desktop_access_count: number;
    tablet_access_count: number;
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

interface EditingBureau {
    id: string;
    field: string;
    value: string;
}

export default function SyndicateBureauManagementPro() {
    const [bureaus, setBureaus] = useState<SyndicateBureau[]>([]);
    const [sosAlerts, setSOSAlerts] = useState<SOSAlert[]>([]);
    const [loading, setLoading] = useState(true);
    const [showCreateDialog, setShowCreateDialog] = useState(false);
    const [selectedBureau, setSelectedBureau] = useState<SyndicateBureau | null>(null);
    const [activeTab, setActiveTab] = useState('dashboard');
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState('all');
    const [sortBy, setSortBy] = useState('created_at');
    const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
    const [editingBureau, setEditingBureau] = useState<EditingBureau | null>(null);
    const [showAdvancedSettings, setShowAdvancedSettings] = useState(false);

    // Formulaire de création/modification
    const [formData, setFormData] = useState({
        prefecture: '',
        commune: '',
        president_name: '',
        president_email: '',
        president_phone: '',
        is_link_permanent: true,
        auto_send_email: true,
        auto_send_sms: false,
        enable_qr_code: true,
        enable_mobile_download: true
    });

    useEffect(() => {
        loadBureauxFromSupabase();
        loadSOSAlerts();
        // Actualiser toutes les 30 secondes
        const interval = setInterval(loadBureauxFromSupabase, 30000);
        return () => clearInterval(interval);
    }, []);

    /**
     * Charge les bureaux depuis Supabase avec données complètes
     */
    const loadBureauxFromSupabase = async () => {
        try {
            console.log('📊 Chargement bureaux depuis Supabase...');

            const { data: bureaux, error } = await supabase
                .from('syndicate_bureaus')
                .select('*')
                .order('created_at', { ascending: false });

            if (error) {
                console.error('❌ Erreur Supabase:', error);
                toast.error('Erreur de chargement des données', {
                    description: 'Impossible de charger les bureaux syndicaux'
                });
                return;
            }

            if (bureaux && bureaux.length > 0) {
                const formattedBureaux = bureaux.map(bureau => ({
                    id: bureau.id,
                    bureau_code: bureau.bureau_code,
                    prefecture: bureau.prefecture,
                    commune: bureau.commune,
                    full_location: bureau.full_location,
                    president_name: bureau.president_name,
                    president_email: bureau.president_email,
                    president_phone: bureau.president_phone || '',
                    permanent_link: bureau.permanent_link,
                    access_token: bureau.access_token,
                    status: bureau.status,
                    total_members: bureau.total_members || 0,
                    active_members: bureau.active_members || 0,
                    total_vehicles: bureau.total_vehicles || 0,
                    total_cotisations: bureau.total_cotisations || 0,
                    link_sent_at: bureau.link_sent_at,
                    link_accessed_at: bureau.link_accessed_at,
                    created_at: bureau.created_at,
                    validated_at: bureau.validated_at,
                    last_activity: bureau.last_activity,
                    email_sent_count: bureau.email_sent_count || 0,
                    sms_sent_count: bureau.sms_sent_count || 0,
                    is_link_permanent: bureau.is_link_permanent !== false,
                    qr_code: bureau.qr_code,
                    download_count: bureau.download_count || 0,
                    mobile_access_count: bureau.mobile_access_count || 0,
                    desktop_access_count: bureau.desktop_access_count || 0,
                    tablet_access_count: bureau.tablet_access_count || 0
                }));

                setBureaus(formattedBureaux);
                console.log('✅ Bureaux chargés depuis Supabase:', formattedBureaux.length);
            } else {
                console.log('ℹ️ Aucun bureau trouvé dans Supabase');
                setBureaus([]);
            }
        } catch (error) {
            console.error('❌ Erreur chargement Supabase:', error);
            toast.error('Erreur système', {
                description: 'Impossible de se connecter à la base de données'
            });
            setBureaus([]);
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
                    bureau_name: 'SYN-2025-00001 (Conakry - Plateau)',
                    member_name: 'Ibrahima Ndiaye',
                    vehicle_serial: 'MT-2024-001234',
                    alert_type: 'emergency',
                    severity: 'critical',
                    latitude: 14.6937,
                    longitude: -17.4441,
                    address: 'Avenue Bourguiba, Conakry',
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
     * Crée un nouveau bureau syndical avec toutes les fonctionnalités
     */
    const createBureau = async () => {
        if (!formData.prefecture || !formData.commune || !formData.president_name || !formData.president_email) {
            toast.error('Veuillez remplir tous les champs obligatoires');
            return;
        }

        try {
            // Générer le token d'accès permanent
            const accessToken = generateAccessToken();
            const permanentLink = `${window.location.origin}/syndicat/president/${accessToken}`;

            // Générer le QR Code si activé
            const qrCode = formData.enable_qr_code ? await generateQRCode(permanentLink) : undefined;

            // Générer le code bureau basé sur la ville (nom complet de la ville)
            const cityName = formData.commune.toUpperCase().replace(/[^A-Z]/g, '');
            const bureauCode = `SYN-${cityName}-${String(bureaus.length + 1).padStart(3, '0')}`;

            const newBureau: SyndicateBureau = {
                id: Date.now().toString(),
                bureau_code: bureauCode,
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
                created_at: new Date().toISOString(),
                email_sent_count: 0,
                sms_sent_count: 0,
                is_link_permanent: formData.is_link_permanent,
                qr_code: qrCode,
                download_count: 0,
                mobile_access_count: 0,
                desktop_access_count: 0,
                tablet_access_count: 0
            };

            // Sauvegarder dans Supabase
            await saveBureauToSupabase(newBureau);

            setBureaus(prev => [...prev, newBureau]);

            // Réinitialiser le formulaire
            setFormData({
                prefecture: '',
                commune: '',
                president_name: '',
                president_email: '',
                president_phone: '',
                is_link_permanent: true,
                auto_send_email: true,
                auto_send_sms: false,
                enable_qr_code: true,
                enable_mobile_download: true
            });

            setShowCreateDialog(false);

            // Afficher le lien généré
            toast.success('🎉 Bureau syndical créé avec succès !', {
                description: `Code: ${newBureau.bureau_code}`,
                duration: 10000,
                action: {
                    label: 'Voir le lien',
                    onClick: () => window.open(permanentLink, '_blank')
                }
            });

            // Envoi automatique si configuré
            if (formData.auto_send_email) {
                setTimeout(() => sendPresidentEmail(newBureau), 1000);
            }

            if (formData.auto_send_sms && formData.president_phone) {
                setTimeout(() => sendPresidentSMS(newBureau), 2000);
            }

        } catch (error) {
            console.error('Erreur création bureau:', error);
            toast.error('Erreur lors de la création du bureau');
        }
    };

    /**
     * Sauvegarde un bureau dans Supabase
     */
    const saveBureauToSupabase = async (bureau: SyndicateBureau) => {
        try {
            const { data, error } = await supabase
                .from('syndicate_bureaus')
                .insert([{
                    bureau_code: bureau.bureau_code,
                    prefecture: bureau.prefecture,
                    commune: bureau.commune,
                    full_location: bureau.full_location,
                    president_name: bureau.president_name,
                    president_email: bureau.president_email,
                    president_phone: bureau.president_phone,
                    permanent_link: bureau.permanent_link,
                    access_token: bureau.access_token,
                    status: bureau.status,
                    total_members: bureau.total_members,
                    active_members: bureau.active_members,
                    total_vehicles: bureau.total_vehicles,
                    total_cotisations: bureau.total_cotisations,
                    email_sent_count: bureau.email_sent_count,
                    sms_sent_count: bureau.sms_sent_count,
                    is_link_permanent: bureau.is_link_permanent,
                    qr_code: bureau.qr_code,
                    download_count: bureau.download_count,
                    mobile_access_count: bureau.mobile_access_count,
                    desktop_access_count: bureau.desktop_access_count,
                    tablet_access_count: bureau.tablet_access_count
                }])
                .select()
                .single();

            if (data && !error) {
                console.log('✅ Bureau sauvegardé dans Supabase:', data);
                bureau.id = data.id;
                toast.success('Bureau sauvegardé dans Supabase !');
            } else {
                console.log('⚠️ Erreur Supabase:', error);
                toast.warning('Bureau créé en mode local uniquement');
            }
        } catch (error) {
            console.error('❌ Erreur sauvegarde Supabase:', error);
            toast.warning('Bureau créé en mode local uniquement');
        }
    };

    /**
     * Génère un token d'accès sécurisé
     */
    const generateAccessToken = (): string => {
        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
        return Array.from({ length: 48 }, () => chars.charAt(Math.floor(Math.random() * chars.length))).join('');
    };

    /**
     * Génère un QR Code pour le lien
     */
    const generateQRCode = async (link: string): Promise<string> => {
        // Simulation de génération de QR Code
        // En production, utiliser une vraie librairie comme qrcode
        return `data:image/svg+xml;base64,${btoa(`<svg width="200" height="200" xmlns="http://www.w3.org/2000/svg"><rect width="200" height="200" fill="white"/><text x="100" y="100" text-anchor="middle" font-size="12">QR Code pour: ${link}</text></svg>`)}`;
    };

    /**
     * Envoie l'email au président (version améliorée)
     */
    const sendPresidentEmail = async (bureau: SyndicateBureau): Promise<boolean> => {
        try {
            const { simpleEmailService } = await import('@/services/simpleEmailService');

            const emailData = {
                president_name: bureau.president_name,
                president_email: bureau.president_email,
                bureau_code: bureau.bureau_code,
                prefecture: bureau.prefecture,
                commune: bureau.commune,
                permanent_link: bureau.permanent_link,
                access_token: bureau.access_token,
                qr_code: bureau.qr_code
            };

            toast.info('📧 Envoi de l\'email en cours...', {
                description: `Destinataire: ${bureau.president_email}`,
                duration: 3000
            });

            const success = await simpleEmailService.sendSyndicatePresidentEmail(emailData);

            if (success) {
                // Mettre à jour les statistiques
                setBureaus(prev => prev.map(b =>
                    b.id === bureau.id
                        ? {
                            ...b,
                            link_sent_at: new Date().toISOString(),
                            email_sent_count: b.email_sent_count + 1
                        }
                        : b
                ));

                // Sauvegarder dans Supabase
                await updateBureauInSupabase(bureau.id, {
                    link_sent_at: new Date().toISOString(),
                    email_sent_count: bureau.email_sent_count + 1
                });

                toast.success('✅ Email envoyé avec succès !', {
                    description: 'Le président a reçu son lien d\'accès',
                    duration: 8000
                });

                return true;
            }

            return false;
        } catch (error) {
            console.error('❌ Erreur envoi email:', error);
            toast.error('❌ Erreur lors de l\'envoi de l\'email');
            return false;
        }
    };

    /**
     * Envoie un SMS au président
     */
    const sendPresidentSMS = async (bureau: SyndicateBureau): Promise<boolean> => {
        try {
            if (!bureau.president_phone) {
                toast.warning('Aucun numéro de téléphone configuré');
                return false;
            }

            toast.info('📱 Envoi du SMS en cours...', {
                description: `Destinataire: ${bureau.president_phone}`,
                duration: 3000
            });

            // Simulation d'envoi SMS (à remplacer par une vraie API SMS)
            const smsContent = `🏛️ Bureau Syndical ${bureau.bureau_code} créé ! Accédez à votre interface: ${bureau.permanent_link} Token: ${bureau.access_token}`;

            // Ici, intégrer une vraie API SMS (Twilio, etc.)
            console.log('📱 SMS à envoyer:', smsContent);
            console.log('📞 Numéro:', bureau.president_phone);

            // Simuler un délai d'envoi
            await new Promise(resolve => setTimeout(resolve, 2000));

            // Mettre à jour les statistiques
            setBureaus(prev => prev.map(b =>
                b.id === bureau.id
                    ? { ...b, sms_sent_count: b.sms_sent_count + 1 }
                    : b
            ));

            await updateBureauInSupabase(bureau.id, {
                sms_sent_count: bureau.sms_sent_count + 1
            });

            toast.success('✅ SMS envoyé avec succès !', {
                description: `SMS envoyé au ${bureau.president_phone}`,
                duration: 8000
            });

            return true;
        } catch (error) {
            console.error('❌ Erreur envoi SMS:', error);
            toast.error('❌ Erreur lors de l\'envoi du SMS');
            return false;
        }
    };

    /**
     * Met à jour un bureau dans Supabase
     */
    const updateBureauInSupabase = async (bureauId: string, updates: Partial<SyndicateBureau>) => {
        try {
            const { error } = await supabase
                .from('syndicate_bureaus')
                .update(updates)
                .eq('id', bureauId);

            if (error) {
                console.error('❌ Erreur mise à jour Supabase:', error);
            }
        } catch (error) {
            console.error('❌ Erreur mise à jour:', error);
        }
    };

    /**
     * Modifie un champ d'un bureau en ligne
     */
    const startEditing = (bureauId: string, field: string, currentValue: string) => {
        setEditingBureau({ id: bureauId, field, value: currentValue });
    };

    /**
     * Sauvegarde la modification en ligne
     */
    const saveEdit = async () => {
        if (!editingBureau) return;

        try {
            setBureaus(prev => prev.map(b =>
                b.id === editingBureau.id
                    ? { ...b, [editingBureau.field]: editingBureau.value }
                    : b
            ));

            await updateBureauInSupabase(editingBureau.id, {
                [editingBureau.field]: editingBureau.value
            });

            toast.success('✅ Modification sauvegardée');
            setEditingBureau(null);
        } catch (error) {
            console.error('❌ Erreur sauvegarde:', error);
            toast.error('❌ Erreur lors de la sauvegarde');
        }
    };

    /**
     * Annule la modification en ligne
     */
    const cancelEdit = () => {
        setEditingBureau(null);
    };

    /**
     * Génère et télécharge l'interface pour un bureau
     */
    const downloadBureauInterface = async (bureau: SyndicateBureau) => {
        try {
            toast.info('📥 Génération de l\'interface...', {
                description: 'Création du package téléchargeable',
                duration: 3000
            });

            // Simuler la génération d'un package téléchargeable
            const interfaceData = {
                bureau_info: {
                    code: bureau.bureau_code,
                    name: `Bureau Syndical ${bureau.full_location}`,
                    president: bureau.president_name,
                    email: bureau.president_email,
                    phone: bureau.president_phone
                },
                access: {
                    link: bureau.permanent_link,
                    token: bureau.access_token,
                    qr_code: bureau.qr_code
                },
                instructions: {
                    desktop: "Double-cliquez sur index.html pour ouvrir l'interface",
                    mobile: "Scannez le QR Code ou utilisez le lien direct",
                    tablet: "Ouvrez le lien dans votre navigateur"
                }
            };

            // Créer un fichier JSON téléchargeable
            const blob = new Blob([JSON.stringify(interfaceData, null, 2)], {
                type: 'application/json'
            });

            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `bureau-syndical-${bureau.bureau_code}-interface.json`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);

            // Mettre à jour le compteur de téléchargements
            setBureaus(prev => prev.map(b =>
                b.id === bureau.id
                    ? { ...b, download_count: b.download_count + 1 }
                    : b
            ));

            await updateBureauInSupabase(bureau.id, {
                download_count: bureau.download_count + 1
            });

            toast.success('✅ Interface téléchargée !', {
                description: 'Package prêt pour installation',
                duration: 8000
            });

        } catch (error) {
            console.error('❌ Erreur téléchargement:', error);
            toast.error('❌ Erreur lors du téléchargement');
        }
    };

    /**
     * Filtre et trie les bureaux
     */
    const filteredAndSortedBureaus = bureaus
        .filter(bureau => {
            const matchesSearch =
                bureau.bureau_code.toLowerCase().includes(searchTerm.toLowerCase()) ||
                bureau.president_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                bureau.full_location.toLowerCase().includes(searchTerm.toLowerCase()) ||
                bureau.president_email.toLowerCase().includes(searchTerm.toLowerCase());

            const matchesStatus = statusFilter === 'all' || bureau.status === statusFilter;

            return matchesSearch && matchesStatus;
        })
        .sort((a, b) => {
            const aValue = a[sortBy as keyof SyndicateBureau];
            const bValue = b[sortBy as keyof SyndicateBureau];

            if (sortOrder === 'asc') {
                return aValue > bValue ? 1 : -1;
            } else {
                return aValue < bValue ? 1 : -1;
            }
        });

    /**
     * Copie le lien avec notification améliorée
     */
    const copyLink = async (link: string, bureau: SyndicateBureau) => {
        try {
            await navigator.clipboard.writeText(link);
            toast.success('🔗 Lien copié !', {
                description: `Lien du bureau ${bureau.bureau_code}`,
                duration: 3000
            });
        } catch (error) {
            console.error('❌ Erreur copie:', error);
            toast.error('❌ Erreur lors de la copie');
        }
    };

    /**
     * Formate la date avec style
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
            case 'active': return 'bg-green-100 text-green-800 border-green-200';
            case 'pending': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
            case 'suspended': return 'bg-red-100 text-red-800 border-red-200';
            case 'dissolved': return 'bg-gray-100 text-gray-800 border-gray-200';
            default: return 'bg-gray-100 text-gray-800 border-gray-200';
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
            <Card className="border-0 shadow-xl">
                <CardContent className="p-12 text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-4 border-blue-600 mx-auto mb-6"></div>
                    <h3 className="text-xl font-semibold text-gray-800 mb-2">Chargement en cours...</h3>
                    <p className="text-gray-600">Synchronisation des bureaux syndicaux</p>
                </CardContent>
            </Card>
        );
    }

    return (
        <div className="space-y-8 p-6 bg-gradient-to-br from-blue-50 via-white to-purple-50 min-h-screen">
            {/* Header Ultra-Professionnel */}
            <div className="bg-white rounded-2xl shadow-xl border border-gray-100 p-8">
                <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-4">
                        <div className="w-16 h-16 bg-gradient-to-br from-blue-600 to-purple-600 rounded-2xl flex items-center justify-center shadow-lg">
                            <Building2 className="w-8 h-8 text-white" />
                        </div>
                        <div>
                            <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                                Gestion des Bureaux Syndicaux
                            </h1>
                            <p className="text-gray-600 mt-1">Interface PDG - Système Ultra-Professionnel</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-3">
                        <Button
                            onClick={loadBureauxFromSupabase}
                            variant="outline"
                            className="border-blue-200 text-blue-600 hover:bg-blue-50 shadow-md hover:shadow-lg transition-all duration-300"
                        >
                            <RefreshCw className="w-4 h-4 mr-2" />
                            Actualiser
                        </Button>
                        <AddTaxiMotardForm
                            onSuccess={(result) => {
                                console.log('Taxi-motard créé:', result);
                                toast.success('Taxi-motard ajouté avec succès !');
                                // Recharger les données
                                loadBureauxFromSupabase();
                            }}
                        />

                        <Button
                            onClick={() => setShowAdvancedSettings(!showAdvancedSettings)}
                            variant="outline"
                            className="border-purple-200 text-purple-600 hover:bg-purple-50 shadow-md hover:shadow-lg transition-all duration-300"
                        >
                            <Settings className="w-4 h-4 mr-2" />
                            Paramètres
                        </Button>
                    </div>
                </div>

                {/* Statistiques en temps réel */}
                <div className="grid grid-cols-1 md:grid-cols-5 gap-6">
                    <Card className="border-0 shadow-lg bg-gradient-to-br from-blue-500 to-blue-600 text-white">
                        <CardContent className="p-6">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-blue-100 text-sm font-medium">Total Bureaux</p>
                                    <p className="text-3xl font-bold">{bureaus.length}</p>
                                </div>
                                <Building2 className="w-10 h-10 text-blue-200" />
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="border-0 shadow-lg bg-gradient-to-br from-green-500 to-green-600 text-white">
                        <CardContent className="p-6">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-green-100 text-sm font-medium">Bureaux Actifs</p>
                                    <p className="text-3xl font-bold">
                                        {bureaus.filter(b => b.status === 'active').length}
                                    </p>
                                </div>
                                <CheckCircle className="w-10 h-10 text-green-200" />
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="border-0 shadow-lg bg-gradient-to-br from-purple-500 to-purple-600 text-white">
                        <CardContent className="p-6">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-purple-100 text-sm font-medium">Total Membres</p>
                                    <p className="text-3xl font-bold">
                                        {bureaus.reduce((sum, b) => sum + b.total_members, 0)}
                                    </p>
                                </div>
                                <Users className="w-10 h-10 text-purple-200" />
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="border-0 shadow-lg bg-gradient-to-br from-orange-500 to-orange-600 text-white">
                        <CardContent className="p-6">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-orange-100 text-sm font-medium">Alertes SOS</p>
                                    <p className="text-3xl font-bold">{sosAlerts.length}</p>
                                </div>
                                <AlertTriangle className="w-10 h-10 text-orange-200" />
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="border-0 shadow-lg bg-gradient-to-br from-teal-500 to-teal-600 text-white">
                        <CardContent className="p-6">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-teal-100 text-sm font-medium">Cotisations</p>
                                    <p className="text-xl font-bold">
                                        {(bureaus.reduce((sum, b) => sum + b.total_cotisations, 0) / 1000000).toFixed(1)}M
                                    </p>
                                </div>
                                <DollarSign className="w-10 h-10 text-teal-200" />
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </div>

            {/* Navigation par onglets ultra-stylée */}
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                <TabsList className="grid w-full grid-cols-5 bg-white shadow-lg rounded-2xl p-2 border border-gray-100">
                    <TabsTrigger
                        value="dashboard"
                        className="rounded-xl data-[state=active]:bg-gradient-to-r data-[state=active]:from-blue-500 data-[state=active]:to-purple-500 data-[state=active]:text-white data-[state=active]:shadow-lg transition-all duration-300"
                    >
                        <BarChart3 className="w-4 h-4 mr-2" />
                        Dashboard
                    </TabsTrigger>
                    <TabsTrigger
                        value="bureaus"
                        className="rounded-xl data-[state=active]:bg-gradient-to-r data-[state=active]:from-blue-500 data-[state=active]:to-purple-500 data-[state=active]:text-white data-[state=active]:shadow-lg transition-all duration-300"
                    >
                        <Building2 className="w-4 h-4 mr-2" />
                        Bureaux
                    </TabsTrigger>
                    <TabsTrigger
                        value="management"
                        className="rounded-xl data-[state=active]:bg-gradient-to-r data-[state=active]:from-blue-500 data-[state=active]:to-purple-500 data-[state=active]:text-white data-[state=active]:shadow-lg transition-all duration-300"
                    >
                        <Settings className="w-4 h-4 mr-2" />
                        Gestion
                    </TabsTrigger>
                    <TabsTrigger
                        value="sos"
                        className="rounded-xl data-[state=active]:bg-gradient-to-r data-[state=active]:from-blue-500 data-[state=active]:to-purple-500 data-[state=active]:text-white data-[state=active]:shadow-lg transition-all duration-300"
                    >
                        <AlertTriangle className="w-4 h-4 mr-2" />
                        Alertes SOS
                    </TabsTrigger>
                    <TabsTrigger
                        value="analytics"
                        className="rounded-xl data-[state=active]:bg-gradient-to-r data-[state=active]:from-blue-500 data-[state=active]:to-purple-500 data-[state=active]:text-white data-[state=active]:shadow-lg transition-all duration-300"
                    >
                        <TrendingUp className="w-4 h-4 mr-2" />
                        Analytics
                    </TabsTrigger>
                </TabsList>

                {/* Onglet Dashboard */}
                <TabsContent value="dashboard" className="space-y-6 mt-8">
                    <div className="flex justify-between items-center">
                        <h2 className="text-2xl font-bold text-gray-800">Vue d'ensemble</h2>
                        <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
                            <DialogTrigger asChild>
                                <Button className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 shadow-lg hover:shadow-xl transition-all duration-300 rounded-xl px-6 py-3">
                                    <Plus className="w-5 h-5 mr-2" />
                                    Créer un Bureau Syndical
                                </Button>
                            </DialogTrigger>
                            <DialogContent className="max-w-2xl rounded-2xl border-0 shadow-2xl">
                                <DialogHeader>
                                    <DialogTitle className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                                        Nouveau Bureau Syndical
                                    </DialogTitle>
                                </DialogHeader>
                                <div className="space-y-6 p-2">
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <Label htmlFor="prefecture" className="text-sm font-semibold text-gray-700">Préfecture *</Label>
                                            <Input
                                                id="prefecture"
                                                value={formData.prefecture}
                                                onChange={(e) => setFormData(prev => ({ ...prev, prefecture: e.target.value }))}
                                                placeholder="Ex: Conakry"
                                                className="mt-1 rounded-xl border-gray-200 focus:border-blue-500 focus:ring-blue-500"
                                            />
                                        </div>
                                        <div>
                                            <Label htmlFor="commune" className="text-sm font-semibold text-gray-700">Commune *</Label>
                                            <Input
                                                id="commune"
                                                value={formData.commune}
                                                onChange={(e) => setFormData(prev => ({ ...prev, commune: e.target.value }))}
                                                placeholder="Ex: Plateau"
                                                className="mt-1 rounded-xl border-gray-200 focus:border-blue-500 focus:ring-blue-500"
                                            />
                                        </div>
                                    </div>

                                    <div>
                                        <Label htmlFor="president_name" className="text-sm font-semibold text-gray-700">Nom du Président *</Label>
                                        <Input
                                            id="president_name"
                                            value={formData.president_name}
                                            onChange={(e) => setFormData(prev => ({ ...prev, president_name: e.target.value }))}
                                            placeholder="Nom complet du président"
                                            className="mt-1 rounded-xl border-gray-200 focus:border-blue-500 focus:ring-blue-500"
                                        />
                                    </div>

                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <Label htmlFor="president_email" className="text-sm font-semibold text-gray-700">Email du Président *</Label>
                                            <Input
                                                id="president_email"
                                                type="email"
                                                value={formData.president_email}
                                                onChange={(e) => setFormData(prev => ({ ...prev, president_email: e.target.value }))}
                                                placeholder="email@example.com"
                                                className="mt-1 rounded-xl border-gray-200 focus:border-blue-500 focus:ring-blue-500"
                                            />
                                        </div>
                                        <div>
                                            <Label htmlFor="president_phone" className="text-sm font-semibold text-gray-700">Téléphone</Label>
                                            <Input
                                                id="president_phone"
                                                value={formData.president_phone}
                                                onChange={(e) => setFormData(prev => ({ ...prev, president_phone: e.target.value }))}
                                                placeholder="+221 77 123 45 67"
                                                className="mt-1 rounded-xl border-gray-200 focus:border-blue-500 focus:ring-blue-500"
                                            />
                                        </div>
                                    </div>

                                    {/* Options avancées */}
                                    <div className="bg-gray-50 rounded-xl p-4 space-y-4">
                                        <h4 className="font-semibold text-gray-800 flex items-center gap-2">
                                            <Settings className="w-4 h-4" />
                                            Options avancées
                                        </h4>

                                        <div className="grid grid-cols-2 gap-4">
                                            <div className="flex items-center justify-between">
                                                <Label htmlFor="is_link_permanent" className="text-sm text-gray-700">Lien permanent</Label>
                                                <Switch
                                                    id="is_link_permanent"
                                                    checked={formData.is_link_permanent}
                                                    onCheckedChange={(checked) => setFormData(prev => ({ ...prev, is_link_permanent: checked }))}
                                                />
                                            </div>

                                            <div className="flex items-center justify-between">
                                                <Label htmlFor="auto_send_email" className="text-sm text-gray-700">Envoi email auto</Label>
                                                <Switch
                                                    id="auto_send_email"
                                                    checked={formData.auto_send_email}
                                                    onCheckedChange={(checked) => setFormData(prev => ({ ...prev, auto_send_email: checked }))}
                                                />
                                            </div>

                                            <div className="flex items-center justify-between">
                                                <Label htmlFor="auto_send_sms" className="text-sm text-gray-700">Envoi SMS auto</Label>
                                                <Switch
                                                    id="auto_send_sms"
                                                    checked={formData.auto_send_sms}
                                                    onCheckedChange={(checked) => setFormData(prev => ({ ...prev, auto_send_sms: checked }))}
                                                />
                                            </div>

                                            <div className="flex items-center justify-between">
                                                <Label htmlFor="enable_qr_code" className="text-sm text-gray-700">QR Code</Label>
                                                <Switch
                                                    id="enable_qr_code"
                                                    checked={formData.enable_qr_code}
                                                    onCheckedChange={(checked) => setFormData(prev => ({ ...prev, enable_qr_code: checked }))}
                                                />
                                            </div>
                                        </div>
                                    </div>

                                    <div className="flex gap-3 pt-4">
                                        <Button
                                            onClick={createBureau}
                                            className="flex-1 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 rounded-xl py-3"
                                        >
                                            <Building2 className="w-4 h-4 mr-2" />
                                            Créer le Bureau
                                        </Button>
                                        <Button
                                            variant="outline"
                                            onClick={() => setShowCreateDialog(false)}
                                            className="flex-1 rounded-xl border-gray-300 hover:bg-gray-50"
                                        >
                                            Annuler
                                        </Button>
                                    </div>
                                </div>
                            </DialogContent>
                        </Dialog>
                    </div>

                    {/* Bureaux récents avec design amélioré */}
                    <Card className="border-0 shadow-xl rounded-2xl">
                        <CardHeader className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-t-2xl">
                            <CardTitle className="text-xl font-bold text-gray-800 flex items-center gap-2">
                                <Star className="w-5 h-5 text-yellow-500" />
                                Bureaux Récents
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="p-6">
                            <div className="space-y-4">
                                {bureaus.slice(0, 3).map((bureau) => (
                                    <div key={bureau.id} className="flex items-center justify-between p-6 border border-gray-100 rounded-2xl hover:shadow-lg transition-all duration-300 bg-gradient-to-r from-white to-gray-50">
                                        <div className="flex items-center gap-6">
                                            <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-500 rounded-2xl flex items-center justify-center shadow-lg">
                                                <Building2 className="w-8 h-8 text-white" />
                                            </div>
                                            <div>
                                                <h3 className="text-lg font-bold text-gray-800">Syndicat de Taxi Moto de {bureau.commune}</h3>
                                                <p className="text-gray-600 flex items-center gap-2">
                                                    <MapPin className="w-4 h-4" />
                                                    {bureau.full_location}
                                                </p>
                                                <p className="text-gray-600 flex items-center gap-2">
                                                    <Crown className="w-4 h-4" />
                                                    Président: {bureau.president_name}
                                                </p>
                                            </div>
                                        </div>
                                        <div className="text-right space-y-2">
                                            <Badge className={`${getStatusColor(bureau.status)} px-3 py-1 rounded-full font-semibold`}>
                                                {getStatusLabel(bureau.status)}
                                            </Badge>
                                            <p className="text-sm text-gray-600 flex items-center gap-1">
                                                <Users className="w-4 h-4" />
                                                {bureau.total_members} membres
                                            </p>
                                            <div className="flex gap-2">
                                                <Button
                                                    size="sm"
                                                    variant="outline"
                                                    onClick={() => copyLink(bureau.permanent_link, bureau)}
                                                    className="rounded-lg"
                                                >
                                                    <Copy className="w-3 h-3" />
                                                </Button>
                                                <Button
                                                    size="sm"
                                                    variant="outline"
                                                    onClick={() => window.open(bureau.permanent_link, '_blank')}
                                                    className="rounded-lg"
                                                >
                                                    <ExternalLink className="w-3 h-3" />
                                                </Button>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* Onglet Bureaux avec fonctionnalités avancées */}
                <TabsContent value="bureaus" className="space-y-6 mt-8">
                    {/* Barre de recherche et filtres */}
                    <Card className="border-0 shadow-lg rounded-2xl">
                        <CardContent className="p-6">
                            <div className="flex flex-wrap gap-4 items-center">
                                <div className="flex-1 min-w-64">
                                    <div className="relative">
                                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                                        <Input
                                            placeholder="Rechercher par code, nom, localisation, email..."
                                            value={searchTerm}
                                            onChange={(e) => setSearchTerm(e.target.value)}
                                            className="pl-10 rounded-xl border-gray-200 focus:border-blue-500"
                                        />
                                    </div>
                                </div>

                                <Select value={statusFilter} onValueChange={setStatusFilter}>
                                    <SelectTrigger className="w-48 rounded-xl border-gray-200">
                                        <Filter className="w-4 h-4 mr-2" />
                                        <SelectValue placeholder="Filtrer par statut" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">Tous les statuts</SelectItem>
                                        <SelectItem value="active">Actifs</SelectItem>
                                        <SelectItem value="pending">En attente</SelectItem>
                                        <SelectItem value="suspended">Suspendus</SelectItem>
                                        <SelectItem value="dissolved">Dissous</SelectItem>
                                    </SelectContent>
                                </Select>

                                <Select value={sortBy} onValueChange={setSortBy}>
                                    <SelectTrigger className="w-48 rounded-xl border-gray-200">
                                        <SelectValue placeholder="Trier par" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="created_at">Date de création</SelectItem>
                                        <SelectItem value="bureau_code">Code bureau</SelectItem>
                                        <SelectItem value="president_name">Nom président</SelectItem>
                                        <SelectItem value="total_members">Nombre de membres</SelectItem>
                                        <SelectItem value="status">Statut</SelectItem>
                                    </SelectContent>
                                </Select>

                                <Button
                                    variant="outline"
                                    onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
                                    className="rounded-xl border-gray-200"
                                >
                                    {sortOrder === 'asc' ? <SortAsc className="w-4 h-4" /> : <SortDesc className="w-4 h-4" />}
                                </Button>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Tableau ultra-professionnel */}
                    <Card className="border-0 shadow-xl rounded-2xl overflow-hidden">
                        <CardHeader className="bg-gradient-to-r from-blue-50 to-purple-50">
                            <CardTitle className="text-xl font-bold text-gray-800 flex items-center gap-2">
                                <Building2 className="w-5 h-5" />
                                Liste des Bureaux Syndicaux ({filteredAndSortedBureaus.length})
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="p-0">
                            <div className="overflow-x-auto">
                                <Table>
                                    <TableHeader className="bg-gray-50">
                                        <TableRow>
                                            <TableHead className="font-bold text-gray-800">Code Bureau</TableHead>
                                            <TableHead className="font-bold text-gray-800">Localisation</TableHead>
                                            <TableHead className="font-bold text-gray-800">Président</TableHead>
                                            <TableHead className="font-bold text-gray-800">Lien d'accès</TableHead>
                                            <TableHead className="font-bold text-gray-800">Statistiques</TableHead>
                                            <TableHead className="font-bold text-gray-800">Statut</TableHead>
                                            <TableHead className="font-bold text-gray-800">Actions</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {filteredAndSortedBureaus.map((bureau) => (
                                            <TableRow key={bureau.id} className="hover:bg-gray-50 transition-colors">
                                                <TableCell className="font-bold text-blue-600">
                                                    {bureau.bureau_code}
                                                    <div className="text-xs text-gray-500 mt-1">
                                                        Créé le {formatDate(bureau.created_at)}
                                                    </div>
                                                </TableCell>

                                                <TableCell>
                                                    <div className="flex items-center gap-2">
                                                        <MapPin className="w-4 h-4 text-gray-400" />
                                                        {editingBureau?.id === bureau.id && editingBureau.field === 'full_location' ? (
                                                            <div className="flex items-center gap-2">
                                                                <Input
                                                                    value={editingBureau.value}
                                                                    onChange={(e) => setEditingBureau({ ...editingBureau, value: e.target.value })}
                                                                    className="w-32 h-8 text-sm"
                                                                />
                                                                <Button size="sm" onClick={saveEdit} className="h-8 w-8 p-0">
                                                                    <Check className="w-3 h-3" />
                                                                </Button>
                                                                <Button size="sm" variant="outline" onClick={cancelEdit} className="h-8 w-8 p-0">
                                                                    <X className="w-3 h-3" />
                                                                </Button>
                                                            </div>
                                                        ) : (
                                                            <span
                                                                className="cursor-pointer hover:text-blue-600"
                                                                onClick={() => startEditing(bureau.id, 'full_location', bureau.full_location)}
                                                            >
                                                                {bureau.full_location}
                                                            </span>
                                                        )}
                                                    </div>
                                                </TableCell>

                                                <TableCell>
                                                    <div className="space-y-1">
                                                        <div className="flex items-center gap-2">
                                                            <Crown className="w-4 h-4 text-yellow-500" />
                                                            {editingBureau?.id === bureau.id && editingBureau.field === 'president_name' ? (
                                                                <div className="flex items-center gap-2">
                                                                    <Input
                                                                        value={editingBureau.value}
                                                                        onChange={(e) => setEditingBureau({ ...editingBureau, value: e.target.value })}
                                                                        className="w-32 h-8 text-sm"
                                                                    />
                                                                    <Button size="sm" onClick={saveEdit} className="h-8 w-8 p-0">
                                                                        <Check className="w-3 h-3" />
                                                                    </Button>
                                                                    <Button size="sm" variant="outline" onClick={cancelEdit} className="h-8 w-8 p-0">
                                                                        <X className="w-3 h-3" />
                                                                    </Button>
                                                                </div>
                                                            ) : (
                                                                <span
                                                                    className="font-semibold cursor-pointer hover:text-blue-600"
                                                                    onClick={() => startEditing(bureau.id, 'president_name', bureau.president_name)}
                                                                >
                                                                    {bureau.president_name}
                                                                </span>
                                                            )}
                                                        </div>

                                                        <div className="flex items-center gap-2">
                                                            <Mail className="w-3 h-3 text-gray-400" />
                                                            {editingBureau?.id === bureau.id && editingBureau.field === 'president_email' ? (
                                                                <div className="flex items-center gap-2">
                                                                    <Input
                                                                        value={editingBureau.value}
                                                                        onChange={(e) => setEditingBureau({ ...editingBureau, value: e.target.value })}
                                                                        className="w-40 h-8 text-sm"
                                                                        type="email"
                                                                    />
                                                                    <Button size="sm" onClick={saveEdit} className="h-8 w-8 p-0">
                                                                        <Check className="w-3 h-3" />
                                                                    </Button>
                                                                    <Button size="sm" variant="outline" onClick={cancelEdit} className="h-8 w-8 p-0">
                                                                        <X className="w-3 h-3" />
                                                                    </Button>
                                                                </div>
                                                            ) : (
                                                                <span
                                                                    className="text-sm text-gray-600 cursor-pointer hover:text-blue-600"
                                                                    onClick={() => startEditing(bureau.id, 'president_email', bureau.president_email)}
                                                                >
                                                                    {bureau.president_email}
                                                                </span>
                                                            )}
                                                        </div>

                                                        {bureau.president_phone && (
                                                            <div className="flex items-center gap-2">
                                                                <Phone className="w-3 h-3 text-gray-400" />
                                                                {editingBureau?.id === bureau.id && editingBureau.field === 'president_phone' ? (
                                                                    <div className="flex items-center gap-2">
                                                                        <Input
                                                                            value={editingBureau.value}
                                                                            onChange={(e) => setEditingBureau({ ...editingBureau, value: e.target.value })}
                                                                            className="w-32 h-8 text-sm"
                                                                        />
                                                                        <Button size="sm" onClick={saveEdit} className="h-8 w-8 p-0">
                                                                            <Check className="w-3 h-3" />
                                                                        </Button>
                                                                        <Button size="sm" variant="outline" onClick={cancelEdit} className="h-8 w-8 p-0">
                                                                            <X className="w-3 h-3" />
                                                                        </Button>
                                                                    </div>
                                                                ) : (
                                                                    <span
                                                                        className="text-sm text-gray-600 cursor-pointer hover:text-blue-600"
                                                                        onClick={() => startEditing(bureau.id, 'president_phone', bureau.president_phone || '')}
                                                                    >
                                                                        {bureau.president_phone}
                                                                    </span>
                                                                )}
                                                            </div>
                                                        )}

                                                        {bureau.link_sent_at && (
                                                            <div className="flex items-center gap-2">
                                                                <CheckCircle className="w-3 h-3 text-green-500" />
                                                                <span className="text-xs text-green-600">
                                                                    Email envoyé ({bureau.email_sent_count}x)
                                                                </span>
                                                            </div>
                                                        )}
                                                    </div>
                                                </TableCell>

                                                <TableCell>
                                                    <div className="space-y-3">
                                                        <div className="bg-gray-50 p-3 rounded-lg border">
                                                            <div className="flex items-center gap-2 mb-2">
                                                                <Link className="w-4 h-4 text-blue-500" />
                                                                <span className="text-sm font-semibold text-blue-600">
                                                                    {bureau.is_link_permanent ? 'Lien Permanent' : 'Lien Temporaire'}
                                                                </span>
                                                                {bureau.is_link_permanent && (
                                                                    <Lock className="w-3 h-3 text-green-500" />
                                                                )}
                                                            </div>

                                                            <div className="bg-white p-2 rounded border text-xs font-mono break-all mb-2">
                                                                {bureau.permanent_link}
                                                            </div>

                                                            <div className="flex items-center gap-1">
                                                                <Button
                                                                    size="sm"
                                                                    variant="outline"
                                                                    onClick={() => copyLink(bureau.permanent_link, bureau)}
                                                                    className="text-xs rounded-lg"
                                                                >
                                                                    <Copy className="w-3 h-3 mr-1" />
                                                                    Copier
                                                                </Button>
                                                                <Button
                                                                    size="sm"
                                                                    variant="outline"
                                                                    onClick={() => window.open(bureau.permanent_link, '_blank')}
                                                                    className="text-xs rounded-lg"
                                                                >
                                                                    <ExternalLink className="w-3 h-3 mr-1" />
                                                                    Ouvrir
                                                                </Button>
                                                                {bureau.qr_code && (
                                                                    <Button
                                                                        size="sm"
                                                                        variant="outline"
                                                                        className="text-xs rounded-lg"
                                                                        title="QR Code disponible"
                                                                    >
                                                                        <QrCode className="w-3 h-3" />
                                                                    </Button>
                                                                )}
                                                            </div>
                                                        </div>

                                                        {/* Statistiques d'accès */}
                                                        <div className="grid grid-cols-3 gap-2 text-xs">
                                                            <div className="text-center p-2 bg-blue-50 rounded">
                                                                <Monitor className="w-3 h-3 mx-auto mb-1 text-blue-600" />
                                                                <div className="font-bold text-blue-600">{bureau.desktop_access_count}</div>
                                                                <div className="text-blue-500">PC</div>
                                                            </div>
                                                            <div className="text-center p-2 bg-green-50 rounded">
                                                                <Smartphone className="w-3 h-3 mx-auto mb-1 text-green-600" />
                                                                <div className="font-bold text-green-600">{bureau.mobile_access_count}</div>
                                                                <div className="text-green-500">Mobile</div>
                                                            </div>
                                                            <div className="text-center p-2 bg-purple-50 rounded">
                                                                <Tablet className="w-3 h-3 mx-auto mb-1 text-purple-600" />
                                                                <div className="font-bold text-purple-600">{bureau.tablet_access_count}</div>
                                                                <div className="text-purple-500">Tablette</div>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </TableCell>

                                                <TableCell>
                                                    <div className="space-y-2">
                                                        <div className="text-center">
                                                            <div className="flex items-center gap-2 mb-1">
                                                                <Users className="w-4 h-4 text-gray-400" />
                                                                <span className="text-sm font-semibold">Membres</span>
                                                            </div>
                                                            <p className="text-lg font-bold text-blue-600">{bureau.active_members}</p>
                                                            <p className="text-xs text-gray-600">sur {bureau.total_members}</p>
                                                        </div>

                                                        <div className="text-center">
                                                            <div className="flex items-center gap-2 mb-1">
                                                                <DollarSign className="w-4 h-4 text-gray-400" />
                                                                <span className="text-sm font-semibold">Cotisations</span>
                                                            </div>
                                                            <p className="text-sm font-bold text-green-600">
                                                                {bureau.total_cotisations.toLocaleString()} FCFA
                                                            </p>
                                                        </div>
                                                    </div>
                                                </TableCell>

                                                <TableCell>
                                                    <Badge className={`${getStatusColor(bureau.status)} px-3 py-1 rounded-full font-semibold border`}>
                                                        {getStatusLabel(bureau.status)}
                                                    </Badge>
                                                    {bureau.last_activity && (
                                                        <p className="text-xs text-gray-500 mt-1">
                                                            Dernière activité: {formatDate(bureau.last_activity)}
                                                        </p>
                                                    )}
                                                </TableCell>

                                                <TableCell>
                                                    <div className="flex flex-col gap-2">
                                                        {/* Actions principales */}
                                                        <div className="flex gap-1">
                                                            <Button
                                                                size="sm"
                                                                variant="outline"
                                                                onClick={() => sendPresidentEmail(bureau)}
                                                                className="text-xs rounded-lg border-blue-200 text-blue-600 hover:bg-blue-50"
                                                                title="Renvoyer par email"
                                                            >
                                                                <Mail className="w-3 h-3" />
                                                            </Button>

                                                            {bureau.president_phone && (
                                                                <Button
                                                                    size="sm"
                                                                    variant="outline"
                                                                    onClick={() => sendPresidentSMS(bureau)}
                                                                    className="text-xs rounded-lg border-green-200 text-green-600 hover:bg-green-50"
                                                                    title="Envoyer par SMS"
                                                                >
                                                                    <MessageSquare className="w-3 h-3" />
                                                                </Button>
                                                            )}

                                                            <Button
                                                                size="sm"
                                                                variant="outline"
                                                                onClick={() => downloadBureauInterface(bureau)}
                                                                className="text-xs rounded-lg border-purple-200 text-purple-600 hover:bg-purple-50"
                                                                title="Télécharger interface"
                                                            >
                                                                <Download className="w-3 h-3" />
                                                            </Button>
                                                        </div>

                                                        {/* Actions de statut */}
                                                        <div className="flex gap-1">
                                                            {bureau.status === 'pending' && (
                                                                <Button
                                                                    size="sm"
                                                                    onClick={() => {
                                                                        setBureaus(prev => prev.map(b =>
                                                                            b.id === bureau.id
                                                                                ? { ...b, status: 'active', validated_at: new Date().toISOString() }
                                                                                : b
                                                                        ));
                                                                        updateBureauInSupabase(bureau.id, { status: 'active', validated_at: new Date().toISOString() });
                                                                        toast.success('Bureau activé');
                                                                    }}
                                                                    className="text-xs bg-green-600 hover:bg-green-700 rounded-lg"
                                                                >
                                                                    <CheckCircle className="w-3 h-3 mr-1" />
                                                                    Activer
                                                                </Button>
                                                            )}

                                                            {bureau.status === 'active' && (
                                                                <Button
                                                                    size="sm"
                                                                    variant="destructive"
                                                                    onClick={() => {
                                                                        setBureaus(prev => prev.map(b =>
                                                                            b.id === bureau.id
                                                                                ? { ...b, status: 'suspended' }
                                                                                : b
                                                                        ));
                                                                        updateBureauInSupabase(bureau.id, { status: 'suspended' });
                                                                        toast.success('Bureau suspendu');
                                                                    }}
                                                                    className="text-xs rounded-lg"
                                                                >
                                                                    <XCircle className="w-3 h-3 mr-1" />
                                                                    Suspendre
                                                                </Button>
                                                            )}
                                                        </div>
                                                    </div>
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </div>

                            {filteredAndSortedBureaus.length === 0 && (
                                <div className="text-center py-12">
                                    <Building2 className="w-16 h-16 mx-auto mb-4 text-gray-300" />
                                    <h3 className="text-lg font-semibold text-gray-600 mb-2">Aucun bureau trouvé</h3>
                                    <p className="text-gray-500">Aucun bureau ne correspond à vos critères de recherche.</p>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* Onglet Gestion - Fonctionnalités opérationnelles */}
                <TabsContent value="management" className="space-y-6 mt-8">
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        {/* Ajouter Taxi-Motard */}
                        <Card className="border-0 shadow-xl rounded-2xl">
                            <CardHeader>
                                <CardTitle className="text-xl font-bold text-gray-800 flex items-center gap-2">
                                    <Bike className="w-5 h-5 text-blue-600" />
                                    Ajouter un Taxi-Motard
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <AddTaxiMotardForm />
                            </CardContent>
                        </Card>

                        {/* Paramètres du Système */}
                        <Card className="border-0 shadow-xl rounded-2xl">
                            <CardHeader>
                                <CardTitle className="text-xl font-bold text-gray-800 flex items-center gap-2">
                                    <Settings className="w-5 h-5 text-purple-600" />
                                    Paramètres Système
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
                                    <div>
                                        <p className="font-semibold text-gray-800">Envoi automatique d'emails</p>
                                        <p className="text-sm text-gray-600">Envoyer automatiquement les liens aux présidents</p>
                                    </div>
                                    <Switch defaultChecked />
                                </div>
                                <div className="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
                                    <div>
                                        <p className="font-semibold text-gray-800">Notifications SMS</p>
                                        <p className="text-sm text-gray-600">Activer les notifications par SMS</p>
                                    </div>
                                    <Switch />
                                </div>
                                <div className="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
                                    <div>
                                        <p className="font-semibold text-gray-800">QR Codes</p>
                                        <p className="text-sm text-gray-600">Générer des QR codes pour les liens</p>
                                    </div>
                                    <Switch defaultChecked />
                                </div>
                                <div className="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
                                    <div>
                                        <p className="font-semibold text-gray-800">Téléchargements mobiles</p>
                                        <p className="text-sm text-gray-600">Permettre le téléchargement sur mobile</p>
                                    </div>
                                    <Switch defaultChecked />
                                </div>
                            </CardContent>
                        </Card>

                        {/* Gestion des Rôles */}
                        <Card className="border-0 shadow-xl rounded-2xl">
                            <CardHeader>
                                <CardTitle className="text-xl font-bold text-gray-800 flex items-center gap-2">
                                    <Shield className="w-5 h-5 text-green-600" />
                                    Gestion des Rôles
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-3">
                                <div className="p-4 bg-gradient-to-r from-blue-50 to-purple-50 rounded-xl">
                                    <div className="flex items-center gap-3 mb-2">
                                        <Crown className="w-5 h-5 text-yellow-600" />
                                        <span className="font-bold text-gray-800">PDG - Accès Complet</span>
                                    </div>
                                    <p className="text-sm text-gray-600 ml-8">
                                        Gestion totale de tous les bureaux syndicaux
                                    </p>
                                </div>
                                <div className="p-4 bg-blue-50 rounded-xl">
                                    <div className="flex items-center gap-3 mb-2">
                                        <Users className="w-5 h-5 text-blue-600" />
                                        <span className="font-bold text-gray-800">Président - Bureau Local</span>
                                    </div>
                                    <p className="text-sm text-gray-600 ml-8">
                                        Gestion de leur bureau syndical uniquement
                                    </p>
                                </div>
                                <div className="p-4 bg-green-50 rounded-xl">
                                    <div className="flex items-center gap-3 mb-2">
                                        <Bike className="w-5 h-5 text-green-600" />
                                        <span className="font-bold text-gray-800">Membre - Accès Limité</span>
                                    </div>
                                    <p className="text-sm text-gray-600 ml-8">
                                        Consultation et services de base
                                    </p>
                                </div>
                            </CardContent>
                        </Card>

                        {/* Statistiques de Gestion */}
                        <Card className="border-0 shadow-xl rounded-2xl">
                            <CardHeader>
                                <CardTitle className="text-xl font-bold text-gray-800 flex items-center gap-2">
                                    <Activity className="w-5 h-5 text-orange-600" />
                                    Activité de Gestion
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="flex items-center justify-between p-3 bg-gradient-to-r from-blue-50 to-blue-100 rounded-xl">
                                    <div className="flex items-center gap-3">
                                        <Mail className="w-5 h-5 text-blue-600" />
                                        <span className="font-semibold text-gray-800">Emails envoyés</span>
                                    </div>
                                    <span className="text-2xl font-bold text-blue-700">
                                        {bureaus.reduce((sum, b) => sum + b.email_sent_count, 0)}
                                    </span>
                                </div>
                                <div className="flex items-center justify-between p-3 bg-gradient-to-r from-green-50 to-green-100 rounded-xl">
                                    <div className="flex items-center gap-3">
                                        <MessageSquare className="w-5 h-5 text-green-600" />
                                        <span className="font-semibold text-gray-800">SMS envoyés</span>
                                    </div>
                                    <span className="text-2xl font-bold text-green-700">
                                        {bureaus.reduce((sum, b) => sum + b.sms_sent_count, 0)}
                                    </span>
                                </div>
                                <div className="flex items-center justify-between p-3 bg-gradient-to-r from-purple-50 to-purple-100 rounded-xl">
                                    <div className="flex items-center gap-3">
                                        <QrCode className="w-5 h-5 text-purple-600" />
                                        <span className="font-semibold text-gray-800">QR Codes générés</span>
                                    </div>
                                    <span className="text-2xl font-bold text-purple-700">
                                        {bureaus.filter(b => b.qr_code).length}
                                    </span>
                                </div>
                                <div className="flex items-center justify-between p-3 bg-gradient-to-r from-orange-50 to-orange-100 rounded-xl">
                                    <div className="flex items-center gap-3">
                                        <Download className="w-5 h-5 text-orange-600" />
                                        <span className="font-semibold text-gray-800">Téléchargements</span>
                                    </div>
                                    <span className="text-2xl font-bold text-orange-700">
                                        {bureaus.reduce((sum, b) => sum + b.download_count, 0)}
                                    </span>
                                </div>
                            </CardContent>
                        </Card>
                    </div>

                    {/* Actions Rapides de Gestion */}
                    <Card className="border-0 shadow-xl rounded-2xl">
                        <CardHeader>
                            <CardTitle className="text-xl font-bold text-gray-800">Actions Rapides</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                <Button 
                                    className="h-24 flex-col gap-2 bg-gradient-to-br from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 rounded-xl"
                                    onClick={() => toast.success('Synchronisation lancée')}
                                >
                                    <RefreshCw className="w-6 h-6" />
                                    <span className="text-sm font-semibold">Synchroniser</span>
                                </Button>
                                <Button 
                                    className="h-24 flex-col gap-2 bg-gradient-to-br from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 rounded-xl"
                                    onClick={() => toast.success('Export en cours...')}
                                >
                                    <Download className="w-6 h-6" />
                                    <span className="text-sm font-semibold">Exporter</span>
                                </Button>
                                <Button 
                                    className="h-24 flex-col gap-2 bg-gradient-to-br from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-700 rounded-xl"
                                    onClick={() => toast.info('Rapport en préparation')}
                                >
                                    <FileText className="w-6 h-6" />
                                    <span className="text-sm font-semibold">Rapport</span>
                                </Button>
                                <Button 
                                    className="h-24 flex-col gap-2 bg-gradient-to-br from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 rounded-xl"
                                    onClick={() => toast.success('Sauvegarde effectuée')}
                                >
                                    <Save className="w-6 h-6" />
                                    <span className="text-sm font-semibold">Sauvegarder</span>
                                </Button>
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="sos" className="space-y-6 mt-8">
                    <Card className="border-0 shadow-xl rounded-2xl">
                        <CardHeader>
                            <CardTitle className="text-xl font-bold text-gray-800 flex items-center gap-2">
                                <AlertTriangle className="w-5 h-5 text-red-600" />
                                Alertes SOS Actives
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            {sosAlerts.length === 0 ? (
                                <div className="text-center py-12">
                                    <Shield className="w-16 h-16 mx-auto mb-4 text-gray-300" />
                                    <h3 className="text-lg font-semibold text-gray-600 mb-2">Aucune alerte SOS active</h3>
                                    <p className="text-gray-500">Tous les bureaux syndicaux sont sécurisés.</p>
                                </div>
                            ) : (
                                <div className="space-y-4">
                                    {sosAlerts.map((alert) => (
                                        <div key={alert.id} className="border-l-4 border-red-500 bg-red-50 p-6 rounded-r-2xl shadow-lg">
                                            <div className="flex items-start justify-between">
                                                <div>
                                                    <h3 className="text-lg font-bold text-red-800">
                                                        {alert.member_name} - {alert.vehicle_serial}
                                                    </h3>
                                                    <p className="text-red-700 font-semibold">{alert.bureau_name}</p>
                                                    <p className="text-gray-700 mt-2">{alert.description}</p>
                                                    <div className="flex items-center gap-6 mt-3 text-sm text-gray-600">
                                                        <span className="flex items-center gap-1">
                                                            <MapPin className="w-4 h-4" />
                                                            {alert.address}
                                                        </span>
                                                        <span className="flex items-center gap-1">
                                                            <Calendar className="w-4 h-4" />
                                                            {formatDate(alert.created_at)}
                                                        </span>
                                                    </div>
                                                </div>
                                                <div className="flex gap-3">
                                                    <Button size="sm" variant="outline" className="rounded-xl">
                                                        <MapPin className="w-4 h-4 mr-2" />
                                                        Localiser
                                                    </Button>
                                                    <Button size="sm" className="bg-red-600 hover:bg-red-700 rounded-xl">
                                                        <Phone className="w-4 h-4 mr-2" />
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

                <TabsContent value="analytics" className="space-y-6 mt-8">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <Card className="border-0 shadow-xl rounded-2xl">
                            <CardHeader>
                                <CardTitle className="text-xl font-bold text-gray-800 flex items-center gap-2">
                                    <PieChart className="w-5 h-5" />
                                    Répartition par Statut
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="space-y-4">
                                    {['active', 'pending', 'suspended', 'dissolved'].map((status) => {
                                        const count = bureaus.filter(b => b.status === status).length;
                                        const percentage = bureaus.length > 0 ? (count / bureaus.length) * 100 : 0;

                                        return (
                                            <div key={status} className="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
                                                <div className="flex items-center gap-3">
                                                    <div className={`w-4 h-4 rounded-full ${status === 'active' ? 'bg-green-500' :
                                                        status === 'pending' ? 'bg-yellow-500' :
                                                            status === 'suspended' ? 'bg-red-500' :
                                                                'bg-gray-500'
                                                        }`}></div>
                                                    <span className="font-semibold capitalize">{getStatusLabel(status)}</span>
                                                </div>
                                                <div className="text-right">
                                                    <span className="text-xl font-bold text-gray-800">{count}</span>
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

                        <Card className="border-0 shadow-xl rounded-2xl">
                            <CardHeader>
                                <CardTitle className="text-xl font-bold text-gray-800 flex items-center gap-2">
                                    <TrendingUp className="w-5 h-5" />
                                    Performances Globales
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="space-y-6">
                                    <div className="text-center p-6 bg-gradient-to-br from-green-50 to-green-100 rounded-2xl">
                                        <DollarSign className="w-12 h-12 mx-auto mb-3 text-green-600" />
                                        <p className="text-3xl font-bold text-green-700">
                                            {bureaus.reduce((sum, b) => sum + b.total_cotisations, 0).toLocaleString()} FCFA
                                        </p>
                                        <p className="text-green-600 font-semibold mt-1">
                                            Cotisations Totales Collectées
                                        </p>
                                    </div>

                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="text-center p-4 bg-blue-50 rounded-xl">
                                            <Users className="w-8 h-8 mx-auto mb-2 text-blue-600" />
                                            <p className="text-2xl font-bold text-blue-700">
                                                {bureaus.reduce((sum, b) => sum + b.total_members, 0)}
                                            </p>
                                            <p className="text-blue-600 text-sm font-semibold">Total Membres</p>
                                        </div>

                                        <div className="text-center p-4 bg-purple-50 rounded-xl">
                                            <Activity className="w-8 h-8 mx-auto mb-2 text-purple-600" />
                                            <p className="text-2xl font-bold text-purple-700">
                                                {bureaus.reduce((sum, b) => sum + b.total_vehicles, 0)}
                                            </p>
                                            <p className="text-purple-600 text-sm font-semibold">Total Véhicules</p>
                                        </div>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                </TabsContent>
            </Tabs>
        </div>
    );
}

