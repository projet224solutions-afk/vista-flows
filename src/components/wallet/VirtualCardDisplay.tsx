/**
 * Composant d'affichage des cartes virtuelles 224SOLUTIONS
 * 
 * Fonctionnalités:
 * - Affichage sécurisé de la carte
 * - Gestion des limites
 * - Historique des transactions
 * - Contrôles de sécurité
 * 
 * @author 224SOLUTIONS
 * @version 1.0.0
 */

import React, { useState, useEffect } from 'react';
import {
    Card, CardContent, CardHeader, CardTitle
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Progress } from "@/components/ui/progress";
import {
    Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter
} from "@/components/ui/dialog";
import {
    Tabs, TabsContent, TabsList, TabsTrigger
} from "@/components/ui/tabs";
import {
    CreditCard, Eye, EyeOff, Shield, Lock, Unlock, RefreshCw,
    Settings, Copy, CheckCircle, XCircle, AlertTriangle,
    TrendingUp, DollarSign, Clock, Smartphone
} from "lucide-react";
import { toast } from "sonner";
import VirtualCardService, { VirtualCard, CardLimits } from '@/services/virtualCardService';
import { useAuth } from '@/hooks/useAuth';

// ===================================================
// TYPES
// ===================================================

interface VirtualCardDisplayProps {
    userId?: string;
    showControls?: boolean;
    compact?: boolean;
}

// ===================================================
// COMPOSANT PRINCIPAL
// ===================================================

