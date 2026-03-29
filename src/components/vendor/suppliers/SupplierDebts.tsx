// @ts-nocheck
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Eye, DollarSign, RefreshCw } from 'lucide-react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface SupplierDebt {
  id: string;
  supplier_id: string;
  total_amount: number;
  paid_amount: number;
  remaining_amount: number;
  minimum_installment: number;
  status: string;
  due_date: string | null;
  created_at: string;
  supplier: {
    business_name: string;
  };
}

interface SupplierDebtsProps {
  vendorId: string;
}

export function SupplierDebts({ vendorId }: SupplierDebtsProps) {
  const [debts, setDebts] = useState<SupplierDebt[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDebts();

    const channel = supabase
      .channel('supplier_debts_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'supplier_debts',
          filter: `vendor_id=eq.${vendorId}`
        },
        () => loadDebts()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [vendorId]);

  const loadDebts = async () => {
    setLoading(true);
    try {
      const { data: vendor } = await supabase
        .from('vendors')
        .select('id')
        .eq('id', vendorId)
        .single();

      if (!vendor) return;

      const { data, error } = await supabase
        .from('supplier_debts')
        .select(`
          *,
          supplier:suppliers(business_name)
        `)
        .eq('vendor_id', vendor.id)
        .order('created_at', { ascending: false });

      if (error) throw error;

      setDebts(data || []);
    } catch (error: any) {
      // Ignorer silencieusement les erreurs RLS ou réseau
      const errorMessage = error?.message?.toLowerCase() || '';
      const isRlsOrNetworkError = 
        error?.code === 'PGRST301' || 
        error?.code === '42501' ||
        errorMessage.includes('permission denied') ||
        errorMessage.includes('rls') ||
        errorMessage.includes('failed to fetch') ||
        errorMessage.includes('networkerror');
      
      if (!isRlsOrNetworkError) {
        console.error('Erreur chargement dettes fournisseurs:', error);
        toast.error('Erreur lors du chargement des dettes');
      }
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, { label: string; variant: any }> = {
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
      <div className="text-center py-12 text-muted-foreground">
        Aucune dette fournisseur pour le moment
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button variant="outline" size="sm" onClick={loadDebts}>
          <RefreshCw className="w-4 h-4 mr-2" />
          Actualiser
        </Button>
      </div>

      <div className="border rounded-lg overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Fournisseur</TableHead>
              <TableHead>Montant Total</TableHead>
              <TableHead>Payé</TableHead>
              <TableHead>Restant</TableHead>
              <TableHead>Tranche Min</TableHead>
              <TableHead>Statut</TableHead>
              <TableHead>Date limite</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {debts.map((debt) => (
              <TableRow key={debt.id}>
                <TableCell className="font-medium">{debt.supplier.business_name}</TableCell>
                <TableCell>{formatAmount(debt.total_amount)}</TableCell>
                <TableCell className="text-green-600">{formatAmount(debt.paid_amount)}</TableCell>
                <TableCell className="text-orange-600 font-medium">
                  {formatAmount(debt.remaining_amount)}
                </TableCell>
                <TableCell>{formatAmount(debt.minimum_installment)}</TableCell>
                <TableCell>{getStatusBadge(debt.status)}</TableCell>
                <TableCell>{formatDate(debt.due_date)}</TableCell>
                <TableCell className="text-right space-x-2">
                  <Button variant="outline" size="sm">
                    <Eye className="w-4 h-4 mr-1" />
                    Détails
                  </Button>
                  {debt.status === 'in_progress' && (
                    <Button variant="default" size="sm">
                      <DollarSign className="w-4 h-4 mr-1" />
                      Payer
                    </Button>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
