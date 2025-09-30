/**
 * Gestion des transactions - Tableau de bord Wallet
 * 
 * @author 224SOLUTIONS
 * @version 1.0.0
 */

import React, { useState } from 'react';
import {
    Card, CardContent, CardHeader, CardTitle, CardDescription
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
    Table, TableBody, TableCell, TableHead, TableHeader, TableRow
} from "@/components/ui/table";
import {
    Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from "@/components/ui/select";
import {
    Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger
} from "@/components/ui/dialog";
import { Eye, Search, Filter, Download, RefreshCw } from "lucide-react";
import WalletTransactionService from '@/services/walletTransactionService';

// ===================================================
// TYPES
// ===================================================

interface TransactionFilter {
    status?: string;
    type?: string;
    service?: string;
    date_range?: string;
    amount_min?: number;
    amount_max?: number;
    search?: string;
}

// ===================================================
// COMPOSANT
// ===================================================

const WalletTransactions: React.FC = () => {
    const [filter, setFilter] = useState<TransactionFilter>({});
    const [selectedTransaction, setSelectedTransaction] = useState<any>(null);
    const [loading, setLoading] = useState(false);

    const formatCurrency = (amount: number) => WalletTransactionService.formatAmount(amount);

    const getStatusBadge = (status: string) => {
        const statusConfig = {
            completed: { color: 'bg-green-100 text-green-800', label: 'Complété' },
            pending: { color: 'bg-yellow-100 text-yellow-800', label: 'En attente' },
            processing: { color: 'bg-blue-100 text-blue-800', label: 'En cours' },
            failed: { color: 'bg-red-100 text-red-800', label: 'Échoué' },
            cancelled: { color: 'bg-gray-100 text-gray-800', label: 'Annulé' },
            refunded: { color: 'bg-purple-100 text-purple-800', label: 'Remboursé' },
            disputed: { color: 'bg-orange-100 text-orange-800', label: 'Contesté' }
        };

        const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.pending;
        return <Badge className={config.color}>{config.label}</Badge>;
    };

    const getRiskBadge = (score: number) => {
        if (score >= 80) return <Badge className="bg-red-100 text-red-800">Critique</Badge>;
        if (score >= 60) return <Badge className="bg-orange-100 text-orange-800">Élevé</Badge>;
        if (score >= 30) return <Badge className="bg-yellow-100 text-yellow-800">Moyen</Badge>;
        return <Badge className="bg-green-100 text-green-800">Faible</Badge>;
    };

    const getTransactionIcon = (type: string) => {
        switch (type) {
            case 'transfer': return '↔️';
            case 'deposit': return '⬇️';
            case 'withdrawal': return '⬆️';
            case 'payment': return '💳';
            case 'refund': return '↩️';
            default: return '💰';
        }
    };

    // Données simulées étendues
    const mockTransactions = Array.from({ length: 50 }, (_, i) => ({
        id: `tx_${i + 1}`,
        transaction_id: `224TXN${new Date().getFullYear()}${String(Date.now() + i).slice(-6)}`,
        sender_email: `user_${i + 1}@224solutions.cm`,
        receiver_email: `merchant_${Math.floor(i / 3) + 1}@224solutions.cm`,
        amount: 50000 + i * 75000 + Math.random() * 500000,
        fee: 0,
        transaction_type: ['transfer', 'deposit', 'withdrawal', 'payment', 'refund'][i % 5],
        status: ['completed', 'pending', 'processing', 'failed', 'cancelled'][i % 5],
        api_service: ['orange_money', 'mtn_momo', 'visa', 'mastercard', 'bank_transfer'][i % 5],
        fraud_score: Math.floor(Math.random() * 100),
        reference_id: `REF${Date.now() + i}`,
        created_at: new Date(Date.now() - i * 1800000).toISOString(),
        description: `Transaction ${i + 1} - Paiement de service`,
        ip_address: `192.168.${Math.floor(i / 10)}.${i % 100}`,
        device_info: {
            platform: ['iOS', 'Android', 'Web'][i % 3],
            user_agent: 'Mobile App 224Solutions'
        }
    }));

    // Appliquer les filtres
    const filteredTransactions = mockTransactions.filter(tx => {
        if (filter.status && filter.status !== 'all' && tx.status !== filter.status) return false;
        if (filter.type && filter.type !== 'all' && tx.transaction_type !== filter.type) return false;
        if (filter.service && filter.service !== 'all' && tx.api_service !== filter.service) return false;
        if (filter.amount_min && tx.amount < filter.amount_min) return false;
        if (filter.amount_max && tx.amount > filter.amount_max) return false;
        if (filter.search) {
            const searchLower = filter.search.toLowerCase();
            return (
                tx.transaction_id.toLowerCase().includes(searchLower) ||
                tx.sender_email.toLowerCase().includes(searchLower) ||
                tx.receiver_email.toLowerCase().includes(searchLower) ||
                tx.reference_id?.toLowerCase().includes(searchLower)
            );
        }
        return true;
    });

    const handleExport = () => {
        // Logique d'export
        console.log('Export des transactions filtrées');
    };

    return (
        <div className="space-y-6">

            {/* Filtres de recherche */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center space-x-2">
                        <Filter className="w-5 h-5" />
                        <span>Filtres de recherche</span>
                    </CardTitle>
                    <CardDescription>
                        Filtrer et rechercher dans les transactions
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">

                        <div className="space-y-2">
                            <Label>Recherche</Label>
                            <div className="relative">
                                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                                <Input
                                    placeholder="ID, email, référence..."
                                    className="pl-10"
                                    value={filter.search || ''}
                                    onChange={(e) => setFilter({ ...filter, search: e.target.value })}
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label>Statut</Label>
                            <Select
                                value={filter.status || 'all'}
                                onValueChange={(value) => setFilter({ ...filter, status: value })}
                            >
                                <SelectTrigger>
                                    <SelectValue placeholder="Tous les statuts" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">Tous les statuts</SelectItem>
                                    <SelectItem value="completed">Complété</SelectItem>
                                    <SelectItem value="pending">En attente</SelectItem>
                                    <SelectItem value="processing">En cours</SelectItem>
                                    <SelectItem value="failed">Échoué</SelectItem>
                                    <SelectItem value="cancelled">Annulé</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="space-y-2">
                            <Label>Type</Label>
                            <Select
                                value={filter.type || 'all'}
                                onValueChange={(value) => setFilter({ ...filter, type: value })}
                            >
                                <SelectTrigger>
                                    <SelectValue placeholder="Tous les types" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">Tous les types</SelectItem>
                                    <SelectItem value="transfer">Transfert</SelectItem>
                                    <SelectItem value="deposit">Dépôt</SelectItem>
                                    <SelectItem value="withdrawal">Retrait</SelectItem>
                                    <SelectItem value="payment">Paiement</SelectItem>
                                    <SelectItem value="refund">Remboursement</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="space-y-2">
                            <Label>Service</Label>
                            <Select
                                value={filter.service || 'all'}
                                onValueChange={(value) => setFilter({ ...filter, service: value })}
                            >
                                <SelectTrigger>
                                    <SelectValue placeholder="Tous les services" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">Tous les services</SelectItem>
                                    <SelectItem value="orange_money">Orange Money</SelectItem>
                                    <SelectItem value="mtn_momo">MTN MoMo</SelectItem>
                                    <SelectItem value="visa">Visa</SelectItem>
                                    <SelectItem value="mastercard">Mastercard</SelectItem>
                                    <SelectItem value="bank_transfer">Virement bancaire</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="space-y-2">
                            <Label>Montant minimum</Label>
                            <Input
                                type="number"
                                placeholder="0"
                                value={filter.amount_min || ''}
                                onChange={(e) => setFilter({ ...filter, amount_min: parseFloat(e.target.value) || undefined })}
                            />
                        </div>

                        <div className="space-y-2">
                            <Label>Montant maximum</Label>
                            <Input
                                type="number"
                                placeholder="Illimité"
                                value={filter.amount_max || ''}
                                onChange={(e) => setFilter({ ...filter, amount_max: parseFloat(e.target.value) || undefined })}
                            />
                        </div>

                        <div className="space-y-2">
                            <Label>Actions</Label>
                            <div className="flex space-x-2">
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => setFilter({})}
                                    className="flex-1"
                                >
                                    Réinitialiser
                                </Button>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={handleExport}
                                    className="flex-1"
                                >
                                    <Download className="w-4 h-4 mr-1" />
                                    Export
                                </Button>
                            </div>
                        </div>

                    </div>
                </CardContent>
            </Card>

            {/* Résultats */}
            <Card>
                <CardHeader>
                    <div className="flex justify-between items-center">
                        <div>
                            <CardTitle>Transactions ({filteredTransactions.length})</CardTitle>
                            <CardDescription>
                                {filteredTransactions.length} transaction(s) trouvée(s)
                            </CardDescription>
                        </div>
                        <Button variant="outline" size="sm" onClick={() => setLoading(!loading)}>
                            <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                            Actualiser
                        </Button>
                    </div>
                </CardHeader>
                <CardContent>
                    <div className="rounded-md border">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>ID</TableHead>
                                    <TableHead>Type</TableHead>
                                    <TableHead>Expéditeur</TableHead>
                                    <TableHead>Destinataire</TableHead>
                                    <TableHead>Montant</TableHead>
                                    <TableHead>Service</TableHead>
                                    <TableHead>Statut</TableHead>
                                    <TableHead>Risque</TableHead>
                                    <TableHead>Date</TableHead>
                                    <TableHead>Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {filteredTransactions.slice(0, 20).map((transaction) => (
                                    <TableRow key={transaction.id}>
                                        <TableCell className="font-mono text-xs">
                                            {transaction.transaction_id}
                                        </TableCell>
                                        <TableCell>
                                            <div className="flex items-center space-x-2">
                                                <span>{getTransactionIcon(transaction.transaction_type)}</span>
                                                <Badge variant="outline" className="text-xs">
                                                    {transaction.transaction_type}
                                                </Badge>
                                            </div>
                                        </TableCell>
                                        <TableCell className="text-xs">
                                            {transaction.sender_email}
                                        </TableCell>
                                        <TableCell className="text-xs">
                                            {transaction.receiver_email}
                                        </TableCell>
                                        <TableCell className="font-medium">
                                            {formatCurrency(transaction.amount)}
                                        </TableCell>
                                        <TableCell>
                                            <Badge variant="secondary" className="text-xs">
                                                {transaction.api_service?.replace('_', ' ').toUpperCase()}
                                            </Badge>
                                        </TableCell>
                                        <TableCell>
                                            {getStatusBadge(transaction.status)}
                                        </TableCell>
                                        <TableCell>
                                            {getRiskBadge(transaction.fraud_score)}
                                        </TableCell>
                                        <TableCell className="text-xs">
                                            {new Date(transaction.created_at).toLocaleString('fr-FR')}
                                        </TableCell>
                                        <TableCell>
                                            <Dialog>
                                                <DialogTrigger asChild>
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        onClick={() => setSelectedTransaction(transaction)}
                                                    >
                                                        <Eye className="w-4 h-4" />
                                                    </Button>
                                                </DialogTrigger>
                                                <DialogContent className="max-w-2xl">
                                                    <DialogHeader>
                                                        <DialogTitle>Détails de la transaction</DialogTitle>
                                                    </DialogHeader>
                                                    {selectedTransaction && (
                                                        <div className="space-y-4">
                                                            <div className="grid grid-cols-2 gap-4">
                                                                <div>
                                                                    <Label>ID Transaction</Label>
                                                                    <p className="font-mono text-sm">{selectedTransaction.transaction_id}</p>
                                                                </div>
                                                                <div>
                                                                    <Label>Référence</Label>
                                                                    <p className="font-mono text-sm">{selectedTransaction.reference_id}</p>
                                                                </div>
                                                                <div>
                                                                    <Label>Montant</Label>
                                                                    <p className="font-medium">{formatCurrency(selectedTransaction.amount)}</p>
                                                                </div>
                                                                <div>
                                                                    <Label>Commission</Label>
                                                                    <p>{formatCurrency(selectedTransaction.fee)}</p>
                                                                </div>
                                                                <div>
                                                                    <Label>Statut</Label>
                                                                    <div>{getStatusBadge(selectedTransaction.status)}</div>
                                                                </div>
                                                                <div>
                                                                    <Label>Score de fraude</Label>
                                                                    <div>{getRiskBadge(selectedTransaction.fraud_score)}</div>
                                                                </div>
                                                                <div>
                                                                    <Label>Adresse IP</Label>
                                                                    <p className="font-mono text-sm">{selectedTransaction.ip_address}</p>
                                                                </div>
                                                                <div>
                                                                    <Label>Plateforme</Label>
                                                                    <p className="text-sm">{selectedTransaction.device_info?.platform}</p>
                                                                </div>
                                                            </div>
                                                            <div>
                                                                <Label>Description</Label>
                                                                <p className="text-sm">{selectedTransaction.description}</p>
                                                            </div>
                                                            <div>
                                                                <Label>Date de création</Label>
                                                                <p className="text-sm">
                                                                    {new Date(selectedTransaction.created_at).toLocaleString('fr-FR')}
                                                                </p>
                                                            </div>
                                                        </div>
                                                    )}
                                                </DialogContent>
                                            </Dialog>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </div>

                    {filteredTransactions.length > 20 && (
                        <div className="mt-4 text-center">
                            <p className="text-sm text-muted-foreground">
                                Affichage de 20 sur {filteredTransactions.length} transactions
                            </p>
                            <Button variant="outline" size="sm" className="mt-2">
                                Charger plus
                            </Button>
                        </div>
                    )}
                </CardContent>
            </Card>

        </div>
    );
};

export default WalletTransactions;

