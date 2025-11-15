// @ts-nocheck
import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { Lock, DollarSign, CheckCircle, XCircle, Clock, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';

interface EscrowTransaction {
  id: string;
  buyer_id: string;
  seller_id: string;
  amount: number;
  status: string;
  created_at: string;
  buyer?: { first_name: string; last_name: string };
  seller?: { first_name: string; last_name: string };
}

export default function PDGEscrow() {
  const [transactions, setTransactions] = useState<EscrowTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    total: 0,
    pending: 0,
    released: 0,
    refunded: 0,
    totalAmount: 0
  });

  useEffect(() => {
    loadEscrowData();
  }, []);

  const loadEscrowData = async () => {
    setLoading(true);
    try {
      // Charger les transactions escrow
      const { data: escrowData, error } = await supabase
        .from('escrow_transactions')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;

      // Charger les profils des acheteurs et vendeurs
      const buyerIds = [...new Set(escrowData?.map(t => t.buyer_id) || [])];
      const sellerIds = [...new Set(escrowData?.map(t => t.seller_id) || [])];
      const allUserIds = [...new Set([...buyerIds, ...sellerIds])];

      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, first_name, last_name')
        .in('id', allUserIds);

      const profilesMap = new Map(profiles?.map(p => [p.id, p]) || []);

      // Associer les profils aux transactions
      const enrichedTransactions = escrowData?.map(tx => ({
        ...tx,
        buyer: profilesMap.get(tx.buyer_id),
        seller: profilesMap.get(tx.seller_id)
      })) || [];

      setTransactions(enrichedTransactions);

      // Calculer les statistiques
      const total = enrichedTransactions.length;
      const pending = enrichedTransactions.filter(t => t.status === 'pending' || t.status === 'held').length;
      const released = enrichedTransactions.filter(t => t.status === 'released' || t.status === 'completed').length;
      const refunded = enrichedTransactions.filter(t => t.status === 'refunded' || t.status === 'cancelled').length;
      const totalAmount = enrichedTransactions.reduce((sum, t) => sum + (t.amount || 0), 0);

      setStats({ total, pending, released, refunded, totalAmount });
    } catch (error) {
      console.error('Erreur chargement escrow:', error);
      toast.error('Erreur lors du chargement des données escrow');
    } finally {
      setLoading(false);
    }
  };

  const handleRelease = async (transactionId: string) => {
    try {
      const { error } = await supabase
        .from('escrow_transactions')
        .update({ status: 'released' })
        .eq('id', transactionId);

      if (error) throw error;

      // Log audit
      const { data: { user } } = await supabase.auth.getUser();
      await supabase.from('audit_logs').insert({
        actor_id: user?.id,
        action: 'ESCROW_RELEASED',
        target_type: 'escrow_transaction',
        target_id: transactionId
      });

      toast.success('Fonds libérés avec succès');
      loadEscrowData();
    } catch (error) {
      toast.error('Erreur lors de la libération des fonds');
    }
  };

  const handleRefund = async (transactionId: string) => {
    try {
      const { error } = await supabase
        .from('escrow_transactions')
        .update({ status: 'refunded' })
        .eq('id', transactionId);

      if (error) throw error;

      // Log audit
      const { data: { user } } = await supabase.auth.getUser();
      await supabase.from('audit_logs').insert({
        actor_id: user?.id,
        action: 'ESCROW_REFUNDED',
        target_type: 'escrow_transaction',
        target_id: transactionId
      });

      toast.success('Remboursement effectué avec succès');
      loadEscrowData();
    } catch (error) {
      toast.error('Erreur lors du remboursement');
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending':
      case 'held':
        return 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20';
      case 'released':
      case 'completed':
        return 'bg-green-500/10 text-green-500 border-green-500/20';
      case 'refunded':
      case 'cancelled':
        return 'bg-red-500/10 text-red-500 border-red-500/20';
      default:
        return 'bg-gray-500/10 text-gray-500 border-gray-500/20';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending':
      case 'held':
        return <Clock className="w-4 h-4" />;
      case 'released':
      case 'completed':
        return <CheckCircle className="w-4 h-4" />;
      case 'refunded':
      case 'cancelled':
        return <XCircle className="w-4 h-4" />;
      default:
        return <AlertTriangle className="w-4 h-4" />;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <Card className="border-border/40 bg-card/50 backdrop-blur-sm">
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                <Lock className="w-6 h-6 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.total}</p>
                <p className="text-sm text-muted-foreground">Total Transactions</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/40 bg-card/50 backdrop-blur-sm">
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-yellow-500/10 flex items-center justify-center">
                <Clock className="w-6 h-6 text-yellow-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.pending}</p>
                <p className="text-sm text-muted-foreground">En Attente</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/40 bg-card/50 backdrop-blur-sm">
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-green-500/10 flex items-center justify-center">
                <CheckCircle className="w-6 h-6 text-green-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.released}</p>
                <p className="text-sm text-muted-foreground">Libérées</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/40 bg-card/50 backdrop-blur-sm">
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-red-500/10 flex items-center justify-center">
                <XCircle className="w-6 h-6 text-red-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.refunded}</p>
                <p className="text-sm text-muted-foreground">Remboursées</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/40 bg-card/50 backdrop-blur-sm">
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-blue-500/10 flex items-center justify-center">
                <DollarSign className="w-6 h-6 text-blue-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{(stats.totalAmount / 1000000).toFixed(1)}M</p>
                <p className="text-sm text-muted-foreground">Montant Total (GNF)</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Transactions List */}
      <Card className="border-border/40 bg-card/50 backdrop-blur-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Lock className="w-5 h-5 text-primary" />
            Transactions Escrow
          </CardTitle>
          <CardDescription>Gestion des transactions sécurisées</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {transactions.map((tx, index) => (
              <div
                key={tx.id}
                className="p-4 rounded-xl border border-border/40 bg-muted/30 hover:bg-muted/50 transition-all duration-200 animate-fade-in"
                style={{ animationDelay: `${index * 30}ms` }}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4 flex-1">
                    <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                      {getStatusIcon(tx.status)}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <Badge variant="outline" className={getStatusColor(tx.status)}>
                          {tx.status}
                        </Badge>
                        <span className="text-sm font-semibold">
                          {tx.amount.toLocaleString()} GNF
                        </span>
                      </div>
                      <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        <span>
                          Acheteur: {tx.buyer ? `${tx.buyer.first_name} ${tx.buyer.last_name}` : 'N/A'}
                        </span>
                        <span>•</span>
                        <span>
                          Vendeur: {tx.seller ? `${tx.seller.first_name} ${tx.seller.last_name}` : 'N/A'}
                        </span>
                        <span>•</span>
                        <span>{new Date(tx.created_at).toLocaleDateString('fr-FR')}</span>
                      </div>
                    </div>
                  </div>
                  {(tx.status === 'pending' || tx.status === 'held') && (
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleRelease(tx.id)}
                        className="border-green-500/50 hover:bg-green-500/10"
                      >
                        <CheckCircle className="w-4 h-4 mr-1" />
                        Libérer
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleRefund(tx.id)}
                        className="border-red-500/50 hover:bg-red-500/10"
                      >
                        <XCircle className="w-4 h-4 mr-1" />
                        Rembourser
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            ))}
            {transactions.length === 0 && (
              <p className="text-center text-muted-foreground py-8">
                Aucune transaction escrow trouvée
              </p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
