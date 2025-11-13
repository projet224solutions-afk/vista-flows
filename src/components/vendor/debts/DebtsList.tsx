import { useState, useEffect } from 'react';
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
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Eye, DollarSign, RefreshCw } from 'lucide-react';
import { DebtDetailsDialog } from './DebtDetailsDialog';
import { RecordPaymentDialog } from './RecordPaymentDialog';

interface Debt {
  id: string;
  customer_name: string;
  customer_phone: string;
  customer_id: string | null;
  total_amount: number;
  paid_amount: number;
  remaining_amount: number;
  minimum_installment: number;
  description: string | null;
  status: string;
  due_date: string | null;
  created_at: string;
}

interface DebtsListProps {
  vendorId: string;
}

export function DebtsList({ vendorId }: DebtsListProps) {
  const [debts, setDebts] = useState<Debt[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDebt, setSelectedDebt] = useState<Debt | null>(null);
  const [showDetails, setShowDetails] = useState(false);
  const [showPayment, setShowPayment] = useState(false);

  const loadDebts = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('debts')
        .select('*')
        .eq('vendor_id', vendorId)
        .order('created_at', { ascending: false });

      if (error) throw error;

      setDebts(data || []);
    } catch (error: any) {
      console.error('Erreur chargement dettes:', error);
      toast.error('Erreur lors du chargement des dettes');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDebts();

    // S'abonner aux changements en temps réel
    const channel = supabase
      .channel('debts_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'debts',
          filter: `vendor_id=eq.${vendorId}`
        },
        () => {
          loadDebts();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [vendorId]);

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

  const formatAmount = (amount: number) => {
    return new Intl.NumberFormat('fr-FR').format(amount) + ' GNF';
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'Non définie';
    return new Date(dateString).toLocaleDateString('fr-FR');
  };

  if (loading) {
    return <div className="text-center py-8">Chargement des dettes...</div>;
  }

  if (debts.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        Aucune dette enregistrée pour le moment
      </div>
    );
  }

  return (
    <>
      <div className="flex justify-end mb-4">
        <Button variant="outline" size="sm" onClick={loadDebts}>
          <RefreshCw className="w-4 h-4 mr-2" />
          Actualiser
        </Button>
      </div>

      <div className="border rounded-lg overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Client</TableHead>
              <TableHead>Téléphone</TableHead>
              <TableHead>Montant Total</TableHead>
              <TableHead>Payé</TableHead>
              <TableHead>Restant</TableHead>
              <TableHead>Statut</TableHead>
              <TableHead>Date limite</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {debts.map((debt) => (
              <TableRow key={debt.id}>
                <TableCell className="font-medium">{debt.customer_name}</TableCell>
                <TableCell>{debt.customer_phone}</TableCell>
                <TableCell>{formatAmount(debt.total_amount)}</TableCell>
                <TableCell className="text-green-600">{formatAmount(debt.paid_amount)}</TableCell>
                <TableCell className="text-orange-600 font-medium">
                  {formatAmount(debt.remaining_amount)}
                </TableCell>
                <TableCell>{getStatusBadge(debt.status)}</TableCell>
                <TableCell>{formatDate(debt.due_date)}</TableCell>
                <TableCell className="text-right space-x-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setSelectedDebt(debt);
                      setShowDetails(true);
                    }}
                  >
                    <Eye className="w-4 h-4 mr-1" />
                    Détails
                  </Button>
                  {debt.status === 'in_progress' && (
                    <Button
                      variant="default"
                      size="sm"
                      onClick={() => {
                        setSelectedDebt(debt);
                        setShowPayment(true);
                      }}
                    >
                      <DollarSign className="w-4 h-4 mr-1" />
                      Encaisser
                    </Button>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {selectedDebt && (
        <>
          <DebtDetailsDialog
            debt={selectedDebt}
            open={showDetails}
            onOpenChange={setShowDetails}
          />
          <RecordPaymentDialog
            debt={selectedDebt}
            open={showPayment}
            onOpenChange={setShowPayment}
            onSuccess={loadDebts}
          />
        </>
      )}
    </>
  );
}
