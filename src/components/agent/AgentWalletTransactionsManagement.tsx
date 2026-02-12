import { useState, useEffect } from 'react';
import { useFormatCurrency } from '@/hooks/useFormatCurrency';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  Wallet, ArrowUpRight, ArrowDownLeft, Send, RefreshCw, 
  Search, Filter, Clock, CheckCircle, XCircle, AlertTriangle,
  CreditCard, Building2, User
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

interface AgentWalletTransactionsManagementProps {
  agentId: string;
}

interface WalletTransaction {
  id: number;
  transaction_id: string;
  amount: number;
  fee: number;
  net_amount: number;
  currency: string;
  transaction_type: string;
  status: string;
  description: string;
  created_at: string;
  sender_user_id: string;
  receiver_user_id: string;
}

export function AgentWalletTransactionsManagement({ agentId }: AgentWalletTransactionsManagementProps) {
  const [transactions, setTransactions] = useState<WalletTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [walletBalance, setWalletBalance] = useState(0);
  const [walletId, setWalletId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [isTransferDialogOpen, setIsTransferDialogOpen] = useState(false);
  const [transferData, setTransferData] = useState({
    recipientId: '',
    amount: '',
    description: ''
  });
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    loadWalletData();
  }, [agentId]);

  const loadWalletData = async () => {
    try {
      setLoading(true);

      // Charger le wallet de l'agent
      const { data: wallet, error: walletError } = await supabase
        .from('agent_wallets')
        .select('id, balance, currency')
        .eq('agent_id', agentId)
        .single();

      if (walletError && walletError.code !== 'PGRST116') {
        console.error('Erreur wallet:', walletError);
      }

      if (wallet) {
        setWalletBalance(wallet.balance || 0);
        setWalletId(wallet.id);
      }

      // Charger les transactions récentes
      const { data: txData, error: txError } = await supabase
        .from('wallet_transactions')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(100);

      if (txError) {
        console.error('Erreur transactions:', txError);
      }

      setTransactions(txData || []);

    } catch (error: any) {
      console.error('Erreur chargement wallet:', error);
      toast.error('Erreur lors du chargement');
    } finally {
      setLoading(false);
    }
  };

  const handleTransfer = async () => {
    if (!transferData.recipientId || !transferData.amount) {
      toast.error('Veuillez remplir tous les champs obligatoires');
      return;
    }

    const amount = parseFloat(transferData.amount);
    if (isNaN(amount) || amount <= 0) {
      toast.error('Montant invalide');
      return;
    }

    if (amount > walletBalance) {
      toast.error('Solde insuffisant');
      return;
    }

    try {
      setProcessing(true);

      // Appel à une fonction RPC pour le transfert sécurisé
      const { data, error } = await supabase.rpc('agent_wallet_transfer' as any, {
        p_agent_id: agentId,
        p_recipient_id: transferData.recipientId,
        p_amount: amount,
        p_description: transferData.description || 'Transfert agent'
      });

      if (error) throw error;

      toast.success('Transfert effectué avec succès');
      setIsTransferDialogOpen(false);
      setTransferData({ recipientId: '', amount: '', description: '' });
      loadWalletData();

    } catch (error: any) {
      console.error('Erreur transfert:', error);
      toast.error(error.message || 'Erreur lors du transfert');
    } finally {
      setProcessing(false);
    }
  };

  const formatAmount = useFormatCurrency();

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'completed':
        return <Badge className="bg-green-100 text-green-700"><CheckCircle className="w-3 h-3 mr-1" />Complété</Badge>;
      case 'pending':
        return <Badge className="bg-amber-100 text-amber-700"><Clock className="w-3 h-3 mr-1" />En attente</Badge>;
      case 'failed':
        return <Badge className="bg-red-100 text-red-700"><XCircle className="w-3 h-3 mr-1" />Échoué</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'deposit':
      case 'credit':
        return <ArrowDownLeft className="w-5 h-5 text-green-600" />;
      case 'withdrawal':
      case 'debit':
      case 'transfer':
        return <ArrowUpRight className="w-5 h-5 text-red-600" />;
      default:
        return <CreditCard className="w-5 h-5 text-muted-foreground" />;
    }
  };

  const filteredTransactions = transactions.filter(tx => {
    const matchesSearch = tx.transaction_id?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      tx.description?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType = filterType === 'all' || tx.transaction_type === filterType;
    const matchesStatus = filterStatus === 'all' || tx.status === filterStatus;
    return matchesSearch && matchesType && matchesStatus;
  });

  const transactionTypes = [...new Set(transactions.map(t => t.transaction_type).filter(Boolean))];

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header avec solde */}
      <Card className="border-0 shadow-lg overflow-hidden">
        <div className="bg-gradient-to-r from-emerald-500 to-teal-600 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-white/80 text-sm mb-1">Solde Disponible</p>
              <p className="text-3xl font-bold text-white">{formatAmount(walletBalance)} GNF</p>
            </div>
            <div className="flex items-center gap-2">
              <Button 
                variant="secondary" 
                size="sm"
                onClick={loadWalletData}
              >
                <RefreshCw className="w-4 h-4 mr-2" />
                Actualiser
              </Button>
              <Dialog open={isTransferDialogOpen} onOpenChange={setIsTransferDialogOpen}>
                <DialogTrigger asChild>
                  <Button variant="secondary" size="sm">
                    <Send className="w-4 h-4 mr-2" />
                    Transférer
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                      <Send className="w-5 h-5 text-primary" />
                      Nouveau Transfert
                    </DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div>
                      <Label>ID du destinataire *</Label>
                      <Input
                        placeholder="Entrez l'ID public du destinataire"
                        value={transferData.recipientId}
                        onChange={(e) => setTransferData({...transferData, recipientId: e.target.value})}
                      />
                    </div>
                    <div>
                      <Label>Montant (GNF) *</Label>
                      <Input
                        type="number"
                        placeholder="0"
                        value={transferData.amount}
                        onChange={(e) => setTransferData({...transferData, amount: e.target.value})}
                      />
                      <p className="text-xs text-muted-foreground mt-1">
                        Solde disponible: {formatAmount(walletBalance)} GNF
                      </p>
                    </div>
                    <div>
                      <Label>Description (optionnel)</Label>
                      <Input
                        placeholder="Motif du transfert"
                        value={transferData.description}
                        onChange={(e) => setTransferData({...transferData, description: e.target.value})}
                      />
                    </div>
                  </div>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setIsTransferDialogOpen(false)}>
                      Annuler
                    </Button>
                    <Button onClick={handleTransfer} disabled={processing}>
                      {processing ? 'Envoi...' : 'Confirmer le transfert'}
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>
          </div>
        </div>
      </Card>

      {/* Liste des transactions */}
      <Card className="border-0 shadow-lg">
        <CardHeader className="border-b">
          <CardTitle className="flex items-center gap-2">
            <Wallet className="w-5 h-5 text-primary" />
            Historique des Transactions
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6">
          {/* Filtres */}
          <div className="flex flex-wrap gap-4 mb-6">
            <div className="flex-1 min-w-[200px]">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                <Input
                  placeholder="Rechercher..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <Select value={filterType} onValueChange={setFilterType}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tous les types</SelectItem>
                {transactionTypes.map(type => (
                  <SelectItem key={type} value={type}>{type}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="Statut" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tous les statuts</SelectItem>
                <SelectItem value="completed">Complété</SelectItem>
                <SelectItem value="pending">En attente</SelectItem>
                <SelectItem value="failed">Échoué</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Liste */}
          {filteredTransactions.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Wallet className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>Aucune transaction trouvée</p>
            </div>
          ) : (
            <ScrollArea className="h-[400px]">
              <div className="space-y-3">
                {filteredTransactions.map((tx) => (
                  <div
                    key={tx.id}
                    className="flex items-center justify-between p-4 bg-muted/20 rounded-lg hover:bg-muted/30 transition-colors"
                  >
                    <div className="flex items-center gap-4">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                        tx.transaction_type === 'deposit' || tx.transaction_type === 'credit'
                          ? 'bg-green-100' : 'bg-red-100'
                      }`}>
                        {getTypeIcon(tx.transaction_type)}
                      </div>
                      <div>
                        <p className="font-medium text-foreground">
                          {tx.description || tx.transaction_type}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          ID: {tx.transaction_id?.slice(0, 12)}...
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {format(new Date(tx.created_at), 'dd MMM yyyy à HH:mm', { locale: fr })}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className={`font-bold ${
                        tx.transaction_type === 'deposit' || tx.transaction_type === 'credit'
                          ? 'text-green-600' : 'text-red-600'
                      }`}>
                        {tx.transaction_type === 'deposit' || tx.transaction_type === 'credit' ? '+' : '-'}
                        {formatAmount(tx.amount)} {tx.currency || 'GNF'}
                      </p>
                      {tx.fee > 0 && (
                        <p className="text-xs text-muted-foreground">
                          Frais: {formatAmount(tx.fee)} GNF
                        </p>
                      )}
                      {getStatusBadge(tx.status)}
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
