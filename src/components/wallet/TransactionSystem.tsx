import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { useAuth } from '@/hooks/useAuth';
import { useWallet } from '@/hooks/useWallet';
import { useToast } from '@/hooks/use-toast';
import { Send, ArrowRightLeft, DollarSign, Shield, Clock, CheckCircle, XCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

interface Transaction {
  id: string;
  sender_id: string;
  receiver_id: string;
  amount: number;
  description?: string;
  status: 'pending' | 'completed' | 'cancelled' | 'failed';
  transaction_type: 'transfer' | 'payment' | 'request';
  created_at: string;
  completed_at?: string;
  sender_name?: string;
  receiver_name?: string;
}

export const TransactionSystem = () => {
  const { user } = useAuth();
  const { wallet, refetch } = useWallet();
  const { toast } = useToast();
  
  const [receiverEmail, setReceiverEmail] = useState('');
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [transactionType, setTransactionType] = useState<'transfer' | 'payment' | 'request'>('transfer');
  const [loading, setLoading] = useState(false);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loadingTransactions, setLoadingTransactions] = useState(false);

  // Récupérer les transactions
  const fetchTransactions = async () => {
    if (!user) return;

    setLoadingTransactions(true);
    try {
      const { data, error } = await supabase
        .from('p2p_transactions')
        .select(`
          *,
          sender:profiles!p2p_transactions_sender_id_fkey(first_name, last_name, email),
          receiver:profiles!p2p_transactions_receiver_id_fkey(first_name, last_name, email)
        `)
        .or(`sender_id.eq.${user.id},receiver_id.eq.${user.id}`)
        .order('created_at', { ascending: false })
        .limit(20);

      if (error) throw error;
      setTransactions(data || []);
    } catch (err: any) {
      console.error('Error fetching transactions:', err);
    } finally {
      setLoadingTransactions(false);
    }
  };

  // Envoyer une transaction
  const sendTransaction = async () => {
    if (!user || !wallet) return;

    if (!receiverEmail || !amount) {
      toast({
        title: "Erreur",
        description: "Veuillez remplir tous les champs requis",
        variant: "destructive",
      });
      return;
    }

    const amountNum = parseFloat(amount);
    if (amountNum <= 0) {
      toast({
        title: "Erreur",
        description: "Le montant doit être supérieur à 0",
        variant: "destructive",
      });
      return;
    }

    if (transactionType === 'transfer' && amountNum > wallet.balance) {
      toast({
        title: "Solde insuffisant",
        description: "Votre solde est insuffisant pour cette transaction",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      // Trouver l'utilisateur destinataire
      const { data: receiverProfile, error: receiverError } = await supabase
        .from('profiles')
        .select('id, first_name, last_name')
        .eq('email', receiverEmail.trim())
        .maybeSingle();

      if (receiverError) throw receiverError;
      
      if (!receiverProfile) {
        toast({
          title: "Utilisateur introuvable",
          description: "Aucun utilisateur trouvé avec cette adresse email",
          variant: "destructive",
        });
        return;
      }

      if (receiverProfile.id === user.id) {
        toast({
          title: "Erreur",
          description: "Vous ne pouvez pas envoyer de l'argent à vous-même",
          variant: "destructive",
        });
        return;
      }

      // Créer la transaction
      const { data: transaction, error: transactionError } = await supabase
        .from('p2p_transactions')
        .insert({
          sender_id: user.id,
          receiver_id: receiverProfile.id,
          amount: amountNum,
          description: description.trim() || null,
          status: transactionType === 'request' ? 'pending' : 'completed',
          transaction_type: transactionType
        })
        .select()
        .single();

      if (transactionError) throw transactionError;

      // Si c'est un transfert direct, mettre à jour les wallets
      if (transactionType === 'transfer') {
        // Débiter le wallet de l'expéditeur
        const { error: senderWalletError } = await supabase
          .from('wallets')
          .update({ balance: wallet.balance - amountNum })
          .eq('user_id', user.id);

        if (senderWalletError) throw senderWalletError;

        // Créditer le wallet du destinataire
        const { error: receiverWalletError } = await supabase.rpc('credit_wallet', {
          receiver_user_id: receiverProfile.id,
          credit_amount: amountNum
        });

        if (receiverWalletError) throw receiverWalletError;
      }

      toast({
        title: "Succès",
        description: transactionType === 'request' 
          ? `Demande de ${amountNum} ${wallet.currency} envoyée à ${receiverProfile.first_name}`
          : `${amountNum} ${wallet.currency} envoyé à ${receiverProfile.first_name}`,
      });

      // Réinitialiser le formulaire
      setReceiverEmail('');
      setAmount('');
      setDescription('');
      
      // Actualiser les données
      refetch();
      fetchTransactions();

    } catch (err: any) {
      toast({
        title: "Erreur",
        description: "Impossible de traiter la transaction",
        variant: "destructive",
      });
      console.error('Transaction error:', err);
    } finally {
      setLoading(false);
    }
  };

  const getTransactionIcon = (type: string, status: string) => {
    if (status === 'pending') return <Clock className="h-4 w-4 text-yellow-500" />;
    if (status === 'failed' || status === 'cancelled') return <XCircle className="h-4 w-4 text-red-500" />;
    if (status === 'completed') return <CheckCircle className="h-4 w-4 text-green-500" />;
    return <ArrowRightLeft className="h-4 w-4" />;
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

  React.useEffect(() => {
    fetchTransactions();
  }, [user]);

  return (
    <div className="space-y-6">
      {/* Bouton de transaction principal */}
      <Card className="bg-gradient-to-r from-primary to-primary/80 text-primary-foreground">
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-xl font-bold mb-2">Transactions entre utilisateurs</h3>
              <p className="text-primary-foreground/80">
                Envoyez, recevez et demandez de l'argent facilement
              </p>
            </div>
            <Dialog>
              <DialogTrigger asChild>
                <Button 
                  size="lg" 
                  variant="secondary" 
                  className="bg-white/20 hover:bg-white/30 text-white border-white/30 px-8 py-4 text-lg"
                >
                  <Send className="h-5 w-5 mr-2" />
                  Nouvelle Transaction
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-md">
                <DialogHeader>
                  <DialogTitle>Nouvelle Transaction</DialogTitle>
                  <DialogDescription>
                    Envoyez de l'argent, effectuez un paiement ou faites une demande
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="type">Type de transaction</Label>
                    <Select value={transactionType} onValueChange={(value: any) => setTransactionType(value)}>
                      <SelectTrigger>
                        <SelectValue placeholder="Choisir le type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="transfer">
                          <div className="flex items-center gap-2">
                            <Send className="h-4 w-4" />
                            Transfert d'argent
                          </div>
                        </SelectItem>
                        <SelectItem value="payment">
                          <div className="flex items-center gap-2">
                            <DollarSign className="h-4 w-4" />
                            Paiement
                          </div>
                        </SelectItem>
                        <SelectItem value="request">
                          <div className="flex items-center gap-2">
                            <ArrowRightLeft className="h-4 w-4" />
                            Demande d'argent
                          </div>
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div>
                    <Label htmlFor="receiver">Email du destinataire</Label>
                    <Input
                      id="receiver"
                      type="email"
                      placeholder="email@exemple.com"
                      value={receiverEmail}
                      onChange={(e) => setReceiverEmail(e.target.value)}
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="amount">Montant ({wallet?.currency || 'GNF'})</Label>
                    <Input
                      id="amount"
                      type="number"
                      placeholder="0"
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="description">Description (optionnel)</Label>
                    <Textarea
                      id="description"
                      placeholder="Motif de la transaction..."
                      rows={3}
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                    />
                  </div>
                  
                  <Button 
                    onClick={sendTransaction} 
                    disabled={loading}
                    className="w-full"
                  >
                    {loading ? 'Traitement...' : `${transactionType === 'request' ? 'Demander' : 'Envoyer'} ${amount || '0'} ${wallet?.currency || 'GNF'}`}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </CardContent>
      </Card>

      {/* Historique des transactions P2P */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ArrowRightLeft className="h-5 w-5" />
            Historique des transactions P2P
          </CardTitle>
          <CardDescription>
            Vos transferts, paiements et demandes d'argent
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loadingTransactions ? (
            <div className="space-y-3">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="flex items-center justify-between p-4 border rounded-lg animate-pulse">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-muted rounded-full"></div>
                    <div>
                      <div className="h-4 bg-muted rounded w-32 mb-1"></div>
                      <div className="h-3 bg-muted rounded w-24"></div>
                    </div>
                  </div>
                  <div className="h-6 bg-muted rounded w-20"></div>
                </div>
              ))}
            </div>
          ) : transactions.length > 0 ? (
            <div className="space-y-3">
              {transactions.map((transaction) => (
                <div key={transaction.id} className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors">
                  <div className="flex items-center gap-3">
                    {getTransactionIcon(transaction.transaction_type, transaction.status)}
                    <div>
                      <div className="font-medium">
                        {transaction.sender_id === user?.id ? 
                          `Vers ${transaction.receiver_name || 'Utilisateur'}` : 
                          `De ${transaction.sender_name || 'Utilisateur'}`
                        }
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {transaction.description || transaction.transaction_type}
                      </div>
                      <div className="text-xs text-muted-foreground">
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
                    <div className={`font-medium ${
                      transaction.sender_id === user?.id ? 'text-red-600' : 'text-green-600'
                    }`}>
                      {transaction.sender_id === user?.id ? '-' : '+'}
                      {transaction.amount.toLocaleString()} {wallet?.currency || 'GNF'}
                    </div>
                    <Badge className={getStatusBadge(transaction.status)}>
                      {transaction.status}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <ArrowRightLeft className="h-12 w-12 mx-auto mb-2 opacity-50" />
              <p>Aucune transaction P2P pour le moment</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};