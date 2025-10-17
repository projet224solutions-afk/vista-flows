// @ts-nocheck
/**
 * FORMULAIRE D'AJOUT DE TAXI-MOTARD
 * Composant ultra-professionnel pour ajouter des taxi-motards
 * 224Solutions - Syndicate Taxi-Motard Management
 */

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
    UserPlus,
    Bike,
    CreditCard,
    QrCode,
    Copy,
    ExternalLink,
    CheckCircle,
    AlertCircle,
    Loader2,
    Download,
    Mail,
    Phone,
    IdCard,
    Shield,
    Wallet,
    Link as LinkIcon
} from "lucide-react";
import { toast } from "sonner";

interface TaxiMotardFormData {
    first_name: string;
    last_name: string;
    phone: string;
    email: string;
    gilet_number: string;
    plate_number: string;
    moto_serial_number: string;
    syndicate_id?: string;
}

interface TaxiMotardResult {
    user: {
        id: string;
        first_name: string;
        last_name: string;
        phone: string;
        email: string;
        role: string;
    };
    wallet: {
        id: string;
        balance: number;
        currency: string;
    };
    taxi_motard: unknown;
    badge: {
        id: string;
        number: string;
        code: string;
        qr_code_url: string;
        verification_url: string;
    };
    validation_link: {
        url: string;
        token: string;
        expires_at: string;
    };
}

interface AddTaxiMotardFormProps {
    syndicateId?: string;
    onSuccess?: (result: TaxiMotardResult) => void;
}

