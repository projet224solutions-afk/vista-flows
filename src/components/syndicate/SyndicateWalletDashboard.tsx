/**
 * DASHBOARD WALLET BUREAU SYNDICAT
 * Interface complète pour la gestion financière du bureau
 * 224Solutions - Syndicate Wallet Management
 */

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
    Wallet,
    DollarSign,
    TrendingUp,
    TrendingDown,
    ArrowUpRight,
    ArrowDownLeft,
    Plus,
    Minus,
    RefreshCw,
    Eye,
    Download,
    Calendar,
    Users,
    Receipt,
    CreditCard,
    Banknote,
    HandCoins,
    PiggyBank,
    Activity,
    BarChart3,
    Filter,
    Search
} from "lucide-react";
import { toast } from "sonner";

interface WalletTransaction {
    id: string;
    type: 'deposit' | 'withdraw' | 'transfer' | 'cotisation' | 'salary' | 'bonus' | 'fine';
    amount: number;
    description: string;
    from_user?: string;
    to_user?: string;
    status: 'completed' | 'pending' | 'failed';
    created_at: string;
    reference?: string;
}

interface SyndicateWalletData {
    syndicate_id: string;
    balance: number;
    currency: string;
    total_income: number;
    total_expenses: number;
    monthly_cotisations: number;
    pending_transactions: number;
    recent_transactions: WalletTransaction[];
}

interface SyndicateWalletDashboardProps {
    syndicateId: string;
    bureauName?: string;
}

