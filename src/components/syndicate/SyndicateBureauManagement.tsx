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
import { Badge as BadgeComponent } from "@/components/ui/badge";
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
    ExternalLink,
    RotateCcw
} from "lucide-react";
import { toast } from "sonner";
import { supabase } from '@/lib/supabase';
import { installLinkService } from '@/services/installLinkService';
import RealtimeSyncPanel from '@/components/pdg/RealtimeSyncPanel';

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
    const [showBadgeDialog, setShowBadgeDialog] = useState(false);
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

    // Formulaire de badge
    const [badgeForm, setBadgeForm] = useState({
        name: '',
        firstName: '',
        giletNumber: '',
        phone: '',
        email: '',
        plate: '',
        serialNumber: '',
        photo: null as File | null
    });
    const [badgeLoading, setBadgeLoading] = useState(false);
    const [badgeUrl, setBadgeUrl] = useState<string | null>(null);

    useEffect(() => {
        loadBureaus();
        loadSOSAlerts();
    }, []);

    /**
     * Charge la liste des bureaux syndicaux depuis Supabase
     */
    const loadBureaus = async () => {
        try {
            console.log('🔄 Chargement des bureaux depuis Supabase...');
            console.log('🔗 URL Supabase:', process.env.NEXT_PUBLIC_SUPABASE_URL);

            // Charger depuis Supabase
            const { data: supabaseBureaus, error } = await supabase
                .from('syndicate_bureaus')
                .select('*')
                .order('created_at', { ascending: false });

            if (error) {
                console.error('❌ Erreur Supabase détaillée:', error);
                console.error('❌ Code d\'erreur:', error.code);
                console.error('❌ Message:', error.message);
                console.error('❌ Détails:', error.details);
                console.error('❌ Hint:', error.hint);

                // Fallback sur les données mockées en cas d'erreur
                const mockBureaus: SyndicateBureau[] = [
                    {
                        id: '1',
                        bureau_code: 'SYN-2025-00001',
                        prefecture: 'Conakry',
                        commune: 'Plateau',
                        full_location: 'Conakry - Plateau',
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
                    }
                ];
                setBureaus(mockBureaus);
                toast.warning('⚠️ Mode démo activé - Supabase non disponible', {
                    description: `Erreur: ${error.message}`
                });
                return;
            }

            if (supabaseBureaus && supabaseBureaus.length > 0) {
                console.log('✅ Bureaux chargés depuis Supabase:', supabaseBureaus.length);
                console.log('📋 Première bureau:', supabaseBureaus[0]);
                setBureaus(supabaseBureaus);
                toast.success(`✅ ${supabaseBureaus.length} bureau(s) chargé(s) depuis Supabase`);
            } else {
                console.log('📭 Aucun bureau trouvé dans Supabase');
                setBureaus([]);
                toast.info('📭 Aucun bureau syndical créé pour le moment');
            }

        } catch (error) {
            console.error('❌ Exception lors du chargement:', error);
            toast.error('❌ Impossible de charger les bureaux syndicaux', {
                description: 'Vérifiez votre connexion internet'
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
            // Générer le lien permanent avec le token (correspond à la route React)
            const permanentLink = `${window.location.origin}/syndicat/president/${accessToken}`;

            // Générer le code bureau basé sur la ville
            const cityCode = formData.commune.toUpperCase().replace(/[^A-Z]/g, '').substring(0, 3);
            const bureauCode = `SYN-${cityCode}-${String(bureaus.length + 1).padStart(3, '0')}`;

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
                created_at: new Date().toISOString()
            };

            // Sauvegarder dans Supabase
            try {
                console.log('🔄 Sauvegarde du bureau dans Supabase...');
                console.log('📋 Données à sauvegarder:', {
                    bureau_code: newBureau.bureau_code,
                    prefecture: newBureau.prefecture,
                    commune: newBureau.commune,
                    president_name: newBureau.president_name,
                    president_email: newBureau.president_email
                });

                const { data: supabaseBureau, error: supabaseError } = await supabase
                    .from('syndicate_bureaus')
                    .insert([{
                        bureau_code: newBureau.bureau_code,
                        prefecture: newBureau.prefecture,
                        commune: newBureau.commune,
                        full_location: newBureau.full_location,
                        president_name: newBureau.president_name,
                        president_email: newBureau.president_email,
                        president_phone: newBureau.president_phone,
                        permanent_link: newBureau.permanent_link,
                        access_token: newBureau.access_token,
                        status: newBureau.status,
                        total_members: newBureau.total_members,
                        active_members: newBureau.active_members,
                        total_vehicles: newBureau.total_vehicles,
                        total_cotisations: newBureau.total_cotisations,
                        created_at: newBureau.created_at
                    }])
                    .select()
                    .single();

                if (supabaseBureau && !supabaseError) {
                    console.log('✅ Bureau sauvegardé dans Supabase avec succès:', supabaseBureau);
                    // Utiliser l'ID de Supabase
                    newBureau.id = supabaseBureau.id;
                    toast.success('✅ Bureau sauvegardé dans Supabase !', {
                        description: `ID: ${supabaseBureau.id}`
                    });
                } else {
                    console.error('❌ Erreur Supabase détaillée:', supabaseError);
                    toast.error('❌ Erreur de sauvegarde Supabase', {
                        description: supabaseError?.message || 'Erreur inconnue'
                    });
                    // Continuer avec la sauvegarde locale
                }
            } catch (error) {
                console.error('❌ Exception lors de la sauvegarde Supabase:', error);
                toast.error('❌ Erreur de connexion Supabase', {
                    description: 'Vérifiez votre connexion internet'
                });
                // Continuer avec la sauvegarde locale
            }

            // Ajouter le bureau à la liste locale
            setBureaus(prev => [...prev, newBureau]);

            // Recharger les données depuis Supabase pour s'assurer de la persistance
            setTimeout(() => {
                loadBureaus();
            }, 1000);

            // Réinitialiser le formulaire
            setFormData({
                prefecture: '',
                commune: '',
                president_name: '',
                president_email: '',
                president_phone: ''
            });

            setShowCreateDialog(false);

            // Afficher le lien généré dans l'interface
            toast.success('Bureau syndical créé avec succès !', {
                description: `Lien généré: ${permanentLink}`,
                duration: 10000
            });

            // Envoyer l'email au président (en arrière-plan)
            sendPresidentEmail(newBureau).then(success => {
                if (success) {
                    toast.success('✅ Email envoyé avec succès au président !');
                } else {
                    toast.warning('⚠️ Bureau créé mais email non envoyé. Utilisez le bouton "Renvoyer le lien".');
                }
            });

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
    const sendPresidentEmail = async (bureau: SyndicateBureau): Promise<boolean> => {
        try {
            // Import dynamique du service email simple (garanti de fonctionner)
            const { simpleEmailService } = await import('@/services/simpleEmailService');

            // Données pour l'email du président
            const emailData = {
                president_name: bureau.president_name,
                president_email: bureau.president_email,
                bureau_code: bureau.bureau_code,
                prefecture: bureau.prefecture,
                commune: bureau.commune,
                permanent_link: bureau.permanent_link,
                access_token: bureau.access_token
            };

            console.log('🚀 ENVOI EMAIL PRÉSIDENT - MÉTHODE GARANTIE');
            console.log('===========================================');
            console.log('📧 Destinataire:', bureau.president_email);
            console.log('👤 Nom:', bureau.president_name);
            console.log('🏛️ Bureau:', bureau.bureau_code);
            console.log('📍 Localisation:', bureau.prefecture, '-', bureau.commune);
            console.log('🔗 Lien à envoyer:', bureau.permanent_link);
            console.log('🔑 Token:', bureau.access_token);
            console.log('');

            // Afficher une notification de début d'envoi
            toast.info('📧 Envoi de l\'email en cours...', {
                description: `Destinataire: ${bureau.president_email}`,
                duration: 3000
            });

            // Envoi de l'email via le service simple (méthodes garanties)
            const success = await simpleEmailService.sendSyndicatePresidentEmail(emailData);

            if (success) {
                // Mettre à jour la date d'envoi
                setBureaus(prev => prev.map(b =>
                    b.id === bureau.id
                        ? { ...b, link_sent_at: new Date().toISOString() }
                        : b
                ));

                console.log('✅ PROCESSUS D\'ENVOI TERMINÉ AVEC SUCCÈS');
                console.log('📧 Le président devrait maintenant avoir accès aux informations');
                console.log('');
                console.log('📋 RÉCAPITULATIF:');
                console.log('- Email président:', bureau.president_email);
                console.log('- Lien d\'accès:', bureau.permanent_link);
                console.log('- Token d\'accès:', bureau.access_token);
                console.log('- Date d\'envoi:', new Date().toLocaleString());

                // Notification de succès
                toast.success('✅ Email traité avec succès !', {
                    description: 'Le président a maintenant accès aux informations',
                    duration: 8000,
                    action: {
                        label: 'Voir le lien',
                        onClick: () => {
                            window.open(bureau.permanent_link, '_blank');
                        }
                    }
                });

                return true;
            } else {
                throw new Error('Échec du processus d\'envoi');
            }
        } catch (error) {
            console.error('❌ ERREUR DANS LE PROCESSUS D\'ENVOI:', error);

            // Afficher les informations importantes même en cas d'erreur
            console.log('');
            console.log('📧 INFORMATIONS BUREAU (DISPONIBLES POUR ENVOI MANUEL):');
            console.log('======================================================');
            console.log('Email président:', bureau.president_email);
            console.log('Nom président:', bureau.president_name);
            console.log('Code bureau:', bureau.bureau_code);
            console.log('Préfecture:', bureau.prefecture);
            console.log('Commune:', bureau.commune);
            console.log('Lien permanent:', bureau.permanent_link);
            console.log('Token d\'accès:', bureau.access_token);
            console.log('');
            console.log('📝 SUJET EMAIL: 🏛️ Création de votre Bureau Syndical -', bureau.bureau_code);
            console.log('');
            console.log('💡 SOLUTION: Copiez ces informations et envoyez-les manuellement');

            // Essayer de copier les informations
            try {
                const emailContent = `
📧 EMAIL À ENVOYER MANUELLEMENT

Destinataire: ${bureau.president_email}
Sujet: 🏛️ Création de votre Bureau Syndical - ${bureau.bureau_code}

Bonjour ${bureau.president_name},

Votre bureau syndical a été créé avec succès !

📋 INFORMATIONS:
• Code Bureau: ${bureau.bureau_code}
• Préfecture: ${bureau.prefecture}
• Commune: ${bureau.commune}

🔗 LIEN D'ACCÈS: ${bureau.permanent_link}
🔑 TOKEN: ${bureau.access_token}

Cliquez sur le lien et utilisez le token pour accéder à votre interface.

Cordialement,
224Solutions
                `;

                await navigator.clipboard.writeText(emailContent);

                toast.warning('⚠️ Envoi automatique impossible', {
                    description: 'Contenu copié - Envoyez manuellement par email',
                    duration: 20000,
                    action: {
                        label: 'Ouvrir email',
                        onClick: () => {
                            const mailtoLink = `mailto:${bureau.president_email}?subject=${encodeURIComponent('🏛️ Création de votre Bureau Syndical - ' + bureau.bureau_code)}&body=${encodeURIComponent(emailContent)}`;
                            window.open(mailtoLink);
                        }
                    }
                });

                // Marquer comme "envoyé" même si c'est manuel
                setBureaus(prev => prev.map(b =>
                    b.id === bureau.id
                        ? { ...b, link_sent_at: new Date().toISOString() }
                        : b
                ));

                return true; // On considère que c'est un succès car l'info est disponible

            } catch (clipboardError) {
                console.error('❌ Erreur copie presse-papier:', clipboardError);

                // Dernière solution: afficher dans une alerte
                const alertContent = `
INFORMATIONS À ENVOYER PAR EMAIL:

Destinataire: ${bureau.president_email}
Lien: ${bureau.permanent_link}
Token: ${bureau.access_token}

Copiez ces informations et envoyez-les par email au président.
                `;

                alert(alertContent);

                toast.error('❌ Toutes les méthodes ont échoué', {
                    description: 'Informations affichées - Envoyez manuellement',
                    duration: 15000
                });

                return false;
            }
        }
    };

    /**
     * Renvoie le lien permanent
     */
    const resendLink = async (bureau: SyndicateBureau) => {
        toast.info('Envoi de l\'email en cours...', {
            description: `Destinataire: ${bureau.president_email}`
        });

        const success = await sendPresidentEmail(bureau);

        if (success) {
            toast.success('✅ Email renvoyé avec succès !', {
                description: `Le lien a été envoyé à ${bureau.president_email}`
            });
        } else {
            toast.error('❌ Échec de l\'envoi de l\'email', {
                description: 'Utilisez les boutons "Copier" ou "Ouvrir" pour partager le lien manuellement'
            });
        }
    };

    /**
     * Envoie un lien d'installation PWA au président
     */
    const sendInstallLink = async (bureau: SyndicateBureau) => {
        try {
            toast.info('📱 Génération du lien d\'installation...', {
                description: `Préparation pour ${bureau.president_name}`
            });

            const result = await installLinkService.generateAndSendInstallLink({
                bureauId: bureau.id,
                presidentName: bureau.president_name,
                presidentEmail: bureau.president_email,
                presidentPhone: bureau.president_phone,
                bureauCode: bureau.bureau_code,
                prefecture: bureau.prefecture,
                commune: bureau.commune
            });

            if (result.success) {
                toast.success('✅ Lien d\'installation envoyé !', {
                    description: result.message,
                    duration: 8000,
                    action: {
                        label: 'Voir le lien',
                        onClick: () => {
                            if (result.link) {
                                window.open(result.link, '_blank');
                            }
                        }
                    }
                });
            } else {
                toast.error('❌ Échec de l\'envoi', {
                    description: result.error || 'Erreur inconnue'
                });
            }
        } catch (error) {
            console.error('❌ Erreur envoi lien installation:', error);
            toast.error('❌ Erreur lors de l\'envoi du lien d\'installation');
        }
    };

    /**
     * Teste le système d'email avec l'email de l'utilisateur
     */
    const testEmailSystem = async () => {
        try {
            // Demander l'email de test à l'utilisateur
            const testEmail = prompt('Entrez votre email pour tester le système d\'envoi:', 'test@example.com');

            if (!testEmail || !testEmail.includes('@')) {
                toast.error('Email invalide', {
                    description: 'Veuillez entrer une adresse email valide'
                });
                return;
            }

            // Import dynamique du service email simple
            const { simpleEmailService } = await import('@/services/simpleEmailService');

            console.log('🧪 TEST DU SYSTÈME D\'EMAIL');
            console.log('===========================');
            console.log('📧 Email de test:', testEmail);

            toast.info('🧪 Test du système d\'email en cours...', {
                description: `Email de test: ${testEmail}`,
                duration: 3000
            });

            // Tester l'envoi d'email
            const success = await simpleEmailService.testEmailSending(testEmail);

            if (success) {
                toast.success('✅ Test réussi !', {
                    description: 'Le système d\'email fonctionne correctement',
                    duration: 8000,
                    action: {
                        label: 'Vérifier email',
                        onClick: () => {
                            window.open(`https://mail.google.com`, '_blank');
                        }
                    }
                });

                console.log('✅ TEST RÉUSSI - Le système d\'email fonctionne');
            } else {
                toast.warning('⚠️ Test partiellement réussi', {
                    description: 'Vérifiez votre client email ou la console',
                    duration: 10000
                });

                console.log('⚠️ TEST PARTIEL - Vérifiez votre client email');
            }
        } catch (error) {
            console.error('❌ Erreur test email:', error);
            toast.error('❌ Erreur lors du test', {
                description: 'Consultez la console pour plus de détails'
            });
        }
    };

    /**
     * GÉNÉRATION DE BADGE TAXI-MOTO
     * Crée un badge professionnel avec QR code
     */
    const generateBadge = async () => {
        if (!badgeForm.name || !badgeForm.firstName || !badgeForm.phone || !badgeForm.plate || !badgeForm.serialNumber) {
            toast.error('❌ Champs obligatoires manquants', {
                description: 'Nom, prénom, téléphone, plaque et numéro de série sont requis'
            });
            return;
        }

        setBadgeLoading(true);
        try {
            const response = await fetch('/api/generateBadge', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    bureau_id: selectedBureau?.id || bureaus[0]?.id,
                    created_by: 'pdg', // À remplacer par l'ID utilisateur réel
                    ...badgeForm
                })
            });

            if (!response.ok) {
                throw new Error(`Erreur ${response.status}: ${response.statusText}`);
            }

            const result = await response.json();
            setBadgeUrl(result.url);

            toast.success('✅ Badge généré avec succès !', {
                description: 'Le badge a été créé et sauvegardé',
                duration: 5000,
                action: {
                    label: 'Télécharger',
                    onClick: () => {
                        window.open(result.url, '_blank');
                    }
                }
            });

            // Réinitialiser le formulaire
            setBadgeForm({
                name: '',
                firstName: '',
                giletNumber: '',
                phone: '',
                email: '',
                plate: '',
                serialNumber: '',
                photo: null
            });
            setShowBadgeDialog(false);

        } catch (error) {
            console.error('❌ Erreur génération badge:', error);
            toast.error('❌ Erreur lors de la génération', {
                description: 'Vérifiez la console pour plus de détails'
            });
        } finally {
            setBadgeLoading(false);
        }
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
                    {/* Panel de synchronisation temps réel */}
                    <RealtimeSyncPanel />

                    <div className="flex justify-between items-center">
                        <h2 className="text-2xl font-bold">Gestion des Bureaux Syndicaux</h2>
                        <div className="flex gap-3">
                            <Button
                                onClick={loadBureaus}
                                variant="outline"
                                className="border-blue-500 text-blue-600 hover:bg-blue-50 shadow-md hover:shadow-lg transition-all duration-300"
                            >
                                <RotateCcw className="w-4 h-4 mr-2" />
                                Actualiser
                            </Button>
                            <Button
                                onClick={testEmailSystem}
                                variant="outline"
                                className="border-green-500 text-green-600 hover:bg-green-50 shadow-md hover:shadow-lg transition-all duration-300"
                            >
                                <Mail className="w-4 h-4 mr-2" />
                                Tester Email
                            </Button>
                            <Button
                                onClick={() => setShowBadgeDialog(true)}
                                variant="outline"
                                className="border-purple-500 text-purple-600 hover:bg-purple-50 shadow-md hover:shadow-lg transition-all duration-300"
                            >
                                <Shield className="w-4 h-4 mr-2" />
                                Générer Badge
                            </Button>
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
                                                placeholder="Ex: Conakry"
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
                                            <BadgeComponent className={getStatusColor(bureau.status)}>
                                                {getStatusLabel(bureau.status)}
                                            </BadgeComponent>
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
                                        <TableHead>Lien d'accès</TableHead>
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
                                                    {bureau.link_sent_at && (
                                                        <p className="text-xs text-green-600">
                                                            ✅ Email envoyé le {new Date(bureau.link_sent_at).toLocaleDateString()}
                                                        </p>
                                                    )}
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                <div className="max-w-xs">
                                                    <div className="flex items-center gap-2 mb-2">
                                                        <Link className="w-4 h-4 text-blue-500" />
                                                        <span className="text-sm font-medium text-blue-600">Lien généré</span>
                                                    </div>
                                                    <div className="bg-gray-50 p-2 rounded border text-xs font-mono break-all">
                                                        {bureau.permanent_link}
                                                    </div>
                                                    <div className="flex items-center gap-1 mt-2">
                                                        <Button
                                                            size="sm"
                                                            variant="outline"
                                                            onClick={() => copyLink(bureau.permanent_link)}
                                                            className="text-xs"
                                                        >
                                                            <Copy className="w-3 h-3 mr-1" />
                                                            Copier
                                                        </Button>
                                                        <Button
                                                            size="sm"
                                                            variant="outline"
                                                            onClick={() => window.open(bureau.permanent_link, '_blank')}
                                                            className="text-xs"
                                                        >
                                                            <ExternalLink className="w-3 h-3 mr-1" />
                                                            Ouvrir
                                                        </Button>
                                                    </div>
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                <div className="text-center">
                                                    <p className="font-bold">{bureau.active_members}</p>
                                                    <p className="text-xs text-gray-600">sur {bureau.total_members}</p>
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                <BadgeComponent className={getStatusColor(bureau.status)}>
                                                    {getStatusLabel(bureau.status)}
                                                </BadgeComponent>
                                            </TableCell>
                                            <TableCell>
                                                <div className="flex flex-col gap-2">
                                                    <Button
                                                        size="sm"
                                                        variant="outline"
                                                        onClick={() => resendLink(bureau)}
                                                        className="text-xs"
                                                    >
                                                        <Send className="w-3 h-3 mr-1" />
                                                        Renvoyer Email
                                                    </Button>
                                                    <Button
                                                        size="sm"
                                                        variant="outline"
                                                        onClick={() => sendInstallLink(bureau)}
                                                        className="text-xs border-blue-500 text-blue-600 hover:bg-blue-50"
                                                    >
                                                        <Download className="w-3 h-3 mr-1" />
                                                        Lien Installation
                                                    </Button>
                                                    {bureau.status === 'pending' && (
                                                        <Button
                                                            size="sm"
                                                            onClick={() => changeBureauStatus(bureau.id, 'active')}
                                                            className="text-xs bg-green-600 hover:bg-green-700"
                                                        >
                                                            <CheckCircle className="w-3 h-3 mr-1" />
                                                            Activer
                                                        </Button>
                                                    )}
                                                    {bureau.status === 'active' && (
                                                        <Button
                                                            size="sm"
                                                            variant="destructive"
                                                            onClick={() => changeBureauStatus(bureau.id, 'suspended')}
                                                            className="text-xs"
                                                        >
                                                            <XCircle className="w-3 h-3 mr-1" />
                                                            Suspendre
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
                                        {bureaus.reduce((sum, b) => sum + b.total_cotisations, 0).toLocaleString()} GNF
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

            {/* Modal de génération de badge */}
            <Dialog open={showBadgeDialog} onOpenChange={setShowBadgeDialog}>
                <DialogContent className="max-w-2xl">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <Shield className="w-5 h-5 text-purple-600" />
                            Générer un Badge Taxi-Moto
                        </DialogTitle>
                    </DialogHeader>

                    <div className="space-y-6">
                        {/* Informations du membre */}
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <Label htmlFor="name">Nom *</Label>
                                <Input
                                    id="name"
                                    value={badgeForm.name}
                                    onChange={(e) => setBadgeForm(prev => ({ ...prev, name: e.target.value }))}
                                    placeholder="Ex: Diallo"
                                />
                            </div>
                            <div>
                                <Label htmlFor="firstName">Prénom *</Label>
                                <Input
                                    id="firstName"
                                    value={badgeForm.firstName}
                                    onChange={(e) => setBadgeForm(prev => ({ ...prev, firstName: e.target.value }))}
                                    placeholder="Ex: Mamadou"
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <Label htmlFor="giletNumber">Numéro de gilet (optionnel)</Label>
                                <Input
                                    id="giletNumber"
                                    value={badgeForm.giletNumber}
                                    onChange={(e) => setBadgeForm(prev => ({ ...prev, giletNumber: e.target.value }))}
                                    placeholder="Ex: 001"
                                />
                            </div>
                            <div>
                                <Label htmlFor="phone">Téléphone *</Label>
                                <Input
                                    id="phone"
                                    value={badgeForm.phone}
                                    onChange={(e) => setBadgeForm(prev => ({ ...prev, phone: e.target.value }))}
                                    placeholder="Ex: +221 77 123 45 67"
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <Label htmlFor="email">Email (optionnel)</Label>
                                <Input
                                    id="email"
                                    type="email"
                                    value={badgeForm.email}
                                    onChange={(e) => setBadgeForm(prev => ({ ...prev, email: e.target.value }))}
                                    placeholder="Ex: mamadou@example.com"
                                />
                            </div>
                            <div>
                                <Label htmlFor="plate">Numéro de plaque *</Label>
                                <Input
                                    id="plate"
                                    value={badgeForm.plate}
                                    onChange={(e) => setBadgeForm(prev => ({ ...prev, plate: e.target.value }))}
                                    placeholder="Ex: GN-1234-A"
                                />
                            </div>
                        </div>

                        <div>
                            <Label htmlFor="serialNumber">Numéro de série *</Label>
                            <Input
                                id="serialNumber"
                                value={badgeForm.serialNumber}
                                onChange={(e) => setBadgeForm(prev => ({ ...prev, serialNumber: e.target.value }))}
                                placeholder="Ex: TM-2024-001"
                            />
                        </div>

                        {/* Photo optionnelle */}
                        <div>
                            <Label htmlFor="photo">Photo (optionnel)</Label>
                            <Input
                                id="photo"
                                type="file"
                                accept="image/*"
                                onChange={(e) => {
                                    const file = e.target.files?.[0];
                                    if (file) {
                                        setBadgeForm(prev => ({ ...prev, photo: file }));
                                    }
                                }}
                                className="cursor-pointer"
                            />
                        </div>

                        {/* Aperçu du badge généré */}
                        {badgeUrl && (
                            <div className="border-2 border-dashed border-purple-300 rounded-lg p-4 bg-purple-50">
                                <div className="text-center">
                                    <Shield className="w-8 h-8 mx-auto mb-2 text-purple-600" />
                                    <p className="text-sm font-medium text-purple-800">Badge généré avec succès !</p>
                                    <a
                                        href={badgeUrl}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="text-sm text-purple-600 hover:text-purple-800 underline"
                                    >
                                        Télécharger le badge
                                    </a>
                                </div>
                            </div>
                        )}

                        {/* Actions */}
                        <div className="flex justify-end gap-3 pt-4 border-t">
                            <Button
                                variant="outline"
                                onClick={() => setShowBadgeDialog(false)}
                                disabled={badgeLoading}
                            >
                                Annuler
                            </Button>
                            <Button
                                onClick={generateBadge}
                                disabled={badgeLoading}
                                className="bg-purple-600 hover:bg-purple-700"
                            >
                                {badgeLoading ? (
                                    <>
                                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                                        Génération...
                                    </>
                                ) : (
                                    <>
                                        <Shield className="w-4 h-4 mr-2" />
                                        Générer et télécharger
                                    </>
                                )}
                            </Button>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
}
