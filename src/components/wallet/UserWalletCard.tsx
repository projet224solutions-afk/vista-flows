/**
 * Composant Wallet + Carte Virtuelle pour utilisateurs
 * 
 * Interface simplifiée pour les utilisateurs réguliers
 * (clients, marchands, livreurs, etc.)
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
import { Progress } from "@/components/ui/progress";
import {
    Tabs, TabsContent, TabsList, TabsTrigger
} from "@/components/ui/tabs";
import {
    Wallet, CreditCard, Send, Download, Eye, EyeOff,
    ArrowUpRight, ArrowDownLeft, RefreshCw, Shield
} from "lucide-react";
import { toast } from "sonner";
import VirtualCardService, { VirtualCard } from '@/services/virtualCardService';
import { WalletTransactionService } from '@/services/walletTransactionService';
import { useAuth } from '@/hooks/useAuth';
import VirtualCardDisplay from './VirtualCardDisplay';

// ===================================================
// TYPES
// ===================================================

interface UserWalletCardProps {
    compact?: boolean;
}

interface WalletInfo {
    id: string;
    balance: number;
    currency: string;
    status: string;
}

interface Transaction {
    id: string;
    amount: number;
    type: string;
    description: string;
    created_at: string;
    status: string;
}

// ===================================================
// COMPOSANT PRINCIPAL
// ===================================================

const UserWalletCard: React.FC<UserWalletCardProps> = ({ compact = false }) => {
    const { user } = useAuth();
    const [wallet, setWallet] = useState<WalletInfo | null>(null);
    const [card, setCard] = useState<VirtualCard | null>(null);
    const [transactions, setTransactions] = useState<Transaction[]>([]);
    const [loading, setLoading] = useState(true);
    const [showBalance, setShowBalance] = useState(false);

    // ===================================================
    // CHARGEMENT DES DONNÉES
    // ===================================================

    useEffect(() => {
        if (user?.id) {
            loadUserData();
        }
    }, [user]);

    const loadUserData = async () => {
        if (!user?.id) return;

        setLoading(true);
        try {
            const [walletData, cardData, transactionData] = await Promise.all([
                WalletTransactionService.getUserWallet(user.id),
                VirtualCardService.getUserCard(user.id),
                WalletTransactionService.getTransactionHistory(user.id)
            ]);

            if (walletData) setWallet(walletData);
            if (cardData) setCard(cardData);
            if (transactionData) setTransactions(transactionData.slice(0, 5)); // 5 dernières

        } catch (error) {
            console.error('Erreur chargement données utilisateur:', error);
            toast.error('Impossible de charger vos données');
        } finally {
            setLoading(false);
        }
    };

    // ===================================================
    // ACTIONS UTILISATEUR
    // ===================================================

    const formatAmount = (amount: number): string => {
        return new Intl.NumberFormat('fr-CM', {
            style: 'currency',
            currency: 'XAF',
            minimumFractionDigits: 0
        }).format(amount);
    };

    const getTransactionIcon = (type: string) => {
        const icons = {
            'deposit': ArrowDownLeft,
            'withdrawal': ArrowUpRight,
            'transfer': Send,
            'payment': CreditCard
        };
        return icons[type as keyof typeof icons] || Send;
    };

    const getStatusColor = (status: string) => {
        const colors = {
            'completed': 'text-green-600',
            'pending': 'text-yellow-600',
            'failed': 'text-red-600'
        };
        return colors[status as keyof typeof colors] || 'text-gray-600';
    };

    // ===================================================
    // RENDU
    // ===================================================

    if (loading) {
        return (
            <Card className="w-full">
                <CardContent className="p-6">
                    <div className="animate-pulse space-y-4">
                        <div className="h-6 bg-gray-200 rounded w-1/2"></div>
                        <div className="h-8 bg-gray-200 rounded w-3/4"></div>
                        <div className="h-20 bg-gray-200 rounded"></div>
                    </div>
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
                            <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                                <Wallet className="w-5 h-5 text-blue-600" />
                            </div>
                            <div>
                                <p className="font-medium">Mon Wallet</p>
                                <p className="text-sm text-gray-500">
                                    {showBalance ? formatAmount(wallet?.balance || 0) : '••••••'}
                                </p>
                            </div>
                        </div>
                        <div className="flex items-center space-x-2">
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setShowBalance(!showBalance)}
                            >
                                {showBalance ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                            </Button>
                            <Button variant="outline" size="sm">
                                Gérer
                            </Button>
                        </div>
                    </div>
                </CardContent>
            </Card>
        );
    }

    return (
        <div className="space-y-6">

            {/* En-tête avec solde */}
            <Card className="w-full">
                <CardHeader>
                    <CardTitle className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                            <Wallet className="w-6 h-6 text-blue-600" />
                            <span>Mon Wallet 224Solutions</span>
                        </div>
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setShowBalance(!showBalance)}
                        >
                            {showBalance ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </Button>
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="text-center space-y-4">
                        <div>
                            <p className="text-sm text-gray-500 mb-2">Solde disponible</p>
                            <p className="text-3xl font-bold text-blue-600">
                                {showBalance ? formatAmount(wallet?.balance || 0) : '••••••••'}
                            </p>
                        </div>

                        {/* Actions rapides */}
                        <div className="flex justify-center space-x-4">
                            <Button variant="outline" size="sm">
                                <ArrowDownLeft className="w-4 h-4 mr-2" />
                                Recharger
                            </Button>
                            <Button variant="outline" size="sm">
                                <Send className="w-4 h-4 mr-2" />
                                Envoyer
                            </Button>
                            <Button variant="outline" size="sm">
                                <ArrowUpRight className="w-4 h-4 mr-2" />
                                Retirer
                            </Button>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Onglets */}
            <Tabs defaultValue="card" className="w-full">
                <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="card">Ma Carte Virtuelle</TabsTrigger>
                    <TabsTrigger value="transactions">Transactions</TabsTrigger>
                </TabsList>

                {/* Carte virtuelle */}
                <TabsContent value="card">
                    {card ? (
                        <VirtualCardDisplay
                            userId={user?.id}
                            showControls={false}
                            compact={false}
                        />
                    ) : (
                        <Card>
                            <CardContent className="p-6 text-center">
                                <CreditCard className="w-12 h-12 mx-auto text-gray-400 mb-4" />
                                <p className="text-gray-500 mb-2">Carte virtuelle en cours de création...</p>
                                <p className="text-xs text-gray-400">
                                    Votre carte sera disponible dans quelques instants
                                </p>
                                <Button
                                    variant="outline"
                                    onClick={loadUserData}
                                    className="mt-4"
                                >
                                    <RefreshCw className="w-4 h-4 mr-2" />
                                    Actualiser
                                </Button>
                            </CardContent>
                        </Card>
                    )}
                </TabsContent>

                {/* Transactions */}
                <TabsContent value="transactions">
                    <Card>
                        <CardHeader>
                            <CardTitle className="text-lg">Dernières transactions</CardTitle>
                        </CardHeader>
                        <CardContent>
                            {transactions.length > 0 ? (
                                <div className="space-y-3">
                                    {transactions.map((tx) => {
                                        const IconComponent = getTransactionIcon(tx.type);
                                        return (
                                            <div key={tx.id} className="flex items-center justify-between p-3 border rounded-lg">
                                                <div className="flex items-center space-x-3">
                                                    <div className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center">
                                                        <IconComponent className="w-4 h-4 text-gray-600" />
                                                    </div>
                                                    <div>
                                                        <p className="font-medium text-sm">{tx.description || tx.type}</p>
                                                        <p className="text-xs text-gray-500">
                                                            {new Date(tx.created_at).toLocaleDateString('fr-FR')}
                                                        </p>
                                                    </div>
                                                </div>
                                                <div className="text-right">
                                                    <p className={`font-medium ${getStatusColor(tx.status)}`}>
                                                        {tx.type === 'deposit' ? '+' : '-'}{formatAmount(Math.abs(tx.amount))}
                                                    </p>
                                                    <Badge
                                                        variant={tx.status === 'completed' ? 'default' : 'secondary'}
                                                        className="text-xs"
                                                    >
                                                        {tx.status}
                                                    </Badge>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            ) : (
                                <div className="text-center py-8">
                                    <Send className="w-12 h-12 mx-auto text-gray-400 mb-4" />
                                    <p className="text-gray-500">Aucune transaction récente</p>
                                    <p className="text-xs text-gray-400">
                                        Vos transactions apparaîtront ici
                                    </p>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </TabsContent>

            </Tabs>

            {/* Informations sécurité */}
            <Card className="border-green-200 bg-green-50">
                <CardContent className="p-4">
                    <div className="flex items-center space-x-2">
                        <Shield className="w-5 h-5 text-green-600" />
                        <div>
                            <p className="text-sm font-medium text-green-800">
                                Votre compte est sécurisé
                            </p>
                            <p className="text-xs text-green-600">
                                Wallet et carte virtuelle protégés par chiffrement avancé
                            </p>
                        </div>
                    </div>
                </CardContent>
            </Card>

        </div>
    );
};

export default UserWalletCard;
