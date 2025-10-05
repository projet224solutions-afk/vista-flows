import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { MultiCurrencyTransferService, TransferRequest, TransferHistory, TransferLimits, TransferFees } from '@/services/MultiCurrencyTransferService';
import { Loader2, Send, History, TrendingUp, Shield, AlertCircle, CheckCircle, Clock } from 'lucide-react';

interface Currency {
    code: string;
    name: string;
    symbol: string;
}

interface ExchangeRate {
    fromCurrency: string;
    toCurrency: string;
    rate: number;
    lastUpdated: string;
}

export default function MultiCurrencyTransfer() {
    const { user } = useAuth();
    const { toast } = useToast();

    // États du formulaire
    const [receiverEmail, setReceiverEmail] = useState('');
    const [amount, setAmount] = useState('');
    const [currencySent, setCurrencySent] = useState('GNF');
    const [currencyReceived, setCurrencyReceived] = useState('GNF');
    const [description, setDescription] = useState('');
    const [reference, setReference] = useState('');

    // États des données
    const [currencies, setCurrencies] = useState<Currency[]>([]);
    const [exchangeRates, setExchangeRates] = useState<ExchangeRate[]>([]);
    const [transferHistory, setTransferHistory] = useState<TransferHistory[]>([]);
    const [limits, setLimits] = useState<TransferLimits | null>(null);
    const [fees, setFees] = useState<TransferFees | null>(null);

    // États de l'interface
    const [loading, setLoading] = useState(false);
    const [transferring, setTransferring] = useState(false);
    const [activeTab, setActiveTab] = useState('transfer');
    const [validationErrors, setValidationErrors] = useState<string[]>([]);

    // Charger les données initiales
    useEffect(() => {
        if (user) {
            loadInitialData();
        }
    }, [user]);

    // Charger les frais et limites quand les données changent
    useEffect(() => {
        if (amount && currencySent && user) {
            loadFeesAndLimits();
        }
    }, [amount, currencySent, user]);

    const loadInitialData = async () => {
        setLoading(true);
        try {
            const [currenciesData, ratesData, historyData] = await Promise.all([
                MultiCurrencyTransferService.getAvailableCurrencies(),
                MultiCurrencyTransferService.getExchangeRates(),
                MultiCurrencyTransferService.getTransferHistory(user!.id, 10)
            ]);

            setCurrencies(currenciesData);
            setExchangeRates(ratesData);
            setTransferHistory(historyData.transfers);
        } catch (error) {
            console.error('Error loading initial data:', error);
            toast({
                title: "Erreur",
                description: "Impossible de charger les données",
                variant: "destructive"
            });
        } finally {
            setLoading(false);
        }
    };

    const loadFeesAndLimits = async () => {
        if (!user || !amount || !currencySent) return;

        try {
            const [profile, feesData, limitsData] = await Promise.all([
                // Récupérer le profil pour le rôle
                fetch('/api/user/profile').then(res => res.json()),
                MultiCurrencyTransferService.calculateFees('client', parseFloat(amount), currencySent),
                MultiCurrencyTransferService.checkLimits(user.id, parseFloat(amount), currencySent)
            ]);

            setFees(feesData);
            setLimits(limitsData);
        } catch (error) {
            console.error('Error loading fees and limits:', error);
        }
    };

    const validateForm = (): boolean => {
        const errors: string[] = [];

        if (!receiverEmail) {
            errors.push('Email du destinataire requis');
        } else if (!MultiCurrencyTransferService.isValidEmail(receiverEmail)) {
            errors.push('Format d\'email invalide');
        }

        if (!amount) {
            errors.push('Montant requis');
        } else if (!MultiCurrencyTransferService.isValidAmount(parseFloat(amount))) {
            errors.push('Montant invalide (doit être entre 0.01 et 999,999,999.99)');
        }

        if (currencySent === currencyReceived) {
            setCurrencyReceived(currencySent);
        }

        setValidationErrors(errors);
        return errors.length === 0;
    };

    const handleTransfer = async () => {
        if (!validateForm() || !user) return;

        setTransferring(true);
        try {
            const transferRequest: TransferRequest = {
                receiverEmail,
                amount: parseFloat(amount),
                currencySent,
                currencyReceived: currencyReceived || currencySent,
                description: description || undefined,
                reference: reference || undefined
            };

            const result = await MultiCurrencyTransferService.performTransfer(transferRequest);

            if (result.success) {
                toast({
                    title: "Transfert réussi",
                    description: `${MultiCurrencyTransferService.formatAmount(result.amountSent!, result.currencySent!)} envoyé avec succès`,
                });

                // Réinitialiser le formulaire
                setReceiverEmail('');
                setAmount('');
                setDescription('');
                setReference('');
                setValidationErrors([]);

                // Recharger l'historique
                const historyData = await MultiCurrencyTransferService.getTransferHistory(user.id, 10);
                setTransferHistory(historyData.transfers);
            } else {
                toast({
                    title: "Erreur de transfert",
                    description: result.error || "Erreur inconnue",
                    variant: "destructive"
                });
            }
        } catch (error) {
            console.error('Error performing transfer:', error);
            toast({
                title: "Erreur",
                description: "Erreur lors du transfert",
                variant: "destructive"
            });
        } finally {
            setTransferring(false);
        }
    };

    const getExchangeRate = (from: string, to: string): number => {
        if (from === to) return 1;

        const rate = exchangeRates.find(r =>
            r.fromCurrency === from && r.toCurrency === to
        );

        return rate?.rate || 1;
    };

    const formatDate = (dateString: string): string => {
        return new Date(dateString).toLocaleString('fr-FR', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    const getStatusIcon = (status: string) => {
        switch (status) {
            case 'completed':
                return <CheckCircle className="h-4 w-4 text-green-500" />;
            case 'pending':
                return <Clock className="h-4 w-4 text-yellow-500" />;
            case 'failed':
                return <AlertCircle className="h-4 w-4 text-red-500" />;
            default:
                return <Clock className="h-4 w-4 text-gray-500" />;
        }
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'completed':
                return 'bg-green-100 text-green-800';
            case 'pending':
                return 'bg-yellow-100 text-yellow-800';
            case 'failed':
                return 'bg-red-100 text-red-800';
            default:
                return 'bg-gray-100 text-gray-800';
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center p-8">
                <Loader2 className="h-8 w-8 animate-spin" />
                <span className="ml-2">Chargement...</span>
            </div>
        );
    }

    return (
        <div className="max-w-6xl mx-auto p-6 space-y-6">
            <div className="text-center mb-8">
                <h1 className="text-3xl font-bold text-gray-900 mb-2">
                    💸 Transfert Multi-Devises
                </h1>
                <p className="text-gray-600">
                    Envoyez de l'argent dans n'importe quelle devise avec conversion automatique
                </p>
            </div>

            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                <TabsList className="grid w-full grid-cols-3">
                    <TabsTrigger value="transfer" className="flex items-center gap-2">
                        <Send className="h-4 w-4" />
                        Nouveau Transfert
                    </TabsTrigger>
                    <TabsTrigger value="history" className="flex items-center gap-2">
                        <History className="h-4 w-4" />
                        Historique
                    </TabsTrigger>
                    <TabsTrigger value="rates" className="flex items-center gap-2">
                        <TrendingUp className="h-4 w-4" />
                        Taux de Change
                    </TabsTrigger>
                </TabsList>

                <TabsContent value="transfer" className="space-y-6">
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        {/* Formulaire de transfert */}
                        <Card>
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <Send className="h-5 w-5" />
                                    Nouveau Transfert
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="space-y-2">
                                    <Label htmlFor="receiverEmail">Email du destinataire</Label>
                                    <Input
                                        id="receiverEmail"
                                        type="email"
                                        placeholder="destinataire@example.com"
                                        value={receiverEmail}
                                        onChange={(e) => setReceiverEmail(e.target.value)}
                                        className={validationErrors.includes('Email du destinataire requis') || validationErrors.includes('Format d\'email invalide') ? 'border-red-500' : ''}
                                    />
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label htmlFor="amount">Montant</Label>
                                        <Input
                                            id="amount"
                                            type="number"
                                            step="0.01"
                                            min="0.01"
                                            placeholder="0.00"
                                            value={amount}
                                            onChange={(e) => setAmount(e.target.value)}
                                            className={validationErrors.includes('Montant requis') || validationErrors.includes('Montant invalide') ? 'border-red-500' : ''}
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="currencySent">Devise</Label>
                                        <Select value={currencySent} onValueChange={setCurrencySent}>
                                            <SelectTrigger>
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {currencies.map((currency) => (
                                                    <SelectItem key={currency.code} value={currency.code}>
                                                        {currency.symbol} {currency.name}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="description">Description (optionnel)</Label>
                                    <Textarea
                                        id="description"
                                        placeholder="Motif du transfert..."
                                        value={description}
                                        onChange={(e) => setDescription(e.target.value)}
                                        rows={3}
                                    />
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="reference">Référence (optionnel)</Label>
                                    <Input
                                        id="reference"
                                        placeholder="Référence personnalisée"
                                        value={reference}
                                        onChange={(e) => setReference(e.target.value)}
                                    />
                                </div>

                                {validationErrors.length > 0 && (
                                    <Alert variant="destructive">
                                        <AlertCircle className="h-4 w-4" />
                                        <AlertDescription>
                                            <ul className="list-disc list-inside">
                                                {validationErrors.map((error, index) => (
                                                    <li key={index}>{error}</li>
                                                ))}
                                            </ul>
                                        </AlertDescription>
                                    </Alert>
                                )}

                                <Button
                                    onClick={handleTransfer}
                                    disabled={transferring || validationErrors.length > 0}
                                    className="w-full"
                                    size="lg"
                                >
                                    {transferring ? (
                                        <>
                                            <Loader2 className="h-4 w-4 animate-spin mr-2" />
                                            Transfert en cours...
                                        </>
                                    ) : (
                                        <>
                                            <Send className="h-4 w-4 mr-2" />
                                            Envoyer l'argent
                                        </>
                                    )}
                                </Button>
                            </CardContent>
                        </Card>

                        {/* Informations sur le transfert */}
                        <div className="space-y-4">
                            {/* Frais */}
                            {fees && (
                                <Card>
                                    <CardHeader>
                                        <CardTitle className="flex items-center gap-2">
                                            <Shield className="h-5 w-5" />
                                            Frais de Transfert
                                        </CardTitle>
                                    </CardHeader>
                                    <CardContent className="space-y-3">
                                        <div className="flex justify-between">
                                            <span>Montant:</span>
                                            <span>{MultiCurrencyTransferService.formatAmount(parseFloat(amount || '0'), currencySent)}</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span>Frais fixes:</span>
                                            <span>{MultiCurrencyTransferService.formatAmount(fees.feeFixed, currencySent)}</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span>Frais variables ({(fees.feePercentage * 100).toFixed(2)}%):</span>
                                            <span>{MultiCurrencyTransferService.formatAmount(fees.feeAmount - fees.feeFixed, currencySent)}</span>
                                        </div>
                                        <hr />
                                        <div className="flex justify-between font-semibold">
                                            <span>Total à débiter:</span>
                                            <span>{MultiCurrencyTransferService.formatAmount(fees.totalAmount, currencySent)}</span>
                                        </div>
                                    </CardContent>
                                </Card>
                            )}

                            {/* Limites */}
                            {limits && (
                                <Card>
                                    <CardHeader>
                                        <CardTitle className="flex items-center gap-2">
                                            <Shield className="h-5 w-5" />
                                            Limites Quotidiennes
                                        </CardTitle>
                                    </CardHeader>
                                    <CardContent className="space-y-3">
                                        <div className="space-y-2">
                                            <div className="flex justify-between text-sm">
                                                <span>Utilisé aujourd'hui:</span>
                                                <span>{MultiCurrencyTransferService.formatAmount(limits.dailyUsed, currencySent)}</span>
                                            </div>
                                            <Progress
                                                value={(limits.dailyUsed / limits.dailyLimit) * 100}
                                                className="h-2"
                                            />
                                            <div className="flex justify-between text-sm text-gray-600">
                                                <span>Limite:</span>
                                                <span>{MultiCurrencyTransferService.formatAmount(limits.dailyLimit, currencySent)}</span>
                                            </div>
                                        </div>

                                        <div className="space-y-2">
                                            <div className="flex justify-between text-sm">
                                                <span>Restant:</span>
                                                <span className={limits.dailyRemaining < parseFloat(amount || '0') ? 'text-red-600' : 'text-green-600'}>
                                                    {MultiCurrencyTransferService.formatAmount(limits.dailyRemaining, currencySent)}
                                                </span>
                                            </div>
                                        </div>

                                        {limits.canTransfer ? (
                                            <Badge className="bg-green-100 text-green-800">
                                                <CheckCircle className="h-3 w-3 mr-1" />
                                                Transfert autorisé
                                            </Badge>
                                        ) : (
                                            <Badge className="bg-red-100 text-red-800">
                                                <AlertCircle className="h-3 w-3 mr-1" />
                                                Limite dépassée
                                            </Badge>
                                        )}
                                    </CardContent>
                                </Card>
                            )}
                        </div>
                    </div>
                </TabsContent>

                <TabsContent value="history" className="space-y-6">
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <History className="h-5 w-5" />
                                Historique des Transferts
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            {transferHistory.length === 0 ? (
                                <div className="text-center py-8 text-gray-500">
                                    Aucun transfert trouvé
                                </div>
                            ) : (
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>ID Transaction</TableHead>
                                            <TableHead>Type</TableHead>
                                            <TableHead>Montant</TableHead>
                                            <TableHead>Statut</TableHead>
                                            <TableHead>Date</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {transferHistory.map((transfer) => (
                                            <TableRow key={transfer.id}>
                                                <TableCell className="font-mono text-sm">
                                                    {transfer.transactionId}
                                                </TableCell>
                                                <TableCell>
                                                    <Badge variant={transfer.isSent ? "default" : "secondary"}>
                                                        {transfer.isSent ? "Envoyé" : "Reçu"}
                                                    </Badge>
                                                </TableCell>
                                                <TableCell>
                                                    <div className="space-y-1">
                                                        <div className="font-semibold">
                                                            {MultiCurrencyTransferService.formatAmount(
                                                                transfer.isSent ? transfer.amountSent : transfer.amountReceived,
                                                                transfer.isSent ? transfer.currencySent : transfer.currencyReceived
                                                            )}
                                                        </div>
                                                        {transfer.isSent && transfer.currencySent !== transfer.currencyReceived && (
                                                            <div className="text-sm text-gray-500">
                                                                → {MultiCurrencyTransferService.formatAmount(transfer.amountReceived, transfer.currencyReceived)}
                                                            </div>
                                                        )}
                                                    </div>
                                                </TableCell>
                                                <TableCell>
                                                    <Badge className={getStatusColor(transfer.status)}>
                                                        {getStatusIcon(transfer.status)}
                                                        <span className="ml-1 capitalize">{transfer.status}</span>
                                                    </Badge>
                                                </TableCell>
                                                <TableCell className="text-sm text-gray-600">
                                                    {formatDate(transfer.createdAt)}
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            )}
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="rates" className="space-y-6">
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <TrendingUp className="h-5 w-5" />
                                Taux de Change Actuels
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            {exchangeRates.length === 0 ? (
                                <div className="text-center py-8 text-gray-500">
                                    Aucun taux de change disponible
                                </div>
                            ) : (
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                    {exchangeRates.slice(0, 12).map((rate, index) => (
                                        <div key={index} className="p-4 border rounded-lg">
                                            <div className="flex justify-between items-center mb-2">
                                                <span className="font-semibold">
                                                    {rate.fromCurrency} → {rate.toCurrency}
                                                </span>
                                                <Badge variant="outline">
                                                    {rate.rate.toFixed(4)}
                                                </Badge>
                                            </div>
                                            <div className="text-sm text-gray-600">
                                                Mis à jour: {formatDate(rate.lastUpdated)}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>
        </div>
    );
}