export default function AddTaxiMotardForm({ syndicateId, onSuccess }: AddTaxiMotardFormProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [loading, setLoading] = useState(false);
    const [result, setResult] = useState<TaxiMotardResult | null>(null);
    
    const [formData, setFormData] = useState<TaxiMotardFormData>({
        first_name: '',
        last_name: '',
        phone: '',
        email: '',
        gilet_number: '',
        plate_number: '',
        moto_serial_number: '',
        syndicate_id: syndicateId
    });

    /**
     * Met à jour les données du formulaire
     */
    const updateFormData = (field: keyof TaxiMotardFormData, value: string) => {
        setFormData(prev => ({ ...prev, [field]: value }));
    };

    /**
     * Valide le formulaire
     */
    const validateForm = (): boolean => {
        const required = ['first_name', 'last_name', 'phone', 'plate_number', 'moto_serial_number'];
        
        for (const field of required) {
            if (!formData[field as keyof TaxiMotardFormData]) {
                toast.error(`Le champ ${field.replace('_', ' ')} est obligatoire`);
                return false;
            }
        }

        // Validation du téléphone
        if (!/^\+?[0-9\s-]{8,}$/.test(formData.phone)) {
            toast.error('Format de téléphone invalide');
            return false;
        }

        // Validation de l'email si fourni
        if (formData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
            toast.error('Format d\'email invalide');
            return false;
        }

        return true;
    };

    /**
     * Soumet le formulaire
     */
    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        
        if (!validateForm()) return;

        setLoading(true);
        
        try {
            // Simulation d'appel API (à remplacer par vraie API)
            console.log('🚀 Création taxi-motard:', formData);
            
            // Simuler un délai d'API
            await new Promise(resolve => setTimeout(resolve, 2000));
            
            // Générer des données de résultat simulées
            const mockResult: TaxiMotardResult = {
                user: {
                    id: `user_${Date.now()}`,
                    first_name: formData.first_name,
                    last_name: formData.last_name,
                    phone: formData.phone,
                    email: formData.email,
                    role: 'taxi_motard'
                },
                wallet: {
                    id: `wallet_${Date.now()}`,
                    balance: 0,
                    currency: 'GNF'
                },
                taxi_motard: {
                    id: `tm_${Date.now()}`,
                    gilet_number: formData.gilet_number,
                    plate_number: formData.plate_number,
                    moto_serial_number: formData.moto_serial_number,
                    is_active: true
                },
                badge: {
                    id: `badge_${Date.now()}`,
                    number: `TM-2025-${Math.floor(Math.random() * 9000) + 1000}`,
                    code: Array.from({ length: 16 }, () => Math.random().toString(36).charAt(2)).join(''),
                    qr_code_url: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCI+PC9zdmc+',
                    verification_url: `https://224solutions.com/badge/verify?code=${Array.from({ length: 16 }, () => Math.random().toString(36).charAt(2)).join('')}`
                },
                validation_link: {
                    url: `https://224solutions.com/validate/taxi-motard?token=${Array.from({ length: 32 }, () => Math.random().toString(36).charAt(2)).join('')}`,
                    token: Array.from({ length: 32 }, () => Math.random().toString(36).charAt(2)).join(''),
                    expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
                }
            };

            setResult(mockResult);
            
            toast.success('🎉 Taxi-motard créé avec succès !', {
                description: `${formData.first_name} ${formData.last_name} a été ajouté avec son wallet et badge`,
                duration: 8000
            });

            // Callback de succès
            if (onSuccess) {
                onSuccess(mockResult);
            }

        } catch (error) {
            console.error('❌ Erreur création taxi-motard:', error);
            toast.error('Erreur lors de la création', {
                description: 'Impossible de créer le taxi-motard. Veuillez réessayer.'
            });
        } finally {
            setLoading(false);
        }
    };

    /**
     * Copie du texte dans le presse-papier
     */
    const copyToClipboard = async (text: string, label: string) => {
        try {
            await navigator.clipboard.writeText(text);
            toast.success(`${label} copié !`, {
                description: 'Contenu copié dans le presse-papier'
            });
        } catch (error) {
            console.error('Erreur copie:', error);
            toast.error('Erreur lors de la copie');
        }
    };

    /**
     * Télécharge le badge en PDF
     */
    const downloadBadge = () => {
        if (!result) return;
        
        // Simulation de téléchargement
        const badgeData = {
            badge_number: result.badge.number,
            user_name: `${result.user.first_name} ${result.user.last_name}`,
            phone: result.user.phone,
            plate_number: result.taxi_motard.plate_number,
            qr_code: result.badge.qr_code_url,
            generated_at: new Date().toISOString()
        };

        const blob = new Blob([JSON.stringify(badgeData, null, 2)], {
            type: 'application/json'
        });

        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `badge-${result.badge.number}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);

        toast.success('Badge téléchargé !', {
            description: 'Le badge numérique a été téléchargé'
        });
    };

    /**
     * Réinitialise le formulaire
     */
    const resetForm = () => {
        setFormData({
            first_name: '',
            last_name: '',
            phone: '',
            email: '',
            gilet_number: '',
            plate_number: '',
            moto_serial_number: '',
            syndicate_id: syndicateId
        });
        setResult(null);
    };

    return (
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogTrigger asChild>
                <Button className="bg-gradient-to-r from-green-600 to-blue-600 hover:from-green-700 hover:to-blue-700 shadow-lg hover:shadow-xl transition-all duration-300 rounded-xl">
                    <UserPlus className="w-4 h-4 mr-2" />
                    Ajouter un Taxi-Motard
                </Button>
            </DialogTrigger>
            
            <DialogContent className="max-w-4xl rounded-2xl border-0 shadow-2xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle className="text-2xl font-bold bg-gradient-to-r from-green-600 to-blue-600 bg-clip-text text-transparent flex items-center gap-3">
                        <Bike className="w-6 h-6 text-green-600" />
                        Ajouter un Taxi-Motard
                    </DialogTitle>
                </DialogHeader>

                {!result ? (
                    // Formulaire d'ajout
                    <form onSubmit={handleSubmit} className="space-y-6 p-2">
                        {/* Informations personnelles */}
                        <Card className="border-green-200 shadow-md">
                            <CardHeader className="bg-gradient-to-r from-green-50 to-blue-50 rounded-t-xl">
                                <CardTitle className="text-lg font-semibold text-gray-800 flex items-center gap-2">
                                    <IdCard className="w-5 h-5" />
                                    Informations Personnelles
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="p-6 space-y-4">
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <Label htmlFor="first_name" className="text-sm font-semibold text-gray-700">
                                            Prénom *
                                        </Label>
                                        <Input
                                            id="first_name"
                                            value={formData.first_name}
                                            onChange={(e) => updateFormData('first_name', e.target.value)}
                                            placeholder="Prénom du conducteur"
                                            className="mt-1 rounded-xl border-gray-200 focus:border-green-500"
                                            required
                                        />
                                    </div>
                                    <div>
                                        <Label htmlFor="last_name" className="text-sm font-semibold text-gray-700">
                                            Nom *
                                        </Label>
                                        <Input
                                            id="last_name"
                                            value={formData.last_name}
                                            onChange={(e) => updateFormData('last_name', e.target.value)}
                                            placeholder="Nom de famille"
                                            className="mt-1 rounded-xl border-gray-200 focus:border-green-500"
                                            required
                                        />
                                    </div>
                                </div>
                                
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <Label htmlFor="phone" className="text-sm font-semibold text-gray-700">
                                            Téléphone *
                                        </Label>
                                        <Input
                                            id="phone"
                                            value={formData.phone}
                                            onChange={(e) => updateFormData('phone', e.target.value)}
                                            placeholder="+221 77 123 45 67"
                                            className="mt-1 rounded-xl border-gray-200 focus:border-green-500"
                                            required
                                        />
                                    </div>
                                    <div>
                                        <Label htmlFor="email" className="text-sm font-semibold text-gray-700">
                                            Email (facultatif)
                                        </Label>
                                        <Input
                                            id="email"
                                            type="email"
                                            value={formData.email}
                                            onChange={(e) => updateFormData('email', e.target.value)}
                                            placeholder="email@example.com"
                                            className="mt-1 rounded-xl border-gray-200 focus:border-green-500"
                                        />
                                    </div>
                                </div>
                            </CardContent>
                        </Card>

                        {/* Informations véhicule */}
                        <Card className="border-blue-200 shadow-md">
                            <CardHeader className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-t-xl">
                                <CardTitle className="text-lg font-semibold text-gray-800 flex items-center gap-2">
                                    <Bike className="w-5 h-5" />
                                    Informations Véhicule
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="p-6 space-y-4">
                                <div>
                                    <Label htmlFor="gilet_number" className="text-sm font-semibold text-gray-700">
                                        Numéro de Gilet (facultatif)
                                    </Label>
                                    <Input
                                        id="gilet_number"
                                        value={formData.gilet_number}
                                        onChange={(e) => updateFormData('gilet_number', e.target.value)}
                                        placeholder="Ex: G-001"
                                        className="mt-1 rounded-xl border-gray-200 focus:border-blue-500"
                                    />
                                </div>
                                
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <Label htmlFor="plate_number" className="text-sm font-semibold text-gray-700">
                                            Numéro de Plaque *
                                        </Label>
                                        <Input
                                            id="plate_number"
                                            value={formData.plate_number}
                                            onChange={(e) => updateFormData('plate_number', e.target.value)}
                                            placeholder="Ex: DK-123-AB"
                                            className="mt-1 rounded-xl border-gray-200 focus:border-blue-500"
                                            required
                                        />
                                    </div>
                                    <div>
                                        <Label htmlFor="moto_serial_number" className="text-sm font-semibold text-gray-700">
                                            Numéro de Série Moto *
                                        </Label>
                                        <Input
                                            id="moto_serial_number"
                                            value={formData.moto_serial_number}
                                            onChange={(e) => updateFormData('moto_serial_number', e.target.value)}
                                            placeholder="Ex: HND123456789"
                                            className="mt-1 rounded-xl border-gray-200 focus:border-blue-500"
                                            required
                                        />
                                    </div>
                                </div>
                            </CardContent>
                        </Card>

                        {/* Actions */}
                        <div className="flex gap-4 pt-4">
                            <Button
                                type="submit"
                                disabled={loading}
                                className="flex-1 bg-gradient-to-r from-green-600 to-blue-600 hover:from-green-700 hover:to-blue-700 rounded-xl py-3 text-lg font-semibold"
                            >
                                {loading ? (
                                    <>
                                        <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                                        Création en cours...
                                    </>
                                ) : (
                                    <>
                                        <UserPlus className="w-5 h-5 mr-2" />
                                        Créer le Taxi-Motard
                                    </>
                                )}
                            </Button>
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => setIsOpen(false)}
                                className="flex-1 rounded-xl border-gray-300 hover:bg-gray-50 py-3"
                            >
                                Annuler
                            </Button>
                        </div>
                    </form>
                ) : (
                    // Résultat de la création
                    <div className="space-y-6 p-2">
                        {/* Message de succès */}
                        <div className="bg-gradient-to-r from-green-50 to-blue-50 border border-green-200 rounded-2xl p-6">
                            <div className="flex items-center gap-3 mb-4">
                                <CheckCircle className="w-8 h-8 text-green-600" />
                                <div>
                                    <h3 className="text-xl font-bold text-green-800">Taxi-Motard créé avec succès !</h3>
                                    <p className="text-green-700">
                                        {result.user.first_name} {result.user.last_name} a été ajouté au système
                                    </p>
                                </div>
                            </div>
                        </div>

                        {/* Informations utilisateur */}
                        <Card className="border-green-200 shadow-lg">
                            <CardHeader className="bg-gradient-to-r from-green-50 to-blue-50 rounded-t-xl">
                                <CardTitle className="text-lg font-semibold text-gray-800 flex items-center gap-2">
                                    <IdCard className="w-5 h-5" />
                                    Informations Utilisateur
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="p-6">
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <Label className="text-sm font-semibold text-gray-600">ID Utilisateur</Label>
                                        <div className="flex items-center gap-2 mt-1">
                                            <code className="bg-gray-100 px-3 py-1 rounded-lg text-sm font-mono">
                                                {result.user.id}
                                            </code>
                                            <Button
                                                size="sm"
                                                variant="outline"
                                                onClick={() => copyToClipboard(result.user.id, 'ID Utilisateur')}
                                                className="rounded-lg"
                                            >
                                                <Copy className="w-3 h-3" />
                                            </Button>
                                        </div>
                                    </div>
                                    <div>
                                        <Label className="text-sm font-semibold text-gray-600">Rôle</Label>
                                        <div className="mt-1">
                                            <Badge className="bg-blue-100 text-blue-800 border-blue-200">
                                                {result.user.role}
                                            </Badge>
                                        </div>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>

                        {/* Wallet */}
                        <Card className="border-purple-200 shadow-lg">
                            <CardHeader className="bg-gradient-to-r from-purple-50 to-pink-50 rounded-t-xl">
                                <CardTitle className="text-lg font-semibold text-gray-800 flex items-center gap-2">
                                    <Wallet className="w-5 h-5" />
                                    Wallet Créé
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="p-6">
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <Label className="text-sm font-semibold text-gray-600">ID Wallet</Label>
                                        <div className="flex items-center gap-2 mt-1">
                                            <code className="bg-gray-100 px-3 py-1 rounded-lg text-sm font-mono">
                                                {result.wallet.id}
                                            </code>
                                            <Button
                                                size="sm"
                                                variant="outline"
                                                onClick={() => copyToClipboard(result.wallet.id, 'ID Wallet')}
                                                className="rounded-lg"
                                            >
                                                <Copy className="w-3 h-3" />
                                            </Button>
                                        </div>
                                    </div>
                                    <div>
                                        <Label className="text-sm font-semibold text-gray-600">Solde Initial</Label>
                                        <div className="mt-1">
                                            <span className="text-2xl font-bold text-green-600">
                                                {result.wallet.balance.toLocaleString()} {result.wallet.currency}
                                            </span>
                                            <p className="text-sm text-gray-500">Bonus de bienvenue inclus</p>
                                        </div>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>

                        {/* Badge numérique */}
                        <Card className="border-orange-200 shadow-lg">
                            <CardHeader className="bg-gradient-to-r from-orange-50 to-yellow-50 rounded-t-xl">
                                <CardTitle className="text-lg font-semibold text-gray-800 flex items-center gap-2">
                                    <QrCode className="w-5 h-5" />
                                    Badge Numérique Généré
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="p-6">
                                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                                    <div className="space-y-4">
                                        <div>
                                            <Label className="text-sm font-semibold text-gray-600">Numéro de Badge</Label>
                                            <div className="flex items-center gap-2 mt-1">
                                                <code className="bg-orange-100 px-3 py-2 rounded-lg text-lg font-bold text-orange-800">
                                                    {result.badge.number}
                                                </code>
                                                <Button
                                                    size="sm"
                                                    variant="outline"
                                                    onClick={() => copyToClipboard(result.badge.number, 'Numéro de Badge')}
                                                    className="rounded-lg"
                                                >
                                                    <Copy className="w-3 h-3" />
                                                </Button>
                                            </div>
                                        </div>
                                        
                                        <div>
                                            <Label className="text-sm font-semibold text-gray-600">Code de Vérification</Label>
                                            <div className="flex items-center gap-2 mt-1">
                                                <code className="bg-gray-100 px-3 py-1 rounded-lg text-sm font-mono break-all">
                                                    {result.badge.code}
                                                </code>
                                                <Button
                                                    size="sm"
                                                    variant="outline"
                                                    onClick={() => copyToClipboard(result.badge.code, 'Code de Badge')}
                                                    className="rounded-lg"
                                                >
                                                    <Copy className="w-3 h-3" />
                                                </Button>
                                            </div>
                                        </div>

                                        <div className="flex gap-2">
                                            <Button
                                                onClick={downloadBadge}
                                                variant="outline"
                                                className="flex-1 rounded-xl border-orange-300 text-orange-600 hover:bg-orange-50"
                                            >
                                                <Download className="w-4 h-4 mr-2" />
                                                Télécharger Badge
                                            </Button>
                                            <Button
                                                onClick={() => window.open(result.badge.verification_url, '_blank')}
                                                variant="outline"
                                                className="flex-1 rounded-xl border-blue-300 text-blue-600 hover:bg-blue-50"
                                            >
                                                <ExternalLink className="w-4 h-4 mr-2" />
                                                Vérifier
                                            </Button>
                                        </div>
                                    </div>
                                    
                                    <div className="flex justify-center">
                                        <div className="bg-white p-4 rounded-2xl shadow-lg border-2 border-orange-200">
                                            <img
                                                src={result.badge.qr_code_url}
                                                alt="QR Code Badge"
                                                className="w-48 h-48 object-contain"
                                            />
                                            <p className="text-center text-sm text-gray-600 mt-2">
                                                QR Code de Vérification
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>

                        {/* Lien de validation */}
                        <Card className="border-blue-200 shadow-lg">
                            <CardHeader className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-t-xl">
                                <CardTitle className="text-lg font-semibold text-gray-800 flex items-center gap-2">
                                    <LinkIcon className="w-5 h-5" />
                                    Lien de Validation (Visible PDG)
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="p-6">
                                <div className="bg-blue-50 p-4 rounded-xl border border-blue-200">
                                    <Label className="text-sm font-semibold text-blue-700">Lien de Validation</Label>
                                    <div className="flex items-center gap-2 mt-2">
                                        <code className="bg-white px-3 py-2 rounded-lg text-sm font-mono break-all flex-1 border">
                                            {result.validation_link.url}
                                        </code>
                                        <Button
                                            size="sm"
                                            onClick={() => copyToClipboard(result.validation_link.url, 'Lien de Validation')}
                                            className="rounded-lg bg-blue-600 hover:bg-blue-700"
                                        >
                                            <Copy className="w-3 h-3" />
                                        </Button>
                                        <Button
                                            size="sm"
                                            variant="outline"
                                            onClick={() => window.open(result.validation_link.url, '_blank')}
                                            className="rounded-lg border-blue-300 text-blue-600 hover:bg-blue-50"
                                        >
                                            <ExternalLink className="w-3 h-3" />
                                        </Button>
                                    </div>
                                    <p className="text-xs text-blue-600 mt-2">
                                        ⏰ Expire le: {new Date(result.validation_link.expires_at).toLocaleDateString('fr-FR')}
                                    </p>
                                </div>
                            </CardContent>
                        </Card>

                        {/* Actions finales */}
                        <div className="flex gap-4 pt-4">
                            <Button
                                onClick={() => {
                                    resetForm();
                                    setIsOpen(false);
                                }}
                                className="flex-1 bg-gradient-to-r from-green-600 to-blue-600 hover:from-green-700 hover:to-blue-700 rounded-xl py-3"
                            >
                                <CheckCircle className="w-4 h-4 mr-2" />
                                Terminé
                            </Button>
                            <Button
                                onClick={resetForm}
                                variant="outline"
                                className="flex-1 rounded-xl border-gray-300 hover:bg-gray-50 py-3"
                            >
                                <UserPlus className="w-4 h-4 mr-2" />
                                Ajouter un Autre
                            </Button>
                        </div>
                    </div>
                )}
            </DialogContent>
        </Dialog>
    );
}
