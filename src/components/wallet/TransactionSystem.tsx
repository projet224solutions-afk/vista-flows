import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Send, ArrowDownUp, Clock, CheckCircle, XCircle, Search, Filter, CreditCard, Shield, Smartphone, Wallet, Copy, Eye } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useEnhancedTransactions } from "@/hooks/useEnhancedTransactions";
import { useAuth } from "@/hooks/useAuth";

export const TransactionSystem = () => {
  const [receiverEmail, setReceiverEmail] = useState('');
  const [amount, setAmount] = useState('');
  const [currency, setCurrency] = useState('GNF');
  const [method, setMethod] = useState('wallet');
  const [description, setDescription] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [methodFilter, setMethodFilter] = useState('');
  const [loading, setLoading] = useState(false);
  const [selectedTransaction, setSelectedTransaction] = useState(null);

  const { toast } = useToast();
  const { user } = useAuth();
  const { 
    transactions, 
    loading: transactionsLoading, 
    createWalletTransaction, 
    createEscrowTransaction,
    searchTransactions,
    refetch
  } = useEnhancedTransactions();

  const handleSendMoney = async () => {
    if (!receiverEmail || !amount) {
      toast({
        title: "Erreur",
        description: "Veuillez remplir tous les champs requis",
        variant: "destructive"
      });
      return;
    }

    try {
      setLoading(true);
      
      if (method === 'wallet') {
        await createWalletTransaction(receiverEmail, parseFloat(amount), currency, description);
      } else if (method === 'escrow') {
        await createEscrowTransaction(receiverEmail, parseFloat(amount), currency, description);
      }
      
      // Reset form
      setReceiverEmail('');
      setAmount('');
      setDescription('');
    } catch (error) {
      // Error handled in hook
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = () => {
    const filters = {
      status: statusFilter || undefined,
      method: methodFilter || undefined,
    };
    searchTransactions(searchQuery, filters);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'completed':
        return <Badge className="bg-green-100 text-green-800"><CheckCircle className="w-3 h-3 mr-1" />Terminé</Badge>;
      case 'pending':
        return <Badge className="bg-yellow-100 text-yellow-800"><Clock className="w-3 h-3 mr-1" />En cours</Badge>;
      case 'failed':
        return <Badge variant="destructive"><XCircle className="w-3 h-3 mr-1" />Échoué</Badge>;
      case 'refunded':
        return <Badge className="bg-blue-100 text-blue-800">Remboursé</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const getMethodIcon = (method: string) => {
    switch (method) {
      case 'wallet':
        return <Wallet className="w-4 h-4" />;
      case 'card':
        return <CreditCard className="w-4 h-4" />;
      case 'mobile_money':
        return <Smartphone className="w-4 h-4" />;
      case 'escrow':
        return <Shield className="w-4 h-4" />;
      default:
        return <Send className="w-4 h-4" />;
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: "Copié",
      description: "ID de transaction copié dans le presse-papiers",
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold text-foreground">Système de Transactions</h2>
          <p className="text-muted-foreground">Envoyez et recevez de l'argent instantanément avec ID unique</p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="bg-vendeur/10 text-vendeur border-vendeur/20">
            {transactions.length} transactions
          </Badge>
          <Button onClick={refetch} variant="outline" size="sm">
            Actualiser
          </Button>
        </div>
      </div>

      <Tabs defaultValue="send" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="send" className="data-[state=active]:bg-vendeur data-[state=active]:text-white">
            <Send className="w-4 h-4 mr-2" />
            Envoyer
          </TabsTrigger>
          <TabsTrigger value="history" className="data-[state=active]:bg-vendeur data-[state=active]:text-white">
            <ArrowDownUp className="w-4 h-4 mr-2" />
            Historique
          </TabsTrigger>
          <TabsTrigger value="analytics" className="data-[state=active]:bg-vendeur data-[state=active]:text-white">
            <Filter className="w-4 h-4 mr-2" />
            Recherche
          </TabsTrigger>
        </TabsList>

        <TabsContent value="send" className="space-y-6">
          <div className="grid md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Send className="h-5 w-5 text-vendeur" />
                  Envoyer de l'argent
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="receiver">Email du destinataire *</Label>
                  <Input
                    id="receiver"
                    type="email"
                    placeholder="destinataire@exemple.com"
                    value={receiverEmail}
                    onChange={(e) => setReceiverEmail(e.target.value)}
                  />
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="amount">Montant *</Label>
                    <Input
                      id="amount"
                      type="number"
                      placeholder="0"
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                    />
                  </div>
                  <div>
                    <Label htmlFor="currency">Devise</Label>
                    <Select value={currency} onValueChange={setCurrency}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="GNF">GNF (Franc Guinéen)</SelectItem>
                        <SelectItem value="USD">USD (Dollar)</SelectItem>
                        <SelectItem value="EUR">EUR (Euro)</SelectItem>
                        <SelectItem value="XOF">XOF (Franc CFA)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div>
                  <Label htmlFor="method">Méthode de paiement</Label>
                  <Select value={method} onValueChange={setMethod}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="wallet">
                        <div className="flex items-center gap-2">
                          <Wallet className="w-4 h-4" />
                          Wallet Interne (instantané)
                        </div>
                      </SelectItem>
                      <SelectItem value="escrow">
                        <div className="flex items-center gap-2">
                          <Shield className="w-4 h-4" />
                          Escrow (sécurisé)
                        </div>
                      </SelectItem>
                      <SelectItem value="card" disabled>
                        <div className="flex items-center gap-2">
                          <CreditCard className="w-4 h-4" />
                          Carte bancaire (bientôt)
                        </div>
                      </SelectItem>
                      <SelectItem value="mobile_money" disabled>
                        <div className="flex items-center gap-2">
                          <Smartphone className="w-4 h-4" />
                          Mobile Money (bientôt)
                        </div>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="description">Description (optionnel)</Label>
                  <Textarea
                    id="description"
                    placeholder="Note ou référence pour cette transaction..."
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    rows={3}
                  />
                </div>

                <Button 
                  onClick={handleSendMoney}
                  className="w-full bg-vendeur-gradient text-white"
                  disabled={loading}
                >
                  {loading ? (
                    <Clock className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Send className="h-4 w-4 mr-2" />
                  )}
                  {loading ? 'Transaction en cours...' : 'Envoyer Maintenant'}
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Méthodes de paiement disponibles</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3">
                  <div className="flex items-center gap-3 p-3 border rounded-lg">
                    <Wallet className="w-5 h-5 text-vendeur" />
                    <div>
                      <h4 className="font-medium">Wallet Interne</h4>
                      <p className="text-sm text-muted-foreground">Transaction instantanée entre utilisateurs</p>
                      <p className="text-xs text-vendeur">ID unique généré automatiquement</p>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-3 p-3 border rounded-lg">
                    <Shield className="w-5 h-5 text-blue-600" />
                    <div>
                      <h4 className="font-medium">Escrow Sécurisé</h4>
                      <p className="text-sm text-muted-foreground">Fonds bloqués jusqu'à confirmation</p>
                      <p className="text-xs text-blue-600">Protection automatique</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 p-3 border rounded-lg opacity-50">
                    <CreditCard className="w-5 h-5 text-gray-400" />
                    <div>
                      <h4 className="font-medium">Carte Bancaire</h4>
                      <p className="text-sm text-muted-foreground">Visa, Mastercard, etc.</p>
                      <p className="text-xs text-gray-400">Bientôt disponible</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 p-3 border rounded-lg opacity-50">
                    <Smartphone className="w-5 h-5 text-gray-400" />
                    <div>
                      <h4 className="font-medium">Mobile Money</h4>
                      <p className="text-sm text-muted-foreground">Orange Money, MTN, Moov</p>
                      <p className="text-xs text-gray-400">Intégration en cours</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="history" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Historique des transactions</CardTitle>
              <div className="flex items-center gap-4">
                <div className="flex-1">
                  <Input
                    placeholder="Rechercher par ID unique (ex: ABC1234)"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </div>
                <Button onClick={handleSearch} variant="outline">
                  <Search className="w-4 h-4 mr-2" />
                  Rechercher
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {transactionsLoading ? (
                <div className="flex justify-center p-8">
                  <Clock className="w-6 h-6 animate-spin" />
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>ID Unique</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Utilisateur</TableHead>
                      <TableHead>Montant</TableHead>
                      <TableHead>Méthode</TableHead>
                      <TableHead>Statut</TableHead>
                      <TableHead>Date/Heure</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {transactions.map((transaction) => (
                      <TableRow key={transaction.id}>
                        <TableCell className="font-mono">
                          <div className="flex items-center gap-2">
                            {transaction.custom_id}
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => copyToClipboard(transaction.custom_id)}
                              className="h-6 w-6 p-0"
                            >
                              <Copy className="w-3 h-3" />
                            </Button>
                          </div>
                        </TableCell>
                        <TableCell>
                          {transaction.sender_id === user?.id ? (
                            <Badge variant="outline" className="text-red-600">Envoyé</Badge>
                          ) : (
                            <Badge variant="outline" className="text-green-600">Reçu</Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          {transaction.sender_id === user?.id ? 'À' : 'De'} {
                            transaction.sender_id === user?.id 
                              ? transaction.receiver_id.substring(0, 8) + '...'
                              : transaction.sender_id.substring(0, 8) + '...'
                          }
                        </TableCell>
                        <TableCell className="font-semibold">
                          {transaction.sender_id === user?.id ? '-' : '+'}
                          {transaction.amount.toLocaleString()} {transaction.currency}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            {getMethodIcon(transaction.method)}
                            <span className="capitalize">{transaction.method}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          {getStatusBadge(transaction.status)}
                        </TableCell>
                        <TableCell>
                          {new Date(transaction.created_at).toLocaleDateString('fr-FR', {
                            day: '2-digit',
                            month: '2-digit',
                            year: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </TableCell>
                        <TableCell>
                          <Dialog>
                            <DialogTrigger asChild>
                              <Button size="sm" variant="ghost">
                                <Eye className="w-4 h-4" />
                              </Button>
                            </DialogTrigger>
                            <DialogContent>
                              <DialogHeader>
                                <DialogTitle>Détails de la transaction</DialogTitle>
                                <DialogDescription>
                                  Transaction #{transaction.custom_id}
                                </DialogDescription>
                              </DialogHeader>
                              <div className="space-y-4">
                                <div className="grid grid-cols-2 gap-4">
                                  <div>
                                    <Label>ID Unique</Label>
                                    <p className="font-mono text-lg">{transaction.custom_id}</p>
                                  </div>
                                  <div>
                                    <Label>Montant</Label>
                                    <p className="font-semibold text-lg">{transaction.amount} {transaction.currency}</p>
                                  </div>
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                  <div>
                                    <Label>Méthode</Label>
                                    <div className="flex items-center gap-2">
                                      {getMethodIcon(transaction.method)}
                                      <span className="capitalize">{transaction.method}</span>
                                    </div>
                                  </div>
                                  <div>
                                    <Label>Statut</Label>
                                    <div>{getStatusBadge(transaction.status)}</div>
                                  </div>
                                </div>
                                {(transaction.metadata as unknown)?.description && (
                                  <div>
                                    <Label>Description</Label>
                                    <p>{(transaction.metadata as unknown)?.description}</p>
                                  </div>
                                )}
                                <div>
                                  <Label>Date de création</Label>
                                  <p>{new Date(transaction.created_at).toLocaleString('fr-FR')}</p>
                                </div>
                                <div>
                                  <Label>Dernière mise à jour</Label>
                                  <p>{new Date(transaction.updated_at).toLocaleString('fr-FR')}</p>
                                </div>
                              </div>
                            </DialogContent>
                          </Dialog>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="analytics" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Filter className="h-5 w-5" />
                Recherche avancée et filtres
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid md:grid-cols-3 gap-4">
                <div>
                  <Label>Recherche par ID unique</Label>
                  <Input
                    placeholder="ABC1234"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </div>
                <div>
                  <Label>Filtrer par statut</Label>
                  <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger>
                      <SelectValue placeholder="Tous les statuts" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">Tous les statuts</SelectItem>
                      <SelectItem value="pending">En cours</SelectItem>
                      <SelectItem value="completed">Terminé</SelectItem>
                      <SelectItem value="failed">Échoué</SelectItem>
                      <SelectItem value="refunded">Remboursé</SelectItem>
                      <SelectItem value="cancelled">Annulé</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Filtrer par méthode</Label>
                  <Select value={methodFilter} onValueChange={setMethodFilter}>
                    <SelectTrigger>
                      <SelectValue placeholder="Toutes les méthodes" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">Toutes les méthodes</SelectItem>
                      <SelectItem value="wallet">Wallet Interne</SelectItem>
                      <SelectItem value="escrow">Escrow</SelectItem>
                      <SelectItem value="card">Carte Bancaire</SelectItem>
                      <SelectItem value="mobile_money">Mobile Money</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <Button onClick={handleSearch} className="bg-vendeur-gradient">
                <Search className="w-4 h-4 mr-2" />
                Appliquer les filtres de recherche
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Informations sur le système</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid md:grid-cols-2 gap-4">
                <div className="p-4 bg-vendeur/5 rounded-lg border">
                  <h4 className="font-semibold text-vendeur mb-2">Format des ID uniques</h4>
                  <p className="text-sm text-muted-foreground">
                    Chaque transaction génère automatiquement un ID unique au format 3 lettres + 4 chiffres (ex: ABC1234)
                  </p>
                </div>
                <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                  <h4 className="font-semibold text-blue-800 mb-2">Traçabilité complète</h4>
                  <p className="text-sm text-blue-600">
                    Toutes les transactions sont enregistrées avec timestamp, métadonnées et suivi complet
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};