export default function SyndicateWalletDashboard({ syndicateId, bureauName }: SyndicateWalletDashboardProps) {
    const [walletData, setWalletData] = useState<SyndicateWalletData | null>(null);
    const [loading, setLoading] = useState(true);
    const [showAddTransaction, setShowAddTransaction] = useState(false);
    const [transactionFilter, setTransactionFilter] = useState('all');
    const [searchTerm, setSearchTerm] = useState('');
    
    const [newTransaction, setNewTransaction] = useState({
        type: 'cotisation' as const,
        amount: 0,
        description: '',
        member_id: ''
    });

    useEffect(() => {
        loadWalletData();
        // Actualiser toutes les 30 secondes
        const interval = setInterval(loadWalletData, 30000);
        return () => clearInterval(interval);
    }, [syndicateId]);

    /**
     * Charge les données du wallet
     */
    const loadWalletData = async () => {
        try {
            setLoading(true);
            
            // Simulation de données (à remplacer par vraie API)
            const mockData: SyndicateWalletData = {
                syndicate_id: syndicateId,
                balance: 0,
                currency: 'GNF',
                total_income: 0,
                total_expenses: 0,
                monthly_cotisations: 0,
                pending_transactions: 0,
                recent_transactions: [
                    {
                        id: '1',
                        type: 'cotisation',
                        amount: 5000,
                        description: 'Cotisation mensuelle - Amadou Ba',
                        status: 'completed',
                        created_at: '2025-01-02T10:30:00Z',
                        reference: 'COT-2025-001'
                    },
                    {
                        id: '2',
                        type: 'salary',
                        amount: 25000,
                        description: 'Salaire secrétaire - Janvier 2025',
                        status: 'completed',
                        created_at: '2025-01-01T09:00:00Z',
                        reference: 'SAL-2025-001'
                    },
                    {
                        id: '3',
                        type: 'fine',
                        amount: 2000,
                        description: 'Amende retard - Fatou Diallo',
                        status: 'pending',
                        created_at: '2024-12-30T16:45:00Z',
                        reference: 'FIN-2024-012'
                    },
                    {
                        id: '4',
                        type: 'deposit',
                        amount: 50000,
                        description: 'Dépôt initial bureau',
                        status: 'completed',
                        created_at: '2024-12-28T14:20:00Z',
                        reference: 'DEP-2024-001'
                    }
                ]
            };

            setWalletData(mockData);
            
        } catch (error) {
            console.error('Erreur chargement wallet:', error);
            toast.error('Erreur lors du chargement du wallet');
        } finally {
            setLoading(false);
        }
    };

    /**
     * Ajoute une nouvelle transaction
     */
    const addTransaction = async () => {
        if (!newTransaction.amount || !newTransaction.description) {
            toast.error('Veuillez remplir tous les champs');
            return;
        }

        try {
            // Simulation d'ajout de transaction
            const transaction: WalletTransaction = {
                id: Date.now().toString(),
                type: newTransaction.type,
                amount: newTransaction.amount,
                description: newTransaction.description,
                status: 'completed',
                created_at: new Date().toISOString(),
                reference: `${newTransaction.type.toUpperCase()}-2025-${Math.floor(Math.random() * 1000).toString().padStart(3, '0')}`
            };

            if (walletData) {
                const updatedTransactions = [transaction, ...walletData.recent_transactions];
                const balanceChange = ['deposit', 'cotisation', 'bonus'].includes(newTransaction.type) 
                    ? newTransaction.amount 
                    : -newTransaction.amount;

                setWalletData({
                    ...walletData,
                    balance: walletData.balance + balanceChange,
                    recent_transactions: updatedTransactions.slice(0, 20)
                });
            }

            // Réinitialiser le formulaire
            setNewTransaction({
                type: 'cotisation',
                amount: 0,
                description: '',
                member_id: ''
            });

            setShowAddTransaction(false);
            toast.success('Transaction ajoutée avec succès !');

        } catch (error) {
            console.error('Erreur ajout transaction:', error);
            toast.error('Erreur lors de l\'ajout de la transaction');
        }
    };

    /**
     * Filtre les transactions
     */
    const filteredTransactions = walletData?.recent_transactions.filter(transaction => {
        const matchesFilter = transactionFilter === 'all' || transaction.type === transactionFilter;
        const matchesSearch = transaction.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
                             transaction.reference?.toLowerCase().includes(searchTerm.toLowerCase());
        return matchesFilter && matchesSearch;
    }) || [];

    /**
     * Obtient la couleur du type de transaction
     */
    const getTransactionColor = (type: string) => {
        switch (type) {
            case 'cotisation': return 'bg-green-100 text-green-800 border-green-200';
            case 'salary': return 'bg-blue-100 text-blue-800 border-blue-200';
            case 'bonus': return 'bg-purple-100 text-purple-800 border-purple-200';
            case 'fine': return 'bg-red-100 text-red-800 border-red-200';
            case 'deposit': return 'bg-teal-100 text-teal-800 border-teal-200';
            case 'withdraw': return 'bg-orange-100 text-orange-800 border-orange-200';
            default: return 'bg-gray-100 text-gray-800 border-gray-200';
        }
    };

    /**
     * Obtient le libellé du type de transaction
     */
    const getTransactionLabel = (type: string) => {
        switch (type) {
            case 'cotisation': return 'Cotisation';
            case 'salary': return 'Salaire';
            case 'bonus': return 'Bonus';
            case 'fine': return 'Amende';
            case 'deposit': return 'Dépôt';
            case 'withdraw': return 'Retrait';
            case 'transfer': return 'Transfert';
            default: return type;
        }
    };

    /**
     * Formate la date
     */
    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleDateString('fr-FR', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    if (loading) {
        return (
            <Card className="border-0 shadow-xl rounded-2xl">
                <CardContent className="p-12 text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-4 border-blue-600 mx-auto mb-6"></div>
                    <h3 className="text-xl font-semibold text-gray-800 mb-2">Chargement du wallet...</h3>
                    <p className="text-gray-600">Synchronisation des données financières</p>
                </CardContent>
            </Card>
        );
    }

    if (!walletData) {
        return (
            <Card className="border-0 shadow-xl rounded-2xl">
                <CardContent className="p-12 text-center">
                    <Wallet className="w-16 h-16 mx-auto mb-4 text-gray-300" />
                    <h3 className="text-xl font-semibold text-gray-600 mb-2">Wallet non disponible</h3>
                    <p className="text-gray-500">Impossible de charger les données du wallet</p>
                </CardContent>
            </Card>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header avec solde principal */}
            <Card className="border-0 shadow-xl rounded-2xl bg-gradient-to-r from-blue-600 to-purple-600 text-white">
                <CardContent className="p-8">
                    <div className="flex items-center justify-between">
                        <div>
                            <h2 className="text-2xl font-bold mb-2 flex items-center gap-3">
                                <Wallet className="w-8 h-8" />
                                Wallet Bureau Syndicat
                            </h2>
                            <p className="text-blue-100">{bureauName || `Bureau ${syndicateId}`}</p>
                        </div>
                        <div className="text-right">
                            <p className="text-blue-100 text-sm">Solde Actuel</p>
                            <p className="text-4xl font-bold">
                                {walletData.balance.toLocaleString()} {walletData.currency}
                            </p>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Statistiques financières */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <Card className="border-0 shadow-lg bg-gradient-to-br from-green-500 to-green-600 text-white">
                    <CardContent className="p-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-green-100 text-sm font-medium">Revenus Totaux</p>
                                <p className="text-2xl font-bold">
                                    {walletData.total_income.toLocaleString()}
                                </p>
                                <p className="text-green-100 text-xs">{walletData.currency}</p>
                            </div>
                            <TrendingUp className="w-10 h-10 text-green-200" />
                        </div>
                    </CardContent>
                </Card>

                <Card className="border-0 shadow-lg bg-gradient-to-br from-red-500 to-red-600 text-white">
                    <CardContent className="p-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-red-100 text-sm font-medium">Dépenses Totales</p>
                                <p className="text-2xl font-bold">
                                    {walletData.total_expenses.toLocaleString()}
                                </p>
                                <p className="text-red-100 text-xs">{walletData.currency}</p>
                            </div>
                            <TrendingDown className="w-10 h-10 text-red-200" />
                        </div>
                    </CardContent>
                </Card>

                <Card className="border-0 shadow-lg bg-gradient-to-br from-purple-500 to-purple-600 text-white">
                    <CardContent className="p-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-purple-100 text-sm font-medium">Cotisations Mois</p>
                                <p className="text-2xl font-bold">
                                    {walletData.monthly_cotisations.toLocaleString()}
                                </p>
                                <p className="text-purple-100 text-xs">{walletData.currency}</p>
                            </div>
                            <HandCoins className="w-10 h-10 text-purple-200" />
                        </div>
                    </CardContent>
                </Card>

                <Card className="border-0 shadow-lg bg-gradient-to-br from-orange-500 to-orange-600 text-white">
                    <CardContent className="p-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-orange-100 text-sm font-medium">En Attente</p>
                                <p className="text-2xl font-bold">{walletData.pending_transactions}</p>
                                <p className="text-orange-100 text-xs">transactions</p>
                            </div>
                            <Activity className="w-10 h-10 text-orange-200" />
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Actions rapides */}
            <div className="flex gap-4">
                <Dialog open={showAddTransaction} onOpenChange={setShowAddTransaction}>
                    <DialogTrigger asChild>
                        <Button className="bg-gradient-to-r from-green-600 to-blue-600 hover:from-green-700 hover:to-blue-700 rounded-xl shadow-lg">
                            <Plus className="w-4 h-4 mr-2" />
                            Nouvelle Transaction
                        </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-md rounded-2xl">
                        <DialogHeader>
                            <DialogTitle className="text-xl font-bold text-gray-800">
                                Nouvelle Transaction
                            </DialogTitle>
                        </DialogHeader>
                        <div className="space-y-4 p-2">
                            <div>
                                <Label htmlFor="transaction_type">Type de Transaction</Label>
                                <Select 
                                    value={newTransaction.type} 
                                    onValueChange={(value: unknown) => setNewTransaction(prev => ({ ...prev, type: value }))}
                                >
                                    <SelectTrigger className="rounded-xl">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="cotisation">Cotisation</SelectItem>
                                        <SelectItem value="salary">Salaire</SelectItem>
                                        <SelectItem value="bonus">Bonus</SelectItem>
                                        <SelectItem value="fine">Amende</SelectItem>
                                        <SelectItem value="deposit">Dépôt</SelectItem>
                                        <SelectItem value="withdraw">Retrait</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            
                            <div>
                                <Label htmlFor="amount">Montant ({walletData.currency})</Label>
                                <Input
                                    id="amount"
                                    type="number"
                                    value={newTransaction.amount || ''}
                                    onChange={(e) => setNewTransaction(prev => ({ ...prev, amount: Number(e.target.value) }))}
                                    placeholder="0"
                                    className="rounded-xl"
                                />
                            </div>
                            
                            <div>
                                <Label htmlFor="description">Description</Label>
                                <Input
                                    id="description"
                                    value={newTransaction.description}
                                    onChange={(e) => setNewTransaction(prev => ({ ...prev, description: e.target.value }))}
                                    placeholder="Description de la transaction"
                                    className="rounded-xl"
                                />
                            </div>
                            
                            <div className="flex gap-3 pt-4">
                                <Button onClick={addTransaction} className="flex-1 rounded-xl">
                                    <Plus className="w-4 h-4 mr-2" />
                                    Ajouter
                                </Button>
                                <Button variant="outline" onClick={() => setShowAddTransaction(false)} className="flex-1 rounded-xl">
                                    Annuler
                                </Button>
                            </div>
                        </div>
                    </DialogContent>
                </Dialog>

                <Button
                    onClick={loadWalletData}
                    variant="outline"
                    className="border-blue-200 text-blue-600 hover:bg-blue-50 rounded-xl"
                >
                    <RefreshCw className="w-4 h-4 mr-2" />
                    Actualiser
                </Button>

                <Button
                    variant="outline"
                    className="border-purple-200 text-purple-600 hover:bg-purple-50 rounded-xl"
                >
                    <Download className="w-4 h-4 mr-2" />
                    Exporter
                </Button>
            </div>

            {/* Historique des transactions */}
            <Card className="border-0 shadow-xl rounded-2xl">
                <CardHeader className="bg-gradient-to-r from-gray-50 to-blue-50 rounded-t-2xl">
                    <div className="flex items-center justify-between">
                        <CardTitle className="text-xl font-bold text-gray-800 flex items-center gap-2">
                            <Receipt className="w-5 h-5" />
                            Historique des Transactions
                        </CardTitle>
                        <div className="flex gap-3">
                            <div className="relative">
                                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                                <Input
                                    placeholder="Rechercher..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    className="pl-10 w-64 rounded-xl border-gray-200"
                                />
                            </div>
                            <Select value={transactionFilter} onValueChange={setTransactionFilter}>
                                <SelectTrigger className="w-48 rounded-xl">
                                    <Filter className="w-4 h-4 mr-2" />
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">Toutes les transactions</SelectItem>
                                    <SelectItem value="cotisation">Cotisations</SelectItem>
                                    <SelectItem value="salary">Salaires</SelectItem>
                                    <SelectItem value="bonus">Bonus</SelectItem>
                                    <SelectItem value="fine">Amendes</SelectItem>
                                    <SelectItem value="deposit">Dépôts</SelectItem>
                                    <SelectItem value="withdraw">Retraits</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                </CardHeader>
                <CardContent className="p-0">
                    <div className="overflow-x-auto">
                        <Table>
                            <TableHeader className="bg-gray-50">
                                <TableRow>
                                    <TableHead className="font-bold text-gray-800">Type</TableHead>
                                    <TableHead className="font-bold text-gray-800">Description</TableHead>
                                    <TableHead className="font-bold text-gray-800">Montant</TableHead>
                                    <TableHead className="font-bold text-gray-800">Statut</TableHead>
                                    <TableHead className="font-bold text-gray-800">Date</TableHead>
                                    <TableHead className="font-bold text-gray-800">Référence</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {filteredTransactions.map((transaction) => (
                                    <TableRow key={transaction.id} className="hover:bg-gray-50">
                                        <TableCell>
                                            <Badge className={`${getTransactionColor(transaction.type)} font-semibold`}>
                                                {getTransactionLabel(transaction.type)}
                                            </Badge>
                                        </TableCell>
                                        <TableCell>
                                            <div>
                                                <p className="font-medium text-gray-800">{transaction.description}</p>
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <div className="flex items-center gap-2">
                                                {['deposit', 'cotisation', 'bonus'].includes(transaction.type) ? (
                                                    <ArrowUpRight className="w-4 h-4 text-green-600" />
                                                ) : (
                                                    <ArrowDownLeft className="w-4 h-4 text-red-600" />
                                                )}
                                                <span className={`font-bold ${
                                                    ['deposit', 'cotisation', 'bonus'].includes(transaction.type) 
                                                        ? 'text-green-600' 
                                                        : 'text-red-600'
                                                }`}>
                                                    {['deposit', 'cotisation', 'bonus'].includes(transaction.type) ? '+' : '-'}
                                                    {transaction.amount.toLocaleString()} {walletData.currency}
                                                </span>
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <Badge className={
                                                transaction.status === 'completed' ? 'bg-green-100 text-green-800' :
                                                transaction.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                                                'bg-red-100 text-red-800'
                                            }>
                                                {transaction.status === 'completed' ? 'Terminé' :
                                                 transaction.status === 'pending' ? 'En attente' : 'Échoué'}
                                            </Badge>
                                        </TableCell>
                                        <TableCell>
                                            <span className="text-sm text-gray-600">
                                                {formatDate(transaction.created_at)}
                                            </span>
                                        </TableCell>
                                        <TableCell>
                                            <code className="bg-gray-100 px-2 py-1 rounded text-xs">
                                                {transaction.reference}
                                            </code>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </div>
                    
                    {filteredTransactions.length === 0 && (
                        <div className="text-center py-12">
                            <Receipt className="w-16 h-16 mx-auto mb-4 text-gray-300" />
                            <h3 className="text-lg font-semibold text-gray-600 mb-2">Aucune transaction trouvée</h3>
                            <p className="text-gray-500">Aucune transaction ne correspond à vos critères.</p>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
