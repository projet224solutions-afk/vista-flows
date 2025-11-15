// @ts-nocheck
import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface Debt {
  id: string;
  customer_name: string;
  customer_phone: string;
  total_amount: number;
  paid_amount: number;
  remaining_amount: number;
  minimum_installment: number;
  description: string | null;
  status: string;
  due_date: string | null;
  created_at: string;
}

interface Payment {
  id: string;
  amount: number;
  payment_method: string;
  comment: string | null;
  created_at: string;
}

interface DebtDetailsDialogProps {
  debt: Debt;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function DebtDetailsDialog({ debt, open, onOpenChange }: DebtDetailsDialogProps) {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open) {
      loadPayments();
    }
  }, [open, debt.id]);

  const loadPayments = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('debt_payments')
        .select('*')
        .eq('debt_id', debt.id)
        .order('created_at', { ascending: false });

      if (error) throw error;

      setPayments(data || []);
    } catch (error: any) {
      console.error('Erreur chargement paiements:', error);
      toast.error('Erreur lors du chargement des paiements');
    } finally {
      setLoading(false);
    }
  };

  const formatAmount = (amount: number) => {
    return new Intl.NumberFormat('fr-FR').format(amount) + ' GNF';
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('fr-FR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getPaymentMethodLabel = (method: string) => {
    const labels: Record<string, string> = {
      cash: 'Espèces',
      wallet: 'Wallet',
      mobile_money: 'Mobile Money',
      card: 'Carte Bancaire'
    };
    return labels[method] || method;
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
      in_progress: { label: 'En cours', variant: 'default' },
      paid: { label: 'Payée', variant: 'secondary' },
      overdue: { label: 'En retard', variant: 'destructive' },
      cancelled: { label: 'Annulée', variant: 'outline' }
    };

    const config = variants[status] || variants.in_progress;
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Détails de la dette</DialogTitle>
          <DialogDescription>
            Informations complètes sur la dette et l'historique des paiements
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Informations client */}
          <div className="border rounded-lg p-4 space-y-2">
            <h3 className="font-semibold text-lg mb-3">Informations Client</h3>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <span className="text-muted-foreground">Nom:</span>
                <p className="font-medium">{debt.customer_name}</p>
              </div>
              <div>
                <span className="text-muted-foreground">Téléphone:</span>
                <p className="font-medium">{debt.customer_phone}</p>
              </div>
              <div>
                <span className="text-muted-foreground">Statut:</span>
                <div className="mt-1">{getStatusBadge(debt.status)}</div>
              </div>
              <div>
                <span className="text-muted-foreground">Date de création:</span>
                <p className="font-medium">{formatDate(debt.created_at)}</p>
              </div>
            </div>
            {debt.description && (
              <div className="pt-2">
                <span className="text-muted-foreground">Description:</span>
                <p className="text-sm mt-1">{debt.description}</p>
              </div>
            )}
          </div>

          {/* Informations financières */}
          <div className="border rounded-lg p-4 space-y-3">
            <h3 className="font-semibold text-lg mb-3">Informations Financières</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center p-3 bg-muted rounded-lg">
                <p className="text-xs text-muted-foreground mb-1">Montant Total</p>
                <p className="text-lg font-bold">{formatAmount(debt.total_amount)}</p>
              </div>
              <div className="text-center p-3 bg-green-50 rounded-lg">
                <p className="text-xs text-muted-foreground mb-1">Montant Payé</p>
                <p className="text-lg font-bold text-green-600">{formatAmount(debt.paid_amount)}</p>
              </div>
              <div className="text-center p-3 bg-orange-50 rounded-lg">
                <p className="text-xs text-muted-foreground mb-1">Restant</p>
                <p className="text-lg font-bold text-orange-600">{formatAmount(debt.remaining_amount)}</p>
              </div>
              <div className="text-center p-3 bg-muted rounded-lg">
                <p className="text-xs text-muted-foreground mb-1">Tranche Min.</p>
                <p className="text-lg font-bold">{formatAmount(debt.minimum_installment)}</p>
              </div>
            </div>
            {debt.due_date && (
              <div className="mt-3 text-center">
                <span className="text-sm text-muted-foreground">Date limite: </span>
                <span className="font-medium">{formatDate(debt.due_date)}</span>
              </div>
            )}
          </div>

          {/* Historique des paiements */}
          <div className="border rounded-lg p-4">
            <h3 className="font-semibold text-lg mb-3">
              Historique des Paiements ({payments.length})
            </h3>
            {loading ? (
              <div className="text-center py-4 text-muted-foreground">
                Chargement...
              </div>
            ) : payments.length === 0 ? (
              <div className="text-center py-4 text-muted-foreground">
                Aucun paiement enregistré
              </div>
            ) : (
              <div className="border rounded-lg overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Montant</TableHead>
                      <TableHead>Mode de Paiement</TableHead>
                      <TableHead>Commentaire</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {payments.map((payment) => (
                      <TableRow key={payment.id}>
                        <TableCell>{formatDate(payment.created_at)}</TableCell>
                        <TableCell className="font-medium text-green-600">
                          {formatAmount(payment.amount)}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">
                            {getPaymentMethodLabel(payment.payment_method)}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {payment.comment || '-'}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
