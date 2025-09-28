import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { useWallet } from '@/hooks/useWallet';
import { useAuth } from '@/hooks/useAuth';
import { Wallet, CreditCard, Plus, ArrowUpRight, ArrowDownLeft, Shield, Smartphone, Globe } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

export const WalletDashboard = () => {
  const { user } = useAuth();
  const { wallet, virtualCards, transactions, loading, createVirtualCard, rechargeWallet } = useWallet();
  const { toast } = useToast();
  const [rechargeAmount, setRechargeAmount] = useState('');
  const [rechargeMethod, setRechargeMethod] = useState('');
  
  const getTransactionIcon = (type: string) => {
    return type.includes('Rechargement') ? <ArrowDownLeft className="h-4 w-4 text-green-500" /> : <ArrowUpRight className="h-4 w-4 text-red-500" />;
  };

  const getStatusBadge = (status: string) => {
    const colors = {
      completed: 'bg-green-100 text-green-800',
      pending: 'bg-yellow-100 text-yellow-800',
      failed: 'bg-red-100 text-red-800',
      cancelled: 'bg-gray-100 text-gray-800'
    };
    return colors[status as keyof typeof colors] || colors.pending;
  };

  const handleRecharge = async () => {
    if (!rechargeAmount || !rechargeMethod) {
      toast({
        title: "Erreur",
        description: "Veuillez saisir un montant et choisir une méthode",
        variant: "destructive",
      });
      return;
    }

    const amount = parseFloat(rechargeAmount);
    if (amount <= 0) {
      toast({
        title: "Erreur",
        description: "Le montant doit être supérieur à 0",
        variant: "destructive",
      });
      return;
    }

    const success = await rechargeWallet(amount, rechargeMethod);
    if (success) {
      setRechargeAmount('');
      setRechargeMethod('');
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[...Array(3)].map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardHeader className="space-y-2">
                <div className="h-4 bg-muted rounded w-3/4"></div>
                <div className="h-6 bg-muted rounded w-1/2"></div>
              </CardHeader>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* En-tête avec solde principal */}
      <Card className="bg-gradient-to-r from-primary to-primary/80 text-primary-foreground">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Wallet className="h-6 w-6" />
            Wallet 224SOLUTIONS
          </CardTitle>
          <CardDescription className="text-primary-foreground/80">
            Votre portefeuille numérique sécurisé
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-3xl font-bold mb-2">
            {wallet?.balance?.toLocaleString() || '0'} {wallet?.currency || 'GNF'}
          </div>
          <div className="flex gap-2">
            <Dialog>
              <DialogTrigger asChild>
                <Button variant="secondary" size="sm">
                  <Plus className="h-4 w-4 mr-2" />
                  Recharger
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Recharger votre wallet</DialogTitle>
                  <DialogDescription>
                    Ajoutez des fonds à votre portefeuille 224SOLUTIONS
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="amount">Montant</Label>
                    <Input
                      id="amount"
                      type="number"
                      placeholder="0"
                      value={rechargeAmount}
                      onChange={(e) => setRechargeAmount(e.target.value)}
                    />
                  </div>
                  <div>
                    <Label htmlFor="method">Méthode de paiement</Label>
                    <Select value={rechargeMethod} onValueChange={setRechargeMethod}>
                      <SelectTrigger>
                        <SelectValue placeholder="Choisir une méthode" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="orange_money">
                          <div className="flex items-center gap-2">
                            <Smartphone className="h-4 w-4" />
                            Orange Money
                          </div>
                        </SelectItem>
                        <SelectItem value="mtn">
                          <div className="flex items-center gap-2">
                            <Smartphone className="h-4 w-4" />
                            MTN Mobile Money
                          </div>
                        </SelectItem>
                        <SelectItem value="wave">
                          <div className="flex items-center gap-2">
                            <Smartphone className="h-4 w-4" />
                            Wave
                          </div>
                        </SelectItem>
                        <SelectItem value="card">
                          <div className="flex items-center gap-2">
                            <CreditCard className="h-4 w-4" />
                            Carte bancaire
                          </div>
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <Button onClick={handleRecharge} className="w-full">
                    Recharger {rechargeAmount} {wallet?.currency || 'GNF'}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Cartes virtuelles */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CreditCard className="h-5 w-5" />
              Cartes virtuelles
            </CardTitle>
            <CardDescription>
              Gérez vos cartes 224SOLUTIONS
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {virtualCards.length > 0 ? (
              virtualCards.map((card) => (
                <div key={card.id} className="p-4 bg-gradient-to-r from-purple-500 to-pink-500 rounded-lg text-white">
                  <div className="flex justify-between items-start mb-2">
                    <div className="text-sm opacity-80">224SOLUTIONS</div>
                    <div className="text-xs opacity-80">{card.status.toUpperCase()}</div>
                  </div>
                  <div className="text-lg font-mono tracking-wider mb-2">
                    {card.card_number.match(/.{1,4}/g)?.join(' ')}
                  </div>
                  <div className="flex justify-between items-end text-sm">
                    <div>
                      <div className="opacity-60">Expires</div>
                      <div>{card.expiry_date}</div>
                    </div>
                    <div>
                      <div className="opacity-60">CVV</div>
                      <div>***</div>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-6 text-muted-foreground">
                <CreditCard className="h-12 w-12 mx-auto mb-2 opacity-50" />
                <p>Aucune carte virtuelle</p>
              </div>
            )}
            <Button onClick={createVirtualCard} variant="outline" className="w-full">
              <Plus className="h-4 w-4 mr-2" />
              Ajouter une carte virtuelle
            </Button>
          </CardContent>
        </Card>

        {/* Méthodes de paiement */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5" />
              Paiements sécurisés
            </CardTitle>
            <CardDescription>
              Système escrow et méthodes locales
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between p-3 border rounded-lg">
              <div className="flex items-center gap-3">
                <Shield className="h-5 w-5 text-green-500" />
                <div>
                  <div className="font-medium">Escrow 224SOLUTIONS</div>
                  <div className="text-sm text-muted-foreground">Paiement sécurisé style Alibaba</div>
                </div>
              </div>
              <Badge variant="secondary">Actif</Badge>
            </div>
            
            <div className="flex items-center justify-between p-3 border rounded-lg">
              <div className="flex items-center gap-3">
                <Smartphone className="h-5 w-5 text-orange-500" />
                <div>
                  <div className="font-medium">Mobile Money</div>
                  <div className="text-sm text-muted-foreground">Orange, MTN, Wave</div>
                </div>
              </div>
              <Badge variant="secondary">Disponible</Badge>
            </div>

            <div className="flex items-center justify-between p-3 border rounded-lg">
              <div className="flex items-center gap-3">
                <Globe className="h-5 w-5 text-blue-500" />
                <div>
                  <div className="font-medium">Cartes internationales</div>
                  <div className="text-sm text-muted-foreground">Visa, Mastercard avec 3D Secure</div>
                </div>
              </div>
              <Badge variant="secondary">Sécurisé</Badge>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Historique des transactions */}
      <Card>
        <CardHeader>
          <CardTitle>Historique des transactions</CardTitle>
          <CardDescription>
            Vos 20 dernières transactions
          </CardDescription>
        </CardHeader>
        <CardContent>
          {transactions.length > 0 ? (
            <div className="space-y-3">
              {transactions.map((transaction) => (
                <div key={transaction.id} className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors">
                  <div className="flex items-center gap-3">
                    {getTransactionIcon(transaction.description || '')}
                    <div>
                      <div className="font-medium">
                        {transaction.description || `Transaction ${transaction.method}`}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {new Date(transaction.created_at).toLocaleDateString('fr-FR', {
                          day: '2-digit',
                          month: '2-digit',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-medium">
                      {transaction.amount.toLocaleString()} {wallet?.currency || 'GNF'}
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge className={getStatusBadge(transaction.status)}>
                        {transaction.status}
                      </Badge>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <Wallet className="h-12 w-12 mx-auto mb-2 opacity-50" />
              <p>Aucune transaction pour le moment</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};