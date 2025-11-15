import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { Shield, CheckCircle, XCircle, Clock, RefreshCw } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';

interface EscrowTransaction {
  id: string;
  amount: number;
  currency: string;
  status: string;
  payer_id: string;
  receiver_id: string;
  order_id: string;
  created_at: string;
  released_at: string | null;
}

export default function PDGEscrowManagement() {
  const [transactions, setTransactions] = useState<EscrowTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [releasing, setReleasing] = useState<string | null>(null);

  const loadTransactions = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('escrow_transactions')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;
      setTransactions(data || []);
    } catch (error: any) {
      console.error('Erreur chargement escrow:', error);
      toast.error('Impossible de charger les transactions escrow');
    } finally {
      setLoading(false);
    }
  };

  const handleRelease = async (escrowId: string) => {
    setReleasing(escrowId);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        toast.error('Non authentifié');
        return;
      }

      const response = await fetch(
        `https://uakkxaibujzxdiqzpnpr.supabase.co/functions/v1/escrow-release`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({ escrowId, commissionPercent: 0 }),
        }
      );

      const result = await response.json();

      if (response.ok) {
        toast.success('Fonds libérés avec succès');
        loadTransactions();
      } else {
        throw new Error(result.error || 'Échec de la libération');
      }
    } catch (error: any) {
      console.error('Erreur libération:', error);
      toast.error(error.message || 'Échec de la libération des fonds');
    } finally {
      setReleasing(null);
    }
  };

  useEffect(() => {
    loadTransactions();
    const interval = setInterval(loadTransactions, 30000);
    return () => clearInterval(interval);
  }, []);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'held':
        return (
          <Badge variant="secondary" className="gap-1">
            <Clock className="w-3 h-3" />
            En attente
          </Badge>
        );
      case 'released':
        return (
          <Badge variant="default" className="gap-1 bg-green-500">
            <CheckCircle className="w-3 h-3" />
            Libéré
          </Badge>
        );
      case 'refunded':
        return (
          <Badge variant="destructive" className="gap-1">
            <XCircle className="w-3 h-3" />
            Remboursé
          </Badge>
        );
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="flex items-center gap-3">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
          <span className="text-muted-foreground">Chargement des transactions escrow...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Shield className="w-6 h-6" />
            Gestion Escrow - Données Réelles
          </h2>
          <p className="text-muted-foreground mt-1">
            {transactions.length} transactions • {transactions.filter(t => t.status === 'held').length} en attente
          </p>
        </div>
        <Button onClick={loadTransactions} variant="outline" size="sm">
          <RefreshCw className="w-4 h-4 mr-2" />
          Actualiser
        </Button>
      </div>

      <ScrollArea className="h-[600px]">
        <div className="space-y-4">
          {transactions.map((transaction) => (
            <Card key={transaction.id}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg">
                    {(transaction.amount / 1000).toFixed(0)}k {transaction.currency}
                  </CardTitle>
                  {getStatusBadge(transaction.status)}
                </div>
                <CardDescription>
                  Transaction ID: {transaction.id.slice(0, 8)}...
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Commande:</span>
                    <span className="font-mono text-xs">{transaction.order_id.slice(0, 12)}...</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Date:</span>
                    <span>{new Date(transaction.created_at).toLocaleString('fr-FR')}</span>
                  </div>
                  {transaction.released_at && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Libéré le:</span>
                      <span>{new Date(transaction.released_at).toLocaleString('fr-FR')}</span>
                    </div>
                  )}
                  {transaction.status === 'held' && (
                    <div className="pt-3">
                      <Button
                        onClick={() => handleRelease(transaction.id)}
                        disabled={releasing === transaction.id}
                        className="w-full"
                        size="sm"
                      >
                        {releasing === transaction.id ? (
                          <>
                            <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                            Libération...
                          </>
                        ) : (
                          <>
                            <CheckCircle className="w-4 h-4 mr-2" />
                            Libérer les fonds
                          </>
                        )}
                      </Button>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}

          {transactions.length === 0 && (
            <Card>
              <CardContent className="pt-6 text-center text-muted-foreground">
                Aucune transaction escrow trouvée
              </CardContent>
            </Card>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
