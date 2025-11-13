// @ts-nocheck
import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useAuth } from '@/hooks/useAuth';
import { DollarSign } from 'lucide-react';
import { sendPaymentReceivedNotification, sendDebtPaidNotification } from '@/utils/debtNotifications';

interface Debt {
  id: string;
  customer_name: string;
  customer_phone: string;
  customer_id: string | null;
  remaining_amount: number;
  minimum_installment: number;
  total_amount: number;
}

interface RecordPaymentDialogProps {
  debt: Debt;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export function RecordPaymentDialog({ debt, open, onOpenChange, onSuccess }: RecordPaymentDialogProps) {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [amount, setAmount] = useState('');
  const [comment, setComment] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!user) {
      toast.error('Vous devez être connecté');
      return;
    }

    const paymentAmount = parseFloat(amount);

    // Validation
    if (!amount || paymentAmount <= 0) {
      toast.error('Veuillez entrer un montant valide');
      return;
    }

    if (paymentAmount < debt.minimum_installment) {
      toast.error(`Le montant doit être au minimum ${debt.minimum_installment.toLocaleString('fr-FR')} GNF`);
      return;
    }

    if (paymentAmount > debt.remaining_amount) {
      toast.error(`Le montant ne peut pas dépasser le restant dû (${debt.remaining_amount.toLocaleString('fr-FR')} GNF)`);
      return;
    }

    setLoading(true);

    try {
      const { error } = await supabase
        .from('debt_payments')
        .insert({
          debt_id: debt.id,
          amount: paymentAmount,
          payment_method: 'cash',
          comment: comment || null,
          recorded_by: user.id
        });

      if (error) throw error;

      // Calculer le nouveau solde restant
      const newRemainingAmount = debt.remaining_amount - paymentAmount;

      // Envoyer notification appropriée
      if (newRemainingAmount <= 0) {
        // Dette entièrement payée
        await sendDebtPaidNotification(
          debt.customer_id,
          debt.customer_name,
          debt.customer_phone,
          debt.total_amount,
          'Votre vendeur' // TODO: récupérer le nom du vendeur
        );
      } else {
        // Paiement partiel
        await sendPaymentReceivedNotification(
          debt.id,
          debt.customer_id,
          debt.customer_name,
          debt.customer_phone,
          paymentAmount,
          newRemainingAmount,
          'Votre vendeur' // TODO: récupérer le nom du vendeur
        );
      }

      toast.success('Paiement enregistré avec succès');
      
      // Reset form
      setAmount('');
      setComment('');
      
      onSuccess();
      onOpenChange(false);
    } catch (error: any) {
      console.error('Erreur enregistrement paiement:', error);
      toast.error(error.message || 'Erreur lors de l\'enregistrement du paiement');
    } finally {
      setLoading(false);
    }
  };

  const formatAmount = (amount: number) => {
    return new Intl.NumberFormat('fr-FR').format(amount) + ' GNF';
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Encaisser une tranche (Cash)</DialogTitle>
          <DialogDescription>
            Client: {debt.customer_name}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Informations */}
          <div className="bg-muted p-4 rounded-lg space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Restant dû:</span>
              <span className="font-bold text-orange-600">{formatAmount(debt.remaining_amount)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Tranche minimale:</span>
              <span className="font-medium">{formatAmount(debt.minimum_installment)}</span>
            </div>
          </div>

          {/* Montant */}
          <div className="space-y-2">
            <Label htmlFor="amount">Montant encaissé (GNF) *</Label>
            <div className="relative">
              <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                id="amount"
                type="number"
                min={debt.minimum_installment}
                max={debt.remaining_amount}
                step="1"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder={`Min: ${debt.minimum_installment.toLocaleString('fr-FR')}`}
                className="pl-10"
                required
              />
            </div>
            <p className="text-xs text-muted-foreground">
              Entre {formatAmount(debt.minimum_installment)} et {formatAmount(debt.remaining_amount)}
            </p>
          </div>

          {/* Mode de paiement */}
          <div className="space-y-2">
            <Label>Mode de paiement</Label>
            <div className="p-3 bg-muted rounded-lg">
              <span className="font-medium">💵 Espèces (CASH)</span>
            </div>
          </div>

          {/* Commentaire */}
          <div className="space-y-2">
            <Label htmlFor="comment">Commentaire (optionnel)</Label>
            <Textarea
              id="comment"
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="Note sur ce paiement..."
              rows={3}
            />
          </div>

          {/* Boutons */}
          <div className="flex gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="flex-1"
              disabled={loading}
            >
              Annuler
            </Button>
            <Button type="submit" className="flex-1" disabled={loading}>
              {loading ? 'Enregistrement...' : 'Enregistrer le paiement'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
