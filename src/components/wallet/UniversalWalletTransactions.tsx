import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import { 
  Wallet, 
  ArrowDownToLine,
  ArrowUpFromLine,
  Send,
  RefreshCw,
  History
} from 'lucide-react';

interface WalletInfo {
  id: string;
  balance: number;
  currency: string;
}

interface Transaction {
  id: string;
  sender_id: string;
  receiver_id: string;
  amount: number;
  method: string;
  status: string;
  currency: string;
  created_at: string;
  metadata: any;
}

export const UniversalWalletTransactions = () => {
  const { user } = useAuth();
  const [wallet, setWallet] = useState<WalletInfo | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  
  // États pour les formulaires
  const [depositAmount, setDepositAmount] = useState('');
  const [withdrawAmount, setWithdrawAmount] = useState('');
  const [transferAmount, setTransferAmount] = useState('');
  const [recipientId, setRecipientId] = useState('');
  const [transferDescription, setTransferDescription] = useState('');
  
  // États des dialogs
  const [depositOpen, setDepositOpen] = useState(false);
  const [withdrawOpen, setWithdrawOpen] = useState(false);
  const [transferOpen, setTransferOpen] = useState(false);

  useEffect(() => {
    if (user?.id) {
      loadWalletData();
      loadTransactions();
    }
  }, [user?.id]);

  const loadWalletData = async () => {
    if (!user?.id) return;

    try {
      const { data, error } = await supabase
        .from('wallets')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (error) throw error;
      setWallet(data);
    } catch (error) {
      console.error('Erreur chargement wallet:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadTransactions = async () => {
    if (!user?.id) return;

    try {
      const { data, error } = await supabase
        .from('enhanced_transactions')
        .select('*')
        .or(`sender_id.eq.${user.id},receiver_id.eq.${user.id}`)
        .order('created_at', { ascending: false })
        .limit(10);

      if (error) throw error;
      setTransactions(data || []);
    } catch (error) {
      console.error('Erreur chargement transactions:', error);
    }
  };

  const handleDeposit = async () => {
    if (!user?.id || !depositAmount) {
      toast.error('Veuillez entrer un montant');
      return;
    }

    const amount = parseFloat(depositAmount);
    if (isNaN(amount) || amount <= 0) {
      toast.error('Montant invalide');
      return;
    }

    if (amount < 1000) {
      toast.error('Montant minimum 1000 GNF');
      return;
    }

    setProcessing(true);
    console.log('🔄 Dépôt en cours:', { amount, userId: user.id });
    
    try {
      // Créer ou récupérer le wallet de l'utilisateur
      let { data: walletData, error: walletError } = await supabase
        .from('wallets')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (walletError && walletError.code === 'PGRST116') {
        // Wallet n'existe pas, on le crée
        const { data: newWallet, error: createError } = await supabase
          .from('wallets')
          .insert({
            user_id: user.id,
            balance: 0,
            currency: 'GNF'
          })
          .select()
          .single();

        if (createError) throw createError;
        walletData = newWallet;
      } else if (walletError) {
        throw walletError;
      }

      // Créer une transaction de dépôt
      const referenceNumber = `DEP${Date.now()}${Math.floor(Math.random() * 1000)}`;
      
      const { error: transactionError } = await supabase
        .from('wallet_transactions')
        .insert({
          transaction_id: referenceNumber,
          transaction_type: 'deposit',
          amount: amount,
          net_amount: amount,
          fee: 0,
          currency: 'GNF',
          status: 'completed',
          description: 'Dépôt sur le wallet',
          receiver_wallet_id: walletData.id
        });

      if (transactionError) throw transactionError;

      // Mettre à jour le solde du wallet
      const newBalance = walletData.balance + amount;
      const { error: updateError } = await supabase
        .from('wallets')
        .update({ balance: newBalance })
        .eq('user_id', user.id);

      if (updateError) throw updateError;

      console.log('✅ Dépôt effectué avec succès');

      toast.success(`Dépôt de ${formatPrice(amount)} effectué avec succès !`);
      setDepositAmount('');
      setDepositOpen(false);
      await Promise.all([loadWalletData(), loadTransactions()]);
    } catch (error: any) {
      console.error('❌ Erreur dépôt:', error);
      toast.error(error.message || 'Erreur lors du dépôt');
    } finally {
      setProcessing(false);
    }
  };

  const handleWithdraw = async () => {
    if (!user?.id || !withdrawAmount) {
      toast.error('Veuillez entrer un montant');
      return;
    }

    const amount = parseFloat(withdrawAmount);
    if (isNaN(amount) || amount <= 0) {
      toast.error('Montant invalide');
      return;
    }

    if (amount < 5000) {
      toast.error('Montant minimum 5000 GNF');
      return;
    }

    if (amount > (wallet?.balance || 0)) {
      toast.error('Solde insuffisant');
      return;
    }

    setProcessing(true);
    console.log('🔄 Retrait en cours:', { amount, userId: user.id });
    
    try {
      // Récupérer le wallet de l'utilisateur
      const { data: walletData, error: walletError } = await supabase
        .from('wallets')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (walletError) throw walletError;
      if (!walletData) throw new Error('Wallet introuvable');

      // Créer une transaction de retrait
      const referenceNumber = `WDR${Date.now()}${Math.floor(Math.random() * 1000)}`;
      
      const { error: transactionError } = await supabase
        .from('wallet_transactions')
        .insert({
          transaction_id: referenceNumber,
          transaction_type: 'withdraw',
          amount: -amount,
          net_amount: -amount,
          fee: 0,
          currency: 'GNF',
          status: 'completed',
          description: 'Retrait du wallet',
          sender_wallet_id: walletData.id
        });

      if (transactionError) throw transactionError;

      // Mettre à jour le solde du wallet
      const newBalance = walletData.balance - amount;
      const { error: updateError } = await supabase
        .from('wallets')
        .update({ balance: newBalance })
        .eq('user_id', user.id);

      if (updateError) throw updateError;

      console.log('✅ Retrait effectué avec succès');

      toast.success(`Retrait de ${formatPrice(amount)} effectué avec succès !`);
      setWithdrawAmount('');
      setWithdrawOpen(false);
      await Promise.all([loadWalletData(), loadTransactions()]);
    } catch (error: any) {
      console.error('❌ Erreur retrait:', error);
      toast.error(error.message || 'Erreur lors du retrait');
    } finally {
      setProcessing(false);
    }
  };

  const handleTransfer = async () => {
    if (!user?.id || !transferAmount || !recipientId || !transferDescription) {
      toast.error('Veuillez remplir tous les champs');
      return;
    }

    const amount = parseFloat(transferAmount);
    if (isNaN(amount) || amount <= 0) {
      toast.error('Montant invalide');
      return;
    }

    if (amount > (wallet?.balance || 0)) {
      toast.error('Solde insuffisant');
      return;
    }

    if (recipientId === user.id) {
      toast.error('Vous ne pouvez pas transférer à vous-même');
      return;
    }

    setProcessing(true);
    console.log('🔄 Transfert en cours:', { amount, recipientId, userId: user.id });
    
    try {
      const { data, error } = await supabase.functions.invoke('wallet-operations', {
        body: {
          operation: 'transfer',
          amount: amount,
          recipient_id: recipientId,
          description: transferDescription
        }
      });

      console.log('✅ Réponse transfert:', { data, error });

      if (error) {
        // Si c'est une FunctionsHttpError, on essaie de récupérer le message d'erreur du body
        throw new Error(error.message || 'Erreur lors du transfert');
      }

      // Vérifier si la réponse contient une erreur
      if (data && !data.success && data.error) {
        throw new Error(data.error);
      }

      toast.success(`Transfert de ${formatPrice(amount)} effectué avec succès !`);
      setTransferAmount('');
      setRecipientId('');
      setTransferDescription('');
      setTransferOpen(false);
      await Promise.all([loadWalletData(), loadTransactions()]);
    } catch (error: any) {
      console.error('❌ Erreur transfert:', error);
      // Afficher le message d'erreur spécifique
      const errorMessage = error.message || error.error || 'Erreur lors du transfert';
      toast.error(errorMessage);
    } finally {
      setProcessing(false);
    }
  };

  const formatPrice = (amount: number) => {
    return new Intl.NumberFormat('fr-FR').format(amount) + ' GNF';
  };

  const getTransactionType = (tx: Transaction) => {
    if (tx.sender_id === user?.id && tx.receiver_id === user?.id) {
      return tx.method === 'deposit' ? 'Dépôt' : 'Retrait';
    }
    return tx.sender_id === user?.id ? 'Envoi' : 'Réception';
  };

  const getTransactionColor = (tx: Transaction) => {
    if (tx.sender_id === user?.id && tx.receiver_id === user?.id) {
      return tx.method === 'deposit' ? 'text-green-600' : 'text-orange-600';
    }
    return tx.sender_id === user?.id ? 'text-red-600' : 'text-green-600';
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-center">
            <RefreshCw className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="shadow-elegant">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-client-gradient flex items-center justify-center">
              <Wallet className="w-6 h-6 text-white" />
            </div>
            <div>
              <CardTitle>Mon Wallet</CardTitle>
              <CardDescription>Gérez vos transactions</CardDescription>
            </div>
          </div>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => Promise.all([loadWalletData(), loadTransactions()])}
          >
            <RefreshCw className="w-4 h-4" />
          </Button>
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Solde */}
        <div className="bg-client-gradient rounded-lg p-6 text-white">
          <p className="text-sm opacity-90 mb-1">Solde disponible</p>
          <p className="text-3xl font-bold">
            {wallet ? formatPrice(wallet.balance) : 'Chargement...'}
          </p>
        </div>

        {/* Boutons d'actions */}
        <div className="grid grid-cols-3 gap-3">
          {/* Dépôt */}
          <Dialog open={depositOpen} onOpenChange={setDepositOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" className="flex flex-col h-20 gap-2">
                <ArrowDownToLine className="w-5 h-5 text-green-600" />
                <span className="text-xs">Dépôt</span>
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Effectuer un dépôt</DialogTitle>
                <DialogDescription>
                  Ajoutez des fonds à votre wallet
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="deposit-amount">Montant (GNF)</Label>
                  <Input
                    id="deposit-amount"
                    type="number"
                    placeholder="10000"
                    value={depositAmount}
                    onChange={(e) => setDepositAmount(e.target.value)}
                  />
                </div>
                <Button 
                  onClick={handleDeposit} 
                  disabled={processing || !depositAmount}
                  className="w-full bg-green-600 hover:bg-green-700"
                >
                  {processing ? 'Traitement...' : 'Confirmer le dépôt'}
                </Button>
              </div>
            </DialogContent>
          </Dialog>

          {/* Retrait */}
          <Dialog open={withdrawOpen} onOpenChange={setWithdrawOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" className="flex flex-col h-20 gap-2">
                <ArrowUpFromLine className="w-5 h-5 text-orange-600" />
                <span className="text-xs">Retrait</span>
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Effectuer un retrait</DialogTitle>
                <DialogDescription>
                  Retirez des fonds de votre wallet
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="withdraw-amount">Montant (GNF)</Label>
                  <Input
                    id="withdraw-amount"
                    type="number"
                    placeholder="10000"
                    value={withdrawAmount}
                    onChange={(e) => setWithdrawAmount(e.target.value)}
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Solde disponible: {wallet ? formatPrice(wallet.balance) : '0 GNF'}
                  </p>
                </div>
                <Button 
                  onClick={handleWithdraw} 
                  disabled={processing || !withdrawAmount}
                  className="w-full bg-orange-600 hover:bg-orange-700"
                >
                  {processing ? 'Traitement...' : 'Confirmer le retrait'}
                </Button>
              </div>
            </DialogContent>
          </Dialog>

          {/* Transfert */}
          <Dialog open={transferOpen} onOpenChange={setTransferOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" className="flex flex-col h-20 gap-2">
                <Send className="w-5 h-5 text-blue-600" />
                <span className="text-xs">Transfert</span>
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Effectuer un transfert</DialogTitle>
                <DialogDescription>
                  Transférez des fonds à un autre utilisateur
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="recipient-id">Code du destinataire</Label>
                  <Input
                    id="recipient-id"
                    placeholder="Ex: ABC1234"
                    value={recipientId}
                    onChange={(e) => setRecipientId(e.target.value.toUpperCase())}
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Entrez le code d'identification de 7 caractères du destinataire
                  </p>
                </div>
                <div>
                  <Label htmlFor="transfer-amount">Montant (GNF)</Label>
                  <Input
                    id="transfer-amount"
                    type="number"
                    placeholder="10000"
                    value={transferAmount}
                    onChange={(e) => setTransferAmount(e.target.value)}
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Solde disponible: {wallet ? formatPrice(wallet.balance) : '0 GNF'}
                  </p>
                </div>
                <div>
                  <Label htmlFor="transfer-description">Motif du transfert</Label>
                  <Input
                    id="transfer-description"
                    placeholder="Ex: Paiement facture, Remboursement..."
                    value={transferDescription}
                    onChange={(e) => setTransferDescription(e.target.value)}
                  />
                </div>
                <Button 
                  onClick={handleTransfer} 
                  disabled={processing || !transferAmount || !recipientId || !transferDescription}
                  className="w-full bg-blue-600 hover:bg-blue-700"
                >
                  {processing ? 'Traitement...' : 'Confirmer le transfert'}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {/* Historique des transactions */}
        <div>
          <div className="flex items-center gap-2 mb-3">
            <History className="w-5 h-5 text-muted-foreground" />
            <h3 className="font-semibold">Historique récent</h3>
          </div>
          
          {transactions.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <History className="w-12 h-12 mx-auto mb-2 opacity-50" />
              <p className="text-sm">Aucune transaction</p>
            </div>
          ) : (
            <div className="space-y-2">
              {transactions.map((tx) => (
                <div
                  key={tx.id}
                  className="flex items-center justify-between p-3 bg-muted/50 rounded-lg hover:bg-muted transition-colors"
                >
                  <div className="flex-1">
                    <p className="font-medium text-sm">{getTransactionType(tx)}</p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(tx.created_at).toLocaleDateString('fr-FR', {
                        day: '2-digit',
                        month: 'short',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className={`font-bold ${getTransactionColor(tx)}`}>
                      {tx.sender_id === user?.id && tx.receiver_id !== user?.id ? '-' : '+'}
                      {formatPrice(tx.amount)}
                    </p>
                    <Badge variant={tx.status === 'completed' ? 'default' : 'secondary'} className="text-xs">
                      {tx.status}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default UniversalWalletTransactions;
