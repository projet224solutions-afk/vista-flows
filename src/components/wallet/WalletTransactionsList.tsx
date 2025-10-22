/**
 * 📋 LISTE DES TRANSACTIONS WALLET
 * Historique complet avec filtres et détails
 */

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { PublicIdBadge } from '@/components/PublicIdBadge';
import { useWallet } from '@/hooks/useWallet';
import { useAuth } from '@/hooks/useAuth';
import {
  History,
  ArrowUpRight,
  ArrowDownLeft,
  RefreshCw,
  Filter,
  Calendar
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useState } from 'react';

export function WalletTransactionsList() {
  const { user } = useAuth();
  const { transactions, loading, refresh } = useWallet();
  const [filter, setFilter] = useState<'all' | 'sent' | 'received'>('all');

  const getTransactionType = (tx: any) => {
    if (tx.sender_id === user?.id && tx.receiver_id === user?.id) {
      return tx.method === 'deposit' ? 'Dépôt' : 'Retrait';
    }
    return tx.sender_id === user?.id ? 'Envoi' : 'Réception';
  };

  const getTransactionIcon = (tx: any) => {
    if (tx.sender_id === user?.id && tx.receiver_id !== user?.id) {
      return <ArrowUpRight className="w-4 h-4 text-red-600" />;
    }
    return <ArrowDownLeft className="w-4 h-4 text-green-600" />;
  };

  const getTransactionColor = (tx: any) => {
    if (tx.sender_id === user?.id && tx.receiver_id !== user?.id) {
      return 'text-red-600';
    }
    return 'text-green-600';
  };

  const filteredTransactions = transactions.filter(tx => {
    if (filter === 'all') return true;
    if (filter === 'sent') return tx.sender_id === user?.id && tx.receiver_id !== user?.id;
    if (filter === 'received') return tx.receiver_id === user?.id && tx.sender_id !== user?.id;
    return true;
  });

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
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-purple-100 flex items-center justify-center">
              <History className="w-5 h-5 text-purple-600" />
            </div>
            <div>
              <CardTitle>Historique des transactions</CardTitle>
              <p className="text-sm text-muted-foreground">
                {filteredTransactions.length} transaction(s)
              </p>
            </div>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={refresh}
            className="gap-2"
          >
            <RefreshCw className="w-4 h-4" />
            Actualiser
          </Button>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Filtres */}
        <div className="flex gap-2">
          <Button
            variant={filter === 'all' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setFilter('all')}
          >
            Toutes
          </Button>
          <Button
            variant={filter === 'sent' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setFilter('sent')}
          >
            Envoyées
          </Button>
          <Button
            variant={filter === 'received' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setFilter('received')}
          >
            Reçues
          </Button>
        </div>

        {/* Liste transactions */}
        {filteredTransactions.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <History className="w-16 h-16 mx-auto mb-3 opacity-30" />
            <p className="text-lg font-medium mb-1">Aucune transaction</p>
            <p className="text-sm">
              {filter === 'all' ? 'Votre historique apparaîtra ici' : 'Aucune transaction dans cette catégorie'}
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {filteredTransactions.map((tx) => (
              <div
                key={tx.id}
                className="flex items-center gap-4 p-4 bg-muted/50 rounded-lg border border-border/50 hover:bg-muted transition-colors"
              >
                {/* Icône */}
                <div className="w-10 h-10 rounded-full bg-background flex items-center justify-center border">
                  {getTransactionIcon(tx)}
                </div>

                {/* Détails */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <p className="font-medium text-sm">
                      {getTransactionType(tx)}
                    </p>
                    {tx.public_id && (
                      <PublicIdBadge
                        publicId={tx.public_id}
                        variant="outline"
                        size="sm"
                      />
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {new Date(tx.created_at).toLocaleDateString('fr-FR', {
                      day: '2-digit',
                      month: 'short',
                      year: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </p>
                  {tx.metadata?.description && (
                    <p className="text-xs text-muted-foreground mt-1">
                      {tx.metadata.description}
                    </p>
                  )}
                </div>

                {/* Montant et statut */}
                <div className="text-right">
                  <p className={`text-lg font-bold ${getTransactionColor(tx)}`}>
                    {tx.sender_id === user?.id && tx.receiver_id !== user?.id ? '-' : '+'}
                    {tx.amount.toLocaleString()}
                    <span className="text-xs ml-1">{tx.currency}</span>
                  </p>
                  <Badge 
                    variant={tx.status === 'completed' ? 'default' : tx.status === 'pending' ? 'secondary' : 'destructive'}
                    className="text-xs"
                  >
                    {tx.status}
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default WalletTransactionsList;
