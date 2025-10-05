/**
 * 💰 WALLET DASHBOARD - 224SOLUTIONS
 * Interface complète de gestion du portefeuille vendeur
 */

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  CreditCard,
  DollarSign,
  TrendingUp,
  ArrowRightLeft,
  Send,
  Download,
  Upload,
  Eye,
  EyeOff,
  Copy,
  QrCode,
  History,
  Settings,
  AlertTriangle,
  CheckCircle,
  RefreshCw
} from "lucide-react";
import { useWallet } from "@/hooks/useWallet";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { MultiCurrencyTransferService } from "@/services/MultiCurrencyTransferService";

export default function WalletDashboard() {
  const { user } = useAuth();
  const { wallet, loading: walletLoading, transactions, refetch, transferFunds } = useWallet();

  // Calculer les statistiques à partir des transactions
  const stats = {
    totalCredits: transactions.filter(t => t.status === 'completed' && t.amount > 0).reduce((sum, t) => sum + t.amount, 0),
    totalDebits: Math.abs(transactions.filter(t => t.status === 'completed' && t.amount < 0).reduce((sum, t) => sum + t.amount, 0)),
    totalTransactions: transactions.length
  };

  const [showBalance, setShowBalance] = useState(true);
  const [transferAmount, setTransferAmount] = useState('');
  const [transferEmail, setTransferEmail] = useState('');
  const [transferMessage, setTransferMessage] = useState('');
  const [transferCurrency, setTransferCurrency] = useState('GNF');
  const [availableCurrencies, setAvailableCurrencies] = useState([]);
  const [transferFees, setTransferFees] = useState(null);
  const [transferLimits, setTransferLimits] = useState(null);
  const [activeTab, setActiveTab] = useState('overview');

  const handleCopyAddress = () => {
    if (wallet?.id) {
      navigator.clipboard.writeText(wallet.id);
      toast.success('ID Wallet copié dans le presse-papiers');
    }
  };

  // Charger les devises disponibles
  useEffect(() => {
    const loadCurrencies = async () => {
      try {
        const currencies = await MultiCurrencyTransferService.getAvailableCurrencies();
        setAvailableCurrencies(currencies);
      } catch (error) {
        console.error('Error loading currencies:', error);
      }
    };
    loadCurrencies();
  }, []);

  // Calculer les frais et limites quand les données changent
  useEffect(() => {
    if (transferAmount && transferCurrency && user) {
      const calculateFeesAndLimits = async () => {
        try {
          const [fees, limits] = await Promise.all([
            MultiCurrencyTransferService.calculateFees('client', parseFloat(transferAmount), transferCurrency),
            MultiCurrencyTransferService.checkLimits(user.id, parseFloat(transferAmount), transferCurrency)
          ]);
          setTransferFees(fees);
          setTransferLimits(limits);
        } catch (error) {
          console.error('Error calculating fees and limits:', error);
        }
      };
      calculateFeesAndLimits();
    }
  }, [transferAmount, transferCurrency, user]);

  const handleTransfer = async () => {
    if (!transferAmount || !transferEmail) {
      toast.error('Veuillez remplir tous les champs obligatoires');
      return;
    }

    if (!MultiCurrencyTransferService.isValidEmail(transferEmail)) {
      toast.error('Format d\'email invalide');
      return;
    }

    if (!MultiCurrencyTransferService.isValidAmount(parseFloat(transferAmount))) {
      toast.error('Montant invalide');
      return;
    }

    if (transferLimits && !transferLimits.canTransfer) {
      toast.error('Limite de transfert dépassée');
      return;
    }

    try {
      const result = await MultiCurrencyTransferService.performTransfer({
        receiverEmail: transferEmail,
        amount: parseFloat(transferAmount),
        currencySent: transferCurrency,
        currencyReceived: transferCurrency,
        description: transferMessage,
        reference: `TXN-${Date.now()}`
      });

      if (result.success) {
        toast.success(`${MultiCurrencyTransferService.formatAmount(result.amountSent, result.currencySent)} envoyé avec succès`);
        setTransferAmount('');
        setTransferEmail('');
        setTransferMessage('');
        setTransferFees(null);
        setTransferLimits(null);
        refetch(); // Recharger les données
      } else {
        toast.error(result.error || 'Erreur lors du transfert');
      }
    } catch (error) {
      console.error('Error performing transfer:', error);
      toast.error('Erreur lors du transfert');
    }
  };

  if (walletLoading) {
    return (
      <Card>
        <CardContent className="p-8 text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p>Chargement de votre wallet...</p>
        </CardContent>
      </Card>
    );
  }

  if (!wallet) {
    return (
      <Card className="border-green-200 bg-green-50">
        <CardContent className="p-8 text-center">
          <CreditCard className="w-12 h-12 mx-auto text-green-600 mb-4" />
          <h3 className="text-lg font-semibold text-green-800 mb-2">Création de votre wallet...</h3>
          <p className="text-green-600 mb-4">
            Votre portefeuille 224Solutions est en cours de création automatique.
            Vous recevrez 1000 FCFA de bonus de bienvenue !
          </p>
          <Button
            onClick={() => refetch()}
            className="bg-green-600 hover:bg-green-700"
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            Actualiser
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Onglets principaux */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="overview" className="flex items-center gap-2">
            <CreditCard className="h-4 w-4" />
            Mon Portefeuille
          </TabsTrigger>
          <TabsTrigger value="history" className="flex items-center gap-2">
            <History className="h-4 w-4" />
            Historique
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          {/* En-tête avec solde principal */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Solde principal */}
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <CreditCard className="w-5 h-5" />
                    Mon Portefeuille 224Solutions
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowBalance(!showBalance)}
                  >
                    {showBalance ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </Button>
                </CardTitle>
                <CardDescription>
                  Gérez vos finances et transactions en toute sécurité
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Solde avec masquage */}
                <div className="p-6 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl border border-blue-200">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-blue-600 mb-1">Solde disponible</p>
                      <p className="text-3xl font-bold text-blue-800">
                        {showBalance
                          ? `${wallet.balance.toLocaleString()} ${wallet.currency}`
                          : '••••••• FCFA'
                        }
                      </p>
                    </div>
                    <div className="p-3 bg-blue-100 rounded-lg">
                      <DollarSign className="w-8 h-8 text-blue-600" />
                    </div>
                  </div>
                </div>

                {/* Statistiques rapides */}
                <div className="grid grid-cols-3 gap-4">
                  <div className="text-center p-4 bg-green-50 rounded-lg border border-green-200">
                    <p className="text-2xl font-bold text-green-600">
                      {stats.totalCredits.toLocaleString()}
                    </p>
                    <p className="text-sm text-green-600">Total reçu</p>
                  </div>
                  <div className="text-center p-4 bg-red-50 rounded-lg border border-red-200">
                    <p className="text-2xl font-bold text-red-600">
                      {stats.totalDebits.toLocaleString()}
                    </p>
                    <p className="text-sm text-red-600">Total envoyé</p>
                  </div>
                  <div className="text-center p-4 bg-purple-50 rounded-lg border border-purple-200">
                    <p className="text-2xl font-bold text-purple-600">
                      {stats.totalTransactions}
                    </p>
                    <p className="text-sm text-purple-600">Transactions</p>
                  </div>
                </div>

                {/* Actions rapides */}
                <div className="flex gap-3">
                  <Dialog>
                    <DialogTrigger asChild>
                      <Button className="flex-1 bg-green-600 hover:bg-green-700">
                        <Download className="w-4 h-4 mr-2" />
                        Recharger
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Recharger le wallet</DialogTitle>
                      </DialogHeader>
                      <div className="space-y-4">
                        <div>
                          <Label>Montant à recharger</Label>
                          <Input type="number" placeholder="0" />
                        </div>
                        <Button className="w-full bg-green-600 hover:bg-green-700">
                          Confirmer le rechargement
                        </Button>
                      </div>
                    </DialogContent>
                  </Dialog>

                  <Dialog>
                    <DialogTrigger asChild>
                      <Button variant="outline" className="flex-1">
                        <Send className="w-4 h-4 mr-2" />
                        Envoyer
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Envoyer de l'argent</DialogTitle>
                      </DialogHeader>
                  <div className="space-y-4">
                    <div>
                      <Label>Email du destinataire</Label>
                      <Input 
                        type="email" 
                        placeholder="destinataire@exemple.com"
                        value={transferEmail}
                        onChange={(e) => setTransferEmail(e.target.value)}
                      />
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label>Montant</Label>
                        <Input 
                          type="number" 
                          step="0.01"
                          min="0.01"
                          placeholder="0.00"
                          value={transferAmount}
                          onChange={(e) => setTransferAmount(e.target.value)}
                        />
                      </div>
                      <div>
                        <Label>Devise</Label>
                        <Select value={transferCurrency} onValueChange={setTransferCurrency}>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {availableCurrencies.map((currency) => (
                              <SelectItem key={currency.code} value={currency.code}>
                                {currency.symbol} {currency.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    <div>
                      <Label>Message (optionnel)</Label>
                      <Input 
                        placeholder="Paiement pour..."
                        value={transferMessage}
                        onChange={(e) => setTransferMessage(e.target.value)}
                      />
                    </div>

                    {/* Affichage des frais et limites */}
                    {transferFees && (
                      <div className="p-3 bg-blue-50 rounded-lg space-y-2">
                        <div className="flex justify-between text-sm">
                          <span>Montant:</span>
                          <span>{MultiCurrencyTransferService.formatAmount(parseFloat(transferAmount || '0'), transferCurrency)}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span>Frais:</span>
                          <span>{MultiCurrencyTransferService.formatAmount(transferFees.feeAmount, transferCurrency)}</span>
                        </div>
                        <div className="flex justify-between text-sm font-semibold">
                          <span>Total à débiter:</span>
                          <span>{MultiCurrencyTransferService.formatAmount(transferFees.totalAmount, transferCurrency)}</span>
                        </div>
                      </div>
                    )}

                    {transferLimits && (
                      <div className={`p-3 rounded-lg ${transferLimits.canTransfer ? 'bg-green-50' : 'bg-red-50'}`}>
                        <div className="flex justify-between text-sm">
                          <span>Limite quotidienne:</span>
                          <span>{MultiCurrencyTransferService.formatAmount(transferLimits.dailyRemaining, transferCurrency)} restant</span>
                        </div>
                        {!transferLimits.canTransfer && (
                          <p className="text-red-600 text-xs mt-1">⚠️ Limite dépassée</p>
                        )}
                      </div>
                    )}

                    <Button 
                      className="w-full bg-blue-600 hover:bg-blue-700"
                      onClick={handleTransfer}
                      disabled={!transferAmount || !transferEmail || (transferLimits && !transferLimits.canTransfer)}
                    >
                      <Send className="w-4 h-4 mr-2" />
                      Envoyer maintenant
                    </Button>
                  </div>
                    </DialogContent>
                  </Dialog>

                  <Button variant="outline" className="flex-1">
                    <Upload className="w-4 h-4 mr-2" />
                    Retirer
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Informations du wallet */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Informations</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Statut */}
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Statut</span>
                  <Badge variant="default">
                    <CheckCircle className="w-3 h-3 mr-1" />
                    Actif
                  </Badge>
                </div>

                <Separator />

                {/* ID wallet */}
                <div>
                  <p className="text-sm font-medium mb-2">ID Wallet</p>
                  <div className="flex items-center gap-2">
                    <code className="flex-1 text-xs bg-gray-100 p-2 rounded font-mono">
                      {wallet.id}
                    </code>
                    <Button size="sm" variant="outline" onClick={handleCopyAddress}>
                      <Copy className="w-3 h-3" />
                    </Button>
                  </div>
                </div>

                <Separator />

                {/* QR Code */}
                <div className="text-center">
                  <Button variant="outline" className="w-full">
                    <QrCode className="w-4 h-4 mr-2" />
                    Afficher QR Code
                  </Button>
                </div>

                <Separator />

                {/* Dates */}
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Créé le</span>
                    <span>{new Date(wallet.created_at).toLocaleDateString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Mis à jour</span>
                    <span>{new Date(wallet.updated_at).toLocaleDateString()}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Historique des transactions */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <History className="w-5 h-5" />
                Historique des transactions
              </CardTitle>
            </CardHeader>
            <CardContent>
              {walletLoading ? (
                <div className="text-center py-8">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary mx-auto mb-2"></div>
                  <p className="text-sm text-gray-600">Chargement des transactions...</p>
                </div>
              ) : transactions && transactions.length > 0 ? (
                <ScrollArea className="h-[400px]">
                  <div className="space-y-3">
                    {transactions.map((transaction) => (
                      <div key={transaction.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                        <div className="flex items-center gap-3">
                          <div className={`p-2 rounded-lg ${transaction.amount > 0
                              ? 'bg-green-100 text-green-600'
                              : 'bg-red-100 text-red-600'
                            }`}>
                            {transaction.amount > 0 ? (
                              <TrendingUp className="w-4 h-4" />
                            ) : (
                              <Download className="w-4 h-4" />
                            )}
                          </div>
                          <div>
                            <p className="font-medium">{transaction.description || transaction.method}</p>
                            <div className="flex items-center gap-2 text-sm text-gray-500">
                              <span>{new Date(transaction.created_at).toLocaleDateString()}</span>
                              <Badge variant="outline" className="text-xs">
                                {transaction.status === 'completed' ? 'Terminé' : transaction.status}
                              </Badge>
                            </div>
                          </div>
                        </div>
                        <div className={`text-right font-bold ${transaction.amount > 0 ? 'text-green-600' : 'text-red-600'
                          }`}>
                          {transaction.amount > 0 ? '+' : ''}
                          {transaction.amount.toLocaleString()} {wallet?.currency || 'GNF'}
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <History className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>Aucune transaction récente</p>
                  <p className="text-sm mt-2">Vos transactions apparaîtront ici</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>


        <TabsContent value="history" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <History className="w-5 h-5" />
                Historique Complet
              </CardTitle>
            </CardHeader>
            <CardContent>
              {walletLoading ? (
                <div className="text-center py-8">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary mx-auto mb-2"></div>
                  <p className="text-sm text-gray-600">Chargement des transactions...</p>
                </div>
              ) : transactions && transactions.length > 0 ? (
                <ScrollArea className="h-[600px]">
                  <div className="space-y-3">
                    {transactions.map((transaction) => (
                      <div key={transaction.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                        <div className="flex items-center gap-3">
                          <div className={`p-2 rounded-lg ${transaction.amount > 0
                              ? 'bg-green-100 text-green-600'
                              : 'bg-red-100 text-red-600'
                            }`}>
                            {transaction.amount > 0 ? (
                              <TrendingUp className="w-4 h-4" />
                            ) : (
                              <Download className="w-4 h-4" />
                            )}
                          </div>
                          <div>
                            <p className="font-medium">{transaction.description || transaction.method}</p>
                            <div className="flex items-center gap-2 text-sm text-gray-500">
                              <span>{new Date(transaction.created_at).toLocaleDateString()}</span>
                              <Badge variant="outline" className="text-xs">
                                {transaction.status === 'completed' ? 'Terminé' : transaction.status}
                              </Badge>
                            </div>
                          </div>
                        </div>
                        <div className={`text-right font-bold ${transaction.amount > 0 ? 'text-green-600' : 'text-red-600'
                          }`}>
                          {transaction.amount > 0 ? '+' : ''}
                          {transaction.amount.toLocaleString()} {wallet?.currency || 'GNF'}
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <History className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>Aucune transaction récente</p>
                  <p className="text-sm mt-2">Vos transactions apparaîtront ici</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
