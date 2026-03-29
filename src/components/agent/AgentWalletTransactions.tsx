import { useState, useEffect } from 'react';
import { useFormatCurrency } from '@/hooks/useFormatCurrency';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { 
  Wallet, 
  RefreshCw,
  History,
  TrendingUp,
  TrendingDown
} from 'lucide-react';

interface AgentWalletInfo {
  id: string;
  agent_id: string;
  balance: number;
  currency: string;
}

interface _AgentTransaction {
  id: string;
  agent_id: string;
  transaction_type: string;
  amount: number;
  balance_before: number;
  balance_after: number;
  description: string | null;
  metadata: any;
  created_at: string;
}

interface AgentWalletTransactionsProps {
  agentId: string;
  agentCode?: string;
}

export function AgentWalletTransactions({ agentId, agentCode }: AgentWalletTransactionsProps) {
  const [wallet, setWallet] = useState<AgentWalletInfo | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (agentId) {
      loadWalletData();
      loadTransactions();
      subscribeToChanges();
    }
  }, [agentId]);

  const loadWalletData = async () => {
    if (!agentId) return;

    try {
      const { data, error } = await supabase
        .from('agent_wallets')
        .select('*')
        .eq('agent_id', agentId)
        .single();

      if (error) {
        console.error('❌ Erreur chargement wallet agent:', error);
        
        // Si le wallet n'existe pas, essayer de l'initialiser
        if (error.code === 'PGRST116') {
          console.log('⚠️ Wallet agent non trouvé, initialisation...');
          // Le wallet sera créé automatiquement par le trigger
          // Réessayer après un délai
          setTimeout(() => loadWalletData(), 2000);
          return;
        }
        
        throw error;
      }

      setWallet(data);
    } catch (error) {
      console.error('Erreur chargement wallet agent:', error);
      toast.error('Impossible de charger le wallet');
    } finally {
      setLoading(false);
    }
  };

  const loadTransactions = async () => {
    if (!agentId) return;

    try {
      // Pour l'instant, pas de table de transactions pour les agents
      // Cette fonctionnalité sera ajoutée plus tard
      console.log('Transactions cleared');
    } catch (error) {
      console.error('Erreur chargement transactions:', error);
    }
  };

  const subscribeToChanges = () => {
    const channel = supabase
      .channel(`agent-wallet-${agentId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'agent_wallets',
          filter: `agent_id=eq.${agentId}`,
        },
        () => {
          console.log('💰 Wallet agent mis à jour');
          loadWalletData();
        }
      )
      .subscribe();

    return () => {
      channel.unsubscribe();
    };
  };

  const formatAmount = useFormatCurrency();

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getTransactionIcon = (type: string) => {
    switch (type) {
      case 'commission':
      case 'credit':
      case 'deposit':
        return <TrendingUp className="w-4 h-4 text-green-500" />;
      case 'debit':
      case 'withdrawal':
      case 'transfer_out':
        return <TrendingDown className="w-4 h-4 text-red-500" />;
      default:
        return <History className="w-4 h-4 text-muted-foreground" />;
    }
  };

  const getTransactionColor = (type: string) => {
    switch (type) {
      case 'commission':
      case 'credit':
      case 'deposit':
        return 'text-green-600';
      case 'debit':
      case 'withdrawal':
      case 'transfer_out':
        return 'text-red-600';
      default:
        return 'text-muted-foreground';
    }
  };

  const handleRefresh = () => {
    loadWalletData();
    loadTransactions();
    toast.success('Données actualisées');
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="py-8">
          <div className="flex items-center justify-center gap-2">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
            <span className="text-sm text-muted-foreground">Chargement du wallet...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!wallet) {
    return (
      <Card className="border-blue-200 bg-blue-50">
        <CardContent className="py-8">
          <div className="flex flex-col items-center justify-center gap-3">
            <Wallet className="w-12 h-12 text-blue-600" />
            <div className="text-center">
              <h3 className="font-semibold text-blue-900">Initialisation du wallet...</h3>
              <p className="text-sm text-blue-700 mt-1">
                Votre wallet agent est en cours de création. Veuillez patienter.
              </p>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={loadWalletData}
                className="mt-4"
              >
                <RefreshCw className="w-4 h-4 mr-2" />
                Actualiser
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Solde principal */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-primary/10 rounded-lg">
                <Wallet className="w-6 h-6 text-primary" />
              </div>
              <div>
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Wallet Agent {agentCode ? `(${agentCode})` : ''}
                </CardTitle>
                <p className="text-3xl font-bold text-primary mt-1">
                  {formatAmount(wallet.balance)} {wallet.currency}
                </p>
              </div>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={handleRefresh}
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              Actualiser
            </Button>
          </div>
        </CardHeader>
      </Card>

      {/* Onglets */}
      <Tabs defaultValue="transactions" className="w-full">
        <TabsList className="grid w-full grid-cols-1">
          <TabsTrigger value="transactions">
            <History className="w-4 h-4 mr-2" />
            Historique des transactions
          </TabsTrigger>
        </TabsList>

        <TabsContent value="transactions" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Dernières transactions</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center py-12 text-muted-foreground">
                <History className="w-16 h-16 mx-auto mb-4 opacity-50" />
                <p className="text-lg font-medium mb-2">Historique des transactions à venir</p>
                <p className="text-sm">
                  Le système de transactions pour les wallets agents sera bientôt disponible.
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

export default AgentWalletTransactions;
