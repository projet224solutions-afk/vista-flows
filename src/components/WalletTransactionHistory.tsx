import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { 
  ArrowUpDown, 
  ArrowUp, 
  ArrowDown, 
  Clock, 
  XCircle,
  RefreshCw,
  History
} from 'lucide-react';

interface Transaction {
  id: string | number;
  amount: number;
  sender_id: string;
  receiver_id: string;
  sender_custom_id?: string;
  receiver_custom_id?: string;
  sender_name?: string;
  receiver_name?: string;
  method: string;
  created_at: string;
  status: string;
}

interface WalletTransactionHistoryProps {
  className?: string;
  limit?: number;
}

export const WalletTransactionHistory = ({ 
  className = '', 
  limit = 50 
}: WalletTransactionHistoryProps) => {
  const { user } = useAuth();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [walletCurrency, setWalletCurrency] = useState<string>('GNF');
  const [showAll, setShowAll] = useState(false);
  const INITIAL_DISPLAY_COUNT = 3;

  useEffect(() => {
    if (user) {
      loadTransactions();
    }
  }, [user]);

  const loadTransactions = async () => {
    if (!user) return;

    setLoading(true);
    setError(null);
    try {
      // Récupérer le wallet de l'utilisateur
      const { data: walletData, error: walletError } = await supabase
        .from('wallets')
        .select('id, balance, currency')
        .eq('user_id', user.id)
        .single();

      if (walletError) {
        console.error('Erreur récupération wallet:', walletError);
        setError('Impossible de charger votre portefeuille');
        return;
      }

      if (walletData) {
        setWalletCurrency(walletData.currency);

        // Récupérer les transactions depuis enhanced_transactions (exclure archivées)
        const { data: transactionsData, error: transactionsError } = await (supabase
          .from('enhanced_transactions' as any)
          .select('id, amount, sender_id, receiver_id, method, created_at, status')
          .or(`sender_id.eq.${user.id},receiver_id.eq.${user.id}`)
          .order('created_at', { ascending: false })
          .limit(limit) as any);

        if (transactionsError) {
          console.error('Erreur récupération transactions:', transactionsError);
          setError(`Impossible de charger l'historique: ${transactionsError.message}`);
        } else if (transactionsData) {
          const txArray = (transactionsData || []) as Array<{ id: string | number; amount: number; sender_id: string; receiver_id: string; method: string; created_at: string; status: string }>;
          // Collecter tous les IDs uniques d'un coup (1 requête au lieu de 2 par transaction)
          const uniqueUserIds = [...new Set(txArray.flatMap(tx => [tx.sender_id, tx.receiver_id].filter(Boolean)))];
          let profilesMap: Record<string, { public_id?: string; full_name?: string }> = {};
          if (uniqueUserIds.length > 0) {
            const { data: profilesData } = await supabase
              .from('profiles')
              .select('id, public_id, full_name')
              .in('id', uniqueUserIds);
            if (profilesData) {
              profilesMap = Object.fromEntries(profilesData.map(p => [p.id, p]));
            }
          }
          const enrichedTransactions = txArray.map((tx) => ({
            id: tx.id,
            amount: tx.amount,
            sender_id: tx.sender_id,
            receiver_id: tx.receiver_id,
            method: tx.method,
            created_at: tx.created_at,
            status: tx.status,
            sender_custom_id: profilesMap[tx.sender_id]?.public_id || tx.sender_id?.slice(0, 8),
            receiver_custom_id: profilesMap[tx.receiver_id]?.public_id || tx.receiver_id?.slice(0, 8),
            sender_name: profilesMap[tx.sender_id]?.full_name || 'Utilisateur',
            receiver_name: profilesMap[tx.receiver_id]?.full_name || 'Utilisateur'
          }));
          setTransactions(enrichedTransactions);
        }
      }

    } catch (error: any) {
      console.error('Erreur chargement transactions:', error);
      setError(error?.message || 'Une erreur inattendue s\'est produite');
    } finally {
      setLoading(false);
    }
  };

  const getTransactionIcon = (transaction: Transaction, status: string) => {
    if (status === 'pending') return <Clock className="w-4 h-4 text-orange-500" />;
    if (status === 'failed') return <XCircle className="w-4 h-4 text-red-500" />;
    
    // Déterminer si c'est un crédit ou débit basé sur sender_id
    const isCredit = transaction.receiver_id === user?.id;
    if (isCredit) return <ArrowUp className="w-4 h-4 text-green-500" />;
    return <ArrowDown className="w-4 h-4 text-red-500" />;
  };

  const getStatusBadge = (status: string) => {
    const variants = {
      completed: 'bg-green-100 text-green-700',
      pending: 'bg-orange-100 text-orange-700',
      failed: 'bg-red-100 text-red-700'
    };

    const labels = {
      completed: 'Terminé',
      pending: 'En cours',
      failed: 'Échoué'
    };

    return (
      <Badge className={variants[status as keyof typeof variants] || variants.pending}>
        {labels[status as keyof typeof labels] || status}
      </Badge>
    );
  };

  const formatAmount = (amount: number, transaction: Transaction) => {
    const isCredit = transaction.receiver_id === user?.id;
    const sign = isCredit ? '+' : '-';
    return `${sign}${Math.abs(amount).toLocaleString()} ${walletCurrency}`;
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (loading) {
    return (
      <Card className={className}>
        <CardContent className="p-6">
          <div className="animate-pulse space-y-4">
            <div className="h-4 bg-gray-200 rounded w-3/4"></div>
            <div className="h-4 bg-gray-200 rounded w-1/2"></div>
            <div className="h-4 bg-gray-200 rounded w-2/3"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  const displayedTransactions = showAll 
    ? transactions 
    : transactions.slice(0, INITIAL_DISPLAY_COUNT);

  return (
    <Card className={`${className} border-2 border-green-100 bg-gradient-to-br from-green-50 to-emerald-50`}>
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <History className="w-5 h-5 text-green-600" />
            Historique des transactions
          </CardTitle>
          <Button
            size="sm"
            variant="outline"
            onClick={loadTransactions}
            disabled={loading}
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </CardHeader>

      <CardContent>
        {error ? (
          <div className="text-center py-8">
            <XCircle className="w-12 h-12 text-red-400 mx-auto mb-3" />
            <p className="text-red-600 font-semibold mb-2">Erreur de chargement</p>
            <p className="text-sm text-gray-600 mb-4">
              {error}
            </p>
            <Button 
              onClick={loadTransactions} 
              variant="outline"
              size="sm"
              disabled={loading}
            >
              <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
              Réessayer
            </Button>
          </div>
        ) : transactions.length === 0 ? (
          <div className="text-center py-8">
            <ArrowUpDown className="w-12 h-12 text-gray-400 mx-auto mb-3" />
            <p className="text-gray-600 mb-2">Aucune transaction</p>
            <p className="text-sm text-gray-500">
              Vos transactions apparaîtront ici
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {displayedTransactions.map((transaction) => (
              <div
                key={transaction.id}
                className="flex items-center justify-between p-3 bg-white/60 rounded-lg border border-green-200 hover:bg-white/80 transition-colors"
              >
                <div className="flex items-center gap-3">
                  {getTransactionIcon(transaction, transaction.status)}
                  <div>
                    <p className="font-medium text-gray-800">
                      {transaction.receiver_id === user?.id ? 'Reçu de' : 'Envoyé à'}{' '}
                      <span className="text-foreground">
                        {transaction.receiver_id === user?.id 
                          ? (transaction.sender_name || 'Utilisateur')
                          : (transaction.receiver_name || 'Utilisateur')}
                      </span>
                      {' '}
                      <span className="font-mono text-xs text-muted-foreground">
                        ({transaction.receiver_id === user?.id 
                          ? transaction.sender_custom_id 
                          : transaction.receiver_custom_id})
                      </span>
                    </p>
                    <p className="text-xs text-gray-500">
                      {transaction.method} • {formatDate(transaction.created_at)}
                    </p>
                  </div>
                </div>
                
                <div className="text-right">
                  <p className={`font-bold ${
                    transaction.receiver_id === user?.id
                      ? 'text-green-600' 
                      : 'text-red-600'
                  }`}>
                    {formatAmount(transaction.amount, transaction)}
                  </p>
                  {getStatusBadge(transaction.status)}
                </div>
              </div>
            ))}
            
            {transactions.length > INITIAL_DISPLAY_COUNT && (
              <div className="text-center pt-4">
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => setShowAll(!showAll)}
                >
                  {showAll ? 'Voir moins' : `Voir tout (${transactions.length} transactions)`}
                </Button>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default WalletTransactionHistory;