const VirtualCardDisplay: React.FC<VirtualCardDisplayProps> = ({
    userId,
    showControls = true,
    compact = false
}) => {
    const { user } = useAuth();
    const [card, setCard] = useState<VirtualCard | null>(null);
    const [limits, setLimits] = useState<CardLimits | null>(null);
    const [loading, setLoading] = useState(true);
    const [showDetails, setShowDetails] = useState(false);
    const [showSettings, setShowSettings] = useState(false);

    // États pour les modifications
    const [newDailyLimit, setNewDailyLimit] = useState<number>(0);
    const [newMonthlyLimit, setNewMonthlyLimit] = useState<number>(0);

    // ===================================================
    // CHARGEMENT DES DONNÉES
    // ===================================================

    useEffect(() => {
        loadCardData();
    }, [userId]);

    const loadCardData = async () => {
        setLoading(true);
        try {
            const targetUserId = userId || user?.id;
            if (!targetUserId) return;

            const [cardData, limitsData] = await Promise.all([
                VirtualCardService.getUserCard(targetUserId),
                card ? VirtualCardService.getCardLimits(card.id) : null
            ]);

            if (cardData) {
                setCard(cardData);
                setNewDailyLimit(cardData.daily_limit);
                setNewMonthlyLimit(cardData.monthly_limit);

                // Charger les limites si on a une carte
                if (cardData.id) {
                    const cardLimits = await VirtualCardService.getCardLimits(cardData.id);
                    setLimits(cardLimits);
                }
            }
        } catch (error) {
            console.error('Erreur chargement carte:', error);
            toast.error('Impossible de charger la carte');
        } finally {
            setLoading(false);
        }
    };

    // ===================================================
    // GESTION DES ACTIONS
    // ===================================================

    const copyToClipboard = (text: string, label: string) => {
        navigator.clipboard.writeText(text);
        toast.success(`${label} copié dans le presse-papiers`);
    };

    const toggleCardStatus = async () => {
        if (!card) return;

        const newStatus = card.card_status === 'active' ? 'blocked' : 'active';
        const success = await VirtualCardService.toggleCardStatus(card.id, newStatus);

        if (success) {
            setCard({ ...card, card_status: newStatus });
        }
    };

    const updateLimits = async () => {
        if (!card) return;

        const success = await VirtualCardService.updateCardLimits(
            card.id,
            newDailyLimit,
            newMonthlyLimit
        );

        if (success) {
            setCard({
                ...card,
                daily_limit: newDailyLimit,
                monthly_limit: newMonthlyLimit
            });
            setShowSettings(false);
            loadCardData(); // Recharger pour les nouvelles limites
        }
    };

    const renewCard = async () => {
        if (!card) return;

        const renewedCard = await VirtualCardService.renewCard(card.id);
        if (renewedCard) {
            setCard(renewedCard);
        }
    };

    // ===================================================
    // UTILITAIRES
    // ===================================================

    const getStatusBadge = (status: string) => {
        const config = {
            active: { color: 'bg-green-100 text-green-800', label: 'Active', icon: CheckCircle },
            blocked: { color: 'bg-red-100 text-red-800', label: 'Bloquée', icon: XCircle },
            expired: { color: 'bg-gray-100 text-gray-800', label: 'Expirée', icon: Clock },
            pending: { color: 'bg-yellow-100 text-yellow-800', label: 'En attente', icon: AlertTriangle }
        };

        const cfg = config[status as keyof typeof config] || config.pending;
        const Icon = cfg.icon;

        return (
            <Badge className={cfg.color}>
                <Icon className="w-3 h-3 mr-1" />
                {cfg.label}
            </Badge>
        );
    };

    const formatCardNumber = (number: string, masked: boolean = true) => {
        if (masked && !showDetails) {
            return VirtualCardService.formatCardNumber(VirtualCardService.maskCardNumber(number));
        }
        return VirtualCardService.formatCardNumber(number);
    };

    const canViewDetails = () => {
        return VirtualCardService.canViewFullCardDetails(user?.role || '');
    };

    // ===================================================
    // RENDU
    // ===================================================

    if (loading) {
        return (
            <Card className="w-full max-w-md">
                <CardContent className="p-6">
                    <div className="animate-pulse space-y-4">
                        <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                        <div className="h-20 bg-gray-200 rounded"></div>
                        <div className="h-4 bg-gray-200 rounded w-1/2"></div>
                    </div>
                </CardContent>
            </Card>
        );
    }

    if (!card) {
        return (
            <Card className="w-full max-w-md">
                <CardContent className="p-6 text-center">
                    <CreditCard className="w-12 h-12 mx-auto text-gray-400 mb-4" />
                    <p className="text-gray-500">Aucune carte virtuelle trouvée</p>
                    <p className="text-xs text-gray-400 mt-2">
                        Une carte est créée automatiquement lors de l'inscription
                    </p>
                </CardContent>
            </Card>
        );
    }

    if (compact) {
        return (
            <Card className="w-full">
                <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                            <CreditCard className="w-8 h-8 text-blue-600" />
                            <div>
                                <p className="font-medium">{formatCardNumber(card.card_number)}</p>
                                <p className="text-sm text-gray-500">{card.card_holder_name}</p>
                            </div>
                        </div>
                        <div className="flex items-center space-x-2">
                            {getStatusBadge(card.card_status)}
                            {showControls && (
                                <Button variant="ghost" size="sm">
                                    <Settings className="w-4 h-4" />
                                </Button>
                            )}
                        </div>
                    </div>
                </CardContent>
            </Card>
        );
    }

    return (
        <div className="space-y-6">

            {/* Carte principale */}
            <Card className="w-full max-w-md mx-auto bg-gradient-to-r from-blue-600 to-purple-600 text-white">
                <CardContent className="p-6">

                    {/* En-tête de la carte */}
                    <div className="flex justify-between items-start mb-6">
                        <div>
                            <p className="text-sm opacity-80">224SOLUTIONS</p>
                            <p className="text-xs opacity-60">Carte Virtuelle</p>
                        </div>
                        <div className="flex items-center space-x-2">
                            {getStatusBadge(card.card_status)}
                            <Smartphone className="w-5 h-5 opacity-80" />
                        </div>
                    </div>

                    {/* Numéro de carte */}
                    <div className="mb-6">
                        <div className="flex items-center justify-between mb-2">
                            <p className="text-2xl font-mono tracking-wider">
                                {formatCardNumber(card.card_number, !showDetails)}
                            </p>
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setShowDetails(!showDetails)}
                                className="text-white hover:bg-white/20"
                            >
                                {showDetails ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                            </Button>
                        </div>

                        {showDetails && (
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => copyToClipboard(card.card_number, 'Numéro de carte')}
                                className="text-white hover:bg-white/20 text-xs"
                            >
                                <Copy className="w-3 h-3 mr-1" />
                                Copier
                            </Button>
                        )}
                    </div>

                    {/* Détails de la carte */}
                    <div className="flex justify-between items-end">
                        <div>
                            <p className="text-xs opacity-60 mb-1">TITULAIRE</p>
                            <p className="font-medium text-sm">{card.card_holder_name}</p>
                        </div>

                        <div className="text-right">
                            <p className="text-xs opacity-60 mb-1">EXPIRE FIN</p>
                            <p className="font-medium">{card.expiry_month}/{card.expiry_year}</p>
                        </div>

                        <div className="text-right">
                            <p className="text-xs opacity-60 mb-1">CVV</p>
                            <p className="font-medium">
                                {showDetails ? card.cvv : VirtualCardService.maskCVV()}
                            </p>
                            {showDetails && (
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => copyToClipboard(card.cvv, 'CVV')}
                                    className="text-white hover:bg-white/20 text-xs mt-1"
                                >
                                    <Copy className="w-3 h-3" />
                                </Button>
                            )}
                        </div>
                    </div>

                </CardContent>
            </Card>

            {/* Informations et contrôles */}
            <Tabs defaultValue="limits" className="w-full max-w-md mx-auto">
                <TabsList className="grid w-full grid-cols-3">
                    <TabsTrigger value="limits">Limites</TabsTrigger>
                    <TabsTrigger value="security">Sécurité</TabsTrigger>
                    <TabsTrigger value="settings">Réglages</TabsTrigger>
                </TabsList>

                {/* Onglet Limites */}
                <TabsContent value="limits">
                    <Card>
                        <CardHeader>
                            <CardTitle className="text-lg">Limites de dépenses</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">

                            {limits && (
                                <>
                                    {/* Limite quotidienne */}
                                    <div>
                                        <div className="flex justify-between items-center mb-2">
                                            <span className="text-sm font-medium">Limite quotidienne</span>
                                            <span className="text-sm text-gray-500">
                                                {VirtualCardService.formatAmount(limits.daily_spent)} / {VirtualCardService.formatAmount(limits.daily_limit)}
                                            </span>
                                        </div>
                                        <Progress
                                            value={(limits.daily_spent / limits.daily_limit) * 100}
                                            className="h-2"
                                        />
                                    </div>

                                    {/* Limite mensuelle */}
                                    <div>
                                        <div className="flex justify-between items-center mb-2">
                                            <span className="text-sm font-medium">Limite mensuelle</span>
                                            <span className="text-sm text-gray-500">
                                                {VirtualCardService.formatAmount(limits.monthly_spent)} / {VirtualCardService.formatAmount(limits.monthly_limit)}
                                            </span>
                                        </div>
                                        <Progress
                                            value={(limits.monthly_spent / limits.monthly_limit) * 100}
                                            className="h-2"
                                        />
                                    </div>
                                </>
                            )}

                            {/* Bouton recharger */}
                            <Button variant="outline" onClick={loadCardData} className="w-full">
                                <RefreshCw className="w-4 h-4 mr-2" />
                                Actualiser
                            </Button>

                        </CardContent>
                    </Card>
                </TabsContent>

                {/* Onglet Sécurité */}
                <TabsContent value="security">
                    <Card>
                        <CardHeader>
                            <CardTitle className="text-lg">Sécurité</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">

                            {/* Statut de la carte */}
                            <div className="flex justify-between items-center">
                                <div>
                                    <p className="font-medium">Statut de la carte</p>
                                    <p className="text-sm text-gray-500">
                                        {card.card_status === 'active' ? 'Carte active et utilisable' : 'Carte bloquée'}
                                    </p>
                                </div>
                                {getStatusBadge(card.card_status)}
                            </div>

                            {/* Contrôles */}
                            {showControls && (
                                <>
                                    <div className="flex justify-between items-center">
                                        <div>
                                            <p className="font-medium">Bloquer/Débloquer</p>
                                            <p className="text-sm text-gray-500">Contrôler l'utilisation de la carte</p>
                                        </div>
                                        <Switch
                                            checked={card.card_status === 'active'}
                                            onCheckedChange={toggleCardStatus}
                                        />
                                    </div>

                                    <Button
                                        variant="outline"
                                        onClick={renewCard}
                                        className="w-full"
                                    >
                                        <RefreshCw className="w-4 h-4 mr-2" />
                                        Renouveler la carte
                                    </Button>
                                </>
                            )}

                        </CardContent>
                    </Card>
                </TabsContent>

                {/* Onglet Réglages */}
                <TabsContent value="settings">
                    <Card>
                        <CardHeader>
                            <CardTitle className="text-lg">Réglages</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">

                            {showControls && (
                                <>
                                    <div className="space-y-2">
                                        <Label>Limite quotidienne (XAF)</Label>
                                        <Input
                                            type="number"
                                            value={newDailyLimit}
                                            onChange={(e) => setNewDailyLimit(parseFloat(e.target.value))}
                                        />
                                    </div>

                                    <div className="space-y-2">
                                        <Label>Limite mensuelle (XAF)</Label>
                                        <Input
                                            type="number"
                                            value={newMonthlyLimit}
                                            onChange={(e) => setNewMonthlyLimit(parseFloat(e.target.value))}
                                        />
                                    </div>

                                    <Button onClick={updateLimits} className="w-full">
                                        <Settings className="w-4 h-4 mr-2" />
                                        Mettre à jour les limites
                                    </Button>
                                </>
                            )}

                            {/* Informations de la carte */}
                            <div className="pt-4 border-t space-y-2">
                                <div className="flex justify-between text-sm">
                                    <span className="text-gray-500">Type de carte:</span>
                                    <span>{VirtualCardService.getCardBrand(card.card_number)}</span>
                                </div>
                                <div className="flex justify-between text-sm">
                                    <span className="text-gray-500">Créée le:</span>
                                    <span>{new Date(card.created_at).toLocaleDateString('fr-FR')}</span>
                                </div>
                                <div className="flex justify-between text-sm">
                                    <span className="text-gray-500">Dernière mise à jour:</span>
                                    <span>{new Date(card.updated_at).toLocaleDateString('fr-FR')}</span>
                                </div>
                            </div>

                        </CardContent>
                    </Card>
                </TabsContent>

            </Tabs>

        </div>
    );
};

export default VirtualCardDisplay;
