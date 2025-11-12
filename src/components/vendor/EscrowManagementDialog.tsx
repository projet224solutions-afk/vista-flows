import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { useEscrowTransactions } from '@/hooks/useEscrowTransactions';
import { useAuth } from '@/hooks/useAuth';
import { AlertCircle, CheckCircle, Clock, XCircle, Bell } from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

interface EscrowManagementDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const statusConfig = {
  pending: {
    label: 'En attente',
    className: 'bg-yellow-100 text-yellow-800',
    icon: Clock
  },
  held: {
    label: 'Bloqué',
    className: 'bg-orange-100 text-orange-800',
    icon: AlertCircle
  },
  released: {
    label: 'Libéré',
    className: 'bg-green-100 text-green-800',
    icon: CheckCircle
  },
  refunded: {
    label: 'Remboursé',
    className: 'bg-blue-100 text-blue-800',
    icon: XCircle
  },
  dispute: {
    label: 'Litige',
    className: 'bg-red-100 text-red-800',
    icon: AlertCircle
  }
};

export default function EscrowManagementDialog({
  open,
  onOpenChange
}: EscrowManagementDialogProps) {
  const { profile } = useAuth();
  const { transactions, loading, releaseEscrow, refundEscrow, disputeEscrow, requestRelease } = useEscrowTransactions();
  const [selectedTransaction, setSelectedTransaction] = useState<string | null>(null);
  const [actionType, setActionType] = useState<'release' | 'refund' | 'dispute' | 'request' | null>(null);
  
  const isAdmin = profile?.role === 'admin';

  const handleAction = async () => {
    if (!selectedTransaction) return;

    try {
      switch (actionType) {
        case 'release':
          await releaseEscrow(selectedTransaction, 2.5);
          break;
        case 'refund':
          await refundEscrow(selectedTransaction);
          break;
        case 'dispute':
          await disputeEscrow(selectedTransaction);
          break;
        case 'request':
          await requestRelease(selectedTransaction);
          break;
      }
      setSelectedTransaction(null);
      setActionType(null);
    } catch (error) {
      console.error('Erreur lors de l\'action escrow:', error);
    }
  };

  const openActionDialog = (transactionId: string, action: 'release' | 'refund' | 'dispute' | 'request') => {
    setSelectedTransaction(transactionId);
    setActionType(action);
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Gestion des Transactions Escrow</DialogTitle>
            <DialogDescription>
              Gérez les transactions sécurisées avec escrow
            </DialogDescription>
          </DialogHeader>

          {loading ? (
            <div className="py-8 text-center">Chargement des transactions...</div>
          ) : transactions.length === 0 ? (
            <div className="py-8 text-center">
              <Clock className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">Aucune transaction escrow</h3>
              <p className="text-muted-foreground">
                Les transactions escrow apparaîtront ici
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {transactions.map((transaction) => {
                const config = statusConfig[transaction.status as keyof typeof statusConfig] || statusConfig.pending;
                const StatusIcon = config.icon;

                return (
                  <Card key={transaction.id}>
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <h4 className="font-medium">
                              Commande: {transaction.order_id}
                            </h4>
                            <Badge className={config.className}>
                              <StatusIcon className="w-3 h-3 mr-1" />
                              {config.label}
                            </Badge>
                          </div>
                          
                          <div className="grid grid-cols-2 gap-4 text-sm text-muted-foreground">
                            <div>
                              <p>Montant: <span className="font-semibold text-foreground">
                                {transaction.amount.toLocaleString()} {transaction.currency}
                              </span></p>
                              <p>Commission: {transaction.commission_percent}% 
                                ({transaction.commission_amount.toLocaleString()} {transaction.currency})
                              </p>
                            </div>
                            <div>
                              <p>Créé le: {new Date(transaction.created_at).toLocaleDateString('fr-FR')}</p>
                              <p>Mis à jour: {new Date(transaction.updated_at).toLocaleDateString('fr-FR')}</p>
                            </div>
                          </div>
                        </div>

                        {(transaction.status === 'pending' || transaction.status === 'held') && (
                          <div className="flex gap-2 ml-4">
                            {isAdmin ? (
                              <Button
                                size="sm"
                                variant="default"
                                onClick={() => openActionDialog(transaction.id, 'release')}
                              >
                                Libérer (Admin)
                              </Button>
                            ) : (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => openActionDialog(transaction.id, 'request')}
                              >
                                <Bell className="w-4 h-4 mr-2" />
                                Demander libération
                              </Button>
                            )}
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => openActionDialog(transaction.id, 'refund')}
                            >
                              Rembourser
                            </Button>
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={() => openActionDialog(transaction.id, 'dispute')}
                            >
                              Litige
                            </Button>
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!actionType} onOpenChange={() => {
        setActionType(null);
        setSelectedTransaction(null);
      }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {actionType === 'release' && 'Libérer les fonds (Admin)'}
              {actionType === 'request' && 'Demander la libération'}
              {actionType === 'refund' && 'Rembourser la transaction'}
              {actionType === 'dispute' && 'Ouvrir un litige'}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {actionType === 'release' && 'Les fonds seront transférés au vendeur avec commission. Cette action est irréversible.'}
              {actionType === 'request' && 'Une notification sera envoyée à l\'administrateur pour demander la libération des fonds. Le client peut aussi confirmer la réception pour libérer automatiquement.'}
              {actionType === 'refund' && 'Les fonds seront retournés au payeur. Cette action est irréversible.'}
              {actionType === 'dispute' && 'Un litige sera ouvert sur cette transaction. Elle sera mise en attente.'}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction onClick={handleAction}>
              Confirmer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
